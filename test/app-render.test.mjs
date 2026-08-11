import test from "node:test";
import assert from "node:assert/strict";
import { choiceArt } from "../src/art-content.mjs";
import { beginDeployment, checkoutMarket, confirmDeployment, generateCards, newGame, getEvent, resolveChoice } from "../src/engine.mjs";
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

async function mountInteractiveDeployment(savedState) {
  let html = "";
  let load;
  let loadControl;
  let deploymentTypes = [];
  let deploymentTargets = [];
  let recommendationButton;
  let confirmationButton;
  let acknowledgementButton;
  const storage = new Map([[SAVE_KEY, JSON.stringify(savedState)]]);
  const control = (dataset = {}, value = "", disabled = false, options = [], ariaLabel = "") => {
    const listeners = new Map();
    return {
      dataset,
      value,
      disabled,
      options,
      ariaLabel,
      addEventListener(type, listener) { listeners.set(type, listener); },
      change(next) {
        if (this.disabled) return;
        const option = this.options.find(item => item.value === next);
        if (this.options.length && (!option || option.disabled)) return;
        this.value = next;
        listeners.get("change")?.({ currentTarget: this, target: this });
      },
      click() { if (!this.disabled) listeners.get("click")?.({ currentTarget: this, target: this }); },
    };
  };
  const controls = attribute => {
    const escaped = attribute.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const datasetKey = attribute.replace(/^data-/, "").replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    const selectPattern = new RegExp(`<select\\b([^>]*\\s${escaped}="([^"]*)[^>]*)>([\\s\\S]*?)<\\/select>`, "g");
    const selects = [...html.matchAll(selectPattern)].map(([, attributes, value, optionMarkup]) => {
      const options = [...optionMarkup.matchAll(/<option\b([^>]*)>([^<]*)<\/option>/g)].map(([, optionAttributes]) => ({
        value: optionAttributes.match(/\bvalue="([^"]*)"/)?.[1] || "",
        disabled: /\bdisabled\b/.test(optionAttributes),
      }));
      const selected = optionMarkup.match(/<option\b([^>]*\bselected\b[^>]*)>/)?.[1]?.match(/\bvalue="([^"]*)"/)?.[1] || options[0]?.value || "";
      return control({ [datasetKey]: value }, selected, /\bdisabled\b/.test(attributes), options, attributes.match(/\baria-label="([^"]*)"/)?.[1] || "");
    });
    if (selects.length) return selects;
    return [...html.matchAll(new RegExp(`<button\\b([^>]*\\s${escaped}(?:="([^"]*)")?[^>]*)>`, "g"))]
      .map(([, attributes, value]) => control(value === undefined ? {} : { [datasetKey]: value }, value || "", /\bdisabled\b/.test(attributes)));
  };
  const app = {
    addEventListener() {},
    get innerHTML() { return html; },
    set innerHTML(value) { html = value; },
  };
  const document = {
    querySelector(selector) {
      if (selector === "#app") return app;
      if (selector === ".actions") return { append() {} };
      if (selector === "[data-load]" && html.includes("data-load")) {
        if (!loadControl) {
          loadControl = control();
          const addEventListener = loadControl.addEventListener;
          loadControl.addEventListener = (type, listener) => {
            if (type === "click") load = listener;
            addEventListener.call(loadControl, type, listener);
          };
        }
        return loadControl;
      }
      const match = selector.match(/^\[([^\]]+)\]$/);
      if (!match) return null;
      const item = controls(match[1])[0] || null;
      if (match[1] === "data-deployment-recommend") recommendationButton = item;
      if (match[1] === "data-deployment-confirm") confirmationButton = item;
      if (match[1] === "data-attack-acknowledge") acknowledgementButton = item;
      return item;
    },
    querySelectorAll(selector) {
      const match = selector.match(/^\[([^\]]+)\]$/);
      if (!match) return [];
      const items = controls(match[1]);
      if (match[1] === "data-deployment-type") deploymentTypes = items;
      if (match[1] === "data-deployment-target") deploymentTargets = items;
      return items;
    },
    createElement() { return control(); },
  };
  const localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem(key, value) { storage.set(key, String(value)); },
    removeItem: key => storage.delete(key),
  };

  Object.assign(globalThis, {
    document,
    localStorage,
    location: { protocol: "file:" },
    window: { addEventListener() {} },
    HTMLImageElement: class {},
  });
  await import(`../src/app.mjs?deployment-interaction-test=${importSequence++}`);
  assert.equal(typeof load, "function", "saved game load handler should be registered");
  load();
  return {
    get html() { return html; },
    get savedState() { return JSON.parse(storage.get(SAVE_KEY)); },
    memberControl(memberId) {
      const item = deploymentTypes.find(entry => entry.dataset.deploymentType === memberId);
      assert.ok(item, `missing deployment type control for ${memberId}`);
      return item;
    },
    targetControl(memberId) {
      const item = deploymentTargets.find(entry => entry.dataset.deploymentTarget === memberId);
      assert.ok(item, `missing deployment target control for ${memberId}`);
      return item;
    },
    selectMember(memberId, type) {
      this.memberControl(memberId).change(type);
    },
    selectTarget(memberId, targetId) {
      this.targetControl(memberId).change(targetId);
    },
    recommend() { assert.ok(recommendationButton, "missing recommendation control"); recommendationButton.click(); },
    confirm() { assert.ok(confirmationButton, "missing confirmation control"); confirmationButton.click(); },
    acknowledge() { assert.ok(acknowledgementButton, "missing attack acknowledgement control"); acknowledgementButton.click(); },
  };
}

