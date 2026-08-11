import test from "node:test";
import assert from "node:assert/strict";
import { choiceArt } from "../src/art-content.mjs";
import { checkoutMarket, generateCards, newGame, getEvent, resolveChoice } from "../src/engine.mjs";
import { FACTIONS, TERRITORIES } from "../src/faction-content.mjs";

const SAVE_KEY = "crime-five-roads-save-v2";
let importSequence = 0;

async function renderSavedState(savedState) {
  let html = "";
  let load;
  const storage = new Map([[SAVE_KEY, JSON.stringify(savedState)]]);
  const app = {
    addEventListener() {},
    get innerHTML() { return html; },
    set innerHTML(value) { html = value; },
  };
  const document = {
    querySelector(selector) {
      if (selector === "#app") return app;
      if (selector === "[data-load]" && html.includes("data-load")) {
        return { addEventListener: (type, listener) => { if (type === "click") load = listener; } };
      }
      if (selector === ".actions") return { append() {} };
      return null;
    },
    querySelectorAll() { return []; },
    createElement() { return { dataset: {}, addEventListener() {} }; },
  };
  const localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  };

  Object.assign(globalThis, {
    document,
    localStorage,
    location: { protocol: "file:" },
    window: { addEventListener() {} },
    HTMLImageElement: class {},
  });

  await import(`../src/app.mjs?render-test=${importSequence++}`);
  assert.equal(typeof load, "function", "saved game load handler should be registered");
  load();
  return app.innerHTML;
}

