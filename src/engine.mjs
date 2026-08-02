import { EVENTS, STAGES } from "./content.mjs";
import { LIFE_CARDS, LEISURE_CARDS, TRAINING_CARDS, CONTACTS, JOBS, SIDE_QUESTS } from "./life-content.mjs";
import { NIGHT_CARDS } from "./night-content.mjs";
import { CHAPTER_EVENTS, chapterForDay } from "./chapter-content.mjs";

const LIMITS = { health:[0,100], fatigue:[0,100], stress:[0,100], resource:[0,999], ability:[0,100], relation:[-100,100], world:[0,100] };
const ASSET_BASE_PRICES={property_riverside_flat:40,property_suburban_safehouse:28,vehicle_grey_sport:22,vehicle_black_suv:18,weapon_sawed_shotgun:14,weapon_silenced_pistol:18,luxury_gold_watch:10,luxury_black_bag:12,industry_bay_diner:18,industry_east_garage:28,industry_blue_nightclub:36,industry_old_apartments:50};
export class GameError extends Error { constructor(code,message){ super(message); this.code=code; } }
export function rngNext(seed){ let x=seed|0; x^=x<<13; x^=x>>>17; x^=x<<5; return {seed:x>>>0,value:(x>>>0)/4294967296}; }
const clone = value => structuredClone(value);
const clamp = (value,[min,max]) => Math.max(min,Math.min(max,value));

export function newGame(gender="不公開",seed=2026){
  return {
    version:1, contentVersion:"0.5.0-five-chapters", seed:seed>>>0, gender, day:1, stage:0, chapter:1, phase:"cards", candidates:[], selected:null, battle:null, finished:false,
    player:{health:100,fatigue:10,stress:8,resource:24,abilities:{physique:28,reflex:28,hacking:28,engineering:28,social:28,perception:28,will:28,management:28}},
    assets:{properties:[],vehicles:[],weapons:[],luxuries:[],industries:[]}, buffs:[], activeSideQuest:null, completedSideQuests:[], metContacts:{},
    relations:{mira:0,kael:0,zero:0}, world:{corporate:55,gangs:45,security:58,people:42,ai:35}, flags:{}, seen:{}, cooldown:{}, customCards:[], cardOverrides:{}, unlockedSideQuests:[], log:[], sequence:0
  };
}

