#!/usr/bin/env node
/* PortMasters test runner.
   Usage:
     node tests/run.js            run the unit, effects, smoke, verification,
                                  and integration suites
     node tests/run.js --update   record the baseline fixtures again from git
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

/* --- effects suite ------------------------------------------------------ */

/* One probe per module and per boon: a function of `run` returning
   [label, actual, expected] facts read from a fresh game. Coverage is
   asserted against the engine tables, so a new module or boon cannot ship
   without its effect being pinned down here. */

const modById = (id) => `PM.MODULES.find((x) => x.id === "${id}")`;
const boonById = (id) => `PM.BOONS.find((x) => x.id === "${id}")`;
const orderFor = (type, count, reward, isProductOrder) =>
  `PM.game.customerCards = [{ id: 0, demandPort: PM.PORTS[0], ` +
  `resources: [{ type: ${type}, required: ${count} }], ` +
  `reward: ${reward}, totalItems: ${count}, isProductOrder: ${isProductOrder} }]`;

const MODULE_PROBES = {
  smugglers_hold: (run) => {
    run(`PM.game.shipLevel = 1; PM.equipModule(${modById("smugglers_hold")})`);
    return [
      [
        "a 100 gold card is bought for 85",
        run("PM.getCardFinalCost({ totalCost: 100, resources: [] })"),
        85,
      ],
      ["income tax on 100 rises to 12", run("PM.calcIncomeTax(100)"), 12],
    ];
  },
  bulk_hauler: (run) => {
    run(`PM.game.shipLevel = 1; PM.equipModule(${modById("bulk_hauler")})`);
    run("PM.game.shipLevel = 0");
    const freight = run("PM.calcTransportCost(10)");
    run("PM.game.money = 100; PM.upgradeShip()");
    const afterSurcharge = run("PM.game.money");
    run(`PM.equipModule(${modById("overdrive_engine")}, 0)`);
    const penaltyAfterSwap = run("PM.game.shipUpgradePenalty");
    run("PM.game.money = 100; PM.upgradeShip()");
    return [
      ["freight for 10 items drops by 10", freight, 10],
      ["a surcharged upgrade costs 30", afterSurcharge, 70],
      ["swapping the hauler out clears the surcharge", penaltyAfterSwap, 0],
      ["the next upgrade is the base 25 again", run("PM.game.money"), 75],
    ];
  },
  artisans_workshop: (run) => {
    run(
      `PM.game.shipLevel = 1; PM.equipModule(${modById("artisans_workshop")})`,
    );
    run(
      `PM.game.weavers = [{ task: PM.lang.items.linen_clothes, producedCount: 0, isSkilled: false }]`,
    );
    run("PM.processProduction()");
    return [
      [
        "a weaver's wage rises to 9",
        run(`PM.calcWorkerWage({ isSkilled: false }, "weaver")`),
        9,
      ],
      [
        "a weaver produces 2 instead of 1",
        run(`PM.game.inventory[PM.lang.items.linen_clothes]`),
        2,
      ],
    ];
  },
  tax_evasion: (run) => {
    run(`PM.game.shipLevel = 1; PM.equipModule(${modById("tax_evasion")})`);
    const vat = run("PM.calcVAT(PM.lang.items.brocade, 100)");
    const income = run("PM.calcIncomeTax(100)");
    run("Math.random = () => 0.1; PM.game.money = 100");
    run(`PM.game.inventory[PM.lang.items.hemp] = 5`);
    run(orderFor("PM.lang.items.hemp", 2, 50, false));
    run("PM.completeOrderById(0)");
    return [
      ["VAT on a 100 gold brocade order halves to 1", vat, 1],
      ["income tax on 100 halves to 5", income, 5],
      ["an audited 50 gold trade still nets 25", run("PM.game.money"), 125],
    ];
  },
  silk_monopoly: (run) => {
    run(`PM.game.shipLevel = 1; PM.equipModule(${modById("silk_monopoly")})`);
    run("PM.game.shipLevel = 0");
    const silkFreight = run("PM.calcTransportCost(10, true)");
    const plainFreight = run("PM.calcTransportCost(10, false)");
    run("PM.game.money = 100");
    run(`PM.game.inventory[PM.lang.items.sachet] = 1`);
    run(orderFor("PM.lang.items.sachet", 1, 100, true));
    run("PM.completeOrderById(0)");
    return [
      ["silk shipments travel free", silkFreight, 0],
      ["freight without silk stays 20", plainFreight, 20],
      ["a 100 gold sachet order pays 117", run("PM.game.money"), 217],
    ];
  },
  brokers_network: (run) => {
    run(`PM.game.shipLevel = 1; PM.equipModule(${modById("brokers_network")})`);
    const price = run("PM.game.intelCost");
    run(
      "PM.game.money = 10; PM.game.phase2DemandTags = [PM.lang.items.silk, PM.lang.items.tea, PM.lang.items.hemp]; PM.game.revealedIntel = []",
    );
    run("PM.purchaseIntel()");
    const rich = [run("PM.game.revealedIntel.length"), run("PM.game.money")];
    run(
      "PM.game.money = 3; PM.game.phase2DemandTags = [PM.lang.items.silk, PM.lang.items.tea]; PM.game.revealedIntel = []",
    );
    run("PM.purchaseIntel()");
    const poor = [run("PM.game.revealedIntel.length"), run("PM.game.money")];
    run(`PM.equipModule(${modById("salvage_crane")}, 0)`);
    return [
      ["rumors cost 2 gold", price, 2],
      ["a 10 gold purse reveals 2 rumors", rich[0], 2],
      ["and pays 4 for them", rich[1], 6],
      ["a 3 gold purse reveals only what it can pay for", poor[0], 1],
      ["and never goes into debt", poor[1], 1],
      [
        "swapping the network out restores the 5 gold price",
        run("PM.game.intelCost"),
        5,
      ],
    ];
  },
  salvage_crane: (run) => {
    run(`PM.game.shipLevel = 1; PM.equipModule(${modById("salvage_crane")})`);
    run("PM.game.shipLevel = 0");
    const order = orderFor("PM.lang.items.hemp", 2, 50, false);
    run(`Math.random = () => 0.1; PM.game.money = 100; ${order}`);
    run(`PM.game.inventory[PM.lang.items.hemp] = 5`);
    run("PM.completeOrderById(0)");
    const lucky = run("PM.game.money");
    run(
      `Math.random = () => 0.5; PM.game.money = 100; PM.game.completedOrders = new Set(); ${order}`,
    );
    run(`PM.game.inventory[PM.lang.items.hemp] = 5`);
    run("PM.completeOrderById(0)");
    return [
      ["a lucky roll refunds the freight", lucky, 150],
      ["an unlucky roll keeps it", run("PM.game.money"), 145],
    ];
  },
  overdrive_engine: (run) => {
    run(
      `PM.game.shipLevel = 1; PM.equipModule(${modById("overdrive_engine")})`,
    );
    const freight = run("PM.calcTransportCost(10)");
    run("PM.game.money = 100; PM.payMaintenance()");
    return [
      ["freight drops by 5", freight, 10],
      ["maintenance costs the base plus 10", run("PM.game.money"), 75],
    ];
  },
};

