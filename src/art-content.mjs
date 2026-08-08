import { EVENTS } from "./content.mjs";
import { CHAPTER_EVENTS } from "./chapter-content.mjs";
import { DIFEI_EVENTS } from "./character-content.mjs";
import { LIFE_CARDS, LEISURE_CARDS, TRAINING_CARDS, CONTACTS, SIDE_QUESTS } from "./life-content.mjs";
import { NIGHT_CARDS } from "./night-content.mjs";
import { FACTIONS, TERRITORIES } from "./faction-content.mjs";

export function normalizeArtId(value) {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-|-$/g, "");
}

export function artKey(parentId, optionId) {
  return `${normalizeArtId(parentId)}--${normalizeArtId(optionId)}`;
}

export function cardArtIdentity(card, deckType) {
  if (!card?.id) return null;
  if (card.customDirect) return { parentId: `custom:${card.id}`, optionId: card.id, category: "custom" };
  if (deckType === "life" || deckType === "night") {
    return { parentId: `activity:${deckType}:${card.id}`, optionId: card.id, category: "daily" };
  }
  return null;
}

export function upgradeArtIdentity(category, assetId) {
  return { parentId: `upgrade:${category}`, optionId: assetId, category: "market" };
}

const FALLBACK_CATEGORIES = new Set(["default", "event", "sidequest", "daily", "market", "battle", "custom"]);
const FALLBACK_ALT = "Artwork unavailable";

// Choice mappings are deliberately empty until the generated 3:2 masters are
// added in the later art batches. Keep every path here; the audit is the
// single source of truth for what still needs to be generated.
export const CHOICE_ART = {};