function requirementMet(state,event){
  const r=event.requirements||{};
  return (!r.dayMin||state.day>=r.dayMin)&&(!r.dayMax||state.day<=r.dayMax)&&(!state.seen[event.id]||event.repeatable)&&(!event.blocker||!state.flags[event.blocker]);
}
function shuffledWeighted(state,list){
  const scored=list.map(item=>{ const n=rngNext(state.seed); state.seed=n.seed; return {item,score:-Math.log(Math.max(n.value,1e-9))/(item.weight||1)}; });
  return scored.sort((a,b)=>a.score-b.score).map(x=>x.item);
}
export function generateCards(input){
  const state=clone(input);
  if(state.finished) return state;
  state.chapter=chapterForDay(state.day);
  const custom=(state.customCards||[]).filter(card=>card.enabled!==false);
  const storyEvents=[...EVENTS,...CHAPTER_EVENTS,...custom.filter(card=>card.deck==="main")];
  const stageEligible=storyEvents.filter(e=>e.stage===state.stage&&requirementMet(state,e));
  const morningMain=state.stage===0?stageEligible.filter(e=>e.main):[];
  if(state.stage===0&&morningMain.length){
    state.deckType="mainline";
    state.candidates=morningMain.map(e=>e.id);
  }else{
    const sourceStage=state.stage===0?1:state.stage;
    let eligible;
    if(sourceStage===1) eligible=[...LIFE_CARDS.filter(card=>card.id!=="life_purchase"||marketAvailable(state)),...custom.filter(card=>card.deck==="life")];
    else eligible=[...NIGHT_CARDS.filter(card=>nightUnlocked(state,card)),...custom.filter(card=>card.deck==="night")];
    state.deckType=sourceStage===1?"life":"night";
    let selected=shuffledWeighted(state,eligible).slice(0,5);
    if(sourceStage===1){
      const reserved=[];
      if(state.activeSideQuest) reserved.push("life_sidequest");
      if(state.player.resource<10) reserved.push("life_work");
      if(state.player.health<50||state.player.fatigue>65||state.player.stress>65) reserved.push("life_leisure");
      for(const id of [...new Set(reserved)]) if(!selected.some(card=>card.id===id)){selected.pop();selected.push(LIFE_CARDS.find(card=>card.id===id));}
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
    state.candidates=selected.map(e=>e.id);
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
function logEffect(state,source,type,target,before,after,delta){ state.log.push({sequence:++state.sequence,day:state.day,stage:state.stage,source,type,target,before,after,delta}); }
function add(state,container,key,value,limit,source,type){ const before=container[key]??0; const after=clamp(before+value,limit); container[key]=after; logEffect(state,source,type,key,before,after,after-before); }
export function applyEffects(input,effects,source="system"){
  const state=clone(input);
  try{
    for(const effect of effects){
      switch(effect.type){
        case "ability.add": add(state,state.player.abilities,effect.key,effect.value,LIMITS.ability,source,effect.type); break;
        case "stat.add": add(state,state.player,effect.key,effect.value,LIMITS[effect.key],source,effect.type); break;
        case "resource.add": add(state,state.player,"resource",effect.value,LIMITS.resource,source,effect.type); break;
        case "relation.add": add(state,state.relations,effect.key,effect.value,LIMITS.relation,source,effect.type); break;
        case "world.add": add(state,state.world,effect.key,effect.value,LIMITS.world,source,effect.type); break;
        case "flag.set": { const before=state.flags[effect.key]; state.flags[effect.key]=effect.value; logEffect(state,source,effect.type,effect.key,before,effect.value,null); break; }
        case "buff.add": { const incoming={...effect,remaining:effect.duration}; const current=state.buffs.find(buff=>buff.id===effect.id); const before=current?`${current.label} ${current.value}/${current.remaining}`:null; if(!current) state.buffs.push(incoming); else if(effect.value>=current.value) Object.assign(current,incoming); logEffect(state,source,effect.type,effect.id,before,`${incoming.label} ${incoming.value}/${incoming.duration}`,null); break; }
        case "asset.grant": { const list=state.assets?.[effect.category]; if(!Array.isArray(list)) throw new GameError("INVALID_ASSET_CATEGORY",`未知資產類別：${effect.category}`); if(list.some(asset=>asset.id===effect.assetId)) throw new GameError("ASSET_OWNED",`已經持有：${effect.name}`); list.push({id:effect.assetId,name:effect.name,acquiredDay:state.day,dailyIncome:effect.dailyIncome||0,basePrice:effect.basePrice||1,level:0}); logEffect(state,source,effect.type,effect.category,null,effect.name,null); break; }
        case "asset.upgrade": { const asset=state.assets?.[effect.category]?.find(item=>item.id===effect.assetId); if(!asset) throw new GameError("UNKNOWN_ASSET",`找不到資產：${effect.assetId}`); const before=asset.level||0; if(effect.success){asset.level=before+1;if(asset.dailyIncome)asset.dailyIncome+=1+({3:2,5:3,10:5}[asset.level]||0);} logEffect(state,source,effect.type,effect.assetId,before,asset.level,effect.success?1:0); break; }
        case "battle.start": { const armed=state.assets?.weapons?.length>0;const weaponPower=(state.assets?.weapons||[]).reduce((sum,asset)=>sum+(asset.level||0)*2+((asset.level||0)>=3?5:0)+((asset.level||0)>=5?8:0)+((asset.level||0)>=10?15:0),0);const vehicleArmor=(state.assets?.vehicles||[]).reduce((sum,asset)=>sum+(asset.level||0)*2,0); state.battle={enemy:effect.enemy,playerHp:45+Math.floor(state.player.abilities.physique/2)+vehicleArmor,enemyHp:Math.max(25,(armed?64:72)-weaponPower),guard:false,turn:1,message:armed?"黑色休旅車急煞。你搶先抽出準備好的武器，逼第一批槍手尋找掩護。":"黑色休旅車急煞，便衣槍手從兩側包圍。"}; state.phase="battle"; break; }
        default: throw new GameError("UNKNOWN_EFFECT",`不支援的效果：${effect.type}`);
      }
    }
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
  if(card.hub==="social"){state.activityKind="social";state.activityOptions=CONTACTS.filter(contact=>!state.metContacts[`${state.day}:${contact.id}`]).map(contact=>contact.id);state.phase="activity";return state;}
  if(card.hub==="purchase"){state.activityKind="purchase";state.activityOptions=getEvent("asset_market").choices.map(option=>option.id);state.phase="activity";return state;}
  if(card.hub==="work") return resolveWork(state);
  if(card.hub==="sidequest"){
    if(state.activeSideQuest){state.phase="sidequestNode";return state;}
    const pool=SIDE_QUESTS.filter(quest=>!state.completedSideQuests.includes(quest.id));
    state.sideQuestCandidates=shuffledWeighted(state,pool).slice(0,3).map(quest=>quest.id);state.phase="sidequestPick";return state;
  }
  throw new GameError("UNKNOWN_HUB",`未知生活卡牌：${card.hub}`);
}
function resolveDirectCard(input,card){
  if(card.cost&&input.player.resource<card.cost)throw new GameError("INSUFFICIENT_CASH",`現金不足，需要 ${card.cost}`);
  const effects=[...(card.cost?[{type:"resource.add",value:-card.cost}]:[]),...(card.effects||[])];let state=applyEffects(input,effects,`custom:${card.id}`);state.phase="result";state.lastResult={title:card.title,choice:card.title,success:true,summary:card.result||card.summary||"自訂卡牌已結算。"};return state;
}
function openNightCard(input,card){
  if(card.cost&&input.player.resource<card.cost)throw new GameError("INSUFFICIENT_CASH",`現金不足，需要 ${card.cost}`);
  if(card.hub){
    const state=clone(input);state.activityKind=`night:${card.hub}`;
    if(card.hub==="property")state.activityOptions=state.assets.properties.map(asset=>asset.id);
    else if(card.hub==="contact")state.activityOptions=CONTACTS.map(contact=>contact.id);
    else if(card.hub==="industry")state.activityOptions=state.assets.industries.map(asset=>asset.id);
    else if(card.hub==="industryContact")state.activityOptions=state.assets.industries.flatMap(asset=>CONTACTS.map(contact=>`${asset.id}|${contact.id}`));
    else if(card.hub==="industryRisk")state.activityOptions=state.assets.industries.map(asset=>asset.id);
    state.phase="activity";return state;
  }
  if(card.risk){
    let state=applyEffects(input,[{type:"resource.add",value:-card.cost}],`night:${card.id}:entry`);const ability=card.abilities.slice().sort((a,b)=>abilityValue(state,b)-abilityValue(state,a))[0];const n=rngNext(state.seed);state.seed=n.seed;const roll=Math.floor(n.value*41)+20;const success=abilityValue(state,ability)+roll>=card.difficulty+28;
    const effects=success?[{type:"resource.add",value:card.reward},...card.effects]:card.failure;state=applyEffects(state,effects,`night:${card.id}:${success?"success":"failure"}`);if(state.player.health<=0){state.player.health=1;state.flags.hospitalDebt=(state.flags.hospitalDebt||0)+10;state.unlockedSideQuests=[...new Set([...(state.unlockedSideQuests||[]),"sq_hospital_debt"])];}
    state.phase="result";state.lastResult={title:card.title,choice:success?"把握刺激":"承受代價",success,roll,check:{ability,difficulty:card.difficulty},summary:success?`你從危險中全身而退，獲得現金 ${card.reward}，也暫時忘了白天的壓力。`:`事情失控了。你沒有被故事淘汰，但傷勢、疲勞或警方注意會跟到明天。${state.flags.hospitalDebt?" 地下診所替你保住性命，也記下了一筆欠款。":""}`};return state;
  }
  let state=applyEffects(input,card.effects||[],`night:${card.id}`);let extra="";if(card.random){const n=rngNext(state.seed);state.seed=n.seed;if(n.value<.3){state=applyEffects(state,[{type:"ability.add",key:"perception",value:1}],`night:${card.id}:random`);extra=" 隨機插曲：你無意間聽到一條可疑交易消息，觀察永久 +1。";}}
  state.phase="result";state.lastResult={title:card.title,choice:card.title,success:true,summary:(card.result||card.summary)+extra};return state;
}
export function resolveNightOption(input,id){
  if(input.phase!=="activity"||!input.activityKind?.startsWith("night:"))throw new GameError("WRONG_PHASE","目前不在夜生活選單");
  const card=getEvent(input.selected,input);if(id==="cancel"){const state=clone(input);state.phase="result";state.lastResult={title:card.title,choice:"取消安排",success:true,summary:"你沒有進行活動，但尋找場所仍花掉了整晚。"};return state;}
  if(!input.activityOptions.includes(id))throw new GameError("UNKNOWN_ACTIVITY",`未知夜生活選項：${id}`);
  let state=clone(input),effects=[],label="",summary="";
  if(input.activityKind==="night:property"){
    const asset=state.assets.properties.find(item=>item.id===id),level=asset.level||0,milestone=(level>=10?10:level>=5?5:level>=3?3:0);effects=[{type:"stat.add",key:"fatigue",value:-(18+level*2)},{type:"stat.add",key:"stress",value:-(6+level+milestone)},{type:"stat.add",key:"health",value:3+level+milestone},buffEffect("property_sleep",`${asset.name}的好眠`,"physique",1+Math.floor(level/3))];label=asset.name;summary=`你回到 ${asset.name}，升級 +${level} 的設備讓這晚恢復得更完整。`;
  }else if(input.activityKind==="night:contact"){
    const contact=CONTACTS.find(item=>item.id===id),second=!!state.metContacts[`${state.day}:${id}`],gain=second?3:6;effects=[{type:"resource.add",value:-card.cost},{type:"relation.add",key:id,value:gain},{type:"stat.add",key:"fatigue",value:card.id.includes("drive")?3:-5},{type:"stat.add",key:"stress",value:-12},...(card.id.includes("drive")?[buffEffect("social_drive","有人同行","engineering",2)]:[buffEffect("social_night","有人陪伴","social",2)])];state.metContacts[`${state.day}:${id}`]=true;label=contact.name;summary=`你和${contact.name}一起度過晚上。${second?"這是今天第二次見面，關係提升效果減半。":"你們之間多了一段不必向別人解釋的共同記憶。"}`;
  }else{
    const [assetId,contactId]=id.split("|"),asset=state.assets.industries.find(item=>item.id===assetId);const level=asset.level||0;if(!asset)throw new GameError("UNKNOWN_ASSET","找不到產業");label=asset.name;
    if(input.activityKind==="night:industry"){effects=[{type:"resource.add",value:Math.max(2,(asset.dailyIncome||0)+level)},{type:"stat.add",key:"stress",value:-7},{type:"stat.add",key:"fatigue",value:-4}];summary=`你親自巡視 ${asset.name}，解決小問題並拿到今晚額外收入。`;}
    else if(input.activityKind==="night:industryContact"){const contact=CONTACTS.find(item=>item.id===contactId),second=!!state.metContacts[`${state.day}:${contactId}`];effects=[{type:"resource.add",value:-card.cost},{type:"relation.add",key:contactId,value:second?3:6},{type:"resource.add",value:Math.max(1,Math.floor((asset.dailyIncome||0)/2))},{type:"stat.add",key:"stress",value:-10}];state.metContacts[`${state.day}:${contactId}`]=true;label=`${asset.name}／${contact.name}`;summary=`你在 ${asset.name} 招待${contact.name}，談感情也談生意。`;}
    else{const ability=["management","social","perception"].sort((a,b)=>abilityValue(state,b)-abilityValue(state,a))[0],n=rngNext(state.seed);state.seed=n.seed;const roll=Math.floor(n.value*41)+20,success=abilityValue(state,ability)+roll>=70;effects=success?[{type:"resource.add",value:5+level},{type:"stat.add",key:"stress",value:-5}]:[{type:"resource.add",value:-Math.min(state.player.resource,4+level)},{type:"stat.add",key:"stress",value:6}];state=applyEffects(state,effects,`night:industryRisk:${asset.id}`);state.phase="result";state.lastResult={title:card.title,choice:asset.name,success,roll,check:{ability,difficulty:42},summary:success?"你在打烊前找出問題源頭，保住收入與員工信心。":"問題沒有完全解決，你付出一筆損失，但產業仍能繼續營業。"};return state;}
  }
  state=applyEffects(state,effects,`night:${card.id}:${id}`);state.phase="result";state.lastResult={title:card.title,choice:label,success:true,summary};return state;
}
function buffEffect(id,label,ability,value){return {type:"buff.add",id,label,ability,value,duration:5};}
function abilityValue(state,key){return (state.player.abilities[key]||0)+state.buffs.filter(buff=>buff.ability===key).reduce((sum,buff)=>sum+buff.value,0);}
function activityOption(state,id){
  if(state.activityKind==="leisure") return LEISURE_CARDS.find(option=>option.id===id);
  if(state.activityKind==="training") return TRAINING_CARDS.find(option=>option.id===id);
  if(state.activityKind==="social") return CONTACTS.find(option=>option.id===id);
  if(state.activityKind==="purchase") return getEvent("asset_market").choices.find(option=>option.id===id);
}
export function resolveActivity(input,id){
  if(input.phase!=="activity") throw new GameError("WRONG_PHASE","目前不在生活活動選單");
  if(id==="cancel"){const state=clone(input);state.phase="result";state.lastResult={title:getEvent(state.selected).title,choice:"取消行程",success:true,summary:"你沒有進行活動，但尋找與安排仍花掉了這段時間。"};return state;}
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
function resolveWork(input){
  let state=clone(input); const scored=JOBS.map(job=>({job,score:Math.max(...job.abilities.map(key=>abilityValue(state,key)))})).sort((a,b)=>b.score-a.score); const job=scored[0].job;
  const ability=job.abilities.sort((a,b)=>abilityValue(state,b)-abilityValue(state,a))[0]; const n=rngNext(state.seed);state.seed=n.seed;const roll=Math.floor(n.value*41)+20;const success=abilityValue(state,ability)+roll>=job.difficulty+28;
  const effects=success?[{type:"resource.add",value:job.reward},...job.effects]:[{type:"resource.add",value:Math.ceil(job.reward/3)},{type:"stat.add",key:"fatigue",value:7},{type:"stat.add",key:"stress",value:5}];
  state=applyEffects(state,effects,`work:${job.id}`);state.phase="result";state.lastResult={title:"賺錢",choice:job.title,success,roll,check:{ability,difficulty:job.difficulty},summary:success?job.result:"工作出了意外。你只拿到部分報酬，仍承受了疲勞與壓力。"};return state;
}
export function acceptSideQuest(input,questId){
  if(input.phase!=="sidequestPick"||!input.sideQuestCandidates.includes(questId)) throw new GameError("INVALID_SIDE_QUEST","這項支線不在候選清單中");
  const quest=SIDE_QUESTS.find(item=>item.id===questId);const state=clone(input);state.activeSideQuest={id:questId,nodeIndex:0,startedDay:state.day,deadlineDay:quest.deadlineDays?state.day+quest.deadlineDays:null};state.sideQuestCandidates=[];state.phase="sidequestNode";return state;
}
export function declineSideQuests(input){
  if(input.phase!=="sidequestPick") throw new GameError("WRONG_PHASE","目前沒有支線任務可拒絕"); const state=clone(input);state.sideQuestCandidates=[];state.phase="result";state.lastResult={title:"進行支線任務",choice:"全部拒絕",success:true,summary:"你花時間查看委託，最後決定一件也不接。這個生活階段仍然結束。"};return state;
}
export function resolveSideQuestChoice(input,choiceId){
  if(input.phase!=="sidequestNode"||!input.activeSideQuest) throw new GameError("WRONG_PHASE","目前沒有進行中的支線節點");
  const quest=SIDE_QUESTS.find(item=>item.id===input.activeSideQuest.id);const node=quest.nodes[input.activeSideQuest.nodeIndex];const choice=node.choices.find(item=>item.id===choiceId);if(!choice)throw new GameError("UNKNOWN_CHOICE",`未知支線選項：${choiceId}`);
  let state=clone(input);const ability=quest.abilities.slice().sort((a,b)=>abilityValue(state,b)-abilityValue(state,a))[0];const n=rngNext(state.seed);state.seed=n.seed;const roll=Math.floor(n.value*41)+20;const difficulty={低:32,中:38,高:44}[quest.risk];const success=abilityValue(state,ability)+roll>=difficulty+28;const random=quest.randomEvents[state.seed%quest.randomEvents.length];
  state=applyEffects(state,success?choice.effects:[{type:"stat.add",key:"health",value:-4},{type:"stat.add",key:"stress",value:6}],`sidequest:${quest.id}:${input.activeSideQuest.nodeIndex}`);
  state.activeSideQuest.nodeIndex++;
  const complete=state.activeSideQuest.nodeIndex>=quest.nodes.length;
  if(complete){state.completedSideQuests.push(quest.id);state.activeSideQuest=null;}
  state.phase="result";state.lastResult={title:quest.title,choice:choice.text,success,roll,check:{ability,difficulty},summary:`${success?choice.result:choice.failure} 隨機狀況：${random}${complete?" 支線任務已結束。":""}`};return state;
}
export function abandonSideQuest(input){
  if(!input.activeSideQuest) throw new GameError("NO_SIDE_QUEST","目前沒有支線可以放棄");const quest=SIDE_QUESTS.find(item=>item.id===input.activeSideQuest.id);let state=applyEffects(input,[{type:"stat.add",key:"stress",value:5},{type:"world.add",key:"people",value:-3}],`sidequest:${quest.id}:abandon`);state.flags[`abandoned.${quest.id}`]=true;state.activeSideQuest=null;state.phase="result";state.lastResult={title:quest.title,choice:"放棄任務",success:false,summary:"你主動切斷了這條線。相關人物不會忘記，這項支線也不會再次出現。"};return state;
}
export function upgradeAsset(input,category,assetId){
  if(input.phase!=="activity"||input.activityKind!=="purchase") throw new GameError("WRONG_PHASE","只能在購買卡牌中升級資產");const asset=input.assets?.[category]?.find(item=>item.id===assetId);if(!asset)throw new GameError("UNKNOWN_ASSET","找不到這項資產");const level=asset.level||0;const cost=Math.max(1,Math.ceil((asset.basePrice||1)*.25*(level+1)));if(input.player.resource<cost)throw new GameError("INSUFFICIENT_CASH",`升級需要現金 ${cost}`);const chance=level===0?100:level===1?90:level===2?80:Math.max(5,80-(level-2)*5);let state=applyEffects(input,[{type:"resource.add",value:-cost}],`upgrade:${assetId}`);const n=rngNext(state.seed);state.seed=n.seed;const success=n.value*100<chance;state=applyEffects(state,[{type:"asset.upgrade",category,assetId,success}],`upgrade:${assetId}`);state.phase="result";state.lastResult={title:"升級資產",choice:`${asset.name} +${level} → +${success?level+1:level}`,success,summary:success?`升級成功。資產提升至 +${level+1}；基礎效果增強，里程碑等級會解鎖額外功能。`:`升級失敗。花費現金 ${cost}，資產維持 +${level}，不會降級或損壞。`};return state;
}
export function resolveChoice(input,choiceId){
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
  effects=effects.map(effect=>effect.type==="asset.grant"?{...effect,basePrice:choice.cost}:effect);state=applyEffects(state,effects,`${event.id}:${choice.id}`); state.seen[event.id]=true;
  state.lastResult={title:event.title,choice:choice.text,success,roll,check:choice.check||null,summary:success?(choice.result||"行動奏效，城市的狀態已經改變。"):(choice.failureResult||"事情沒有照計畫發展。你承受了代價，但故事仍會繼續。")};
  if(state.phase!=="battle") state.phase="result";
  return state;
}
export function battleAction(input,action){
  if(input.phase!=="battle"||!input.battle) throw new GameError("WRONG_PHASE","目前不在戰鬥中");
  let state=clone(input), b=state.battle; let message=""; b.guard=false;
  const n=rngNext(state.seed); state.seed=n.seed;
  if(action==="attack"){ const damage=8+Math.floor(state.player.abilities.reflex/9)+Math.floor(n.value*7); b.enemyHp-=damage; message=`你命中獵犬，造成 ${damage} 傷害。`; }
  else if(action==="hack"){ const damage=5+Math.floor(state.player.abilities.hacking/6); b.enemyHp-=damage; b.enemyHp=Math.max(0,b.enemyHp); message=`干擾脈衝造成 ${damage} 傷害。`; }
  else if(action==="guard"){ b.guard=true; message="你壓低身體，準備卸開衝擊。"; }
  else throw new GameError("UNKNOWN_ACTION",`未知戰鬥動作：${action}`);
  if(b.enemyHp<=0){ state=applyEffects(state,[{type:"resource.add",value:16},{type:"ability.add",key:"reflex",value:2},{type:"flag.set",key:"battle_won",value:true}],"battle:win"); state.battle=null; state.phase="result"; state.lastResult={title:"高架橋伏擊",choice:"殺出包圍",success:true,summary:"最後一名槍手倒下。阿哲從警長車裡翻出市府金庫的門禁卡，卻不敢直視你。"}; return state; }
  const enemyRoll=rngNext(state.seed); state.seed=enemyRoll.seed; let hurt=7+Math.floor(enemyRoll.value*7); if(b.guard) hurt=Math.floor(hurt/2); b.playerHp-=hurt; message+=` 獵犬反擊，造成 ${hurt} 傷害。`; b.turn++;
  if(b.playerHp<=0){ state=applyEffects(state,[{type:"stat.add",key:"health",value:-22},{type:"resource.add",value:-8},{type:"flag.set",key:"battle_lost",value:true}],"battle:loss"); state.battle=null; state.phase="result"; state.lastResult={title:"高架橋伏擊",choice:"中槍撤離",success:false,summary:"若琳開著拖吊車撞開路障，把你拖離現場。小凱付出一輛車的代價，搶到了警長掉落的門禁卡。"}; return state; }
  b.message=message; return state;
}
export function continueStage(input){
  if(input.phase!=="result") throw new GameError("WRONG_PHASE","事件尚未結束");
  let state=clone(input); state.buffs=(state.buffs||[]).map(buff=>({...buff,remaining:buff.remaining-1})).filter(buff=>buff.remaining>0);state.stage++;
  if(state.stage>=STAGES.length){
    state.stage=0; state.day++;
    const ownsCar=state.assets?.vehicles?.some(asset=>asset.id==="vehicle_grey_sport");
    const ownsGarage=state.assets?.industries?.some(asset=>asset.id==="industry_east_garage");
    const vehicleSelfMaintained=(state.assets?.vehicles||[]).some(asset=>(asset.level||0)>=3);
    const industryIncome=(state.assets?.industries||[]).reduce((sum,asset)=>sum+(asset.dailyIncome||0),0);
    state=applyEffects(state,[{type:"resource.add",value:(state.flags.safehouse?3:0)+industryIncome-(ownsCar&&!ownsGarage&&!vehicleSelfMaintained?1:0)}],"day:end");
    state.lastSettlement={industryIncome,vehicleMaintenance:ownsCar&&!ownsGarage&&!vehicleSelfMaintained?1:0,day:state.day-1};
    if(state.activeSideQuest?.deadlineDay&&state.day>state.activeSideQuest.deadlineDay){const expired=SIDE_QUESTS.find(quest=>quest.id===state.activeSideQuest.id);state=applyEffects(state,[{type:"stat.add",key:"stress",value:7},{type:"world.add",key:"people",value:-4}],`sidequest:${expired.id}:expired`);state.flags[`expired.${expired.id}`]=true;state.activeSideQuest=null;}
  }
  if(state.day>15){
    if(!state.flags.ending_free&&!state.flags.ending_restore&&!state.flags.ending_destroy){
      state=applyEffects(state,[{type:"flag.set",key:"ending_destroy",value:true},{type:"world.add",key:"security",value:-6}],"mainline:fallback");
      state.lastResult={title:"未介入的終局",choice:"金庫爆炸",success:false,summary:"你沒有趕上最後窗口。阿哲獨自引爆金庫，真相和贓款一起被火吞沒。"};
    }
    state.finished=true; state.phase="ending"; state.candidates=[]; return state;
  }
  return generateCards(state);
}
export function validateSave(data){
  if(!data||data.version!==1||!Number.isInteger(data.day)||!data.player?.abilities||!data.world||!Array.isArray(data.log)) throw new GameError("INVALID_SAVE","存檔格式無效或版本不相容");
  const state=clone(data); state.assets??={}; for(const category of ["properties","vehicles","weapons","luxuries","industries"]){state.assets[category]??=[];for(const asset of state.assets[category]){asset.level??=0;asset.basePrice??=ASSET_BASE_PRICES[asset.id]||1;}}state.buffs??=[];state.activeSideQuest??=null;state.completedSideQuests??=[];state.metContacts??={};state.customCards??=[];state.cardOverrides??={};state.unlockedSideQuests??=[];state.chapter=chapterForDay(state.day);return state;
}
export function modifyValue(input,path,value){
  const state=clone(input),number=Number(value);if(!Number.isFinite(number))throw new GameError("INVALID_VALUE","修改值必須是數字");
  const direct={health:[state.player,"health",LIMITS.health],fatigue:[state.player,"fatigue",LIMITS.fatigue],stress:[state.player,"stress",LIMITS.stress],resource:[state.player,"resource",LIMITS.resource],mira:[state.relations,"mira",LIMITS.relation],kael:[state.relations,"kael",LIMITS.relation],zero:[state.relations,"zero",LIMITS.relation],corporate:[state.world,"corporate",LIMITS.world],gangs:[state.world,"gangs",LIMITS.world],security:[state.world,"security",LIMITS.world],people:[state.world,"people",LIMITS.world],ai:[state.world,"ai",LIMITS.world]};
  if(path.startsWith("ability.")){const key=path.slice(8);if(!(key in state.player.abilities))throw new GameError("INVALID_VALUE","未知能力");state.player.abilities[key]=clamp(Math.round(number),LIMITS.ability);}
  else if(direct[path]){const [target,key,limit]=direct[path];target[key]=clamp(Math.round(number),limit);}
  else if(path==="day"){state.day=clamp(Math.round(number),[1,15]);state.chapter=chapterForDay(state.day);state.stage=0;state.phase="result";state.lastResult={title:"修改器",choice:"變更日期",success:true,summary:`日期已修改為第 ${state.day} 日、第 ${state.chapter} 章。按繼續重新抽牌。`};}
  else throw new GameError("INVALID_VALUE","不允許修改這個欄位");return state;
}
export function saveCardDefinition(input,definition){
  const state=clone(input);const title=String(definition.title||"").trim(),summary=String(definition.summary||"").trim();if(!title||!summary)throw new GameError("INVALID_CARD","卡牌名稱與說明不能空白");
  const effects=(definition.effects||[]).filter(effect=>Number(effect.value)!==0).map(effect=>({...effect,value:Number(effect.value)}));
  if(definition.baseId){const base=getEvent(definition.baseId,state);state.cardOverrides[base.id]={title,summary,tag:String(definition.tag||base.tag||"自訂"),cost:Math.max(0,Number(definition.cost)||0),effects,customDirect:true,result:String(definition.result||summary)};}
  else{const id=`custom_${Date.now()}_${Math.floor(state.seed%10000)}`,deck=["life","night","main"].includes(definition.deck)?definition.deck:"night";state.customCards.push({id,deck,stage:deck==="main"?0:deck==="life"?1:2,main:deck==="main",repeatable:true,customDirect:true,title,summary,tag:String(definition.tag||"自訂"),cost:Math.max(0,Number(definition.cost)||0),effects,result:String(definition.result||summary)});}
  return state;
}
export function deleteCustomCard(input,id){const state=clone(input);state.customCards=state.customCards.filter(card=>card.id!==id);delete state.cardOverrides[id];return state;}
export function endingText(state){
  if(state.flags.ending_free) return "證據在全國新聞同步播出。警長被捕、高萬城潛逃，而你成了揭露真相的罪犯。阿哲趁混亂消失，只留下三年前欠你的那一份錢。";
  if(state.flags.ending_restore) return "你救出若琳，帶著現金離開海港市。新聞把一切歸咎於阿哲；你知道這不是正義，但家人第一次擁有選擇未來的本錢。";
  return "市府地下傳出整夜可見的火光。帳本、贓款、警長與阿哲全被埋進同一座墳墓；只有你知道三年前真正發生了什麼。";
}
