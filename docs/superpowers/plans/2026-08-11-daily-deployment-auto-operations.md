# Daily Deployment and Auto Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Difei-led morning deployment phase, readiness-driven team assignments, and safe one-day/continuous player automation that never selects main or side quests.

**Architecture:** Extend the authoritative engine state with readiness and a per-day deployment transaction. Engine functions recommend, validate, confirm, and idempotently settle assignments; `app.mjs` renders a saved deployment draft and runs only a session-local automation controller. Day turnover enters deployment before cards, pending retaliation becomes a post-deployment alert, and every result is persisted at a safe stage boundary.

**Tech Stack:** Browser ES modules, Node.js built-in test runner, esbuild, HTML/CSS, localStorage, deterministic seeded RNG, offline service worker.

## Global Constraints

- Deployment happens once each morning and consumes no morning/afternoon/night action.
- At most five recruited members may deploy; readiness below 20 is illegal and readiness 20–39 yields 70% assignment and team bonuses.
- Shared industry/territory targets allow at most three members with 100%/60%/35% contributions.
- Mainline and side-quest choices are never selected by automation.
- Pending enemy attacks stop automation, require player confirmation, and never auto-resolve combat.
- Continuous mode is session-only, stops after reload, and pauses at safe stage boundaries.
- Existing saves retain story, assets, characters, territory, relations, day, and stage.
- Newly recruited core members cannot deploy until the next morning.
- The mobile assistant must not regain a large background panel.
- `index.html` must remain directly playable offline through `dist/game.bundle.js`.

---

## File Structure

- Modify `src/engine.mjs`: deployment state, recommendation/validation, assignment settlement, readiness-scaled bonuses, day turnover, attack alert, auto-action selection, and save migration.
- Modify `src/app.mjs`: deployment editor, Difei reasoning, attack alert, session-only automation controller, progress bar, and safe stop controls.
- Modify `styles.css`: deployment cards, readiness meters, target selectors, fixed automation controls, and mobile layout.
- Create `test/deployment.test.mjs`: recommendation, validation, readiness, settlement, day turnover, battle scaling, and migration tests.
- Create `test/auto-operations.test.mjs`: allowlist, fallback, no-main/no-side, and interruption tests.
- Modify `test/app-render.test.mjs`: deployment/alert/automation markup and removal of mid-day active toggles.
- Modify `src/team-content.mjs` only if a stable role priority value is required; do not change character identity, copy, or base bonuses.
- Modify `dist/game.bundle.js` and `sw.js`: offline rebuild and cache bump after source completion.

### Task 1: Add deployment state, validation, and Difei recommendations

**Files:**
- Modify: `src/engine.mjs`
- Create: `test/deployment.test.mjs`

**Interfaces:**
- Consumes: `TEAM_MEMBERS`, `TEAM_LIMIT`, `teamMemberById()`, controlled territories, held industries, roster levels, readiness, and pending retaliation.
- Produces: `beginDeployment(state)`, `recommendDeployment(state)`, `updateDeploymentAssignment(state, memberId, assignment)`, `confirmDeployment(state)`, and `validateDeployment(state, assignments)`.

- [ ] **Step 1: Write failing initial-state and recommendation tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  newGame,
  beginDeployment,
  recommendDeployment,
  updateDeploymentAssignment,
  confirmDeployment,
  GameError,
} from "../src/engine.mjs";

