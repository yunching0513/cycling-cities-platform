#!/usr/bin/env node
/* Cycling Cities Tool 2: inbox tool, for the maintainer only.

   The browser can only insert into the inbox. This script, run with the service role
   key from the shell environment, is the only thing that reads it, verifies rows, and
   writes them into the static JSON the site publishes. Git stays the record of change.

   Usage
     node scripts/inbox.mjs list [--status submitted|verified|rejected|archived|all] [--kind K]
     node scripts/inbox.mjs show <id>
     node scripts/inbox.mjs verify <id> --by "Your Name" [--on YYYY-MM-DD] [--note "..."]
     node scripts/inbox.mjs reject <id> [--note "..."]
     node scripts/inbox.mjs archive <id> [--note "..."]
     node scripts/inbox.mjs export [--dry] [--from rows.json]

   --from reads rows from a JSON array (for example a download from the dashboard) instead
   of the API, and then does not mark anything exported. Useful without the key, and for
   testing the mapping.

   Environment
     SUPABASE_URL                https://<project>.supabase.co
     SUPABASE_SERVICE_ROLE_KEY   the service_role (or sb_secret_…) key, for the shell session only.
                                 `source scripts/inbox-env.sh` sets both from the macOS Keychain. */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = f => path.join(ROOT, 'data', f);
