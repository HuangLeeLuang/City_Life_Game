import test from "node:test";
import assert from "node:assert/strict";
import {
  GameError,
  beginDeployment,
  confirmDeployment,
  newGame,
  recommendDeployment,
  updateDeploymentAssignment,
  validateDeployment,
} from "../src/engine.mjs";

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