const BOON_PROBES = {
  silk_wind: (run) => {
    run(`PM.applyBoon(${boonById("silk_wind")})`);
    return [
      [
        "silk shipments travel half price",
        run("PM.calcTransportCost(10, true)"),
        10,
      ],
      [
        "freight without silk stays 20",
        run("PM.calcTransportCost(10, false)"),
        20,
      ],
    ];
  },
  favorable_tides: (run) => {
    run(`PM.applyBoon(${boonById("favorable_tides")})`);
    return [
      ["freight for 10 items drops by 4", run("PM.calcTransportCost(10)"), 16],
      ["the 5 gold floor still holds", run("PM.calcTransportCost(1)"), 5],
    ];
  },
  merchant_charm: (run) => {
    run(`PM.applyBoon(${boonById("merchant_charm")})`);
    return [
      [
        "a 100 gold card is bought for 85",
        run("PM.getCardFinalCost({ totalCost: 100, resources: [] })"),
        85,
      ],
    ];
  },
  artisan_inspiration: (run) => {
    run(`PM.applyBoon(${boonById("artisan_inspiration")})`);
    run(
      `PM.game.weavers = [{ task: PM.lang.items.linen_clothes, producedCount: 0, isSkilled: false }]`,
    );
    run("PM.processProduction()");
    return [
      [
        "a weaver produces 2 instead of 1",
        run(`PM.game.inventory[PM.lang.items.linen_clothes]`),
        2,
      ],
    ];
  },
  emergency_loan: (run) => {
    run("PM.game.money = 100");
    run(`PM.applyBoon(${boonById("emergency_loan")})`);
    return [["the loan pays 40 on the spot", run("PM.game.money"), 140]];
  },
  tax_shelter: (run) => {
    run(`PM.applyBoon(${boonById("tax_shelter")})`);
    return [["income tax on 100 falls to 5", run("PM.calcIncomeTax(100)"), 5]];
  },
  hemp_monopoly: (run) => {
    run(`PM.applyBoon(${boonById("hemp_monopoly")})`);
    run(
      `PM.game.resourceCards = [{ totalCost: 90, resources: [{ type: PM.lang.items.hemp, quantity: 3 }, { type: PM.lang.items.silk, quantity: 3 }] }]`,
    );
    return [
      [
        "3 hemp units take 6 gold off a card",
        run("PM.getCardFinalCost(PM.game.resourceCards[0])"),
        84,
      ],
    ];
  },
  master_apprentice: (run) => {
    run(`PM.applyBoon(${boonById("master_apprentice")})`);
    const hirePrice = run("PM.getHireCost('weaver')");
    run("PM.game.money = 100; PM.hireWorker('weaver')");
    const hired = [run("PM.game.weavers.length"), run("PM.game.money")];
    const firstWage = run("PM.calcWorkerWage(PM.game.weavers[0], 'weaver')");
    run("PM.payWages()");
    const afterWages = run("PM.game.money");
    const laterWage = run("PM.calcWorkerWage(PM.game.weavers[0], 'weaver')");
    run("PM.skipUpgrade()");
    return [
      ["a weaver is hired for 4", hirePrice, 4],
      ["hiring charges no gold up front", hired[0], 1],
      ["and leaves the purse at 100", hired[1], 100],
      ["the first wage is halved to 4", firstWage, 4],
      ["pay day costs 4", afterWages, 96],
      ["the second wage is the full 8", laterWage, 8],
      [
        "the boon lasts one voyage",
        run("JSON.stringify(PM.game.modifierFlags)"),
        "{}",
      ],
      ["and the hire price returns to 8", run("PM.getHireCost('weaver')"), 8],
    ];
  },
};

