import test from "node:test";
import assert from "node:assert/strict";
import { newGame, confirmDeployment, generateCards, getEvent, selectCard, resolveChoice, resolveActivity, resolveNightOption, acceptSideQuest, declineSideQuests, resolveSideQuestChoice, abandonSideQuest, upgradeAsset, startFactionFight, startTerritoryFight, fortifyTerritory, recruitCrew, recruitTeamMember, activeTeamMembers, teamBonuses, assetBonuses, contactBonuses, controlledTerritories, territoryIncome, crewPower, battleAction, assistantAdvice, acceptAssistantAdvice, continueStage, continueChapterTransition, continueFreePlay, pendingCharacterEvent, startCharacterEvent, resolveCharacterEventChoice, characterLevelChance, nextOfficialMainlineId, applyEffects, modifyValue, saveCardDefinition, validateSave, CITY_STATUSES, cityStatusById, ENEMY_INTENTS, enemyIntentById, GameError } from "../src/engine.mjs";
import { EVENTS } from "../src/content.mjs";
import { LIFE_CARDS, LEISURE_CARDS, TRAINING_CARDS, CONTACTS, SIDE_QUESTS } from "../src/life-content.mjs";
import { NIGHT_CARDS } from "../src/night-content.mjs";
import { CHAPTER_EVENTS, OFFICIAL_MAINLINE_IDS } from "../src/chapter-content.mjs";
import { FACTIONS, TERRITORIES } from "../src/faction-content.mjs";
import { TEAM_MEMBERS, TEAM_LIMIT } from "../src/team-content.mjs";
import { cardIconName, questIconName, uiIcon } from "../src/ui-icons.mjs";
import { TERRITORY_MAP_POSITIONS } from "../src/city-map.mjs";

function playCard(state,id){
  state=selectCard(state,id);
  if(state.phase==="event"){const event=getEvent(id);return resolveChoice(state,event.choices[0].id);}
  if(state.phase==="activity"){if(state.activityKind.startsWith("night:"))return resolveNightOption(state,state.activityOptions[0]||"cancel");if(state.activityKind==="social")return resolveActivity(state,"cancel");const source=state.activityKind==="leisure"?LEISURE_CARDS:state.activityKind==="training"?TRAINING_CARDS:getEvent("asset_market").choices;const usable=state.activityOptions.find(optionId=>{const option=source.find(x=>x.id===optionId);const asset=option?.effects?.find(effect=>effect.type==="asset.grant");return option&&(!option.cost||option.cost<=state.player.resource)&&(!asset||!state.assets[asset.category].some(item=>item.id===asset.assetId));});return resolveActivity(state,usable||"cancel");}
  if(state.phase==="sidequestPick")return declineSideQuests(state);
  if(state.phase==="sidequestNode"){const quest=SIDE_QUESTS.find(x=>x.id===state.activeSideQuest.id);return resolveSideQuestChoice(state,quest.nodes[state.activeSideQuest.nodeIndex].choices[0].id);}
  return state;
}

const confirmedGame=(...args)=>confirmDeployment(newGame(...args));
const confirmNextDeployment=state=>state.phase==="deployment"?confirmDeployment(state):state;

test("每日城市狀態固定為六種、依種子決定並在跨日時更新",()=>{
  const first=newGame("x",42),again=newGame("x",42);
  assert.equal(CITY_STATUSES.length,6);
  assert.equal(first.cityStatus,again.cityStatus);
  assert.ok(cityStatusById(first.cityStatus));
  const before=first.cityStatus;
  first.phase="result";first.stage=2;
  const next=continueStage(first);
  assert.equal(next.day,2);
  assert.ok(cityStatusById(next.cityStatus));
  assert.notEqual(next.cityStatus,before);
});

test("舊存檔會補上城市狀態",()=>{
  const legacy=newGame("x",7);
  delete legacy.cityStatus;
  const loaded=validateSave(legacy);
  assert.ok(cityStatusById(loaded.cityStatus));
});

test("戰鬥建立時會預告四種敵人意圖",()=>{
  let state=newGame("x",9);state.phase="event";state.selected="ambush";
  state=resolveChoice(state,getEvent("ambush").choices[0].id);
  assert.equal(ENEMY_INTENTS.length,4);
  assert.ok(enemyIntentById(state.battle.intent));
});

test("防守意圖降低玩家傷害並在回合後換成下一個意圖",()=>{
  let base=newGame("x",11);base.phase="event";base.selected="ambush";
  base=resolveChoice(base,getEvent("ambush").choices[0].id);
  base.battle.enemyHp=999;base.battle.playerHp=999;
  const normal=structuredClone(base),defending=structuredClone(base);
  normal.battle.intent="assault";
  defending.battle.intent="defend";
  const normalAfter=battleAction(normal,"hack"),defendAfter=battleAction(defending,"hack");
  assert.ok(defendAfter.battle.enemyHp>normalAfter.battle.enemyHp);
  assert.ok(enemyIntentById(defendAfter.battle.intent));
});

