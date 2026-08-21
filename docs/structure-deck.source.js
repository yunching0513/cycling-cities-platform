const pptxgen = require('pptxgenjs');

/* Palette is the product's own design system: paper, ink, vermilion. */
const C = {
  paper: 'F1EFE9', paper2: 'EAE8E2', mist: 'D6D3CB', stone: 'BBB8AE',
  ash: '807C73', graphite: '565347', ink: '1F1D19', vermilion: 'C15F3C',
  white: 'FFFFFF'
};
const W = 13.33, H = 7.5, M = 0.62;

const EN = {
  file: 'cycling-cities-structure-en.pptx',
  head: 'Cambria', body: 'Calibri', code: 'Courier New',
  s1: {
    eyebrow: 'CYCLING CITIES  ·  TOOL 2',
    title: 'The Digital Experience',
    sub: 'Site structure of the working prototype',
    meta: ['Prototype v2.1', 'Minneapolis / Rotterdam', 'English · 繁體中文 · Nederlands'],
    url: 'cycling-cities-platform.vercel.app',
    note: 'Concept prototype. 31 site records, 4 of them with verified sources.',
    wire: ['Top bar', 'Map', 'Panel']
  },
  s2: {
    eyebrow: 'SCREEN ANATOMY', title: 'One screen, five regions',
    lead: 'The whole tool is a single page. Nothing navigates away; every control changes what the map shows.',
    items: [
      ['Top bar', 'Brand, the four views, search, contribute'],
      ['Map canvas', 'Leaflet with a CARTO basemap and a dated raster overlay'],
      ['Right panel', 'The working controls, in seven numbered sections'],
      ['Status notice', 'Prototype warning, linking to the full data status'],
      ['Map card', 'Legend, current city, current decade']
    ],
    wire: { top: 'TOP BAR', map: 'MAP CANVAS', panel: 'PANEL', notice: 'NOTICE', card: 'MAP CARD' }
  },
  s3: {
    eyebrow: 'INFORMATION ARCHITECTURE', title: 'Four views',
    items: [
      ['Explore map', 'One city at a time. Markers carry the decade and the analytic factor.'],
      ['Compare cities', 'Two synchronised maps side by side, held at one zoom level.'],
      ['Research stories', 'Nine narrative periods. Selecting one moves the map and the timeline.'],
      ['Data & method', 'The five-factor method, and how a record becomes verified.']
    ]
  },
  s4: {
    eyebrow: 'THE RIGHT PANEL', title: 'Seven numbered sections',
    items: [
      ['City', 'Switch city, compare the two, or open the global network'],
      ['Decade', '14 steps from 1890. The 2020s run to today'],
      ['Historical overlay', 'Dated raster map, opacity, then-and-now swipe'],
      ['Five factors', 'Filter the map by the analytic factors'],
      ['Modal split', 'City-level chart, plus junction-level slots'],
      ['Site record', 'The selected record, its status and its citation'],
      ['Basemap', 'Three CARTO styles']
    ]
  },
  s5: {
    eyebrow: 'DATA MODEL', title: 'Four JSON files, no database',
    files: [
      ['reference.json', 'Decades, eras, five factors, cities, 9 narrative periods'],
      ['sites.json', '31 site records'],
      ['modalsplit.json', '28 city-level rows, all placeholder'],
      ['intersections.json', '4 junction slots, counts empty']
    ],
    chartTitle: 'Site records by source status',
    cat: 'Site records', ser: ['Verified', 'Unconfirmed'],
    note: 'No figure in the interface is invented. Where a value is unknown the interface prints [TO BE CONFIRMED] instead of filling the gap.'
  },
  s6: {
    eyebrow: 'PROVENANCE', title: 'Seven places that mark unconfirmed content',
    items: [
      ['Map marker', 'Hollow with a dashed edge. Verified records are solid'],
      ['Map legend', 'A separate "unconfirmed" entry'],
      ['Record card', 'Dashed frame and a vermilion warning box'],
      ['Source field', '[TO BE CONFIRMED] in vermilion monospace'],
      ['Citation button', 'Refuses to copy a placeholder record'],
      ['Factor counts', 'Shown as verified / total'],
      ['Narrative draft', 'Lorem Ipsum on a hatched ground, labelled as not content']
    ]
  },
  s7: {
    eyebrow: 'BUILD AND DELIVERY', title: 'Static files, served from the edge',
    flow: [['Static files', 'No build step'], ['GitHub', 'Version history'], ['Vercel', 'Production']],
    aside: ['Historical raster', 'PMTiles hosted on GitHub Pages, read with HTTP range requests, so only the tiles in view are fetched.'],
    limitsH: 'Deliberately out of scope (build plan §7)',
    limits: ['No backend', 'No database', 'No user accounts', 'No native app', 'No image embedded before rights are cleared']
  },
  s8: {
    eyebrow: 'LANGUAGE AND STATE', title: 'Three languages, and state in the URL',
    langs: [['EN', 'English'], ['中', '繁體中文'], ['NL', 'Nederlands']],
    keys: '175 interface strings in each language',
    caveat: 'Dutch is a working translation and still needs a native reader before publication.',
    urlH: 'Any view can be linked and reopened exactly',
    url: '?lang=nl&city=rdam&d=1970',
    urlNote: 'Language, city and decade travel in the address bar, so a colleague opens the same screen you were looking at.'
  },
  s9: {
    eyebrow: 'NEXT', title: 'What the research team supplies',
    items: [
      'Confirm or replace 27 placeholder site records and their citations',
      'Supply modal split figures with a derivation method and a source',
      'Choose the junctions, then provide counts, method, date and hour',
      'Write the nine narrative periods now held by Lorem Ipsum',
      'Clear image rights before any image is embedded'
    ],
    decideH: 'Two decisions needed',
    decide: [
      'Should contributions be stored? That requires a backend, which the build plan currently excludes.',
      'The interface claims "50+ cities" in the network view, but the data file holds 12. Confirm the number or change the wording.'
    ]
  }
};

