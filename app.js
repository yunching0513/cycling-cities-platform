/* Cycling Cities concept prototype — all map records below are interface demo data. */

const CITY_DATA = {
  minneapolis: {
    name: "明尼亞波利斯",
    en: "Minneapolis",
    center: [44.9778, -93.265],
    zoom: 13,
    color: "#3158d4",
    eras: [
      { from: 1920, score: 31, note: "公園道連結城市生活" },
      { from: 1945, score: 27, note: "戰後機動化快速發展" },
      { from: 1965, score: 21, note: "高速道路重組城市空間" },
      { from: 1980, score: 36, note: "倡議與步道網絡出現" },
      { from: 2000, score: 55, note: "通勤路網逐步連接" },
      { from: 2010, score: 68, note: "共享與保護型設施擴張" },
    ],
  },
  rotterdam: {
    name: "鹿特丹",
    en: "Rotterdam",
    center: [51.9244, 4.4777],
    zoom: 13,
    color: "#d5624b",
    eras: [
      { from: 1920, score: 44, note: "港市日常高度依賴自行車" },
      { from: 1945, score: 39, note: "戰後重建改寫街道尺度" },
      { from: 1960, score: 30, note: "汽車導向規劃占據中心" },
      { from: 1975, score: 46, note: "街道安全進入公共議程" },
      { from: 1995, score: 65, note: "區域自行車網絡整合" },
      { from: 2010, score: 78, note: "車站與都市路網再連結" },
    ],
  },
};

const NETWORK_CITIES = [
  ["Minneapolis", 44.9778, -93.265], ["Rotterdam", 51.9244, 4.4777],
  ["Lisbon", 38.7223, -9.1393], ["Budapest", 47.4979, 19.0402],
  ["Bogotá", 4.711, -74.0721], ["Johannesburg", -26.2041, 28.0473],
  ["Cork", 51.8985, -8.4756], ["Munich", 48.1351, 11.582],
  ["Nairobi", -1.2921, 36.8219], ["Milan", 45.4642, 9.19],
  ["Dar es Salaam", -6.7924, 39.2083], ["Tehran", 35.6892, 51.389],
];

const FACTORS = {
  urban: { label: "城市型態", color: "#3158d4", number: "01" },
  alternatives: { label: "移動替代方案", color: "#d5624b", number: "02" },
  policy: { label: "政策與治理", color: "#008878", number: "03" },
  movement: { label: "社會運動", color: "#e0a129", number: "04" },
  culture: { label: "文化地位", color: "#a34989", number: "05" },
};