test("猛攻、增援與干擾意圖各自改變戰況",()=>{
  let base=newGame("x",15);base.phase="event";base.selected="ambush";
  base=resolveChoice(base,getEvent("ambush").choices[0].id);
  base.battle.enemyHp=200;base.battle.playerHp=200;
  const assault=structuredClone(base),reinforce=structuredClone(base),disrupt=structuredClone(base);
  assault.battle.intent="assault";
  reinforce.battle.intent="reinforce";
  disrupt.battle.intent="disrupt";
  const assaulted=battleAction(assault,"guard"),reinforced=battleAction(reinforce,"guard"),disrupted=battleAction(disrupt,"guard");
  assert.ok(assaulted.battle.playerHp<reinforced.battle.playerHp);
  assert.ok(reinforced.battle.enemyHp>base.battle.enemyHp);
  assert.ok(disrupted.player.stress>base.player.stress);
});

test("介面圖示涵蓋生活牌、夜生活、支線類型與安全後備圖示",()=>{
  assert.equal(cardIconName({id:"life_training"}),"training");
  assert.equal(cardIconName({kind:"risk"}),"risk");
  assert.equal(questIconName("犯罪"),"risk");
  assert.match(uiIcon("不存在的圖示"),/<svg/);
});

test("相同 seed 產生相同卡牌",()=>{
  const a=generateCards(newGame("x",42)); const b=generateCards(newGame("x",42));
  assert.equal(a.candidates.length,5); assert.equal(a.deckType,"morning"); assert.ok(a.candidates.includes("signal"));assert.deepEqual(a.candidates,b.candidates); assert.equal(a.seed,b.seed);
});
test("官方主線全部完成後，上午沒有自訂主線時改抽五張生活卡牌",()=>{
  const input=newGame("x",42);input.day=2;for(const id of OFFICIAL_MAINLINE_IDS)input.seen[id]=true;input.finished=true;input.postgame=true;
  const state=generateCards(input);
  assert.equal(state.deckType,"life"); assert.equal(state.candidates.length,5);
  assert.ok(state.candidates.every(id=>LIFE_CARDS.some(card=>card.id===id)));
});
test("非法效果會拒絕且不修改原狀態",()=>{
  const original=newGame();
  assert.throws(()=>applyEffects(original,[{type:"evil.run"}]),GameError);
  assert.equal(original.log.length,0); assert.equal(original.player.health,100);
});
test("數值集中 clamp",()=>{
  const state=applyEffects(newGame(),[{type:"stat.add",key:"health",value:999},{type:"resource.add",value:-999}]);
  assert.equal(state.player.health,100); assert.equal(state.player.resource,0); assert.equal(state.log.length,2);
});
test("可由固定策略完整通關，風險失敗也不中斷主線",()=>{
  let state=generateCards(newGame("x",12345)); let guard=0;
  while(!state.finished&&guard++<100){
    const preferred=state.candidates.find(id=>["signal","checkpoint","ambush","vault","ch5_finale"].includes(id))??state.candidates.find(id=>(getEvent(id,state).cost||0)<=state.player.resource)??state.candidates[0];
    state=playCard(state,preferred);
    while(state.phase==="battle") state=battleAction(state,"attack");
    if(state.phase==="ending")break;
    state=confirmNextDeployment(continueStage(state));if(state.phase==="chapterTransition")state=confirmNextDeployment(continueChapterTransition(state));
  }
  assert.equal(state.finished,true);assert.equal(state.phase,"ending");assert.ok(state.flags.ending_free||state.flags.ending_restore||state.flags.ending_destroy);state=confirmNextDeployment(continueFreePlay(state));assert.equal(state.postgame,true);assert.equal(state.phase,"cards");
  assert.ok(state.log.length>20);
});
test("兩百個種子的主線優先策略皆不會卡死",()=>{
  for(let seed=1;seed<=200;seed++){
    let state=generateCards(newGame("x",seed)); let guard=0;
    while(!state.finished&&guard++<80){
      const selected=state.candidates.find(id=>getEvent(id,state).main)??state.candidates.find(id=>(getEvent(id,state).cost||0)<=state.player.resource)??state.candidates[0];
      state=playCard(state,selected);
      while(state.phase==="battle") state=battleAction(state,"guard");
      if(state.phase==="ending")break;
      state=confirmNextDeployment(continueStage(state));if(state.phase==="chapterTransition")state=confirmNextDeployment(continueChapterTransition(state));
    }
    assert.equal(state.finished,true,`seed ${seed} 未完成`);
    assert.ok(state.flags.ending_free||state.flags.ending_restore||state.flags.ending_destroy,`seed ${seed} 無結局`);
  }
});
test("購買資產會扣款、保存資產並阻止重複或超額購買",()=>{
  let state=newGame(); state.player.resource=50; state.phase="event"; state.selected="asset_market";
  const purchased=resolveChoice(state,"property");
  assert.equal(purchased.player.resource,10);
  assert.equal(purchased.assets.properties[0].name,"河景公寓");
  const retry={...purchased,phase:"event",selected:"asset_market"};
  assert.throws(()=>resolveChoice(retry,"property"),error=>error.code==="INSUFFICIENT_CASH"||error.code==="ASSET_OWNED");
  const poor=newGame(); poor.phase="event"; poor.selected="asset_market"; poor.player.resource=5;
  assert.throws(()=>resolveChoice(poor,"weapon"),error=>error.code==="INSUFFICIENT_CASH");
});
test("產業會在日結產生被動現金，車庫免除轎跑保養費",()=>{
  let state=newGame(); state.player.resource=100; state.phase="event"; state.selected="asset_market";
  assert.equal(state.cityStatus,"city_festival");
  state=resolveChoice(state,"garage");
  assert.equal(state.player.resource,72);
  assert.equal(state.assets.industries[0].dailyIncome,5);
  state.phase="event"; state.selected="asset_market"; state=resolveChoice(state,"vehicle");
  const before=state.player.resource;
  state.phase="result"; state.stage=2;
  state=continueStage(state);
  assert.equal(state.lastSettlement.industryIncome,7);
  assert.equal(state.lastSettlement.vehicleMaintenance,0);
  assert.equal(state.player.resource,before+7);
});
test("生活牌堆每個選項都有專屬結果、能力成長與介面六值影響",()=>{
  const hudEffects=new Set(["stat.add","resource.add","relation.add","world.add"]);
  for(const event of EVENTS.filter(event=>event.stage===1)){
    for(const choice of event.choices){
      assert.ok(choice.result?.length>15,`${event.id}:${choice.id} 缺少專屬結果`);
      assert.ok(choice.effects.some(effect=>effect.type==="ability.add"),`${event.id}:${choice.id} 未影響八大能力`);
      assert.ok(choice.effects.some(effect=>hudEffects.has(effect.type)),`${event.id}:${choice.id} 未影響介面六值`);
    }
  }
});
test("生活卡牌標題以玩家行為命名",()=>{
  const actionPrefixes=["與","在","進行","休息","吃","前往","接","練習","找"];
  for(const event of EVENTS.filter(event=>event.stage===1)){
    assert.ok(actionPrefixes.some(prefix=>event.title.startsWith(prefix)),`${event.id} 的標題不是玩家行為：${event.title}`);
  }
});
test("房產、車輛、武器、物品、奢侈品與產業集中於同一張購買卡牌",()=>{
  const purchase=EVENTS.find(event=>event.id==="asset_market");
  const categories=new Set(purchase.choices.flatMap(choice=>choice.effects.filter(effect=>effect.type==="asset.grant").map(effect=>effect.category)));
  assert.deepEqual([...categories].sort(),["industries","items","luxuries","properties","vehicles","weapons"]);
  assert.equal(EVENTS.filter(event=>event.stage===1&&event.tag==="功能卡").length,1);
});
test("生活牌堆固定七張核心行為，勢力卡必定出現且休閒保證可負擔",()=>{
  assert.equal(LIFE_CARDS.length,7);
  let state=newGame();state.player.resource=0;state.player.fatigue=70;state.day=2;state.stage=1;state=generateCards(state);
  assert.equal(state.candidates.length,5);assert.ok(!state.candidates.includes("life_purchase"));assert.ok(state.candidates.includes("life_conflict"));
  state=selectCard(state,"life_leisure");assert.equal(state.activityOptions.length,5);
  assert.ok(state.activityOptions.some(id=>LEISURE_CARDS.find(card=>card.id===id).cost<=0));
});
test("休閒短期效果持續五個階段且同類保留較強者",()=>{
  let state=newGame();state.day=2;state.stage=0;state=generateCards(state);state.candidates=["life_leisure"];state=selectCard(state,"life_leisure");state.activityOptions=["leisure_coffee"];
  state=resolveActivity(state,"leisure_coffee");assert.equal(state.buffs[0].remaining,5);
  state=continueStage(state);assert.equal(state.buffs[0].remaining,4);
  state.phase="activity";state.selected="life_leisure";state.activityKind="leisure";state.activityOptions=["leisure_coffee"];state=resolveActivity(state,"leisure_coffee");assert.equal(state.buffs.filter(buff=>buff.id==="alert").length,1);assert.equal(state.buffs.find(buff=>buff.id==="alert").remaining,5);
});
test("支線牌堆九條、初次三選一，進行中時保證出現並繼續節點",()=>{
  assert.equal(SIDE_QUESTS.length,9);
  let state=newGame();state.day=2;state.stage=0;state=generateCards(state);state.candidates=["life_sidequest"];state=selectCard(state,"life_sidequest");assert.equal(state.sideQuestCandidates.length,3);
  state=acceptSideQuest(state,state.sideQuestCandidates[0]);const quest=SIDE_QUESTS.find(item=>item.id===state.activeSideQuest.id);state=resolveSideQuestChoice(state,quest.nodes[0].choices[0].id);state=continueStage(state);assert.ok(state.candidates.includes("life_sidequest"));
  state=selectCard(state,"life_sidequest");assert.equal(state.phase,"sidequestNode");
});
test("資產可無上限升級，初次必定成功且正確扣款",()=>{
  let state=newGame();state.player.resource=50;state.phase="event";state.selected="asset_market";state=resolveChoice(state,"weapon");const asset=state.assets.weapons[0];const before=state.player.resource;state.phase="activity";state.activityKind="purchase";
  state=upgradeAsset(state,"weapons",asset.id);assert.equal(state.assets.weapons[0].level,1);assert.equal(state.player.resource,before-Math.ceil(14*.25));assert.equal(state.lastResult.artKey,`upgrade-weapons--${asset.id}`);
});

