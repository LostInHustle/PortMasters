/* One renderer per game phase. Nearly every string comes from the language
   pack; the brand title and a few glyphs are written inline. */
"use strict";
(function () {
  const PM = (window.PM = window.PM || {});
  const L = PM.lang;

  function renderWelcome(p) {
    const hasSave = !!localStorage.getItem(PM.SAVE_KEY);
    const t = L.ui.welcome;
    p.innerHTML = `
    <div class="center-block">
      <div class="hero-title">⚓ PortMasters 🚢</div>
      <div class="subtitle-text">${t.subtitle}</div>
      <div style="text-align:center; margin: 20px 0">
        ${hasSave ? `<button class="btn btn-success btn-xl" onclick="loadGame()">${t.continueVoyage}</button><br><br>` : ""}
        <button class="btn btn-success btn-xl" onclick="startBoonDrafting()">${t.setSail}</button>
        <br><button class="btn" onclick="showTutorial(0)" style="margin-top:8px;font-size:13px;padding:8px 22px">${t.tutorial}</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px auto;text-align:left;max-width:700px">
        <div style="background:#E8F5E9;border-left:4px solid #4CAF50;border-radius:4px;padding:10px">
          <div style="font-weight:bold;color:#2d5a2d;margin-bottom:4px">${t.startTitle}</div>
          <div style="font-size:12px">${t.startGoods}</div>
          <div style="font-size:12px">${t.startFunds}</div>
        </div>
        <div style="background:#FFF3CD;border-left:4px solid #FFC107;border-radius:4px;padding:10px">
          <div style="font-weight:bold;color:#856404;margin-bottom:4px">${t.delayTitle}</div>
          <div style="font-size:12px">${t.delayLine}</div>
          <div style="font-size:11px;color:#856404">${t.delayNote}</div>
        </div>
        <div style="background:#E3F2FD;border-left:4px solid #2196F3;border-radius:4px;padding:10px">
          <div style="font-weight:bold;color:#0d47a1;margin-bottom:4px">${t.costsTitle}</div>
          <div style="font-size:12px">${t.costsMaintenance}</div>
          <div style="font-size:12px">${t.costsWages}</div>
        </div>
        <div style="background:#FCE4EC;border-left:4px solid #E91E63;border-radius:4px;padding:10px">
          <div style="font-weight:bold;color:#880e4f;margin-bottom:4px">${t.taxesTitle}</div>
          <div style="font-size:12px">${t.taxesVat}</div>
          <div style="font-size:12px">${t.taxesIncome}</div>
        </div>
      </div>
      <div style="max-width:700px;margin:0 auto">
        <div style="background:#F0F8FF;border:1px solid #2E5AA7;border-radius:6px;padding:10px;margin-bottom:8px;font-size:12px">
          <strong>${t.phasesTitle}</strong>${t.phasesBody}
        </div>
        <div style="background:#FFF3CD;border:1px solid #FFC107;border-radius:6px;padding:10px;margin-bottom:8px;font-size:12px">
          <strong>${t.tipTitle}</strong>${t.tipBody}
        </div>
        <div style="display:flex;gap:8px;font-size:11px">
          <div style="flex:1;background:#F0F8FF;border-radius:4px;padding:8px">${t.footBroker}</div>
          <div style="flex:1;background:#F0F8FF;border-radius:4px;padding:8px">${t.footUpgrade}</div>
          <div style="flex:1;background:#F0F8FF;border-radius:4px;padding:8px">${t.footKeys}</div>
        </div>
      </div>
    </div>`;
  }

  function renderBoonDraft(p) {
    const game = PM.game;
    const gs = {
      money: game.money,
      inventory: game.inventory,
      weavers: game.weavers,
      master_weavers: game.masterWeavers,
      sachet_makers: game.sachetMakers,
    };
    const weightFuncs = {
      silk_wind: () =>
        (gs.inventory[L.items.silk] || 0) > 2 || gs.master_weavers.length > 0
          ? 2.5
          : 0.8,
      favorable_tides: () => 1.5,
      merchant_charm: () => (gs.money > 40 ? 2.0 : 0.5),
      artisan_inspiration: () =>
        gs.weavers.length + gs.master_weavers.length + gs.sachet_makers.length >
        0
          ? 3.0
          : 0.0,
      emergency_loan: () => (gs.money < 30 ? 4.0 : 0.2),
      tax_shelter: () => 1.5,
      hemp_monopoly: () =>
        (gs.inventory[L.items.hemp] || 0) < 5 || gs.weavers.length > 0
          ? 2.0
          : 1.0,
      master_apprentice: () => 1.5,
    };
    const available = PM.BOONS.map((b) => [b, weightFuncs[b.id]()]).filter(
      ([, w]) => w > 0,
    );
    const picks = [];
    const pool = [...available];
    for (let i = 0; i < 3; i++) {
      if (!pool.length) break;
      picks.push(PM.weightedChoice(pool));
      pool.splice(
        pool.findIndex((x) => x[0].id === picks[picks.length - 1].id),
        1,
      );
    }
    p.innerHTML = `
    <div class="center-block">
      <div class="hero-title">${L.ui.boon.title}</div>
      <div class="subtitle-text">${L.ui.boon.subtitle}</div>
      <div class="card-grid">
        ${picks
          .map(
            (b) => `
          <div class="boon-card">
            <div class="boon-icon">${b.icon}</div>
            <div class="boon-name">${b.name}</div>
            <div class="boon-desc">${b.desc}</div>
            <button class="btn btn-gold btn-lg" onclick="selectBoonById('${b.id}')">${L.ui.boon.lockIn}</button>
          </div>
        `,
          )
          .join("")}
      </div>
    </div>`;
  }

  function renderPurchase(p) {
    const game = PM.game;
    const t = L.ui.purchase;
    p.innerHTML = `
    <div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px">
        <h2 style="color:#1A3C8C">${t.title}</h2>
        <button class="btn btn-gold" onclick="showRumorBoard()">${t.brokerBoard}</button>
      </div>
      <div class="card-grid">
        ${game.resourceCards
          .map((c) => {
            const finalCost = PM.getCardFinalCost(c);
            const purchased = game.purchasedCards.has(c.id);
            const canAfford = game.money >= finalCost && !purchased;
            return `
            <div class="card">
              <div class="card-header">📍 ${c.port} [${c.isProductCard ? t.product : t.rawMaterial}]</div>
              <div class="card-body">
                ${c.resources
                  .map(
                    (r) => `
                  <div class="resource-row">
                    <span class="icon">${PM.ICONS[r.type]}</span>
                    <span class="name" style="color:${PM.COLORS[r.type]}">${r.type}</span>
                    <span class="qty">×${r.quantity}</span>
                    <span class="price">${t.unit(r.price)}</span>
                  </div>
                  ${
                    r.materialCost
                      ? `
                    <div style="font-size:10px; color:#888; padding-left:24px">${t.matCost(r.materialCost, r.materialDetails)}</div>
                    <div style="font-size:10px; color:#FF5252; padding-left:24px">${t.markup(r.price - r.materialCost, (((r.price - r.materialCost) / r.materialCost) * 100).toFixed(0))}</div>
                  `
                      : ""
                  }
                `,
                  )
                  .join("")}
                <div class="separator"></div>
                <div style="color:#FF5252; font-weight:bold; font-size:14px">
                  ${t.total(finalCost)}
                  ${finalCost < c.totalCost ? `<span style="color:#888; font-size:11px">${t.was(c.totalCost)}</span>` : ""}
                </div>
              </div>
              <div class="card-footer">
                <button class="btn ${canAfford ? "btn-success" : "btn-grey"}" style="width:100%" 
                  ${!canAfford ? "disabled" : ""} onclick="purchaseCardById(${c.id})">
                  ${purchased ? t.purchased : t.buy(finalCost)}
                </button>
              </div>
            </div>`;
          })
          .join("")}
      </div>
      <div style="text-align:center; margin-top:20px">
        <button class="btn btn-lg" onclick="completePhase1()">${t.complete}</button>
      </div>
    </div>`;
  }

  function renderWorkerMgmt(p) {
    const game = PM.game;
    const t = L.ui.workers;
    const weaverCost = PM.getHireCost("weaver");
    const masterCost = PM.getHireCost("master");
    const makerCost = PM.getHireCost("sachet_maker");
    const {
      weaver: _ww,
      master: _mw,
      sachet: _sw,
      total: _totalWages,
    } = PM.pendingWages();
    const _nW = PM.totalArtisans();
    p.innerHTML = `
    <div class="center-block">
      <div class="hero-title">${t.title}</div>
      <div class="subtitle-text">${t.subtitle(game.money)}</div>

      <div style="background:#E8F5E9;border:2px solid #4CAF50;border-radius:6px;padding:10px 14px;margin-bottom:14px;font-size:12px">
        <strong>${t.cycleTitle}</strong>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-top:6px;text-align:center">
          <div style="background:#2E7D32;color:white;border-radius:4px;padding:4px 2px;font-size:11px">${t.cycleNow}</div>
          <div style="background:#1976D2;color:white;border-radius:4px;padding:4px 2px;font-size:11px">${t.cyclePhase2}</div>
          <div style="background:#EF6C00;color:white;border-radius:4px;padding:4px 2px;font-size:11px">${t.cyclePhase3}</div>
          <div style="background:#C2185B;color:white;border-radius:4px;padding:4px 2px;font-size:11px">${t.cyclePhase4}</div>
        </div>
        <div style="margin-top:6px;color:#2d5a2d">${t.cycleNote}</div>
      </div>

      <div style="background:#F0F8FF; border:2px solid #2E5AA7; border-radius:8px; padding:16px; margin:16px 0">
        <h3 style="color:#1A3C8C; text-align:center">${t.inventoryTitle}</h3>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:10px">
          <div>
            <strong style="color:#2E5AA7">${t.rawMaterials}</strong>
            ${PM.inventoryRows(PM.RESOURCES)}
          </div>
          <div>
            <strong style="color:#2E5AA7">${t.finishedGoods}</strong>
            ${PM.inventoryRows(PM.PRODUCTS)}
          </div>
        </div>
      </div>

      <div class="separator"></div>

      ${
        _nW > 0
          ? `
      <div style="background:#FFF3CD;border:2px solid #FFC107;border-radius:8px;padding:12px 16px;margin:12px 0">
        <h3 style="color:#856404;text-align:center;margin-bottom:8px">${t.payrollTitle}</h3>
        <div style="font-size:12px">
          ${_ww > 0 ? `<div style="display:flex;justify-content:space-between;padding:2px 0"><span>${t.payrollLine("👩‍🔧", game.weavers.length, L.workerTypes.weaver.short, PM.WAGES.weaver)}</span><span style="font-weight:bold">${L.money(_ww)}</span></div>` : ""}
          ${_mw > 0 ? `<div style="display:flex;justify-content:space-between;padding:2px 0"><span>${t.payrollLine("👩‍🎨", game.masterWeavers.length, L.workerTypes.master.short, PM.WAGES.master)}</span><span style="font-weight:bold">${L.money(_mw)}</span></div>` : ""}
          ${_sw > 0 ? `<div style="display:flex;justify-content:space-between;padding:2px 0"><span>${t.payrollLine("🌸", game.sachetMakers.length, L.workerTypes.sachet_maker.short, PM.WAGES.sachet_maker)}</span><span style="font-weight:bold">${L.money(_sw)}</span></div>` : ""}
          <div style="display:flex;justify-content:space-between;border-top:1px solid #FFC107;padding-top:4px;margin-top:4px;font-weight:bold">
            <span>${t.totalWages}</span><span style="color:#FF5252">${L.money(_totalWages)}</span>
          </div>
        </div>
      </div>
      `
          : ""
      }

      <div style="background:#FFF8DC; border:2px solid #2E5AA7; border-radius:8px; padding:16px; margin:16px 0">
        <h3 style="color:#1A3C8C; text-align:center">${t.hireTitle}</h3>
        <div style="font-size:12px; margin:10px 0">
          <div><strong>${t.hireWeaverName}</strong>${t.hireWeaverDetail}<span style="color:#FF9800">${t.perRound(PM.WAGES.weaver)}</span></div>
          <div><strong>${t.hireMasterName}</strong>${t.hireMasterDetail}<span style="color:#FF9800">${t.perRound(PM.WAGES.master)}</span></div>
          <div><strong>${t.hireMakerName}</strong>${t.hireMakerDetail}<span style="color:#FF9800">${t.perRound(PM.WAGES.sachet_maker)}</span></div>
        </div>
        <div style="text-align:center; margin-top:10px">
          <button class="btn btn-success" onclick="hireWorker('weaver')">${t.hireWeaverButton(weaverCost)}</button>
          <button class="btn" onclick="hireWorker('master')">${t.hireMasterButton(masterCost)}</button>
          <button class="btn btn-warning" onclick="hireWorker('sachet_maker')">${t.hireMakerButton(makerCost)}</button>
        </div>
      </div>

      ${
        PM.totalArtisans() > 0
          ? `
        <div class="separator"></div>
        <div style="background:#F0F8FF; border:2px solid #2E5AA7; border-radius:8px; padding:16px; margin:16px 0">
          <h3 style="color:#1A3C8C; text-align:center">${t.statusTitle}</h3>
          ${renderWorkerList("weaver", game.weavers, [L.items.linen_clothes, L.items.cotton_clothes])}
          ${renderWorkerList("master", game.masterWeavers, [L.items.linen_clothes, L.items.cotton_clothes, L.items.brocade])}
          ${renderWorkerList("sachet_maker", game.sachetMakers, [L.items.sachet])}
        </div>
      `
          : ""
      }

      <div style="text-align:center; margin-top:20px">
        <button class="btn btn-lg" onclick="startPhase2()">${t.complete}</button>
      </div>
    </div>`;
  }

  function renderWorkerList(type, list, tasks) {
    if (!list.length) return "";
    const info = L.workerTypes[type];
    const t = L.ui.workers;
    return `
    <div style="margin:12px 0">
      <strong style="color:#2E5AA7">${info.icon} ${info.plural}: ${t.count(list.length)}</strong>
      ${list
        .map(
          (w, i) => `
        <div class="worker-row">
          <span>${t.workerLine(info.short, i + 1, w)}</span>
          <span>
            ${!w.task ? `<button class="btn btn-danger" style="padding:4px 8px; font-size:11px" onclick="fireWorker('${type}', ${i})">${t.dismiss(PM.WAGES[type])}</button>` : ""}
          </span>
        </div>
      `,
        )
        .join("")}
      <div style="margin-top:6px">
        ${tasks
          .map((task) => {
            const recipe = PM.RECIPES[task];
            const mats = Object.entries(recipe.materials)
              .map(([m, a]) => `${PM.ICONS[m]}${m}×${a}`)
              .join("+");
            return `<button class="btn" style="margin:2px; padding:6px 12px; font-size:11px" onclick="assignTask('${type}', '${task}')">${t.makeTask(task, mats)}</button>`;
          })
          .join("")}
      </div>
    </div>`;
  }

  function renderOrders(p) {
    const game = PM.game;
    const t = L.ui.orders;
    p.innerHTML = `
    <div>
      <h2 style="color:#1A3C8C; margin-bottom:16px">${t.title}</h2>
      <div class="card-grid">
        ${game.customerCards
          .map((o) => {
            const canComplete = o.resources.every(
              (r) => (game.inventory[r.type] || 0) >= r.required,
            );
            const completed = game.completedOrders.has(o.id);
            const hasSilk = PM.orderHasSilk(o);
            const transport = PM.calcTransportCost(o.totalItems, hasSilk);
            const { totalVat, netProfit } = PM.orderPayout(
              o,
              hasSilk,
              transport,
            );
            return `
            <div class="card">
              <div class="card-header">📍 ${o.demandPort} ${o.isProductOrder ? t.productDemand : t.rawDemand}</div>
              <div class="card-body">
                ${o.resources
                  .map((r) => {
                    const has = (game.inventory[r.type] || 0) >= r.required;
                    return `
                    <div class="resource-row">
                      <span style="font-size:14px">${has ? "✅" : "❌"}</span>
                      <span class="icon">${PM.ICONS[r.type]}</span>
                      <span class="name" style="color:${PM.COLORS[r.type]}">${r.type}</span>
                      <span class="qty">×${r.required}</span>
                      <span class="inv-status" style="color:${has ? "green" : "red"}">${t.inventory(game.inventory[r.type] || 0)}</span>
                    </div>`;
                  })
                  .join("")}
                <div style="font-size:11px; color:#FF5252; margin-top:6px">${t.freight(transport)}</div>
                <div class="${netProfit >= 0 ? "profit-positive" : "profit-negative"}" style="font-size:13px; margin-top:4px">
                  ${t.reward(o.reward, netProfit)}
                </div>
                ${o.isProductOrder ? `<div style="font-size:10px; color:#666">${t.estVat(totalVat)}</div>` : ""}
              </div>
              <div class="card-footer">
                <button class="btn ${canComplete && !completed ? "" : "btn-grey"}" style="width:100%"
                  ${!canComplete || completed ? "disabled" : ""} onclick="completeOrderById(${o.id})">
                  ${completed ? t.completed : t.trade(netProfit)}
                </button>
              </div>
            </div>`;
          })
          .join("")}
      </div>
      <div style="text-align:center; margin-top:20px">
        <button class="btn btn-lg" onclick="completePhase2()">${t.complete}</button>
      </div>
    </div>`;
  }

  function renderMaintenance(p) {
    const game = PM.game;
    const t = L.ui.maintenance;
    const cost = PM.maintenanceCost();
    const canAfford = game.money >= cost;
    const balanceAfter = game.money - cost;
    const nWorkers = PM.totalArtisans();
    p.innerHTML = `
    <div class="center-block">
      <div class="hero-title">${t.title}</div>

      <div style="background:#E8F5E9;border:2px solid #4CAF50;border-radius:8px;padding:14px;margin:14px 0">
        <h3 style="color:#2d5a2d;margin-bottom:8px">${t.processedTitle}</h3>
        <div style="display:flex;justify-content:space-between;font-size:13px;padding:3px 0">
          <span>${t.production}</span><span style="color:#4CAF50;font-weight:bold">${t.done}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:13px;padding:3px 0">
          <span>${t.wagesPaid(nWorkers)}</span>
          <span style="color:#FF5252;font-weight:bold">${L.money(game.workerWages)}</span>
        </div>
      </div>

      <div style="background:#FFF3CD;border:2px solid #FFC107;border-radius:8px;padding:14px;margin:14px 0">
        <h3 style="color:#856404;margin-bottom:8px">${t.pendingTitle}</h3>
        <div style="display:flex;justify-content:space-between;font-size:14px;padding:3px 0">
          <span>${t.maintenanceFee}</span><span style="color:#FF9800;font-weight:bold">${L.money(cost)}</span>
        </div>
        ${game.maintenancePenalty > 0 ? `<div style="font-size:11px;color:#888;padding-left:10px">${t.penaltyNote(game.fixedCost, game.maintenancePenalty)}</div>` : ""}
      </div>

      <div style="background:#F0F8FF;border:2px solid #2E5AA7;border-radius:8px;padding:14px;margin:14px 0">
        <h3 style="color:#1A3C8C;margin-bottom:8px">${t.balanceTitle}</h3>
        <div style="display:flex;justify-content:space-between;font-size:13px;padding:2px 0"><span>${t.currentFunds}</span><span style="color:#4CAF50;font-weight:bold">${L.money(game.money)}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:13px;padding:2px 0"><span>${t.afterMaintenance}</span><span style="font-weight:bold;color:${balanceAfter >= 0 ? "#2E5AA7" : "#FF5252"}">${L.money(balanceAfter)}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:13px;padding:2px 0"><span>${t.roundRevenue}</span><span style="color:#4CAF50">+${L.money(game.roundRevenue)}</span></div>
      </div>

      <div class="separator"></div>
      <div style="text-align:center">
        <button class="btn btn-warning btn-xl" onclick="doMaintenance()">
          ${canAfford ? t.payCost(cost) : t.forcePay(game.money, cost)}
        </button>
      </div>
    </div>`;
  }

  function renderShipyard(p) {
    const game = PM.game;
    const t = L.ui.shipyard;
    const canUpgrade = game.shipLevel < 3;
    const upgCost = PM.shipUpgradePrice();
    const affordable = game.money >= upgCost;
    const canDraft = game.shipLevel > 0;
    const slotsFull =
      game.equippedModules.length >= game.shipLevel && game.shipLevel > 0;
    p.innerHTML = `
    <div class="center-block">
      <div class="hero-title">${t.title}</div>
      <div class="separator"></div>
      <div style="background:#E6F2FF; border:3px solid #2E5AA7; border-radius:8px; padding:20px; margin:20px 0">
        <div style="font-size:16px; font-weight:bold; color:#1A3C8C">${t.shipLevel(game.shipLevel, game.shipLevel * 5)}</div>
        <div style="font-size:14px; color:#2E5AA7; margin-top:6px">${t.moduleSlots(game.equippedModules.length, game.shipLevel)}</div>
        ${
          game.equippedModules.length
            ? `
          <div style="margin-top:12px">
            ${game.equippedModules.map((m) => `<div style="font-size:12px; padding:3px 0">${m.icon} <strong>${m.name}</strong>: ${m.desc}</div>`).join("")}
          </div>
        `
            : `<div style="font-size:12px; color:#666; margin-top:8px">${t.noModules}</div>`
        }
      </div>
      <div style="display:flex; flex-direction:column; gap:8px">
        ${
          canUpgrade
            ? `
          <button class="btn ${affordable ? "" : "btn-grey"} btn-lg" ${!affordable ? "disabled" : ""} onclick="upgradeShip()">
            ${t.upgrade(game.shipLevel + 1, upgCost)}
          </button>`
            : ""
        }
        <button class="btn ${canDraft ? "btn-gold" : "btn-grey"} btn-lg" ${!canDraft ? "disabled" : ""} onclick="startModuleDrafting()">
          ${slotsFull ? t.draftSwap : t.draftInstall}
        </button>
        <button class="btn btn-success btn-lg" onclick="skipUpgrade()">${t.continueVoyage}</button>
      </div>
    </div>`;
  }

  function renderModuleDraft(p) {
    const game = PM.game;
    const t = L.ui.moduleDraft;
    p.innerHTML = `
    <div class="center-block">
      <div class="hero-title">${t.title}</div>
      <div class="subtitle-text">${t.subtitle}</div>
      <div class="card-grid">
        ${game._draftChoices
          .map(
            (m, i) => `
          <div class="module-card">
            <div class="module-icon">${m.icon}</div>
            <div class="module-name">${m.name}</div>
            <div class="module-desc">${m.desc}</div>
            <button class="btn btn-gold btn-lg" onclick="handleModuleSelect(${i})">
              ${game.equippedModules.length < game.shipLevel ? t.install : t.swap}
            </button>
          </div>
        `,
          )
          .join("")}
      </div>
      ${
        game._draftChoices.length
          ? ""
          : `<div class="subtitle-text" style="margin-top:20px">${t.allInstalled}</div>`
      }
      <div style="text-align:center; margin-top:20px">
        <button class="btn btn-grey btn-lg btn-nav" onclick="gotoShipyard()">${t.back}</button>
        <button class="btn ${game._draftChangesLeft > 0 ? "btn-utility" : "btn-grey"} btn-lg btn-nav" ${
          game._draftChangesLeft > 0 ? "" : "disabled"
        } onclick="changeModuleBatch()">
          ${game._draftChangesLeft > 0 ? t.changeBatch : t.changeBatchUsed}
        </button>
      </div>
    </div>`;
  }

  function renderModuleSwap(p) {
    const game = PM.game;
    const t = L.ui.moduleSwap;
    p.innerHTML = `
    <div class="center-block">
      <div class="hero-title" style="color:#FF5252">${t.title}</div>
      <div class="subtitle-text">${t.newModule(game._newModule.icon, game._newModule.name, game._newModule.desc)}</div>
      <div style="background:#F0F8FF; border:2px solid #2E5AA7; border-radius:8px; padding:16px; margin:20px 0">
        ${game.equippedModules
          .map(
            (m, i) => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; background:white; border-radius:4px; margin:6px 0">
            <div>
              <strong>${m.icon} ${m.name}</strong>
              <div style="font-size:11px; color:#666">${m.desc}</div>
            </div>
            <button class="btn btn-danger" onclick="equipModuleAt(${i})">${t.replace}</button>
          </div>
        `,
          )
          .join("")}
      </div>
      <div style="text-align:center">
        <button class="btn btn-grey" onclick="gotoModuleDraft()">${t.back}</button>
      </div>
    </div>`;
  }

  function renderBankruptcy(p) {
    const game = PM.game;
    const t = L.ui.bankruptcy;
    p.innerHTML = `
    <div class="center-block" style="text-align:center">
      <div style="font-size:80px">💥</div>
      <div class="hero-title" style="color:#FF5252">${t.title}</div>
      <div class="subtitle-text">${game.money <= 0 ? t.reasonDepleted : t.reasonShortfall}</div>
      <div class="separator"></div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; max-width:400px; margin:20px auto; text-align:left">
        <div>${t.roundsCompleted}</div><div><strong>${game.currentRound - 1}/${game.maxRounds}</strong></div>
        <div>${t.finalFunds}</div><div><strong>${L.money(game.money)}</strong></div>
        <div>${t.finalReputation}</div><div><strong>${game.score}</strong></div>
        <div>${t.shipLevel}</div><div><strong>${t.shipLevelValue(game.shipLevel)}</strong></div>
        <div>${t.taxesPaid}</div><div><strong>${L.money(game.vatPaid + game.incomeTaxPaid)}</strong></div>
      </div>
      <div class="separator"></div>
      <div style="display:flex;justify-content:center;gap:12px;margin-top:4px">
        <button class="btn btn-lg" onclick="restartGame()">${t.restart}</button>
        <button class="btn btn-warning btn-lg" onclick="showTips()">${t.tips}</button>
      </div>
    </div>`;
  }

  function renderEndgame(p) {
    const game = PM.game;
    const t = L.ui.endgame;
    const rating = PM.ratingFor(game.score);
    p.innerHTML = `
    <div class="center-block" style="text-align:center">
      <div class="hero-title">${t.title}</div>
      <div style="font-size:22px; font-weight:bold; color:#2E5AA7; margin:20px 0">${t.finalReputation(game.score)}</div>
      <div style="font-size:20px; color:#4CAF50; margin:10px 0">${t.finalFunds(game.money)}</div>
      <div style="font-size:20px; color:#FFD700; margin:20px 0">${t.rank(rating)}</div>
      <div class="separator"></div>
      <button class="btn btn-xl" onclick="restartGame()">${t.restart}</button>
    </div>`;
  }

  PM.renderWelcome = renderWelcome;
  PM.renderBoonDraft = renderBoonDraft;
  PM.renderPurchase = renderPurchase;
  PM.renderWorkerMgmt = renderWorkerMgmt;
  PM.renderOrders = renderOrders;
  PM.renderMaintenance = renderMaintenance;
  PM.renderShipyard = renderShipyard;
  PM.renderModuleDraft = renderModuleDraft;
  PM.renderModuleSwap = renderModuleSwap;
  PM.renderBankruptcy = renderBankruptcy;
  PM.renderEndgame = renderEndgame;
})();
