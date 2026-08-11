import test from "node:test";
import assert from "node:assert/strict";
import {
  GameError,
  beginDeployment,
  confirmDeployment,
  newGame,
  recommendDeployment,
  recruitTeamMember,
  finalizeStageResult,
  settleDeploymentStage,
  teamBonuses,
  continueStage,
  updateDeploymentAssignment,
  validateDeployment,
} from "../src/engine.mjs";

function recruitMembersForDeployment(state, memberIds) {
  let next = state;
  next.day = 20;
  next.player.resource = 999;
  for (const memberId of memberIds) {
    next.phase = "factionBoard";
    next.selected = "life_conflict";
    next = recruitTeamMember(next, memberId);
  }
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
  assert.deepEqual(state.team.deployment.trainingProgress, {});
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
