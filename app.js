/* Cycling Cities — application logic.
   Content lives in data.js, interface strings in i18n.js.
   Every map record here is research-in-progress: see the rights badge on each site. */

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

const params = new URLSearchParams(location.search);
const state = {
  lang: LANGS.some(l => l.id === params.get('lang')) ? params.get('lang') : 'en',
  city: CITIES[params.get('city')] ? params.get('city') : 'mpls',
  di: Math.max(0, DECADES.indexOf(Number(params.get('d')))),
  sel: null,            // { c: cityId, i: siteIndex }
  active: new Set(FACTORS.map(f => f.id)),
  compare: false,
  global: false,
  histOn: false,
  swipeOn: false,
  splitPct: .5,
  histOpa: .85,
  playing: false
};

const T = () => UI[state.lang];
const tr = obj => (obj && (obj[state.lang] || obj.en)) || '';
const decade = () => DECADES[state.di];
const fc = id => FACTORS.find(f => f.id === id);
const cityName = id => tr(CITIES[id].name);

/* ---------- map ---------- */
const map = L.map('map', { zoomControl: false, minZoom: 2, worldCopyJump: true })
  .setView(CITIES.mpls.center, CITIES.mpls.zoom);
map.createPane('hist');
map.getPane('hist').style.zIndex = 350;

const ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';
const BASES = {
  light:   L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',            { attribution: ATTR, maxZoom: 19, subdomains: 'abcd' }),
  plain:   L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',       { attribution: ATTR, maxZoom: 19, subdomains: 'abcd' }),
  voyager: L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',  { attribution: ATTR, maxZoom: 19, subdomains: 'abcd' })
};
let currentBase = BASES.light.addTo(map);
const pins = L.layerGroup().addTo(map);
const network = L.layerGroup().addTo(map);
let histLayer = null;
let playTimer = null;

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
map.on('move zoom moveend zoomend resize viewreset', updateClip);

(function dividerDrag() {
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
})();

/* ---------- render ---------- */
const visibleCities = () => state.global ? [] : state.compare ? ['mpls', 'rdam'] : [state.city];

