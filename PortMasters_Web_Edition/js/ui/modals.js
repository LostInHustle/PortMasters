/* Modal shell, the guide, the broker board, strategy tips, and the tutorial. */
"use strict";
(function () {
  const PM = (window.PM = window.PM || {});
  const L = PM.lang;

  /* Set by showTutorial so that dismissing the modal any way at all, backdrop
     included, counts as having seen it. */
  let modalOnClose = null;

  function showModal(html) {
    const root = document.getElementById("modal-root");
    root.innerHTML = `<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal">${html}</div></div>`;
  }

  function closeModal() {
    const onClose = modalOnClose;
    modalOnClose = null;
    document.getElementById("modal-root").innerHTML = "";
    if (onClose) onClose();
  }

  /* The numbers the guides quote, pulled from the live tables so the text can
     never drift from the rules again. Price entries are [name, range] pairs,
     the range preformatted the way the prose spells it out. */
  function guideValues() {
    const t = L.items;
    const priced = (names, rangeOf) =>
      names.map((name) => [
        name,
        L.rangeText(rangeOf(name)[0], rangeOf(name)[1]),
      ]);
    return {
      resources: priced(
        [t.hemp, t.silk, t.tea],
        (n) => PM.COMMODITIES[n].basePrice,
      ),
      products: priced(
        [t.linen_clothes, t.cotton_clothes, t.brocade, t.sachet],
        (n) => PM.PRODUCT_PRICES[n],
      ),
      weaverWage: PM.WAGES.weaver,
      masterWage: PM.WAGES.master,
      makerWage: PM.WAGES.sachet_maker,
      fixedCost: PM.game.fixedCost,
      vatRate: PM.VAT_RATE * 100,
      incomeRate: PM.INCOME_TAX_RATE * 100,
      intelCost: PM.BASE_INTEL_COST,
    };
  }

  function showInstructions() {
    showModal(`
    <h2>${L.ui.guideTitle}</h2>
    <pre>${L.guide(guideValues())}</pre>
    <div style="text-align:center; margin-top:16px"><button class="btn" onclick="closeModal()">${L.ui.close}</button></div>`);
  }

  function showRumorBoard() {
    const game = PM.game;
    const t = L.ui.rumor;
    const html = `
    <h2>${t.title}</h2>
    <div style="text-align:center; color:#2E5AA7; margin-bottom:10px">${t.subtitle}</div>
    <div style="text-align:center; margin:12px 0">
      <button class="btn btn-gold" onclick="purchaseIntel(); showRumorBoard()">${t.buy(game.intelCost)}</button>
    </div>
    <div style="background:#F0F8FF; border:2px solid #2E5AA7; border-radius:6px; padding:12px; min-height:100px">
      ${
        game.revealedIntel.length
          ? `
        <div style="font-weight:bold; color:#2E5AA7; margin-bottom:8px">${t.revealedTitle}</div>
        ${game.revealedIntel.map((i) => `<div style="padding:4px 0; font-size:13px">${t.rumorLine(i.port, i.item)}</div>`).join("")}
      `
          : `<div style="color:#888; text-align:center; padding:20px">${t.empty}</div>`
      }
    </div>
    <div style="text-align:center; margin-top:16px"><button class="btn btn-grey" onclick="closeModal()">${t.close}</button></div>`;
    showModal(html);
  }

  function showTips() {
    showModal(`
    <h2>${L.ui.tipsTitle}</h2>
    <pre>${L.tips({
      weaverWage: PM.WAGES.weaver,
      masterWage: PM.WAGES.master,
      makerWage: PM.WAGES.sachet_maker,
    })}</pre>
    <div style="text-align:center; margin-top:16px"><button class="btn" onclick="closeModal()">${L.ui.close}</button></div>`);
  }

  let _tutStep = 0;

  /* Tutorial steps that quote balance numbers take them as a parameter, so a
     rebalance cannot leave the text behind. */
  function tutorialContent(step) {
    if (typeof step.content !== "function") return step.content;
    return step.content(guideValues());
  }

  function showTutorial(step) {
    const TUTORIAL_STEPS = L.tutorial;
    const t = L.ui.tutorial;
    _tutStep = step === undefined ? 0 : step;
    const total = TUTORIAL_STEPS.length;
    const s = TUTORIAL_STEPS[_tutStep];
    const pct = Math.round(((_tutStep + 1) / total) * 100);
    const isLast = _tutStep === total - 1;
    showModal(`
    <div style="max-width:500px;margin:0 auto;font-family:inherit">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
        <h2 style="margin:0;color:#1A3C8C;font-size:18px;line-height:1.3;flex:1">${s.title}</h2>
        <button onclick="closeTutorial()" style="background:none;border:none;font-size:18px;cursor:pointer;color:#ccc;padding:0 0 0 12px;line-height:1;flex-shrink:0" title="${t.closeTitle}">✕</button>
      </div>
      <div style="background:#ebebeb;border-radius:3px;height:4px;margin-bottom:18px">
        <div style="background:#2E5AA7;height:4px;border-radius:3px;width:${pct}%;transition:width 0.35s ease"></div>
      </div>
      <div style="font-size:14px;line-height:1.7;color:#333;min-height:155px">${tutorialContent(s)}</div>
      <div style="margin-top:18px;padding-top:14px;border-top:1px solid #eee">
        <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px">
          <div>
            <button class="btn" onclick="${_tutStep > 0 ? `showTutorial(${_tutStep - 1})` : ""}"
              ${_tutStep === 0 ? "disabled" : ""}
              style="${_tutStep === 0 ? "opacity:0.2;cursor:default;" : ""}padding:8px 16px">${t.back}</button>
          </div>
          <span style="font-size:12px;color:#aaa;white-space:nowrap;text-align:center">${t.stepOf(_tutStep + 1, total)}</span>
          <div style="text-align:right">
            ${
              isLast
                ? `<button class="btn btn-success" onclick="closeTutorial()" style="padding:8px 22px;font-weight:bold">${t.setSail}</button>`
                : `<button class="btn btn-success" onclick="showTutorial(${_tutStep + 1})" style="padding:8px 22px">${t.next}</button>`
            }
          </div>
        </div>
        <div style="text-align:center;margin-top:11px">
          <span onclick="closeTutorial()" style="font-size:12px;color:#bbb;cursor:pointer;text-decoration:underline;text-underline-offset:3px">${t.skip}</span>
        </div>
      </div>
    </div>`);
    modalOnClose = closeTutorial;
  }

  function closeTutorial() {
    localStorage.setItem(PM.TUTORIAL_KEY, "1");
    closeModal();
  }

  PM.closeModal = closeModal;
  PM.showInstructions = showInstructions;
  PM.showRumorBoard = showRumorBoard;
  PM.showTips = showTips;
  PM.showTutorial = showTutorial;
  PM.closeTutorial = closeTutorial;
})();
