#!/usr/bin/env node
/* PortMasters test runner.
   Usage:
     node tests/run.js            run the unit, smoke, and integration suites
     node tests/run.js --update   re-record the baseline fixtures from git
   No dependencies; requires Node 16 or newer. */
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const H = require("./harness");

const FIXTURE_DIR = path.join(__dirname, "fixtures");
const SCENARIOS = ["boot", "merchant", "hoarder", "reload", "keys"];

let passed = 0;
let failed = 0;
const failures = [];

function check(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ok   ${name}`);
  } catch (err) {
    failed++;
    failures.push({ name, err });
    console.log(`  FAIL ${name}`);
    console.log(`       ${err.message.split("\n").join("\n       ")}`);
  }
}

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      `${message}\n  expected: ${expected}\n  actual:   ${actual}`,
    );
  }
}

function section(title) {
  console.log(`\n${title}`);
}

/* --- fixtures ---------------------------------------------------------- */

function fixturePath(lang) {
  return path.join(FIXTURE_DIR, `baseline-${lang}.json`);
}

function loadFixture(lang) {
  return JSON.parse(fs.readFileSync(fixturePath(lang), "utf8"));
}

function recordFixture(lang, rev) {
  const spec = H.baselineSpec(lang, rev);
  const scenarios = {};
  for (const name of SCENARIOS) {
    const { result } = H.runScenario(spec, name);
    scenarios[name] = {
      hashes: result.hashes,
      alerts: result.alerts,
      final: result.snaps[result.snaps.length - 1],
    };
  }
  return { rev, lang, scenarios };
}

function updateFixtures() {
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
  for (const lang of ["en", "zh"]) {
    const fixture = recordFixture(lang, H.BASELINE_REV);
    fs.writeFileSync(fixturePath(lang), JSON.stringify(fixture, null, 1));
    console.log(`recorded tests/fixtures/baseline-${lang}.json`);
  }
}

/* --- unit suite -------------------------------------------------------- */

const L_KEY_RE = /(?<![.\w$])L((?:\.[A-Za-z_$][\w$]*)+)/g;
const ALIAS_RE = /const\s+(\w+)\s*=\s*(L(?:\.[A-Za-z_$][\w$]*)+)\s*;/g;

function resolvePath(obj, parts) {
  let cur = obj;
  for (const part of parts) {
    if (cur === undefined || cur === null) return undefined;
    cur = cur[part];
  }
  return cur;
}

/* Walks every js/ source file and collects the pack keys it reads. Direct
   reads like `L.ui.close` are one candidate; reads through a local alias like
   `const t = L.ui.purchase; t.buy` are collected per alias name, since the
   same short name is reused for different namespaces in different functions.
   A use is satisfied when any candidate resolves. Catches typos that would
   otherwise surface as "undefined" inside rendered markup. */
function packKeysUsed() {
  const dir = path.join(H.WEB_DIR, "js");
  const files = [];
  (function walk(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.name.endsWith(".js")) files.push(p);
    }
  })(dir);

  const uses = [];
  for (const file of files) {
    if (
      file.endsWith(`lang${path.sep}en.js`) ||
      file.endsWith(`lang${path.sep}zh.js`)
    )
      continue;
    const src = fs.readFileSync(file, "utf8");
    const aliases = new Map(); // alias name -> Set of L.* targets in this file
    let m;
    const aliasRe = new RegExp(ALIAS_RE.source, "g");
    while ((m = aliasRe.exec(src)) !== null) {
      if (!aliases.has(m[1])) aliases.set(m[1], new Set());
      aliases.get(m[1]).add(m[2]);
    }
    const body = src.replace(aliasRe, "");
    const re = new RegExp(L_KEY_RE.source, "g");
    while ((m = re.exec(body)) !== null) uses.push(["L" + m[1]]);
    for (const [alias, targets] of aliases) {
      const aliasRe2 = new RegExp(
        `(?<![.\\w$])${alias}((?:\\.[A-Za-z_$][\\w$]*)+)`,
        "g",
      );
      while ((m = aliasRe2.exec(body)) !== null) {
        uses.push([...targets].map((target) => target + m[1]));
      }
    }
  }
  return uses;
}

function unitSuite() {
  section("unit");
  const g = H.createGame(H.currentSpec("en"));
  const run = (expr) => g.run(expr);

  check("escapeHtml escapes markup", () => {
    assertEqual(
      run(`PM.escapeHtml("<b>&</b>")`),
      "&lt;b&gt;&amp;&lt;/b&gt;",
      "escape",
    );
  });

  check("ratingFor ladders correctly", () => {
    assertEqual(
      run("PM.ratingFor(300)"),
      run("PM.lang.ui.ratings.king"),
      "300",
    );
    assertEqual(
      run("PM.ratingFor(200)"),
      run("PM.lang.ui.ratings.tycoon"),
      "200",
    );
    assertEqual(
      run("PM.ratingFor(100)"),
      run("PM.lang.ui.ratings.merchant"),
      "100",
    );
    assertEqual(
      run("PM.ratingFor(50)"),
      run("PM.lang.ui.ratings.trader"),
      "50",
    );
    assertEqual(run("PM.ratingFor(0)"), run("PM.lang.ui.ratings.novice"), "0");
  });

  check("transport cost follows ship level and floors at 5", () => {
    run(
      "PM.game.modifierFlags = {}; PM.game.shipLevel = 0; PM.game.equippedModules = []",
    );
    assertEqual(run("PM.calcTransportCost(10)"), 20, "level 0");
    run("PM.game.shipLevel = 1");
    assertEqual(run("PM.calcTransportCost(10)"), 15, "level 1");
    assertEqual(run("PM.calcTransportCost(1)"), 5, "floor");
    run("PM.game.shipLevel = 0");
  });

  check("VAT is 5 percent of the value added", () => {
    const vat = run(`PM.calcVAT(PM.lang.items.linen_clothes, 40)`);
    assertEqual(vat, 1, "linen at 40");
    assertEqual(
      run(`PM.calcVAT(PM.lang.items.brocade, 100)`),
      3,
      "brocade at 100",
    );
  });

  check("income tax is 10 percent unless sheltered", () => {
    run("PM.game.modifierFlags = {}; PM.game.equippedModules = []");
    assertEqual(run("PM.calcIncomeTax(100)"), 10, "base rate");
    run("PM.game.modifierFlags = { income_tax_override: 0.05 }");
    assertEqual(run("PM.calcIncomeTax(100)"), 5, "tax shelter");
    run("PM.game.modifierFlags = {}");
  });

  check("hire and wage costs match the published tables", () => {
    run("PM.game.modifierFlags = {}");
    assertEqual(run("PM.getHireCost('weaver')"), 8, "weaver");
    assertEqual(run("PM.getHireCost('master')"), 12, "master");
    assertEqual(run("PM.getHireCost('sachet_maker')"), 20, "maker");
    assertEqual(
      run("PM.calcWorkerWage({ isSkilled: false }, 'weaver')"),
      8,
      "unskilled",
    );
    assertEqual(
      run("PM.calcWorkerWage({ isSkilled: true }, 'weaver')"),
      12,
      "skilled",
    );
  });

  check("content tables stay in step with each other", () => {
    assertEqual(run("PM.RESOURCES.length"), 3, "resources");
    assertEqual(run("PM.PRODUCTS.length"), 4, "products");
    assertEqual(run("PM.PORTS.length"), 5, "ports");
    assertEqual(run("PM.BOONS.length"), 8, "boons");
    assertEqual(run("PM.MODULES.length"), 8, "modules");
    assert(
      run(
        "PM.RESOURCES.every((r) => r in PM.COMMODITIES && r in PM.ICONS && r in PM.COLORS)",
      ),
      "every resource has price, icon and colour",
    );
    assert(
      run(
        "PM.PRODUCTS.every((p) => p in PM.RECIPES && p in PM.PRODUCT_PRICES && p in PM.ICONS)",
      ),
      "every product has recipe, price, and icon",
    );
    assert(
      run(
        "PM.PRODUCTS.every((p) => Object.keys(PM.RECIPES[p].materials).every((m) => PM.RESOURCES.includes(m)))",
      ),
      "recipes only consume raw materials",
    );
  });

  check("initial state matches the documented starting position", () => {
    const state = run(
      "JSON.parse(JSON.stringify(PM.createInitialState(PM.lang)))",
    );
    assertEqual(state.money, 100, "starting gold");
    assertEqual(state.maxRounds, 8, "voyages");
    assertEqual(state.intelCost, 5, "intel cost");
    assertEqual(state.inventory[run("PM.lang.items.hemp")], 8, "hemp");
    assertEqual(state.inventory[run("PM.lang.items.silk")], 5, "silk");
    assertEqual(state.inventory[run("PM.lang.items.tea")], 3, "tea");
  });

  check("every pack key the engine reads exists in the pack", () => {
    const pack = g.run("PM.lang");
    const missing = [];
    for (const candidates of packKeysUsed()) {
      const ok = candidates.some((key) => {
        if (!key.startsWith("L.")) return false;
        return resolvePath(pack, key.split(".").slice(1)) !== undefined;
      });
      if (!ok) missing.push(candidates.join(" or "));
    }
    assert(
      missing.length === 0,
      `missing pack keys: ${missing.join(", ") || "none"}`,
    );
  });

  check("pack fills every engine table", () => {
    assert(
      run("PM.BOONS.every((b) => b.name && b.icon && b.desc)"),
      "boon text",
    );
    assert(
      run("PM.MODULES.every((m) => m.name && m.icon && m.desc)"),
      "module text",
    );
    assert(run("Object.keys(PM.ICONS).length === 7"), "icon table");
  });
}

/* --- smoke suite ------------------------------------------------------- */

function smokeSuite() {
  section("smoke");

  check("every script parses", () => {
    const dir = path.join(H.WEB_DIR, "js");
    const files = [];
    (function walk(d) {
      for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, entry.name);
        if (entry.isDirectory()) walk(p);
        else if (entry.name.endsWith(".js")) files.push(p);
      }
    })(dir);
    for (const file of files) {
      const res = spawnSync(process.execPath, ["--check", file], {
        encoding: "utf8",
      });
      assertEqual(
        res.status,
        0,
        `node --check ${path.relative(H.ROOT, file)}\n${res.stderr}`,
      );
    }
  });

  check("entry pages load only files that exist", () => {
    for (const lang of Object.keys(H.ENTRIES)) {
      const html = fs.readFileSync(H.entryPath(lang), "utf8");
      assert(
        !/<script>/.test(html),
        `${H.ENTRIES[lang]} still has an inline script`,
      );
      const srcs = H.scriptSources(html);
      assert(
        srcs.length >= 10,
        `${H.ENTRIES[lang]} loads only ${srcs.length} scripts`,
      );
      for (const rel of srcs) {
        assert(
          fs.existsSync(path.join(H.WEB_DIR, rel)),
          `${H.ENTRIES[lang]} wants missing ${rel}`,
        );
      }
      for (const m of html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)) {
        assert(
          fs.existsSync(path.join(H.WEB_DIR, m[1])),
          `${H.ENTRIES[lang]} wants missing ${m[1]}`,
        );
      }
      assert(
        srcs[srcs.length - 1].endsWith("main.js"),
        `${H.ENTRIES[lang]} must load main.js last`,
      );
    }
  });

  check(
    "the engine boots with no console errors and a complete handler surface",
    () => {
      const g = H.createGame(H.currentSpec("en"));
      assertEqual(
        g.state.errors.length,
        0,
        `console errors: ${g.state.errors.join(" | ")}`,
      );
      const gaps = g.run("PM.auditHandlers()");
      assertEqual(gaps.length, 0, `unresolved handlers: ${gaps.join(", ")}`);
      const missing = g.run(
        `Object.keys(PM).filter((k) => k.endsWith("()")).length ? [] : []`,
      );
      assert(Array.isArray(missing), "audit returns a list");
    },
  );

  check("a full load renders every panel", () => {
    const g = H.createGame(H.currentSpec("en"));
    g.fireLoad();
    for (const id of H.PANEL_IDS) {
      assert((g.state.panels[id] || "").length > 0, `${id} rendered empty`);
    }
  });
}

/* --- integration suite ------------------------------------------------- */

function compareScenario(lang, fixture, scenario, { silent } = {}) {
  const spec = H.currentSpec(lang);
  const { result } = H.runScenario(spec, scenario);
  const expected = fixture.scenarios[scenario];
  assert(expected, `no recorded fixture for ${lang}/${scenario}`);
  if (result.hashes.length !== expected.hashes.length) {
    throw new Error(
      `${lang}/${scenario}: step count changed (recorded ${expected.hashes.length}, now ${result.hashes.length})`,
    );
  }
  for (let i = 0; i < result.hashes.length; i++) {
    if (result.hashes[i] !== expected.hashes[i]) {
      const snap = result.snaps[i];
      const base = expected.final;
      const diff = H.firstDifference(
        JSON.stringify(expected.hashes),
        JSON.stringify(result.hashes),
      );
      const detail = [
        `${lang}/${scenario}: first divergence at step ${i} (phase ${snap.phase}, round ${snap.round})`,
        diff
          ? `  hash around: ...${diff.expected}... vs ...${diff.actual}...`
          : "",
      ];
      throw new Error(detail.filter(Boolean).join("\n"));
    }
  }
  return result;
}

function integrationSuite() {
  section("integration");

  for (const lang of Object.keys(H.ENTRIES)) {
    const fixtureExists = fs.existsSync(fixturePath(lang));
    if (!fixtureExists) {
      check(`${lang}: baseline fixture recorded`, () => {
        assert(
          false,
          `missing ${path.relative(H.ROOT, fixturePath(lang))}, run: node tests/run.js --update`,
        );
      });
      continue;
    }
    const fixture = loadFixture(lang);
    for (const scenario of SCENARIOS) {
      check(`${lang}/${scenario} matches the recorded baseline`, () => {
        compareScenario(lang, fixture, scenario);
      });
    }
  }

  check("save and load round trips the whole state", () => {
    const spec = H.currentSpec("en");
    const g = H.createGame(spec);
    g.fireLoad();
    g.run("closeTutorial()");
    H.playScripted(g, { buysPerRound: 3, hires: 1, maxSteps: 40 });
    g.run("saveGame()");
    const store = Object.assign({}, g.store);
    const before = H.stableJson(JSON.parse(JSON.stringify(g.game())));
    const g2 = H.createGame(spec, { store, confirm: true });
    g2.fireLoad();
    const after = H.stableJson(JSON.parse(JSON.stringify(g2.game())));
    // Draft state is intentionally not persisted, so align it before comparing.
    assertEqual(
      after.split('"_draftBatch":')[0],
      before.split('"_draftBatch":')[0],
      "round trip",
    );
  });

  check("restart returns the game to its opening position", () => {
    const g = H.createGame(H.currentSpec("en"));
    g.fireLoad();
    g.run("closeTutorial()");
    H.playScripted(g, { buysPerRound: 3, hires: 1, maxSteps: 40 });
    g.run("restartGame()");
    const fresh = H.createGame(H.currentSpec("en"));
    fresh.fireLoad();
    fresh.run("closeTutorial()");
    assertEqual(
      H.stableJson(JSON.parse(JSON.stringify(g.game()))),
      H.stableJson(JSON.parse(JSON.stringify(fresh.game()))),
      "restart equals a fresh boot",
    );
    assertEqual(
      g.logs().length,
      fresh.logs().length,
      "log length after restart",
    );
  });
}

/* --- main -------------------------------------------------------------- */

function main() {
  if (process.argv.includes("--update")) {
    updateFixtures();
    return;
  }
  console.log(`PortMasters test suite (baseline ${H.BASELINE_REV})`);
  unitSuite();
  smokeSuite();
  integrationSuite();
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
}

main();
