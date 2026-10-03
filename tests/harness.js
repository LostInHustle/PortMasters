/* PortMasters test harness.
   Runs a build of the game inside a Node vm with a stubbed DOM, a seeded
   random source, and a stubbed localStorage, then drives it through its own
   inline onclick handlers. Two builds can be driven side by side: the current
   sources loaded from the entry page's script tags, and a pre-refactor
   baseline read out of git history. */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const WEB_DIR = path.join(ROOT, "PortMasters_Web_Edition");
const PANEL_IDS = ["status-panel", "phase-panel", "control-panel", "log-panel"];

const ENTRIES = {
  en: "PortMasters_v1.4.0.html",
  zh: "PortMasters_MandarinEdition_v1.4.0.html",
};

/* The revision the recorded fixtures were taken from. The entry pages at this
   revision still carry the game as one inline script, which is what makes a
   byte for byte comparison against the refactored build possible. */
const BASELINE_REV = "782a060";

function entryPath(lang) {
  return path.join(WEB_DIR, ENTRIES[lang]);
}

function scriptSources(html) {
  const srcs = [];
  const re = /<script src="([^"]+)"><\/script>/g;
  let m;
  while ((m = re.exec(html)) !== null) srcs.push(m[1]);
  return srcs;
}

function currentSpec(lang) {
  const html = fs.readFileSync(entryPath(lang), "utf8");
  const srcs = scriptSources(html);
  if (!srcs.length)
    throw new Error(`${ENTRIES[lang]} has no <script src> tags`);
  return {
    kind: "current",
    lang,
    sources: srcs.map((rel) => ({
      name: rel,
      code: fs.readFileSync(path.join(WEB_DIR, rel), "utf8"),
    })),
  };
}

function baselineSpec(lang, rev = BASELINE_REV) {
  const rel = `PortMasters_Web_Edition/${ENTRIES[lang]}`;
  const html = execFileSync("git", ["show", `${rev}:${rel}`], {
    cwd: ROOT,
    encoding: "utf8",
  });
  const m = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!m) throw new Error(`no inline script in ${rel} at ${rev}`);
  return {
    kind: "baseline",
    lang,
    sources: [{ name: `${rel}@${rev}`, code: m[1] }],
  };
}

/* Deterministic replacement for Math.random. The exact sequence matters: both
   builds must draw the same numbers in the same order to be comparable. */
function seededRandom(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function stableJson(value) {
  return JSON.stringify(value, (k, v) =>
    Object.prototype.toString.call(v) === "[object Set]"
      ? { __set: [...v] }
      : v,
  );
}

function hash(text) {
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 16);
}

/* Write-only fields the refactor retired from the game state. Both builds are
   stripped before comparison so that dropping them does not read as a
   behaviour change. See tests/README.md, "Intentional divergences". */
const RETIRED_STATE_KEYS = new Set(["totalRevenue", "totalCosts", "progress"]);

function stripRetired(value) {
  if (Array.isArray(value)) return value.map(stripRetired);
  // The game object comes from another vm realm, so a plain typeof check for
  // objects and the realm-safe toString tag are used instead of instanceof.
  if (value && Object.prototype.toString.call(value) === "[object Object]") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (!RETIRED_STATE_KEYS.has(k)) out[k] = stripRetired(v);
    }
    return out;
  }
  return value;
}

/* The refactor replaced the compound inline handlers that reached into the
   game object with named ones. Panels are canonicalized onto the new spelling
   before hashing, so a rendering comparison still holds across both builds;
   whether the wiring itself is right is proven by the driver executing it. */
