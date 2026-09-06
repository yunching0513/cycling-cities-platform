/* Cycling Cities — application logic.
   Research content is loaded from ./data/*.json (see build-plan-ai.md §4).
   Interface strings live in i18n.js.

   Records carry placeholder:true when the research team has not confirmed them.
   Those records must never be presented as fact: the map draws them hollow, the
   record card carries a warning, and the citation button refuses to copy them. */

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

const params = new URLSearchParams(location.search);
const state = {
  lang: LANGS.some(l => l.id === params.get('lang')) ? params.get('lang') : 'en',
  city: 'mpls',
  di: 0,
  sel: null,          // site id
  active: new Set(),
  compare: false,
  cityB: null,
  narrDock: false,
  inters: true,
  global: false,
  histOn: false,
  swipeOn: false,
  splitPct: .5,
  histOpa: .85,
  playing: false,
  sheet: 'half',
  narrShared: false,   // read the shared frame even while a city is selected
  histOverride: null   // a dated map shown on request beyond the gap rule
};

/* filled by loadData() */
let DECADES = [], ERAS = {}, FACTORS = [], SPLIT_C = [], CITIES = {}, NETWORK = [], STORIES = [];
let INTERSECTIONS = [];
let SITES = [], SPLIT = [], META = {};
let MAPS = [], NARR = {}, IMAGES = [], HIST_MAX_GAP = 25;

const T = () => UI[state.lang];
const tr = obj => (obj && (obj[state.lang] || obj.en)) || '';
const decade = () => DECADES[state.di];
const fc = id => FACTORS.find(f => f.id === id);
/* The final decade is still running, so the axis ends at the present, not at 2020. */
const NOW_YEAR = new Date().getFullYear();
const onLastDecade = () => state.di === DECADES.length - 1;
const cityName = id => tr(CITIES[id].name);
/* The axis is mostly decades but ends on a single recent year, so 2025 must never
   render as "2025s". Language-aware, because the suffix differs per language. */
function stepLabel(y) {
  const isDecade = y % 10 === 0;
  if (state.lang === 'zh') return isDecade ? `${y}年代` : `${y}年`;
  if (state.lang === 'nl') return isDecade ? `jaren ${y}` : String(y);
  return isDecade ? `${y}s` : String(y);
}
/* @maps-logic
   ---------- dated maps ----------
   One city may hold several dated maps. The interface shows the one nearest to the selected
   step and says how far apart they are; beyond HIST_MAX_GAP years it offers the map on
   request instead of showing it by default. A row marked placeholder is a lead without a
   drawable file and is never drawn, and no year is ever inferred for an undated map. */
const mapsOf = c => MAPS.filter(m => m.city === c && !m.placeholder);
const hasMaps = c => mapsOf(c).length > 0;
const mapLeads = c => MAPS.filter(m => m.city === c && m.placeholder).length;
/* A step covers ten years; the last step runs from its start year to today. */
function stepRange(y) { return y % 10 === 0 ? [y, y + 9] : [y, Math.max(y, NOW_YEAR)]; }
function gapTo(year, step) { const [a, b] = stepRange(step); return year < a ? a - year : year > b ? year - b : 0; }
/* ties go to a baked archive, which works without the live service */
const KIND_RANK = { pmtiles: 0, topotijdreis: 1, xyz: 2, 'arcgis-image': 2 };
function nearestMap(c, step) {
  const dated = mapsOf(c).filter(m => m.year != null);
  if (!dated.length) return null;
  return dated.map(m => ({ m, gap: gapTo(m.year, step) }))
    .sort((a, b) => a.gap - b.gap || (KIND_RANK[a.m.kind] ?? 9) - (KIND_RANK[b.m.kind] ?? 9))[0];
}
const undatedMap = c => mapsOf(c).find(m => m.year == null) || null;
/* What the overlay shows for a city at a step, and why. */
function mapChoice(c, step) {
  const near = nearestMap(c, step);
  const ov = state.histOverride && mapsOf(c).find(m => m.id === state.histOverride);
  if (ov) return { map: ov, gap: ov.year == null ? null : gapTo(ov.year, step), mode: 'override', near };
  if (near && near.gap <= HIST_MAX_GAP) return { map: near.m, gap: near.gap, mode: 'auto', near };
  const ud = undatedMap(c);
  if (ud) return { map: ud, gap: null, mode: 'undated', near };
  return { map: null, gap: near ? near.gap : null, mode: near ? 'far' : 'none', near };
}
/* A series row carries a years list and a {year} placeholder; expand it to one map per year. */
function expandMaps(rows) {
  const fill = (v, y) => typeof v === 'string' ? v.replace(/\{year\}/g, y)
    : (v && typeof v === 'object' && !Array.isArray(v))
      ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fill(x, y)])) : v;
  return rows.flatMap(r => Array.isArray(r.years)
    ? r.years.map(y => Object.assign(fill(r, y), { id: `${r.id}-${y}`, year: y, url: r.service.replace(/\{year\}/g, y), series: r.id }))
    : [r]);
}
/* @end maps-logic */
const sitesOf = city => SITES.filter(s => s.city === city);
const siteById = id => SITES.find(s => s.id === id);
const splitFor = (city, d) => SPLIT.find(r => r.city === city && r.decade === d);
const verifiedCount = () => SITES.filter(s => !s.placeholder).length;

let map = null, currentBase = null, pins = null, network = null, histLayer = null, playTimer = null;
/* Side-by-side comparison uses a second Leaflet instance rather than one zoomed-out map,
   so each city keeps its own centre while both are read at the same scale. */
let map2 = null, pins2 = null, base2 = null, syncing = false;
let interL = null, interL2 = null;
const histLayers = { 1: null, 2: null }, histIssue = { 1: '', 2: '' };
/* a sheet on its way out keeps drawing while the next one fades in over it */
const histFading = { 1: null, 2: null };
const FADE_MS = 700;
let imgL = null, imgL2 = null;
/* sites drawn in the previous render, so only newly appearing markers fade in */
let lastSites = new Set();
let pinMarker = null, pinLL = null;
const BASES = {};

/* ---------- data ---------- */
async function loadJSON(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.json();
}
async function loadData() {
  const [ref, sites, split, inters, maps, narr, imgs] = await Promise.all([
    loadJSON('./data/reference.json'),
    loadJSON('./data/sites.json'),
    loadJSON('./data/modalsplit.json'),
    loadJSON('./data/intersections.json'),
    loadJSON('./data/maps.json'),
    loadJSON('./data/narrative.json'),
    loadJSON('./data/images.json')
  ]);
  DECADES = ref.decades; ERAS = ref.eras; FACTORS = ref.factors; SPLIT_C = ref.splitColours;
  CITIES = ref.cities; NETWORK = ref.networkCities; STORIES = ref.stories;
  SITES = sites.sites; SPLIT = split.records; INTERSECTIONS = inters.intersections;
  MAPS = expandMaps(maps.maps || []);
  if (maps.meta && Number.isFinite(maps.meta.maxGap)) HIST_MAX_GAP = maps.meta.maxGap;
  NARR = narr.cities || {}; IMAGES = imgs.images || [];
  META = { sites: sites.meta, split: split.meta, inters: inters.meta, maps: maps.meta, narr: narr.meta, imgs: imgs.meta };

  state.active = new Set(FACTORS.map(f => f.id));
  if (CITIES[params.get('city')]) state.city = params.get('city');
  const d = DECADES.indexOf(Number(params.get('d')));
  if (d > -1) state.di = d;
}
function showLoadError(err) {
  const t = T();
  const box = $('#loadError');
  box.innerHTML = `<div class="load-box">
    <b>${t.loadError}</b>
    <p>${t.loadErrorHint}</p>
    <code>${String(err && err.message || err)}</code>
    <button type="button" id="retryLoad">${t.retry}</button></div>`;
  box.classList.add('on');
  $('#retryLoad').onclick = () => location.reload();
}

/* ---------- map ---------- */
/* Basemaps are Esri's keyless raster services. CARTO's free tiles began returning
   "API KEY REQUIRED" watermarks at city zoom levels in September 2026 (docs/CHANGELOG.md),
   so the paper look now comes from the Light Gray Canvas pair: the base alone for 'plain',
   base plus the reference labels for 'light'. Light Gray is cached to zoom 16 and is
   upscaled beyond that; the street map goes to 19. */
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/';
const ATTR = 'Tiles &copy; <a href="https://www.esri.com/">Esri</a>: Esri, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, and the GIS user community';
const ATTR_STREET = 'Tiles &copy; <a href="https://www.esri.com/">Esri</a>: Esri, HERE, Garmin, USGS, Intermap, INCREMENT P, NRCan, Esri Japan, METI, Esri China (Hong Kong), Esri Korea, Esri (Thailand), NGCC, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, and the GIS User Community';
const esriLayer = (svc, attr, native) =>
  L.tileLayer(`${ESRI}${svc}/MapServer/tile/{z}/{y}/{x}`, { attribution: attr, maxZoom: 19, maxNativeZoom: native });
const lightBase = () => L.layerGroup([
  esriLayer('Canvas/World_Light_Gray_Base', ATTR, 16),
  esriLayer('Canvas/World_Light_Gray_Reference', '', 16)
]);
function initMap() {
  map = L.map('map', { zoomControl: false, minZoom: 2, worldCopyJump: true })
    .setView(CITIES[state.city].center, CITIES[state.city].zoom);
  map.createPane('hist');
  map.getPane('hist').style.zIndex = 350;
  Object.assign(BASES, {
    light:   lightBase(),
    plain:   esriLayer('Canvas/World_Light_Gray_Base', ATTR, 16),
    voyager: esriLayer('World_Street_Map', ATTR_STREET, 19)
  });
  currentBase = BASES.light.addTo(map);
  pins = L.layerGroup().addTo(map);
  network = L.layerGroup().addTo(map);
  map.on('move zoom moveend zoomend resize viewreset', updateClip);

  map2 = L.map('map2', { zoomControl: false, minZoom: 2, attributionControl: false })
    .setView(CITIES.rdam.center, CITIES.rdam.zoom);
  base2 = lightBase().addTo(map2);
  pins2 = L.layerGroup().addTo(map2);
  interL = L.layerGroup().addTo(map);
  interL2 = L.layerGroup().addTo(map2);
  imgL = L.layerGroup().addTo(map);
  imgL2 = L.layerGroup().addTo(map2);
  /* the second map takes its own city's overlay in comparison, so it needs the same pane */
  map2.createPane('hist');
  map2.getPane('hist').style.zIndex = 350;
  linkZoom(map, map2); linkZoom(map2, map);
}

/* Leaflet's flyTo divides by the container size, so on a zero-sized map it produces a NaN
   centre and throws. That would abort whatever click handler asked for the move, leaving the
   interface half-switched, so fall back to a plain setView whenever the map has no size. */
function goTo(m, center, zoom, opts) {
  if (!m) return;
  if (m.getSize().x === 0 || m.getSize().y === 0) m.setView(center, zoom, { animate: false });
  else m.flyTo(center, zoom, opts);
}

/* Comparison only means something at one scale, so the two maps share a zoom level
   while keeping independent centres. */
function linkZoom(from, to) {
  from.on('zoomend', () => {
    if (!state.compare || syncing || to.getZoom() === from.getZoom()) return;
    syncing = true;
    to.setZoom(from.getZoom(), { animate: false });
    syncing = false;
  });
}

/* ---------- PMTiles raster layer ---------- */
function pmtilesLayer(url, opts) {
  if (typeof pmtiles === 'undefined') return null;
  const pm = new pmtiles.PMTiles(url);
  const layer = L.gridLayer(Object.assign({ tileSize: 256, pane: 'hist' }, opts || {}));
  layer._pm = pm;
  layer.createTile = function (coords, done) {
    const cv = L.DomUtil.create('canvas');
    cv.width = 256; cv.height = 256;
    const ctx = cv.getContext('2d');
    pm.getZxy(coords.z, coords.x, coords.y).then(res => {
      if (!res || !res.data) { done(undefined, cv); return; }
      const u = URL.createObjectURL(new Blob([res.data]));
      const img = new Image();
      img.onload = () => { try { ctx.drawImage(img, 0, 0, 256, 256); } catch (e) {} URL.revokeObjectURL(u); done(undefined, cv); };
      img.onerror = () => { URL.revokeObjectURL(u); done(undefined, cv); };
      img.src = u;
    }).catch(() => done(undefined, cv));
    return cv;
  };
  return layer;
}

/* ---------- Topotijdreis (Kadaster) layer ----------
   The Dutch historical sheets exist only on the RD grid (EPSG:28992). Each Web Mercator tile
   is composed on a canvas from the RD tiles that cover it, reprojected with proj4. Ported from
   the author's Netherlands-historical-map project; the coarsest RD level that still matches
   the requested resolution is used, so a tile needs one to four source images. */
const RD = { origin: [-30515500, 31112400], size: 256,
  res: [3251.206502413005, 1625.6032512065026, 812.8016256032513, 406.40081280162565, 203.20040640081282,
        101.60020320040641, 50.800101600203206, 25.400050800101603, 12.700025400050801, 6.350012700025401,
        3.1750063500127004, 1.5875031750063502] };