const ZH = {
  file: 'cycling-cities-structure-zh.pptx',
  head: 'Songti TC', body: 'PingFang TC', code: 'Courier New',
  s1: {
    eyebrow: 'CYCLING CITIES  ·  TOOL 2',
    title: 'The Digital Experience',
    sub: '工作原型的網站結構',
    meta: ['原型v2.1', '明尼亞波利斯／鹿特丹', '英文·繁體中文·荷蘭文'],
    url: 'cycling-cities-platform.vercel.app',
    note: '概念原型。31筆站點紀錄，其中4筆出處已查證。',
    wire: ['頂欄', '地圖', '面板']
  },
  s2: {
    eyebrow: '畫面結構', title: '一個畫面，五個區域',
    lead: '整個工具就是單一頁面。沒有任何操作會跳離，所有控制項改變的都是地圖上看到的內容。',
    items: [
      ['頂欄', '品牌、四個視圖、搜尋、投稿'],
      ['地圖區', 'Leaflet搭配CARTO底圖，以及有年份的疊圖'],
      ['右側面板', '主要控制項，分為七個編號區段'],
      ['狀態提示', '原型警語，可連到完整的資料狀態'],
      ['地圖卡片', '圖例、目前城市、目前年代']
    ],
    wire: { top: '頂欄', map: '地圖區', panel: '面板', notice: '提示', card: '地圖卡片' }
  },
  s3: {
    eyebrow: '資訊架構', title: '四個視圖',
    items: [
      ['探索地圖', '一次看一座城市。標記帶有年代與分析因素。'],
      ['雙城比較', '兩張同步的地圖並排，維持同一個縮放層級。'],
      ['研究故事', '九個敘事分期。點選其一，地圖與時間軸一起移動。'],
      ['資料與方法', '五因素方法，以及一筆紀錄如何成為已查證。']
    ]
  },
  s4: {
    eyebrow: '右側面板', title: '七個編號區段',
    items: [
      ['城市', '切換城市、雙城比較，或開啟全球網絡'],
      ['年代', '自1890年起共14格。2020年代一路延伸到今天'],
      ['歷史疊圖', '有年份的掃描地圖、透明度、今昔對照拉桿'],
      ['五因素', '依分析因素篩選地圖'],
      ['運具分擔', '城市層級圖表，另有路口層級欄位'],
      ['站點紀錄', '選取的紀錄、其狀態與出處'],
      ['底圖', '三種CARTO樣式']
    ]
  },
  s5: {
    eyebrow: '資料模型', title: '四個JSON檔，沒有資料庫',
    files: [
      ['reference.json', '年代、時期、五因素、城市、9個敘事分期'],
      ['sites.json', '31筆站點紀錄'],
      ['modalsplit.json', '28筆城市層級數據，全部為佔位'],
      ['intersections.json', '4個路口欄位，計數留空']
    ],
    chartTitle: '站點紀錄的出處狀態',
    cat: '站點紀錄', ser: ['已查證', '待確認'],
    note: '介面上沒有任何虛構的數字。數值未知時，介面顯示[TO BE CONFIRMED]，而不是把空缺填滿。'
  },
  s6: {
    eyebrow: '出處標示', title: '七個標示待確認內容的位置',
    items: [
      ['地圖標記', '空心虛線外框。已查證者為實心'],
      ['地圖圖例', '另立「待確認」項'],
      ['紀錄卡', '虛線外框加朱紅警示框'],
      ['出處欄位', '[TO BE CONFIRMED]以朱紅等寬字顯示'],
      ['引用按鈕', '拒絕複製佔位紀錄'],
      ['因素計數', '顯示為已查證／總數'],
      ['敘事草稿框', 'Lorem Ipsum配斜紋底，標明不是內容']
    ]
  },
  s7: {
    eyebrow: '建置與部署', title: '靜態檔案，由邊緣節點供應',
    flow: [['靜態檔案', '無建置流程'], ['GitHub', '版本紀錄'], ['Vercel', '正式環境']],
    aside: ['歷史疊圖', 'PMTiles放在GitHub Pages，以HTTP range request讀取，只抓取畫面內的圖磚。'],
    limitsH: '刻意不做的範圍（計畫§7）',
    limits: ['不建置後端', '不建置資料庫', '不做使用者帳號', '不做原生App', '授權未清前不嵌入影像']
  },
  s8: {
    eyebrow: '語言與狀態', title: '三種語言，狀態寫在網址',
    langs: [['EN', 'English'], ['中', '繁體中文'], ['NL', 'Nederlands']],
    keys: '每種語言各175條介面字串',
    caveat: '荷蘭文為工作翻譯，發布前仍需母語者審閱。',
    urlH: '任何視角都能連結並原樣重開',
    url: '?lang=nl&city=rdam&d=1970',
    urlNote: '語言、城市與年代都寫在網址列，同事打開就是你當時看到的那個畫面。'
  },
  s9: {
    eyebrow: '下一步', title: '需要研究團隊提供的內容',
    items: [
      '確認或替換27筆佔位站點紀錄及其出處',
      '提供運具分擔數據，並附推導方法與出處',
      '選定路口，並提供計數、方法、日期與時段',
      '撰寫目前由Lorem Ipsum佔位的九個敘事分期',
      '在嵌入任何影像之前釐清授權'
    ],
    decideH: '兩項待決定',
    decide: [
      '投稿是否要能被儲存？那需要後端，而計畫目前將其列為非目標。',
      '介面在全球網絡視圖寫「50+ cities」，但資料檔只有12座城市。請確認數字或修改用語。'
    ]
  }
};

