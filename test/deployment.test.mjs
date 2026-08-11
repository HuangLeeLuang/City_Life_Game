import test from "node:test";
import assert from "node:assert/strict";
import {
  GameError,
  acknowledgeAttack,
  beginDeployment,
  confirmDeployment,
  generateCards,
  newGame,
  recommendDeployment,
  recruitTeamMember,
  finalizeStageResult,
  settleDeploymentStage,
  teamBonuses,
  toggleTeamMember,
  continueStage,
  updateDeploymentAssignment,
  validateDeployment,
  validateSave,
} from "../src/engine.mjs";
import { territoryById } from "../src/faction-content.mjs?v=24";

function recruitMembersForDeployment(state, memberIds) {
  let next = state;
  next.day = 20;
  next.player.resource = 999;
  for (const memberId of memberIds) {
    next.phase = "factionBoard";
    next.selected = "life_conflict";
    next = recruitTeamMember(next, memberId);
  }
  next.day += 1;
  return beginDeployment(next);
}

test("a new game begins with a Difei deployment draft", () => {
  const state = newGame("test", 21);

  assert.equal(state.phase, "deployment");
  assert.equal(state.team.roster[0].readiness, 100);
  assert.equal(state.team.roster[0].deployableDay, 1);
  assert.equal(state.team.deployment.day, 1);
  assert.equal(state.team.deployment.confirmed, false);
  assert.equal(state.team.deployment.source, "difei");
  assert.deepEqual(Object.keys(state.team.deployment.assignments), ["difei"]);
});

test("Difei excludes exhausted members and prioritizes a pending defense", () => {
  const state = newGame("test", 22);
  state.team.roster.push(
    { id: "steel_jaw", level: 1, recruitedDay: 1, readiness: 10 },
    { id: "grey_fox", level: 1, recruitedDay: 1, readiness: 90 },
  );
  state.territories.south_docks.owner = "player";
  state.pendingRetaliation = { territoryId: "south_docks", factionId: "red_tide", sinceDay: 1 };

  const recommendation = recommendDeployment(state);

  assert.equal("steel_jaw" in recommendation, false);
  assert.deepEqual(recommendation.grey_fox, { type: "defend", targetId: "south_docks" });
});

test("deployment assignments reject unavailable members and invalid shared targets", () => {
  const state = newGame("test", 23);

  assert.throws(
    () => validateDeployment(state, { steel_jaw: { type: "earn", targetId: null } }),
    error => error instanceof GameError && error.code === "TEAM_MEMBER_NOT_RECRUITED",
  );
  assert.throws(
    () => updateDeploymentAssignment(state, "difei", { type: "defend", targetId: "south_docks" }),
    error => error instanceof GameError && error.code === "UNKNOWN_TERRITORY",
  );
});

test("a player edit is validated and confirmation snapshots readiness before cards", () => {
  const draft = newGame("test", 24);
  const edited = updateDeploymentAssignment(draft, "difei", { type: "rest", targetId: null });
  const confirmed = confirmDeployment(edited);

  assert.equal(edited.team.deployment.source, "player-edited");
  assert.deepEqual(confirmed.team.active, ["difei"]);
  assert.equal(confirmed.team.deployment.confirmed, true);
  assert.equal(confirmed.team.deployment.readinessMultipliers.difei, 1);
  assert.equal(confirmed.phase, "cards");
  assert.equal(draft.phase, "deployment");
  assert.equal(draft.team.deployment.confirmed, false);
});

test("confirming a pending retaliation enters its alert instead of drawing cards", () => {
  const state = beginDeployment(newGame("test", 25));
  state.territories.south_docks.owner = "player";
  state.pendingRetaliation = { territoryId: "south_docks", factionId: "red_tide", sinceDay: 1 };
  const confirmed = confirmDeployment(state);

  assert.equal(confirmed.phase, "attackAlert");
  assert.deepEqual(confirmed.candidates, []);
});

test("unavailable assignments return TEAM_MEMBER_NOT_READY without mutating the draft", () => {
  const draft = newGame("test", 26);
  draft.team.roster[0].deployableDay = 2;
  const before = structuredClone(draft);

  assert.throws(
    () => updateDeploymentAssignment(draft, "difei", { type: "earn", targetId: null }),
    error => error instanceof GameError && error.code === "TEAM_MEMBER_NOT_READY",
  );
  assert.deepEqual(draft, before);
});

