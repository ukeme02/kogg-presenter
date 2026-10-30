/* KOGG Presenter — operator logic */
'use strict';

/* ---------- storage helpers ---------- */
const LS = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (err) {
      const notice = document.getElementById('storageNotice') || document.body.appendChild(Object.assign(document.createElement('div'), { id: 'storageNotice', role: 'alert' }));
      notice.textContent = 'Storage is unavailable or full. Your latest change could not be saved. Export a backup and free space before continuing.';
      notice.style.cssText = 'position:fixed;bottom:0;left:0;right:0;padding:16px;background:#9b2020;color:white;z-index:99999';
      throw err;
    }
    // library changes mark the cloud copy out of date (auto-sync — see CLOUD section)
    if (window.__koggBoot &&
        (key === K.songs || key === K.themes || key === K.service || key === K.plans)) markDirty();
  },
};
const K = { songs: 'cp_songs', themes: 'cp_themes', service: 'cp_service',
            settings: 'cp_settings', live: 'cp_live', plans: 'cp_plans' };

/* ---------- shared slide helpers (kept in sync with display.js) ---------- */
function stripStrongs(s) {
  return String(s).replace(/\[(?:G|H)\d{1,5}]/g, '').replace(/\s{2,}/g, ' ');
}
function withStrongsHtml(s) {
  // escape first, then turn [G12]/[H1234] markers into clickable <sup> numbers (preview only)
  return esc(String(s)).replace(/\[(G|H)(\d{1,5})]/g, '<sup class="sn" data-sn="$1$2" title="Tap — meaning on screen">$2</sup>').replace(/ {2,}/g, ' ');
}
function songToSlides(song) {
  return String(song.lyrics || '')
    .split(/\n\s*\n/)
    .map(block => block.trim())
    .filter(Boolean)
    .map(block => {
      let label = song.title;
      let text = block;
      const m = text.match(/^\[([^\]]+)\]\s*\n?/);
      if (m) { label = `${song.title} — ${m[1]}`; text = text.slice(m[0].length).trim(); }
      return { text, label };
    });
}
function scriptureToSlides(books, bookIdx, chFrom, vFrom, vTo) {
  const book = books[bookIdx];
  const slides = [];
  for (let v = vFrom; v <= vTo; v++) {
    const text = book.chapters[chFrom - 1][v - 1];
    if (text == null) break;
    if (!text.trim()) continue;
    slides.push({ text, label: `${book.name} ${chFrom}:${v}` });
  }
  return slides;
}

/* ---------- state ---------- */
let bible = null;            // {translation, books:[{name, chapters:[[...]]}]}
let searchIndex = [];        // flat plain-text verse index for the Bible search
let songs = LS.get(K.songs, []);
let themes = LS.get(K.themes, null);
let service = LS.get(K.service, []);   // [{id,type,title,slides:[{text,label}]}]
let live = LS.get(K.live, { mode: 'blank', slides: [], index: 0, lowerThird: { on: false, l1: '', l2: '' } });   // plain black screen until you pick something
let preparedScripture = null;
let comparisonToken = 0;
let outputIsConnected = false;
let editingSongId = null;

const DEFAULT_THEMES = [
  { id: 't1', name: 'Black',       bg: '#000000',                                          bgImage: '', textColor: '#ffffff', font: "'Nunito Sans Expanded', Georgia, serif", fontSize: 7, align: 'center', weight: '700' },
  { id: 't2', name: 'Sunset',      bg: 'linear-gradient(135deg,#1a2a6c,#b21f1f,#fdbb2d)', bgImage: '', textColor: '#ffffff', font: "'Nunito Sans Expanded', Georgia, serif", fontSize: 7, align: 'center', weight: '700' },
  { id: 't3', name: 'Deep Blue',   bg: 'linear-gradient(135deg,#0f2027,#203a43,#2c5364)', bgImage: '', textColor: '#ffffff', font: "'Nunito Sans Expanded', Georgia, serif", fontSize: 7, align: 'center', weight: '700' },
  { id: 't4', name: 'Emerald',     bg: 'linear-gradient(135deg,#134e5e,#71b280)',          bgImage: '', textColor: '#ffffff', font: "'Nunito Sans Expanded', Georgia, serif", fontSize: 7, align: 'center', weight: '700' },
];
if (!themes || !themes.length) { themes = DEFAULT_THEMES; LS.set(K.themes, themes); }
// migrate older saved themes to the new default scripture font (only untouched defaults)
const DEFAULT_FONT = "'Nunito Sans Expanded', Georgia, serif";
themes = themes.map(t => {
  t = Object.assign({ align: 'center', weight: '400' }, t);
  if (t.font === 'Georgia, serif') t.font = DEFAULT_FONT;
  if (t.weight === undefined) t.weight = '700';
  // the default theme (t1) was Sunset until Oct 2026 — switch untouched copies to Black
  if (t.id === 't1' && t.name === 'Sunset' &&
      t.bg === 'linear-gradient(135deg,#1a2a6c,#b21f1f,#fdbb2d)' && !t.bgImage && !t.bgImageId) {
    t.name = 'Black'; t.bg = '#000000';
  }
  return t;
});
LS.set(K.themes, themes);
let currentThemeId = LS.get(K.settings, {}).currentThemeId || themes[0].id;

const $ = id => document.getElementById(id);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* ---------- image assets (IndexedDB, inline fallback) ---------- */
/* Anything bigger than ~160KB is stored in IndexedDB (js/idb.js) so it never
   blows the localStorage quota. Keys inside themes/settings only carry the id. */
const ASSET_INLINE_LIMIT = 160 * 1024;
async function storeImage(dataURL, prefix) {
  if (dataURL.length <= ASSET_INLINE_LIMIT) return dataURL;
  const id = `${prefix}-${uid()}`;
  const ok = window.KOGGAssets ? await window.KOGGAssets.put(id, dataURL) : false;
  return ok ? { id } : dataURL;
}
function themeSave() { LS.set(K.themes, themes); }

/* one-time migration: existing big inline images move into IndexedDB */
(async function migrateImagesToIdb() {
  if (!window.KOGGAssets) return;
  let changed = false;
  for (const t of themes) {
    if (t.bgImage && t.bgImage.length > ASSET_INLINE_LIMIT) {
      const id = 'bg-' + uid();
      if (await window.KOGGAssets.put(id, t.bgImage)) { t.bgImageId = id; t.bgImage = ''; changed = true; }
    }
  }
  const s = LS.get(K.settings, {});
  if (s.logoImage && s.logoImage.length > ASSET_INLINE_LIMIT) {
    const id = 'logo-' + uid();
    if (await window.KOGGAssets.put(id, s.logoImage)) { s.logoId = id; s.logoImage = ''; changed = true; }
  }
  if (changed) { themeSave(); LS.set(K.settings, s); }
})();

/* ---------- sync to display ---------- */
const channel = ('BroadcastChannel' in window) ? new BroadcastChannel('kogg-presenter') : null;
function pushLive(patch = {}) {
  live = Object.assign({}, live, patch);
  live.strongsOn = LS.get(K.settings, {}).strongsOn !== false;
  if (patch.slides !== undefined && patch.scripture === undefined) live.scripture = null;
  if (patch.slides !== undefined) { live.strongsShowing = false; live.strongsCard = null; live.highlight = null; }   // new content → word card and highlight close
  LS.set(K.live, live);
  if (channel) channel.postMessage(live);
  window.KOGGRelay?.publish(live, themes, LS.get(K.settings, {}));
  renderPreview();
  renderLiveText();
  renderFloatPreview();
}

/* ---------- live indicator ---------- */
function renderPreview() {
  if (outputIsConnected) setOutputStatus(live.mode === 'blank' ? 'Output connected • screen blank' : 'Output connected');
  // live indicator in the Scripture tab ("🔴 John 3:16")
  const lr = $('liveRef');
  const showing = live.mode === 'normal' && live.slides?.[live.index];
  lr.textContent = showing ? '🔴 ' + (live.slides[live.index].label || live.title || '') + (live.scripture ? ' • ' + translationName(live.scripture.translation) : '') : '';
  lr.hidden = !showing;
}

/* ---------- tabs ---------- */
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x === t));
  document.querySelectorAll('.tab-panel').forEach(p =>
    p.classList.toggle('active', p.id === 'tab-' + t.dataset.tab));
  if (t.dataset.tab === 'songs') renderSongList();
  if (t.dataset.tab === 'service') renderService();
  if (t.dataset.tab === 'themes') renderThemesTab();
}));

/* ---------- "⋯" overflow menu ---------- */
document.addEventListener('click', e => {
  if (!e.target.closest('#dockMenu') && !e.target.closest('#feDocks') && !e.target.closest('#btnDocks')) {
    const dm = $('dockMenu');
    if (dm && !dm.hidden) dm.hidden = true;   // click-outside closes the docks menu
  }
});

