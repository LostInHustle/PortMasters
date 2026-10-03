/* The phase machine: round flow, boon drafting, module drafting, and the
   endgame and bankruptcy transitions. */
"use strict";
(function () {
  const PM = (window.PM = window.PM || {});
  const L = PM.lang;

  function endRound() {
    const game = PM.game;
    PM.log(L.log.roundSettlement(game.currentRound));
    PM.log(L.log.roundRevenue(game.roundRevenue));
    const totalCost =
      game.materialCosts + game.maintenanceCosts + game.workerWages;
    PM.log(L.log.roundTotalCost(totalCost));
    PM.log(L.log.roundMaintenance(game.maintenanceCosts));
    PM.log(L.log.roundMaterials(game.materialCosts));
    PM.log(L.log.roundWages(game.workerWages));
    const preTax = game.roundRevenue - totalCost;
    PM.log(L.log.profitBeforeTax(preTax));
    const tax = PM.calcIncomeTax(preTax);
    if (tax > 0) {
      game.money -= tax;
      game.incomeTaxPaid += tax;
      const rate =
        (game.modifierFlags.income_tax_override || PM.INCOME_TAX_RATE) * 100;
      PM.log(L.log.incomeTaxPaid(rate.toFixed(0), tax));
    } else PM.log(L.log.noIncomeTax);
    if (game.vatPaid > 0) PM.log(L.log.vatPaidRound(game.vatPaid));

    game.modifierFlags = {};
    game.phase2DemandTags = [];
    game.revealedIntel = [];
    game.intelOrderUsed = false;
    game.roundRevenue = 0;
    game.maintenanceCosts = 0;
    game.materialCosts = 0;
    game.workerWages = 0;
    game.currentRound++;
    if (game.currentRound > game.maxRounds) {
      endGame();
      return;
    }
    PM.log(L.log.preparingRound(game.currentRound));
    game.phase = 0;
    game.purchaseCount = 0;
    game.orderCount = 0;
    game.resourceCards = [];
    game.customerCards = [];
    game.purchasedCards.clear();
    game.completedOrders.clear();
    game._draftBatch = null;
    game._draftChoices = null;
    game._draftChangesLeft = 1;
    startBoonDrafting();
  }

  function startBoonDrafting() {
    PM.game.phase = 5;
    PM.log(L.log.boonHeader);
    PM.log(L.log.boonPrompt);
    PM.render();
  }

  function selectBoon(boon) {
    PM.log(L.log.boonLocked(boon.icon, boon.name));
    PM.applyBoon(boon);
    startPhase1();
  }

  function selectBoonById(id) {
    const boon = PM.BOONS.find((b) => b.id === id);
    if (boon) selectBoon(boon);
  }

  function showWelcome() {
    PM.game.phase = 0;
    PM.log("=".repeat(50));
    PM.log(L.log.welcomeTitle);
    PM.log(L.log.welcomeSail);
    PM.log(L.log.welcomeHire);
    PM.log("=".repeat(50));
    PM.render();
  }

  function startPhase1() {
    const game = PM.game;
    game.phase = 1;
    game.purchaseCount = 0;
    game.purchasedCards.clear();
    game.phase2DemandTags = [];
    const allItems = [...PM.RESOURCES, ...PM.PRODUCTS];
    for (let i = 0; i < 5; i++) {
      const t = PM.choice(allItems);
      if (!game.phase2DemandTags.includes(t)) game.phase2DemandTags.push(t);
    }
    game.revealedIntel = [];
    game.intelOrderUsed = false;
    PM.log(L.log.phase1Header(game.currentRound));
    PM.log(L.log.fundsNow(game.money));
    game.resourceCards = [];
    for (let i = 0; i < 5; i++) {
      const c = PM.genResourceCard();
      c.id = i;
      game.resourceCards.push(c);
    }
    PM.render();
  }

  function completePhase1() {
    const game = PM.game;
    if (game.purchaseCount === 0) PM.log(L.log.purchasingSkipped);
    else PM.log(L.log.purchasingEnded(game.purchaseCount));
    game.phase = "worker_mgmt";
    PM.render();
  }

  function startPhase2() {
    const game = PM.game;
    game.phase = 2;
    game.orderCount = 0;
    game.completedOrders.clear();
    PM.log(L.log.phase2Header(game.currentRound));
    game.customerCards = [];
    for (let i = 0; i < 5; i++) {
      const o = PM.genMixedOrder();
      o.id = i;
      game.customerCards.push(o);
    }
    PM.render();
  }

  function completePhase2() {
    const game = PM.game;
    if (game.orderCount === 0) PM.log(L.log.tradingSkipped);
    else PM.log(L.log.tradingEnded(game.orderCount));
    startPhase3();
  }

  function startPhase3() {
    const game = PM.game;
    game.phase = 3;
    PM.log(L.log.productionHeader);
    PM.processProduction();
    PM.log(L.log.wagesHeader);
    const wageResult = PM.payWages();
    if (wageResult === "bankruptcy") {
      PM.log(L.log.bankruptWages);
      game.gameOver = true;
      game.phase = "bankruptcy";
      PM.render();
      return;
    }
    PM.log(L.log.phase3Header(game.currentRound));
    if (game.money <= 0) {
      PM.log(L.log.fundsZero);
      game.gameOver = true;
      game.phase = "bankruptcy";
      PM.render();
      return;
    }
    PM.render();
  }

  function doMaintenance() {
    const game = PM.game;
    const r = PM.payMaintenance();
    if (r === "bankruptcy") {
      game.gameOver = true;
      game.phase = "bankruptcy";
      PM.render();
      return;
    }
    startPhase4();
  }

  function startPhase4() {
    const game = PM.game;
    game.phase = 4;
    PM.log(L.log.phase4Header(game.currentRound));
    PM.render();
  }

  function skipUpgrade() {
    PM.log(L.log.skippedShipyard);
    endRound();
  }

  function endGame() {
    const game = PM.game;
    game.gameOver = true;
    game.phase = "endgame";
    PM.log("\n" + "=".repeat(50));
    PM.log(L.log.gameOverTitle);
    PM.log(L.log.finalFunds(game.money));
    PM.log(L.log.finalReputation(game.score));
    PM.log(L.log.totalTaxes(game.vatPaid + game.incomeTaxPaid));
    PM.log(L.log.rank(PM.ratingFor(game.score)));
    PM.log("=".repeat(50));
    localStorage.removeItem(PM.SAVE_KEY);
    PM.render();
  }

  function restartGame() {
    if (!confirm(L.ui.confirmRestart)) return;
    // The same opening position a fresh page boots into.
    Object.assign(PM.game, PM.createInitialState());
    // A module staged for a swap is runtime state; a restarted run has none.
    delete PM.game._newModule;
    PM.logs.length = 0;
    localStorage.removeItem(PM.SAVE_KEY);
    showWelcome();
  }

  function nextPhase() {
    const phase = PM.game.phase;
    if (phase === 1) completePhase1();
    else if (phase === "worker_mgmt") startPhase2();
    else if (phase === 2) completePhase2();
    else if (phase === 3) doMaintenance();
    else if (phase === 4) skipUpgrade();
  }

  function startModuleDrafting() {
    const game = PM.game;
    if (!game._draftBatch) game._draftBatch = PM.pickDraftBatch();
    game._draftChoices = game._draftBatch.filter(
      (m) => !game.equippedModules.some((eq) => eq.id === m.id),
    );
    game.phase = "module_draft";
    PM.render();
  }

  function changeModuleBatch() {
    const game = PM.game;
    if (game._draftChangesLeft <= 0) return;
    game._draftChangesLeft--;
    game._draftBatch = PM.pickDraftBatch();
    startModuleDrafting();
  }

  function handleModuleSelect(idx) {
    const game = PM.game;
    const mod = game._draftChoices[idx];
    if (game.equippedModules.length < game.shipLevel) {
      PM.equipModule(mod);
      game.phase = 4;
      PM.render();
    } else {
      game._newModule = mod;
      game.phase = "module_swap";
      PM.render();
    }
  }

  /* Phase-screen navigation, used by the inline handlers. */
  function gotoShipyard() {
    PM.game.phase = 4;
    PM.render();
  }

  function gotoModuleDraft() {
    PM.game.phase = "module_draft";
    PM.render();
  }

  PM.startBoonDrafting = startBoonDrafting;
  PM.selectBoonById = selectBoonById;
  PM.showWelcome = showWelcome;
  PM.completePhase1 = completePhase1;
  PM.startPhase2 = startPhase2;
  PM.completePhase2 = completePhase2;
  PM.doMaintenance = doMaintenance;
  PM.skipUpgrade = skipUpgrade;
  PM.restartGame = restartGame;
  PM.nextPhase = nextPhase;
  PM.startModuleDrafting = startModuleDrafting;
  PM.changeModuleBatch = changeModuleBatch;
  PM.handleModuleSelect = handleModuleSelect;
  PM.gotoShipyard = gotoShipyard;
  PM.gotoModuleDraft = gotoModuleDraft;
})();