// Event artwork is centralized here so every renderer uses the same records.
export const EVENT_ART = {
  morning_patrol:{desktop:"assets/images/event-morning_patrol-desktop.webp",mobile:"assets/images/event-morning_patrol-mobile.webp",alt:"A dawn patrol watches an unmarked van on a rainy harbor road."},
  public_terminal:{desktop:"assets/images/event-public_terminal-desktop.webp",mobile:"assets/images/event-public_terminal-mobile.webp",alt:"A hooded visitor uses a public terminal beneath harbor surveillance cameras."},
  alley_contact:{desktop:"assets/images/event-alley_contact-desktop.webp",mobile:"assets/images/event-alley_contact-mobile.webp",alt:"Two informants exchange a data card in a wet market alley."},
  asset_market:{desktop:"assets/images/event-asset_market-desktop.webp",mobile:"assets/images/event-asset_market-mobile.webp",alt:"A buyer inspects goods and vehicle keys at a discreet harbor market."},
  clinic_supplies:{desktop:"assets/images/event-clinic_supplies-desktop.webp",mobile:"assets/images/event-clinic_supplies-mobile.webp",alt:"A clinician checks medicine crates in a neighborhood clinic."},
  community_kitchen:{desktop:"assets/images/event-community_kitchen-desktop.webp",mobile:"assets/images/event-community_kitchen-mobile.webp",alt:"Residents serve hot meals at a crowded dockside community kitchen."},
  corporate_offer:{desktop:"assets/images/event-corporate_offer-desktop.webp",mobile:"assets/images/event-corporate_offer-mobile.webp",alt:"An executive presents a sealed offer in a harbor office."},
  drone_scrap:{desktop:"assets/images/event-drone_scrap-desktop.webp",mobile:"assets/images/event-drone_scrap-mobile.webp",alt:"A mechanic salvages parts from a crashed drone at the docks."},
  gang_toll:{desktop:"assets/images/event-gang_toll-desktop.webp",mobile:"assets/images/event-gang_toll-mobile.webp",alt:"Street mechanics face toll collectors beneath a harbor overpass."},
  ghost_ai:{desktop:"assets/images/event-ghost_ai-desktop.webp",mobile:"assets/images/event-ghost_ai-mobile.webp",alt:"An investigator examines a failing server rack in an abandoned data room."},
  gym:{desktop:"assets/images/event-gym-desktop.webp",mobile:"assets/images/event-gym-mobile.webp",alt:"An athlete trains with a heavy bag in a waterfront gym."},
  industry_market:{desktop:"assets/images/event-industry_market-desktop.webp",mobile:"assets/images/event-industry_market-mobile.webp",alt:"A broker presents business keys in a rain-dark dockside office."},
  inventory:{desktop:"assets/images/event-inventory-desktop.webp",mobile:"assets/images/event-inventory-mobile.webp",alt:"A planner inventories equipment and supplies at a safehouse workbench."},
  network_storm:{desktop:"assets/images/event-network_storm-desktop.webp",mobile:"assets/images/event-network_storm-mobile.webp",alt:"A technician stabilizes network cabinets during a citywide outage."},
  night_market:{desktop:"assets/images/event-night_market-desktop.webp",mobile:"assets/images/event-night_market-mobile.webp",alt:"A buyer receives a sealed dossier in a rainy harbor night market."},
  nightlife:{desktop:"assets/images/event-nightlife-desktop.webp",mobile:"assets/images/event-nightlife-mobile.webp",alt:"Two companions meet discreetly in an amber-lit waterfront bar."},
  power_cut:{desktop:"assets/images/event-power_cut-desktop.webp",mobile:"assets/images/event-power_cut-mobile.webp",alt:"Residents restore a breaker panel by lantern during a blackout."},
  quiet_room:{desktop:"assets/images/event-quiet_room-desktop.webp",mobile:"assets/images/event-quiet_room-mobile.webp",alt:"An exhausted person rests in a sparse room overlooking the rainy harbor."},
  rooftop_radio:{desktop:"assets/images/event-rooftop_radio-desktop.webp",mobile:"assets/images/event-rooftop_radio-mobile.webp",alt:"A radio operator listens beside antennas on a rain-swept rooftop."},
  rumor:{desktop:"assets/images/event-rumor-desktop.webp",mobile:"assets/images/event-rumor-mobile.webp",alt:"Neighbors exchange urgent whispers in a dockside tea shop."},
  safehouse:{desktop:"assets/images/event-safehouse-desktop.webp",mobile:"assets/images/event-safehouse-mobile.webp",alt:"A crew reinforces a hidden safehouse and maps escape routes."},
  shooting_range:{desktop:"assets/images/event-shooting_range-desktop.webp",mobile:"assets/images/event-shooting_range-mobile.webp",alt:"A careful shooter practices at a worn harbor warehouse range."},
  small_job:{desktop:"assets/images/event-small_job-desktop.webp",mobile:"assets/images/event-small_job-mobile.webp",alt:"A worker repairs a delivery scooter beside bookkeeping ledgers."},
  street_doc:{desktop:"assets/images/event-street_doc-desktop.webp",mobile:"assets/images/event-street_doc-mobile.webp",alt:"A neighborhood clinician wraps a patient's wrist in an improvised clinic."},
  signal:{desktop:"assets/images/event-signal-desktop.webp",mobile:"assets/images/event-signal-mobile.webp",alt:"雨中的海港公共電話正在響，玻璃上有一道難以辨認的人影"},
  runner:{desktop:"assets/images/event-runner-desktop.webp",mobile:"assets/images/event-runner-mobile.webp",alt:"受傷的年輕車手倒在雨夜港區住處門前，手中緊握一把保險箱鑰匙"},
  ch1_burner:{desktop:"assets/images/event-ch1-burner-desktop.webp",mobile:"assets/images/event-ch1-burner-mobile.webp",alt:"港區修車廠的桌上攤著金庫藍圖，黑膠帶下露出第三個簽名"},
  checkpoint:{desktop:"assets/images/event-checkpoint-desktop.webp",mobile:"assets/images/event-checkpoint-mobile.webp",alt:"雨夜跨海大橋入口被黑色車輛與路障封鎖，只留下一條狹窄通道"},
  ambush:{desktop:"assets/images/event-ambush-desktop.webp",mobile:"assets/images/event-ambush-mobile.webp",alt:"兩名男子躲在高架橋下的水泥護欄後，黑色休旅車封住雨夜道路"},
  vault:{desktop:"assets/images/event-vault-desktop.webp",mobile:"assets/images/event-vault-mobile.webp",alt:"市府地下金庫大門敞開，贓款、錄音帶、硬碟與金庫藍圖散落在潮濕地面"},
  ch3_escape:{desktop:"assets/images/event-ch3-escape-desktop.webp",mobile:"assets/images/event-ch3-escape-mobile.webp",alt:"若琳、小凱與老六在雨夜修車廠看見自己的警方監視畫面，得知三人已被全城通緝"},
  ch3_container:{desktop:"assets/images/event-ch3-container-desktop.webp",mobile:"assets/images/event-ch3-container-mobile.webp",alt:"若琳在雨夜貨櫃船上拆接離線伺服器，小凱守在貨櫃門口警戒"},
  ch3_broadcast:{desktop:"assets/images/event-ch3-broadcast-desktop.webp",mobile:"assets/images/event-ch3-broadcast-mobile.webp",alt:"若琳與老六操作緊急通訊設備，窗外港城在斷訊後只剩稀疏警示燈"},
  ch4_election:{desktop:"assets/images/event-ch4-election-desktop.webp",mobile:"assets/images/event-ch4-election-mobile.webp",alt:"建商代表與幫派中間人在未完工高樓的長桌兩側秘密競標市長選舉"},
  ch4_betrayal:{desktop:"assets/images/event-ch4-betrayal-desktop.webp",mobile:"assets/images/event-ch4-betrayal-mobile.webp",alt:"空蕩修車廠的工作檯留下車鑰匙，監視器顯示若琳自願上了阿哲的車"},
  ch4_truth:{desktop:"assets/images/event-ch4-truth-desktop.webp",mobile:"assets/images/event-ch4-truth-mobile.webp",alt:"阿哲在市政控制室展示主控鑰匙，身後的城市基礎設施路線逐一亮起"},
  ch5_siege:{desktop:"assets/images/event-ch5-siege-desktop.webp",mobile:"assets/images/event-ch5-siege-mobile.webp",alt:"若琳、小凱與老六在黎明前手動打開海港封鎖線，協助居民與證人撤離"},
  ch5_tower:{desktop:"assets/images/event-ch5-tower-desktop.webp",mobile:"assets/images/event-ch5-tower-mobile.webp",alt:"若琳與小凱進入新塔樓中沒有正式編號的狹長機械層，遠端可見密封控制庫"},
  ch5_finale:{desktop:"assets/images/event-ch5-finale-desktop.webp",mobile:"assets/images/event-ch5-finale-mobile.webp",alt:"阿哲在跨海資料中心啟動主控鑰匙，警察、幫派、企業、居民與同伴同時逼近"},
  difei_spar_event:{desktop:"assets/images/difei-spar-desktop.webp",mobile:"assets/images/difei-spar-mobile-v2.webp",alt:"狄菲在安全屋訓練角落收住最後一拳，完整露出臉與格鬥架式"},
  difei_media_event:{desktop:"assets/images/difei-media-desktop.webp",mobile:"assets/images/difei-media-mobile.webp",alt:"狄菲在雨中的舊比賽場館外被媒體包圍"},
  difei_interview_event:{desktop:"assets/images/difei-interview-desktop.webp",mobile:"assets/images/difei-interview-mobile.webp",alt:"狄菲站在空蕩拳台的聚光燈下接受公開訪問"}
};