async function mountInteractiveAutomation(savedState) {
  let html = "";
  let load;
  let nextTimerId = 1;
  const timers = new Map();
  const windowListeners = new Map();
  let renderedControls = new Map();
  let titleStartControl;
  let titleModifierControl;
  const storage = new Map([[SAVE_KEY, JSON.stringify(savedState)]]);
  const control = dataset => {
    const listeners = new Map();
    return {
      dataset,
      addEventListener(type, listener) { listeners.set(type, listener); },
      click() { listeners.get("click")?.({ currentTarget: this, target: this }); },
    };
  };
  const selectorControl = selector => {
    const attribute = selector.match(/^\[([^\]]+)\]$/)?.[1];
    if (!attribute || !new RegExp(`\\b${attribute}(?:=|\\s|>)`).test(html)) return null;
    if (renderedControls.has(attribute)) return renderedControls.get(attribute);
    const datasetKey = attribute.replace(/^data-/, "").replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    const item = control({ [datasetKey]: "" });
    renderedControls.set(attribute, item);
    return item;
  };
  const app = {
    addEventListener() {},
    get innerHTML() { return html; },
    set innerHTML(value) { html = value; renderedControls = new Map(); },
  };
  const document = {
    querySelector(selector) {
      if (selector === "#app") return app;
      if (selector === ".actions") return { append(control) { titleModifierControl = control; } };
      if (selector === "[data-card-editor]" && html.includes("data-card-editor")) return { elements: {}, addEventListener() {} };
      if (selector === "[data-start]" && html.includes("data-start")) {
        titleStartControl ??= selectorControl(selector);
        return titleStartControl;
      }
      if (selector === "[data-load]" && html.includes("data-load")) {
        const item = control({});
        const addEventListener = item.addEventListener;
        item.addEventListener = (type, listener) => {
          if (type === "click") load = listener;
          addEventListener.call(item, type, listener);
        };
        return item;
      }
      return selectorControl(selector);
    },
    querySelectorAll() { return []; },
    createElement() { return control({}); },
  };
  const localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem(key, value) { storage.set(key, String(value)); },
    removeItem(key) { storage.delete(key); },
  };
  const fakeSetTimeout = callback => {
    const id = nextTimerId++;
    timers.set(id, callback);
    return id;
  };
  const fakeClearTimeout = id => timers.delete(id);
  Object.assign(globalThis, {
    document,
    localStorage,
    location: { protocol: "file:" },
    window: { addEventListener(type, listener) { windowListeners.set(type, listener); } },
    HTMLImageElement: class {},
    setTimeout: fakeSetTimeout,
    clearTimeout: fakeClearTimeout,
  });
  await import(`../src/app.mjs?automation-interaction-test=${importSequence++}`);
  assert.equal(typeof load, "function", "saved game load handler should be registered");
  load();
  const click = attribute => {
    const item = document.querySelector(`[${attribute}]`);
    assert.ok(item, `missing ${attribute} control`);
    item.click();
  };
  return {
    get html() { return html; },
    get savedState() { return JSON.parse(storage.get(SAVE_KEY)); },
    get timerCount() { return timers.size; },
    click,
    async tick() {
      const [id, callback] = timers.entries().next().value || [];
      assert.ok(callback, "expected one scheduled automation step");
      timers.delete(id);
      callback();
      await Promise.resolve();
      await Promise.resolve();
    },
    async ticks(count) { for (let index = 0; index < count; index += 1) await this.tick(); },
    raiseGlobalError() { windowListeners.get("error")?.(new Error("test global error")); },
    replaceSave(next) { storage.set(SAVE_KEY, JSON.stringify(next)); load(); },
    startNew() { assert.ok(titleStartControl, "missing title start control"); titleStartControl.click(); },
    openTitleModifier() { assert.ok(titleModifierControl, "missing title modifier control"); titleModifierControl.click(); },
  };
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
  let deploymentConfirmButton;
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
      if (selector === "[data-deployment-confirm]") return deploymentConfirmButton = bareButton("data-deployment-confirm");
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
    get savedState() { return JSON.parse(storage.get(SAVE_KEY)); },
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
    confirmDeployment() { assert.ok(deploymentConfirmButton, "missing deployment confirmation control"); deploymentConfirmButton.click(); },
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