const EVENTS = [
  { id: "mpls-1926", city: "minneapolis", year: 1926, factor: "urban", lat: 44.976, lng: -93.313, title: "公園道塑造移動半徑", excerpt: "湖區、公園道與住宅街廓的關係，形成休閒與日常騎乘可以交會的城市地景。", source: "Peter Bird 的 Minneapolis 研究（待接入）", sourceType: "map" },
  { id: "mpls-1934", city: "minneapolis", year: 1934, factor: "culture", lat: 44.981, lng: -93.277, title: "自行車的日常與休閒形象", excerpt: "自行車在通勤、兒童活動與休閒文化之間具有多重意義，但並非所有使用者都被同等記錄。", source: "地方報刊與歷史影像（待考證）", sourceType: "image" },
  { id: "mpls-1956", city: "minneapolis", year: 1956, factor: "alternatives", lat: 44.968, lng: -93.248, title: "戰後汽車化改變選擇", excerpt: "汽車、巴士與道路建設重組移動成本，自行車在交通規劃中的位置逐漸縮小。", source: "都市交通統計與計畫（待接入）", sourceType: "data" },
  { id: "mpls-1968", city: "minneapolis", year: 1968, factor: "policy", lat: 44.948, lng: -93.27, title: "快速道路切開城市", excerpt: "速度與區域通行效率成為規劃主軸，也改變了社區之間的步行與騎乘連續性。", source: "道路工程與都市更新檔案（待考證）", sourceType: "document" },
  { id: "mpls-1978", city: "minneapolis", year: 1978, factor: "movement", lat: 44.955, lng: -93.295, title: "騎乘者開始要求空間", excerpt: "能源、環境與街道安全的公共辯論，讓自行車重新成為城市政策議題。", source: "倡議團體與地方報刊（待接入）", sourceType: "audio" },
  { id: "mpls-1997", city: "minneapolis", year: 1997, factor: "urban", lat: 44.985, lng: -93.246, title: "步道逐步連成網絡", excerpt: "河岸、鐵道廊帶與街道路線的接續，使休閒設施逐步具備日常交通功能。", source: "自行車與步道計畫（待接入）", sourceType: "map" },
  { id: "mpls-2010", city: "minneapolis", year: 2010, factor: "culture", lat: 44.974, lng: -93.266, title: "共享自行車提高可見度", excerpt: "公共共享服務讓短程騎乘更容易被看見，也把使用公平與服務範圍帶進討論。", source: "共享自行車計畫資料（待接入）", sourceType: "data" },
  { id: "mpls-2022", city: "minneapolis", year: 2022, factor: "policy", lat: 44.991, lng: -93.258, title: "從路線走向完整網絡", excerpt: "政策逐漸把安全、冬季維護與不同社區的可達性放進同一套網絡思考。", source: "現行交通政策與開放資料（待接入）", sourceType: "document" },

  { id: "rtm-1925", city: "rotterdam", year: 1925, factor: "urban", lat: 51.918, lng: 4.486, title: "港市中的日常騎乘", excerpt: "港口、住宅與工作地點的空間關係，使自行車成為大量日常移動的重要工具。", source: "Rotterdam 比較研究資料（待接入）", sourceType: "book" },
  { id: "rtm-1938", city: "rotterdam", year: 1938, factor: "alternatives", lat: 51.927, lng: 4.468, title: "自行車與電車的城市", excerpt: "自行車、步行與公共運輸共同支撐密集的港市生活，形成不同於汽車城市的移動組合。", source: "城市交通統計（示範欄位）", sourceType: "data" },
  { id: "rtm-1946", city: "rotterdam", year: 1946, factor: "policy", lat: 51.921, lng: 4.475, title: "重建計畫重畫中心", excerpt: "戰後重建不只改變建築，也重新決定道路尺度、城市機能與各種運具的位置。", source: "Rotterdam 重建計畫與城市檔案（待接入）", sourceType: "document" },
  { id: "rtm-1964", city: "rotterdam", year: 1964, factor: "policy", lat: 51.91, lng: 4.472, title: "汽車導向的現代港市", excerpt: "寬闊道路與區域交通效率成為現代化象徵，自行車在城市中心面臨新的空間壓力。", source: "道路與都市計畫檔案（待考證）", sourceType: "image" },
  { id: "rtm-1975", city: "rotterdam", year: 1975, factor: "movement", lat: 51.933, lng: 4.494, title: "安全街道成為公共問題", excerpt: "交通安全與生活品質的訴求，逐步挑戰汽車效率作為唯一規劃尺度。", source: "公民行動與地方報刊（待接入）", sourceType: "audio" },
  { id: "rtm-1994", city: "rotterdam", year: 1994, factor: "urban", lat: 51.916, lng: 4.455, title: "區域自行車網絡接續", excerpt: "跨河、車站與住宅區之間的路網整合，讓自行車重新成為日常交通系統的一部分。", source: "區域自行車網絡資料（待接入）", sourceType: "map" },
  { id: "rtm-2014", city: "rotterdam", year: 2014, factor: "alternatives", lat: 51.924, lng: 4.469, title: "中央車站整合多種運具", excerpt: "自行車停放、鐵路與都市街道的接續，顯示多模態交通如何改變車站的城市角色。", source: "Rotterdam Centraal 計畫資料（待接入）", sourceType: "image" },
  { id: "rtm-2021", city: "rotterdam", year: 2021, factor: "culture", lat: 51.929, lng: 4.51, title: "永續移動成為城市轉型語彙", excerpt: "氣候韌性、健康與公共空間，使自行車從單一運具轉向更廣泛的城市轉型議題。", source: "永續移動政策資料（待接入）", sourceType: "document" },
];