test("夜生活牌堆包含40張，每晚抽5張且保證免費與兩張恢復",()=>{
  assert.equal(NIGHT_CARDS.length,40);
  let state=newGame("x",77);state.stage=2;state.day=4;state=generateCards(state);
  assert.equal(state.deckType,"night");assert.equal(state.candidates.length,5);
  const cards=state.candidates.map(id=>getEvent(id,state));
  assert.ok(cards.some(card=>card.cost===0));assert.ok(cards.filter(card=>card.kind==="recovery").length>=2);
});

test("玩家未選的主線會永久保留，直到完成選取",()=>{
  let state=newGame("x",19);
  for(const day of [1,2,5,10,25,40]){state.day=day;state.stage=0;state=generateCards(state);assert.ok(state.candidates.includes("signal"),`第 ${day} 日應保留未選主線`);}
  state=selectCard(state,"signal");state=resolveChoice(state,getEvent("signal",state).choices[0].id);assert.equal(state.seen.signal,true);
  state.stage=0;state=generateCards(state);assert.ok(!state.candidates.includes("signal"));
});

test("自訂主線只在官方十五個任務後出現，並依建立順序永久保留",()=>{
  let state=newGame("x",29);state.day=200;state.customCards.push({id:"custom_expired_main",deck:"main",stage:0,main:true,repeatable:true,customDirect:true,title:"逾期待辦主線",summary:"仍應保留",tag:"主線",effects:[],result:"完成",requirements:{dayMin:1,dayMax:1}});state=generateCards(state);assert.ok(!state.candidates.includes("custom_expired_main"));for(const id of OFFICIAL_MAINLINE_IDS)state.seen[id]=true;state.finished=true;state.postgame=true;state.stage=0;
  state=generateCards(state);assert.ok(state.candidates.includes("custom_expired_main"));
  state=selectCard(state,"custom_expired_main");assert.equal(state.seen.custom_expired_main,true);
  state.day=5;state.stage=0;state=generateCards(state);assert.ok(!state.candidates.includes("custom_expired_main"));
});