const INBOX_DIR = path.join(ROOT, 'docs', 'inbox');
const args = process.argv.slice(2), cmd = args[0];
const opt = (name, def = null) => {
  const i = args.indexOf('--' + name);
  if (i === -1) return def;
  const v = args[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
};
const BASE = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const TBC = '[TO BE CONFIRMED]';
const today = () => new Date().toISOString().slice(0, 10);
const fail = (msg, code = 1) => { console.error(msg); process.exit(code); };
const readJSON = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const writeJSON = (f, obj) => fs.writeFileSync(f, JSON.stringify(obj, null, 2) + '\n');
const num = v => (v === null || v === undefined || v === '' ? null : Number(v));
const list = v => (v ? String(v).split(';').map(x => x.trim()).filter(Boolean) : []);
const pair = (lat, lon) => (num(lat) != null && num(lon) != null ? [num(lat), num(lon)] : null);

async function api(query, init = {}) {
  if (!BASE || !KEY) fail('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the shell environment first.', 2);
  /* the legacy service_role key is a JWT and doubles as the bearer token; a new-style
     secret key (sb_secret_…) is not, and PostgREST would reject it as one */
  const headers = { apikey: KEY, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(init.headers || {}) };
  if (KEY.startsWith('eyJ')) headers.Authorization = `Bearer ${KEY}`;
  const res = await fetch(`${BASE}/rest/v1/${query}`, { ...init, headers });
  if (!res.ok) fail(`Inbox ${init.method || 'GET'} ${query}\nHTTP ${res.status} ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/* ---------- commands ---------- */
async function cmdList() {
  const status = opt('status', 'submitted'), kind = opt('kind');
  let q = 'contribution?select=id,kind,status,city_slug,submitted_name,submitted_email,created_at,exported_at,updated_at&order=created_at.asc';
  if (status !== 'all') q += `&status=eq.${status}`;
  if (kind) q += `&kind=eq.${kind}`;
  const rows = await api(q);
  if (!rows.length) { console.log(`Nothing with status ${status}.`); return; }
  for (const r of rows) {
    const stale = r.exported_at && r.updated_at > r.exported_at;
    console.log([r.id, r.kind.padEnd(11), r.status.padEnd(9), (r.city_slug || '-').padEnd(4),
      r.created_at.slice(0, 16).replace('T', ' '), `${r.submitted_name} <${r.submitted_email || ''}>`,
      r.exported_at ? (stale ? '(changed since export)' : '(exported)') : ''].join('  '));
  }
  console.log(`${rows.length} row(s).`);
}
async function cmdShow(id) {
  if (!id) fail('show needs an id.');
  const rows = await api(`contribution?id=eq.${id}`);
  if (!rows.length) fail('No such row.');
  console.log(JSON.stringify(rows[0], null, 2));
}
async function setStatus(id, patch, what) {
  if (!id) fail(`${what} needs an id.`);
  const rows = await api(`contribution?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
  if (!rows.length) fail('No such row.');
  return rows[0];
}
async function cmdVerify(id) {
  const by = opt('by');
  if (!by || by === true) fail('verify needs --by "Your Name": the signature is the point of it.');
  const r = await setStatus(id, { status: 'verified', verified_by: by, verified_on: opt('on', today()), review_note: opt('note', null) }, 'verify');
  console.log(`Verified ${r.id} (${r.kind}, ${r.city_slug || '-'}) by ${by} on ${r.verified_on}. Run export to publish it.`);
}
async function cmdReject(id) {
  const r = await setStatus(id, { status: 'rejected', review_note: opt('note', null) }, 'reject');
  console.log(`Rejected ${r.id}.`);
}
async function cmdArchive(id) {
  const r = await setStatus(id, { status: 'archived', review_note: opt('note', null) }, 'archive');
  console.log(`Archived ${r.id}.`);
}

/* ---------- export: inbox rows into the static files ----------
   Idempotent by inboxId: exporting the same row twice replaces the earlier record.
   Verified rows land as verified; submitted rows land marked unconfirmed, which the
   interface shows on every screen. Pins and review decisions go to docs/inbox/ as
   proposals and never become site records on their own. */
async function cmdExport() {
  const dry = !!opt('dry'), from = opt('from');
  const all = from && from !== true
    ? readJSON(path.resolve(from)).filter(r => ['submitted', 'verified'].includes(r.status))
    : await api('contribution?select=*&status=in.(submitted,verified)&order=created_at.asc');
  const rows = all.filter(r => !r.exported_at || r.updated_at > r.exported_at);
  if (!rows.length) { console.log('Nothing new to export.'); return; }

  const ref = readJSON(DATA('reference.json'));
  const sharedFactor = period => (ref.stories.find(s => s.from === period) || {}).factor || null;
  const files = {
    inters: readJSON(DATA('intersections.json')), split: readJSON(DATA('modalsplit.json')),
    images: readJSON(DATA('images.json')), narr: readJSON(DATA('narrative.json')), maps: readJSON(DATA('maps.json'))
  };
  const touched = new Set(), done = [], pins = [], reviews = [];
  const upsert = (arr, item) => { const i = arr.findIndex(x => x.inboxId === item.inboxId); if (i > -1) arr[i] = item; else arr.push(item); };

  for (const r of rows) {
    const p = r.payload || {}, verified = r.status === 'verified', city = p.city_slug || r.city_slug;
    const src = (cite, archive, reference, url) => ({
      citation: cite || TBC, archive: archive || null, reference: reference || null, url: url || null,
      verifiedBy: verified ? r.verified_by : null, verifiedOn: verified ? r.verified_on : null });
    if (['modal_split', 'image', 'story', 'map'].includes(r.kind) && !ref.cities[city]) {
      console.warn(`skip ${r.id}: city_slug ${city} is not in reference.json`); continue;
    }

    if (r.kind === 'modal_split') {
      const values = ['mode_bicycle', 'mode_walking', 'mode_transit', 'mode_car'].map(k => num(p[k]));
      const source = src(p.source_citation, p.source_archive, p.source_reference, p.source_url);
      const year = num(p.year);
      if (year == null) { console.warn(`skip ${r.id}: no year`); continue; }
      if (p.point_id) {
        const arr = files.inters.intersections;
        let rec = arr.find(x => x.id === p.point_id && x.city === city);
        if (!rec) {
          rec = { id: p.point_id, city, name: { en: p.point_name || p.point_id }, coordinates: pair(p.lat, p.lon),
            locationBasis: p.location_basis || null, coordinatesConfirmed: false, counts: [], placeholder: true, source };
          arr.push(rec);
        }
        if (!Array.isArray(rec.counts)) rec.counts = [];
        upsert(rec.counts, { inboxId: r.id, year, values, unit: p.unit || null, total: num(p.total_observed),
          originalCategories: p.original_categories || null, mappingNotes: p.mapping_notes || null,
          derivation: p.derivation || null, method: p.method || null, observedDate: p.observed_date || null,
          observedHours: p.observed_hours || null, source, verified, submittedBy: r.submitted_name, notes: p.notes || null });
        rec.placeholder = !rec.counts.every(c => c.verified);
        touched.add('inters');
      } else {
        /* city-level: the chart wants four percentages; counts are converted and both are kept */
        let pct = values;
        if (p.unit === 'count') {
          const tot = num(p.total_observed) ?? (values.every(v => v != null) ? values.reduce((a, b) => a + b, 0) : null);
          pct = tot ? values.map(v => (v == null ? null : Math.round(v / tot * 1000) / 10)) : values.map(() => null);
        }
        upsert(files.split.records, { inboxId: r.id, city, decade: Math.floor(year / 10) * 10, year,
          values: pct.every(v => v != null) ? pct : null, counts: p.unit === 'count' ? values : null, unit: p.unit || null,
          derivation: p.derivation || null, method: p.method || null, originalCategories: p.original_categories || null,
          mappingNotes: p.mapping_notes || null, source, submittedBy: r.submitted_name, placeholder: !verified });
        touched.add('split');
      }
    } else if (r.kind === 'image') {
      const cleared = p.may_embed === 'yes' && !!p.cleared_by;
      upsert(files.images.images, { inboxId: r.id, id: p.image_id, city, siteId: p.site_id || null,
        caption: { en: p.caption_en || '' }, place: p.shows_place || null, year: num(p.year), dateExact: p.date_exact || null,
        coordinates: pair(p.lat, p.lon), creator: p.creator || null, creatorDeathYear: num(p.creator_death_year),
        archive: p.archive || null, reference: p.reference || null, url: p.source_url || null,
        rights: { statement: p.rights_statement || null, uri: p.rights_uri || null, basis: p.rights_basis || null,
          contact: p.permission_contact || null, date: p.permission_date || null, mayEmbed: p.may_embed || 'unresolved' },
        attribution: p.attribution_text || null, clearedBy: p.cleared_by || null, clearedOn: p.cleared_on || null,
        cleared, file: null, caveat: p.caveat ? { en: p.caveat } : null, notes: p.notes || null,
        submittedBy: r.submitted_name, placeholder: !verified });
      touched.add('images');
    } else if (r.kind === 'story') {
      const period = num(p.period_start), factor = p.factor || sharedFactor(period);
      if (!files.narr.cities[city]) files.narr.cities[city] = [];
      const sources = list(p.sources);
      upsert(files.narr.cities[city], { inboxId: r.id,
        id: `${city.toUpperCase()}-NARR-${period}-${String(factor || 'x').toUpperCase()}-${r.id.slice(0, 8)}`,
        period, factor, title: { en: p.title_en }, body: { en: p.body_en }, author: p.author || null,
        affiliation: p.author_affiliation || null, writtenOn: p.written_on || null,
        linkedSites: list(p.linked_site_ids), linkedImages: list(p.linked_image_ids), sources,
        contestedNote: p.contested_note || null,
        source: { citation: sources[0] || TBC, archive: p.source_archive || null, reference: p.source_reference || null,
          url: null, verifiedBy: verified ? r.verified_by : null, verifiedOn: verified ? r.verified_on : null },
        placeholder: false, verified });
      files.narr.meta.counts = files.narr.meta.counts || {};
      files.narr.meta.counts[city] = files.narr.cities[city].length;
      touched.add('narr');
    } else if (r.kind === 'map') {
      const tile = p.tile_url || null, file = p.georef_file_url || null;
      const kind = tile ? 'xyz' : (file && /\.pmtiles(\?|$)/i.test(file) ? 'pmtiles' : null);
      const drawable = !!kind && p.may_publish === 'yes' && !!p.cleared_by;
      upsert(files.maps.maps, { inboxId: r.id, id: p.map_id, city, kind, year: num(p.year), yearBasis: p.year_basis || null,
        publisher: p.publisher || null, scale: p.scale || null, series: p.series_or_sheet || null, url: tile || file,
        title: { en: p.title || p.map_id },
        source: { citation: p.title || TBC, archive: p.archive || null, reference: p.reference || null, url: p.source_url || null },
        licence: { statement: p.rights_statement || null, uri: p.rights_uri || null, basis: p.rights_basis || null },
        attr: p.attribution_text || p.rights_statement || '', georeferenced: p.georeferenced || 'no',
        georefMethod: p.georef_method || null, projection: p.projection || null, minZoom: 10, maxZoom: 17, bounds: null,
        checked: null, clearedBy: p.cleared_by || null, clearedOn: p.cleared_on || null, notes: p.notes || null,
        submittedBy: r.submitted_name, placeholder: !drawable });
      touched.add('maps');
    } else if (r.kind === 'pin') {
      pins.push({ ...p, properties: { ...(p.properties || {}), inboxId: r.id, submittedBy: r.submitted_name,
        contact: r.submitted_email, receivedAt: r.created_at } });
    } else if (r.kind === 'review') {
      reviews.push({ inboxId: r.id, receivedAt: r.created_at, reviewer: r.submitted_name, ...p });
    }
    done.push(r.id);
  }

  /* meta counts, so the files stay self-describing */
  const stamp = today();
  if (touched.has('split')) { const m = files.split.meta, rs = files.split.records; m.updated = stamp; m.total = rs.length; m.placeholder = rs.filter(x => x.placeholder).length; }
  if (touched.has('inters')) { const m = files.inters.meta, rs = files.inters.intersections; m.updated = stamp; m.total = rs.length; m.placeholder = rs.filter(x => x.placeholder).length; }
  if (touched.has('images')) { const m = files.images.meta, rs = files.images.images; m.updated = stamp; m.total = rs.length; m.cleared = rs.filter(x => x.cleared).length; }
  if (touched.has('narr')) files.narr.meta.updated = stamp;
  if (touched.has('maps')) files.maps.meta.updated = stamp;

  const targets = { split: 'modalsplit.json', inters: 'intersections.json', images: 'images.json', narr: 'narrative.json', maps: 'maps.json' };
  console.log(`${done.length} row(s) ${dry ? 'would be' : 'being'} exported:`);
  for (const k of touched) console.log(`  data/${targets[k]}`);
  if (pins.length) console.log(`  docs/inbox/pins-${stamp}.geojson (${pins.length} pin(s))`);
  for (const rv of reviews) console.log(`  docs/inbox/review-${rv.receivedAt.slice(0, 10)}-${rv.inboxId.slice(0, 8)}.json`);
  if (dry) return;

  for (const k of touched) writeJSON(DATA(targets[k]), files[k]);
  if (pins.length || reviews.length) fs.mkdirSync(INBOX_DIR, { recursive: true });
  if (pins.length) {
    const f = path.join(INBOX_DIR, `pins-${stamp}.geojson`);
    const fc = fs.existsSync(f) ? readJSON(f) : { type: 'FeatureCollection', features: [] };
    for (const pin of pins) { const i = fc.features.findIndex(x => x.properties && x.properties.inboxId === pin.properties.inboxId); if (i > -1) fc.features[i] = pin; else fc.features.push(pin); }
    writeJSON(f, fc);
  }
  for (const rv of reviews) writeJSON(path.join(INBOX_DIR, `review-${rv.receivedAt.slice(0, 10)}-${rv.inboxId.slice(0, 8)}.json`), rv);
  if (!from) await api(`contribution?id=in.(${done.join(',')})`, { method: 'PATCH', body: JSON.stringify({ exported_at: new Date().toISOString() }) });
  console.log('Done. Read the diff (git diff data/ docs/inbox/) before committing: the export is a proposal until it is in git.');
}

const commands = { list: cmdList, show: () => cmdShow(args[1]), verify: () => cmdVerify(args[1]), reject: () => cmdReject(args[1]), archive: () => cmdArchive(args[1]), export: cmdExport };
if (!commands[cmd]) {
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0].split('\n').slice(1).join('\n'));
  process.exit(cmd ? 1 : 0);
}
commands[cmd]().catch(e => fail(e.stack || String(e)));