const STORY_BY_ERA = [
  { from: 1920, to: 1944, factor: "urban", title: "日常半徑正在改變", body: "自行車把步行可及的城市放大了。工作、購物與社交的距離開始被重新定義，也改變了街道使用權的想像。", era: "自行車成為城市日常" },
  { from: 1945, to: 1959, factor: "alternatives", title: "戰後城市重新移動", body: "自行車、公車與步行共同承擔高密度的日常移動；不同運具之間的競合，開始形塑下一階段的道路選擇。", era: "戰後重建與運具競合" },
  { from: 1960, to: 1974, factor: "policy", title: "速度重畫了街道", body: "以汽車流量與效率為核心的工程規劃逐漸成為主流。自行車沒有消失，卻在政策、統計與道路空間中被推向邊緣。", era: "汽車化與交通分離" },
  { from: 1975, to: 1994, factor: "movement", title: "誰有權使用街道？", body: "交通安全、兒童與生活環境將道路問題帶回公共辯論。社會運動證明，城市移動並非只能沿著既定路徑前進。", era: "公民行動與街道轉向" },
  { from: 1995, to: 2008, factor: "urban", title: "從單一路段到網絡", body: "自行車設施逐步被視為網絡問題：連續性、節點接續與跨區可達性，決定一條自行車道是否真正有用。", era: "路網化與區域整合" },
  { from: 2009, to: 2018, factor: "culture", title: "自行車再次變得可見", body: "公共自行車、設計與城市品牌讓自行車重新進入主流視野，也引發誰能使用、為誰服務的新問題。", era: "共享服務與文化再定位" },
  { from: 2019, to: 2025, factor: "alternatives", title: "移動系統走向整合", body: "氣候、健康與公平讓自行車不再是單一運具政策，而是步行、公共運輸與公共空間轉型的一部分。", era: "多模態與永續轉型" },
];

const ROUTES = {
  minneapolis: {
    urban: [[[45.014,-93.321],[45.018,-93.263],[44.998,-93.222],[44.946,-93.224],[44.93,-93.279],[44.958,-93.323]]],
    alternatives: [[[44.996,-93.306],[44.984,-93.283],[44.971,-93.257],[44.954,-93.229]]],
    policy: [[[45.004,-93.285],[44.988,-93.275],[44.971,-93.263],[44.949,-93.251]]],
  },
  rotterdam: {
    urban: [[[51.95,4.427],[51.952,4.493],[51.934,4.53],[51.899,4.522],[51.892,4.459],[51.913,4.421]]],
    alternatives: [[[51.941,4.438],[51.93,4.462],[51.922,4.488],[51.908,4.516]]],
    policy: [[[51.946,4.452],[51.934,4.468],[51.922,4.482],[51.906,4.5]]],
  },
};

const state = {
  city: "minneapolis",
  year: 1930,
  compare: false,
  global: false,
  basemap: "light",
  activeLayers: new Set(Object.keys(FACTORS)),
  playing: false,
};

const map = L.map("map", { zoomControl: false, attributionControl: true, minZoom: 2, worldCopyJump: true });
const tileLight = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap contributors" });
const tileDark = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { maxZoom: 19, attribution: "© OpenStreetMap © CARTO" });
tileLight.addTo(map);

const eventLayer = L.layerGroup().addTo(map);
const routeLayer = L.layerGroup().addTo(map);
const networkLayer = L.layerGroup().addTo(map);
let playTimer = null;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function metricAt(cityId, year) {
  const eras = CITY_DATA[cityId].eras.filter((item) => item.from <= year);
  return eras[eras.length - 1] || CITY_DATA[cityId].eras[0];
}

function storyAt(year) {
  return STORY_BY_ERA.find((item) => year >= item.from && year <= item.to) || STORY_BY_ERA[0];
}

function factorIcon(type) {
  const icons = {
    map: '<path d="m4 6 5-2 6 2 5-2v14l-5 2-6-2-5 2V6Z"/><path d="M9 4v14M15 6v14"/>',
    image: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 15-5-5L5 19"/>',
    data: '<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>',
    document: '<path d="M6 3h8l4 4v14H6V3Z"/><path d="M14 3v5h4M9 13h6M9 17h6"/>',
    audio: '<path d="M11 5 6 9H3v6h3l5 4V5ZM15 9c1 1 1 5 0 6M18 6c3 3 3 9 0 12"/>',
    book: '<path d="M4 5c4-1 6 0 8 2v14c-2-2-4-3-8-2V5ZM20 5c-4-1-6 0-8 2v14c2-2 4-3 8-2V5Z"/>',
  };
  return `<svg viewBox="0 0 24 24">${icons[type] || icons.document}</svg>`;
}