test("validation rejects exhausted assignments with MEMBER_EXHAUSTED without mutating its input", () => {
  const draft = newGame("test", 27);
  draft.team.roster[0].readiness = 19;
  const assignments = { difei: { type: "earn", targetId: null } };
  const before = structuredClone(draft);

  assert.throws(
    () => validateDeployment(draft, assignments),
    error => error instanceof GameError && error.code === "MEMBER_EXHAUSTED",
  );
  assert.deepEqual(draft, before);
});

test("confirmation rejects exhausted assignments with MEMBER_EXHAUSTED without mutating the draft", () => {
  const draft = newGame("test", 28);
  draft.team.roster[0].readiness = 19;
  const before = structuredClone(draft);

  assert.throws(
    () => confirmDeployment(draft),
    error => error instanceof GameError && error.code === "MEMBER_EXHAUSTED",
  );
  assert.deepEqual(draft, before);
});

test("more than five recruited assignments return TEAM_LIMIT", () => {
  const draft = recruitMembersForDeployment(newGame("test", 29), ["steel_jaw", "grey_fox", "ghost", "spark", "dove"]);
  const assignments = Object.fromEntries(draft.team.roster.map(member => [member.id, { type: "earn", targetId: null }]));

  assert.throws(
    () => validateDeployment(draft, assignments),
    error => error instanceof GameError && error.code === "TEAM_LIMIT",
  );
});

test("four recruited members on one owned defense return SHARED_TASK_LIMIT", () => {
  const draft = recruitMembersForDeployment(newGame("test", 30), ["steel_jaw", "grey_fox", "ghost"]);
  draft.territories.south_docks.owner = "player";
  const assignments = Object.fromEntries(draft.team.roster.map(member => [member.id, { type: "defend", targetId: "south_docks" }]));

  assert.throws(
    () => validateDeployment(draft, assignments),
    error => error instanceof GameError && error.code === "SHARED_TASK_LIMIT",
  );
});

test("equivalent same-seed drafts confirm to identical cards and seed", () => {
  const first = confirmDeployment(newGame("test", 31));
  const second = confirmDeployment(newGame("test", 31));

  assert.deepEqual(first.candidates, second.candidates);
  assert.equal(first.seed, second.seed);
  assert.deepEqual(first, second);
});

test("confirmation snapshots 20–39 readiness at a 0.7 multiplier", () => {
  const draft = newGame("test", 32);
  draft.team.roster[0].readiness = 35;
  const confirmed = confirmDeployment(draft);

  assert.equal(confirmed.team.deployment.readinessMultipliers.difei, 0.7);
});

test("deployment settlement is idempotent and changes readiness once", () => {
  let state = newGame("test", 30);
  state.team.deployment.assignments = { difei: { type: "earn", targetId: null } };
  state = confirmDeployment(state);

  const once = settleDeploymentStage(state);
  const twice = settleDeploymentStage(once);

  assert.deepEqual(twice, once);
  assert.equal(once.team.roster.find(member => member.id === "difei").readiness, 96);
  assert.deepEqual(once.team.deployment.settledStages, [0]);
});

test("low-readiness deployed members provide seventy percent bonuses", () => {
  const state = newGame("test", 31);
  state.team.roster[0].readiness = 30;
  state.team.active = ["difei"];

  assert.equal(teamBonuses(state).brawl, 3);
  assert.equal(teamBonuses(state).hp, 4);
});

test("shared assignments accumulate stable 100, 60, and 35 percent contributions", () => {
  let state = staffedDeploymentState();
  state.team.deployment.assignments = {
    difei: { type: "defend", targetId: "south_docks" },
    steel_jaw: { type: "defend", targetId: "south_docks" },
    grey_fox: { type: "defend", targetId: "south_docks" },
  };

  state = settleDeploymentStage(state);

  assert.equal(state.team.deployment.defenseStrength.south_docks, 0.65);
});

