# Market Batch Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace immediate one-item market purchases with a cross-category cart that validates and settles purchases and one-level upgrades as one atomic life-stage transaction.

**Architecture:** Keep the game state authoritative in `engine.mjs`: UI sends structured cart lines, `quoteMarketCart()` recomputes prices, and `checkoutMarket()` validates every line before mutating a cloned state. Keep the unsubmitted cart in `app.mjs` only, render it as a sticky mobile checkout bar, and clear it whenever the player leaves the market.

**Tech Stack:** Browser ES modules, Node.js built-in test runner, esbuild, HTML/CSS, localStorage, offline service worker.

## Global Constraints

- A cart may contain multiple unique permanent-asset purchases across every market category.
- Existing assets may be upgraded in the same checkout, at most one level per asset per transaction.
- An asset purchased in the current transaction cannot also be upgraded in that transaction.
- Validation errors change neither state nor RNG seed; upgrade-roll failure is a valid paid result.
- One successful checkout or empty-cart exit consumes exactly one life stage.
- The cart is transient UI state and is never saved or restored.
- The 360px mobile layout must keep the checkout controls readable and must not cover the final product card.
- `index.html` must remain directly playable offline through `dist/game.bundle.js`.

---

## File Structure

- Modify `src/engine.mjs`: expose cart quote and atomic checkout functions; keep the existing single-asset effect definitions unchanged.
- Modify `src/app.mjs`: own transient cart/lock state, render selectable product and upgrade rows, submit one checkout, and confirm cart discard.
- Modify `styles.css`: selected-card treatment, sticky cart bar, mobile safe-area spacing, and disabled/over-budget states.
- Create `test/market-checkout.test.mjs`: focused engine tests for totals, atomicity, duplicate/stale lines, deterministic upgrades, and stage behavior.
- Modify `test/app-render.test.mjs`: render assertions for cart controls and mobile/accessibility hooks.
- Modify `sw.js`: bump the cache key after rebuilding the browser bundle.
- Rebuild `dist/game.bundle.js`: keep direct-file play synchronized with source.

### Task 1: Quote and atomically validate market carts

**Files:**
- Modify: `src/engine.mjs`
- Create: `test/market-checkout.test.mjs`

**Interfaces:**
- Consumes: current `asset_market` choices, `GameError`, `getEvent()`, `applyEffects()`, `rngNext()`, and the existing asset upgrade formula.
- Produces: `marketUpgradeQuote(state, category, assetId)`, `quoteMarketCart(state, lines)`, and `checkoutMarket(state, lines)`.

- [ ] **Step 1: Write failing quote and multi-purchase tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { newGame, checkoutMarket, quoteMarketCart } from "../src/engine.mjs";

function openMarket(cash = 100) {
  const state = newGame("test", 11);
  state.phase = "activity";
  state.selected = "life_purchase";
  state.activityKind = "purchase";
  state.activityOptions = ["stun_baton", "street_bike", "night_vision"];
  state.player.resource = cash;
  return state;
}

test("market quote combines purchases across categories", () => {
  const state = openMarket();
  const lines = [
    { kind: "purchase", choiceId: "stun_baton" },
    { kind: "purchase", choiceId: "street_bike" },
  ];
  assert.deepEqual(quoteMarketCart(state, lines), {
    count: 2,
    total: 36,
    remaining: 64,
    affordable: true,
  });
});

test("one checkout grants every selected asset and produces one result", () => {
  const result = checkoutMarket(openMarket(), [
    { kind: "purchase", choiceId: "stun_baton" },
    { kind: "purchase", choiceId: "street_bike" },
  ]);
  assert.equal(result.player.resource, 64);
  assert.equal(result.assets.weapons.some(asset => asset.id === "weapon_stun_baton"), true);
  assert.equal(result.assets.vehicles.some(asset => asset.id === "vehicle_street_bike"), true);
  assert.equal(result.phase, "result");
  assert.equal(result.lastResult.title, "市場結帳");
  assert.equal(result.lastResult.marketLines.length, 2);
});
```

- [ ] **Step 2: Run the focused tests and verify the missing exports fail**

Run: `node --test test/market-checkout.test.mjs`

Expected: FAIL because `quoteMarketCart` and `checkoutMarket` are not exported.

- [ ] **Step 3: Add quote helpers and canonical cart-line keys**

```js
const MARKET_CATEGORY_ORDER = ["weapons", "items", "vehicles", "properties", "industries", "luxuries"];
const marketLineKey = line => line.kind === "purchase"
  ? `purchase:${line.choiceId}`
  : `upgrade:${line.category}:${line.assetId}`;
