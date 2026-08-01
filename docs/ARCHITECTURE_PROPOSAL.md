# Game_5 基礎架構提案

> 文件定位：Game_5 的設計與工程「憲法」。後續功能、內容、資料格式與技術決策，除非經架構決策紀錄（ADR）修訂，均以本文件為準。

| 項目 | 內容 |
|---|---|
| 專案代號 | Game_5 |
| 暫定名稱 | Cyber World：五選命運 |
| 文件版本 | 0.1.0（Foundation） |
| 目標平台 | 手機優先的離線網頁遊戲（PWA），兼容桌面瀏覽器 |
| 核心類型 | 固定主線 × 每階段五選一 × 養成／經營 × 短時即時戰鬥 × 世界模擬 |
| 內容策略 | 開發期人工／AI 輔助製作；執行期不依賴生成式 AI 或網路 |

## 1. 執行摘要

Game_5 是一款賽博龐克事件驅動 RPG。故事的關鍵章節由設計者預先撰寫，玩家不改寫主線要面對的核心命題，而是透過每個 Stage 的五張候選卡，決定如何準備、與誰建立關係、擁有什麼能力與產業，以及用何種代價跨過故事關卡。戰鬥切換為適合手機的短時即時玩法，並直接使用前述累積成果。

一句話核心循環：**故事決定玩家要面對什麼；五張卡決定玩家如何成長與準備；戰鬥驗證玩家的選擇；世界在玩家未介入時仍持續運作。**

首版必須同時滿足四個不可退讓目標：

1. 首次載入後可完全離線遊玩，不需要 API、帳號或持續連線。
2. 內容由 JSON 驅動；新增一般事件、NPC、物品或商店原則上不修改引擎程式。
3. 所有世界改變只能經 Rule Engine 執行，且每個 Effect 都可追溯。
4. 主線穩定可製作，過程與人物命運具有高重玩差異。

## 2. 已定案的遊戲設計

### 2.1 世界與敘事

- 時代：2148 年；五大企業控制社會，政府弱化，義體與人格 AI 普及，神經晶片連結城市網路。
- 舞台：第九都市。玩家因一則無寄件者訊息被捲入城市核心秘密。
- 敘事原則：固定主線、不同解法。重要節點必然推進，但參與者、代價、資源、戰鬥、NPC 命運與結局條件會依狀態改變。
- 不在玩家裝置上即時生成故事。所有正式內容經編輯、驗證與版本管理後隨遊戲發布。
- 主線共八章：夜城甦醒、立足、勢力交錯、建立勢力、陰謀浮現、全面衝突、真相揭露、最終抉擇。
- 主線約 60～100 個可玩日，每日約 3～5 分鐘；跳過平淡日子。首輪約 15～30 小時，通關後開放自由模式。

### 2.2 每日與 Stage 流程

一天由排程器依章節配置多個 Stage。五大類型為 Story、Life、Management、Random、Battle；Story、Life、Management 構成每日骨架，Life／Management／Random 可依劇情重複，但同類每日最多三次；Battle 與 Random 可依情境不出現。時間（上午、下午、夜晚）主要用於敘事與條件，不要求玩家管理 24 小時資源。

非戰鬥 Stage 的標準流程：

1. 依 Stage 與子事件池收集候選事件。
2. Rule Engine 評估 requirements／blockers。
3. Event Director 依保留席、權重、冷卻與多樣性選出五張卡。
4. 玩家查看標題、插圖與一句描述；高感知／駭客／情報可揭露額外風險或收益。
5. 玩家五選一；未選事件依 persistence 規則消失、延續、回池或讓主線以替代方式推進。
6. 選中事件展開其選項／檢定／結果，產生 Effects。
7. Rule Engine 原子化套用 Effects，寫入 Event Log。
8. Stage 結算並重算下一 Stage 事件池。

五張卡是五個候選事件，不是單一事件的五個處理方式；選中事件之後仍可含數個選項。每張有意義的選擇原則上應影響至少兩個系統，並盡量包含非數值後果。

### 2.3 事件與結果