test("高報酬戰鬥卡會進入回合戰鬥並結算獎勵",()=>{
  let state=newGame("x",88);state.day=20;state.stage=2;state.player.resource=100;state=generateCards(state);state.candidates=["combat_dock_brawl"];state=selectCard(state,"combat_dock_brawl");assert.equal(state.phase,"battle");const before=state.player.resource;let guard=0;while(state.phase==="battle"&&guard++<30)state=battleAction(state,"brawl");assert.equal(state.phase,"result");if(state.lastResult.success)assert.ok(state.player.resource>=before+32);
});

test("城市勢力包含九個幫派與十五塊地盤，玩家可主動挑戰",()=>{
  assert.equal(FACTIONS.length,9);assert.equal(TERRITORIES.length,15);
  let state=newGame("x",101);state.day=5;state.stage=1;state.player.resource=100;state.player.abilities.physique=100;state.crew={members:20,morale:100};state=generateCards(state);assert.ok(state.candidates.includes("life_conflict"));state=selectCard(state,"life_conflict");assert.equal(state.phase,"factionBoard");state=startFactionFight(state,"red_tide");assert.equal(state.phase,"battle");let guard=0;while(state.phase==="battle"&&guard++<20)state=battleAction(state,"brawl");assert.equal(state.lastResult.success,true);assert.equal(state.factions.red_tide.wins,1);assert.ok(state.factions.red_tide.respect>0);
});

test("攻佔地盤後產生每日收益，並可花錢強化",()=>{
  let state=confirmedGame("x",202);state.day=5;state.stage=1;state.player.resource=100;state.player.abilities.physique=100;state.crew={members:20,morale:100};state.candidates=["life_conflict"];state=selectCard(state,"life_conflict");state=startTerritoryFight(state,"south_docks");let guard=0;while(state.phase==="battle"&&guard++<20)state=battleAction(state,"brawl");assert.equal(state.lastResult.success,true);assert.equal(state.territories.south_docks.owner,"player");assert.equal(controlledTerritories(state).length,1);assert.equal(territoryIncome(state),4);
  state.phase="factionBoard";state.selected="life_conflict";const before=state.player.resource;state=fortifyTerritory(state,"south_docks");assert.equal(state.territories.south_docks.level,1);assert.equal(state.player.resource,before-11);assert.equal(territoryIncome(state),6);
  state.phase="result";state.stage=2;const beforeSettlement=state.player.resource;state=continueStage(state);assert.equal(state.lastSettlement.turfIncome,6);assert.ok(state.player.resource>=beforeSettlement+6);
});

test("隊伍可招募；舊版存檔只保留能力、現金與資產並重置故事",()=>{
  let state=newGame();state.phase="factionBoard";state.selected="life_conflict";state.player.resource=100;const before=state.player.resource;state=recruitCrew(state);assert.equal(state.crew.members,3);assert.equal(state.player.resource,before-12);assert.equal(state.phase,"result");
  const old={...newGame(),version:1,day:19};old.player.resource=77;old.player.abilities.hacking=91;old.assets.weapons=[{id:"weapon_sawed_shotgun",name:"短管霰彈槍"}];old.seen.signal=true;old.team={roster:[{id:"grey_fox",level:9}],active:["grey_fox"]};old.customCards=[{id:"legacy"}];const restored=validateSave(old),confirmed=confirmDeployment(restored);assert.equal(restored.version,2);assert.equal(restored.day,1);assert.equal(restored.player.resource,77);assert.equal(restored.player.abilities.hacking,91);assert.equal(restored.seen.signal,undefined);assert.deepEqual(confirmed.team.active,["difei"]);assert.equal(restored.assets.weapons[0].combatPower,6);assert.deepEqual(restored.customCards,[]);
});