function renderNetwork() {
  networkLayer.clearLayers();
  NETWORK_CITIES.forEach(([name, lat, lng]) => {
    const primary = name === "Minneapolis" || name === "Rotterdam";
    L.marker([lat, lng], {
      icon: L.divIcon({ className: `network-marker${primary ? " primary" : ""}`, html: "<span></span>", iconSize: [15, 15], iconAnchor: [7, 7] }),
    }).bindTooltip(name, { direction: "top", offset: [0, -7], className: "city-tooltip" }).addTo(networkLayer);
  });
}

function addRoutes(cityId) {
  const cityRoutes = ROUTES[cityId];
  Object.entries(cityRoutes).forEach(([factor, routeGroups]) => {
    if (!state.activeLayers.has(factor)) return;
    routeGroups.forEach((coords) => {
      if (factor === "urban") {
        L.polygon(coords, { color: FACTORS[factor].color, weight: 1.2, opacity: .52, fillColor: FACTORS[factor].color, fillOpacity: .055, dashArray: "5 5", interactive: false }).addTo(routeLayer);
      } else {
        L.polyline(coords, { color: FACTORS[factor].color, weight: factor === "policy" ? 4 : 3, opacity: .67, dashArray: factor === "alternatives" ? "4 7" : null, lineCap: "round" }).addTo(routeLayer);
      }
    });
  });
}

function renderMapData() {
  eventLayer.clearLayers();
  routeLayer.clearLayers();
  networkLayer.clearLayers();

  if (state.global || state.compare) {
    renderNetwork();
    if (state.compare) {
      map.fitBounds([CITY_DATA.minneapolis.center, CITY_DATA.rotterdam.center], { padding: [55, 55], maxZoom: 3, animate: true });
    } else {
      map.setView([22, 20], 2.4, { animate: true });
    }
  }

  const visibleCities = state.compare ? ["minneapolis", "rotterdam"] : state.global ? [] : [state.city];
  visibleCities.forEach(addRoutes);

  EVENTS.filter((event) => visibleCities.includes(event.city) && event.year <= state.year && state.activeLayers.has(event.factor)).forEach((event) => {
    const marker = L.marker([event.lat, event.lng], {
      icon: L.divIcon({
        className: `research-marker${Math.abs(event.year - state.year) <= 5 ? " active" : ""}`,
        html: `<span style="--marker-color:${FACTORS[event.factor].color}"></span>`,
        iconSize: [24, 24],
        iconAnchor: [12, 24],
      }),
    });
    marker.bindPopup(`<div class="popup-kicker">${event.year} · ${FACTORS[event.factor].label}</div><h3 class="popup-title">${event.title}</h3><p class="popup-copy">${event.excerpt}</p>`, { className: "map-popup", maxWidth: 240 });
    marker.on("click", () => renderEvidence([event, ...nearbyEvidence(event.city, state.year).filter((item) => item.id !== event.id)].slice(0, 3)));
    marker.addTo(eventLayer);
  });
}

function nearbyEvidence(city, year) {
  return EVENTS.filter((event) => event.city === city && event.year <= year).sort((a, b) => Math.abs(a.year - year) - Math.abs(b.year - year));
}

function renderEvidence(items = nearbyEvidence(state.city, state.year).slice(0, 3)) {
  const container = $("[data-evidence-list]");
  $("[data-source-count]").textContent = `${items.length} 筆`;
  container.innerHTML = items.map((item) => `
    <article class="evidence-card" tabindex="0" data-event-id="${item.id}">
      <span class="evidence-icon">${factorIcon(item.sourceType)}</span>
      <span><b>${item.title}</b><small>${item.year} · ${item.source}</small></span>
      <svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>
    </article>`).join("");
  $$(".evidence-card", container).forEach((card) => card.addEventListener("click", () => openEventDrawer(card.dataset.eventId)));
}

function updateTimeline() {
  const progress = ((state.year - 1920) / 105) * 100;
  const slider = $("#year-slider");
  slider.value = state.year;
  slider.style.setProperty("--progress", `${progress}%`);
  $("[data-year-display]").textContent = state.year;
  $("[data-map-year]").textContent = state.year;
  $("[data-snapshot-year]").textContent = state.year;
  $("[data-era-label]").textContent = storyAt(state.year).era;
  $$(".year-ticks span").forEach((tick) => tick.classList.toggle("active", Number(tick.dataset.year) <= state.year));
}

