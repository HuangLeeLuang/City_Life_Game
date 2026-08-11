import test from "node:test";
import assert from "node:assert/strict";
import {
  GameError,
  autoOperationChoice,
  confirmDeployment,
  continueStage,
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

test("只有禁止的勾選會被正規化為安全回退，而非採用任何禁止動作", () => {
  const state = cards(59);
  state.player.resource = 0;
  state.player.fatigue = 50;
  const prohibited = [
    "main:signal",
    "sidequest:continue",
    "purchase:asset_market",
    "social:mira",
    "conflict:south_docks",
    "battle:attack",
  ];

  assert.deepEqual(autoOperationChoice(state, prohibited), {
    id: "recover:leisure_free_rest", kind: "leisure", optionId: "leisure_free_rest",
  });
  assert.deepEqual(autoOperationChoice(state, prohibited), autoOperationChoice(state, []));
});

test("自動訓練透過既有直接解析器保留結果中繼資料與階段邊界", () => {
  const state = cards(71);
  const before = structuredClone(state);

  const result = resolveAutoOperation(state, ["train:train_reflex"]);

  assert.equal(result.phase, "result");
  assert.equal(result.selected, "life_training");
  assert.equal(result.flags.assistantActionPending, true);
  assert.deepEqual(result.lastResult, {
    title: "進行訓練",
    choice: "訓練槍法",
    success: true,
    summary: "彈著逐漸集中，扣扳機時的呼吸也重新穩定。",
    artKey: "activity-training-train_reflex--train_reflex",
  });
  assert.equal(result.player.resource, 19);
  assert.equal(result.player.fatigue, 16);
  assert.equal(result.player.stress, 5);
  assert.equal(result.player.abilities.reflex, 31);
  assert.ok(result.player.resource >= 0);
  assert.equal(result.day, before.day);
  assert.equal(result.stage, before.stage);
  assert.deepEqual(result.seen, before.seen);
  assert.equal(result.activeSideQuest, before.activeSideQuest);
  assert.equal(result.battle, before.battle);
});

test("自動恢復透過既有直接解析器保留結果中繼資料與非負現金", () => {
  const state = cards(71);
  const before = structuredClone(state);

  const result = resolveAutoOperation(state, ["recover:leisure_free_rest"]);

  assert.equal(result.phase, "result");
  assert.equal(result.selected, "life_leisure");
  assert.equal(result.flags.assistantActionPending, true);
  assert.deepEqual(result.lastResult, {
    title: "處理日常需求",
    choice: "找地方短暫午休",
    success: true,
    summary: "你關掉手機短暫補眠，讓身體撐過下午，真正的完整休息仍要等到晚上。",
    artKey: "activity-leisure-leisure_free_rest--leisure_free_rest",
  });
  assert.equal(result.player.resource, 24);
  assert.equal(result.player.fatigue, 1);
  assert.equal(result.player.stress, 4);
  assert.equal(result.player.abilities.will, 29);
  assert.deepEqual(result.buffs, [{
    type: "buff.add",
    id: "rested",
    label: "短暫休息",
    ability: "will",
    value: 1,
    duration: 5,
    remaining: 5,
  }]);
  assert.ok(result.player.resource >= 0);
  assert.equal(result.day, before.day);
  assert.equal(result.stage, before.stage);
  assert.deepEqual(result.seen, before.seen);
  assert.equal(result.activeSideQuest, before.activeSideQuest);
  assert.equal(result.battle, before.battle);
});

test("連續安全運作三十天不會進行主支線，敵襲出現時停在人工確認邊界", () => {
  let state = newGame("test", 1801);
  const firstMainline = "signal";

  for (let completedDays = 0; completedDays < 30; completedDays += 1) {
    assert.equal(state.phase, "deployment");
    state = confirmDeployment(state);
    const currentDay = state.day;
    let guard = 0;
    while (state.day === currentDay && guard++ < 12) {
      if (state.phase === "cards") state = resolveAutoOperation(state, ["work:cash", "recover:leisure_free_rest"]);
      else if (state.phase === "result") state = continueStage(state);
      else assert.fail(`第 ${currentDay} 日出現非安全自動階段：${state.phase}`);
    }
    assert.ok(guard < 12, `第 ${currentDay} 日自動運作沒有收斂`);
    assert.ok(state.player.resource >= 0);
    assert.equal(state.seen[firstMainline], undefined);
    assert.equal(state.activeSideQuest, null);
    assert.equal(state.battle, null);
  }

  state.territories.south_docks.owner = "player";
  state.pendingRetaliation = { territoryId: "south_docks", factionId: "red_tide", sinceDay: state.day };
  const alert = confirmDeployment(state);
  assert.equal(alert.phase, "attackAlert");
  assert.equal(alert.battle, null);
  assert.equal(alert.seen[firstMainline], undefined);
  assert.throws(() => resolveAutoOperation(alert, ["work:cash"]), error => error instanceof GameError && error.code === "WRONG_PHASE");
});