const HANDLER_ALIASES = [
  [/purchaseCard\(game\.resourceCards\[(\d+)\]\)/g, "purchaseCardById($1)"],
  [/completeOrder\(game\.customerCards\[(\d+)\]\)/g, "completeOrderById($1)"],
  [
    /equipModule\(game\._newModule, (\d+)\); game\.phase=4; render\(\)/g,
    "equipModuleAt($1)",
  ],
  [/game\.phase='module_draft'; render\(\)/g, "gotoModuleDraft()"],
  [/game\.phase=4; render\(\)/g, "gotoShipyard()"],
  /* The Mandarin edition appended a redundant render() that the handler
     already performs internally. */
  [/hireWorker\('(\w+)'\); render\(\)/g, "hireWorker('$1')"],
];

/* Text fixed on purpose by the shared engine, normalized on both sides so the
   baseline's known bug does not read as a regression. See tests/README.md,
   "Intentional divergences". */
const BASELINE_ERRATA = [
  /* The Mandarin guide lost the intel price ("花费5金币"); the shared guide
     templates it from game.intelCost. */
  [/花费金币购买关于第2阶段需求的/g, "花费5金币购买关于第2阶段需求的"],
];

/* Deliberate UI changes: every amber callout now shares one family, and the
   voyage strip uses the same phase hues as the welcome and tutorial cards.
   The baseline text is rewritten to the new spelling, so the panels still
   compare exactly around the recoloured values. See tests/README.md. */