/* ---------- shared drawing helpers ---------- */
function eyebrow(s, L, x, y, text, color) {
  s.addText(text, {
    x, y, w: 6, h: 0.24, margin: 0, fontFace: L.body, fontSize: 10, bold: true,
    charSpacing: 2.4, color: color || C.vermilion, align: 'left'
  });
}
function title(s, L, x, y, text, color) {
  s.addText(text, {
    x, y, w: W - x - M, h: 0.72, margin: 0, fontFace: L.head, fontSize: 34,
    bold: true, color: color || C.ink, align: 'left'
  });
}
function chip(s, L, x, y, n, dark) {
  s.addShape('rect', { x, y, w: 0.34, h: 0.34, fill: { color: dark ? C.vermilion : C.ink } });
  s.addText(String(n).padStart(2, '0'), {
    x, y, w: 0.34, h: 0.34, margin: 0, fontFace: L.code, fontSize: 11, bold: true,
    color: C.paper, align: 'center', valign: 'middle'
  });
}
function rule(s, x, y, w, color) {
  s.addShape('rect', { x, y, w, h: 0.011, fill: { color: color || C.mist } });
}

/* ---------- slides ---------- */
function slideTitle(p, L) {
  const s = p.addSlide();
  s.background = { color: C.ink };
  eyebrow(s, L, M, 1.5, L.s1.eyebrow, C.vermilion);
  s.addText(L.s1.title, {
    x: M, y: 1.95, w: 7.6, h: 1.9, margin: 0, fontFace: L.head, fontSize: 54,
    bold: true, color: C.paper, lineSpacing: 58
  });
  s.addText(L.s1.sub, {
    x: M, y: 3.95, w: 7.2, h: 0.42, margin: 0, fontFace: L.body, fontSize: 17, color: C.stone
  });
  rule(s, M, 4.62, 7.2, C.graphite);
  s.addText(L.s1.meta.join('     |     '), {
    x: M, y: 4.86, w: 7.4, h: 0.34, margin: 0, fontFace: L.body, fontSize: 12, color: C.stone
  });
  s.addText(L.s1.url, {
    x: M, y: 5.28, w: 7.4, h: 0.32, margin: 0, fontFace: L.code, fontSize: 12.5, color: C.vermilion
  });
  s.addText(L.s1.note, {
    x: M, y: 6.06, w: 7.4, h: 0.4, margin: 0, fontFace: L.body, fontSize: 11.5, color: C.ash
  });

  /* outline of the app's own layout, as the recurring motif */
  const bx = 8.75, by = 1.95, bw = 3.96, bh = 3.4;
  s.addShape('rect', { x: bx, y: by, w: bw, h: bh, fill: { color: C.ink }, line: { color: C.graphite, width: 1 } });
  s.addShape('rect', { x: bx, y: by, w: bw, h: 0.42, fill: { color: C.graphite } });
  s.addText(L.s1.wire[0], { x: bx + 0.14, y: by + 0.04, w: 2, h: 0.34, margin: 0, fontFace: L.body, fontSize: 9, color: C.paper, valign: 'middle' });
  s.addText(L.s1.wire[1], { x: bx + 0.2, y: by + 1.6, w: 2, h: 0.3, margin: 0, fontFace: L.body, fontSize: 10, color: C.ash });
  s.addShape('rect', { x: bx + bw - 1.28, y: by + 0.62, w: 1.12, h: bh - 0.86, fill: { color: C.paper2 }, line: { color: C.stone, width: 1 } });
  s.addText(L.s1.wire[2], { x: bx + bw - 1.28, y: by + 0.72, w: 1.12, h: 0.3, margin: 0, fontFace: L.body, fontSize: 9, color: C.graphite, align: 'center' });
  s.addShape('rect', { x: bx + bw - 1.14, y: by + 1.2, w: 0.84, h: 0.14, fill: { color: C.vermilion } });
  [1.55, 1.82, 2.09, 2.36].forEach(dy =>
    s.addShape('rect', { x: bx + bw - 1.14, y: by + dy, w: 0.84, h: 0.09, fill: { color: C.mist } }));
  return s;
}

