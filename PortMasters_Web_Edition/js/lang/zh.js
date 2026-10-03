/* Simplified Chinese language pack. Mirrors the keys of en.js exactly; the
   engine reads only the pack its entry page loads. Item names double as save
   keys, so they must stay stable once a pack has shipped. */
"use strict";
(function () {
  const PM = (window.PM = window.PM || {});

  PM.lang = {
    /* Item names. These strings are the inventory keys and the keys inside a
       saved game, so they are part of the save format. */
    items: {
      hemp: "麻布",
      silk: "丝绸",
      tea: "茶叶",
      linen_clothes: "麻衣",
      cotton_clothes: "布衣",
      brocade: "绫罗绸缎",
      sachet: "香囊",
    },

    ports: {
      quanzhou: "泉州港",
      guangzhou: "广州港",
      ningbo: "宁波港",
      yangzhou: "扬州港",
      hangzhou: "杭州港",
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

    /* Each artisan type needs several name forms: name for the hire and
       dismissal logs, prodName for the production log, short for the status
       list and wage rows, plural for the wage summary line, and statusPlural
       for the cargo hold. hireIcon and icon carry the matching glyphs. */
    workerTypes: {
      weaver: {
        name: "织女",
        prodName: "织女",
        short: "织女",
        plural: "织女",
        statusPlural: "织女",
        hireIcon: "👩‍🔧",
        icon: "👩‍🔧",
      },
      master: {
        name: "纺织大师",
        prodName: "纺织大师",
        short: "纺织大师",
        plural: "纺织大师",
        statusPlural: "纺织大师",
        hireIcon: "👩‍🎨",
        icon: "👩‍🎨",
      },
      sachet_maker: {
        name: "香囊师",
        prodName: "香囊师",
        short: "香囊师",
        plural: "香囊师",
        statusPlural: "香囊师",
        hireIcon: "🌸",
        icon: "🌸",
      },
    },

    boons: {
      silk_wind: {
        name: "丝路顺风",
        icon: "🌬️",
        desc: "本航程运输丝绸及含丝绸成品时，运费减半。",
      },
      favorable_tides: {
        name: "顺风顺水",
        icon: "🌊",
        desc: "本航程基础运费减少4金币。",
      },
      merchant_charm: {
        name: "商贾魅力",
        icon: "✨",
        desc: "本航程港口采购所有商品享85折优惠。",
      },
      artisan_inspiration: {
        name: "匠人灵感",
        icon: "🔨",
        desc: "本航程所有工匠额外多生产1件商品。",
      },
      emergency_loan: {
        name: "紧急钱庄",
        icon: "💰",
        desc: "立即获得40金币周转资金。",
      },
      tax_shelter: {
        name: "免税令",
        icon: "📜",
        desc: "本航程结算所得税率降至5%。",
      },
      hemp_monopoly: {
        name: "麻布专营",
        icon: "🧶",
        desc: "本航程麻布采购单价降低2金币。",
      },
      master_apprentice: {
        name: "学徒传承",
        icon: "🎓",
        desc: "本航程雇佣的工匠，首次结算工资减半。",
      },
    },

    modules: {
      smugglers_hold: {
        name: "走私暗舱",
        icon: "🏴‍☠️",
        desc: "采购成本降低15%。所得税提高20%。",
      },
      bulk_hauler: {
        name: "散货索具",
        icon: "🏗️",
        desc: "每件货物运费降低1。船只升级费用增加15金币。",
      },
      artisans_workshop: {
        name: "工匠工坊",
        icon: "🛠️",
        desc: "工匠产量+1。工资+20%。",
      },
      tax_evasion: {
        name: "避税账本",
        icon: "📕",
        desc: "所得税与增值税减半。15%概率在订单完成时罚款20金币(稽查)。",
      },
      silk_monopoly: {
        name: "丝路垄断",
        icon: "👘",
        desc: "丝绸运费为0。丝绸产品订单报酬+20%。",
      },
      brokers_network: {
        name: "牙行网络",
        icon: "🕵️",
        desc: "密语花费2金币，每次购买揭示2条。",
      },
      salvage_crane: {
        name: "打捞起重机",
        icon: "♻️",
        desc: "30%概率在订单完成时退还运费。",
      },
      overdrive_engine: {
        name: "超载引擎",
        icon: "⚙️",
        desc: "运费降低5金币。维护费增加10金币。",
      },
    },

    /* Activity log lines. */
    log: {
      saved: "💾 游戏已保存！",
      saveFailed: (e) => `❌ 保存失败: ${e}`,
      loaded: "📂 存档已加载！",
      loadFailed: (e) => `❌ 加载失败: ${e}`,

      boonGold: (n) => `💰 福缘生效：立刻获得 ${n} 金币！`,
      boonHeader: "\n🧭=== 航海家的罗盘 ===",
      boonPrompt: "选择一项福缘，扭转本航程的规则...",
      boonLocked: (icon, name) => `🧭 福缘已选定：${icon} ${name}`,

      cannotAfford: (cost, money) =>
        `❌ 资金不足！需要${cost}金币，当前${money}金币`,
      boughtProduct: (port, icon, type, qty, price, matCost, cost) =>
        `🛒 在${port}采购成品: ${icon}${type}×${qty}(@${price}💰/个, 原料成本${matCost}💰)，总花费${cost}金币`,
      productVatHint: "   💡 提示：该成品出售时需缴纳增值税",
      /* One purchased lot inside the purchase log line. */
      priceEach: (price) => `(${price}💰/个)`,
      boughtAt: (port, txt, cost) =>
        `🛒 在${port}采购: ${txt}，总花费${cost}金币`,
      boonDiscount: (n) => `   ✨ 折扣生效！节省了 ${n} 金币`,
      batchesPurchased: (n) => `📊 已采购 ${n} 批货物`,

      inventoryShort: (type, req) => `❌ 库存不足！需要${type}×${req}`,
      salesVat: (v) => `🧾 成品销售增值税: ${v}金币`,
      silkMonopoly: "👘 丝路垄断：报酬+20%！",
      salvageRefund: (t) => `♻️ 打捞起重机：退还了${t}金币运费！`,
      audit: "🚨 稽查！避税账本触发，损失20金币！",
      orderCompleted: (port, txt) => `📦 完成${port}的订单: ${txt}`,
      orderSettlement: (reward, transport, net) =>
        `   💰 报酬: ${reward}金币 | ⚓ 运费: ${transport}金币 = 📊 净利润: ${net}金币`,
      transactionsCompleted: (n) => `📊 已完成 ${n} 笔交易`,

      cannotHire: "❌ 资金不足，无法雇佣工匠！",
      hired: (icon, name, wage) =>
        `${icon} 雇佣了一名${name}！工资: ${wage}金币/航程（每航程结算时支付）`,
      cannotPaySeverance: (name, wage) =>
        `❌ 资金不足，无法支付${name}的遣散费: ${wage}金币`,
      dismissed: (name, wage) =>
        `💔 解雇了一名${name}，支付遣散费: ${wage}金币`,
      wasMaking: (task) => `  该工匠原本正在制作: ${task}`,
      materialShortage: (task) => `❌ 材料不足，无法生产${task}！`,
      taskAssigned: (icon, task, matTxt) =>
        `📋 为工匠分配任务：生产${icon}${task}（原料：${matTxt}）`,
      allWorkersBusy: "❌ 所有工匠都已分配任务！",

      producedBonus: (name, amt, icon, task) =>
        `✅ ${name}完成了 ${amt} 件${icon}${task}的制作！（加成）`,
      producedSkilled: (name, icon, task) =>
        `✅ ${name}(熟练)完成了2件${icon}${task}的制作！`,
      produced: (name, icon, task) => `✅ ${name}完成了${icon}${task}的制作！`,
      promotion: (name) => `⭐ ${name}经验提升！现在每航程可生产2件产品！`,

      wagesPaid: (n, plural, amt) =>
        `💰 支付了${n}名${plural}的工资：${amt}金币`,
      wagesShortfall: (total, money) =>
        `⚠️ 资金不足！应付工资: ${total}金币，当前资金: ${money}金币`,
      workersStrike: "💥 无法支付工资，工匠罢工离去...",
      reputationCollapsed: "💥 声望崩塌，被迫破产！",

      maintenancePaid: (cost) => `💸 支付了船只维护费: ${cost}金币`,
      forcedPayment: (paid, cost) =>
        `⚠️ 强制支付了 ${paid}金币（需要 ${cost}金币）`,
      fundsDepleted: "⚠️ 资金耗尽！无法继续航行...",

      noRumors: "🔮 牙行已无更多密语...",
      rumorCost: (cost) => `❌ 需要${cost}金币才能购买密语`,
      rumor: (port, item) => `🗣️ 牙行密语：'${port}有消息：急需${item}！'`,

      shipUpgraded: (level) =>
        `🎉 船只升级到 ${level}级！+1模块槽位，+5运费折扣`,
      moduleSwapped: (oldName, newName) =>
        `🔄 将 ${oldName} 替换为 ${newName}！`,
      moduleInstalled: (name) => `✅ 安装了 ${name}！`,
      noEmptySlots: "❌ 没有空槽位！必须替换。",

      roundSettlement: (round) => `\n📊=== 第${round}航程结算 ===`,
      roundRevenue: (g) => `💰 本航程总收入: ${g}金币`,
      roundTotalCost: (c) => `💸 本航程总成本: ${c}金币`,
      roundMaintenance: (c) => `   🔧 维护费: ${c}金币`,
      roundMaterials: (c) => `   📦 材料费: ${c}金币`,
      roundWages: (c) => `   👥 工匠工资: ${c}金币`,
      profitBeforeTax: (p) => `📈 税前净利润: ${p}金币`,
      incomeTaxPaid: (rate, tax) => `🏛️ 缴纳所得税（${rate}%）: ${tax}金币`,
      noIncomeTax: "🏛️ 无盈利，无需缴纳所得税",
      vatPaidRound: (v) => `🧾 本航程已缴增值税: ${v}金币`,
      preparingRound: (r) => `\n🔄=== 第${r}航程准备开始 ===`,

      welcomeTitle: "⚓ 欢迎来到 PortMasters！",
      welcomeSail: "🚢 穿梭于各大港口之间，建立您的商业帝国！",
      welcomeHire: "👥 雇佣工匠，制作精美商品，获取更高利润！",

      phase1Header: (r) => `\n⚓=== 第${r}航程 | 阶段1: 港口采购 ===`,
      fundsNow: (m) => `💰 当前资金: ${m}金币`,
      purchasingSkipped: "⏭️ 跳过了采购阶段",
      purchasingEnded: (n) => `✅ 采购结束，共采购 ${n} 批货物`,

      phase2Header: (r) => `\n🤝=== 第${r}航程 | 阶段2: 贸易交易 ===`,
      tradingSkipped: "⏭️ 跳过了交易阶段",
      tradingEnded: (n) => `✅ 交易结束，共完成 ${n} 笔交易`,

      productionHeader: "\n👥=== 处理工匠生产 ===",
      wagesHeader: "\n💰=== 支付工匠工资 ===",
      bankruptWages: "⚠️ 因无法支付工匠工资而破产！",
      phase3Header: (r) => `\n🔧=== 第${r}航程 | 阶段3: 船只维护 ===`,
      fundsZero: "⚠️ 资金为0，无法支付维护费！",

      phase4Header: (r) => `\n🚢=== 第${r}航程 | 阶段4: 船坞与模块 ===`,
      skippedShipyard: "⏭️ 跳过船坞操作",

      gameOverTitle: "🎮 PortMasters：游戏结束！",
      finalFunds: (m) => `💰 最终资金: ${m}金币`,
      finalReputation: (s) => `🏆 最终声望: ${s}`,
      totalTaxes: (t) => `🧾 累计缴税: ${t}金币`,
      rank: (rating) => `📈 评级: ${rating}`,
    },

    /* Interface strings, grouped by the screen that shows them. */
    ui: {
      gold: "金币",
      close: "关闭",
      guideTitle: "⚓ 航海指南",
      tipsTitle: "💡 贸易策略建议",
      unknownPhase: "🧭 风向未定...",
      crashTitle: "⚠️ 引擎异常：渲染管线已停止",
      crashRetry: "🔄 尝试重新渲染",
      savedAlert: "游戏进度已保存！",
      confirmRestart: "确定要重新开始海上丝绸之路贸易之旅吗？",
      confirmContinueSave: "检测到上次的存档，是否继续游戏？",
      needGold: (cost) => `需要 ${cost}金币`,

      ratings: {
        king: "👑 丝绸之路霸主",
        tycoon: "🏆 海上贸易大亨",
        merchant: "⭐ 成功商人",
        trader: "👍 合格商人",
        novice: "🌊 新手商人",
      },

      status: {
        captainLog: "📊 航海日志",
        voyage: "🌊 航程",
        roundOf: (r, m) => `第 ${r}/${m}`,
        funds: "💰 资金",
        reputation: "🏆 声望",
        vessel: "🚢 船只状态",
        classLabel: "船只等级",
        shipLevel: (n) => `${n}级`,
        freight: "运费",
        freightHint: (discount) =>
          discount > 0 ? `max(5, n×2 减去 ${discount})` : "max(5, n×2)",
        modules: "模块槽位",
        cargoHold: "📦 船舱货物",
        rawMaterials: "原材料",
        finishedGoods: "成品",
        artisans: "工匠",
        obligations: "⚠️ 本航程应付款项",
        maintenance: "🔧 维护费",
        wages: "👥 工资",
        wageCount: (n) => `（${n}名工匠）`,
        wageBreakdown: (n, label) => `↳ ${n}× ${label}`,
        goldShort: "金",
        totalDue: "💸 合计应付",
        riskShortfall: "🚨 警告：资金可能不足以支付本航程结算费用！",
        fundsSufficient: "✅ 资金充足，可支付本航程结算",
      },

      controls: {
        gameOver: "⚠️ 游戏结束",
        continue: "⏭️ 继续航行",
        setSail: (r) => `🚢 开始第${r}航程`,
        draftingBoon: "🧭 抽取福缘中...",
        onVoyage: "🚢 航行中...",
        nextPhase: "⏭️ 下一阶段",
        guide: "📖 航海指南",
        save: "💾 保存进度",
        restart: "🔄 重新起航",
      },

      welcome: {
        subtitle: "🌊 历经八次航程，成为丝绸之路霸主！",
        continueVoyage: "📂 继续航行",
        setSail: "🚢 扬帆起航",
        tutorial: "📖 新手教程",
        startTitle: "🚀 初始资源",
        startGoods: "📦 麻布×8，丝绸×5，茶叶×3",
        startFunds: "💰 初始资金 100 金币",
        delayTitle: "⏱️ 生产有延迟",
        delayLine: "分配任务 → 成品在阶段3产出",
        delayNote: "工匠不会立刻生产！",
        costsTitle: "💸 航程结算费用",
        costsMaintenance: "🔧 维护费：每航程基础15金币",
        costsWages: "👥 工资在阶段3扣除，不在雇佣时扣",
        taxesTitle: "🧾 税收说明",
        taxesVat: "增值税：成品销售利润的5%",
        taxesIncome: "所得税：航程净利润的10%",
        phasesTitle: "🔄 每航程4阶段：",
        phasesBody:
          "1️⃣ 港口采购 → 2️⃣ 贸易交易 → 3️⃣ 工资、产出与维护结算 → 4️⃣ 船坞升级",
        tipTitle: "💡 新手提示：",
        tipBody:
          "早期以原材料订单为主。雇佣工匠前确保资金能支撑至少2个航程的工资。始终保持资金 &gt; 维护费 + 全部工资。",
        footBroker: "🔮 阶段1牙行：购买密语，锁定保底订单",
        footUpgrade: "🚢 阶段4升级船只：运费折扣 + 解锁模块槽",
        footKeys: "⌨️ Ctrl+S 保存 | Ctrl+N 下一阶段 | F1 帮助",
      },

      boon: {
        title: "🧭 航海家的罗盘",
        subtitle: "抽取福缘，契合您的贸易策略",
        lockIn: "🔒 锁定福缘",
      },

      purchase: {
        title: "⚓ 港口商品采购",
        brokerBoard: "🔮 牙行密语板",
        product: "成品",
        rawMaterial: "原材料",
        unit: (price) => `单价: ${price}💰`,
        matCost: (cost, details) => `📦 原料成本: ${cost}金币 (${details})`,
        markup: (gain, pct) => `💰 溢价: +${gain}金币 (${pct}%)`,
        total: (cost) => `💰 总价: ${cost}金币`,
        was: (cost) => `(原价 ${cost})`,
        purchased: "✅ 已采购",
        buy: (cost) => `🛒 采购 (${cost}💰)`,
        complete: "✅ 完成采购，继续航行",
      },

      workers: {
        title: "👥 工匠管理",
        subtitle: (money) => `💰 当前资金: ${money}金币 | 📦 查看下方库存`,
        cycleTitle: "⏱️ 生产周期：各阶段发生什么",
        cycleNow: `📋 现在<br><span style="font-size:9px">分配任务<br>消耗原材料</span>`,
        cyclePhase2: `🤝 阶段2<br><span style="font-size:9px">贸易交易</span>`,
        cyclePhase3: `✅ 阶段3<br><span style="font-size:9px">产品完成<br>+ 工资结算</span>`,
        cyclePhase4: `🚢 阶段4<br><span style="font-size:9px">船坞升级</span>`,
        cycleNote:
          "💡 原材料<strong>立即</strong>消耗，成品和工资在<strong>阶段3</strong>结算，不是立刻扣款。",
        inventoryTitle: "📦 当前库存",
        rawMaterials: "原材料:",
        finishedGoods: "成品:",
        payrollTitle: "💰 待付工资：将在阶段3扣除",
        payrollLine: (icon, n, label, wage) =>
          `${icon} ${n}名${label}（基础 ${wage}金）`,
        totalWages: "💸 合计待付工资",
        hireTitle: "🔨 雇佣工匠",
        hireWeaverName: "👩‍🔧 织女",
        hireWeaverDetail: "，麻衣(2麻布) 或 布衣(2麻布+1丝绸)，",
        hireMasterName: "👩‍🎨 纺织大师",
        hireMasterDetail: "，麻衣、布衣 或 绫罗绸缎(3丝绸)，",
        hireMakerName: "🌸 香囊师",
        hireMakerDetail: "，香囊(1丝绸+2茶叶)，",
        perRound: (wage) => `${wage}金币/航程`,
        hireWeaverButton: (cost) => `👩‍🔧 雇佣织女 (${cost}💰/航程)`,
        hireMasterButton: (cost) => `👩‍🎨 雇佣纺织大师 (${cost}💰/航程)`,
        hireMakerButton: (cost) => `🌸 雇佣香囊师 (${cost}💰/航程)`,
        statusTitle: "👥 工匠状态与任务分配",
        workerLine: (short, n, w) =>
          `${short}${n}: ${
            w.task
              ? `正在制作: ${w.task}${w.isSkilled ? "(熟练)" : ""}`
              : `空闲${w.isSkilled ? " ⭐熟练" : ""}`
          }`,
        count: (n) => `${n}人`,
        dismiss: (wage) => `解雇 (${wage}💰)`,
        makeTask: (task, mats) => `制作${task} (需${mats})`,
        complete: "✅ 完成工匠管理，继续航行",
      },

      orders: {
        title: "🤝 贸易订单",
        productDemand: "成品需求",
        rawDemand: "原材料需求",
        inventory: (n) => `库存: ${n}`,
        freight: (cost) => `⚓ 运费: ${cost}金币`,
        reward: (reward, net) => `💰 报酬: ${reward}金币 📊 净利润: ${net}金币`,
        estVat: (v) => `🧾 预计增值税: ${v}金币`,
        completed: "✅ 已完成",
        trade: (net) => `🤝 交易 (净利润${net}💰)`,
        complete: "✅ 完成交易，继续航行",
      },

      maintenance: {
        title: "🔧 阶段3：航程结算",
        processedTitle: "✅ 已完成处理",
        production: "👷 工匠生产",
        done: "已完成 ✓",
        wagesPaid: (n) => `💰 已结算工资（${n}名工匠）`,
        pendingTitle: "⏳ 待支付款项",
        maintenanceFee: "🔧 船只维护费",
        penaltyNote: (fixed, penalty) =>
          `↳ 基础 ${fixed}金 + 超载引擎附加费 ${penalty}金`,
        balanceTitle: "💹 资金概览",
        currentFunds: "当前资金",
        afterMaintenance: "支付维护费后",
        roundRevenue: "航程收入",
        payCost: (cost) => `💸 支付维护费: ${cost}金币`,
        forcePay: (money, cost) => `⚠️ 强制支付 (${money}/${cost}金币)`,
      },

      shipyard: {
        title: "🚢 船坞与模块安装",
        shipLevel: (level, discount) =>
          `🚢 船只等级: ${level} | ⚓ 运费折扣: ${discount} 金币`,
        moduleSlots: (n, slots) => `🔌 模块槽位: ${n} / ${slots}`,
        noModules: "尚未安装任何模块。升级船只以解锁槽位！",
        upgrade: (next, cost) =>
          `⚓ 升级船只 (至${next}级)，花费: ${cost} 金币 | +1 槽位, +5 运费折扣`,
        draftSwap: "🔄 抽取并替换模块 (槽位已满)",
        draftInstall: "🔧 抽取并安装模块",
        continueVoyage: "⏭️ 继续航行",
      },

      moduleDraft: {
        title: "🔧 模块抽取",
        subtitle: "选择要安装或替换的船只模块。",
        install: "✅ 安装",
        swap: "🔄 替换",
        allInstalled: "本航程抽取的模块都已安装完毕。",
        changeBatch: "🔄 更换牌组（每航程1次）",
        changeBatchUsed: "🔒 更换次数已用完",
        back: "⬅️ 返回船坞",
      },

      moduleSwap: {
        title: "🔄 选择要替换的模块",
        newModule: (icon, name, desc) => `新模块: ${icon} ${name}，${desc}`,
        replace: "🗑️ 替换",
        back: "⬅️ 返回抽取",
      },

      bankruptcy: {
        title: "船队破产！",
        reasonDepleted: "资金耗尽，无法支付必要的运营费用",
        reasonShortfall: "资金不足以支付维护费和工匠工资",
        roundsCompleted: "🌊 完成航程:",
        finalFunds: "💰 最终资金:",
        finalReputation: "🏆 最终声望:",
        shipLevel: "🚢 船只等级:",
        shipLevelValue: (n) => `${n}级`,
        taxesPaid: "🧾 累计缴税:",
        restart: "🔄 重新起航",
        tips: "💡 贸易策略",
      },

      endgame: {
        title: "🎮 游戏结束！",
        finalReputation: (score) => `🏆 最终声望: ${score}`,
        finalFunds: (money) => `💰 最终资金: ${money}金币`,
        rank: (rating) => `📈 商人评级: ${rating}`,
        restart: "🔄 重新起航",
      },

      rumor: {
        title: "🗣️ 牙行密语板",
        subtitle: "花费金币，探听阶段2的货物需求！",
        buy: (cost) => `🔮 购买密语 (${cost}💰)`,
        revealedTitle: "📜 已探听的密语：",
        rumorLine: (port, item) => `• 🗣️ '${port} 急需 ${item}'`,
        empty: "✨ 尚未探听任何密语... 花费金币聆听牙行的密语吧。",
        close: "关闭面板",
      },

      tutorial: {
        closeTitle: "关闭",
        back: "上一步",
        next: "继续",
        setSail: "🚢 扬帆起航！",
        skip: "跳过教程",
        stepOf: (n, total) => `${n} / ${total}`,
      },
    },

    /* The full rules text. Values come from the live balance tables, so the
       numbers quoted here can never drift from the ones the game plays by. */
    /* A stack of coins, spelled the way the edition counts money. */
    money: (n) => `${n}金币`,

    /* Spells out a price range the way the prose quotes it. */
    rangeText: (min, max) => `${min}至${max}`,

    guide: (v) =>
      `⚓ PortMasters 游戏规则

🚢 游戏目标：
通过8个航程的海上贸易，积累最大财富和声望！

📦 货物系统：
原材料：${fmtItems(v.resources)}
成品：${fmtItems(v.products)}

👥 工匠系统：
• 织女（${v.weaverWage}金币/航程）：制作麻衣或布衣
• 纺织大师（${v.masterWage}金币/航程）：制作麻衣、布衣或绫罗绸缎
• 香囊师（${v.makerWage}金币/航程）：制作香囊

🧾 税收系统：
• 增值税：成品销售利润的${v.vatRate}%
• 所得税：航程净利润的${v.incomeRate}%

🔮 牙行密语：
• 第1阶段：点击"牙行密语板"打开独立窗口
• 花费${v.intelCost}金币购买关于第2阶段需求的"密语"
• 探听到的密语将保证生成对应的保底订单

🔧 船只模块：
• 第4阶段：升级船只以解锁"模块槽位"
• 抽取并安装强大的模块，创造独特的协同效应
• 模块牌组每航程仅可更换一次
• 随时替换模块，根据当前局势调整您的商业帝国！

🌊 每航程4个阶段：
1. 港口采购：在各大港口购买原材料 (+ 牙行密语)
2. 贸易交易：完成原材料或成品订单
3. 船只维护：支付维护费 & 结算工匠生产
4. 船坞升级：升级船只并安装模块

⌨️ 快捷键：
• Ctrl+S：保存游戏
• Ctrl+N：进入下一阶段
• Ctrl+H：管理工匠
• Ctrl+R：重新开始
• F1：显示帮助

⚓ 祝您航行顺利，生意兴隆！`,

    tips: (v) =>
      `⚓ 避免破产的贸易策略：

💰 资金管理：
1. 确保始终有足够备用金支付所有费用
2. 维护费 + 工匠工资是每航程固定支出
3. 计算总支出后再决定采购量

👥 工匠管理：
1. 织女工资: ${v.weaverWage}金币/航程
2. 纺织大师工资: ${v.masterWage}金币/航程
3. 香囊师工资: ${v.makerWage}金币/航程
4. 量力而行，不要雇佣过多工匠

🔮 牙行密语策略：
1. 如果资金充裕，尽早购买密语
2. 囤积探听到的货物，保证第2阶段利润
3. 平衡购买密语与其他投资的资金分配

🛒 采购策略：
1. 预留维护费+工资后再采购
2. 选择性价比高的商品组合
3. 优先购买港口特产 + 探听到的密语

🤝 交易策略：
1. 优先完成利润高的订单
2. 注意运费对利润的影响
3. 成品订单利润高但需缴增值税

⚠️ 风险控制：
1. 计算每航程固定支出：维护费 + 工匠工资
2. 确保资金始终 > 固定支出
3. 不要过度扩张导致资金链断裂

💾 使用Ctrl+S保存游戏进度！`,

    tutorial: [
      {
        title: "⚓ 欢迎登船",
        content: `<p>PortMasters 把你放在古丝绸之路上。八次航程，有限的本钱，还有一堆商人跟你抢最好的货源。</p>
<p>规则不难上手，但前期资金紧张，几个错误决定就可能一路失控。这里专门讲新手最容易踩到的几个坑。</p>
<p style="color:#777;font-size:13px">大概两分钟读完，省下很多头疼的重来。</p>`,
      },
      {
        title: "🏆 你在玩什么",
        content: `<p>八次航程结束后，声望最高的人荣登<strong>丝绸之路霸主</strong>。声望来自贸易盈利和完成的订单。</p>
<p>有一条规则压过其他所有规则：<strong>不能破产</strong>。金币归零，游戏立即结束。没有挽回的机会。</p>
<p>初始资金是 <strong>100 金币</strong>。够用，但容不下粗心大意。</p>`,
      },
      {
        title: "🔄 一次航程怎么走",
        content: `<p>八次航程，每次都按同样的四个阶段顺序推进：</p>
<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:12px 0">
  <div style="background:#E8F5E9;border-radius:6px;padding:10px;border-left:3px solid #4CAF50"><strong>1️⃣ 采购</strong><br><span style="font-size:12px;color:#444">在港口补充货物</span></div>
  <div style="background:#E3F2FD;border-radius:6px;padding:10px;border-left:3px solid #2196F3"><strong>2️⃣ 贸易</strong><br><span style="font-size:12px;color:#444">出货给买家赚利润</span></div>
  <div style="background:#FFF3CD;border-radius:6px;padding:10px;border-left:3px solid #FFC107"><strong>3️⃣ 结算</strong><br><span style="font-size:12px;color:#444">工匠产出，账单一起来</span></div>
  <div style="background:#FCE4EC;border-radius:6px;padding:10px;border-left:3px solid #E91E63"><strong>4️⃣ 升级</strong><br><span style="font-size:12px;color:#444">在船坞强化船只</span></div>
</div>
<p style="font-size:12px;color:#666;margin:4px 0 0">按 <kbd style="background:#eee;border:1px solid #ccc;padding:1px 6px;border-radius:3px">Ctrl+N</kbd> 可以快速跳到下一阶段。</p>`,
      },
      {
        title: "🏪 阶段1：采购",
        content: `<p>港口市场主要出售麻布、丝绸和茶叶，偶尔也会有整批成品，价格每次航程都不同。低价买入，阶段2卖出，赚差价。就这么简单。</p>
<p>有个功能值得记一下：<strong>牙行密语</strong>。花少量金币购买密语，阶段2就能保证出现对应的买家订单。当你已经备好某类货又想确保有人接单时很好用。</p>
<div style="background:#FFF3CD;border:1px solid #FFC107;border-radius:6px;padding:9px;font-size:13px;margin-top:10px;line-height:1.5">
  💡 头两三次航程先做原材料订单。当航程买当航程卖，不用等，没风险。
</div>`,
      },
      {
        title: "📋 阶段2：接单出货",
        content: `<p>买家订单出现，拿货对上就行。每张订单写明需要什么货、给多少报酬、运费多少。扣完运费和税，剩下的是你的利润。</p>
<p>一个阶段内货够的话，可以同时接好几张订单。</p>
<div style="background:#E3F2FD;border:1px solid #2196F3;border-radius:6px;padding:9px;font-size:13px;margin-top:10px;line-height:1.5">
  📌 <strong>成品</strong>（麻衣、布衣、绫罗绸缎、香囊）利润是原材料的两三倍。但加工需要工匠，而且要等整整一个航程才能出货。这个坑下一步讲。
</div>`,
      },
      {
        title: "⚠️ 工匠陷阱",
        content: (
          v,
        ) => `<p>雇工匠能解锁高利润成品，每次阶段3结算工资。规则本身不难。几乎每个新手没想到的是这一点：</p>
<div style="background:#C62828;color:#fff;border-radius:6px;padding:12px;margin:12px 0;text-align:center;font-size:14px;font-weight:bold;line-height:1.7">
  本航程分配任务。<br>成品阶段3产出，下个航程才能出售。
</div>
<p style="font-size:13px;color:#333;line-height:1.6">织女（${v.weaverWage}金）、纺织大师（${v.masterWage}金）、香囊师（${v.makerWage}金），<strong>每次航程都要扣工资</strong>，哪怕没在干活。金币能覆盖至少两个航程的工资再加上其他账单后，再考虑雇人。</p>`,
      },
      {
        title: "💸 阶段3：结算",
        content: (v) => `<p>进下一个港口之前，阶段3先扣两笔钱：</p>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0">
  <div style="background:#E3F2FD;border-radius:6px;padding:10px;text-align:center">
    <div style="font-size:22px;margin-bottom:4px">🔧</div>
    <strong>船只维护费</strong><br>
    <span style="font-size:12px;color:#444">每次航程基础 ${v.fixedCost} 金币</span>
  </div>
  <div style="background:#FCE4EC;border-radius:6px;padding:10px;text-align:center">
    <div style="font-size:22px;margin-bottom:4px">👥</div>
    <strong>工匠工资</strong><br>
    <span style="font-size:12px;color:#444">每人每次航程 ${v.weaverWage} 至 ${v.makerWage} 金币</span>
  </div>
</div>
<p style="font-size:13px;color:#333">右侧状态栏的<strong>本航程应付款项</strong>面板实时显示欠多少钱，花钱之前先看一眼。这里断供就是直接破产。</p>`,
      },
      {
        title: "🚢 可以出发了",
        content: `<p>记住以下四点，上手会顺很多：</p>
<ul style="padding-left:18px;line-height:2.1;font-size:14px">
  <li>先做原材料订单。快钱，没有后遗症。</li>
  <li>手头金币始终比阶段3账单多出<strong>至少 30 金币</strong>。</li>
  <li>只有能撑<strong>两个航程的工资</strong>的时候再雇工匠。</li>
  <li>阶段4的船只升级收益很快显现，不要跳过。</li>
  <li><kbd style="background:#eee;border:1px solid #ccc;padding:1px 6px;border-radius:3px">Ctrl+S</kbd> 保存进度， <kbd style="background:#eee;border:1px solid #ccc;padding:1px 6px;border-radius:3px">F1</kbd> 查看完整规则</li>
</ul>
<div style="background:#E8F5E9;border:2px solid #4CAF50;border-radius:8px;padding:12px;text-align:center;margin-top:14px">
  <strong style="font-size:15px">一帆风顺，财源广进。⚓</strong>
</div>`,
      },
    ],
  };

  /* Renders the [name, range] pairs the engine passes into the guide. */
  function fmtItems(items) {
    return items.map((x) => `${x[0]}(${x[1]}💰)`).join("、");
  }
})();