let rdTo3857 = null;
function rdProj() {
  if (rdTo3857 || typeof proj4 === 'undefined') return rdTo3857;
  proj4.defs('EPSG:28992', '+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.9999079 '
    + '+x_0=155000 +y_0=463000 +ellps=bessel +towgs84=565.4171,50.3319,465.5524,-0.398957,0.343988,-1.8774,4.0725 '
    + '+units=m +no_defs');
  rdTo3857 = proj4('EPSG:28992', 'EPSG:3857');
  return rdTo3857;
}
function topotijdreisLayer(url, opts) {
  const P = rdProj();
  if (!P) return null;
  const layer = L.gridLayer(Object.assign({ tileSize: RD.size, pane: 'hist' }, opts || {}));
  layer.createTile = function (coords, done) {
    const cv = L.DomUtil.create('canvas');
    cv.width = RD.size; cv.height = RD.size;
    const ctx = cv.getContext('2d'), m = this._map;
    if (!ctx || !m) { setTimeout(() => done(undefined, cv), 0); return cv; }
    const tp = L.point(coords.x, coords.y).scaleBy(L.point(RD.size, RD.size));
    const nw = L.CRS.EPSG3857.project(m.unproject(tp, coords.z));
    const se = L.CRS.EPSG3857.project(m.unproject(tp.add(L.point(RD.size, RD.size)), coords.z));
    const a = P.inverse([nw.x, nw.y]), b = P.inverse([se.x, se.y]);
    const minX = Math.min(a[0], b[0]), maxX = Math.max(a[0], b[0]);
    const minY = Math.min(a[1], b[1]), maxY = Math.max(a[1], b[1]);
    const target = (maxX - minX) / RD.size;
    let lvl = RD.res.length - 1;
    for (let i = 0; i < RD.res.length; i++) if (RD.res[i] <= target * 1.5) { lvl = i; break; }
    const tm = RD.res[lvl] * RD.size;
    const c0 = Math.floor((minX - RD.origin[0]) / tm), c1 = Math.floor((maxX - RD.origin[0]) / tm);
    const r0 = Math.floor((RD.origin[1] - maxY) / tm), r1 = Math.floor((RD.origin[1] - minY) / tm);
    const toPx = (rx, ry) => {
      const mc = P.forward([rx, ry]);
      const wp = m.project(L.CRS.EPSG3857.unproject(L.point(mc[0], mc[1])), coords.z);
      return [wp.x - tp.x, wp.y - tp.y];
    };
    let left = (c1 - c0 + 1) * (r1 - r0 + 1);
    if (left <= 0) { setTimeout(() => done(undefined, cv), 0); return cv; }
    const finish = () => { if (--left === 0) done(undefined, cv); };
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      const x0 = RD.origin[0] + c * tm, y0 = RD.origin[1] - r * tm;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const q0 = toPx(x0, y0), q1 = toPx(x0 + tm, y0 - tm);
          ctx.drawImage(img, q0[0], q0[1], q1[0] - q0[0], q1[1] - q0[1]);
        } catch (e) { /* a tainted or broken image leaves the tile blank */ }
        finish();
      };
      img.onerror = finish;
      img.src = `${url}/${lvl}/${r}/${c}`;
    }
    return cv;
  };
  return layer;
}

/* ---------- ArcGIS image service layer ----------
   Esri's historical topographic map service holds every USGS sheet as its own raster.
   Locking each tile request to named rasters draws exactly the chosen sheets, so a row
   can say which year it shows. A tile is one exportImage call for the tile's own bounds. */
const ArcImageLayer = L.TileLayer.extend({
  getTileUrl(coords) {
    const R = 20037508.342789244, n = Math.pow(2, coords.z);
    const xmin = coords.x / n * 2 * R - R, xmax = (coords.x + 1) / n * 2 * R - R;
    const ymax = R - coords.y / n * 2 * R, ymin = R - (coords.y + 1) / n * 2 * R;
    const rule = encodeURIComponent(JSON.stringify({ mosaicMethod: 'esriMosaicLockRaster', lockRasterIds: this.options.rasterIds }));
    return `${this.options.service}/exportImage?f=image&format=jpgpng&bbox=${xmin},${ymin},${xmax},${ymax}`
      + `&bboxSR=3857&imageSR=3857&size=256,256&mosaicRule=${rule}`;
  }
});

/* ---------- historical overlay ----------
   One layer per map pane. The choice of map is re-read on every render, so moving the
   slider swaps the sheet when a different year becomes the nearest one, and comparison
   gives each city its own map. */
const paneMap = n => n === 2 ? map2 : map;
const histCities = () => state.global ? [] : state.compare ? [state.city, ensureCityB()] : [state.city];

function buildHist(m, opacity) {
  const common = { minZoom: m.minZoom, maxZoom: m.maxZoom, attribution: m.attr, opacity };
  if (m.bounds) common.bounds = L.latLngBounds(m.bounds);
  if (m.kind === 'pmtiles') return pmtilesLayer(m.url, common);
  if (m.kind === 'topotijdreis') return topotijdreisLayer(m.url, common);
  if (m.kind === 'arcgis-image') return new ArcImageLayer('', Object.assign(common, { pane: 'hist', maxNativeZoom: m.maxNativeZoom || m.maxZoom, service: m.service, rasterIds: m.rasterIds }));
  return L.tileLayer(m.url, Object.assign(common, { pane: 'hist', maxNativeZoom: m.maxNativeZoom || m.maxZoom }));
}
/* Each layer reports its own loading state, so the status line says whether the map on
   screen has actually arrived, not merely that it was asked for. Details are stored as
   keys and resolved at render time, so a language switch does not strand them. */
function watchHist(l, m) {
  l._cc = { id: m.id, state: 'loading', detail: null, extra: '' };
  const set = (st, key, extra) => { l._cc.state = st; l._cc.detail = key; l._cc.extra = extra || ''; renderHistStatus(); };
  if (m.kind === 'pmtiles') {
    l._pm.getHeader().then(hd => set('ready', 'nPm', `tile z${hd.minZoom}–z${hd.maxZoom} ·`)).catch(() => set('failed', 'nPmFail'));
  } else if (m.kind === 'topotijdreis') {
    l.once('load', () => set('ready', 'nTopo'));
  } else {
    /* the composite's caveat belongs to undated services only; a dated sheet needs none */
    const note = m.kind === 'arcgis-image' ? 'nArc' : (m.undated ? 'nXyz' : null);
    let settled = false;
    l.on('tileload', () => { if (!settled) { settled = true; set('ready', note); } });
    l.on('tileerror', () => { if (!settled) set('failed', 'nXyzFail'); });
  }
}
/* ---------- crossfade ----------
   A swap keeps the current sheet on screen until the next one has tiles, then fades the
   old out as the new fades in, so playback reads as a dissolve rather than a cut with a
   blank in the middle. The transition itself is CSS on the layer container (styles.css),
   which the reduced-motion rule turns off. */
const REVEAL_MS = 1000;   // show whatever has arrived by then, so a slow service still appears within a playback step
const targetOpacity = n => (n === 1 && state.swipeOn ? 1 : state.histOpa);
const paneLayers = n => [histLayers[n], histFading[n]].filter(Boolean);
function removeSheet(n, l) { if (!l) return; clearTimeout(l._ccTimer); paneMap(n).removeLayer(l); }
function discardFading(n) { removeSheet(n, histFading[n]); histFading[n] = null; }
/* keep a visible sheet on screen as the outgoing one; only one at a time per pane */
function holdOutgoing(n, l) { if (histFading[n] !== l) { discardFading(n); histFading[n] = l; } }
/* fade a visible sheet to nothing, then remove it */
function fadeOut(n, l) {
  holdOutgoing(n, l);
  l.setOpacity(0);
  clearTimeout(l._ccTimer);
  l._ccTimer = setTimeout(() => { if (histFading[n] === l) histFading[n] = null; paneMap(n).removeLayer(l); }, FADE_MS + 60);
}
function dropHist(n) {
  const l = histLayers[n];
  histLayers[n] = null;
  histIssue[n] = '';
  if (l) { if (l._cc && l._cc.shown) fadeOut(n, l); else removeSheet(n, l); }
  else if (histFading[n]) fadeOut(n, histFading[n]);
  histLayer = histLayers[1];
}
function applyHist(n, city) {
  const ch = mapChoice(city, decade());
  const want = ch.map ? ch.map.id : null;
  const cur = histLayers[n] ? histLayers[n]._cc.id : null;
  if (cur === want) return ch;
  const old = histLayers[n];
  histLayers[n] = null;
  histIssue[n] = '';
  /* a sheet that never became visible is simply removed; a visible one waits for its successor */
  if (old) { if (old._cc && old._cc.shown) holdOutgoing(n, old); else removeSheet(n, old); }
  if (ch.map) {
    const l = buildHist(ch.map, 0);
    if (!l) {
      histIssue[n] = ch.map.kind === 'topotijdreis' ? 'nProjLib' : 'nPmLib';
      if (histFading[n]) fadeOut(n, histFading[n]);
    } else {
      watchHist(l, ch.map);
      histLayers[n] = l.addTo(paneMap(n));
      const reveal = () => {
        if (histLayers[n] !== l || l._cc.shown) return;
        l._cc.shown = true;
        l.setOpacity(targetOpacity(n));
        if (histFading[n]) fadeOut(n, histFading[n]);
        updateClip();
      };
      l.once('load', reveal);
      setTimeout(reveal, REVEAL_MS);
    }
  } else if (histFading[n]) fadeOut(n, histFading[n]);
  histLayer = histLayers[1];
  return ch;
}
function refreshHist() {
  const cities = histCities();
  if (!state.histOn || !cities.length) {
    dropHist(1); dropHist(2);
    if (state.swipeOn) setSwipe(false);
    $('#swipeBtn').disabled = true;
    renderHistStatus();
    return;
  }
  applyHist(1, cities[0]);
  if (state.compare) applyHist(2, cities[1]); else dropHist(2);
  if (state.compare && state.swipeOn) setSwipe(false);
  $('#swipeBtn').disabled = !(histLayers[1] && !state.compare);
  updateClip();
  renderHistStatus();
}
function setHist(on) {
  state.histOn = on && !state.global && histCities().some(hasMaps);
  $('#histBtn').classList.toggle('active', state.histOn);
  if (!state.histOn) state.histOverride = null;
  refreshHist();
}

/* The status block is the honest part of the overlay: it names the sheet, its year, how
   far that year is from the step, its source and its licence, and offers a farther map on
   request rather than showing it silently. */
function histStatusFor(n, city) {
  const t = T(), ch = mapChoice(city, decade()), l = histLayers[n], step = stepLabel(decade());
  const k = key => `<span class="k">${key}</span>`;
  const head = state.compare ? `<span class="hs-city">${cityName(city)}</span>` : '';
  const anyway = near => near ? `<button type="button" class="hs-ov" data-ov="${near.m.id}">${t.histShowAnyway(near.m.year)}</button>` : '';
  if (!state.histOn) return head + `${k(t.kLayer)} ${hasMaps(city) ? t.layerOff : t.unavailable}`;
  if (!ch.map) {
    const why = ch.mode === 'far' ? t.histFar(ch.near.m.year, ch.gap) : t.histNoneWithin(HIST_MAX_GAP);
    return head + `${k(t.kLayer)} ${t.unavailable}<br>${k(t.kNote)} ${why}${anyway(ch.near)}`;
  }
  const m = ch.map;
  const st = l && l._cc ? l._cc : { state: histIssue[n] ? 'unavailable' : 'loading', detail: histIssue[n] || null, extra: '' };
  const detail = st.detail ? ` ${st.extra ? st.extra + ' ' : ''}${t[st.detail]}` : '';
  const gapLine = m.year == null ? t.histUndated
    : ch.gap === 0 ? t.histWithin(m.year, step)
    : t.histGap(m.year, step, ch.gap, m.year < stepRange(decade())[0]);
  const lic = m.licence
    ? (m.licence.uri ? `<a href="${m.licence.uri}" target="_blank" rel="noopener">${m.licence.statement}</a>` : m.licence.statement)
    : t.rightsUnknown;
  const cite = m.source && m.source.citation && m.source.citation !== '[TO BE CONFIRMED]'
    ? (m.source.url ? `<a href="${m.source.url}" target="_blank" rel="noopener">${m.source.citation}</a>` : m.source.citation)
    : `<span class="tbc">[TO BE CONFIRMED]</span>`;
  let extra = '';
  if (ch.mode === 'undated' && ch.near) extra = anyway(ch.near);
  if (ch.mode === 'override') extra = `<button type="button" class="hs-ov" data-ov="">${t.histAuto}</button>`;
  return head + `${k(t.kLayer)} ${tr(m.title)}<br>`
    + `${k(t.kYear)} ${m.year == null ? t.undatedYear : m.year} · ${k(t.kZoom)} ${m.minZoom}–${m.maxZoom} · ${k(t.kStatus)} ${t[st.state] || st.state}<br>`
    + `${k(t.kNote)} ${gapLine}${detail}<br>`
    + `${k(t.kSource)} ${cite}<br>${k(t.kLicence)} ${lic}${extra}`;
}
/* Cities without a usable map get the specification of one, whether the overlay is on or off. */
function histNeedHTML() {
  const t = T();
  return histCities().map(c => {
    const ch = mapChoice(c, decade());
    if (ch.map && ch.mode !== 'undated') return '';
    const leads = mapLeads(c) ? ` ${t.mapLeads(mapLeads(c))}` : '';
    const what = ch.mode === 'far' ? t.needMapFar(cityName(c), ch.near.m.year, stepLabel(decade()), ch.gap)
      : ch.mode === 'undated' ? t.needMapDated(cityName(c))
      : t.needMap(cityName(c));
    return specBlock('maps', what + leads);
  }).join('');
}
function renderHistStatus() {
  const t = T(), cities = histCities();
  let html = cities.length
    ? cities.map((c, i) => histStatusFor(i + 1, c)).join('<hr class="hs-sep">')
    : `<span class="k">${t.kLayer}</span> ${t.layerOff}`;
  if (state.compare && state.histOn) html += `<p class="hs-note">${t.histCompareNote}</p>`;
  $('#histStatus').innerHTML = html;
  $$('#histStatus .hs-ov').forEach(b => b.onclick = () => { state.histOverride = b.dataset.ov || null; refreshHist(); });
  $('#histNeed').innerHTML = state.global ? '' : histNeedHTML();
  bindNeeds($('#histNeed'));
}
function setSwipe(on) {
  state.swipeOn = on && state.histOn && !!histLayers[1] && !state.compare;
  $('#swipeBtn').classList.toggle('active', state.swipeOn);
  $('#divider').classList.toggle('on', state.swipeOn);
  if (histLayers[1] && histLayers[1]._cc.shown) histLayers[1].setOpacity(targetOpacity(1));
  positionDivider();
  updateClip();
}
function positionDivider() { $('#divider').style.left = (state.splitPct * 100) + '%'; }
function updateClip() {
  paneLayers(1).forEach(l => {
    const c = l.getContainer && l.getContainer();
    if (!c) return;
    if (!state.swipeOn) { c.style.clip = ''; return; }
    const size = map.getSize();
    const nw = map.containerPointToLayerPoint([0, 0]);
    const se = map.containerPointToLayerPoint([size.x, size.y]);
    const x = nw.x + size.x * state.splitPct;
    c.style.clip = 'rect(' + [nw.y, x, se.y, nw.x].join('px,') + 'px)';
  });
}
function bindDividerDrag() {
  const d = $('#divider');
  let dragging = false;
  const set = e => {
    const r = map.getContainer().getBoundingClientRect();
    state.splitPct = Math.min(.98, Math.max(.02, (e.clientX - r.left) / r.width));
    positionDivider(); updateClip();
  };
  d.addEventListener('pointerdown', e => { dragging = true; d.setPointerCapture(e.pointerId); map.dragging.disable(); e.preventDefault(); });
  d.addEventListener('pointermove', e => { if (dragging) set(e); });
  const end = e => { if (dragging) { dragging = false; map.dragging.enable(); try { d.releasePointerCapture(e.pointerId); } catch (err) {} } };
  d.addEventListener('pointerup', end);
  d.addEventListener('pointercancel', end);
}


