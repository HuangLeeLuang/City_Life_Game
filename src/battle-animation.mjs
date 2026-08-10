const difeiFrame = name => `assets/images/animations/difei/${name}.webp`;

const attack = Object.freeze({
  actorId: "difei",
  label: "狄菲快速射擊",
  frames: Object.freeze({
    ready: difeiFrame("shoot-ready"),
    fire: difeiFrame("shoot-fire"),
    recoil: difeiFrame("shoot-recoil"),
  }),
  timeline: Object.freeze([
    Object.freeze({ phase: "ready", frame: "ready", duration: 420, report: "狄菲保持低位戒備，確認射線與隊友位置。" }),
    Object.freeze({ phase: "aim", frame: "fire", duration: 260, report: "狄菲壓低重心，雙手舉槍鎖定目標。" }),
    Object.freeze({ phase: "shot", frame: "fire", duration: 115, report: "擊發！" }),
    Object.freeze({ phase: "recoil", frame: "recoil", duration: 210, report: "狄菲鎖住手腕吸收後座。" }),
    Object.freeze({ phase: "settle", frame: "fire", duration: 220, report: "準星回正，維持對敵壓制。" }),
    Object.freeze({ phase: "recover", frame: "ready", duration: 260, report: "射擊完成，回到低位戒備。" }),
  ]),
});

const brawl = Object.freeze({
  actorId: "difei",
  label: "狄菲近身二連擊",
  frames: Object.freeze({
    guard: difeiFrame("brawl-guard"),
    jab: difeiFrame("brawl-jab"),
    chamber: difeiFrame("brawl-chamber"),
    kick: difeiFrame("brawl-kick"),
  }),
  timeline: Object.freeze([
    Object.freeze({ phase: "guard", frame: "guard", duration: 360, report: "狄菲側身戒備，左手左腳在前。" }),
    Object.freeze({ phase: "approach", frame: "guard", duration: 190, report: "狄菲前壓距離。" }),
    Object.freeze({ phase: "jab", frame: "jab", duration: 170, report: "左直拳命中。" }),
    Object.freeze({ phase: "recover", frame: "guard", duration: 130, report: "左手迅速收回。" }),
    Object.freeze({ phase: "chamber", frame: "chamber", duration: 190, report: "重心轉移，左腿蓄力。" }),
    Object.freeze({ phase: "kick", frame: "kick", duration: 260, report: "左旋踢命中頭部高度。" }),
    Object.freeze({ phase: "finish", frame: "guard", duration: 260, report: "二連擊完成，重新戒備。" }),
  ]),
});

export const BATTLE_ANIMATIONS = Object.freeze({ attack, brawl });

export function battleAnimationFor(action) {
  return BATTLE_ANIMATIONS[action] || null;
}

export function battleAnimationResult(beforeState, afterState) {
  const before = beforeState?.battle;
  if (!before) return { enemyDamage: 0, playerDamage: 0, enemyHp: 0, playerHp: 0 };

  const after = afterState?.battle;
  const enemyHp = after ? Math.max(0, Number(after.enemyHp) || 0) : 0;
  const playerHp = after ? Math.max(0, Number(after.playerHp) || 0) : Math.max(0, Number(before.playerHp) || 0);

  return {
    enemyDamage: Math.max(0, (Number(before.enemyHp) || 0) - enemyHp),
    playerDamage: after ? Math.max(0, (Number(before.playerHp) || 0) - playerHp) : 0,
    enemyHp,
    playerHp,
  };
}