/* =========================================================
   SCRIPTURE
========================================================= */
let bibleLoadToken = 0;
let loadedBibleFile = '';
async function loadBible(file) {
  const token = ++bibleLoadToken;
  try {
  let data = null;
  if (file.startsWith('idb:')) {
    // custom version added in Tools — text lives in IndexedDB
    const raw = window.KOGGAssets ? await window.KOGGAssets.get(file.slice(4)) : null;
    if (!raw) throw new Error('Version missing from this device');
    data = JSON.parse(raw);
  } else {
    const res = await fetch(file);
    if (!res.ok) throw new Error('Bible download failed (' + res.status + ')');
    data = await res.json();
  }
  if (token !== bibleLoadToken) return false;
  if (!data || !Array.isArray(data.books) || data.books.length !== 66 || !data.books.every(b => typeof b.name === 'string' && Array.isArray(b.chapters) && b.chapters.length && b.chapters.every(c => Array.isArray(c) && c.length && c.every(v => typeof v === 'string')))) throw new Error('Bible file has an invalid format');
  bible = data;
  loadedBibleFile = file;
  $('translationSelect').value = file;
  LS.set(K.settings, Object.assign(LS.get(K.settings, {}), { currentTranslation: file }));
  // flat index of plain-verse text for fast full-text search (all 66 books)
  searchIndex = [];
  bible.books.forEach((b, bi) => b.chapters.forEach((ch, ci) => ch.forEach((t, vi) => {
    searchIndex.push({ bi, ci, vi, s: stripStrongs(t).toLowerCase() });
  })));
  const bookSel = $('bookSelect');
  bookSel.innerHTML = bible.books.map((b, i) => `<option value="${i}">${esc(b.name)}</option>`).join('');
  fillChapters();
  renderVersionChips();
  return true;
  } catch (err) {
    if (token !== bibleLoadToken) return false;
    if (loadedBibleFile) $('translationSelect').value = loadedBibleFile;
    $('modeHint').textContent = err.message + ' — select a translation to retry.';
    return false;
  }
}
function fillChapters() {
  const book = bible.books[+$('bookSelect').value];
  $('chapterSelect').innerHTML = book.chapters.map((_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('');
  fillVerses();
  renderBookChips($('bookSearch').value);
  renderChapterChips();
}
function fillVerses() {
  rangeStart = 0;
  const book = bible.books[+$('bookSelect').value];
  const ch = +$('chapterSelect').value;
  const count = book.chapters[ch - 1].length;
  $('verseFrom').innerHTML = opts(count);
  $('verseTo').innerHTML = opts(count);
  $('verseFrom').value = 1;
  $('verseTo').value = count;          // default range = whole chapter
  renderVerseDots();
}
function opts(n) { return Array.from({ length: n }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join(''); }

/* ---------- tap-to-live verse dots (number circles) ----------
   Verse mode (default):  tap a number → that verse is live, instantly.
   Range mode:            tap the first number, tap the last → range goes live.
   Chapter mode:          tap a chapter number in the Chapters dock — whole chapter live. */
let rangeStart = 0;
let verseMode = 'verse';
let liveRef = null;    // {bookIdx, ch, vFrom, vTo} currently on the projector

function renderVerseDots() {
  if (!bible) return;
  const book = bible.books[+$('bookSelect').value];
  const ch = +$('chapterSelect').value;
  const dots = $('verseDots');
  if (verseMode === 'chapter') { dots.innerHTML = ''; return; }
  dots.innerHTML = book.chapters[ch - 1].map((_, i) => {
    const v = i + 1;
    const liveHere = liveRef && liveRef.bookIdx === +$('bookSelect').value &&
                     liveRef.ch === ch && v >= liveRef.vFrom && v <= liveRef.vTo;
    return `<button class="dot-dot${liveHere ? ' live' : ''}" data-v="${v}" title="Go live — verse ${v}">${v}</button>`;
  }).join('');
  renderLiveText();
}
function renderLiveText() {
  const box = $('liveText');
  const slide = live.slides?.[live.index];
  if (live.mode !== 'normal' || !slide) { box.textContent = live.mode === 'blank' ? 'Screen blank' : live.mode === 'logo' ? 'Logo on screen' : 'No slide on screen'; return; }
  const currentBook = liveRef && bible?.books[liveRef.bookIdx];
  const prefix = currentBook ? `${currentBook.name} ${liveRef.ch}:` : '';
  const projectedVerse = prefix && slide.label?.startsWith(prefix) ? Number(slide.label.slice(prefix.length)) : 0;
  if (!projectedVerse || !liveRef || projectedVerse < liveRef.vFrom || projectedVerse > liveRef.vTo) {
    box.innerHTML = `<div class="live-ref">${esc(slide.label || '')}</div><div style="white-space:pre-wrap">${esc(stripStrongs(slide.text))}</div>`;
    return;
  }
  const previewRef = {...liveRef, vFrom:projectedVerse, vTo:projectedVerse};
  const book = bible.books[previewRef.bookIdx];
  const hasStrongs = /\[(?:G|H)\d{1,5}]/.test(slide.text || '');
  const nums = hasStrongs && strongsOn();   // numbers stay while the card shows — second tap flips back
  const parts = [];
  for (let v = previewRef.vFrom; v <= Math.min(previewRef.vTo, previewRef.vFrom + 40); v++) {
    const raw = slide.text || '';
    const hl = live.highlight && live.highlight.v === v ? live.highlight : null;
    const toks = raw.trim().split(/\s+/).filter(Boolean);
    let pi = 0;
    const hh = toks.map(tok => {
      const m = [...tok.matchAll(/\[(G|H)(\d{1,5})]/g)];
      const plainTok = tok.replace(/\[(?:G|H)\d{1,5}]/g, '');
      let out = '';
      if (plainTok) {
        pi++;
        const marked = hl && pi >= hl.wFrom && pi <= hl.wTo ? ' marked' : '';
        out = `<span class="lk${marked}" data-v="${v}" data-w="${pi}">${esc(plainTok)}</span>`;
      }
      if (nums && m.length) {
        out += m.map(x => `<sup class="sn" data-sn="${x[1]}${x[2]}" title="Tap — meaning on screen">${x[2]}</sup>`).join('');
      }
      return out;
    }).join(' ');
    parts.push(`<b>${v}</b> ${hh}`);
  }
  const ref = book.name + ' ' + previewRef.ch + (previewRef.vTo > previewRef.vFrom ? ':' + previewRef.vFrom + '-' + previewRef.vTo : ':' + previewRef.vFrom);
  const liveOnProjector = live.strongsShowing && live.strongsCard ? '<span class="lt-note">word meaning on screen — tap the number again to flip back</span>' : '';
  box.innerHTML = `<div class="live-ref">${esc(ref)}${nums ? '<span class="lt-tip">tap a word number → its meaning takes the screen</span>' : ''}${liveOnProjector}</div>${parts.join(' ')}`;
}

/* ---------- Strong's tap-to-define — numbers live in the preview only;
   tapping one shows the Hebrew/Greek word card on the projector, tapping
   again flips back to the verse. Service never has to stop. ---------- */
let strongsLexicon = null, strongsLoading = null;
function ensureLexicon() {
  if (strongsLexicon) return Promise.resolve(strongsLexicon);
  if (strongsLoading) return strongsLoading;
  strongsLoading = fetch('data/strongs.json').then(r => { if (!r.ok) throw new Error('Lexicon download failed'); return r.json(); })
    .then(d => { strongsLexicon = d; return d; })
    .catch(() => null)
    .finally(() => { strongsLoading = null; });
  return strongsLoading;
}
$('liveText').addEventListener('click', async e => {
  /* click on empty text (not a word, not a number) = clear the highlight */
  if (!e.target.closest('.lk') && !e.target.closest('sup.sn') && live.highlight) {
    pushLive({ highlight: null });
    renderLiveText();
  }
  const sup = e.target.closest('sup[data-sn]');
  if (!sup) return;
  const sn = sup.dataset.sn;
  if (live.strongsShowing && live.strongsCard && live.strongsCard.sn === sn) {
    pushLive({ strongsShowing: false, strongsCard: null });   // flip back to the verse
    renderLiveText();
    return;
  }
  const lex = await ensureLexicon();
  const entry = lex && lex[sn];
  if (!entry) { sup.classList.add('missing'); sup.title = 'Word not in the lexicon'; return; }
  const card = { sn, lang: sn[0] === 'G' ? 'Greek' : 'Hebrew', word: entry.w || '',
                 translit: entry.t || '', pron: entry.p || '', def: entry.d || '',
                 kjv: entry.k || '', deriv: entry.x || '' };
  const book = liveRef ? bible.books[liveRef.bookIdx] : null;
  if (book && liveRef) {
    const slide = live.slides[live.index];
    card.ref = slide?.label || '';
    card.verse = stripStrongs(slide?.text || '');
  }
  pushLive({ strongsShowing: true, strongsCard: card });
  renderLiveText();
});

/* word highlight — press on a word (or drag across words) in the preview
   and the projector highlights it in real time; tap empty space to clear.
   Word indices are per verse, so any slide of the range can be on screen. */
let hlDrag = null;
(function initWordHighlight() {
  const box = $('liveText');
  box.addEventListener('pointerdown', e => {
    const word = e.target.closest('.lk');
    if (!word) return;   // empty-space press → the click handler clears
    const v = +word.dataset.v, w = +word.dataset.w;
    hlDrag = { v, wFrom: w, wTo: w, moved: false };
    try { box.setPointerCapture(e.pointerId); } catch {}
    e.preventDefault();
  });
  box.addEventListener('pointermove', e => {
    if (!hlDrag) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const word = el && el.closest('.lk');
    if (!word || +word.dataset.v !== hlDrag.v) return;
    const w = +word.dataset.w;
    const wFrom = Math.min(hlDrag.wFrom, w), wTo = Math.max(hlDrag.wFrom, w);
    if (wFrom !== hlDrag.wFrom || wTo !== hlDrag.wTo) {
      hlDrag.moved = true;
      hlDrag.wFrom = wFrom; hlDrag.wTo = wTo;
      pushLive({ highlight: { v: hlDrag.v, wFrom, wTo } });   // live while you drag
      renderLiveText();
    }
  });
  box.addEventListener('pointerup', () => {
    if (!hlDrag) return;
    const d = hlDrag; hlDrag = null;
    if (d.moved) return;                                     // the drag already pushed its range
    const cur = live.highlight;                              // single-word tap: toggles off if already marked
    if (cur && cur.v === d.v && cur.wFrom === d.wFrom && cur.wTo === d.wTo && cur.wFrom === cur.wTo) {
      pushLive({ highlight: null });
    } else {
      pushLive({ highlight: { v: d.v, wFrom: d.wFrom, wTo: d.wTo } });
    }
    renderLiveText();
  });
  box.addEventListener('pointercancel', () => { hlDrag = null; });
})();

/* ---------- floating projector preview — a mini mirror of the screen that
   stays open while you switch tabs; toggle from the 🧩 Docks menu ---------- */
function renderFloatPreview() {
  const body = $('fpBody');
  const el = $('floatPreview');
  if (!body || !el || el.hidden) return;
  if (live.strongsShowing && live.strongsCard) {
    body.innerHTML = `<div class="fp-note">word meaning on screen</div><div class="fp-text">${esc(live.strongsCard.sn + ' — ' + (live.strongsCard.word || live.strongsCard.def || ''))}</div>`;
    return;
  }
  if (live.mode !== 'normal') {
    body.innerHTML = `<div class="fp-note">${live.mode === 'logo' ? 'logo screen' : live.mode === 'blank' ? 'blank screen' : 'countdown on screen'}</div>`;
    return;
  }
  const s = live.slides[live.index] || { text: '', label: '' };
  let hl = null;
  if (live.highlight) {
    const m = /:(\d+)$/.exec(s.label || '');
    if (m && +m[1] === live.highlight.v) hl = live.highlight;
  }
  const words = stripStrongs(s.text).trim().split(/\s+/).filter(Boolean);
  body.innerHTML = `${s.label ? `<div class="fp-ref">${esc(s.label)}</div>` : ''}<div class="fp-text">${words.map((w, i) =>
    hl && i + 1 >= hl.wFrom && i + 1 <= hl.wTo ? `<mark class="whl">${esc(w)}</mark>` : esc(w)).join(' ')}</div>`;
}
function applyFloatPreview() {
  const el = $('floatPreview');
  el.hidden = !lsShowFloatPreview();
  const pos = LS.get(K.settings, {}).fpPos;
  if (pos) {
    el.style.left = Math.max(4, Math.min(window.innerWidth - 100, pos.x)) + 'px';
    el.style.top = Math.max(4, Math.min(window.innerHeight - 60, pos.y)) + 'px';
    el.style.right = 'auto';
    el.style.bottom = 'auto';
  }
  if (!el.hidden) {
    $('fpBody').hidden = !!LS.get(K.settings, {}).fpFold;
    renderFloatPreview();
  }
}
(function initFloatPreview() {
  const el = $('floatPreview');
  const grip = el.querySelector('.fp-head .grip');
  grip.addEventListener('pointerdown', e => {
    e.preventDefault();
    const r = el.getBoundingClientRect();
    const dx = e.clientX - r.left, dy = e.clientY - r.top;
    let moved = false;
    el.classList.add('dragging');
    const move = ev => {
      moved = true;
      const x = Math.max(4, Math.min(window.innerWidth - 90, ev.clientX - dx));
      const y = Math.max(4, Math.min(window.innerHeight - 50, ev.clientY - dy));
      el.style.left = x + 'px'; el.style.top = y + 'px';
      el.style.right = 'auto'; el.style.bottom = 'auto';
    };
    const up = ev => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      el.classList.remove('dragging');
      if (moved) {
        const s = LS.get(K.settings, {});
        s.fpPos = { x: Math.round(parseFloat(el.style.left) || 0), y: Math.round(parseFloat(el.style.top) || 0) };
        LS.set(K.settings, s);
      }
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  });
  $('fpCollapse').addEventListener('click', () => {
    const s = LS.get(K.settings, {});
    s.fpFold = !s.fpFold;
    LS.set(K.settings, s);
    $('fpBody').hidden = !!s.fpFold;
    $('fpCollapse').textContent = s.fpFold ? '▸' : '▾';
    if (!s.fpFold) renderFloatPreview();
  });
  $('fpClose').addEventListener('click', () => {
    const s = LS.get(K.settings, {});
    s.showFloatPreview = false;
    LS.set(K.settings, s);
    applyFloatPreview();
  });

})();
function scrollLiveIntoView() {
  setTimeout(() => {
    const el = $('verseDots').querySelector('.dot-dot.live');
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, 60);
}
function setVerseMode(m) {
  rangeStart = 0;
  verseMode = m;
  document.querySelectorAll('#pickMode button').forEach(b =>
    b.classList.toggle('active', b.dataset.mode === m));
  $('modeHint').textContent = m === 'verse' ? 'Tap a number — live instantly.'
    : m === 'range' ? 'Tap the first number, then the last — that range goes live.'
    : 'Tap a chapter number — the whole chapter goes live.';
  LS.set(K.settings, Object.assign(LS.get(K.settings, {}), { verseMode: m }));
  renderVerseDots();
}
document.querySelectorAll('#pickMode button').forEach(b =>
  b.addEventListener('click', () => setVerseMode(b.dataset.mode)));

$('verseDots').addEventListener('click', e => {
  const dot = e.target.closest('button[data-v]');
  if (!dot || verseMode === 'chapter') return;
  const v = +dot.dataset.v;
  const bi = +$('bookSelect').value, ch = +$('chapterSelect').value;
  if (verseMode === 'verse') {
    stageScripture({ bookIdx: bi, ch, vFrom: v, vTo: v });
    return;
  }
  // range mode: first tap stores the start, second tap completes the range
  if (!rangeStart) {
    rangeStart = v;
    dot.classList.add('live');
    $('modeHint').textContent = `Start: verse ${v} — now tap the last number.`;
  } else {
    stageScripture({ bookIdx: bi, ch, vFrom: Math.min(rangeStart, v), vTo: Math.max(rangeStart, v) });
    rangeStart = 0;
  }
});

/* what's currently selected (used by "+ Add to Service") */
function currentScriptureRange() {
  return {
    bookIdx: +$('bookSelect').value,
    ch: +$('chapterSelect').value,
    vFrom: Math.min(+$('verseFrom').value, +$('verseTo').value),
    vTo: Math.max(+$('verseFrom').value, +$('verseTo').value),
  };
}
$('bookSelect').addEventListener('change', fillChapters);
$('chapterSelect').addEventListener('change', fillVerses);
$('translationSelect').addEventListener('change', () => {
  const file = $('translationSelect').value;
  const ref = preparedScripture?.r || currentLiveReference() || liveRef;
  loadBible(file).then(loaded => { if (loaded && ref) stageScripture({...ref}); });
});

/* ---------- version chips — switch translation mid-show from the projector dock ---------- */
function renderVersionChips() {
  const box = $('versionChips');
  if (!box) return;
  const sel = $('translationSelect');
  box.innerHTML = [...sel.options].map(o => {
    const active = o.value === sel.value;
    const short = o.text.split(' — ')[0].replace("KJV with Strong's", 'KJV+Str');
    return `<button class="vchip${active ? ' active' : ''}" data-val="${esc(o.value)}" title="${esc(o.text)}${active ? ' — loaded' : ''}"${active ? ' disabled' : ''}>${esc(short)}</button>`;
  }).join('');
}
$('versionChips').addEventListener('click', e => {
  const b = e.target.closest('button[data-val]');
  if (!b) return;
  const val = b.dataset.val;
  $('translationSelect').value = val;
  b.classList.add('loaded');   // immediate feedback while the fetch lands
  b.textContent = b.textContent + ' …';
  $('translationSelect').dispatchEvent(new Event('change'));
  flash(b, 'Prepared ✓');
});

/* Scripture docks — Books / Chapters / Verses / Memory on one page */

/* book classification — color groups within the two testaments */
const BOOK_ABBS = ['GEN','EXO','LEV','NUM','DEU','JOS','JDG','RUT','1SA','2SA','1KI','2KI','1CH','2CH','EZR','NEH','EST','JOB','PSA','PRO','ECC','SNG','ISA','JER','LAM','EZK','DAN','HOS','JOL','AMO','OBA','JON','MIC','NAH','HAB','ZEP','HAG','ZEC','MAL','MAT','MRK','LUK','JHN','ACT','ROM','1CO','2CO','GAL','EPH','PHP','COL','1TH','2TH','1TI','2TI','TIT','PHM','HEB','JAS','1PE','2PE','1JN','2JN','3JN','JUD','REV'];
const BOOK_GROUPS_OT = [
  { key: 'torah',  label: 'Moses / Torah',    from: 0,  to: 4 },
  { key: 'othist', label: 'History',          from: 5,  to: 16 },
  { key: 'poetry', label: 'Wisdom & Poetry',  from: 17, to: 21 },
  { key: 'major',  label: 'Major Prophets',   from: 22, to: 26 },
  { key: 'minor',  label: 'Minor Prophets',   from: 27, to: 38 },
];
const BOOK_GROUPS_NT = [
  { key: 'gospels', label: 'Gospels',         from: 39, to: 42 },
  { key: 'acts',    label: 'History',         from: 43, to: 43 },
  { key: 'epist',   label: "Paul's Letters",  from: 44, to: 56 },
  { key: 'general', label: 'General Letters', from: 57, to: 64 },
  { key: 'rev',     label: 'Prophecy',        from: 65, to: 65 },
];
function renderBookChips(filter) {
  if (!bible) return;
  // only the letter part filters — "jn 3:16" filters books, not "jn 3:16" itself
  const f = (filter || '').replace(/^[\d.\s\-]+/, '').replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  const fk = normKey(f);
  const matches = i => !f || bible.books[i].name.toLowerCase().includes(f) ||
                       normKey(bible.books[i].name).includes(fk);
  const box = $('bookChips');
  let html = '', total = 0;
  const sect = (title, groups) => {
    const chips = [];
    for (const g of groups) {
      for (let i = g.from; i <= g.to && i < bible.books.length; i++) {
        if (!matches(i)) continue;
        total++;
        chips.push(`<button data-i="${i}" class="book-chip g-${g.key}${i === +$('bookSelect').value ? ' selected' : ''}" title="${esc(bible.books[i].name)}">${BOOK_ABBS[i] || esc(bible.books[i].name)}</button>`);
      }
    }
    if (chips.length) html += `<div class="book-sec">${title}</div><div class="book-grid">${chips.join('')}</div>`;
  };
  sect('Old Testament', BOOK_GROUPS_OT);
  sect('New Testament', BOOK_GROUPS_NT);
  box.innerHTML = html;
  $('bookCount').textContent = f ? `${total} match${total === 1 ? '' : 'es'}` : 'OT · NT — tap a book';
}
function renderChapterChips() {
  if (!bible) return;
  const book = bible.books[+$('bookSelect').value];
  const cur = +$('chapterSelect').value;
  $('chapterChips').innerHTML = book.chapters
    .map((_, i) => `<button data-c="${i + 1}" class="dot-dot${i + 1 === cur ? ' selected' : ''}">${i + 1}</button>`)
    .join('');
}
function chapterLive(bi, ch) {
  const book = bible.books[bi];
  stageScripture({ bookIdx: bi, ch, vFrom: 1, vTo: book.chapters[ch - 1].length });
}
$('bookChips').addEventListener('click', e => {
  const chip = e.target.closest('button[data-i]');
  if (!chip) return;
  $('bookSelect').value = chip.dataset.i;
  fillChapters();
  renderBookChips($('bookSearch').value);
  scrollLiveIntoView();
});
$('chapterChips').addEventListener('click', e => {
  const chip = e.target.closest('button[data-c]');
  if (!chip) return;
  const bi = +$('bookSelect').value, ch = +chip.dataset.c;
  if (verseMode === 'chapter') { chapterLive(bi, ch); return; }   // tap = whole chapter live
  $('chapterSelect').value = ch;
  fillVerses();
  renderChapterChips();
});
$('btnPrevChapter').addEventListener('click', () => {
  if (!bible) return;
  const cur = +$('chapterSelect').value;
  if (cur > 1) {
    $('chapterSelect').value = cur - 1;
    fillVerses(); renderChapterChips();
  } else if ($('bookSelect').value > 0) {
    $('bookSelect').value = $('bookSelect').value - 0 - 1;
    fillChapters();
    $('chapterSelect').value = bible.books[+$('bookSelect').value].chapters.length;
    fillVerses(); renderChapterChips();
  }
  if (verseMode === 'chapter') chapterLive(+$('bookSelect').value, +$('chapterSelect').value);
});
$('btnNextChapter').addEventListener('click', () => {
  if (!bible) return;
  const cur = +$('chapterSelect').value;
  const total = bible.books[+$('bookSelect').value].chapters.length;
  if (cur < total) {
    $('chapterSelect').value = cur + 1;
    fillVerses(); renderChapterChips();
  } else if ($('bookSelect').value < bible.books.length - 1) {
    $('bookSelect').value = +$('bookSelect').value + 1;
    fillChapters();
  }
  if (verseMode === 'chapter') chapterLive(+$('bookSelect').value, +$('chapterSelect').value);
});

/* ---------- Verses dock nav — step verse by verse, live, reading across
   chapters and books (verse/range shift the window; chapter mode steps
   whole chapters, just like the Chapters dock) ---------- */
function stepVerse(dir) {
  if (!bible) return;
  const bi = +$('bookSelect').value;
  const book = bible.books[bi];
  const ch = +$('chapterSelect').value;
  const count = book.chapters[ch - 1].length;
  const sameRef = liveRef && liveRef.bookIdx === bi && liveRef.ch === ch;
  if (verseMode === 'chapter') {
    const target = ch + dir;
    if (target >= 1 && target <= book.chapters.length) { chapterLive(bi, target); return; }
    const nb = bi + dir;
    if (nb < 0 || nb >= bible.books.length) return;
    chapterLive(nb, dir > 0 ? 1 : bible.books[nb].chapters.length);
    return;
  }
  let v = (sameRef ? (dir > 0 ? liveRef.vTo : liveRef.vFrom) : 1) + dir;
  if (v < 1) {   // back into the previous chapter / book
    if (ch > 1) {
      const pc = book.chapters[ch - 2].length;
      goLiveScripture({ bookIdx: bi, ch: ch - 1, vFrom: pc, vTo: pc });
    } else if (bi > 0) {
      const pb = bible.books[bi - 1], pc2 = pb.chapters.length, pl = pb.chapters[pc2 - 1].length;
      goLiveScripture({ bookIdx: bi - 1, ch: pc2, vFrom: pl, vTo: pl });
    }
    return;
  }
  if (v > count) {   // forward into the next chapter / book
    if (ch < book.chapters.length) goLiveScripture({ bookIdx: bi, ch: ch + 1, vFrom: 1, vTo: 1 });
    else if (bi < bible.books.length - 1) goLiveScripture({ bookIdx: bi + 1, ch: 1, vFrom: 1, vTo: 1 });
    return;
  }
  if (verseMode === 'range' && sameRef) {
    const size = liveRef.vTo - liveRef.vFrom;
    if (dir > 0) {
      const s = Math.max(1, Math.min(v, count - size));
      goLiveScripture({ bookIdx: bi, ch, vFrom: s, vTo: s + size });
    } else {
      const e = v, s = Math.max(1, e - size);
      goLiveScripture({ bookIdx: bi, ch, vFrom: s, vTo: Math.max(e, s) });
    }
    return;
  }
  goLiveScripture({ bookIdx: bi, ch, vFrom: v, vTo: v });
}
$('btnPrevVerse').addEventListener('click', () => navigateScripture(-1));
$('btnNextVerse').addEventListener('click', () => navigateScripture(1));
$('btnAddVerseService').addEventListener('click', () => {
  if (!bible) return;
  const r = liveRef && liveRef.bookIdx === +$('bookSelect').value && liveRef.ch === +$('chapterSelect').value
    ? { bookIdx: liveRef.bookIdx, ch: liveRef.ch, vFrom: liveRef.vFrom, vTo: liveRef.vTo }
    : currentScriptureRange();
  service.push({
    id: uid(), type: 'scripture', title: refOf(r),
    slides: scriptureToSlides(bible.books, r.bookIdx, r.ch, r.vFrom, r.vTo),
  });
  LS.set(K.service, service);
  flash($('btnAddVerseService'), 'Added ✓');
});

/* ---------- Memory dock — this session's live scriptures ---------- */
const historyData = LS.get('cp_scripture_history', []);
let memory = Array.isArray(historyData) ? historyData.filter(m => window.KOGGScripture.valid(m?.r) && typeof m.translation === 'string').slice(0,100) : [];
let bookmarks = LS.get('cp_scripture_bookmarks', []);
bookmarks = Array.isArray(bookmarks) ? bookmarks.filter(m=>window.KOGGScripture.valid(m?.r) && typeof m.translation==='string') : [];
function refOf(r) {
  const book = bible.books[r.bookIdx];
  return `${book.name} ${r.ch}:${r.vFrom}${r.vTo > r.vFrom ? '-' + r.vTo : ''}`;
}
function shortRef(r) {
  const name = bible.books[r.bookIdx].name;
  const ab = name.split(' ').map(w =>
    w.length <= 3 ? w : w.slice(0, /^\d/.test(name) ? 2 : 3).replace(/\.+$/, '')).join('');
  return `${ab} ${r.ch}:${r.vFrom}${r.vTo > r.vFrom ? '-' + r.vTo : ''}`;
}
function pushMemory(r) {
  const entry = { ref: refOf(r), short: shortRef(r), r: Object.assign({}, r), translation: $('translationSelect').value };
  memory = window.KOGGScripture.remember(memory, entry);
  LS.set('cp_scripture_history', memory);
  LS.set('cp_last_scripture', entry);
  renderMemory();
}
function renderMemory() {
  const box = $('memoryChips');
  const n = memory.length;
  $('bookmarkChips').innerHTML = bookmarks.map((m,i) => `<button data-bookmark="${i}" title="${esc(m.ref)}">★ ${esc(m.short || m.ref)}</button>`).join('');
  box.classList.remove('m-md', 'm-sm', 'm-xs');
  if (n > 60) box.classList.add('m-xs');
  else if (n > 24) box.classList.add('m-sm');
  else if (n > 8) box.classList.add('m-md');
  box.innerHTML = n ? memory.map((m, i) =>
    `<button data-m="${i}" class="mem-chip${liveRef && m.r.bookIdx === liveRef.bookIdx && m.r.ch === liveRef.ch &&
      m.r.vFrom === liveRef.vFrom && m.r.vTo === liveRef.vTo ? ' live' : ''}" title="${esc(m.ref)}">${esc(m.short)}</button>`
  ).join('') : '<span class="dim">Nothing live yet this session.</span>';
}
async function prepareSaved(entry, present = false) {
  if (!entry || !window.KOGGScripture.valid(entry.r)) return false;
  if ($('translationSelect').value !== entry.translation) {
    if (![...$('translationSelect').options].some(o => o.value === entry.translation)) { flash($('liveRef'), 'Version unavailable on this device'); return false; }
    if (!await loadBible(entry.translation)) return false;
  }
  return present ? goLiveScripture({...entry.r}) : stageScripture({...entry.r});
}
$('memoryChips').addEventListener('click', e => { const b=e.target.closest('button[data-m]'); if(b) prepareSaved(memory[+b.dataset.m]); });
$('bookmarkChips').addEventListener('click', e => { const b=e.target.closest('button[data-bookmark]'); if(b) prepareSaved(bookmarks[+b.dataset.bookmark]); });
$('btnMemoryClear').addEventListener('click', () => { if(!confirm('Clear saved reading history? Bookmarks stay saved.'))return; memory=[];LS.set('cp_scripture_history',memory);renderMemory(); });
$('btnResumeScripture').addEventListener('click', () => prepareSaved(LS.get('cp_last_scripture',null)));
$('btnPreviousPassage').addEventListener('click', () => {
  const current = {r:currentLiveReference(),translation:live.scripture?.translation};
  const entry = memory.find(m => !window.KOGGScripture.same(m,current));
  if(entry) prepareSaved(entry,true);
});

/* ---------- Quick jump — type "jn 3:16": book completes on 1-2 letters,
   chapter and verse jump in automatically as you type ---------- */

function suggestBook(q) {
  if (!bible) return [];
  const key = normKey(q.toLowerCase().replace(/[^a-z0-9. ]/g, ''));
  if (!key) return [];
  const exact = bible.books.findIndex(b => normKey(b.name) === key || normKey(b.name) === normKey(BOOK_ABBR[key] || ''));
  if (exact >= 0) return [exact];
  const out = bible.books
    .map((b, i) => ({ i, k: normKey(b.name) }))
    .filter(o => o.k.startsWith(key) || o.k.includes(key))
    .map(o => o.i);
  if (!out.length && BOOK_ABBR[key] !== undefined) {
    const idx = bible.books.findIndex(b => normKey(b.name) === normKey(BOOK_ABBR[key]));
    if (idx >= 0) out.push(idx);
  }
  return out.slice(0, 6);
}
function commitJump(q) {
  const s = (q || '').trim().toLowerCase();
  if (!s) return;
  const lm = s.match(/^[1-3]?\s*[a-z.\- ]+/);
  const letters = lm ? lm[0] : '';
  const cands = suggestBook(letters.trim() || s);
  if (!cands.length) return;
  const bi = cands[0];
  // "3", "3:16", "3 16", "3.16", "3:16-18"
  const dm = s.slice(letters.length).trim().match(/^(\d+)\s*[:.]?\s*(?:(\d+)\s*(?:-\s*(\d+))?)?$/);
  if (!dm) {   // book name only → move the docks, don't go live
    if (bi !== +$('bookSelect').value) {
      $('bookSelect').value = bi; fillChapters(); renderBookChips($('bookSearch').value);
      $('quickBookSug').hidden = true;
    }
    return;
  }
  const book = bible.books[bi];
  const ch = +dm[1];
  if (ch < 1 || ch > book.chapters.length) { flash($('bookSearch'), 'Invalid chapter'); return; }
  const vCount = book.chapters[ch - 1].length;
  if (!dm[2]) {  // chapter typed → land the docks on the chapter
    if (bi !== +$('bookSelect').value || ch !== +$('chapterSelect').value) {
      $('bookSelect').value = bi;
      fillChapters();
      $('chapterSelect').value = ch;
      fillVerses();
      renderChapterChips();
      renderBookChips($('bookSearch').value);
    }
    $('quickBookSug').hidden = true;
    return;
  }
  // verse typed → live, instantly
  const vTo = dm[3] ? +dm[3] : +dm[2];
  if (+dm[2] < 1 || +dm[2] > vCount || vTo < 1 || vTo > vCount) { flash($('bookSearch'), 'Invalid verse'); return; }
  stageScripture({ bookIdx: bi, ch, vFrom: Math.min(+dm[2], vTo), vTo: Math.max(+dm[2], vTo) });
  $('quickBookSug').hidden = true;
  renderBookGhost();
}
let bookSearchTimer = null;
function renderBookGhost() {
  const q = $('bookSearch').value;
  const letters = (q.match(/^[^0-9:]*/) || [''])[0].replace(/\s+/g, ' ');
  const cands = suggestBook(letters.trim().length ? letters.trim() : (normKey(letters) || ''));
  const ghost = $('bookGhost'), sug = $('quickBookSug');
  if (!cands.length) { ghost.textContent = ''; sug.hidden = true; return; }
  const first = bible.books[cands[0]];
  // faint full-name completion, only while typing a unique pure-letter prefix
  const typingLetters = !/[0-9:]/.test(q);
  const key = normKey(letters.trim());
  ghost.textContent = (typingLetters && cands.length === 1 && key.length >= 1 &&
                       normKey(first.name).startsWith(key)
    ? first.name : '');
  // more than one match → a clickable suggestion row
  sug.hidden = !(typingLetters && key.length >= 1 && cands.length > 1);
  if (!sug.hidden) {
    sug.innerHTML = cands.map(i =>
      `<button data-s="${i}"><span class="quickgo-icon">📖</span>${esc(bible.books[i].name)}</button>`).join('');
  }
}
$('bookSearch').addEventListener('input', () => {
  renderBookChips($('bookSearch').value);
  renderBookGhost();
  clearTimeout(bookSearchTimer);
  bookSearchTimer = setTimeout(() => commitJump($('bookSearch').value), 320);
});
$('bookSearch').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    clearTimeout(bookSearchTimer);
    commitJump($('bookSearch').value);
  } else if (e.key === 'Escape') {
    $('bookSearch').value = '';
    renderBookChips('');
    renderBookGhost();
    $('quickBookSug').hidden = true;
  }
});
$('quickBookSug').addEventListener('click', e => {
  const b = e.target.closest('button[data-s]');
  if (!b) return;
  $('bookSearch').value = bible.books[+b.dataset.s].name + ' ';
  $('quickBookSug').hidden = true;
  renderBookChips($('bookSearch').value);
  renderBookGhost();
  $('bookSearch').focus();
});
document.addEventListener('click', e => {
  if (!e.target.closest('.quickjump')) $('quickBookSug').hidden = true;
});

/* ---------- adjustable panes: drag the gaps, lock when it fits ---------- */
const PANES = {
  books:    { el: () => $('bookChips'),    def: 260 },
  chapters: { el: () => $('chapterChips'), def: 220 },
  verses:   { el: () => $('verseDots'),    def: 320 },
  text:     { el: () => $('liveText'),     def: 260 },
};
function applyPanes() {
  const h = LS.get(K.settings, {}).paneHeights || {};
  for (const [key, p] of Object.entries(PANES)) {
    const el = p.el(); if (!el) continue;
    if (h[key]) { el.style.maxHeight = h[key] + 'px'; el.style.height = h[key] + 'px'; }
  }
}
function initSplitters() {
  for (const [key, p] of Object.entries(PANES)) {
    const el = p.el(); if (!el) continue;
    const sp = document.createElement('div');
    sp.className = 'splitter';
    sp.dataset.key = key;
    sp.title = 'Drag to resize this section';
    el.parentNode.insertBefore(sp, el);
    sp.addEventListener('pointerdown', ev => {
      ev.preventDefault();
      const startH = el.getBoundingClientRect().height;
      const startY = ev.clientY;
      const move = e => {
        const h = Math.max(56, Math.min(window.innerHeight * 0.72, startH + (e.clientY - startY)));
        el.style.maxHeight = h + 'px'; el.style.height = h + 'px';
      };
      const up = () => {
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        const s = LS.get(K.settings, {});
        s.paneHeights = Object.assign({}, s.paneHeights, { [key]: Math.round(el.getBoundingClientRect().height) });
        LS.set(K.settings, s);
      };
      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', up);
    });
  }
}
function refreshLock() {
  const locked = LS.get(K.settings, {}).panesLocked === true;   // movable by default; lock during a service
  document.body.classList.toggle('panes-locked', locked);
  $('feLock').textContent = locked ? '🔒' : '🔓';
  $('feLock').title = locked ? 'Layout locked ✓ — tap to unlock and rearrange the sections'
    : 'Layout unlocked — drag a dock grip to move it, drag the corner to resize, then tap to lock';
}
$('feLock').addEventListener('click', () => {
  const s = LS.get(K.settings, {});
  const cur = s.panesLocked === true;   // effective state (movable by default)
  s.panesLocked = !cur;
  LS.set(K.settings, s);
  refreshLock();
});

/* ---------- docks: free size & position over a 12×12 grid, lock to freeze ---------- */
let dockSizes = LS.get(K.settings, {}).dockSizes || {};
const DOCK_DEFAULTS = {
  /* balanced two-band layout: Books/Chapters/Verses/Memory fill the top band
     (3 cols each), then an equally-scaled band of three 4-col rectangles —
     Quick jump / Whole-Bible search / On-the-projector */
  books: [3, 4], chapters: [3, 4], verses: [3, 4], memory: [3, 4],
  text: [4, 3], quickgo: [4, 3], search: [4, 3],
};
const GRID_ROWS = 10;
const DOCK_LABELS = {
  books: '📚 Books', chapters: '📑 Chapters', verses: '🔖 Verses', text: '🖥️ On the projector',
  memory: '🧠 Memory', quickgo: '⚡ Quick jump', search: '🔎 Whole-Bible search',
};
function hiddenDocks() { return LS.get(K.settings, {}).hiddenDocks || []; }
/* fit-to-view: every dock gets its own content-sized track; when the whole
   skyline is taller than the deck, everything scales down proportionally —
   all docks fully visible on one view, no page and no internal scrolling */
const DOCK_GAP = 12;
function packPx(items) {   // items {d,w,h}; returns placed {it,y,h} + skyline height
  /* deterministic row-band flow in DOM order: docks accumulate into a band
     until the next one no longer fits the 12-col width — every dock in a
     band shares the band top and the band's height (tallest member), so
     same-band docks always come out equally scaled */
  const placed = [];
  let cur = [], width = 0, top = 0;
  for (const it of items) {
    if (cur.length && width + it.w > 12) {
      const h = Math.max(...cur.map(i => i.h));
      cur.forEach(i => placed.push({ it: i, y: top, h }));
      top += h;
      cur = [];
      width = 0;
    }
    cur.push(it);
    width += it.w;
  }
  if (cur.length) {
    const h = Math.max(...cur.map(i => i.h));
    cur.forEach(i => placed.push({ it: i, y: top, h }));
    top += h;
  }
  return { placed, need: top };
}
function naturalDockHeight(d) {
  const head = d.querySelector('.dock-head');
  const cs = getComputedStyle(d);
  const w = d.querySelector(':scope > .dock-fit');
  const bodyH = w ? w.scrollHeight : 0;
  const headH = head ? head.getBoundingClientRect().height + (parseFloat(getComputedStyle(head).marginBottom) || 0) : 0;
  const cap = window.innerHeight - 128;   // no single dock may demand more than roughly the deck
  return Math.min(cap, Math.max(96, headH + bodyH + (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0) + DOCK_GAP));
}function applyDocksToGridTemplate(grid, deckH, isNarrow) {
  grid.style.rowGap = '0px';
  grid.style.columnGap = '12px';
  const docks = [...grid.children].filter(d => d.classList.contains('dock') && d.style.display !== 'none');
  docks.forEach(d => {   // measure from unscaled state
    const w = d.querySelector(':scope > .dock-fit');
    if (w) { w.style.transform = ''; w.style.width = ''; }
  });
  const cols = n => n / 2;   // 2 per row in the narrow 2-column mode
  if (isNarrow) {
    const items = docks.map(d => ({ d, w: 2, h: naturalDockHeight(d) }));
    const rows = [];
    for (let i = 0; i < items.length; i += 2) {
      rows.push({ a: items[i], b: items[i + 1], h: Math.max(items[i].h, items[i + 1] ? items[i + 1].h : 0) });
    }
    let total = rows.reduce((s, r) => s + r.h, 0);
    const minRow2 = r => {
      const head = r.a.d.querySelector('.dock-head');
      const cs = getComputedStyle(r.a.d);
      const headH = head ? head.getBoundingClientRect().height + (parseFloat(getComputedStyle(head).marginBottom) || 0) : 0;
      return headH + (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0) + 46;
    };
    const floors = rows.map(minRow2);
    for (let pass = 0; pass < 6 && total > deckH + 2; pass++) {
      const F = (deckH + 2) / total;
      const heights2 = rows.map((r, i) => Math.max(floors[i], r.h * F));
      rows.forEach((r, i) => { r.h = heights2[i]; });
      total = rows.reduce((s, r) => s + r.h, 0);
    }
    const rh2 = rows.map(r => Math.round(r.h));   // exact fit: shave rounding drift off the biggest row
    let sum2 = rh2.reduce((s, h) => s + h, 0);
    if (sum2 > deckH) {
      const big2 = rh2.indexOf(Math.max(...rh2));
      rh2[big2] -= sum2 - deckH;
    }
    grid.style.gridTemplateRows = rh2.map(h => h + 'px').join(' ');
    rows.forEach((r, i) => {
      r.a.d.style.gridRow = `${i + 1} / ${i + 2}`;
      if (r.b) r.b.d.style.gridRow = `${i + 1} / ${i + 2}`;
    });
  } else {
    let items = docks.map(d => {
      const w = +d.style.gridColumn.replace('span ', '') || 12;
      return { d, w: Math.min(12, Math.max(2, w)), h: naturalDockHeight(d) };
    });
    const pack = packPx(items);
    const placed = pack.placed;
    let need = pack.need;
    // balance: every dock within a row band gets the band's full height (no ragged gaps)
    const bandMax = new Map();
    placed.forEach(p => bandMax.set(p.y, Math.max(bandMax.get(p.y) || 0, p.h)));
    placed.forEach(p => { p.h = bandMax.get(p.y); });
    need = Math.max(...placed.map(p => p.y + p.h));
    // bands become distinct horizontal tracks in place order
    const bands = [...new Set(placed.map(p => p.y))].sort((a, b) => a - b);
    placed.forEach(p => { p.band = bands.indexOf(p.y); });
    const minRow = p => {   // head + paddings + a hint of content must always survive
      const head = p.it.d.querySelector('.dock-head');
      const cs = getComputedStyle(p.it.d);
      const headH = head ? head.getBoundingClientRect().height + (parseFloat(getComputedStyle(head).marginBottom) || 0) : 0;
      return headH + (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0) + 46;
    };
    let bandH = bands.map(y => Math.max(...placed.filter(p => p.y === y).map(p => p.h)));
    if (need > deckH + 1) {   // whole skyline scaled down proportionally, mins preserved
      for (let pass = 0; pass < 6; pass++) {
        const F = need > deckH + 2 ? (deckH + 2) / need : 1;
        bandH = bandH.map((h, i) => Math.max(minRow(placed.find(p => p.y === bands[i])), h * F));
        need = bandH.reduce((s, h) => s + h, 0);
      }
    }
    const rh = bandH.map(h => Math.round(h));   // exact fit: shave rounding drift off the biggest band
    let sumR = rh.reduce((s, h) => s + h, 0);
    if (sumR > deckH) {
      const big = rh.indexOf(Math.max(...rh));
      rh[big] -= sumR - deckH;
    }
    grid.style.gridTemplateRows = rh.map(h => h + 'px').join(' ') || 'none';
    grid.style.rowGap = '0px';
    grid.style.columnGap = '12px';
    placed.forEach(p => {
      p.it.d.style.gridRow = `${p.band + 1} / ${p.band + 2}`;
    });
  }
}
function applyDocks() {
  const grid = document.querySelector('.docks');
  if (!grid) return;
  (LS.get(K.settings, {}).dockOrder || []).forEach(key => {
    const el = grid.querySelector(`.dock[data-dock="${key}"]`);
    if (el) grid.appendChild(el);
  });
  const hidden = hiddenDocks().filter(k => k !== 'text');   // the projector dock is always visible
  document.querySelectorAll('.docks .dock').forEach(d => {
    const key = d.dataset.dock;
    if (hidden.includes(key)) { d.style.display = 'none'; return; }
    d.style.display = '';
    const s = dockSizes[key] || DOCK_DEFAULTS[key] || [4, 5];
    d.style.gridColumn = `span ${Math.min(12, Math.max(2, s[0]))}`;   // rows come from the track engine
  });
  scheduleDockFit();
}
/* one scheduled pass = px row tracks per dock + interior scale fit */
let dockFitTimer = null;
let dockLayoutLive = false;   // during drags/resizes the engine holds still (stability)
function scheduleDockFit() {
  if (dockLayoutLive) return;
  if (dockFitTimer) return;
  dockFitTimer = setTimeout(() => {
    dockFitTimer = null;
    const grid = document.querySelector('.docks');
    if (!grid) return;
    if (window.innerWidth <= 640) {   // phones: back to the simple fluid layout
      grid.style.gridTemplateRows = '';
      grid.style.rowGap = '';
      grid.style.columnGap = '';
    } else {
      applyDocksToGridTemplate(grid, grid.clientHeight, window.innerWidth <= 1100);
    }
    fitDockContents();
  }, 40);
}
/* scale each dock's INTERIOR so the whole content stays visible inside its
   slice — no internal scrolling (the dock head keeps its normal size) */
function fitDockContents() {
  document.querySelectorAll('.docks .dock').forEach(d => {
    const w = d.querySelector(':scope > .dock-fit');
    if (!w || d.style.display === 'none') return;
    const head = d.querySelector('.dock-head');
    if (!head) return;
    if(d.dataset.dock === 'text'){w.style.transform='';w.style.width='';w.style.overflow='auto';return;}
    w.style.transform = '';
    w.style.width = '';
    const cs = getComputedStyle(d);
    const dR = d.getBoundingClientRect();
    const wR = w.getBoundingClientRect();
    const avail = dR.bottom - wR.top - (parseFloat(cs.paddingBottom) || 0);
    if (avail <= 4) return;
    let s = 1;
    for (let i = 0; i < 3; i++) {   // correction loop: adjust until the VISUAL result fits
      const vis = w.getBoundingClientRect().height;
      if (vis <= avail + 1) break;
      s = Math.max(0.2, Math.min(1, s * (avail / vis)));
      w.style.width = (100 / s) + '%';
      w.style.transform = `scale(${s})`;
    }
    if (w.getBoundingClientRect().height > avail + 1) {
      // one last visual correction, then leave it (off by a hair imperceptibly)
      const vis = w.getBoundingClientRect().height;
      s = Math.max(0.2, Math.min(1, s * (avail / vis)));
      w.style.width = (100 / s) + '%';
      w.style.transform = `scale(${s})`;
    }
  });
}
function initDockFit() {
  document.querySelectorAll('.docks .dock').forEach(d => {
    if (d.querySelector(':scope > .dock-fit')) return;
    const wrap = document.createElement('div');
    wrap.className = 'dock-fit';
    [...d.children].forEach(ch => {
      if (!ch.classList.contains('dock-head') && !ch.classList.contains('rs-corner')) wrap.appendChild(ch);
    });
    d.appendChild(wrap);
  });
  if (window.ResizeObserver) {
    const grid = document.querySelector('.docks');
    if (grid) {
      const ro = new ResizeObserver(() => scheduleDockFit());
      ro.observe(grid);
      grid.querySelectorAll('.dock').forEach(d => {
        ro.observe(d);
        const w = d.querySelector(':scope > .dock-fit');
        if (w) ro.observe(w);   // content-growth or A+/A− resizes the wrap itself
      });
    }
  }
  if (window.MutationObserver) {
    const grid = document.querySelector('.docks');
    if (grid) new MutationObserver(() => scheduleDockFit()).observe(grid, { childList: true, subtree: true });   // content swaps (book/chapter loads); our own style writes don't re-fire (attrs not observed)
  }
}
/* 🧩 Docks menu — pick which docks you want visible right now
   ("On the projector" is a functional dock and is always visible) */
function renderDockMenu() {
  const menu = $('dockMenu');
  const hidden = hiddenDocks();
  const fp = lsShowFloatPreview();
  const fn = lsShowFloatNav();
  const items = Object.keys(DOCK_LABELS).filter(k => k !== 'text').map(key =>
    `<button data-dockkey="${key}" class="dockmenu-item${hidden.includes(key) ? '' : ' on'}" title="${hidden.includes(key) ? 'Hidden — tap to show' : 'Visible — tap to hide'}">${hidden.includes(key) ? '◻' : '✓'} ${DOCK_LABELS[key]}</button>`).join('');
  menu.innerHTML = '<div class="more-group">Docks on screen</div>' + items +
    '<div class="dockmenu-item static">🔒 On the projector — always visible</div>' +
    `<button data-dockkey="__fnav" class="dockmenu-item${fn ? ' on' : ''}">${fn ? '✓' : '◻'} 🧭 Slide switcher (floating)</button>` +
    `<button data-dockkey="__float" class="dockmenu-item${fp ? ' on' : ''}">${fp ? '✓' : '◻'} 🖥️ Floating display mirror</button>` +
   '<button data-dockkey="__all" class="dockmenu-item"><b>Show all</b></button>' +
   '<button data-dockkey="__reset" class="dockmenu-item"><b>Reset layout</b></button>' +
   '<button data-dockkey="__cache" class="dockmenu-item"><b>🧹 Clear offline cache & reload</b></button>';
}
function lsShowFloatNav() { return LS.get(K.settings, {}).showFloatNav !== false; }
function applyFloatNav() {
  const nav = document.querySelector('.float-nav');
  if (nav) nav.hidden = !lsShowFloatNav();
}
function lsShowFloatPreview() { return LS.get(K.settings, {}).showFloatPreview === true; }
function toggleDockMenu(e) {
  e.stopPropagation();
  renderDockMenu();
  const menu = $('dockMenu');
  menu.hidden = !menu.hidden;
}
$('feDocks').addEventListener('click', toggleDockMenu);
$('btnDocks').addEventListener('click', toggleDockMenu);
$('dockMenu').addEventListener('click', e => {
  const b = e.target.closest('button[data-dockkey]');
  if (!b) return;
  const key = b.dataset.dockkey;
  $('dockMenu').hidden = true;   // always close immediately, then perform the action
  const s = LS.get(K.settings, {});
  if (key === '__fnav') {
    s.showFloatNav = !lsShowFloatNav();
    LS.set(K.settings, s);
    applyFloatNav();
    flash($('feDocks'), s.showFloatNav ? 'Switcher ON ✓' : 'Switcher off ✓');
    return;
  }
  if (key === '__float') {
    s.showFloatPreview = !lsShowFloatPreview();
    LS.set(K.settings, s);
    applyFloatPreview();
    flash($('feDocks'), s.showFloatPreview ? 'Mirror ON ✓' : 'Mirror off ✓');
    return;
  }
  if (key === '__reset') {
    delete s.dockOrder; delete s.dockSizes; delete s.hiddenDocks;
    LS.set(K.settings, s);
    dockSizes = {};
    applyDocks();
    refreshLock();
    flash($('feDocks'), 'Default layout ✓');
    return;
  }
  if (key === '__cache') {
    flash($('feDocks'), 'Clearing cache…');
    (async () => {
      try { if (window.caches) for (const n of await caches.keys()) await caches.delete(n); } catch (_) {}
      try { if (navigator.serviceWorker) for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister(); } catch (_) {}
      location.reload();
    })();
    return;
  }
  if (key === '__all') s.hiddenDocks = [];
  else {
    const h = new Set(hiddenDocks());
    if (h.has(key)) { h.delete(key); flash(b, 'Now on screen'); }
    else if (document.querySelectorAll('.docks .dock').length - h.size > 1) h.add(key); else { flash(b, 'Keep at least one'); }
    s.hiddenDocks = [...h];
  }
  LS.set(K.settings, s);
  applyDocks();
  renderDockMenu();
});
function saveDocks() {
  const s = LS.get(K.settings, {});
  s.dockOrder = [...document.querySelectorAll('.docks .dock')].map(d => d.dataset.dock);
  s.dockSizes = dockSizes;
  LS.set(K.settings, s);
}
/* span button = quick double / halve width; the corner handle does free sizing */
document.querySelectorAll('.docks .dock .span-btn').forEach(b =>
  b.addEventListener('click', () => {
    const dock = b.closest('.dock');
    const key = dock.dataset.dock;
    const def = dockSizes[key] || DOCK_DEFAULTS[key] || [4, 5];
    const cur = +dock.style.gridColumn.replace('span ', '') || def[0];
    dockSizes[key] = cur < def[0] * 1.5 ? [Math.min(12, def[0] * 2), def[1]] : [def[0], def[1]];
    dock.style.gridColumn = `span ${dockSizes[key][0]}`;
    saveDocks();
    refreshLock();
  }));
function initDockDrag() {
  const grid = document.querySelector('.docks');
  document.querySelectorAll('.docks .dock').forEach(dock => {
    const head = dock.querySelector('.dock-head');
    /* drag by the grip to reposition */
    head.addEventListener('pointerdown', e => {
      // drags only from the grip text area; buttons and pick-mode stay clickable
      if (e.target.closest('button, .seg') || !e.target.closest('.grip')) return;
      if (LS.get(K.settings, {}).panesLocked) return;
      e.preventDefault();
      dock.classList.add('dragging');
      dockLayoutLive = true;   // engine holds still while repositioning (no shake)
      const move = ev => {
        const target = [...grid.querySelectorAll('.dock:not(.dragging)')].find(other => {
          const r = other.getBoundingClientRect();
          return ev.clientX >= r.left - 16 && ev.clientX <= r.right + 16 &&
                 ev.clientY >= r.top - 18 && ev.clientY <= r.bottom + 18;
        });
        if (!target) return;
        const r = target.getBoundingClientRect();
        grid.insertBefore(dock, ev.clientX < r.left + r.width / 2 ? target : target.nextSibling);
      };
      const up = () => {
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        dock.classList.remove('dragging');
        dockLayoutLive = false;
        saveDocks();
        scheduleDockFit();   // one clean recompute at the end
      };
      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', up);
    });
    /* drag the corner to resize freely (grid-unit snapping) */
    const rs = document.createElement('div');
    rs.className = 'rs-corner';
    rs.title = 'Drag to resize this dock freely';
    dock.appendChild(rs);
    rs.addEventListener('pointerdown', e => {
      if (LS.get(K.settings, {}).panesLocked) return;
      e.preventDefault();
      e.stopPropagation();
      const g = grid.getBoundingClientRect();
      const gap = parseFloat(getComputedStyle(grid).columnGap) || 12;
      const unitW = (g.width + gap) / 12;
      const unitH = (g.height + gap) / GRID_ROWS;
      const startX = e.clientX, startY = e.clientY;
      const key = dock.dataset.dock;
      const s0 = dockSizes[key] || DOCK_DEFAULTS[key] || [4, 5];
      dock.classList.add('resizing');
      dockLayoutLive = true;   // rows recompute once at the end — no shake mid-drag
      const move = ev => {
        const cols = Math.min(12, Math.max(2, Math.round(s0[0] + (ev.clientX - startX) / unitW)));
        dock.style.gridColumn = `span ${cols}`;
        dockSizes[key] = [cols, s0[1]];
      };
      const up = () => {
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        dock.classList.remove('resizing');
        dockLayoutLive = false;
        saveDocks();
        scheduleDockFit();   // one clean recompute at the end
      };
      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', up);
    });
  });
}

/* ---------- full-text Bible search (find verses by remembered words/phrase) ---------- */
let searchTimer = null;
function searchBible(q, limit = 60) {
  const raw = q.trim();
  if (!raw || !searchIndex.length) return [];
  // quoted text = strict phrase; otherwise every word must appear (order-free)
  const phrase = /^".*"$/s.test(raw);
  const searchable = phrase ? raw.slice(1, -1).toLowerCase() : raw.toLowerCase();
  const words = phrase ? [searchable] : searchable.split(/\s+/).filter(Boolean);
  const out = [];
  for (let i = 0; i < searchIndex.length; i++) {
    const it = searchIndex[i];
    if (words.every(w => it.s.includes(w))) {
      out.push(it);
      if (out.length >= limit) break;
    }
  }
  return out;
}
function searchSelect(bi, ci, vi) {
  // sync the main picker with a search hit, then show the verse in context
  $('bookSelect').value = bi;
  fillChapters();
  $('chapterSelect').value = ci + 1;
  fillVerses();
  $('verseFrom').value = vi + 1;
  $('verseTo').value = vi + 1;
  renderVerseDots();
}
function renderBibleSearch() {
  const q = $('bibleSearch').value;
  const box = $('bibleResults');
  if (!q.trim()) { box.hidden = true; box.innerHTML = ''; return; }
  const hits = searchBible(q, 60);
  box.innerHTML = hits.length
    ? hits.map(h => {
        const book = bible.books[h.bi];
        const verse = stripStrongs(book.chapters[h.ci][h.vi]);
        return `<div class="search-item" data-bi="${h.bi}" data-ci="${h.ci}" data-vi="${h.vi}">
          <span class="search-ref">${esc(book.name)} ${h.ci + 1}:${h.vi + 1}</span>
          <span class="search-text">${esc(verse)}</span>
          <button class="primary" data-go="1">▶ Go</button>
        </div>`;
      }).join('') + (hits.length === 60 ? '<div class="search-none">Showing the first 60 matches — add a word to narrow it.</div>' : '')
    : `<div class="search-none">No verses match “${esc(q)}” in ${bible.translation}. Try fewer or different words.</div>`;
  box.hidden = false;
}
$('bibleSearch').addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(renderBibleSearch, 250);
});
$('bibleSearch').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const hits = searchBible($('bibleSearch').value, 1);
    if (hits.length) {
      searchSelect(hits[0].bi, hits[0].ci, hits[0].vi);
      goLiveScripture({ bookIdx: hits[0].bi, ch: hits[0].ci + 1, vFrom: hits[0].vi + 1, vTo: hits[0].vi + 1 });
      $('bibleResults').hidden = true;
    }
  } else if (e.key === 'Escape') {
    $('bibleResults').hidden = true;
  }
});