/* ---------- bottom sheet (mobile) ----------
   The map is the point of this tool, so on a phone the panel behaves as a sheet with
   three heights. `peek` keeps the decade scrubber and the current-view line on screen
   while leaving most of the map visible; `half` is for browsing; `full` for reading. */
const mq = matchMedia('(max-width: 760px)');
const SHEET_MODES = ['peek', 'half', 'full'];
const homes = new WeakMap();
let sheetMoved = false;

function rememberHome(el) { if (el && !homes.has(el)) homes.set(el, [el.parentNode, el.nextSibling]); }
function sheetHeights() {
  const head = $('#sheetHead').offsetHeight || 120;
  const top = $('.topbar').offsetHeight;
  return { peek: head + 1, half: Math.round(innerHeight * .46), full: innerHeight - top - 8 };
}
function setSheetVar(px) { document.documentElement.style.setProperty('--sheet-h', px + 'px'); }
function setSheet(mode, { animate = true } = {}) {
  if (!mq.matches) return;
  state.sheet = mode;
  const panel = $('#panel');
  SHEET_MODES.forEach(m => panel.classList.toggle('sheet-' + m, m === mode));
  if (!animate) panel.classList.add('dragging');
  setSheetVar(sheetHeights()[mode]);
  clearTimeout(setSheet.timer);
  setSheet.timer = setTimeout(() => {
    panel.classList.remove('dragging');
    if (map) map.invalidateSize();
  }, animate ? 300 : 20);
}
function cycleSheet() {
  const next = SHEET_MODES[(SHEET_MODES.indexOf(state.sheet) + 1) % SHEET_MODES.length];
  setSheet(next);
}
function bindSheetDrag() {
  const grip = $('#sheetGrip'), panel = $('#panel');
  let dragging = false, startY = 0, startH = 0;
  grip.addEventListener('pointerdown', e => {
    if (!mq.matches) return;
    dragging = true; sheetMoved = false;
    startY = e.clientY; startH = panel.offsetHeight;
    panel.classList.add('dragging');
    try { grip.setPointerCapture(e.pointerId); } catch (err) {}
    e.preventDefault();
  });
  grip.addEventListener('pointermove', e => {
    if (!dragging) return;
    if (Math.abs(e.clientY - startY) > 6) sheetMoved = true;
    const h = sheetHeights();
    setSheetVar(Math.min(h.full, Math.max(h.peek, startH - (e.clientY - startY))));
  });
  const end = e => {
    if (!dragging) return;
    dragging = false;
    try { grip.releasePointerCapture(e.pointerId); } catch (err) {}
    const h = sheetHeights(), now = panel.offsetHeight;
    /* snap to whichever of the three heights the drag ended closest to */
    const nearest = SHEET_MODES.reduce((a, b) => Math.abs(h[b] - now) < Math.abs(h[a] - now) ? b : a);
    setSheet(nearest);
  };
  grip.addEventListener('pointerup', end);
  grip.addEventListener('pointercancel', end);
  grip.addEventListener('click', () => { if (mq.matches && !sheetMoved) cycleSheet(); });
}
function applyLayout() {
  const nav = $('.primary-nav'), dec = $('#decadeBlock');
  rememberHome(nav); rememberHome(dec);
  if (mq.matches) {
    $('#sheetSlot').appendChild(dec);
    $('#navSlot').appendChild(nav);
    setSheet(state.sheet, { animate: false });
  } else {
    [nav, dec].forEach(el => { const [parent, next] = homes.get(el); parent.insertBefore(el, next); });
    document.documentElement.style.removeProperty('--sheet-h');
    $('#panel').classList.remove('dragging', ...SHEET_MODES.map(m => 'sheet-' + m));
  }
  if (map) setTimeout(() => map.invalidateSize(), 90);
}
function renderSheetContext() {
  const t = T();
  const title = state.global ? t.mapGlobalTitle
    : state.compare ? t.mapCompareTitle(cityName(state.city), cityName(ensureCityB())) : cityName(state.city);
  const ok = verifiedCount();
  $('#sheetContext').innerHTML = `<b>${title}</b><i>${ok} / ${SITES.length} ${t.verifiedFlag}</i>`;
}

/* ---------- render ---------- */
const otherCities = () => Object.keys(CITIES).filter(c => c !== state.city);
function ensureCityB() {
  if (!state.cityB || state.cityB === state.city || !CITIES[state.cityB]) state.cityB = otherCities()[0] || state.city;
  return state.cityB;
}
const visibleCities = () => state.global ? [] : state.compare ? [state.city, ensureCityB()] : [state.city];

/* Chips are built from the data so adding a city to reference.json is enough. */
function renderCityChips() {
  const row = $('#cityRow');
  row.innerHTML = Object.keys(CITIES).map(k => {
    const empty = !SPLIT.some(r => r.city === k) && !SITES.some(x => x.city === k);
    return `<button class="city-chip${empty ? ' empty' : ''}" data-city="${k}"` +
      (empty ? ` title="${T().cityAwaiting}"` : '') + `>` +
      cityName(k) + (state.lang === 'en' ? '' : `<span class="en">${CITIES[k].name.en}</span>`) +
      `</button>`;
  }).join('');
  $$('#cityRow .city-chip').forEach(b => b.onclick = () => selectCity(b.dataset.city));
}
const activeSites = list => list.filter(s => state.active.has(s.factor) && s.decade <= decade());
const shownSites = () => activeSites(visibleCities().flatMap(sitesOf));

function renderTicks() {
  $('#yearTicks').innerHTML = DECADES.map((y, i) =>
    (i % 3 === 0 || i === DECADES.length - 1) ? `<span data-i="${i}">${y}</span>` : `<span data-i="${i}" class="dot">·</span>`).join('');
  $$('#yearTicks span').forEach(s => s.onclick = () => setDecade(+s.dataset.i));
}
function renderYear() {
  const y = decade();
  if (state.playing) {
    /* restart the CSS fade on every step of playback */
    const yd = $('.year-display');
    yd.classList.remove('tick'); void yd.offsetWidth; yd.classList.add('tick');
  }
  $('#yearBig').textContent = y;
  $('#yearEra').innerHTML = tr(ERAS[y]) + (state.lang === 'en' ? '' : `<span class="sub">${ERAS[y].en}</span>`);
  $$('#yearTicks span').forEach(s => s.classList.toggle('on', +s.dataset.i <= state.di));
  const lastStep = DECADES[DECADES.length - 1];
  $('#axisNow').textContent = onLastDecade()
    ? T().axisEnd(stepLabel(lastStep))
    : `${stepLabel(DECADES[0])} → ${stepLabel(lastStep)}`;
  $('#axisNow').classList.toggle('is-now', onLastDecade());
  /* a mark under a step says a dated map of a shown city falls inside it */
  const cities = histCities();
  $$('#yearTicks span').forEach(sp => {
    const y = DECADES[+sp.dataset.i];
    const yrs = [...new Set(cities.flatMap(c => mapsOf(c).filter(m => m.year != null && gapTo(m.year, y) === 0).map(m => m.year)))].sort();
    sp.classList.toggle('has-map', yrs.length > 0);
    if (yrs.length) sp.title = T().histTickTitle(yrs.join(', ')); else sp.removeAttribute('title');
  });
}
function renderFactors() {
  const cities = visibleCities().length ? visibleCities() : Object.keys(CITIES);
  $('#factors').innerHTML = FACTORS.map(f => {
    const list = cities.flatMap(sitesOf).filter(s => s.factor === f.id && s.decade <= decade());
    const ok = list.filter(s => !s.placeholder).length;
    const nm = state.lang === 'en' ? tr(f.label) : `${tr(f.label)}<span class="en">${f.label.en}</span>`;
    return `<button class="factor" data-f="${f.id}" aria-pressed="${state.active.has(f.id)}" title="${tr(f.sub)}">
      <span class="bar" style="background:${f.c}"></span>
      <span class="nm">${nm}</span>
      <span class="ct">${ok ? `<b>${ok}</b>/` : ''}${list.length}</span></button>`;
  }).join('');
  $$('#factors .factor').forEach(b => b.onclick = () => {
    const f = b.dataset.f;
    state.active.has(f) ? state.active.delete(f) : state.active.add(f);
    render();
  });
  $('#allFactors').textContent = state.active.size === FACTORS.length ? T().hideAll : T().showAll;
}
function renderPins() {
  pins.clearLayers();
  if (pins2) pins2.clearLayers();
  network.clearLayers();
  imgL.clearLayers(); imgL2.clearLayers();
  const anyImg = !state.global && visibleCities().some(c => imagesOf(c).some(i => Array.isArray(i.coordinates)));
  if ($('#legendImg')) $('#legendImg').hidden = !anyImg;

  if (state.global) {
    NETWORK.forEach(c => {
      L.marker(c.ll, { icon: L.divIcon({ className: `network-marker${c.primary ? ' primary' : ''}`, html: '<span></span>', iconSize: [11, 11], iconAnchor: [5, 5] }) })
        .bindTooltip(tr(c.name), { direction: 'top', offset: [0, -6] })
        .addTo(network);
    });
    return;
  }

  const seen = new Set();
  if (state.compare) {
    drawSites(activeSites(sitesOf(state.city)), pins, seen);
    drawSites(activeSites(sitesOf(ensureCityB())), pins2, seen);
    drawImages(state.city, imgL); drawImages(ensureCityB(), imgL2);
  } else {
    drawSites(shownSites(), pins, seen);
    drawImages(state.city, imgL);
  }
  lastSites = seen;
}

/* Junction-level modal split. The four points are demonstration slots: no count has been
   supplied, so the marker carries the awaiting state rather than a value. */
function renderInters() {
  if (!interL) return;
  interL.clearLayers(); interL2.clearLayers();
  $('#intersBtn').classList.toggle('active', state.inters);
  const shownCities = state.global ? [] : state.compare ? [state.city, ensureCityB()] : [state.city];
  $('#intersBtn').querySelector('.sub').textContent =
    T().intersCount(INTERSECTIONS.filter(x => shownCities.includes(x.city)).length);
  if (!state.inters || state.global) return;
  const draw = (city, layer) => INTERSECTIONS.filter(x => x.city === city && Array.isArray(x.coordinates)).forEach(x => {
    const m = L.marker(x.coordinates, {
      icon: L.divIcon({ className: 'inter-marker', html: '<span></span>', iconSize: [16, 16], iconAnchor: [8, 8] })
    }).addTo(layer);
    m.bindTooltip(`${tr(x.name)} · ${T().intersAwait}`, { direction: 'top', offset: [0, -9] });
    m.on('click', () => openIntersDrawer(x.id));
  });
  if (state.compare) { draw(state.city, interL); draw(ensureCityB(), interL2); }
  else draw(state.city, interL);
}

/* Citizen-science pin. Plan §7 rules out a backend, so a contribution cannot be stored:
   the flow captures a point and hands the contributor a block to send on, and says so. */
function startPinMode() {
  $('#contribDialog').close();
  document.body.classList.add('pinning');
  $('#pinHint').hidden = false;
  map.once('click', onPinClick);
}
function stopPinMode() {
  document.body.classList.remove('pinning');
  $('#pinHint').hidden = true;
  map.off('click', onPinClick);
}
function onPinClick(e) { dropPin(e.latlng.lat, e.latlng.lng); }

function dropPin(lat, lng) {
  stopPinMode();
  pinLL = { lat: +lat.toFixed(5), lng: +lng.toFixed(5) };
  if (pinMarker) map.removeLayer(pinMarker);
  pinMarker = L.marker([pinLL.lat, pinLL.lng], {
    icon: L.divIcon({ className: 'pin-marker', html: '<span></span>', iconSize: [18, 18], iconAnchor: [9, 9] })
  }).addTo(map);
  $('#pinCoordsVal').textContent = `${pinLL.lat}, ${pinLL.lng}`;
  refreshPinOut();
  $('#pinDialog').showModal();
}

function useMyLocation() {
  if (!navigator.geolocation) { toast(T().pinGeoFail); return; }
  navigator.geolocation.getCurrentPosition(
    pos => { map.setView([pos.coords.latitude, pos.coords.longitude], 15); dropPin(pos.coords.latitude, pos.coords.longitude); },
    () => toast(T().pinGeoFail),
    { timeout: 8000 }
  );
}

/* GeoJSON so the research team can drop it straight into their own tooling. */
function pinSubmission() {
  const t = T();
  return JSON.stringify({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [pinLL.lng, pinLL.lat] },
    properties: {
      submittedVia: 'Cycling Cities Tool 2 prototype',
      city: state.city,
      name: $('#pinName').value.trim() || '[TO BE CONFIRMED]',
      decade: Number($('#pinDecade').value),
      note: $('#pinNote').value.trim() || '[TO BE CONFIRMED]',
      language: state.lang,
      submittedBy: $('#pinYou').value.trim() || '[TO BE CONFIRMED]',
      contact: $('#pinEmail').value.trim() || null,
      placeholder: true,
      source: { citation: '[TO BE CONFIRMED]', verifiedBy: null, verifiedOn: null }
    }
  }, null, 2);
}

function refreshPinOut() {
  if (pinLL) $('#pinOut').value = pinSubmission();
}
/* With an inbox the point can be sent directly. It is still reviewed by a person before
   anything reaches the site; the copy button stays as the contributor's own record. */
async function sendPin() {
  const t = T(), name = $('#pinYou').value.trim();
  if (!name) { toast(t.inboxNeedName); $('#pinYou').focus(); return; }
  if (!pinLL) return;
  try {
    await sendToInbox([contribution('pin', JSON.parse(pinSubmission()), name, $('#pinEmail').value.trim(), state.city)]);
    toast(t.pinSent);
    $('#pinDialog').close();
  } catch { toast(t.inboxFail); }
}

