/* Game state, module checks, and the save/load round trip. */
"use strict";
(function () {
  const PM = (window.PM = window.PM || {});
  const L = PM.lang;

  const SAVE_KEY = "portmasters_save";
  const TUTORIAL_KEY = "portmasters_tutorial_seen";

  /* The opening position, and the state restartGame returns to. */
  function createInitialState() {
    return {
      inventory: {
        [L.items.hemp]: 8,
        [L.items.silk]: 5,
        [L.items.tea]: 3,
        [L.items.linen_clothes]: 0,
        [L.items.cotton_clothes]: 0,
        [L.items.brocade]: 0,
        [L.items.sachet]: 0,
      },
      money: 100,
      score: 0,
      currentRound: 1,
      maxRounds: 8,
      materialCosts: 0,
      workerWages: 0,
      maintenanceCosts: 0,
      vatPaid: 0,
      incomeTaxPaid: 0,
      roundRevenue: 0,
      weavers: [],
      masterWeavers: [],
      sachetMakers: [],
      fixedCost: 15,
      shipLevel: 0,
      shipUpgradeCost: [15, 25, 40],
      shipUpgradePenalty: 0,
      maintenancePenalty: 0,
      phase: 0,
      resourceCards: [],
      customerCards: [],
      purchasedCards: new Set(),
      completedOrders: new Set(),
      purchaseCount: 0,
      orderCount: 0,
      gameOver: false,
      modifierFlags: {},
      phase2DemandTags: [],
      revealedIntel: [],
      intelCost: PM.BASE_INTEL_COST,
      equippedModules: [],
      // The module offer is locked per round: the batch may be changed at
      // most once per round, and leaving or reentering the draft screen
      // never rerolls it.
      _draftBatch: null,
      _draftChoices: null,
      _draftChangesLeft: 1,
    };
  }

  PM.game = createInitialState();

  function hasModule(id) {
    return PM.game.equippedModules.some((m) => m.id === id);
  }

  function saveGame() {
    const game = PM.game;
    const data = Object.assign({}, game, {
      purchasedCards: Array.from(game.purchasedCards),
      completedOrders: Array.from(game.completedOrders),
    });
    // The module draft batch and its change allowance are per round runtime
    // state, so they are never persisted.
    delete data._draftBatch;
    delete data._draftChoices;
    delete data._draftChangesLeft;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      PM.log(L.log.saved);
      alert(L.ui.savedAlert);
    } catch (e) {
      PM.log(L.log.saveFailed(e));
    }
  }

  function loadGame() {
    const game = PM.game;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const d = JSON.parse(raw);
      Object.assign(game, d);
      game.purchasedCards = new Set(d.purchasedCards || []);
      game.completedOrders = new Set(d.completedOrders || []);
      // Draft state is per round runtime state, so a loaded save starts with
      // a fresh batch and a full change allowance. A save made on the draft
      // screens returns to the shipyard instead.
      game._draftBatch = null;
      game._draftChoices = null;
      game._draftChangesLeft = 1;
      if (game.phase === "module_draft" || game.phase === "module_swap") {
        game.phase = 4;
      }
      PM.log(L.log.loaded);
      PM.render();
      return true;
    } catch (e) {
      PM.log(L.log.loadFailed(e));
      return false;
    }
  }

  PM.SAVE_KEY = SAVE_KEY;
  PM.TUTORIAL_KEY = TUTORIAL_KEY;
  PM.createInitialState = createInitialState;
  PM.hasModule = hasModule;
  PM.saveGame = saveGame;
  PM.loadGame = loadGame;
})();