- 事件組織採混合層級：獨立事件、角色／勢力／職涯事件鏈、八章主線事件鏈；事件鏈可互相影響，形成事件網路。
- 普通事件約 2～3 種結果；重要支線 4～6 種；主線節點可有 6 種以上狀態化結果。
- 卡片應兼顧劇情、取捨、合理獎勵與未知性，不以「找最高數值」為唯一判準。
- 能力不是普遍硬鎖：一般事件以能力修正結果，高風險事件可低機率嘗試，隱藏內容與少數 Boss 條件可設門檻。
- persistence 類型：`once`（錯過即消失）、`carryover`（短期延續）、`repeatable`（冷卻後回池）、`mainline_fallback`（未選也以替代事件推進）。
- 禁止「神事件」：單一事件保持小而可測；長劇情以事件鏈、節點與共享模板組合。

### 2.4 玩家、能力與生存

玩家開局只選性別，不設固定職業；流派由選擇自然形成。八大核心能力為：體能、反應、駭客、工程、社交、感知、意志、資源管理。能力同時作用於事件、戰鬥、生活、經營與關係。

生存採簡化模式：健康、疲勞、精神為核心狀態，不設繁瑣飢餓微管理；生命、持續傷勢與戰鬥資源屬 Battle／Player State。義體採容量制，裝備強度與容量形成取捨。玩家戰敗不是預設 Game Over，可轉為受傷、住院、資源損失、裝備耐久下降、NPC 傷亡或替代劇情。

### 2.5 關係、NPC 與戀愛

- 關係可包含信任、尊敬、恐懼、友情、愛情、利益與仇恨；各維度由資料定義上下限。
- NPC 採三層命運：核心 10～15 人、重要 50～80 人、一般 NPC；另有 20～40 名隱藏 NPC 與大量程序化路人。
- 重要 NPC 保存記憶標記，能成為盟友、敵人、戀人、勢力領袖、離城、背叛、犧牲或死亡。
- 極少數程序化路人可經事件「升格」為具持久 ID 的重要 NPC。
- 支援戀愛；具體婚姻／家庭內容由後續內容規格決定，不得讓戀愛只是一條單一好感值。

### 2.6 隊友、基地與產業

- 可招募多名固定隊友；出戰編成以 2～4 人為基準，其餘可經營、研究、蒐集情報、維修與訓練。
- 隊友可能受傷、離隊或永久死亡，結果必須回寫事件池與世界狀態。
- 主基地由小公寓／安全屋升級為地下據點、駭客中心、企業辦公室與大型總部，解鎖倉庫、宿舍、研究室、指揮中心、AI 控制室等。
- 可在八區建立分基地（如黑市診所、武器工坊、情報站、無人機機庫、企業分公司）。基地不只給數值加成，也必須改變事件池。
- 玩家同時重點經營的產業最多三類；中後期透過經理人、AI 助理、保鑣、駭客夥伴與無人載具逐步自動化，保留重要決策、減少重複操作。

### 2.7 戰鬥

戰鬥是卡片決策之外的短時即時系統。手機操作以移動、普攻、技能與閃避為核心，普通戰約 20～40 秒，Boss 目標約 1 分鐘。戰鬥使用玩家能力、義體、武器、隊友、關係支援、基地研究與世界狀態；結果產生標準 Effects 回到 Rule Engine，不得由 Battle Engine 直接改寫存檔。

### 2.8 城市與世界狀態

八大區域：市中心、企業區、貧民區、工業區、港口區、娛樂區、地下網域、城市外圍。每區有專屬 NPC、事件池、商店、敵人、基地位置及 2～4 個區域變數。

全域世界變數約八項：企業影響力、幫派勢力、治安、經濟、民心、AI 發展、網路安全、城市穩定度。世界採雙層更新：Stage 結束立即更新能力、關係、記憶、局部狀態與下一池；Day 結束才結算產業、基地、NPC 自主行動、勢力消長、全域／區域狀態、倒數、傷勢與疲勞。

## 3. 架構原則與邊界

### 3.1 四層架構

```text
Presentation / UI
        ↓ commands, view models
Application / Game Engine
        ↓ rule requests, domain events
Rule Engine + Domain Engines
        ↓ validated data access
Game Data + Save State (JSON / IndexedDB)
```

