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

// Generated 3:2 choice masters are registered here in stable art-key order.
// The audit remains the source of truth for incomplete later category batches.
export const CHOICE_ART = {
  "morning_patrol--observe": { src: "assets/images/choices/morning_patrol--observe.webp", alt: "調查現場：記住監視器死角與警方動線。" },
  "morning_patrol--help": { src: "assets/images/choices/morning_patrol--help.webp", alt: "收買清潔工：讓關鍵證物在警方抵達前消失。" },
  "public_terminal--search": { src: "assets/images/choices/public_terminal--search.webp", alt: "買下紀錄：找出那輛神祕黑色休旅車。" },
  "public_terminal--wipe": { src: "assets/images/choices/public_terminal--wipe.webp", alt: "刪除車牌：先清掉自己人的犯罪足跡。" },
  "alley_contact--trade": { src: "assets/images/choices/alley_contact--trade.webp", alt: "替他還債：買下一個忠誠但麻煩的耳目。" },
  "alley_contact--question": { src: "assets/images/choices/alley_contact--question.webp", alt: "拆穿謊話：逼他說出真正的車牌與時間。" },
  "signal--trace": { src: "assets/images/choices/signal--trace.webp", alt: "追查來電：請電信公司內鬼定位公用電話。" },
  "signal--listen": { src: "assets/images/choices/signal--listen.webp", alt: "讓他說完：阿哲只說：『那筆錢從來不在車上。』" },
  "street_doc--assist": { src: "assets/images/choices/street_doc--assist.webp", alt: "幫忙修車：花一點體力協助若琳處理積壓工作。" },
  "street_doc--guard": { src: "assets/images/choices/street_doc--guard.webp", alt: "邀她喝咖啡：支付兩人花費，降低壓力並了解若琳的想法。" },
  "night_market--buy": { src: "assets/images/choices/night_market--buy.webp", alt: "買下帳本：花錢取得能勒索半座城市的名單。" },
  "night_market--bargain": { src: "assets/images/choices/night_market--bargain.webp", alt: "拿祕密交換：告訴老六阿哲仍活著，逼他降價。" },
  "inventory--maintain": { src: "assets/images/choices/inventory--maintain.webp", alt: "整理武器：擦掉序號，準備最壞的一晚。" },
  "inventory--budget": { src: "assets/images/choices/inventory--budget.webp", alt: "變賣零件：換一筆不會被銀行追蹤的現金。" },
  "rooftop_radio--listen": { src: "assets/images/choices/rooftop_radio--listen.webp", alt: "監聽部署：摸清臨檢與巡邏空隙。" },
  "rooftop_radio--broadcast": { src: "assets/images/choices/rooftop_radio--broadcast.webp", alt: "製造假報案：把警力引向富人區的一場假槍戰。" },
  "power_cut--clinic": { src: "assets/images/choices/power_cut--clinic.webp", alt: "協助街坊換情報：花時間替居民處理麻煩，換取可靠消息。" },
  "power_cut--market": { src: "assets/images/choices/power_cut--market.webp", alt: "付錢向耳目打聽：快速取得情報，不欠街坊人情。" },
  "drone_scrap--salvage": { src: "assets/images/choices/drone_scrap--salvage.webp", alt: "換掉車牌：把它變成逃亡用的乾淨車。" },
  "drone_scrap--decode": { src: "assets/images/choices/drone_scrap--decode.webp", alt: "破解行車紀錄：找出誰把車開進市長官邸。" },
  "runner--hide": { src: "assets/images/choices/runner--hide.webp", alt: "藏起小凱：冒著警方搜索風險救下一名盟友。" },
  "runner--take_chip": { src: "assets/images/choices/runner--take_chip.webp", alt: "拿走鑰匙：把他丟在急診門口，自己去追那筆錢。" },
  "gym--sprint": { src: "assets/images/choices/gym--sprint.webp", alt: "進行耐力訓練：跑步與負重訓練，提高體能。" },
  "gym--dodge": { src: "assets/images/choices/gym--dodge.webp", alt: "進行反應訓練：利用拳擊沙包與閃避球訓練反應。" },
  "quiet_room--rest": { src: "assets/images/choices/quiet_room--rest.webp", alt: "睡一段時間：關掉手機，讓身體真正休息。" },
  "quiet_room--meditate": { src: "assets/images/choices/quiet_room--meditate.webp", alt: "處理傷勢：購買藥品並仔細處理身上的傷。" },
  "community_kitchen--cook": { src: "assets/images/choices/community_kitchen--cook.webp", alt: "簡單吃點東西：花少量現金快速果腹，稍微恢復狀態。" },
  "community_kitchen--organize": { src: "assets/images/choices/community_kitchen--organize.webp", alt: "吃一頓正式餐點：多花一些現金，充分恢復並練習與人交談。" },
  "industry_market--diner": { src: "assets/images/choices/industry_market--diner.webp", alt: "到餐館代班：幫忙搬貨與清理廚房，賺取少量現金。" },
  "industry_market--garage": { src: "assets/images/choices/industry_market--garage.webp", alt: "替車行送車：把客戶的車安全送到另一區，賺錢並練習駕駛。" },
  "industry_market--nightclub": { src: "assets/images/choices/industry_market--nightclub.webp", alt: "替夜店看門：處理醉客與插隊者，賺錢並鍛鍊口才。" },
  "small_job--repair": { src: "assets/images/choices/small_job--repair.webp", alt: "親自送車：賺錢並磨練駕駛，堅持不看後車廂。" },
  "small_job--accounts": { src: "assets/images/choices/small_job--accounts.webp", alt: "轉賣情報：從交車單找出幫派帳目的漏洞。" },
  "corporate_offer--accept": { src: "assets/images/choices/corporate_offer--accept.webp", alt: "收下訂金：錢足以退休，但等於替真正的兇手工作。" },
  "corporate_offer--refuse": { src: "assets/images/choices/corporate_offer--refuse.webp", alt: "把律師趕走：向街坊表明立場，也暴露自己的藏身處。" },
  "ghost_ai--erase": { src: "assets/images/choices/ghost_ai--erase.webp", alt: "買斷母帶：暫時封住消息，取得記者的檔案庫。" },
  "ghost_ai--preserve": { src: "assets/images/choices/ghost_ai--preserve.webp", alt: "交給記者：讓新聞播出，用輿論逼藏在暗處的人犯錯。" },
  "safehouse--build": { src: "assets/images/choices/safehouse--build.webp", alt: "改成安全屋：投入積蓄，建立策劃搶案的據點。" },
  "safehouse--sell": { src: "assets/images/choices/safehouse--sell.webp", alt: "賣給港口幫：拿走眼前利益，也讓幫派控制新的走私通道。" },
  "checkpoint--hack_gate": { src: "assets/images/choices/checkpoint--hack_gate.webp", alt: "偽造警車編號：讓調度中心命令路障放行。" },
  "checkpoint--lead_crowd": { src: "assets/images/choices/checkpoint--lead_crowd.webp", alt: "煽動街頭抗議：利用拆遷居民堵住警察，趁亂穿過封鎖。" },
  "ambush--fight": { src: "assets/images/choices/ambush--fight.webp", alt: "殺出包圍：和背叛你的舊搭檔並肩撐過這一分鐘。" },
  "vault--free": { src: "assets/images/choices/vault--free.webp", alt: "公開部分證據：保留核心帳本，把足以動搖市府的錄音交給全國媒體。" },
  "vault--restore": { src: "assets/images/choices/vault--restore.webp", alt: "先帶錢救人：拿走能救出若琳的現金，暫時保留真正證據。" },
  "vault--destroy": { src: "assets/images/choices/vault--destroy.webp", alt: "炸掉警長的金庫：摧毀贓款與追兵，但阿哲帶著核心帳本逃出火場。" },
  "rumor--call": { src: "assets/images/choices/rumor--call.webp", alt: "打進直播：用一句話讓全城開始懷疑官方版本。" },
  "rumor--monitor": { src: "assets/images/choices/rumor--monitor.webp", alt: "追查節目金流：找出名嘴、警長和開發商之間的付款。" },
  "clinic_supplies--buyback": { src: "assets/images/choices/clinic_supplies--buyback.webp", alt: "付錢找律師：暫時保人出來，但這筆錢會留下痕跡。" },
  "clinic_supplies--forge": { src: "assets/images/choices/clinic_supplies--forge.webp", alt: "偽造釋放令：侵入法院系統，在警長發現前把人領走。" },
  "gang_toll--pay": { src: "assets/images/choices/gang_toll--pay.webp", alt: "練習精準操控：支付場地費，在封閉區域練習倒車、甩尾與窄巷轉向。" },
  "gang_toll--challenge": { src: "assets/images/choices/gang_toll--challenge.webp", alt: "進行街頭追逐演練：和小凱在真實車流中比賽，風險更高。" },
  "shooting_range--range": { src: "assets/images/choices/shooting_range--range.webp", alt: "在合法靶場練習：穩定提升槍法與觀察，不增加警方戒備。" },
  "shooting_range--field": { src: "assets/images/choices/shooting_range--field.webp", alt: "到郊外進行實戰射擊：用移動標靶練習快速射擊，效果更好但容易引來注意。" },
  "nightlife--coffee": { src: "assets/images/choices/nightlife--coffee.webp", alt: "到咖啡館坐坐：安靜休息並觀察往來客人。" },
  "nightlife--bar": { src: "assets/images/choices/nightlife--bar.webp", alt: "到酒吧喝一杯：大幅降低壓力並提升口才，但會增加疲勞。" },
  "network_storm--shield": { src: "assets/images/choices/network_storm--shield.webp", alt: "劫持直播：把追車畫面切成高萬城收賄的錄影。" },
  "network_storm--harvest": { src: "assets/images/choices/network_storm--harvest.webp", alt: "利用熱度：把假消息賣給競爭電視台，趁亂收錢。" },
  "ch1_burner--verify": { src: "assets/images/choices/ch1_burner--verify.webp", alt: "潛入建管處驗證簽名：科技檢定／取得官方檔案。" },
  "ch1_burner--tail": { src: "assets/images/choices/ch1_burner--tail.webp", alt: "跟蹤議員的司機：觀察檢定／找出祕密會面地點。" },
  "ch3_escape--split": { src: "assets/images/choices/ch3_escape--split.webp", alt: "安排三條撤離路線：生意檢定／分散警方注意。" },
  "ch3_escape--together": { src: "assets/images/choices/ch3_escape--together.webp", alt: "所有人躲進同一據點：膽識檢定／保住團隊關係，但藏身風險較高。" },
  "ch3_container--crane": { src: "assets/images/choices/ch3_container--crane.webp", alt: "劫持貨櫃吊車：科技檢定／不開槍奪走伺服器。" },
  "ch3_container--convoy": { src: "assets/images/choices/ch3_container--convoy.webp", alt: "在高架橋攔截車隊：駕駛檢定／直接奪取，警方戒備增加。" },
  "ch3_broadcast--blackout": { src: "assets/images/choices/ch3_broadcast--blackout.webp", alt: "切斷城市通訊：科技檢定／取得完整黑金網路。" },
  "ch3_broadcast--inside": { src: "assets/images/choices/ch3_broadcast--inside.webp", alt: "收買市府值班員：口才檢定／低調解密，但欠下一個人情。" },
  "ch4_election--auction": { src: "assets/images/choices/ch4_election--auction.webp", alt: "讓雙方互相加價：生意檢定／取得資金與兩邊罪證。" },
  "ch4_election--people": { src: "assets/images/choices/ch4_election--people.webp", alt: "把選舉帳本交給街坊：口才檢定／提高街坊力量。" },
  "ch4_betrayal--trust": { src: "assets/images/choices/ch4_betrayal--trust.webp", alt: "相信若琳有自己的計畫：膽識檢定／不打草驚蛇。" },
  "ch4_betrayal--hunt": { src: "assets/images/choices/ch4_betrayal--hunt.webp", alt: "立刻追蹤阿哲：駕駛檢定／提前找到會面處。" },
  "ch4_truth--join": { src: "assets/images/choices/ch4_truth--join.webp", alt: "假裝加入阿哲：口才檢定／取得主密鑰位置。" },
  "ch4_truth--break": { src: "assets/images/choices/ch4_truth--break.webp", alt: "當場與阿哲決裂：膽識檢定／保住若琳並公開宣戰。" },
  "ch5_siege--signals": { src: "assets/images/choices/ch5_siege--signals.webp", alt: "重寫封鎖號誌：科技檢定／讓警方車隊互相阻塞。" },
  "ch5_siege--convoy": { src: "assets/images/choices/ch5_siege--convoy.webp", alt: "帶領街坊車隊突破：駕駛檢定／提高街坊聲望但可能受傷。" },
  "ch5_tower--service": { src: "assets/images/choices/ch5_tower--service.webp", alt: "從維修井爬上去：體能檢定／避開電子保全。" },
  "ch5_tower--identity": { src: "assets/images/choices/ch5_tower--identity.webp", alt: "冒充企業稽核員：口才檢定／從正門取得主密鑰。" },
  "ch5_finale--free": { src: "assets/images/choices/ch5_finale--free.webp", alt: "讓所有帳本公開：把權貴、警察與幫派的交易完整公開，連自己的罪也不隱瞞。" },
  "ch5_finale--restore": { src: "assets/images/choices/ch5_finale--restore.webp", alt: "奪走主密鑰並保護家人：關閉公開系統，帶若琳與同伴離開；你掌握足以讓所有勢力不敢追來的籌碼。" },
  "ch5_finale--destroy": { src: "assets/images/choices/ch5_finale--destroy.webp", alt: "摧毀主密鑰與資料中心：讓任何人都無法控制城市金流，代價是所有證據與財富一起消失。" },
  "difei_spar_event--steady": { src: "assets/images/choices/difei_spar_event--steady.webp", alt: "保持原位，讓她自己收拳：不逼近，也不把她的恐懼當成軟弱。" },
  "difei_spar_event--lower": { src: "assets/images/choices/difei_spar_event--lower.webp", alt: "放低雙手，坦白你信任她：把判斷權交還給狄菲。" },
  "difei_media_event--shield": { src: "assets/images/choices/difei_media_event--shield.webp", alt: "替她擋開鏡頭，帶她離開：先保住她喘息的空間。" },
  "difei_media_event--stand": { src: "assets/images/choices/difei_media_event--stand.webp", alt: "站在她身旁，讓她決定何時開口：不代替她回答，也不讓她獨自承受。" },
  "difei_interview_event--witness": { src: "assets/images/choices/difei_interview_event--witness.webp", alt: "留在台下，讓她說完自己的話：這一次，力量與責任都由她自己命名。" },
  "difei_interview_event--corner": { src: "assets/images/choices/difei_interview_event--corner.webp", alt: "站到她的角落，成為唯一的後援：不搶走她的舞台，只守住她回來的路。" },
};