test("stage-two training rolls in sorted member order and clears at day turnover", () => {
  let state = staffedDeploymentState();
  state.team.deployment.assignments = {
    steel_jaw: { type: "train", targetId: null },
    grey_fox: { type: "train", targetId: null },
  };
  state.team.active = ["steel_jaw", "grey_fox"];
  state.team.deployment.readinessMultipliers = { steel_jaw: 1, grey_fox: 1 };

  state = settleDeploymentStage(state);
  state.stage = 1;
  state = settleDeploymentStage(state);
  state.stage = 2;
  state.seed = 18;
  state = settleDeploymentStage(state);

  assert.equal(state.characterLevels.grey_fox, 2);
  assert.equal(state.characterLevels.steel_jaw, 1);
  assert.deepEqual(state.team.deployment.trainingProgress, { steel_jaw: 3, grey_fox: 3 });

  state.phase = "result";
  state = continueStage(state);
  assert.equal(state.day, 2);
  assert.deepEqual(state.team.deployment.trainingProgress, {});
  assert.deepEqual(state.team.deployment.settledStages, []);
});

test("finalizeStageResult settles result phases and leaves non-results unchanged", () => {
  let state = newGame("test", 33);
  state = confirmDeployment(state);
  state.phase = "result";
  const settled = finalizeStageResult(state);
  const cards = { ...state, phase: "cards" };

  assert.deepEqual(settled.team.deployment.settledStages, [0]);
  assert.strictEqual(finalizeStageResult(cards), cards);
});

test("day-end industry income keeps the confirmed readiness snapshot", () => {
  const finishDay = () => {
    const draft = newGame("test", 34);
    draft.cityStatus = "quiet_day";
    draft.team.roster.push({ id: "ledger", level: 1, recruitedDay: 0, deployableDay: 1, readiness: 30 });
    draft.assets.industries.push({ id: "industry_bay_diner", dailyIncome: 10 });
    draft.team.deployment.assignments = { ledger: { type: "earn", targetId: null } };
    let state = confirmDeployment(draft);
    for (let stage = 0; stage < 3; stage++) {
      state.phase = "result";
      state = continueStage(state);
    }
    return state;
  };

  const first = finishDay();
  const second = finishDay();

  assert.equal(first.day, 2);
  assert.equal(first.team.roster.find(member => member.id === "ledger").readiness, 18);
  assert.deepEqual(first.lastSettlement, { industryIncome: 13, businessBonus: 3, turfIncome: 0, vehicleMaintenance: 0, day: 1 });
  assert.equal(first.player.resource, 43);
  assert.deepEqual(first, second);
});

test("idle roster members recover readiness during a settled stage", () => {
  const draft = newGame("test", 35);
  draft.team.roster.push({ id: "ledger", level: 1, recruitedDay: 0, deployableDay: 1, readiness: 70 });
  draft.team.deployment.assignments = { difei: { type: "earn", targetId: null } };
  const settled = settleDeploymentStage(confirmDeployment(draft));

  assert.equal(settled.team.roster.find(member => member.id === "ledger").readiness, 78);
  assert.equal(settled.team.roster.find(member => member.id === "difei").readiness, 96);
  assert.deepEqual(settled.team.deployment.settledStages, [0]);
});

test("rest assignments recover readiness without generating a work result", () => {
  const draft = newGame("test", 36);
  draft.team.roster[0].readiness = 50;
  draft.team.deployment.assignments = { difei: { type: "rest", targetId: null } };
  const settled = settleDeploymentStage(confirmDeployment(draft));

  assert.equal(settled.team.roster[0].readiness, 62);
  assert.equal(settled.player.resource, 24);
  assert.deepEqual(settled.lastResult.teamSummary, []);
});

test("manage assignments add readiness-scaled industry efficiency to the settled result", () => {
  const draft = newGame("test", 37);
  draft.team.roster.push({ id: "ledger", level: 1, recruitedDay: 0, deployableDay: 1, readiness: 100 });
  draft.assets.industries.push({ id: "industry_bay_diner", dailyIncome: 10 });
  draft.team.deployment.assignments = { ledger: { type: "manage", targetId: "industry_bay_diner" } };
  const settled = settleDeploymentStage(confirmDeployment(draft));

  assert.equal(settled.team.deployment.industryEfficiency.industry_bay_diner, 10 / 3);
  assert.equal(settled.team.roster.find(member => member.id === "ledger").readiness, 96);
  assert.deepEqual(settled.lastResult.teamSummary, []);
});