function slideAnatomy(p, L) {
  const s = p.addSlide();
  s.background = { color: C.paper };
  eyebrow(s, L, M, 0.56, L.s2.eyebrow);
  title(s, L, M, 0.86, L.s2.title);
  s.addText(L.s2.lead, { x: M, y: 1.66, w: 11.9, h: 0.36, margin: 0, fontFace: L.body, fontSize: 13, color: C.graphite });

  const bx = M, by = 2.3, bw = 6.55, bh = 4.1;
  s.addShape('rect', { x: bx, y: by, w: bw, h: bh, fill: { color: C.paper2 }, line: { color: C.stone, width: 1 } });
  s.addShape('rect', { x: bx, y: by, w: bw, h: 0.46, fill: { color: C.ink } });
  s.addText(L.s2.wire.top, { x: bx + 0.16, y: by + 0.05, w: 3, h: 0.36, margin: 0, fontFace: L.body, fontSize: 10, bold: true, color: C.paper, valign: 'middle' });
  s.addText(L.s2.wire.map, { x: bx + 1.9, y: by + 1.9, w: 2.4, h: 0.34, margin: 0, fontFace: L.body, fontSize: 12, color: C.ash, align: 'center' });
  s.addShape('rect', { x: bx + bw - 2.0, y: by + 0.68, w: 1.82, h: bh - 0.9, fill: { color: C.paper }, line: { color: C.stone, width: 1 } });
  s.addText(L.s2.wire.panel, { x: bx + bw - 2.0, y: by + 0.8, w: 1.82, h: 0.3, margin: 0, fontFace: L.body, fontSize: 10, bold: true, color: C.ink, align: 'center' });
  [1.32, 1.72, 2.12, 2.52, 2.92, 3.32].forEach((dy, i) =>
    s.addShape('rect', { x: bx + bw - 1.84, y: by + dy, w: 1.5, h: 0.16, fill: { color: i === 0 ? C.vermilion : C.mist } }));
  s.addShape('rect', { x: bx + 0.38, y: by + 0.72, w: 2.5, h: 0.6, fill: { color: C.paper }, line: { color: C.stone, width: 1 } });
  s.addText(L.s2.wire.notice, { x: bx + 0.38, y: by + 0.72, w: 2.5, h: 0.6, margin: 0, fontFace: L.body, fontSize: 9.5, color: C.vermilion, align: 'center', valign: 'middle' });
  s.addShape('rect', { x: bx + 0.28, y: by + bh - 1.12, w: 2.3, h: 0.86, fill: { color: C.paper }, line: { color: C.stone, width: 1 } });
  s.addText(L.s2.wire.card, { x: bx + 0.28, y: by + bh - 1.12, w: 2.3, h: 0.86, margin: 0, fontFace: L.body, fontSize: 9.5, color: C.graphite, align: 'center', valign: 'middle' });

  let y = 2.34;
  L.s2.items.forEach((it, i) => {
    chip(s, L, 7.42, y, i + 1);
    s.addText(it[0], { x: 7.94, y: y - 0.03, w: 4.8, h: 0.3, margin: 0, fontFace: L.head, fontSize: 15, bold: true, color: C.ink });
    s.addText(it[1], { x: 7.94, y: y + 0.28, w: 4.8, h: 0.42, margin: 0, fontFace: L.body, fontSize: 11.5, color: C.graphite });
    y += 0.82;
  });
  return s;
}

