/* The render pipeline: the four panels the game draws into. */
"use strict";
(function () {
  const PM = (window.PM = window.PM || {});
  const L = PM.lang;

  function render() {
    try {
      renderStatus();
      renderPhase();
      renderControls();
      renderLog();
    } catch (err) {
      console.error("🚨 [ENGINE] Render Pipeline Crash:", err);
      const p = document.getElementById("phase-panel");
      if (p)
        p.innerHTML = `<div style="padding:20px; color:#FF5252; background:#2A0000; border:2px solid #FF5252; border-radius:8px; margin:20px; font-family: monospace;">
        <h3>${L.ui.crashTitle}</h3>
        <p>${PM.escapeHtml(err.message)}</p>
        <button class="btn btn-danger" onclick="render()">${L.ui.crashRetry}</button>
      </div>`;
    }
  }

  /* One cargo row per good: icon, name, and count in the good's own colour. */
  function inventoryRows(names) {
    const inventory = PM.game.inventory;
    return names
      .map(
        (r) =>
          `<div class="inv-item"><span class="icon">${PM.ICONS[r]}</span><span class="name" style="color:${PM.COLORS[r]}">${r}</span><span class="count" style="color:${PM.COLORS[r]}">${inventory[r] || 0}</span></div>`,
      )
      .join("");
  }

  function renderStatus() {
    const game = PM.game;
    const p = document.getElementById("status-panel");
    const discount = game.shipLevel * 5;
    const t = L.ui.status;
    let html = `
    <div class="status-section">
      <h3>${t.captainLog}</h3>
      <div class="stat-row"><span>${t.voyage}</span><span class="stat-value">${t.roundOf(game.currentRound, game.maxRounds)}</span></div>
      <div class="stat-row"><span>${t.funds}</span><span class="stat-money">${game.money} ${L.ui.gold}</span></div>
      <div class="stat-row"><span>${t.reputation}</span><span class="stat-score">${game.score}</span></div>
    </div>
    <div class="status-section">
      <h3>${t.vessel}</h3>
      <div class="stat-row"><span>${t.classLabel}</span><span class="stat-value">${t.shipLevel(game.shipLevel)}</span></div>
      <div class="stat-row"><span>${t.freight}</span><span style="font-size:10px">${t.freightHint(discount)}</span></div>
      <div class="stat-row"><span>${t.modules}</span><span class="stat-value">${game.equippedModules.length}/${game.shipLevel}</span></div>
      ${game.equippedModules.map((m) => `<div class="stat-row" style="font-size:10px"><span>${m.icon} ${m.name}</span></div>`).join("")}
    </div>
    <div class="status-section">
      <h3>${t.cargoHold}</h3>
      <div class="inv-section-title">${t.rawMaterials}</div>
      ${inventoryRows(PM.RESOURCES)}
      <div class="inv-section-title">${t.finishedGoods}</div>
      ${inventoryRows(PM.PRODUCTS)}
      ${
        PM.totalArtisans() > 0
          ? `
        <div class="inv-section-title">${t.artisans}</div>
        <div class="inv-item"><span class="name">👩‍🔧 ${L.workerTypes.weaver.statusPlural}</span><span class="count">${game.weavers.length}</span></div>
        <div class="inv-item"><span class="name">👩‍🎨 ${L.workerTypes.master.statusPlural}</span><span class="count">${game.masterWeavers.length}</span></div>
        <div class="inv-item"><span class="name">🌸 ${L.workerTypes.sachet_maker.statusPlural}</span><span class="count">${game.sachetMakers.length}</span></div>
      `
          : ""
      }
    </div>`;
    if (![0, 5, "endgame", "bankruptcy"].includes(game.phase)) {
      const {
        weaver: _ww,
        master: _mw,
        sachet: _sw,
        total: _pendWages,
      } = PM.pendingWages();
      const _pendMaint = game.fixedCost + game.maintenancePenalty;
      const _pendTotal = _pendWages + _pendMaint;
      const _safe = game.money >= _pendTotal;
      const _nW = PM.totalArtisans();
      html += `
    <div class="status-section" style="border-color:${_safe ? "#2E5AA7" : "#FF5252"}">
      <h3>${t.obligations}</h3>
      <div class="stat-row"><span>${t.maintenance}</span><span class="stat-value">${_pendMaint} ${L.ui.gold}</span></div>
      <div class="stat-row"><span>${t.wages}${_nW > 0 ? t.wageCount(_nW) : ""}</span><span class="stat-value">${_nW > 0 ? _pendWages + " " + L.ui.gold : "0 " + L.ui.gold}</span></div>
      ${_ww > 0 ? `<div class="stat-row" style="font-size:10px;padding-left:10px"><span>${t.wageBreakdown(game.weavers.length, L.workerTypes.weaver.short)}</span><span>${_ww}${t.goldShort}</span></div>` : ""}
      ${_mw > 0 ? `<div class="stat-row" style="font-size:10px;padding-left:10px"><span>${t.wageBreakdown(game.masterWeavers.length, L.workerTypes.master.short)}</span><span>${_mw}${t.goldShort}</span></div>` : ""}
      ${_sw > 0 ? `<div class="stat-row" style="font-size:10px;padding-left:10px"><span>${t.wageBreakdown(game.sachetMakers.length, L.workerTypes.sachet_maker.short)}</span><span>${_sw}${t.goldShort}</span></div>` : ""}
      <div class="stat-row" style="border-top:1px solid ${_safe ? "#2E5AA7" : "#FF5252"};margin-top:4px;padding-top:4px">
        <span><strong>${t.totalDue}</strong></span>
        <span style="font-weight:bold;color:${_safe ? "#4CAF50" : "#FF5252"}">${_pendTotal} ${L.ui.gold}</span>
      </div>
      ${!_safe ? `<div style="background:#FF5252;color:white;border-radius:4px;padding:3px 6px;font-size:10px;margin-top:4px;text-align:center">${t.riskShortfall}</div>` : `<div style="font-size:10px;color:#4CAF50;text-align:center;margin-top:4px">${t.fundsSufficient}</div>`}
    </div>`;
    }
    p.innerHTML = html;
  }

  function renderPhase() {
    const p = document.getElementById("phase-panel");
    const phase = PM.game.phase;
    if (phase === 0) PM.renderWelcome(p);
    else if (phase === 5) PM.renderBoonDraft(p);
    else if (phase === 1) PM.renderPurchase(p);
    else if (phase === "worker_mgmt") PM.renderWorkerMgmt(p);
    else if (phase === 2) PM.renderOrders(p);
    else if (phase === 3) PM.renderMaintenance(p);
    else if (phase === 4) PM.renderShipyard(p);
    else if (phase === "bankruptcy") PM.renderBankruptcy(p);
    else if (phase === "endgame") PM.renderEndgame(p);
    else if (phase === "module_draft") PM.renderModuleDraft(p);
    else if (phase === "module_swap") PM.renderModuleSwap(p);
    else
      p.innerHTML = `<div class="center-block"><div class="hero-title">${L.ui.unknownPhase}</div></div>`;
  }

  function renderControls() {
    const game = PM.game;
    const c = document.getElementById("control-panel");
    const b = L.ui.controls;
    /* Anything a branch below does not override is the quiet default: a
       disabled "on voyage" start button and a disabled continue. */
    let startText = b.onVoyage;
    let startDisabled = true;
    let startAction = "";
    let nextText = b.continue;
    let nextDisabled = true;

    if (game.gameOver) {
      startText = b.gameOver;
    } else if (game.phase === 0) {
      // A pack may flesh this label out with the voyage number.
      startText =
        typeof b.setSail === "function"
          ? b.setSail(game.currentRound)
          : b.setSail;
      startDisabled = false;
      startAction = "startBoonDrafting()";
    } else if (game.phase === 5) {
      startText = b.draftingBoon;
    } else if ([1, 2, 3, 4, "worker_mgmt"].includes(game.phase)) {
      nextText = b.nextPhase;
      nextDisabled = false;
    }

    c.innerHTML = `
    <button class="btn" ${startDisabled ? "disabled" : ""} onclick="${startAction}">${startText}</button>
    <button class="btn" ${nextDisabled ? "disabled" : ""} onclick="nextPhase()">${nextText}</button>
    <button class="btn" onclick="showInstructions()">${b.guide}</button>
    <button class="btn btn-success" onclick="saveGame()">${b.save}</button>
    <button class="btn" onclick="restartGame()">${b.restart}</button>`;
  }

  function renderLog() {
    const l = document.getElementById("log-panel");
    l.innerHTML = PM.logs
      .slice(-100)
      .map((m) => `<div class="log-entry">${PM.escapeHtml(m)}</div>`)
      .join("");
    l.scrollTop = l.scrollHeight;
  }

  PM.render = render;
  PM.inventoryRows = inventoryRows;
  PM.renderLog = renderLog;
})();
