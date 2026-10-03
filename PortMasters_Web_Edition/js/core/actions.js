/* Player actions: buying, trading, hiring, production, taxes, and modules. */
"use strict";
(function () {
  const PM = (window.PM = window.PM || {});
  const L = PM.lang;

  /* One entry per trade: the artisan type id and the roster that holds that
     trade's artisans. */
  const WORKER_TYPES = [
    { type: "weaver", roster: "weavers" },
    { type: "master", roster: "masterWeavers" },
    { type: "sachet_maker", roster: "sachetMakers" },
  ];

  /* The roster that holds one artisan type. */
  function workerList(type) {
    const entry = WORKER_TYPES.find((w) => w.type === type);
    return PM.game[entry.roster];
  }

  /* Every hired artisan across all trades. */
  function totalArtisans() {
    return WORKER_TYPES.reduce((n, w) => n + PM.game[w.roster].length, 0);
  }

  /* What each trade is owed this voyage. Read-only: rendering must not disturb
     the hire discounts that payWages settles. */
  function pendingWages() {
    const game = PM.game;
    const sum = (list, type) =>
      list.reduce((s, w) => s + PM.calcWorkerWage(w, type), 0);
    const weaver = sum(game.weavers, "weaver");
    const master = sum(game.masterWeavers, "master");
    const sachet = sum(game.sachetMakers, "sachet_maker");
    return { weaver, master, sachet, total: weaver + master + sachet };
  }

  /* Goods that count as silk cargo for the Silk Winds transport discount and
     the Silk Road Monopoly lift. */
  function orderHasSilk(order) {
    const silkGoods = [
      L.items.silk,
      L.items.brocade,
      L.items.sachet,
      L.items.cotton_clothes,
    ];
    return order.resources.some((r) => silkGoods.includes(r.type));
  }

  function applyBoon(boon) {
    const game = PM.game;
    game.modifierFlags = boon.modifiers;
    if (boon.modifiers.instant_gold) {
      game.money += boon.modifiers.instant_gold;
      PM.log(L.log.boonGold(boon.modifiers.instant_gold));
    }
    PM.render();
  }

  function purchaseCard(card) {
    const game = PM.game;
    if (game.purchasedCards.has(card.id)) return;
    const cost = PM.getCardFinalCost(card);
    if (game.money < cost) {
      PM.log(L.log.cannotAfford(cost, game.money));
      return;
    }
    game.money -= cost;
    game.materialCosts += cost;
    for (const r of card.resources) game.inventory[r.type] += r.quantity;
    game.purchasedCards.add(card.id);
    game.purchaseCount++;
    if (card.isProductCard) {
      const r = card.resources[0];
      PM.log(
        L.log.boughtProduct(
          card.port,
          PM.ICONS[r.type],
          r.type,
          r.quantity,
          r.price,
          r.materialCost,
          cost,
        ),
      );
      PM.log(L.log.productVatHint);
    } else {
      const txt = card.resources
        .map(
          (r) =>
            `${PM.ICONS[r.type]}${r.type}×${r.quantity}${L.log.priceEach(r.price)}`,
        )
        .join(" + ");
      PM.log(L.log.boughtAt(card.port, txt, cost));
      if (cost < card.totalCost)
        PM.log(L.log.boonDiscount(card.totalCost - cost));
    }
    PM.log(L.log.batchesPurchased(game.purchaseCount));
    PM.triggerJuice();
    PM.render();
  }

  function purchaseCardById(id) {
    purchaseCard(PM.game.resourceCards[id]);
  }

  function completeOrder(order) {
    const game = PM.game;
    if (game.completedOrders.has(order.id)) return;
    for (const r of order.resources) {
      if ((game.inventory[r.type] || 0) < r.required) {
        PM.log(L.log.inventoryShort(r.type, r.required));
        return;
      }
    }
    const hasSilk = orderHasSilk(order);
    let transport = PM.calcTransportCost(order.totalItems, hasSilk);
    for (const r of order.resources) game.inventory[r.type] -= r.required;
    const { totalVat, payout } = PM.orderPayout(order, hasSilk, transport);
    const reward = payout;
    if (order.isProductOrder) {
      game.vatPaid += totalVat;
      PM.log(L.log.salesVat(totalVat));
    }
    game.money -= transport;
    game.materialCosts += transport;
    const origTransport = transport;
    if (PM.hasModule("silk_monopoly") && hasSilk && order.isProductOrder) {
      PM.log(L.log.silkMonopoly);
    }
    if (PM.hasModule("salvage_crane") && Math.random() < 0.3) {
      // The reconciliation block below refunds the difference after the
      // hooks run, so the hook only reports the refunded amount.
      PM.log(L.log.salvageRefund(transport));
      transport = 0;
    }
    if (PM.hasModule("tax_evasion") && Math.random() < 0.15) {
      game.money -= 20;
      PM.log(L.log.audit);
    }
    if (transport !== origTransport) {
      const diff = origTransport - transport;
      game.money += diff;
      game.materialCosts -= diff;
    }
    game.money += reward;
    game.roundRevenue += reward;
    game.score += Math.floor(reward - transport);
    game.completedOrders.add(order.id);
    game.orderCount++;
    const txt = order.resources
      .map((r) => `${PM.ICONS[r.type]}${r.type}×${r.required}`)
      .join(" + ");
    PM.log(L.log.orderCompleted(order.demandPort, txt));
    PM.log(L.log.orderSettlement(reward, transport, reward - transport));
    PM.log(L.log.transactionsCompleted(game.orderCount));
    PM.triggerJuice();
    PM.render();
  }

  function completeOrderById(id) {
    completeOrder(PM.game.customerCards[id]);
  }

  function hireWorker(type) {
    const game = PM.game;
    const wage = PM.getHireCost(type);
    if (game.money < wage) {
      PM.log(L.log.cannotHire);
      return;
    }
    const info = L.workerTypes[type];
    const list = workerList(type);
    list.push({
      task: null,
      producedCount: 0,
      isSkilled: false,
      hire_discount: game.modifierFlags.hire_discount || 0,
    });
    PM.log(L.log.hired(info.hireIcon, info.name, wage));
    PM.triggerJuice();
    PM.render();
  }

  function fireWorker(type, idx) {
    const game = PM.game;
    const list = workerList(type);
    const wage = PM.WAGES[type];
    const info = L.workerTypes[type];
    if (idx < 0 || idx >= list.length) return;
    if (game.money < wage) {
      PM.log(L.log.cannotPaySeverance(info.name, wage));
      return;
    }
    game.money -= wage;
    const worker = list.splice(idx, 1)[0];
    PM.log(L.log.dismissed(info.name, wage));
    if (worker.task) PM.log(L.log.wasMaking(worker.task));
    PM.render();
  }

  function assignTask(type, task) {
    const game = PM.game;
    const list = workerList(type);
    const recipe = PM.RECIPES[task];
    for (const worker of list) {
      if (worker.task === null) {
        let can = true;
        for (const [m, a] of Object.entries(recipe.materials))
          if ((game.inventory[m] || 0) < a) {
            can = false;
            break;
          }
        if (!can) {
          PM.log(L.log.materialShortage(task));
          return;
        }
        for (const [m, a] of Object.entries(recipe.materials))
          game.inventory[m] -= a;
        worker.task = task;
        const matTxt = Object.entries(recipe.materials)
          .map(([m, a]) => `${PM.ICONS[m]}${m}×${a}`)
          .join(" + ");
        PM.log(L.log.taskAssigned(PM.ICONS[task], task, matTxt));
        PM.render();
        return;
      }
    }
    PM.log(L.log.allWorkersBusy);
  }

  function processProduction() {
    const game = PM.game;
    const bonus = game.modifierFlags.worker_bonus_production || 0;
    const rosters = WORKER_TYPES.map((w) => ({
      list: game[w.roster],
      name: L.workerTypes[w.type].prodName,
    }));
    for (const { list, name } of rosters) {
      for (const w of list) {
        if (w.task) {
          const base = w.isSkilled ? 2 : 1;
          const amt =
            base + bonus + (PM.hasModule("artisans_workshop") ? 1 : 0);
          game.inventory[w.task] = (game.inventory[w.task] || 0) + amt;
          w.producedCount = (w.producedCount || 0) + amt;
          if (amt > base)
            PM.log(L.log.producedBonus(name, amt, PM.ICONS[w.task], w.task));
          else if (w.isSkilled)
            PM.log(L.log.producedSkilled(name, PM.ICONS[w.task], w.task));
          else PM.log(L.log.produced(name, PM.ICONS[w.task], w.task));
          if (w.producedCount >= 2 && !w.isSkilled) {
            w.isSkilled = true;
            PM.log(L.log.promotion(name));
          }
          w.task = null;
        }
      }
    }
  }

  function payWages() {
    const game = PM.game;
    const countWorkers = (list, type) => {
      let w = 0;
      for (const worker of list) {
        w += PM.calcWorkerWage(worker, type);
        delete worker.hire_discount;
      }
      return w;
    };
    const ww = countWorkers(game.weavers, "weaver");
    const mw = countWorkers(game.masterWeavers, "master");
    const sw = countWorkers(game.sachetMakers, "sachet_maker");
    const total = ww + mw + sw;
    if (total === 0) return true;
    if (game.money >= total) {
      game.money -= total;
      game.workerWages += total;
      if (ww > 0)
        PM.log(
          L.log.wagesPaid(game.weavers.length, L.workerTypes.weaver.plural, ww),
        );
      if (mw > 0)
        PM.log(
          L.log.wagesPaid(
            game.masterWeavers.length,
            L.workerTypes.master.plural,
            mw,
          ),
        );
      if (sw > 0)
        PM.log(
          L.log.wagesPaid(
            game.sachetMakers.length,
            L.workerTypes.sachet_maker.plural,
            sw,
          ),
        );
      return true;
    }
    PM.log(L.log.wagesShortfall(total, game.money));
    PM.log(L.log.workersStrike);
    PM.log(L.log.reputationCollapsed);
    return "bankruptcy";
  }

  function payMaintenance() {
    const game = PM.game;
    const cost = PM.maintenanceCost();
    if (game.money >= cost) {
      game.money -= cost;
      game.maintenanceCosts += cost;
      PM.log(L.log.maintenancePaid(cost));
      return true;
    }
    if (game.money > 0) {
      const paid = game.money;
      game.money = 0;
      game.maintenanceCosts += paid;
      PM.log(L.log.forcedPayment(paid, cost));
      PM.log(L.log.fundsDepleted);
      return "bankruptcy";
    }
    return "bankruptcy";
  }

  function purchaseIntel() {
    const game = PM.game;
    if (!game.phase2DemandTags.length) {
      PM.log(L.log.noRumors);
      PM.render();
      return;
    }
    if (game.money < game.intelCost) {
      PM.log(L.log.rumorCost(game.intelCost));
      PM.render();
      return;
    }
    const count = PM.hasModule("brokers_network") ? 2 : 1;
    for (let i = 0; i < count; i++) {
      if (!game.phase2DemandTags.length) break;
      // The second rumor is never bought on credit: stop once the purse can
      // no longer cover the next one.
      if (game.money < game.intelCost) break;
      const item = PM.choice(game.phase2DemandTags);
      game.phase2DemandTags.splice(game.phase2DemandTags.indexOf(item), 1);
      // The whisper is a promise the engine keeps: Phase 2 builds the order
      // this rumor names, for exactly this item at exactly this port.
      const port = PM.choice(PM.PORTS);
      game.revealedIntel.push({ item, port });
      PM.log(L.log.rumor(port, item));
      game.money -= game.intelCost;
    }
    PM.render();
  }

  function upgradeShip() {
    const game = PM.game;
    if (game.shipLevel >= 3) return;
    const cost = PM.shipUpgradePrice();
    if (game.money < cost) {
      alert(L.ui.needGold(cost));
      return;
    }
    game.money -= cost;
    game.shipLevel++;
    PM.log(L.log.shipUpgraded(game.shipLevel));
    PM.triggerJuice();
    PM.render();
  }

  function equipModule(mod, swapIdx = null) {
    const game = PM.game;
    if (swapIdx !== null) {
      const old = game.equippedModules[swapIdx];
      if (old.id === "bulk_hauler") game.shipUpgradePenalty -= 15;
      if (old.id === "overdrive_engine") game.maintenancePenalty -= 10;
      if (old.id === "brokers_network") game.intelCost = PM.BASE_INTEL_COST;
      game.equippedModules[swapIdx] = mod;
      PM.log(L.log.moduleSwapped(old.name, mod.name));
    } else {
      if (game.equippedModules.length < game.shipLevel) {
        game.equippedModules.push(mod);
        PM.log(L.log.moduleInstalled(mod.name));
      } else {
        PM.log(L.log.noEmptySlots);
        return;
      }
    }
    if (mod.id === "bulk_hauler") game.shipUpgradePenalty += 15;
    if (mod.id === "overdrive_engine") game.maintenancePenalty += 10;
    if (mod.id === "brokers_network") game.intelCost = 2;
    PM.triggerJuice();
    PM.render();
  }

  function equipModuleAt(idx) {
    equipModule(PM.game._newModule, idx);
    PM.gotoShipyard();
  }

  PM.pendingWages = pendingWages;
  PM.totalArtisans = totalArtisans;
  PM.orderHasSilk = orderHasSilk;
  PM.applyBoon = applyBoon;
  PM.purchaseCardById = purchaseCardById;
  PM.completeOrderById = completeOrderById;
  PM.hireWorker = hireWorker;
  PM.fireWorker = fireWorker;
  PM.assignTask = assignTask;
  PM.processProduction = processProduction;
  PM.payWages = payWages;
  PM.payMaintenance = payMaintenance;
  PM.purchaseIntel = purchaseIntel;
  PM.upgradeShip = upgradeShip;
  PM.equipModule = equipModule;
  PM.equipModuleAt = equipModuleAt;
})();