function deploymentResultCardsState() {
  const state = newGame("test", 41);
  state.team.deployment.assignments = { difei: { type: "earn", targetId: null } };
  const confirmed = confirmDeployment(state);
  confirmed.stage = 2;
  confirmed.phase = "cards";
  confirmed.deckType = "night";
  confirmed.candidates = ["night_shelter"];
  return confirmed;
}

test("deployment view shows roster readiness, assignments, and a sticky morning confirmation", async () => {
  const html = await renderSavedState(newGame("test", 40));

  assert.match(html, /data-deployment-member="difei"/);
  assert.match(html, /備戰度 100\/100/);
  assert.match(html, /data-deployment-type="difei"/);
  assert.match(html, /data-deployment-recommend/);
  assert.match(html, /data-deployment-confirm/);
  assert.match(html, /deployment-controls/);
});

test("confirmed morning cards expose one-day and continuous Difei controls", async () => {
  const html = await renderSavedState(confirmDeployment(newGame("test", 61)));

  assert.match(html, /data-auto-day/);
  assert.match(html, /data-auto-continuous/);
  assert.match(html, /狄菲/);
});

test("one-day automation completes remaining stages and stops at the next deployment", async () => {
  const game = await mountInteractiveAutomation(confirmDeployment(newGame("test", 62)));

  game.click("data-auto-day");
  await game.ticks(6);

  assert.equal(game.savedState.day, 2);
  assert.equal(game.savedState.phase, "deployment");
  assert.match(game.html, /data-auto-day/);
  assert.equal(game.timerCount, 0);
});

test("continuous automation confirms Difei's draft and advances into a resolved action", async () => {
  const game = await mountInteractiveAutomation(newGame("test", 63));

  game.click("data-auto-continuous");
  await game.ticks(2);

  assert.equal(game.savedState.team.deployment.confirmed, true);
  assert.equal(game.savedState.phase, "result");
  assert.match(game.html, /data-auto-stop/);
  game.click("data-auto-stop");
  await game.tick();
  assert.equal(game.timerCount, 0);
});

test("a stop request waits for the current result boundary", async () => {
  const game = await mountInteractiveAutomation(confirmDeployment(newGame("test", 64)));

  game.click("data-auto-continuous");
  await game.tick();
  assert.equal(game.savedState.phase, "result");
  game.click("data-auto-stop");
  await game.tick();

  assert.equal(game.savedState.phase, "result");
  assert.doesNotMatch(game.html, /data-auto-stop/);
  assert.equal(game.timerCount, 0);
});

test("automation stops immediately while idle on cards or deployment", async () => {
  for (const state of [confirmDeployment(newGame("test", 65)), newGame("test", 66)]) {
    const game = await mountInteractiveAutomation(state);
    game.click("data-auto-continuous");
    game.click("data-auto-stop");

    assert.equal(game.timerCount, 0);
    assert.match(game.html, /data-auto-day/);
  }
});