/* speak straight into the Bible search bar */
$('btnVoiceSearch').addEventListener('click', () => {
  if (!SR) { alert('Voice input needs Chrome or Edge (Web Speech API), online.'); return; }
  const btn = $('btnVoiceSearch');
  try {
    const r1 = new SR();
    r1.lang = navigator.language || 'en-US';
    r1.interimResults = false;
    r1.maxAlternatives = 1;
    btn.classList.add('active');
    flash(btn, 'Listening…');
    r1.onresult = e => {
      const text = e.results[0][0].transcript.trim();
      $('bibleSearch').value = text;
      renderBibleSearch();
      flash(btn, 'Heard ✓');
    };
    r1.onerror = () => flash(btn, 'Mic error');
    r1.onend = () => btn.classList.remove('active');
    r1.start();
  } catch (err) { flash(btn, 'Mic failed'); }
});
/* speak straight into the Quick jump bar — "John three sixteen" jumps live */
$('btnVoiceJump').addEventListener('click', () => {
  if (!SR) { alert('Voice input needs Chrome or Edge (Web Speech API), online.'); return; }
  const btn = $('btnVoiceJump');
  try {
    const r1 = new SR();
    r1.lang = navigator.language || 'en-US';
    r1.interimResults = false;
    r1.maxAlternatives = 1;
    btn.classList.add('active');
    flash(btn, '…');
    r1.onresult = e => {
      const text = e.results[0][0].transcript.trim().toLowerCase()
        .replace(/^(read|go(?:\s+to)?|show|open|find|turn to)\s+/, '');
      const words = text.split(/\s+/).filter(w =>
        w !== 'and' && w !== 'chapter' && w !== 'verse' && w !== 'verses' && w !== 'please');
      $('bookSearch').value = numberize(words).join(' ');
      commitJump($('bookSearch').value);
      renderBookChips($('bookSearch').value);
      renderBookGhost();
      flash(btn, 'Heard ✓');
    };
    r1.onerror = () => flash(btn, 'Mic error');
    r1.onend = () => btn.classList.remove('active');
    r1.start();
  } catch (err) { flash(btn, 'Mic failed'); }
});
$('bibleResults').addEventListener('click', e => {
  const row = e.target.closest('.search-item');
  if (!row) return;
  const bi = +row.dataset.bi, ci = +row.dataset.ci, vi = +row.dataset.vi;
  // tap = live now (the chapter list opens underneath for context tweaks)
  searchSelect(bi, ci, vi);
  goLiveScripture({ bookIdx: bi, ch: ci + 1, vFrom: vi + 1, vTo: vi + 1 });
  $('bibleResults').hidden = true;
});
$('btnAddScripture').addEventListener('click', () => {
  if (!bible) return;
  const r = currentScriptureRange();
  const book = bible.books[r.bookIdx];
  service.push({
    id: uid(), type: 'scripture',
    title: `${book.name} ${r.ch}:${r.vFrom}${r.vTo > r.vFrom ? '-' + r.vTo : ''}`,
    slides: scriptureToSlides(bible.books, r.bookIdx, r.ch, r.vFrom, r.vTo),
  });
  LS.set(K.service, service);
  flash($('btnAddScripture'), 'Added ✓');
});