test("城市勢力地圖同時涵蓋十五塊地盤的桌機與手機座標",()=>{
  assert.deepEqual(Object.keys(TERRITORY_MAP_POSITIONS).sort(),TERRITORIES.map(territory=>territory.id).sort());
  for(const position of Object.values(TERRITORY_MAP_POSITIONS))for(const key of ["x","y","mx","my"])assert.ok(position[key]>0&&position[key]<100,`${key} 必須位於地圖範圍內`);
});

test("共有十名核心隊員，新成員翌日才能派遣且升級統一透過見面",()=>{
  assert.equal(TEAM_MEMBERS.length,10);let state=confirmedGame("x",1);state.day=20;state.player.resource=999;assert.deepEqual(state.team.active,["difei"]);const recruits=TEAM_MEMBERS.filter(member=>member.recruitable!==false).slice(0,6);
  for(const member of recruits){state.phase="factionBoard";state.selected="life_conflict";state=recruitTeamMember(state,member.id);}
  assert.equal(state.team.roster.length,7);assert.equal(activeTeamMembers(state).length,1);assert.ok(state.team.roster.filter(member=>member.id!=="difei").every(member=>member.deployableDay===21));
  const social=LIFE_CARDS.find(card=>card.hub==="social");state.phase="cards";state.candidates=[social.id];state=selectCard(state,social.id);const target=recruits[1].id,beforeCash=state.player.resource,beforeRelation=state.relations[target];state.seed=1;state=resolveActivity(state,target);assert.ok(state.player.resource<beforeCash);assert.equal(state.relations[target],beforeRelation+4);assert.equal(state.characterLevels[target],2);assert.equal(state.lastResult.characterId,target);
});

test("日間與夜間人物交流結果都保留角色識別供人像介面使用",()=>{
  let state=newGame("x",12);state.phase="activity";state.selected="life_social";state.activityKind="social";state.activityOptions=["mira"];state.player.resource=100;state=resolveActivity(state,"mira");assert.equal(state.lastResult.characterId,"mira");
  state.phase="activity";state.selected="night_social_food";state.activityKind="night:contact";state.activityOptions=["difei"];state=resolveNightOption(state,"difei");assert.equal(state.lastResult.characterId,"difei");
});

test("核心隊員、武器與戰術物品會實際改變戰鬥",()=>{
  const base=applyEffects(newGame(),[{type:"battle.start",enemy:"測試敵人",enemyHp:100,reward:20}],"test:base");let armed=newGame();armed.team={roster:[{id:"grey_fox",level:2},{id:"dove",level:1},{id:"counsel",level:1}],active:["grey_fox","dove","counsel"]};armed.player.resource=999;armed.phase="event";armed.selected="asset_market";armed=resolveChoice(armed,"marksman");armed.phase="event";armed.selected="asset_market";armed=resolveChoice(armed,"vest");armed.phase="event";armed.selected="asset_market";armed=applyEffects(armed,[{type:"battle.start",enemy:"測試敵人",enemyHp:100,reward:20}],"test:armed");
  assert.ok(teamBonuses(armed).attack>0);assert.ok(assetBonuses(armed).weapon>0);assert.ok(armed.battle.playerHp>base.battle.playerHp);assert.ok(armed.battle.enemyHp<base.battle.enemyHp);assert.ok(armed.battle.reward>base.battle.reward);
});

test("豐富市場包含多種武器、物品與功能產業",()=>{
  const purchase=getEvent("asset_market"),assets=purchase.choices.flatMap(choice=>choice.effects.filter(effect=>effect.type==="asset.grant"));assert.ok(assets.filter(asset=>asset.category==="weapons").length>=7);assert.ok(assets.filter(asset=>asset.category==="items").length>=6);assert.ok(assets.filter(asset=>asset.category==="industries").length>=9);
  let state=newGame();state.player.resource=999;state.phase="event";state.selected="asset_market";state=resolveChoice(state,"trauma_kit");assert.equal(state.assets.items[0].name,"戰術急救箱");assert.ok(state.assets.items[0].bonuses.medical>=7);
  state.phase="event";state.selected="asset_market";state=resolveChoice(state,"media_studio");assert.equal(state.assets.industries[0].dailyIncome,10);assert.ok(state.assets.industries[0].bonuses.reward>=8);
});

test("敵方反攻時可主動防守，勝利後保留地盤並解除警報",()=>{
  let state=newGame("x",303);state.day=12;state.stage=1;state.player.resource=100;state.player.abilities.physique=100;state.crew={members:20,morale:100};state.territories.south_docks.owner="player";state.territories.south_docks.level=3;state.pendingRetaliation={territoryId:"south_docks",factionId:"red_tide",sinceDay:12};state.phase="factionBoard";state.selected="life_conflict";state=startTerritoryFight(state,"south_docks");assert.equal(state.battle.battleType,"defend");let guard=0;while(state.phase==="battle"&&guard++<20)state=battleAction(state,"brawl");assert.equal(state.lastResult.success,true);assert.equal(state.territories.south_docks.owner,"player");assert.equal(state.pendingRetaliation,null);
});