function openIntersDrawer(id) {
  const t = T(), x = INTERSECTIONS.find(i => i.id === id);
  if (!x) return;
  const tbc = `<span class="tbc">[TO BE CONFIRMED]</span>`;
  const modeRows = vals => t.legend.map((mode, i) => `<tr>
      <th><i style="background:${SPLIT_C[i]}"></i>${mode}</th>
      <td>${vals && vals.values && vals.values[i] != null ? vals.values[i] + (vals.unit === 'percent' ? '%' : '') : tbc}</td></tr>`).join('');
  /* counts arrive one per year; each carries its own method and source */
  const counts = Array.isArray(x.counts) ? x.counts.slice().sort((a, b) => a.year - b.year) : [];
  const body = counts.length
    ? counts.map(c => `<h3>${c.year}${c.observedDate ? ' · ' + c.observedDate : ''}${c.observedHours ? ' · ' + c.observedHours : ''}</h3>
        <table class="inter-table"><tbody>${modeRows(c)}</tbody></table>
        <p class="caveat">${t.derivation}: ${c.derivation || t.derivationNone}${c.method ? ' · ' + c.method : ''}${c.originalCategories ? '<br>' + c.originalCategories : ''}</p>
        <div class="source-box"><b>${t.narrCite}</b><p>${c.source && c.source.citation && c.source.citation !== '[TO BE CONFIRMED]' ? c.source.citation : tbc}</p></div>`).join('')
    : `<table class="inter-table"><tbody>${modeRows(null)}</tbody></table>` + specBlock('counts', t.intersNoData);
  openDrawer(t.intersTitle, `
    <span class="drawer-year">${x.id} · ${cityName(x.city)} · ${stepLabel(decade())}</span>
    <h2>${tr(x.name)}</h2>
    <div class="caveat">${x.coordinatesConfirmed ? '' : `<b class="ph-flag">${t.intersLocFlag}</b>`}
      <p>${t.intersLocNote}</p></div>
    <p class="lead">${t.intersLead}</p>
    ${body}`);
  bindNeeds($('#drawerBody'));
}

function drawSites(list, layer, seen) {
  list.forEach(s => {
    const isNow = s.decade === decade();
    const col = fc(s.factor).c;
    const chosen = state.sel === s.id;
    /* a marker that was not on screen in the previous render fades in */
    const fresh = !lastSites.has(s.id);
    if (seen) seen.add(s.id);
    if (chosen) L.circleMarker(s.coordinates, { radius: 15, color: col, weight: 1, fill: false, dashArray: '2,3' }).addTo(layer);
    /* placeholder records are drawn hollow with a dashed edge so an unconfirmed
       point can never be mistaken for a verified one */
    const style = s.placeholder
      ? { radius: isNow ? 8 : 5, color: col, weight: isNow ? 2 : 1.2, dashArray: '2,2',
          fillColor: '#F1EFE9', fillOpacity: isNow ? .55 : .25, className: fresh ? 'site-new' : '' }
      : { radius: isNow ? 8 : 5, color: '#F1EFE9', weight: isNow ? 2 : 1,
          fillColor: col, fillOpacity: isNow ? .95 : .45, className: fresh ? 'site-new' : '' };
    const m = L.circleMarker(s.coordinates, style).addTo(layer);
    m.bindTooltip(`${stepLabel(s.decade)} · ${tr(s.title)}${s.placeholder ? ' · ' + T().placeholderFlag : ''}`,
      { direction: 'top', offset: [0, -8] });
    m.on('click', () => selectSite(s.id));
    /* a wider transparent disc keeps the point tappable on a touch screen */
    L.circleMarker(s.coordinates, { radius: 17, stroke: false, fillColor: col, fillOpacity: .01 })
      .on('click', () => selectSite(s.id)).addTo(layer);
  });
}
/* Rights, not hosting location, decide whether an image is embedded. A scan from any
   archive may be embedded once cleared; a file that is not cleared is never embedded,
   wherever it sits. Plan §1.1: no image goes in before its rights are checked. */
const imgCredit = img => img.credit || '[TO BE CONFIRMED]';

