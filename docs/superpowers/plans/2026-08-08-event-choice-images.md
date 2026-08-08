# Event and Choice Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve all existing artwork while adding complete event and option imagery, reusable choice thumbnails/result art, and prominent success/failure result labels across every built-in game flow.

**Architecture:** A focused `src/art-content.mjs` module owns stable art keys, paths, alt text, and fallback resolution. Engine result records persist an `artKey`; shared rendering helpers in `src/app.mjs` use the same option asset for button thumbnails and result art. A Node audit script enumerates every built-in content source and fails when a required mapping or file is missing.

**Tech Stack:** Browser ES modules, Node.js test runner, esbuild, HTML/CSS, WebP assets, built-in AI image generation.

## Global Constraints

- Do not regenerate, overwrite, remove, or rename existing event, character, team, territory, icon, or hero images.
- Missing event art uses separate desktop 16:9 and mobile 4:5 compositions.
- Every statically enumerable built-in option uses one unique 3:2 WebP shared by its button thumbnail and large result view.
- Success and failure share the same option image; status words are HTML/CSS, never baked into images.
- Use the existing modern East Asian harbor crime-noir palette: near-black green, deep blue-green, concrete gray, limited amber and mint light.
- Generated images contain no brands, visible writing, watermark, excessive neon, or futuristic technology.
- Existing character reference art controls hair, clothing, age, and overall demeanor whenever a known character appears.
- Custom cards and unbounded dynamic combinations use category fallbacks and never trigger runtime AI generation.
- Image failure must never prevent text display, selection, save loading, or game progression.

## File Structure

- Create `src/art-content.mjs`: art records, key builders, fallback records, and lookup functions.
- Create `scripts/audit-art-assets.mjs`: enumerate built-in event/option keys and verify mappings, files, dimensions, formats, and collisions.
- Create `test/art-content.test.mjs`: unit tests for key construction, lookup, completeness, fallback behavior, and file existence.
- Modify `src/engine.mjs`: persist stable `artKey` values in all result-producing flows while retaining old-save compatibility.
- Modify `src/app.mjs`: shared thumbnail/result rendering, event lookup migration, image-error fallback, and large result-state label.
- Modify `styles.css`: option thumbnail, result image, and responsive success/failure/result label styles.
- Modify `sw.js`: bump cache version and include the art module without pre-caching all generated image assets.
- Modify `docs/IMAGE_ASSETS.md`: document new choice naming, dimensions, mapping, fallbacks, and generated batches.
- Create `assets/images/choices/*.webp`: one generated master image per statically enumerable built-in choice/action.
- Create `assets/images/events/*-desktop.webp` and `assets/images/events/*-mobile.webp` only for events missing art, unless compatibility requires keeping new event files directly under `assets/images/`.
- Create `assets/images/fallbacks/*.webp`: finite category fallback art for custom/dynamic content.

---

### Task 1: Build the canonical art inventory and audit contract

**Files:**
- Create: `src/art-content.mjs`
- Create: `scripts/audit-art-assets.mjs`
- Create: `test/art-content.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `artKey(parentId, optionId) -> string`.
- Produces: `eventArt(id) -> {desktop:string,mobile:string,alt:string}|null`.
- Produces: `choiceArt(parentId, optionId, category?) -> {key:string,src:string,alt:string,fallback:boolean}`.
- Produces: `BUILTIN_ART_REQUIREMENTS`, an array of `{kind,key,parentId,optionId?,category,paths:string[]}`.
- Produces: `npm run audit:art`, which exits nonzero for missing mappings/files, duplicate paths, wrong extension, or unexpected dimensions.

- [ ] **Step 1: Write failing art-key and fallback tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { artKey, choiceArt, eventArt } from "../src/art-content.mjs";

test("圖片鍵包含完整父層與選項 ID",()=>{
  assert.equal(artKey("signal","trace"),"signal--trace");
  assert.equal(artKey("sidequest:old_debt:node_1","pay"),"sidequest-old_debt-node_1--pay");
});

test("未知動態內容取得可遊玩的分類備援圖",()=>{
  const art=choiceArt("custom:user-card","custom-choice","custom");
  assert.equal(art.fallback,true);
  assert.match(art.src,/assets\/images\/fallbacks\/custom\.webp$/);
});

test("既有事件圖仍由集中映射提供",()=>{
  assert.match(eventArt("signal").desktop,/event-signal-desktop\.webp$/);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test test/art-content.test.mjs`