依賴只可向下；資料層不可回呼 UI。Presentation 不包含遊戲規則；Game Engine 負責協調、不直接改世界；Rule Engine 是狀態變更的唯一入口；內容資料不可含任意 JavaScript。

### 3.2 強制不變量

- 所有跨資料引用使用穩定 ID，不把物件參照寫入存檔。
- 所有數值由欄位定義上下限與溢位策略，集中於 Rule Engine clamp。
- 所有狀態變更都從 Effect 產生 Event Log；禁止靜默修改。
- 同一輸入狀態、內容版本與 RNG seed 必須產生可重現結果。
- 一次選擇的 Effects 以 transaction 套用：全部成功或全部回滾。
- Schema 驗證、參照完整性與內容 lint 必須在建置時阻止壞資料進入正式包。
- 引擎不認識特定劇情名稱；內容不執行任意程式碼。

## 4. Engine 職責

### 4.1 Game Engine（應用協調器）

管理新遊戲、讀檔、Day／Stage 狀態機、輸入鎖、畫面切換、暫停／恢復、自動存檔與錯誤恢復。它呼叫其他 Engine 並組合結果，但不直接寫 `world.*`、`player.*` 或 `npc.*`。

### 4.2 Rule Engine（唯一寫入閘門）

提供 `evaluateConditions(context, conditions)`、`previewEffects(state, effects)`、`applyEffects(transaction)`、`validateEffect(effect)`。條件採無副作用運算；效果採註冊表處理器，例如 `stat.add`、`flag.set`、`relationship.add`、`inventory.grant`、`event.schedule`、`world.add`、`battle.start`。Rule Engine 負責加成／減益／難度修正、clamp、前後快照、拒絕原因與 Event Log。

### 4.3 Event Engine / Event Director

依 Stage、章節、區域、條件、阻擋、權重、冷卻、近期重複、事件鏈進度與保留席產生五張候選卡。主線保留席可確保節奏，但沒有合格事件時不得塞入不合法卡；應回退至資料定義的 fallback。選取使用具 seed 的加權不放回抽樣。

### 4.4 Stage / Time Engine

根據章節日程建立每日 Stage queue，執行同類型每日上限，記錄時間標籤，觸發 Stage-end 與 Day-end pipeline。Battle／Random 的可選性由排程規則與事件效果共同決定。

### 4.5 World Engine

維護八項全域與各區域變數、勢力與持續事件。只在指定 tick 計算建議 Effects，再交 Rule Engine。提供不可變的世界查詢快照供其他 Engine 使用。

### 4.6 NPC Engine

維護 NPC 狀態、關係維度、記憶、命運、隊友職務與日結自主行動。程序化路人使用 seed 生成；升格後配置持久 ID 並納入存檔。NPC Engine 不直接修改玩家或世界。

### 4.7 Battle Engine

負責即時模擬、輸入、AI、碰撞、技能冷卻、傷害計算與戰鬥快照。開始時接收唯讀 loadout；結束時回傳 `BattleOutcome` 與 Effects。首版建議採 Canvas 2D／PixiJS 類渲染抽象，固定 timestep，避免 DOM 戰鬥物件。

### 4.8 Base / Industry Engine

計算基地升級、職務分派、產業收益、維護、風險與自動化；日結輸出 Effects。內容定義哪些基地或產業會注入事件池 tag／weight modifier。

### 4.9 Save Engine

使用 IndexedDB 保存多槽存檔、設定、內容版本與 Event Log 分段；提供 schema migration、checksum、原子快照、匯出／匯入。禁止保存 UI 暫態與衍生快取。每次 Stage 結束自動存檔，戰鬥前另建安全 checkpoint。

### 4.10 Content Registry / Validation

啟動時載入經建置打包的內容索引；開發時驗證 JSON Schema、ID 唯一、引用存在、事件鏈可達、文字 key 存在、Effect／Condition 類型受支援與數值範圍合理。

## 5. 資料驅動規格

### 5.1 ID 與版本

ID 使用小寫 ASCII snake_case，前綴表明類型，例如 `event_ch01_signal_001`、`npc_core_mira`、`district_slum`、`item_weapon_pistol_02`。ID 發布後不可重用；刪除內容應保留 tombstone／migration。每份資料含 `schemaVersion`，內容包另有 `contentVersion`。

