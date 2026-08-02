export const FACTIONS = [
  {id:"red_tide",name:"赤潮會",short:"赤潮",style:"掌控碼頭工會與走私船班，擅長人海、棍棒與近距離火力。",color:"#dc575f",baseHostility:22,strength:42,rewardAbility:"physique",unlockDay:1},
  {id:"iron_riders",name:"鐵騎盟",short:"鐵騎",style:"由地下車手與改裝技師組成，總在引擎聲之後迅速包圍目標。",color:"#d88745",baseHostility:18,strength:50,rewardAbility:"engineering",unlockDay:3},
  {id:"white_sharks",name:"白鯊幫",short:"白鯊",style:"控制海濱夜店、保全與娛樂藥物流通，重視面子也懂得談判。",color:"#74c9dc",baseHostility:28,strength:58,rewardAbility:"social",unlockDay:5},
  {id:"northbridge",name:"北橋家族",short:"北橋",style:"盤據老城多年的放款與地下賭場家族，成員紀律嚴密、報復心強。",color:"#b783d7",baseHostility:32,strength:66,rewardAbility:"will",unlockDay:8},
  {id:"glass_snakes",name:"玻璃蛇",short:"玻璃蛇",style:"侵入物流、監控與加密帳戶的新型科技幫派，喜歡讓環境替他們殺人。",color:"#66d98b",baseHostility:24,strength:74,rewardAbility:"hacking",unlockDay:11},
  {id:"civic_cleaners",name:"市政清道夫",short:"清道夫",style:"替權貴處理不能留下紀錄的私人武裝，配備最好，也最不容許失敗。",color:"#d6c76d",baseHostility:38,strength:84,rewardAbility:"perception",unlockDay:15}
];

export const TERRITORIES = [
  {id:"south_docks",name:"南港貨櫃場",district:"港區",factionId:"red_tide",unlockDay:1,entryCost:2,enemyHp:58,reward:26,income:4,perk:"穩定走私抽成；每日地盤收入 +4。",opening:"你切斷貨櫃場照明，帶著隊伍從堆高機通道逼近赤潮守衛。"},
  {id:"fish_market",name:"魚市場後巷",district:"港區",factionId:"red_tide",unlockDay:2,entryCost:2,enemyHp:64,reward:30,income:4,perk:"街坊眼線密集；強化後提高收益與防守。",opening:"攤商拉下鐵門，狹窄後巷只剩你和赤潮會的收費小隊。"},
  {id:"east_chop_shop",name:"東岸地下車廠",district:"工業東岸",factionId:"iron_riders",unlockDay:4,entryCost:3,enemyHp:70,reward:35,income:5,perk:"取得改裝與零件管道；每日地盤收入 +5。",opening:"捲門升起時，鐵騎盟已把車廠中央清成一座臨時擂台。"},
  {id:"overpass_toll",name:"高架橋收費點",district:"工業東岸",factionId:"iron_riders",unlockDay:6,entryCost:4,enemyHp:76,reward:39,income:5,perk:"掌控快速道路；隊伍能更快抵達各區。",opening:"摩托車封住橋面兩端，你必須在警方抵達前打穿收費點。"},
  {id:"neon_strip",name:"霓虹夜店街",district:"海濱娛樂區",factionId:"white_sharks",unlockDay:7,entryCost:5,enemyHp:82,reward:44,income:6,perk:"娛樂場所保護費；每日地盤收入 +6。",opening:"音樂被切斷，白鯊幫保全鎖上所有出口，客人們躲進包廂。"},
  {id:"north_tenements",name:"北橋舊公寓群",district:"老城",factionId:"northbridge",unlockDay:9,entryCost:5,enemyHp:88,reward:49,income:6,perk:"住戶與放款網絡；每日地盤收入 +6。",opening:"樓梯間的燈一層層熄滅，北橋家族從每扇門後封鎖你的退路。"},
  {id:"river_casino",name:"河濱地下賭場",district:"老城",factionId:"northbridge",unlockDay:11,entryCost:6,enemyHp:94,reward:55,income:7,perk:"賭桌與情報交易；每日地盤收入 +7。",opening:"荷官收走籌碼，賭場護衛掀開桌布取出武器。這裡今晚只結算一種輸贏。"},
  {id:"chip_logistics",name:"晶片物流園",district:"科技園區",factionId:"glass_snakes",unlockDay:13,entryCost:7,enemyHp:102,reward:62,income:8,perk:"掌握設備與物流資料；每日地盤收入 +8。",opening:"自動門、無人搬運車與警報全被玻璃蛇接管，你必須邊破解邊推進。"},
  {id:"finance_tower",name:"金融中心停車塔",district:"市中心",factionId:"civic_cleaners",unlockDay:16,entryCost:9,enemyHp:114,reward:75,income:10,perk:"控制權貴地下金流；每日地盤收入 +10。",opening:"防彈休旅車封住每層坡道，市政清道夫從監視死角同步開火。"}
];

export const factionById = id => FACTIONS.find(faction=>faction.id===id);
export const territoryById = id => TERRITORIES.find(territory=>territory.id===id);
