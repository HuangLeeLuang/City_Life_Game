import test from "node:test";
import assert from "node:assert/strict";
import { GameError, newGame, checkoutMarket, quoteMarketCart } from "../src/engine.mjs";

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

test("duplicate market lines are rejected without mutating the complete input state", () => {
  const state = openMarket();
  const duplicate = { kind: "purchase", choiceId: "stun_baton" };
  const before = structuredClone(state);
  assert.throws(() => checkoutMarket(state, [duplicate, duplicate]), error => error.code === "DUPLICATE_MARKET_LINE");
  assert.deepEqual(state, before);
});

test("unknown market lines are rejected without mutating the complete input state", () => {
  const state = openMarket();
  const before = structuredClone(state);
  assert.throws(() => checkoutMarket(state, [{ kind: "purchase", choiceId: "missing" }]), error => error.code === "UNKNOWN_ACTIVITY");
  assert.deepEqual(state, before);
});

test("a known-seed level-one upgrade deterministically fails after charging its cost", () => {
  let state = checkoutMarket(openMarket(), [{ kind: "purchase", choiceId: "stun_baton" }]);
  state.phase = "activity";
  state.activityKind = "purchase";
  state.player.resource = 100;
  state = checkoutMarket(state, [{ kind: "upgrade", category: "weapons", assetId: "weapon_stun_baton", expectedLevel: 0 }]);
  state.phase = "activity";
  state.activityKind = "purchase";
  state.player.resource = 100;
  state.seed = 14336;
  const line = { kind: "upgrade", category: "weapons", assetId: "weapon_stun_baton", expectedLevel: 1 };
  const input = structuredClone(state);
  const first = checkoutMarket(input, [line]);
  const second = checkoutMarket(structuredClone(input), [line]);
  assert.deepEqual(first, second);
  assert.equal(first.seed, 3876014976);
  assert.equal(first.player.resource, 92);
  assert.equal(first.assets.weapons[0].level, 1);
  assert.equal(first.lastResult.marketLines[0].cost, 8);
  assert.equal(first.lastResult.marketLines[0].success, false);
  assert.equal(first.lastResult.marketLines[0].fromLevel, 1);
  assert.equal(first.lastResult.marketLines[0].toLevel, 1);
});

test("new purchases cannot be upgraded in the same transaction without mutating input", () => {
  const state = openMarket();
  const before = structuredClone(state);
  assert.throws(() => checkoutMarket(state, [
    { kind: "purchase", choiceId: "stun_baton" },
    { kind: "upgrade", category: "weapons", assetId: "weapon_stun_baton", expectedLevel: 0 },
  ]), error => error.code === "NEW_ASSET_UPGRADE");
  assert.deepEqual(state, before);
});