test("五章各三個任務，主線順序與日期無關",()=>{
  const state=newGame();state.day=250;for(const id of OFFICIAL_MAINLINE_IDS.slice(0,-1))state.seen[id]=true;const cards=generateCards(state);
  assert.equal(cards.chapter,5);assert.ok(cards.candidates.includes("ch5_finale"));
});

test("修改器可改數值並新增離線自訂卡",()=>{
  let state=modifyValue(newGame(),"ability.hacking",91);assert.equal(state.player.abilities.hacking,91);
  state=saveCardDefinition(state,{deck:"night",title:"在屋頂看夜景",summary:"免費／精神 -5。",cost:0,effects:[{type:"stat.add",key:"stress",value:-5}]});
  assert.equal(state.customCards.length,1);assert.equal(state.customCards[0].deck,"night");
});

test("新遊戲有五名聯絡人，狄菲預設為 Lv.1 出勤核心隊員",()=>{
  const state=confirmedGame();assert.equal(CONTACTS.length,5);assert.deepEqual(state.knownContacts,["mira","kael","zero","difei"]);assert.equal(state.relations.difei,35);assert.equal(state.characterLevels.difei,1);assert.deepEqual(state.team.active,["difei"]);assert.equal(nextOfficialMainlineId(state),"signal");
});

test("前三個官方任務嚴格依序，第一章完成後程嵐加入並顯示轉場",()=>{
  let state=generateCards(newGame("x",404));for(const [index,id] of OFFICIAL_MAINLINE_IDS.slice(0,3).entries()){assert.ok(state.candidates.includes(id));assert.equal(state.candidates.filter(candidate=>OFFICIAL_MAINLINE_IDS.includes(candidate)).length,1);state=selectCard(state,id);state=resolveChoice(state,getEvent(id,state).choices[0].id);if(index<2){state.phase="cards";state.stage=0;state=generateCards(state);}}
  assert.equal(state.chapterTransition.to,2);assert.ok(state.knownContacts.includes("chenglan"));assert.ok(state.team.roster.some(member=>member.id==="chenglan"));assert.ok(!state.team.active.includes("chenglan"));state=continueStage(state);assert.equal(state.phase,"chapterTransition");state=continueChapterTransition(state);assert.equal(state.chapter,2);assert.equal(nextOfficialMainlineId(state),"checkpoint");
});

test("日數沒有上限，等待到第1000天仍保留下一個主線",()=>{
  let state=newGame("x",505);state.day=999;state.stage=2;state.phase="result";state=confirmNextDeployment(continueStage(state));assert.equal(state.day,1000);assert.equal(state.finished,false);assert.ok(state.candidates.includes("signal"));state=modifyValue(state,"day",12345);assert.equal(state.day,12345);
});

test("聯絡人提供常駐且隨等級縮放的支援，程嵐降低警方戒備增幅",()=>{
  let state=newGame();state.knownContacts.push("chenglan");const before=state.world.security;state=applyEffects(state,[{type:"world.add",key:"security",value:5}],"test");assert.equal(state.world.security,before+3);state.characterLevels.chenglan=5;assert.equal(contactBonuses(state).securityReduction,4);const before2=state.world.security;state=applyEffects(state,[{type:"world.add",key:"security",value:5}],"test2");assert.equal(state.world.security,before2+1);state=applyEffects(state,[{type:"world.add",key:"security",value:-5}],"test3");assert.equal(state.world.security,before2-4);
});

test("角色升級機率依等級下降至5%下限，專長每級增加基礎值25%",()=>{
  assert.equal(characterLevelChance(1),90);assert.equal(characterLevelChance(2),80);assert.equal(characterLevelChance(3),75);assert.equal(characterLevelChance(99),5);const state=confirmedGame();state.characterLevels.difei=5;assert.equal(teamBonuses(state).brawl,8);assert.equal(teamBonuses(state).hp,12);
});

test("狄菲人物事件達門檻後永久保留，且三段事件必須依序完成",()=>{
  let state=applyEffects(newGame(),[{type:"relation.add",key:"difei",value:10}],"unlock");assert.equal(pendingCharacterEvent(state).id,"difei_spar_event");state=applyEffects(state,[{type:"relation.add",key:"difei",value:-100}],"drop");assert.equal(pendingCharacterEvent(state).id,"difei_spar_event");state.phase="activity";state.activityKind="social";state.activityOptions=["difei"];state=startCharacterEvent(state,"difei_spar_event");state=resolveCharacterEventChoice(state,"steady");assert.ok(state.completedCharacterEvents.includes("difei_spar_event"));assert.equal(state.lastResult.characterId,"difei");state=applyEffects(state,[{type:"relation.add",key:"difei",value:200}],"unlock2");assert.equal(pendingCharacterEvent(state).id,"difei_media_event");
});

test("一般狀態下狄菲穩定建議格鬥或槍法，接受後立即完成訓練",()=>{
  let state=generateCards(newGame("x",606));const advice=assistantAdvice(state),again=assistantAdvice(state);assert.deepEqual(advice,again);assert.match(advice.id,/^train:train_(physique|reflex)$/);const ability=advice.id.endsWith("reflex")?"reflex":"physique",before=state.player.abilities[ability];state=acceptAssistantAdvice(state,advice.id);assert.equal(state.phase,"result");assert.equal(state.player.abilities[ability],before+3);assert.match(state.lastResult.title,/訓練/);
});