const UI_DELTAS = [
  [
    /background:#FFF8DC;border:1px solid #FFA000/g,
    "background:#FFF3CD;border:1px solid #FFC107",
  ],
  [
    /background:#FFF0F0;border:2px solid #FF9800/g,
    "background:#FFF3CD;border:2px solid #FFC107",
  ],
  [
    /background:#FFF8DC;border:2px solid #FF9800/g,
    "background:#FFF3CD;border:2px solid #FFC107",
  ],
  [/color:#b34700/g, "color:#856404"],
  [/border-top:1px solid #FF9800/g, "border-top:1px solid #FFC107"],
  [/background:#4CAF50;color:white/g, "background:#2E7D32;color:white"],
  [/background:#2E5AA7;color:white/g, "background:#1976D2;color:white"],
  [/background:#FF9800;color:white/g, "background:#EF6C00;color:white"],
  [/background:#9C27B0;color:white/g, "background:#C2185B;color:white"],
  /* The refactor dropped btn-sm, a class no stylesheet ever defined; the
     button's inline style already set its size. */
  [/class="btn btn-sm"/g, 'class="btn"'],
];

/* The shipyard footer pair. The refactor put Back to Shipyard first, sized
   the two buttons alike, and moved Change Batch to the utility colour, so
   each button is reduced to its handler, label, and state, and the pair is
   sorted before comparison. */
function canonicalizeShipyardPair(html) {
  const re =
    /<button class="btn (?:btn-gold|btn-grey|btn-utility)(?: btn-lg)?(?: btn-nav)?"(\s+disabled)?\s+onclick="(gotoShipyard|changeModuleBatch)\(\)">([^<]*)<\/button>/g;
  const buttons = [];
  const marked = html.replace(re, (m, disabled, fn, label) => {
    buttons.push(
      `<button class="btn"${disabled || ""} onclick="${fn}()">${label}</button>`,
    );
    return `\u0000${buttons.length - 1}\u0000`;
  });
  if (buttons.length !== 2) return html;
  buttons.sort();
  return marked
    .replace("\u00000\u0000", buttons[0])
    .replace("\u00001\u0000", buttons[1]);
}

function canonicalize(html) {
  let out = html;
  for (const [re, to] of HANDLER_ALIASES) out = out.replace(re, to);
  for (const [re, to] of BASELINE_ERRATA) out = out.replace(re, to);
  for (const [re, to] of UI_DELTAS) out = out.replace(re, to);
  /* Whitespace between tags renders as nothing or one collapsible space and
     differs between the two editions' source templates; fold it away. Text
     content inside tags is still compared exactly. */
  out = out.replace(/>\s+</g, "><").replace(/\s+$/, "");
  return canonicalizeShipyardPair(out);
}

/* Strategy keys that read the same on both builds. */
function actionKey(onclick) {
  if (/^(purchaseCardById|purchaseCard)\(/.test(onclick)) return "buy";
  if (/^(completeOrderById|completeOrder)\(/.test(onclick)) return "trade";
  if (/^(equipModuleAt|equipModule)\(/.test(onclick)) return "equip";
  if (/^(gotoModuleDraft|gotoShipyard)\(/.test(onclick)) return "back";
  if (/^handleModuleSelect\(/.test(onclick)) return "selectModule";
  return onclick;
}

function parseButtons(html) {
  const out = [];
  const re = /<button\b([^>]*)>([\s\S]*?)<\/button>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const tag = m[1];
    const onclick = (tag.match(/onclick="([^"]*)"/) || [null, ""])[1];
    out.push({
      tag,
      text: m[2].replace(/\s+/g, " ").trim(),
      onclick,
      disabled: /\bdisabled\b/.test(tag),
    });
  }
  return out;
}

/* Purchase buttons print their price; the driver uses it to buy cheap first. */
function priceOf(button) {
  const m = /(\d+)\s*💰/.exec(button.text || "");
  return m ? Number(m[1]) : null;
}

function createGame(spec, opts = {}) {
  const store = Object.assign({}, opts.store);
  const state = {
    panels: {},
    modal: "",
    alerts: [],
    confirms: [],
    warns: [],
    errors: [],
  };
  const listeners = { document: {}, window: {} };
  const elements = {};
  const noop = () => {};

  const ctx2d = new Proxy({}, { get: () => noop, set: () => true });

  function element(id) {
    if (elements[id]) return elements[id];
    const el = {
      id,
      scrollTop: 0,
      scrollHeight: 0,
      width: 0,
      height: 0,
      style: {},
      classList: { add: noop, remove: noop, contains: () => false },
      getContext: () => ctx2d,
      addEventListener: noop,
      getAttribute: () => null,
    };
    let html = "";
    Object.defineProperty(el, "innerHTML", {
      get: () => html,
      set: (v) => {
        html = String(v);
        if (id === "modal-root") state.modal = html;
        else state.panels[id] = html;
      },
    });
    elements[id] = el;
    return el;
  }

  function onclickElements() {
    const html = [
      ...PANEL_IDS.map((id) => state.panels[id] || ""),
      state.modal,
    ].join("\n");
    const out = [];
    const re = /<[a-z]+\b[^>]*\sonclick="([^"]*)"/g;
    let m;
    while ((m = re.exec(html)) !== null) {
      out.push({ getAttribute: () => m[1] });
    }
    return out;
  }

  const consoleStub = {
    log: noop,
    warn: (...a) => state.warns.push(a.map(String).join(" ")),
    error: (...a) => state.errors.push(a.map(String).join(" ")),
  };

  const sandbox = {
    console: consoleStub,
    document: {
      getElementById: element,
      addEventListener: (type, fn) => {
        (listeners.document[type] = listeners.document[type] || []).push(fn);
      },
      querySelectorAll: (sel) => (sel === "[onclick]" ? onclickElements() : []),
    },
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => {
        store[k] = String(v);
      },
      removeItem: (k) => {
        delete store[k];
      },
    },
    confirm: (msg) => {
      state.confirms.push(String(msg));
      return opts.confirm === undefined ? true : opts.confirm;
    },
    alert: (msg) => state.alerts.push(String(msg)),
    setTimeout: () => 0,
    clearTimeout: noop,
    requestAnimationFrame: noop,
    addEventListener: (type, fn) => {
      (listeners.window[type] = listeners.window[type] || []).push(fn);
    },
    removeEventListener: noop,
    innerWidth: 1280,
    innerHeight: 800,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;

  const context = vm.createContext(sandbox);
  // Math has to be patched from inside the context: the global's intrinsics are
  // not reachable as properties of the contextified sandbox object.
  const seed = opts.seed === undefined ? 20241002 : opts.seed;
  vm.runInContext(
    `Math.random = (function () {
       let s = ${seed} >>> 0;
       return function () {
         s = (s * 1664525 + 1013904223) >>> 0;
         return s / 4294967296;
       };
     })();`,
    context,
  );

  for (const src of spec.sources) {
    vm.runInContext(src.code, context, { filename: src.name });
  }

  const gameExpr = spec.kind === "current" ? "PM.game" : "game";
  const logsExpr = spec.kind === "current" ? "PM.logs" : "logs";

  function run(expr) {
    return vm.runInContext(expr, context, { filename: "handler" });
  }

  function fireLoad() {
    for (const fn of listeners.window.load || []) fn();
  }

  function pressKey(key) {
    for (const fn of listeners.document.keydown || [])
      fn({ key, ctrlKey: true, preventDefault: noop });
  }

  function snapshot() {
    const game = run(gameExpr);
    return {
      phase: String(game.phase),
      round: game.currentRound,
      game: stableJson(stripRetired(game)),
      logs: stableJson(run(logsExpr).slice()),
      panels: PANEL_IDS.map((id) => canonicalize(state.panels[id] || "")),
      modal: canonicalize(state.modal),
    };
  }

  return {
    spec,
    store,
    state,
    run,
    fireLoad,
    pressKey,
    snapshot,
    game: () => run(gameExpr),
    logs: () => run(logsExpr).slice(),
    hash: () => hash(stableJson(snapshot())),
  };
}

/* Drives the game by clicking its own buttons, one per step. The strategy is
   deliberately plain: buy, hire, assign, trade, pay, upgrade. */
function playScripted(g, opts = {}) {
  const buysPerRound = opts.buysPerRound === undefined ? 99 : opts.buysPerRound;
  const hireCap = opts.hires === undefined ? 2 : opts.hires;
  const maxSteps = opts.maxSteps || 260;
  const snaps = [];
  const hashes = [];
  const actions = [];
  let round = -1;
  let buys = 0;
  let hires = 0;
  let assignments = 0;
  let drafted = false;
  let changed = false;
  let lastAction = "";
  let repeats = 0;

  for (let i = 0; i < maxSteps; i++) {
    const game = g.game();
    const phase = game.phase;
    if (phase === "endgame" || phase === "bankruptcy") break;
    if (game.currentRound !== round) {
      round = game.currentRound;
      buys = 0;
      assignments = 0;
      drafted = false;
      changed = false;
    }

    const html = ["phase-panel", "control-panel"]
      .map((id) => g.state.panels[id] || "")
      .join("\n");
    const buttons = parseButtons(html).filter((b) => !b.disabled && b.onclick);
    const first = (key) =>
      buttons.find((b) => actionKey(b.onclick).startsWith(key));

    let action = null;
    if (phase === 0) action = first("startBoonDrafting");
    else if (phase === 5) action = first("selectBoonById");
    else if (phase === 1) {
      // Cheapest first: a merchant that grabs the priciest lot goes broke
      // before the run covers the later phases.
      const lots = buttons
        .filter((b) => actionKey(b.onclick) === "buy")
        .sort((a, b) => (priceOf(a) ?? Infinity) - (priceOf(b) ?? Infinity));
      action =
        (buys < buysPerRound && lots.length ? lots[0] : null) ||
        first("completePhase1");
    } else if (phase === "worker_mgmt") {
      const hire = first("hireWorker");
      const assign = first("assignTask");
      action =
        (hires < hireCap && hire) ||
        (assign && assignments < 6 && ++assignments && assign) ||
        first("startPhase2");
      if (action === hire) hires++;
    } else if (phase === 2) {
      action = first("trade") || first("completePhase2");
    } else if (phase === 3) {
      action = first("doMaintenance");
    } else if (phase === 4) {
      action =
        first("upgradeShip") ||
        (!drafted && first("startModuleDrafting")) ||
        first("skipUpgrade");
      if (action && action.onclick === "startModuleDrafting()") drafted = true;
    } else if (phase === "module_draft") {
      action =
        (!changed && first("changeModuleBatch")) || first("selectModule");
      if (action && action.onclick === "changeModuleBatch()") changed = true;
    } else if (phase === "module_swap") {
      action = first("equip") || first("back");
    }

    if (!action) break;
    if (action.onclick === lastAction && ++repeats > 40) break;
    if (action.onclick !== lastAction) repeats = 0;
    lastAction = action.onclick;

    g.run(action.onclick);
    actions.push(`${phase} -> ${action.onclick}`);
    snaps.push(g.snapshot());
    hashes.push(hash(stableJson(snaps[snaps.length - 1])));
  }
  return { snaps, hashes, actions, alerts: g.state.alerts.slice() };
}

/* A single run used for every comparison: load, dismiss the tutorial, play. */
function runScenario(spec, scenario, opts = {}) {
  const seed = opts.seed === undefined ? 20241002 : opts.seed;
  const g = createGame(spec, {
    seed,
    store: opts.store,
    confirm: opts.confirm,
  });
  g.fireLoad();
  if (scenario === "boot") {
    return {
      g,
      result: {
        snaps: [g.snapshot()],
        hashes: [g.hash()],
        alerts: g.state.alerts.slice(),
      },
    };
  }
  g.run("closeTutorial()");

  if (scenario === "merchant") {
    return { g, result: playScripted(g, { hires: 1, seed }) };
  }
  if (scenario === "hoarder") {
    g.run("startBoonDrafting()");
    const r = playScripted(g, { buysPerRound: 0, hires: 0, seed });
    return { g, result: r };
  }
  if (scenario === "reload") {
    // Play a few rounds, save, then rebuild a fresh page from that save.
    const first = playScripted(g, {
      buysPerRound: 3,
      hires: 1,
      maxSteps: 60,
      seed,
    });
    g.run("saveGame()");
    const saved = Object.assign({}, g.store);
    const g2 = createGame(spec, { seed, store: saved, confirm: true });
    g2.fireLoad();
    const second = playScripted(g2, { buysPerRound: 3, hires: 0, seed });
    return {
      g: g2,
      result: {
        snaps: first.snaps.concat(second.snaps),
        hashes: first.hashes.concat(second.hashes),
        alerts: first.alerts.concat(second.alerts),
        savedPayload: saved[Object.keys(saved).find((k) => k.includes("save"))],
      },
    };
  }
  if (scenario === "keys") {
    g.run("startBoonDrafting()");
    const snaps = [g.snapshot()];
    g.pressKey("s"); // Ctrl+S
    snaps.push(g.snapshot());
    g.pressKey("n"); // Ctrl+N
    snaps.push(g.snapshot());
    g.pressKey("h"); // Ctrl+H (only acts in phase 1)
    snaps.push(g.snapshot());
    g.pressKey("F1"); // opens the guide, with ctrlKey set: F1 branch runs
    snaps.push(g.snapshot());
    return {
      g,
      result: {
        snaps,
        hashes: snaps.map((s) => hash(stableJson(s))),
        alerts: g.state.alerts.slice(),
      },
    };
  }
  throw new Error(`unknown scenario: ${scenario}`);
}

function firstDifference(a, b) {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) {
      const from = Math.max(0, i - 60);
      return {
        index: i,
        expected: String(a).slice(from, i + 120),
        actual: String(b).slice(from, i + 120),
      };
    }
  }
  return null;
}

module.exports = {
  ROOT,
  WEB_DIR,
  ENTRIES,
  PANEL_IDS,
  BASELINE_REV,
  entryPath,
  scriptSources,
  currentSpec,
  baselineSpec,
  seededRandom,
  stableJson,
  hash,
  parseButtons,
  createGame,
  playScripted,
  runScenario,
  firstDifference,
};