const assetUpgradeChance = level => level === 0 ? 100 : level === 1 ? 90 : level === 2 ? 80 : Math.max(5, 80 - (level - 2) * 5);

export function marketUpgradeQuote(state, category, assetId) {
  const asset = state.assets?.[category]?.find(item => item.id === assetId);
  if (!asset) throw new GameError("UNKNOWN_ASSET", `找不到資產：${assetId}`);
  const level = asset.level || 0;
  return {
    level,
    cost: Math.max(1, Math.ceil((asset.basePrice || 1) * .25 * (level + 1))),
    chance: assetUpgradeChance(level),
  };
}

export function quoteMarketCart(input, lines) {
  const event = getEvent("asset_market", input);
  let total = 0;
  for (const line of lines) {
    if (line.kind === "purchase") {
      const choice = event.choices.find(item => item.id === line.choiceId);
      if (!choice) throw new GameError("UNKNOWN_ACTIVITY", `未知市場商品：${line.choiceId}`);
      total += choice.cost || 0;
    } else if (line.kind === "upgrade") {
      total += marketUpgradeQuote(input, line.category, line.assetId).cost;
    } else {
      throw new GameError("INVALID_MARKET_LINE", "購物車包含未知項目");
    }
  }
  return { count: lines.length, total, remaining: input.player.resource - total, affordable: total <= input.player.resource };
}
```

Replace the duplicate inline chance calculation in `upgradeAssetBase()` and `upgradeList()` with this exact asset ladder: level 0 is 100%, level 1 is 90%, level 2 is 80%, then it decreases by 5% to a 5% floor. Do not use `characterLevelChance()`, whose level-1 result is 90%.

- [ ] **Step 4: Add the atomic checkout implementation**

```js
export function checkoutMarket(input, lines) {
  if (input.phase !== "activity" || input.activityKind !== "purchase") {
    throw new GameError("WRONG_PHASE", "只能在城市市場結帳");
  }
  if (!Array.isArray(lines) || !lines.length) throw new GameError("EMPTY_CART", "購物車目前是空的");
  const event = getEvent("asset_market", input);
  const keys = lines.map(marketLineKey);
  if (new Set(keys).size !== keys.length) throw new GameError("DUPLICATE_MARKET_LINE", "購物車包含重複項目");

  const purchases = [];
  const upgrades = [];
  const purchasedAssetIds = new Set();
  for (const line of lines) {
    if (line.kind === "purchase") {
      const choice = event.choices.find(item => item.id === line.choiceId);
      const grant = choice?.effects.find(effect => effect.type === "asset.grant");
      if (!choice || !grant) throw new GameError("UNKNOWN_ACTIVITY", `未知市場商品：${line.choiceId}`);
      if (input.assets[grant.category].some(asset => asset.id === grant.assetId)) {
        throw new GameError("ASSET_OWNED", `已經持有：${grant.name}`);
      }
      purchases.push({ choice, grant });
      purchasedAssetIds.add(grant.assetId);
      continue;
    }
    if (line.kind !== "upgrade") throw new GameError("INVALID_MARKET_LINE", "購物車包含未知項目");
    const quote = marketUpgradeQuote(input, line.category, line.assetId);
    if (quote.level !== line.expectedLevel) throw new GameError("STALE_UPGRADE", `資產等級已變更：${line.assetId}`);
    if (purchasedAssetIds.has(line.assetId)) throw new GameError("NEW_ASSET_UPGRADE", "新購資產不能在同一筆交易升級");
    upgrades.push({ ...line, ...quote });
  }
  if (upgrades.some(line => purchasedAssetIds.has(line.assetId))) {
    throw new GameError("NEW_ASSET_UPGRADE", "新購資產不能在同一筆交易升級");
  }
  const quote = quoteMarketCart(input, lines);
  if (!quote.affordable) throw new GameError("INSUFFICIENT_CASH", `結帳需要現金 ${quote.total}`);

  let state = structuredClone(input);
  const marketOrder = choice => {
    const grant = choice.effects.find(effect => effect.type === "asset.grant");
    return MARKET_CATEGORY_ORDER.indexOf(grant.category) * 1000 + event.choices.indexOf(choice);
  };
  const results = [];
  for (const { choice } of purchases.sort((left, right) => marketOrder(left.choice) - marketOrder(right.choice))) {
    const effects = choice.effects.map(effect => effect.type === "asset.grant" ? { ...effect, basePrice: choice.cost } : effect);
    state = applyEffects(state, effects, `market:checkout:${choice.id}`);
    results.push({ kind: "purchase", id: choice.id, label: choice.text, detail: choice.detail, cost: choice.cost, success: true });
  }
  for (const line of upgrades.sort((left, right) => `${left.category}:${left.assetId}`.localeCompare(`${right.category}:${right.assetId}`))) {
    state = applyEffects(state, [{ type: "resource.add", value: -line.cost }], `market:upgrade:${line.assetId}`);
    const roll = rngNext(state.seed);
    state.seed = roll.seed;
    const success = roll.value * 100 < line.chance;
    state = applyEffects(state, [{ type: "asset.upgrade", category: line.category, assetId: line.assetId, success }], `market:upgrade:${line.assetId}`);
    results.push({ kind: "upgrade", id: line.assetId, label: state.assets[line.category].find(asset => asset.id === line.assetId).name, detail: success ? `升級至 +${line.level + 1}` : `升級失敗，維持 +${line.level}`, cost: line.cost, success, fromLevel: line.level, toLevel: success ? line.level + 1 : line.level });
  }
  state.phase = "result";
  state.lastResult = {
    title: "市場結帳",
    choice: `一次結帳 ${results.length} 項`,
    success: true,
    marketLines: results,
    totalCost: quote.total,
    remainingCash: state.player.resource,
    summary: `本次共支出現金 ${quote.total}，剩餘 ${state.player.resource}。`,
  };
  return withResultArt(state, "asset_market", "checkout");
}
```

- [ ] **Step 5: Run the focused tests**

Run: `node --test test/market-checkout.test.mjs`

Expected: PASS for quote and two-purchase checkout.

- [ ] **Step 6: Commit the engine transaction**

```powershell
git add src/engine.mjs test/market-checkout.test.mjs
git commit -m "Add atomic market checkout"
```

### Task 2: Cover rollback, stale upgrades, and deterministic upgrade rolls

**Files:**
- Modify: `test/market-checkout.test.mjs`
- Modify: `src/engine.mjs`

**Interfaces:**
- Consumes: `checkoutMarket()`, `quoteMarketCart()`, and `marketUpgradeQuote()` from Task 1.
- Produces: complete engine-level guarantees for all invalid and mixed-result carts.

- [ ] **Step 1: Add failing atomicity and upgrade tests**

```js
test("invalid carts preserve the complete original state and seed", () => {
  const state = openMarket(35);
  const before = structuredClone(state);
  assert.throws(() => checkoutMarket(state, [
    { kind: "purchase", choiceId: "stun_baton" },
    { kind: "purchase", choiceId: "street_bike" },
  ]), error => error.code === "INSUFFICIENT_CASH");
  assert.deepEqual(state, before);
});

