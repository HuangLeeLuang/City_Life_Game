# Battle Action Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the approved Difei shooting and close-combat sequences into the real battle screen without resolving a battle action more than once.

**Architecture:** A new pure `battle-animation.mjs` registry owns action actors, frame paths, and phase timelines. `app.mjs` renders one reusable battle stage and runs a precomputed engine result through the selected timeline before committing it; CSS owns responsive placement and reusable effect layers.

**Tech Stack:** Browser ES modules, Node test runner, esbuild, CSS keyframes, transparent WebP assets.

## Global Constraints

- Enemy name, intent, HP, and report stay above the animation stage.
- The central stage contains only the character, enemy silhouette, and effects.
- Desktop and mobile use the same transparent WebP files.
- `attack` and `brawl` resolve exactly once after their animations.
- `hack`, `guard`, and `flee` remain immediate until their own animation packs exist.
- `index.html` must remain directly playable through `dist/game.bundle.js`.

---

### Task 1: Animation Registry and Approved Assets

**Files:**
- Create: `src/battle-animation.mjs`
- Create: `test/battle-animation.test.mjs`
- Create: `assets/images/animations/difei/shoot-ready.webp`
- Create: `assets/images/animations/difei/shoot-fire.webp`
- Create: `assets/images/animations/difei/shoot-recoil.webp`
- Create: `assets/images/animations/difei/brawl-guard.webp`
- Create: `assets/images/animations/difei/brawl-jab.webp`
- Create: `assets/images/animations/difei/brawl-chamber.webp`
- Create: `assets/images/animations/difei/brawl-kick.webp`

**Interfaces:**
- Produces: `battleAnimationFor(action: string): BattleAnimation | null`.
- `BattleAnimation` contains `actorId`, `label`, `frames`, and `timeline`.

- [ ] **Step 1: Write the failing registry test**

```js
test("approved combat actions expose complete animation timelines", () => {
  const attack = battleAnimationFor("attack");
  assert.equal(attack.actorId, "difei");
  assert.deepEqual(Object.keys(attack.frames), ["ready", "fire", "recoil"]);
  assert.deepEqual(attack.timeline.map(step => step.phase), ["ready", "aim", "shot", "recoil", "settle", "recover"]);

  const brawl = battleAnimationFor("brawl");
  assert.deepEqual(Object.keys(brawl.frames), ["guard", "jab", "chamber", "kick"]);
  assert.deepEqual(brawl.timeline.map(step => step.phase), ["guard", "approach", "jab", "recover", "chamber", "kick", "finish"]);
  assert.equal(battleAnimationFor("hack"), null);
});
```

- [ ] **Step 2: Run the registry test and verify it fails**

Run: `node --test test/battle-animation.test.mjs`

Expected: FAIL because `src/battle-animation.mjs` does not exist.

- [ ] **Step 3: Add the immutable registry and lookup**

```js
const frame = name => `assets/images/animations/difei/${name}.webp`;

export const BATTLE_ANIMATIONS = Object.freeze({
  attack: Object.freeze({
    actorId: "difei",
    label: "狄菲快速射擊",
    frames: Object.freeze({ ready: frame("shoot-ready"), fire: frame("shoot-fire"), recoil: frame("shoot-recoil") }),
    timeline: Object.freeze([
      { phase: "ready", frame: "ready", duration: 420, report: "狄菲保持低位戒備，確認射線與隊友位置。" },
      { phase: "aim", frame: "fire", duration: 260, report: "狄菲壓低重心，雙手舉槍鎖定目標。" },
      { phase: "shot", frame: "fire", duration: 115, report: "擊發！" },
      { phase: "recoil", frame: "recoil", duration: 210, report: "狄菲鎖住手腕吸收後座。" },
      { phase: "settle", frame: "fire", duration: 220, report: "準星回正，維持對敵壓制。" },
      { phase: "recover", frame: "ready", duration: 260, report: "射擊完成，回到低位戒備。" },
    ]),
  }),
  brawl: Object.freeze({
    actorId: "difei",
    label: "狄菲近身二連擊",
    frames: Object.freeze({ guard: frame("brawl-guard"), jab: frame("brawl-jab"), chamber: frame("brawl-chamber"), kick: frame("brawl-kick") }),
    timeline: Object.freeze([
      { phase: "guard", frame: "guard", duration: 360, report: "狄菲側身戒備，左手左腳在前。" },
      { phase: "approach", frame: "guard", duration: 190, report: "狄菲前壓距離。" },
      { phase: "jab", frame: "jab", duration: 170, report: "左直拳命中。" },
      { phase: "recover", frame: "guard", duration: 130, report: "左手迅速收回。" },
      { phase: "chamber", frame: "chamber", duration: 190, report: "重心轉移，左腿蓄力。" },
      { phase: "kick", frame: "kick", duration: 260, report: "左旋踢命中頭部高度。" },
      { phase: "finish", frame: "guard", duration: 260, report: "二連擊完成，重新戒備。" },
    ]),
  }),
});

export function battleAnimationFor(action) {
  return BATTLE_ANIMATIONS[action] || null;
}
```

