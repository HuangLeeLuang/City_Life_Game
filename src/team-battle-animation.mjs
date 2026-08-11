const supportFrame = id => `assets/images/animations/team/${id}-support.webp`;

function supportAnimation(actorId, name, action) {
  return Object.freeze({
    actorId,
    label: `${name}／${action}`,
    src: supportFrame(actorId),
    timeline: Object.freeze([
      Object.freeze({ phase: "enter", duration: 220, report: `${name}進入支援位置。` }),
      Object.freeze({ phase: "act", duration: 320, report: `${name}開始${action}。` }),
      Object.freeze({ phase: "hold", duration: 380, report: `${action}生效。` }),
      Object.freeze({ phase: "exit", duration: 240, report: `${name}完成支援並退回隊形。` }),
    ]),
  });
}

export const TEAM_SUPPORT_ANIMATIONS = Object.freeze({
  chenglan: supportAnimation("chenglan", "程嵐", "訊號破解"),
  steel_jaw: supportAnimation("steel_jaw", "鋼牙", "護隊突破"),
  grey_fox: supportAnimation("grey_fox", "灰狐", "壓制射擊"),
  ghost: supportAnimation("ghost", "幽靈", "戰場駭入"),
  spark: supportAnimation("spark", "火花", "機動掩護"),
  dove: supportAnimation("dove", "白鴿", "戰地急救"),
  eagle_eye: supportAnimation("eagle_eye", "鷹眼", "標定目標"),
  counsel: supportAnimation("counsel", "律師", "交涉撤離線"),
  ledger: supportAnimation("ledger", "帳房", "緊急補給"),
});

export function teamSupportAnimationFor(actorId) {
  return TEAM_SUPPORT_ANIMATIONS[actorId] || null;
}
