import { EVENTS, STAGES } from "./content.mjs?v=23";
import { LIFE_CARDS, LEISURE_CARDS, TRAINING_CARDS, CONTACTS, JOBS, SIDE_QUESTS } from "./life-content.mjs?v=23";
import { NIGHT_CARDS } from "./night-content.mjs?v=23";
import { CHAPTER_EVENTS, OFFICIAL_MAINLINE_IDS, officialMainlineMeta, chapterForProgress } from "./chapter-content.mjs?v=24";
import { FACTIONS, TERRITORIES, factionById, territoryById } from "./faction-content.mjs?v=23";
import { TEAM_MEMBERS, TEAM_LIMIT, teamMemberById } from "./team-content.mjs?v=24";
import { CONTACT_PASSIVES, DIFEI_ACTIVITIES, CHENGLAN_ACTIVITIES, DIFEI_EVENTS, characterEventById } from "./character-content.mjs?v=24";
import { artKey, cardArtIdentity, upgradeArtIdentity } from "./art-content.mjs?v=1";

const LIMITS = { health:[0,100], fatigue:[0,100], stress:[0,100], resource:[0,999], ability:[0,100], relation:[-100,100], world:[0,100] };
const ASSET_BASE_PRICES={property_riverside_flat:40,property_suburban_safehouse:28,vehicle_grey_sport:22,vehicle_black_suv:18,weapon_sawed_shotgun:14,weapon_silenced_pistol:18,luxury_gold_watch:10,luxury_black_bag:12,industry_bay_diner:18,industry_east_garage:28,industry_blue_nightclub:36,industry_old_apartments:50};
const CHARACTER_IDS=[...new Set([...CONTACTS.map(contact=>contact.id),...TEAM_MEMBERS.map(member=>member.id)])];
export const CITY_STATUSES=[
  {id:"quiet_day",name:"平靜的一天",description:"休養效果提高。",recoveryBonus:2},
  {id:"police_sweep",name:"警方掃蕩",description:"敵人傷害提高，地盤收入降低。",enemyDamageBonus:2,turfIncomeRate:.75},
  {id:"black_market",name:"黑市繁榮",description:"戰鬥報酬提高，產業收入略降。",battleRewardRate:1.15,industryIncomeRate:.9},
  {id:"gang_war",name:"幫派火拼",description:"戰鬥報酬與敵人傷害同時提高。",battleRewardRate:1.2,enemyDamageBonus:1},
  {id:"city_festival",name:"城市慶典",description:"產業收入與正向人物關係提高。",industryIncomeRate:1.15,relationBonus:1},
  {id:"harbor_storm",name:"暴雨封港",description:"地盤收入減半，但休養效果提高。",turfIncomeRate:.5,recoveryBonus:1}
];
export const cityStatusById=id=>CITY_STATUSES.find(status=>status.id===id)||CITY_STATUSES[0];
const initialCityStatusIndex=seed=>(seed>>>0)%CITY_STATUSES.length;
export const ENEMY_INTENTS=[
  {id:"assault",name:"猛攻",description:"本回合反擊傷害提高。"},
  {id:"defend",name:"防守",description:"本回合受到的傷害降低。"},
  {id:"reinforce",name:"增援",description:"若未被擊敗，恢復少量敵方戰力。"},
  {id:"disrupt",name:"干擾",description:"反擊同時提高你的精神壓力。"}
];
export const enemyIntentById=id=>ENEMY_INTENTS.find(intent=>intent.id===id)||ENEMY_INTENTS[0];
function rollEnemyIntent(state){const roll=rngNext(state.seed);state.seed=roll.seed;return ENEMY_INTENTS[Math.floor(roll.value*ENEMY_INTENTS.length)].id;}
export class GameError extends Error { constructor(code,message){ super(message); this.code=code; } }
export function rngNext(seed){ let x=seed|0; x^=x<<13; x^=x>>>17; x^=x<<5; return {seed:x>>>0,value:(x>>>0)/4294967296}; }
const clone = value => structuredClone(value);
function resultRecord(parentId,optionId,data){return {...data,artKey:artKey(parentId,optionId)};}
function withResultArt(state,parentId,optionId){
  if(state.lastResult&&(state.phase==="result"||state.phase==="ending"))state.lastResult=resultRecord(parentId,optionId,state.lastResult);
  return state;
}
const clamp = (value,[min,max]) => Math.max(min,Math.min(max,value));
const freshFactions=()=>Object.fromEntries(FACTIONS.map(faction=>[faction.id,{hostility:faction.baseHostility,respect:0,wins:0,losses:0}]));
const freshTerritories=()=>Object.fromEntries(TERRITORIES.map(territory=>[territory.id,{owner:territory.factionId,level:0,capturedDay:null}]));
export const controlledTerritories=state=>TERRITORIES.filter(territory=>state.territories?.[territory.id]?.owner==="player");
export const territoryIncome=state=>controlledTerritories(state).reduce((sum,territory)=>sum+(state.pendingRetaliation?.territoryId===territory.id?0:territory.income+(state.territories[territory.id].level||0)*2),0);
export const activeTeamMembers=state=>(state.team?.active||[]).map(id=>{const roster=state.team?.roster?.find(item=>item.id===id),definition=teamMemberById(id);return roster&&definition?{...definition,level:state.characterLevels?.[id]||roster.level||1}:null;}).filter(Boolean);
export function teamBonuses(state){
  const totals={attack:0,brawl:0,hack:0,flee:0,hp:0,armor:0,medical:0,reward:0,income:0,weapon:0};
  for(const member of activeTeamMembers(state)){const scale=1+Math.max(0,(member.level||1)-1)*.25;for(const [key,value] of Object.entries(member.bonuses||{}))totals[key]=(totals[key]||0)+Math.round(value*scale);}
  return totals;
}
export function assetBonuses(state){
  const totals={attack:0,brawl:0,hack:0,flee:0,hp:0,armor:0,medical:0,reward:0,income:0,weapon:0,securityReduction:0};
  for(const asset of Object.values(state.assets||{}).flat()){const level=asset.level||0,scale=1+level*.2;for(const [key,value] of Object.entries(asset.bonuses||{}))totals[key]=(totals[key]||0)+Math.round(value*scale);if(asset.armor)totals.armor+=Math.round(asset.armor*scale);if(asset.combatPower)totals.weapon+=Math.round(asset.combatPower*scale);}
  return totals;
}
export function contactBonuses(state){
  const totals={attack:0,brawl:0,hack:0,flee:0,hp:0,armor:0,medical:0,reward:0,income:0,weapon:0,securityReduction:0};
  for(const id of state.knownContacts||[]){const base=CONTACT_PASSIVES[id];if(!base)continue;const scale=1+Math.max(0,(state.characterLevels?.[id]||1)-1)*.25;for(const [key,value] of Object.entries(base))totals[key]=(totals[key]||0)+Math.round(value*scale);}
  return totals;
}
export const combinedBonuses=state=>{const sources=[teamBonuses(state),assetBonuses(state),contactBonuses(state)],keys=new Set(sources.flatMap(source=>Object.keys(source)));return Object.fromEntries([...keys].map(key=>[key,sources.reduce((sum,source)=>sum+(source[key]||0),0)]));};
export const crewPower=state=>(state.crew?.members||0)*2+Math.floor((state.crew?.morale||0)/10)+controlledTerritories(state).length*3+activeTeamMembers(state).reduce((sum,member)=>sum+2+(member.level||1),0);

export function newGame(gender="不公開",seed=2026){
  const cityStatusIndex=initialCityStatusIndex(seed);
  return {
    version:2, contentVersion:"0.9.0-unlimited-story", seed:seed>>>0, gender, day:1, stage:0, chapter:1, phase:"cards", candidates:[], selected:null, battle:null, finished:false,postgame:false,endingShown:false,chapterTransition:null,cityStatusIndex,cityStatus:CITY_STATUSES[cityStatusIndex].id,
    player:{health:100,fatigue:10,stress:8,resource:24,abilities:{physique:28,reflex:28,hacking:28,engineering:28,social:28,perception:28,will:28,management:28}},
    assets:{properties:[],vehicles:[],weapons:[],items:[],luxuries:[],industries:[]}, buffs:[], activeSideQuest:null, completedSideQuests:[], metContacts:{},
    factions:freshFactions(),territories:freshTerritories(),crew:{members:2,morale:50},team:{roster:[{id:"difei",level:1,recruitedDay:1}],active:["difei"]},pendingRetaliation:null,
    relations:Object.fromEntries(CHARACTER_IDS.map(id=>[id,id==="difei"?35:id==="chenglan"?20:0])),characterLevels:Object.fromEntries(CHARACTER_IDS.map(id=>[id,1])),knownContacts:["mira","kael","zero","difei"],unlockedCharacterEvents:[],completedCharacterEvents:[],selectedCharacterEvent:null,
    world:{corporate:55,gangs:45,security:58,people:42,ai:35}, flags:{}, seen:{}, cooldown:{}, customCards:[], cardOverrides:{}, unlockedSideQuests:[], log:[], sequence:0
  };
}

