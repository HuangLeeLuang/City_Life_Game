# Final review fix wave 1 report

## Scope and files

Commit message: `Fix market checkout final review findings`

- `src/engine.mjs` — phased market validation and exact applied-effect result data.
- `src/app.mjs` — market UI context restoration and applied-summary rendering.
- `test/market-checkout.test.mjs` — precedence, malformed-data atomicity, and clamped/status effect coverage.
- `test/app-render.test.mjs` — real market handler coverage for open details, focus, and scroll; result rendering coverage.
- `sw.js`, `test/art-content.test.mjs` — cache key `v40` and artifact assertion.
- `dist/game.bundle.js` — rebuilt offline bundle.

## Finding mapping

1. Validation now completes the purchase phase before any upgrade validation. This makes unknown purchases win over unrelated stale upgrades, makes an owned purchase win over a same-asset upgrade, and retains `NEW_ASSET_UPGRADE` for new assets in either input order. `marketPurchaseChoice()` validates the selected choice shape (effects array, valid grant category/asset/name, finite nonnegative cost) and throws `GameError(INVALID_MARKET_CHOICE)` without mutating input or seed.
2. Market controls receive stable category, focus, and scroll identities. Rendering captures open category IDs, scroll coordinates, and the active market line, then restores all three after the real selection handler re-renders. The interactive test uses actual registered handlers and mock focus/details/scroll elements rather than checking source text.
3. Purchase result lines now include structured `appliedEffects` and a rendered `appliedSummary`, based on the effects actually logged after settlement. The regression checks requested vs. adjusted values, actual clamped deltas, before/after values, and the city-status recovery adjustment.

## TDD evidence

All commands used the bundled Node v24 executable:

`C:\Users\g1217\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe`

RED commands and observed counts:

1. `node --test test/market-checkout.test.mjs` — 10 pass, 4 fail (validation precedence, malformed classified errors, applied summaries).
2. `node --test --test-name-pattern='market selection keeps|market result renders the exact' test/app-render.test.mjs` — 0 pass, 2 fail (missing market context persistence and rendered summary).
3. `node --test --test-name-pattern='service worker keeps choice art' test/art-content.test.mjs` — 0 pass, 1 fail (expected v40, found v39).

GREEN and final validation:

1. `node --test test/market-checkout.test.mjs test/app-render.test.mjs` — 30 pass, 0 fail.
2. `node --test --test-name-pattern='service worker keeps choice art' test/art-content.test.mjs` — 1 pass, 0 fail.
3. `node --test` before the bundle rebuild — 107 pass, 0 fail.
4. `npm run build` — succeeded; rebuilt `dist/game.bundle.js` (274.7 kB).
5. `npm run audit:art` — 293 requirements, 0 missing mappings, 0 missing files.
6. `node --test` after bundle/cache updates — 107 pass, 0 fail.

`npm` scripts were launched through the bundled Node executable with its directory prepended to `PATH`, so the scripts used Node v24.

## Deviations and risks

No scope deviations. The current UI re-renders its market section by design; restoring native `<details>`, focused control, and market scroll coordinates after the render is intentionally limited to the market view. No plan or progress-ledger file was changed.

## Fix round 2

Commit message: `Fix remaining market checkout review findings`

### Finding mapping

1. Viewport preservation now captures `window.scrollX` and `window.scrollY` (with `document.scrollingElement` fallback) before the market render. Restoration reopens category details, restores the canonical line focus, then invokes `window.scrollTo(x, y)`. The event-capable handler test resets its modeled viewport during render and requires the exact `scrollTo(31, 173)` call, so arbitrary section `scrollTop` round-tripping cannot satisfy it.
2. Applied-effect collection now consumes matching log records in application order. A choice containing two valid `ability.add physique` effects verifies final physique `33`, distinct per-effect before/after/delta records (`28→30`, then `30→33`), and the ordered rendered summary.
3. The offline bundle was rebuilt and the service-worker cache key plus artifact assertion were advanced from `v40` to `v41`.

### TDD evidence

RED commands and observed counts:

1. `node --test --test-name-pattern='market selection keeps open category focus and viewport scroll' test/app-render.test.mjs` — 0 pass, 1 fail; the modeled viewport reset to `(0, 0)` with no `scrollTo` call.
2. `node --test --test-name-pattern='purchase summaries consume repeated ability logs' test/market-checkout.test.mjs` — 0 pass, 1 fail; the second summary reused `28→30` instead of consuming `30→33`.
3. `node --test --test-name-pattern='service worker keeps choice art' test/art-content.test.mjs` — 0 pass, 1 fail; expected v41 and found v40.

GREEN and final validation (all with bundled Node v24 as documented above):

1. `node --test --test-name-pattern='market selection keeps open category focus and viewport scroll' test/app-render.test.mjs` — 1 pass, 0 fail.
2. `node --test --test-name-pattern='purchase summaries consume repeated ability logs' test/market-checkout.test.mjs` — 1 pass, 0 fail.
3. `node --test test/market-checkout.test.mjs test/app-render.test.mjs test/art-content.test.mjs` — 46 pass, 0 fail.
4. `node --test` before bundle rebuild — 108 pass, 0 fail.
5. `npm run build` — succeeded; rebuilt `dist/game.bundle.js` (274.8 kB).
6. `npm run audit:art` — 293 requirements, 0 missing mappings, 0 missing files.
7. `node --test` after bundle/cache updates — 108 pass, 0 fail.

No deviations or new risks. The change removes the arbitrary market-section scroll preservation in favor of the real viewport/document scroll contract.
