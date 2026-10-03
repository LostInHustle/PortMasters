/* English language pack.
   Every user-visible string in the game lives here. The engine reads this
   object through PM.lang, so an edition is defined entirely by which pack its
   entry page loads. Item names double as inventory and save keys, which is why
   they must stay stable once a pack has shipped. */
"use strict";
(function () {
  const PM = (window.PM = window.PM || {});

  PM.lang = {
    /* Item names. These strings are the inventory keys and the keys inside a
       saved game, so they are part of the save format. */
    items: {
      hemp: "Hemp",
      silk: "Silk",
      tea: "Tea",
      linen_clothes: "Linen Clothes",
      cotton_clothes: "Cotton Clothes",
      brocade: "Brocade",
      sachet: "Sachet",
    },

    ports: {
      quanzhou: "Quanzhou Port",
      guangzhou: "Guangzhou Port",
      ningbo: "Ningbo Port",
      yangzhou: "Yangzhou Port",
      hangzhou: "Hangzhou Port",
    },

    icons: {
      hemp: "🧶",
      silk: "👘",
      tea: "🍵",
      linen_clothes: "👔",
      cotton_clothes: "👕",
      brocade: "👗",
      sachet: "🌸",
    },

    colors: {
      hemp: "#8B7355",
      silk: "#DC143C",
      tea: "#228B22",
      linen_clothes: "#D2691E",
      cotton_clothes: "#4169E1",
      brocade: "#8B008B",
      sachet: "#FF1493",
    },

    /* Each artisan type needs several name forms: the formal name for hire and
       dismissal logs, the short name used while producing and in wage rows,
       and the plural for the cargo hold and payroll summaries. */
    workerTypes: {
      weaver: {
        name: "Weaver",
        prodName: "Weaver",
        short: "Weaver",
        plural: "Weavers",
        statusPlural: "Weavers",
        hireIcon: "👩‍🔧",
        icon: "👩‍🔧",
      },
      master: {
        name: "Master Weaver",
        prodName: "Master Weaver",
        short: "Master Weaver",
        plural: "Master Weavers",
        statusPlural: "Master Weavers",
        hireIcon: "👩‍🎨",
        icon: "👩‍🎨",
      },
      sachet_maker: {
        name: "Sachet Maker",
        prodName: "Sachet Maker",
        short: "Sachet Maker",
        plural: "Sachet Makers",
        statusPlural: "Sachet Makers",
        hireIcon: "🌸",
        icon: "🌸",
      },
    },

    boons: {
      silk_wind: {
        name: "Silk Winds",
        icon: "🌬️",
        desc: "Transport cost for Silk & Silk products is halved this voyage.",
      },
      favorable_tides: {
        name: "Favorable Tides",
        icon: "🌊",
        desc: "Base transport cost reduced by 4 Gold this voyage.",
      },
      merchant_charm: {
        name: "Merchant's Charm",
        icon: "✨",
        desc: "15% discount on all port purchases this voyage.",
      },
      artisan_inspiration: {
        name: "Artisan's Inspiration",
        icon: "🔨",
        desc: "All artisans produce +1 extra item this voyage.",
      },
      emergency_loan: {
        name: "Emergency Loan",
        icon: "💰",
        desc: "Gain 40 Gold immediately. No strings attached.",
      },
      tax_shelter: {
        name: "Tax Shelter",
        icon: "📜",
        desc: "Income tax rate reduced to 5% this voyage.",
      },
      hemp_monopoly: {
        name: "Hemp Monopoly",
        icon: "🧶",
        desc: "Hemp purchase prices reduced by 2 Gold per unit this voyage.",
      },
      master_apprentice: {
        name: "Master's Apprentice",
        icon: "🎓",
        desc: "Hiring artisans costs 50% less this voyage.",
      },
    },

    modules: {
      smugglers_hold: {
        name: "Smuggler's Hold",
        icon: "🏴‍☠️",
        desc: "Purchase costs drop 15%. Income Tax rises 20%.",
      },
      bulk_hauler: {
        name: "Bulk Hauler Rigging",
        icon: "🏗️",
        desc: "Transport cost drops 1 per item. Ship upgrades cost 15 more Gold.",
      },
      artisans_workshop: {
        name: "Artisan's Workshop",
        icon: "🛠️",
        desc: "Artisans produce +1 item. Wages +20%.",
      },
      tax_evasion: {
        name: "Tax Evasion Ledger",
        icon: "📕",
        desc: "Income Tax & VAT halved. 15% chance to lose 20 Gold on order complete (Audit).",
      },
      silk_monopoly: {
        name: "Silk Road Monopoly",
        icon: "👘",
        desc: "Silk transport cost is 0. Silk product orders yield +20% reward.",
      },
      brokers_network: {
        name: "Broker's Network",
        icon: "🕵️",
        desc: "Rumor cost: 2 Gold. Each purchase reveals 2 rumors.",
      },
      salvage_crane: {
        name: "Salvage Crane",
        icon: "♻️",
        desc: "30% chance to refund transport cost on order complete.",
      },
      overdrive_engine: {
        name: "Overdrive Engine",
        icon: "⚙️",
        desc: "Transport cost drops 5 Gold. Maintenance rises 10 Gold.",
      },
    },

    /* Activity log lines. */
    log: {
      saved: "💾 Game Saved!",
      saveFailed: (e) => `❌ Save failed: ${e}`,
      loaded: "📂 Save Loaded!",
      loadFailed: (e) => `❌ Failed to load save: ${e}`,

      boonGold: (n) => `💰 Boon applied: Gained ${n} Gold!`,
      boonHeader: "\n🧭=== The Navigator's Compass ===",
      boonPrompt: "Choose a Boon to bend the rules of the upcoming voyage...",
      boonLocked: (icon, name) => `🧭 Boon Locked In: ${icon} ${name}`,

      cannotAfford: (cost, money) =>
        `❌ Insufficient funds! Need ${cost} Gold, Have ${money} Gold`,
      boughtProduct: (port, icon, type, qty, price, matCost, cost) =>
        `🛒 Bought Product at ${port}: ${icon}${type}×${qty} (@${price} Gold/item, Mat Cost ${matCost} Gold), Total ${cost} Gold`,
      productVatHint: "   💡 Tip: VAT applies when selling finished products",
      /* One purchased lot inside the purchase log line. */
      priceEach: (price) => `(${price} Gold/item)`,
      boughtAt: (port, txt, cost) =>
        `🛒 Bought at ${port}: ${txt}, Total ${cost} Gold`,
      boonDiscount: (n) => `   ✨ Boon Discount Applied! Saved ${n} Gold`,
      batchesPurchased: (n) => `📊 Purchased ${n} cargo batches`,

      inventoryShort: (type, req) => `❌ Inventory short! Need ${type}×${req}`,
      salesVat: (v) => `🧾 Product Sales VAT: ${v} Gold`,
      silkMonopoly: "👘 Silk Monopoly: +20% Reward!",
      salvageRefund: (t) => `♻️ Salvage Crane: Refunded ${t} Gold transport!`,
      audit: "🚨 AUDIT! Tax Evasion Ledger triggered. Lost 20 Gold!",
      orderCompleted: (port, txt) => `📦 Completed Order at ${port}: ${txt}`,
      orderSettlement: (reward, transport, net) =>
        `   💰 Reward: ${reward} Gold | ⚓ Freight: ${transport} Gold = 📊 Net Profit: ${net} Gold`,
      transactionsCompleted: (n) => `📊 Completed ${n} transactions`,

      cannotHire: "❌ Insufficient funds to hire artisans!",
      hired: (icon, name, wage) =>
        `${icon} Hired a ${name}! Wage: ${wage} Gold / Voyage (paid at voyage end)`,
      cannotPaySeverance: (name, wage) =>
        `❌ Insufficient funds for ${name}'s severance: ${wage} Gold`,
      dismissed: (name, wage) =>
        `💔 Dismissed a ${name}. Severance: ${wage} Gold`,
      wasMaking: (task) => `  This artisan was making: ${task}`,
      materialShortage: (task) => `❌ Material shortage to produce ${task}!`,
      taskAssigned: (icon, task, matTxt) =>
        `📋 Assigned: Produce ${icon}${task} (Req: ${matTxt})`,
      allWorkersBusy: "❌ All artisans are already assigned tasks!",

      producedBonus: (name, amt, icon, task) =>
        `✅ ${name} finished ${amt}× ${icon}${task}! (Bonus)`,
      producedSkilled: (name, icon, task) =>
        `✅ Skilled ${name} finished 2× ${icon}${task}!`,
      produced: (name, icon, task) => `✅ ${name} finished ${icon}${task}!`,
      promotion: (name) =>
        `⭐ ${name} Promotion! Can now produce 2 items per voyage!`,

      wagesPaid: (n, plural, amt) =>
        `💰 Paid wages for ${n} ${plural}: ${amt} Gold`,
      wagesShortfall: (total, money) =>
        `⚠️ Insufficient funds! Needed: ${total} Gold, Have: ${money} Gold`,
      workersStrike: "💥 Could not pay wages, artisans strike...",
      reputationCollapsed: "💥 Reputation collapsed, forced bankruptcy!",

      maintenancePaid: (cost) => `💸 Paid Ship Maintenance Fee: ${cost} Gold`,
      forcedPayment: (paid, cost) =>
        `⚠️ Forced payment of ${paid} Gold (Needed ${cost} Gold)`,
      fundsDepleted: "⚠️ Funds depleted! Cannot continue sailing...",

      noRumors: "🔮 The Broker has no more whispers...",
      rumorCost: (cost) => `❌ Need ${cost} Gold for a rumor`,
      rumor: (port, item) =>
        `🗣️ Broker's Whisper: 'Word from ${port}: High demand for ${item}!'`,

      shipUpgraded: (level) =>
        `🎉 Ship Upgraded to Level ${level}! +1 Module Slot, +5 Discount`,
      moduleSwapped: (oldName, newName) =>
        `🔄 Swapped ${oldName} for ${newName}!`,
      moduleInstalled: (name) => `✅ Installed ${name}!`,
      noEmptySlots: "❌ No empty slots! Must swap.",

      roundSettlement: (round) => `\n📊=== Voyage ${round} Settlement ===`,
      roundRevenue: (g) => `💰 Revenue this voyage: ${g} Gold`,
      roundTotalCost: (c) => `💸 Total Cost this voyage: ${c} Gold`,
      roundMaintenance: (c) => `   🔧 Maintenance: ${c} Gold`,
      roundMaterials: (c) => `   📦 Materials: ${c} Gold`,
      roundWages: (c) => `   👥 Wages: ${c} Gold`,
      profitBeforeTax: (p) => `📈 Profit Before Tax: ${p} Gold`,
      incomeTaxPaid: (rate, tax) =>
        `🏛️ Income Tax Paid (${rate}%): ${tax} Gold`,
      noIncomeTax: "🏛️ No profit, no income tax due",
      vatPaidRound: (v) => `🧾 VAT Paid this voyage: ${v} Gold`,
      preparingRound: (r) => `\n🔄=== Preparing for Voyage ${r} ===`,

      welcomeTitle: "⚓ Welcome to PortMasters!",
      welcomeSail: "🚢 Sail across ports, build your business empire!",
      welcomeHire:
        "👥 Hire artisans to craft valuable goods for higher profits!",

      phase1Header: (r) => `\n⚓=== Voyage ${r} | Phase 1: Port Purchase ===`,
      fundsNow: (m) => `💰 Current Funds: ${m} Gold`,
      purchasingSkipped: "⏭️ Purchasing skipped",
      purchasingEnded: (n) => `✅ Purchasing ended, bought ${n} batches`,

      phase2Header: (r) =>
        `\n🤝=== Voyage ${r} | Phase 2: Trade Transaction ===`,
      tradingSkipped: "⏭️ Trading skipped",
      tradingEnded: (n) => `✅ Trading ended, completed ${n} trades`,

      productionHeader: "\n👥=== Processing Artisan Production ===",
      wagesHeader: "\n💰=== Paying Artisan Wages ===",
      bankruptWages: "⚠️ Bankruptcy due to inability to pay wages!",
      phase3Header: (r) =>
        `\n🔧=== Voyage ${r} | Phase 3: Ship Maintenance ===`,
      fundsZero: "⚠️ Funds at 0, cannot pay maintenance!",

      phase4Header: (r) =>
        `\n🚢=== Voyage ${r} | Phase 4: Shipyard & Modules ===`,
      skippedShipyard: "⏭️ Skipped Shipyard Actions",

      gameOverTitle: "🎮 PortMasters: Game Over!",
      finalFunds: (m) => `💰 Final Funds: ${m} Gold`,
      finalReputation: (s) => `🏆 Final Reputation: ${s}`,
      totalTaxes: (t) => `🧾 Total Taxes Paid: ${t} Gold`,
      rank: (rating) => `📈 Rank: ${rating}`,
    },

    /* Interface strings, grouped by the screen that shows them. */
    ui: {
      gold: "Gold",
      close: "Close",
      guideTitle: "⚓ Navigation Guide",
      tipsTitle: "💡 Trade Strategy Advice",
      unknownPhase: "🧭 The winds are still...",
      crashTitle: "⚠️ ENGINE EXCEPTION: Render Pipeline Halted",
      crashRetry: "🔄 Attempt Recovery",
      savedAlert: "Progress Saved!",
      confirmRestart: "Confirm restarting the maritime journey?",
      confirmContinueSave: "Detected previous save, continue playing?",
      needGold: (cost) => `Need ${cost} Gold`,

      ratings: {
        king: "👑 King of Silk Road",
        tycoon: "🏆 Maritime Tycoon",
        merchant: "⭐ Successful Merchant",
        trader: "👍 Qualified Trader",
        novice: "🌊 Novice Merchant",
      },

      status: {
        captainLog: "📊 Captain's Log",
        voyage: "🌊 Voyage",
        roundOf: (r, m) => `${r}/${m}`,
        funds: "💰 Funds",
        reputation: "🏆 Reputation",
        vessel: "🚢 Ship Status",
        classLabel: "Ship Level",
        shipLevel: (n) => `${n}`,
        freight: "Freight",
        freightHint: (discount) => `max(5, n×2 minus ${discount})`,
        modules: "Modules",
        cargoHold: "📦 Cargo Hold",
        rawMaterials: "Raw Materials",
        finishedGoods: "Finished Goods",
        artisans: "Artisans",
        obligations: "⚠️ Voyage End Obligations",
        maintenance: "🔧 Maintenance",
        wages: "👥 Wages",
        wageCount: (n) => ` (${n} artisans)`,
        wageBreakdown: (n, label) => `↳ ${n}× ${label}`,
        goldShort: "g",
        totalDue: "💸 Total Due",
        riskShortfall: "🚨 Risk: Funds may fall short at voyage end!",
        fundsSufficient: "✅ Funds sufficient for voyage end",
      },

      controls: {
        gameOver: "⚠️ Game Over",
        continue: "⏭️ Continue",
        setSail: "🚢 Set Sail",
        draftingBoon: "🧭 Drafting Boon...",
        onVoyage: "🚢 On Voyage...",
        nextPhase: "⏭️ Next Phase",
        guide: "📖 Guide",
        save: "💾 Save",
        restart: "🔄 Restart",
      },

      welcome: {
        subtitle: "🌊 Eight Voyages await, become the King of Silk Road!",
        continueVoyage: "📂 Continue Voyage",
        setSail: "🚢 Set Sail",
        tutorial: "📖 New Player Tutorial",
        startTitle: "🚀 Starting Resources",
        startGoods: "📦 Hemp×8, Silk×5, Tea×3",
        startFunds: "💰 100 Gold starting funds",
        delayTitle: "⏱️ Production Delay",
        delayLine: "Assign task now → item arrives at Phase 3",
        delayNote: "Artisans don't produce instantly!",
        costsTitle: "💸 Voyage End Costs",
        costsMaintenance: "🔧 Maintenance: 15 Gold (fixed each voyage)",
        costsWages: "👥 Wages deducted at Phase 3, not on hire",
        taxesTitle: "🧾 Taxes Explained",
        taxesVat: "VAT: 5% of finished-good profit margin",
        taxesIncome: "Income Tax: 10% of voyage net profit",
        phasesTitle: "🔄 4 Phases per Voyage:",
        phasesBody:
          " 1️⃣ Buy at Ports → 2️⃣ Fill Trade Orders → 3️⃣ Wages, Production & Maintenance → 4️⃣ Upgrade Ship",
        tipTitle: "💡 New Player Tip:",
        tipBody:
          " Rely on raw material orders early. Hire artisans only when you can sustain at least 2 voyages of wages. Always keep funds &gt; Maintenance + All Wages.",
        footBroker: "🔮 Phase 1 Broker: buy demand rumors to guarantee orders",
        footUpgrade:
          "🚢 Phase 4: upgrade ship → freight discounts + module slots",
        footKeys: "⌨️ Ctrl+S save | Ctrl+N next phase | F1 guide",
      },

      boon: {
        title: "🧭 The Navigator's Compass",
        subtitle: "Draft a Boon to synergize with your strategy",
        lockIn: "🔒 Lock In Boon",
      },

      purchase: {
        title: "⚓ Port Merchant Exchange",
        brokerBoard: "🔮 Broker's Rumor Board",
        product: "Product",
        rawMaterial: "Raw Material",
        unit: (price) => `Unit: ${price}💰`,
        matCost: (cost, details) => `📦 Mat Cost: ${cost} Gold (${details})`,
        markup: (gain, pct) => `💰 Markup: +${gain} Gold (${pct}%)`,
        total: (cost) => `💰 Total: ${cost} Gold`,
        was: (cost) => `(Was ${cost})`,
        purchased: "✅ Purchased",
        buy: (cost) => `🛒 Buy (${cost}💰)`,
        complete: "✅ Complete Purchase, Continue",
      },

      workers: {
        title: "👥 Artisan Management",
        subtitle: (money) =>
          `💰 Current Funds: ${money} Gold | 📦 See Inventory Below`,
        cycleTitle: "⏱️ Production Cycle: What Happens When",
        cycleNow: `📋 Now<br><span style="font-size:9px">Assign task<br>consume materials</span>`,
        cyclePhase2: `🤝 Phase 2<br><span style="font-size:9px">Trade orders</span>`,
        cyclePhase3: `✅ Phase 3<br><span style="font-size:9px">Items produced<br>+ wages paid</span>`,
        cyclePhase4: `🚢 Phase 4<br><span style="font-size:9px">Shipyard</span>`,
        cycleNote:
          "💡 Materials consumed <strong>now</strong>. Finished goods and wage deductions happen at <strong>Phase 3</strong>, not instantly.",
        inventoryTitle: "📦 Current Inventory",
        rawMaterials: "Raw Materials:",
        finishedGoods: "Finished Goods:",
        payrollTitle: "💰 Pending Payroll: Deducted at Phase 3",
        payrollLine: (icon, n, label, wage) =>
          `${icon} ${n}× ${label} (base ${wage}g)`,
        totalWages: "💸 Total Wages Due",
        hireTitle: "🔨 Hire Artisans",
        hireWeaverName: "👩‍🔧 Weaver",
        hireWeaverDetail:
          ", Linen Clothes(2 Hemp) or Cotton Clothes(2 Hemp+1 Silk), ",
        hireMasterName: "👩‍🎨 Master Weaver",
        hireMasterDetail:
          ", Linen Clothes, Cotton Clothes or Brocade(3 Silk), ",
        hireMakerName: "🌸 Sachet Maker",
        hireMakerDetail: ", Sachet(1 Silk+2 Tea), ",
        perRound: (wage) => `${wage} Gold/voyage`,
        hireWeaverButton: (cost) => `👩‍🔧 Hire Weaver (${cost}💰/voyage)`,
        hireMasterButton: (cost) => `👩‍🎨 Hire Master Weaver (${cost}💰/voyage)`,
        hireMakerButton: (cost) => `🌸 Hire Sachet Maker (${cost}💰/voyage)`,
        statusTitle: "👥 Artisan Status & Tasks",
        workerLine: (short, n, w) =>
          `${short} ${n}: ${
            w.task
              ? `Working on: ${w.task}${w.isSkilled ? " (Skilled)" : ""}`
              : `Idle${w.isSkilled ? " ⭐ Skilled" : ""}`
          }`,
        dismiss: (wage) => `Dismiss (${wage}💰)`,
        makeTask: (task, mats) => `Make ${task} (Need ${mats})`,
        count: (n) => `${n}`,
        complete: "✅ Complete Management, Continue",
      },

      orders: {
        title: "🤝 Trade Manifest",
        productDemand: "Finished Product Demand",
        rawDemand: "Raw Material Demand",
        inventory: (n) => `Inv: ${n}`,
        freight: (cost) => `⚓ Freight: ${cost} Gold`,
        reward: (reward, net) =>
          `💰 Reward: ${reward} Gold 📊 Net: ${net} Gold`,
        estVat: (v) => `🧾 Est. VAT: ${v} Gold`,
        completed: "✅ Completed",
        trade: (net) => `🤝 Trade (Net ${net}💰)`,
        complete: "✅ Complete Trades, Continue",
      },

      maintenance: {
        title: "🔧 Phase 3: Voyage Settlement",
        processedTitle: "✅ Already Processed",
        production: "👷 Artisan Production",
        done: "Completed ✓",
        wagesPaid: (n) => `💰 Wages Paid (${n} artisan${n !== 1 ? "s" : ""})`,
        pendingTitle: "⏳ Pending Payment",
        maintenanceFee: "🔧 Ship Maintenance Fee",
        penaltyNote: (fixed, penalty) =>
          `↳ Base ${fixed}g + Overdrive Engine penalty ${penalty}g`,
        balanceTitle: "💹 Balance Summary",
        currentFunds: "Current Funds",
        afterMaintenance: "After Maintenance",
        roundRevenue: "Voyage Revenue",
        payCost: (cost) => `💸 Pay Maintenance: ${cost} Gold`,
        forcePay: (money, cost) => `⚠️ Force Pay (${money}/${cost} Gold)`,
      },

      shipyard: {
        title: "🚢 Shipyard & Module Rigging",
        shipLevel: (level, discount) =>
          `🚢 Ship Level: ${level} | ⚓ Discount: ${discount} Gold`,
        moduleSlots: (n, slots) => `🔌 Module Slots: ${n} / ${slots}`,
        noModules: "No modules installed. Upgrade ship to unlock slots!",
        upgrade: (next, cost) =>
          `⚓ Upgrade Ship (Lvl ${next}), Cost: ${cost} Gold | +1 Slot, +5 Discount`,
        draftSwap: "🔄 Draft & Swap Module (Slots Full)",
        draftInstall: "🔧 Draft & Install Module",
        continueVoyage: "⏭️ Continue Voyage",
      },

      moduleDraft: {
        title: "🔧 Module Drafting",
        subtitle: "Choose a module to install or swap.",
        install: "✅ Install",
        swap: "🔄 Swap",
        allInstalled:
          "Every module in this voyage's batch is already installed.",
        changeBatch: "🔄 Change Batch (1 per Voyage)",
        changeBatchUsed: "🔒 Batch Change Used",
        back: "⬅️ Back to Shipyard",
      },

      moduleSwap: {
        title: "🔄 Select Module to Replace",
        newModule: (icon, name, desc) => `New: ${icon} ${name}, ${desc}`,
        replace: "🗑️ Replace",
        back: "⬅️ Back to Draft",
      },

      bankruptcy: {
        title: "Ship Fleet Bankrupt!",
        reasonDepleted:
          "Funds depleted, unable to pay essential operational costs",
        reasonShortfall: "Insufficient funds to cover maintenance and wages",
        roundsCompleted: "🌊 Voyages Completed:",
        finalFunds: "💰 Final Funds:",
        finalReputation: "🏆 Final Reputation:",
        shipLevel: "🚢 Ship Level:",
        shipLevelValue: (n) => `${n}`,
        taxesPaid: "🧾 Taxes Paid:",
        restart: "🔄 Restart",
        tips: "💡 Strategy Tips",
      },

      endgame: {
        title: "🎮 Game Over!",
        finalReputation: (score) => `🏆 Final Reputation: ${score}`,
        finalFunds: (money) => `💰 Final Funds: ${money} Gold`,
        rank: (rating) => `📈 Merchant Rank: ${rating}`,
        restart: "🔄 Restart",
      },

      rumor: {
        title: "🗣️ Broker's Rumor Board",
        subtitle: "Spend gold to reveal Phase 2 demand rumors!",
        buy: (cost) => `🔮 Buy Rumor (${cost}💰)`,
        revealedTitle: "📜 Revealed Rumors:",
        rumorLine: (port, item) => `• 🗣️ '${port} wants ${item}'`,
        empty:
          "✨ No rumors revealed yet... Spend gold to listen to the Broker's whispers.",
        close: "Close Board",
      },

      tutorial: {
        closeTitle: "Close",
        back: "Back",
        next: "Continue",
        setSail: "🚢 Set Sail!",
        skip: "Skip tutorial",
        stepOf: (n, total) => `${n} of ${total}`,
      },
    },

    /* The full rules text. Values come from the live balance tables, so the
       numbers quoted here can never drift from the ones the game plays by. */
    /* A stack of coins, spelled the way the edition counts money. */
    money: (n) => `${n} Gold`,

    /* Spells out a price range the way the prose quotes it. */
    rangeText: (min, max) => `${min} to ${max}`,

    guide: (v) =>
      `⚓ PortMasters Rules

🚢 Objective:
Travel 8 voyages, accumulate wealth and reputation!

📦 Goods System:
Raw Materials: ${fmtItems(v.resources)}
Finished Goods: ${fmtItems(v.products.slice(0, 2))},
${fmtItems(v.products.slice(2))}

👥 Artisan System:
• Weaver (${v.weaverWage} Gold/Voyage): Makes Linen Clothes or Cotton Clothes
• Master Weaver (${v.masterWage} Gold/Voyage): Makes Linen Clothes, Cotton Clothes or Brocade
• Sachet Maker (${v.makerWage} Gold/Voyage): Makes Sachets

🧾 Tax System:
• VAT: ${v.vatRate}% on finished product profit margin
• Income Tax: ${v.incomeRate}% on voyage net profit

🔮 Broker's Whisper:
• Phase 1: Click "Broker's Rumor Board" to open the window
• Spend ${v.intelCost} Gold to buy a "rumor" about Phase 2 demand
• Revealed rumors guarantee matching orders will appear

🔧 Ship Modules:
• Phase 4: Upgrade your ship to unlock Module Slots
• Draft powerful modules to create unique synergies
• The module offer batch may be changed once per voyage
• Swap modules to adapt to your current run!

🌊 Voyage Phases:
1. Port Purchase: Buy resources at ports (+ Broker rumors)
2. Trade Transaction: Complete orders
3. Maintenance: Pay upkeep fees & process production
4. Upgrade: Improve ships and install modules

⌨️ Shortcuts:
• Ctrl+S: Save Game
• Ctrl+N: Next Phase
• Ctrl+H: Manage Artisans
• Ctrl+R: Restart
• F1: Instructions

⚓ Bon Voyage and Good Luck!`,

    tips: (v) =>
      `⚓ Avoiding Bankruptcy Strategies:

💰 Financial Management:
1. Always maintain reserve funds for expenses
2. Maintenance + Wages are fixed voyage costs
3. Calculate total expenditure before buying

👥 Artisan Management:
1. Weaver Wage: ${v.weaverWage} Gold / Voyage
2. Master Weaver Wage: ${v.masterWage} Gold / Voyage
3. Sachet Maker Wage: ${v.makerWage} Gold / Voyage
4. Hire only as needed

🔮 Broker's Whisper Strategy:
1. Buy rumors early if you have spare gold
2. Hoard revealed items to guarantee Phase 2 profits
3. Balance rumor purchases with other investments

🛒 Buying Strategy:
1. Reserve funds for maintenance+wages first
2. Select high value-for-money goods
3. Prioritize port specialties + revealed rumors

🤝 Trading Strategy:
1. Prioritize highest profit orders
2. Consider freight impact on margins
3. Finished orders yield high profit but incur VAT

⚠️ Risk Control:
1. Calculate fixed voyage costs: Maintenance + Wages
2. Keep funds consistently > fixed costs
3. Avoid over-expansion cash flow issues

💾 Save game progress frequently with Ctrl+S!`,

    tutorial: [
      {
        title: "⚓ Welcome aboard",
        content: `<p>PortMasters puts you on the ancient Silk Road. Eight voyages, limited gold, and a lot of merchants trying to outmaneuver you at every port.</p>
<p>The rules are easy to pick up, but money is tight early on and a string of bad calls compounds quickly. This covers the four things that catch new players out most.</p>
<p style="color:#777;font-size:13px">Two minutes to read. Saves a lot of frustrated restarts.</p>`,
      },
      {
        title: "🏆 What you're playing for",
        content: `<p>After eight voyages, the player with the highest score wins the title of <strong>King of Silk Road</strong>. Score comes from trade profits and fulfilled orders.</p>
<p>One rule overrides everything else: <strong>do not go bankrupt</strong>. Hit zero gold and the game ends immediately. There is no coming back from it.</p>
<p>Starting gold is <strong>100</strong>. That is enough to get going, but not enough to be careless with.</p>`,
      },
      {
        title: "🔄 How a voyage works",
        content: `<p>Each of the eight voyages runs through four phases in order:</p>
<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:12px 0">
  <div style="background:#E8F5E9;border-radius:6px;padding:10px;border-left:3px solid #4CAF50"><strong>1️⃣ Buy</strong><br><span style="font-size:12px;color:#444">Stock up at port markets</span></div>
  <div style="background:#E3F2FD;border-radius:6px;padding:10px;border-left:3px solid #2196F3"><strong>2️⃣ Trade</strong><br><span style="font-size:12px;color:#444">Sell to waiting buyers</span></div>
  <div style="background:#FFF3CD;border-radius:6px;padding:10px;border-left:3px solid #FFC107"><strong>3️⃣ Settle</strong><br><span style="font-size:12px;color:#444">Production lands, bills come due</span></div>
  <div style="background:#FCE4EC;border-radius:6px;padding:10px;border-left:3px solid #E91E63"><strong>4️⃣ Upgrade</strong><br><span style="font-size:12px;color:#444">Improve your ship</span></div>
</div>
<p style="font-size:12px;color:#666;margin:4px 0 0"><kbd style="background:#eee;border:1px solid #ccc;padding:1px 6px;border-radius:3px">Ctrl+N</kbd> moves you between phases without clicking.</p>`,
      },
      {
        title: "🏪 Phase 1: Buying",
        content: `<p>The port market has Hemp, Silk, and Tea at prices that shift every voyage. Buy now, sell in Phase 2. That is the core loop.</p>
<p>One thing worth knowing about: the <strong>Broker</strong>. Pay a small fee for a demand rumor and a specific trade order is <em>guaranteed</em> to appear when Phase 2 opens. Useful when you have stocked a particular good and want to make sure a buyer shows up.</p>
<div style="background:#FFF3CD;border:1px solid #FFC107;border-radius:6px;padding:9px;font-size:13px;margin-top:10px;line-height:1.5">
  💡 For the first two or three voyages, stick to raw materials. They sell the same voyage you buy them. No waiting and no risk.
</div>`,
      },
      {
        title: "📋 Phase 2: Filling orders",
        content: `<p>Trade orders appear and you match your cargo to them. Each one shows the goods needed, the reward, and the shipping fee. Your take is whatever is left after fees and tax.</p>
<p>You can fill as many orders as your cargo allows in a single phase.</p>
<div style="background:#E3F2FD;border:1px solid #2196F3;border-radius:6px;padding:9px;font-size:13px;margin-top:10px;line-height:1.5">
  📌 <strong>Finished goods</strong> (Linen Clothes, Cotton Clothes, Brocade, Sachet) pay two to three times more than raw materials. The catch is they need artisans, and artisans take a full voyage to deliver. That is covered next.
</div>`,
      },
      {
        title: "⚠️ The artisan trap",
        content: (
          v,
        ) => `<p>Artisans turn raw materials into high value finished goods and collect wages at each Phase 3. That part is simple. What catches most new players is this:</p>
<div style="background:#C62828;color:#fff;border-radius:6px;padding:12px;margin:12px 0;text-align:center;font-size:14px;font-weight:bold;line-height:1.7">
  Assign a task this voyage.<br>Goods land at Phase 3, ready to sell next voyage.
</div>
<p style="font-size:13px;color:#333;line-height:1.6">Weavers (${v.weaverWage}g), Master Weavers (${v.masterWage}g), and Sachet Makers (${v.makerWage}g) all charge wages <strong>every voyage</strong>, even when idle. Only hire once you have enough gold to cover at least two voyages of wages alongside your other bills.</p>`,
      },
      {
        title: "💸 Phase 3: Settlement",
        content: (
          v,
        ) => `<p>Before your next port, two bills arrive at Phase 3:</p>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0">
  <div style="background:#E3F2FD;border-radius:6px;padding:10px;text-align:center">
    <div style="font-size:22px;margin-bottom:4px">🔧</div>
    <strong>Ship Maintenance</strong><br>
    <span style="font-size:12px;color:#444">${v.fixedCost} Gold, every voyage, fixed</span>
  </div>
  <div style="background:#FCE4EC;border-radius:6px;padding:10px;text-align:center">
    <div style="font-size:22px;margin-bottom:4px">👥</div>
    <strong>Artisan Wages</strong><br>
    <span style="font-size:12px;color:#444">${v.weaverWage} to ${v.makerWage} Gold per person per voyage</span>
  </div>
</div>
<p style="font-size:13px;color:#333">The <strong>Voyage End Obligations</strong> panel in the sidebar shows exactly what is owed. Check it before spending anything. Running dry here ends the run on the spot.</p>`,
      },
      {
        title: "🚢 You are ready",
        content: `<p>Keep these four points in mind as you play:</p>
<ul style="padding-left:18px;line-height:2.1;font-size:14px">
  <li>Start with raw material orders. Fast money, no complications.</li>
  <li>Always keep at least <strong>30 Gold above</strong> what Phase 3 will cost you.</li>
  <li>Hire artisans only when you can cover <strong>two full voyages of wages</strong>.</li>
  <li>Phase 4 ship upgrades compound quickly. Do not skip them.</li>
  <li><kbd style="background:#eee;border:1px solid #ccc;padding:1px 6px;border-radius:3px">Ctrl+S</kbd> saves your run |  <kbd style="background:#eee;border:1px solid #ccc;padding:1px 6px;border-radius:3px">F1</kbd> opens the full guide.</li>
</ul>
<div style="background:#E8F5E9;border:2px solid #4CAF50;border-radius:8px;padding:12px;text-align:center;margin-top:14px">
  <strong style="font-size:15px">Good winds and good margins, Captain. ⚓</strong>
</div>`,
      },
    ],
  };

  /* Renders the [name, range] pairs the engine passes into the guide. */
  function fmtItems(items) {
    return items.map((x) => `${x[0]}(${x[1]}💰)`).join(", ");
  }
})();
