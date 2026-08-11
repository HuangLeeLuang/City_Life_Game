import test from "node:test";
import assert from "node:assert/strict";

import {
  GameError,
  assistantAdvice,
  battleAction,
  battleSupportSkill,
  confirmDeployment,
  newGame,
  startFactionFight,
  validateSave,
} from "../src/engine.mjs";
import { FACTIONS } from "../src/faction-content.mjs";
import { TEAM_MEMBERS } from "../src/team-content.mjs";

function factionBattle(factionId = "red_tide", seed = 1201) {
  const state = confirmDeployment(newGame("test", seed));
  state.day = 30;
  state.phase = "factionBoard";
  state.selected = "life_conflict";
  state.player.resource = 999;
  state.player.health = 100;
  return startFactionFight(state, factionId);
}

test("每個城市勢力都有專屬戰術、目標、弱點與意圖輪替", () => {
  for (const faction of FACTIONS) {
    assert.ok(faction.battleProfile?.name, `${faction.id} 缺少戰術名稱`);
    assert.ok(faction.battleProfile?.objective, `${faction.id} 缺少戰術目標`);
    assert.ok(["attack", "brawl", "hack"].includes(faction.battleProfile?.weakness));
    assert.ok(faction.battleProfile?.intents.length >= 3);

    const state = factionBattle(faction.id, 1300 + faction.strength);
    assert.equal(state.battle.tactic, faction.battleProfile.name);
    assert.equal(state.battle.objective, faction.battleProfile.objective);
    assert.equal(state.battle.weakness, faction.battleProfile.weakness);
    assert.ok(faction.battleProfile.intents.includes(state.battle.intent));
  }
});

test("戰鬥保存敵我最大戰力與士氣，弱點攻擊能擊潰敵方士氣", () => {
  const state = factionBattle("red_tide", 1401);
  assert.equal(state.battle.enemyMaxHp, state.battle.enemyHp);
  assert.equal(state.battle.playerMaxHp, state.battle.playerHp);
  assert.equal(state.battle.enemyMorale, 100);
  assert.equal(state.battle.playerMorale, state.crew.morale);

  state.battle.enemyHp = 999;
  state.battle.enemyMaxHp = 999;
  state.battle.enemyMorale = 1;
  state.battle.weakness = "brawl";
  const result = battleAction(state, "brawl");
  assert.equal(result.phase, "result");
  assert.equal(result.lastResult.success, true);
  assert.match(result.lastResult.choice, /士氣/);
  assert.match(result.lastResult.summary, /士氣/);
});

test("軍醫支援能救援玩家、進入冷卻，狄菲會在危急時建議使用", () => {
  const state = factionBattle("glass_snakes", 1501);
  state.team.roster.push({ id: "dove", level: 1, recruitedDay: 1, deployableDay: 1, readiness: 100 });
  state.team.active.push("dove");
  state.characterLevels.dove = 1;
  state.battle.playerHp = 18;

  const skill = battleSupportSkill(state);
  assert.equal(skill.id, "field_medic");
  assert.equal(assistantAdvice(state).id, "battle:support");

  const next = battleAction(state, "support");
  assert.ok(next.battle.playerHp > 18);
  assert.equal(next.battle.supportCooldown, 3);
  assert.match(next.battle.message, /白鴿|急救|軍醫/);
  assert.throws(() => battleAction(next, "support"), error => error instanceof GameError && error.code === "TEAM_SKILL_COOLDOWN");

  const afterOneTurn = battleAction(next, "guard");
  assert.equal(afterOneTurn.battle.supportCooldown, 2);
});

test("其他九名核心隊員都能成為職務支援的實際來源", () => {
  const intentByMember = {
    chenglan: "defend",
    steel_jaw: "assault",
    grey_fox: "reinforce",
    ghost: "defend",
    spark: "assault",
    dove: "assault",
    eagle_eye: "reinforce",
    counsel: "disrupt",
    ledger: "disrupt",
  };

  for (const member of TEAM_MEMBERS.filter(item => item.id !== "difei")) {
    const state = factionBattle("red_tide", 1550 + member.unlockDay);
    state.team.roster = [{ id: member.id, level: 1, recruitedDay: 1, deployableDay: 1, readiness: 100 }];
    state.team.active = [member.id];
    state.characterLevels[member.id] = 1;
    state.battle.intent = intentByMember[member.id];
    if (member.id === "dove") state.battle.playerHp = 18;

    const skill = battleSupportSkill(state);
    assert.equal(skill.sourceId, member.id, `${member.name} 未成為支援來源`);
    assert.equal(skill.sourceName, member.name);
    assert.ok(skill.title.length > 0);
    assert.ok(skill.power > 0);
  }
});

test("戰鬥勝負會消耗本次出勤隊員備戰度", () => {
  const state = factionBattle("red_tide", 1601);
  const before = state.team.roster.find(member => member.id === "difei").readiness;
  state.battle.enemyHp = 1;
  const result = battleAction(state, "attack");
  assert.equal(result.phase, "result");
  assert.ok(result.team.roster.find(member => member.id === "difei").readiness < before);
  assert.match(result.lastResult.summary, /備戰度/);
});

test("舊戰鬥存檔會補上士氣、戰術與支援冷卻欄位", () => {
  const legacy = factionBattle("dead_air", 1701);
  for (const key of ["enemyMaxHp", "playerMaxHp", "enemyMorale", "playerMorale", "supportCooldown", "tactic", "objective", "weakness"]) {
    delete legacy.battle[key];
  }
  const loaded = validateSave(legacy);
  assert.equal(loaded.battle.enemyMaxHp, loaded.battle.enemyHp);
  assert.equal(loaded.battle.playerMaxHp, loaded.battle.playerHp);
  assert.equal(loaded.battle.enemyMorale, 100);
  assert.equal(loaded.battle.playerMorale, loaded.crew.morale);
  assert.equal(loaded.battle.supportCooldown, 0);
  assert.equal(loaded.battle.tactic, FACTIONS.find(faction => faction.id === "dead_air").battleProfile.name);
});