test("狄菲只會從玩家勾選且可負擔的一般行動中隨機建議",()=>{
  const state=generateCards(newGame("x",611));state.player.resource=50;
  const hacking=assistantAdvice(state,["train:train_hacking"]),rest=assistantAdvice(state,["recover:leisure_free_rest"]),mixedSelection=["train:train_social","recover:leisure_movie","work:cash"],mixed=assistantAdvice(state,mixedSelection);
  assert.equal(hacking.id,"train:train_hacking");assert.equal(rest.id,"recover:leisure_free_rest");assert.ok(mixedSelection.includes(mixed.id));assert.deepEqual(assistantAdvice(state,mixedSelection),mixed);
  state.player.resource=0;const unavailable=assistantAdvice(state,["train:train_management"]);assert.equal(unavailable.actionable,false);assert.equal(unavailable.id,"observe:no-affordable-action");
});

test("助理建議完成後可由對話框繼續，效果等同行動結果的繼續",()=>{
  let state=generateCards(newGame("x",612));const advice=assistantAdvice(state,"allTraining");state=acceptAssistantAdvice(state,advice.id,"allTraining");assert.equal(state.phase,"result");assert.equal(state.flags.assistantActionPending,true);
  const followup=assistantAdvice(state,"allTraining");assert.equal(followup.id,"continue:stage");const viaAssistant=acceptAssistantAdvice(state,followup.id,"allTraining"),viaResult=continueStage(state);assert.equal(viaAssistant.phase,viaResult.phase);assert.equal(viaAssistant.day,viaResult.day);assert.equal(viaAssistant.stage,viaResult.stage);assert.equal(viaAssistant.flags.assistantActionPending,undefined);
});

test("連續接受免費安全角落休息與助理繼續不會卡住階段",()=>{
  let state=generateCards(newGame("x",9));const selection=["recover:leisure_free_rest"];
  for(let step=0;step<9;step++){const advice=assistantAdvice(state,selection);assert.equal(advice.id,"recover:leisure_free_rest");state=acceptAssistantAdvice(state,advice.id,selection);assert.equal(state.phase,"result");assert.equal(state.flags.assistantActionPending,true);const followup=assistantAdvice(state,selection);assert.equal(followup.id,"continue:stage");state=confirmNextDeployment(acceptAssistantAdvice(state,followup.id,selection));assert.equal(state.phase,"cards");assert.equal(state.flags.assistantActionPending,undefined);}
  assert.equal(state.day,4);assert.equal(state.stage,0);
});

test("從零現金連續接受各類助理建議時現金不會成為負數或卡死",()=>{
  let state=generateCards(newGame("x",614));state.player.resource=0;const selection=[...TRAINING_CARDS.map(option=>`train:${option.id}`),...LEISURE_CARDS.map(option=>`recover:${option.id}`),"work:cash"];
  for(let step=0;step<120;step++){const advice=assistantAdvice(state,selection);assert.equal(advice.actionable,true);state=acceptAssistantAdvice(state,advice.id,selection);assert.ok(state.player.resource>=0);assert.equal(state.phase,"result");const followup=assistantAdvice(state,selection);assert.equal(followup.id,"continue:stage");state=confirmNextDeployment(acceptAssistantAdvice(state,followup.id,selection));assert.ok(state.player.resource>=0);assert.equal(state.phase,"cards");}
  assert.ok(state.day>30);
});

test("夜晚接受助理的賺錢或限期支線建議不會進入空白活動選單",()=>{
  let state=newGame("x",616);state.stage=2;state.player.resource=0;state=generateCards(state);let advice=assistantAdvice(state,["work:cash"]);assert.equal(advice.id,"work:cash");state=acceptAssistantAdvice(state,advice.id,["work:cash"]);assert.equal(state.phase,"result");assert.ok(state.player.resource>0);
  state=newGame("x",617);state.stage=2;state.activeSideQuest={id:"sq_armored_tip",nodeIndex:0,startedDay:1,deadlineDay:1};state=generateCards(state);advice=assistantAdvice(state,["work:cash"]);assert.equal(advice.id,"sidequest:continue");state=acceptAssistantAdvice(state,advice.id,["work:cash"]);assert.equal(state.phase,"sidequestNode");
});

test("讀取異常舊存檔時會把負數現金修復為零",()=>{
  const damaged=JSON.parse(JSON.stringify(newGame("x",615)));damaged.player.resource=-999;damaged.player.health=-20;const repaired=validateSave(damaged);assert.equal(repaired.player.resource,0);assert.equal(repaired.player.health,0);
});

test("夜生活的找個安全角落過夜完成後可正常進入隔天",()=>{
  let state=newGame("x",613);state.stage=2;state=generateCards(state);assert.ok(state.candidates.includes("night_shelter"));state=selectCard(state,"night_shelter");assert.equal(state.phase,"result");const beforeDay=state.day;state=confirmNextDeployment(continueStage(state));assert.equal(state.phase,"cards");assert.equal(state.day,beforeDay+1);assert.equal(state.stage,0);
});

