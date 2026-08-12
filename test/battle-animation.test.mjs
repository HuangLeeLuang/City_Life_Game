import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { battleAnimationAftermath, battleAnimationFor, battleAnimationResult } from "../src/battle-animation.mjs";

async function webpCanvasSize(source) {
  const data = await readFile(new URL(`../${source}`, import.meta.url));
  assert.equal(data.toString("ascii", 0, 4), "RIFF");
  assert.equal(data.toString("ascii", 8, 12), "WEBP");
  for (let offset = 12; offset + 8 <= data.length;) {
    const type = data.toString("ascii", offset, offset + 4);
    const size = data.readUInt32LE(offset + 4);
    if (type === "VP8X") {
      const payload = offset + 8;
      return [data.readUIntLE(payload + 4, 3) + 1, data.readUIntLE(payload + 7, 3) + 1];
    }
    offset += 8 + size + (size % 2);
  }
  assert.fail(`${source} must use an extended WebP canvas`);
}

test("approved shooting and brawl actions expose playable frame timelines", () => {
  const attack = battleAnimationFor("attack");
  assert.equal(attack.actorId, "difei");
  assert.deepEqual(Object.keys(attack.frames), ["ready", "fire", "recoil"]);
  assert.deepEqual(attack.timeline.map(step => step.phase), ["ready", "aim", "shot", "recoil", "settle", "recover"]);
  assert.ok(attack.timeline.every(step => step.duration > 0 && step.frame in attack.frames));

  const brawl = battleAnimationFor("brawl");
  assert.equal(brawl.actorId, "difei");
  assert.deepEqual(Object.keys(brawl.frames), ["guard", "jab", "chamber", "kick"]);
  assert.deepEqual(brawl.timeline.map(step => step.phase), ["guard", "approach", "jab", "recover", "chamber", "kick", "finish"]);
  assert.ok(brawl.timeline.every(step => step.duration > 0 && step.frame in brawl.frames));
});

test("actions without approved character frame packs expose no actor animation", () => {
  assert.equal(battleAnimationFor("hack"), null);
  assert.equal(battleAnimationFor("guard"), null);
  assert.equal(battleAnimationFor("flee"), null);
  assert.equal(battleAnimationFor("unknown"), null);
});

test("animation damage is derived from the single precomputed battle result", () => {
  const before = { battle: { enemyHp: 84, playerHp: 96 } };
  const after = { battle: { enemyHp: 57, playerHp: 88 } };

  assert.deepEqual(battleAnimationResult(before, after), {
    enemyDamage: 27,
    playerDamage: 8,
    enemyHp: 57,
    playerHp: 88,
  });
});

test("a finishing blow displays zero enemy HP without inventing player damage", () => {
  const before = { battle: { enemyHp: 18, playerHp: 42 } };
  const after = { phase: "result", battle: null };

  assert.deepEqual(battleAnimationResult(before, after), {
    enemyDamage: 18,
    playerDamage: 0,
    enemyHp: 0,
    playerHp: 42,
  });
});

test("Difei brawl frames share one portrait canvas for a stable ground line", async () => {
  const frames = Object.values(battleAnimationFor("brawl").frames);
  const sizes = await Promise.all(frames.map(webpCanvasSize));

  assert.deepEqual(sizes, frames.map(() => [750, 1000]));
});

test("battle character transforms pivot on the shared ground line", async () => {
  const styles = await readFile(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(styles, /\.battle-animation-frame\{[^}]*transform-origin:48% 97\.4%/);
  assert.match(styles, /\.battle-enemy-frame\{[^}]*transform-origin:55% 97\.4%/);
  assert.match(styles, /\.battle-team-support-frame\{[^}]*transform-origin:45% 97\.4%/);
});

test("enemy counterattack and player hit follow a non-finishing action", () => {
  const before = { battle: { enemyHp: 84, playerHp: 96 } };
  const after = { battle: { enemyHp: 57, playerHp: 88, message: "敵方反擊，造成 8 傷害。" } };

  assert.deepEqual(battleAnimationAftermath(before, after).map(step => step.phase), [
    "enemy-counter",
    "player-hit",
    "reset",
  ]);
});

test("victory, morale collapse, retreat, and defeat have distinct aftermaths", () => {
  const before = { battle: { enemyHp: 18, enemyMorale: 9, playerHp: 42 } };

  assert.deepEqual(battleAnimationAftermath(before, {
    phase: "result",
    battle: null,
    lastResult: { success: true, choice: "贏下戰鬥" },
  }).map(step => step.phase), ["enemy-defeat"]);

  assert.deepEqual(battleAnimationAftermath(before, {
    phase: "result",
    battle: null,
    lastResult: { success: true, choice: "擊潰敵方士氣" },
  }).map(step => step.phase), ["enemy-break", "enemy-retreat"]);

  assert.deepEqual(battleAnimationAftermath(before, {
    phase: "result",
    battle: null,
    lastResult: { success: false, choice: "主動撤離" },
  }).map(step => step.phase), ["player-retreat"]);

  assert.deepEqual(battleAnimationAftermath(before, {
    phase: "result",
    battle: null,
    lastResult: { success: false, choice: "負傷撤離" },
  }).map(step => step.phase), ["enemy-counter", "player-hit", "player-retreat"]);
});