function updateMetrics() {
  ["minneapolis", "rotterdam"].forEach((cityId) => {
    const metric = metricAt(cityId, state.year);
    $(`[data-${cityId}-score]`).textContent = metric.score;
    $(`[data-${cityId}-bar]`).style.width = `${metric.score}%`;
    $(`[data-${cityId}-note]`).textContent = metric.note;
  });
}

function updateStory() {
  const story = storyAt(state.year);
  const factor = FACTORS[story.factor];
  $("[data-story-factor]").textContent = factor.label;
  $("[data-story-factor]").style.color = factor.color;
  $("[data-story-factor]").style.background = `${factor.color}18`;
  $("[data-story-number]").textContent = `${factor.number} / 05`;
  $("[data-story-title]").textContent = story.title;
  $("[data-story-body]").textContent = story.body;

  const city = CITY_DATA[state.city];
  $("[data-map-title]").textContent = state.compare ? "明尼亞波利斯 × 鹿特丹" : state.global ? "全球研究網絡" : city.name;
  $("[data-map-subtitle]").textContent = state.compare ? "在同一歷史時刻，比較兩座城市的五因素組合。" : state.global ? "跨越 25 個國家，建立可比較的長期移動歷史。" : story.body.slice(0, 38) + "…";
  $(".map-title-card").style.borderLeftColor = state.compare || state.global ? "#17211d" : city.color;
  $("[data-map-year]").style.color = state.compare || state.global ? "#17211d" : city.color;
}

function updateUI({ recenter = false } = {}) {
  updateTimeline();
  updateMetrics();
  updateStory();
  renderEvidence();
  renderMapData();

  $$(".city-chip").forEach((chip) => chip.classList.toggle("active", chip.dataset.city === state.city && !state.compare));
  $$("[data-toggle-compare]").forEach((button) => button.classList.toggle("active", state.compare));

  if (recenter && !state.compare && !state.global) {
    const city = CITY_DATA[state.city];
    map.flyTo(city.center, city.zoom, { duration: .8 });
  }
}

function selectCity(cityId) {
  state.city = cityId;
  state.compare = false;
  state.global = false;
  updateUI({ recenter: true });
}

function toggleCompare(force) {
  state.compare = typeof force === "boolean" ? force : !state.compare;
  state.global = false;
  updateUI({ recenter: !state.compare });
}

function openDrawer(html) {
  $("[data-drawer-body]").innerHTML = html;
  $(".detail-drawer").classList.add("open");
  $(".detail-drawer").setAttribute("aria-hidden", "false");
  $(".drawer-backdrop").classList.add("open");
}

function closeDrawer() {
  $(".detail-drawer").classList.remove("open");
  $(".detail-drawer").setAttribute("aria-hidden", "true");
  $(".drawer-backdrop").classList.remove("open");
}

function openStoryDrawer() {
  const story = storyAt(state.year);
  const factor = FACTORS[story.factor];
  openDrawer(`
    <span class="drawer-year">${state.year} · ${factor.label}</span>
    <h2>${story.title}</h2>
    <p class="lead">${story.body}</p>
    <h3>這個圖層在問什麼？</h3>
    <p>五因素方法不把自行車的興衰歸因於單一政策。它追蹤都市型態、替代運具、治理、公民參與與文化態度如何在不同歷史時刻交織。</p>
    <h3>雙城比較的閱讀方式</h3>
    <p>比較不是尋找單一「最佳城市」，而是辨識不同路徑：相似的政策在不同空間與文化條件下可能產生不同結果；看似成功的今日，也可能曾經歷長期衰退。</p>
    <div class="source-box"><b>資料狀態</b><p>本頁為概念原型敘事。正式發布前，事件、年份、空間位置與引用都需由研究團隊逐筆審核。</p></div>
  `);
}