/* =========================================================
   SONGS
========================================================= */
function renderSongList() {
  const q = $('songSearch').value.trim().toLowerCase();
  const list = songs.filter(s =>
    !q || s.title.toLowerCase().includes(q) || (s.author || '').toLowerCase().includes(q));
  $('songList').innerHTML = list.map(s => `
    <li data-id="${esc(s.id)}">
      <span class="item-title">${esc(s.title)} <span class="item-meta">${esc(s.author || '')}</span></span>
      <button data-act="live">▶ Live</button>
      <button data-act="add">+ Service</button>
      <button data-act="edit">Edit</button>
      <button data-act="del" class="danger">✕</button>
    </li>`).join('') || '<li><span class="item-meta">No songs yet — tap “+ New Song”.</span></li>';
}
$('songList').addEventListener('click', e => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const id = btn.closest('li').dataset.id;
  const song = songs.find(s => s.id === id);
  const act = btn.dataset.act;
  if (act === 'live') {
    pushLive({ mode: 'normal', slides: songToSlides(song), index: 0, title: song.title, themeId: currentThemeId });
  } else if (act === 'add') {
    service.push({ id: uid(), type: 'song', title: song.title, slides: songToSlides(song) });
    LS.set(K.service, service);
    flash(btn, 'Added ✓');
  } else if (act === 'edit') {
    openSongEditor(song);
  } else if (act === 'del') {
    if (confirm(`Delete song “${song.title}”?`)) {
      songs = songs.filter(s => s.id !== id);
      LS.set(K.songs, songs);
      renderSongList();
    }
  }
});
function openSongEditor(song) {
  editingSongId = song ? song.id : null;
  $('songEditorTitle').textContent = song ? 'Edit Song' : 'New Song';
  $('songTitle').value = song ? song.title : '';
  $('songAuthor').value = song ? (song.author || '') : '';
  $('songLyrics').value = song ? song.lyrics : '';
  $('songEditor').hidden = false;
  updateSongSlidesPreview();
  $('songEditor').scrollIntoView({ behavior: 'smooth' });
}
$('btnNewSong').addEventListener('click', () => openSongEditor(null));
$('btnCancelSong').addEventListener('click', () => { $('songEditor').hidden = true; });
$('songLyrics').addEventListener('input', updateSongSlidesPreview);
function updateSongSlidesPreview() {
  const song = { title: $('songTitle').value || 'Untitled', lyrics: $('songLyrics').value };
  const slides = songToSlides(song);
  $('songSlidesPreview').textContent = slides.length
    ? slides.map((s, i) => `Slide ${i + 1} [${s.label}]\n${s.text}`).join('\n\n———\n\n')
    : 'Slides preview…';
}
$('btnSaveSong').addEventListener('click', () => {
  const title = $('songTitle').value.trim();
  if (!title) { alert('Please enter a title.'); return; }
  const song = { id: editingSongId || uid(), title, author: $('songAuthor').value.trim(), lyrics: $('songLyrics').value };
  if (editingSongId) songs = songs.map(s => s.id === editingSongId ? song : s);
  else songs.push(song);
  LS.set(K.songs, songs);
  $('songEditor').hidden = true;
  renderSongList();
});
$('btnLiveSong').addEventListener('click', () => {
  const song = { title: $('songTitle').value || 'Untitled', lyrics: $('songLyrics').value };
  pushLive({ mode: 'normal', slides: songToSlides(song), index: 0, title: song.title, themeId: currentThemeId });
});
$('songSearch').addEventListener('input', renderSongList);