function runProbe(probe) {
  const g = H.createGame(H.currentSpec("en"));
  for (const [label, actual, expected] of probe((expr) => g.run(expr))) {
    assertEqual(actual, expected, label);
  }
}

function effectsSuite() {
  section("effects");

  check("every module and boon ships with an effect probe", () => {
    const g = H.createGame(H.currentSpec("en"));
    assertEqual(
      g.run("PM.MODULES.map((x) => x.id).sort().join(', ')"),
      Object.keys(MODULE_PROBES).sort().join(", "),
      "module probes match the module table",
    );
    assertEqual(
      g.run("PM.BOONS.map((x) => x.id).sort().join(', ')"),
      Object.keys(BOON_PROBES).sort().join(", "),
      "boon probes match the boon table",
    );
  });

  for (const [id, probe] of Object.entries(MODULE_PROBES)) {
    check(`module ${id} takes effect`, () => runProbe(probe));
  }
  for (const [id, probe] of Object.entries(BOON_PROBES)) {
    check(`boon ${id} takes effect`, () => runProbe(probe));
  }
}

/* --- verification suite ------------------------------------------------- */

/* The screens must show the numbers the engine will actually charge. Each
   figure test clicks the button it read and compares the money that moved to
   the money that was printed. The hygiene tests walk every rendered screen,
   both packs, a played log, and the entry pages looking for dash characters;
   a minus directly in front of a digit is arithmetic (Net: -41 Gold) and is
   the one allowed appearance. */

const DASH_RE = /[-–—]/;

function withoutMinusNumbers(text) {
  return String(text).replace(/-\d/g, "");
}

function visibleText(html) {
  return withoutMinusNumbers(
    String(html)
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]*>/g, " "),
  );
}