test("duplicate and unknown market lines are rejected before mutation", () => {
  const state = openMarket();
  const duplicate = { kind: "purchase", choiceId: "stun_baton" };
  assert.throws(() => checkoutMarket(state, [duplicate, duplicate]), error => error.code === "DUPLICATE_MARKET_LINE");
  assert.throws(() => checkoutMarket(state, [{ kind: "purchase", choiceId: "missing" }]), error => error.code === "UNKNOWN_ACTIVITY");
});

test("an existing asset can receive one deterministic paid upgrade", () => {
  let state = checkoutMarket(openMarket(), [{ kind: "purchase", choiceId: "stun_baton" }]);
  state.phase = "activity";
  state.activityKind = "purchase";
  state.player.resource = 100;
  const line = { kind: "upgrade", category: "weapons", assetId: "weapon_stun_baton", expectedLevel: 0 };
  const first = checkoutMarket(state, [line]);
  const second = checkoutMarket(state, [line]);
  assert.deepEqual(first.lastResult.marketLines, second.lastResult.marketLines);
  assert.equal(first.assets.weapons[0].level, 1);
  assert.equal(first.player.resource, 96);
});

test("new purchases cannot be upgraded in the same transaction", () => {
  assert.throws(() => checkoutMarket(openMarket(), [
    { kind: "purchase", choiceId: "stun_baton" },
    { kind: "upgrade", category: "weapons", assetId: "weapon_stun_baton", expectedLevel: 0 },
  ]), error => error.code === "UNKNOWN_ASSET" || error.code === "NEW_ASSET_UPGRADE");
});
```

- [ ] **Step 2: Run the focused tests and inspect the first failing invariant**

Run: `node --test test/market-checkout.test.mjs`

Expected: at least one new test FAILS until validation order and the shared upgrade chance helper are correct.

- [ ] **Step 3: Make purchase/upgrade conflict validation independent of cart order**

Build the complete purchase asset-ID set before validating upgrade lines:

```js
const purchasedAssetIds = new Set(lines
  .filter(line => line.kind === "purchase")
  .map(line => event.choices.find(choice => choice.id === line.choiceId))
  .filter(Boolean)
  .map(choice => choice.effects.find(effect => effect.type === "asset.grant")?.assetId)
  .filter(Boolean));