/* ---------- web lyrics import ---------- */
function cleanFetchedText(md) {
  return md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')          // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')       // links -> text
    .replace(/^#{1,6}\s*/gm, '')                    // markdown headings
    .replace(/^>\s?/gm, '')                         // blockquotes
    .replace(/[*_`]{1,3}/g, '')                     // emphasis marks
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
$('btnFetchWeb').addEventListener('click', async () => {
  const url = $('webUrl').value.trim();
  const status = $('webImportStatus');
  if (!url) { status.textContent = 'Paste a URL first.'; return; }
  status.textContent = 'Fetching…';
  try {
    const res = await fetch('https://r.jina.ai/' + url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = cleanFetchedText(await res.text());
    if (!text) throw new Error('empty page');
    openSongEditor(null);
    if (!$('songTitle').value) {
      const m = text.split('\n').find(l => l.trim().length > 2);
      if (m) $('songTitle').value = m.trim().slice(0, 60);
    }
    $('songLyrics').value = text;
    updateSongSlidesPreview();
    status.textContent = 'Fetched ✓ — review the text, fix the title, then Save Song. It is now stored locally.';
    $('songEditor').scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    status.textContent = 'Could not fetch that page (' + err.message + '). Open the page, copy the lyrics, and paste them into a New Song instead.';
  }
});

/* =========================================================
   SERVICE PLAN
========================================================= */
function renderService() {
  $('serviceList').innerHTML = service.map((item, i) => `
    <li data-id="${esc(item.id)}">
      <span class="item-meta">${i + 1}</span>
      <span class="item-title">${esc(item.title)} <span class="item-meta">(${item.slides.length} slide${item.slides.length === 1 ? '' : 's'})</span></span>
      <button data-act="live">▶</button>
      <button data-act="up">▲</button>
      <button data-act="down">▼</button>
      <button data-act="del" class="danger">✕</button>
    </li>`).join('') || '<li><span class="item-meta">Service is empty — add scriptures and songs.</span></li>';
}
$('serviceList').addEventListener('click', e => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const id = btn.closest('li').dataset.id;
  const i = service.findIndex(s => s.id === id);
  const act = btn.dataset.act;
  if (act === 'live') {
    pushLive({ mode: 'normal', slides: service[i].slides, index: 0, title: service[i].title, themeId: currentThemeId });
  } else if (act === 'up' && i > 0) {
    [service[i - 1], service[i]] = [service[i], service[i - 1]];
  } else if (act === 'down' && i < service.length - 1) {
    [service[i + 1], service[i]] = [service[i], service[i + 1]];
  } else if (act === 'del') {
    service.splice(i, 1);
  } else return;
  LS.set(K.service, service);
  renderService();
});
$('btnLiveService').addEventListener('click', () => {
  if (!service.length) { alert('Service is empty.'); return; }
  pushLive({ mode: 'normal', slides: service.flatMap(i => i.slides), index: 0, title: 'Service', themeId: currentThemeId });
});
$('btnClearService').addEventListener('click', () => {
  if (confirm('Clear the whole service plan?')) { service = []; LS.set(K.service, service); renderService(); }
});

/* Named plans */
function renderPlans() {
  const plans = LS.get(K.plans, {});
  $('planSelect').innerHTML = Object.keys(plans).map(n => `<option>${esc(n)}</option>`).join('');
}
$('btnSavePlan').addEventListener('click', () => {
  const name = $('planName').value.trim();
  if (!name) { alert('Enter a plan name first.'); return; }
  const plans = LS.get(K.plans, {});
  plans[name] = service;
  LS.set(K.plans, plans);
  renderPlans();
  $('planSelect').value = name;
  flash($('btnSavePlan'), 'Saved ✓');
});
$('btnLoadPlan').addEventListener('click', () => {
  const name = $('planSelect').value;
  if (!name) return;
  const plans = LS.get(K.plans, {});
  service = plans[name] || [];
  LS.set(K.service, service);
  renderService();
});
$('btnDeletePlan').addEventListener('click', () => {
  const name = $('planSelect').value;
  if (!name) return;
  if (!confirm(`Delete plan “${name}”?`)) return;
  const plans = LS.get(K.plans, {});
  delete plans[name];
  LS.set(K.plans, plans);
  renderPlans();
});

/* =========================================================
   THEMES
========================================================= */
function themeById(id) { return themes.find(t => t.id === id) || themes[0]; }
function renderThemesTab() {
  $('themeSelect').innerHTML = themes.map(t => `<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('');
  $('themeSelect').value = currentThemeId;
  loadThemeForm();
}
function loadThemeForm() {
  const t = themeById($('themeSelect').value);
  $('themeName').value = t.name;
  $('themeTextColor').value = t.textColor;
  $('themeFontSize').value = t.fontSize;
  $('themeFont').value = t.font;
  $('themeAlign').value = t.align || 'center';
  $('themeWeight').value = t.weight || '400';
  const opt = [...$('themeBg').options].find(o => o.value === t.bg);
  $('themeBg').value = opt ? t.bg : ((t.bgImage || t.bgImageId) ? 'image' : $('themeBg').options[0].value);
}
$('themeSelect').addEventListener('change', loadThemeForm);
$('themeBgImage').addEventListener('change', () => {
  const file = $('themeBgImage').files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    const t = themeById($('themeSelect').value);
    const stored = await storeImage(reader.result, 'bg');
    if (typeof stored === 'string') { t.bgImage = stored; delete t.bgImageId; }
    else { t.bgImageId = stored.id; t.bgImage = ''; }
    themeSave();
    flash($('themeBgImage'), 'Image loaded ✓');
  };
  reader.readAsDataURL(file);
});
$('btnNewTheme').addEventListener('click', () => {
  const t = { id: uid(), name: 'New Theme', bg: 'linear-gradient(135deg,#0f2027,#203a43,#2c5364)',
              bgImage: '', textColor: '#ffffff', font: DEFAULT_FONT, fontSize: 7, align: 'center', weight: '700' };
  themes.push(t);
  LS.set(K.themes, themes);
  currentThemeId = t.id;
  renderThemesTab();
});
$('btnDeleteTheme').addEventListener('click', () => {
  if (themes.length <= 1) { alert('Keep at least one theme.'); return; }
  themes = themes.filter(t => t.id !== $('themeSelect').value);
  currentThemeId = themes[0].id;
  LS.set(K.themes, themes);
  LS.set(K.settings, Object.assign(LS.get(K.settings, {}), { currentThemeId }));
  renderThemesTab();
});
$('btnSaveTheme').addEventListener('click', () => {
  const t = themeById($('themeSelect').value);
  t.name = $('themeName').value.trim() || t.name;
  t.textColor = $('themeTextColor').value;
  t.fontSize = +$('themeFontSize').value || 7;
  t.font = $('themeFont').value;
  t.align = $('themeAlign').value;
  t.weight = $('themeWeight').value;
  const bgVal = $('themeBg').value;
  if (bgVal === 'image') { if (!t.bgImage && !t.bgImageId) { alert('Pick a custom image file first.'); return; } }
  else { t.bg = bgVal; t.bgImage = ''; delete t.bgImageId; }
  LS.set(K.themes, themes);
  flash($('btnSaveTheme'), 'Saved ✓');
});
$('btnApplyTheme').addEventListener('click', () => {
  currentThemeId = $('themeSelect').value;
  LS.set(K.settings, Object.assign(LS.get(K.settings, {}), { currentThemeId }));
  pushLive({ themeId: currentThemeId });
  flash($('btnApplyTheme'), 'Applied ✓');
});
$('btnResetThemes').addEventListener('click', () => {
  if (!confirm('Restore the four default themes (Black, Sunset, Deep Blue, Emerald)? Custom themes will be replaced.')) return;
  themes = DEFAULT_THEMES.map(t => Object.assign({}, t));
  currentThemeId = 't1';
  LS.set(K.themes, themes);
  LS.set(K.settings, Object.assign(LS.get(K.settings, {}), { currentThemeId }));
  renderThemesTab();
  pushLive({ themeId: currentThemeId });
  flash($('btnResetThemes'), 'Reset ✓');
});

/* =========================================================
   QUICK GO — fastest path from thought to projector
========================================================= */
const BOOK_ABBR = {
  gen:'genesis', ex:'exodus', exod:'exodus', lev:'leviticus', lv:'leviticus', num:'numbers', nm:'numbers',
  deut:'deuteronomy', dt:'deuteronomy', josh:'joshua', judg:'judges', jg:'judges',
  ru:'ruth', rut:'ruth', '1sa':'1 samuel','2sa':'2 samuel','1sam':'1 samuel','2sam':'2 samuel',
  '1k':'1 kings','2k':'2 kings','1ki':'1 kings','2ki':'2 kings','1ch':'1 chronicles','2ch':'2 chronicles',
  ezr:'ezra', neh:'nehemiah', est:'esther', job:'job',
  ps:'psalms', psa:'psalms', psalm:'psalms', psalms:'psalms', pr:'proverbs', prov:'proverbs',
  ecc:'ecclesiastes', eccl:'ecclesiastes', sos:'song of solomon', song:'song of solomon',
  isa:'isaiah', is:'isaiah', jer:'jeremiah', lam:'lamentations', ezek:'ezekiel', eze:'ezekiel',
  dan:'daniel', hos:'hosea', joel:'joel', amos:'amos', am:'amos', oba:'obadiah', jon:'jonah',
  mic:'micah', nah:'nahum', hab:'habakkuk', zep:'zephaniah', hag:'haggai', zec:'zechariah', mal:'malachi',
  matt:'matthew', mt:'matthew', mk:'mark', mrk:'mark', lk:'luke', luk:'luke', jn:'john', john:'john',
  act:'acts', acts:'acts', rom:'romans', ro:'romans',
  '1co':'1 corinthians','2co':'2 corinthians','1cor':'1 corinthians','2cor':'2 corinthians',
  gal:'galatians', eph:'ephesians', php:'philippians', phil:'philippians', col:'colossians',
  '1th':'1 thessalonians','2th':'2 thessalonians','1ti':'1 timothy','2ti':'2 timothy',
  tit:'titus', phm:'philemon', heb:'hebrews', jas:'james', james:'james',
  '1pe':'1 peter','2pe':'2 peter','1pt':'1 peter','2pt':'2 peter',
  '1jn':'1 john','2jn':'2 john','3jn':'3 john', jud:'jude', jude:'jude', rev:'revelation', rv:'revelation',
};
function normKey(s) { return s.toLowerCase().replace(/[.\s]/g, ''); }

function parseQuickRef(q) {
  const m = q.trim().toLowerCase().match(/^([1-3]?\s?[a-z.\s]+?)\s*(\d+)?\s*(?:[:.\s]\s*(\d+))?(?:\s*-\s*(\d+))?$/);
  if (!m) return null;
  const key = normKey(m[1]);
  let bookIdx = bible ? bible.books.findIndex(b => normKey(b.name) === key) : -1;
  if (bookIdx < 0 && BOOK_ABBR[key]) bookIdx = bible ? bible.books.findIndex(b => normKey(b.name) === normKey(BOOK_ABBR[key])) : -1;
  if (bookIdx < 0 && bible) {
    const candidates = bible.books.map((b, i) => ({ i, n: normKey(b.name) }))
      .filter(b => b.n.startsWith(key) && key.length >= 2);
    if (candidates.length === 1) bookIdx = candidates[0].i;
  }
  if (bookIdx < 0) return null;
  const ch = m[2] ? +m[2] : 1;
  const vFrom = m[3] ? +m[3] : 1;
  const vTo = m[4] ? +m[4] : vFrom;
  const ref = { bookIdx, ch, vFrom: Math.min(vFrom, vTo), vTo: Math.max(vFrom, vTo) };
  return validScriptureRef(ref) ? ref : null;
}
function validScriptureRef(r) {
  if (!bible || !r || ![r.bookIdx, r.ch, r.vFrom, r.vTo].every(Number.isInteger)) return false;
  const chapter = bible.books[r.bookIdx]?.chapters[r.ch - 1];
  return !!chapter && r.vFrom >= 1 && r.vTo >= r.vFrom && r.vTo <= chapter.length;
}
function translationName(file) {
  const option=[...$('translationSelect').options].find(o=>o.value===file);
  return option?.text?.split(' — ')[0] || file;
}
function stageScripture(r) {
  if(!bible || !validScriptureRef(r))return false;
  const slides=scriptureToSlides(bible.books,r.bookIdx,r.ch,r.vFrom,r.vTo);
  if(!slides.length){flash($('quickGo'),'Verse absent in this translation');return false;}
  preparedScripture={r:{...r},translation:loadedBibleFile,title:refOf(r)};
  $('preparedTitle').textContent=`PREPARED • ${preparedScripture.title} • ${translationName(loadedBibleFile)} • not live`;
  $('preparedText').textContent=slides.map(slide=>stripStrongs(slide.text)).join('\n\n');
  $('preparedPanel').hidden=false;
  $('comparisonPanel').hidden=true; comparisonToken++;
  return true;
}
function currentLiveReference() {
  if(!live.scripture || !live.slides[live.index])return null;
  const match=/ (\d+):(\d+)$/.exec(live.slides[live.index].label || '');
  return match ? {bookIdx:live.scripture.r.bookIdx,ch:+match[1],vFrom:+match[2],vTo:+match[2]} : {...live.scripture.r};
}
async function navigateScripture(dir) {
  if(!bible || live.mode!=='normal') {
    const r=preparedScripture?.r || currentScriptureRange();
    const target=window.KOGGScripture.adjacent(bible?.books || [],r,dir);
    if(target)stageScripture(target);
    return;
  }
  if(!live.scripture) {
    const target=window.KOGGScripture.adjacent(bible.books,preparedScripture?.r || currentScriptureRange(),dir);
    if(target)stageScripture(target);return;
  }
  const state=live;
  if(live.scripture.translation!==loadedBibleFile) {
    if(!await loadBible(live.scripture.translation) || live!==state)return;
  }
  const index=live.index+dir;
  if(index>=0 && index<live.slides.length) {
    pushLive({index,strongsShowing:false,strongsCard:null,highlight:null});
    pushMemory(currentLiveReference());return;
  }
  // past the edge of the passage: the old mode-aware walker keeps verse/range/chapter
  // semantics intact (window size and whole-chapter steps) and goes live as it walks
  stepVerse(dir);
}
$('btnTakeScripture').addEventListener('click',()=>{if(preparedScripture)prepareSaved(preparedScripture,true);});
$('btnBookmarkScripture').addEventListener('click',()=>{
  if(!preparedScripture)return;
  const entry={...preparedScripture,ref:preparedScripture.title,short:shortRef(preparedScripture.r)};
  bookmarks=window.KOGGScripture.remember(bookmarks,entry,50);
  LS.set('cp_scripture_bookmarks',bookmarks);renderMemory();flash($('btnBookmarkScripture'),'Saved ★');
});
$('btnCompareScripture').addEventListener('click',async()=>{
  if(!preparedScripture)return;
  const token=++comparisonToken, reference={...preparedScripture.r};
  const panel=$('comparisonPanel');panel.hidden=false;panel.textContent='Loading the selected passage…';
  const cards=[];
  for(const [file,name] of [['data/kjv.json','KJV'],['data/bsb.json','BSB'],['data/kjvs.json','KJV Strong’s']]) {
    try {
      let data=bible;
      if(file!==loadedBibleFile){const response=await fetch(file);if(!response.ok)throw new Error('Unavailable offline');data=await response.json();}
      const text=window.KOGGScripture.passage(data,reference);
      cards.push(`<section class="comparison-card"><b>${name}</b><p>${esc(stripStrongs(text || 'Verse absent in this translation'))}</p><button data-prepare-version="${file}">Prepare ${name}</button></section>`);
    } catch { cards.push(`<section class="comparison-card"><b>${name}</b><p>Not downloaded yet. Reconnect and retry.</p></section>`); }
    if(token!==comparisonToken)return;
  }
  panel.innerHTML=cards.join('');
});
$('comparisonPanel').addEventListener('click',async event=>{
  const button=event.target.closest('button[data-prepare-version]');
  if(!button || !preparedScripture)return;
  const r={...preparedScripture.r};
  if(await loadBible(button.dataset.prepareVersion))stageScripture(r);
});
function goLiveScripture(r) {
  if (!validScriptureRef(r)) { flash($('quickGo'), 'Invalid scripture reference'); return false; }
  if (!scriptureToSlides(bible.books, r.bookIdx, r.ch, r.vFrom, r.vTo).length) {
    flash($('quickGo'), 'Verse absent in this translation'); return false;
  }
  const book = bible.books[r.bookIdx];
  const ref = `${book.name} ${r.ch}:${r.vFrom}${r.vTo > r.vFrom ? '-' + r.vTo : ''}`;
  liveRef = r;
  pushLive({ mode: 'normal', slides: scriptureToSlides(bible.books, r.bookIdx, r.ch, r.vFrom, r.vTo), index: 0, title: ref, themeId: currentThemeId, scripture:{r:{...r},translation:loadedBibleFile,versionName:translationName(loadedBibleFile)} });
  renderPreview();
  // keep the scripture tab in sync so the operator sees what's live
  $('bookSelect').value = r.bookIdx;
  fillChapters();
  $('chapterSelect').value = r.ch;
  fillVerses();
  $('verseFrom').value = r.vFrom;
  $('verseTo').value = r.vTo;
  renderVerseDots();
  scrollLiveIntoView();
  pushMemory(r);
  preparedScripture = null; comparisonToken++; $('preparedPanel').hidden = true;
  return true;
}
function quickGoLive(item) {
  if (item.type === 'scripture') {
    goLiveScripture(item.ref);
    // put the scripture deck in the operator's hands right after the jump
    document.querySelector('.tab[data-tab="scripture"]')?.click();
  }
  else if (item.type === 'service') {
    const i = service.findIndex(s => s.id === item.id);
    if (i >= 0) pushLive({ mode: 'normal', slides: service[i].slides, index: 0, title: service[i].title, themeId: currentThemeId });
  }
  else if (item.type === 'plan') {
    const plans = LS.get(K.plans, {});
    service = plans[item.label] || [];
    LS.set(K.service, service);
    renderService();
  }
  else pushLive({ mode: 'normal', slides: songToSlides(item.song), index: 0, title: item.song.title, themeId: currentThemeId });
  $('quickGoResults').hidden = true;
  $('quickGo').value = '';
}
function quickSearch(q) {
  const out = [];
  if (!q.trim()) return out;
  const ref = parseQuickRef(q);
  if (ref && bible) {
    const book = bible.books[ref.bookIdx];
    const r = ref;
    out.push({
      type: 'scripture', icon: '📖',
      label: `${book.name} ${r.ch}:${r.vFrom}${r.vTo > r.vFrom ? '-' + r.vTo : ''}`,
      snippet: stripStrongs(book.chapters[r.ch - 1][r.vFrom - 1] || '').slice(0, 80),
      ref,
    });
  }
  if (!ref && bible && q.trim().length >= 3 && typeof searchBible === 'function') {
    searchBible(q,6).forEach(h => out.push({type:'scripture',icon:'📖',label:`${bible.books[h.bi].name} ${h.ci+1}:${h.vi+1}`,snippet:stripStrongs(bible.books[h.bi].chapters[h.ci][h.vi]).slice(0,110),ref:{bookIdx:h.bi,ch:h.ci+1,vFrom:h.vi+1,vTo:h.vi+1}}));
  }
  const ql = q.trim().toLowerCase();
  songs.filter(s => s.title.toLowerCase().includes(ql))
    .slice(0, 5)
    .forEach(s => out.push({ type: 'song', icon: '🎵', label: s.title, snippet: (s.author || 'song'), song: s }));
  // every deck feeds Quick Go: service plan items …
  service.filter(it => it.title.toLowerCase().includes(ql))
    .slice(0, 4)
    .forEach(it => out.push({ type: 'service', icon: '🧩', label: it.title,
      snippet: `${it.type === 'song' ? 'Song' : 'Scripture'} in the plan — ${it.slides.length} slides`, id: it.id }));
  // … and saved plans
  const plans = LS.get(K.plans, {});
  Object.keys(plans).filter(n => n.toLowerCase().includes(ql))
    .slice(0, 3)
    .forEach(name => out.push({ type: 'plan', icon: '📋', label: name,
      snippet: `Plan — ${(plans[name] || []).length} items, loads to the Service deck`, plan: name }));
  return out.slice(0, 9);
}
function renderQuickResults() {
  const q = $('quickGo').value;
  const items = quickSearch(q);
  const box = $('quickGoResults');
  if (!items.length) { box.hidden = true; return; }
  box.innerHTML = items.map((it, i) => `
    <div class="quickgo-item" data-i="${i}">
      <span class="quickgo-icon">${it.icon}</span>
      <span><b>${esc(it.label)}</b><br><span class="item-meta">${esc(it.snippet || '')}</span></span>
    </div>`).join('');
  box.hidden = false;
  box.dataset.count = items.length;
  box._items = items;
  box._selected = 0;
  box.querySelector('.quickgo-item')?.classList.add('selected');
}
let quickGoTimer = null;
$('quickGo').addEventListener('input', () => {   // debounce: full-Bible search must not run on every keystroke
  clearTimeout(quickGoTimer);
  quickGoTimer = setTimeout(renderQuickResults, 200);
});
$('quickGo').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const box = $('quickGoResults');
    const items = (box._items && !box.hidden) ? box._items : quickSearch($('quickGo').value);
    if (items.length) quickGoLive(items[box._selected || 0]);
  } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    const box=$('quickGoResults'), items=box._items || [];
    if(!items.length)return;
    box._selected=((box._selected || 0)+(e.key==='ArrowDown'?1:-1)+items.length)%items.length;
    box.querySelectorAll('.quickgo-item').forEach((item,i)=>item.classList.toggle('selected',i===box._selected));
    if(items[box._selected].type==='scripture')stageScripture(items[box._selected].ref);
  } else if (e.key === 'Escape') {
    $('quickGoResults').hidden = true;
  }
});
$('quickGoResults').addEventListener('click', e => {
  const item = e.target.closest('.quickgo-item');
  if (!item) return;
  const items = $('quickGoResults')._items || [];
  const chosen = items[+item.dataset.i];
  if (chosen?.type === 'scripture') { $('quickGoResults')._selected=+item.dataset.i;stageScripture(chosen.ref); }
  else if(chosen)quickGoLive(chosen);
});
document.addEventListener('click', e => {
  if (!e.target.closest('.quickgo')) $('quickGoResults').hidden = true;
});