### 5.2 Condition DSL

條件是可組合 JSON AST，首版僅支援白名單運算：`all`、`any`、`not`、`eq`、`neq`、`gt/gte/lt/lte`、`in`、`hasFlag`、`hasItem`、`eventSeen`、`relationship`、`chance`。`chance` 必須使用注入 RNG，不可直接呼叫系統亂數。

```json
{
  "all": [
    { "gte": [{ "path": "player.abilities.hacking" }, 40] },
    { "hasFlag": "story.signal_received" },
    { "not": { "hasFlag": "npc.mira.dead" } }
  ]
}
```

### 5.3 Effect DSL

```json
[
  { "type": "stat.add", "target": "player.abilities.hacking", "value": 2 },
  { "type": "relationship.add", "npcId": "npc_core_mira", "axis": "trust", "value": 5 },
  { "type": "flag.set", "key": "story.mira_helped", "value": true },
  { "type": "event.schedule", "eventId": "event_ch01_mira_002", "afterStages": 2 }
]
```

Effect 不描述實作細節；每個 handler 定義參數 schema、允許 target、clamp、可逆性與 log formatter。未知 Effect 必須 fail closed。

## 6. JSON Schema 計畫

Schema 採 JSON Schema Draft 2020-12，放在 `packages/schemas`，由 `$defs` 共用 ID、LocalizedText、Condition、Effect、AssetRef、Range、WeightedRef。

### 6.1 第一批必需 Schema

| Schema | 核心欄位 |
|---|---|
| event | id、stage、category、chainId、priority、weight、persistence、requirements、blockers、card、choices、outcomes、nextEvents、memoryFlags、tags |
| npc | id、tier、identity、portrait、traits、factionId、relationshipAxes、memories、fates、recruitment、battleProfileId |
| world | globalVariables、districtStates、factions、initialFlags、dayRules |
| district | id、nameKey、tags、localVariables、eventPools、shops、enemyPools、baseSlots |
| chapter | id、order、dayRange、requiredMilestones、stageSchedules、mainlineChains、unlockEffects |
| item | id、type、rarity、stacking、equipSlot、cyberwareCost、modifiers、grantedEffects |
| skill | id、cooldown、cost、targeting、scaling、battleEffects |
| enemy / boss | stats、aiProfile、skills、loot、outcomeRules |
| base / facility | levels、costs、requirements、jobs、eventPoolModifiers |
| industry | maxActive、levels、incomeFormula、risks、automation、eventPoolModifiers |
| shop | inventoryPools、pricingRules、refreshRule、requirements |
| battle | arena、waves、timeLimit、objectives、win／loss Effects |
| save | metadata、rng、timeline、player、world、npcs、bases、industries、queues、logCursor |

### 6.2 Event 範例骨架

```json
{
  "$schema": "../../schemas/event.schema.json",
  "schemaVersion": 1,
  "id": "event_ch01_signal_trace",
  "stage": "story",
  "category": "mainline",
  "chainId": "chain_ch01_signal",
  "priority": 80,
  "weight": 1,
  "persistence": { "type": "mainline_fallback", "fallbackEventId": "event_ch01_signal_raid" },
  "requirements": { "all": [{ "hasFlag": "story.signal_received" }] },
  "blockers": { "any": [{ "hasFlag": "story.signal_resolved" }] },
  "card": { "titleKey": "event.signal_trace.title", "summaryKey": "event.signal_trace.summary", "artId": "art_event_signal" },
  "choices": [
    {
      "id": "trace",
      "textKey": "event.signal_trace.choice.trace",
      "checks": [{ "ability": "hacking", "difficulty": 40, "mode": "risk" }],
      "outcomes": [
        { "id": "success", "when": { "gte": [{ "path": "check.margin" }, 0] }, "effects": [{ "type": "flag.set", "key": "story.signal_traced", "value": true }] },
        { "id": "failure", "when": { "lt": [{ "path": "check.margin" }, 0] }, "effects": [{ "type": "world.add", "target": "districts.corporate.alert", "value": 8 }] }
      ]
    }
  ],
  "tags": ["chapter_1", "signal", "corporate"]
}
```

