/* Shared helpers: randomness, the activity log, and HTML escaping. */
"use strict";
(function () {
  const PM = (window.PM = window.PM || {});

  PM.logs = [];

  function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function choice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function weightedChoice(items) {
    const total = items.reduce((s, entry) => s + entry[1], 0);
    let r = Math.random() * total;
    for (const [item, weight] of items) {
      r -= weight;
      if (r <= 0) return item;
    }
    return items[0][0];
  }

  function log(msg) {
    PM.logs.push(msg);
    if (PM.logs.length > 500) PM.logs.shift();
    PM.renderLog();
  }

  /* The merchant rank ladder, shared by the endgame screen and the final log. */
  function ratingFor(score) {
    const ratings = PM.lang.ui.ratings;
    if (score >= 300) return ratings.king;
    if (score >= 200) return ratings.tycoon;
    if (score >= 100) return ratings.merchant;
    if (score >= 50) return ratings.trader;
    return ratings.novice;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  PM.rand = rand;
  PM.choice = choice;
  PM.weightedChoice = weightedChoice;
  PM.log = log;
  PM.ratingFor = ratingFor;
  PM.escapeHtml = escapeHtml;
})();