test("a new game begins with a Difei deployment draft", () => {
  const state = newGame("test", 21);
  assert.equal(state.phase, "deployment");
  assert.equal(state.team.roster[0].readiness, 100);
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
```

- [ ] **Step 2: Run the focused tests and verify missing functions fail**

Run: `node --test test/deployment.test.mjs`

Expected: FAIL because the deployment exports and state do not exist.

- [ ] **Step 3: Add constants, state factories, and validation helpers**

```js
export const DEPLOYMENT_TYPES = ["earn", "train", "rest", "manage", "defend"];
const SHARED_DEPLOYMENT_WEIGHTS = [1, .6, .35];
const freshDeployment = day => ({ day, assignments: {}, confirmed: false, source: "difei", settledStages: [], readinessMultipliers: {}, trainingProgress: {}, industryEfficiency: {}, defenseStrength: {} });
const rosterReadiness = (state, id) => state.team.roster.find(item => item.id === id)?.readiness ?? 100;
export const readinessMultiplier = readiness => readiness < 20 ? 0 : readiness < 40 ? .7 : 1;

function deploymentError(code, message) {
  throw new GameError(code, message);
}

export function validateDeployment(state, assignments) {
  const entries = Object.entries(assignments || {});
  if (entries.length > TEAM_LIMIT) deploymentError("TEAM_LIMIT", `最多只能部署 ${TEAM_LIMIT} 名核心隊員`);
  const recruited = new Set(state.team.roster.map(member => member.id));
  const sharedCounts = new Map();
  for (const [memberId, assignment] of entries) {
    if (!recruited.has(memberId)) deploymentError("TEAM_MEMBER_NOT_RECRUITED", `尚未招募：${memberId}`);
    const rosterMember = state.team.roster.find(member => member.id === memberId);
    if ((rosterMember.deployableDay ?? state.day) > state.day) deploymentError("TEAM_MEMBER_NOT_READY", `${teamMemberById(memberId).name}要到翌日才能部署`);
    if (rosterReadiness(state, memberId) < 20) deploymentError("MEMBER_EXHAUSTED", `${teamMemberById(memberId).name}的戰備不足 20`);
    if (!DEPLOYMENT_TYPES.includes(assignment?.type)) deploymentError("INVALID_DEPLOYMENT_TYPE", `未知部署任務：${assignment?.type}`);
    if (assignment.type === "manage" && !state.assets.industries.some(asset => asset.id === assignment.targetId)) deploymentError("UNKNOWN_ASSET", "經營任務必須指定持有產業");
    if (assignment.type === "defend" && state.territories?.[assignment.targetId]?.owner !== "player") deploymentError("UNKNOWN_TERRITORY", "守備任務必須指定玩家地盤");
    if (["manage", "defend"].includes(assignment.type)) {
      const key = `${assignment.type}:${assignment.targetId}`;
      const count = (sharedCounts.get(key) || 0) + 1;
      if (count > 3) deploymentError("SHARED_TASK_LIMIT", "同一共享目標最多三人");
      sharedCounts.set(key, count);
    }
  }
  return true;
}
```

Update `newGame()` so Difei's roster entry includes `readiness: 100, deployableDay: 1`, `team.deployment` uses `freshDeployment(1)`, and the returned state is passed through `beginDeployment()` before leaving the function.

- [ ] **Step 4: Implement deterministic recommendation and editing**

```js
function assignmentScore(state, member, assignment, current) {
  const definition = teamMemberById(member.id);
  const lowCash = state.player.resource < 12;
  const lowReadiness = member.readiness < 45;
  if (assignment.type === "rest") return lowReadiness ? 100 - member.readiness : 8;
  if (assignment.type === "defend") return (state.pendingRetaliation?.territoryId === assignment.targetId ? 120 : 35) + (definition.bonuses.hp || 0) + (definition.bonuses.attack || 0) + (definition.bonuses.brawl || 0);
  if (assignment.type === "manage") return 28 + (definition.bonuses.income || 0) * 8 + (definition.bonuses.reward || 0) * 2;
  if (assignment.type === "earn") return (lowCash ? 70 : 22) + (definition.bonuses.income || 0) * 8 + (definition.bonuses.reward || 0) * 2;
  if (assignment.type === "train") return 26 - Math.min(20, (state.characterLevels[member.id] || 1) * 2);
  return -1;
}

export function recommendDeployment(state) {
  const eligible = state.team.roster.filter(member => (member.readiness ?? 100) >= 20 && (member.deployableDay ?? state.day) <= state.day);
  const assignments = {};
  const optionsFor = member => [
    { type: "rest", targetId: null },
    { type: "earn", targetId: null },
    { type: "train", targetId: null },
    ...state.assets.industries.map(asset => ({ type: "manage", targetId: asset.id })),
    ...controlledTerritories(state).map(territory => ({ type: "defend", targetId: territory.id })),
  ];
  const priority = eligible.map(member => {
    const best = Math.max(...optionsFor(member).map(option => assignmentScore(state, member, option, assignments)));
    return { member, best: best + (member.id === "difei" ? 12 : 0) };
  }).sort((left, right) => right.best - left.best || left.member.id.localeCompare(right.member.id));
  for (const { member } of priority.slice(0, TEAM_LIMIT)) {
    const ranked = optionsFor(member)
      .filter(option => !["manage", "defend"].includes(option.type) || Object.values(assignments).filter(item => item.type === option.type && item.targetId === option.targetId).length < 3)
      .map(option => ({ option, score: assignmentScore(state, member, option, assignments) }))
      .sort((left, right) => right.score - left.score || `${left.option.type}:${left.option.targetId || ""}`.localeCompare(`${right.option.type}:${right.option.targetId || ""}`));
    assignments[member.id] = ranked[0].option;
  }
  return Object.fromEntries(Object.entries(assignments).slice(0, TEAM_LIMIT));
}

export function beginDeployment(input) {
  const state = structuredClone(input);
  state.phase = "deployment";
  state.candidates = [];
  state.selected = null;
  state.team.deployment = { ...freshDeployment(state.day), assignments: recommendDeployment(state) };
  return state;
}

export function updateDeploymentAssignment(input, memberId, assignment) {
  if (input.phase !== "deployment") throw new GameError("WRONG_PHASE", "現在不是早上部署階段");
  const state = structuredClone(input);
  if (assignment === null) delete state.team.deployment.assignments[memberId];
  else state.team.deployment.assignments[memberId] = assignment;
  validateDeployment(state, state.team.deployment.assignments);
  state.team.deployment.source = "player-edited";
  return state;
}
```

Add confirmation with one readiness snapshot for the complete day:

```js
export function confirmDeployment(input) {
  if (input.phase !== "deployment") throw new GameError("WRONG_PHASE", "現在不是早上部署階段");
  validateDeployment(input, input.team.deployment.assignments);
  const state = structuredClone(input);
  state.team.active = Object.keys(state.team.deployment.assignments);
  state.team.deployment.confirmed = true;
  state.team.deployment.readinessMultipliers = Object.fromEntries(state.team.active.map(id => [id, readinessMultiplier(rosterReadiness(state, id))]));
  if (state.pendingRetaliation) {
    state.phase = "attackAlert";
    state.candidates = [];
    return state;
  }
  return generateCards(state);
}
```

- [ ] **Step 5: Run deployment tests**

Run: `node --test test/deployment.test.mjs`

Expected: PASS for new-game state, exhaustion filtering, pending-defense recommendation, and deployment validation.

- [ ] **Step 6: Commit the morning deployment model**

```powershell
git add src/engine.mjs test/deployment.test.mjs
git commit -m "Add morning deployment model"
```

### Task 2: Settle readiness and assignment results exactly once per stage

**Files:**
- Modify: `src/engine.mjs`
- Modify: `test/deployment.test.mjs`

**Interfaces:**
- Consumes: confirmed deployment state and `readinessMultiplier()` from Task 1.
- Produces: `settleDeploymentStage(state)`, `finalizeStageResult(state)`, idempotent stage keys, training progress, industry efficiency, defense strength, and readiness-scaled `teamBonuses()`.

- [ ] **Step 1: Add failing settlement tests**

```js
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

test("shared assignments accumulate 100 60 35 percent contributions", () => {
  let state = staffedDeploymentState();
  state.team.deployment.assignments = {
    difei: { type: "defend", targetId: "south_docks" },
    steel_jaw: { type: "defend", targetId: "south_docks" },
    grey_fox: { type: "defend", targetId: "south_docks" },
  };
  state = settleDeploymentStage(state);
  assert.equal(state.team.deployment.defenseStrength.south_docks, .65);
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
```

Extend the existing engine-test import with `settleDeploymentStage` and `teamBonuses` before running these cases.

- [ ] **Step 2: Run the focused tests and verify settlement fails**

Run: `node --test test/deployment.test.mjs --test-name-pattern="settlement|readiness|shared"`

Expected: FAIL because settlement and readiness scaling are not implemented.

- [ ] **Step 3: Implement readiness scaling and stable shared weights**

```js
export function teamBonuses(state) {
  const totals = { attack:0, brawl:0, hack:0, flee:0, hp:0, armor:0, medical:0, reward:0, income:0, weapon:0 };
  for (const member of activeTeamMembers(state)) {
    const readiness = rosterReadiness(state, member.id);
    const dailyMultiplier = state.team.deployment?.confirmed && state.team.deployment.day === state.day
      ? state.team.deployment.readinessMultipliers?.[member.id]
      : null;
    const scale = (1 + Math.max(0, (member.level || 1) - 1) * .25) * (dailyMultiplier ?? readinessMultiplier(readiness));
    for (const [key, value] of Object.entries(member.bonuses || {})) totals[key] = (totals[key] || 0) + Math.round(value * scale);
  }
  return totals;
}

function sharedWeight(assignments, memberId, type, targetId) {
  const ids = Object.entries(assignments)
    .filter(([, assignment]) => assignment.type === type && assignment.targetId === targetId)
    .map(([id]) => id)
    .sort();
  return SHARED_DEPLOYMENT_WEIGHTS[ids.indexOf(memberId)] || 0;
}
```

- [ ] **Step 4: Implement idempotent per-stage settlement**

```js
export function settleDeploymentStage(input) {
  const deployment = input.team?.deployment;
  if (!deployment?.confirmed || deployment.day !== input.day || deployment.settledStages.includes(input.stage)) return input;
  let state = structuredClone(input);
  const summaries = [];
  for (const member of state.team.roster) {
    const assignment = deployment.assignments[member.id];
    if (!assignment) {
      member.readiness = clamp((member.readiness ?? 100) + 8, [0, 100]);
      continue;
    }
    const multiplier = deployment.readinessMultipliers?.[member.id] ?? readinessMultiplier(member.readiness ?? 100);
    const level = state.characterLevels[member.id] || 1;
    if (assignment.type === "earn") {
      const definition = teamMemberById(member.id);
      const cash = Math.max(1, Math.round((2 + Math.floor((level - 1) / 3) + Math.floor((definition.bonuses.income || 0) / 2)) * multiplier));
      state = applyEffects(state, [{ type: "resource.add", value: cash }], `deployment:${member.id}:earn`);
      summaries.push(`${definition.name}賺得 ${cash}`);
    }
    if (assignment.type === "train") state.team.deployment.trainingProgress[member.id] = (state.team.deployment.trainingProgress[member.id] || 0) + 1;
    if (assignment.type === "manage") {
      const weight = sharedWeight(deployment.assignments, member.id, "manage", assignment.targetId) * multiplier;
      state.team.deployment.industryEfficiency[assignment.targetId] = (state.team.deployment.industryEfficiency[assignment.targetId] || 0) + weight * (10 / 3);
    }
    if (assignment.type === "defend") {
      const weight = sharedWeight(deployment.assignments, member.id, "defend", assignment.targetId) * multiplier;
      state.team.deployment.defenseStrength[assignment.targetId] = (state.team.deployment.defenseStrength[assignment.targetId] || 0) + weight / 3;
    }
    const delta = assignment.type === "rest" ? 12 : ["train", "defend"].includes(assignment.type) ? -6 : -4;
    member.readiness = clamp((member.readiness ?? 100) + delta, [0, 100]);
  }
  state.team.deployment.settledStages.push(state.stage);
  state.lastResult = { ...state.lastResult, teamSummary: summaries };
  return state;
}

export function finalizeStageResult(input) {
  return ["result", "ending"].includes(input.phase) ? settleDeploymentStage(input) : input;
}
```

After stage 2 settlement, process training members in sorted ID order. For each with progress 3, roll once with `rngNext()`, use `Math.max(5, Math.round(characterLevelChance(level) * .3 * deployment.readinessMultipliers[memberId]))`, update `characterLevels` and roster level on success, and append the result to `teamSummary`. Clear progress at day turnover.

Import `finalizeStageResult()` in `app.mjs` and change the central commit boundary so every manual, automatic, cancel, battle, and story result settles the team before the single persist:

```js
function commit(fn) {
  try {
    const next = fn();
    state = finalizeStageResult(next);
    error = "";
    persist();
    render();
  } catch (exception) {
    error = exception instanceof GameError ? exception.message : "發生未預期錯誤，狀態未被修改。";
    render();
    console.error(exception);
  }
}
```

Keep the idempotent call at the start of `continueStage()` as reload protection for any result saved by an older bundle.

- [ ] **Step 5: Run focused and full engine tests**

Run: `node --test test/deployment.test.mjs`

Expected: PASS.

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 6: Commit assignment settlement**

```powershell
git add src/engine.mjs test/deployment.test.mjs
git commit -m "Settle deployment assignments by stage"
```

### Task 3: Integrate day-end income, defense, attack alerts, and save migration

**Files:**
- Modify: `src/engine.mjs`
- Modify: `test/deployment.test.mjs`

**Interfaces:**
- Consumes: stage settlement and deployment state from Tasks 1–2.
- Produces: day turnover into `deployment`, defense-weighted retaliation, `acknowledgeAttack(state)`, old-save normalization, and no mid-day active toggles.

- [ ] **Step 1: Add failing day-turnover, attack, and migration tests**

```js
test("night completion settles income then enters next-day deployment", () => {
  let state = staffedDeploymentState();
  state.stage = 2;
  state.phase = "result";
  state.team.deployment.assignments.difei = { type: "manage", targetId: "industry_test" };
  state.assets.industries.push({ id: "industry_test", name: "測試產業", dailyIncome: 10, level: 0, basePrice: 20, bonuses: {} });
  state = continueStage(state);
  assert.equal(state.day, 2);
  assert.equal(state.stage, 0);
  assert.equal(state.phase, "deployment");
  assert.equal(state.lastSettlement.day, 1);
});

test("pending retaliation is acknowledged only after new deployment", () => {
  let state = newGame("test", 33);
  state.territories.south_docks.owner = "player";
  state.pendingRetaliation = { territoryId: "south_docks", factionId: "red_tide", sinceDay: 1 };
  state = beginDeployment(state);
  state = confirmDeployment(state);
  assert.equal(state.phase, "attackAlert");
  state = acknowledgeAttack(state);
  assert.equal(state.phase, "battle");
  assert.equal(state.battle.battleType, "defend");
});

test("version two saves gain readiness without losing current phase", () => {
  const legacy = generateCards(newGame("test", 34));
  legacy.phase = "cards";
  delete legacy.team.deployment;
  delete legacy.team.roster[0].readiness;
  const loaded = validateSave(legacy);
  assert.equal(loaded.phase, "cards");
  assert.equal(loaded.team.roster[0].readiness, 100);
  assert.equal(loaded.team.deployment.confirmed, false);
});
```

Extend the deployment-test import with `generateCards`, `continueStage`, `acknowledgeAttack`, and `validateSave`.

- [ ] **Step 2: Run focused tests and verify lifecycle assertions fail**

Run: `node --test test/deployment.test.mjs --test-name-pattern="turnover|retaliation|version two saves"`

Expected: FAIL until `advanceStage()`, migration, and attack acknowledgment change.

- [ ] **Step 3: Settle assignments before advancing and apply industry efficiency**

At the start of `continueStage()`, call the idempotent settlement function:

```js
export function continueStage(input) {
  if (input.phase !== "result") throw new GameError("WRONG_PHASE", "事件尚未結束");
  let state = settleDeploymentStage(input);
  state = structuredClone(state);
  if (state.flags) delete state.flags.assistantActionPending;
  if (state.chapterTransition) {
    state.phase = "chapterTransition";
    state.candidates = [];
    return state;
  }
  return advanceStage(state);
}
```

When calculating each industry's day-end income, multiply its individual income by `1 + (deployment.industryEfficiency[asset.id] || 0) / 100` before adding the existing team income and city-status multipliers.

- [ ] **Step 4: Weight retaliation targets and lower defense battle HP**

```js
function retaliationTargetWeight(state, territory) {
  const strength = state.team.deployment?.defenseStrength?.[territory.id] || 0;
  return Math.max(.2, 1 - strength * .3);
}

function weightedTerritoryPick(state, territories) {
  const weighted = territories.map(territory => ({ territory, weight: retaliationTargetWeight(state, territory) }));
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  const roll = rngNext(state.seed);
  state.seed = roll.seed;
  let cursor = roll.value * total;
  return weighted.find(item => (cursor -= item.weight) <= 0)?.territory || weighted.at(-1).territory;
}
```

In `startTerritoryFight()`, subtract `Math.round((deployment.defenseStrength[territoryId] || 0) * 6)` from defending enemy HP, while preserving the existing minimum of 42.

During day end, track whether the retaliation roll created a new `pendingRetaliation`. If it did not, grant one morale for each key in `deployment.defenseStrength` whose value is greater than zero, capped at three:

```js
const defendedCount = Object.values(state.team.deployment?.defenseStrength || {}).filter(value => value > 0).length;
if (!state.pendingRetaliation && defendedCount) state.crew.morale = clamp(state.crew.morale + Math.min(3, defendedCount), [0, 100]);
```

- [ ] **Step 5: Enter deployment on new day and add attack acknowledgment**

After day-end settlement, retaliation selection, morale reward, quest expiry, and city-status rotation, return `beginDeployment(state)` instead of `generateCards(state)`. Add:

```js
export function acknowledgeAttack(input) {
  if (input.phase !== "attackAlert" || !input.pendingRetaliation) throw new GameError("WRONG_PHASE", "目前沒有等待處理的敵人進攻");
  const state = structuredClone(input);
  state.phase = "factionBoard";
  state.selected = "life_conflict";
  return startTerritoryFight(state, state.pendingRetaliation.territoryId);
}
```

`confirmDeployment()` must return `attackAlert` before generating cards when retaliation exists.

- [ ] **Step 6: Normalize saves and lock active-roster edits to deployment**

In `validateSave()` map each roster entry to readiness clamped 0–100 and `deployableDay` defaulted to the loaded current day, preserve the loaded phase, and create an unconfirmed current-day deployment when absent. Change `recruitTeamMemberBase()` to append `{ id, level: 1, recruitedDay: state.day, deployableDay: state.day + 1, readiness: 100 }` and stop pushing a new recruit into `team.active`. Change `toggleTeamMember()` to reject phases other than `deployment`, or remove it after the deployment editor uses `updateDeploymentAssignment()`.

- [ ] **Step 7: Run deployment and complete tests**

Run: `node --test test/deployment.test.mjs`

Expected: PASS.

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 8: Commit lifecycle integration**

```powershell
git add src/engine.mjs test/deployment.test.mjs
git commit -m "Integrate deployment with daily lifecycle"
```

### Task 4: Render the deployment editor and attack alert

**Files:**
- Modify: `src/app.mjs`
- Modify: `styles.css`
- Modify: `test/app-render.test.mjs`

**Interfaces:**
- Consumes: deployment edit/confirm/recommend and `acknowledgeAttack()` engine functions.
- Produces: `deploymentView()`, `attackAlertView()`, mobile roster cards, target selectors, and Difei reasoning.

- [ ] **Step 1: Add failing render tests**

```js
test("deployment view shows readiness assignments and morning controls", async () => {
  const state = newGame("test", 40);
  const html = await renderSavedState(state);
  assert.match(html, /data-deployment-member="difei"/);
  assert.match(html, /戰備 100\/100/);
  assert.match(html, /data-deployment-type="difei"/);
  assert.match(html, /data-deployment-recommend/);
  assert.match(html, /data-deployment-confirm/);
});

test("a pending post-deployment attack renders an explicit alert", async () => {
  let state = newGame("test", 41);
  state.territories.south_docks.owner = "player";
  state.pendingRetaliation = { territoryId: "south_docks", factionId: "red_tide", sinceDay: 1 };
  state = confirmDeployment(beginDeployment(state));
  const html = await renderSavedState(state);
  assert.match(html, /敵人進攻/);
  assert.match(html, /data-attack-acknowledge/);
  assert.doesNotMatch(html, /data-card=/);
});
```

- [ ] **Step 2: Run render tests and verify the new phases are missing**

Run: `node --test test/app-render.test.mjs --test-name-pattern="deployment view|pending post-deployment"`

Expected: FAIL.

- [ ] **Step 3: Add deployment and alert render functions**

```js
function deploymentView() {
  const assignments = state.team.deployment.assignments;
  const cards = state.team.roster.map(member => {
    const person = characterVisual(member.id);
    const assignment = assignments[member.id];
    const readiness = member.readiness ?? 100;
    return `<article class="deployment-card ${assignment ? "deployed" : "reserve"}" data-deployment-member="${member.id}">${characterImage(member.id, "deployment-portrait")}<div><span class="tag">${assignment ? "出勤" : "待命"}／Lv.${state.characterLevels[member.id] || 1}</span><h3>${esc(person.name)}</h3><div class="readiness"><span>戰備 ${readiness}/100</span><i style="width:${readiness}%"></i></div><label>任務<select data-deployment-type="${member.id}" ${readiness < 20 ? "disabled" : ""}>${deploymentTypeOptions(assignment?.type)}</select></label>${deploymentTargetControl(member.id, assignment)}</div></article>`;
  }).join("");
  return `<section class="panel deployment-panel"><div class="tag accent">第 ${state.day} 日／早上部署</div><h2>狄菲重新評估並部署</h2><p>${esc(deploymentReason(state))}</p><div class="deployment-grid">${cards}</div><div class="deployment-controls"><button class="secondary" data-deployment-recommend>重新評估</button><button class="primary" data-deployment-confirm>確認部署</button></div></section>`;
}

function deploymentTypeOptions(current) {
  return [["reserve", "待命恢復"], ["earn", "賺錢"], ["train", "訓練"], ["rest", "休整"], ["manage", "經營產業"], ["defend", "守備地盤"]]
    .map(([value, label]) => `<option value="${value}" ${current === value || (!current && value === "reserve") ? "selected" : ""}>${label}</option>`)
    .join("");
}

function deploymentTargetControl(memberId, assignment) {
  if (assignment?.type === "manage") return `<label>目標<select data-deployment-target="${memberId}">${state.assets.industries.map(asset => `<option value="${asset.id}" ${assignment.targetId === asset.id ? "selected" : ""}>${esc(asset.name)}</option>`).join("")}</select></label>`;
  if (assignment?.type === "defend") return `<label>目標<select data-deployment-target="${memberId}">${controlledTerritories(state).map(territory => `<option value="${territory.id}" ${assignment.targetId === territory.id ? "selected" : ""}>${esc(territory.name)}</option>`).join("")}</select></label>`;
  return "";
}

function deploymentReason(current) {
  if (current.pendingRetaliation) return "敵人已經集結。我先把戰鬥、偵察和撤離專長放到遭威脅地盤。";
  if (current.player.resource < 12) return "現金偏低，我提高賺錢任務的優先度，同時保留必要的休整。";
  return "我依戰備、角色專長、產業與地盤重新排過今天的五人任務。你可以直接採用，也可以修改。";
}

function attackAlertView() {
  const territory = territoryById(state.pendingRetaliation.territoryId);
  return `<section class="panel attack-alert"><div class="tag danger">敵人進攻／自動運作已停止</div><h2>${esc(territory.name)}遭到反攻</h2><p>狄菲已通知今天的出勤隊員。確認後進入戰鬥，戰鬥動作仍由你親自決定。</p><button class="primary" data-attack-acknowledge>進入防守戰</button></section>`;
}
```

Add `deployment: deploymentView` and `attackAlert: attackAlertView` to the render dispatch map.

- [ ] **Step 4: Bind member, task, target, recommendation, confirm, and alert controls**

Use `updateDeploymentAssignment()` for every edit, removing a member when the type is `reserve`. Recompute valid target options from held industries or controlled territories:

```js
document.querySelectorAll("[data-deployment-type]").forEach(select => select.addEventListener("change", () => {
  const memberId = select.dataset.deploymentType;
  if (select.value === "reserve") { commit(() => updateDeploymentAssignment(state, memberId, null)); return; }
  const targetId = select.value === "manage" ? state.assets.industries[0]?.id : select.value === "defend" ? controlledTerritories(state)[0]?.id : null;
  commit(() => updateDeploymentAssignment(state, memberId, { type: select.value, targetId }));
}));
document.querySelectorAll("[data-deployment-target]").forEach(select => select.addEventListener("change", () => {
  const memberId = select.dataset.deploymentTarget;
  const current = state.team.deployment.assignments[memberId];
  commit(() => updateDeploymentAssignment(state, memberId, { ...current, targetId: select.value }));
}));
document.querySelector("[data-deployment-recommend]")?.addEventListener("click", () => commit(() => beginDeployment(state)));
document.querySelector("[data-deployment-confirm]")?.addEventListener("click", () => commit(() => confirmDeployment(state)));
document.querySelector("[data-attack-acknowledge]")?.addEventListener("click", () => { stopAutomation(); commit(() => acknowledgeAttack(state)); });
```

Change new-game creation in the start screen and modifier entry from `generateCards(newGame(...))` to `newGame(...)`; explicit engine tests may still call `generateCards(newGame(...))` when they need a card phase.

- [ ] **Step 5: Remove mid-day team toggle controls**

In `teamBoard()`, replace recruited-member active buttons with read-only copy:

```js
action = `<small>${isActive ? "今日出勤中" : "今日待命"}；名單只能在翌日早上部署時修改。</small>`;
```

- [ ] **Step 6: Add deployment and alert styles**

```css
.deployment-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(260px,1fr)); gap: .85rem; }
.deployment-card { display: grid; grid-template-columns: 88px 1fr; gap: .8rem; padding: .8rem; border: 1px solid #365047; border-radius: 1rem; background: rgba(8,23,20,.84); }
.deployment-card img { width: 88px; aspect-ratio: 3/4; object-fit: cover; border-radius: .75rem; }
.deployment-card.reserve { opacity: .72; }
.readiness { display: grid; gap: .25rem; }
.readiness i { display: block; height: .35rem; max-width: 100%; background: #69ffc7; border-radius: 999px; }
.deployment-controls { position: sticky; bottom: max(.5rem,env(safe-area-inset-bottom)); z-index: 11; display: flex; justify-content: flex-end; gap: .6rem; padding: .7rem; background: rgba(7,17,15,.95); border-radius: .9rem; }
.attack-alert { border-color: #c65353; box-shadow: 0 0 2rem rgba(198,83,83,.18); }
@media (max-width: 520px) {
  .deployment-grid { grid-template-columns: 1fr; }
  .deployment-card { grid-template-columns: 72px 1fr; }
  .deployment-card img { width: 72px; }
}
```

- [ ] **Step 7: Run focused render and engine tests**

Run: `node --test test/deployment.test.mjs test/app-render.test.mjs`

Expected: PASS.

- [ ] **Step 8: Commit deployment UI**

```powershell
git add src/app.mjs styles.css test/app-render.test.mjs
git commit -m "Add Difei morning deployment UI"
```

### Task 5: Add safe engine-level automated action selection

**Files:**
- Modify: `src/engine.mjs`
- Create: `test/auto-operations.test.mjs`

**Interfaces:**
- Consumes: normalized assistant action checkbox selection and existing direct training/leisure/work resolvers.
- Produces: `autoOperationChoice(state, selection)` and `resolveAutoOperation(state, selection)`; neither can return mainline, side-quest, conflict, purchase, social, or battle actions.

- [ ] **Step 1: Write failing allowlist, fallback, and interruption tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { newGame, generateCards, autoOperationChoice, resolveAutoOperation } from "../src/engine.mjs";

test("automatic operation only chooses from the saved general scope", () => {
  const state = generateCards(newGame("test", 51));
  const choice = autoOperationChoice(state, ["train:train_reflex"]);
  assert.equal(choice.id, "train:train_reflex");
});

test("automatic operation never chooses mainline or side quest cards", () => {
  const state = generateCards(newGame("test", 52));
  state.candidates = ["signal", "life_sidequest", "life_work", "life_training", "life_leisure"];
  for (let index = 0; index < 20; index += 1) {
    state.seed = index;
    assert.doesNotMatch(autoOperationChoice(state, ["work:cash"]).id, /signal|sidequest/);
  }
});

test("unaffordable selected actions fall back without negative cash", () => {
  const state = generateCards(newGame("test", 53));
  state.player.resource = 0;
  const result = resolveAutoOperation(state, ["train:train_reflex"]);
  assert.equal(result.phase, "result");
  assert.ok(result.player.resource >= 0);
  assert.match(result.lastResult.title, /賺錢|休息|恢復/);
});

test("pending attacks interrupt instead of resolving an automatic action", () => {
  const state = generateCards(newGame("test", 54));
  state.pendingRetaliation = { territoryId: "south_docks", factionId: "red_tide", sinceDay: 1 };
  assert.throws(() => resolveAutoOperation(state, ["work:cash"]), error => error.code === "AUTOMATION_INTERRUPTED");
});
```

- [ ] **Step 2: Run the focused tests and verify exports are missing**

Run: `node --test test/auto-operations.test.mjs`

Expected: FAIL.

- [ ] **Step 3: Implement the strict allowlist selector**

```js
export function autoOperationChoice(state, selection) {
  if (state.phase !== "cards") throw new GameError("WRONG_PHASE", "自動運作只能從卡牌階段開始");
  if (state.pendingRetaliation) throw new GameError("AUTOMATION_INTERRUPTED", "敵人正在進攻");
  const selected = new Set(normalizeAssistantActions(selection));
  const choices = [
    ...TRAINING_CARDS.filter(option => selected.has(`train:${option.id}`) && (option.cost || 0) <= state.player.resource).map(option => ({ id: `train:${option.id}`, kind: "training", optionId: option.id })),
    ...LEISURE_CARDS.filter(option => selected.has(`recover:${option.id}`) && (option.cost || 0) <= state.player.resource).map(option => ({ id: `recover:${option.id}`, kind: "leisure", optionId: option.id })),
    ...(selected.has("work:cash") ? [{ id: "work:cash", kind: "work", optionId: null }] : []),
  ];
  if (choices.length) return choices[assistantPickIndex(state, choices.length, `auto:${[...selected].sort().join("|")}`)];
  const rest = LEISURE_CARDS.find(option => option.id === "leisure_free_rest");
  return state.player.health < 70 || state.player.fatigue > 45 || state.player.stress > 45
    ? { id: `recover:${rest.id}`, kind: "leisure", optionId: rest.id }
    : { id: "work:cash", kind: "work", optionId: null };
}

export function resolveAutoOperation(input, selection) {
  const choice = autoOperationChoice(input, selection);
  if (choice.kind === "training" || choice.kind === "leisure") return markAssistantAction(assistantDirectActivity(input, choice.kind, choice.optionId));
  const state = structuredClone(input);
  state.selected = "life_work";
  return markAssistantAction(resolveWork(state));
}
```

- [ ] **Step 4: Run auto-operation tests**

Run: `node --test test/auto-operations.test.mjs`

Expected: PASS.

- [ ] **Step 5: Run the entire engine suite**

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 6: Commit automatic action selection**

```powershell
git add src/engine.mjs test/auto-operations.test.mjs
git commit -m "Add safe automatic daily actions"
```

### Task 6: Add one-day and continuous automation controls

**Files:**
- Modify: `src/app.mjs`
- Modify: `styles.css`
- Modify: `test/app-render.test.mjs`

**Interfaces:**
- Consumes: `resolveAutoOperation()`, `continueStage()`, `beginDeployment()`, `confirmDeployment()`, and the saved assistant checkbox selection.
- Produces: session-only `autoMode`, `automationStopRequested`, `runAutomationStep()`, one-day target tracking, visible stage summaries, and forced interruption.

- [ ] **Step 1: Add failing automation-control render tests**

```js
test("confirmed morning cards expose one-day and continuous Difei controls", async () => {
  let state = newGame("test", 61);
  state = confirmDeployment(state);
  const html = await renderSavedState(state);
  assert.match(html, /data-auto-day/);
  assert.match(html, /data-auto-continuous/);
  assert.match(html, /狄菲運作一日/);
});
```

- [ ] **Step 2: Run the render test and verify it fails**

Run: `node --test test/app-render.test.mjs --test-name-pattern="Difei controls"`

Expected: FAIL.

- [ ] **Step 3: Add session-only controller state and cleanup**

```js
let autoMode = "off";
let automationStopRequested = false;
let automationRunning = false;
let automationTimer = null;
let autoDayTarget = null;

function stopAutomation() {
  autoMode = "off";
  automationStopRequested = false;
  automationRunning = false;
  autoDayTarget = null;
  if (automationTimer) clearTimeout(automationTimer);
  automationTimer = null;
}
```

Call `stopAutomation()` on game load, new game, attack alert, battle entry, ending, unexpected phase, and global error. Do not write these values to localStorage.

- [ ] **Step 4: Implement the stage-boundary loop**

```js
function scheduleAutomation(delay = 650) {
  if (autoMode === "off") return;
  if (automationTimer) clearTimeout(automationTimer);
  automationTimer = setTimeout(() => { automationTimer = null; void runAutomationStep(); }, delay);
}

async function runAutomationStep() {
  if (automationRunning || autoMode === "off") return;
  automationRunning = true;
  try {
    if (state.phase === "attackAlert" || state.phase === "battle") {
      stopAutomation();
      render();
      return;
    }
    if (automationStopRequested && state.phase === "result") {
      stopAutomation();
      render();
      return;
    }
    if (state.phase === "deployment") {
      if (autoMode !== "continuous") { stopAutomation(); render(); return; }
      commit(() => confirmDeployment(beginDeployment(state)));
    } else if (state.phase === "cards") {
      commit(() => resolveAutoOperation(state, assistantActions));
    } else if (state.phase === "result") {
      commit(() => continueStage(state));
      if (autoMode === "day" && state.day > autoDayTarget) { stopAutomation(); render(); return; }
    } else {
      stopAutomation();
      render();
      return;
    }
  } finally {
    automationRunning = false;
  }
  scheduleAutomation();
}
```

- [ ] **Step 5: Render and bind controls**

Add controls beneath deployment confirmation and on confirmed card phases:

```js
function automationControls() {
  if (autoMode === "off") return `<div class="automation-controls"><button class="secondary" data-auto-day>狄菲運作一日</button><button class="secondary" data-auto-continuous>持續自動運作</button></div>`;
  return `<aside class="automation-running" aria-live="polite"><span><b>狄菲自動運作中</b><small>第 ${state.day} 日／${stageLabel()}</small></span><button class="primary" data-auto-stop>${automationStopRequested ? "本階段後停止" : "停止"}</button></aside>`;
}
```

Append `${automationControls()}` to the card view only while `autoMode === "off"`. In the root `render()` template, append `${autoMode !== "off" ? automationControls() : ""}` outside the current phase panel so the running/stop control remains visible on result and deployment screens.

Bind one-day mode with `autoDayTarget = state.day`, continuous mode without a target, and stop at the current safe boundary:

```js
document.querySelector("[data-auto-day]")?.addEventListener("click", () => { autoMode = "day"; autoDayTarget = state.day; automationStopRequested = false; render(); scheduleAutomation(80); });
document.querySelector("[data-auto-continuous]")?.addEventListener("click", () => { autoMode = "continuous"; autoDayTarget = null; automationStopRequested = false; render(); scheduleAutomation(80); });
document.querySelector("[data-auto-stop]")?.addEventListener("click", () => {
  if (!automationRunning && ["cards", "deployment"].includes(state.phase)) { stopAutomation(); render(); return; }
  automationStopRequested = true;
  render();
});
```

Show `lastResult.teamSummary` alongside the player result before the 650ms continuation.

At the central commit boundary, stop immediately when an engine transition reaches an interrupting phase:

```js
state = finalizeStageResult(next);
if (["attackAlert", "battle", "ending"].includes(state.phase)) stopAutomation();
```

- [ ] **Step 6: Add safe-area automation styles**

```css
.automation-controls { display: flex; flex-wrap: wrap; gap: .6rem; justify-content: flex-end; }
.automation-running { position: fixed; left: 50%; bottom: max(.75rem,env(safe-area-inset-bottom)); transform: translateX(-50%); z-index: 30; width: min(680px,calc(100vw - 1rem)); display: flex; justify-content: space-between; align-items: center; gap: .75rem; padding: .75rem 1rem; border: 1px solid #d8b56d; border-radius: 1rem; background: rgba(7,17,15,.97); box-shadow: 0 .8rem 2rem rgba(0,0,0,.42); }
.automation-running span { display: grid; }
```

- [ ] **Step 7: Run render, deployment, and automation tests**

Run: `node --test test/deployment.test.mjs test/auto-operations.test.mjs test/app-render.test.mjs`

Expected: PASS.

- [ ] **Step 8: Commit the automation controller**

```powershell
git add src/app.mjs styles.css test/app-render.test.mjs
git commit -m "Add Difei auto operation controls"
```

### Task 7: Rebuild and verify the complete daily loop

**Files:**
- Modify: `dist/game.bundle.js`
- Modify: `sw.js`
- Modify: `README.md`

**Interfaces:**
- Consumes: completed deployment and automation functionality.
- Produces: documented, cached, directly playable offline release artifacts.

- [ ] **Step 1: Document the daily loop**

Add a README section stating that each morning starts with Difei's deployment, assignments settle across three stages, one-day and continuous automation use the saved assistant action scope, main and side quests remain manual, and enemy attacks always stop automation.

- [ ] **Step 2: Run the complete test suite**

Run: `npm test`

Expected: all tests PASS, including save migration and bundle identity tests.

- [ ] **Step 3: Build the direct-file bundle**

Run: `npm run build`

Expected: esbuild exits 0 and updates `dist/game.bundle.js`.

- [ ] **Step 4: Bump the service-worker cache**

After the market plan's v39 cache, set:

```js
const CACHE = "crime-five-roads-v40";
```

- [ ] **Step 5: Run final automated verification**

Run: `npm test`

Expected: all tests PASS.

Run: `npm run audit:art`

Expected: exit 0.

- [ ] **Step 6: Exercise manual and automatic paths in the in-app browser**

Use a loaded save with at least three core members, one industry, and one territory. Verify: Difei recommendation; manual member/task/target edits; low-readiness warnings; one-day stop at day end; continuous cross-day redeployment; stop at a result boundary; main and side cards never selected; forced attack alert; manual battle; no automatic resume after battle; mobile layout near 390×844.

- [ ] **Step 7: Verify reload and direct-file behavior**

While continuous mode is running, reload and confirm it stops. Open `index.html` directly and repeat one manual deployment plus one Difei-run day.

- [ ] **Step 8: Commit documentation and release artifacts**

```powershell
git add README.md dist/game.bundle.js sw.js
git commit -m "Build daily deployment and automation"
```