### 6.3 Save 邊界

存檔保存事實而非可重算結果：已選事件、chain 節點、flags、能力、物品實例、NPC／關係／記憶、世界與區域值、基地／產業、Stage queue、scheduled events、RNG state、版本與 migration history。事件全文、圖片、Schema、靜態物品定義與 UI 狀態不入存檔。

## 7. 建議專案結構

```text
Game_5/
├─ apps/
│  └─ game-web/                 # PWA shell、UI、Canvas、service worker
├─ packages/
│  ├─ core/                     # 共用型別、Result、ID、RNG、clock
│  ├─ game-engine/              # Day／Stage 狀態機與協調
│  ├─ rule-engine/              # Condition／Effect、transaction、log
│  ├─ event-engine/             # 候選池、五卡選取、事件鏈
│  ├─ world-engine/             # 世界／區域／勢力 tick
│  ├─ npc-engine/               # 關係、記憶、命運、自主行動
│  ├─ battle-engine/            # 即時戰鬥（平台無關核心）
│  ├─ economy-engine/           # 基地、產業、商店、價格
│  ├─ save-engine/              # IndexedDB、migration、匯入匯出
│  ├─ content-registry/         # 載入、索引、參照解析
│  └─ schemas/                  # Draft 2020-12 schemas
├─ content/
│  ├─ chapters/ events/ chains/ npcs/ districts/ factions/
│  ├─ items/ skills/ enemies/ battles/ bases/ industries/ shops/
│  ├─ localization/zh-TW/       # 顯示文字與資料 ID 分離
│  └─ manifests/
├─ assets/
│  ├─ art/ portraits/ ui/ audio/ music/ fonts/
│  └─ asset-manifest.json
├─ tools/
│  ├─ content-lint/             # schema + 參照 + 圖可達性檢查
│  ├─ balance-sim/              # seed 批次模擬與分布報表
│  ├─ event-graph/              # 事件鏈可視化與死路檢查
│  └─ save-migrate/
├─ tests/
│  ├─ unit/ integration/ contract/ content/ simulation/ e2e/
│  └─ fixtures/
├─ docs/
│  ├─ ARCHITECTURE_PROPOSAL.md
│  ├─ adr/ api/ content-authoring/ balancing/ qa/
│  └─ glossary.md
├─ scripts/                     # build、validate、pack、release
├─ package.json
├─ pnpm-workspace.yaml
└─ README.md
```

建議技術基線：TypeScript strict mode、ES modules、monorepo；UI 技術可後續選定，但 Domain packages 不依賴 UI framework。PWA 使用 App Shell、版本化 content bundle 與 cache-first 靜態資源；IndexedDB 是首版持久化基線，暫不引入 SQLite WASM，除非內容查詢量經量測證實需要。

## 8. 關鍵流程與 API 契約

### 8.1 選卡 transaction

```text
UI selectCard(cardId)
→ GameEngine 驗證目前 phase 與候選集合
→ EventEngine resolveChoice(eventId, choiceId, snapshot, rng)
→ RuleEngine preview + validate effects
→ RuleEngine commit transaction
→ append EventLog + checkpoint
→ StageEngine closeStage
→ stageTick effects
→ SaveEngine persist
→ next Stage view model
```

所有命令帶 `commandId`，重送必須 idempotent。UI 在 commit 完成前鎖定重複點擊；若儲存失敗，保留記憶體 transaction 並提示重試，不可顯示已成功但實際未存。

### 8.2 Event Log 最低欄位

`logId`、`sequence`、`timestamp`、`day`、`stageInstanceId`、`sourceType/sourceId`、`choiceId`、`effectType`、`target`、`before`、`requestedDelta`、`appliedDelta`、`after`、`modifiers`、`rngProof`、`contentVersion`。面向玩家的歷史紀錄由此投影，除錯工具可查看完整欄位。

### 8.3 錯誤策略

- 內容錯誤：開發建置失敗；正式版隔離該內容並記錄診斷，不讓整個存檔損壞。
- 未知 ID／Effect：拒絕執行，不採猜測或忽略。
- 交易中途錯誤：回滾狀態並保留前一 checkpoint。
- migration 失敗：保留原始存檔、建立備份、阻止覆寫並提供匯出。