test("night completion applies industry efficiency before entering the next deployment", () => {
  const draft = newGame("test", 38);
  draft.cityStatus = "quiet_day";
  draft.assets.industries.push({ id: "industry_test", name: "測試產業", dailyIncome: 30, level: 0, basePrice: 20, bonuses: {} });
  draft.team.deployment.assignments = { difei: { type: "manage", targetId: "industry_test" } };
  let state = confirmDeployment(draft);
  state.stage = 2;
  state.phase = "result";

  state = continueStage(state);

  assert.equal(state.day, 2);
  assert.equal(state.stage, 0);
  assert.equal(state.phase, "deployment");
  assert.equal(state.lastSettlement.day, 1);
  assert.equal(state.lastSettlement.industryIncome, 32);
  assert.equal(state.team.deployment.day, 2);
  assert.equal(state.team.deployment.confirmed, false);
});

test("a pending retaliation becomes a defense battle only after deployment confirmation", () => {
  const draft = newGame("test", 39);
  draft.territories.south_docks.owner = "player";
  draft.pendingRetaliation = { territoryId: "south_docks", factionId: "red_tide", sinceDay: 1 };

  const alert = confirmDeployment(beginDeployment(draft));
  const battle = acknowledgeAttack(alert);

  assert.equal(alert.phase, "attackAlert");
  assert.equal(battle.phase, "battle");
  assert.equal(battle.battle.battleType, "defend");
  assert.equal(battle.battle.territoryId, "south_docks");
});

test("a confirmed defender immediately lowers pending retaliation HP without a settled defense record", () => {
  const draft = assignment => {
    const state = newGame("test", 44);
    state.territories.south_docks.owner = "player";
    state.pendingRetaliation = { territoryId: "south_docks", factionId: "red_tide", sinceDay: 1 };
    return updateDeploymentAssignment(beginDeployment(state), "difei", assignment);
  };
  const plainBattle = acknowledgeAttack(confirmDeployment(draft({ type: "earn", targetId: null })));
  const defendedAlert = confirmDeployment(draft({ type: "defend", targetId: "south_docks" }));
  const defendedBattle = acknowledgeAttack(defendedAlert);

  assert.deepEqual(defendedAlert.team.deployment.defenseStrength, {});
  assert.equal(plainBattle.battle.enemyHp, 68);
  assert.equal(defendedBattle.battle.enemyHp, 66);
});

test("three confirmed defenders preserve the 42 HP floor without injected defense strength", () => {
  let draft = recruitMembersForDeployment(newGame("test", 45), ["steel_jaw", "ghost"]);
  draft.territories.south_docks.owner = "player";
  draft.pendingRetaliation = { territoryId: "south_docks", factionId: "red_tide", sinceDay: draft.day };
  for (const memberId of ["difei", "steel_jaw", "ghost"]) {
    draft = updateDeploymentAssignment(draft, memberId, { type: "defend", targetId: "south_docks" });
  }
  const territory = territoryById("south_docks");
  const originalHp = territory.enemyHp;
  territory.enemyHp = 36;
  try {
    const battle = acknowledgeAttack(confirmDeployment(draft));
    assert.deepEqual(battle.team.deployment.defenseStrength, {});
    assert.equal(battle.battle.enemyHp, 42);
  } finally {
    territory.enemyHp = originalHp;
  }
});

test("an already settled defense stage is not counted again when the attack is acknowledged", () => {
  const state = newGame("test", 46);
  state.territories.south_docks.owner = "player";
  state.pendingRetaliation = { territoryId: "south_docks", factionId: "red_tide", sinceDay: 1 };
  const alert = confirmDeployment(updateDeploymentAssignment(beginDeployment(state), "difei", { type: "defend", targetId: "south_docks" }));
  const settledAlert = settleDeploymentStage(alert);
  const battle = acknowledgeAttack(settledAlert);

  assert.equal(settledAlert.team.deployment.defenseStrength.south_docks, 0.3333333333);
  assert.equal(battle.battle.enemyHp, 66);
});