export function eventArt(id) {
  return EVENT_ART[id] || null;
}

export function resultStatus(success) {
  if (success === true) return { label: "成功", tone: "success" };
  if (success === false) return { label: "失敗", tone: "failure" };
  return { label: "結果", tone: "neutral" };
}

export function choiceArt(parentId, optionId, category = "default") {
  const key = artKey(parentId, optionId);
  const mapped = CHOICE_ART[key];
  if (mapped) return { key, ...mapped, fallback: false };
  const fallbackCategory = FALLBACK_CATEGORIES.has(category) ? category : "default";
  return {
    key,
    src: `assets/images/fallbacks/${fallbackCategory}.webp`,
    alt: FALLBACK_ALT,
    fallback: true,
  };
}

export function choiceArtByKey(value, category) {
  const key = typeof value === "string" ? value : "";
  const mapped = CHOICE_ART[key];
  if (mapped) return { key, ...mapped, fallback: false };
  const inferredCategory = key.startsWith("battle--") || key.startsWith("faction-") || key.startsWith("territory-")
    ? "battle"
    : key.startsWith("sidequest-")
      ? "sidequest"
      : key.startsWith("activity-") || key.startsWith("night_")
        ? "daily"
        : key.startsWith("asset_market--") || key.startsWith("upgrade-")
          ? "market"
          : key.startsWith("custom-") || key.startsWith("custom_")
            ? "custom"
            : key
              ? "event"
              : "default";
  const fallbackCategory = category === undefined
    ? inferredCategory
    : FALLBACK_CATEGORIES.has(category) ? category : "default";
  return {
    key,
    src: `assets/images/fallbacks/${fallbackCategory}.webp`,
    alt: FALLBACK_ALT,
    fallback: true,
  };
}

