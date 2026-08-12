import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { FACTIONS } from "../src/faction-content.mjs";
import {
  ENEMY_ARCHETYPES,
  FACTION_ENEMY_ARCHETYPE,
  enemyBattleAnimationFor,
  enemyFrameForPhase,
} from "../src/enemy-battle-animation.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));

test("all nine factions use one of four enemy battle archetypes", () => {
  assert.deepEqual(Object.keys(ENEMY_ARCHETYPES).sort(), ["bruiser", "gunner", "heavy", "tech"]);
  assert.deepEqual(Object.keys(FACTION_ENEMY_ARCHETYPE).sort(), FACTIONS.map(faction => faction.id).sort());
  assert.deepEqual(FACTION_ENEMY_ARCHETYPE, {
    red_tide: "bruiser",
    iron_riders: "heavy",
    white_sharks: "gunner",
    northbridge: "gunner",
    glass_snakes: "tech",
    civic_cleaners: "heavy",
    grey_wolves: "bruiser",
    dead_air: "tech",
    golden_ring: "heavy",
  });
});

test("every enemy archetype exposes four battle frames that exist", async () => {
  for (const [id, archetype] of Object.entries(ENEMY_ARCHETYPES)) {
    assert.equal(archetype.id, id);
    assert.ok(archetype.label);
    assert.deepEqual(Object.keys(archetype.frames), ["ready", "action", "hit", "exit"]);
    for (const [frame, src] of Object.entries(archetype.frames)) {
      assert.equal(src, `assets/images/animations/enemy/${id}-${frame}.webp`);
      await access(new URL(`../${src}`, import.meta.url));
    }
  }
});

test("faction battle animation keeps faction identity and has a neutral fallback", () => {
  const redTide = enemyBattleAnimationFor("red_tide");
  assert.equal(redTide.id, "bruiser");
  assert.equal(redTide.factionId, "red_tide");
  assert.equal(redTide.factionName, FACTIONS.find(faction => faction.id === "red_tide").name);
  assert.equal(redTide.accent, "#dc575f");

  const fallback = enemyBattleAnimationFor(null);
  assert.equal(fallback.id, "gunner");
  assert.equal(fallback.factionId, null);
  assert.equal(fallback.factionName, "敵方武裝人員");
});

test("event enemies select a fitting visual archetype from their description", () => {
  assert.equal(enemyBattleAnimationFor(null, "持棍討債人").id, "bruiser");
  assert.equal(enemyBattleAnimationFor(null, "地下拳館不敗冠軍").id, "bruiser");
  assert.equal(enemyBattleAnimationFor(null, "死訊台直播護衛").id, "tech");
  assert.equal(enemyBattleAnimationFor(null, "免稅站聯合武裝隊").id, "heavy");
  assert.equal(enemyBattleAnimationFor(null, "警長的便衣槍手").id, "gunner");
});

test("battle phases select enemy attack, hit, collapse, and ready frames", () => {
  for (const phase of ["shot", "kick", "hold"]) assert.equal(enemyFrameForPhase(phase), "hit");
  assert.equal(enemyFrameForPhase("enemy-counter"), "action");
  for (const phase of ["enemy-defeat", "enemy-break", "enemy-retreat"]) assert.equal(enemyFrameForPhase(phase), "exit");
  for (const phase of ["ready", "aim", "recoil", "player-hit", "reset", "player-retreat", "unknown"]) {
    assert.equal(enemyFrameForPhase(phase), "ready");
  }
});

test("enemy battle frames are available in the fresh offline cache", async () => {
  const serviceWorker = await readFile(`${root}/sw.js`, "utf8");
  const context = { self: { addEventListener() {} } };
  vm.runInNewContext(`${serviceWorker}\n;globalThis.__offlineFiles = FILES;`, context);
  for (const archetype of Object.values(ENEMY_ARCHETYPES)) {
    for (const src of Object.values(archetype.frames)) {
      assert.ok(context.__offlineFiles.includes(`./${src}`), `missing offline cache entry for ${src}`);
    }
  }
});
