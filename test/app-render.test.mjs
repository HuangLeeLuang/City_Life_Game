import test from "node:test";
import assert from "node:assert/strict";
import { choiceArt } from "../src/art-content.mjs";
import { newGame, getEvent, resolveChoice } from "../src/engine.mjs";
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

function factionBoardState() {
  const state = newGame("test", 1);
  state.phase = "factionBoard";
  state.selected = "life_conflict";
  state.day = 100;
  state.player.resource = 999;
  state.player.health = 100;
  return state;
}

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