export const nextOfficialMainlineId=state=>OFFICIAL_MAINLINE_IDS.find(id=>!state.seen?.[id])||null;
function pendingMainlineEvent(state,events){
  const officialId=nextOfficialMainlineId(state);
  if(officialId)return events.find(event=>event.id===officialId)||null;
  return (state.customCards||[]).find(card=>card.deck==="main"&&card.enabled!==false&&!state.seen?.[card.id])||null;
}
function shuffledWeighted(state,list){
  const scored=list.map(item=>{ const n=rngNext(state.seed); state.seed=n.seed; return {item,score:-Math.log(Math.max(n.value,1e-9))/(item.weight||1)}; });
  return scored.sort((a,b)=>a.score-b.score).map(x=>x.item);
}
export function generateCards(input){
  const state=clone(input);
  state.chapter=chapterForProgress(state);
  const custom=(state.customCards||[]).filter(card=>card.enabled!==false);
  const storyEvents=[...EVENTS,...CHAPTER_EVENTS,...custom.filter(card=>card.deck==="main")].map(event=>{const meta=officialMainlineMeta(event.id);return meta?{...event,chapter:meta.chapter,storyPosition:meta.position}:event;});
  const morningMain=state.stage===0?pendingMainlineEvent(state,storyEvents):null;
  {
    const sourceStage=state.stage===0?1:state.stage;
    let eligible;
    if(sourceStage===1) eligible=[...LIFE_CARDS.filter(card=>card.id!=="life_purchase"||marketAvailable(state)),...custom.filter(card=>card.deck==="life")];
    else eligible=[...NIGHT_CARDS.filter(card=>nightUnlocked(state,card)),...custom.filter(card=>card.deck==="night")];
    state.deckType=sourceStage===1?(state.stage===0&&morningMain?"morning":"life"):"night";
    let selected=shuffledWeighted(state,eligible).slice(0,state.stage===0&&morningMain?4:5);
    if(sourceStage===1){
      const reserved=["life_conflict"];
      if(state.activeSideQuest) reserved.push("life_sidequest");
      if(state.player.resource<10) reserved.push("life_work");
      if(state.player.health<50||state.player.fatigue>65||state.player.stress>65) reserved.push("life_leisure");
      const target=state.stage===0&&morningMain?4:5;
      const guaranteed=[...new Set(reserved)].map(id=>LIFE_CARDS.find(card=>card.id===id)).filter(Boolean).slice(0,target);
      selected=[...selected.filter(card=>!guaranteed.some(item=>item.id===card.id)).slice(0,target-guaranteed.length),...guaranteed];
    }else{
      const force=[NIGHT_CARDS.find(card=>card.id==="night_shelter")];
      const recovery=eligible.filter(card=>card.kind==="recovery"&&card.id!=="night_shelter");
      if(state.player.health<35) force.push(NIGHT_CARDS.find(card=>card.id==="night_clinic"));
      else if(state.player.fatigue>70) force.push(NIGHT_CARDS.find(card=>card.id==="night_hotel"));
      else if(state.player.stress>70) force.push(NIGHT_CARDS.find(card=>card.id==="night_movie"));
      else force.push(shuffledWeighted(state,recovery)[0]);
      const guaranteed=[...new Map(force.filter(Boolean).map(card=>[card.id,card])).values()];
      selected=[...selected.filter(card=>!guaranteed.some(item=>item.id===card.id)).slice(0,5-guaranteed.length),...guaranteed];
    }
    state.candidates=[...(morningMain?[morningMain.id]:[]),...selected.map(e=>e.id)];
    if(state.candidates.length<5) throw new GameError("INSUFFICIENT_CARDS",`第 ${state.day} 天「${STAGES[state.stage]}」只有 ${state.candidates.length} 張合法卡片`);
  }
  state.phase="cards"; state.selected=null;
  return state;
}
function nightUnlocked(state,card){
  if(card.unlockDay&&state.day<card.unlockDay)return false;
  if(card.unlockCash&&state.player.resource<card.unlockCash)return false;
  if(card.requires==="property"&&!state.assets.properties.length)return false;
  if(card.requires==="industry"&&!state.assets.industries.length)return false;
  return true;
}
function marketAvailable(state){
  const choices=getEvent("asset_market").choices.filter(choice=>choice.effects.some(effect=>effect.type==="asset.grant"));
  if(choices.some(choice=>choice.cost<=state.player.resource&&!choice.effects.some(effect=>effect.type==="asset.grant"&&state.assets[effect.category].some(asset=>asset.id===effect.assetId))))return true;
  return Object.values(state.assets).flat().some(asset=>state.player.resource>=Math.max(1,Math.ceil((asset.basePrice||ASSET_BASE_PRICES[asset.id]||1)*.25*((asset.level||0)+1))));
}
export function getEvent(id,state=null){ const found=[...EVENTS,...CHAPTER_EVENTS,...LIFE_CARDS,...NIGHT_CARDS,...(state?.customCards||[])].find(e=>e.id===id); if(!found) throw new GameError("UNKNOWN_EVENT",`未知事件：${id}`); return state?.cardOverrides?.[id]?{...found,...state.cardOverrides[id],id:found.id}:found; }
const MARKET_CATEGORY_ORDER=["weapons","items","vehicles","properties","industries","luxuries"];
const marketLineKey=line=>line?.kind==="purchase"?`purchase:${line.choiceId}`:`upgrade:${line?.category}:${line?.assetId}`;
const assetUpgradeChance=level=>level===0?100:level===1?90:level===2?80:Math.max(5,80-(level-2)*5);
const MARKET_EFFECT_LABELS={ability:{physique:"體能",reflex:"槍法",hacking:"科技",engineering:"駕駛",social:"口才",perception:"觀察",will:"膽識",management:"生意"},stat:{health:"健康",fatigue:"疲勞",stress:"精神"},world:{corporate:"企業勢力",gangs:"幫派勢力",security:"治安",people:"街坊",ai:"AI 滲透"}};
function invalidMarketChoice(choice){throw new GameError("INVALID_MARKET_CHOICE",`市場商品資料無效：${choice?.id||"未知商品"}`);}
function marketChoices(event){if(!Array.isArray(event?.choices))invalidMarketChoice();return event.choices;}
function marketPurchaseChoice(choices,state,choiceId){
  const choice=choices.find(item=>item?.id===choiceId);
  if(!choice)throw new GameError("UNKNOWN_ACTIVITY",`未知市場商品：${choiceId}`);
  if(!Number.isFinite(choice.cost)||choice.cost<0||!Array.isArray(choice.effects))invalidMarketChoice(choice);
  const grant=choice.effects.find(effect=>effect?.type==="asset.grant");
  if(!grant||typeof grant.category!=="string"||!Array.isArray(state.assets?.[grant.category])||typeof grant.assetId!=="string"||!grant.assetId||typeof grant.name!=="string"||!grant.name)invalidMarketChoice(choice);
  return {choice,grant};
}
function marketAppliedEffects(before,state,effects){
  const logs=state.log.slice(before.log.length);
  return effects.filter(effect=>["ability.add","stat.add","world.add"].includes(effect.type)).map(effect=>{
    const group=effect.type.split(".")[0],log=logs.find(entry=>entry.type===effect.type&&entry.target===effect.key);
    if(!log)throw new GameError("TRANSACTION_FAILED",`市場效果未套用：${effect.key}`);
    let adjusted=effect.value,statusAdjustment=0,statusName="";
    if(effect.type==="stat.add"){
      const status=cityStatusById(before.cityStatus),isRecovery=(effect.key==="health"&&effect.value>0)||(["fatigue","stress"].includes(effect.key)&&effect.value<0);
      statusAdjustment=isRecovery?(status.recoveryBonus||0):0;
      adjusted=effect.value>0?effect.value+statusAdjustment:effect.value-statusAdjustment;
      statusName=statusAdjustment?status.name:"";
    }else if(effect.type==="world.add"){
      const reduction=effect.key==="security"&&effect.value>0?(combinedBonuses(before).securityReduction||0):0;
      adjusted=effect.value>0?Math.max(0,effect.value-reduction):effect.value;
    }
    return {type:effect.type,key:effect.key,requested:effect.value,adjusted,before:log.before,after:log.after,delta:log.delta,clamped:log.delta!==adjusted,...(statusAdjustment?{statusAdjustment}:{}),...(statusName?{statusName}:{}),label:MARKET_EFFECT_LABELS[group][effect.key]||effect.key};
  });
}
function marketAppliedSummary(effects){return effects.map(effect=>`${effect.label} ${effect.delta>=0?"+":""}${effect.delta}（${effect.before}→${effect.after}${effect.statusAdjustment?`，${effect.statusName} +${effect.statusAdjustment}`:""}${effect.clamped?"，已限制":""}）`).join("；");}
export function marketUpgradeQuote(state,category,assetId){
  const asset=state.assets?.[category]?.find(item=>item.id===assetId);
  if(!asset) throw new GameError("UNKNOWN_ASSET",`找不到資產：${assetId}`);
  const level=asset.level||0;
  return {level,cost:Math.max(1,Math.ceil((asset.basePrice||1)*.25*(level+1))),chance:assetUpgradeChance(level)};
}
export function quoteMarketCart(input,lines){
  if(!Array.isArray(lines))throw new GameError("INVALID_MARKET_LINE","購物車包含未知項目");
  const choices=marketChoices(getEvent("asset_market",input));
  let total=0;
  for(const line of lines){
    if(line?.kind==="purchase") total+=marketPurchaseChoice(choices,input,line.choiceId).choice.cost;
    else if(line?.kind==="upgrade") total+=marketUpgradeQuote(input,line.category,line.assetId).cost;
    else throw new GameError("INVALID_MARKET_LINE","購物車包含未知項目");
  }
  return {count:lines.length,total,remaining:input.player.resource-total,affordable:total<=input.player.resource};
}
export function checkoutMarket(input,lines){
  if(input.phase!=="activity"||input.activityKind!=="purchase") throw new GameError("WRONG_PHASE","只能在城市市場結帳");
  if(!Array.isArray(lines)||!lines.length) throw new GameError("EMPTY_CART","購物車目前是空的");
  const event=getEvent("asset_market",input),choices=marketChoices(event),keys=lines.map(marketLineKey);
  if(new Set(keys).size!==keys.length) throw new GameError("DUPLICATE_MARKET_LINE","購物車包含重複項目");
  if(lines.some(line=>!line||typeof line!=="object"||!["purchase","upgrade"].includes(line.kind)))throw new GameError("INVALID_MARKET_LINE","購物車包含未知項目");
  const purchases=[],upgrades=[],purchasedAssetIds=new Set();
  for(const line of lines){
    if(line.kind==="purchase"){
      const {choice,grant}=marketPurchaseChoice(choices,input,line.choiceId);
      if(input.assets[grant.category].some(asset=>asset.id===grant.assetId)) throw new GameError("ASSET_OWNED",`已經持有：${grant.name}`);
      if(purchasedAssetIds.has(grant.assetId)) throw new GameError("DUPLICATE_MARKET_LINE","購物車包含重複項目");
      purchasedAssetIds.add(grant.assetId);
      purchases.push({choice,grant});
    }
  }
  if(lines.some(line=>line.kind==="upgrade"&&purchasedAssetIds.has(line.assetId))) throw new GameError("NEW_ASSET_UPGRADE","新購資產不能在同一筆交易升級");
  for(const line of lines){
    if(line.kind==="purchase")continue;
    if(line.kind!=="upgrade") throw new GameError("INVALID_MARKET_LINE","購物車包含未知項目");
    const quote=marketUpgradeQuote(input,line.category,line.assetId);
    if(quote.level!==line.expectedLevel) throw new GameError("STALE_UPGRADE",`資產等級已變更：${line.assetId}`);
    upgrades.push({...line,...quote});
  }
  const quote=quoteMarketCart(input,lines);
  if(!quote.affordable) throw new GameError("INSUFFICIENT_CASH",`結帳需要現金 ${quote.total}`);
  let state=structuredClone(input);
  const marketOrder=choice=>{const grant=choice.effects.find(effect=>effect.type==="asset.grant");return MARKET_CATEGORY_ORDER.indexOf(grant.category)*1000+event.choices.indexOf(choice);};
  const results=[];
  for(const {choice} of purchases.sort((left,right)=>marketOrder(left.choice)-marketOrder(right.choice))){
    const effects=choice.effects.map(effect=>effect.type==="asset.grant"?{...effect,basePrice:choice.cost}:effect);
    const before=state;
    state=applyEffects(state,effects,`market:checkout:${choice.id}`);
    const appliedEffects=marketAppliedEffects(before,state,effects);
    results.push({kind:"purchase",id:choice.id,label:choice.text,detail:choice.detail,cost:choice.cost,success:true,appliedEffects,appliedSummary:marketAppliedSummary(appliedEffects)});
  }
  for(const line of upgrades.sort((left,right)=>`${left.category}:${left.assetId}`.localeCompare(`${right.category}:${right.assetId}`))){
    state=applyEffects(state,[{type:"resource.add",value:-line.cost}],`market:upgrade:${line.assetId}`);
    const roll=rngNext(state.seed);state.seed=roll.seed;
    const success=roll.value*100<line.chance;
    state=applyEffects(state,[{type:"asset.upgrade",category:line.category,assetId:line.assetId,success}],`market:upgrade:${line.assetId}`);
    results.push({kind:"upgrade",id:line.assetId,label:state.assets[line.category].find(asset=>asset.id===line.assetId).name,detail:success?`升級至 +${line.level+1}`:`升級失敗，維持 +${line.level}`,cost:line.cost,success,fromLevel:line.level,toLevel:success?line.level+1:line.level});
  }
  state.phase="result";
  state.lastResult={title:"市場結帳",choice:`一次結帳 ${results.length} 項`,success:true,marketLines:results,totalCost:quote.total,remainingCash:state.player.resource,summary:`本次共支出現金 ${quote.total}，剩餘 ${state.player.resource}。`};
  return withResultArt(state,"asset_market","checkout");
}
function logEffect(state,source,type,target,before,after,delta){ state.log.push({sequence:++state.sequence,day:state.day,stage:state.stage,source,type,target,before,after,delta}); }
function add(state,container,key,value,limit,source,type){ const before=container[key]??0; const after=clamp(before+value,limit); container[key]=after; logEffect(state,source,type,key,before,after,after-before); }
export function applyEffects(input,effects,source="system"){
  const state=clone(input);
  try{
    for(const effect of effects){
      switch(effect.type){
        case "ability.add": add(state,state.player.abilities,effect.key,effect.value,LIMITS.ability,source,effect.type); break;
        case "stat.add": {const status=cityStatusById(state.cityStatus),isRecovery=(effect.key==="health"&&effect.value>0)||(["fatigue","stress"].includes(effect.key)&&effect.value<0),bonus=isRecovery?(status.recoveryBonus||0):0,adjusted=effect.value>0?effect.value+bonus:effect.value-bonus;add(state,state.player,effect.key,adjusted,LIMITS[effect.key],source,effect.type);break;}
        case "resource.add": add(state,state.player,"resource",effect.value,LIMITS.resource,source,effect.type); break;
        case "relation.add": {const bonus=effect.value>0?(cityStatusById(state.cityStatus).relationBonus||0):0;add(state,state.relations,effect.key,effect.value+bonus,LIMITS.relation,source,effect.type);break;}
        case "world.add": {const reduction=effect.key==="security"&&effect.value>0?(combinedBonuses(state).securityReduction||0):0,adjusted=effect.value>0?Math.max(0,effect.value-reduction):effect.value;add(state,state.world,effect.key,adjusted,LIMITS.world,source,effect.type);break;}
        case "flag.set": { const before=state.flags[effect.key]; state.flags[effect.key]=effect.value; logEffect(state,source,effect.type,effect.key,before,effect.value,null); break; }
        case "buff.add": { const incoming={...effect,remaining:effect.duration}; const current=state.buffs.find(buff=>buff.id===effect.id); const before=current?`${current.label} ${current.value}/${current.remaining}`:null; if(!current) state.buffs.push(incoming); else if(effect.value>=current.value) Object.assign(current,incoming); logEffect(state,source,effect.type,effect.id,before,`${incoming.label} ${incoming.value}/${incoming.duration}`,null); break; }
        case "asset.grant": { const list=state.assets?.[effect.category]; if(!Array.isArray(list)) throw new GameError("INVALID_ASSET_CATEGORY",`未知資產類別：${effect.category}`); if(list.some(asset=>asset.id===effect.assetId)) throw new GameError("ASSET_OWNED",`已經持有：${effect.name}`); list.push({id:effect.assetId,name:effect.name,acquiredDay:state.day,dailyIncome:effect.dailyIncome||0,basePrice:effect.basePrice||1,combatPower:effect.combatPower||0,armor:effect.armor||0,bonuses:{...(effect.bonuses||{})},description:effect.description||"",level:0}); logEffect(state,source,effect.type,effect.category,null,effect.name,null); break; }
        case "asset.upgrade": { const asset=state.assets?.[effect.category]?.find(item=>item.id===effect.assetId); if(!asset) throw new GameError("UNKNOWN_ASSET",`找不到資產：${effect.assetId}`); const before=asset.level||0; if(effect.success){asset.level=before+1;if(asset.dailyIncome)asset.dailyIncome+=1+({3:2,5:3,10:5}[asset.level]||0);} logEffect(state,source,effect.type,effect.assetId,before,asset.level,effect.success?1:0); break; }
        case "battle.start": { const armed=state.assets?.weapons?.length>0,bonuses=combinedBonuses(state),status=cityStatusById(state.cityStatus),legacyWeaponPower=(state.assets?.weapons||[]).reduce((sum,asset)=>sum+(asset.level||0)*2+((asset.level||0)>=3?5:0)+((asset.level||0)>=5?8:0)+((asset.level||0)>=10?15:0),0),crewDefense=Math.floor(crewPower(state)/3); state.battle={enemy:effect.enemy,title:effect.title||"高架橋伏擊",result:effect.result||"你撐過了這場戰鬥，從現場帶走報酬與新的名聲。",reward:Math.round(((effect.reward??16)+bonuses.reward)*(status.battleRewardRate||1)),rewardAbility:effect.rewardAbility||"reflex",rewardAbilityValue:effect.rewardAbilityValue??2,rewardWorld:effect.rewardWorld,rewardWorldValue:effect.rewardWorldValue||0,rewardHealth:effect.rewardHealth||0,securityOnWin:effect.securityOnWin||0,bonusWill:effect.bonusWill||0,battleType:effect.battleType||"event",factionId:effect.factionId||null,territoryId:effect.territoryId||null,enemyDamage:(effect.enemyDamage||7)+(status.enemyDamageBonus||0),medicalReduction:bonuses.medical,playerHp:45+Math.floor(state.player.abilities.physique/2)+bonuses.hp+bonuses.armor+crewDefense,enemyHp:Math.max(20,(effect.enemyHp||72)-legacyWeaponPower-bonuses.weapon),guard:false,turn:1,message:effect.opening||(armed?"你帶著整備完成的武器與核心隊員進場，搶先壓住第一批敵人。":"敵人從兩側逼近，你只能利用身邊的一切反擊。")};state.battle.intent=rollEnemyIntent(state); state.phase="battle"; break; }
        default: throw new GameError("UNKNOWN_EFFECT",`不支援的效果：${effect.type}`);
      }
    }
    state.unlockedCharacterEvents??=[];
    for(const event of DIFEI_EVENTS)if((state.relations?.[event.characterId]||0)>=event.threshold&&!state.unlockedCharacterEvents.includes(event.id))state.unlockedCharacterEvents.push(event.id);
    return state;
  }catch(error){ throw error instanceof GameError?error:new GameError("TRANSACTION_FAILED",error.message); }
}
export function selectCard(input,eventId){
  if(input.phase!=="cards") throw new GameError("WRONG_PHASE","現在不能選卡");
  if(!input.candidates.includes(eventId)) throw new GameError("INVALID_CARD","卡片不在候選清單中");
  let state=clone(input); state.selected=eventId;
  const card=getEvent(eventId,state);
  if(card.customDirect||card.deck==="life"||card.deck==="night") return resolveDirectCard(state,card);
  if(state.deckType==="night") return openNightCard(state,card);
  if(!card.hub){state.phase="event";return state;}
  state.candidates=[];
  if(card.hub==="leisure"){
    let options=shuffledWeighted(state,LEISURE_CARDS).slice(0,5);
    if(!options.some(option=>option.cost<=state.player.resource)){options.pop();options.push(LEISURE_CARDS.find(option=>option.id==="leisure_free_rest"));}
    state.activityKind="leisure";state.activityOptions=options.map(option=>option.id);state.phase="activity";return state;
  }
  if(card.hub==="training"){state.activityKind="training";state.activityOptions=TRAINING_CARDS.map(option=>option.id);state.phase="activity";return state;}
  if(card.hub==="social"){state.activityKind="social";state.activityOptions=meetingCharacterIds(state);state.phase="activity";return state;}
  if(card.hub==="purchase"){state.activityKind="purchase";state.activityOptions=getEvent("asset_market").choices.map(option=>option.id);state.phase="activity";return state;}
  if(card.hub==="work") return resolveWork(state);
  if(card.hub==="sidequest"){
    if(state.activeSideQuest){state.phase="sidequestNode";return state;}
    const pool=SIDE_QUESTS.filter(quest=>!state.completedSideQuests.includes(quest.id));
    state.sideQuestCandidates=shuffledWeighted(state,pool).slice(0,3).map(quest=>quest.id);state.phase="sidequestPick";return state;
  }
  if(card.hub==="factions"){state.phase="factionBoard";return state;}
  throw new GameError("UNKNOWN_HUB",`未知生活卡牌：${card.hub}`);
}
function resolveDirectCardBase(input,card){
  if(card.cost&&input.player.resource<card.cost)throw new GameError("INSUFFICIENT_CASH",`現金不足，需要 ${card.cost}`);
  const effects=[...(card.cost?[{type:"resource.add",value:-card.cost}]:[]),...(card.effects||[])];let state=applyEffects(input,effects,`custom:${card.id}`);if(card.main){state.seen[card.id]=true;state=completeOfficialProgress(state,card.id);}state.phase=state.finished&&!state.postgame?"ending":"result";state.lastResult={title:card.title,choice:card.title,success:true,summary:card.result||card.summary||"自訂卡牌已結算。"};return state;
}
function openNightCardBase(input,card){
  if(card.cost&&input.player.resource<card.cost)throw new GameError("INSUFFICIENT_CASH",`現金不足，需要 ${card.cost}`);
  if(card.hub){
    const state=clone(input);state.activityKind=`night:${card.hub}`;
    if(card.hub==="property")state.activityOptions=state.assets.properties.map(asset=>asset.id);
    else if(card.hub==="contact")state.activityOptions=CONTACTS.filter(contact=>state.knownContacts?.includes(contact.id)).map(contact=>contact.id);
    else if(card.hub==="industry")state.activityOptions=state.assets.industries.map(asset=>asset.id);
    else if(card.hub==="industryContact")state.activityOptions=state.assets.industries.flatMap(asset=>CONTACTS.filter(contact=>state.knownContacts?.includes(contact.id)).map(contact=>`${asset.id}|${contact.id}`));
    else if(card.hub==="industryRisk")state.activityOptions=state.assets.industries.map(asset=>asset.id);
    state.phase="activity";return state;
  }
  if(card.combat){
    const effects=[...(card.cost?[{type:"resource.add",value:-card.cost}]:[]),{type:"battle.start",enemy:card.enemy,title:card.title,result:card.result,reward:card.reward,enemyHp:card.enemyHp,rewardAbility:card.rewardAbility,rewardAbilityValue:card.rewardAbilityValue,rewardWorld:card.rewardWorld,rewardWorldValue:card.rewardWorldValue,rewardHealth:card.rewardHealth,securityOnWin:card.securityOnWin,bonusWill:card.bonusWill}];
    return applyEffects(input,effects,`night:${card.id}:battle`);
  }
  if(card.risk){
    let state=applyEffects(input,[{type:"resource.add",value:-card.cost}],`night:${card.id}:entry`);const ability=card.abilities.slice().sort((a,b)=>abilityValue(state,b)-abilityValue(state,a))[0];const n=rngNext(state.seed);state.seed=n.seed;const roll=Math.floor(n.value*41)+20;const success=abilityValue(state,ability)+roll>=card.difficulty+28;
    const effects=success?[{type:"resource.add",value:card.reward},...card.effects]:card.failure;state=applyEffects(state,effects,`night:${card.id}:${success?"success":"failure"}`);if(state.player.health<=0){state.player.health=1;state.flags.hospitalDebt=(state.flags.hospitalDebt||0)+10;state.unlockedSideQuests=[...new Set([...(state.unlockedSideQuests||[]),"sq_hospital_debt"])];}
    state.phase="result";state.lastResult={title:card.title,choice:success?"把握刺激":"承受代價",success,roll,check:{ability,difficulty:card.difficulty},summary:success?`你從危險中全身而退，獲得現金 ${card.reward}，也暫時忘了白天的壓力。`:`事情失控了。你沒有被故事淘汰，但傷勢、疲勞或警方注意會跟到明天。${state.flags.hospitalDebt?" 地下診所替你保住性命，也記下了一筆欠款。":""}`};return state;
  }
  let state=applyEffects(input,card.effects||[],`night:${card.id}`);let extra="";if(card.random){const n=rngNext(state.seed);state.seed=n.seed;if(n.value<.3){state=applyEffects(state,[{type:"ability.add",key:"perception",value:1}],`night:${card.id}:random`);extra=" 隨機插曲：你無意間聽到一條可疑交易消息，觀察永久 +1。";}}
  state.phase="result";state.lastResult={title:card.title,choice:card.title,success:true,summary:(card.result||card.summary)+extra};return state;
}
function resolveNightOptionBase(input,id){
  if(input.phase!=="activity"||!input.activityKind?.startsWith("night:"))throw new GameError("WRONG_PHASE","目前不在夜生活選單");
  const card=getEvent(input.selected,input);if(id==="cancel"){const state=clone(input);state.phase="result";state.lastResult={title:card.title,choice:"取消安排",success:true,summary:"你沒有進行活動，但尋找場所仍花掉了整晚。"};return state;}
  if(!input.activityOptions.includes(id))throw new GameError("UNKNOWN_ACTIVITY",`未知夜生活選項：${id}`);
  let state=clone(input),effects=[],label="",summary="",characterId=null;
  if(input.activityKind==="night:property"){
    const asset=state.assets.properties.find(item=>item.id===id),level=asset.level||0,milestone=(level>=10?10:level>=5?5:level>=3?3:0);effects=[{type:"stat.add",key:"fatigue",value:-(18+level*2)},{type:"stat.add",key:"stress",value:-(6+level+milestone)},{type:"stat.add",key:"health",value:3+level+milestone},buffEffect("property_sleep",`${asset.name}的好眠`,"physique",1+Math.floor(level/3))];label=asset.name;summary=`你回到 ${asset.name}，升級 +${level} 的設備讓這晚恢復得更完整。`;
  }else if(input.activityKind==="night:contact"){
    const contact=CONTACTS.find(item=>item.id===id),second=!!state.metContacts[`${state.day}:${id}`],gain=second?3:6;characterId=id;effects=[{type:"resource.add",value:-card.cost},{type:"relation.add",key:id,value:gain},{type:"stat.add",key:"fatigue",value:card.id.includes("drive")?3:-5},{type:"stat.add",key:"stress",value:-12},...(card.id.includes("drive")?[buffEffect("social_drive","有人同行","engineering",2)]:[buffEffect("social_night","有人陪伴","social",2)])];state.metContacts[`${state.day}:${id}`]=true;label=contact.name;summary=`你和${contact.name}一起度過晚上。${second?"這是今天第二次見面，關係提升效果減半。":"你們之間多了一段不必向別人解釋的共同記憶。"}`;
  }else{
    const [assetId,contactId]=id.split("|"),asset=state.assets.industries.find(item=>item.id===assetId);const level=asset.level||0;if(!asset)throw new GameError("UNKNOWN_ASSET","找不到產業");label=asset.name;
    if(input.activityKind==="night:industry"){effects=[{type:"resource.add",value:Math.max(2,(asset.dailyIncome||0)+level)},{type:"stat.add",key:"stress",value:-7},{type:"stat.add",key:"fatigue",value:-4}];summary=`你親自巡視 ${asset.name}，解決小問題並拿到今晚額外收入。`;}
    else if(input.activityKind==="night:industryContact"){const contact=CONTACTS.find(item=>item.id===contactId),second=!!state.metContacts[`${state.day}:${contactId}`];characterId=contactId;effects=[{type:"resource.add",value:-card.cost},{type:"relation.add",key:contactId,value:second?3:6},{type:"resource.add",value:Math.max(1,Math.floor((asset.dailyIncome||0)/2))},{type:"stat.add",key:"stress",value:-10}];state.metContacts[`${state.day}:${contactId}`]=true;label=`${asset.name}／${contact.name}`;summary=`你在 ${asset.name} 招待${contact.name}，談感情也談生意。`;}
    else{const ability=["management","social","perception"].sort((a,b)=>abilityValue(state,b)-abilityValue(state,a))[0],n=rngNext(state.seed);state.seed=n.seed;const roll=Math.floor(n.value*41)+20,success=abilityValue(state,ability)+roll>=70;effects=success?[{type:"resource.add",value:5+level},{type:"stat.add",key:"stress",value:-5}]:[{type:"resource.add",value:-Math.min(state.player.resource,4+level)},{type:"stat.add",key:"stress",value:6}];state=applyEffects(state,effects,`night:industryRisk:${asset.id}`);state.phase="result";state.lastResult={title:card.title,choice:asset.name,success,roll,check:{ability,difficulty:42},summary:success?"你在打烊前找出問題源頭，保住收入與員工信心。":"問題沒有完全解決，你付出一筆損失，但產業仍能繼續營業。"};return state;}
  }
  state=applyEffects(state,effects,`night:${card.id}:${id}`);state.phase="result";state.lastResult={title:card.title,choice:label,success:true,summary,...(characterId?{characterId}:{})};return state;
}
function buffEffect(id,label,ability,value){return {type:"buff.add",id,label,ability,value,duration:5};}
function abilityValue(state,key){return (state.player.abilities[key]||0)+state.buffs.filter(buff=>buff.ability===key).reduce((sum,buff)=>sum+buff.value,0);}
export const characterLevelChance=level=>level===1?90:level===2?80:Math.max(5,80-(level-2)*5);
export function meetingCharacterIds(state){return [...new Set([...(state.knownContacts||[]),...(state.team?.roster||[]).map(item=>item.id)])].filter(id=>CONTACTS.some(contact=>contact.id===id)||teamMemberById(id));}
export function pendingCharacterEvent(state){return DIFEI_EVENTS.find(event=>!(state.completedCharacterEvents||[]).includes(event.id)&&((state.unlockedCharacterEvents||[]).includes(event.id)||(state.relations?.[event.characterId]||0)>=event.threshold))||null;}
export function startCharacterEvent(input,eventId){
  if(input.phase!=="activity"||input.activityKind!=="social")throw new GameError("WRONG_PHASE","必須先選擇「與人見面」");const pending=pendingCharacterEvent(input);if(!pending||pending.id!==eventId)throw new GameError("CHARACTER_EVENT_LOCKED","這段人物事件尚未解鎖");const state=clone(input);state.selectedCharacterEvent=eventId;state.phase="characterEvent";return state;
}
function resolveCharacterEventChoiceBase(input,choiceId){
  if(input.phase!=="characterEvent"||!input.selectedCharacterEvent)throw new GameError("WRONG_PHASE","目前沒有進行中的人物事件");const event=characterEventById(input.selectedCharacterEvent),choice=event?.choices.find(item=>item.id===choiceId);if(!event||!choice)throw new GameError("UNKNOWN_CHOICE","找不到人物事件選項");let state=applyEffects(input,choice.effects,`character-event:${event.id}:${choice.id}`);state.completedCharacterEvents=[...new Set([...(state.completedCharacterEvents||[]),event.id])];state.selectedCharacterEvent=null;state.phase="result";state.lastResult={title:event.title,choice:choice.text,success:true,summary:choice.result,characterId:event.characterId};return state;
}
function meetingActivity(state,id){
  if(id==="difei"||id==="chenglan"){const options=id==="difei"?DIFEI_ACTIVITIES:CHENGLAN_ACTIVITIES,n=rngNext(state.seed);state.seed=n.seed;return options[Math.floor(n.value*options.length)];}
  const contact=CONTACTS.find(option=>option.id===id);if(contact)return contact;
  const member=teamMemberById(id),cost=teamTrainingCost(state,id);return member?{id,name:member.name,title:`與${member.name}進行專長交流`,detail:`現金 -${cost}／關係 +4。`,effects:[{type:"resource.add",value:-cost},{type:"relation.add",key:id,value:4}],result:`你和${member.name}完成一次不公開的專長交流。真正的進步來自反覆合作，而不是一次付費訓練。`}:null;
}
function resolveCharacterMeeting(input,id){
  if(!input.activityOptions.includes(id)||!meetingCharacterIds(input).includes(id))throw new GameError("UNKNOWN_ACTIVITY",`未知人物：${id}`);if(input.metContacts[`${input.day}:${id}`])throw new GameError("ALREADY_MET","今天已經和這名人物見過面");let state=clone(input),activity=meetingActivity(state,id);if(!activity)throw new GameError("UNKNOWN_ACTIVITY",`未知人物：${id}`);const cashCost=(activity.effects||[]).filter(effect=>effect.type==="resource.add"&&effect.value<0).reduce((sum,effect)=>sum-effect.value,0);if(state.player.resource<cashCost)throw new GameError("INSUFFICIENT_CASH",`現金不足，需要 ${cashCost}`);state=applyEffects(state,activity.effects||[],`meeting:${id}:${activity.id}`);state.metContacts[`${state.day}:${id}`]=true;const before=state.characterLevels[id]||1,chance=characterLevelChance(before),roll=rngNext(state.seed);state.seed=roll.seed;const success=roll.value*100<chance;if(success)state.characterLevels[id]=before+1;else state.characterLevels[id]=before;const roster=state.team?.roster?.find(item=>item.id===id);if(roster)roster.level=state.characterLevels[id];state.phase="result";state.lastResult={title:"與人見面",choice:activity.title||activity.name,success:true,levelUp:success,characterId:id,summary:`${activity.result} ${success?`${activity.name||teamMemberById(id)?.name||id}的專長提升至 Lv.${before+1}。`:`本次沒有突破 Lv.${before}（成功率 ${chance}%），但關係仍照常提升。`}`};return state;
}
function activityOption(state,id){
  if(state.activityKind==="leisure") return LEISURE_CARDS.find(option=>option.id===id);
  if(state.activityKind==="training") return TRAINING_CARDS.find(option=>option.id===id);
  if(state.activityKind==="social") return CONTACTS.find(option=>option.id===id);
  if(state.activityKind==="purchase") return getEvent("asset_market").choices.find(option=>option.id===id);
}
function resolveActivityBase(input,id){
  if(input.phase!=="activity") throw new GameError("WRONG_PHASE","目前不在生活活動選單");
  if(id==="cancel"){const state=clone(input);state.phase="result";state.lastResult={title:getEvent(state.selected).title,choice:"取消行程",success:true,summary:"你沒有進行活動，但尋找與安排仍花掉了這段時間。"};return state;}
  if(input.activityKind==="social")return resolveCharacterMeeting(input,id);
  const option=activityOption(input,id); if(!option||!input.activityOptions.includes(id)) throw new GameError("UNKNOWN_ACTIVITY",`未知活動：${id}`);
  if(option.cost&&input.player.resource<option.cost) throw new GameError("INSUFFICIENT_CASH",`現金不足，需要 ${option.cost}`);
  const assetEffect=option.effects.find(effect=>effect.type==="asset.grant");
  if(assetEffect&&input.assets[assetEffect.category].some(asset=>asset.id===assetEffect.assetId)) throw new GameError("ASSET_OWNED",`已經持有：${assetEffect.name}`);
  const effects=option.effects.map(effect=>effect.type==="asset.grant"?{...effect,basePrice:option.cost}:effect);
  let state=applyEffects(input,effects,`activity:${input.activityKind}:${id}`);
  if(input.activityKind==="social") state.metContacts[`${state.day}:${id}`]=true;
  state.phase="result";state.lastResult={title:getEvent(input.selected).title,choice:option.title||option.text||option.name,success:true,summary:option.result};
  return state;
}