/* =========================================================
   ACCOUNT / CLOUD SYNC
========================================================= */
/* Auto-sync: library changes schedule a push ~15s later (when signed in online).
   Manual Push/Pull remain available in the Account tab. */
let syncTimer = null;
function syncDirty() { return !!LS.get(K.settings, {}).dirtyLibrary; }
function markDirty() {
  const s = LS.get(K.settings, {});
  s.dirtyLibrary = true;
  s.libraryRevision = (s.libraryRevision || 0) + 1;
  LS.set(K.settings, s);
  scheduleSync();
}
function scheduleSync() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(autoSync, 15000);
  refreshSyncBadge();
}
let syncInFlight = false;
let syncError = '';
async function autoSync() {
  if (!cloudEnabled() || !window.KOGGSync?.configured || !window._koggUser || !navigator.onLine || !syncDirty() || syncInFlight) { refreshSyncBadge(); return; }
  syncInFlight = true;
  const revision = LS.get(K.settings, {}).libraryRevision || 0;
  try {
    const data = await window.KOGGSync.push();
    if (await applyCloudLibrary(data, revision)) clearDirty(revision);
    syncError = '';
  } catch (err) {
    syncError = err.message;
    // a cached profile plus an expired session must not keep pretending we are signed in
    if (err.message === 'not-signed-in') {
      window._koggUser = null;
      LS.set('cp_cloud_enabled',false); LS.set('cp_account_profile',null);
      syncError = ''; syncUI(); refreshModeChip();
    }
  }
  finally { syncInFlight = false; refreshSyncBadge(); }
}
function clearDirty(expectedRevision) {
  const s = LS.get(K.settings, {});
  if (expectedRevision !== undefined && (s.libraryRevision || 0) !== expectedRevision) return;
  if (s.dirtyLibrary) { s.dirtyLibrary = false; LS.set(K.settings, s); }
  refreshSyncBadge();
}
function refreshSyncBadge() {
  const badge = $('syncBadge');
  if (!badge) return;
  if (!window._koggUser) { badge.textContent = ''; return; }
  if (syncError) { badge.textContent = 'Sync needs attention: ' + syncError; return; }
  badge.textContent = !syncDirty() ? '✓ Cloud copy is up to date'
    : navigator.onLine ? '• Changes not yet synced — auto-push in a moment (or tap Push)'
    : '• Not synced yet — you are offline; sync resumes when back online (Push works too)';
}

function syncUI() {
  const cfgOk = window.KOGGSync && window.KOGGSync.configured;
  $('authNotConfigured').hidden = !!cfgOk;
  $('authForm').hidden = !cfgOk || !!window._koggUser;
  $('authSignedIn').hidden = !cfgOk || !window._koggUser;
  if (window._koggUser) $('authWho').textContent = `Signed in as ${window._koggUser.email}`;
  refreshSyncBadge();
}
function cloudEnabled() {
  return workMode()!=='local' && !!window.KOGGSync?.configured &&
    (workMode()==='sync' || !!window._koggUser || LS.get('cp_cloud_enabled',false));
}
async function refreshUser() {
  if(workMode()==='local'){window._koggUser=null;syncUI();refreshModeChip();return;}
  if(!navigator.onLine){window._koggUser=LS.get('cp_account_profile',null);syncUI();refreshModeChip();return;}
  if(!cloudEnabled()){syncUI();refreshModeChip();return;}
  try {
    window._koggUser=await window.KOGGSync.currentUser();
    if(window._koggUser){
      LS.set('cp_cloud_enabled',true);
      LS.set('cp_account_profile',{id:window._koggUser.id,email:window._koggUser.email});
      startAuthObserver();syncError='';
    } else {LS.set('cp_cloud_enabled',false);LS.set('cp_account_profile',null);}
  } catch(err){window._koggUser=LS.get('cp_account_profile',null);syncError='Using local copy — '+err.message;}
  syncUI();refreshModeChip();
  if(window._koggUser && navigator.onLine && !syncError){
    await pullCloud(true);
    if(syncDirty())scheduleSync();
  }
}
$('btnShowPass').addEventListener('click', () => {
  const p = $('authPassword');
  p.type = p.type === 'password' ? 'text' : 'password';
  $('btnShowPass').textContent = p.type === 'password' ? 'Show' : 'Hide';
});
$('btnForgot').addEventListener('click', async () => {
  const status = $('authStatus');
  const email = $('authEmail').value.trim();
  if (!email) { status.textContent = 'Type your account email first, then tap Forgot password.'; return; }
  status.textContent = 'Sending a reset link…';
  try {
    await window.KOGGSync.resetPassword(email);
    status.textContent = '✓ Reset link sent to ' + email + '. Follow it in your mail app, then sign in with the new password.';
  } catch (err) { status.textContent = 'Password reset failed: ' + err.message; }
});
$('btnSignUp').addEventListener('click', async () => {
  const status = $('authStatus');
  status.textContent = 'Creating account…';
  try {
    await window.KOGGSync.signUp($('authEmail').value.trim(), $('authPassword').value);
    status.textContent = 'Account created. If email confirmation is on, check your inbox, then sign in.';
  } catch (err) { status.textContent = 'Sign up failed: ' + err.message; }
});
$('btnSignIn').addEventListener('click', async () => {
  const status = $('authStatus');
  status.textContent = 'Signing in…';
  try {
    await window.KOGGSync.signIn($('authEmail').value.trim(), $('authPassword').value);
    setWorkMode('sync');
    await refreshUser();
    if (window._koggUser) {
      status.textContent = 'Signed in ✓ — your songs, themes and plans are syncing…';
      status.textContent = syncError ? 'Signed in. Sync needs attention: ' + syncError : 'Signed in ✓ — library loaded; pending changes will upload.';
    } else {
      status.textContent = 'Signed in.';
    }
  } catch (err) { status.textContent = 'Sign in failed: ' + err.message; }
});
$('btnSignOut').addEventListener('click', async () => {
  try { await window.KOGGSync.signOut(); } catch (err) { alert('Sign out failed: ' + err.message); return; }
  clearTimeout(syncTimer); syncError = '';
  window._koggUser = null;
  LS.set('cp_cloud_enabled',false); LS.set('cp_account_profile',null);
  syncUI(); refreshModeChip();
});
async function applyCloudLibrary(raw, revision) {
  if (!raw) return false;
  const data = window.KOGGLibrary.validate(raw);
  for (const [id, value] of Object.entries(data.assets || {})) {
    if (!await window.KOGGAssets?.put(id, value)) throw new Error('Could not store synced image ' + id);
  }
  if ((LS.get(K.settings, {}).libraryRevision || 0) !== revision) return false;
  // Apply the library only after every write succeeds; preserve pending local status.
  const settings = Object.assign({}, LS.get(K.settings, {}), window.KOGGLibrary.portableSettings(data.settings || {}));
  const writes = {[K.songs]:data.songs || songs, [K.service]:data.service || service, [K.themes]:data.themes?.length ? data.themes : themes,
    [K.plans]:data.plans || LS.get(K.plans, {}), [K.settings]:settings};
  const before = Object.fromEntries(Object.keys(writes).map(k => [k, localStorage.getItem(k)]));
  try { for (const [key,value] of Object.entries(writes)) localStorage.setItem(key, JSON.stringify(value)); }
  catch (err) {
    for (const [key,value] of Object.entries(before)) { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key,value); }
    throw err;
  }
  songs = writes[K.songs]; themes = writes[K.themes]; service = writes[K.service];
  if (!themes.some(t => t.id === currentThemeId)) currentThemeId = themes[0].id;
  refreshLogoStatus(); renderSongList(); renderPlans(); renderService(); renderThemesTab();
  return true;
}
async function pushCloud() {
  if (syncInFlight) return;
  const revision = LS.get(K.settings, {}).libraryRevision || 0;
  syncInFlight = true;
  try {
    const data = await window.KOGGSync.push();
    if (await applyCloudLibrary(data, revision)) clearDirty(revision);
    syncError = ''; flash($('btnPushCloud'), 'Pushed ✓');
  } catch (err) { syncError = err.message; alert('Push failed: ' + err.message); }
  finally { syncInFlight = false; refreshSyncBadge(); }
}
async function pullCloud(silent) {
  const revision = LS.get(K.settings, {}).libraryRevision || 0;
  try {
    const data = await window.KOGGSync.pull();
    if (!await applyCloudLibrary(data, revision)) return false;
    syncError = '';
    if (syncDirty()) scheduleSync();
    if (!silent) flash($('btnPullCloud'), 'Pulled ✓');
    return true;
  } catch (err) { syncError = err.message; if (!silent) alert('Pull failed: ' + err.message); return false; }
  finally { refreshSyncBadge(); }
}
window.addEventListener('online', () => { syncError = ''; scheduleSync(); refreshUser(); });
window.addEventListener('offline', () => { refreshSyncBadge(); refreshModeChip(); });
$('btnPushCloud').addEventListener('click', pushCloud);
$('btnPullCloud').addEventListener('click', () => pullCloud(false));

/* =========================================================
   WORK MODE — Base / Sync / Local start gate
========================================================= */
/*  Base  → basics once, offline after that, no cloud.
    Sync  → sign in at start; library follows the account on every device.
    Local → hybrid: everything saves on this device (Windows/Android/macOS/iOS/Linux). */