async function mountInteractiveMarket(savedState) {
  let html = "";
  let initialLoad;
  let initialStart;
  let startModifier;
  let purchaseButtons = [];
  let upgradeButtons = [];
  let clearButton;
  let checkoutButton;
  let leaveButton;
  let modifierButton;
  let continueButton;
  let cardButtons = [];
  let marketSections = [];
  let marketScroll = null;
  let marketFocusControls = new Map();
  let activeElement = null;
  const viewport = { x: 0, y: 0, calls: [] };
  let confirmResult = true;
  let confirmCalls = 0;
  let onStorageWrite = null;
  const storage = new Map([[SAVE_KEY, JSON.stringify(savedState)]]);
  const app = {
    addEventListener() {},
    get innerHTML() { return html; },
    set innerHTML(value) {
      html = value;
      activeElement = null;
      viewport.x = 0;
      viewport.y = 0;
      marketSections = [...html.matchAll(/<details class="market-section"[^>]*data-market-section="([^"]+)"[^>]*>/g)].map(([, key]) => ({ dataset: { marketSection: key }, open: false }));
      marketScroll = html.includes("data-market-scroll") ? { scrollTop: 0, scrollLeft: 0 } : null;
      marketFocusControls = new Map([...html.matchAll(/data-market-focus="([^"]+)"/g)].map(([, key]) => [key, button({ marketFocus: key })]));
    },
  };
  const button = (dataset = {}, disabled = false) => {
    let click;
    return {
      dataset,
      disabled,
      addEventListener(type, listener) { if (type === "click") click = listener; },
      click() { if (!disabled) click?.({ currentTarget: this, target: this }); },
      focus() { activeElement = this; },
    };
  };
  const valuedButtons = (attribute, datasetKey) => [...html.matchAll(new RegExp(`<button\\b([^>]*)\\s${attribute}="([^"]*)"([^>]*)>`, "g"))]
    .map(([, before, value, after]) => button({ [datasetKey]: value }, /\bdisabled\b/.test(`${before}${after}`)));
  const bareButton = attribute => {
    const match = html.match(new RegExp(`<button\\b([^>]*)\\s${attribute}(?=\\s|>)([^>]*)>`));
    return match ? button({}, /\bdisabled\b/.test(`${match[1]}${match[2]}`)) : null;
  };
  const document = {
    querySelector(selector) {
      if (selector === "#app") return app;
      if (selector === ".actions") return { append(element) { startModifier = element; } };
      if (selector === "[data-start-modifier]") return startModifier || null;
      if (selector === "[data-load]" && html.includes("data-load")) {
        const control = button();
        if (!initialLoad) initialLoad = control;
        return control;
      }
      if (selector === "[data-start]" && html.includes("data-start")) {
        const control = button();
        if (!initialStart) initialStart = control;
        return control;
      }
      if (selector === "[data-market-clear]") return clearButton = bareButton("data-market-clear");
      if (selector === "[data-market-checkout]") return checkoutButton = bareButton("data-market-checkout");
      if (selector === "[data-market-leave]") return leaveButton = bareButton("data-market-leave");
      if (selector === "[data-market-scroll]") return marketScroll;
      const focusMatch = selector.match(/^\[data-market-focus="([^"]+)"\]$/);
      if (focusMatch) return marketFocusControls.get(focusMatch[1]) || null;
      const sectionMatch = selector.match(/^\[data-market-section="([^"]+)"\]$/);
      if (sectionMatch) return marketSections.find(section => section.dataset.marketSection === sectionMatch[1]) || null;
      if (selector === "[data-modifier]" && html.includes("data-modifier")) return modifierButton = button();
      if (selector === "[data-continue]") return continueButton = bareButton("data-continue");
      return null;
    },
    querySelectorAll(selector) {
      if (selector === "[data-market-purchase]") return purchaseButtons = valuedButtons("data-market-purchase", "marketPurchase");
      if (selector === "[data-market-upgrade]") return upgradeButtons = valuedButtons("data-market-upgrade", "marketUpgrade");
      if (selector === "[data-card]") return cardButtons = valuedButtons("data-card", "card");
      if (selector === ".market-section") return marketSections;
      return [];
    },
    createElement() { return button(); },
  };
  const localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem(key, value) { storage.set(key, String(value)); onStorageWrite?.(key, String(value)); },
    removeItem: key => storage.delete(key),
  };

  const window = {
    addEventListener() {},
    get scrollX() { return viewport.x; },
    get scrollY() { return viewport.y; },
    scrollTo(x, y) { viewport.calls.push([x, y]); viewport.x = x; viewport.y = y; },
  };
  Object.assign(globalThis, {
    document,
    localStorage,
    location: { protocol: "file:" },
    window,
    HTMLImageElement: class {},
    confirm: () => { confirmCalls++; return confirmResult; },
  });
  Object.defineProperty(document, "activeElement", { get: () => activeElement });

  await import(`../src/app.mjs?interactive-render-test=${importSequence++}`);
  assert.ok(initialLoad, "saved game load control should be interactive");
  initialLoad.click();
  return {
    get html() { return html; },
    get confirmCalls() { return confirmCalls; },
    get checkout() { return checkoutButton; },
    get marketSections() { return marketSections; },
    get viewport() { return { x: viewport.x, y: viewport.y, calls: [...viewport.calls] }; },
    get activeMarketFocus() { return activeElement?.dataset?.marketFocus || null; },
    purchase(id) { const control = purchaseButtons.find(item => item.dataset.marketPurchase === id); assert.ok(control, `missing market purchase ${id}`); control.click(); },
    focusPurchase(id) { const control = purchaseButtons.find(item => item.dataset.marketPurchase === id); assert.ok(control, `missing market purchase ${id}`); control.focus(); },
    setViewport(x, y) { viewport.x = x; viewport.y = y; viewport.calls = []; },
    upgrade(category, assetId) { const control = upgradeButtons.find(item => item.dataset.marketUpgrade.startsWith(`${category}:${assetId}:`)); assert.ok(control, `missing market upgrade ${category}:${assetId}`); return control; },
    clear() { assert.ok(clearButton, "missing market clear control"); clearButton.click(); },
    leave() { assert.ok(leaveButton, "missing market leave control"); leaveButton.click(); },
    startNew(seed) { assert.ok(initialStart, "missing new game control"); const originalNow = Date.now; Date.now = () => seed; try { initialStart.click(); } finally { Date.now = originalNow; } },
    openTitleModifier(seed) { assert.ok(startModifier, "missing title modifier control"); const originalNow = Date.now; Date.now = () => seed; try { startModifier.click(); } finally { Date.now = originalNow; } },
    closeModifier() { assert.ok(modifierButton, "missing modifier close control"); modifierButton.click(); },
    continue() { assert.ok(continueButton, "missing continue control"); continueButton.click(); },
    chooseCard(id) { const control = cardButtons.find(item => item.dataset.card === id); assert.ok(control, `missing card ${id}`); control.click(); },
    load(state) { storage.set(SAVE_KEY, JSON.stringify(state)); initialLoad.click(); },
    setConfirm(value) { confirmResult = value; },
    reenterOnNextSave(callback) { onStorageWrite = (key, value) => { onStorageWrite = null; callback(key, value); }; },
  };
}

