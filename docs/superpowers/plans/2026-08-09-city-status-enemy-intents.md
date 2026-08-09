# City Status, Enemy Intents, and Choice Image Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add six daily city states, four telegraphed enemy intents, and text-first choice screens while preserving result artwork.

**Architecture:** Keep deterministic rules in `src/engine.mjs` and expose small read-only helpers for rendering and tests. Update `src/app.mjs` to display the active rules and remove `choicePicture` calls only from actionable choices; `lastResult.artKey` remains the sole result-art path.

**Tech Stack:** Browser ES modules, Node test runner, esbuild, localStorage save migration.

## Global Constraints

- No new runtime dependencies or save-version bump.
- Exactly six city states and four enemy intents.
- Choice screens are text-first; result screens retain artwork.
- Existing browsing/identity artwork remains visible.

---

### Task 1: Daily city states

**Files:**
- Modify: `src/engine.mjs`
- Test: `test/engine.test.mjs`

**Interfaces:**
- Produces: `CITY_STATUSES`, `cityStatusById(id)`, `state.cityStatus`, and city modifiers consumed by settlement, combat, and activity effects.

- [ ] Add failing tests for deterministic initialization, cross-day rotation, legacy-save normalization, and representative modifiers.
- [ ] Run `node --test test/engine.test.mjs` and confirm failures are caused by missing city-state behavior.
- [ ] Implement the six definitions, deterministic selection, modifier application, and save normalization.
- [ ] Re-run the focused test and keep all engine tests green.

### Task 2: Telegraphed enemy intents

**Files:**
- Modify: `src/engine.mjs`
- Modify: `src/app.mjs`
- Test: `test/engine.test.mjs`
- Test: `test/app-render.test.mjs`

**Interfaces:**
- Produces: `ENEMY_INTENTS`, `enemyIntentById(id)`, and `battle.intent` rendered before each player action.

- [ ] Add failing tests for initialized intent, defense damage reduction, assault damage, reinforcement healing, disruption stress, and rendered intent copy.
- [ ] Run focused tests and confirm expected failures.
- [ ] Implement deterministic intent generation, resolution, next-intent selection, and battle UI copy.
- [ ] Re-run focused tests until green.

### Task 3: Text-first actionable choices

**Files:**
- Modify: `src/app.mjs`
- Modify: `test/app-render.test.mjs`
- Modify: `test/art-content.test.mjs`

**Interfaces:**
- Consumes: existing `lastResult.artKey` and `resultPicture(key)`.
- Produces: actionable choice markup without choice thumbnails; result markup remains unchanged.

- [ ] Replace existing render assertions with failing tests that reject choice-art paths in cards, activities, faction actions, territories, quests, events, character choices, and combat actions while requiring result artwork.
- [ ] Run focused rendering tests and confirm they fail on current thumbnails.
- [ ] Remove `choicePicture` calls from actionable controls without removing identity/browsing artwork.
- [ ] Re-run rendering and art-catalogue tests until green.

### Task 4: Integration verification and delivery

**Files:**
- Modify: `dist/game.bundle.js`

**Interfaces:**
- Produces: deployable offline browser bundle matching source behavior.

- [ ] Run the full Node test suite.
- [ ] Build `dist/game.bundle.js` with the bundled Node runtime and local esbuild package.
- [ ] Run the full test suite and artwork audit against the built tree.
- [ ] Review `git diff`, commit all scoped files, and push `codex/city-status-enemy-intents` to `origin`.

