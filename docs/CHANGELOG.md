# 變更紀錄

依build-plan-ai.md §1.4，每次工作結束記錄變更項目與理由。被推翻的結論保留於此並附推翻證據。

---

## 2026-08-19：v2.0

對應計畫工作項目：T1、T2、T3、T4（P0），T7、T8（P1，提前完成）

### T1：清除虛構出處

27筆站點的出處引用為原型v0.5生成的虛構內容，已全部移除。

- `source.citation`改為`[TO BE CONFIRMED]`，`archive`、`reference`、`url`、`verifiedBy`、`verifiedOn`均為`null`
- 該筆`placeholder`設為`true`
- 移除前的原字串保留於`docs/purged-citations-2026-08-19.md`，供研究團隊比對，但不得作為出處使用
- 敘事文字保留，因為它示範的是介面要呈現什麼，而非主張某項史實已獲確認

保留出處的4筆為計畫§2.2所列、有可查證編號與授權聲明者：
MPLS-FORM-001、MPLS-ALT-001、RDAM-FORM-001、RDAM-MOVE-001。

介面上的標示方式：

| 位置 | 佔位內容的呈現 |
|---|---|
| 地圖標記 | 空心、虛線外框（已查證者為實心） |
| 地圖圖例 | 新增「待確認」項 |
| 紀錄卡 | 虛線外框＋朱紅警示框，說明不可引用 |
| 出處欄 | `[TO BE CONFIRMED]`以等寬朱紅字顯示 |
| 引用按鈕 | 拒絕複製，提示「佔位紀錄：尚不可引用」 |
| 因素計數 | 顯示「已查證／總數」 |
| 面板頁尾 | 顯示「待確認的紀錄27 / 31」 |
| 資料狀態抽屜 | 由資料即時產生，列出4筆已查證紀錄與缺口 |

### T2：驗證疊圖可載入

【外部事實】2026-08-19實測，兩份疊圖皆回報ready：

- Rotterdam `rotterdam-1900.pmtiles`：GitHub Pages回應HTTP 206，支援range request，PMTiles標頭讀取成功，z12至z17，畫面渲染12塊canvas tile
- Minneapolis Esri `USA_Topo_Maps`：HTTP 206，回傳image/jpeg，載入56塊tile
- `vendor/pmtiles.js`：HTTP 206，`typeof pmtiles === 'object'`

計畫§8 V3（GitHub Pages是否支援range request）：**已驗證為支援**。

### T3：資料外部化

站點資料由內嵌JS物件改為JSON檔，HTML與JS不再含硬編碼站點資料。

- `data/sites.json`：31筆站點，schema依計畫§4.1
- `data/modalsplit.json`：28筆運具分配紀錄，schema依計畫§4.4
- `data/reference.json`：年代、時代標籤、五因素、城市地圖設定、網絡城市、時代敘事
- 舊`data.js`刪除
- 載入失敗時顯示明確錯誤畫面，含失敗檔名、HTTP狀態與重試按鈕

紀錄編號改為依城市與因素各自累加（`{CITY}-{FACTOR}-{NNN}`），確保全域唯一。

**代價**：改用`fetch`後無法再以`file://`直接開啟，必須經HTTP提供。已在README載明本機啟動方式。

### T4：modal split標示

28筆運具分配紀錄全部標為`placeholder: true`。

**與計畫schema的偏離**：計畫§4.4定義`derivation`為`measured | estimated | interpolated`列舉值。
這些數值是虛構的，三個值沒有一個為真，填任何一個都等於主張了一種不存在的推導方法。
因此`derivation`填`null`，並以`placeholder: true`標示。介面顯示「推導方式：尚未確立」。
待研究團隊提供來源後，再依實際情形填入列舉值。

圖表以斜線網紋疊加並降低填色不透明度，避免佔位數值看起來像已確認的研究結果。

### T7：荷蘭文介面（提前完成）

介面語言擴充為en／zh／nl，135個UI字串鍵三語齊備，站點標題與敘事亦三語化。
**荷蘭文為工作翻譯，尚未經母語者校對**，計畫T7的驗收條件（母語校對後合併）尚未滿足。

### T8：拆分檔案結構（提前完成）

單檔HTML拆分為`index.html`、`styles.css`、`i18n.js`、`app.js`、`data/*.json`。

### 其他

- 依計畫§1.3調整中文排版：中文與英數之間不加空格、破折號改為冒號
- 版本字串由`Prototype v0.6`改為`Prototype v2.0`

### 未完成與阻塞

| 項目 | 狀態 | 阻塞原因 |
|---|---|---|
| 兩筆Library of Congress外連複驗 | 【待驗證】 | loc.gov以Cloudflare阻擋自動化請求，無法從執行環境複驗。驗證方法：人工於瀏覽器點開`loc.gov/item/2016804576`與`loc.gov/item/2018649601` |
| T5 Minneapolis定年疊圖 | 未開始 | 需自USGS topoView取得定年圖幅並以bake_pmtiles.py烘製 |
| T6擴充已驗證影像至8筆以上 | 未開始 | 需查詢Nationaal Archief與mndigital.org |
| T7荷蘭文母語校對 | 未完成 | 需荷蘭語母語者或Ruth團隊協助 |
| 手機版介面改善 | 未開始 | 使用者已提出需求，非計畫項目，排在P0之後 |

### 風險提醒

v1.0（2026-08-18部署）期間，含虛構館藏編號的版本在公開網址上線約一日。
repo為public，Vercel未設存取保護。本次T1已移除虛構出處，但該期間的內容存於git歷史與可能的快取中。

---

## 2026-08-18：v1.0

首次部署。三語介面、雙城地圖、歷史疊圖、五因素圖層、運具分配圖、站點紀錄。
此版本站點出處含虛構內容，已於v2.0移除。詳見git tag `v1.0`。
