export const CONTACT_PASSIVES = {
  mira:{armor:2,medical:1},
  kael:{flee:3,armor:1},
  zero:{reward:2,income:1},
  chenglan:{securityReduction:2,flee:1}
};

export const DIFEI_ACTIVITIES = [
  {id:"difei_spar",title:"在安全屋陪狄菲對練",detail:"免費／關係 +6／體能 +1／疲勞 +7／精神 -3。",effects:[{type:"relation.add",key:"difei",value:6},{type:"ability.add",key:"physique",value:1},{type:"stat.add",key:"fatigue",value:7},{type:"stat.add",key:"stress",value:-3}],result:"狄菲綁緊手綁帶，笑著叫你別放水。幾輪攻防後，她替你修正重心，也重新相信自己的力量可以用來保護人。"},
  {id:"difei_intel",title:"和狄菲整理情報",detail:"免費／關係 +5／觀察 +1／精神 +2。",effects:[{type:"relation.add",key:"difei",value:5},{type:"ability.add",key:"perception",value:1},{type:"stat.add",key:"stress",value:2}],result:"狄菲把情報牆重新排成一條清楚的時間線。她嘴上嫌你桌面太亂，卻把每一個可能威脅你的名字都記得很牢。"},
  {id:"difei_meal",title:"和狄菲吃一頓飯",detail:"現金 -3／關係 +7／精神 -6。",effects:[{type:"resource.add",value:-3},{type:"relation.add",key:"difei",value:7},{type:"stat.add",key:"stress",value:-6}],result:"離開安全屋後，狄菲終於把耳機摘下。她一邊和你搶最後一塊炸物，一邊用「老闆」掩飾自己其實很享受這段安靜。"}
];

export const CHENGLAN_ACTIVITIES = [
  {id:"chenglan_intel",title:"和程嵐交換機密情報",detail:"現金 -2／關係 +5／科技 +1／精神 +2。",effects:[{type:"resource.add",value:-2},{type:"relation.add",key:"chenglan",value:5},{type:"ability.add",key:"hacking",value:1},{type:"stat.add",key:"stress",value:2}],result:"程嵐把體制內的碎片情報拼成一張乾淨的關係圖，只留下你需要知道的部分。"},
  {id:"chenglan_system",title:"進行警用系統演練",detail:"現金 -3／關係 +4／科技 +2／警方戒備 +1。",effects:[{type:"resource.add",value:-3},{type:"relation.add",key:"chenglan",value:4},{type:"ability.add",key:"hacking",value:2},{type:"world.add",key:"security",value:1}],result:"程嵐用測試環境演示警方的追蹤程序。你學會避開幾個盲點，演練留下的異常流量也引來一點注意。"},
  {id:"chenglan_patrol",title:"在巡邏車旁短暫會面",detail:"免費／關係 +5／觀察 +1／疲勞 +3。",effects:[{type:"relation.add",key:"chenglan",value:5},{type:"ability.add",key:"perception",value:1},{type:"stat.add",key:"fatigue",value:3}],result:"程嵐靠著沒有標誌的巡邏車，用幾分鐘指出街區監視網的死角。她語氣平靜，卻已經替你擋掉兩次內部查詢。"}
];

const eventChoice=(id,text,detail,effects,result)=>({id,text,detail,effects,result});
export const DIFEI_EVENTS = [
  {id:"difei_spar_event",characterId:"difei",threshold:45,title:"停在最後一拳",tag:"狄菲事件／一",summary:"安全屋的對練裡，狄菲一路壓制你，卻在最後一拳落下前本能地僵住。",choices:[
    eventChoice("steady","保持原位，讓她自己收拳","不逼近，也不把她的恐懼當成軟弱。",[{type:"relation.add",key:"difei",value:8},{type:"ability.add",key:"will",value:1},{type:"stat.add",key:"stress",value:-3}],"她的拳停在你面前。狄菲喘了很久才低聲說：『老闆，你真的很會給人出難題。』但這次，她沒有逃離訓練墊。"),
    eventChoice("lower","放低雙手，坦白你信任她","把判斷權交還給狄菲。",[{type:"relation.add",key:"difei",value:10},{type:"ability.add",key:"social",value:1}],"你告訴她，停手也是力量的一部分。狄菲別開臉，嘴上說你太冒險，重新戴好手綁帶時卻笑了。")
  ]},
  {id:"difei_media_event",characterId:"difei",threshold:65,title:"雨中的舊畫面",tag:"狄菲事件／二",summary:"前比賽場館外，媒體包圍狄菲，螢幕反覆播放她重傷對手的舊畫面。她在雨裡失去力氣。",choices:[
    eventChoice("shield","替她擋開鏡頭，帶她離開","先保住她喘息的空間。",[{type:"relation.add",key:"difei",value:9},{type:"stat.add",key:"stress",value:3},{type:"world.add",key:"people",value:2}],"你隔開人群，把她帶到沒有鏡頭的騎樓。狄菲抓住你的袖口，第一次完整說出那場比賽之後的每一個夜晚。"),
    eventChoice("stand","站在她身旁，讓她決定何時開口","不代替她回答，也不讓她獨自承受。",[{type:"relation.add",key:"difei",value:11},{type:"ability.add",key:"will",value:1},{type:"world.add",key:"security",value:1}],"你只說『我在這裡』。狄菲慢慢站直，沒有回答記者，卻第一次看完了那段她一直躲避的畫面。")
  ]},
  {id:"difei_interview_event",characterId:"difei",threshold:85,title:"空拳台上的回答",tag:"狄菲事件／三",summary:"空蕩拳台亮起白色聚光燈。狄菲回到曾經逃離的地方，準備公開承認責任與恐懼。",choices:[
    eventChoice("witness","留在台下，讓她說完自己的話","這一次，力量與責任都由她自己命名。",[{type:"relation.add",key:"difei",value:14},{type:"ability.add",key:"will",value:2},{type:"world.add",key:"people",value:5}],"狄菲承認自己曾傷害人，也承認害怕再次出拳。訪問結束後，她走下拳台，主動抱住你很久。『老闆，這次換我相信自己的判斷。』"),
    eventChoice("corner","站到她的角落，成為唯一的後援","不搶走她的舞台，只守住她回來的路。",[{type:"relation.add",key:"difei",value:16},{type:"ability.add",key:"social",value:1},{type:"world.add",key:"people",value:4}],"她平靜回答每一個問題，最後向曾被她傷害的人道歉。燈光熄滅後，狄菲先伸手把你拉近，長久的擁抱比任何稱呼都更明確。")
  ]}
];

export const characterEventById=id=>DIFEI_EVENTS.find(event=>event.id===id);
