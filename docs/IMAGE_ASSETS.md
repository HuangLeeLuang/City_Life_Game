# 遊戲圖片規格

## 視覺方向

- 現代東亞海港犯罪黑色電影風格，寫實但略帶遊戲概念美術質感。
- 主色為近黑綠、深藍綠與水泥灰；只使用少量琥珀燈光和薄荷綠提示光。
- 不使用品牌、文字、浮水印、過量霓虹或未來科技元素。

## 響應式規則

每個重要場景都應製作兩張重新構圖的圖片，不直接把桌機圖裁成手機圖：

| 用途 | 桌機 | 手機 | 載入方式 |
| --- | --- | --- | --- |
| 首頁主視覺 | 16:9、文案安全區在左側 | 2:3、文案安全區在下半部 | eager、high priority |
| 劇情事件 | 16:9 | 4:5 | lazy |

- 切換點為 `760px`，由 HTML `<picture>` 的 `<source media>` 選擇正確版本。
- 檔名使用 `{場景}-desktop.webp` 與 `{場景}-mobile.webp`。
- 圖片使用 WebP、移除中繼資料，單張建議低於 150 KB。
- 首頁可用媒體條件 preload；其他事件圖不要預載，避免玩家下載尚未遇到的內容。

## 目前資產

- `hero-harbor-desktop.webp`／`hero-harbor-mobile.webp`：首頁海港與公共電話。
- `event-signal-desktop.webp`／`event-signal-mobile.webp`：第一章主線「死人的電話」。
- `event-runner-desktop.webp`／`event-runner-mobile.webp`：第一章主線「中槍的菜鳥」。
- `event-ch1-burner-desktop.webp`／`event-ch1-burner-mobile.webp`：第一章主線「被刪除的第三名共犯」。
- `event-checkpoint-desktop.webp`／`event-checkpoint-mobile.webp`：第二章主線「封城追捕」。
- `event-ambush-desktop.webp`／`event-ambush-mobile.webp`：第二章主線「高架橋伏擊」。
- `event-vault-desktop.webp`／`event-vault-mobile.webp`：第二章終點「市府金庫」。
- `event-ch3-escape-desktop.webp`／`event-ch3-escape-mobile.webp`：第三章主線「逃亡名單」。
- `event-ch3-container-desktop.webp`／`event-ch3-container-mobile.webp`：第三章主線「漂流貨櫃裡的伺服器」。
- `event-ch3-broadcast-desktop.webp`／`event-ch3-broadcast-mobile.webp`：第三章主線「全城斷訊九十秒」。
- `event-ch4-election-desktop.webp`／`event-ch4-election-mobile.webp`：第四章主線「一座待價而沽的城市」。
- `event-ch4-betrayal-desktop.webp`／`event-ch4-betrayal-mobile.webp`：第四章主線「若琳留下的車鑰匙」。
- `event-ch4-truth-desktop.webp`／`event-ch4-truth-mobile.webp`：第四章主線「阿哲真正偷走的東西」。
- `event-ch5-siege-desktop.webp`／`event-ch5-siege-mobile.webp`：第五章主線「海港封鎖線」。
- `event-ch5-tower-desktop.webp`／`event-ch5-tower-mobile.webp`：第五章主線「沒有名字的第六十層」。
- `event-ch5-finale-desktop.webp`／`event-ch5-finale-mobile.webp`：第五章終局「五路亡命」。
- `difei-spar-desktop.webp`／`difei-spar-mobile.webp`：狄菲事件一「停在最後一拳」。
- `difei-media-desktop.webp`／`difei-media-mobile.webp`：狄菲事件二「雨中的舊畫面」。
- `difei-interview-desktop.webp`／`difei-interview-mobile.webp`：狄菲事件三「空拳台上的回答」。

## 圖片覆蓋範圍

- 所有會停留在獨立劇情畫面的內容都已有圖片：首頁、五章十五個官方主線，以及狄菲三段永久人物事件；桌機與手機版本皆為不同構圖。
- 六名劇情人物、十名核心隊員與十五塊城市地盤都已有卡片圖片，程嵐完成第一章後才會在人物檔案中出現。
- 日常、夜生活、角色會面結果與支線節點採快速文字結算，不會進入 `eventView`，因此目前刻意不載入情境插圖；這些不是遺失檔案，也不影響離線遊玩。
- 後續若新增會進入 `eventView` 或 `characterEventView` 的劇情，必須同時加入 16:9 桌機圖與 4:5 手機圖，並登記到 `EVENT_ART`。

## 角色基準圖

角色基準圖位於 `assets/images/characters/`，統一為 800×1000 WebP，除了顯示於遊戲人物檔案，也用來維持後續事件圖的人物一致性：

- `azhe.webp`：阿哲，深色雨衣、臉側舊疤。
- `mira.webp`：若琳，港區修車廠經營者。
- `kael.webp`：小凱，年輕車手。
- `zero.webp`：老六，港區酒保與情報販子。
- `difei.webp`：狄菲，20 歲成人，及腰黑色長直髮、白色格鬥訓練上衣、黑色短褲；800×1000 肖像。
- `difei-full.webp`：狄菲 800×1200 全身比例基準，使用修長腿部與較高髖線。
- `chenglan.webp`：程嵐，19 歲成人，低馬尾、深色連帽外套與機能短褲。

## 核心行動團隊

隊員肖像位於 `assets/images/team/`，統一為 800×1000 WebP，顯示在核心行動團隊卡片：

- `steel_jaw.webp`、`grey_fox.webp`、`ghost.webp`、`spark.webp`
- `dove.webp`、`eagle_eye.webp`、`counsel.webp`、`ledger.webp`

狄菲與程嵐的核心隊員卡直接共用 `assets/images/characters/` 的角色基準圖，避免聯絡人與隊員版本外觀不一致。

## 城市地盤縮圖

地盤圖位於 `assets/images/territories/`，統一為 720×480 WebP。地盤卡在桌機採三欄、手機採單欄，圖片維持 3:2 比例並使用置中裁切：

- 紅潮：`south_docks.webp`、`fish_market.webp`
- 鐵騎：`east_chop_shop.webp`、`overpass_toll.webp`
- 白鯊：`neon_strip.webp`
- 北橋：`north_tenements.webp`、`river_casino.webp`
- 玻璃蛇：`chip_logistics.webp`
- 城市清道夫：`finance_tower.webp`
- 灰狼：`west_rail_yard.webp`、`construction_depot.webp`
- 死寂電波：`pirate_station.webp`、`relay_tower.webp`
- 金環：`marina_club.webp`、`cruise_terminal.webp`

## 應用程式圖示

圖示位於 `assets/icons/`。`icon-master.png` 是 1024×1024 主檔；`icon-512.png`、`icon-192.png`、`icon-maskable-512.png` 供 PWA 使用，另有 `apple-touch-icon.png` 與 `favicon-32.png`。Maskable 版本已縮小主要圖形並保留安全邊界。

## 生成方式

本批素材以內建 ImageGen 生成，使用同一組港區犯罪黑色電影視覺提示；事件桌機版與手機版分開重新構圖，隊員與地盤圖依卡片用途採固定比例，再以 ImageMagick 轉為遊戲尺寸、移除中繼資料並壓縮。狄菲先生成角色錨點，再以錨點與全身比例圖生成六張事件圖；程嵐使用獨立的較年輕成人臉部幾何，避免與狄菲同臉。