- [ ] **Step 4: Copy the seven approved transparent WebP frames into the project paths**

Copy the existing approved Difei shooting and brawl files without regenerating or changing their proportions.

- [ ] **Step 5: Run the registry test and verify it passes**

Run: `node --test test/battle-animation.test.mjs`

Expected: PASS.

### Task 2: Battle Stage Rendering

**Files:**
- Modify: `src/app.mjs`
- Modify: `test/app-render.test.mjs`

**Interfaces:**
- Consumes: `battleAnimationFor(action)` from Task 1.
- Produces: battle DOM hooks `[data-battle-animation-stage]`, `[data-battle-report]`, `[data-battle-frame]`, and `[data-battle-damage]`.

- [ ] **Step 1: Add a failing battle render assertion**

```js
assert.match(battleHtml, /data-battle-animation-stage/);
assert.match(battleHtml, /assets\/images\/animations\/difei\/shoot-ready\.webp/);
assert.match(battleHtml, /data-battle-report/);
assert.match(battleHtml, /data-battle-damage/);
```

- [ ] **Step 2: Run the render test and verify it fails**

Run: `node --test test/app-render.test.mjs`

Expected: FAIL because the battle stage is absent.

- [ ] **Step 3: Render the reusable stage in `battle()`**

Import `battleAnimationFor`, render all unique Difei frames once, give only the ready frame `is-active`, and place the enemy intent, HP, and `data-battle-report` before the stage. Keep the existing team roster and action choices after the stage.

- [ ] **Step 4: Run the render test and verify it passes**

Run: `node --test test/app-render.test.mjs`

Expected: PASS.

### Task 3: Resolve Once and Play Timeline

**Files:**
- Modify: `src/app.mjs`
- Modify: `test/app-render.test.mjs`

**Interfaces:**
- Consumes: rendered hooks from Task 2 and timeline definitions from Task 1.
- Produces: `playBattleAction(action: string): Promise<void>` with one-action locking.

- [ ] **Step 1: Extend the app test DOM stub for battle buttons and assert one engine resolution path**

The stub must retain click listeners for `[data-battle]` buttons and expose `dataset.battle`. Trigger `attack` twice while the first promise is active and assert only the first click changes the saved battle turn.

- [ ] **Step 2: Run the focused app test and verify it fails**

Run: `node --test test/app-render.test.mjs`

Expected: FAIL because battle actions currently commit immediately and have no animation lock.

- [ ] **Step 3: Implement precomputed result playback**

```js
async function playBattleAction(action) {
  if (battleAnimationRunning) return;
  const animation = battleAnimationFor(action);
  if (!animation) return commit(() => battleAction(state, action));
  const nextState = battleAction(state, action);
  battleAnimationRunning = true;
  try {
    setBattleButtonsDisabled(true);
    await playBattleTimeline(animation, state, nextState);
    commit(() => nextState);
  } catch (cause) {
    error = cause instanceof GameError ? cause.message : "戰鬥動畫無法播放。";
    render();
  } finally {
    battleAnimationRunning = false;
  }
}
```

`playBattleTimeline` changes the stage phase, active frame, report, damage number, and visual HP bar. Durations become at most 40 ms when reduced motion is active.

- [ ] **Step 4: Bind `[data-battle]` buttons to `playBattleAction`**

Replace the immediate `commit(() => battleAction(...))` listener with `void playBattleAction(el.dataset.battle)`.

- [ ] **Step 5: Run all app and engine tests**

Run: `node --test test/app-render.test.mjs test/engine.test.mjs`

Expected: PASS with no duplicate state transition.

### Task 4: Responsive Stage Styling and Offline Build

**Files:**
- Modify: `styles.css`
- Modify: `dist/game.bundle.js` through the build command
- Modify: `sw.js` only if its cache version requires an explicit bump after inspection

**Interfaces:**
- Consumes: stage classes and data phases from Tasks 2 and 3.
- Produces: desktop/mobile layout and shared shot/brawl effect keyframes.

- [ ] **Step 1: Add stage, actor, target, muzzle, tracer, casing, impact, and damage styles**

Use `data-phase` selectors so shooting phases show muzzle/tracer/casing effects, `jab` and `kick` show distinct impact effects, and the enemy silhouette reacts without being baked into character images.

- [ ] **Step 2: Add the 760px mobile layout and reduced-motion overrides**

The mobile stage height is 440px; character images use `object-fit: contain`, preserve both shoes and weapons, and action buttons remain below the stage without horizontal overflow.

- [ ] **Step 3: Run the complete automated checks**

Run: `npm test`

Expected: all tests pass.

Run: `npm run audit:art`

Expected: exit 0 with no missing image.

Run: `npm run build`

Expected: exit 0 and a refreshed `dist/game.bundle.js`.

- [ ] **Step 4: Verify direct-file and responsive behavior**

Open `index.html`, load a battle save, and confirm both `attack` and `brawl` visit every configured phase at desktop and 360px mobile widths. Confirm `document.documentElement.scrollWidth === document.documentElement.clientWidth` and that a second click during playback does not advance another turn.
