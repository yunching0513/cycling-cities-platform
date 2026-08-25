/* Structure deck for Cycling Cities Tool 2, drawn in the product's own design system.
   Every component here has a counterpart in styles.css: the italic vermilion eyebrow
   (.head-en), the 48px vermilion bar sitting on a 1px ink rule (.panel-head::before),
   the numbered section label (.section-label), the paper grain (.grain::before), and
   the solid / dashed markers that separate verified records from placeholders. */
const pptxgen = require('pptxgenjs');

const C = {
  paper: 'F1EFE9', paper2: 'EAE8E2', mist: 'D6D3CB', stone: 'BBB8AE', silver: 'A6A399',
  ash: '807C73', graphite: '565347', ink: '1F1D19', vermilion: 'C15F3C', vermD: '9E4B2E'
};
const FACTOR = ['C15F3C', '5B7B7A', '8A7A4E', '7A4B52', '565347'];
const W = 13.33, H = 7.5, M = 0.66;
const PX = 1 / 96;                       // one CSS pixel, in inches
const GRAIN_PAPER = 'grain-paper.png';
const GRAIN_INK = 'grain-ink.png';

/* ---------- copy ---------- */
const EN = {
  file: 'cycling-cities-structure-en.pptx',
  disp: 'Georgia', body: 'Calibri', mono: 'JetBrains Mono',
  s1: {
    kicker: 'From cycling histories to mobility futures',
    meta: 'CYCLING CITIES  ·  TOOL 2',
    title: 'The Digital\nExperience',
    sub: 'Site structure of the working prototype',
    facts: [['CITIES', 'Minneapolis / Rotterdam'], ['SPAN', '1890s to today'],
            ['LANGUAGES', 'EN · 繁體中文 · NL'], ['BUILD', 'Prototype v2.1']],
    url: 'cycling-cities-platform.vercel.app',
    note: 'Concept prototype. 31 site records, 4 of them with verified sources.'
  },
  s2: {
    kicker: 'Screen anatomy', title: 'One screen, five regions',
    lead: 'The whole tool is a single page. Nothing navigates away: every control changes what the map shows.',
    items: [
      ['Top bar', 'Brand, the four views, search, contribute'],
      ['Map canvas', 'Leaflet with a CARTO basemap and a dated raster overlay'],
      ['Right panel', 'The working controls, in seven numbered sections'],
      ['Status notice', 'Prototype warning, linking to the full data status'],
      ['Map card', 'Legend, current city, current decade']
    ],
    wire: { top: 'TOP BAR', map: 'MAP CANVAS', panel: 'PANEL', notice: 'NOTICE', card: 'MAP CARD' },
    tour: 'A first visit opens a seven-step guided tour. The ? in the top bar reopens it at any time.'
  },
  s3: {
    kicker: 'Information architecture', title: 'Four views',
    items: [
      ['Explore map', 'One city at a time. Markers carry the decade and the analytic factor.'],
      ['Compare cities', 'Two synchronised maps side by side, held at one zoom level.'],
      ['Research stories', 'Nine narrative periods. Selecting one moves the map and the timeline.'],
      ['Data & method', 'The five-factor method, and how a record becomes verified.']
    ]
  },
  s4: {
    kicker: 'The right panel', title: 'Seven numbered sections',
    items: [
      ['City', 'Switch city, compare the two, or open the global network'],
      ['Decade', '14 steps from 1890. The 2020s run to today'],
      ['Historical overlay', 'Dated raster map, opacity, then-and-now swipe'],
      ['Five factors', 'Filter the map by the analytic factors'],
      ['Modal split', 'City-level chart, plus junction-level slots'],
      ['Site record', 'The selected record, its status and its citation'],
      ['Basemap', 'Three CARTO styles']
    ],
    rulerCap: 'The decade scrubber, section 02'
  },
  s5: {
    kicker: 'Data model', title: 'Four JSON files, no database',
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
    kicker: 'Provenance', title: 'Seven places that mark unconfirmed content',
    key: [['Verified source', true], ['Unconfirmed placeholder', false]],
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
    kicker: 'Build and delivery', title: 'Static files, served from the edge',
    flow: [['Static files', 'No build step'], ['GitHub', 'Version history'], ['Vercel', 'Production']],
    aside: ['Historical raster', 'PMTiles hosted on GitHub Pages, read with HTTP range requests, so only the tiles in view are fetched.'],
    limitsH: 'Deliberately out of scope', limitsSub: 'BUILD PLAN §7',
    limits: ['No backend', 'No database', 'No user accounts', 'No native app', 'No image embedded before rights are cleared']
  },
  s8: {
    kicker: 'Language and state', title: 'Three languages, state in the URL',
    langs: [['EN', 'English'], ['中', '繁體中文'], ['NL', 'Nederlands']],
    keys: '182 interface strings in each language',
    caveat: 'Dutch is a working translation and still needs a native reader before publication.',
    urlH: 'Any view can be linked and reopened exactly',
    url: '?lang=nl&city=rdam&d=1970',
    urlNote: 'Language, city and decade travel in the address bar, so a colleague opens the same screen you were looking at.',
    paramsH: 'What travels in the link',
    params: [['?lang=', 'en · zh · nl'], ['?city=', 'mpls · rdam'], ['?d=', '1890 … 2020']],
    tourH: 'The guided tour',
    tourParams: [['?tour=1', 'opens the seven-step tour'], ['?tour=0', 'suppresses it, for demos']]
  },
  s9: {
    kicker: 'Next', title: 'What the research team supplies',
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
  disp: 'Songti TC', body: 'PingFang TC', mono: 'JetBrains Mono',
  s1: {
    kicker: '從自行車的歷史，到移動的未來',
    meta: 'CYCLING CITIES  ·  TOOL 2',
    title: 'The Digital\nExperience',
    sub: '工作原型的網站結構',
    facts: [['CITIES', '明尼亞波利斯／鹿特丹'], ['SPAN', '1890年代至今'],
            ['LANGUAGES', 'EN · 繁體中文 · NL'], ['BUILD', '原型v2.1']],
    url: 'cycling-cities-platform.vercel.app',
    note: '概念原型。31筆站點紀錄，其中4筆出處已查證。'
  },
  s2: {
    kicker: '畫面結構', title: '一個畫面，五個區域',
    lead: '整個工具就是單一頁面。沒有任何操作會跳離：所有控制項改變的都是地圖上看到的內容。',
    items: [
      ['頂欄', '品牌、四個視圖、搜尋、投稿'],
      ['地圖區', 'Leaflet搭配CARTO底圖，以及有年份的疊圖'],
      ['右側面板', '主要控制項，分為七個編號區段'],
      ['狀態提示', '原型警語，可連到完整的資料狀態'],
      ['地圖卡片', '圖例、目前城市、目前年代']
    ],
    wire: { top: '頂欄', map: '地圖區', panel: '面板', notice: '提示', card: '地圖卡片' },
    tour: '第一次進站會開啟七個步驟的導覽，頂欄的?可隨時重新開啟。'
  },
  s3: {
    kicker: '資訊架構', title: '四個視圖',
    items: [
      ['探索地圖', '一次看一座城市。標記帶有年代與分析因素。'],
      ['雙城比較', '兩張同步的地圖並排，維持同一個縮放層級。'],
      ['研究故事', '九個敘事分期。點選其一，地圖與時間軸一起移動。'],
      ['資料與方法', '五因素方法，以及一筆紀錄如何成為已查證。']
    ]
  },
  s4: {
    kicker: '右側面板', title: '七個編號區段',
    items: [
      ['城市', '切換城市、雙城比較，或開啟全球網絡'],
      ['年代', '自1890年起共14格。2020年代一路延伸到今天'],
      ['歷史疊圖', '有年份的掃描地圖、透明度、今昔對照拉桿'],
      ['五因素', '依分析因素篩選地圖'],
      ['運具分擔', '城市層級圖表，另有路口層級欄位'],
      ['站點紀錄', '選取的紀錄、其狀態與出處'],
      ['底圖', '三種CARTO樣式']
    ],
    rulerCap: '年代滑桿，區段02'
  },
  s5: {
    kicker: '資料模型', title: '四個JSON檔，沒有資料庫',
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
    kicker: '出處標示', title: '七個標示待確認內容的位置',
    key: [['出處已查證', true], ['待確認的佔位內容', false]],
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
    kicker: '建置與部署', title: '靜態檔案，由邊緣節點供應',
    flow: [['靜態檔案', '無建置流程'], ['GitHub', '版本紀錄'], ['Vercel', '正式環境']],
    aside: ['歷史疊圖', 'PMTiles放在GitHub Pages，以HTTP range request讀取，只抓取畫面內的圖磚。'],
    limitsH: '刻意不做的範圍', limitsSub: 'BUILD PLAN §7',
    limits: ['不建置後端', '不建置資料庫', '不做使用者帳號', '不做原生App', '授權未清前不嵌入影像']
  },
  s8: {
    kicker: '語言與狀態', title: '三種語言，狀態寫在網址',
    langs: [['EN', 'English'], ['中', '繁體中文'], ['NL', 'Nederlands']],
    keys: '每種語言各182條介面字串',
    caveat: '荷蘭文為工作翻譯，發布前仍需母語者審閱。',
    urlH: '任何視角都能連結並原樣重開',
    url: '?lang=nl&city=rdam&d=1970',
    urlNote: '語言、城市與年代都寫在網址列，同事打開就是你當時看到的那個畫面。',
    paramsH: '連結裡帶著什麼',
    params: [['?lang=', 'en · zh · nl'], ['?city=', 'mpls · rdam'], ['?d=', '1890 … 2020']],
    tourH: '導覽參數',
    tourParams: [['?tour=1', '開啟七個步驟的導覽'], ['?tour=0', '抑制導覽，方便展示']]
  },
  s9: {
    kicker: '下一步', title: '需要研究團隊提供的內容',
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

/* ---------- components lifted from styles.css ---------- */

/* .grain::before over --paper / --ink */
function sheet(p, dark) {
  const s = p.addSlide();
  s.background = { path: dark ? GRAIN_INK : GRAIN_PAPER };
  return s;
}
/* a 1px rule, the site's only divider */
function hair(s, x, y, w, color) {
  s.addShape('rect', { x, y, w, h: PX, fill: { color: color || C.mist } });
}
/* .head-en: italic display face in vermilion, above the title */
function kicker(s, L, x, y, text) {
  s.addText(text, { x, y, w: W - x - M, h: 0.28, margin: 0, fontFace: L.disp,
    italic: true, fontSize: 14, color: C.vermilion });
}
/* .panel-head + ::before: the title, a full-width 1px ink rule, and a 48px
   vermilion bar sitting on its left end */
function head(s, L, text, dark) {
  kicker(s, L, M, 0.5, text.kicker);
  s.addText(text.title, { x: M, y: 0.82, w: W - M * 2, h: 0.7, margin: 0,
    fontFace: L.disp, fontSize: 33, bold: true, color: dark ? C.paper : C.ink });
  const y = 1.56;
  hair(s, M, y, W - M * 2, dark ? C.graphite : C.ink);
  s.addShape('rect', { x: M, y: y - 0.015, w: 0.5, h: 0.031, fill: { color: C.vermilion } });
}
/* .section-label: mono number, display label, then a hairline running to the right */
function sectionLabel(s, L, x, y, w, num, txt, dark) {
  s.addText(num, { x, y: y - 0.02, w: 0.3, h: 0.24, margin: 0, fontFace: L.mono,
    fontSize: 9, color: C.vermilion, valign: 'middle' });
  s.addText(txt, { x: x + 0.32, y: y - 0.06, w: 2.1, h: 0.3, margin: 0, fontFace: L.disp,
    fontSize: 14, bold: true, color: dark ? C.paper : C.ink, valign: 'middle' });
  hair(s, x + 2.5, y + 0.09, w - 2.5, dark ? C.graphite : C.mist);
}
/* mono metadata: uppercase, widely tracked, the site's label voice */
function label(s, L, x, y, w, text, color, size) {
  s.addText(text, { x, y, w, h: 0.22, margin: 0, fontFace: L.mono, fontSize: size || 8.5,
    charSpacing: 1.6, color: color || C.ash });
}
/* the map markers: solid = verified, hollow dashed = placeholder */
function marker(s, x, y, solid, color) {
  const c = color || C.vermilion;
  s.addShape('ellipse', solid
    ? { x, y, w: 0.15, h: 0.15, fill: { color: c }, line: { color: C.paper, width: 1.25 } }
    : { x, y, w: 0.15, h: 0.15, fill: { color: C.paper }, line: { color: c, width: 1.25, dashType: 'dash' } });
}
/* .year-ticks: the decade scrubber */
function ruler(s, L, x, y, w) {
  const n = 14, step = w / (n - 1);
  for (let i = 0; i < n; i++) {
    const major = i % 3 === 0 || i === n - 1;
    const last = i === n - 1;
    s.addShape('rect', {
      x: x + i * step, y: y + (major ? 0 : 0.09), w: last ? 0.022 : PX * 1.2,
      h: last ? 0.26 : (major ? 0.2 : 0.09),
      fill: { color: last ? C.vermilion : major ? C.ash : C.stone }
    });
  }
  hair(s, x, y + 0.26, w, C.stone);
  [[0, '1890'], [3, '1920'], [6, '1950'], [9, '1980'], [13, '2020s']].forEach(([i, t]) => {
    s.addText(t, { x: x + i * step - 0.3, y: y + 0.31, w: 0.6, h: 0.2, margin: 0,
      fontFace: L.mono, fontSize: 8, color: i === 13 ? C.vermilion : C.silver, align: 'center' });
  });
}

/* ---------- slides ---------- */

function slide1(p, L) {
  const s = sheet(p, true);
  const d = L.s1;
  kicker(s, L, M, 1.42, d.kicker);
  label(s, L, M, 1.8, 6, d.meta, C.stone, 9);

  s.addText(d.title, { x: M, y: 2.16, w: 7.2, h: 2.1, margin: 0, fontFace: L.disp,
    fontSize: 52, bold: true, color: C.paper, lineSpacing: 56 });
  hair(s, M, 4.42, 7.0, C.graphite);
  s.addShape('rect', { x: M, y: 4.405, w: 0.5, h: 0.031, fill: { color: C.vermilion } });
  s.addText(d.sub, { x: M, y: 4.62, w: 7.0, h: 0.34, margin: 0, fontFace: L.body,
    fontSize: 15, color: C.stone });

  d.facts.forEach((f, i) => {
    const x = M + (i % 2) * 3.6, y = 5.24 + Math.floor(i / 2) * 0.62;
    label(s, L, x, y, 3.4, f[0], C.ash, 8);
    s.addText(f[1], { x, y: y + 0.2, w: 3.4, h: 0.26, margin: 0, fontFace: L.body,
      fontSize: 12, color: C.paper });
  });
  s.addText(d.url, { x: M, y: 6.56, w: 7.0, h: 0.26, margin: 0, fontFace: L.mono,
    fontSize: 11, color: C.vermilion });
  s.addText(d.note, { x: M, y: 6.88, w: 7.0, h: 0.26, margin: 0, fontFace: L.body,
    fontSize: 10.5, color: C.ash });

  /* the app itself, drawn to scale: a light CARTO map under a dark top bar,
     with the seven-section panel down the right edge */
  const bx = 8.62, by = 1.42, bw = 4.05, bh = 5.7;
  s.addShape('rect', { x: bx, y: by, w: bw, h: bh, fill: { color: C.paper2 }, line: { color: C.graphite, width: 1 } });
  s.addShape('rect', { x: bx, y: by, w: bw, h: 0.4, fill: { color: C.ink } });
  s.addShape('ellipse', { x: bx + 0.13, y: by + 0.11, w: 0.18, h: 0.18, fill: { color: C.ink }, line: { color: C.vermilion, width: 1 } });
  s.addText('Cycling Cities', { x: bx + 0.38, y: by + 0.08, w: 1.6, h: 0.24, margin: 0,
    fontFace: L.disp, fontSize: 9.5, color: C.paper, valign: 'middle' });
  ['Map', 'Compare', 'Stories'].forEach((t, i) =>
    s.addText(t, { x: bx + 1.72 + i * 0.62, y: by + 0.09, w: 0.6, h: 0.22, margin: 0,
      fontFace: L.mono, fontSize: 5.5, color: i === 0 ? C.paper : C.silver, valign: 'middle' }));

  const px = bx + bw - 1.55, pw = 1.4, pt = by + 0.55, pb = by + bh - 0.16;
  const ix = px + 0.11, iw = pw - 0.22;
  /* markers over the light map, solid where a source is verified */
  [[0.42, 1.1, 1], [1.0, 1.9, 0], [0.55, 2.75, 0], [1.5, 3.4, 1], [0.85, 4.2, 0],
   [1.75, 2.3, 0], [1.15, 4.9, 0]].forEach(([dx, dy, solid]) => marker(s, bx + dx, by + dy, !!solid));
  s.addShape('rect', { x: bx + 0.18, y: by + bh - 1.0, w: 1.9, h: 0.82, fill: { color: C.paper }, line: { color: C.stone, width: 1 } });
  s.addText('CURRENT VIEW', { x: bx + 0.29, y: by + bh - 0.9, w: 1.7, h: 0.16, margin: 0,
    fontFace: L.mono, fontSize: 5, charSpacing: 1, color: C.ash });
  s.addText('Minneapolis', { x: bx + 0.29, y: by + bh - 0.72, w: 1.7, h: 0.24, margin: 0,
    fontFace: L.disp, fontSize: 11, bold: true, color: C.ink });

  s.addShape('rect', { x: px, y: pt, w: pw, h: pb - pt, fill: { color: C.paper }, line: { color: C.stone, width: 1 } });
  const row = (y, txt) => {
    s.addText(txt, { x: ix, y, w: iw, h: 0.17, margin: 0, fontFace: L.mono, fontSize: 5.5, color: C.vermilion });
  };
  row(pt + 0.12, '01  CITY');
  s.addShape('rect', { x: ix, y: pt + 0.32, w: iw, h: 0.2, fill: { color: C.paper2 }, line: { color: C.vermilion, width: 1 } });
  row(pt + 0.62, '02  DECADE');
  s.addText('1890', { x: ix, y: pt + 0.8, w: iw, h: 0.3, margin: 0, fontFace: L.mono, fontSize: 16, color: C.ink });
  s.addShape('rect', { x: ix, y: pt + 1.18, w: iw, h: 0.026, fill: { color: C.mist } });
  s.addShape('ellipse', { x: ix - 0.04, y: pt + 1.13, w: 0.12, h: 0.12, fill: { color: C.vermilion } });
  for (let i = 0; i < 14; i++) {
    const step = iw / 13, major = i % 3 === 0 || i === 13;
    s.addShape('rect', { x: ix + i * step, y: pt + 1.32, w: PX * 1.2, h: major ? 0.08 : 0.04,
      fill: { color: major ? C.ash : C.stone } });
  }
  row(pt + 1.56, '03  OVERLAY');
  s.addShape('rect', { x: ix, y: pt + 1.74, w: iw, h: 0.2, fill: { color: C.paper2 }, line: { color: C.mist, width: 1 } });
  row(pt + 2.04, '04  FIVE FACTORS');
  FACTOR.forEach((c, i) => {
    const y = pt + 2.24 + i * 0.28;
    s.addShape('rect', { x: ix, y, w: iw, h: 0.21, fill: { color: C.paper2 }, line: { color: C.mist, width: 1 } });
    s.addShape('rect', { x: ix + 0.07, y: y + 0.075, w: 0.06, h: 0.06, fill: { color: c } });
  });
  row(pt + 3.72, '05  MODAL SPLIT');
  s.addShape('rect', { x: ix, y: pt + 3.9, w: iw, h: 0.5, fill: { color: C.paper2 }, line: { color: C.mist, width: 1 } });
  [0.34, 0.22, 0.14, 0.4].forEach((frac, i) => {
    const bwid = iw / 4 - 0.03;
    s.addShape('rect', { x: ix + 0.02 + i * (bwid + 0.03), y: pt + 4.36 - frac, w: bwid, h: frac,
      fill: { color: FACTOR[i === 3 ? 4 : i] } });
  });
  return s;
}

function slide2(p, L) {
  const s = sheet(p);
  const d = L.s2;
  head(s, L, d);
  s.addText(d.lead, { x: M, y: 1.76, w: 11.6, h: 0.34, margin: 0, fontFace: L.body,
    fontSize: 12.5, color: C.graphite });

  const bx = M, by = 2.32, bw = 6.4, bh = 3.86;
  s.addShape('rect', { x: bx, y: by, w: bw, h: bh, fill: { color: C.paper2 }, line: { color: C.stone, width: 1 } });
  s.addShape('rect', { x: bx, y: by, w: bw, h: 0.42, fill: { color: C.ink } });
  s.addText(d.wire.top, { x: bx + 0.15, y: by + 0.04, w: 3, h: 0.34, margin: 0,
    fontFace: L.mono, fontSize: 8, charSpacing: 1.4, color: C.paper, valign: 'middle' });
  s.addText(d.wire.map, { x: bx + 1.55, y: by + 1.8, w: 2.4, h: 0.3, margin: 0,
    fontFace: L.mono, fontSize: 9, charSpacing: 1.4, color: C.silver, align: 'center' });
  [[0.7, 1.15, 1], [1.5, 2.2, 0], [2.6, 1.5, 0], [3.15, 2.65, 0], [1.9, 3.1, 1], [3.7, 3.35, 0]]
    .forEach(([dx, dy, solid]) => marker(s, bx + dx, by + dy, !!solid));

  const px = bx + bw - 1.94, pw = 1.76;
  s.addShape('rect', { x: px, y: by + 0.62, w: pw, h: bh - 0.9, fill: { color: C.paper }, line: { color: C.stone, width: 1 } });
  s.addText(d.wire.panel, { x: px, y: by + 0.74, w: pw, h: 0.24, margin: 0,
    fontFace: L.mono, fontSize: 8, charSpacing: 1.4, color: C.ink, align: 'center' });
  hair(s, px + 0.14, by + 1.04, pw - 0.28, C.ink);
  s.addShape('rect', { x: px + 0.14, y: by + 1.026, w: 0.34, h: 0.028, fill: { color: C.vermilion } });
  [1.24, 1.62, 2.0, 2.38, 2.76].forEach((dy, i) =>
    s.addShape('rect', { x: px + 0.14, y: by + dy, w: pw - 0.28, h: 0.22,
      fill: { color: i === 0 ? C.paper2 : C.paper }, line: { color: i === 0 ? C.vermilion : C.mist, width: 1 } }));

  s.addShape('rect', { x: bx + 0.34, y: by + 0.66, w: 2.34, h: 0.56, fill: { color: C.paper2 }, line: { color: C.stone, width: 1 } });
  s.addShape('rect', { x: bx + 0.34, y: by + 0.66, w: 0.031, h: 0.56, fill: { color: C.vermilion } });
  s.addText(d.wire.notice, { x: bx + 0.44, y: by + 0.66, w: 2.2, h: 0.56, margin: 0,
    fontFace: L.mono, fontSize: 8, charSpacing: 1.4, color: C.vermilion, align: 'center', valign: 'middle' });
  s.addShape('rect', { x: bx + 0.26, y: by + bh - 1.02, w: 2.2, h: 0.78, fill: { color: C.paper }, line: { color: C.stone, width: 1 } });
  s.addText(d.wire.card, { x: bx + 0.26, y: by + bh - 1.02, w: 2.2, h: 0.78, margin: 0,
    fontFace: L.mono, fontSize: 8, charSpacing: 1.4, color: C.graphite, align: 'center', valign: 'middle' });

  let y = 2.36;
  d.items.forEach((it, i) => {
    sectionLabel(s, L, 7.42, y, 5.25, String(i + 1).padStart(2, '0'), it[0]);
    s.addText(it[1], { x: 7.74, y: y + 0.26, w: 4.9, h: 0.38, margin: 0, fontFace: L.body,
      fontSize: 11.5, color: C.graphite });
    y += 0.76;
  });
  hair(s, 7.42, 6.24, 5.25, C.mist);
  s.addText(d.tour, { x: 7.42, y: 6.4, w: 5.25, h: 0.5, margin: 0, fontFace: L.body,
    fontSize: 11, color: C.ash, lineSpacing: 17 });
  return s;
}

function slide3(p, L) {
  const s = sheet(p);
  head(s, L, L.s3);
  const cw = 5.9, ch = 2.24;
  L.s3.items.forEach((it, i) => {
    const x = M + (i % 2) * (cw + 0.21);
    const y = 1.96 + Math.floor(i / 2) * (ch + 0.24);
    s.addShape('rect', { x, y, w: cw, h: ch, fill: { color: C.paper2 }, line: { color: C.mist, width: 1 } });
    sectionLabel(s, L, x + 0.36, y + 0.4, cw - 0.72, String(i + 1).padStart(2, '0'), '');
    s.addShape('ellipse', { x: x + 0.36, y: y + 0.86, w: 0.13, h: 0.13, fill: { color: FACTOR[i] } });
    s.addText(it[0], { x: x + 0.62, y: y + 0.74, w: cw - 1.0, h: 0.38, margin: 0,
      fontFace: L.disp, fontSize: 19, bold: true, color: C.ink });
    s.addText(it[1], { x: x + 0.36, y: y + 1.24, w: cw - 0.72, h: 0.72, margin: 0,
      fontFace: L.body, fontSize: 12, color: C.graphite, lineSpacing: 19 });
  });
  return s;
}

function slide4(p, L) {
  const s = sheet(p);
  head(s, L, L.s4);
  L.s4.items.forEach((it, i) => {
    const col = i < 4 ? 0 : 1, row = i < 4 ? i : i - 4;
    const x = M + col * 6.11, y = 1.98 + row * 1.06, w = 5.9;
    sectionLabel(s, L, x, y, w, String(i + 1).padStart(2, '0'), it[0]);
    s.addText(it[1], { x: x + 0.32, y: y + 0.3, w: w - 0.32, h: 0.5, margin: 0,
      fontFace: L.body, fontSize: 11.5, color: C.graphite });
  });
  const rx = M + 6.11, ry = 5.3;
  ruler(s, L, rx, ry, 5.5);
  s.addText(L.s4.rulerCap, { x: rx, y: ry + 0.62, w: 5.5, h: 0.24, margin: 0,
    fontFace: L.body, italic: true, fontSize: 11, color: C.ash });
  return s;
}

function slide5(p, L) {
  const s = sheet(p);
  const d = L.s5;
  head(s, L, d);
  let y = 1.98;
  d.files.forEach(f => {
    s.addShape('rect', { x: M, y, w: 6.24, h: 0.92, fill: { color: C.paper2 }, line: { color: C.mist, width: 1 } });
    s.addText(f[0], { x: M + 0.3, y: y + 0.13, w: 5.6, h: 0.28, margin: 0,
      fontFace: L.mono, fontSize: 12, color: C.vermilion });
    s.addText(f[1], { x: M + 0.3, y: y + 0.44, w: 5.6, h: 0.36, margin: 0,
      fontFace: L.body, fontSize: 11.5, color: C.graphite });
    y += 1.04;
  });

  s.addChart('bar', [
    { name: d.ser[0], labels: [d.cat], values: [4] },
    { name: d.ser[1], labels: [d.cat], values: [27] }
  ], {
    x: 7.24, y: 1.9, w: 5.43, h: 2.42,
    barDir: 'bar', barGrouping: 'stacked',
    showTitle: true, title: d.chartTitle, titleFontFace: L.disp, titleFontSize: 13, titleColor: C.ink,
    chartColors: [C.graphite, C.vermilion],
    showValue: true, dataLabelPosition: 'ctr', dataLabelColor: C.paper,
    dataLabelFontFace: L.mono, dataLabelFontSize: 12,
    showLegend: true, legendPos: 'b', legendFontFace: L.body, legendFontSize: 10, legendColor: C.graphite,
    catAxisLabelColor: C.ash, catAxisLabelFontFace: L.mono, catAxisLabelFontSize: 9,
    valAxisLabelColor: C.silver, valAxisLabelFontFace: L.mono, valAxisLabelFontSize: 9,
    valGridLine: { color: C.mist, size: 1 }, catGridLine: { style: 'none' },
    chartArea: { fill: { color: C.paper } }, plotArea: { fill: { color: C.paper } }
  });

  s.addShape('rect', { x: 7.24, y: 4.62, w: 5.43, h: 1.62, fill: { color: C.ink } });
  s.addShape('rect', { x: 7.24, y: 4.62, w: 0.031, h: 1.62, fill: { color: C.vermilion } });
  s.addText(d.note, { x: 7.54, y: 4.86, w: 4.85, h: 1.16, margin: 0, fontFace: L.body,
    fontSize: 12, color: C.paper, lineSpacing: 19 });
  return s;
}

function slide6(p, L) {
  const s = sheet(p);
  const d = L.s6;
  head(s, L, d);
  d.key.forEach((k, i) => {
    const x = M + i * 3.3;
    marker(s, x, 1.82, k[1]);
    s.addText(k[0], { x: x + 0.24, y: 1.78, w: 3.0, h: 0.24, margin: 0, fontFace: L.mono,
      fontSize: 8.5, charSpacing: 1.4, color: k[1] ? C.graphite : C.vermilion, valign: 'middle' });
  });
  hair(s, M, 2.24, W - M * 2, C.mist);

  d.items.forEach((it, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = M + col * 6.11, y = 2.52 + row * 1.06, w = 5.9;
    sectionLabel(s, L, x, y, w, String(i + 1).padStart(2, '0'), it[0]);
    s.addText(it[1], { x: x + 0.32, y: y + 0.3, w: w - 0.32, h: 0.5, margin: 0,
      fontFace: L.body, fontSize: 11.5, color: C.graphite });
  });
  return s;
}

function slide7(p, L) {
  const s = sheet(p);
  const d = L.s7;
  head(s, L, d);
  const bw = 3.5, bh = 1.44;
  d.flow.forEach((f, i) => {
    const x = M + i * (bw + 0.72);
    const dark = i === 2;
    s.addShape('rect', { x, y: 2.0, w: bw, h: bh, fill: { color: dark ? C.ink : C.paper2 }, line: { color: dark ? C.ink : C.stone, width: 1 } });
    label(s, L, x + 0.26, 2.24, bw - 0.52, String(i + 1).padStart(2, '0'), dark ? C.vermilion : C.vermilion, 8);
    s.addText(f[0], { x: x + 0.26, y: 2.48, w: bw - 0.52, h: 0.38, margin: 0,
      fontFace: L.disp, fontSize: 18, bold: true, color: dark ? C.paper : C.ink });
    s.addText(f[1], { x: x + 0.26, y: 2.9, w: bw - 0.52, h: 0.3, margin: 0,
      fontFace: L.body, fontSize: 11.5, color: dark ? C.stone : C.ash });
    if (i < 2) {
      s.addShape('rect', { x: x + bw + 0.18, y: 2.7, w: 0.24, h: 0.028, fill: { color: C.vermilion } });
      s.addShape('triangle', { x: x + bw + 0.4, y: 2.6, w: 0.18, h: 0.23, fill: { color: C.vermilion }, rotate: 90 });
    }
  });

  s.addShape('rect', { x: M, y: 3.9, w: 6.24, h: 1.58, fill: { color: C.paper2 }, line: { color: C.mist, width: 1 } });
  s.addShape('rect', { x: M, y: 3.9, w: 0.031, h: 1.58, fill: { color: C.vermilion } });
  s.addText(d.aside[0], { x: M + 0.3, y: 4.1, w: 5.6, h: 0.3, margin: 0,
    fontFace: L.disp, fontSize: 14, bold: true, color: C.vermilion });
  s.addText(d.aside[1], { x: M + 0.3, y: 4.44, w: 5.6, h: 0.9, margin: 0,
    fontFace: L.body, fontSize: 11.5, color: C.graphite, lineSpacing: 18 });

  const lx = 7.24;
  s.addText(d.limitsH, { x: lx, y: 3.9, w: 5.43, h: 0.32, margin: 0,
    fontFace: L.disp, fontSize: 15, bold: true, color: C.ink });
  label(s, L, lx, 4.24, 5.43, d.limitsSub, C.silver, 8);
  hair(s, lx, 4.5, 5.43, C.mist);
  d.limits.forEach((t, i) => {
    const y = 4.66 + i * 0.36;
    s.addShape('rect', { x: lx, y: y + 0.08, w: 0.09, h: 0.09, fill: { color: C.stone } });
    s.addText(t, { x: lx + 0.24, y: y, w: 5.19, h: 0.28, margin: 0, fontFace: L.body,
      fontSize: 12, color: C.graphite });
  });
  return s;
}

function slide8(p, L) {
  const s = sheet(p);
  const d = L.s8;
  head(s, L, d);
  /* .lang-switch: three square chips, the active one outlined in vermilion */
  d.langs.forEach((lg, i) => {
    const x = M + i * 2.06, on = i === 0;
    s.addShape('rect', { x, y: 2.0, w: 1.82, h: 1.28, fill: { color: on ? C.paper2 : C.paper }, line: { color: on ? C.vermilion : C.stone, width: 1 } });
    s.addText(lg[0], { x, y: 2.2, w: 1.82, h: 0.46, margin: 0, fontFace: L.mono,
      fontSize: 22, color: on ? C.vermilion : C.ink, align: 'center' });
    s.addText(lg[1], { x, y: 2.72, w: 1.82, h: 0.3, margin: 0, fontFace: L.body,
      fontSize: 11, color: C.ash, align: 'center' });
  });
  s.addText(d.keys, { x: M, y: 3.5, w: 6.1, h: 0.32, margin: 0, fontFace: L.disp,
    fontSize: 16, bold: true, color: C.ink });
  hair(s, M, 3.92, 6.1, C.mist);
  s.addText(d.caveat, { x: M, y: 4.08, w: 6.1, h: 0.7, margin: 0, fontFace: L.body,
    fontSize: 12, color: C.graphite, lineSpacing: 19 });

  s.addText(d.paramsH, { x: M, y: 5.0, w: 6.1, h: 0.3, margin: 0, fontFace: L.disp,
    fontSize: 15, bold: true, color: C.ink });
  d.params.forEach((pr, i) => {
    const y = 5.44 + i * 0.5;
    hair(s, M, y - 0.12, 6.1, C.mist);
    s.addText(pr[0], { x: M, y, w: 1.3, h: 0.26, margin: 0, fontFace: L.mono,
      fontSize: 12, color: C.vermilion });
    s.addText(pr[1], { x: M + 1.4, y, w: 4.7, h: 0.26, margin: 0, fontFace: L.mono,
      fontSize: 11, color: C.graphite });
  });
  hair(s, M, 6.82, 6.1, C.mist);

  s.addShape('rect', { x: 7.24, y: 2.0, w: 5.43, h: 4.94, fill: { color: C.ink } });
  s.addText(d.urlH, { x: 7.54, y: 2.28, w: 4.85, h: 0.36, margin: 0, fontFace: L.disp,
    fontSize: 15, bold: true, color: C.paper });
  hair(s, 7.54, 2.76, 4.85, C.graphite);
  s.addShape('rect', { x: 7.54, y: 2.94, w: 4.85, h: 0.6, fill: { color: '2C2A24' }, line: { color: C.graphite, width: 1 } });
  s.addText(d.url, { x: 7.54, y: 2.94, w: 4.85, h: 0.6, margin: 0, fontFace: L.mono,
    fontSize: 12, color: C.vermilion, align: 'center', valign: 'middle' });
  s.addText(d.urlNote, { x: 7.54, y: 3.74, w: 4.85, h: 1.1, margin: 0, fontFace: L.body,
    fontSize: 11.5, color: C.stone, lineSpacing: 19 });
  hair(s, 7.54, 5.06, 4.85, C.graphite);
  s.addText(d.tourH, { x: 7.54, y: 5.26, w: 4.85, h: 0.28, margin: 0, fontFace: L.disp,
    fontSize: 13, bold: true, color: C.paper });
  d.tourParams.forEach((pr, i) => {
    const y = 5.68 + i * 0.46;
    s.addText(pr[0], { x: 7.54, y, w: 1.3, h: 0.24, margin: 0, fontFace: L.mono,
      fontSize: 11, color: C.vermilion });
    s.addText(pr[1], { x: 8.94, y, w: 3.45, h: 0.24, margin: 0, fontFace: L.body,
      fontSize: 11.5, color: C.stone });
  });
  return s;
}

function slide9(p, L) {
  const s = sheet(p, true);
  const d = L.s9;
  head(s, L, d, true);
  d.items.forEach((t, i) => {
    const y = 2.02 + i * 0.88;
    s.addText(String(i + 1).padStart(2, '0'), { x: M, y, w: 0.34, h: 0.5, margin: 0,
      fontFace: L.mono, fontSize: 10, color: C.vermilion, valign: 'middle' });
    s.addText(t, { x: M + 0.42, y, w: 5.48, h: 0.5, margin: 0, fontFace: L.body,
      fontSize: 12.5, color: C.paper, valign: 'middle', lineSpacing: 19 });
    hair(s, M, y + 0.66, 5.9, C.graphite);
  });

  s.addShape('rect', { x: 7.24, y: 1.96, w: 5.43, h: 4.36, fill: { color: '2C2A24' }, line: { color: C.graphite, width: 1 } });
  s.addShape('rect', { x: 7.24, y: 1.96, w: 0.031, h: 4.36, fill: { color: C.vermilion } });
  s.addText(d.decideH, { x: 7.56, y: 2.24, w: 4.83, h: 0.34, margin: 0, fontFace: L.disp,
    fontSize: 16, bold: true, color: C.vermilion });
  hair(s, 7.56, 2.72, 4.83, C.graphite);
  d.decide.forEach((t, i) => {
    const y = 3.02 + i * 1.56;
    s.addText(String(i + 1).padStart(2, '0'), { x: 7.56, y, w: 0.34, h: 0.24, margin: 0,
      fontFace: L.mono, fontSize: 9.5, color: C.vermilion });
    s.addText(t, { x: 7.98, y: y - 0.02, w: 4.41, h: 1.06, margin: 0, fontFace: L.body,
      fontSize: 12, color: C.paper, lineSpacing: 20 });
    if (i === 0) hair(s, 7.56, y + 1.2, 4.83, C.graphite);
  });
  return s;
}

function build(L) {
  const p = new pptxgen();
  p.layout = 'LAYOUT_WIDE';
  p.author = 'Cycling Cities Tool 2';
  p.title = 'Cycling Cities Tool 2: The Digital Experience';
  [slide1, slide2, slide3, slide4, slide5, slide6, slide7, slide8, slide9]
    .forEach(fn => fn(p, L));
  return p.writeFile({ fileName: L.file });
}

build(EN).then(f => console.log('wrote', f)).then(() => build(ZH)).then(f => console.log('wrote', f));