## 9. 離線、效能與安全

- 首次成功啟動後，核心引擎、首章內容、必要資產與字型必須可離線；後續章節可在首次安裝包一併快取，以「完全離線」為產品承諾。
- Service Worker 更新採新舊版本雙快取；新版本完整下載與驗證後才切換，避免半更新。
- 內容 bundle 與資產 manifest 使用 hash；存檔記錄 contentVersion，更新前先跑 migration compatibility check。
- 手機記憶體有限：按章節／區域載入內容索引，圖片使用適當壓縮與尺寸，多頁 UI 避免保留不可見大型資產。
- 60 FPS 是戰鬥目標，邏輯固定 timestep；一般 UI 以反應時間 <100ms 為目標。
- JSON 是資料不是程式；禁止 `eval`、動態 Function、任意 path 寫入與未驗證 MOD。未來 MOD 必須在命名空間與權限沙箱內。

## 10. 測試與內容品質門檻

### 10.1 自動測試

- Unit：每種 Condition／Effect、clamp、modifier、RNG、戰鬥公式。
- Contract：各 Engine request／response、BattleOutcome→Effects、Save migration。
- Content：Schema、ID、引用、localized keys、資產、事件鏈可達性、fallback、循環與孤兒內容。
- Simulation：數千 seeds 檢查五卡不足、主線卡死、資源通膨、死亡螺旋、事件重複率與各流派可行性。
- E2E：安裝 PWA、離線重啟、選卡、戰鬥、Stage／Day 結算、更新與舊存檔 migration。

### 10.2 Definition of Done

任何功能完成須同時具備：規格／ADR、型別與 schema、自動測試、錯誤處理、log／診斷、離線驗證、存檔相容性評估。任何內容包完成須通過 lint、事件圖檢查、至少一條人工遊玩路徑與文案審校。

## 11. 開發 Roadmap

### Phase 0：Foundation（本文件後的第一步）

- 建立 monorepo、TypeScript strict、測試與 CI。
- 定義 ID、Result、RNG、GameState、Condition／Effect v1。
- 完成 Event／NPC／World／Save 等核心 Schema 與 content lint。
- 寫三份 ADR：UI 技術、戰鬥渲染、存檔／更新策略。

完成標準：一個純記憶體 vertical slice 可由 seed 產生五卡、選擇、套用 Effects、重播 Event Log。

### Phase 1：Playable Prototype

- PWA shell、IndexedDB、Stage queue、五卡 UI。
- Rule／Event／Save Engine 最小可用版本。
- 20～30 個事件、3 名 NPC、1 區、1 場簡化戰鬥。

完成標準：手機離線連玩 10 個 Stage，可關閉重開並精確續玩。

### Phase 2：Vertical Slice（序章）

- 序章完整事件鏈、兩種以上可行流派、關係／記憶、基地雛形。
- 完整戰鬥輸入與一場 Boss；Stage／Day 雙層更新。
- 內容工具、事件圖、平衡模擬與玩家歷史 UI。

完成標準：30～60 分鐘可發佈品質體驗，離線、存檔與更新路徑通過 E2E。

### Phase 3：Alpha（系統完整）

- 八區資料骨架、隊友／NPC 命運、產業三槽、自動化、商店、物品與義體。
- 第一至第四章可玩；自由模式框架與多周目 meta save。
- 效能預算、可存取性、觸控裝置矩陣。

### Phase 4：Beta（內容完整）

- 八章主線、結局、全部核心 NPC 與主要事件鏈。
- 大規模 balance simulation、存檔 migration 演練、斷網／低記憶體測試。
- 文案、資產、音訊與 zh-TW 內容鎖定。

### Phase 5：Release 與後續

- PWA 發布、崩潰診斷（尊重離線與隱私）、內容版本回滾方案。
- 後續再評估成就、多周目擴充、MOD SDK、額外語言與可選雲端同步；不得讓這些延誤核心離線版。

## 12. 實作規範