function slideViews(p, L) {
  const s = p.addSlide();
  s.background = { color: C.paper };
  eyebrow(s, L, M, 0.56, L.s3.eyebrow);
  title(s, L, M, 0.86, L.s3.title);

  const cw = 5.78, ch = 2.28;
  L.s3.items.forEach((it, i) => {
    const x = M + (i % 2) * (cw + 0.34);
    const y = 1.86 + Math.floor(i / 2) * (ch + 0.34);
    s.addShape('rect', { x, y, w: cw, h: ch, fill: { color: C.paper2 }, line: { color: C.mist, width: 1 } });
    chip(s, L, x + 0.4, y + 0.4, i + 1);
    s.addText(it[0], { x: x + 0.4, y: y + 0.92, w: cw - 0.8, h: 0.38, margin: 0, fontFace: L.head, fontSize: 20, bold: true, color: C.ink });
    s.addText(it[1], { x: x + 0.4, y: y + 1.36, w: cw - 0.8, h: 0.72, margin: 0, fontFace: L.body, fontSize: 12.5, color: C.graphite });
  });
  return s;
}

function slidePanel(p, L) {
  const s = p.addSlide();
  s.background = { color: C.paper };
  eyebrow(s, L, M, 0.56, L.s4.eyebrow);
  title(s, L, M, 0.86, L.s4.title);

  L.s4.items.forEach((it, i) => {
    const col = i < 4 ? 0 : 1;
    const row = i < 4 ? i : i - 4;
    const x = M + col * 6.12;
    const y = 1.92 + row * 1.22;
    chip(s, L, x, y, i + 1);
    s.addText(it[0], { x: x + 0.52, y: y - 0.04, w: 5.3, h: 0.32, margin: 0, fontFace: L.head, fontSize: 16, bold: true, color: C.ink });
    s.addText(it[1], { x: x + 0.52, y: y + 0.3, w: 5.3, h: 0.6, margin: 0, fontFace: L.body, fontSize: 12, color: C.graphite });
    rule(s, x, y + 0.98, 5.82);
  });
  return s;
}