Expected: FAIL because `src/art-content.mjs` does not exist.

- [ ] **Step 3: Implement stable keys, existing event mappings, and fallback lookup**

```js
export function normalizeArtId(value){
  return String(value).trim().toLowerCase().replace(/[^a-z0-9_-]+/g,"-").replace(/^-|-$/g,"");
}
export function artKey(parentId,optionId){return `${normalizeArtId(parentId)}--${normalizeArtId(optionId)}`;}
export function choiceArt(parentId,optionId,category="default"){
  const key=artKey(parentId,optionId),mapped=CHOICE_ART[key];
  return mapped?{key,...mapped,fallback:false}:{key,src:`assets/images/fallbacks/${FALLBACK_CATEGORIES.has(category)?category:"default"}.webp`,alt:"城市行動結果",fallback:true};
}
export function eventArt(id){return EVENT_ART[id]||null;}
```

Move the current `EVENT_ART` records from `src/app.mjs` unchanged into this module. Define finite fallback categories: `default`, `event`, `sidequest`, `daily`, `market`, `battle`, and `custom`.

- [ ] **Step 4: Implement the inventory enumerator and audit command**

The enumerator must import `EVENTS`, `CHAPTER_EVENTS`, `DIFEI_EVENTS`, `LIFE_CARDS`, `LEISURE_CARDS`, `TRAINING_CARDS`, `CONTACTS`, `SIDE_QUESTS`, `NIGHT_CARDS`, `FACTIONS`, and `TERRITORIES`. It must explicitly append the five battle actions `attack`, `brawl`, `hack`, `guard`, and `flee`. For side quests, use parent IDs in the form `sidequest:<quest.id>:<nodeIndex>`; for direct activities use `activity:<collection>:<id>`.

Add to `package.json`:

```json
"audit:art": "node scripts/audit-art-assets.mjs"
```

The first implementation supports `--allow-missing` to print a deterministic JSON inventory while generation is incomplete. Without that flag it exits `1` on any missing required asset.

- [ ] **Step 5: Run tests and create the initial missing-asset report**

Run: `node --test test/art-content.test.mjs`

Expected: PASS.

Run: `node scripts/audit-art-assets.mjs --allow-missing`

Expected: exit `0`, deterministic counts by category, and a list containing every unmapped choice plus only missing event art.

- [ ] **Step 6: Commit the inventory foundation**

```bash
git add package.json src/art-content.mjs scripts/audit-art-assets.mjs test/art-content.test.mjs
git commit -m "Add canonical game art inventory"
```

### Task 2: Persist result art keys in every engine flow

**Files:**
- Modify: `src/engine.mjs`
- Modify: `test/engine.test.mjs`

**Interfaces:**
- Consumes: `artKey(parentId, optionId)` from Task 1.
- Produces: every built-in `state.lastResult` has `artKey:string`; legacy saves without it remain valid.

- [ ] **Step 1: Add failing engine tests for event, activity, side-quest, character, and battle results**

```js
test("事件結果保存穩定圖片鍵",()=>{
  const input=newGame("x",1); input.phase="event"; input.selected="signal";
  assert.equal(resolveChoice(input,"trace").lastResult.artKey,"signal--trace");
});

test("支線結果保存節點與選項圖片鍵",()=>{
  let input=newGame("x",1); input=acceptSideQuest(input,SIDE_QUESTS[0].id);
  const choice=SIDE_QUESTS[0].nodes[0].choices[0];
  assert.equal(resolveSideQuestChoice(input,choice.id).lastResult.artKey,`sidequest-${SIDE_QUESTS[0].id}-0--${choice.id}`);
});

test("舊存檔結果沒有 artKey 仍通過驗證",()=>{
  const input=newGame(); input.phase="result"; input.lastResult={title:"舊結果",choice:"舊選項",success:true,summary:"仍可載入"};
  assert.doesNotThrow(()=>validateSave(input));
});
```

Add equivalent assertions to an existing activity test, a Difei character-event test, and a battle completion test. Each expected key must contain the explicit source parent and action ID.

- [ ] **Step 2: Run the focused engine tests and verify failure**

Run: `node --test test/engine.test.mjs --test-name-pattern="圖片鍵|artKey|舊存檔"`