const DEFAULT_ASSISTANT_ACTIONS=["train:train_physique","train:train_reflex"];
function allAssistantActionIds(){return [...TRAINING_CARDS.map(option=>`train:${option.id}`),...LEISURE_CARDS.map(option=>`recover:${option.id}`),"work:cash"];}
function normalizeAssistantActions(selection){
  const valid=new Set(allAssistantActionIds());
  if(Array.isArray(selection)){const chosen=[...new Set(selection)].filter(id=>valid.has(id));return chosen.length?chosen:DEFAULT_ASSISTANT_ACTIONS;}
  const legacy={combat:DEFAULT_ASSISTANT_ACTIONS,allTraining:TRAINING_CARDS.map(option=>`train:${option.id}`),recovery:LEISURE_CARDS.map(option=>`recover:${option.id}`),balanced:allAssistantActionIds()};
  return legacy[selection]||DEFAULT_ASSISTANT_ACTIONS;
}
function assistantPickIndex(state,length,salt=""){
  if(!length)return -1;
  let hash=((state.seed||0)^(state.day||0)*31^(state.stage||0)*17^(state.sequence||0)*13)>>>0;
  for(const character of salt)hash=Math.imul(hash^character.charCodeAt(0),16777619)>>>0;
  return hash%length;
}
function assistantTrainingOption(state,actionIds,availableIds=null){
  const selected=new Set(normalizeAssistantActions(actionIds)),allowed=availableIds?new Set(availableIds):null;
  const options=TRAINING_CARDS.filter(option=>selected.has(`train:${option.id}`)&&(!allowed||allowed.has(option.id))&&(option.cost||0)<=state.player.resource);
  return options[assistantPickIndex(state,options.length,`training:${[...selected].sort().join("|")}`)]||null;
}
function assistantRecoveryOption(state){
  const options=state.player.health<=35
    ?["leisure_treatment","leisure_nutrition","leisure_street_food","leisure_free_rest"]
    :state.player.fatigue>=75
      ?["leisure_sleep","leisure_nutrition","leisure_free_rest"]
      :["leisure_bar","leisure_movie","leisure_coffee","leisure_free_rest"];
  return options.map(id=>LEISURE_CARDS.find(option=>option.id===id)).find(option=>option&&(!option.cost||option.cost<=state.player.resource))||LEISURE_CARDS.find(option=>option.id==="leisure_free_rest");
}
function assistantDirectActivity(input,kind,optionId){
  const state=clone(input);state.phase="activity";state.selected=kind==="training"?"life_training":"life_leisure";state.activityKind=kind;state.activityOptions=[optionId];return resolveActivity(state,optionId);
}
function assistantAdviceObject(id,tone,title,message,actionLabel=null){return {id,tone,title,message,actionLabel,actionable:!!actionLabel};}
function assistantGeneralAdvice(state,selection){
  const selected=normalizeAssistantActions(selection),selectedSet=new Set(selected),choices=[
    ...TRAINING_CARDS.filter(option=>selectedSet.has(`train:${option.id}`)&&(option.cost||0)<=state.player.resource).map(option=>({kind:"training",option})),
    ...LEISURE_CARDS.filter(option=>selectedSet.has(`recover:${option.id}`)&&(option.cost||0)<=state.player.resource).map(option=>({kind:"leisure",option})),
    ...(selectedSet.has("work:cash")?[{kind:"work"}]:[])
  ];
  if(!choices.length)return assistantAdviceObject("observe:no-affordable-action","normal","勾選的行動目前無法執行","目前現金不足以執行已勾選的行動。你可以開啟一般建議項目加入免費休息或賺錢，也能自行選擇畫面上的其他行動。");
  const choice=choices[assistantPickIndex(state,choices.length,`general:${[...selected].sort().join("|")}`)];
  if(choice.kind==="training"){
    const option=choice.option,isReflex=option.id==="train_reflex",isPhysique=option.id==="train_physique";
    const title=isReflex?"練一輪槍法":isPhysique?"練一輪格鬥基本功":`安排：${option.title}`;
    const message=isReflex?"目前沒有更急的事。我替你留好靶位，現在練呼吸和第一發命中。":isPhysique?"目前沒有更急的事。我把安全屋的訓練區清出來了，先做體能與近身步法。":`目前沒有更急的狀況。${option.detail}`;
    return assistantAdviceObject(`train:${option.id}`,"normal",title,message,`接受：${option.title}`);
  }
  if(choice.kind==="leisure")return assistantAdviceObject(`recover:${choice.option.id}`,"normal",`安排：${choice.option.title}`,`目前沒有急迫狀況，先整理狀態。${choice.option.detail}`,`接受：${choice.option.title}`);
  return assistantAdviceObject("work:cash","normal","處理一份短期工作","目前沒有急迫狀況。我找到一份能立刻結算的工作，可以先補充現金。","接受：立即工作");
}
function markAssistantAction(result){const state=clone(result);state.flags={...(state.flags||{}),assistantActionPending:true};return state;}

