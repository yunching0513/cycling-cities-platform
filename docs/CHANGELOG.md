# 變更紀錄

依build-plan-ai.md §1.4，每次工作結束記錄變更項目與理由。被推翻的結論保留於此並附推翻證據。

---

## 2026-08-19：分享縮圖（Open Graph share card）

### 需求

連結分享給研究團隊時沒有預覽縮圖，Slack與電子郵件只會顯示裸網址。此次補上分享卡與網站圖示。

### 新增檔案

| 檔案 | 用途 |
|---|---|
| `assets/og-cycling-cities.png` | 分享縮圖，1200x630，237KB |
| `assets/og-card.source.html` | 縮圖原始檔，改版後重新輸出即可 |
| `assets/favicon.svg` | 瀏覽器分頁圖示 |
| `assets/apple-touch-icon.png` | iOS加入主畫面圖示，180x180 |

縮圖以無頭Chrome於2倍解析度算圖後縮放至1200x630。重新輸出的指令：

```
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
  --force-device-scale-factor=2 --window-size=1200,630 --virtual-time-budget=12000 \
  --screenshot=card@2x.png file://<path>/og-card.source.html
sips -z 630 1200 card@2x.png --out og-cycling-cities.png
```

### 縮圖內容與資料來源

依§1.1，卡片上每個數字都來自現有資料檔，未新增任何未查證陳述：

| 卡片文字 | 來源 |
|---|---|
| Minneapolis / Rotterdam | `data/reference.json` cities |
| 1890-2020 | `data/reference.json` decades首末值 |
| 31 site records | `data/sites.json` meta.total |
| 4 with verified sources | `data/sites.json` meta.verified |
| Concept prototype | `i18n.js` en.noticeTitle |

卡片刻意把「概念原型」與「31筆中4筆已查證」放進版面，而不是只放標題：連結被轉寄出去時，資料狀態要跟著一起走，不能讓收件者以為這是已完成的研究成果。

視覺沿用既有設計系統：紙米`#F1EFE9`、朱紅`#C15F3C`、墨`#1F1D19`，EB Garamond標題與JetBrains Mono註記，直角、1px細線、顆粒紋理。底部同時放實心與虛線圓點，對應地圖上「已查證」與「待確認」兩種標記。未使用任何外部影像，避免§1.1的授權問題。

### index.html的head變更

- 新增`og:`與`twitter:`系列標籤、`canonical`、`theme-color`、圖示連結
- `description`改寫：原文為「an interactive research atlas...」，未說明原型狀態。改為「Concept prototype: 31 site records, 4 with verified sources.」以符合§1.1「禁止把【待驗證】內容寫成事實」
- `title`改為`Cycling Cities Tool 2: The Digital Experience`，與計畫§1的專案定名一致
- 新增`robots: noindex, nofollow`。理由：build-plan-human.md要求原型在研究團隊審閱前不對外公開，此標籤可避免被搜尋引擎收錄；連結預覽讀的是og標籤而非robots，因此分享給團隊不受影響。研究團隊確認可公開後移除此行即可

### 待辦與已知落差

- `i18n.js`的`brandSub`為`The Global Experience`，但頁面標題與計畫§1為`The Digital Experience`。兩者指涉不同層級（整體計畫／Tool 2），此次未更動，待Wu確認何者為介面應顯示者
- 縮圖數字寫死於圖片內。`data/sites.json`的已查證筆數變動時，需重新輸出`og-cycling-cities.png`

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

### 手機版介面改善

非計畫項目，使用者需求。桌面版行為不變。

底部面板改為可拖曳的三段式sheet：

| 狀態 | 高度 | 用途 |
|---|---|---|
| peek | 155px | 時間軸與現況資訊留在畫面上，地圖佔587px（原為261px） |
| half | 46vh | 瀏覽各區塊 |
| full | 視窗高減頂欄 | 閱讀紀錄與抽屜內容 |

- 拖曳把手可自由調整並吸附至最近的一段，輕點則循環切換
- 年代控制項（年份、播放、滑桿、刻度）改置於sheet的sticky標頭，peek狀態下仍可拉時間軸
- sheet標頭顯示當前城市與「已查證／總數」
- 點選地圖標記時，sheet自peek展開至half並直接捲動到站點紀錄
- 標記新增半徑17px的透明觸控區，小點在觸控螢幕上也點得到

修正的既有缺陷：

- **導覽在761至1080px之間完全無法使用**：`.primary-nav`在1080px以下隱藏，但沒有任何替代入口，
  「研究故事」與「資料與方法」在該區間與手機上都無法到達。改為760px以下才隱藏，且在該尺寸下
  將導覽搬入sheet內成為可橫向捲動的分頁列（搬移而非複製，事件繫結不變）
- 手機版`.prototype-notice button`同時套用到關閉鈕與「資料狀態」連結，把連結壓成30px寬導致文字直排
- provenance與載入失敗的樣式原本接在media query之後，使手機覆寫失效。已將media query移至檔尾
- 縮放控制由左上移至右下、貼齊sheet上緣，落在拇指可及範圍
- 觸控目標放大：圖示鈕38px、播放鈕38px、年代刻度34px、抽屜關閉鈕38px、語言切換與底圖膠囊加大

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

### 風險提醒

v1.0（2026-08-18部署）期間，含虛構館藏編號的版本在公開網址上線約一日。
repo為public，Vercel未設存取保護。本次T1已移除虛構出處，但該期間的內容存於git歷史與可能的快取中。

---

## 2026-08-18：v1.0

首次部署。三語介面、雙城地圖、歷史疊圖、五因素圖層、運具分配圖、站點紀錄。
此版本站點出處含虛構內容，已於v2.0移除。詳見git tag `v1.0`。