function workMode() { return LS.get(K.settings, {}).mode || ''; }
const MODE_LABEL = { base: '📖 Base', sync: '☁️ Sync', local: '💾 Local' };
function refreshModeChip() {
  const m = workMode();
  $('modeChip').textContent = m==='local' ? MODE_LABEL.local : window._koggUser ? (navigator.onLine ? (syncError ? '☁️ Sync • attention' : '☁️ Sync') : '📖 Base • offline') : m ? (navigator.onLine ? '📖 Base • online' : '📖 Base • offline') : 'Choose mode';
  $('modeChip').classList.toggle('unset', !m);
  if (typeof updateAddVersionsGate === 'function') updateAddVersionsGate();
}
function setWorkMode(m) {
  const s = LS.get(K.settings, {});
  s.mode = m;
  LS.set(K.settings, s);
  refreshModeChip();
  if (m === 'local') { clearTimeout(syncTimer); window._koggUser = null; syncUI(); }
  else { if(cloudEnabled())startAuthObserver();refreshUser(); }
}
function showGate() {
  $('startGate').hidden = false;
  $('gateModes').hidden = false;
  $('gateSignin').hidden = true;
  $('gateLocal').hidden = true;
  const m = workMode();
  document.querySelectorAll('.gate-mode').forEach(b =>
    b.classList.toggle('chosen', b.dataset.mode === m));
}
function closeGate() {
  $('startGate').hidden = true;
}
/* ---------- device detection + install guidance for Local Mode ---------- */
let installEvent = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  installEvent = e;
});
function detectPlatform() {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  const isMac = /Macintosh/.test(ua) && !isIOS;
  const isWin = /Windows/.test(ua);
  if (isWin) return { name: 'Windows', kind: 'desktop' };
  if (isAndroid) return { name: 'Android', kind: 'mobile' };
  if (isIOS) return { name: /iPad/.test(ua) ? 'iPad' : 'iPhone', kind: 'ios' };
  if (isMac) return { name: 'Mac', kind: 'desktop' };
  if (/CrOS/.test(ua)) return { name: 'Chromebook', kind: 'desktop' };
  return { name: navigator.platform || 'your device', kind: 'desktop' };
}
function showLocalPanel() {
  $('startGate').hidden = false;
  $('gateModes').hidden = true;
  $('gateSignin').hidden = true;
  const pl = detectPlatform();
  $('localDeviceName').textContent = pl.name;
  const installed = window.matchMedia('(display-mode: standalone)').matches;
  $('localDetect').innerHTML = installed
    ? `✓ Already running as an installed app on <b>${pl.name}</b>. Everything you do here saves on this device — Bibles, songs, schedules, lyrics, themes. No account needed, ever.`
    : `Running on <b>${pl.name}</b>. Local Mode works right away right here in the browser — the step below just makes it feel like a real app with a home-screen icon and full-screen launch.`;
  if (installEvent) {
    $('installNative').hidden = false;
    $('installManual').hidden = true;
  } else if (!installed) {
    $('installNative').hidden = true;
    $('installManual').hidden = false;
    const manual = pl.kind === 'ios'
      ? ['Open <b>Share</b> (the box with an arrow) at the bottom of Safari.',
         'Choose <b>Add to Home Screen</b>.',
         'Name it <b>KOGG</b> and tap Add — it launches full-screen and works offline.']
      : pl.kind === 'mobile'
      ? ['Open the ⋮ menu in Chrome.',
         'Choose <b>Add to Home screen</b> → <b>Install</b>.',
         'KOGG appears next to your other apps and opens full-screen.']
      : ['Click the <b>install icon</b> (a monitor with a ↓) on the right side of the address bar in Chrome/Edge.',
         'Or open the browser menu → <b>Apps → Install</b> / <b>Install page as app</b>.',
         'KOGG gets its own window &amp; Start-menu icon — and works offline.'];
    $('installSteps').innerHTML = manual.map(s => `<li>${s}</li>`).join('');
  } else {
    $('installNative').hidden = true;
    $('installManual').hidden = true;
  }
}
$('btnInstallApp').addEventListener('click', async () => {
  if (!installEvent) return;
  installEvent.prompt();
  try {
    const choice = await installEvent.userChoice;
    if (choice && choice.outcome === 'accepted') {
      $('localDetect').innerHTML = '✓ Installed. From now on KOGG opens like any app on <b>' + pl.name + '</b> — full-screen, offline, no tab needed.';
      $('installNative').hidden = true;
    }
  } catch {}
  installEvent = null;
});
$('btnGateLocalBack').addEventListener('click', () => {
  $('gateLocal').hidden = true;
  $('gateModes').hidden = false;
});
$('btnGateLocalGo').addEventListener('click', () => closeGate());
document.querySelectorAll('.gate-mode').forEach(b => b.addEventListener('click', () => {
  if (b.dataset.mode === 'sync') {
    if (!(window.KOGGSync && window.KOGGSync.configured)) {
      $('gateStatus').textContent = 'Cloud sync is not configured on this deployment yet — see README → "Enable cloud sync".';
      $('gateStatus').style.color = 'var(--warn)';
    } else {
      $('gateStatus').textContent = '';
    }
    $('startGate').hidden = false;
    $('gateModes').hidden = true;
    $('gateSignin').hidden = false;
    $('gateLocal').hidden = true;
    $('gateEmail').focus();
    return;
  }
  if (b.dataset.mode === 'local') {
    setWorkMode('local');
    showLocalPanel();
    return;
  }
  // Base Mode — the plain console, nothing extra to learn
  setWorkMode('base');
  closeGate();
  flash($('modeChip'), 'Base ✓');
}));
$('btnGateSkip').addEventListener('click', () => {
  setWorkMode('local');
  showLocalPanel();
});
$('btnGateLater').addEventListener('click', closeGate);
$('modeChip').addEventListener('click', showGate);
$('feMode').addEventListener('click', () => showGate());
async function gateAuth(up) {
  const st = $('gateStatus');
  st.textContent = 'Connecting…';
  st.style.color = '';
  try {
    if (up) {
      const result = await window.KOGGSync.signUp($('gateEmail').value.trim(), $('gatePass').value);
      if (!result.session) { st.textContent = 'Check your email to confirm the account, then sign in here.'; return; }
    }
    else await window.KOGGSync.signIn($('gateEmail').value.trim(), $('gatePass').value);
    setWorkMode('sync');
    closeGate();
    await refreshUser();
    st.textContent = 'Signed in ✓ — pulling your library…';
  } catch (err) {
    st.textContent = err && err.message === 'not-configured'
      ? 'Cloud sync is not configured on this deployment yet — pick a different mode, or see README → "Enable cloud sync".'
      : ((err && err.message) || 'Sign-in failed — check your connection.');
    st.style.color = 'var(--danger)';
  }
}
$('btnGateIn').addEventListener('click', () => gateAuth(false));
$('btnGateUp').addEventListener('click', () => gateAuth(true));
refreshModeChip();
if (!workMode()) showGate();

/* =========================================================
   GLOBAL CONTROLS
========================================================= */
function next() { if(live.scripture)navigateScripture(1);else if(live.mode === 'normal' && live.index < live.slides.length-1)pushLive({index:live.index+1,strongsShowing:false,strongsCard:null,highlight:null}); }
function prev() { if(live.scripture)navigateScripture(-1);else if(live.mode === 'normal' && live.index>0)pushLive({index:live.index-1,strongsShowing:false,strongsCard:null,highlight:null}); }
$('btnBlank').addEventListener('click', () => pushLive({ mode: live.mode === 'blank' ? 'normal' : 'blank' }));
$('btnLogo').addEventListener('click', () => pushLive({ mode: live.mode === 'logo' ? 'normal' : 'logo' }));
$('btnOpenDisplay').addEventListener('click', openDisplayWindow);

/* Open the output window directly on the extended screen when one exists.
   Uses the Window Management API (Chrome/Edge) — asks permission once. */
let displayWindow = null;
function outputUrl() {
  // Cloudflare Pages canonicalises HTML routes; avoid its redirect on a new output window.
  const path = location.hostname?.endsWith('.pages.dev') ? 'display' : 'display.html';
  return new URL(path, location.href).href;
}
function setOutputStatus(message) { $('outputStatus').textContent = message; }
function outputConnected() {
  outputIsConnected = true;
  setOutputStatus(live.mode === 'blank' ? 'Output connected • screen blank' : 'Output connected');
  if (channel) channel.postMessage(live);
}
if (channel) channel.onmessage = event => { if (event.data?.type === 'display-ready') outputConnected(); };
window.addEventListener('message', event => {
  if (event.origin !== location.origin || event.source !== displayWindow || event.data?.type !== 'display-ready') return;
  outputConnected();
  displayWindow.postMessage({type:'output-state', live}, location.origin);
});
async function openDisplayWindow() {
  // Navigate during the click itself: never leave a blank page waiting on permission.
  const w = window.open(outputUrl(), 'kogg_display', 'popup=yes');
  if (!w) { setOutputStatus('Output blocked — allow popups for this site'); flash($('btnOpenDisplay'), 'Allow popups to open output'); return; }
  displayWindow = w;
  setOutputStatus('Opening output…');
  try { w.focus(); } catch {}
  try {
    if ('getScreenDetails' in window) {
      const details = await window.getScreenDetails();
      const cur = details.currentScreen;
      const other = details.screens.find(s => s.left !== cur.left || s.top !== cur.top);
      if (other && !w.closed) { w.moveTo(other.left, other.top); w.resizeTo(other.width, other.height); w.focus(); }
      else if (!other) setOutputStatus('Output open • no second screen detected');
    } else setOutputStatus('Output open • move it to the projector screen');
  } catch {
    setOutputStatus('Output open • screen permission unavailable; move it manually');
  }
}

document.addEventListener('keydown', e => {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
  if (e.key === '/') { e.preventDefault(); $('quickGo').focus(); return; }
  if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); next(); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
  else if (e.key.toLowerCase() === 'b') $('btnBlank').click();
  else if (e.key.toLowerCase() === 'l') $('btnLogo').click();
  else if (e.key === 'Escape') pushLive({mode:'normal'});
});

/* Countdown */
$('btnCountdown').addEventListener('click', () => {
  const mins = +$('countdownMinutes').value || 5;
  pushLive({ mode: 'countdown', until: Date.now() + mins * 60000 });
});
$('btnEndCountdown').addEventListener('click', () => pushLive({ mode: 'normal' }));

/* Voice control — navigate the service by speaking (Web Speech API) */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
let voiceOn = false;
let rec = null;
const NUMWORDS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  hundred: 100, first: 1, second: 2, third: 3,
};
const NAV_WORDS = ['next', 'forward', 'advance', 'back', 'previous', 'blank', 'black',
  'logo', 'stop', 'listening', 'amen', 'go', 'live', 'clear'];

function numberize(words) {
  // turn spoken number words into digits: "twenty three" -> "23"
  const out = [];
  let acc = 0;
  const flush = () => { if (acc) { out.push(String(acc)); acc = 0; } };
  for (const w of words) {
    let n = null;
    if (NUMWORDS[w] != null && !NAV_WORDS.includes(w)) n = NUMWORDS[w];
    else if (/^\d+$/.test(w)) n = +w;
    if (n == null) { flush(); out.push(w); continue; }
    if (n === 100) { acc = (acc || 1) * 100; continue; }
    if (n >= 10 && n % 10 === 0) { flush(); acc = n; continue; }
    acc += n;
  }
  flush();
  return out;
}

function voiceShow(text) { flash($('feVoice'), '→ ' + text); }

function processVoice(raw) {
  const said = raw.toLowerCase().replace(/[^a-z0-9\s'-]/g, ' ').trim();
  if (!said) return;
  const words = said.split(/\s+/).filter(w => w !== 'please' && w !== 'the' && w !== 'to' && w);

  // navigation commands
  const joined = words.join(' ');
  if (/next|forward|advance/.test(joined)) { next(); voiceShow('Next ▶'); return; }
  if (/previous|back/.test(joined)) { prev(); voiceShow('◀ Previous'); return; }
  if (/blank|black|hide/.test(joined)) { $('btnBlank').click(); voiceShow('Blank'); return; }
  if (/logo/.test(joined)) { $('btnLogo').click(); voiceShow('Logo'); return; }
  if (/stop listening|stop voice|voice off/.test(joined)) { stopVoice(); voiceShow('Off'); return; }

  // scripture reference — "john three sixteen", "go psalms twenty three 1-5"
  if (bible) {
    const cands = numberize(words.filter(w => w !== 'chapter' && w !== 'and' && w !== 'go' && w !== 'live' && w !== 'scripture' && w !== 'read'));
    for (let start = 0; start < cands.length; start++) {
      for (let len = cands.length - start; len >= 2; len--) {
        const cand = cands.slice(start, start + len).join(' ');
        const ref = parseQuickRef(cand);
        if (ref) {
          const book = bible.books[ref.bookIdx];
          const ok = cands[start + len - 1].match(/\d/) || cand.split(' ').length > 1;
          if (ok) {
            goLiveScripture(ref);
            voiceShow(`${book.name} ${ref.ch}:${ref.vFrom}-${ref.vTo}`);
            return;
          }
        }
      }
    }
  }

  // song titles
  const ql = words.join(' ');
  const matches = songs.filter(s => s.title.toLowerCase().includes(ql) || ql.includes(s.title.toLowerCase()));
  if (matches.length === 1) {
    pushLive({ mode: 'normal', slides: songToSlides(matches[0]), index: 0, title: matches[0].title, themeId: currentThemeId });
    voiceShow('♪ ' + matches[0].title);
    return;
  }
  voiceShow(said.slice(0, 18));
}

function startVoice() {
  if (!SR) {
    alert('Voice control needs Chrome or Edge (Web Speech API). Voice input also requires an internet connection.');
    return;
  }
  try {
    rec = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = navigator.language || 'en-US';
    rec.onresult = e => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) processVoice(e.results[i][0].transcript);
      }
    };
    rec.onend = () => {
      if (voiceOn) { try { rec.start(); } catch {} }   // keep the mic open
      else voiceBtnSync(false);
    };
    rec.onerror = e => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        stopVoice();
        flash($('feVoice'), 'Mic blocked');
        alert('Microphone permission denied — allow mic access to use voice control.\nNote: voice input needs an internet connection in Chrome/Edge.');
      }
    };
    rec.start();
    voiceOn = true;
    voiceBtnSync(true);
    flash($('feVoice'), 'Listening…');
  } catch (err) {
    alert('Could not start voice control: ' + err.message);
  }
}
function stopVoice() {
  voiceOn = false;
  try { if (rec) rec.stop(); } catch {}
}
$('feVoice').addEventListener('click', () => voiceOn ? stopVoice() : startVoice());
$('btnVoice2').addEventListener('click', () => voiceOn ? stopVoice() : startVoice());
function voiceBtnSync(on) {
  $('feVoice').classList.toggle('active', on);
  $('btnVoice2').classList.toggle('active', on);
}

/* Quick font size / alignment on the current theme — the floating quick-edit
   widget and the ⋯ menu share these */
function patchTheme(patch) {
  const t = themeById(currentThemeId);
  Object.assign(t, patch);
  LS.set(K.themes, themes);
  pushLive({ themeId: currentThemeId });
}
function quickFontSize(dir, flashBtn) {
  const t = themeById(currentThemeId);
  const size = Math.max(3, Math.min(15, (+t.fontSize || 7) + dir * 0.5));
  patchTheme({ fontSize: size });
  if (flashBtn) flash(flashBtn, dir > 0 ? `A+ ${size}` : `A− ${size}`);
}
function quickCycleAlign(flashBtn) {
  const t = themeById(currentThemeId);
  const nextAlign = t.align === 'left' ? 'center' : 'left';
  patchTheme({ align: nextAlign });
  if (flashBtn) flash(flashBtn, nextAlign === 'left' ? '⬅ Left' : '⬌ Center');
}
$('feSizeUp').addEventListener('click', () => quickFontSize(1, $('feSizeUp')));
$('feSizeDown').addEventListener('click', () => quickFontSize(-1, $('feSizeDown')));
$('feAlign').addEventListener('click', () => quickCycleAlign($('feAlign')));

/* floating quick edit — draggable, closable, toggle from ⋯ menu */
function lsShowFloatEdit() { return LS.get(K.settings, {}).showFloatEdit !== false; }
function applyFloatEdit() {
  const el = $('floatEdit');
  el.hidden = !lsShowFloatEdit();
  const pos = LS.get(K.settings, {}).fePos;
  if (pos) {
    el.style.left = Math.max(4, Math.min(window.innerWidth - 60, pos.x)) + 'px';
    el.style.top = Math.max(4, Math.min(window.innerHeight - 40, pos.y)) + 'px';
    el.style.right = 'auto';
    el.style.bottom = 'auto';
  }
}
(function initFloatEdit() {
  const grip = $('floatEdit').querySelector('.fe-head .grip');
  grip.addEventListener('pointerdown', e => {
    e.preventDefault();
    const r = $('floatEdit').getBoundingClientRect();
    const dx = e.clientX - r.left, dy = e.clientY - r.top;
    let moved = false;
    $('floatEdit').classList.add('dragging');
    const move = ev => {
      moved = true;
      const x = Math.max(4, Math.min(window.innerWidth - 60, ev.clientX - dx));
      const y = Math.max(4, Math.min(window.innerHeight - 40, ev.clientY - dy));
      $('floatEdit').style.left = x + 'px';
      $('floatEdit').style.top = y + 'px';
      $('floatEdit').style.right = 'auto';
      $('floatEdit').style.bottom = 'auto';
    };
    const up = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      $('floatEdit').classList.remove('dragging');
      if (moved) {
        const s = LS.get(K.settings, {});
        s.fePos = { x: Math.round(parseFloat($('floatEdit').style.left) || 0), y: Math.round(parseFloat($('floatEdit').style.top) || 0) };
        LS.set(K.settings, s);
      }
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  });
  $('feClose').addEventListener('click', () => {
    const s = LS.get(K.settings, {});
    s.showFloatEdit = false;
    LS.set(K.settings, s);
    applyFloatEdit();
  });
  $('btnFloatEditToggle').addEventListener('click', () => {
    const s = LS.get(K.settings, {});
    s.showFloatEdit = !lsShowFloatEdit();
    LS.set(K.settings, s);
    applyFloatEdit();
    flash($('btnFloatEditToggle'), s.showFloatEdit ? 'Quick edit ON ✓' : 'Quick edit off');
  });
})();
/* Light / dark operator mode */
function applyOperatorTheme(light) {
  document.body.classList.toggle('light', light);
  $('feTheme').textContent = light ? '☀' : '🌙';
  LS.set(K.settings, Object.assign(LS.get(K.settings, {}), { light }));
}
$('feTheme').addEventListener('click', () =>
  applyOperatorTheme(!document.body.classList.contains('light')));