export function assistantAdvice(state,selection=DEFAULT_ASSISTANT_ACTIONS){
  if(!state)return null;
  const selectedActions=normalizeAssistantActions(selection);
  if(state.phase==="result"&&state.flags?.assistantActionPending)return assistantAdviceObject("continue:stage","normal","行動已經完成",`${state.lastResult?.summary||"結果已經記錄。"} 確認後，我們繼續下一段時間。`,"繼續");
  if(state.phase==="battle"&&state.battle){
    const guardThreshold=(state.battle.enemyDamage||7)*2+6;
    if(state.battle.playerHp<=guardThreshold)return assistantAdviceObject("battle:guard","urgent","先找掩護","你的戰力已經接近危險線。先卸掉這一輪傷害，再找反擊空檔。","接受：尋找掩護");
    const bonuses=combinedBonuses(state),shooting=state.player.abilities.reflex+(bonuses.attack||0)*8,brawling=state.player.abilities.physique+(bonuses.brawl||0)*8;
    return brawling>shooting
      ?assistantAdviceObject("battle:brawl","urgent","貼近打亂陣形","我們的格鬥與近戰支援比較強，現在貼上去最有效率。","接受：近身格鬥")
      :assistantAdviceObject("battle:attack","urgent","維持交叉射擊","槍法與射擊支援佔優，別讓對方靠近。","接受：快速射擊");
  }
  if(state.phase==="cards"){
    if(state.pendingRetaliation){
      const territory=territoryById(state.pendingRetaliation.territoryId);
      if(state.player.health>=20)return assistantAdviceObject(`defend:${state.pendingRetaliation.territoryId}`,"urgent",`${territory?.name||"地盤"}正在遭到反攻`,`現在不處理就會失去收入與地盤。我已經把防守隊伍和撤離線排好。`,"接受：立即出動防守");
      const recovery=assistantRecoveryOption(state);if(recovery.id==="leisure_free_rest")return assistantAdviceObject("work:cash","urgent","先籌醫療費","你現在的健康不足以帶隊防守，手邊也沒有治療費。我找到一份能立刻結算的工作。","接受：立即工作");return assistantAdviceObject(`recover:${recovery.id}`,"urgent","先處理傷勢","你現在的健康不足以帶隊防守。先把傷勢壓住，才有資格上場。",`接受：${recovery.title}`);
    }
    if(state.activeSideQuest?.deadlineDay){
      const remaining=state.activeSideQuest.deadlineDay-state.day+1;
      if(remaining<=1){const quest=SIDE_QUESTS.find(item=>item.id===state.activeSideQuest.id);return assistantAdviceObject("sidequest:continue","urgent",`${quest?.title||"支線任務"}即將到期`,`只剩今天。再拖下去，委託人和線索都不會等我們。`,"接受：立即繼續任務");}
    }
    if(state.player.health<=35||state.player.fatigue>=75||state.player.stress>=75){
      const recovery=assistantRecoveryOption(state),reason=state.player.health<=35?"傷勢已經會影響下一次行動":state.player.fatigue>=75?"疲勞已經接近失誤區間":"精神壓力正在拖慢判斷";
      if(state.player.health<=35&&recovery.id==="leisure_free_rest")return assistantAdviceObject("work:cash","urgent","先籌恢復費用","傷勢需要處理，但目前的現金連基本補給都不夠。我先替你安排一份能立刻結算的工作。","接受：立即工作");return assistantAdviceObject(`recover:${recovery.id}`,"urgent","先恢復狀態",`${reason}。先處理，城市不會因為我們硬撐就變安全。`,`接受：${recovery.title}`);
    }
    return assistantGeneralAdvice(state,selectedActions);
  }
  if(state.phase==="activity"&&state.activityKind==="training"){
    const training=assistantTrainingOption(state,selectedActions,state.activityOptions);if(training){const isReflex=training.id==="train_reflex",isPhysique=training.id==="train_physique";return assistantAdviceObject(`train:${training.id}`,"normal",isReflex?"今天練槍法":isPhysique?"今天練格鬥":`今天練${training.title.replace("訓練","")}`,isReflex?"你目前的狀態適合做短時間高專注射擊。":isPhysique?"體能與步法最需要靠反覆動作固定下來。":training.detail,`接受：${training.title}`);}
  }
  if(state.phase==="factionBoard"&&state.pendingRetaliation){
    const territory=territoryById(state.pendingRetaliation.territoryId);
    if(state.player.health>=20)return assistantAdviceObject(`defend:${state.pendingRetaliation.territoryId}`,"urgent",`守住${territory?.name||"地盤"}`,"反攻隊已經進場，我們現在出動還能搶回主動。","接受：開始防守戰");
  }
  const contextual={event:["先看清選項","這裡的選擇會改變故事，我把風險標出來了，最後決定由你下。"],characterEvent:["她正在等你的回答","人物事件不會過期，這次可以慢慢選。"],sidequestPick:["委託都已整理","風險、期限與可能收益都在卡片上，挑你願意承擔後果的那一件。"],sidequestNode:["先處理眼前節點","線索正在變動，這一步需要你親自決定。"],result:["行程已完成","結果和能力變化都已記錄。確認後再繼續下一段時間。"],ending:["主線已走到終點","城市不會停下來；你仍可以繼續經營、訓練與處理人物關係。"],chapterTransition:["下一章已準備好","主線沒有期限，進入下一章後仍能照自己的步調生活。"]}[state.phase]||["我在旁邊","需要時直接叫我，我會一直更新眼前最重要的事。"];
  return assistantAdviceObject(`observe:${state.phase}`,"normal",contextual[0],contextual[1]);
}

