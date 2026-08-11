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
