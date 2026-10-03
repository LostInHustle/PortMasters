# PortMasters Test Suite

A dependency free suite that protects the game against regressions in logic, rendering, and save handling. Requires Node 16 or newer.

```bash
node tests/run.js            # run all suites
node tests/run.js --update   # re-record the baseline fixtures
```

## What it covers

**Unit** checks the economy formulas against their documented numbers (transport floors, VAT, income tax, wage tables), verifies that the content tables stay consistent with each other, that the opening position matches the documented starting state, and that every key the engine reads exists in both language packs.

**Smoke** parses every script with `node --check`, verifies that both entry pages only reference files that exist on disk, boots the engine in a DOM stub with no console errors, and confirms the full global handler surface is published (the same list `main.js` audits at runtime).

**Integration** is a differential harness. It loads the pre refactor build from git revision `782a060` (`git show`), runs it and the current build side by side in Node `vm` contexts with a seeded random number generator, and drives both through their own rendered buttons by parsing `onclick` attributes, never by calling internal functions directly. After every action it hashes the game state, the log, and all four panels. Five scenarios run per language:

- `boot`: the first frame after load.
- `merchant`: a full 8 round game that buys cheap lots and hires workers.
- `hoarder`: a full game that starts the boon draft but never buys or hires.
- `reload`: plays several rounds, saves, then rebuilds a fresh page from the stored payload and plays on.
- `keys`: exercises the Ctrl+S, Ctrl+N, Ctrl+H, and F1 shortcuts.

Two more integration checks cover the save format directly: a save and load round trip of the full state, and that restarting mid game yields exactly the position of a fresh boot.

## Fixtures

`tests/fixtures/baseline-en.json` and `baseline-zh.json` store the SHA-256 hashes recorded from the baseline build, canonicalized by the rules below. They are derived data: after any intentional change to gameplay, UI text, or the canonicalization rules themselves, re-record them with `node tests/run.js --update` and review the diff.

`--update` always re-records from the baseline build, never from the current one. A fixture can therefore only change when the canonicalization rules change; the current build never gets to define its own expectations.

## Intentional divergences

These are the known, deliberate differences between the baseline and the refactored build. Each one is encoded in `harness.js` so that everything else still has to match exactly.

1. **Named click handlers.** The baseline inlined compound expressions into `onclick` attributes (for example `purchaseCard(game.resourceCards[0])`). The refactor publishes named functions (`purchaseCardById(0)`). `HANDLER_ALIASES` rewrites the baseline spelling before comparison; that the new wiring works is proven by the driver executing the handlers.
2. **Markup whitespace.** The two baseline templates differed in the whitespace between tags. The shared templates emit one canonical spacing, so runs of whitespace between tags are folded and trailing whitespace is trimmed. Text inside tags is still compared exactly.
3. **Retired write-only state fields.** `totalRevenue` and `totalCosts` on the game and `progress` on workers were written but never read; the refactor removed them. `stripRetired` removes those keys from both sides before comparison so their absence does not read as a behaviour change. New saves no longer carry those fields; loading tolerates extra keys from older saves and missing keys alike, so both directions stay safe.
4. **The Mandarin guide intel price.** The baseline Chinese guide text dropped the price in the rumor line ("spend gold" instead of "spend 5 gold") while still advertising the feature. The shared guide templates the price from `game.intelCost`, so `BASELINE_ERRATA` restores the missing 5 on the baseline side.
5. **The Mandarin Ctrl+H shortcut.** The baseline Chinese build never registered the Ctrl+H key handler while its header still advertised it. The shared engine registers it for both languages. No scenario currently presses Ctrl+H outside Phase 1, where it is inert, so the fix is not visible to the fixtures.
6. **Unified UI colours.** The refactor gives every amber callout one colour family and uses one four colour phase identity. `UI_DELTAS` rewrites the baseline colours to the new spelling. The rules only match the exact full patterns that were changed (verified unique in both baselines), never bare colour tokens.
7. **The shipyard button pair.** Back to Shipyard moved to the left, both buttons became large, and Change Batch took the utility colour. `canonicalizeShipyardPair` reduces the two buttons to handler, label, and disabled state, then sorts them, so order, class names, and colour classes no longer matter while labels, handlers, and disabled state still must match.
8. **Removed `btn-sm` class.** One assign button carried a `btn-sm` class that no stylesheet ever defined; its inline style already set the size. The class is gone and `UI_DELTAS` drops it from the baseline markup.
9. **Restart clears the staged module.** The baseline restart left a module staged for a swap in place. The refactor clears it, so a restart equals a fresh boot; the integration check "restart returns the game to its opening position" locks this in.

Two things the harness records but does not compare: browser alerts (kept as `alert()` calls by design) and the `_draftBatch` portion of the save payload during the reload scenario (draft state is runtime only and intentionally not persisted).