function openEventDrawer(eventId) {
  const event = EVENTS.find((item) => item.id === eventId);
  if (!event) return;
  const city = CITY_DATA[event.city];
  openDrawer(`
    <span class="drawer-year">${event.year} · ${city.name} · ${FACTORS[event.factor].label}</span>
    <h2>${event.title}</h2>
    <p class="lead">${event.excerpt}</p>
    <h3>史料線索</h3>
    <p>${event.source}</p>
    <h3>研究透明度</h3>
    <p>每一個地圖點位都應保留來源、定位方法、時間精度、授權狀態與研究者註記。原型先呈現欄位結構，待正式資料接入。</p>
    <div class="source-box"><b>建議引用格式</b><p>Cycling Cities Research Network, “${event.title},” ${city.en}, ${event.year}. Concept record, accessed 2026.</p></div>
  `);
}

function openSourcesDrawer() {
  const items = nearbyEvidence(state.city, state.year);
  openDrawer(`
    <span class="drawer-year">SOURCES · ${CITY_DATA[state.city].name} · ${state.year}</span>
    <h2>史料與證據索引</h2>
    <p class="lead">讓每一項地圖判斷都能回到原始證據，也清楚保留尚未確定之處。</p>
    <table class="source-table">
      <thead><tr><th>年份</th><th>事件</th><th>類型</th><th>狀態</th></tr></thead>
      <tbody>${items.map((item) => `<tr><td>${item.year}</td><td>${item.title}</td><td>${FACTORS[item.factor].label}</td><td>${item.source.includes("待") || item.source.includes("示範") ? "待考證" : "研究出版"}</td></tr>`).join("")}</tbody>
    </table>
    <div class="source-box"><b>資料原則</b><p>正式版建議採用四級可信度、時間精度與空間精度欄位，並保留完整的資料異動紀錄。</p></div>
  `);
}