function renderTicks() {
  $('#yearTicks').innerHTML = DECADES.map((y, i) =>
    (i % 3 === 0 || i === DECADES.length - 1) ? `<span data-i="${i}">${y}</span>` : `<span data-i="${i}">·</span>`).join('');
  $$('#yearTicks span').forEach(s => s.onclick = () => { state.di = +s.dataset.i; $('#yearRange').value = state.di; state.sel = null; render(); });
}
function renderYear() {
  const y = decade();
  $('#yearBig').textContent = y;
  $('#yearEra').innerHTML = tr(ERAS[y]) + (state.lang === 'en' ? '' : `<span class="sub">${ERAS[y].en}</span>`);
  $$('#yearTicks span').forEach(s => s.classList.toggle('on', +s.dataset.i <= state.di));
}
function renderFactors() {
  const counted = visibleCities().length ? visibleCities() : Object.keys(CITIES);
  $('#factors').innerHTML = FACTORS.map(f => {
    const n = counted.reduce((sum, c) => sum + CITIES[c].sites.filter(s => s.f === f.id && s.d <= decade()).length, 0);
    const nm = state.lang === 'en' ? tr(f.label) : `${tr(f.label)}<span class="en">${f.label.en}</span>`;
    return `<button class="factor" data-f="${f.id}" aria-pressed="${state.active.has(f.id)}" title="${tr(f.sub)}">
      <span class="bar" style="background:${f.c}"></span>
      <span class="nm">${nm}</span>
      <span class="ct">${n}</span></button>`;
  }).join('');
  $$('#factors .factor').forEach(b => b.onclick = () => {
    const f = b.dataset.f;
    state.active.has(f) ? state.active.delete(f) : state.active.add(f);
    state.sel = null;
    render();
  });
  $('#allFactors').textContent = state.active.size === FACTORS.length ? T().hideAll : T().showAll;
}
function renderPins() {
  pins.clearLayers();
  network.clearLayers();

  if (state.global) {
    NETWORK_CITIES.forEach(c => {
      L.marker(c.ll, { icon: L.divIcon({ className: `network-marker${c.primary ? ' primary' : ''}`, html: '<span></span>', iconSize: [11, 11], iconAnchor: [5, 5] }) })
        .bindTooltip(tr(c.name), { direction: 'top', offset: [0, -6] })
        .addTo(network);
    });
    return;
  }

  visibleCities().forEach(c => {
    CITIES[c].sites.forEach((s, i) => {
      if (!state.active.has(s.f) || s.d > decade()) return;
      const isNow = s.d === decade();
      const col = fc(s.f).c;
      const chosen = state.sel && state.sel.c === c && state.sel.i === i;
      if (chosen) L.circleMarker(s.ll, { radius: 14, color: col, weight: 1, fill: false, dashArray: '2,3' }).addTo(pins);
      const m = L.circleMarker(s.ll, { radius: isNow ? 8 : 5, color: '#F1EFE9', weight: isNow ? 2 : 1,
        fillColor: col, fillOpacity: isNow ? .95 : .4 }).addTo(pins);
      m.bindTooltip(`${s.d}s · ${tr(s.t)}`, { direction: 'top', offset: [0, -8] });
      m.on('click', () => { state.sel = { c, i }; renderRecord(); renderPins(); });
    });
  });
}
function recordMedia(s) {
  const t = T();
  if (s.img && s.img.commons) {
    const src = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(s.img.commons)}?width=900`;
    return `<img class="rec-img" src="${src}" alt="${tr(s.t)}" loading="lazy">`
      + `<div class="rec-cap">${s.img.credit} · <a href="${s.img.link}" target="_blank" rel="noopener">${t.viewSource}</a></div>`;
  }
  if (s.img && s.img.link) {
    return `<div class="rec-slot"><span>${t.offsite}</span>`
      + `<a href="${s.img.link}" target="_blank" rel="noopener">${t.viewSource}</a></div>`
      + `<div class="rec-cap">${s.img.credit}</div>`;
  }
  return `<div class="rec-plate"><span>${t.plate}</span></div>`;
}
function recordId(c, i) {
  const s = CITIES[c].sites[i];
  return `${c.toUpperCase()}-${s.f.toUpperCase()}-${String(i + 1).padStart(3, '0')}`;
}
function renderRecord() {
  const r = $('#record'), t = T();
  if (!state.sel) { r.innerHTML = `<div class="empty">${t.empty}</div>`; return; }
  const { c, i } = state.sel;
  const s = CITIES[c].sites[i], f = fc(s.f);
  const badge = s.img
    ? `<div class="rights-badge ${s.img.cleared ? 'ok' : 'pending'}"><i></i>`
      + `<a href="${s.img.uri}" target="_blank" rel="noopener">${s.img.rights}</a></div>`
    : `<div class="rights-badge pending"><i></i>${t.noImage}</div>`;
  const warn = (s.img && s.img.warn) ? `<div class="rec-warn">⚠ ${tr(s.img.warn)}</div>` : '';
  r.innerHTML = `${recordMedia(s)}${badge}${warn}
    <div class="rec-tag" style="color:${f.c}">${tr(f.label)} · ${s.d}s · ${cityName(c)}</div>
    <h3 class="rec-title">${tr(s.t)}</h3>
    <p class="rec-text">${tr(s.n)}</p>
    <div class="rec-src"><b>${t.recSource}</b> ${s.s}<br><b>${t.recRecord}</b> ${recordId(c, i)}</div>
    <button class="rec-more" type="button" id="recMore">${t.readMore}</button>`;
  $('#recMore').onclick = () => openRecordDrawer(c, i);
}
function renderSplit() {
  const W = 300, H = 96, n = DECADES.length, step = W / (n - 1);
  const chartCity = state.compare ? 'mpls' : state.city;
  const d = SPLIT[chartCity];
  let out = '', base = new Array(n).fill(0);
  SPLIT_C.forEach((col, k) => {
    const top = DECADES.map((y, i) => base[i] + d[y][k]);
    const up = DECADES.map((y, i) => `${(i * step).toFixed(1)},${(H - top[i] / 100 * H).toFixed(1)}`);
    const dn = DECADES.map((y, i) => `${(i * step).toFixed(1)},${(H - base[i] / 100 * H).toFixed(1)}`).reverse();
    out += `<polygon points="${up.concat(dn).join(' ')}" fill="${col}" fill-opacity=".9"></polygon>`;
    base = top;
  });
  const x = (state.di * step).toFixed(1);
  out += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="#1F1D19" stroke-width="1"></line>`;
  $('#splitChart').innerHTML = out;

  const t = T();
  let note = t.splitNote(decade(), cityName(chartCity), d[decade()]);
  if (state.compare) note += ' ' + t.splitNote(decade(), cityName('rdam'), SPLIT.rdam[decade()]);
  $('#splitNote').textContent = note;
  $('#splitCaption').textContent = t.splitCaption;
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
    const s = CITIES[state.sel.c].sites[state.sel.i];
    const shown = state.active.has(s.f) && s.d <= decade() && visibleCities().includes(state.sel.c);
    if (!shown) state.sel = null;
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

function selectCity(id, { fly = true } = {}) {
  state.city = id; state.compare = false; state.global = false; state.sel = null;
  $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === 'map'));
  if (fly) map.flyTo(CITIES[id].center, CITIES[id].zoom, { duration: 1.1 });
  if (state.histOn) { addHist(); setSwipe(state.swipeOn); }
  render();
}
function setCompare(on) {
  state.compare = on; state.global = false; state.sel = null;
  if (on) { setHist(false); map.fitBounds([CITIES.mpls.center, CITIES.rdam.center], { padding: [70, 70], maxZoom: 4 }); }
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
function setDecade(i, { keepSel = false } = {}) {
  state.di = Math.max(0, Math.min(DECADES.length - 1, i));
  $('#yearRange').value = state.di;
  if (!keepSel) state.sel = null;
  render();
}

/* ---------- drawer ---------- */
function openDrawer(eyebrow, html) {
  $('#drawerEyebrow').textContent = eyebrow;
  $('#drawerBody').innerHTML = html;
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
    <ol>${FACTORS.map(f => `<li>${tr(f.label)} — ${tr(f.sub)}</li>`).join('')}</ol>
    <h3>${t.methodH2}</h3><p>${t.methodBody}</p>
    <div class="source-box"><b>${t.methodBox}</b><p>${t.methodBoxBody}</p></div>`);
}
function openSourcesDrawer() {
  const t = T();
  const cities = visibleCities().length ? visibleCities() : [state.city];
  const rows = [];
  cities.forEach(c => CITIES[c].sites.forEach((s, i) => {
    if (s.d > decade() || !state.active.has(s.f)) return;
    const rights = !s.img ? t.rightsNone : (s.img.cleared ? t.rightsCleared : t.rightsPending);
    rows.push(`<tr><td class="mono">${s.d}s</td><td>${tr(s.t)}<br><span class="mono">${recordId(c, i)}</span></td><td>${tr(fc(s.f).label)}</td><td class="mono">${rights}</td></tr>`);
  }));
  openDrawer(t.drawerSources, `
    <span class="drawer-year">${cities.map(cityName).join(' · ')} · ≤ ${decade()}s</span>
    <h2>${t.sourcesTitle}</h2>
    <p class="lead">${t.sourcesLead}</p>
    <table class="source-table">
      <thead><tr><th>${t.thDecade}</th><th>${t.thSite}</th><th>${t.thFactor}</th><th>${t.thRights}</th></tr></thead>
      <tbody>${rows.join('') || `<tr><td colspan="4">${t.searchNone}</td></tr>`}</tbody>
    </table>
    <div class="source-box"><b>${t.sourcesBox}</b><p>${t.sourcesBoxBody}</p></div>`);
}
function citationFor(c, i) {
  const s = CITIES[c].sites[i];
  return `Cycling Cities Research Network, “${s.t.en},” ${CITIES[c].name.en}, ${s.d}s. ${recordId(c, i)}. Concept record, accessed ${new Date().getFullYear()}.`;
}
function openRecordDrawer(c, i) {
  const t = T(), s = CITIES[c].sites[i], f = fc(s.f);
  openDrawer(t.drawerRecord, `
    <span class="drawer-year">${s.d}s · ${cityName(c)} · ${tr(f.label)}</span>
    <h2>${tr(s.t)}</h2>
    <p class="lead">${tr(s.n)}</p>
    <h3>${t.recSource}</h3><p>${s.s}</p>
    <h3>${t.recRights}</h3><p>${s.img ? `${s.img.rights} — ${s.img.credit}` : t.noImage}</p>
    ${(s.img && s.img.warn) ? `<p class="lead">⚠ ${tr(s.img.warn)}</p>` : ''}
    <div class="source-box"><b>${t.citeLabel}</b><p>${citationFor(c, i)}</p></div>`);
}

/* ---------- search ---------- */
function searchIndex() {
  const t = T(), out = [];
  Object.keys(CITIES).forEach(c => out.push({ kind: t.kindCity, label: cityName(c), sub: CITIES[c].name.en, run: () => selectCity(c) }));
  DECADES.forEach((y, i) => out.push({ kind: t.kindDecade, label: `${y}s`, sub: tr(ERAS[y]), run: () => setDecade(i) }));
  FACTORS.forEach(f => out.push({ kind: t.kindFactor, label: tr(f.label), sub: tr(f.sub), run: () => { state.active = new Set([f.id]); state.sel = null; render(); } }));
  Object.keys(CITIES).forEach(c => CITIES[c].sites.forEach((s, i) => out.push({
    kind: t.kindSite, label: tr(s.t), sub: `${cityName(c)} · ${s.d}s`,
    run: () => { selectCity(c, { fly: false }); setDecade(DECADES.indexOf(s.d), { keepSel: true }); state.sel = { c, i }; map.flyTo(s.ll, 15, { duration: 1.1 }); render(); }
  })));
  return out;
}
function runSearch(q) {
  const t = T(), items = searchIndex();
  const norm = q.trim().toLowerCase();
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
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
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
  $('#shareBtn').querySelector('span').textContent = t.share;
  $('#citeBtn').querySelector('span').textContent = t.cite;
  $('#footText').innerHTML = t.foot;
  $('#flagText').textContent = t.flag;

  if ($('#notice')) {
    $('#noticeTitle').textContent = t.noticeTitle;
    $('#noticeBody').textContent = t.noticeBody;
    $('#noticeClose').setAttribute('aria-label', t.noticeClose);
  }
  $('#fitBtn').setAttribute('aria-label', t.fitLabel);
  $('#mapLegend').innerHTML = [['dot-site', 0], ['dot-now', 1], ['dot-net', 2]]
    .map(([cls, i]) => `<span><i class="${cls}"></i>${t.mapLegend[i]}</span>`).join('');

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
$('#swapBtn').onclick = () => selectCity(state.city === 'mpls' ? 'rdam' : 'mpls');
$('#compareBtn').onclick = () => setCompare(!state.compare);
$('#globalBtn').onclick = () => setGlobal(!state.global);
$('#allFactors').onclick = () => {
  const showAll = state.active.size !== FACTORS.length;
  state.active = new Set(showAll ? FACTORS.map(f => f.id) : []);
  state.sel = null;
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
  else if (state.compare) map.fitBounds([CITIES.mpls.center, CITIES.rdam.center], { padding: [70, 70], maxZoom: 4 });
  else map.flyTo(CITIES[state.city].center, CITIES[state.city].zoom, { duration: .9 });
};
$('#noticeClose').onclick = () => $('#notice').remove();
$('#sourcesBtn').onclick = openSourcesDrawer;

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
  const text = state.sel
    ? citationFor(state.sel.c, state.sel.i)
    : `Cycling Cities Research Network, ${CITIES[state.city].name.en}, ${decade()}s. Concept prototype, accessed ${new Date().getFullYear()}. ${location.href}`;
  try { await navigator.clipboard.writeText(text); toast(T().tCite); }
  catch { toast(text); }
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

/* ---------- boot ---------- */
renderTicks();
$('#yearRange').value = state.di;
positionDivider();
map.setView(CITIES[state.city].center, CITIES[state.city].zoom);
applyLang();
setTimeout(() => map.invalidateSize(), 60);