// Event artwork is centralized here so every renderer uses the same records.
export const EVENT_ART = {
  morning_patrol:{desktop:"assets/images/event-morning_patrol-desktop.webp",mobile:"assets/images/event-morning_patrol-mobile.webp",alt:"An investigator examines chase shell casings while police seal another street."},
  public_terminal:{desktop:"assets/images/event-public_terminal-desktop.webp",mobile:"assets/images/event-public_terminal-mobile.webp",alt:"An indebted traffic clerk offers city license-plate records before transfer."},
  alley_contact:{desktop:"assets/images/event-alley_contact-desktop.webp",mobile:"assets/images/event-alley_contact-mobile.webp",alt:"A car-wash lookout reveals a body was loaded into a campaign vehicle."},
  asset_market:{desktop:"assets/images/event-asset_market-desktop.webp",mobile:"assets/images/event-asset_market-mobile.webp",alt:"Old Six presents properties, vehicles, weapons, gear, and business assets."},
  clinic_supplies:{desktop:"assets/images/event-clinic_supplies-desktop.webp",mobile:"assets/images/event-clinic_supplies-mobile.webp",alt:"A police chief detains Mira's brother and coerces him while Mira watches."},
  community_kitchen:{desktop:"assets/images/event-community_kitchen-desktop.webp",mobile:"assets/images/event-community_kitchen-mobile.webp",alt:"A traveler chooses between a simple street meal and a formal harbor dinner."},
  corporate_offer:{desktop:"assets/images/event-corporate_offer-desktop.webp",mobile:"assets/images/event-corporate_offer-mobile.webp",alt:"A developer's lawyer offers a settlement to buy the ledger and silence Azhe."},
  drone_scrap:{desktop:"assets/images/event-drone_scrap-desktop.webp",mobile:"assets/images/event-drone_scrap-mobile.webp",alt:"An unregistered police car holds blood and a city permit in its open trunk."},
  gang_toll:{desktop:"assets/images/event-gang_toll-desktop.webp",mobile:"assets/images/event-gang_toll-mobile.webp",alt:"Kael coaches precision driving and drifting before a risky street pursuit."},
  ghost_ai:{desktop:"assets/images/event-ghost_ai-desktop.webp",mobile:"assets/images/event-ghost_ai-mobile.webp",alt:"A reporter reviews unedited bombing footage of Azhe leaving an armored truck."},
  gym:{desktop:"assets/images/event-gym-desktop.webp",mobile:"assets/images/event-gym-mobile.webp",alt:"An athlete trains with a heavy bag in a waterfront gym."},
  industry_market:{desktop:"assets/images/event-industry_market-desktop.webp",mobile:"assets/images/event-industry_market-mobile.webp",alt:"A worker considers restaurant, car-delivery, and nightclub-door shifts."},
  inventory:{desktop:"assets/images/event-inventory-desktop.webp",mobile:"assets/images/event-inventory-mobile.webp",alt:"A basement crate reveals guns, fake plates, and a family surveillance photo."},
  network_storm:{desktop:"assets/images/event-network_storm-desktop.webp",mobile:"assets/images/event-network_storm-mobile.webp",alt:"Crowds livestream a citywide car chase and report the pursued car's location."},
  night_market:{desktop:"assets/images/event-night_market-desktop.webp",mobile:"assets/images/event-night_market-mobile.webp",alt:"Old Six offers a corruption ledger in a strip bar's back booth."},
  nightlife:{desktop:"assets/images/event-nightlife-desktop.webp",mobile:"assets/images/event-nightlife-mobile.webp",alt:"A weary investigator relaxes with coffee and a drink at a harbor cafe."},
  power_cut:{desktop:"assets/images/event-power_cut-desktop.webp",mobile:"assets/images/event-power_cut-mobile.webp",alt:"An investigator helps market residents while gathering street information."},
  quiet_room:{desktop:"assets/images/event-quiet_room-desktop.webp",mobile:"assets/images/event-quiet_room-mobile.webp",alt:"An exhausted person rests in a sparse room overlooking the rainy harbor."},
  rooftop_radio:{desktop:"assets/images/event-rooftop_radio-desktop.webp",mobile:"assets/images/event-rooftop_radio-mobile.webp",alt:"A modified radio carries a search order issued under a retired officer's name."},
  rumor:{desktop:"assets/images/event-rumor-desktop.webp",mobile:"assets/images/event-rumor-mobile.webp",alt:"A political host promotes a casino as a familiar voice leaks through a call."},
  safehouse:{desktop:"assets/images/event-safehouse-desktop.webp",mobile:"assets/images/event-safehouse-mobile.webp",alt:"An investigator finds a drain tunnel under Azhe's abandoned riverside bar."},
  shooting_range:{desktop:"assets/images/event-shooting_range-desktop.webp",mobile:"assets/images/event-shooting_range-mobile.webp",alt:"A careful shooter practices at a worn harbor warehouse range."},
  small_job:{desktop:"assets/images/event-small_job-desktop.webp",mobile:"assets/images/event-small_job-mobile.webp",alt:"A harbor gang hands a courier a sedan whose trunk must stay closed."},
  street_doc:{desktop:"assets/images/event-street_doc-desktop.webp",mobile:"assets/images/event-street_doc-mobile.webp",alt:"Mira meets the player in her garage beside repair tools and two coffees."},
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