function factionBoardState() {
  const state = newGame("test", 1);
  state.phase = "factionBoard";
  state.selected = "life_conflict";
  state.day = 100;
  state.player.resource = 999;
  state.player.health = 100;
  return state;
}

function openMarketRenderState(cash = 100, seed = 13) {
  const state = newGame("test", seed);
  state.phase = "activity";
  state.selected = "life_purchase";
  state.activityKind = "purchase";
  state.activityOptions = getEvent("asset_market", state).choices.map(choice => choice.id);
  state.player.resource = cash;
  return state;
}

function marketOpeningCardsState() {
  return generateCards(newGame("test", 2));
}

test("market renders selectable items and one sticky checkout control", async () => {
  const html = await renderSavedState(openMarketRenderState());

  assert.match(html, /data-market-purchase="stun_baton"/);
  assert.equal([...html.matchAll(/data-market-checkout/g)].length, 1);
  assert.equal([...html.matchAll(/class="market-cart-bar/g)].length, 1);
  assert.match(html, /aria-live="polite"/);
  assert.doesNotMatch(html, /data-activity="stun_baton"/);
});

test("market checkout result lists every purchased line and total", async () => {
  const state = checkoutMarket(openMarketRenderState(), [
    { kind: "purchase", choiceId: "stun_baton" },
    { kind: "purchase", choiceId: "street_bike" },
  ]);
  const html = await renderSavedState(state);

  assert.match(html, /結帳明細/);
  assert.match(html, /購買電擊伸縮棍/);
  assert.match(html, /購買街頭重機/);
  assert.match(html, /總花費 36/);
  assert.match(html, /data-continue/);
});

test("market controls toggle selections, totals, budget state, and clear cart", async () => {
  const market = await mountInteractiveMarket(openMarketRenderState(20));

  market.purchase("stun_baton");
  assert.match(market.html, /market-choice selected" data-market-purchase="stun_baton"[^>]*aria-pressed="true"/);
  assert.match(market.html, /1 項／總計 16/);
  assert.match(market.html, /現金 20／結帳後 4/);

  market.purchase("street_bike");
  assert.match(market.html, /market-cart-bar over-budget/);
  assert.match(market.html, /2 項／總計 36/);
  assert.match(market.html, /現金 20／結帳後 -16/);

  market.clear();
  assert.match(market.html, /market-choice " data-market-purchase="stun_baton"[^>]*aria-pressed="false"/);
  assert.match(market.html, /0 項／總計 0/);
});

test("market selection keeps open category focus and viewport scroll through its real handler", async () => {
  const market = await mountInteractiveMarket(openMarketRenderState());
  assert.ok(market.marketSections.length, "market category details should be available");
  market.marketSections[0].open = true;
  market.setViewport(31, 173);
  market.focusPurchase("stun_baton");

  market.purchase("stun_baton");

  assert.equal(market.marketSections[0].open, true);
  assert.equal(market.activeMarketFocus, "purchase:stun_baton");
  assert.deepEqual(market.viewport, { x: 31, y: 173, calls: [[31, 173]] });
});

test("market checkout and confirmed leave do not restore market viewport onto results", async () => {
  const checkoutMarket = await mountInteractiveMarket(openMarketRenderState());
  checkoutMarket.purchase("stun_baton");
  checkoutMarket.setViewport(31, 173);
  checkoutMarket.checkout.click();

  assert.match(checkoutMarket.html, /phase-result/);
  assert.deepEqual(checkoutMarket.viewport, { x: 0, y: 0, calls: [] });

  const leaveMarket = await mountInteractiveMarket(openMarketRenderState());
  leaveMarket.purchase("stun_baton");
  leaveMarket.setViewport(47, 251);
  leaveMarket.leave();

  assert.match(leaveMarket.html, /phase-result/);
  assert.deepEqual(leaveMarket.viewport, { x: 0, y: 0, calls: [] });
});

test("market result renders the exact applied effect summary for each line", async () => {
  const state = openMarketRenderState();
  state.cityStatus = "quiet_day";
  state.cityStatusIndex = 0;
  state.player.abilities.physique = 98;
  state.player.health = 98;
  state.world.security = 98;
  state.cardOverrides.asset_market = {
    choices: [{
      id: "render-exact-effects",
      text: "Render exact effects",
      detail: "Marketing copy.",
      cost: 10,
      effects: [
        { type: "resource.add", value: -10 },
        { type: "asset.grant", category: "weapons", assetId: "weapon_render_exact_effects", name: "Render exact effects weapon" },
        { type: "ability.add", key: "physique", value: 5 },
        { type: "stat.add", key: "health", value: 7 },
        { type: "world.add", key: "security", value: 4 },
      ],
    }],
  };
  const html = await renderSavedState(checkoutMarket(state, [{ kind: "purchase", choiceId: "render-exact-effects" }]));

  assert.match(html, /體能 \+2/);
  assert.match(html, /健康 \+2.*平靜的一天 \+2/);
  assert.match(html, /治安 \+2/);
});

test("market leave keeps cart when discard is cancelled and resolves when confirmed", async () => {
  const market = await mountInteractiveMarket(openMarketRenderState(100, 1));
  market.purchase("stun_baton");
  market.setConfirm(false);
  market.leave();

  assert.equal(market.confirmCalls, 1);
  assert.match(market.html, /market-choice selected" data-market-purchase="stun_baton"[^>]*aria-pressed="true"/);

  market.setConfirm(true);
  market.leave();
  assert.equal(market.confirmCalls, 2);
  assert.match(market.html, /phase-result/);
  market.continue();
  market.chooseCard("life_purchase");
  assert.match(market.html, /data-market-purchase="stun_baton"[^>]*aria-pressed="false"/);
  assert.match(market.html, /0 項／總計 0/);
});

test("market checkout prevents a reentrant second submit", async () => {
  const market = await mountInteractiveMarket(openMarketRenderState());
  market.purchase("stun_baton");
  const firstCheckout = market.checkout;
  market.reenterOnNextSave(() => firstCheckout.click());
  firstCheckout.click();

  assert.match(market.html, /phase-result/);
  assert.doesNotMatch(market.html, /只能在城市市場結帳/);
  assert.match(market.html, /一次結帳 1 項/);
});

test("successful market checkout returns to an empty cart through public navigation", async () => {
  const market = await mountInteractiveMarket(openMarketRenderState(100, 1));
  market.purchase("stun_baton");
  market.checkout.click();
  market.continue();
  market.chooseCard("life_purchase");

  assert.match(market.html, /data-market-purchase="stun_baton"[^>]*aria-pressed="false"/);
  assert.match(market.html, /0 項／總計 0/);
});

test("failed market checkout unlocks while preserving the selected line", async () => {
  let state = checkoutMarket(openMarketRenderState(), [{ kind: "purchase", choiceId: "stun_baton" }]);
  state.phase = "activity";
  state.activityKind = "purchase";
  state.player.resource = 100;
  const market = await mountInteractiveMarket(state);
  const staleUpgrade = market.upgrade("weapons", "weapon_stun_baton");
  staleUpgrade.dataset.marketUpgrade = "weapons:weapon_stun_baton:99";
  staleUpgrade.click();
  const originalError = console.error;
  console.error = () => {};
  try { market.checkout.click(); } finally { console.error = originalError; }

  assert.match(market.html, /phase-activity/);
  assert.match(market.html, /market-upgrade selected" data-market-upgrade="weapons:weapon_stun_baton:0"[^>]*aria-pressed="true"/);
  assert.match(market.html, /data-market-checkout\s*>/);
});

test("new game clears the cart before a public market re-entry", async () => {
  const market = await mountInteractiveMarket(openMarketRenderState());
  market.purchase("stun_baton");
  market.startNew(2);
  market.chooseCard("life_purchase");
  assert.match(market.html, /data-market-purchase="stun_baton"[^>]*aria-pressed="false"/);
  assert.match(market.html, /0 項／總計 0/);
});

test("loading a save clears the cart before a public market re-entry", async () => {
  const market = await mountInteractiveMarket(openMarketRenderState());
  market.purchase("stun_baton");
  market.load(marketOpeningCardsState());
  market.chooseCard("life_purchase");
  assert.match(market.html, /data-market-purchase="stun_baton"[^>]*aria-pressed="false"/);
  assert.match(market.html, /0 項／總計 0/);
});

test("title modifier entry clears the cart before a public market re-entry", async () => {
  const market = await mountInteractiveMarket(openMarketRenderState());
  market.purchase("stun_baton");
  market.openTitleModifier(2);
  market.closeModifier();
  market.chooseCard("life_purchase");
  assert.match(market.html, /data-market-purchase="stun_baton"[^>]*aria-pressed="false"/);
  assert.match(market.html, /0 項／總計 0/);
});

test("faction board keeps actionable challenge and capture controls text-only", async () => {
  const html = await renderSavedState(factionBoardState());

  for (const faction of FACTIONS) {
    assert.doesNotMatch(html, new RegExp(choiceArt(`faction:${faction.id}`, "challenge", "battle").src));
  }
  for (const territory of TERRITORIES) {
    assert.doesNotMatch(html, new RegExp(choiceArt(`territory:${territory.id}`, "capture", "battle").src));
  }
});

test("faction board keeps actionable fortify controls text-only", async () => {
  const state = factionBoardState();
  for (const territory of TERRITORIES) state.territories[territory.id].owner = "player";

  const html = await renderSavedState(state);

  for (const territory of TERRITORIES) {
    assert.doesNotMatch(html, new RegExp(choiceArt(`territory:${territory.id}`, "fortify", "battle").src));
  }
});

test("five-card and battle choices are text-only while enemy intent is visible", async () => {
  const cards = newGame("test", 3);
  cards.candidates = ["signal", "life_leisure", "life_training", "life_social", "life_conflict"];
  cards.deckType = "morning";
  const cardsHtml = await renderSavedState(cards);
  assert.doesNotMatch(cardsHtml, /class="choice-thumb/);

  let battleState = newGame("test", 4);
  battleState.phase = "event";
  battleState.selected = "ambush";
  battleState = resolveChoice(battleState, getEvent("ambush").choices[0].id);
  const battleHtml = await renderSavedState(battleState);
  assert.doesNotMatch(battleHtml, /class="choice-thumb/);
  assert.match(battleHtml, /敵人意圖/);
  assert.match(battleHtml, /data-battle-animation-stage/);
  assert.match(battleHtml, /data-battle-report/);
  assert.match(battleHtml, /data-battle-damage/);
  assert.match(battleHtml, /assets\/images\/animations\/difei\/shoot-ready\.webp/);
  assert.match(battleHtml, /assets\/images\/animations\/difei\/brawl-kick\.webp/);
});

test("finale ending renders its result art and prominent success, failure, and neutral status", async () => {
  let finale = newGame("test", 2);
  finale.phase = "event";
  finale.selected = "ch5_finale";
  finale = resolveChoice(finale, "free");
  assert.equal(finale.phase, "ending");

  for (const [success, label, tone] of [[true, "成功", "success"], [false, "失敗", "failure"], [undefined, "結果", "neutral"]]) {
    const state = structuredClone(finale);
    state.lastResult.success = success;
    const html = await renderSavedState(state);
    assert.match(html, /class="result-art"[^>]+ch5_finale--free\.webp/);
    assert.match(html, new RegExp(`class="result-status ${tone}"[^>]*>${label}<`));
  }
});