Expected: FAIL because result records do not contain `artKey`.

- [ ] **Step 3: Add a single result constructor and use it in all result-producing functions**

```js
function resultRecord(parentId,optionId,data){return {...data,artKey:artKey(parentId,optionId)};}
```

Use `resultRecord` in `resolveChoice`, `resolveActivity`, `resolveNightOption`, meeting resolution, `resolveCharacterEventChoice`, `resolveSideQuestChoice`, side-quest abandon/expiry, and terminal branches of `battleAction`. Do not change existing `title`, `choice`, `success`, `summary`, or gameplay effects.

- [ ] **Step 4: Run focused and full tests**

Run: `node --test test/engine.test.mjs --test-name-pattern="圖片鍵|artKey|舊存檔"`

Expected: PASS.

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 5: Commit result-key persistence**

```bash
git add src/engine.mjs test/engine.test.mjs
git commit -m "Persist artwork keys in game results"
```

### Task 3: Render shared choice thumbnails and large result art

**Files:**
- Modify: `src/app.mjs`
- Modify: `styles.css`
- Modify: `test/art-content.test.mjs`

**Interfaces:**
- Consumes: `eventArt`, `choiceArt`, and engine `lastResult.artKey`.
- Produces: `choicePicture(parentId, optionId, category, className)` and `resultStatus(success)` rendering helpers.

- [ ] **Step 1: Add failing pure-render contract tests**

Export render-safe helpers from `src/art-content.mjs` or keep markup-independent logic there so Node tests can assert:

