import test from "node:test";
import assert from "node:assert/strict";
import {
  GameError,
  autoOperationChoice,
  confirmDeployment,
  newGame,
  resolveAutoOperation,
} from "../src/engine.mjs";

const cards = seed => confirmDeployment(newGame("test", seed));

test("自動運作只會選擇已勾選且負擔得起的訓練、恢復或工作", () => {
  const state = cards(51);

  assert.deepEqual(autoOperationChoice(state, ["train:train_reflex"]), {
    id: "train:train_reflex", kind: "training", optionId: "train_reflex",
  });
  assert.deepEqual(autoOperationChoice(state, ["recover:leisure_free_rest"]), {
    id: "recover:leisure_free_rest", kind: "leisure", optionId: "leisure_free_rest",
  });
  assert.deepEqual(autoOperationChoice(state, ["work:cash"]), {
    id: "work:cash", kind: "work", optionId: null,
  });
});

test("自動運作忽略主線、支線、購買、社交、衝突與戰鬥候選卡", () => {
  const state = cards(52);
  state.candidates = ["signal", "life_sidequest", "life_purchase", "life_social", "life_conflict"];

  for (let seed = 0; seed < 20; seed += 1) {
    state.seed = seed;
    const choice = autoOperationChoice(state, ["work:cash"]);
    assert.deepEqual(choice, { id: "work:cash", kind: "work", optionId: null });
  }
});

test("無法負擔的勾選會依狀態安全回退，且現金不會變成負數", () => {
  const exhausted = cards(53);
  exhausted.player.resource = 0;
  exhausted.player.fatigue = 50;
  assert.deepEqual(autoOperationChoice(exhausted, ["train:train_reflex"]), {
    id: "recover:leisure_free_rest", kind: "leisure", optionId: "leisure_free_rest",
  });

  const recovered = resolveAutoOperation(exhausted, ["train:train_reflex"]);
  assert.equal(recovered.phase, "result");
  assert.ok(recovered.player.resource >= 0);
  assert.equal(recovered.selected, "life_leisure");

  const healthy = cards(54);
  healthy.player.resource = 0;
  assert.deepEqual(autoOperationChoice(healthy, ["train:train_reflex"]), {
    id: "work:cash", kind: "work", optionId: null,
  });
});

test("待處理反擊會在任何變更前中斷自動運作", () => {
  const state = cards(55);
  state.pendingRetaliation = { territoryId: "south_docks", factionId: "red_tide", sinceDay: 1 };
  const before = structuredClone(state);

  assert.throws(
    () => resolveAutoOperation(state, ["work:cash"]),
    error => error instanceof GameError && error.code === "AUTOMATION_INTERRUPTED",
  );
  assert.deepEqual(state, before);
});

test("自動運作只接受卡牌階段，並以正確錯誤分類拒絕其他階段", () => {
  const state = newGame("test", 56);

  assert.throws(
    () => autoOperationChoice(state, ["work:cash"]),
    error => error instanceof GameError && error.code === "WRONG_PHASE",
  );
});

test("等價狀態與排序、重複、無效勾選會得到相同的決定", () => {
  const first = cards(57);
  const second = structuredClone(first);
  const selected = ["work:cash", "train:train_reflex", "train:train_reflex", "main:signal", "battle:attack"];

  assert.deepEqual(
    autoOperationChoice(first, selected),
    autoOperationChoice(second, ["train:train_reflex", "work:cash"]),
  );
  assert.deepEqual(
    autoOperationChoice(first, []),
    autoOperationChoice(second, ["not-an-action"]),
  );
});

test("自動解析只走既有直接解析器，不會推進主線或支線", () => {
  const state = cards(58);
  state.candidates = ["signal", "life_sidequest", "life_work"];
  const before = structuredClone(state);

  const result = resolveAutoOperation(state, ["work:cash"]);

  assert.equal(result.phase, "result");
  assert.equal(result.selected, "life_work");
  assert.deepEqual(result.seen, before.seen);
  assert.equal(result.activeSideQuest, before.activeSideQuest);
  assert.equal(result.battle, null);
  assert.equal(result.flags.assistantActionPending, true);
});