function slideData(p, L) {
  const s = p.addSlide();
  s.background = { color: C.paper };
  eyebrow(s, L, M, 0.56, L.s5.eyebrow);
  title(s, L, M, 0.86, L.s5.title);

  let y = 1.92;
  L.s5.files.forEach(f => {
    s.addShape('rect', { x: M, y, w: 6.3, h: 0.94, fill: { color: C.paper2 }, line: { color: C.mist, width: 1 } });
    s.addText(f[0], { x: M + 0.3, y: y + 0.12, w: 5.7, h: 0.3, margin: 0, fontFace: L.code, fontSize: 13, bold: true, color: C.vermilion });
    s.addText(f[1], { x: M + 0.3, y: y + 0.44, w: 5.7, h: 0.38, margin: 0, fontFace: L.body, fontSize: 11.5, color: C.graphite });
    y += 1.08;
  });

  s.addChart('bar', [
    { name: L.s5.ser[0], labels: [L.s5.cat], values: [4] },
    { name: L.s5.ser[1], labels: [L.s5.cat], values: [27] }
  ], {
    x: 7.28, y: 1.92, w: 5.43, h: 2.5,
    barDir: 'bar', barGrouping: 'stacked',
    showTitle: true, title: L.s5.chartTitle, titleFontFace: L.head, titleFontSize: 13, titleColor: C.ink,
    chartColors: [C.graphite, C.vermilion],
    showValue: true, dataLabelPosition: 'ctr', dataLabelColor: C.paper,
    dataLabelFontFace: L.body, dataLabelFontSize: 13,
    showLegend: true, legendPos: 'b', legendFontFace: L.body, legendFontSize: 10, legendColor: C.graphite,
    catAxisLabelColor: C.ash, catAxisLabelFontFace: L.body, catAxisLabelFontSize: 10,
    valAxisLabelColor: C.ash, valAxisLabelFontFace: L.body, valAxisLabelFontSize: 10,
    valGridLine: { color: C.mist, size: 1 }, catGridLine: { style: 'none' },
    plotArea: { fill: { color: C.paper } }
  });

  s.addShape('rect', { x: 7.28, y: 4.66, w: 5.43, h: 1.68, fill: { color: C.ink } });
  s.addText(L.s5.note, {
    x: 7.58, y: 4.9, w: 4.83, h: 1.2, margin: 0, fontFace: L.body, fontSize: 12.5,
    color: C.paper, lineSpacing: 19
  });
  return s;
}