test("attack alerts, pending automation interruptions, and global errors clear automation timers", async () => {
  const alertState = newGame("test", 67);
  alertState.territories.south_docks.owner = "player";
  alertState.pendingRetaliation = { territoryId: "south_docks", factionId: "red_tide", sinceDay: 1 };
  const alert = await mountInteractiveAutomation(alertState);
  alert.click("data-auto-continuous");
  await alert.tick();
  assert.equal(alert.savedState.phase, "attackAlert");
  assert.equal(alert.timerCount, 0);

  const interruptedState = confirmDeployment(newGame("test", 68));
  interruptedState.pendingRetaliation = { territoryId: "south_docks", factionId: "red_tide", sinceDay: 1 };
  const interrupted = await mountInteractiveAutomation(interruptedState);
  interrupted.click("data-auto-continuous");
  await interrupted.tick();
  assert.equal(interrupted.savedState.phase, "cards");
  assert.equal(interrupted.timerCount, 0);

  const global = await mountInteractiveAutomation(confirmDeployment(newGame("test", 69)));
  global.click("data-auto-continuous");
  global.raiseGlobalError();
  assert.equal(global.timerCount, 0);
  assert.match(global.html, /data-auto-day/);
});

test("automation controls stay visible with live status and deployment team summaries during results", async () => {
  const game = await mountInteractiveAutomation(confirmDeployment(newGame("test", 70)));

  game.click("data-auto-continuous");
  await game.tick();

  assert.match(game.html, /class="automation-running"[^>]*aria-live="polite"/);
  assert.match(game.html, /team-summary/);
});

test("loading a saved game resets the session-only automation mode", async () => {
  const game = await mountInteractiveAutomation(confirmDeployment(newGame("test", 71)));

  game.click("data-auto-continuous");
  assert.equal(game.timerCount, 1);
  assert.match(game.html, /data-auto-stop/);
  game.replaceSave(confirmDeployment(newGame("test", 72)));

  assert.equal(game.timerCount, 0);
  assert.match(game.html, /data-auto-day/);
  assert.doesNotMatch(game.html, /data-auto-stop/);
});

test("the title new-game handler clears a scheduled automation timer", async () => {
  const game = await mountInteractiveAutomation(confirmDeployment(newGame("test", 73)));

  game.click("data-auto-continuous");
  assert.equal(game.timerCount, 1);
  assert.match(game.html, /data-auto-stop/);
  game.startNew();

  assert.equal(game.timerCount, 0);
  assert.doesNotMatch(game.html, /data-auto-stop/);
  assert.match(game.html, /data-deployment-confirm/);
});

test("the title modifier handler clears a scheduled automation timer", async () => {
  const game = await mountInteractiveAutomation(confirmDeployment(newGame("test", 74)));

  game.click("data-auto-continuous");
  assert.equal(game.timerCount, 1);
  assert.match(game.html, /data-auto-stop/);
  game.openTitleModifier();

  assert.equal(game.timerCount, 0);
  assert.doesNotMatch(game.html, /data-auto-stop/);
  assert.match(game.html, /class="panel modifier"/);
});

test("deployment controls update task targets, reserve removal, and Difei recommendations through real change handlers", async () => {
  const state = newGame("test", 42);
  state.assets.industries.push(
    { id: "industry_first", name: "第一產業", dailyIncome: 2 },
    { id: "industry_second", name: "第二產業", dailyIncome: 3 },
  );
  const game = await mountInteractiveDeployment(state);

  game.selectMember("difei", "manage");
  assert.deepEqual(game.savedState.team.deployment.assignments.difei, { type: "manage", targetId: "industry_first" });
  game.selectTarget("difei", "industry_second");
  assert.deepEqual(game.savedState.team.deployment.assignments.difei, { type: "manage", targetId: "industry_second" });
  game.selectMember("difei", "reserve");
  assert.equal("difei" in game.savedState.team.deployment.assignments, false);
  game.recommend();
  assert.ok(game.savedState.team.deployment.assignments.difei, "Difei should restore a valid recommendation");
  assert.equal(game.savedState.team.deployment.source, "difei");
});

