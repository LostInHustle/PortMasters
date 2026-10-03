/* Content tables.
   Prices, probabilities, recipes, and modifiers live here once, keyed by
   language-neutral ids. buildContent() then expands them with the active
   language pack into the name-keyed tables the rest of the engine reads.
   Saves are keyed by those display names too, so a save file only resolves
   in the edition whose pack wrote it. */
"use strict";
(function () {
  const PM = (window.PM = window.PM || {});
  const L = PM.lang;

  const ITEM_IDS = [
    "hemp",
    "silk",
    "tea",
    "linen_clothes",
    "cotton_clothes",
    "brocade",
    "sachet",
  ];
  const RESOURCE_IDS = ["hemp", "silk", "tea"];
  const PRODUCT_IDS = ["linen_clothes", "cotton_clothes", "brocade", "sachet"];
  const PORT_IDS = ["quanzhou", "guangzhou", "ningbo", "yangzhou", "hangzhou"];

  const RECIPE_TABLE = {
    linen_clothes: { materials: { hemp: 2 }, worker_type: "weaver" },
    cotton_clothes: { materials: { hemp: 2, silk: 1 }, worker_type: "weaver" },
    brocade: { materials: { silk: 3 }, worker_type: "master" },
    sachet: { materials: { silk: 1, tea: 2 }, worker_type: "sachet_maker" },
  };

  const COMMODITY_TABLE = {
    hemp: { ports: ["quanzhou", "ningbo"], basePrice: [3, 6] },
    silk: { ports: ["hangzhou", "yangzhou"], basePrice: [6, 10] },
    tea: { ports: ["guangzhou", "quanzhou"], basePrice: [10, 14] },
  };

  const PRODUCT_PRICE_TABLE = {
    linen_clothes: [30, 42],
    cotton_clothes: [50, 65],
    brocade: [70, 90],
    sachet: [95, 120],
  };

  const RESOURCE_PROB_TABLE = { hemp: 0.4, silk: 0.35, tea: 0.25 };

  const WAGES = { weaver: 8, master: 12, sachet_maker: 20 };

  /* Rates and fees the rules text quotes as well as the engine applies. */
  PM.BASE_INTEL_COST = 5;
  PM.VAT_RATE = 0.05;
  PM.INCOME_TAX_RATE = 0.1;

  /* The boon and module drafts walk these tables in entry order, so the order
     is part of the game's random stream and must not be rearranged. */
  const BOON_TABLE = [
    { id: "silk_wind", modifiers: { transport_silk_discount: 0.5 } },
    { id: "favorable_tides", modifiers: { transport_flat_discount: 4 } },
    { id: "merchant_charm", modifiers: { purchase_discount: 0.15 } },
    { id: "artisan_inspiration", modifiers: { worker_bonus_production: 1 } },
    { id: "emergency_loan", modifiers: { instant_gold: 40 } },
    { id: "tax_shelter", modifiers: { income_tax_override: 0.05 } },
    { id: "hemp_monopoly", modifiers: { hemp_price_reduction: 2 } },
    { id: "master_apprentice", modifiers: { hire_discount: 0.5 } },
  ];

  const MODULE_TABLE = [
    { id: "smugglers_hold" },
    { id: "bulk_hauler" },
    { id: "artisans_workshop" },
    { id: "tax_evasion" },
    { id: "silk_monopoly" },
    { id: "brokers_network" },
    { id: "salvage_crane" },
    { id: "overdrive_engine" },
  ];

  const nameOf = (id) => L.items[id];

  function buildContent() {
    PM.ICONS = {};
    PM.COLORS = {};
    for (const id of ITEM_IDS) {
      PM.ICONS[nameOf(id)] = L.icons[id];
      PM.COLORS[nameOf(id)] = L.colors[id];
    }

    PM.RESOURCES = RESOURCE_IDS.map(nameOf);
    PM.PRODUCTS = PRODUCT_IDS.map(nameOf);
    PM.PORTS = PORT_IDS.map((id) => L.ports[id]);

    PM.RECIPES = {};
    for (const [id, recipe] of Object.entries(RECIPE_TABLE)) {
      const materials = {};
      for (const [matId, amount] of Object.entries(recipe.materials)) {
        materials[nameOf(matId)] = amount;
      }
      PM.RECIPES[nameOf(id)] = {
        materials,
        worker_type: recipe.worker_type,
      };
    }

    PM.COMMODITIES = {};
    for (const [id, commodity] of Object.entries(COMMODITY_TABLE)) {
      PM.COMMODITIES[nameOf(id)] = {
        ports: commodity.ports.map((portId) => L.ports[portId]),
        basePrice: commodity.basePrice,
      };
    }

    PM.PRODUCT_PRICES = {};
    for (const [id, price] of Object.entries(PRODUCT_PRICE_TABLE)) {
      PM.PRODUCT_PRICES[nameOf(id)] = price;
    }

    PM.RESOURCE_PROBS = {};
    for (const [id, prob] of Object.entries(RESOURCE_PROB_TABLE)) {
      PM.RESOURCE_PROBS[nameOf(id)] = prob;
    }

    PM.WAGES = WAGES;

    PM.BOONS = BOON_TABLE.map((boon) => {
      const text = L.boons[boon.id];
      return {
        id: boon.id,
        name: text.name,
        icon: text.icon,
        desc: text.desc,
        modifiers: boon.modifiers,
      };
    });

    PM.MODULES = MODULE_TABLE.map((module) => {
      const text = L.modules[module.id];
      return {
        id: module.id,
        name: text.name,
        icon: text.icon,
        desc: text.desc,
      };
    });
  }

  PM.buildContent = buildContent;
})();