function dashed(html) {
  return DASH_RE.test(visibleText(html));
}

function freshGame(lang = "en") {
  return H.createGame(H.currentSpec(lang));
}

/* The Net figure on the trade button of the first order card. */
function printedTradeNet(g) {
  const btn = H.parseButtons(g.state.panels["phase-panel"]).find((b) =>
    /^completeOrderById\(/.test(b.onclick),
  );
  assert(btn, "a trade button is on screen");
  const m = /Net (-?\d+)/.exec(btn.text);
  assert(m, `the trade button prints a net figure: ${btn.text}`);
  return Number(m[1]);
}

function verificationSuite() {
  section("verification");

  check("the welcome screen quotes the engine's own figures", () => {
    const g = freshGame();
    g.run("PM.render()");
    const panel = g.state.panels["phase-panel"];
    const fixed = g.run("PM.game.fixedCost");
    const vat = g.run("PM.VAT_RATE * 100");
    const income = g.run("PM.INCOME_TAX_RATE * 100");
    const money = g.run("PM.game.money");
    assert(
      panel.includes(`Maintenance: ${fixed} Gold`),
      `maintenance is ${fixed} Gold`,
    );
    assert(panel.includes(`VAT: ${vat}%`), `VAT is ${vat}%`);
    assert(
      panel.includes(`Income Tax: ${income}%`),
      `income tax is ${income}%`,
    );
    assert(
      panel.includes(`${money} Gold starting funds`),
      `funds are ${money} Gold`,
    );
    const items = g.run("PM.lang.items");
    const inv = g.run("PM.game.inventory");
    for (const item of [items.hemp, items.silk, items.tea]) {
      assert(panel.includes(`${item}×${inv[item]}`), `starting ${item} count`);
    }
  });

  check("the guide quotes the live wage, tax, and rumor tables", () => {
    const g = freshGame();
    g.run("showInstructions()");
    const modal = g.state.modal;
    const wages = g.run("PM.WAGES");
    assert(
      modal.includes(`Weaver (${wages.weaver} Gold/Voyage)`),
      "weaver wage",
    );
    assert(
      modal.includes(`Master Weaver (${wages.master} Gold/Voyage)`),
      "master wage",
    );
    assert(
      modal.includes(`Sachet Maker (${wages.sachet_maker} Gold/Voyage)`),
      "maker wage",
    );
    assert(modal.includes(`VAT: ${g.run("PM.VAT_RATE * 100")}%`), "VAT rate");
    assert(
      modal.includes(`Income Tax: ${g.run("PM.INCOME_TAX_RATE * 100")}%`),
      "income rate",
    );
    assert(
      modal.includes(`Spend ${g.run("PM.game.intelCost")} Gold`),
      "rumor price",
    );
  });

  check("the rumor price follows the Broker's Network everywhere", () => {
    const g = freshGame();
    g.run(
      `PM.game.shipLevel = 1; PM.equipModule(${modById("brokers_network")})`,
    );
    g.run("showInstructions()");
    assert(
      g.state.modal.includes("Spend 2 Gold"),
      "guide shows the discounted price",
    );
    g.run("showRumorBoard()");
    assert(
      g.state.modal.includes("Buy Rumor (2💰)"),
      "rumor board shows the same price",
    );
  });

  check("the tutorial quotes the engine's own costs", () => {
    const g = freshGame();
    const fixed = g.run("PM.game.fixedCost");
    const wages = g.run("PM.WAGES");
    const steps = g.run("PM.lang.tutorial.length");
    const pages = [];
    for (let i = 0; i < steps; i++) {
      g.run(`showTutorial(${i})`);
      pages.push(g.state.modal);
      g.run("closeModal()");
    }
    const all = pages.join("\n");
    assert(
      all.includes(`${fixed} Gold, every voyage, fixed`),
      "maintenance figure",
    );
    assert(
      all.includes(
        `${wages.weaver} to ${wages.sachet_maker} Gold per person per voyage`,
      ),
      "wage range",
    );
    assert(all.includes(`Weavers (${wages.weaver}g)`), "weaver wage");
    assert(all.includes(`Master Weavers (${wages.master}g)`), "master wage");
    assert(
      all.includes(`Sachet Makers (${wages.sachet_maker}g)`),
      "maker wage",
    );
  });

  check("the shipyard prints the prices it charges", () => {
    const g = freshGame();
    g.run("PM.game.shipLevel = 1; PM.game.phase = 4; PM.render()");
    let panel = g.state.panels["phase-panel"];
    assert(
      panel.includes(`Discount: ${g.run("PM.game.shipLevel * 5")} Gold`),
      "discount line",
    );
    assert(
      panel.includes(`Cost: ${g.run("PM.game.shipUpgradeCost[1]")} Gold`),
      "upgrade price",
    );
    g.run(`PM.equipModule(${modById("bulk_hauler")})`);
    panel = g.state.panels["phase-panel"];
    const surcharged = g.run(
      "PM.game.shipUpgradeCost[PM.game.shipLevel] + PM.game.shipUpgradePenalty",
    );
    assert(
      panel.includes(`Cost: ${surcharged} Gold`),
      `surcharged price is ${surcharged}`,
    );
    g.run(`PM.equipModule(${modById("overdrive_engine")}, 0)`);
    g.run("PM.game.phase = 3; PM.render()");
    panel = g.state.panels["phase-panel"];
    const name = g.run(
      `PM.MODULES.find((m) => m.id === "overdrive_engine").name`,
    );
    const note = `Base ${g.run("PM.game.fixedCost")}g + ${name} penalty ${g.run("PM.game.maintenancePenalty")}g`;
    assert(
      panel.includes(note),
      `the maintenance note itemizes the surcharge: ${note}`,
    );
  });

  check("a trade pays exactly the net its button prints", () => {
    const g = freshGame();
    g.run("PM.game.money = 100; PM.game.phase = 2");
    g.run(`PM.game.inventory[PM.lang.items.hemp] = 5`);
    g.run(orderFor("PM.lang.items.hemp", 2, 50, false));
    g.run("PM.render()");
    const net = printedTradeNet(g);
    assertEqual(net, 45, "printed net (50 reward less 5 freight)");
    const before = g.game().money;
    g.run("completeOrderById(0)");
    assertEqual(
      g.game().money - before,
      net,
      "the purse gains the printed figure",
    );
  });

  check("the printed net includes the Silk Road Monopoly bonus", () => {
    const g = freshGame();
    g.run("PM.game.shipLevel = 1");
    g.run(`PM.equipModule(${modById("silk_monopoly")})`);
    g.run("PM.game.shipLevel = 0; PM.game.money = 100; PM.game.phase = 2");
    g.run(`PM.game.inventory[PM.lang.items.sachet] = 1`);
    g.run(orderFor("PM.lang.items.sachet", 1, 100, true));
    g.run("PM.render()");
    const net = printedTradeNet(g);
    assertEqual(net, 117, "printed net (100 less 2 VAT, plus 20 percent)");
    const vat = g.run("PM.calcVAT(PM.lang.items.sachet, 100)");
    assert(
      g.state.panels["phase-panel"].includes(`Est. VAT: ${vat} Gold`),
      "estimated VAT matches the engine",
    );
    const before = g.game().money;
    g.run("completeOrderById(0)");
    assertEqual(
      g.game().money - before,
      net,
      "the purse gains the printed figure",
    );
  });

  check("a fully rigged ship still pays the printed net", () => {
    const g = freshGame();
    g.run("Math.random = () => 0.9");
    g.run(
      "PM.game.shipLevel = 8; PM.MODULES.forEach((m) => PM.equipModule(m))",
    );
    g.run("PM.game.money = 100; PM.game.phase = 2");
    g.run(`PM.game.inventory[PM.lang.items.hemp] = 5`);
    g.run(orderFor("PM.lang.items.hemp", 2, 50, false));
    g.run("PM.render()");
    const net = printedTradeNet(g);
    const before = g.game().money;
    g.run("completeOrderById(0)");
    assertEqual(
      g.game().money - before,
      net,
      "the purse gains the printed figure",
    );
  });

  check("a purchase charges exactly the price its button prints", () => {
    const g = freshGame();
    g.run("PM.game.shipLevel = 1");
    g.run(`PM.equipModule(${modById("smugglers_hold")})`);
    g.run("PM.game.phase = 1; PM.game.money = 200");
    g.run(
      `PM.game.resourceCards = [{ id: 0, port: PM.PORTS[0], resources: [{ type: PM.lang.items.hemp, quantity: 2, price: 50 }], totalCost: 100, isProductCard: false }]`,
    );
    g.run("PM.render()");
    const btn = H.parseButtons(g.state.panels["phase-panel"]).find((b) =>
      /^purchaseCardById\(/.test(b.onclick),
    );
    assert(btn, "a buy button is on screen");
    const m = /Buy \((\d+)💰\)/.exec(btn.text);
    assert(m, `the buy button prints a price: ${btn.text}`);
    const price = Number(m[1]);
    assertEqual(price, 85, "printed price with the smugglers discount");
    const before = g.game().money;
    g.run("purchaseCardById(0)");
    assertEqual(
      before - g.game().money,
      price,
      "gold spent equals the printed price",
    );
  });

  check("no dashes or hyphens in either language pack", () => {
    for (const lang of Object.keys(H.ENTRIES)) {
      const g = freshGame(lang);
      const strings = g.run(
        `(function collect(v, out) {
           if (typeof v === "string") out.push(v);
           else if (v && typeof v === "object")
             for (const key of Object.keys(v)) collect(v[key], out);
           return out;
         })(PM.lang, [])`,
      );
      const bad = strings.filter((s) => dashed(s));
      assertEqual(
        bad.length,
        0,
        `${lang} pack strings with a dash: ${bad.slice(0, 3).join(" | ")}`,
      );
    }
  });

  check("no dashes or hyphens on any rendered screen", () => {
    for (const lang of Object.keys(H.ENTRIES)) {
      const g = freshGame(lang);
      const shots = [];
      const snap = (label) => {
        for (const id of H.PANEL_IDS) {
          shots.push([`${label}/${id}`, g.state.panels[id] || ""]);
        }
        shots.push([`${label}/modal`, g.state.modal]);
      };
      g.run("PM.render()");
      snap("welcome");
      const steps = g.run("PM.lang.tutorial.length");
      for (let i = 0; i < steps; i++) {
        g.run(`showTutorial(${i})`);
        shots.push([`tutorial ${i}`, g.state.modal]);
      }
      g.run("closeModal(); showInstructions()");
      snap("guide");
      g.run("closeModal(); showTips()");
      snap("tips");
      g.run("closeModal(); startBoonDrafting()");
      snap("boon");
      g.run("closeModal(); selectBoonById(PM.BOONS[0].id)");
      snap("purchase");
      g.run("completePhase1()");
      snap("workers");
      g.run("startPhase2()");
      snap("orders");
      g.run("completePhase2()");
      snap("settlement");
      g.run("doMaintenance()");
      snap("shipyard");
      g.run("startModuleDrafting()");
      snap("draft");
      g.run("handleModuleSelect(0)");
      snap("swap");
      g.run(
        "PM.game.gameOver = true; PM.game.phase = 'bankruptcy'; PM.render()",
      );
      snap("bankruptcy");
      g.run("PM.game.phase = 'endgame'; PM.render()");
      snap("endgame");
      const bad = shots.filter(([, html]) => dashed(html));
      assertEqual(
        bad.length,
        0,
        `${lang} screens with a dash: ${bad.map(([name]) => name).join(", ")}`,
      );
    }
  });

  check("no dashes or hyphens in a played game's log", () => {
    for (const lang of Object.keys(H.ENTRIES)) {
      const g = freshGame(lang);
      g.fireLoad();
      g.run("closeTutorial()");
      H.playScripted(g, { buysPerRound: 2, hires: 1, maxSteps: 70 });
      const bad = g.logs().filter((m) => dashed(m));
      assertEqual(
        bad.length,
        0,
        `${lang} log lines with a dash: ${bad.slice(0, 3).join(" | ")}`,
      );
    }
  });

  check("no dashes or hyphens in the entry pages' visible text", () => {
    for (const lang of Object.keys(H.ENTRIES)) {
      const html = fs.readFileSync(H.entryPath(lang), "utf8");
      assert(
        !dashed(html),
        `${H.ENTRIES[lang]} shows a dash in its visible text`,
      );
    }
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
  effectsSuite();
  smokeSuite();
  verificationSuite();
  integrationSuite();
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
}

main();