export function acceptAssistantAdvice(input,adviceId,selection=DEFAULT_ASSISTANT_ACTIONS){
  const advice=assistantAdvice(input,selection);if(!advice?.actionable||advice.id!==adviceId)throw new GameError("ADVICE_CHANGED","狄菲已經依最新狀態調整建議，請重新確認。");
  if(adviceId==="continue:stage")return continueStage(input);
  if(adviceId.startsWith("battle:"))return markAssistantAction(battleAction(input,adviceId.slice(7)));
  if(adviceId.startsWith("train:"))return markAssistantAction(assistantDirectActivity(input,"training",adviceId.slice(6)));
  if(adviceId.startsWith("recover:"))return markAssistantAction(assistantDirectActivity(input,"leisure",adviceId.slice(8)));
  if(adviceId.startsWith("defend:")){const state=clone(input);state.phase="factionBoard";state.selected="life_conflict";return markAssistantAction(startTerritoryFight(state,adviceId.slice(7)));}
  if(adviceId==="sidequest:continue"){const state=clone(input);state.phase="cards";state.deckType="life";state.candidates=[...new Set([...(state.candidates||[]),"life_sidequest"])];return markAssistantAction(selectCard(state,"life_sidequest"));}
  if(adviceId==="work:cash"){const state=clone(input);state.selected="life_work";return markAssistantAction(resolveWork(state));}
  throw new GameError("UNKNOWN_ADVICE",`未知助理建議：${adviceId}`);
}
function resolveWorkBase(input){
  let state=clone(input); const scored=JOBS.map(job=>({job,score:Math.max(...job.abilities.map(key=>abilityValue(state,key)))})).sort((a,b)=>b.score-a.score); const job=scored[0].job;
  const ability=job.abilities.sort((a,b)=>abilityValue(state,b)-abilityValue(state,a))[0]; const n=rngNext(state.seed);state.seed=n.seed;const roll=Math.floor(n.value*41)+20;const success=abilityValue(state,ability)+roll>=job.difficulty+28;
  const effects=success?[{type:"resource.add",value:job.reward},...job.effects]:[{type:"resource.add",value:Math.ceil(job.reward/3)},{type:"stat.add",key:"fatigue",value:7},{type:"stat.add",key:"stress",value:5}];
  state=applyEffects(state,effects,`work:${job.id}`);state.phase="result";state.lastResult={title:"賺錢",choice:job.title,success,roll,check:{ability,difficulty:job.difficulty},summary:success?job.result:"工作出了意外。你只拿到部分報酬，仍承受了疲勞與壓力。"};return state;
}
export function acceptSideQuest(input,questId){
  if(input.phase!=="sidequestPick"||!input.sideQuestCandidates.includes(questId)) throw new GameError("INVALID_SIDE_QUEST","這項支線不在候選清單中");
  const quest=SIDE_QUESTS.find(item=>item.id===questId);const state=clone(input);state.activeSideQuest={id:questId,nodeIndex:0,startedDay:state.day,deadlineDay:quest.deadlineDays?state.day+quest.deadlineDays:null};state.sideQuestCandidates=[];state.phase="sidequestNode";return state;
}
function declineSideQuestsBase(input){
  if(input.phase!=="sidequestPick") throw new GameError("WRONG_PHASE","目前沒有支線任務可拒絕"); const state=clone(input);state.sideQuestCandidates=[];state.phase="result";state.lastResult={title:"進行支線任務",choice:"全部拒絕",success:true,summary:"你花時間查看委託，最後決定一件也不接。這個生活階段仍然結束。"};return state;
}
function resolveSideQuestChoiceBase(input,choiceId){
  if(input.phase!=="sidequestNode"||!input.activeSideQuest) throw new GameError("WRONG_PHASE","目前沒有進行中的支線節點");
  const quest=SIDE_QUESTS.find(item=>item.id===input.activeSideQuest.id);const node=quest.nodes[input.activeSideQuest.nodeIndex];const choice=node.choices.find(item=>item.id===choiceId);if(!choice)throw new GameError("UNKNOWN_CHOICE",`未知支線選項：${choiceId}`);
  let state=clone(input);const ability=quest.abilities.slice().sort((a,b)=>abilityValue(state,b)-abilityValue(state,a))[0];const n=rngNext(state.seed);state.seed=n.seed;const roll=Math.floor(n.value*41)+20;const difficulty={低:32,中:38,高:44}[quest.risk];const success=abilityValue(state,ability)+roll>=difficulty+28;const random=quest.randomEvents[state.seed%quest.randomEvents.length];
  state=applyEffects(state,success?choice.effects:[{type:"stat.add",key:"health",value:-4},{type:"stat.add",key:"stress",value:6}],`sidequest:${quest.id}:${input.activeSideQuest.nodeIndex}`);
  state.activeSideQuest.nodeIndex++;
  const complete=state.activeSideQuest.nodeIndex>=quest.nodes.length;
  if(complete){state.completedSideQuests.push(quest.id);state.activeSideQuest=null;}
  state.phase="result";state.lastResult={title:quest.title,choice:choice.text,success,roll,check:{ability,difficulty},summary:`${success?choice.result:choice.failure} 隨機狀況：${random}${complete?" 支線任務已結束。":""}`};return state;
}
function abandonSideQuestBase(input){
  if(!input.activeSideQuest) throw new GameError("NO_SIDE_QUEST","目前沒有支線可以放棄");const quest=SIDE_QUESTS.find(item=>item.id===input.activeSideQuest.id);let state=applyEffects(input,[{type:"stat.add",key:"stress",value:5},{type:"world.add",key:"people",value:-3}],`sidequest:${quest.id}:abandon`);state.flags[`abandoned.${quest.id}`]=true;state.activeSideQuest=null;state.phase="result";state.lastResult={title:quest.title,choice:"放棄任務",success:false,summary:"你主動切斷了這條線。相關人物不會忘記，這項支線也不會再次出現。"};return state;
}
function upgradeAssetBase(input,category,assetId){
  if(input.phase!=="activity"||input.activityKind!=="purchase") throw new GameError("WRONG_PHASE","只能在購買卡牌中升級資產");const asset=input.assets?.[category]?.find(item=>item.id===assetId);if(!asset)throw new GameError("UNKNOWN_ASSET","找不到這項資產");const level=asset.level||0;const cost=Math.max(1,Math.ceil((asset.basePrice||1)*.25*(level+1)));if(input.player.resource<cost)throw new GameError("INSUFFICIENT_CASH",`升級需要現金 ${cost}`);const chance=assetUpgradeChance(level);let state=applyEffects(input,[{type:"resource.add",value:-cost}],`upgrade:${assetId}`);const n=rngNext(state.seed);state.seed=n.seed;const success=n.value*100<chance;state=applyEffects(state,[{type:"asset.upgrade",category,assetId,success}],`upgrade:${assetId}`);state.phase="result";state.lastResult={title:"升級資產",choice:`${asset.name} +${level} → +${success?level+1:level}`,success,summary:success?`升級成功。資產提升至 +${level+1}；基礎效果增強，里程碑等級會解鎖額外功能。`:`升級失敗。花費現金 ${cost}，資產維持 +${level}，不會降級或損壞。`};return state;
}
export const factionFightCost=factionId=>Math.max(0,Math.ceil((factionById(factionId)?.strength||50)/25)-2);
export const territoryFortifyCost=(state,territoryId)=>6+((state.territories?.[territoryId]?.level||0)+1)*5;
function factionBoardReady(input){if(input.phase!=="factionBoard"||input.selected!=="life_conflict")throw new GameError("WRONG_PHASE","請先使用「尋找對手」卡牌");if(input.player.health<20)throw new GameError("TOO_INJURED","健康低於 20，必須先治療才能主動開戰");}
export function startFactionFight(input,factionId){
  factionBoardReady(input);const faction=factionById(factionId);if(!faction||input.day<faction.unlockDay)throw new GameError("FACTION_LOCKED","這個幫派尚未進入你的活動範圍");const status=input.factions[factionId],cost=factionFightCost(factionId);if(input.player.resource<cost)throw new GameError("INSUFFICIENT_CASH",`蒐集對手行蹤需要現金 ${cost}`);
  const enemyHp=faction.strength+12+status.wins*5+Math.floor(input.day/4)*2,reward=18+Math.round(faction.strength/3)+status.wins*2;
  return applyEffects(input,[...(cost?[{type:"resource.add",value:-cost}]:[]),{type:"battle.start",battleType:"skirmish",factionId,enemy:`${faction.name}巡街隊`,title:`主動挑戰：${faction.name}`,result:`你擊潰${faction.name}的巡街隊。對方開始把你的名字列入真正需要重視的名單。`,reward,enemyHp,enemyDamage:5+Math.floor(faction.strength/25)+Math.floor(status.wins/2),rewardAbility:faction.rewardAbility,rewardAbilityValue:2,rewardWorld:"gangs",rewardWorldValue:-1,securityOnWin:1,opening:`你根據線報堵住${faction.name}的巡街隊。這不是意外，是你主動發出的戰帖。`}],`faction:${factionId}:challenge`);
}
export function startTerritoryFight(input,territoryId){
  factionBoardReady(input);const territory=territoryById(territoryId),control=input.territories?.[territoryId];if(!territory||!control)throw new GameError("UNKNOWN_TERRITORY","找不到這塊地盤");if(input.day<territory.unlockDay)throw new GameError("TERRITORY_LOCKED",`第 ${territory.unlockDay} 日後才有足夠情報進攻這裡`);
  const defending=control.owner==="player"&&input.pendingRetaliation?.territoryId===territoryId;if(control.owner==="player"&&!defending)throw new GameError("TERRITORY_OWNED","這已經是你的地盤");const factionId=defending?input.pendingRetaliation.factionId:control.owner,faction=factionById(factionId)||factionById(territory.factionId),status=input.factions[faction.id],cost=defending?0:territory.entryCost;if(input.player.resource<cost)throw new GameError("INSUFFICIENT_CASH",`準備這次行動需要現金 ${cost}`);
  const level=control.level||0,enemyHp=Math.max(42,territory.enemyHp+Math.floor(status.hostility/8)+(defending?8-level*7:level*4)),reward=defending?Math.ceil(territory.reward*.65):territory.reward;
  return applyEffects(input,[...(cost?[{type:"resource.add",value:-cost}]:[]),{type:"battle.start",battleType:defending?"defend":"capture",factionId:faction.id,territoryId,enemy:`${faction.name}${defending?"反攻隊":"地盤守衛"}`,title:defending?`防守地盤：${territory.name}`:`攻佔地盤：${territory.name}`,result:defending?`你守住${territory.name}，反攻隊留下裝備與一筆緊急軍資。`:`${territory.name}的守衛撤退，從今天起這裡的收入、眼線與麻煩都歸你。`,reward,enemyHp,enemyDamage:6+Math.floor(territory.enemyHp/38),rewardAbility:faction.rewardAbility,rewardAbilityValue:defending?2:3,rewardWorld:"gangs",rewardWorldValue:defending?-2:-4,securityOnWin:defending?1:3,opening:territory.opening}],`territory:${territoryId}:${defending?"defend":"capture"}`);
}
function fortifyTerritoryBase(input,territoryId){
  if(input.phase!=="factionBoard"||input.selected!=="life_conflict")throw new GameError("WRONG_PHASE","請先使用「尋找對手」卡牌");const territory=territoryById(territoryId),control=input.territories?.[territoryId];if(!territory||control?.owner!=="player")throw new GameError("TERRITORY_NOT_OWNED","只能強化自己的地盤");const cost=territoryFortifyCost(input,territoryId);if(input.player.resource<cost)throw new GameError("INSUFFICIENT_CASH",`強化地盤需要現金 ${cost}`);let state=applyEffects(input,[{type:"resource.add",value:-cost},{type:"ability.add",key:"management",value:1}],`territory:${territoryId}:fortify`);state.territories[territoryId].level=(state.territories[territoryId].level||0)+1;state.phase="result";state.lastResult={title:"強化地盤",choice:`${territory.name} +${state.territories[territoryId].level}`,success:true,summary:`你增設眼線、撤離路線與防守設備。每日收入提高 2，遭到反攻時敵方戰力也會降低。`};return state;
}
function recruitCrewBase(input){
  if(input.phase!=="factionBoard"||input.selected!=="life_conflict")throw new GameError("WRONG_PHASE","請先使用「尋找對手」卡牌");if(input.crew.members>=20)throw new GameError("CREW_FULL","目前隊伍已達 20 人上限");const cost=6+input.crew.members*3;if(input.player.resource<cost)throw new GameError("INSUFFICIENT_CASH",`招募可靠成員需要現金 ${cost}`);let state=applyEffects(input,[{type:"resource.add",value:-cost},{type:"ability.add",key:"management",value:1},{type:"world.add",key:"people",value:1}],"crew:recruit");state.crew.members++;state.crew.morale=clamp(state.crew.morale+5,[0,100]);state.phase="result";state.lastResult={title:"擴充隊伍",choice:`招募第 ${state.crew.members} 名成員`,success:true,summary:`你從街坊與地下圈子找到一名可靠成員。隊伍會提高戰鬥耐久與傷害，也讓搶下的地盤更容易守住。`};return state;
}
function teamManageReady(input){if(input.phase!=="factionBoard"||input.selected!=="life_conflict")throw new GameError("WRONG_PHASE","請先使用「尋找對手」卡牌進入城市勢力");}
export const teamRecruitCost=memberId=>teamMemberById(memberId)?.cost||0;
export const teamTrainingCost=(state,memberId)=>{const member=teamMemberById(memberId),roster=state.team?.roster?.find(item=>item.id===memberId);return member&&roster?Math.max(4,Math.ceil(Math.max(16,member.cost)*.18*((state.characterLevels?.[memberId]||roster.level||1)+1))):0;};
export const teamTrainingChance=(state,memberId)=>characterLevelChance(state.characterLevels?.[memberId]||state.team?.roster?.find(item=>item.id===memberId)?.level||1);
function recruitTeamMemberBase(input,memberId){
  teamManageReady(input);const member=teamMemberById(memberId);if(!member)throw new GameError("UNKNOWN_TEAM_MEMBER","找不到這名專家");if(member.recruitable===false)throw new GameError("TEAM_MEMBER_STORY_LOCKED",`${member.name}只能透過故事加入`);if(input.day<member.unlockDay)throw new GameError("TEAM_MEMBER_LOCKED",`第 ${member.unlockDay} 日後才能聯絡${member.name}`);if(input.team?.roster?.some(item=>item.id===memberId))throw new GameError("TEAM_MEMBER_OWNED",`${member.name}已經加入團隊`);if(input.player.resource<member.cost)throw new GameError("INSUFFICIENT_CASH",`招募${member.name}需要現金 ${member.cost}`);
  let state=applyEffects(input,[{type:"resource.add",value:-member.cost},{type:"ability.add",key:member.ability,value:1}],`team:${memberId}:recruit`);state.team.roster.push({id:memberId,level:1,recruitedDay:state.day});state.characterLevels[memberId]??=1;state.relations[memberId]??=0;if(state.team.active.length<TEAM_LIMIT)state.team.active.push(memberId);state.crew.morale=clamp(state.crew.morale+4,[0,100]);state.phase="result";state.lastResult={title:"招募核心隊員",choice:`${member.name}／${member.role}`,success:true,summary:`${member.summary} ${member.name}已加入團隊${state.team.active.includes(memberId)?"並自動編入本次出勤名單":"，可之後編入出勤名單"}；最多同時派出 ${TEAM_LIMIT} 名核心隊員。`};return state;
}
export function toggleTeamMember(input,memberId){
  teamManageReady(input);if(!input.team?.roster?.some(item=>item.id===memberId))throw new GameError("TEAM_MEMBER_NOT_RECRUITED","這名專家尚未加入團隊");const state=clone(input),index=state.team.active.indexOf(memberId);if(index>=0)state.team.active.splice(index,1);else{if(state.team.active.length>=TEAM_LIMIT)throw new GameError("ACTIVE_TEAM_FULL",`出勤名單最多 ${TEAM_LIMIT} 人，請先撤下一名隊員`);state.team.active.push(memberId);}return state;
}
export function trainTeamMember(input,memberId){
  teamManageReady(input);const member=teamMemberById(memberId),roster=input.team?.roster?.find(item=>item.id===memberId);if(!member||!roster)throw new GameError("TEAM_MEMBER_NOT_RECRUITED","這名專家尚未加入團隊");throw new GameError("TRAINING_REPLACED","核心隊員訓練已整合到「與人見面」；見面時關係必定提升，並依等級機率突破。");
}
function completeOfficialProgress(input,eventId){
  const meta=officialMainlineMeta(eventId);if(!meta)return input;const state=clone(input);
  if(meta.index===2&&!state.flags.chenglanJoined){state.flags.chenglanJoined=true;state.knownContacts=[...new Set([...(state.knownContacts||[]),"chenglan"])];if(!state.team.roster.some(item=>item.id==="chenglan"))state.team.roster.push({id:"chenglan",level:1,recruitedDay:state.day});state.characterLevels.chenglan=1;state.relations.chenglan=20;}
  if(meta.position===3&&meta.chapter<5)state.chapterTransition={from:meta.chapter,to:meta.chapter+1,title:`第 ${meta.chapter} 章完成`};
  if(meta.index===OFFICIAL_MAINLINE_IDS.length-1){state.finished=true;state.endingShown=true;}
  state.chapter=chapterForProgress(state);return state;
}
function resolveChoiceBase(input,choiceId){
  if(input.phase!=="event") throw new GameError("WRONG_PHASE","現在不能選擇事件選項");
  const event=getEvent(input.selected,input); const choice=event.choices.find(c=>c.id===choiceId);
  if(!choice) throw new GameError("UNKNOWN_CHOICE",`未知選項：${choiceId}`);
  if(choice.cost&&input.player.resource<choice.cost) throw new GameError("INSUFFICIENT_CASH",`現金不足，需要 ${choice.cost}`);
  const assetEffect=choice.effects.find(effect=>effect.type==="asset.grant");
  if(assetEffect&&input.assets?.[assetEffect.category]?.some(asset=>asset.id===assetEffect.assetId)) throw new GameError("ASSET_OWNED",`已經持有：${assetEffect.name}`);
  let state=clone(input), success=true, roll=null;
  if(choice.check){ const n=rngNext(state.seed); state.seed=n.seed; roll=Math.floor(n.value*41)+20; const score=abilityValue(state,choice.check.ability)+roll; success=score>=choice.check.difficulty+28; }
  let effects=choice.effects;
  if(!success) effects=[{type:"stat.add",key:"health",value:-7},{type:"stat.add",key:"stress",value:6}];
  effects=effects.map(effect=>effect.type==="asset.grant"?{...effect,basePrice:choice.cost}:effect);state=applyEffects(state,effects,`${event.id}:${choice.id}`); state.seen[event.id]=true;state=completeOfficialProgress(state,event.id);
  state.lastResult={title:event.title,choice:choice.text,success,roll,check:choice.check||null,summary:success?(choice.result||"行動奏效，城市的狀態已經改變。"):(choice.failureResult||"事情沒有照計畫發展。你承受了代價，但故事仍會繼續。")};
  if(state.finished&&!state.postgame)state.phase="ending";else if(state.phase!=="battle") state.phase="result";
  return state;
}
function battleActionBase(input,action){
  if(input.phase!=="battle"||!input.battle) throw new GameError("WRONG_PHASE","目前不在戰鬥中");
  let state=clone(input), b=state.battle; let message=""; b.guard=false;const support=crewPower(state),bonuses=combinedBonuses(state),intent=b.intent||"assault",enemyDefending=intent==="defend";
  const n=rngNext(state.seed); state.seed=n.seed;
  if(action==="attack"){ let damage=8+Math.floor(state.player.abilities.reflex/9)+Math.floor(support/8)+bonuses.attack+Math.floor(n.value*7);if(enemyDefending)damage=Math.max(1,Math.ceil(damage*.55)); b.enemyHp-=damage; message=`你和隊伍交叉射擊，裝備與槍手專長共同造成 ${damage} 傷害。`; }
  else if(action==="brawl"){let damage=7+Math.floor(state.player.abilities.physique/8)+Math.floor(support/7)+bonuses.brawl+Math.floor(n.value*9);if(enemyDefending)damage=Math.max(1,Math.ceil(damage*.55));b.enemyHp-=damage;message=`你帶人貼近敵陣，近戰裝備與隊員專長共同造成 ${damage} 傷害。`;}
  else if(action==="hack"){ let damage=5+Math.floor(state.player.abilities.hacking/6)+Math.floor(support/12)+bonuses.hack;if(enemyDefending)damage=Math.max(1,Math.ceil(damage*.55)); b.enemyHp-=damage; b.enemyHp=Math.max(0,b.enemyHp); message=`你利用通訊、燈光與場地設備干擾戰場，造成 ${damage} 傷害。`; }
  else if(action==="guard"){ b.guard=true; message="你壓低身體，準備卸開衝擊。"; }
  else if(action==="flee"){
    const escaped=state.player.abilities.engineering+Math.floor(state.player.abilities.perception/2)+bonuses.flee+Math.floor(n.value*31)>=65;
    if(escaped){const title=b.title,defenseLost=b.battleType==="defend",territory=territoryById(b.territoryId);if(defenseLost&&territory){state.territories[b.territoryId].owner=b.factionId;state.pendingRetaliation=null;}state.crew.morale=clamp(state.crew.morale-4,[0,100]);state=applyEffects(state,[{type:"stat.add",key:"stress",value:5}],"battle:flee");state.battle=null;state.phase="result";state.lastResult={title,choice:"主動撤離",success:false,summary:`你利用車輛與巷道成功脫離，沒有取得報酬。${defenseLost?`${territory.name}因此失守。`:"隊伍士氣略受影響，但保住了戰力。"}`};return state;}message="你嘗試撤離，但出口已被敵人封死。";
  }
  else throw new GameError("UNKNOWN_ACTION",`未知戰鬥動作：${action}`);
  if(b.enemyHp<=0){const rewards=[{type:"resource.add",value:b.reward},{type:"ability.add",key:b.rewardAbility,value:b.rewardAbilityValue},{type:"flag.set",key:"battle_won",value:true}];if(b.rewardWorld)rewards.push({type:"world.add",key:b.rewardWorld,value:b.rewardWorldValue});if(b.rewardHealth)rewards.push({type:"stat.add",key:"health",value:b.rewardHealth});if(b.securityOnWin)rewards.push({type:"world.add",key:"security",value:b.securityOnWin});if(b.bonusWill)rewards.push({type:"ability.add",key:"will",value:b.bonusWill});state=applyEffects(state,rewards,"battle:win");const title=b.title,result=b.result,reward=b.reward,territory=territoryById(b.territoryId);if(b.factionId&&state.factions[b.factionId]){const status=state.factions[b.factionId],before=`${status.hostility}/${status.respect}`;status.wins++;status.hostility=clamp(status.hostility+(b.battleType==="capture"?14:b.battleType==="defend"?10:6),[0,100]);status.respect=clamp(status.respect+(b.battleType==="capture"?12:8),[0,100]);logEffect(state,"battle:win","faction.change",b.factionId,before,`${status.hostility}/${status.respect}`,null);}if(b.battleType==="capture"&&territory){state.territories[b.territoryId].owner="player";state.territories[b.territoryId].capturedDay=state.day;}if(b.battleType==="defend")state.pendingRetaliation=null;state.crew.morale=clamp(state.crew.morale+5,[0,100]);state.battle=null;state.phase="result";state.lastResult={title,choice:b.battleType==="capture"?"奪下地盤":b.battleType==="defend"?"守住地盤":"贏下戰鬥",success:true,summary:`${result} 本次取得現金 ${reward}；隊伍士氣上升，幫派敵意與敬意也同時提高。`}; return state; }
  if(intent==="reinforce"){const restored=Math.min(8,Math.max(0,999-b.enemyHp));b.enemyHp+=restored;message+=` 敵方增援抵達，恢復 ${restored} 戰力。`;}
  if(intent==="disrupt"){state=applyEffects(state,[{type:"stat.add",key:"stress",value:4}],"battle:disrupt");b=state.battle;message+=" 敵方干擾通訊，你的精神壓力上升。";}
  const enemyRoll=rngNext(state.seed); state.seed=enemyRoll.seed; let hurt=(b.enemyDamage||7)+Math.floor(enemyRoll.value*7)+(intent==="assault"?4:0); if(b.guard) hurt=Math.floor(hurt/2); b.playerHp-=hurt; message+=` ${b.enemy}反擊，造成 ${hurt} 傷害。`; b.turn++;b.intent=rollEnemyIntent(state);
  if(b.playerHp<=0){const rawMedical=Math.max(6,Math.ceil(b.reward*.15)),medicalLoss=Math.min(state.player.resource,Math.max(0,rawMedical-(b.medicalReduction||0))),territory=territoryById(b.territoryId),defenseLost=b.battleType==="defend";state=applyEffects(state,[{type:"stat.add",key:"health",value:-22},{type:"resource.add",value:-medicalLoss},{type:"flag.set",key:"battle_lost",value:true}],"battle:loss");if(state.player.health<=0)state.player.health=1;if(b.factionId&&state.factions[b.factionId]){const status=state.factions[b.factionId];status.losses++;status.hostility=clamp(status.hostility+4,[0,100]);status.respect=clamp(status.respect+1,[0,100]);}if(defenseLost&&territory){state.territories[b.territoryId].owner=b.factionId;state.territories[b.territoryId].level=Math.max(0,(state.territories[b.territoryId].level||0)-1);state.pendingRetaliation=null;}state.crew.morale=clamp(state.crew.morale-8,[0,100]);const title=b.title,enemy=b.enemy;state.battle=null;state.phase="result";state.lastResult={title,choice:defenseLost?"地盤失守":"負傷撤離",success:false,summary:`你沒能擊敗${enemy}，但同伴把你送出戰場。支付醫療與撤離費 ${medicalLoss}${b.medicalReduction?`（團隊與物品減免 ${Math.min(rawMedical,b.medicalReduction)}）`:""}。${defenseLost?`${territory.name}被奪回，地盤強化下降 1 級。`:"故事仍會繼續，你也可以日後再次挑戰。"}`}; return state; }
  b.message=message; return state;
}
function advanceStage(input){
  let state=clone(input);state.buffs=(state.buffs||[]).map(buff=>({...buff,remaining:buff.remaining-1})).filter(buff=>buff.remaining>0);state.stage++;
  if(state.stage>=STAGES.length){
    state.stage=0;state.day++;
    const ownsCar=state.assets?.vehicles?.some(asset=>asset.id==="vehicle_grey_sport"),ownsGarage=state.assets?.industries?.some(asset=>asset.id==="industry_east_garage"),vehicleSelfMaintained=(state.assets?.vehicles||[]).some(asset=>(asset.level||0)>=3);
    const status=cityStatusById(state.cityStatus),baseIndustryIncome=(state.assets?.industries||[]).reduce((sum,asset)=>sum+(asset.dailyIncome||0),0),businessBonus=baseIndustryIncome?combinedBonuses(state).income:0,industryIncome=Math.round((baseIndustryIncome+businessBonus)*(status.industryIncomeRate||1)),turfIncome=Math.round(territoryIncome(state)*(status.turfIncomeRate||1));
    state=applyEffects(state,[{type:"resource.add",value:(state.flags.safehouse?3:0)+industryIncome+turfIncome-(ownsCar&&!ownsGarage&&!vehicleSelfMaintained?1:0)}],"day:end");
    state.lastSettlement={industryIncome,businessBonus,turfIncome,vehicleMaintenance:ownsCar&&!ownsGarage&&!vehicleSelfMaintained?1:0,day:state.day-1};
    const expiredQuestId=state.activeSideQuest?.deadlineDay&&state.day>state.activeSideQuest.deadlineDay?state.activeSideQuest.id:null;
    if(state.activeSideQuest?.deadlineDay&&state.day>state.activeSideQuest.deadlineDay){const expired=SIDE_QUESTS.find(quest=>quest.id===state.activeSideQuest.id);state=applyEffects(state,[{type:"stat.add",key:"stress",value:7},{type:"world.add",key:"people",value:-4}],`sidequest:${expired.id}:expired`);state.flags[`expired.${expired.id}`]=true;state.activeSideQuest=null;}
    if(expiredQuestId){const expired=SIDE_QUESTS.find(quest=>quest.id===expiredQuestId);state.lastResult=resultRecord(`sidequest:${expired.id}`,"expired",{title:expired.title,choice:"任務逾期",success:false,summary:"你錯過了支線任務的期限。相關人物已經各自離開，這條線不會再次出現。"});}
    const owned=controlledTerritories(state);if(owned.length&&!state.pendingRetaliation){const maxHostility=Math.max(...owned.map(territory=>state.factions[territory.factionId]?.hostility||0)),risk=Math.min(.55,.06+owned.length*.025+maxHostility/500),chance=rngNext(state.seed);state.seed=chance.seed;if(chance.value<risk){const pick=rngNext(state.seed);state.seed=pick.seed;const territory=owned[Math.floor(pick.value*owned.length)];state.pendingRetaliation={territoryId:territory.id,factionId:territory.factionId,sinceDay:state.day};}}
    state.cityStatusIndex=((state.cityStatusIndex??initialCityStatusIndex(state.seed))+1)%CITY_STATUSES.length;state.cityStatus=CITY_STATUSES[state.cityStatusIndex].id;
  }
  return generateCards(state);
}
export function continueStage(input){if(input.phase!=="result")throw new GameError("WRONG_PHASE","事件尚未結束");const state=clone(input);if(state.flags)delete state.flags.assistantActionPending;if(state.chapterTransition){state.phase="chapterTransition";state.candidates=[];return state;}return advanceStage(state);}
export function continueChapterTransition(input){if(input.phase!=="chapterTransition"||!input.chapterTransition)throw new GameError("WRONG_PHASE","目前沒有章節轉場");const state=clone(input);state.chapterTransition=null;state.phase="result";return advanceStage(state);}
export function continueFreePlay(input){if(input.phase!=="ending"||!input.finished)throw new GameError("WRONG_PHASE","主線尚未完成");const state=clone(input);state.postgame=true;state.phase="result";return advanceStage(state);}
export function validateSave(data){
  if(!data||![1,2].includes(data.version)||!data.player?.abilities)throw new GameError("INVALID_SAVE","存檔格式無效或版本不相容");
  if(data.version===1){const migrated=newGame();migrated.player.abilities={...migrated.player.abilities,...Object.fromEntries(Object.entries(data.player.abilities).filter(([key])=>key in migrated.player.abilities).map(([key,value])=>[key,clamp(Math.round(Number(value)||0),LIMITS.ability)]))};migrated.player.resource=clamp(Math.round(Number(data.player.resource)||0),LIMITS.resource);migrated.assets=clone(data.assets||migrated.assets);normalizeAssets(migrated);return migrated;}
  const base=newGame(data.gender,data.seed),state={...base,...clone(data)};state.version=2;state.contentVersion="0.9.0-unlimited-story";state.day=Math.max(1,Math.round(Number(state.day)||1));state.player={...base.player,...state.player,abilities:{...base.player.abilities,...(state.player?.abilities||{})}};for(const key of ["health","fatigue","stress"])state.player[key]=clamp(Math.round(Number(state.player[key])||0),LIMITS[key]);state.player.resource=clamp(Math.round(Number(state.player.resource)||0),LIMITS.resource);for(const key of Object.keys(base.player.abilities))state.player.abilities[key]=clamp(Math.round(Number(state.player.abilities[key])||0),LIMITS.ability);state.assets=state.assets||base.assets;normalizeAssets(state);state.buffs=Array.isArray(state.buffs)?state.buffs:[];state.completedSideQuests=Array.isArray(state.completedSideQuests)?state.completedSideQuests:[];state.metContacts=state.metContacts||{};state.customCards=Array.isArray(state.customCards)?state.customCards:[];state.cardOverrides=state.cardOverrides||{};state.unlockedSideQuests=Array.isArray(state.unlockedSideQuests)?state.unlockedSideQuests:[];state.factions={...freshFactions(),...(state.factions||{})};state.territories={...freshTerritories(),...(state.territories||{})};for(const territory of TERRITORIES){state.territories[territory.id].level??=0;state.territories[territory.id].capturedDay??=null;}state.crew={...base.crew,...(state.crew||{})};state.relations={...base.relations,...(state.relations||{})};state.characterLevels={...base.characterLevels,...(state.characterLevels||{})};for(const id of CHARACTER_IDS)state.characterLevels[id]=Math.max(1,Math.round(state.characterLevels[id]||1));state.knownContacts=[...new Set(Array.isArray(state.knownContacts)?state.knownContacts:base.knownContacts)].filter(id=>CONTACTS.some(contact=>contact.id===id));state.unlockedCharacterEvents=Array.isArray(state.unlockedCharacterEvents)?state.unlockedCharacterEvents:[];state.completedCharacterEvents=Array.isArray(state.completedCharacterEvents)?state.completedCharacterEvents:[];state.team={...base.team,...(state.team||{})};state.team.roster=(state.team.roster||[]).filter(item=>teamMemberById(item.id)).map(item=>({...item,level:state.characterLevels[item.id]||Math.max(1,item.level||1)}));const ownedTeam=new Set(state.team.roster.map(item=>item.id));state.team.active=[...new Set(state.team.active||[])].filter(id=>ownedTeam.has(id)).slice(0,TEAM_LIMIT);state.pendingRetaliation??=null;state.log=Array.isArray(state.log)?state.log:[];state.sequence=Number.isInteger(state.sequence)?state.sequence:state.log.length;state.chapter=chapterForProgress(state);return state;
}
function normalizeAssets(state){state.assets??={};for(const category of ["properties","vehicles","weapons","items","luxuries","industries"]){state.assets[category]=Array.isArray(state.assets[category])?state.assets[category]:[];for(const asset of state.assets[category]){const marketEffect=getEvent("asset_market").choices.flatMap(choice=>choice.effects).find(effect=>effect.type==="asset.grant"&&effect.assetId===asset.id);asset.level??=0;asset.basePrice??=ASSET_BASE_PRICES[asset.id]||1;asset.dailyIncome??=marketEffect?.dailyIncome||0;asset.combatPower??=marketEffect?.combatPower||0;asset.armor??=marketEffect?.armor||0;asset.bonuses={...(marketEffect?.bonuses||{}),...(asset.bonuses||{})};asset.description??=marketEffect?.description||"";}}}
function modifyValueBase(input,path,value){
  const state=clone(input),number=Number(value);if(!Number.isFinite(number))throw new GameError("INVALID_VALUE","修改值必須是數字");
  const direct={health:[state.player,"health",LIMITS.health],fatigue:[state.player,"fatigue",LIMITS.fatigue],stress:[state.player,"stress",LIMITS.stress],resource:[state.player,"resource",LIMITS.resource],...Object.fromEntries(CHARACTER_IDS.map(id=>[id,[state.relations,id,LIMITS.relation]])),corporate:[state.world,"corporate",LIMITS.world],gangs:[state.world,"gangs",LIMITS.world],security:[state.world,"security",LIMITS.world],people:[state.world,"people",LIMITS.world],ai:[state.world,"ai",LIMITS.world]};
  if(path.startsWith("ability.")){const key=path.slice(8);if(!(key in state.player.abilities))throw new GameError("INVALID_VALUE","未知能力");state.player.abilities[key]=clamp(Math.round(number),LIMITS.ability);}
  else if(direct[path]){const [target,key,limit]=direct[path];target[key]=clamp(Math.round(number),limit);}
  else if(path==="crew.members")state.crew.members=clamp(Math.round(number),[1,20]);
  else if(path==="crew.morale")state.crew.morale=clamp(Math.round(number),[0,100]);
  else if(path==="day"){state.day=Math.max(1,Math.round(number));state.chapter=chapterForProgress(state);state.stage=0;state.phase="result";state.lastResult={title:"修改器",choice:"變更日期",success:true,summary:`日期已修改為第 ${state.day} 日。章節仍依主線完成順序決定；按繼續重新抽牌。`};}
  else throw new GameError("INVALID_VALUE","不允許修改這個欄位");return state;
}
export function saveCardDefinition(input,definition){
  const state=clone(input);const title=String(definition.title||"").trim(),summary=String(definition.summary||"").trim();if(!title||!summary)throw new GameError("INVALID_CARD","卡牌名稱與說明不能空白");
  const effects=(definition.effects||[]).filter(effect=>Number(effect.value)!==0).map(effect=>({...effect,value:Number(effect.value)}));
  if(definition.baseId){const base=getEvent(definition.baseId,state);state.cardOverrides[base.id]={title,summary,tag:String(definition.tag||base.tag||"自訂"),cost:Math.max(0,Number(definition.cost)||0),effects,customDirect:true,result:String(definition.result||summary)};}
  else{const id=`custom_${Date.now()}_${Math.floor(state.seed%10000)}`,deck=["life","night","main"].includes(definition.deck)?definition.deck:"night";state.customCards.push({id,deck,stage:deck==="main"?0:deck==="life"?1:2,main:deck==="main",repeatable:deck!=="main",customDirect:true,title,summary,tag:String(definition.tag||"自訂"),cost:Math.max(0,Number(definition.cost)||0),effects,result:String(definition.result||summary)});}
  return state;
}
export function deleteCustomCard(input,id){const state=clone(input);state.customCards=state.customCards.filter(card=>card.id!==id);delete state.cardOverrides[id];return state;}
function resolveDirectCard(input,card){const identity=cardArtIdentity(card,input.deckType);return withResultArt(resolveDirectCardBase(input,card),identity.parentId,identity.optionId);}
function openNightCard(input,card){return withResultArt(openNightCardBase(input,card),`activity:night:${card.id}`,card.id);}
export function resolveNightOption(input,id){return withResultArt(resolveNightOptionBase(input,id),input.selected,id);}
export function resolveCharacterEventChoice(input,choiceId){return withResultArt(resolveCharacterEventChoiceBase(input,choiceId),input.selectedCharacterEvent,choiceId);}
function activityArtIds(input,id){
  if(input.activityKind==="purchase")return ["asset_market",id];
  if(input.activityKind==="social")return [`activity:contacts:${id}`,id];
  return [`activity:${input.activityKind}:${id}`,id];
}
export function resolveActivity(input,id){const [parentId,optionId]=activityArtIds(input,id);return withResultArt(resolveActivityBase(input,id),parentId,optionId);}
function resolveWork(input){return withResultArt(resolveWorkBase(input),"activity:life:life_work","life_work");}
export function declineSideQuests(input){return withResultArt(declineSideQuestsBase(input),"sidequest","decline");}
export function resolveSideQuestChoice(input,choiceId){return withResultArt(resolveSideQuestChoiceBase(input,choiceId),`sidequest:${input.activeSideQuest.id}:${input.activeSideQuest.nodeIndex}`,choiceId);}
export function abandonSideQuest(input){return withResultArt(abandonSideQuestBase(input),`sidequest:${input.activeSideQuest.id}`,"abandon");}
export function upgradeAsset(input,category,assetId){const identity=upgradeArtIdentity(category,assetId);return withResultArt(upgradeAssetBase(input,category,assetId),identity.parentId,identity.optionId);}
export function fortifyTerritory(input,territoryId){return withResultArt(fortifyTerritoryBase(input,territoryId),`territory:${territoryId}`,"fortify");}
export function recruitCrew(input){return withResultArt(recruitCrewBase(input),"crew","recruit");}
export function recruitTeamMember(input,memberId){return withResultArt(recruitTeamMemberBase(input,memberId),`team:${memberId}`,"recruit");}
export function resolveChoice(input,choiceId){return withResultArt(resolveChoiceBase(input,choiceId),input.selected,choiceId);}
export function battleAction(input,action){return withResultArt(battleActionBase(input,action),"battle",action);}
export function modifyValue(input,path,value){return withResultArt(modifyValueBase(input,path,value),"modifier",path);}
export function endingText(state){
  if(state.flags.ending_free) return "證據在全國新聞同步播出。警長被捕、高萬城潛逃，而你成了揭露真相的罪犯。阿哲趁混亂消失，只留下三年前欠你的那一份錢。";
  if(state.flags.ending_restore) return "你救出若琳，帶著現金離開海港市。新聞把一切歸咎於阿哲；你知道這不是正義，但家人第一次擁有選擇未來的本錢。";
  return "市府地下傳出整夜可見的火光。帳本、贓款、警長與阿哲全被埋進同一座墳墓；只有你知道三年前真正發生了什麼。";
}
