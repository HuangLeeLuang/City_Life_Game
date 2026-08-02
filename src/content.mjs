export const STAGES = ["上午・故事", "下午・生活", "晚上・夜生活"];
export const ABILITY_LABELS = { physique:"體能", reflex:"槍法", hacking:"科技", engineering:"駕駛", social:"口才", perception:"觀察", will:"膽識", management:"生意" };

const choice = (id, text, detail, effects, check, result, cost) => ({ id, text, detail, effects, check, result, cost });
const event = (id, stage, title, summary, tag, choices, extra={}) => ({ id, stage, title, summary, tag, choices, weight:1, ...extra });

export const EVENTS = [
  event("morning_patrol",0,"港區晨霧","你在碼頭認出昨夜追車留下的彈殼，警方卻刻意封鎖了另一條街。","線索",[
    choice("observe","調查現場","記住監視器死角與警方動線。",[{type:"ability.add",key:"perception",value:1},{type:"world.add",key:"security",value:-1}]),
    choice("help","收買清潔工","讓關鍵證物在警方抵達前消失。",[{type:"world.add",key:"people",value:2},{type:"ability.add",key:"engineering",value:1}])
  ],{repeatable:true}),
  event("public_terminal",0,"交通局內鬼","一名欠賭債的職員握有全市車牌辨識紀錄，今晚就會被調職。","情報",[
    choice("search","買下紀錄","找出那輛神祕黑色休旅車。",[{type:"ability.add",key:"hacking",value:1},{type:"ability.add",key:"perception",value:1}]),
    choice("wipe","刪除車牌","先清掉自己人的犯罪足跡。",[{type:"world.add",key:"people",value:3},{type:"world.add",key:"security",value:1}])
  ],{repeatable:true}),
  event("alley_contact",0,"洗車場小弟","地頭蛇的小弟看見誰把屍體搬進市長候選人的競選車。","街頭",[
    choice("trade","替他還債","買下一個忠誠但麻煩的耳目。",[{type:"resource.add",value:-2},{type:"ability.add",key:"social",value:1},{type:"world.add",key:"people",value:2}]),
    choice("question","拆穿謊話","逼他說出真正的車牌與時間。",[{type:"ability.add",key:"perception",value:2}],{ability:"perception",difficulty:32})
  ],{repeatable:true}),
  event("signal",0,"死人的電話","三年前害你入獄的搭檔阿哲打來電話。他理應已經死在運鈔車爆炸案。","主線",[
    choice("trace","追查來電","請電信公司內鬼定位公用電話。",[{type:"ability.add",key:"hacking",value:2},{type:"flag.set",key:"traced",value:true},{type:"world.add",key:"security",value:-3}],{ability:"hacking",difficulty:34}),
    choice("listen","讓他說完","阿哲只說：『那筆錢從來不在車上。』",[{type:"ability.add",key:"perception",value:2},{type:"relation.add",key:"mira",value:5},{type:"flag.set",key:"heard_mira",value:true},{type:"stat.add",key:"stress",value:8}],{ability:"will",difficulty:32})
  ],{main:true,requirements:{dayMax:1}}),
  event("street_doc",1,"與若琳見面","抽時間到修車廠找若琳，選擇一起工作或談談最近發生的事。","社交",[
    choice("assist","幫忙修車","花一點體力協助若琳處理積壓工作。",[{type:"ability.add",key:"engineering",value:2},{type:"relation.add",key:"mira",value:5},{type:"resource.add",value:3},{type:"stat.add",key:"fatigue",value:5}],undefined,"你和若琳在引擎蓋下忙了一個下午。工作結束時，她把一半工錢塞給你，也開始願意談起你入獄後的三年。"),
    choice("guard","邀她喝咖啡","支付兩人花費，降低壓力並了解若琳的想法。",[{type:"ability.add",key:"social",value:2},{type:"relation.add",key:"mira",value:7},{type:"resource.add",value:-3},{type:"stat.add",key:"stress",value:-7}],undefined,"若琳一開始只談車，後來終於問你：這次事情結束後，你是不是又會突然消失。你沒有迴避這個問題。")
  ],{repeatable:true}),
  event("night_market",2,"脫衣酒吧的帳本","酒保老六兜售一本帳冊，裡面記著警察、議員與毒梟的共同金主。","情報",[
    choice("buy","買下帳本","花錢取得能勒索半座城市的名單。",[{type:"resource.add",value:-10},{type:"flag.set",key:"has_list",value:true},{type:"ability.add",key:"management",value:1}]),
    choice("bargain","拿祕密交換","告訴老六阿哲仍活著，逼他降價。",[{type:"flag.set",key:"has_list",value:true},{type:"relation.add",key:"zero",value:5},{type:"world.add",key:"gangs",value:2}],{ability:"social",difficulty:36})
  ],{repeatable:true}),
  event("inventory",2,"地下室軍火箱","阿哲留下的箱子裡有槍、假車牌，還有一張你全家被監視的照片。","整備",[
    choice("maintain","整理武器","擦掉序號，準備最壞的一晚。",[{type:"ability.add",key:"engineering",value:1},{type:"stat.add",key:"stress",value:-3}]),
    choice("budget","變賣零件","換一筆不會被銀行追蹤的現金。",[{type:"resource.add",value:4},{type:"ability.add",key:"management",value:1}])
  ],{repeatable:true}),
  event("rooftop_radio",2,"警用頻道","一台改裝收音機持續播出針對你的搜索命令。奇怪的是，發布命令的人早已退休。","情報",[
    choice("listen","監聽部署","摸清臨檢與巡邏空隙。",[{type:"ability.add",key:"perception",value:1},{type:"world.add",key:"people",value:1}]),
    choice("broadcast","製造假報案","把警力引向富人區的一場假槍戰。",[{type:"ability.add",key:"social",value:1},{type:"world.add",key:"people",value:2},{type:"world.add",key:"security",value:1}])
  ],{repeatable:true}),
  event("power_cut",1,"在街區打聽消息","走進市場與巷弄，從居民或地頭人物口中收集城市近況。","情報",[
    choice("clinic","協助街坊換情報","花時間替居民處理麻煩，換取可靠消息。",[{type:"world.add",key:"people",value:5},{type:"ability.add",key:"perception",value:2},{type:"stat.add",key:"fatigue",value:5},{type:"resource.add",value:-2}],undefined,"你替雜貨店搬走堵門的廢棄機車。老闆沒有付錢，卻告訴你昨晚有哪兩輛警車刻意關掉了定位器。"),
    choice("market","付錢向耳目打聽","快速取得情報，不欠街坊人情。",[{type:"resource.add",value:-5},{type:"ability.add",key:"social",value:2},{type:"world.add",key:"people",value:1},{type:"stat.add",key:"stress",value:2}],undefined,"消息販子收下現金，把三個名字和兩個車牌寫在紙巾上。資訊很貴，但至少沒有人會在日後要求你償還人情。")
  ],{repeatable:true}),
  event("drone_scrap",2,"失竊的警車","一輛未登記的警車停在巷內，後車廂有血和市府停車證。","線索",[
    choice("salvage","換掉車牌","把它變成逃亡用的乾淨車。",[{type:"resource.add",value:9},{type:"ability.add",key:"engineering",value:2}],{ability:"engineering",difficulty:34}),
    choice("decode","破解行車紀錄","找出誰把車開進市長官邸。",[{type:"flag.set",key:"patrol_map",value:true},{type:"ability.add",key:"hacking",value:2},{type:"world.add",key:"security",value:-2}],{ability:"hacking",difficulty:35})
  ],{repeatable:true}),
  event("runner",0,"中槍的菜鳥","年輕車手小凱倒在你家門前，手裡緊握阿哲失蹤前寄出的保險箱鑰匙。","危機",[
    choice("hide","藏起小凱","冒著警方搜索風險救下一名盟友。",[{type:"relation.add",key:"kael",value:8},{type:"flag.set",key:"saved_runner",value:true},{type:"stat.add",key:"health",value:-4}],{ability:"will",difficulty:32}),
    choice("take_chip","拿走鑰匙","把他丟在急診門口，自己去追那筆錢。",[{type:"resource.add",value:12},{type:"flag.set",key:"took_chip",value:true},{type:"world.add",key:"people",value:-3}])
  ],{main:true,requirements:{dayMin:2,dayMax:2}}),
  event("gym",1,"進行體能訓練","前往健身房或戶外場地鍛鍊，改善體能並消耗疲勞。","訓練",[
    choice("sprint","進行耐力訓練","跑步與負重訓練，提高體能。",[{type:"ability.add",key:"physique",value:3},{type:"stat.add",key:"fatigue",value:12},{type:"stat.add",key:"health",value:3},{type:"resource.add",value:-2}],undefined,"你完成一整套負重與間歇跑。肌肉開始發酸，但呼吸比上一次更快恢復平穩。"),
    choice("dodge","進行反應訓練","利用拳擊沙包與閃避球訓練反應。",[{type:"ability.add",key:"reflex",value:2},{type:"ability.add",key:"physique",value:1},{type:"stat.add",key:"fatigue",value:10},{type:"stat.add",key:"stress",value:-4}],undefined,"教練把節奏拉到你幾乎跟不上。離開時雙腿仍在發抖，腦袋卻比進門前清醒。")
  ],{repeatable:true}),
  event("quiet_room",1,"休息與療傷","尋找安全地點休息，恢復健康、疲勞或精神狀態。","休整",[
    choice("rest","睡一段時間","關掉手機，讓身體真正休息。",[{type:"stat.add",key:"health",value:8},{type:"stat.add",key:"stress",value:-10},{type:"stat.add",key:"fatigue",value:-18},{type:"ability.add",key:"physique",value:1}],undefined,"你睡得很沉。醒來時城市依舊混亂，但傷口不再抽痛，思緒也不再被疲憊拉扯。"),
    choice("meditate","處理傷勢","購買藥品並仔細處理身上的傷。",[{type:"ability.add",key:"will",value:2},{type:"stat.add",key:"health",value:15},{type:"stat.add",key:"stress",value:-5},{type:"resource.add",value:-5}],undefined,"消毒劑刺進傷口時你沒有出聲。這不是完全康復，但至少下一次奔跑時不會因舊傷慢半步。")
  ],{repeatable:true}),
  event("community_kitchen",1,"吃一頓飯","不論身在城市哪一區，都得找地方補充體力。選擇便宜果腹或好好吃一餐。","生活",[
    choice("cook","簡單吃點東西","花少量現金快速果腹，稍微恢復狀態。",[{type:"resource.add",value:-2},{type:"stat.add",key:"fatigue",value:-6},{type:"stat.add",key:"health",value:3},{type:"ability.add",key:"management",value:1}],undefined,"你在路邊攤吃完一份熱食。稱不上享受，但胃裡有了東西，接下來幾個小時至少不會因飢餓分心。"),
    choice("organize","吃一頓正式餐點","多花一些現金，充分恢復並練習與人交談。",[{type:"resource.add",value:-6},{type:"stat.add",key:"fatigue",value:-10},{type:"stat.add",key:"stress",value:-8},{type:"stat.add",key:"health",value:5},{type:"ability.add",key:"social",value:1}],undefined,"你坐下來完整吃完一道主餐和熱湯。服務生不問你的傷從哪來，只在結帳時告訴你後門可以避開巡邏。")
  ],{repeatable:true}),
  event("asset_market",1,"前往市場購買","拜訪掮客老六，從房產、車輛、武器、奢侈品與產業中挑選一項購買。","功能卡",[
    choice("property","購買河景公寓","現金 40／取得房產「河景公寓」；每日恢復加強，但高調房產會增加警方注意。",[{type:"resource.add",value:-40},{type:"asset.grant",category:"properties",assetId:"property_riverside_flat",name:"河景公寓"},{type:"ability.add",key:"management",value:2},{type:"stat.add",key:"stress",value:-10},{type:"world.add",key:"security",value:4}],undefined,"你用空殼公司買下河景公寓。這裡有車庫、備用出口和能看見跨海大橋的陽台；但房產過戶紀錄也讓警方多了一條追查資金的線索。",40),
    choice("safehouse_property","購買郊區安全屋","現金 28／取得房產「郊區安全屋」；降低精神與警方注意，生活條件較差。",[{type:"resource.add",value:-28},{type:"asset.grant",category:"properties",assetId:"property_suburban_safehouse",name:"郊區安全屋"},{type:"ability.add",key:"will",value:2},{type:"stat.add",key:"stress",value:-6},{type:"world.add",key:"security",value:-4}],undefined,"安全屋位於廢棄加油站後方，牆壁發霉、手機沒有訊號，卻有三條不會被監視器拍到的離開路線。",28),
    choice("vehicle","購買改裝轎跑","現金 22／取得車輛「灰影轎跑」；強化駕駛與撤離能力，但需要保養。",[{type:"resource.add",value:-22},{type:"asset.grant",category:"vehicles",assetId:"vehicle_grey_sport",name:"灰影轎跑"},{type:"ability.add",key:"engineering",value:3},{type:"stat.add",key:"stress",value:-3},{type:"world.add",key:"people",value:1}],undefined,"灰影轎跑掛著無法追溯的外地車牌。它能在追捕中提供更好的撤離機會，但醒目的引擎聲也會讓整條街知道你回來了。",22),
    choice("suv","購買二手越野休旅","現金 18／取得車輛「黑石休旅」；提高體能與運貨能力，每日需要保養。",[{type:"resource.add",value:-18},{type:"asset.grant",category:"vehicles",assetId:"vehicle_black_suv",name:"黑石休旅"},{type:"ability.add",key:"physique",value:2},{type:"stat.add",key:"health",value:3},{type:"world.add",key:"people",value:-1}],undefined,"黑石休旅跑不快，卻能撞開路障、塞進四個人和三只現金袋。前任車主留下的彈孔被若琳用貼紙蓋住。",18),
    choice("weapon","購買短管霰彈槍","現金 14／取得武器「短管霰彈槍」；提高槍法與戰鬥優勢，也會提高警方戒備。",[{type:"resource.add",value:-14},{type:"asset.grant",category:"weapons",assetId:"weapon_sawed_shotgun",name:"短管霰彈槍"},{type:"ability.add",key:"reflex",value:3},{type:"stat.add",key:"stress",value:3},{type:"world.add",key:"security",value:5}],undefined,"老六把磨掉序號的霰彈槍交給你。近距離沒人敢擋路，但只要被搜到一次，普通臨檢就會變成重罪逮捕。",14),
    choice("pistol","購買消音手槍","現金 18／取得武器「九毫米消音手槍」；提升槍法與觀察，價格較高。",[{type:"resource.add",value:-18},{type:"asset.grant",category:"weapons",assetId:"weapon_silenced_pistol",name:"九毫米消音手槍"},{type:"ability.add",key:"reflex",value:2},{type:"ability.add",key:"perception",value:1},{type:"stat.add",key:"stress",value:2},{type:"world.add",key:"security",value:2}],undefined,"這把槍乾淨、平衡，而且沒有在任何案件裡留下彈道紀錄。老六只提醒你，安靜的武器通常會讓人更快跨過底線。",18),
    choice("luxury","購買限量名錶","現金 10／取得奢侈品「金色潛水錶」；提高口才與若琳信任，但降低街坊觀感。",[{type:"resource.add",value:-10},{type:"asset.grant",category:"luxuries",assetId:"luxury_gold_watch",name:"金色潛水錶"},{type:"ability.add",key:"social",value:2},{type:"relation.add",key:"mira",value:3},{type:"world.add",key:"people",value:-2}],undefined,"你把名錶送給若琳，說這是遲到三年的生日禮物。她收下了，卻提醒你：在欠拆遷戶人情時戴金錶，不會讓街坊更信任你。",10),
    choice("travel_bag","購買設計師旅行袋","現金 12／取得奢侈品「黑色旅行袋」；提高生意與口才，方便在正式場所攜帶大量現金。",[{type:"resource.add",value:-12},{type:"asset.grant",category:"luxuries",assetId:"luxury_black_bag",name:"黑色旅行袋"},{type:"ability.add",key:"management",value:2},{type:"ability.add",key:"social",value:1},{type:"stat.add",key:"stress",value:-2},{type:"world.add",key:"people",value:-1}],undefined,"這只旅行袋看起來像律師的行李，內層卻能裝進整捆鈔票與一把拆解後的手槍。外表體面，本身就是最方便的偽裝。",12),
    choice("diner","收購海灣早餐店","現金 18／取得產業；每日被動收入 +3，提升街坊聲望。",[{type:"resource.add",value:-18},{type:"asset.grant",category:"industries",assetId:"industry_bay_diner",name:"海灣早餐店",dailyIncome:3},{type:"ability.add",key:"management",value:2},{type:"world.add",key:"people",value:4},{type:"stat.add",key:"stress",value:2}],undefined,"你留下原本的廚師與菜單，只換掉會偷錢的店長。早餐店每天替你賺得不多，卻讓碼頭工人願意替你留意陌生人。",18),
    choice("garage","收購東岸改裝車庫","現金 28／取得產業；每日被動收入 +5，免除灰影轎跑保養費。",[{type:"resource.add",value:-28},{type:"asset.grant",category:"industries",assetId:"industry_east_garage",name:"東岸改裝車庫",dailyIncome:5},{type:"ability.add",key:"engineering",value:3},{type:"relation.add",key:"mira",value:3},{type:"world.add",key:"security",value:2}],undefined,"若琳同意接管車庫。白天修普通轎車，夜裡替不想留下姓名的客人換車牌；收入穩定，風險也跟著進門。",28),
    choice("nightclub","入股藍潮夜店","現金 36／取得產業；每日被動收入 +7，提高口才但增加幫派影響。",[{type:"resource.add",value:-36},{type:"asset.grant",category:"industries",assetId:"industry_blue_nightclub",name:"藍潮夜店",dailyIncome:7},{type:"ability.add",key:"social",value:3},{type:"world.add",key:"gangs",value:5},{type:"stat.add",key:"stress",value:5}],undefined,"你的名字沒有出現在公司文件裡，但所有人都知道二樓包廂歸誰。夜店帶來現金與流言，港口幫也來詢問自己的那份。",36),
    choice("apartments","買下老城出租公寓","現金 50／取得產業；每日被動收入 +9，提高聲望但增加警方注意。",[{type:"resource.add",value:-50},{type:"asset.grant",category:"industries",assetId:"industry_old_apartments",name:"老城出租公寓",dailyIncome:9},{type:"ability.add",key:"management",value:4},{type:"world.add",key:"people",value:5},{type:"world.add",key:"security",value:4}],undefined,"你取消了前屋主準備執行的惡意漲租，住戶願意替你守口如瓶。但大筆房產交易也讓警方注意到你的名字。",50),
    choice("leave","暫不購買","保留現金，記住市場價格與賣家的底線。",[{type:"ability.add",key:"management",value:1},{type:"stat.add",key:"stress",value:-2}],undefined,"你沒有被老六的推銷牽著走。離開前，你記下每件商品的來源與價格；有時保留現金，比擁有新玩具更接近下一次機會。")
  ],{repeatable:true}),
  event("industry_market",1,"接一份臨時工作","利用半天時間合法或低調地賺取現金，代價是疲勞或精神壓力。","工作",[
    choice("diner","到餐館代班","幫忙搬貨與清理廚房，賺取少量現金。",[{type:"resource.add",value:7},{type:"ability.add",key:"physique",value:1},{type:"ability.add",key:"management",value:1},{type:"stat.add",key:"fatigue",value:8}],undefined,"你在油煙與熱水之間忙了幾個小時。收入不多，卻乾淨得不需要向任何人解釋。"),
    choice("garage","替車行送車","把客戶的車安全送到另一區，賺錢並練習駕駛。",[{type:"resource.add",value:9},{type:"ability.add",key:"engineering",value:2},{type:"stat.add",key:"fatigue",value:6},{type:"stat.add",key:"stress",value:2}],undefined,"你準時把車送到，連保險桿都沒有多一道刮痕。老闆記住你的名字，下一次可能會有報酬更高的工作。"),
    choice("nightclub","替夜店看門","處理醉客與插隊者，賺錢並鍛鍊口才。",[{type:"resource.add",value:10},{type:"ability.add",key:"social",value:2},{type:"stat.add",key:"fatigue",value:5},{type:"stat.add",key:"stress",value:5}],undefined,"你整晚只動手一次，其餘麻煩都用幾句話解決。經理多付了一點，因為沒有警車停在門口。")
  ],{repeatable:true}),
  event("small_job",2,"替黑幫跑腿","港口幫要人送一輛『絕對不要打開後車廂』的轎車。","差事",[
    choice("repair","親自送車","賺錢並磨練駕駛，堅持不看後車廂。",[{type:"resource.add",value:8},{type:"ability.add",key:"engineering",value:1},{type:"stat.add",key:"fatigue",value:6}]),
    choice("accounts","轉賣情報","從交車單找出幫派帳目的漏洞。",[{type:"resource.add",value:10},{type:"ability.add",key:"management",value:1},{type:"stat.add",key:"stress",value:4}])
  ],{repeatable:true}),
  event("corporate_offer",2,"開發商的和解金","地產大亨高萬城派律師來。他願意買下帳本，也願意讓阿哲『再死一次』。","勢力",[
    choice("accept","收下訂金","錢足以退休，但等於替真正的兇手工作。",[{type:"resource.add",value:25},{type:"flag.set",key:"corp_deal",value:true},{type:"world.add",key:"corporate",value:7},{type:"world.add",key:"people",value:-5}]),
    choice("refuse","把律師趕走","向街坊表明立場，也暴露自己的藏身處。",[{type:"world.add",key:"people",value:8},{type:"relation.add",key:"kael",value:4},{type:"world.add",key:"security",value:5}])
  ],{requirements:{dayMin:3}}),
  event("ghost_ai",0,"爆炸案錄影帶","地方記者拿到三年前未剪輯的新聞畫面：阿哲在爆炸前下了運鈔車。","媒體",[
    choice("erase","買斷母帶","暫時封住消息，取得記者的檔案庫。",[{type:"ability.add",key:"hacking",value:2},{type:"flag.set",key:"ai_access",value:true},{type:"world.add",key:"ai",value:3}],{ability:"hacking",difficulty:38}),
    choice("preserve","交給記者","讓新聞播出，用輿論逼藏在暗處的人犯錯。",[{type:"ability.add",key:"will",value:2},{type:"world.add",key:"ai",value:6},{type:"relation.add",key:"mira",value:2}])
  ],{requirements:{dayMin:3}}),
  event("safehouse",2,"河邊廢棄酒吧","阿哲曾用假名買下這間酒吧。地下室通往舊排水道。","基地",[
    choice("build","改成安全屋","投入積蓄，建立策劃搶案的據點。",[{type:"resource.add",value:-18},{type:"flag.set",key:"safehouse",value:true},{type:"ability.add",key:"management",value:2}],{ability:"management",difficulty:30}),
    choice("sell","賣給港口幫","拿走眼前利益，也讓幫派控制新的走私通道。",[{type:"resource.add",value:16},{type:"world.add",key:"gangs",value:4}])
  ],{requirements:{dayMin:3}}),
  event("checkpoint",0,"封城追捕","貪腐警長宣布全城臨檢。阿哲約你在跨海大橋另一端見面，只給十五分鐘。","主線",[
    choice("hack_gate","偽造警車編號","讓調度中心命令路障放行。",[{type:"flag.set",key:"gate_open",value:true},{type:"ability.add",key:"hacking",value:2},{type:"world.add",key:"security",value:4}],{ability:"hacking",difficulty:43}),
    choice("lead_crowd","煽動街頭抗議","利用拆遷居民堵住警察，趁亂穿過封鎖。",[{type:"flag.set",key:"gate_open",value:true},{type:"ability.add",key:"social",value:2},{type:"world.add",key:"people",value:5},{type:"stat.add",key:"health",value:-5}],{ability:"social",difficulty:43})
  ],{main:true,requirements:{dayMin:4,dayMax:4}}),
  event("ambush",0,"高架橋伏擊","你見到阿哲的同時，警長的黑色休旅車封住兩端。阿哲承認當年是他出賣了你。","戰鬥",[
    choice("fight","殺出包圍","和背叛你的舊搭檔並肩撐過這一分鐘。",[{type:"battle.start",enemy:"警長的便衣槍手"}])
  ],{main:true,requirements:{dayMin:5,dayMax:5}}),
  event("vault",0,"市府金庫","真相終於完整：高萬城、警長與阿哲合謀吞掉賑災基金，再把爆炸案嫁禍給你。金庫裡有錢，也有全部證據。","終局",[
    choice("free","公開部分證據","保留核心帳本，把足以動搖市府的錄音交給全國媒體。",[{type:"flag.set",key:"chapter1_public",value:true},{type:"world.add",key:"ai",value:12},{type:"world.add",key:"corporate",value:-8}]),
    choice("restore","先帶錢救人","拿走能救出若琳的現金，暫時保留真正證據。",[{type:"flag.set",key:"chapter1_family",value:true},{type:"relation.add",key:"mira",value:15},{type:"world.add",key:"people",value:7}]),
    choice("destroy","炸掉警長的金庫","摧毀贓款與追兵，但阿哲帶著核心帳本逃出火場。",[{type:"flag.set",key:"chapter1_fire",value:true},{type:"world.add",key:"security",value:-10},{type:"ability.add",key:"will",value:3}])
  ],{main:true,requirements:{dayMin:6,dayMax:6}}),
  event("rumor",0,"晨間政論秀","名嘴一面痛罵犯罪，一面替高萬城的新賭場宣傳；電話背景卻傳出阿哲的聲音。","媒體",[
    choice("call","打進直播","用一句話讓全城開始懷疑官方版本。",[{type:"ability.add",key:"social",value:2},{type:"world.add",key:"people",value:4}]),
    choice("monitor","追查節目金流","找出名嘴、警長和開發商之間的付款。",[{type:"ability.add",key:"perception",value:2},{type:"world.add",key:"security",value:-2}])
  ],{repeatable:true}),
  event("clinic_supplies",2,"若琳被盯上","警長扣住若琳的弟弟，逼她交出阿哲的車與你的藏身處。","人物",[
    choice("buyback","付錢找律師","暫時保人出來，但這筆錢會留下痕跡。",[{type:"resource.add",value:-14},{type:"relation.add",key:"mira",value:8},{type:"world.add",key:"people",value:4}]),
    choice("forge","偽造釋放令","侵入法院系統，在警長發現前把人領走。",[{type:"relation.add",key:"mira",value:10},{type:"ability.add",key:"hacking",value:1},{type:"world.add",key:"security",value:4}],{ability:"hacking",difficulty:42})
  ],{requirements:{dayMin:2}}),
  event("gang_toll",1,"練習城市駕駛","選擇一般道路或港區障礙場練習操控與追車技巧。","訓練",[
    choice("pay","練習精準操控","支付場地費，在封閉區域練習倒車、甩尾與窄巷轉向。",[{type:"resource.add",value:-4},{type:"ability.add",key:"engineering",value:3},{type:"stat.add",key:"fatigue",value:6},{type:"stat.add",key:"stress",value:-3}],undefined,"幾十次失敗後，你終於能讓車尾貼著護欄滑過而不留下刮痕。輪胎快磨平了，手感卻留了下來。"),
    choice("challenge","進行街頭追逐演練","和小凱在真實車流中比賽，風險更高。",[{type:"ability.add",key:"engineering",value:2},{type:"ability.add",key:"reflex",value:2},{type:"relation.add",key:"kael",value:3},{type:"stat.add",key:"health",value:-3},{type:"world.add",key:"security",value:2}],{ability:"engineering",difficulty:38},"你在最後一個交流道超過小凱，但後照鏡裡也多了一輛巡邏車。技術進步了，警方對這輛車的印象也更深。")
  ],{repeatable:true}),
  event("shooting_range",1,"前往射擊場練槍","花現金購買彈藥，在合法靶場或郊外空地提升槍法。","訓練",[
    choice("range","在合法靶場練習","穩定提升槍法與觀察，不增加警方戒備。",[{type:"resource.add",value:-5},{type:"ability.add",key:"reflex",value:3},{type:"ability.add",key:"perception",value:1},{type:"stat.add",key:"stress",value:-3}],undefined,"你從固定靶開始，最後把彈著收進胸口大小的範圍。櫃台人員核對過證件，這次沒有任何人需要說謊。"),
    choice("field","到郊外進行實戰射擊","用移動標靶練習快速射擊，效果更好但容易引來注意。",[{type:"resource.add",value:-7},{type:"ability.add",key:"reflex",value:4},{type:"ability.add",key:"will",value:1},{type:"stat.add",key:"fatigue",value:5},{type:"world.add",key:"security",value:2}],undefined,"廢棄鐵罐在奔跑中一個接一個倒下。遠處傳來警笛時，你已經收好彈殼離開現場。")
  ],{repeatable:true}),
  event("nightlife",1,"找個地方放鬆","前往咖啡館、酒吧或娛樂場所，花現金降低壓力並接觸城市人物。","娛樂",[
    choice("coffee","到咖啡館坐坐","安靜休息並觀察往來客人。",[{type:"resource.add",value:-3},{type:"ability.add",key:"perception",value:2},{type:"stat.add",key:"stress",value:-8},{type:"stat.add",key:"fatigue",value:-4}],undefined,"你坐在窗邊喝完兩杯咖啡。沒有槍聲、沒有追車，只有城市裡普通人的談話讓神經逐漸鬆開。"),
    choice("bar","到酒吧喝一杯","大幅降低壓力並提升口才，但會增加疲勞。",[{type:"resource.add",value:-6},{type:"ability.add",key:"social",value:2},{type:"stat.add",key:"stress",value:-12},{type:"stat.add",key:"fatigue",value:5},{type:"world.add",key:"people",value:1}],undefined,"你請吧台旁的人喝了一輪，也聽到幾則不能登上新聞的傳聞。離開時心情輕鬆不少，腳步卻沒有來時穩。")
  ],{repeatable:true}),
  event("network_storm",2,"全城直播追車","一名實況主拍到你的車，數萬觀眾正在替警方即時回報位置。","危機",[
    choice("shield","劫持直播","把追車畫面切成高萬城收賄的錄影。",[{type:"ability.add",key:"hacking",value:2},{type:"world.add",key:"people",value:5},{type:"stat.add",key:"stress",value:7}],{ability:"hacking",difficulty:40}),
    choice("harvest","利用熱度","把假消息賣給競爭電視台，趁亂收錢。",[{type:"resource.add",value:14},{type:"world.add",key:"ai",value:4},{type:"world.add",key:"people",value:-3}])
  ],{requirements:{dayMin:2}})
];