```

Then reject any upgrade whose asset ID appears in that set before calling `marketUpgradeQuote()`.

- [ ] **Step 4: Run the focused tests again**

Run: `node --test test/market-checkout.test.mjs`

Expected: all market checkout tests PASS.

- [ ] **Step 5: Run the complete engine suite**

Run: `npm test`

Expected: all existing and new tests PASS; legacy `upgradeAsset()` behavior remains unchanged.

- [ ] **Step 6: Commit edge-case coverage**

```powershell
git add src/engine.mjs test/market-checkout.test.mjs
git commit -m "Test market checkout rollback and upgrades"
```

### Task 3: Render and operate the transient cart UI

**Files:**
- Modify: `src/app.mjs`
- Modify: `test/app-render.test.mjs`
- Modify: `styles.css`

**Interfaces:**
- Consumes: `quoteMarketCart()`, `marketUpgradeQuote()`, and `checkoutMarket()` from Task 1.
- Produces: transient `marketCart`, selectable product/upgrade controls, sticky totals, discard confirmation, and one-submit locking.

- [ ] **Step 1: Add a failing market render test**

```js
test("market renders selectable items and one sticky checkout control", async () => {
  const state = newGame("test", 12);
  state.phase = "activity";
  state.selected = "life_purchase";
  state.activityKind = "purchase";
  state.activityOptions = getEvent("asset_market", state).choices.map(choice => choice.id);
  state.player.resource = 100;
  const html = await renderSavedState(state);
  assert.match(html, /data-market-purchase="stun_baton"/);
  assert.match(html, /data-market-checkout/);
  assert.match(html, /class="market-cart-bar/);
  assert.match(html, /aria-live="polite"/);
  assert.doesNotMatch(html, /data-activity="stun_baton"/);
});

test("market checkout result lists every purchased and upgraded line", async () => {
  let state = openMarketRenderState(100);
  state = checkoutMarket(state, [
    { kind: "purchase", choiceId: "stun_baton" },
    { kind: "purchase", choiceId: "street_bike" },
  ]);
  const html = await renderSavedState(state);
  assert.match(html, /購買電擊伸縮棍/);
  assert.match(html, /購買街頭重機/);
  assert.match(html, /總支出 36/);
});

function openMarketRenderState(cash) {
  const state = newGame("test", 13);
  state.phase = "activity";
  state.selected = "life_purchase";
  state.activityKind = "purchase";
  state.activityOptions = getEvent("asset_market", state).choices.map(choice => choice.id);
  state.player.resource = cash;
  return state;
}
```

Import `checkoutMarket` in the existing engine import.

- [ ] **Step 2: Run the render test and verify it fails**

Run: `node --test test/app-render.test.mjs --test-name-pattern="market renders"`

Expected: FAIL because product cards still use immediate `data-activity` actions.

- [ ] **Step 3: Add cart state, line helpers, and engine imports**

```js
import { checkoutMarket, quoteMarketCart, marketUpgradeQuote } from "./engine.mjs?v=29";

let marketCart = [];
let marketCheckoutRunning = false;
const marketLineKey = line => line.kind === "purchase"
  ? `purchase:${line.choiceId}`
  : `upgrade:${line.category}:${line.assetId}`;
const marketCartHas = line => marketCart.some(item => marketLineKey(item) === marketLineKey(line));
function toggleMarketLine(line) {
  const key = marketLineKey(line);
  marketCart = marketCart.some(item => marketLineKey(item) === key)
    ? marketCart.filter(item => marketLineKey(item) !== key)
    : [...marketCart, line];
  render();
}
function clearMarketCart() {
  marketCart = [];
  marketCheckoutRunning = false;
}
```

Call `clearMarketCart()` before starting a new game, loading a save, opening the modifier from the title screen, and after any successful market exit or checkout. A failed checkout resets only `marketCheckoutRunning` and preserves selected lines.

Keep the actual import on the existing consolidated engine import line and advance its query version once.

- [ ] **Step 4: Replace immediate product and upgrade buttons with selections**

Product cards must emit `data-market-purchase`, `aria-pressed`, and a visual selected class. Upgrade rows must emit a structured value with the expected level:

```js
const line = { kind: "purchase", choiceId: choice.id };
const selected = marketCartHas(line);
return `<button class="choice picture-choice market-choice ${selected ? "selected" : ""}" data-market-purchase="${choice.id}" aria-pressed="${selected}" ${owned ? "disabled" : ""}>${choicePicture("asset_market", choice.id, "market")}<span class="choice-copy"><b>${esc(choice.text)}</b>${esc(choice.detail)}${owned ? '<span class="danger">已持有</span>' : ""}</span></button>`;
```

```js
const line = { kind: "upgrade", category: asset.category, assetId: asset.id, expectedLevel: asset.level || 0 };
const selected = marketCartHas(line);
return `<button class="secondary picture-choice market-upgrade ${selected ? "selected" : ""}" data-market-upgrade="${asset.category}:${asset.id}:${asset.level || 0}" aria-pressed="${selected}">${choicePicture(identity.parentId, identity.optionId, identity.category)}<span class="choice-copy">${esc(asset.name)} +${level}／升級 ${cost}／成功率 ${chance}%</span></button>`;
```

- [ ] **Step 5: Render sticky totals and bind checkout/discard controls**

```js
const quote = quoteMarketCart(state, marketCart);
const cartBar = `<aside class="market-cart-bar ${quote.affordable ? "" : "over-budget"}" aria-live="polite"><span><b>${quote.count} 項／總價 ${quote.total}</b><small>目前 ${state.player.resource}／結帳後 ${quote.remaining}</small></span><button class="secondary" data-market-clear ${quote.count ? "" : "disabled"}>清空</button><button class="primary" data-market-checkout ${quote.count && quote.affordable && !marketCheckoutRunning ? "" : "disabled"}>確認結帳</button></aside>`;
```

In `result()`, render `lastResult.marketLines` before the Continue button:

```js
const marketDetails = r.marketLines?.length
  ? `<section class="market-result-lines"><h3>結帳明細</h3>${r.marketLines.map(line => `<p class="${line.success ? "" : "danger"}"><b>${esc(line.label)}</b><span>${esc(line.detail)}／現金 ${line.cost}</span></p>`).join("")}<strong>總支出 ${r.totalCost}／剩餘 ${r.remainingCash}</strong></section>`
  : "";
```

Insert `${marketDetails}` inside the result panel after the normal result copy so purchases, upgrade successes, and paid upgrade failures remain individually visible.

```js
document.querySelectorAll("[data-market-purchase]").forEach(button => button.addEventListener("click", () => {
  toggleMarketLine({ kind: "purchase", choiceId: button.dataset.marketPurchase });
}));
document.querySelectorAll("[data-market-upgrade]").forEach(button => button.addEventListener("click", () => {
  const [category, assetId, expectedLevel] = button.dataset.marketUpgrade.split(":");
  toggleMarketLine({ kind: "upgrade", category, assetId, expectedLevel: Number(expectedLevel) });
}));
document.querySelector("[data-market-clear]")?.addEventListener("click", () => { marketCart = []; render(); });
document.querySelector("[data-market-checkout]")?.addEventListener("click", () => {
  if (marketCheckoutRunning) return;
  marketCheckoutRunning = true;
  const lines = structuredClone(marketCart);
  commit(() => checkoutMarket(state, lines));
  if (state.phase === "result") clearMarketCart();
});
document.querySelector("[data-market-leave]")?.addEventListener("click", () => {
  if (marketCart.length && !globalThis.confirm("放棄購物車內尚未結帳的項目？")) return;
  clearMarketCart();
  commit(() => resolveActivity(state, "leave"));
});
```

If checkout throws, `commit()` must reset `marketCheckoutRunning` to false while preserving `marketCart`; only a successful result clears it.

- [ ] **Step 6: Add mobile-first cart styling**

```css
.market { padding-bottom: 7rem; }
.market-choice.selected,
.market-upgrade.selected { border-color: #d8b56d; box-shadow: 0 0 0 2px rgba(216,181,109,.28); }
.market-cart-bar { position: sticky; bottom: max(.5rem, env(safe-area-inset-bottom)); z-index: 12; display: grid; grid-template-columns: minmax(0,1fr) auto auto; gap: .6rem; align-items: center; padding: .75rem; background: rgba(7,17,15,.96); border: 1px solid #7c704f; border-radius: 1rem; backdrop-filter: blur(10px); }
.market-cart-bar span { display: grid; min-width: 0; }
.market-cart-bar.over-budget { border-color: #c65353; }
.market-cart-bar.over-budget b,
.market-cart-bar.over-budget small { color: #ff9d9d; }
@media (max-width: 520px) {
  .market-cart-bar { grid-template-columns: 1fr 1fr; }
  .market-cart-bar > span { grid-column: 1 / -1; }
}
```

- [ ] **Step 7: Run focused engine and render tests**

Run: `node --test test/market-checkout.test.mjs test/app-render.test.mjs`

Expected: PASS.

- [ ] **Step 8: Commit the cart UI**

```powershell
git add src/app.mjs styles.css test/app-render.test.mjs
git commit -m "Add multi-item market cart UI"
```

### Task 4: Rebuild, cache, and verify the complete shopping flow

**Files:**
- Modify: `dist/game.bundle.js`
- Modify: `sw.js`

**Interfaces:**
- Consumes: completed source and UI behavior from Tasks 1–3.
- Produces: direct-file and hosted builds with the same market checkout behavior.

- [ ] **Step 1: Run the entire automated suite**

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 2: Build the offline bundle**

Run: `npm run build`

Expected: esbuild exits 0 and updates `dist/game.bundle.js`.

- [ ] **Step 3: Bump the service-worker cache**

Change the first line of `sw.js` from the current version to:

```js
const CACHE = "crime-five-roads-v39";
```

- [ ] **Step 4: Run artifact and bundle checks**

Run: `npm run audit:art`

Expected: exit 0 with no missing, duplicate, or wrong-ratio assets.

Run: `npm test`

Expected: all tests PASS after the final bundle and cache edit.

- [ ] **Step 5: Test the interaction in the in-app browser**

Start the local server with `npm run serve`, open `http://127.0.0.1:8080/`, enter the market, select one weapon and one vehicle, confirm the combined total, check out, and confirm that one result lists both assets. Repeat with an over-budget cart and verify checkout remains disabled. At a mobile viewport near 390×844, confirm the sticky bar does not cover the final product.

- [ ] **Step 6: Test direct-file play**

Open `index.html` directly, enter or load a game, and verify the market uses the same cart controls without a web server.

- [ ] **Step 7: Commit the offline artifacts**

```powershell
git add dist/game.bundle.js sw.js
git commit -m "Build batch market checkout"
```