test("defense strength weights retaliation targets, lowers defense HP, and rewards morale when no attack comes", () => {
  let weightedTargetChanged = false;
  for (let seed = 1; seed <= 500; seed += 1) {
    const baseline = newGame("test", seed);
    baseline.phase = "result";
    baseline.stage = 2;
    baseline.territories.south_docks.owner = "player";
    baseline.territories.fish_market.owner = "player";
    const defended = structuredClone(baseline);
    defended.team.deployment.defenseStrength = { south_docks: 2 };
    const plainNext = continueStage(baseline);
    const defendedNext = continueStage(defended);
    if (plainNext.pendingRetaliation && defendedNext.pendingRetaliation && plainNext.pendingRetaliation.territoryId !== defendedNext.pendingRetaliation.territoryId) {
      weightedTargetChanged = true;
      break;
    }
  }
  const alert = newGame("test", 40);
  alert.territories.south_docks.owner = "player";
  alert.pendingRetaliation = { territoryId: "south_docks", factionId: "red_tide", sinceDay: 1 };
  alert.team.deployment.defenseStrength = { south_docks: 2 };
  const baseline = structuredClone(alert);
  baseline.team.deployment.defenseStrength = {};
  const defendedBattle = acknowledgeAttack(confirmDeployment(alert));
  const baselineBattle = acknowledgeAttack(confirmDeployment(baseline));
  const morale = newGame("test", 41);
  morale.phase = "result";
  morale.stage = 2;
  morale.crew.morale = 50;
  morale.team.deployment.defenseStrength = { south_docks: 1, fish_market: 1 };
  const settledMorale = continueStage(morale);

  assert.equal(weightedTargetChanged, true);
  assert.ok(defendedBattle.battle.enemyHp < baselineBattle.battle.enemyHp);
  assert.equal(settledMorale.crew.morale, 52);
});

test("version-two saves gain deployment readiness without changing their current phase", () => {
  const legacy = generateCards(newGame("test", 42));
  legacy.phase = "cards";
  delete legacy.team.deployment;
  delete legacy.team.roster[0].readiness;
  delete legacy.team.roster[0].deployableDay;

  const loaded = validateSave(legacy);

  assert.equal(loaded.phase, "cards");
  assert.equal(loaded.team.roster[0].readiness, 100);
  assert.equal(loaded.team.roster[0].deployableDay, loaded.day);
  assert.equal(loaded.team.deployment.day, loaded.day);
  assert.equal(loaded.team.deployment.confirmed, false);
});

test("new recruits wait until the next morning and active toggles stay locked outside deployment", () => {
  let state = newGame("test", 43);
  state.day = 20;
  state.phase = "factionBoard";
  state.selected = "life_conflict";
  state.player.resource = 999;
  state = recruitTeamMember(state, "steel_jaw");
  const recruit = state.team.roster.find(member => member.id === "steel_jaw");
  const sameDayDraft = beginDeployment(state);

  assert.equal(recruit.readiness, 100);
  assert.equal(recruit.deployableDay, 21);
  assert.equal(sameDayDraft.team.active.includes("steel_jaw"), false);
  assert.throws(
    () => updateDeploymentAssignment(sameDayDraft, "steel_jaw", { type: "earn", targetId: null }),
    error => error instanceof GameError && error.code === "TEAM_MEMBER_NOT_READY",
  );
  assert.throws(
    () => toggleTeamMember({ ...state, phase: "factionBoard", selected: "life_conflict" }, "difei"),
    error => error instanceof GameError && error.code === "WRONG_PHASE",
  );
  const nextDayDraft = beginDeployment({ ...state, day: 21 });
  assert.doesNotThrow(() => updateDeploymentAssignment(nextDayDraft, "steel_jaw", { type: "earn", targetId: null }));
});

function staffedDeploymentState() {
  const state = newGame("test", 32);
  state.team.roster.push(
    { id: "steel_jaw", level: 1, recruitedDay: 0, deployableDay: 1, readiness: 100 },
    { id: "grey_fox", level: 1, recruitedDay: 0, deployableDay: 1, readiness: 100 },
  );
  state.territories.south_docks.owner = "player";
  state.team.deployment.assignments = {
    difei: { type: "earn", targetId: null },
    steel_jaw: { type: "earn", targetId: null },
    grey_fox: { type: "earn", targetId: null },
  };
  return confirmDeployment(state);
}
