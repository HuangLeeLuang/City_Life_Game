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
| 支線任務卡 | 3:2 | 4:5 | lazy |

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
- `difei-spar-desktop.webp`／`difei-spar-mobile-v2.webp`：狄菲事件一「停在最後一拳」；手機版保留完整臉部、上半身與格鬥架式。
- `difei-media-desktop.webp`／`difei-media-mobile.webp`：狄菲事件二「雨中的舊畫面」。
- `difei-interview-desktop.webp`／`difei-interview-mobile.webp`：狄菲事件三「空拳台上的回答」。
- `sidequest-character-desktop.webp`／`sidequest-character-mobile.webp`：人物支線共用情境「雨夜修車廠的舊債」。
- `sidequest-crime-desktop.webp`／`sidequest-crime-mobile.webp`：犯罪支線共用情境「港區便利商店外的運鈔車監視」。
- `sidequest-city-desktop.webp`／`sidequest-city-mobile.webp`：城市支線共用情境「封閉抽水站的污染採證」。

## 圖片覆蓋範圍

- 所有會停留在獨立劇情畫面的內容都已有圖片：首頁、五章十五個官方主線，以及狄菲三段永久人物事件；桌機與手機版本皆為不同構圖。
- 六名劇情人物、十名核心隊員與十五塊城市地盤都已有卡片圖片，程嵐完成第一章後才會在人物檔案中出現。
- 九項支線任務依「人物、犯罪、城市」類型共用三組響應式情境圖，選擇卡與任務節點都會顯示。日間見面、夜間邀約、人物事件提示與交流結果會重用角色基準人像；非人物日常與夜生活仍採快速圖示文字結算。
- 後續若新增會進入 `eventView` 或 `characterEventView` 的劇情，必須同時加入 16:9 桌機圖與 4:5 手機圖，並登記到 `EVENT_ART`。

## 角色基準圖

角色基準圖位於 `assets/images/characters/`，統一為 800×1000 WebP，除了顯示於遊戲人物檔案，也用來維持後續事件圖的人物一致性：

- `azhe.webp`：阿哲，深色雨衣、臉側舊疤。
- `mira.webp`：若琳，港區修車廠經營者。
- `kael.webp`：小凱，年輕車手。
- `zero.webp`：老六，港區酒保與情報販子。
- `difei.webp`：狄菲舊版 800×1000 肖像，保留作為角色生成參考。
- `difei-portrait-v2.webp`：狄菲目前共用的 800×1000 半身肖像；完整露出頭頂並保留安全留白，供人物檔案、會面、事件、結果與隊員卡使用。
- `difei-full.webp`：狄菲 800×1200 全身比例基準，使用修長腿部與較高髖線。
- `difei-assistant-cutout.png`：狄菲常駐助理透明全身立繪；日常狀態採較年輕的成人面容、自然平滑膚況與完整頭頂至鞋底構圖，桌機置於側欄、手機改為底部助理面板。
- `chenglan.webp`：程嵐，19 歲成人，低馬尾、深色連帽外套與機能短褲。

## 核心行動團隊

隊員肖像位於 `assets/images/team/`，統一為 800×1000 WebP，顯示在核心行動團隊卡片：

- `steel_jaw.webp`、`grey_fox.webp`、`ghost.webp`、`spark.webp`
- `dove.webp`、`eagle_eye.webp`、`counsel.webp`、`ledger.webp`

狄菲與程嵐的核心隊員卡直接共用 `assets/images/characters/` 的角色基準圖，避免聯絡人與隊員版本外觀不一致。

遊戲修改器可在瀏覽器內替換狄菲常駐助理全身圖，或個別替換十名核心隊員的人像。圖片會先等比例縮放並轉成 WebP 資料，再保存在目前瀏覽器的本機儲存空間；不會修改專案原始圖片，也不會上傳。隊員替換會同步顯示於隊員卡、會面、人物事件、結果與戰鬥出勤名單，並可個別或全部還原。

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

遊戲內介面圖示位於 `src/ui-icons.mjs`，使用可縮放的行內 SVG。生活牌、夜生活分類、六項狀態、支線類型、五種戰鬥行動、早午晚階段與成功／代價結果各有辨識圖示；這些圖示不需要額外網路請求，手機高解析螢幕也能保持清晰。

## 城市勢力地圖

城市勢力畫面使用程式繪製的響應式 SVG 示意底圖與十五個 HTML 地盤節點。節點會依目前控制勢力著色，並以不同狀態標示玩家控制、情報鎖定及敵方反攻；選取後可查看地盤摘要並直接定位到對應卡片。桌機顯示完整地盤名稱，手機改用編號節點與下方詳細資訊，避免文字重疊。

## 生成方式

本批素材以內建 ImageGen 生成，使用同一組港區犯罪黑色電影視覺提示；事件桌機版與手機版分開重新構圖，隊員與地盤圖依卡片用途採固定比例，再以 ImageMagick 轉為遊戲尺寸、移除中繼資料並壓縮。狄菲先生成角色錨點，再以錨點與全身比例圖生成事件圖；常駐助理立繪以既有全身圖鎖定身分與服裝，在純色背景上生成後以本機色鍵工具建立透明邊緣。程嵐使用獨立的較年輕成人臉部幾何，避免與狄菲同臉。新增的三類支線情境同樣分別生成 3:2 桌機圖與 4:5 手機圖，沒有直接互相裁切。

### 2026-08-08 missing-event and fallback batch

Built-in ImageGen produced each composition independently. Event desktop files are 1600x900 (16:9), event mobile files are 1000x1250 (4:5), and fallback files are 1500x1000 (3:2). Final files are stripped, quality-82 WebP images.

- Fallbacks: `fallbacks/default.webp` (anonymous harbor doorway), `event.webp` (rainy street encounter), `sidequest.webp` (dockside envelope handoff), `daily.webp` (meal, wraps, and tools), `market.webp` (item inspection), `battle.webp` (container-yard standoff), `custom.webp` (blank story artifacts).
- Event pairs: `event-morning_patrol-*`, `event-public_terminal-*`, `event-alley_contact-*`, `event-asset_market-*`, `event-clinic_supplies-*`, `event-community_kitchen-*`, `event-corporate_offer-*`, `event-drone_scrap-*`, `event-gang_toll-*`, `event-ghost_ai-*`, `event-gym-*`, `event-industry_market-*`, `event-inventory-*`, `event-network_storm-*`, `event-night_market-*`, `event-nightlife-*`, `event-power_cut-*`, `event-quiet_room-*`, `event-rooftop_radio-*`, `event-rumor-*`, `event-safehouse-*`, `event-shooting_range-*`, `event-small_job-*`, and `event-street_doc-*`.
- Subjects respectively: dawn van watch; terminal surveillance; data-card exchange; goods and keys; medicine inventory; meal service; sealed offer; drone salvage; overpass confrontation; failing server room; heavy-bag training; business keys; safehouse inventory; network repair; dossier exchange; waterfront meeting; lantern blackout repair; harbor rest; antenna listening; tea-shop whispers; lock reinforcement; range practice; scooter repair; wrist care.
- Prompt family: realistic modern East Asian harbor crime-noir concept art; rainy grounded setting; deep blue-green and concrete gray; limited amber and mint practical lighting; one clear focal action; no visible text, brand, logo, watermark, excessive neon, or futuristic technology. Mobile prompts explicitly requested a fresh vertical composition rather than a crop.