test("deployment controls accept only rendered enabled options and name each member's target", async () => {
  const state = newGame("test", 46);
  state.assets.industries.push(
    { id: "industry_first", name: "第一產業", dailyIncome: 2 },
    { id: "industry_second", name: "第二產業", dailyIncome: 3 },
  );
  state.territories.south_docks.owner = "player";
  state.territories.fish_market.owner = "player";
  const game = await mountInteractiveDeployment(state);

  const taskOptions = game.memberControl("difei").options;
  assert.equal(taskOptions.find(option => option.value === "manage").disabled, false);
  assert.equal(taskOptions.find(option => option.value === "defend").disabled, false);

  game.selectMember("difei", "manage");
  const industryTarget = game.targetControl("difei");
  assert.equal(industryTarget.ariaLabel, "狄菲的產業目標");
  assert.deepEqual(industryTarget.options.map(option => option.value), ["industry_first", "industry_second"]);
  game.selectTarget("difei", "industry_second");
  assert.deepEqual(game.savedState.team.deployment.assignments.difei, { type: "manage", targetId: "industry_second" });

  game.selectMember("difei", "defend");
  const defenseTarget = game.targetControl("difei");
  assert.equal(defenseTarget.ariaLabel, "狄菲的防守地盤");
  assert.deepEqual(defenseTarget.options.map(option => option.value), ["south_docks", "fish_market"]);
  game.selectTarget("difei", "fish_market");
  assert.deepEqual(game.savedState.team.deployment.assignments.difei, { type: "defend", targetId: "fish_market" });

  const noTargets = await mountInteractiveDeployment(newGame("test", 47));
  const unavailableTaskOptions = noTargets.memberControl("difei").options;
  assert.equal(unavailableTaskOptions.find(option => option.value === "manage").disabled, true);
  assert.equal(unavailableTaskOptions.find(option => option.value === "defend").disabled, true);
  const beforeInvalidChanges = structuredClone(noTargets.savedState.team.deployment.assignments);
  noTargets.selectMember("difei", "manage");
  noTargets.selectMember("difei", "defend");
  assert.deepEqual(noTargets.savedState.team.deployment.assignments, beforeInvalidChanges);

  const exhausted = newGame("test", 48);
  exhausted.team.roster.push({ id: "steel_jaw", level: 1, recruitedDay: 1, deployableDay: 1, readiness: 10 });
  const exhaustedGame = await mountInteractiveDeployment(exhausted);
  assert.equal(exhaustedGame.memberControl("steel_jaw").disabled, true);
  const beforeExhaustedChange = structuredClone(exhaustedGame.savedState.team.deployment.assignments);
  exhaustedGame.selectMember("steel_jaw", "earn");
  assert.deepEqual(exhaustedGame.savedState.team.deployment.assignments, beforeExhaustedChange);
});

test("deployment confirmation enters cards while a pending attack blocks cards until acknowledgement starts battle", async () => {
  const normal = await mountInteractiveDeployment(newGame("test", 43));
  normal.confirm();
  assert.equal(normal.savedState.phase, "cards");

  const threatened = newGame("test", 44);
  threatened.territories.south_docks.owner = "player";
  threatened.pendingRetaliation = { territoryId: "south_docks", factionId: "red_tide", sinceDay: 1 };
  const alert = await mountInteractiveDeployment(beginDeployment(threatened));
  alert.confirm();
  assert.equal(alert.savedState.phase, "attackAlert");
  assert.match(alert.html, /遭遇敵方反攻/);
  assert.match(alert.html, /data-attack-acknowledge/);
  assert.doesNotMatch(alert.html, /data-card=/);
  alert.acknowledge();
  assert.equal(alert.savedState.phase, "battle");
});

test("team board has no mid-day active toggle controls", async () => {
  const state = generateCards(newGame("test", 45));
  state.phase = "factionBoard";
  const html = await renderSavedState(state);

  assert.doesNotMatch(html, /data-team-toggle=/);
  assert.match(html, /每日派遣/);
});

test("commit persists a settled deployment result exactly once", async () => {
  const game = await mountInteractiveMarket(deploymentResultCardsState());

  game.chooseCard("night_shelter");

  assert.deepEqual(game.savedState.team.deployment.settledStages, [2]);
  assert.equal(game.savedState.team.roster.find(member => member.id === "difei").readiness, 96);
});

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
  market.confirmDeployment();
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
  market.confirmDeployment();
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
  assert.match(battleHtml, /data-battle-tactic/);
  assert.match(battleHtml, /data-battle-enemy-morale/);
  assert.match(battleHtml, /data-battle-player-morale/);
  assert.match(battleHtml, /data-battle-team-skill/);
  assert.match(battleHtml, /戰術目標/);
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