function recordMedia(s) {
  const t = T(), img = s.image;
  if (!img) return `<div class="rec-plate"><span>${t.plate}</span></div>`;

  const src = img.cleared === true
    ? (img.commons
        ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(img.commons)}?width=900`
        : img.url || null)
    : null;

  if (src) {
    const link = img.link
      ? ` · <a href="${img.link}" target="_blank" rel="noopener">${t.viewSource}</a>` : '';
    return `<img class="rec-img" src="${src}" alt="${tr(s.title)}" loading="lazy">`
      + `<div class="rec-cap">${imgCredit(img)}${link}</div>`;
  }
  if (img.link) {
    return `<div class="rec-slot"><span>${t.offsite}</span>`
      + `<a href="${img.link}" target="_blank" rel="noopener">${t.viewSource}</a></div>`
      + `<div class="rec-cap">${imgCredit(img)}</div>`;
  }
  return `<div class="rec-plate"><span>${t.plate}</span></div>`;
}

function rightsBadge(s) {
  const t = T(), img = s.image;
  if (!img) return `<div class="rights-badge pending"><i></i>${t.noImage}</div>`;
  const label = img.rights || t.rightsUnknown;
  const body = img.rightsURI
    ? `<a href="${img.rightsURI}" target="_blank" rel="noopener">${label}</a>`
    : label;
  return `<div class="rights-badge ${img.cleared === true ? 'ok' : 'pending'}"><i></i>${body}</div>`;
}
/* ---------- image records ----------
   A record is complete without its picture (plan §1.1): the card carries caption, place,
   year, creator, holding archive, reference and rights, and the picture is embedded only
   when cleared is true. Until then the card links out to the archive. */
const imagesOf = c => IMAGES.filter(i => i.city === c);
const imgById = id => IMAGES.find(i => i.id === id);
const dlRow = (k, v) => v ? `<dt>${k}</dt><dd>${v}</dd>` : '';
function embedState(img) {
  const t = T();
  if (img.cleared === true) return t.imgEmbedYes(img.clearedBy || '[TO BE CONFIRMED]', img.clearedOn);
  const may = img.mayEmbed || (img.rights && img.rights.mayEmbed);
  return may === 'no' ? t.imgEmbedNo : t.imgEmbedUnresolved;
}
function imageCard(img, compact) {
  const t = T(), rights = img.rights || {};
  const link = img.url ? `<a href="${img.url}" target="_blank" rel="noopener">${t.viewSource}</a>` : '';
  const pic = img.cleared === true && img.file
    ? `<img src="${img.file}" alt="${tr(img.caption)}" loading="lazy">`
    : `<div class="rec-slot"><span>${t.offsite}</span>${link}</div>`;
  const rightsTxt = rights.statement
    ? (rights.uri ? `<a href="${rights.uri}" target="_blank" rel="noopener">${rights.statement}</a>` : rights.statement)
    : t.rightsUnknown;
  const held = [img.archive, img.reference].filter(Boolean).join(' · ');
  return `<article class="img-card${img.placeholder ? ' is-placeholder' : ''}" data-img="${img.id}">
    ${pic}
    <p class="img-cap">${tr(img.caption) || `<span class="tbc">[TO BE CONFIRMED]</span>`}</p>
    <dl>${dlRow(t.imgMade, img.year)}${dlRow(t.imgShows, img.place)}${dlRow(t.imgCreator, img.creator)}${dlRow(t.imgHeld, held)}
      ${dlRow(t.imgRights, rightsTxt)}${dlRow(t.imgBasis, rights.basis)}${dlRow(t.imgEmbed, embedState(img))}
      ${dlRow(t.imgCaveat, tr(img.caveat))}${compact ? '' : dlRow(t.imgNotes, img.notes)}</dl>
    <p class="rec-cap">${img.attribution || ''} <span class="mono">${img.id}</span></p>
  </article>`;
}
function imageStrip(city) {
  const t = T(), list = imagesOf(city);
  const body = list.length ? list.map(i => imageCard(i, true)).join('') : specBlock('images', t.needImages(cityName(city)));
  return `<div class="img-strip"><h4>${t.imgH}</h4><p class="img-intro">${t.imgIntro}</p>${body}</div>`;
}
function openImageDrawer(id) {
  const img = imgById(id);
  if (!img) return;
  openDrawer(T().imgDrawer, `<span class="drawer-year">${cityName(img.city)}${img.year ? ' · ' + img.year : ''}</span>` + imageCard(img, false));
}
function drawImages(city, layer) {
  imagesOf(city).filter(i => Array.isArray(i.coordinates)).forEach(i => {
    L.marker(i.coordinates, { icon: L.divIcon({ className: 'img-marker', html: '<span></span>', iconSize: [14, 14], iconAnchor: [7, 7] }) })
      .bindTooltip(`${T().imgLegend} · ${tr(i.caption) || i.id}`, { direction: 'top', offset: [0, -8] })
      .on('click', () => openImageDrawer(i.id)).addTo(layer);
  });
}
/* Rows a site's own image carries beyond credit and rights, when the record has them. */
function siteImageRows(img) {
  const t = T();
  const held = [img.archive, img.reference].filter(Boolean).join(' · ');
  const rows = dlRow(t.imgMade, img.year) + dlRow(t.imgCreator, img.creator) + dlRow(t.imgHeld, held)
    + dlRow(t.imgBasis, img.rightsBasis) + dlRow(t.imgEmbed, embedState(img));
  return rows ? `<dl class="img-dl">${rows}</dl>` : '';
}

function renderRecord() {
  const r = $('#record'), t = T();
  const s = state.sel && siteById(state.sel);
  if (!s) {
    /* no site chosen: the city's image records live here, or the specification of one */
    r.innerHTML = `<div class="empty">${t.empty}</div>` + (state.global ? '' : imageStrip(state.city));
    r.classList.remove('is-placeholder');
    return;
  }
  const f = fc(s.factor);
  r.classList.toggle('is-placeholder', !!s.placeholder);
  const flag = s.placeholder
    ? `<div class="ph-flag"><b>${t.placeholderFlag}</b>${t.placeholderBody}</div>`
    : `<div class="ok-flag"><i></i>${t.verifiedFlag}</div>`;
  const warn = (s.image && s.image.warn) ? `<div class="rec-warn">⚠ ${tr(s.image.warn)}</div>` : '';
  const src = s.source;
  const srcLine = s.placeholder
    ? `<b>${t.recSource}</b> <span class="tbc">${src.citation}</span>`
    : `<b>${t.recSource}</b> ${src.citation}`
      + (src.reference ? `<br><b>REF</b> ${src.reference}` : '')
      + (src.url ? `<br><a href="${src.url}" target="_blank" rel="noopener">${t.viewSource}</a>` : '');
  r.innerHTML = `${recordMedia(s)}${rightsBadge(s)}${s.image ? siteImageRows(s.image) : ''}${warn}${flag}
    <div class="rec-tag" style="color:${f.c}">${tr(f.label)} · ${stepLabel(s.decade)} · ${cityName(s.city)}</div>
    <h3 class="rec-title">${tr(s.title)}</h3>
    <p class="rec-text">${tr(s.narrative)}</p>
    <div class="rec-src">${srcLine}<br><b>${t.recRecord}</b> ${s.id}</div>
    <button class="rec-more" type="button" id="recMore">${t.readMore}</button>`;
  $('#recMore').onclick = () => openRecordDrawer(s.id);
}
/* Contiguous stretches that actually have a row, so a gap in the record is drawn
   as a gap instead of being bridged by a straight line. */
function splitRuns(rows) {
  const runs = [];
  let cur = [];
  rows.forEach((r, i) => {
    if (r) cur.push(i);
    else if (cur.length) { runs.push(cur); cur = []; }
  });
  if (cur.length) runs.push(cur);
  return runs;
}

function renderSplit() {
  const t = T(), CW = 300, CH = 96, n = DECADES.length, step = CW / (n - 1);
  const city = state.city;
  const rows = DECADES.map(d => { const r = splitFor(city, d); return r && Array.isArray(r.values) && r.values.every(v => v != null) ? r : null; });
  const runs = splitRuns(rows);
  const anyPlaceholder = rows.some(r => r && r.placeholder);
  const HATCH = `<defs><pattern id="hatch" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="6" stroke="#807C73" stroke-width="1" stroke-opacity=".35"></line></pattern></defs>`;

  let out = HATCH;
  runs.forEach(run => {
    let base = new Array(run.length).fill(0);
    SPLIT_C.forEach((col, k) => {
      const top = run.map((idx, j) => base[j] + rows[idx].values[k]);
      const op = anyPlaceholder ? '.5' : '.9';
      if (run.length === 1) {
        /* a lone step has no width to sweep, so it is drawn as a narrow bar */
        const x = Math.max(0, run[0] * step - 1.5);
        out += `<rect x="${x.toFixed(1)}" y="${(CH - top[0] / 100 * CH).toFixed(1)}" width="3" ` +
               `height="${((top[0] - base[0]) / 100 * CH).toFixed(1)}" fill="${col}" fill-opacity="${op}"></rect>`;
      } else {
        const up = run.map((idx, j) => `${(idx * step).toFixed(1)},${(CH - top[j] / 100 * CH).toFixed(1)}`);
        const dn = run.map((idx, j) => `${(idx * step).toFixed(1)},${(CH - base[j] / 100 * CH).toFixed(1)}`).reverse();
        out += `<polygon points="${up.concat(dn).join(' ')}" fill="${col}" fill-opacity="${op}"></polygon>`;
      }
      base = top;
    });
  });
  if (anyPlaceholder && runs.length) out += `<rect x="0" y="0" width="${CW}" height="${CH}" fill="url(#hatch)"></rect>`;

  /* stretches with no row at all read as empty, never as zero */
  for (let i = 0; i < n; ) {
    if (rows[i]) { i++; continue; }
    let j = i;
    while (j < n && !rows[j]) j++;
    const x1 = i === 0 ? 0 : (i - 0.5) * step;
    const x2 = j >= n ? CW : (j - 0.5) * step;
    out += `<rect x="${x1.toFixed(1)}" y="0" width="${(x2 - x1).toFixed(1)}" height="${CH}" fill="#EAE8E2"></rect>`
         + `<rect x="${x1.toFixed(1)}" y="0" width="${(x2 - x1).toFixed(1)}" height="${CH}" fill="url(#hatch)"></rect>`;
    i = j;
  }

  const cx = (state.di * step).toFixed(1);
  out += `<line x1="${cx}" y1="0" x2="${cx}" y2="${CH}" stroke="#1F1D19" stroke-width="1"></line>`;
  $('#splitChart').innerHTML = out;

  const cur = rows[state.di];
  const parts = [cur
    ? t.splitNote(stepLabel(decade()), cityName(city), cur.values)
    : t.splitNoneStep(stepLabel(decade()), cityName(city))];
  if (state.compare) {
    const b = splitFor(ensureCityB(), decade());
    parts.push(b
      ? t.splitNote(stepLabel(decade()), cityName(state.cityB), b.values)
      : t.splitNoneStep(stepLabel(decade()), cityName(state.cityB)));
  }
  $('#splitNote').textContent = parts.join(' ');

  if (!runs.length) {
    $('#splitCaption').innerHTML =
      `<span class="tbc">${t.splitAwaiting}</span> ${t.splitNoneCity(cityName(city))}` + specBlock('counts', t.splitNeed);
  } else if (anyPlaceholder) {
    $('#splitCaption').innerHTML = `<span class="tbc">${t.placeholderFlag}</span> ${t.splitPlaceholder}<br>`
      + `<b>${t.derivation}</b> ${(cur && cur.derivation) || t.derivationNone}`;
  } else {
    $('#splitCaption').textContent = t.splitCaption;
  }
}

function renderMapCard() {
  const t = T();
  $('#mapKicker').textContent = t.mapKicker;
  $('#mapYear').textContent = stepLabel(decade());
  if (state.global) {
    $('#mapTitle').textContent = t.mapGlobalTitle;
    $('#mapSub').textContent = t.mapGlobalSub;
  } else if (state.compare) {
    $('#mapTitle').textContent = t.mapCompareTitle(cityName(state.city), cityName(ensureCityB()));
    $('#mapSub').textContent = t.mapCompareSub;
  } else {
    $('#mapTitle').textContent = cityName(state.city);
    $('#mapSub').textContent = tr(storyAt(decade()).title);
  }
}
function syncUrl() {
  const q = new URLSearchParams({ lang: state.lang, city: state.city, d: String(decade()) });
  history.replaceState(null, '', location.pathname + '?' + q.toString());
}
function render() {
  if (state.sel) {
    const s = siteById(state.sel);
    if (!s || !shownSites().includes(s)) state.sel = null;
  }
  renderYear(); renderFactors(); renderPins(); renderInters(); renderRecord(); renderSplit(); renderMapCard(); renderSheetContext();
  refreshHist();
  /* the docked chapter depends on city, comparison and language, not on the slider */
  if (state.narrDock && !mq.matches && narrKey !== narrSig()) renderNarr($('#narrBody'));
  refreshPhaseActive();
  $$('.city-chip').forEach(b => {
    const c = b.dataset.city;
    b.classList.toggle('active', c === state.city && !state.compare && !state.global);
    b.classList.toggle('is-b', state.compare && c === state.cityB);
  });
  $('#compareBtn').classList.toggle('active', state.compare);
  if (state.compare) {
    $('#splitL').textContent = cityName(state.city);
    $('#splitR').textContent = cityName(ensureCityB());
  }
  $('#globalBtn').classList.toggle('active', state.global);
  $('#histBtn').disabled = state.global || !histCities().some(hasMaps);
  bindNeeds($('#panel'));
  syncUrl();
}

/* ---------- views ---------- */
function storyAt(y) { return STORIES.find(s => y >= s.from && y <= s.to) || STORIES[0]; }

function selectSite(id) {
  state.sel = id;
  renderRecord(); renderPins();
  if (mq.matches && state.sheet === 'peek') setSheet('half');
  setTimeout(() => revealRecord(), mq.matches ? 340 : 0);
}
/* bring the record card to the top of whichever element is doing the scrolling.
   offsetTop is measured against .panel, not the scroll container, so use rect deltas. */
function revealRecord() {
  const body = mq.matches ? $('#panelBody') : $('#panel');
  const label = $('#sl6');
  if (!body || !label) return;
  const delta = label.getBoundingClientRect().top - body.getBoundingClientRect().top;
  body.scrollTo({ top: body.scrollTop + delta - 8 });
}
function selectCity(id, { fly = true } = {}) {
  state.city = id; state.compare = false; state.global = false; state.sel = null;
  ensureCityB();
  updateSplit();
  $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === 'map'));
  if (fly) goTo(map, CITIES[id].center, CITIES[id].zoom, { duration: 1.1 });
  /* re-evaluate the overlay against the new city: it rewrites the status line, which
     otherwise keeps describing whichever city was selected before */
  state.histOverride = null;
  setHist(state.histOn);
  if (state.histOn) setSwipe(state.swipeOn);
  render();
}
function setCompare(on) {
  state.compare = on; state.global = false; state.sel = null;
  if (on) {
    ensureCityB();
    const z = Math.min(CITIES[state.city].zoom, CITIES[state.cityB].zoom);
    map.setView(CITIES[state.city].center, z, { animate: false });
    map2.setView(CITIES[state.cityB].center, z, { animate: false });
  } else {
    goTo(map, CITIES[state.city].center, CITIES[state.city].zoom, { duration: 1.1 });
  }
  updateSplit();
  $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === (on ? 'compare' : 'map')));
  render();
}
/* The right-hand panel overlays the map, so the split is measured against the map area
   actually visible to the left of it, not against the viewport. */
function layoutSplit() {
  const narrOff = state.narrDock ? $('#narr').offsetWidth : 0;
  const avail = Math.max(320, $('.panel').getBoundingClientRect().left - 14 - narrOff);
  document.documentElement.style.setProperty('--split-x', (avail / 2) + 'px');
}
function updateSplit() {
  const on = state.compare && !state.global;
  document.body.classList.toggle('split', on);
  if (on && !mq.matches) layoutSplit();
  if (on) {
    $('#splitL').textContent = cityName(state.city);
    $('#splitR').textContent = cityName(ensureCityB());
  }
  /* map2 is built inside a display:none container, so Leaflet starts with a zero size.
     Resizing it while still hidden makes Leaflet compute a NaN centre and throw, which
     would abort whichever click handler called us: only resize it once it is on screen. */
  const resize = () => {
    map.invalidateSize();
    if (map2 && on) map2.invalidateSize();
  };
  requestAnimationFrame(resize);
  setTimeout(resize, 220);
}

function setGlobal(on) {
  state.global = on; state.compare = false; state.sel = null;
  updateSplit();
  if (on) { setHist(false); goTo(map, [22, 12], 2.2, { duration: 1.1 }); }
  else goTo(map, CITIES[state.city].center, CITIES[state.city].zoom, { duration: 1.1 });
  render();
}
function setDecade(i) {
  state.di = Math.max(0, Math.min(DECADES.length - 1, i));
  $('#yearRange').value = state.di;
  render();
}

/* ---------- first-run guided tour ----------
   Seven steps that name the parts of the interface a first-time visitor cannot guess:
   what the timeline covers, what the marker shapes mean, and that most records are not
   yet confirmed. Purely explanatory: the backdrop blocks interaction so a step cannot
   leave the app in a state the next step does not expect. */
const TOUR_KEY = 'cc.tour.v1';
const TOUR = [
  { key: 'welcome' },
  { key: 'views',   sel: '.primary-nav', sheet: 'full' },
  { key: 'decade',  sel: '#decadeBlock', sheet: 'full' },
  { key: 'factors', sel: '#factors',     sheet: 'full' },
  { key: 'marks',   sel: '#mapLegend', mobile: '#sheetContext', sheet: 'peek' },
  { key: 'lang',    sel: '#langSwitch',  sheet: 'full' },
  { key: 'add',     sel: '#contribBtn',  sheet: 'peek' }
];
let tourAt = -1;

/* localStorage throws in some privacy modes: treat that as "already seen" so the tour
   never reopens on every load for a visitor whose choice cannot be remembered. */
function tourSeen() {
  try { return localStorage.getItem(TOUR_KEY) === '1'; } catch { return true; }
}
function rememberTour() {
  try { localStorage.setItem(TOUR_KEY, '1'); } catch { /* nothing to do */ }
}
const tourOpen = () => !$('#tour').hidden;

function startTour() {
  tourAt = 0;
  $('#tour').hidden = false;
  showTourStep();
}
function endTour() {
  $('#tour').hidden = true;
  rememberTour();
  $('#tourBtn').focus({ preventScroll: true });
}
function moveTour(dir) {
  const i = tourAt + dir;
  if (i < 0) return;
  if (i >= TOUR.length) { endTour(); return; }
  tourAt = i;
  showTourStep();
}
function showTourStep() {
  const t = T(), step = TOUR[tourAt];
  const copy = t.tour[step.key === 'add' && inboxOn() && t.tour.addInbox ? 'addInbox' : step.key];
  if (mq.matches && step.sheet) setSheet(step.sheet, { animate: false });
  $('#tourCount').textContent = t.tourOf(tourAt + 1, TOUR.length);
  $('#tourTitle').textContent = copy.t;
  $('#tourBody').textContent = copy.b;
  $('#tourSkip').textContent = t.tourSkip;
  $('#tourBack').textContent = t.tourBack;
  $('#tourBack').disabled = tourAt === 0;
  $('#tourNext').textContent = tourAt === TOUR.length - 1 ? t.tourDone : t.tourNext;
  const el = tourTarget(step);
  if (el) el.scrollIntoView({ block: 'center', inline: 'nearest' });
  /* Place synchronously so the highlight is right even in a background tab, where
     requestAnimationFrame never fires; the later passes only refine it once the
     scroll, and on a phone the sheet animation, have settled. */
  placeTour(step);
  requestAnimationFrame(() => placeTour(step));
  if (mq.matches) setTimeout(() => placeTour(step), 340);
}
function tourTarget(step) {
  const sel = (mq.matches && step.mobile) || step.sel;
  return sel ? $(sel) : null;
}
function placeTour(step) {
  const spot = $('#tourSpot'), tip = $('#tourTip');
  const el = tourTarget(step);
  const r = el && el.getBoundingClientRect();
  const shown = !!r && r.width > 0 && r.height > 0;
  const pad = 6;
  Object.assign(spot.style, shown
    ? { left: (r.left - pad) + 'px', top: (r.top - pad) + 'px',
        width: (r.width + pad * 2) + 'px', height: (r.height + pad * 2) + 'px', borderWidth: '1px' }
    /* no anchor: a zero-size spot still dims the whole screen through its box-shadow */
    : { left: '50%', top: '50%', width: '0px', height: '0px', borderWidth: '0px' });

  const tw = tip.offsetWidth, th = tip.offsetHeight, gap = 14, edge = 12;
  let left, top;
  if (!shown) {
    left = (innerWidth - tw) / 2; top = (innerHeight - th) / 2;
  } else if (r.bottom + gap + th <= innerHeight - edge) {
    top = r.bottom + gap; left = r.left + r.width / 2 - tw / 2;
  } else if (r.top - gap - th >= edge) {
    top = r.top - gap - th; left = r.left + r.width / 2 - tw / 2;
  } else if (r.left - gap - tw >= edge) {
    top = r.top; left = r.left - gap - tw;
  } else {
    top = r.top; left = r.right + gap;
  }
  tip.style.left = Math.max(edge, Math.min(left, innerWidth - tw - edge)) + 'px';
  tip.style.top = Math.max(edge, Math.min(top, innerHeight - th - edge)) + 'px';
  $('#tourNext').focus({ preventScroll: true });
}

/* ---------- empty states as specifications ----------
   An empty slot says what is missing, what the template asks for, and where to send it,
   so the interface in its data-gathering phase is its own instruction sheet. */
function specBlock(track, what) {
  const t = T(), row = t.contribTracks.find(x => x[0] === track);
  if (!row) return '';
  const [, , , needs, file, guide] = row;
  return `<div class="need">
    <p class="need-what">${what}</p>
    <b class="need-h">${t.needH}</b>
    <ul>${needs.map(n => `<li>${n}</li>`).join('')}</ul>
    <div class="need-actions">
      <button type="button" class="need-cta" data-track="${track}">${t.needCta}</button>
      <a href="${DOCS}${file}" download>${t.needTemplate}</a>
      <a href="${DOCS}${guide}" target="_blank" rel="noopener">${t.needGuide}</a>
    </div></div>`;
}
function bindNeeds(root) {
  $$('.need-cta', root || document).forEach(b => b.onclick = () => openContribute(b.dataset.track));
}
function openContribute(track) {
  contribTrack = track || null; contribRows = null;
  renderContribute();
  closeDrawer();
  if (!$('#contribDialog').open) $('#contribDialog').showModal();
}

/* ---------- guided contribution ----------
   Four tracks, each ending in the same place: a template to fill and a way to send it.
   With an inbox configured (config.js) the filled template can be dropped here; it is
   checked against the template's columns and posted to a private table that only the
   maintainer can read. Without one, the flow says to email it. Nothing writes to the site. */
const DOCS = './docs/data-submission/';
const INBOX_KIND = { counts: 'modal_split', images: 'image', story: 'story', maps: 'map' };
const TEMPLATE_HEADERS = {
  counts: 'city_name,city_slug,point_id,point_name,lat,lon,location_basis,year,mode_bicycle,mode_walking,mode_transit,mode_car,unit,total_observed,original_categories,mapping_notes,derivation,method,observed_date,observed_hours,source_citation,source_archive,source_reference,source_url,verified_by,verified_on,notes',
  images: 'city_slug,image_id,site_id,caption_en,shows_place,year,date_exact,lat,lon,creator,creator_death_year,archive,reference,source_url,rights_statement,rights_uri,rights_basis,permission_contact,permission_date,may_embed,attribution_text,cleared_by,cleared_on,caveat,notes',
  story: 'period_start,city_slug,title_en,body_en,factor,linked_site_ids,linked_image_ids,sources,source_archive,source_reference,contested_note,author,author_affiliation,written_on',
  maps: 'city_slug,map_id,title,year,year_basis,publisher,scale,series_or_sheet,archive,reference,source_url,georeferenced,georef_method,georef_file_url,tile_url,projection,rights_statement,rights_uri,rights_basis,may_publish,attribution_text,cleared_by,cleared_on,notes'
};
const REQUIRED = {
  counts: ['city_slug', 'point_id', 'year'], images: ['city_slug', 'image_id'],
  story: ['city_slug', 'period_start', 'title_en', 'body_en'], maps: ['city_slug', 'map_id']
};
let contribTrack = null, contribRows = null;

const inboxOn = () => !!(window.CC_CONFIG && CC_CONFIG.inboxUrl && CC_CONFIG.inboxAnonKey);
/* One insert per submission. return=minimal is required: the anon role may insert but
   cannot read the table back, so no representation could be returned. */
async function sendToInbox(rows) {
  /* a legacy anon key is a JWT and doubles as the bearer token; a publishable key
     (sb_publishable_…) is not, and PostgREST would reject it as one */
  const key = CC_CONFIG.inboxAnonKey;
  const headers = { apikey: key, 'Content-Type': 'application/json', Prefer: 'return=minimal' };
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;
  const res = await fetch(`${CC_CONFIG.inboxUrl.replace(/\/$/, '')}/rest/v1/contribution`, {
    method: 'POST', headers, body: JSON.stringify(rows)
  });
  if (!res.ok) throw new Error(`inbox HTTP ${res.status}`);
}
const contribution = (kind, payload, name, email, city) => ({
  kind, city_slug: city || null, submitted_name: name, submitted_email: email || null,
  client_lang: state.lang, tool: 'cc-tool2', payload
});

/* RFC 4180: quoted fields, doubled quotes, line breaks inside quotes, optional BOM. */
function parseCSV(text) {
  const rows = [], src = text.replace(/^﻿/, '');
  let row = [], cell = '', q = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (q) {
      if (ch === '"') { if (src[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim() !== ''));
}
/* The header must carry exactly the template's columns, in any order. Empty cells become
   null, so a gap stays a gap (docs/data-submission/README.md, step 3). */
function checkTemplate(track, text) {
  const t = T(), rows = parseCSV(text);
  if (!rows.length) return { issues: [t.contribNoRows], rows: [] };
  const header = rows[0].map(h => h.trim()), want = TEMPLATE_HEADERS[track].split(',');
  const missing = want.filter(h => !header.includes(h)), extra = header.filter(h => !want.includes(h));
  if (missing.length || extra.length) return { issues: [t.contribBadHeader(missing.join(', '), extra.join(', '))], rows: [] };
  const body = rows.slice(1);
  if (!body.length) return { issues: [t.contribNoRows], rows: [] };
  const issues = [], out = [];
  body.forEach((r, i) => {
    const o = {};
    header.forEach((h, j) => { const v = (r[j] || '').trim(); o[h] = v === '' ? null : v; });
    if (!CITIES[o.city_slug]) issues.push(t.contribRowIssue(i + 2, t.contribBadCity));
    REQUIRED[track].filter(f => o[f] == null).forEach(f => issues.push(t.contribRowIssue(i + 2, t.contribNeedField(f))));
    out.push(o);
  });
  return { issues, rows: out };
}

function renderContribute() {
  const t = T();
  const step = n => `<span class="contrib-step">${t.contribStep(n)}</span>`;
  $('#contribNote').textContent = inboxOn() ? t.contribNoteInbox : t.contribNote;

  if (!contribTrack) {
    $('#contribOptions').innerHTML = step(1) + `<h3>${t.contribPick}</h3>` +
      `<div class="contrib-tracks">${t.contribTracks.map(([id, label, sub]) =>
        `<button type="button" class="contrib-track" data-track="${id}">
           <b>${label}</b><span>${sub}</span>
         </button>`).join('')}</div>`;
    $$('#contribOptions .contrib-track').forEach(b => b.onclick = () => {
      contribTrack = b.dataset.track;
      renderContribute();
    });
    return;
  }

  const [, label, , needs, file, guide] = t.contribTracks.find(x => x[0] === contribTrack);
  const send = inboxOn()
    ? `<p class="contrib-p">${t.contribInboxLead}</p>
       <div class="contrib-form">
         <label class="pin-field"><span>${t.contribName}</span><input type="text" id="contribName" autocomplete="name" /></label>
         <label class="pin-field"><span>${t.contribEmail}</span><input type="email" id="contribEmail" autocomplete="email" /></label>
         <label class="contrib-file"><span>${t.contribFile}</span><input type="file" id="contribFile" accept=".csv,text/csv" /></label>
         <div class="contrib-check" id="contribCheck"></div>
         <button type="button" class="contrib-send" id="contribSendBtn" disabled>${t.contribSendBtn(0)}</button>
       </div>
       <p class="contrib-p contrib-or">${t.contribOr}</p>`
    : `<p class="contrib-p">${t.contribSend}</p>`;
  $('#contribOptions').innerHTML =
    `<button type="button" class="contrib-back" id="contribBack">${t.contribBack}</button>` +
    step(2) + `<h3>${label}</h3>` +
    `<p class="contrib-sub">${t.contribNeeds}</p>` +
    `<ul class="contrib-needs">${needs.map(n => `<li>${n}</li>`).join('')}</ul>` +
    `<div class="contrib-rule">${t.contribRule}</div>` +
    `<div class="contrib-actions">
       <a class="btn contrib-dl" href="${DOCS}${file}" download>${t.contribDownload}</a>
       <a class="contrib-guide" href="${DOCS}${guide}" target="_blank" rel="noopener">${t.contribGuide}</a>
     </div>` +
    step(3) + `<h3>${t.contribSendH}</h3>` + send +
    step(4) + `<h3>${t.contribNextH}</h3><p class="contrib-p">${t.contribNext}</p>`;
  $('#contribBack').onclick = () => { contribTrack = null; contribRows = null; renderContribute(); };
  if (inboxOn()) bindContribForm();
}
function bindContribForm() {
  const t = T(), check = $('#contribCheck'), btn = $('#contribSendBtn');
  contribRows = null;
  $('#contribFile').addEventListener('change', e => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    f.text().then(text => {
      const { issues, rows } = checkTemplate(contribTrack, text);
      contribRows = issues.length ? null : rows;
      check.innerHTML = issues.length
        ? `<ul class="bad">${issues.slice(0, 12).map(x => `<li>${x}</li>`).join('')}${issues.length > 12 ? '<li>…</li>' : ''}</ul>`
        : `<p class="ok">${t.contribRows(rows.length)}</p>`;
      btn.disabled = !contribRows;
      btn.textContent = t.contribSendBtn(contribRows ? contribRows.length : 0);
    });
  });
  btn.onclick = async () => {
    const name = $('#contribName').value.trim(), email = $('#contribEmail').value.trim();
    if (!name || !email) { toast(t.contribNeedName); $('#contribName').focus(); return; }
    if (!contribRows) return;
    btn.disabled = true;
    try {
      await sendToInbox(contribRows.map(r => contribution(INBOX_KIND[contribTrack], r, name, email, r.city_slug)));
      check.innerHTML = `<p class="ok">${t.contribSent(contribRows.length)}</p>`;
      toast(t.contribSent(contribRows.length));
      contribRows = null; $('#contribFile').value = '';
    } catch (err) {
      toast(t.contribFail); btn.disabled = false;
    }
  };
}

/* ---------- record review ----------
   A reviewer needs no account, because reviewing produces a proposal rather than a
   change: the decisions below are copied out and applied by hand. The only write path
   remains the maintainer's, so there is nothing here to protect with a login. */
const reviewState = new Map();

function reviewable() {
  return SITES.filter(s => s.placeholder)
    .sort((a, b) => a.city.localeCompare(b.city) || a.decade - b.decade);
}
/* A record with no citation cannot be checked against anything, so it is triaged.
   One that has a citation can be verified in the ordinary sense. */
const hasSource = s => !!(s.source && s.source.citation && s.source.citation !== '[TO BE CONFIRMED]');

function openReview() {
  const t = T();
  $('#reviewEyebrow').textContent = t.dataStatus;
  $('#reviewTitle').textContent = t.reviewTitle;
  $('#reviewLead').textContent = t.reviewLead;
  $('#reviewNameLbl').textContent = t.reviewName;
  $('#reviewName').placeholder = t.reviewNamePh;
  $('#reviewOutLbl').textContent = t.reviewOutLbl;
  $('#reviewCopy').querySelector('.t').textContent = t.reviewCopy;
  $('#reviewSend').hidden = !inboxOn();
  $('#reviewSend').querySelector('.t').textContent = t.reviewSend;
  renderReviewQueue();
  $('#reviewDialog').showModal();
}

function renderReviewQueue() {
  const t = T(), list = reviewable();
  if (!list.length) { $('#reviewQueue').innerHTML = `<p class="review-empty">${t.reviewEmpty}</p>`; return; }

  let lastCity = null;
  $('#reviewQueue').innerHTML = list.map(s => {
    const head = s.city === lastCity ? '' : `<h3 class="review-city">${cityName(s.city)}</h3>`;
    lastCity = s.city;
    const choices = hasSource(s)
      ? [['ok', t.reviewMatches], ['fix', t.reviewFix], ['cant', t.reviewCant]]
      : [['keep', t.reviewKeepWith], ['find', t.reviewKeepFind], ['drop', t.reviewDrop]];
    const cur = reviewState.get(s.id) || {};
    const f = fc(s.factor);
    return head + `<article class="review-row" data-id="${s.id}">
      <header>
        <span class="review-id">${s.id}</span>
        <span class="review-step">${stepLabel(s.decade)}</span>
        <span class="review-factor" style="--fc:${f.c}">${tr(f.label)}</span>
      </header>
      <h4>${tr(s.title)}</h4>
      <p class="review-narr">${tr(s.narrative) || ''}</p>
      <p class="review-cite">${hasSource(s) ? s.source.citation : `<span class="tbc">${t.reviewNoCite}</span>`}</p>
      <div class="review-choices">${choices.map(([k, label]) =>
        `<button type="button" data-c="${k}"${cur.choice === k ? ' class="on"' : ''}>${label}</button>`).join('')}</div>
      <input type="text" class="review-src" placeholder="${t.reviewSourcePh}" value="${(cur.source || '').replace(/"/g, '&quot;')}" ${cur.choice === 'keep' || cur.choice === 'fix' ? '' : 'hidden'} />
      <input type="text" class="review-note" placeholder="${t.reviewNotePh}" value="${(cur.note || '').replace(/"/g, '&quot;')}" />
    </article>`;
  }).join('');

  $$('#reviewQueue .review-row').forEach(row => {
    const id = row.dataset.id;
    $$('button', row).forEach(b => b.onclick = () => {
      const cur = reviewState.get(id) || {};
      cur.choice = cur.choice === b.dataset.c ? null : b.dataset.c;
      reviewState.set(id, cur);
      $$('button', row).forEach(x => x.classList.toggle('on', x.dataset.c === cur.choice));
      /* a source box only makes sense where a source is being supplied */
      row.querySelector('.review-src').hidden = !(cur.choice === 'keep' || cur.choice === 'fix');
      refreshReviewOut();
    });
    row.querySelector('.review-src').addEventListener('input', e => {
      const cur = reviewState.get(id) || {}; cur.source = e.target.value; reviewState.set(id, cur); refreshReviewOut();
    });
    row.querySelector('.review-note').addEventListener('input', e => {
      const cur = reviewState.get(id) || {}; cur.note = e.target.value; reviewState.set(id, cur); refreshReviewOut();
    });
  });
  refreshReviewOut();
}

function refreshReviewOut() {
  const t = T(), list = reviewable();
  const decided = list.filter(s => (reviewState.get(s.id) || {}).choice);
  $('#reviewCount').textContent = t.reviewCount(decided.length, list.length);
  $('#reviewOut').value = JSON.stringify({
    reviewedBy: $('#reviewName').value.trim() || '[TO BE CONFIRMED]',
    reviewedOn: null,
    tool: 'Cycling Cities Tool 2 review queue',
    decisions: decided.map(s => {
      const c = reviewState.get(s.id);
      return {
        id: s.id,
        decision: c.choice,
        source: c.source ? c.source.trim() : null,
        note: c.note ? c.note.trim() : null
      };
    })
  }, null, 2);
}

/* Decisions can go to the inbox as well as to the clipboard. They stay a proposal either
   way: the maintainer applies them by hand and git records the change. */
async function sendReview() {
  const t = T(), name = $('#reviewName').value.trim();
  if (!name) { toast(t.reviewNeedName); $('#reviewName').focus(); return; }
  refreshReviewOut();
  try {
    await sendToInbox([contribution('review', JSON.parse($('#reviewOut').value), name, null, null)]);
    toast(t.reviewSent);
  } catch { toast(t.inboxFail); }
}

/* ---------- drawer ---------- */
function openDrawer(eyebrow, html) {
  $('#drawerEyebrow').textContent = eyebrow;
  $('#drawerBody').innerHTML = html;
  $('#drawerBody').scrollTop = 0;
  $('#drawer').classList.add('open');
  $('#drawer').setAttribute('aria-hidden', 'false');
  $('.drawer-backdrop').classList.add('open');
}
function closeDrawer() {
  $('#drawer').classList.remove('open');
  $('#drawer').setAttribute('aria-hidden', 'true');
  $('.drawer-backdrop').classList.remove('open');
}
/* ---------- narrative ----------
   The narrative reads as a column beside the map, the way the CMU Telegraph project sets it
   out, rather than as a drawer that covers the thing it describes. A phone has no room for
   two columns, so there it stays an overlay.

   Two views share the column. The shared frame is the project's common argument, read as
   nine periods. A city chapter is that city's paragraphs arranged under the same five
   factors, so two chapters can be read side by side factor for factor; where a city has
   no paragraph for a factor the column says what is needed instead of filling the gap. */
let narrKey = '';
const narrSig = () => [state.lang, state.narrShared, state.global, state.compare, state.city, state.cityB].join('|');

function narrativeHTML() {
  const t = T();
  const shared = state.global || state.narrShared;
  const switcher = state.global ? '' : shared
    ? `<button type="button" class="narr-switch" data-narr="city">${t.narrToCity(cityName(state.city))}</button>`
    : `<button type="button" class="narr-switch" data-narr="shared">${t.narrToShared}</button>`;
  if (shared) return `
    <span class="drawer-year">${t.narrShared}</span>
    <h2>${t.narrTitle}</h2>
    <p class="lead">${t.narrIntro}</p>${switcher}
    <div class="phases">${STORIES.map(phaseCard).join('')}</div>
    <h3>${t.storyQ1}</h3><p>${t.storyA1}</p>
    <h3>${t.storyQ2}</h3><p>${t.storyA2}</p>
    <div class="source-box"><b>${t.storyBox}</b><p>${t.storyBoxBody}</p></div>
    <p class="model-note">${t.narrModel}
      <a href="https://telegraph.library.cmu.edu/" target="_blank" rel="noopener">telegraph.library.cmu.edu</a></p>`;
  const cities = state.compare ? [state.city, ensureCityB()] : [state.city];
  return `
    <span class="drawer-year">${cities.map(cityName).join(' × ')}</span>
    <h2>${cities.length > 1 ? t.narrCompareH : t.narrChapter(cityName(state.city))}</h2>
    <p class="lead">${cities.length > 1 ? t.narrCompareIntro : t.narrChapterIntro}</p>${switcher}
    ${FACTORS.map(f => `<section class="chap" style="--fc:${f.c}">
      <header><span class="chap-n">${f.n}</span><h3>${tr(f.label)}</h3><span class="chap-sub">${tr(f.sub)}</span></header>
      ${cities.map(c => chapterParas(c, f, cities.length > 1)).join('')}
    </section>`).join('')}
    <div class="source-box"><b>${t.storyBox}</b><p>${t.storyBoxBody}</p></div>`;
}
function chapterParas(c, f, labelled) {
  const t = T();
  const paras = (NARR[c] || []).filter(p => p.factor === f.id).sort((a, b) => a.period - b.period);
  const label = labelled ? `<h4 class="chap-city">${cityName(c)}</h4>` : '';
  if (!paras.length) return label + specBlock('story', t.needStory(tr(f.label), cityName(c)));
  return label + paras.map(paraCard).join('');
}
/* One city paragraph. Three honest states: Lorem Ipsum placeholder, submitted but unverified,
   and verified. Linked image records appear as cards, never as bare pictures. */
function paraCard(p) {
  const t = T(), st = STORIES.find(x => x.from === p.period);
  const span = st ? (st.from === st.to ? stepLabel(st.from) : `${stepLabel(st.from)}–${stepLabel(st.to)}`) : stepLabel(p.period);
  const text = p.placeholder
    ? `<div class="draft"><b class="ph-flag">${t.narrDraft}</b><p class="draft-note">${t.narrDraftCity}</p>
         <h5 class="lorem-t">${tr(p.title)}</h5><p class="lorem">${tr(p.body)}</p></div>`
    : `${p.verified ? '' : `<div class="ph-flag"><b>${t.placeholderFlag}</b>${t.narrUnverified}</div>`}
       <h5>${tr(p.title)}</h5><p class="phase-body">${tr(p.body)}</p>`;
  const by = p.author ? `${t.narrBy} ${p.author}` : t.narrUnsigned;
  const cite = p.source && p.source.citation && p.source.citation !== '[TO BE CONFIRMED]'
    ? p.source.citation : `<span class="tbc">[TO BE CONFIRMED]</span>`;
  const imgs = (p.linkedImages || []).map(imgById).filter(Boolean).map(i => imageCard(i, true)).join('');
  return `<article class="phase para" data-decade="${p.period}">
    <header><span class="phase-span">${span}</span><span class="para-by">${by}</span></header>
    ${text}${imgs}
    <p class="phase-cite"><b>${t.narrCite}</b> ${cite}</p>
    <button type="button" class="phase-go"></button>
  </article>`;
}

function bindPhases(root) {
  $$('.phase-go', root).forEach(b => b.onclick = () => {
    const card = b.closest('.phase');
    const i = DECADES.indexOf(+card.dataset.decade);
    if (i >= 0) setDecade(i);
    if (mq.matches && root.id === 'drawerBody') closeDrawer();
    else card.scrollIntoView({ block: 'nearest' });
  });
  $$('.narr-switch', root).forEach(b => b.onclick = () => {
    state.narrShared = b.dataset.narr === 'shared';
    renderNarr(root);
  });
  refreshPhaseActive();
}
function renderNarr(root) {
  root.innerHTML = narrativeHTML();
  bindPhases(root);
  bindNeeds(root);
  narrKey = narrSig();
}

const NARR_KEY = 'cc.narr.v1';
function setNarrDock(on) {
  state.narrDock = !!on;
  /* the state class must not collide with the component class, or every #narr rule
     would also match <body> */
  document.body.classList.toggle('narr-open', state.narrDock);
  $('#narr').hidden = !state.narrDock;
  if (state.narrDock && !mq.matches) {
    $('#narrEyebrow').textContent = T().drawerStory;
    renderNarr($('#narrBody'));
  }
  try { localStorage.setItem(NARR_KEY, state.narrDock ? '1' : '0'); } catch { /* private mode */ }
  const resize = () => {
    if (state.compare && !mq.matches) layoutSplit();
    map.invalidateSize();
    if (map2) map2.invalidateSize();
  };
  requestAnimationFrame(resize);
  setTimeout(resize, 260);
}

function openStoryDrawer() {
  if (!mq.matches) { setNarrDock(true); return; }
  openDrawer(T().drawerStory, '');
  renderNarr($('#drawerBody'));
}

/* One period of the shared frame. The body text is prototype copy; the city paragraphs,
   including the Lorem Ipsum placeholders, live in the chapters. */
function phaseCard(st, i) {
  const t = T(), f = fc(st.factor);
  const span = st.from === st.to ? stepLabel(st.from) : `${stepLabel(st.from)}–${stepLabel(st.to)}`;
  return `<article class="phase" data-decade="${st.from}">
    <header>
      <span class="phase-n">${t.narrPhase} ${String(i + 1).padStart(2, '0')}</span>
      <span class="phase-span">${span}</span>
      <span class="phase-factor" style="--fc:${f.c}">${tr(f.label)}</span>
    </header>
    <h4>${tr(st.title)}</h4>
    <p class="phase-body">${tr(st.body)}</p>
    <p class="phase-cite"><b>${t.narrCite}</b> <span class="tbc">[TO BE CONFIRMED]</span></p>
    <button type="button" class="phase-go"></button>
  </article>`;
}

function refreshPhaseActive() {
  const cards = $$('.phase');
  if (!cards.length) return;
  const t = T(), cur = storyAt(decade());
  cards.forEach(el => {
    const on = +el.dataset.decade === cur.from;
    const go = el.querySelector('.phase-go');
    el.classList.toggle('active', on);
    go.textContent = on ? t.narrActive : t.narrJump;
    go.disabled = on;
  });
}
function openMethodDrawer() {
  const t = T();
  openDrawer(t.drawerMethod, `
    <span class="drawer-year">5-FACTOR ANALYSIS</span>
    <h2>${t.methodTitle}</h2>
    <p class="lead">${t.methodLead}</p>
    <h3>${t.methodH1}</h3>
    <ol>${FACTORS.map(f => `<li>${tr(f.label)}：${tr(f.sub)}</li>`).join('')}</ol>
    <h3>${t.methodH2}</h3><p>${t.methodBody}</p>
    <div class="source-box"><b>${t.methodBox}</b><p>${t.methodBoxBody}</p></div>`);
}
function openSourcesDrawer() {
  const t = T();
  const rows = shownSites().map(s => {
    const rights = !s.image ? t.rightsNone : (s.image.cleared ? t.rightsCleared : t.rightsPending);
    return `<tr class="${s.placeholder ? 'row-ph' : ''}">
      <td class="mono">${s.decade}s</td>
      <td>${tr(s.title)}<br><span class="mono">${s.id}</span></td>
      <td class="mono">${s.placeholder ? t.placeholderFlag : t.verifiedFlag}</td>
      <td class="mono">${rights}</td></tr>`;
  });
  openDrawer(t.drawerSources, `
    <span class="drawer-year">${(visibleCities().length ? visibleCities() : [state.city]).map(cityName).join(' · ')} · ≤ ${stepLabel(decade())}</span>
    <h2>${t.sourcesTitle}</h2>
    <p class="lead">${t.sourcesLead}</p>
    <table class="source-table">
      <thead><tr><th>${t.thDecade}</th><th>${t.thSite}</th><th>${t.thStatusCol}</th><th>${t.thRights}</th></tr></thead>
      <tbody>${rows.join('') || `<tr><td colspan="4">${t.searchNone}</td></tr>`}</tbody>
    </table>
    <div class="source-box"><b>${t.sourcesBox}</b><p>${t.sourcesBoxBody}</p></div>`);
}
function openStatusDrawer() {
  const t = T();
  const ok = SITES.filter(s => !s.placeholder);
  const ph = SITES.filter(s => s.placeholder);
  openDrawer(t.dataStatus, `
    <span class="drawer-year">${META.sites.updated} · ${ok.length} / ${SITES.length}</span>
    <h2>${t.statusTitle}</h2>
    <p class="lead">${t.statusLead}</p>
    <h3>${t.statusVerified} (${ok.length})</h3>
    <table class="source-table">
      <thead><tr><th>${t.thSite}</th><th>${t.thRights}</th></tr></thead>
      <tbody>${ok.map(s => `<tr><td>${tr(s.title)}<br><span class="mono">${s.source.reference}</span>`
        + `${s.source.url ? `<br><a href="${s.source.url}" target="_blank" rel="noopener">${t.viewSource}</a>` : ''}</td>`
        + `<td class="mono">${s.image ? (s.image.cleared ? t.rightsCleared : t.rightsPending) : t.rightsNone}</td></tr>`).join('')}</tbody>
    </table>
    <p class="caveat">${t.statusCaveat}</p>
    <h3>${t.statusPlaceholder} (${ph.length})</h3>
    <p>${t.placeholderBody}</p>
    <h3>${t.statusSplitH}</h3><p>${t.splitPlaceholder}</p>
    <h3>${t.statusOverlayH}</h3><p>${t.statusOverlayBody}</p>
    <h3>${t.statusMapsH}</h3>
    <table class="source-table">
      <thead><tr><th>${t.thCity}</th><th>${t.thMaps}</th></tr></thead>
      <tbody>${Object.keys(CITIES).map(c => {
        const yrs = [...new Set(mapsOf(c).filter(m => m.year != null).map(m => m.year))].sort();
        const ud = undatedMap(c);
        const cell = (yrs.length ? yrs.join(' ') : '') + (ud ? (yrs.length ? ' · ' : '') + t.undatedYear : '')
          || `<span class="tbc">${t.splitAwaiting}</span>`;
        return `<tr><td>${cityName(c)}</td><td class="mono wrap">${cell}</td></tr>`; }).join('')}</tbody>
    </table>
    <div class="source-box"><b>${t.statusNeededH}</b><p>${t.statusNeededBody}</p></div>`);
}
function citationFor(id) {
  const s = siteById(id);
  if (!s || s.placeholder) return null;
  return `Cycling Cities Research Network, “${s.title.en},” ${CITIES[s.city].name.en}, ${s.decade}s. `
    + `${s.source.archive}, ${s.source.reference}. Record ${s.id}.`;
}
function openRecordDrawer(id) {
  const t = T(), s = siteById(id), f = fc(s.factor);
  const cite = citationFor(id);
  openDrawer(t.drawerRecord, `
    <span class="drawer-year">${stepLabel(s.decade)} · ${cityName(s.city)} · ${tr(f.label)}</span>
    <h2>${tr(s.title)}</h2>
    ${s.placeholder ? `<div class="ph-flag"><b>${t.placeholderFlag}</b>${t.placeholderBody}</div>` : ''}
    <p class="lead">${tr(s.narrative)}</p>
    <h3>${t.recSource}</h3>
    <p>${s.placeholder ? `<span class="tbc">${s.source.citation}</span>` : s.source.citation}</p>
    <h3>${t.recRights}</h3>
    <p>${s.image ? `${s.image.rights} — ${s.image.credit}` : t.noImage}</p>
    ${(s.image && s.image.warn) ? `<p class="caveat">⚠ ${tr(s.image.warn)}</p>` : ''}
    ${cite ? `<div class="source-box"><b>${t.citeLabel}</b><p>${cite}</p></div>`
           : `<div class="source-box"><b>${t.citeLabel}</b><p>${t.citeBlocked}</p></div>`}`);
}

/* ---------- search ---------- */
function searchIndex() {
  const t = T(), out = [];
  Object.keys(CITIES).forEach(c => out.push({ kind: t.kindCity, label: cityName(c), sub: CITIES[c].name.en, run: () => selectCity(c) }));
  DECADES.forEach((y, i) => out.push({ kind: t.kindDecade, label: stepLabel(y), sub: tr(ERAS[y]), run: () => setDecade(i) }));
  FACTORS.forEach(f => out.push({ kind: t.kindFactor, label: tr(f.label), sub: tr(f.sub), run: () => { state.active = new Set([f.id]); render(); } }));
  SITES.forEach(s => out.push({
    kind: t.kindSite, label: tr(s.title),
    sub: `${cityName(s.city)} · ${stepLabel(s.decade)}${s.placeholder ? ' · ' + t.placeholderFlag : ''}`,
    run: () => {
      selectCity(s.city, { fly: false });
      setDecade(DECADES.indexOf(s.decade));
      selectSite(s.id);
      goTo(map, s.coordinates, 15, { duration: 1.1 });
    }
  }));
  return out;
}
function runSearch(q) {
  const t = T(), items = searchIndex(), norm = q.trim().toLowerCase();
  const hits = norm
    ? items.filter(it => (it.label + ' ' + it.sub + ' ' + it.kind).toLowerCase().includes(norm)).slice(0, 24)
    : items.filter(it => it.kind === t.kindCity || it.kind === t.kindFactor);
  const box = $('#searchResults');
  box.innerHTML = `<div class="hint">${norm ? '' : t.searchQuick}</div>`
    + (hits.length ? hits.map((h, i) => `<button type="button" data-i="${i}"><span class="kind">${h.kind}</span><span><b>${h.label}</b><small>${h.sub}</small></span></button>`).join('')
                   : `<div class="hint">${t.searchNone}</div>`);
  $$('#searchResults button').forEach(b => b.onclick = () => { $('#searchDialog').close(); hits[+b.dataset.i].run(); });
}

/* ---------- toast ---------- */
let toastTimer = null;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

/* ---------- timeline playback ----------
   One step every PLAY_MS: long enough for a sheet to arrive and dissolve into the next. */
const PLAY_MS = 1500;
function togglePlay() {
  if (state.playing) {
    state.playing = false;
    clearInterval(playTimer);
    $('#playBtn').classList.remove('playing');
    return;
  }
  if (state.di >= DECADES.length - 1) state.di = 0;
  state.playing = true;
  $('#playBtn').classList.add('playing');
  playTimer = setInterval(() => {
    if (state.di >= DECADES.length - 1) { togglePlay(); return; }
    setDecade(state.di + 1);
  }, PLAY_MS);
}

/* ---------- language ---------- */
function applyLang() {
  const t = T(), meta = LANGS.find(l => l.id === state.lang);
  document.documentElement.setAttribute('lang', meta.html);
  document.documentElement.setAttribute('data-lang', state.lang);

  $('#langSwitch').innerHTML = LANGS.map(l =>
    `<button type="button" data-lang="${l.id}" class="${l.id === state.lang ? 'active' : ''}" lang="${l.html}">${l.label}</button>`).join('');
  $$('#langSwitch button').forEach(b => b.onclick = () => { state.lang = b.dataset.lang; applyLang(); });

  $('#brandSub').textContent = t.brandSub;
  $$('.nav-item').forEach((b, i) => b.textContent = t.nav[i]);
  $('#searchBtn').setAttribute('aria-label', t.searchLabel);
  $('#menuBtn').setAttribute('aria-label', t.menuLabel);
  $('#tourBtn').setAttribute('aria-label', t.tourStart);
  $('#tourBtn').setAttribute('title', t.tourStart);
  if (tourOpen()) showTourStep();
  if (state.narrDock && !mq.matches) {
    $('#narrEyebrow').textContent = t.drawerStory;
    renderNarr($('#narrBody'));
  }
  $('#contribBtn').querySelector('span').textContent = t.contribute;

  $('#headEyebrow').textContent = t.eyebrow;
  $('#headTitle').textContent = t.title;
  $('#headMeta').textContent = t.meta;
  ['sl1','sl2','sl3','sl4','sl5','sl6','sl7'].forEach((id, i) => {
    const el = document.getElementById(id);
    el.querySelector('.txt').textContent = t.sl[i];
    el.querySelector('.en').textContent = t.slSub[i];
  });

  renderCityChips();
  $('#swapBtn').setAttribute('aria-label', t.swapNext);
  $('#swapBtn').setAttribute('title', t.swapNext);
  $('#sheetGrip').setAttribute('aria-label', t.sheetLabel);
  $('#compareBtn').querySelector('.t').textContent = t.compareTitle;
  $('#compareBtn').querySelector('.sub').textContent = t.compareWith(cityName(ensureCityB()));
  $('#intersBtn').querySelector('.t').textContent = t.intersToggle;
  /* the junction count is filled by renderInters, which knows the current city */
  $('#globalBtn').querySelector('.t').textContent = t.globalTitle;
  $('#globalBtn').querySelector('.en').textContent = t.globalCount;
  $('#playBtn').setAttribute('aria-label', state.playing ? t.pause : t.play);

  $('#histBtn').querySelector('.t').textContent = t.overlay;
  $('#histBtn').querySelector('.en').textContent = t.overlaySub;
  $('#swipeBtn').querySelector('.t').textContent = t.swipe;
  $('#swipeBtn').querySelector('.en').textContent = t.swipeSub;
  $('#opaLbl').textContent = t.opacity;
  $('#dvL').textContent = t.then;
  $('#dvR').textContent = t.now;

  $('#splitLegend').innerHTML = SPLIT_C.map((c, i) => `<span><i style="background:${c}"></i>${t.legend[i]}</span>`).join('');
  $$('.base-pill').forEach((b, i) => b.textContent = t.bases[i]);
  $('#sourcesBtn').textContent = t.allSources;
  $('#statusBtn').textContent = t.dataStatus;
  $('#shareBtn').querySelector('span').textContent = t.share;
  $('#citeBtn').querySelector('span').textContent = t.cite;
  $('#footText').innerHTML = t.foot;
  $('#flagText').textContent = `${t.statusPlaceholder} ${SITES.length - verifiedCount()} / ${SITES.length}`;

  if ($('#notice')) {
    $('#noticeTitle').textContent = t.noticeTitle;
    $('#noticeBody').textContent = t.noticeBody;
    $('#noticeLink').textContent = t.dataStatus;
    $('#noticeClose').setAttribute('aria-label', t.noticeClose);
  }
  $('#fitBtn').setAttribute('aria-label', t.fitLabel);
  $('#mapLegend').innerHTML = ['dot-ok', 'dot-ph', 'dot-now', 'dot-net']
    .map((cls, i) => `<span><i class="${cls}"></i>${t.mapLegend[i]}</span>`).join('')
    + `<span id="legendImg" hidden><i class="dot-img"></i>${t.imgLegend}</span>`;

  $('#searchInput').placeholder = t.searchPlaceholder;
  $('#contribEyebrow').textContent = t.contribEyebrow;
  $('#contribTitle').innerHTML = t.contribTitle;
  $('#contribBody').textContent = t.contribBody;
  renderContribute();
  $('#contribNote').textContent = t.contribNote;
  $('#pinBtn').querySelector('.t').textContent = t.pinOption;
  $('#pinBtn').querySelector('.sub').textContent = t.pinOptionSub;
  $('#pinHintText').textContent = t.pinHint;
  $('#pinGeo').textContent = t.pinGeo;
  $('#pinCancel').textContent = t.pinCancel;
  $('#pinEyebrow').textContent = t.contribute;
  $('#pinTitle').textContent = t.pinTitle;
  $('#pinCoordsLbl').textContent = t.pinCoords;
  $('#pinNameLbl').textContent = t.pinName;
  $('#pinDecadeLbl').textContent = t.pinDecade;
  $('#pinNoteLbl').textContent = t.pinNote;
  $('#pinCopy').querySelector('.t').textContent = t.pinCopy;
  $('#pinStore').textContent = inboxOn() ? t.pinStoreInbox : t.pinStore;
  $('#pinYouLbl').textContent = t.pinYou;
  $('#pinEmailLbl').textContent = t.pinEmail;
  $('#pinSend').hidden = !inboxOn();
  $('#pinSend').querySelector('.t').textContent = t.pinSend;
  $('#pinOutLbl').textContent = t.pinOutLbl;
  refreshPinOut();
  $('#pinDecade').innerHTML = DECADES.map(y => `<option value="${y}">${stepLabel(y)}</option>`).join('');
  $('#pinDecade').value = String(decade());

  render();
}

/* ---------- events ---------- */
function bindEvents() {
  $('#yearRange').max = String(DECADES.length - 1);
  $('#yearRange').addEventListener('input', e => setDecade(+e.target.value));
  $('#playBtn').onclick = togglePlay;
  $('#histBtn').onclick = () => setHist(!state.histOn);
  $('#swipeBtn').onclick = () => setSwipe(!state.swipeOn);
  $('#histOpa').addEventListener('input', e => {
    state.histOpa = +e.target.value / 100;
    $('#histOpaVal').textContent = e.target.value + '%';
    [1, 2].forEach(n => { const l = histLayers[n]; if (l && l._cc.shown && !(n === 1 && state.swipeOn)) l.setOpacity(state.histOpa); });
  });
  $$('.city-chip').forEach(b => b.onclick = () => selectCity(b.dataset.city));
  $('#swapBtn').onclick = () => {
    if (state.compare) {
      const others = otherCities();
      state.cityB = others[(others.indexOf(ensureCityB()) + 1) % others.length];
      setCompare(true);
      return;
    }
    const ids = Object.keys(CITIES);
    selectCity(ids[(ids.indexOf(state.city) + 1) % ids.length]);
  };
  $('#compareBtn').onclick = () => setCompare(!state.compare);
  $('#intersBtn').onclick = () => { state.inters = !state.inters; renderInters(); };
  $('#globalBtn').onclick = () => setGlobal(!state.global);
  $('#allFactors').onclick = () => {
    const showAll = state.active.size !== FACTORS.length;
    state.active = new Set(showAll ? FACTORS.map(f => f.id) : []);
    render();
  };
  $$('.base-pill').forEach(b => b.onclick = () => {
    $$('.base-pill').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    map.removeLayer(currentBase);
    currentBase = BASES[b.dataset.base].addTo(map);
  });
  addEventListener('resize', () => { if (state.compare) updateSplit(); });
  $('#zoomIn').onclick = () => map.zoomIn();
  $('#zoomOut').onclick = () => map.zoomOut();
  $('#fitBtn').onclick = () => {
    if (state.global) goTo(map, [22, 12], 2.2, { duration: .9 });
    else if (state.compare) {
      ensureCityB();
      const z = Math.min(CITIES[state.city].zoom, CITIES[state.cityB].zoom);
      goTo(map, CITIES[state.city].center, z, { duration: .9 });
      goTo(map2, CITIES[state.cityB].center, z, { duration: .9 });
    }
    else goTo(map, CITIES[state.city].center, CITIES[state.city].zoom, { duration: .9 });
  };
  $('#noticeClose').onclick = () => $('#notice').remove();
  $('#noticeLink').onclick = openStatusDrawer;
  $('#sourcesBtn').onclick = openSourcesDrawer;
  $('#statusBtn').onclick = openStatusDrawer;

  $$('.nav-item').forEach(b => b.onclick = () => {
    const v = b.dataset.view;
    $$('.nav-item').forEach(x => x.classList.toggle('active', x === b));
    if (v === 'compare') setCompare(true);
    else if (v === 'stories') openStoryDrawer();
    else if (v === 'method') openMethodDrawer();
    else { setCompare(false); setGlobal(false); }
  });
  $$('[data-close-drawer]').forEach(b => b.onclick = closeDrawer);

  $('#searchBtn').onclick = () => { $('#searchDialog').showModal(); runSearch(''); $('#searchInput').focus(); };
  $('#searchClose').onclick = () => $('#searchDialog').close();
  $('#searchInput').addEventListener('input', e => runSearch(e.target.value));
  $('#contribBtn').onclick = () => $('#contribDialog').showModal();
  $('#contribClose').onclick = () => $('#contribDialog').close();
  $('#pinBtn').onclick = startPinMode;
  $('#pinCancel').onclick = stopPinMode;
  $('#pinGeo').onclick = useMyLocation;
  $('#pinClose').onclick = () => $('#pinDialog').close();
  $('#pinDialog').addEventListener('click', e => { if (e.target.id === 'pinDialog') $('#pinDialog').close(); });
  ['#pinName', '#pinDecade', '#pinNote', '#pinYou', '#pinEmail'].forEach(sel => $(sel).addEventListener('input', refreshPinOut));
  $('#pinSend').onclick = sendPin;
  $('#reviewSend').onclick = sendReview;
  $('#pinCopy').onclick = async () => {
    refreshPinOut();
    try { await navigator.clipboard.writeText($('#pinOut').value); toast(T().pinCopied); }
    catch { $('#pinOut').select(); }   /* clipboard blocked: let the contributor copy by hand */
  };
  $('#menuBtn').onclick = () => mq.matches ? cycleSheet() : $('#panel').scrollTo({ top: 0, behavior: 'smooth' });
  $('#narrClose').onclick = () => setNarrDock(false);
  $('#reviewClose').onclick = () => $('#reviewDialog').close();
  $('#reviewDialog').addEventListener('click', e => { if (e.target.id === 'reviewDialog') $('#reviewDialog').close(); });
  $('#reviewName').addEventListener('input', refreshReviewOut);
  $('#reviewCopy').onclick = async () => {
    if (!$('#reviewName').value.trim()) { toast(T().reviewNeedName); $('#reviewName').focus(); return; }
    refreshReviewOut();
    try { await navigator.clipboard.writeText($('#reviewOut').value); toast(T().reviewCopied); }
    catch { $('#reviewOut').select(); }
  };
  $('#tourBtn').onclick = startTour;
  $('#tourSkip').onclick = endTour;
  $('#tourBack').onclick = () => moveTour(-1);
  $('#tourNext').onclick = () => moveTour(1);

  $('#shareBtn').onclick = async () => {
    syncUrl();
    try { await navigator.clipboard.writeText(location.href); toast(T().tShare); }
    catch { toast(location.href); }
  };
  $('#citeBtn').onclick = async () => {
    const cite = state.sel && citationFor(state.sel);
    if (!cite) { toast(T().citeBlocked); return; }
    try { await navigator.clipboard.writeText(cite); toast(T().tCite); }
    catch { toast(cite); }
  };

  document.addEventListener('keydown', e => {
    if (tourOpen()) {
      if (e.key === 'Escape') endTour();
      else if (e.key === 'ArrowRight') moveTour(1);
      else if (e.key === 'ArrowLeft') moveTour(-1);
      else return;
      e.preventDefault();
      return;
    }
    if (e.key === 'Escape') closeDrawer();
    if (e.target.tagName === 'INPUT') return;
    if (e.key === '/' && !$('#searchDialog').open) { e.preventDefault(); $('#searchBtn').click(); }
    if (e.key === 'ArrowRight' && state.di < DECADES.length - 1) setDecade(state.di + 1);
    if (e.key === 'ArrowLeft' && state.di > 0) setDecade(state.di - 1);
  });
  $('#searchDialog').addEventListener('click', e => { if (e.target.id === 'searchDialog') $('#searchDialog').close(); });
  $('#contribDialog').addEventListener('click', e => { if (e.target.id === 'contribDialog') $('#contribDialog').close(); });
  bindDividerDrag();
  bindSheetDrag();
  mq.addEventListener('change', applyLayout);
  mq.addEventListener('change', () => { if (state.narrDock) setNarrDock(true); });
  /* matchMedia 'change' is the normal signal, but a resize that crosses the breakpoint
     must never leave the decade block stranded in the mobile sheet, so check here too. */
  let wasNarrow = mq.matches;
  addEventListener('resize', () => {
    if (mq.matches !== wasNarrow) { wasNarrow = mq.matches; applyLayout(); }
    if (mq.matches) setSheet(state.sheet, { animate: false });
    if (state.compare && !mq.matches) layoutSplit();
    if (tourOpen()) placeTour(TOUR[tourAt]);
  });
}

/* ---------- boot ---------- */
loadData().then(() => {
  initMap();
  renderTicks();
  $('#yearRange').value = state.di;
  positionDivider();
  bindEvents();
  applyLayout();
  applyLang();
  document.body.classList.add('ready');
  setTimeout(() => map.invalidateSize(), 60);
  let dockWanted = false;
  try { dockWanted = localStorage.getItem(NARR_KEY) === '1'; } catch { /* private mode */ }
  if (dockWanted) setNarrDock(true);
  if (params.get('review') === '1') setTimeout(openReview, 400);
  const wants = params.get('tour');
  if (wants === '1' || (wants !== '0' && !tourSeen())) setTimeout(startTour, 700);
}).catch(showLoadError);