/* Lower thirds */
$('btnLtShow').addEventListener('click', () => {
  pushLive({ lowerThird: { on: true, l1: $('ltLine1').value.trim(), l2: $('ltLine2').value.trim() } });
  flash($('btnLtShow'), 'Shown ✓');
});
$('btnLtHide').addEventListener('click', () => {
  pushLive({ lowerThird: { on: false, l1: $('ltLine1').value.trim(), l2: $('ltLine2').value.trim() } });
});

/* Strong's numbers — the toggle controls the tap-to-define word numbers
   in the "On the projector" preview (the projector itself always shows
   clean text). */
function strongsOn() { return LS.get(K.settings, {}).strongsOn !== false; }
function refreshStrongsBtn() { $('btnStrongs').textContent = strongsOn() ? 'Numbers ON' : 'Numbers OFF'; }
$('btnStrongs').addEventListener('click', () => {
  const settings = LS.get(K.settings, {});
  settings.strongsOn = !strongsOn();
  LS.set(K.settings, settings);
  refreshStrongsBtn();
  renderVerseDots();   // re-renders the preview with/without numbers
  flash($('btnStrongs'), strongsOn() ? 'Numbers ON ✓' : 'Numbers OFF ✓');
});
refreshStrongsBtn();

/* ---------- custom Bible versions — "Add versions" (Sync / Local modes) ---------- */
function customVersions() { return LS.get(K.settings, {}).customVersions || []; }
function rebuildCustomOptions() {
  const list = customVersions();
  const group = $('customVersionsGroup');
  group.hidden = !list.length;
  group.innerHTML = list.map(v => `<option value="idb:${v.assetId}">${esc(v.name)}</option>`).join('');
  $('bibleList').innerHTML = list.length
    ? list.map(v => `<div class="ver-row"><span>📗 ${esc(v.name)}</span><button data-delver="${esc(v.assetId)}" class="danger" title="Remove this version from this device">✕</button></div>`).join('')
    : '<span class="dim">No added versions yet.</span>';
  renderVersionChips();
  updateAddVersionsGate();
}
function updateAddVersionsGate() {
  const m = workMode();
  const note = $('addVersionsModeNote');
  if (!note) return;
  if (m === 'base') note.textContent = 'Base includes KJV, BSB and Strong’s. WEB/ASV download when selected online; compatible Bible files can be added locally.';
  else if (m === 'sync') note.textContent = 'Added versions stay on this device (the cloud library keeps songs/themes/plans).';
  else note.textContent = 'Added versions stay on this device.';
  const btn = $('btnAddBible');
  if (btn) { btn.disabled = false; btn.title = 'Add a compatible Bible file on this device'; }
}
$('btnAddBible').addEventListener('click', async () => {
  const file = $('bibleFile').files[0];
  if (!file) { flash($('btnAddBible'), 'Pick a file'); return; }
  const text = await file.text();
  let data;
  try { data = JSON.parse(text); } catch { flash($('btnAddBible'), 'Not valid JSON'); return; }
  const shapeOk = data && Array.isArray(data.books) && data.books.length === 66 &&
    data.books.every(b => b && typeof b.name === 'string' && Array.isArray(b.chapters) &&
      b.chapters.length > 0 && b.chapters.every(c => Array.isArray(c) && c.every(t => typeof t === 'string')));
  if (!shapeOk) {
    flash($('btnAddBible'), 'Wrong shape');
    alert('This file does not match the KOGG Bible shape.\n\nExpected: { "translation": "Name", "books": [ 66 books in canonical order, each { "name": "Genesis", "chapters": [ ["verse 1", "verse 2", …] ] } ] }');
    return;
  }
  const name = String(data.translation || file.name.replace(/\.json$/i, '')).slice(0, 40);
  const s = LS.get(K.settings, {});
  if ((s.customVersions || []).some(v => v.name === name)) { flash($('btnAddBible'), 'Name exists'); return; }
  const assetId = 'bible-' + uid();
  if (!(window.KOGGAssets && await window.KOGGAssets.put(assetId, text))) { flash($('btnAddBible'), 'Storage failed'); return; }
  s.customVersions = (s.customVersions || []).concat([{ name, assetId }]);
  LS.set(K.settings, s);
  $('bibleFile').value = '';
  rebuildCustomOptions();
  flash($('btnAddBible'), 'Added ✓');
});
$('bibleList').addEventListener('click', async e => {
  const b = e.target.closest('button[data-delver]');
  if (!b) return;
  if (!confirm('Remove this version from this device?')) return;
  const id = b.dataset.delver;
  const wasSelected = $('translationSelect').value === 'idb:' + id;
  const s = LS.get(K.settings, {});
  s.customVersions = (s.customVersions || []).filter(v => v.assetId !== id);
  LS.set(K.settings, s);
  try { if (window.KOGGAssets) await window.KOGGAssets.del(id); } catch {}
  rebuildCustomOptions();
  if (wasSelected) {
    $('translationSelect').value = 'data/kjv.json';
    LS.set(K.settings, Object.assign(LS.get(K.settings, {}), { currentTranslation: 'data/kjv.json' }));
    loadBible('data/kjv.json');
  }
});

/* ---------- church logo (Logo screen + countdown) ---------- */
function refreshLogoStatus() {
  const s = LS.get(K.settings, {});
  $('logoStatus').textContent = (s.logoId || s.logoImage)
    ? `Logo set — shows on the Logo screen.`
    : 'No logo yet — the app placeholder is used.';
}
$('logoFile').addEventListener('change', () => {
  const file = $('logoFile').files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    const settings = LS.get(K.settings, {});
    const stored = await storeImage(reader.result, 'logo');
    if (typeof stored === 'string') {
      settings.logoImage = stored; settings.logoId = '';
    } else {
      settings.logoId = stored.id; settings.logoImage = '';
    }
    settings.logoName = file.name.replace(/\.[a-z0-9]+$/i, '').slice(0, 40);
    LS.set(K.settings, settings);
    markDirty();
    pushLive({});
    refreshLogoStatus();
    flash($('btnLogoClear'), 'Logo saved ✓');
  };
  reader.readAsDataURL(file);
});
$('btnLogoClear').addEventListener('click', () => {
  const settings = LS.get(K.settings, {});
  settings.logoImage = '';
  settings.logoId = '';
  settings.logoName = '';
  LS.set(K.settings, settings);
  markDirty();
  refreshLogoStatus();
  pushLive({});
  flash($('btnLogoClear'), 'Removed ✓');
});
refreshLogoStatus();

/* ---------- starter hymns (bundled, all in the public domain) ---------- */
async function addHymnPack(file) {
  const pack=await window.KOGGContent.readPack(file);
  const merged=window.KOGGContent.mergeHymns(songs,pack);
  if(merged.added){songs=merged.songs;LS.set(K.songs,songs);}
  const settings=LS.get(K.settings,{});
  settings.hymnPacks=[...new Set([...(settings.hymnPacks || []),pack.pack])];
  LS.set(K.settings,settings);renderSongList();return merged.added;
}
async function addStarterHymns() {
  try {const n=await addHymnPack('data/hymns.json');LS.set(K.settings,{...LS.get(K.settings,{}),hymnPackVersion:'traditional-basic-v1'});return n;}
  catch {return 0;}
}
$('btnStarterHymns').addEventListener('click',async()=>{
  $('btnStarterHymns').disabled=true;
  try {const n=await addHymnPack('data/hymns.json');flash($('btnStarterHymns'),n ? `+${n} hymns ✓` : 'Basic hymns already saved');}
  catch(err){$('hymnPackStatus').textContent=err.message;}
  finally{$('btnStarterHymns').disabled=false;}
});
$('btnMoreHymns').addEventListener('click',async()=>{
  const panel=$('extraHymnPacks');panel.hidden=!panel.hidden;if(panel.hidden)return;
  try {
    const response=await fetch('data/content-catalog.json');if(!response.ok)throw new Error('Connect to load the extra hymn catalogue');
    const catalogue=await response.json();
    panel.innerHTML=(catalogue.hymnPacks || []).filter(p=>typeof p.name==='string'&&/^data\/[a-z0-9-]+\.json$/.test(p.file)).map(p=>`<button data-hymn-pack="${esc(p.file)}">Add ${esc(p.name)} (${Number(p.count)||0})</button>`).join('');
    $('hymnPackStatus').textContent='Download a pack once; its added hymns remain available offline.';
  }catch(err){$('hymnPackStatus').textContent=err.message;}
});
$('extraHymnPacks').addEventListener('click',async event=>{
  const button=event.target.closest('button[data-hymn-pack]');if(!button)return;button.disabled=true;
  try{const n=await addHymnPack(button.dataset.hymnPack);$('hymnPackStatus').textContent=n ? `${n} hymns added and saved for offline use.` : 'These hymns are already saved.';}
  catch(err){$('hymnPackStatus').textContent=err.message;}
  finally{button.disabled=false;}
});
$('btnMoreBibles').addEventListener('click',async()=>{
  const panel=$('extraBiblePanel');panel.hidden=!panel.hidden;if(panel.hidden)return;
  try {
    const response=await fetch('data/content-catalog.json');if(!response.ok)throw new Error('Connect to load the Bible catalogue');
    const catalogue=await response.json();
    const buttons=(catalogue.bibles || []).filter(b=>typeof b.name==='string'&&/^data\/[a-z0-9-]+\.json$/.test(b.file))
      .map(b=>`<button data-bible-file="${esc(b.file)}">↧ ${esc(b.short || b.name)}</button>`).join('');
    $('extraBibleButtons').innerHTML=buttons || '<span class="hint">No extra versions listed.</span>';
    $('extraBibleStatus').textContent='Download a version once while online, then it works offline in every work mode.';
  }catch(err){$('extraBibleStatus').textContent=err.message;}
});
$('extraBiblePanel').addEventListener('click',async event=>{
  const button=event.target.closest('button[data-bible-file]');if(!button)return;
  const reference=preparedScripture?.r || currentLiveReference() || currentScriptureRange();
  button.disabled=true;
  try{if(await loadBible(button.dataset.bibleFile)){stageScripture(reference);$('extraBibleStatus').textContent='Downloaded. This version is now available offline.';}else $('extraBibleStatus').textContent='Not downloaded yet. Reconnect and retry.';}
  finally{button.disabled=false;}
});

/* OBS overlay URL */
function obsOverlayUrl() {
  return new URL('display.html?overlay=1', location.href).href;
}
$('obsUrl').value = obsOverlayUrl();
$('btnCopyObs').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(obsOverlayUrl()); flash($('btnCopyObs'), 'Copied ✓'); }
  catch { $('obsUrl').select(); document.execCommand('copy'); flash($('btnCopyObs'), 'Copied ✓'); }
});

/* Backup / restore */
$('btnExport').addEventListener('click', async () => {
  try {
    const data = { version: 2, exported: new Date().toISOString(), songs, themes, service,
      plans: LS.get(K.plans, {}), settings: LS.get(K.settings, {}), assets: {} };
    delete data.settings.dirtyLibrary;
    delete data.settings.libraryRevision;
    for (const id of window.KOGGLibrary.assetIds(data)) {
      const asset = await window.KOGGAssets?.get(id);
      if (!asset) throw new Error('Missing asset: ' + id + '. Re-add it before making a full backup.');
      data.assets[id] = asset;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'kogg-presenter-backup.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } catch (err) { alert('Backup failed: ' + err.message); }
});
$('btnImport').addEventListener('click', () => $('importFile').click());
$('importFile').addEventListener('change', async () => {
  const file = $('importFile').files[0];
  if (!file) return;
  try {
    if (file.size > 80 * 1024 * 1024) throw new Error('Backup exceeds 80 MB');
    const lib = window.KOGGLibrary;
    const d = lib.validate(JSON.parse(await file.text()));
    for (const id of lib.assetIds(d)) {
      if (!d.assets?.[id] && !await window.KOGGAssets?.get(id)) throw new Error('Backup is missing asset ' + id);
    }
    if (!confirm('Restore this backup? Matching songs, themes and named plans will be replaced by the backup versions. The current service and saved settings will also be restored when present.')) return;
    for (const [id, value] of Object.entries(d.assets || {})) {
      if (!await window.KOGGAssets?.put(id, value)) throw new Error('Could not save asset: ' + id);
    }
    const restored = {
      [K.songs]: d.songs ? lib.mergeRecords(songs, d.songs) : songs,
      [K.themes]: d.themes?.length ? lib.mergeRecords(themes, d.themes) : themes,
      [K.service]: d.service || service,
      [K.plans]: Object.assign({}, LS.get(K.plans, {}), d.plans || {}),
      [K.settings]: Object.assign({}, LS.get(K.settings, {}), d.settings || {}, { dirtyLibrary: true }),
    };
    const before = Object.fromEntries(Object.keys(restored).map(k => [k, localStorage.getItem(k)]));
    try {
      for (const [key, value] of Object.entries(restored)) localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      for (const [key, value] of Object.entries(before)) { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); }
      throw err;
    }
    songs = restored[K.songs]; themes = restored[K.themes]; service = restored[K.service];
    currentThemeId = restored[K.settings].currentThemeId || themes[0].id;
    rebuildCustomOptions(); renderSongList(); renderService(); renderPlans(); renderThemesTab();
    refreshLogoStatus(); refreshStrongsBtn(); refreshModeChip(); markDirty();
    const translation = restored[K.settings].currentTranslation;
    if (translation) await loadBible(translation);
    pushLive({});
    alert('Backup restored. Reopen the app to apply all saved layout preferences.');
  } catch (err) { alert('Import failed: ' + err.message); }
  finally { $('importFile').value = ''; }
});

/* ---------- misc ---------- */
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function flash(btn, msg) {
  const old = btn.textContent;
  btn.textContent = msg;
  setTimeout(() => { btn.textContent = old; }, 1200);
}

/* ---------- init ---------- */
window.__koggBoot = false;   // mutation watcher (auto-sync) engages after boot
/* one-time layout migration — old saved sizes predate the balanced default
   layout; clear them once so everyone sees the intended arrangement */
(function migrateLayout() {
  const s = LS.get(K.settings, {});
  if (s.layoutVer !== 'v6') {
    delete s.dockOrder; delete s.dockSizes; delete s.hiddenDocks; delete s.panesLocked;
    s.layoutVer = 'v6';
    LS.set(K.settings, s);
  }
})();
const savedSettings = LS.get(K.settings, {});
rebuildCustomOptions();      // custom versions must exist in the select before restore
if (savedSettings.currentTranslation && [...$('translationSelect').options].some(o => o.value === savedSettings.currentTranslation)) $('translationSelect').value = savedSettings.currentTranslation;
if (savedSettings.light) applyOperatorTheme(true);

/* first run: quietly add the bundled public-domain starter hymns */
(async function seedStarterHymns() {
  if (savedSettings.hymnPackVersion === 'traditional-basic-v1') return;
  const n = await addStarterHymns();
  if (n || songs.length) LS.set(K.settings, Object.assign(LS.get(K.settings, {}), { starterSeeded: true }));
  if (n) refreshSyncBadge();
})();

renderSongList();
renderService();
renderPlans();
renderPreview();
renderMemory();
initDockFit();
fitDockContents();
window.__koggBoot = true;
refreshSyncBadge();
window.KOGGOffline?.start();
loadBible($('translationSelect').value).then(async loaded => { if(loaded && !live.scripture)await prepareSaved(LS.get('cp_last_scripture',null)); });
setVerseMode(savedSettings.verseMode || 'verse');
applyDocks();
initSplitters();
initDockDrag();
refreshLock();
applyFloatPreview();
applyFloatNav();
if (LS.get(K.settings, {}).fpFold) $('fpCollapse').textContent = '▸';
applyFloatEdit();

let authObserved = false;
function startAuthObserver() {
if (authObserved || !window.KOGGSync?.configured) return;
  authObserved = true;
  window.KOGGSync.getClient().then(client => {
  client.auth.onAuthStateChange(event => {
    if (event === 'PASSWORD_RECOVERY') $('passwordRecovery').hidden = false;
    if (event === 'SIGNED_OUT') { window._koggUser = null; LS.set('cp_cloud_enabled',false);LS.set('cp_account_profile',null);syncUI();refreshModeChip(); }
    if(event==='SIGNED_IN' || event==='TOKEN_REFRESHED')setTimeout(()=>refreshUser(),0);
  });
  if (new URLSearchParams(location.hash.slice(1)).get('type') === 'recovery') $('passwordRecovery').hidden = false;
}).catch(() => { authObserved = false; });
}
if ((cloudEnabled() && navigator.onLine) || new URLSearchParams(location.hash.slice(1)).get('type') === 'recovery') startAuthObserver();
$('btnSavePassword').addEventListener('click', async () => {
  const password = $('recoveryPassword').value;
  if (password.length < 6 || password !== $('recoveryConfirm').value) { $('recoveryStatus').textContent = 'Use at least six characters and enter the same password twice.'; return; }
  $('btnSavePassword').disabled = true;
  try {
    await window.KOGGSync.updatePassword(password);
    $('recoveryPassword').value = ''; $('recoveryConfirm').value = '';
    $('passwordRecovery').hidden = true;
    history.replaceState(null, '', location.pathname + location.search);
    await refreshUser();
    alert('Password updated.');
  } catch (err) { $('recoveryStatus').textContent = 'Password update failed: ' + err.message; }
  finally { $('btnSavePassword').disabled = false; }
});

refreshUser();