function showToast(message) {
  const toast = $(".toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2300);
}

function setYear(year) {
  state.year = Math.max(1920, Math.min(2025, Math.round(year)));
  updateUI();
}

function startPlay() {
  if (state.playing) {
    state.playing = false;
    window.clearInterval(playTimer);
    $(".play-button").classList.remove("playing");
    return;
  }
  if (state.year >= 2025) state.year = 1920;
  state.playing = true;
  $(".play-button").classList.add("playing");
  playTimer = window.setInterval(() => {
    if (state.year >= 2025) {
      startPlay();
      return;
    }
    setYear(state.year + 1);
  }, 160);
}

function initEventDots() {
  const years = [...new Set(EVENTS.map((event) => event.year))];
  $(".event-dots").innerHTML = years.map((year) => `<i style="left:${((year - 1920) / 105) * 100}%"></i>`).join("");
}

function bindEvents() {
  $$(".city-chip").forEach((chip) => chip.addEventListener("click", () => selectCity(chip.dataset.city)));
  $$("[data-toggle-compare]").forEach((button) => button.addEventListener("click", () => toggleCompare()));
  $("[data-all-cities]").addEventListener("click", () => {
    state.global = true;
    state.compare = false;
    updateUI();
  });
  $("[data-fit-city]").addEventListener("click", () => {
    if (state.compare) map.fitBounds([CITY_DATA.minneapolis.center, CITY_DATA.rotterdam.center], { padding: [55, 55], maxZoom: 3, animate: true });
    else if (state.global) map.flyTo([22, 20], 2.4, { duration: .8 });
    else map.flyTo(CITY_DATA[state.city].center, CITY_DATA[state.city].zoom, { duration: .8 });
  });
  $("[data-toggle-basemap]").addEventListener("click", () => {
    if (state.basemap === "light") {
      map.removeLayer(tileLight); tileDark.addTo(map); state.basemap = "dark";
      $(".leaflet-tile-pane").style.filter = "saturate(.7) contrast(.95)";
    } else {
      map.removeLayer(tileDark); tileLight.addTo(map); state.basemap = "light";
      $(".leaflet-tile-pane").style.filter = "saturate(.65) contrast(.88) brightness(1.05)";
    }
  });
  $$(".layer-row input").forEach((input) => input.addEventListener("change", () => {
    input.closest(".layer-row").classList.toggle("active", input.checked);
    input.checked ? state.activeLayers.add(input.value) : state.activeLayers.delete(input.value);
    renderMapData();
  }));
  $("[data-all-layers]").addEventListener("click", () => {
    const showAll = state.activeLayers.size !== Object.keys(FACTORS).length;
    state.activeLayers = new Set(showAll ? Object.keys(FACTORS) : []);
    $$(".layer-row input").forEach((input) => { input.checked = showAll; input.closest(".layer-row").classList.toggle("active", showAll); });
    $("[data-all-layers]").textContent = showAll ? "全部隱藏" : "全部顯示";
    renderMapData();
  });
  $("#year-slider").addEventListener("input", (event) => setYear(Number(event.target.value)));
  $(".play-button").addEventListener("click", startPlay);
  $("[data-read-story]").addEventListener("click", openStoryDrawer);
  $("[data-open-sources]").addEventListener("click", openSourcesDrawer);
  $$("[data-close-drawer]").forEach((button) => button.addEventListener("click", closeDrawer));
  $(".prototype-notice button").addEventListener("click", () => $(".prototype-notice").remove());
  $(".search-trigger").addEventListener("click", () => $(".search-dialog").showModal());
  $$("[data-search-target]").forEach((button) => button.addEventListener("click", () => { $(".search-dialog").close(); selectCity(button.dataset.searchTarget); }));
  $$("[data-search-year]").forEach((button) => button.addEventListener("click", () => { $(".search-dialog").close(); setYear(Number(button.dataset.searchYear)); }));
  $$("[data-open-contribute]").forEach((button) => button.addEventListener("click", () => $(".contribute-dialog").showModal()));
  $$(".contribute-options button").forEach((button) => button.addEventListener("click", () => showToast("參與流程將在下一階段開放")));
  $("[data-share]").addEventListener("click", async () => {
    const shareText = `${CITY_DATA[state.city].name} · ${state.year}｜Cycling Cities 研究地圖`;
    try { await navigator.clipboard.writeText(`${shareText}\n${location.href}`); showToast("目前視角連結已複製"); }
    catch { showToast(shareText); }
  });
  $("[data-cite]").addEventListener("click", () => showToast("建議引用格式已準備於史料詳情"));
  $(".collapse-insights").addEventListener("click", () => {
    if (window.innerWidth <= 940) $(".insight-panel").classList.remove("mobile-open");
    else { $(".insight-panel").classList.add("collapsed"); $(".workspace").classList.add("insights-collapsed"); window.setTimeout(() => map.invalidateSize(), 30); }
  });
  $(".mobile-menu").addEventListener("click", () => $(".control-panel").classList.toggle("mobile-open"));
  $$(".nav-item").forEach((button) => button.addEventListener("click", () => {
    $$(".nav-item").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    if (button.dataset.view === "compare") toggleCompare(true);
    else if (button.dataset.view === "stories") openStoryDrawer();
    else if (button.dataset.view === "method") openDrawer(`<span class="drawer-year">METHOD · 5-FACTOR ANALYSIS</span><h2>如何比較一百年的城市移動？</h2><p class="lead">Cycling Cities 用五個彼此交織的因素，解釋自行車為何在某些城市蓬勃發展、在另一些城市被邊緣化。</p><h3>五個分析因素</h3><ol>${Object.values(FACTORS).map((factor) => `<li>${factor.label}</li>`).join("")}</ol><h3>平台資料模型</h3><p>每一筆紀錄包含城市、時間範圍、空間位置、因素、事件敘事、來源、權利狀態、可信度與研究者註記。這讓比較不只停留在圖片與故事，也能回到可檢查的方法。</p><div class="source-box"><b>原型依據</b><p>Cycling Cities 5-Factor Analysis；Tool 2: Bringing Sustainability Home；2026 年 7 月團隊會議筆記。</p></div>`);
    else { state.global = false; state.compare = false; updateUI({ recenter: true }); }
  }));
  $(".info-dot").addEventListener("click", () => showToast("目前為研究介面概念原型，非正式資料發布"));
  $(".swap-city").addEventListener("click", () => selectCity(state.city === "minneapolis" ? "rotterdam" : "minneapolis"));
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeDrawer();
    if (event.key === "/" && !$(".search-dialog").open) { event.preventDefault(); $(".search-dialog").showModal(); }
  });
}

map.setView(CITY_DATA.minneapolis.center, CITY_DATA.minneapolis.zoom);
initEventDots();
bindEvents();
updateUI();

window.setTimeout(() => map.invalidateSize(), 50);
