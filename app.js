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
  global: false,
  histOn: false,
  swipeOn: false,
  splitPct: .5,
  histOpa: .85,
  playing: false
};

/* filled by loadData() */
let DECADES = [], ERAS = {}, FACTORS = [], SPLIT_C = [], CITIES = {}, NETWORK = [], STORIES = [];
let SITES = [], SPLIT = [], META = {};

const T = () => UI[state.lang];
const tr = obj => (obj && (obj[state.lang] || obj.en)) || '';
const decade = () => DECADES[state.di];
const fc = id => FACTORS.find(f => f.id === id);
const cityName = id => tr(CITIES[id].name);
const sitesOf = city => SITES.filter(s => s.city === city);
const siteById = id => SITES.find(s => s.id === id);
const splitFor = (city, d) => SPLIT.find(r => r.city === city && r.decade === d);
const verifiedCount = () => SITES.filter(s => !s.placeholder).length;

let map = null, currentBase = null, pins = null, network = null, histLayer = null, playTimer = null;
const BASES = {};

/* ---------- data ---------- */
async function loadJSON(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.json();
}
async function loadData() {
  const [ref, sites, split] = await Promise.all([
    loadJSON('./data/reference.json'),
    loadJSON('./data/sites.json'),
    loadJSON('./data/modalsplit.json')
  ]);
  DECADES = ref.decades; ERAS = ref.eras; FACTORS = ref.factors; SPLIT_C = ref.splitColours;
  CITIES = ref.cities; NETWORK = ref.networkCities; STORIES = ref.stories;
  SITES = sites.sites; SPLIT = split.records;
  META = { sites: sites.meta, split: split.meta };

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
const ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';
function initMap() {
  map = L.map('map', { zoomControl: false, minZoom: 2, worldCopyJump: true })
    .setView(CITIES[state.city].center, CITIES[state.city].zoom);
  map.createPane('hist');
  map.getPane('hist').style.zIndex = 350;
  Object.assign(BASES, {
    light:   L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',           { attribution: ATTR, maxZoom: 19, subdomains: 'abcd' }),
    plain:   L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',      { attribution: ATTR, maxZoom: 19, subdomains: 'abcd' }),
    voyager: L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { attribution: ATTR, maxZoom: 19, subdomains: 'abcd' })
  });
  currentBase = BASES.light.addTo(map);
  pins = L.layerGroup().addTo(map);
  network = L.layerGroup().addTo(map);
  map.on('move zoom moveend zoomend resize viewreset', updateClip);
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

/* ---------- historical overlay ---------- */
function histStatus(stateText, detail) {
  const h = CITIES[state.city].hist, t = T();
  $('#histStatus').innerHTML =
    `<span class="k">${t.kLayer}</span> ${tr(h.label)}<br>` +
    `<span class="k">${t.kZoom}</span> ${h.minZoom}–${h.maxZoom} · <span class="k">${t.kStatus}</span> ${stateText}` +
    (detail ? `<br><span class="k">${t.kNote}</span> ${detail}` : '');
}
function removeHist() { if (histLayer) { map.removeLayer(histLayer); histLayer = null; } }
function addHist() {
  removeHist();
  const h = CITIES[state.city].hist, t = T();
  if (h.kind === 'pmtiles') {
    const l = pmtilesLayer(h.url, { minZoom: h.minZoom, maxZoom: h.maxZoom,
      bounds: L.latLngBounds(h.bounds), attribution: h.attr, opacity: state.histOpa });
    if (!l) { histStatus(t.unavailable, t.nPmLib); return; }
    histLayer = l.addTo(map);
    histStatus(t.loading);
    l._pm.getHeader()
      .then(hd => histStatus(T().ready, `tile z${hd.minZoom}–z${hd.maxZoom} · ${T().nPm}`))
      .catch(() => histStatus(T().failed, T().nPmFail));
  } else {
    histLayer = L.tileLayer(h.url, { pane: 'hist', minZoom: h.minZoom, maxZoom: h.maxZoom,
      maxNativeZoom: h.maxZoom, attribution: h.attr, opacity: state.histOpa }).addTo(map);
    histStatus(t.loading);
    let settled = false;
    histLayer.on('tileload', () => { if (!settled) { settled = true; histStatus(T().ready, T().nXyz); } });
    histLayer.on('tileerror', () => { if (!settled) histStatus(T().failed, T().nXyzFail); });
  }
  updateClip();
}
function setHist(on) {
  state.histOn = on && !state.compare && !state.global;
  $('#histBtn').classList.toggle('active', state.histOn);
  $('#swipeBtn').disabled = !state.histOn;
  if (state.histOn) addHist();
  else { removeHist(); setSwipe(false); $('#histStatus').innerHTML = `<span class="k">${T().kLayer}</span> ${T().layerOff}`; }
}
function setSwipe(on) {
  state.swipeOn = on && state.histOn;
  $('#swipeBtn').classList.toggle('active', state.swipeOn);
  $('#divider').classList.toggle('on', state.swipeOn);
  if (histLayer) histLayer.setOpacity(state.swipeOn ? 1 : state.histOpa);
  positionDivider();
  updateClip();
}
function positionDivider() { $('#divider').style.left = (state.splitPct * 100) + '%'; }
function updateClip() {
  if (!histLayer || !histLayer.getContainer()) return;
  const c = histLayer.getContainer();
  if (!state.swipeOn) { c.style.clip = ''; return; }
  const size = map.getSize();
  const nw = map.containerPointToLayerPoint([0, 0]);
  const se = map.containerPointToLayerPoint([size.x, size.y]);
  const x = nw.x + size.x * state.splitPct;
  c.style.clip = 'rect(' + [nw.y, x, se.y, nw.x].join('px,') + 'px)';
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

/* ---------- render ---------- */
const visibleCities = () => state.global ? [] : state.compare ? Object.keys(CITIES) : [state.city];
const shownSites = () => visibleCities().flatMap(sitesOf)
  .filter(s => state.active.has(s.factor) && s.decade <= decade());

function renderTicks() {
  $('#yearTicks').innerHTML = DECADES.map((y, i) =>
    (i % 3 === 0 || i === DECADES.length - 1) ? `<span data-i="${i}">${y}</span>` : `<span data-i="${i}" class="dot">·</span>`).join('');
  $$('#yearTicks span').forEach(s => s.onclick = () => setDecade(+s.dataset.i));
}
function renderYear() {
  const y = decade();
  $('#yearBig').textContent = y;
  $('#yearEra').innerHTML = tr(ERAS[y]) + (state.lang === 'en' ? '' : `<span class="sub">${ERAS[y].en}</span>`);
  $$('#yearTicks span').forEach(s => s.classList.toggle('on', +s.dataset.i <= state.di));
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
  network.clearLayers();

  if (state.global) {
    NETWORK.forEach(c => {
      L.marker(c.ll, { icon: L.divIcon({ className: `network-marker${c.primary ? ' primary' : ''}`, html: '<span></span>', iconSize: [11, 11], iconAnchor: [5, 5] }) })
        .bindTooltip(tr(c.name), { direction: 'top', offset: [0, -6] })
        .addTo(network);
    });
    return;
  }

  shownSites().forEach(s => {
    const isNow = s.decade === decade();
    const col = fc(s.factor).c;
    const chosen = state.sel === s.id;
    if (chosen) L.circleMarker(s.coordinates, { radius: 15, color: col, weight: 1, fill: false, dashArray: '2,3' }).addTo(pins);
    /* placeholder records are drawn hollow with a dashed edge so an unconfirmed
       point can never be mistaken for a verified one */
    const style = s.placeholder
      ? { radius: isNow ? 8 : 5, color: col, weight: isNow ? 2 : 1.2, dashArray: '2,2',
          fillColor: '#F1EFE9', fillOpacity: isNow ? .55 : .25 }
      : { radius: isNow ? 8 : 5, color: '#F1EFE9', weight: isNow ? 2 : 1,
          fillColor: col, fillOpacity: isNow ? .95 : .45 };
    const m = L.circleMarker(s.coordinates, style).addTo(pins);
    m.bindTooltip(`${s.decade}s · ${tr(s.title)}${s.placeholder ? ' · ' + T().placeholderFlag : ''}`,
      { direction: 'top', offset: [0, -8] });
    m.on('click', () => selectSite(s.id));
    /* a wider transparent disc keeps the point tappable on a touch screen */
    L.circleMarker(s.coordinates, { radius: 17, stroke: false, fillColor: col, fillOpacity: .01 })
      .on('click', () => selectSite(s.id)).addTo(pins);
  });
}
function recordMedia(s) {
  const t = T(), img = s.image;
  if (img && img.commons) {
    const src = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(img.commons)}?width=900`;
    return `<img class="rec-img" src="${src}" alt="${tr(s.title)}" loading="lazy">`
      + `<div class="rec-cap">${img.credit} · <a href="${img.link}" target="_blank" rel="noopener">${t.viewSource}</a></div>`;
  }
  if (img && img.link) {
    return `<div class="rec-slot"><span>${t.offsite}</span>`
      + `<a href="${img.link}" target="_blank" rel="noopener">${t.viewSource}</a></div>`
      + `<div class="rec-cap">${img.credit}</div>`;
  }
  return `<div class="rec-plate"><span>${t.plate}</span></div>`;
}
function rightsBadge(s) {
  const t = T(), img = s.image;
  if (!img) return `<div class="rights-badge pending"><i></i>${t.noImage}</div>`;
  return `<div class="rights-badge ${img.cleared ? 'ok' : 'pending'}"><i></i>`
    + `<a href="${img.rightsURI}" target="_blank" rel="noopener">${img.rights}</a></div>`;
}
function renderRecord() {
  const r = $('#record'), t = T();
  const s = state.sel && siteById(state.sel);
  if (!s) { r.innerHTML = `<div class="empty">${t.empty}</div>`; r.classList.remove('is-placeholder'); return; }
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
  r.innerHTML = `${recordMedia(s)}${rightsBadge(s)}${warn}${flag}
    <div class="rec-tag" style="color:${f.c}">${tr(f.label)} · ${s.decade}s · ${cityName(s.city)}</div>
    <h3 class="rec-title">${tr(s.title)}</h3>
    <p class="rec-text">${tr(s.narrative)}</p>
    <div class="rec-src">${srcLine}<br><b>${t.recRecord}</b> ${s.id}</div>
    <button class="rec-more" type="button" id="recMore">${t.readMore}</button>`;
  $('#recMore').onclick = () => openRecordDrawer(s.id);
}
function renderSplit() {
  const W = 300, H = 96, n = DECADES.length, step = W / (n - 1);
  const chartCity = state.compare ? 'mpls' : state.city;
  const rows = Object.fromEntries(DECADES.map(d => [d, splitFor(chartCity, d)]));
  const anyPlaceholder = DECADES.some(d => rows[d] && rows[d].placeholder);
  let out = '', base = new Array(n).fill(0);
  SPLIT_C.forEach((col, k) => {
    const top = DECADES.map((y, i) => base[i] + rows[y].values[k]);
    const up = DECADES.map((y, i) => `${(i * step).toFixed(1)},${(H - top[i] / 100 * H).toFixed(1)}`);
    const dn = DECADES.map((y, i) => `${(i * step).toFixed(1)},${(H - base[i] / 100 * H).toFixed(1)}`).reverse();
    out += `<polygon points="${up.concat(dn).join(' ')}" fill="${col}" fill-opacity="${anyPlaceholder ? '.5' : '.9'}"></polygon>`;
    base = top;
  });
  if (anyPlaceholder) {
    out = `<defs><pattern id="hatch" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="6" stroke="#807C73" stroke-width="1" stroke-opacity=".35"></line></pattern></defs>`
      + out + `<rect x="0" y="0" width="${W}" height="${H}" fill="url(#hatch)"></rect>`;
  }
  const x = (state.di * step).toFixed(1);
  out += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="#1F1D19" stroke-width="1"></line>`;
  $('#splitChart').innerHTML = out;

  const t = T(), cur = rows[decade()];
  let note = t.splitNote(decade(), cityName(chartCity), cur.values);
  if (state.compare) note += ' ' + t.splitNote(decade(), cityName('rdam'), splitFor('rdam', decade()).values);
  $('#splitNote').textContent = note;
  $('#splitCaption').innerHTML = anyPlaceholder
    ? `<span class="tbc">${t.placeholderFlag}</span> ${t.splitPlaceholder}<br>`
      + `<b>${t.derivation}</b> ${cur.derivation || t.derivationNone}`
    : t.splitCaption;
}
function renderMapCard() {
  const t = T();
  $('#mapKicker').textContent = t.mapKicker;
  $('#mapYear').textContent = decade() + 's';
  if (state.global) {
    $('#mapTitle').textContent = t.mapGlobalTitle;
    $('#mapSub').textContent = t.mapGlobalSub;
  } else if (state.compare) {
    $('#mapTitle').textContent = t.mapCompareTitle;
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
  renderYear(); renderFactors(); renderPins(); renderRecord(); renderSplit(); renderMapCard();
  $$('.city-chip').forEach(b => b.classList.toggle('active', b.dataset.city === state.city && !state.compare && !state.global));
  $('#compareBtn').classList.toggle('active', state.compare);
  $('#globalBtn').classList.toggle('active', state.global);
  $('#histBtn').disabled = state.compare || state.global;
  syncUrl();
}

/* ---------- views ---------- */
function storyAt(y) { return STORIES.find(s => y >= s.from && y <= s.to) || STORIES[0]; }

function selectSite(id) {
  state.sel = id;
  renderRecord(); renderPins();
  $('#record').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
function selectCity(id, { fly = true } = {}) {
  state.city = id; state.compare = false; state.global = false; state.sel = null;
  $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === 'map'));
  if (fly) map.flyTo(CITIES[id].center, CITIES[id].zoom, { duration: 1.1 });
  if (state.histOn) { addHist(); setSwipe(state.swipeOn); }
  render();
}
function setCompare(on) {
  state.compare = on; state.global = false; state.sel = null;
  if (on) { setHist(false); map.fitBounds(Object.values(CITIES).map(c => c.center), { padding: [70, 70], maxZoom: 4 }); }
  else map.flyTo(CITIES[state.city].center, CITIES[state.city].zoom, { duration: 1.1 });
  $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === (on ? 'compare' : 'map')));
  render();
}
function setGlobal(on) {
  state.global = on; state.compare = false; state.sel = null;
  if (on) { setHist(false); map.flyTo([22, 12], 2.2, { duration: 1.1 }); }
  else map.flyTo(CITIES[state.city].center, CITIES[state.city].zoom, { duration: 1.1 });
  render();
}
function setDecade(i) {
  state.di = Math.max(0, Math.min(DECADES.length - 1, i));
  $('#yearRange').value = state.di;
  render();
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
function openStoryDrawer() {
  const t = T(), st = storyAt(decade()), f = fc(st.factor);
  openDrawer(t.drawerStory, `
    <span class="drawer-year">${decade()}s · ${tr(f.label)} · ${tr(st.era)}</span>
    <h2>${tr(st.title)}</h2>
    <p class="lead">${tr(st.body)}</p>
    <h3>${t.storyQ1}</h3><p>${t.storyA1}</p>
    <h3>${t.storyQ2}</h3><p>${t.storyA2}</p>
    <div class="source-box"><b>${t.storyBox}</b><p>${t.storyBoxBody}</p></div>`);
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
    <span class="drawer-year">${(visibleCities().length ? visibleCities() : [state.city]).map(cityName).join(' · ')} · ≤ ${decade()}s</span>
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
    <span class="drawer-year">${s.decade}s · ${cityName(s.city)} · ${tr(f.label)}</span>
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
  DECADES.forEach((y, i) => out.push({ kind: t.kindDecade, label: `${y}s`, sub: tr(ERAS[y]), run: () => setDecade(i) }));
  FACTORS.forEach(f => out.push({ kind: t.kindFactor, label: tr(f.label), sub: tr(f.sub), run: () => { state.active = new Set([f.id]); render(); } }));
  SITES.forEach(s => out.push({
    kind: t.kindSite, label: tr(s.title),
    sub: `${cityName(s.city)} · ${s.decade}s${s.placeholder ? ' · ' + t.placeholderFlag : ''}`,
    run: () => {
      selectCity(s.city, { fly: false });
      setDecade(DECADES.indexOf(s.decade));
      selectSite(s.id);
      map.flyTo(s.coordinates, 15, { duration: 1.1 });
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

/* ---------- timeline playback ---------- */
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
  }, 1100);
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
  $('#contribBtn').querySelector('span').textContent = t.contribute;

  $('#headEyebrow').textContent = t.eyebrow;
  $('#headTitle').textContent = t.title;
  $('#headMeta').textContent = t.meta;
  ['sl1','sl2','sl3','sl4','sl5','sl6','sl7'].forEach((id, i) => {
    const el = document.getElementById(id);
    el.querySelector('.txt').textContent = t.sl[i];
    el.querySelector('.en').textContent = t.slSub[i];
  });

  $$('.city-chip').forEach(b => {
    const k = b.dataset.city;
    b.innerHTML = cityName(k) + (state.lang === 'en' ? '' : `<span class="en">${CITIES[k].name.en}</span>`);
  });
  $('#swapBtn').setAttribute('aria-label', t.swap);
  $('#compareBtn').querySelector('.t').textContent = t.compareTitle;
  $('#compareBtn').querySelector('.sub').textContent = t.compareSub;
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
    .map((cls, i) => `<span><i class="${cls}"></i>${t.mapLegend[i]}</span>`).join('');

  $('#searchInput').placeholder = t.searchPlaceholder;
  $('#contribEyebrow').textContent = t.contribEyebrow;
  $('#contribTitle').innerHTML = t.contribTitle;
  $('#contribBody').textContent = t.contribBody;
  $('#contribOptions').innerHTML = t.contribOptions.map(([b, s], i) =>
    `<button type="button"><span>0${i + 1}</span><span><b>${b}</b><small>${s}</small></span></button>`).join('');
  $$('#contribOptions button').forEach(b => b.onclick = () => toast(T().tContrib));
  $('#contribNote').textContent = t.contribNote;

  if (state.histOn && histLayer) histStatus(t.ready);
  else $('#histStatus').innerHTML = `<span class="k">${t.kLayer}</span> ${t.layerOff}`;
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
    if (histLayer && !state.swipeOn) histLayer.setOpacity(state.histOpa);
  });
  $$('.city-chip').forEach(b => b.onclick = () => selectCity(b.dataset.city));
  $('#swapBtn').onclick = () => {
    const ids = Object.keys(CITIES);
    selectCity(ids[(ids.indexOf(state.city) + 1) % ids.length]);
  };
  $('#compareBtn').onclick = () => setCompare(!state.compare);
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
  $('#zoomIn').onclick = () => map.zoomIn();
  $('#zoomOut').onclick = () => map.zoomOut();
  $('#fitBtn').onclick = () => {
    if (state.global) map.flyTo([22, 12], 2.2, { duration: .9 });
    else if (state.compare) map.fitBounds(Object.values(CITIES).map(c => c.center), { padding: [70, 70], maxZoom: 4 });
    else map.flyTo(CITIES[state.city].center, CITIES[state.city].zoom, { duration: .9 });
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
  $('#menuBtn').onclick = () => $('#panel').classList.toggle('collapsed');

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
    if (e.key === 'Escape') closeDrawer();
    if (e.target.tagName === 'INPUT') return;
    if (e.key === '/' && !$('#searchDialog').open) { e.preventDefault(); $('#searchBtn').click(); }
    if (e.key === 'ArrowRight' && state.di < DECADES.length - 1) setDecade(state.di + 1);
    if (e.key === 'ArrowLeft' && state.di > 0) setDecade(state.di - 1);
  });
  $('#searchDialog').addEventListener('click', e => { if (e.target.id === 'searchDialog') $('#searchDialog').close(); });
  $('#contribDialog').addEventListener('click', e => { if (e.target.id === 'contribDialog') $('#contribDialog').close(); });
  bindDividerDrag();
}

/* ---------- boot ---------- */
loadData().then(() => {
  initMap();
  renderTicks();
  $('#yearRange').value = state.di;
  positionDivider();
  bindEvents();
  applyLang();
  document.body.classList.add('ready');
  setTimeout(() => map.invalidateSize(), 60);
}).catch(showLoadError);
