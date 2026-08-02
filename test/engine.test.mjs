import test from "node:test";
import assert from "node:assert/strict";
import { newGame, generateCards, getEvent, selectCard, resolveChoice, resolveActivity, resolveNightOption, acceptSideQuest, declineSideQuests, resolveSideQuestChoice, upgradeAsset, startFactionFight, startTerritoryFight, fortifyTerritory, recruitCrew, controlledTerritories, territoryIncome, battleAction, continueStage, applyEffects, modifyValue, saveCardDefinition, validateSave, GameError } from "../src/engine.mjs";
import { EVENTS } from "../src/content.mjs";
import { LIFE_CARDS, LEISURE_CARDS, TRAINING_CARDS, CONTACTS, SIDE_QUESTS } from "../src/life-content.mjs";
import { NIGHT_CARDS } from "../src/night-content.mjs";
import { CHAPTER_EVENTS } from "../src/chapter-content.mjs";
import { FACTIONS, TERRITORIES } from "../src/faction-content.mjs";

function playCard(state,id){
  state=selectCard(state,id);
  if(state.phase==="event"){const event=getEvent(id);return resolveChoice(state,event.choices[0].id);}
  if(state.phase==="activity"){if(state.activityKind.startsWith("night:"))return resolveNightOption(state,state.activityOptions[0]||"cancel");const source=state.activityKind==="leisure"?LEISURE_CARDS:state.activityKind==="training"?TRAINING_CARDS:state.activityKind==="social"?CONTACTS:getEvent("asset_market").choices;const usable=state.activityOptions.find(optionId=>{const option=source.find(x=>x.id===optionId);const asset=option.effects.find(effect=>effect.type==="asset.grant");return (!option.cost||option.cost<=state.player.resource)&&(!asset||!state.assets[asset.category].some(item=>item.id===asset.assetId));});return resolveActivity(state,usable||"cancel");}
  if(state.phase==="sidequestPick")return declineSideQuests(state);
  if(state.phase==="sidequestNode"){const quest=SIDE_QUESTS.find(x=>x.id===state.activeSideQuest.id);return resolveSideQuestChoice(state,quest.nodes[state.activeSideQuest.nodeIndex].choices[0].id);}
  return state;
}

