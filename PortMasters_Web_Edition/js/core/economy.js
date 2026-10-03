/* The economy: cost and tax formulas, order and purchase-card generation,
   and the module draft batch. */
"use strict";
(function () {
  const PM = (window.PM = window.PM || {});
  const L = PM.lang;

  function calcTransportCost(totalItems, hasSilk = false) {
    const base = totalItems * 2;
    const game = PM.game;
    let discount = game.shipLevel * 5;
    if (game.modifierFlags.transport_flat_discount)
      discount += game.modifierFlags.transport_flat_discount;
    let cost = Math.max(5, base - discount);
    if (hasSilk && game.modifierFlags.transport_silk_discount)
      cost = Math.max(
        5,
        Math.floor(cost * game.modifierFlags.transport_silk_discount),
      );
    if (PM.hasModule("bulk_hauler")) cost = Math.max(0, cost - totalItems);
    if (PM.hasModule("overdrive_engine")) cost = Math.max(0, cost - 5);
    if (PM.hasModule("silk_monopoly") && hasSilk) cost = 0;
    return Math.max(0, cost);
  }

  /* The average-price value of one unit's raw materials. */
  function materialCostOf(product) {
    let total = 0;
    for (const [m, a] of Object.entries(PM.RECIPES[product].materials)) {
      const [lo, hi] = PM.COMMODITIES[m].basePrice;
      total += ((lo + hi) / 2) * a;
    }
    return total;
  }

  function calcVAT(product, sellingPrice) {
    const matCost = materialCostOf(product);
    const workerCost = PM.WAGES[PM.RECIPES[product].worker_type];
    const taxable = sellingPrice - matCost - workerCost;
    if (taxable > 0) {
      let vat = Math.floor(taxable * PM.VAT_RATE);
      if (PM.hasModule("tax_evasion")) vat = Math.floor(vat * 0.5);
      return vat;
    }
    return 0;
  }

  function calcIncomeTax(preTax) {
    if (preTax <= 0) return 0;
    const rate =
      PM.game.modifierFlags.income_tax_override || PM.INCOME_TAX_RATE;
    let tax = Math.floor(preTax * rate);
    if (PM.hasModule("smugglers_hold")) tax = Math.floor(tax * 1.2);
    if (PM.hasModule("tax_evasion")) tax = Math.floor(tax * 0.5);
    return tax;
  }

  /* The maintenance charge for this voyage. */
  function maintenanceCost() {
    return PM.game.fixedCost + PM.game.maintenancePenalty;
  }

  /* The price of the next ship upgrade, 0 at the top ship level. */
  function shipUpgradePrice() {
    const game = PM.game;
    return game.shipLevel >= 3
      ? 0
      : game.shipUpgradeCost[game.shipLevel] + game.shipUpgradePenalty;
  }

  /* The payout math a completed order performs. VAT comes off the reward
     first, then Silk Road Monopoly lifts a product order's payout; transport
     is settled separately, so the caller passes the figure it charged. The
     random module hooks (salvage crane, tax audit) stay in completeOrder. */
  function orderPayout(order, hasSilk, transport) {
    let totalVat = 0;
    let payout = order.reward;
    if (order.isProductOrder) {
      const product = order.resources[0].type;
      const unitVat = PM.calcVAT(product, payout / order.resources[0].required);
      totalVat = unitVat * order.resources[0].required;
      payout -= totalVat;
    }
    if (PM.hasModule("silk_monopoly") && hasSilk && order.isProductOrder) {
      payout = Math.floor(payout * 1.2);
    }
    return { totalVat, payout, netProfit: payout - transport };
  }

  function getCardFinalCost(card) {
    const game = PM.game;
    let cost = card.totalCost;
    if (game.modifierFlags.purchase_discount)
      cost = Math.floor(cost * (1 - game.modifierFlags.purchase_discount));
    if (game.modifierFlags.hemp_price_reduction) {
      for (const r of card.resources)
        if (r.type === L.items.hemp)
          cost -= r.quantity * game.modifierFlags.hemp_price_reduction;
    }
    if (PM.hasModule("smugglers_hold")) cost = Math.floor(cost * 0.85);
    return Math.max(0, cost);
  }

  function getHireCost(type) {
    let wage = PM.WAGES[type];
    if (PM.game.modifierFlags.hire_discount)
      wage = Math.floor(wage * (1 - PM.game.modifierFlags.hire_discount));
    return wage;
  }

  function calcWorkerWage(w, type) {
    let wage = PM.WAGES[type];
    if (w.hire_discount) wage = Math.floor(wage * (1 - w.hire_discount));
    if (w.isSkilled) wage = Math.floor(wage * 1.5);
    if (PM.hasModule("artisans_workshop")) wage = Math.floor(wage * 1.2);
    return wage;
  }

  /* An order, or the order a whisper promised: when port is given, the order
     stands at that port instead of drawing one. */
  function genRawOrder(filter = null, port = null) {
    const num = PM.rand(1, 3);
    const resources = [];
    const available = [...PM.RESOURCES];
    if (!port) port = PM.choice(PM.PORTS);
    let total = 0;
    if (filter && PM.RESOURCES.includes(filter)) {
      const req = PM.rand(2, 5);
      total += req;
      resources.push({ type: filter, required: req });
    } else {
      for (let i = 0; i < num; i++) {
        if (!available.length) break;
        const r = PM.choice(available);
        available.splice(available.indexOf(r), 1);
        const req = PM.rand(2, 5);
        total += req;
        resources.push({ type: r, required: req });
      }
    }
    const base = resources.reduce((s, r) => s + r.required * 5, 0);
    return {
      demandPort: port,
      resources,
      reward: base + PM.rand(10, 25),
      totalItems: total,
      isProductOrder: false,
    };
  }

  function genProductOrder(filter = null, port = null) {
    const product =
      filter && PM.PRODUCTS.includes(filter) ? filter : PM.choice(PM.PRODUCTS);
    const req = PM.rand(1, 3);
    if (!port) port = PM.choice(PM.PORTS);
    const basePrice = PM.rand(...PM.PRODUCT_PRICES[product]);
    return {
      demandPort: port,
      resources: [{ type: product, required: req }],
      reward: basePrice * req,
      totalItems: req,
      isProductOrder: true,
    };
  }

  /* One Phase 2 order. A revealed rumor claims the order at its own index, so
     every whisper returns as exactly the order it names: the whispered item at
     the whispered port. Orders no rumor claimed are drawn blind. */
  function genMixedOrder(intelIdx) {
    const intel = PM.game.revealedIntel[intelIdx];
    if (intel) {
      if (PM.RESOURCES.includes(intel.item))
        return genRawOrder(intel.item, intel.port);
      if (PM.PRODUCTS.includes(intel.item))
        return genProductOrder(intel.item, intel.port);
    }
    return Math.random() < 0.5 ? genRawOrder() : genProductOrder();
  }

  function genResourceCard() {
    if (Math.random() < 0.3) return genProductPurchaseCard();
    const num = PM.rand(1, 3);
    const resources = [];
    const available = Object.keys(PM.RESOURCE_PROBS);
    const probs = Object.values(PM.RESOURCE_PROBS);
    const port = PM.choice(PM.PORTS);
    for (let i = 0; i < num; i++) {
      if (!available.length) break;
      let r = Math.random(),
        acc = 0,
        chosen = available[0];
      for (let j = 0; j < available.length; j++) {
        acc += probs[j];
        if (r <= acc) {
          chosen = available[j];
          break;
        }
      }
      const idx = available.indexOf(chosen);
      available.splice(idx, 1);
      probs.splice(idx, 1);
      const qty = PM.rand(1, 3);
      const [min, max] = PM.COMMODITIES[chosen].basePrice;
      const base = PM.rand(min, max);
      const price = PM.COMMODITIES[chosen].ports.includes(port)
        ? base - 1
        : base + 1;
      resources.push({ type: chosen, quantity: qty, price });
    }
    const total = resources.reduce((s, r) => s + r.quantity * r.price, 0);
    return { port, resources, totalCost: total, isProductCard: false };
  }

  function genProductPurchaseCard() {
    const product = PM.choice(PM.PRODUCTS);
    const qty = PM.rand(1, 2);
    const port = PM.choice(PM.PORTS);
    const matCost = materialCostOf(product);
    const details = Object.entries(PM.RECIPES[product].materials).map(
      ([m, a]) => `${m}×${a}`,
    );
    const markup = 1.4 + Math.random() * 0.4;
    let unitPrice = Math.floor(matCost * markup);
    const [min, max] = PM.PRODUCT_PRICES[product];
    unitPrice = Math.max(min, Math.min(unitPrice, max));
    return {
      port,
      resources: [
        {
          type: product,
          quantity: qty,
          price: unitPrice,
          materialCost: matCost,
          materialDetails: details.join(" + "),
        },
      ],
      totalCost: unitPrice * qty,
      isProductCard: true,
    };
  }

  function pickDraftBatch() {
    const available = PM.MODULES.filter(
      (m) => !PM.game.equippedModules.some((eq) => eq.id === m.id),
    );
    const pool = available.length >= 3 ? available : PM.MODULES;
    const picks = [];
    const copy = [...pool];
    for (let i = 0; i < 3; i++) {
      if (!copy.length) break;
      const idx = Math.floor(Math.random() * copy.length);
      picks.push(copy.splice(idx, 1)[0]);
    }
    return picks;
  }

  PM.calcTransportCost = calcTransportCost;
  PM.calcVAT = calcVAT;
  PM.calcIncomeTax = calcIncomeTax;
  PM.maintenanceCost = maintenanceCost;
  PM.shipUpgradePrice = shipUpgradePrice;
  PM.orderPayout = orderPayout;
  PM.getCardFinalCost = getCardFinalCost;
  PM.getHireCost = getHireCost;
  PM.calcWorkerWage = calcWorkerWage;
  PM.genMixedOrder = genMixedOrder;
  PM.genResourceCard = genResourceCard;
  PM.pickDraftBatch = pickDraftBatch;
})();
