export const FACTIONS = [
  {id:"red_tide",name:"赤潮會",short:"赤潮",style:"掌控碼頭工會與走私船班，擅長人海、棍棒與近距離火力。",color:"#dc575f",baseHostility:22,strength:42,rewardAbility:"physique",unlockDay:1,battleProfile:{name:"碼頭人海壓迫",objective:"包圍前線並用增援拖垮你的隊伍",weakness:"attack",intents:["assault","reinforce","assault","defend"]}},
  {id:"iron_riders",name:"鐵騎盟",short:"鐵騎",style:"由地下車手與改裝技師組成，總在引擎聲之後迅速包圍目標。",color:"#d88745",baseHostility:18,strength:50,rewardAbility:"engineering",unlockDay:3,battleProfile:{name:"高速包夾",objective:"封鎖撤離路線並從側翼反覆衝擊",weakness:"hack",intents:["assault","disrupt","assault","defend"]}},
  {id:"white_sharks",name:"白鯊幫",short:"白鯊",style:"控制海濱夜店、保全與娛樂藥物流通，重視面子也懂得談判。",color:"#74c9dc",baseHostility:28,strength:58,rewardAbility:"social",unlockDay:5,battleProfile:{name:"保全封鎖線",objective:"守住出口並迫使你在眾目睽睽下退讓",weakness:"brawl",intents:["defend","disrupt","assault","defend"]}},
  {id:"northbridge",name:"北橋家族",short:"北橋",style:"盤據老城多年的放款與地下賭場家族，成員紀律嚴密、報復心強。",color:"#b783d7",baseHostility:32,strength:66,rewardAbility:"will",unlockDay:8,battleProfile:{name:"家族縱深防線",objective:"消耗你的資源，再由第二線成員收尾",weakness:"attack",intents:["defend","reinforce","defend","assault"]}},
  {id:"glass_snakes",name:"玻璃蛇",short:"玻璃蛇",style:"侵入物流、監控與加密帳戶的新型科技幫派，喜歡讓環境替他們殺人。",color:"#66d98b",baseHostility:24,strength:74,rewardAbility:"hacking",unlockDay:11,battleProfile:{name:"環境接管",objective:"控制設備、視線與通訊後逐步分割隊伍",weakness:"brawl",intents:["disrupt","defend","disrupt","reinforce"]}},
  {id:"civic_cleaners",name:"市政清道夫",short:"清道夫",style:"替權貴處理不能留下紀錄的私人武裝，配備最好，也最不容許失敗。",color:"#d6c76d",baseHostility:38,strength:84,rewardAbility:"perception",unlockDay:15,battleProfile:{name:"制式火力推進",objective:"以精準火力逐區清除目標並封存現場",weakness:"hack",intents:["assault","defend","assault","disrupt"]}},
  {id:"grey_wolves",name:"灰狼聯盟",short:"灰狼",style:"由鐵路工班、建築包商與失業拳手組成，擅長封路、伏擊和集體施壓。",color:"#98a1aa",baseHostility:20,strength:54,rewardAbility:"management",unlockDay:5,battleProfile:{name:"工地封路伏擊",objective:"堵死通道並把戰鬥拖進近距離消耗",weakness:"hack",intents:["reinforce","assault","defend","assault"]}},
  {id:"dead_air",name:"死訊台",short:"死訊",style:"經營地下電台與影音勒索的媒體幫派，會在開戰前先摧毀對手的名聲。",color:"#e26f9d",baseHostility:26,strength:70,rewardAbility:"hacking",unlockDay:10,battleProfile:{name:"輿論與訊號戰",objective:"擾亂判斷、提高壓力並把失誤公開播送",weakness:"brawl",intents:["disrupt","disrupt","defend","reinforce"]}},
  {id:"golden_ring",name:"金環會",short:"金環",style:"遊艇、免稅品與高級會所背後的白領犯罪集團，保鑣和律師同樣危險。",color:"#f1bd4d",baseHostility:30,strength:78,rewardAbility:"social",unlockDay:12,battleProfile:{name:"分層護衛網",objective:"用精銳保鑣守住高價目標並等待援軍",weakness:"attack",intents:["defend","reinforce","disrupt","defend"]}}
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
  {id:"finance_tower",name:"金融中心停車塔",district:"市中心",factionId:"civic_cleaners",unlockDay:16,entryCost:9,enemyHp:114,reward:75,income:10,perk:"控制權貴地下金流；每日地盤收入 +10。",opening:"防彈休旅車封住每層坡道，市政清道夫從監視死角同步開火。"},
  {id:"west_rail_yard",name:"西線鐵路貨場",district:"西部工業區",factionId:"grey_wolves",unlockDay:5,entryCost:3,enemyHp:72,reward:38,income:5,perk:"掌控鐵路貨運抽成；每日地盤收入 +5。",opening:"貨運列車慢慢滑入月台，灰狼聯盟從車廂與吊車後同時現身。"},
  {id:"construction_depot",name:"建築材料集散場",district:"西部工業區",factionId:"grey_wolves",unlockDay:8,entryCost:4,enemyHp:82,reward:45,income:6,perk:"控制工地供應鏈；每日地盤收入 +6。",opening:"水泥車堵住大門，灰狼拳手用鋼管敲擊貨架，逼你在狹窄通道決戰。"},
  {id:"pirate_station",name:"廢棄地下電台",district:"山城住宅區",factionId:"dead_air",unlockDay:10,entryCost:5,enemyHp:88,reward:50,income:6,perk:"取得地下廣播與輿論管道；每日地盤收入 +6。",opening:"你循著非法訊號找到電台，所有螢幕突然同步播放你的通緝照片。"},
  {id:"relay_tower",name:"山頂電視轉播塔",district:"山城住宅區",factionId:"dead_air",unlockDay:14,entryCost:7,enemyHp:104,reward:64,income:8,perk:"控制全城訊號節點；每日地盤收入 +8。",opening:"死訊台切斷山路照明，無人機在轉播塔紅燈之間搜尋你的隊伍。"},
  {id:"marina_club",name:"金灣遊艇會",district:"金灣碼頭",factionId:"golden_ring",unlockDay:12,entryCost:7,enemyHp:98,reward:59,income:8,perk:"高級會所與遊艇交易；每日地盤收入 +8。",opening:"香檳杯還留在桌上，金環會保鑣已把遊艇會變成層層交叉火網。"},
  {id:"cruise_terminal",name:"國際郵輪免稅站",district:"金灣碼頭",factionId:"golden_ring",unlockDay:17,entryCost:10,enemyHp:118,reward:80,income:11,perk:"掌控免稅貨物流轉；每日地盤收入 +11。",opening:"免稅站鐵門落下，金環會的武裝保全從精品櫃後推進，監控則追蹤每一次移動。"}
];

export const factionById = id => FACTIONS.find(faction=>faction.id===id);
export const territoryById = id => TERRITORIES.find(territory=>territory.id===id);