test("stale upgrades are rejected without mutating the complete input state", () => {
  let state = checkoutMarket(openMarket(), [{ kind: "purchase", choiceId: "stun_baton" }]);
  state.phase = "activity";
  state.activityKind = "purchase";
  state.player.resource = 100;
  const before = structuredClone(state);
  assert.throws(() => checkoutMarket(state, [
    { kind: "upgrade", category: "weapons", assetId: "weapon_stun_baton", expectedLevel: 1 },
  ]), error => error.code === "STALE_UPGRADE");
  assert.deepEqual(state, before);
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

test("purchase validation takes precedence over conflicting upgrades in either cart order", () => {
  const state = checkoutMarket(openMarket(), [{ kind: "purchase", choiceId: "stun_baton" }]);
  state.phase = "activity";
  state.activityKind = "purchase";
  const before = structuredClone(state);
  const purchase = { kind: "purchase", choiceId: "stun_baton" };
  const staleUpgrade = { kind: "upgrade", category: "weapons", assetId: "weapon_stun_baton", expectedLevel: 99 };

  for (const lines of [[purchase, staleUpgrade], [staleUpgrade, purchase]]) {
    assert.throws(() => checkoutMarket(state, lines), error => error.code === "ASSET_OWNED");
    assert.deepEqual(state, before);
  }
});

test("unknown purchases take precedence over unrelated stale upgrades in either cart order", () => {
  const state = checkoutMarket(openMarket(), [{ kind: "purchase", choiceId: "stun_baton" }]);
  state.phase = "activity";
  state.activityKind = "purchase";
  const before = structuredClone(state);
  const unknownPurchase = { kind: "purchase", choiceId: "not-a-market-choice" };
  const staleUpgrade = { kind: "upgrade", category: "weapons", assetId: "weapon_stun_baton", expectedLevel: 99 };

  for (const lines of [[unknownPurchase, staleUpgrade], [staleUpgrade, unknownPurchase]]) {
    assert.throws(() => checkoutMarket(state, lines), error => error.code === "UNKNOWN_ACTIVITY");
    assert.deepEqual(state, before);
  }
});

test("malformed selected market choices are classified and atomic", () => {
  const malformedChoices = [
    { id: "bad-effects", text: "Bad effects", cost: 1, effects: null },
    { id: "missing-grant", text: "Missing grant", cost: 1, effects: [] },
    { id: "bad-category", text: "Bad category", cost: 1, effects: [{ type: "asset.grant", category: "unknown", assetId: "asset", name: "Asset" }] },
    { id: "missing-asset-id", text: "Missing asset", cost: 1, effects: [{ type: "asset.grant", category: "weapons", assetId: "", name: "Asset" }] },
    { id: "missing-name", text: "Missing name", cost: 1, effects: [{ type: "asset.grant", category: "weapons", assetId: "asset", name: "" }] },
    { id: "negative-cost", text: "Negative cost", cost: -1, effects: [{ type: "asset.grant", category: "weapons", assetId: "asset", name: "Asset" }] },
    { id: "string-cost", text: "String cost", cost: "1", effects: [{ type: "asset.grant", category: "weapons", assetId: "asset", name: "Asset" }] },
  ];

  for (const choice of malformedChoices) {
    const state = openMarket();
    state.cardOverrides.asset_market = { choices: [choice] };
    const before = structuredClone(state);
    assert.throws(
      () => checkoutMarket(state, [{ kind: "purchase", choiceId: choice.id }]),
      error => error instanceof GameError && error.code === "INVALID_MARKET_CHOICE",
      choice.id,
    );
    assert.deepEqual(state, before, choice.id);
  }
});

test("purchase lines report exact clamped applied ability stat and world effects", () => {
  const state = openMarket();
  state.cityStatus = "quiet_day";
  state.cityStatusIndex = 0;
  state.player.abilities.physique = 98;
  state.player.health = 98;
  state.world.security = 98;
  state.cardOverrides.asset_market = {
    choices: [{
      id: "exact-effects",
      text: "Exact effects",
      detail: "Marketing copy must not be the result summary.",
      cost: 10,
      effects: [
        { type: "resource.add", value: -10 },
        { type: "asset.grant", category: "weapons", assetId: "weapon_exact_effects", name: "Exact effects weapon" },
        { type: "ability.add", key: "physique", value: 5 },
        { type: "stat.add", key: "health", value: 7 },
        { type: "world.add", key: "security", value: 4 },
      ],
    }],
  };

  const result = checkoutMarket(state, [{ kind: "purchase", choiceId: "exact-effects" }]);
  assert.deepEqual(result.lastResult.marketLines[0].appliedEffects, [
    { type: "ability.add", key: "physique", requested: 5, adjusted: 5, before: 98, after: 100, delta: 2, clamped: true, label: "體能" },
    { type: "stat.add", key: "health", requested: 7, adjusted: 9, before: 98, after: 100, delta: 2, clamped: true, statusAdjustment: 2, statusName: "平靜的一天", label: "健康" },
    { type: "world.add", key: "security", requested: 4, adjusted: 4, before: 98, after: 100, delta: 2, clamped: true, label: "治安" },
  ]);
  assert.match(result.lastResult.marketLines[0].appliedSummary, /體能 \+2.*健康 \+2.*平靜的一天 \+2.*治安 \+2/);
});