test("相同 seed 產生相同卡牌",()=>{
  const a=generateCards(newGame("x",42)); const b=generateCards(newGame("x",42));
  assert.equal(a.candidates.length,5); assert.equal(a.deckType,"morning"); assert.ok(a.candidates.includes("signal"));assert.deepEqual(a.candidates,b.candidates); assert.equal(a.seed,b.seed);
});
test("上午沒有主線時改抽五張生活卡牌",()=>{
  const input=newGame("x",42); input.day=2;input.seen.signal=true;
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
    state=continueStage(state);
  }
  assert.equal(state.finished,true); assert.equal(state.day,26); assert.ok(state.flags.ending_free||state.flags.ending_restore||state.flags.ending_destroy);
  assert.ok(state.log.length>20);
});
test("兩百個種子的主線優先策略皆不會卡死",()=>{
  for(let seed=1;seed<=200;seed++){
    let state=generateCards(newGame("x",seed)); let guard=0;
    while(!state.finished&&guard++<80){
      const selected=state.candidates.find(id=>getEvent(id,state).main)??state.candidates.find(id=>(getEvent(id,state).cost||0)<=state.player.resource)??state.candidates[0];
      state=playCard(state,selected);
      while(state.phase==="battle") state=battleAction(state,"guard");
      state=continueStage(state);
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
  state=resolveChoice(state,"garage");
  assert.equal(state.player.resource,72);
  assert.equal(state.assets.industries[0].dailyIncome,5);
  state.phase="event"; state.selected="asset_market"; state=resolveChoice(state,"vehicle");
  const before=state.player.resource;
  state.phase="result"; state.stage=2;
  state=continueStage(state);
  assert.equal(state.lastSettlement.industryIncome,5);
  assert.equal(state.lastSettlement.vehicleMaintenance,0);
  assert.equal(state.player.resource,before+5);
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
test("房產、車輛、武器、奢侈品與產業集中於同一張購買卡牌",()=>{
  const purchase=EVENTS.find(event=>event.id==="asset_market");
  const categories=new Set(purchase.choices.flatMap(choice=>choice.effects.filter(effect=>effect.type==="asset.grant").map(effect=>effect.category)));
  assert.deepEqual([...categories].sort(),["industries","luxuries","properties","vehicles","weapons"]);
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
  state=upgradeAsset(state,"weapons",asset.id);assert.equal(state.assets.weapons[0].level,1);assert.equal(state.player.resource,before-Math.ceil(14*.25));
});

test("夜生活牌堆包含40張，每晚抽5張且保證免費與兩張恢復",()=>{
  assert.equal(NIGHT_CARDS.length,40);
  let state=newGame("x",77);state.stage=2;state.day=4;state=generateCards(state);
  assert.equal(state.deckType,"night");assert.equal(state.candidates.length,5);
  const cards=state.candidates.map(id=>getEvent(id,state));
  assert.ok(cards.some(card=>card.cost===0));assert.ok(cards.filter(card=>card.kind==="recovery").length>=2);
});

test("玩家可延後主線，待辦主線會在下一個上午保留",()=>{
  let state=generateCards(newGame("x",19));assert.ok(state.candidates.includes("signal"));
  const lifeId=state.candidates.find(id=>!getEvent(id,state).main);state=playCard(state,lifeId);state=continueStage(state);
  state=playCard(state,state.candidates.find(id=>(getEvent(id,state).cost||0)<=state.player.resource));state=continueStage(state);
  state=playCard(state,state.candidates.find(id=>(getEvent(id,state).cost||0)<=state.player.resource));state=continueStage(state);
  assert.equal(state.day,2);assert.equal(state.stage,0);assert.ok(state.candidates.includes("signal"));
});

test("高報酬戰鬥卡會進入回合戰鬥並結算獎勵",()=>{
  let state=newGame("x",88);state.day=20;state.stage=2;state.player.resource=100;state=generateCards(state);state.candidates=["combat_dock_brawl"];state=selectCard(state,"combat_dock_brawl");assert.equal(state.phase,"battle");const before=state.player.resource;let guard=0;while(state.phase==="battle"&&guard++<30)state=battleAction(state,"brawl");assert.equal(state.phase,"result");if(state.lastResult.success)assert.ok(state.player.resource>=before+32);
});

test("城市勢力包含九個幫派與十五塊地盤，玩家可主動挑戰",()=>{
  assert.equal(FACTIONS.length,9);assert.equal(TERRITORIES.length,15);
  let state=newGame("x",101);state.day=5;state.stage=1;state.player.resource=100;state.player.abilities.physique=100;state.crew={members:20,morale:100};state=generateCards(state);assert.ok(state.candidates.includes("life_conflict"));state=selectCard(state,"life_conflict");assert.equal(state.phase,"factionBoard");state=startFactionFight(state,"red_tide");assert.equal(state.phase,"battle");let guard=0;while(state.phase==="battle"&&guard++<20)state=battleAction(state,"brawl");assert.equal(state.lastResult.success,true);assert.equal(state.factions.red_tide.wins,1);assert.ok(state.factions.red_tide.respect>0);
});

test("攻佔地盤後產生每日收益，並可花錢強化",()=>{
  let state=newGame("x",202);state.day=5;state.stage=1;state.player.resource=100;state.player.abilities.physique=100;state.crew={members:20,morale:100};state.candidates=["life_conflict"];state=selectCard(state,"life_conflict");state=startTerritoryFight(state,"south_docks");let guard=0;while(state.phase==="battle"&&guard++<20)state=battleAction(state,"brawl");assert.equal(state.lastResult.success,true);assert.equal(state.territories.south_docks.owner,"player");assert.equal(controlledTerritories(state).length,1);assert.equal(territoryIncome(state),4);
  state.phase="factionBoard";state.selected="life_conflict";const before=state.player.resource;state=fortifyTerritory(state,"south_docks");assert.equal(state.territories.south_docks.level,1);assert.equal(state.player.resource,before-11);assert.equal(territoryIncome(state),6);
  state.phase="result";state.stage=2;const beforeSettlement=state.player.resource;state=continueStage(state);assert.equal(state.lastSettlement.turfIncome,6);assert.ok(state.player.resource>=beforeSettlement+6);
});

test("隊伍可招募並強化戰鬥支援，舊存檔會自動補上勢力資料",()=>{
  let state=newGame();state.phase="factionBoard";state.selected="life_conflict";state.player.resource=100;const before=state.player.resource;state=recruitCrew(state);assert.equal(state.crew.members,3);assert.equal(state.player.resource,before-12);assert.equal(state.phase,"result");
  const old=newGame();delete old.factions;delete old.territories;delete old.crew;delete old.pendingRetaliation;const restored=validateSave(old);assert.equal(Object.keys(restored.factions).length,9);assert.equal(Object.keys(restored.territories).length,15);assert.equal(restored.crew.members,2);
});

test("敵方反攻時可主動防守，勝利後保留地盤並解除警報",()=>{
  let state=newGame("x",303);state.day=12;state.stage=1;state.player.resource=100;state.player.abilities.physique=100;state.crew={members:20,morale:100};state.territories.south_docks.owner="player";state.territories.south_docks.level=3;state.pendingRetaliation={territoryId:"south_docks",factionId:"red_tide",sinceDay:12};state.phase="factionBoard";state.selected="life_conflict";state=startTerritoryFight(state,"south_docks");assert.equal(state.battle.battleType,"defend");let guard=0;while(state.phase==="battle"&&guard++<20)state=battleAction(state,"brawl");assert.equal(state.lastResult.success,true);assert.equal(state.territories.south_docks.owner,"player");assert.equal(state.pendingRetaliation,null);
});

test("每章五天，五章主線延伸至第25天",()=>{
  const state=newGame();state.day=25;for(const id of ["signal","runner","ch1_burner","checkpoint","ambush","vault","ch3_escape","ch3_container","ch3_broadcast","ch4_election","ch4_betrayal","ch4_truth","ch5_siege","ch5_tower"])state.seen[id]=true;const cards=generateCards(state);
  assert.equal(cards.chapter,5);assert.ok(cards.candidates.includes("ch5_finale"));
});

test("修改器可改數值並新增離線自訂卡",()=>{
  let state=modifyValue(newGame(),"ability.hacking",91);assert.equal(state.player.abilities.hacking,91);
  state=saveCardDefinition(state,{deck:"night",title:"在屋頂看夜景",summary:"免費／精神 -5。",cost:0,effects:[{type:"stat.add",key:"stress",value:-5}]});
  assert.equal(state.customCards.length,1);assert.equal(state.customCards[0].deck,"night");
});
