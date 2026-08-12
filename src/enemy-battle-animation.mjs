import { factionById } from "./faction-content.mjs?v=24";

const enemyFrame = (archetype, frame) => `assets/images/animations/enemy/${archetype}-${frame}.webp`;

const defineArchetype = (id, label, description) => Object.freeze({
  id,
  label,
  description,
  frames: Object.freeze({
    ready: enemyFrame(id, "ready"),
    action: enemyFrame(id, "action"),
    hit: enemyFrame(id, "hit"),
    exit: enemyFrame(id, "exit"),
  }),
});

export const ENEMY_ARCHETYPES = Object.freeze({
  bruiser: defineArchetype("bruiser", "近戰打手", "壓近距離，以拳腳和人數製造壓力"),
  gunner: defineArchetype("gunner", "街頭槍手", "依靠短槍、掩護與快速射擊控制距離"),
  heavy: defineArchetype("heavy", "重裝執行者", "持霰彈槍和護甲正面推進，承受較多火力"),
  tech: defineArchetype("tech", "科技干擾手", "使用場控裝置與電子干擾削弱你的隊伍"),
});

export const FACTION_ENEMY_ARCHETYPE = Object.freeze({
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

const EVENT_ARCHETYPE_RULES = Object.freeze([
  Object.freeze({ id: "bruiser", pattern: /討債|拳館|擂台|持棍|綁架|灰狼/ }),
  Object.freeze({ id: "tech", pattern: /死訊|直播|科技|轉播|駭/ }),
  Object.freeze({ id: "heavy", pattern: /武裝守衛|聯合武裝|攔截小隊|守衛隊|金庫|鐵騎|清道夫|金環/ }),
]);

const NEUTRAL_ACCENTS = Object.freeze({ bruiser: "#dc575f", gunner: "#74c9dc", heavy: "#d88745", tech: "#66d98b" });

function eventArchetype(enemyName) {
  return EVENT_ARCHETYPE_RULES.find(rule => rule.pattern.test(String(enemyName || "")))?.id || "gunner";
}

export function enemyBattleAnimationFor(factionId, enemyName = "") {
  const faction = factionById(factionId);
  const archetypeId = faction ? FACTION_ENEMY_ARCHETYPE[faction.id] : eventArchetype(enemyName);
  const archetype = ENEMY_ARCHETYPES[archetypeId];
  return Object.freeze({
    ...archetype,
    factionId: faction?.id || null,
    factionName: faction?.name || "敵方武裝人員",
    accent: faction?.color || NEUTRAL_ACCENTS[archetypeId],
  });
}

export function enemyFrameForPhase(phase) {
  if (["shot", "kick", "hold"].includes(phase)) return "hit";
  if (phase === "enemy-counter") return "action";
  if (["enemy-defeat", "enemy-break", "enemy-retreat"].includes(phase)) return "exit";
  return "ready";
}
