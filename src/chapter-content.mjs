const choice=(id,text,detail,effects,check,result)=>({id,text,detail,effects,check,result});
const main=(id,day,title,summary,tag,choices,chapter)=>({id,stage:0,title,summary,tag,choices,main:true,chapter,requirements:{dayMin:day,dayMax:day}});

export const CHAPTER_EVENTS = [
  main("ch1_burner",3,"被刪除的第三名共犯","金庫藍圖上有第三個簽名：市議員林正岳。阿哲要你先決定相信證據，還是相信他。","主線",[
    choice("verify","潛入建管處驗證簽名","科技檢定／取得官方檔案。",[{type:"flag.set",key:"council_link",value:true},{type:"ability.add",key:"hacking",value:2}],{ability:"hacking",difficulty:38},"簽名是真的，但調閱紀錄立刻傳到市長辦公室。"),
    choice("tail","跟蹤議員的司機","觀察檢定／找出祕密會面地點。",[{type:"flag.set",key:"council_link",value:true},{type:"ability.add",key:"perception",value:2},{type:"world.add",key:"security",value:2}],{ability:"perception",difficulty:38},"司機每週都把一只黑箱送進港區海關。")
  ],1),
  main("ch3_escape",7,"第二章：逃亡名單","金庫事件後，警方公布全城通緝名單。若琳、小凱和老六的名字全在上面。","追捕",[
    choice("split","安排三條撤離路線","生意檢定／分散警方注意。",[{type:"flag.set",key:"crew_scattered",value:true},{type:"ability.add",key:"management",value:2},{type:"world.add",key:"security",value:-3}],{ability:"management",difficulty:44},"你把同伴送進三個不同城區，自己留下吸引警車。"),
    choice("together","所有人躲進同一據點","膽識檢定／保住團隊關係，但藏身風險較高。",[{type:"relation.add",key:"mira",value:6},{type:"relation.add",key:"kael",value:5},{type:"relation.add",key:"zero",value:4},{type:"world.add",key:"security",value:5}],{ability:"will",difficulty:43},"沒有人願意先走。你們在停電的車庫裡熬過搜索。")
  ],2),
  main("ch3_container",8,"漂流貨櫃裡的伺服器","老六查到海關每天深夜把一座離線伺服器送上貨輪，裡面保存全市黑金帳。","搶奪",[
    choice("crane","劫持貨櫃吊車","科技檢定／不開槍奪走伺服器。",[{type:"flag.set",key:"server_stolen",value:true},{type:"ability.add",key:"hacking",value:2},{type:"stat.add",key:"fatigue",value:8}],{ability:"hacking",difficulty:45},"吊車把貨櫃放到錯誤拖車上；港務系統直到天亮才發現。"),
    choice("convoy","在高架橋攔截車隊","駕駛檢定／直接奪取，警方戒備增加。",[{type:"flag.set",key:"server_stolen",value:true},{type:"ability.add",key:"engineering",value:2},{type:"world.add",key:"security",value:6}],{ability:"engineering",difficulty:45},"小凱用車身堵死出口，你在九十秒內完成換車。")
  ],2),
  main("ch3_broadcast",9,"全城斷訊九十秒","伺服器只能在市府緊急網路解密。阿哲提議讓整座城市斷訊，趁九十秒接入。","駭入",[
    choice("blackout","切斷城市通訊","科技檢定／取得完整黑金網路。",[{type:"flag.set",key:"ledger_network",value:true},{type:"world.add",key:"ai",value:8},{type:"world.add",key:"security",value:6}],{ability:"hacking",difficulty:48},"紅綠燈、新聞台與警用頻道同時沉默，帳本在黑暗中完成解密。"),
    choice("inside","收買市府值班員","口才檢定／低調解密，但欠下一個人情。",[{type:"flag.set",key:"ledger_network",value:true},{type:"ability.add",key:"social",value:2},{type:"resource.add",value:-10}],{ability:"social",difficulty:46},"值班員只問了一句：如果你贏了，這座城會不會更好？")
  ],2),
  main("ch4_election",10,"第三章：一座待價而沽的城市","帳本指出市長選舉只是黑幫與建商的拍賣會；兩名候選人都派人來買你的沉默。","權力",[
    choice("auction","讓雙方互相加價","生意檢定／取得資金與兩邊罪證。",[{type:"resource.add",value:24},{type:"ability.add",key:"management",value:2},{type:"world.add",key:"corporate",value:4}],{ability:"management",difficulty:48},"你收下兩份訂金，也錄下兩邊承認付款目的的聲音。"),
    choice("people","把選舉帳本交給街坊","口才檢定／提高街坊力量。",[{type:"world.add",key:"people",value:12},{type:"world.add",key:"corporate",value:-8},{type:"flag.set",key:"people_mobilized",value:true}],{ability:"social",difficulty:47},"影印本一夜之間貼滿市場、學校與捷運出口。")
  ],3),
  main("ch4_betrayal",11,"若琳留下的車鑰匙","若琳失蹤，只在工作桌留下一把車鑰匙。監視器拍到她主動坐進阿哲的車。","背叛",[
    choice("trust","相信若琳有自己的計畫","膽識檢定／不打草驚蛇。",[{type:"flag.set",key:"trusted_mira",value:true},{type:"relation.add",key:"mira",value:8},{type:"stat.add",key:"stress",value:7}],{ability:"will",difficulty:48},"你忍住追出去的衝動，在鑰匙裡找到她藏下的定位晶片。"),
    choice("hunt","立刻追蹤阿哲","駕駛檢定／提前找到會面處。",[{type:"flag.set",key:"found_mira",value:true},{type:"ability.add",key:"engineering",value:2},{type:"world.add",key:"security",value:5}],{ability:"engineering",difficulty:49},"追車最後停在廢棄電視台；若琳正在裡面拖延阿哲。")
  ],3),
  main("ch4_truth",12,"阿哲真正偷走的東西","阿哲承認運鈔車裡沒有錢，只有能控制市府金流的主密鑰。他想用它接管整座城市。","真相",[
    choice("join","假裝加入阿哲","口才檢定／取得主密鑰位置。",[{type:"flag.set",key:"key_location",value:true},{type:"relation.add",key:"zero",value:5},{type:"world.add",key:"corporate",value:3}],{ability:"social",difficulty:50},"阿哲終於笑了，把你帶到海底隧道下方的資料庫。"),
    choice("break","當場與阿哲決裂","膽識檢定／保住若琳並公開宣戰。",[{type:"flag.set",key:"war_with_azhe",value:true},{type:"relation.add",key:"mira",value:10},{type:"world.add",key:"people",value:6}],{ability:"will",difficulty:50},"若琳站到你這邊。阿哲離開前說，你還是不懂權力。")
  ],3),
  main("ch5_siege",13,"第四章：海港封鎖線","阿哲控制警用系統封鎖港區。你必須在黎明前打開一條路，讓證人與街坊撤離。","圍城",[
    choice("signals","重寫封鎖號誌","科技檢定／讓警方車隊互相阻塞。",[{type:"flag.set",key:"harbor_open",value:true},{type:"ability.add",key:"hacking",value:2},{type:"world.add",key:"security",value:-5}],{ability:"hacking",difficulty:52},"所有封鎖車同時收到矛盾命令，港區出口被自己人堵死。"),
    choice("convoy","帶領街坊車隊突破","駕駛檢定／提高街坊聲望但可能受傷。",[{type:"flag.set",key:"harbor_open",value:true},{type:"world.add",key:"people",value:10},{type:"stat.add",key:"health",value:-6}],{ability:"engineering",difficulty:52},"數十輛貨車同時鳴笛衝出封鎖，整座城市都看見了。")
  ],4),
  main("ch5_tower",14,"沒有名字的第六十層","主密鑰藏在高萬城新大樓的第六十層。電梯紀錄裡，那一層從不存在。","潛入",[
    choice("service","從維修井爬上去","體能檢定／避開電子保全。",[{type:"flag.set",key:"master_key",value:true},{type:"ability.add",key:"physique",value:2},{type:"stat.add",key:"fatigue",value:14}],{ability:"physique",difficulty:53},"你從電梯井撬開不存在的門，伺服器冷氣像冬天一樣撲來。"),
    choice("identity","冒充企業稽核員","口才檢定／從正門取得主密鑰。",[{type:"flag.set",key:"master_key",value:true},{type:"ability.add",key:"social",value:2},{type:"world.add",key:"corporate",value:-5}],{ability:"social",difficulty:53},"三名主管親自替你開門，沒有人敢承認自己不認識你。")
  ],4),
  main("ch5_finale",15,"第五章：五路亡命","阿哲在跨海資料中心啟動主密鑰。警察、幫派、企業、街坊與你的同伴同時抵達；你只能決定這座城最後屬於誰。","終局",[
    choice("free","讓所有帳本公開","把權貴、警察與幫派的交易完整公開，連自己的罪也不隱瞞。",[{type:"flag.set",key:"ending_free",value:true},{type:"world.add",key:"people",value:18},{type:"world.add",key:"corporate",value:-15},{type:"world.add",key:"ai",value:12}],null,"資料像洪水流進全城每一支手機。你失去清白，城市第一次得到真相。"),
    choice("restore","奪走主密鑰並保護家人","關閉公開系統，帶若琳與同伴離開；你掌握足以讓所有勢力不敢追來的籌碼。",[{type:"flag.set",key:"ending_restore",value:true},{type:"relation.add",key:"mira",value:18},{type:"resource.add",value:45},{type:"world.add",key:"people",value:8}],null,"海港市沒有得到英雄，只得到一群終於活著離開的人。"),
    choice("destroy","摧毀主密鑰與資料中心","讓任何人都無法控制城市金流，代價是所有證據與財富一起消失。",[{type:"flag.set",key:"ending_destroy",value:true},{type:"world.add",key:"security",value:-18},{type:"world.add",key:"corporate",value:-12},{type:"ability.add",key:"will",value:3}],null,"爆炸沿海面點亮五條逃亡路線。阿哲留在火裡，你帶著答案走出去。")
  ],5)
];

const CHAPTER_TITLES={ch3_escape:"第三章：逃亡名單",ch4_election:"第四章：一座待價而沽的城市",ch5_siege:"第五章：海港封鎖線",ch5_finale:"第五章終局：五路亡命"};
for(const event of CHAPTER_EVENTS)if(CHAPTER_TITLES[event.id])event.title=CHAPTER_TITLES[event.id];
const STORY_BRIDGES={
  ch3_broadcast:"逃亡空檔裡，老六與小凱偷走海關的離線伺服器；它只能在市府緊急網路解密。阿哲提議讓整座城市斷訊九十秒。",
  ch4_truth:"若琳在你處理城市生活時查清阿哲的藏身處。阿哲承認運鈔車裡沒有錢，只有能控制市府金流的主密鑰。",
  ch5_finale:"若琳與小凱利用你爭取的空檔，從高萬城大樓取回主密鑰。阿哲在跨海資料中心啟動最後程序，五股勢力同時抵達。"
};
for(const event of CHAPTER_EVENTS)if(STORY_BRIDGES[event.id])event.summary=STORY_BRIDGES[event.id];

export function chapterForDay(day){return Math.min(5,Math.floor((day-1)/5)+1);}
