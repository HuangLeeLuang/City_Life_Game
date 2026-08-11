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

test("checkout rejects distinct choices that grant the same asset without mutating input", () => {
  const state = openMarket();
  state.cardOverrides.asset_market = {
    choices: [
      { id: "first_baton", text: "First baton", detail: "", cost: 10, effects: [
        { type: "resource.add", value: -10 },
        { type: "asset.grant", category: "weapons", assetId: "weapon_test_baton", name: "Test baton" },
      ] },
      { id: "second_baton", text: "Second baton", detail: "", cost: 10, effects: [
        { type: "resource.add", value: -10 },
        { type: "asset.grant", category: "weapons", assetId: "weapon_test_baton", name: "Test baton" },
      ] },
    ],
  };
  const before = structuredClone(state);

  assert.throws(
    () => checkoutMarket(state, [
      { kind: "purchase", choiceId: "first_baton" },
      { kind: "purchase", choiceId: "second_baton" },
    ]),
    error => error.code === "DUPLICATE_MARKET_LINE",
  );
  assert.deepEqual(state, before);
  assert.equal(state.seed, before.seed);
});

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

test("new-asset conflicts are rejected before stale upgrade validation in either cart order", () => {
  const state = checkoutMarket(openMarket(), [{ kind: "purchase", choiceId: "stun_baton" }]);
  state.phase = "activity";
  state.activityKind = "purchase";
  state.cardOverrides.asset_market = {
    choices: [{
      id: "duplicate_asset_id",
      text: "Duplicate asset ID",
      detail: "",
      cost: 10,
      effects: [
        { type: "resource.add", value: -10 },
        { type: "asset.grant", category: "items", assetId: "weapon_stun_baton", name: "Duplicate asset ID" },
      ],
    }],
  };
  const purchase = { kind: "purchase", choiceId: "duplicate_asset_id" };
  const staleUpgrade = { kind: "upgrade", category: "weapons", assetId: "weapon_stun_baton", expectedLevel: 99 };

  for (const lines of [[purchase, staleUpgrade], [staleUpgrade, purchase]]) {
    assert.throws(() => checkoutMarket(state, lines), error => error.code === "NEW_ASSET_UPGRADE");
  }
});