function slideProvenance(p, L) {
  const s = p.addSlide();
  s.background = { color: C.paper };
  eyebrow(s, L, M, 0.56, L.s6.eyebrow);
  title(s, L, M, 0.86, L.s6.title);

  L.s6.items.forEach((it, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = M + col * 6.12, y = 1.9 + row * 1.16;
    chip(s, L, x, y, i + 1, true);
    s.addText(it[0], { x: x + 0.52, y: y - 0.04, w: 5.3, h: 0.32, margin: 0, fontFace: L.head, fontSize: 15, bold: true, color: C.ink });
    s.addText(it[1], { x: x + 0.52, y: y + 0.3, w: 5.3, h: 0.56, margin: 0, fontFace: L.body, fontSize: 11.5, color: C.graphite });
  });
  return s;
}

function slideBuild(p, L) {
  const s = p.addSlide();
  s.background = { color: C.paper };
  eyebrow(s, L, M, 0.56, L.s7.eyebrow);
  title(s, L, M, 0.86, L.s7.title);

  const bw = 3.5, bh = 1.5;
  L.s7.flow.forEach((f, i) => {
    const x = M + i * (bw + 0.78);
    s.addShape('rect', { x, y: 1.94, w: bw, h: bh, fill: { color: i === 2 ? C.ink : C.paper2 }, line: { color: i === 2 ? C.ink : C.stone, width: 1 } });
    s.addText(f[0], { x: x + 0.28, y: 2.24, w: bw - 0.56, h: 0.4, margin: 0, fontFace: L.head, fontSize: 18, bold: true, color: i === 2 ? C.paper : C.ink });
    s.addText(f[1], { x: x + 0.28, y: 2.68, w: bw - 0.56, h: 0.34, margin: 0, fontFace: L.body, fontSize: 11.5, color: i === 2 ? C.stone : C.ash });
    if (i < 2) {
      s.addShape('rect', { x: x + bw + 0.2, y: 2.66, w: 0.28, h: 0.05, fill: { color: C.vermilion } });
      s.addShape('triangle', { x: x + bw + 0.46, y: 2.56, w: 0.2, h: 0.25, fill: { color: C.vermilion }, rotate: 90 });
    }
  });

  s.addShape('rect', { x: M, y: 3.78, w: 6.3, h: 1.62, fill: { color: C.paper2 }, line: { color: C.mist, width: 1 } });
  s.addText(L.s7.aside[0], { x: M + 0.3, y: 3.98, w: 5.7, h: 0.3, margin: 0, fontFace: L.head, fontSize: 14, bold: true, color: C.vermilion });
  s.addText(L.s7.aside[1], { x: M + 0.3, y: 4.32, w: 5.7, h: 0.9, margin: 0, fontFace: L.body, fontSize: 12, color: C.graphite, lineSpacing: 18 });

  s.addText(L.s7.limitsH, { x: 7.28, y: 3.78, w: 5.43, h: 0.32, margin: 0, fontFace: L.head, fontSize: 14, bold: true, color: C.ink });
  s.addText(L.s7.limits.map((t, i) => ({
    text: t, options: { bullet: true, breakLine: i < L.s7.limits.length - 1 }
  })), {
    x: 7.28, y: 4.18, w: 5.43, h: 1.6, margin: 0, fontFace: L.body, fontSize: 12.5,
    color: C.graphite, paraSpaceAfter: 6
  });
  return s;
}