```js
test("結果狀態提供成功失敗與中性文字",()=>{
  assert.deepEqual(resultStatus(true),{label:"成功",tone:"success"});
  assert.deepEqual(resultStatus(false),{label:"失敗",tone:"failure"});
  assert.deepEqual(resultStatus(undefined),{label:"結果",tone:"neutral"});
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `node --test test/art-content.test.mjs --test-name-pattern="結果狀態"`

Expected: FAIL because `resultStatus` is not implemented.

- [ ] **Step 3: Implement shared markup and migrate every option surface**

In `src/app.mjs`, import art lookup functions and remove the local `EVENT_ART`. Add:

```js
function choicePicture(parentId,optionId,category="default",className="choice-thumb"){
  const art=choiceArt(parentId,optionId,category);
  return `<img class="${className}" src="${art.src}" alt="${esc(art.alt)}" loading="lazy" decoding="async" data-art-fallback="${category}">`;
}
```

Use it in standard events, character events, side-quest nodes, leisure/training/night activities, purchases, and all five battle buttons. Result rendering resolves `lastResult.artKey` through a new `choiceArtByKey` lookup and places the full image before result copy.

- [ ] **Step 4: Add prominent accessible result-state CSS**

```css
.result-status{font-size:clamp(2.6rem,9vw,6.5rem);font-weight:900;line-height:.9;letter-spacing:.08em;text-transform:uppercase}
.result-status.success{color:#74e5b2;text-shadow:0 0 28px rgba(116,229,178,.28)}
.result-status.failure{color:#ff737d;text-shadow:0 0 28px rgba(255,115,125,.3)}
.result-status.neutral{color:#efc77b}
.choice-thumb{width:clamp(104px,20vw,180px);aspect-ratio:3/2;object-fit:cover;border-radius:10px;flex:none}
.result-art{display:block;width:100%;aspect-ratio:3/2;object-fit:cover;border-radius:16px}
```

Add a `760px` media rule that stacks thumbnail/copy when necessary without hiding either. Attach a single delegated image-error handler that replaces failed paths with the corresponding category fallback and prevents fallback loops.

- [ ] **Step 5: Build and run all tests**

Run: `npm test`

Expected: all tests PASS.

Run: `npm run build`

Expected: exit `0` and `dist/game.bundle.js` is rebuilt.

- [ ] **Step 6: Commit shared visual rendering**

```bash
git add src/app.mjs src/art-content.mjs styles.css test/art-content.test.mjs dist/game.bundle.js
git commit -m "Show option thumbnails and prominent result art"
```

### Task 4: Generate and verify fallback and missing event art

**Files:**
- Create: `assets/images/fallbacks/*.webp`
- Create: missing event `*-desktop.webp` and `*-mobile.webp` files identified by the audit
- Modify: `src/art-content.mjs`
- Modify: `docs/IMAGE_ASSETS.md`

**Interfaces:**
- Consumes: missing-event list from `node scripts/audit-art-assets.mjs --allow-missing`.
- Produces: complete event art mappings plus seven category fallback images.

- [ ] **Step 1: Save the exact generation manifest from the audit output**

Run: `node scripts/audit-art-assets.mjs --allow-missing --json > tmp-art-inventory.json`

Expected: JSON lists existing event images separately and contains no existing path in `missingEventPaths`.

- [ ] **Step 2: Generate seven category fallback masters with the built-in image tool**

Use one tool call per category with this shared prompt frame:

```text
Use case: stylized-concept
Asset type: game fallback art
Primary request: [category-specific harbor-city action]
Style/medium: realistic crime-noir game concept art
Composition/framing: 3:2 landscape, readable at thumbnail size, one clear focal action
Lighting/mood: rainy modern East Asian harbor city, deep blue-green and concrete gray, limited amber and mint practical light
Constraints: no known story character, no text, no logo, no watermark, no excessive neon, no futuristic technology
```

Inspect each generated image, copy the selected final into `assets/images/fallbacks/`, convert to WebP if necessary, and verify the aspect ratio.

- [ ] **Step 3: Generate every missing event desktop/mobile pair**

Issue separate built-in calls for each asset and composition. Desktop prompts specify 16:9; mobile prompts specify 4:5 and must be recomposed rather than cropped. When known characters appear, inspect their local reference images first and include all relevant paths as generation references.

- [ ] **Step 4: Add mappings and verify event completeness**

Run: `node scripts/audit-art-assets.mjs --allow-missing`

Expected: `missing events: 0`; remaining missing records are choice images only.

- [ ] **Step 5: Document and commit the event/fallback batch**

Append filenames, dimensions, subject descriptions, and the shared prompt family to `docs/IMAGE_ASSETS.md`.

```bash
git add assets/images/fallbacks assets/images src/art-content.mjs docs/IMAGE_ASSETS.md
git commit -m "Add missing event and fallback artwork"
```

### Task 5: Generate mainline, character, and general-event choice art

**Files:**
- Create: `assets/images/choices/*.webp`
- Modify: `src/art-content.mjs`
- Modify: `docs/IMAGE_ASSETS.md`

**Interfaces:**
- Consumes: choice requirements whose category is `mainline`, `character`, or `event`.
- Produces: unique mapped art for every choice in those categories.

- [ ] **Step 1: Export the exact category batch**

Run: `node scripts/audit-art-assets.mjs --allow-missing --category mainline,character,event --json > tmp-choice-events.json`

Expected: every record contains a unique key, option text, parent summary, target path, and alt-text seed.

- [ ] **Step 2: Generate one 3:2 master per requirement using the built-in tool**

Each prompt uses the global visual constraints and explicitly describes the option action, not merely the parent event. Use existing character references when named characters appear. Make one built-in generation call per distinct record; inspect each output before moving it into `assets/images/choices/`.

- [ ] **Step 3: Convert, compress, map, and audit the batch**

Run: `node scripts/audit-art-assets.mjs --allow-missing --category mainline,character,event`

Expected: missing count `0` for all three selected categories; no duplicate path and no non-WebP final.

- [ ] **Step 4: Update documentation and commit**

```bash
git add assets/images/choices src/art-content.mjs docs/IMAGE_ASSETS.md
git commit -m "Add story and event choice artwork"
```

### Task 6: Generate side-quest and daily-life choice art

**Files:**
- Create: `assets/images/choices/*.webp`
- Modify: `src/art-content.mjs`
- Modify: `docs/IMAGE_ASSETS.md`

**Interfaces:**
- Consumes: choice requirements whose category is `sidequest`, `daily`, or `night`.
- Produces: unique mapped art for all side-quest nodes, leisure/training/contact activities, and statically enumerable night actions.

- [ ] **Step 1: Export the exact category batch**

Run: `node scripts/audit-art-assets.mjs --allow-missing --category sidequest,daily,night --json > tmp-choice-daily.json`

Expected: all side-quest parent IDs include quest ID and node index, preventing repeated choice IDs from colliding.

- [ ] **Step 2: Generate and inspect each 3:2 choice master**

Use one built-in call per record. Depict the concrete choice action with a thumbnail-readable focal subject. Use character references for contact activities; use category-consistent anonymous subjects where no named character is required.

- [ ] **Step 3: Convert, compress, map, and audit the batch**

Run: `node scripts/audit-art-assets.mjs --allow-missing --category sidequest,daily,night`

Expected: selected-category missing count `0`, valid dimensions, and no filename collisions.

- [ ] **Step 4: Update documentation and commit**

```bash
git add assets/images/choices src/art-content.mjs docs/IMAGE_ASSETS.md
git commit -m "Add side quest and daily choice artwork"
```

### Task 7: Generate market and battle choice art

**Files:**
- Create: `assets/images/choices/*.webp`
- Modify: `src/art-content.mjs`
- Modify: `docs/IMAGE_ASSETS.md`

**Interfaces:**
- Consumes: requirements whose category is `market` or `battle`.
- Produces: unique mapped art for every purchasable item and the five battle actions; unbounded asset/contact combinations use fallbacks.

- [ ] **Step 1: Export the market and battle batch**

Run: `node scripts/audit-art-assets.mjs --allow-missing --category market,battle --json > tmp-choice-market-battle.json`

Expected: one stable record per market choice and exactly five static battle-action records.

- [ ] **Step 2: Generate each 3:2 master**

Market prompts show the exact asset as grounded crime-drama inventory photography or environmental concept art, without brand marks. Battle prompts show distinct actions: firearm attack, close combat, equipment hacking, taking cover, and vehicle escape. Use one built-in call per record.

- [ ] **Step 3: Convert, compress, map, and run the strict audit**

Run: `npm run audit:art`

Expected: exit `0`, all built-in requirements mapped, every mapped file present, all option files WebP and 3:2, event pairs at their required ratios, and no path collisions.

- [ ] **Step 4: Update documentation and commit**

```bash
git add assets/images/choices src/art-content.mjs docs/IMAGE_ASSETS.md
git commit -m "Complete market and battle choice artwork"
```

### Task 8: Offline cache, responsive QA, and final verification

**Files:**
- Modify: `sw.js`
- Modify: `test/art-content.test.mjs`
- Modify: `docs/IMAGE_ASSETS.md`
- Modify: `dist/game.bundle.js`

**Interfaces:**
- Consumes: complete strict audit and shared render implementation.
- Produces: deployable offline bundle with lazy image caching and documented visual verification.

- [ ] **Step 1: Add a failing service-worker policy test**

```js
test("service worker 不預快取整套選項圖",async()=>{
  const source=await readFile(new URL("../sw.js",import.meta.url),"utf8");
  assert.doesNotMatch(source,/assets\/images\/choices\/.*\.webp/);
  assert.match(source,/src\/art-content\.mjs|dist\/game\.bundle\.js/);
});
```

- [ ] **Step 2: Run the policy test and verify its current result**

Run: `node --test test/art-content.test.mjs --test-name-pattern="service worker"`

Expected before the cache update: FAIL because the new art module/cache version is not represented.

- [ ] **Step 3: Update cache version without pre-caching all choice assets**

Bump the cache identifier. Keep the application shell and bundle cached, but let generated images enter the runtime cache only when requested so unseen choices are not downloaded up front.

- [ ] **Step 4: Run automated verification**

Run: `npm test`

Expected: all tests PASS.

Run: `npm run audit:art`

Expected: exit `0`, zero missing or invalid required assets.

Run: `npm run build`

Expected: exit `0` and a freshly generated `dist/game.bundle.js`.

Run: `git diff --check`

Expected: no whitespace errors.

- [ ] **Step 5: Perform desktop and mobile visual QA**

Start with `npm run serve`. At desktop width and below `760px`, verify a standard event, a character event, one side quest, one activity, one market purchase, and a battle. Confirm thumbnails never cover text, result art stays 3:2, known characters remain recognizable, image errors fall back without blocking play, and the large `成功`, `失敗`, and neutral `結果` labels remain visible without covering the focal subject.

- [ ] **Step 6: Record final counts and commit**

Add the strict-audit counts and QA checklist result to `docs/IMAGE_ASSETS.md`.

```bash
git add sw.js test/art-content.test.mjs docs/IMAGE_ASSETS.md dist/game.bundle.js
git commit -m "Verify complete responsive game artwork"
```
