# Cycling Cities: The Digital Experience（概念原型）

以地圖為核心的互動研究平台，依據專案中的5-Factor Analysis、Tool 2: Bringing Sustainability Home
與2026年7月團隊會議筆記整理而成。介面提供**英文／繁體中文／荷蘭文**三語切換。

## 線上版本

正式網址：<https://cycling-cities-platform.vercel.app>

網址可帶參數直接分享特定視角，介面右下的「分享視角」按鈕會直接複製當前狀態的連結：

```
https://cycling-cities-platform.vercel.app/?lang=nl&city=rdam&d=1970
```

`lang`為`en`／`zh`／`nl`，`city`為`mpls`／`rdam`，`d`為年代（1890至2020，以十年為單位）。

每次push到 `main` 分支，Vercel會自動重新部署。

## 本機開啟方式

在本資料夾啟動任何靜態網站伺服器即可，例如：

```bash
python3 -m http.server 4173
```

接著前往 `http://localhost:4173/`。

## 目前功能

- 1890–2020年代時間軸，含自動播放
- Minneapolis／Rotterdam城市切換、雙城比較，以及全球研究網絡視角
- 歷史地形圖疊圖：Rotterdam為Bonneblad 1900（PMTiles），Minneapolis為USGS Topo（XYZ），可調透明度
- 今昔對照（swipe）分割檢視
- 城市型態、替代運具、交通政策、社會運動、文化地位五因素圖層
- 站點紀錄：敘事、史料出處、授權狀態標示與逐筆紀錄編號
- 運具分配（單車／步行／大眾運輸／汽車）百年趨勢圖
- 研究故事、資料與方法、史料索引三種抽屜檢視
- 搜尋（城市／年代／因素／站點，快捷鍵 `/`）、分享視角、引用格式複製
- 參與共筆流程示範
- 桌面與行動裝置版面

## 檔案結構

研究資料已外部化為JSON（計畫T3），研究團隊修改內容不需動程式邏輯：

| 檔案 | 內容 |
| --- | --- |
| `index.html` | 版面骨架 |
| `styles.css` | 設計系統（紙質米色＋朱紅＋墨黑；Noto Serif TC／EB Garamond／JetBrains Mono） |
| `i18n.js` | 介面字串，135個key×三語 |
| `data/sites.json` | 31筆站點紀錄，schema依計畫§4.1 |
| `data/modalsplit.json` | 28筆運具分配紀錄，schema依計畫§4.4 |
| `data/reference.json` | 年代、時代標籤、五因素、城市地圖設定、網絡城市、時代敘事 |
| `app.js` | 地圖、狀態與互動邏輯 |

新增站點時，`title`與`narrative`需同時提供`en`／`zh`／`nl`三語；`source.citation`依慣例不翻譯。
若該筆尚未經研究團隊確認，`placeholder`必須為`true`，`source.citation`填`[TO BE CONFIRMED]`。

因為改用`fetch`讀取JSON，本專案**不能**以`file://`直接開啟，必須經HTTP提供。

## 資料狀態

**31筆站點中只有4筆的出處經過查證，其餘27筆與全部28筆運具分配數值皆為佔位內容。**

原型v0.5的虛構館藏編號已於v2.0全部移除（計畫T1），改為`[TO BE CONFIRMED]`並在介面上標示：
地圖標記畫成空心虛線、紀錄卡加朱紅警示框、引用按鈕拒絕複製、運具分配圖疊上斜線網紋。
面板頁尾持續顯示待確認筆數，介面內另有「資料狀態」面板，內容由資料即時產生，不會過期。

已查證的4筆與移除清單見：

- `docs/delivery-note-2026-08-20.md`：交付說明頁，列出已查證項目與缺口
- `docs/purged-citations-2026-08-19.md`：27筆被移除的虛構引用原文
- `docs/CHANGELOG.md`：變更紀錄與理由

### 待辦

- **荷蘭文翻譯需母語審閱**：`i18n.js`與`data/*.json`中的`nl`字串為工作翻譯，正式發布前請由荷蘭語母語者（或Ruth團隊）校訂。計畫T7的驗收條件尚未滿足。
- **兩筆Library of Congress外連需人工複驗**：loc.gov阻擋自動化請求，無法從開發環境確認。
- **Minneapolis定年疊圖**（計畫T5）：現用的Esri服務不分年份，無法與Rotterdam逐年代對等比較，需以USGS topoView定年圖幅替換。
- **擴充已驗證影像至8筆以上**（計畫T6）：可查Nationaal Archief（Anefo，CC0）與mndigital.org。
- **運具分配來源**（計畫T4後續）：每筆數值需來源與`derivation`值。