const choiceRequirement = (parentId, option, category) => {
  const key = artKey(parentId, option.id);
  return {
    kind: "choice",
    key,
    parentId,
    optionId: option.id,
    category,
    paths: CHOICE_ART[key] ? [CHOICE_ART[key].src] : [],
  };
};

const eventRequirements = (events, category) => events.map((event) => {
  const art = eventArt(event.id);
  return {
    kind: "event",
    key: normalizeArtId(event.id),
    parentId: event.id,
    category,
    paths: art ? [art.desktop, art.mobile] : [],
  };
});

const eventChoiceRequirements = (events, categoryFor) => events.flatMap((event) =>
  (event.choices || []).map((option) => choiceRequirement(event.id, option, categoryFor(event))),
);

const directActivityRequirements = (collection, activities, category) => activities.map((activity) =>
  choiceRequirement(`activity:${collection}:${activity.id}`, activity, category),
);

const sideQuestRequirements = SIDE_QUESTS.flatMap((quest) => quest.nodes.flatMap((node, nodeIndex) =>
  node.choices.map((option) => choiceRequirement(`sidequest:${quest.id}:${nodeIndex}`, option, "sidequest")),
));

const factionRequirements = FACTIONS.map((faction) =>
  choiceRequirement(`faction:${faction.id}`, { id: "challenge" }, "battle"),
);

const territoryRequirements = TERRITORIES.flatMap((territory) => [
  choiceRequirement(`territory:${territory.id}`, { id: "capture" }, "battle"),
  choiceRequirement(`territory:${territory.id}`, { id: "fortify" }, "battle"),
]);

const battleRequirements = ["attack", "brawl", "hack", "guard", "flee"].map((id) =>
  choiceRequirement("battle", { id }, "battle"),
);

export const BUILTIN_ART_REQUIREMENTS = [
  ...eventRequirements(EVENTS, "event"),
  ...eventRequirements(CHAPTER_EVENTS, "mainline"),
  ...eventRequirements(DIFEI_EVENTS, "character"),
  ...eventChoiceRequirements(EVENTS, (event) => event.id === "asset_market" ? "market" : event.main ? "mainline" : "event"),
  ...eventChoiceRequirements(CHAPTER_EVENTS, () => "mainline"),
  ...eventChoiceRequirements(DIFEI_EVENTS, () => "character"),
  ...directActivityRequirements("life", LIFE_CARDS, "daily"),
  ...directActivityRequirements("leisure", LEISURE_CARDS, "daily"),
  ...directActivityRequirements("training", TRAINING_CARDS, "daily"),
  ...directActivityRequirements("contacts", CONTACTS, "daily"),
  ...directActivityRequirements("night", NIGHT_CARDS, "night"),
  ...sideQuestRequirements,
  ...factionRequirements,
  ...territoryRequirements,
  ...battleRequirements,
].sort((left, right) => left.key.localeCompare(right.key));