- TypeScript `strict: true`；Domain 不使用 `any`，外部資料先解析為 `unknown` 再驗證。
- 檔案與函式使用清楚英文名稱；玩家顯示文字一律經 localization key，不硬編在 Engine。
- Engine API 回傳 `Result<T, GameError>` 或明確例外邊界；不得吞錯。
- 狀態更新使用 command／effect，不允許 UI 或 Engine 間共享可變物件。
- 每個新 Condition／Effect 必須同時新增 schema、handler、unit tests、log formatter 與作者文件。
- 不先做通用「萬能腳本」。重複需求出現並能定義穩定資料契約後才新增 DSL 能力。
- 數值公式集中、具名稱與版本；內容引用 formula ID，不複製公式字串。
- 內容 PR 與引擎 PR 可分離；內容作者不需理解內部程式碼即可新增合規資料。
- 發布後任何破壞存檔的變更都需要 migration；禁止直接改既有 ID 語意。

## 13. 首版明確不做

- 執行期生成式 AI、必須連線的故事或 API。
- 多人、WebSocket、排行榜與強制帳號。
- 無限制世界模擬、完整人口生命週期或每名路人的長期 AI。
- 正式 MOD 支援與任意腳本執行。
- 複雜 24 小時排程、飢餓微管理、長時間 Boss 或大型開放世界。

這些可在核心體驗與內容產線證實可行後，以 ADR 重新評估。

## 14. 風險與控制

| 風險 | 控制方式 |
|---|---|
| 內容量失控 | 先做序章 vertical slice；事件小型化、模板化、事件圖與內容預算 |
| 五卡常出現無趣／重複組合 | 配額、冷卻、多樣性分數、保留席、seed simulation |
| Rule DSL 變成另一種難維護程式語言 | 白名單 AST、無循環、無任意函式、版本化 handler |
| 世界模擬造成不可解狀態 | clamp、不變量、fallback、主線可達性 property tests |
| 存檔被更新破壞 | schemaVersion、逐版 migration、備份、fixture regression |
| 戰鬥拖累內容開發 | BattleOutcome 契約先行；戰鬥核心與敘事資料解耦 |
| 離線包過大 | 內容／資產 manifest、壓縮、章節索引、明確容量預算 |

## 15. 架構治理與下一步

本文件定義方向，細節用 ADR 補充。任何違反「Rule Engine 唯一寫入、資料驅動、穩定 ID、Event Log、離線可玩」的變更都視為重大架構變更，需先修改本文件或通過 ADR。

接下來依序建立：

1. `packages/schemas` 與 Condition／Effect 共用 `$defs`。
2. 最小 GameState、seeded RNG、Rule Engine transaction 與 Event Log。
3. Event Engine 五卡抽選與 Stage queue。
4. IndexedDB Save Engine 與 migration fixtures。
5. 以序章 20～30 個事件完成第一個端到端 vertical slice。

---

### 附錄 A：名詞

- **Card**：候選事件的簡要呈現。
- **Event**：選卡後展開的內容與規則單位。
- **Choice**：事件中的玩家處理方式。
- **Outcome**：Choice 在特定條件／檢定下得到的結果。
- **Condition**：無副作用的資格或分支判斷。
- **Effect**：由 Rule Engine 執行的狀態變更命令。
- **Stage**：一天內的一次玩法階段。
- **Event Chain**：多個小事件形成的持續劇情。
- **Memory**：供 NPC／世界後續讀取的具語意歷史標記。
- **Flag**：布林或小型枚舉的狀態事實。

### 附錄 B：架構驗收清單

- [ ] 關閉網路後可從冷啟動載入、遊玩、戰鬥與存檔。
- [ ] UI 無法直接改 GameState。
- [ ] 所有 Effect 都有 schema、handler、測試與 log。
- [ ] 相同 seed 與輸入可重現五卡與檢定。
- [ ] 任一 Stage 合法候選不足時有可診斷 fallback。
- [ ] 主線事件錯過後仍有資料定義的替代推進路徑。
- [ ] 每次 Stage 結束有 checkpoint；戰鬥前可安全恢復。
- [ ] 舊版存檔 migration 有 fixture 與回歸測試。
- [ ] 事件、NPC、物品與資產引用在 build 時完整驗證。
- [ ] 序章至少支援兩種顯著不同的通關準備與一個不同 NPC 命運。
