export const TEAM_LIMIT = 5;

export const TEAM_MEMBERS = [
  {id:"difei",name:"狄菲",role:"助理／護衛",unlockDay:1,cost:0,ability:"physique",recruitable:false,art:"assets/images/characters/difei.webp",summary:"二十歲的前國家級格鬥選手。她以助理身分整理情報，也會在最危險的距離保護老闆。",bonuses:{brawl:4,hp:6}},
  {id:"chenglan",name:"程嵐",role:"警務情報員",unlockDay:1,cost:0,ability:"hacking",recruitable:false,storyUnlock:"chapter1",art:"assets/images/characters/chenglan.webp",summary:"十九歲的天才警員，十六歲便協助偵破重大網路犯罪；冷靜、寡言，熟悉體制內的情報與退路。",bonuses:{hack:3,flee:3}},
  {id:"steel_jaw",name:"鋼牙",role:"近戰手",unlockDay:1,cost:16,ability:"physique",summary:"前地下拳手，能在混戰中撕開缺口並替隊伍承受火力。",bonuses:{brawl:4,hp:4}},
  {id:"grey_fox",name:"灰狐",role:"槍手",unlockDay:1,cost:18,ability:"reflex",summary:"冷靜的前靶場教練，擅長交叉火力與武器調度。",bonuses:{attack:4,weapon:2}},
  {id:"ghost",name:"幽靈",role:"駭客",unlockDay:3,cost:22,ability:"hacking",summary:"能切斷監視器、警報與敵方通訊，改寫戰場節奏。",bonuses:{hack:5,flee:1}},
  {id:"spark",name:"火花",role:"車手",unlockDay:5,cost:24,ability:"engineering",summary:"熟悉海港市每條匝道與地下車道，專門帶全隊活著離開。",bonuses:{flee:6,armor:3}},
  {id:"dove",name:"白鴿",role:"軍醫",unlockDay:7,cost:28,ability:"will",summary:"地下診所的前急救員，提升戰場耐久並壓低戰敗醫療費。",bonuses:{hp:8,medical:5}},
  {id:"eagle_eye",name:"鷹眼",role:"偵察手",unlockDay:9,cost:30,ability:"perception",summary:"先找出制高點、埋伏與值錢目標，再讓隊伍進場。",bonuses:{attack:3,reward:3}},
  {id:"counsel",name:"律師",role:"談判手",unlockDay:12,cost:34,ability:"social",summary:"替戰果找到買家，也能在封鎖形成前談出一條退路。",bonuses:{reward:6,flee:3}},
  {id:"ledger",name:"帳房",role:"營運手",unlockDay:15,cost:38,ability:"management",summary:"管理產業帳目與分紅，讓每一條現金流都多留下一點。",bonuses:{reward:3,income:3}}
];

export const teamMemberById = id => TEAM_MEMBERS.find(member => member.id === id);