function slideLang(p, L) {
  const s = p.addSlide();
  s.background = { color: C.paper };
  eyebrow(s, L, M, 0.56, L.s8.eyebrow);
  title(s, L, M, 0.86, L.s8.title);

  L.s8.langs.forEach((lg, i) => {
    const x = M + i * 2.12;
    s.addShape('rect', { x, y: 1.94, w: 1.86, h: 1.34, fill: { color: i === 0 ? C.ink : C.paper2 }, line: { color: i === 0 ? C.ink : C.stone, width: 1 } });
    s.addText(lg[0], { x, y: 2.12, w: 1.86, h: 0.5, margin: 0, fontFace: L.head, fontSize: 26, bold: true, color: i === 0 ? C.paper : C.ink, align: 'center' });
    s.addText(lg[1], { x, y: 2.66, w: 1.86, h: 0.32, margin: 0, fontFace: L.body, fontSize: 11, color: i === 0 ? C.stone : C.ash, align: 'center' });
  });
  s.addText(L.s8.keys, { x: M, y: 3.46, w: 6.1, h: 0.32, margin: 0, fontFace: L.head, fontSize: 16, bold: true, color: C.vermilion });
  s.addText(L.s8.caveat, { x: M, y: 3.84, w: 6.1, h: 0.7, margin: 0, fontFace: L.body, fontSize: 12.5, color: C.graphite, lineSpacing: 19 });

  s.addShape('rect', { x: 7.28, y: 1.94, w: 5.43, h: 3.4, fill: { color: C.ink } });
  s.addText(L.s8.urlH, { x: 7.58, y: 2.24, w: 4.83, h: 0.36, margin: 0, fontFace: L.head, fontSize: 16, bold: true, color: C.paper });
  s.addShape('rect', { x: 7.58, y: 2.82, w: 4.83, h: 0.62, fill: { color: C.graphite } });
  s.addText(L.s8.url, { x: 7.58, y: 2.82, w: 4.83, h: 0.62, margin: 0, fontFace: L.code, fontSize: 13, color: C.paper, align: 'center', valign: 'middle' });
  s.addText(L.s8.urlNote, { x: 7.58, y: 3.66, w: 4.83, h: 1.1, margin: 0, fontFace: L.body, fontSize: 12, color: C.stone, lineSpacing: 19 });
  return s;
}

function slideNext(p, L) {
  const s = p.addSlide();
  s.background = { color: C.ink };
  eyebrow(s, L, M, 0.56, L.s9.eyebrow);
  title(s, L, M, 0.86, L.s9.title, C.paper);

  L.s9.items.forEach((t, i) => {
    const y = 1.96 + i * 0.66;
    chip(s, L, M, y, i + 1, true);
    s.addText(t, { x: M + 0.52, y: y + 0.02, w: 5.9, h: 0.5, margin: 0, fontFace: L.body, fontSize: 12.5, color: C.paper, valign: 'top' });
  });

  s.addShape('rect', { x: 7.28, y: 1.9, w: 5.43, h: 3.86, fill: { color: C.graphite } });
  s.addText(L.s9.decideH, { x: 7.58, y: 2.16, w: 4.83, h: 0.36, margin: 0, fontFace: L.head, fontSize: 17, bold: true, color: C.vermilion });
  L.s9.decide.forEach((t, i) => {
    s.addText(t, { x: 7.58, y: 2.7 + i * 1.5, w: 4.83, h: 1.3, margin: 0, fontFace: L.body, fontSize: 12.5, color: C.paper, lineSpacing: 20 });
  });
  return s;
}

/* ---------- build ---------- */
function build(L) {
  const p = new pptxgen();
  p.layout = 'LAYOUT_WIDE';
  p.author = 'Cycling Cities Tool 2';
  p.title = L.s1.title;
  slideTitle(p, L);
  slideAnatomy(p, L);
  slideViews(p, L);
  slidePanel(p, L);
  slideData(p, L);
  slideProvenance(p, L);
  slideBuild(p, L);
  slideLang(p, L);
  slideNext(p, L);
  return p.writeFile({ fileName: L.file });
}

build(EN).then(f => console.log('wrote', f)).then(() => build(ZH)).then(f => console.log('wrote', f));