test("狄菲會優先處理急迫狀態，並能直接執行恢復與支線建議",()=>{
  let state=generateCards(newGame("x",607));state.player.health=24;state.player.resource=20;let advice=assistantAdvice(state);assert.match(advice.id,/^recover:/);state=acceptAssistantAdvice(state,advice.id);assert.equal(state.phase,"result");assert.ok(state.player.health>24);
  state=generateCards(newGame("x",610));state.player.health=10;state.player.resource=0;advice=assistantAdvice(state);assert.equal(advice.id,"work:cash");state=acceptAssistantAdvice(state,advice.id);assert.equal(state.phase,"result");assert.ok(state.player.resource>0);
  state=generateCards(newGame("x",608));state.activeSideQuest={id:"sq_armored_tip",nodeIndex:0,startedDay:1,deadlineDay:1};advice=assistantAdvice(state);assert.equal(advice.id,"sidequest:continue");state=acceptAssistantAdvice(state,advice.id);assert.equal(state.phase,"sidequestNode");
});

test("地盤遭反攻時接受狄菲建議會直接進入防守戰",()=>{
  let state=generateCards(newGame("x",609));state.day=12;state.territories.south_docks.owner="player";state.pendingRetaliation={territoryId:"south_docks",factionId:"red_tide",sinceDay:12};const advice=assistantAdvice(state);assert.equal(advice.id,"defend:south_docks");state=acceptAssistantAdvice(state,advice.id);assert.equal(state.phase,"battle");assert.equal(state.battle.battleType,"defend");const tactical=assistantAdvice(state);assert.match(tactical.id,/^battle:(attack|brawl|guard)$/);const turn=state.battle.turn;state=acceptAssistantAdvice(state,tactical.id);if(state.phase==="battle")assert.ok(state.battle.turn>turn);
});

test("event, activity, night, meeting, character, and battle results persist artKey",()=>{
  let state=newGame("x",1);state.phase="event";state.selected="signal";
  assert.equal(resolveChoice(state,"trace").lastResult.artKey,"signal--trace");

  state=newGame("x",1);state.phase="activity";state.selected="life_leisure";state.activityKind="leisure";state.activityOptions=["leisure_coffee"];
  assert.equal(resolveActivity(state,"leisure_coffee").lastResult.artKey,"activity-leisure-leisure_coffee--leisure_coffee");

  state=newGame("x",1);state.phase="activity";state.selected="night_social_food";state.activityKind="night:contact";state.activityOptions=["difei"];
  assert.equal(resolveNightOption(state,"difei").lastResult.artKey,"night_social_food--difei");

  state=newGame("x",1);state.phase="activity";state.selected="life_social";state.activityKind="social";state.activityOptions=["mira"];
  assert.equal(resolveActivity(state,"mira").lastResult.artKey,"activity-contacts-mira--mira");

  state=newGame("x",1);state.phase="activity";state.activityKind="social";state.activityOptions=["difei"];state.unlockedCharacterEvents=["difei_spar_event"];state=startCharacterEvent(state,"difei_spar_event");
  assert.equal(resolveCharacterEventChoice(state,"steady").lastResult.artKey,"difei_spar_event--steady");

  state=applyEffects(newGame("x",1),[{type:"battle.start",enemy:"test",enemyHp:1,reward:1}],"test");state.player.abilities.physique=100;
  assert.equal(battleAction(state,"brawl").lastResult.artKey,"battle--brawl");
});

test("side-quest choices, abandonment, and expiry persist artKey",()=>{
  const startSideQuest=()=>{const state=newGame("x",1);state.phase="sidequestPick";state.sideQuestCandidates=[SIDE_QUESTS[0].id];return acceptSideQuest(state,SIDE_QUESTS[0].id);};
  let state=startSideQuest();const choice=SIDE_QUESTS[0].nodes[0].choices[0];
  assert.equal(resolveSideQuestChoice(state,choice.id).lastResult.artKey,`sidequest-${SIDE_QUESTS[0].id}-0--${choice.id}`);

  state=startSideQuest();
  assert.equal(abandonSideQuest(state).lastResult.artKey,`sidequest-${SIDE_QUESTS[0].id}--abandon`);

  state=newGame("x",1);state.phase="result";state.stage=2;state.activeSideQuest={id:SIDE_QUESTS[0].id,nodeIndex:0,startedDay:1,deadlineDay:1};
  assert.equal(continueStage(state).lastResult.artKey,`sidequest-${SIDE_QUESTS[0].id}--expired`);
});

test("legacy result art key remains optional when loading saves",()=>{
  const state=newGame();state.phase="result";state.lastResult={title:"legacy",choice:"choice",success:true,summary:"summary"};
  assert.doesNotThrow(()=>validateSave(state));
});

test("direct night and work cards persist canonical inventory artKey values",()=>{
  let state=confirmedGame("x",1);state.deckType="night";state.candidates=["night_shelter"];
  assert.equal(selectCard(state,"night_shelter").lastResult.artKey,"activity-night-night_shelter--night_shelter");

  state=confirmedGame("x",1);state.candidates=["life_work"];
  assert.equal(selectCard(state,"life_work").lastResult.artKey,"activity-life-life_work--life_work");
});

test("內建卡覆寫依 customDirect 語意保存自訂圖片鍵",()=>{
  let state=confirmedGame("x",1);state.candidates=["life_work"];
  state=saveCardDefinition(state,{baseId:"life_work",title:"覆寫工作",summary:"改成直接結算",tag:"自訂",cost:0,effects:[],result:"覆寫完成"});
  state=selectCard(state,"life_work");
  assert.equal(state.lastResult.artKey,"custom-life_work--life_work");
});
