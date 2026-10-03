/* Boot: expands the content tables, publishes the handlers the inline
   onclick attributes call, wires the keyboard shortcuts, and runs the
   first-load sequence. Must be the last script on the page. */
"use strict";
(function () {
  const PM = (window.PM = window.PM || {});
  const L = PM.lang;

  /* Every function the markup calls by name. They are re-published onto the
     global object because inline handlers resolve names there, not on PM. */
  const HANDLERS = [
    "render",
    "loadGame",
    "saveGame",
    "restartGame",
    "nextPhase",
    "startBoonDrafting",
    "selectBoonById",
    "completePhase1",
    "purchaseCardById",
    "showRumorBoard",
    "purchaseIntel",
    "hireWorker",
    "fireWorker",
    "assignTask",
    "startPhase2",
    "completeOrderById",
    "completePhase2",
    "doMaintenance",
    "upgradeShip",
    "startModuleDrafting",
    "changeModuleBatch",
    "handleModuleSelect",
    "equipModuleAt",
    "gotoShipyard",
    "gotoModuleDraft",
    "skipUpgrade",
    "showInstructions",
    "showTips",
    "showTutorial",
    "closeTutorial",
    "closeModal",
  ];

  /* The core tables the game reads; assertReady stops the boot if any is
     missing. */
  const TABLES = [
    "ICONS",
    "COLORS",
    "RESOURCES",
    "PRODUCTS",
    "PORTS",
    "RECIPES",
    "COMMODITIES",
    "PRODUCT_PRICES",
    "RESOURCE_PROBS",
    "WAGES",
    "BOONS",
    "MODULES",
  ];

  function fatal(message) {
    console.error("🚨 [ENGINE] " + message);
    const p = document.getElementById("phase-panel");
    if (p) {
      p.innerHTML = `<div style="padding:20px; color:#FF5252; background:#2A0000; border:2px solid #FF5252; border-radius:8px; margin:20px; font-family: monospace;">
        <h3>${L.ui.crashTitle}</h3>
        <p>${PM.escapeHtml(message)}</p>
      </div>`;
    }
  }

  /* Confirms the engine is fully assembled before the first frame draws. */
  function assertReady() {
    const missing = [];
    for (const name of TABLES) if (!PM[name]) missing.push("PM." + name);
    for (const name of HANDLERS) {
      if (typeof PM[name] !== "function") missing.push("PM." + name + "()");
    }
    if (missing.length) {
      fatal("Missing engine members: " + missing.join(", "));
      return false;
    }
    return true;
  }

  function exportHandlers() {
    for (const name of HANDLERS) window[name] = PM[name];
  }

  /* Checks every function name the page's onclick attributes call against
     the globals the engine published and warns about any gap. Catches a
     renamed export the moment it renders. */
  function auditHandlers() {
    const calls = new Set();
    const pattern = /(?:^|[^.\w$])([A-Za-z_$][\w$]*)\s*\(/g;
    const keywords = new Set([
      "if",
      "for",
      "while",
      "switch",
      "return",
      "typeof",
      "function",
      "catch",
      "new",
      "delete",
      "void",
      "in",
      "of",
    ]);
    for (const el of document.querySelectorAll("[onclick]")) {
      const src = el.getAttribute("onclick");
      let match;
      while ((match = pattern.exec(src)) !== null) {
        if (!keywords.has(match[1])) calls.add(match[1]);
      }
    }
    const gaps = [...calls].filter(
      (name) => typeof window[name] !== "function",
    );
    if (gaps.length) {
      console.warn("🚨 [ENGINE] Unresolved click handlers:", gaps.join(", "));
    }
    return gaps;
  }

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "s") {
      e.preventDefault();
      PM.saveGame();
    } else if (e.ctrlKey && e.key === "n") {
      e.preventDefault();
      PM.nextPhase();
    } else if (e.ctrlKey && e.key === "r") {
      e.preventDefault();
      PM.restartGame();
    } else if (e.ctrlKey && e.key === "h") {
      e.preventDefault();
      if (PM.game.phase === 1) PM.completePhase1();
    } else if (e.key === "F1") {
      e.preventDefault();
      PM.showInstructions();
    }
  });

  window.addEventListener("load", () => {
    if (localStorage.getItem(PM.SAVE_KEY)) {
      if (confirm(L.ui.confirmContinueSave)) {
        if (PM.loadGame()) return;
      }
    }
    PM.showWelcome();
    if (!localStorage.getItem(PM.TUTORIAL_KEY)) {
      PM.showTutorial(0);
    }
  });

  PM.buildContent();
  if (assertReady()) {
    exportHandlers();
    PM.auditHandlers = auditHandlers;
  }
})();
