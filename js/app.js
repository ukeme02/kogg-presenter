/* KOGG Presenter — operator logic */
'use strict';

/* ---------- storage helpers ---------- */
const LS = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    // library changes mark the cloud copy out of date (auto-sync — see CLOUD section)
    if (window.__koggBoot &&
        (key === K.songs || key === K.themes || key === K.service || key === K.plans)) scheduleSync();
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
let live = LS.get(K.live, { mode: 'logo', slides: [], index: 0, lowerThird: { on: false, l1: '', l2: '' } });
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
  if (t.weight === '400' || t.weight === undefined) t.weight = '700';
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
  if (patch.slides !== undefined) { live.strongsShowing = false; live.strongsCard = null; live.highlight = null; }   // new content → word card and highlight close
  LS.set(K.live, live);
  if (channel) channel.postMessage(live);
  renderPreview();
}

/* ---------- live indicator ---------- */
function renderPreview() {
  // live indicator in the Scripture tab ("🔴 John 3:16")
  const lr = $('liveRef');
  const showing = live.mode === 'normal' && live.title;
  lr.textContent = showing ? '🔴 ' + live.title : '';
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
$('btnMore').addEventListener('click', () => {
  $('moreMenu').hidden = !$('moreMenu').hidden;
});
document.addEventListener('click', e => {
  if (!e.target.closest('.more-wrap')) $('moreMenu').hidden = true;
});

/* =========================================================
   SCRIPTURE
========================================================= */
async function loadBible(file) {
  let data = null;
  if (file.startsWith('idb:')) {
    // custom version added in Tools — text lives in IndexedDB
    const raw = window.KOGGAssets ? await window.KOGGAssets.get(file.slice(4)) : null;
    if (!raw) { flash($('translationSelect'), 'Version missing'); return; }
    try { data = JSON.parse(raw); } catch { flash($('translationSelect'), 'Version corrupt'); return; }
  } else {
    const res = await fetch(file);
    data = await res.json();
  }
  bible = data;
  // flat index of plain-verse text for fast full-text search (all 66 books)
  searchIndex = [];
  bible.books.forEach((b, bi) => b.chapters.forEach((ch, ci) => ch.forEach((t, vi) => {
    searchIndex.push({ bi, ci, vi, s: stripStrongs(t).toLowerCase() });
  })));
  const bookSel = $('bookSelect');
  bookSel.innerHTML = bible.books.map((b, i) => `<option value="${i}">${b.name}</option>`).join('');
  fillChapters();
}
function fillChapters() {
  const book = bible.books[+$('bookSelect').value];
  $('chapterSelect').innerHTML = book.chapters.map((_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('');
  fillVerses();
  renderBookChips($('bookSearch').value);
  renderChapterChips();
}
function fillVerses() {
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
  if (verseMode === 'chapter') { box.innerHTML = ''; return; }
  if (!liveRef || liveRef.bookIdx !== +$('bookSelect').value || liveRef.ch !== +$('chapterSelect').value) {
    box.innerHTML = '<span class="dim">No verse live in this chapter yet — tap a number.</span>';
    return;
  }
  const book = bible.books[liveRef.bookIdx];
  const hasStrongs = /\[(?:G|H)\d{1,5}]/.test(book.chapters[liveRef.ch - 1][liveRef.vFrom - 1] || '');
  const nums = hasStrongs && strongsOn();   // numbers stay while the card shows — second tap flips back
  const parts = [];
  for (let v = liveRef.vFrom; v <= Math.min(liveRef.vTo, liveRef.vFrom + 40); v++) {
    const raw = book.chapters[liveRef.ch - 1][v - 1] || '';
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
  const ref = book.name + ' ' + liveRef.ch + (liveRef.vTo > liveRef.vFrom ? ':' + liveRef.vFrom + '-' + liveRef.vTo : ':' + liveRef.vFrom);
  const liveOnProjector = live.strongsShowing && live.strongsCard ? '<span class="lt-note">word meaning on screen — tap the number again to flip back</span>' : '';
  box.innerHTML = `<div class="live-ref">${esc(ref)}${nums ? '<span class="lt-tip">tap a word number → its meaning takes the screen</span>' : ''}${liveOnProjector}</div>${parts.join(' ')}`;
}

/* ---------- Strong's tap-to-define — numbers live in the preview only;
   tapping one shows the Hebrew/Greek word card on the projector, tapping
   again flips back to the verse. Service never has to stop. ---------- */
let strongsLexicon = null, strongsLoading = false;
function ensureLexicon() {
  if (strongsLexicon || strongsLoading) return Promise.resolve(strongsLexicon);
  strongsLoading = true;
  return fetch('data/strongs.json').then(r => r.json())
    .then(d => { strongsLexicon = d; return d; })
    .catch(() => null)
    .finally(() => { strongsLoading = false; });
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
    card.ref = `${book.name} ${liveRef.ch}:${liveRef.vFrom}${liveRef.vTo > liveRef.vFrom ? '-' + liveRef.vTo : ''}`;
    card.verse = stripStrongs(book.chapters[liveRef.ch - 1][liveRef.vFrom - 1] || '');
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
function scrollLiveIntoView() {
  setTimeout(() => {
    const el = $('verseDots').querySelector('.dot-dot.live');
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, 60);
}
function setVerseMode(m) {
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
    goLiveScripture({ bookIdx: bi, ch, vFrom: v, vTo: v });
    return;
  }
  // range mode: first tap stores the start, second tap completes the range
  if (!rangeStart) {
    rangeStart = v;
    dot.classList.add('live');
    $('modeHint').textContent = `Start: verse ${v} — now tap the last number.`;
  } else {
    goLiveScripture({ bookIdx: bi, ch, vFrom: Math.min(rangeStart, v), vTo: Math.max(rangeStart, v) });
    rangeStart = 0;
  }
});
let rangeStart = 0;

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
  LS.set(K.settings, Object.assign(LS.get(K.settings, {}), { currentTranslation: file }));
  loadBible(file);
});

/* Scripture docks — Books / Chapters / Verses / Memory on one page */

/* book classification — color groups within the two testaments */
const BOOK_ABBS = ['GEN','EXO','LEV','NUM','DEU','JOS','JDG','RUT','1SA','2SA','1KI','2KI','1CH','2CH','EZR','NEH','EST','JOB','PSA','PRO','ECC','SNG','ISA','JER','LAM','EZK','DAN','HOS','JOL','AMO','OBA','JON','MIC','NAH','HAB','ZEP','HAG','ZEC','MAL','MAT','MRK','LUK','JHN','ACT','ROM','1CO','2CO','GAL','EPH','PHP','COL','1TH','2TH','1TI','2TI','TIT','PHM','HEB','JAS','1PE','2PE','1JN','2JN','3JN','JUD','REV'];
const BOOK_GROUPS_OT = [
  { key: 'torah',  label: 'Moses / Torah',    from: 0,  to: 4 },
  { key: 'othist', label: 'History',          from: 5,  to: 9 },
  { key: 'poetry', label: 'Wisdom & Poetry',  from: 10, to: 13 },
  { key: 'major',  label: 'Major Prophets',   from: 14, to: 16 },
  { key: 'minor',  label: 'Minor Prophets',   from: 17, to: 21 },
];
const BOOK_GROUPS_NT = [
  { key: 'gospels', label: 'Gospels',         from: 22, to: 25 },
  { key: 'acts',    label: 'History',         from: 26, to: 26 },
  { key: 'epist',   label: "Paul's Letters",  from: 27, to: 39 },
  { key: 'general', label: 'General Letters', from: 40, to: 44 },
  { key: 'rev',     label: 'Prophecy',        from: 45, to: 45 },
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
  goLiveScripture({ bookIdx: bi, ch, vFrom: 1, vTo: book.chapters[ch - 1].length });
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
  const cur = +$('chapterSelect').value;
  if (cur > 1) {
    $('chapterSelect').value = cur - 1;
    fillVerses(); renderChapterChips();
  } else if ($('bookSelect').value > 0) {
    $('bookSelect').value = $('bookSelect').value - 0 - 1;
    fillChapters();
  }
  if (verseMode === 'chapter') chapterLive(+$('bookSelect').value, +$('chapterSelect').value);
});
$('btnNextChapter').addEventListener('click', () => {
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
$('btnPrevVerse').addEventListener('click', () => stepVerse(-1));
$('btnNextVerse').addEventListener('click', () => stepVerse(1));
$('btnAddVerseService').addEventListener('click', () => {
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
const memory = [];   // [{ref, r, translation}] — newest first; lives only until reload
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
  const dup = memory.findIndex(m => m.translation === entry.translation &&
    m.r.bookIdx === entry.r.bookIdx && m.r.ch === entry.r.ch &&
    m.r.vFrom === entry.r.vFrom && m.r.vTo === entry.r.vTo);
  if (dup >= 0) memory.unshift(memory.splice(dup, 1)[0]);
  else memory.unshift(entry);
  renderMemory();
}
function renderMemory() {
  const box = $('memoryChips');
  const n = memory.length;
  box.classList.remove('m-md', 'm-sm', 'm-xs');
  if (n > 60) box.classList.add('m-xs');
  else if (n > 24) box.classList.add('m-sm');
  else if (n > 8) box.classList.add('m-md');
  box.innerHTML = n ? memory.map((m, i) =>
    `<button data-m="${i}" class="mem-chip${liveRef && m.r.bookIdx === liveRef.bookIdx && m.r.ch === liveRef.ch &&
      m.r.vFrom === liveRef.vFrom && m.r.vTo === liveRef.vTo ? ' live' : ''}" title="${esc(m.ref)}">${esc(m.short)}</button>`
  ).join('') : '<span class="dim">Nothing live yet this session.</span>';
}
$('memoryChips').addEventListener('click', async e => {
  const chip = e.target.closest('button[data-m]');
  if (!chip) return;
  const m = memory[+chip.dataset.m];
  if ($('translationSelect').value !== m.translation) {
    $('translationSelect').value = m.translation;
    LS.set(K.settings, Object.assign(LS.get(K.settings, {}), { currentTranslation: m.translation }));
    await loadBible(m.translation);
  }
  goLiveScripture(Object.assign({}, m.r));
});
$('btnMemoryClear').addEventListener('click', () => { memory.length = 0; renderMemory(); });

/* ---------- Quick jump — type "jn 3:16": book completes on 1-2 letters,
   chapter and verse jump in automatically as you type ---------- */

function suggestBook(q) {
  const key = normKey(q.replace(/^[\d.\-\s]+/, '').replace(/[^a-z ]/g, ''));
  if (!key) return [];
  const out = bible.books
    .map((b, i) => ({ i, k: normKey(b.name) }))
    .filter(o => o.k.startsWith(key) || o.k.includes(key))
    .map(o => o.i);
  if (!out.length && BOOK_ABBR[key] !== undefined) {
    const idx = bible.books.findIndex(b => normKey(b.name) === BOOK_ABBR[key]);
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
  const ch = Math.min(+dm[1], book.chapters.length);
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
  const vTo = dm[3] ? Math.min(+dm[3], vCount) : Math.min(+dm[2], vCount);
  goLiveScripture({ bookIdx: bi, ch, vFrom: Math.min(+dm[2], vTo), vTo: Math.max(+dm[2], vTo) });
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
  const locked = !!LS.get(K.settings, {}).panesLocked;
  document.body.classList.toggle('panes-locked', locked);
  $('btnLock').textContent = locked ? '🔒' : '🔓';
  $('btnLock').title = locked ? 'Layout locked ✓ — tap to unlock and resize the sections'
    : 'Layout unlocked — drag the grey gaps between sections, then tap to lock';
}
$('btnLock').addEventListener('click', () => {
  const s = LS.get(K.settings, {});
  s.panesLocked = !s.panesLocked;
  LS.set(K.settings, s);
  refreshLock();
});

/* ---------- docks: free size & position over a 12×12 grid, lock to freeze ---------- */
let dockSizes = LS.get(K.settings, {}).dockSizes || {};
const DOCK_DEFAULTS = {
  books: [5, 6], chapters: [3, 5], verses: [4, 6], text: [4, 6], memory: [4, 5],
  quickgo: [3, 3], search: [4, 4],
};
const DOCK_LABELS = {
  books: '📚 Books', chapters: '📑 Chapters', verses: '🔖 Verses', text: '🖥️ On the projector',
  memory: '🧠 Memory', quickgo: '⚡ Quick jump', search: '🔎 Whole-Bible search',
};
function hiddenDocks() { return LS.get(K.settings, {}).hiddenDocks || []; }
function applyDocks() {
  const grid = document.querySelector('.docks');
  if (!grid) return;
  (LS.get(K.settings, {}).dockOrder || []).forEach(key => {
    const el = grid.querySelector(`.dock[data-dock="${key}"]`);
    if (el) grid.appendChild(el);
  });
  const hidden = hiddenDocks();
  document.querySelectorAll('.docks .dock').forEach(d => {
    const key = d.dataset.dock;
    if (hidden.includes(key)) { d.style.display = 'none'; return; }
    d.style.display = '';
    const s = dockSizes[key] || DOCK_DEFAULTS[key] || [4, 5];
    d.style.gridColumn = `span ${Math.min(12, Math.max(2, s[0]))}`;
    d.style.gridRow = `span ${Math.min(12, Math.max(2, s[1]))}`;
  });
}
/* 🧩 Docks menu — pick which docks you want visible right now */
function renderDockMenu() {
  const menu = $('dockMenu');
  const hidden = hiddenDocks();
  menu.innerHTML = '<div class="more-group">Docks on screen</div>' +
    Object.keys(DOCK_LABELS).map(key =>
      `<button data-dockkey="${key}" class="dockmenu-item${hidden.includes(key) ? '' : ' on'}" title="${hidden.includes(key) ? 'Hidden — tap to show' : 'Visible — tap to hide'}">${hidden.includes(key) ? '◻' : '✓'} ${DOCK_LABELS[key]}</button>`).join('') +
    '<button data-dockkey="__all" class="dockmenu-item"><b>Show all</b></button>';
}
$('btnDocks').addEventListener('click', e => {
  e.stopPropagation();
  renderDockMenu();
  $('dockMenu').hidden = !$('dockMenu').hidden;
});
$('dockMenu').addEventListener('click', e => {
  const b = e.target.closest('button[data-dockkey]');
  if (!b) return;
  const key = b.dataset.dockkey;
  const s = LS.get(K.settings, {});
  if (key === '__all') s.hiddenDocks = [];
  else {
    const h = new Set(hiddenDocks());
    if (h.has(key)) { h.delete(key); flash(b, 'Now on screen'); }
    else if (document.querySelectorAll('.docks .dock').length - h.size > 1) h.add(key); else { flash(b, 'Keep at least one'); return; }
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
        saveDocks();
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
      const unitH = (g.height + gap) / 12;
      const startX = e.clientX, startY = e.clientY;
      const key = dock.dataset.dock;
      const s0 = dockSizes[key] || DOCK_DEFAULTS[key] || [4, 5];
      dock.classList.add('resizing');
      const move = ev => {
        const cols = Math.min(12, Math.max(2, Math.round(s0[0] + (ev.clientX - startX) / unitW)));
        const rows = Math.min(12, Math.max(2, Math.round(s0[1] + (ev.clientY - startY) / unitH)));
        dock.style.gridColumn = `span ${cols}`;
        dock.style.gridRow = `span ${rows}`;
        dockSizes[key] = [cols, rows];
      };
      const up = () => {
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        dock.classList.remove('resizing');
        saveDocks();
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
    <li data-id="${s.id}">
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
    <li data-id="${item.id}">
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
  $('themeSelect').innerHTML = themes.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('');
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
  $('themeBg').value = opt ? t.bg : (t.bgImage ? 'image' : $('themeBg').options[0].value);
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
  LS.set(K.settings, { currentThemeId });
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
  if (bgVal === 'image') { if (!t.bgImage) alert('Pick a custom image file first.'); }
  else t.bg = bgVal;
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
  const m = q.trim().toLowerCase().match(/^([1-3]?\s?[a-z.\s]+?)\s*(\d+)?\s*(?:[:.]\s*(\d+))?(?:\s*-\s*(\d+))?$/);
  if (!m) return null;
  const key = normKey(m[1]);
  let bookIdx = bible ? bible.books.findIndex(b => normKey(b.name) === key) : -1;
  if (bookIdx < 0 && BOOK_ABBR[key]) bookIdx = bible ? bible.books.findIndex(b => normKey(b.name) === BOOK_ABBR[key]) : -1;
  if (bookIdx < 0 && bible) {
    const candidates = bible.books.map((b, i) => ({ i, n: normKey(b.name) }))
      .filter(b => b.n.startsWith(key) && key.length >= 2);
    if (candidates.length === 1) bookIdx = candidates[0].i;
  }
  if (bookIdx < 0) return null;
  const ch = m[2] ? +m[2] : 1;
  const vFrom = m[3] ? +m[3] : 1;
  const vTo = m[4] ? +m[4] : vFrom;
  return { bookIdx, ch, vFrom: Math.min(vFrom, vTo), vTo: Math.max(vFrom, vTo) };
}
function goLiveScripture(r) {
  const book = bible.books[r.bookIdx];
  const ref = `${book.name} ${r.ch}:${r.vFrom}${r.vTo > r.vFrom ? '-' + r.vTo : ''}`;
  pushLive({ mode: 'normal', slides: scriptureToSlides(bible.books, r.bookIdx, r.ch, r.vFrom, r.vTo), index: 0, title: ref, themeId: currentThemeId });
  liveRef = r;
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
}
$('quickGo').addEventListener('input', renderQuickResults);
$('quickGo').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const box = $('quickGoResults');
    const items = (box._items && !box.hidden) ? box._items : quickSearch($('quickGo').value);
    if (items.length) quickGoLive(items[0]);
  } else if (e.key === 'Escape') {
    $('quickGoResults').hidden = true;
  }
});
$('quickGoResults').addEventListener('click', e => {
  const item = e.target.closest('.quickgo-item');
  if (!item) return;
  const items = $('quickGoResults')._items || [];
  const chosen = items[+item.dataset.i];
  if (chosen) quickGoLive(chosen);
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
  if (!s.dirtyLibrary) { s.dirtyLibrary = true; LS.set(K.settings, s); }
  scheduleSync();
}
function scheduleSync() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(autoSync, 15000);
  refreshSyncBadge();
}
function autoSync() {
  // work mode gate: Base/Local keep every change on this device;
  // Sync mode pushes to the cloud automatically
  if (workMode() && workMode() !== 'sync') { refreshSyncBadge(); return; }
  if (!(window.KOGGSync && window.KOGGSync.configured && window._koggUser && navigator.onLine)) return;
  if (!syncDirty()) { refreshSyncBadge(); return; }
  window.KOGGSync.push()
    .then(() => {
      const s = LS.get(K.settings, {});
      s.dirtyLibrary = false;
      LS.set(K.settings, s);
    })
    .catch(() => { })   // failed push retries on the next change
    .then(refreshSyncBadge);
}
function clearDirty() {
  const s = LS.get(K.settings, {});
  if (s.dirtyLibrary) { s.dirtyLibrary = false; LS.set(K.settings, s); }
  refreshSyncBadge();
}
function refreshSyncBadge() {
  const badge = $('syncBadge');
  if (!badge) return;
  if (!window._koggUser) { badge.textContent = ''; return; }
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
async function refreshUser() {
  if (!(window.KOGGSync && window.KOGGSync.configured)) { syncUI(); return; }
  try {
    window._koggUser = await window.KOGGSync.currentUser();
  } catch { window._koggUser = null; }
  syncUI();
  // signed in → the library keeps itself up to date without anyone pressing a button
  // (Sync mode — Base/Local keep changes on this device only)
  if (window._koggUser && navigator.onLine && workMode() === 'sync') {
    if (syncDirty()) scheduleSync();
    pullCloud(true);   // silent merge: songs, themes, plans, settings, logo
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
    await refreshUser();
    if (window._koggUser) {
      status.textContent = 'Signed in ✓ — your songs, themes and plans are syncing…';
      await pullCloud(true);
      status.textContent = 'Signed in ✓ — everything synced.';
    } else {
      status.textContent = 'Signed in.';
    }
  } catch (err) { status.textContent = 'Sign in failed: ' + err.message; }
});
$('btnSignOut').addEventListener('click', async () => {
  try { await window.KOGGSync.signOut(); } catch {}
  window._koggUser = null;
  syncUI();
});
async function pushCloud() {
  try {
    await window.KOGGSync.push();
    flash($('btnPushCloud'), 'Pushed ✓');
    clearDirty();
  } catch (err) { alert('Push failed: ' + err.message); }
}
async function pullCloud(silent) {
  try {
    const data = await window.KOGGSync.pull();
    if (!data) { if (!silent) flash($('btnPullCloud'), 'Cloud empty'); return; }
    if (data.assets && window.KOGGAssets) {
      for (const [id, v] of Object.entries(data.assets)) {
        if (v) await window.KOGGAssets.put(id, v);
      }
    }
    // songs merge: cloud-only songs are added, local songs and edits stay put —
    // nothing local is ever deleted by a pull
    if (data.songs) {
      const ids = new Set(songs.map(s => s.id));
      const fresh = data.songs.filter(s => s.id && !ids.has(s.id));
      if (fresh.length) { songs = songs.concat(fresh); LS.set(K.songs, songs); }
    }
    if (data.themes && data.themes.length) {
      const mineIds = new Set(themes.map(t => t.id));
      const freshThemes = data.themes.filter(t => !mineIds.has(t.id));
      if (freshThemes.length) { themes = themes.concat(freshThemes); LS.set(K.themes, themes); }
    }
    if (data.plans) LS.set(K.plans, Object.assign({}, LS.get(K.plans, {}), data.plans));
    if (data.settings) {
      const merged = Object.assign({}, LS.get(K.settings, {}), data.settings);
      delete merged.dirtyLibrary;
      LS.set(K.settings, merged);
      if (merged.currentThemeId && themes.some(t => t.id === merged.currentThemeId)) {
        currentThemeId = merged.currentThemeId;
      }
      if (merged.currentTranslation && merged.currentTranslation !== $('translationSelect').value) {
        $('translationSelect').value = merged.currentTranslation;
        loadBible(merged.currentTranslation);
      }
      refreshLogoStatus();
      refreshStrongsBtn();
    }
    renderSongList(); renderPlans(); renderThemesTab();
    pushLive({});   // refresh the display (logo/strongs may have changed)
    if (!silent) flash($('btnPullCloud'), 'Pulled ✓');
  } catch (err) { if (!silent) alert('Pull failed: ' + err.message); }
}
$('btnPushCloud').addEventListener('click', pushCloud);
$('btnPullCloud').addEventListener('click', () => pullCloud(false));
refreshUser();

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
  $('modeChip').textContent = MODE_LABEL[m] || 'Choose mode';
  $('modeChip').classList.toggle('unset', !m);
  if (typeof updateAddVersionsGate === 'function') updateAddVersionsGate();
}
function setWorkMode(m) {
  const s = LS.get(K.settings, {});
  s.mode = m;
  LS.set(K.settings, s);
  refreshModeChip();
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
  $('moreMenu').hidden = true;
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
$('btnMode').addEventListener('click', () => { showGate(); $('moreMenu').hidden = true; });
async function gateAuth(up) {
  const st = $('gateStatus');
  st.textContent = 'Connecting…';
  st.style.color = '';
  try {
    if (up) await window.KOGGSync.signUp($('gateEmail').value.trim(), $('gatePass').value);
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
function next() { if (live.mode === 'normal' && live.index < live.slides.length - 1) pushLive({ index: live.index + 1 }); }
function prev() { if (live.mode === 'normal' && live.index > 0) pushLive({ index: live.index - 1 }); }
$('btnFloatNext').addEventListener('click', next);
$('btnFloatPrev').addEventListener('click', prev);
$('btnBlank').addEventListener('click', () => pushLive({ mode: live.mode === 'blank' ? 'normal' : 'blank' }));
$('btnLogo').addEventListener('click', () => pushLive({ mode: live.mode === 'logo' ? 'normal' : 'logo' }));
$('btnOpenDisplay').addEventListener('click', openDisplayWindow);

/* Open the output window directly on the extended screen when one exists.
   Uses the Window Management API (Chrome/Edge) — asks permission once. */
async function openDisplayWindow() {
  let features = '';
  let usedScreenApi = false;
  try {
    if ('getScreenDetails' in window) {
      const details = await window.getScreenDetails();
      const cur = details.currentScreen;
      const other = details.screens.find(s =>
        s.left !== cur.left || s.top !== cur.top);
      if (other) {
        features = `left=${other.left},top=${other.top},width=${other.width},height=${other.height}`;
        usedScreenApi = true;
      }
    }
  } catch { /* permission denied — fall through to normal window */ }
  const w = window.open('display.html', 'kogg_display', features || undefined);
  try { w.focus(); } catch {}
  if (!usedScreenApi) {
    flash($('btnOpenDisplay'), 'Tip: press F11 on the output');
  }
}
document.addEventListener('keydown', e => {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
  if (e.key === '/') { e.preventDefault(); $('quickGo').focus(); return; }
  if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); next(); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
  else if (e.key.toLowerCase() === 'b') $('btnBlank').click();
  else if (e.key.toLowerCase() === 'l') $('btnLogo').click();
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

function voiceShow(text) { flash($('btnVoice'), '→ ' + text); }

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
        flash($('btnVoice'), 'Mic blocked');
        alert('Microphone permission denied — allow mic access to use voice control.\nNote: voice input needs an internet connection in Chrome/Edge.');
      }
    };
    rec.start();
    voiceOn = true;
    voiceBtnSync(true);
    flash($('btnVoice'), 'Listening…');
  } catch (err) {
    alert('Could not start voice control: ' + err.message);
  }
}
function stopVoice() {
  voiceOn = false;
  try { if (rec) rec.stop(); } catch {}
}
$('btnVoice').addEventListener('click', () => voiceOn ? stopVoice() : startVoice());
$('btnVoice2').addEventListener('click', () => voiceOn ? stopVoice() : startVoice());
function voiceBtnSync(on) {
  $('btnVoice').classList.toggle('active', on);
  $('btnVoice2').classList.toggle('active', on);
}

/* Quick font size / alignment on the current theme */
function patchTheme(patch) {
  const t = themeById(currentThemeId);
  Object.assign(t, patch);
  LS.set(K.themes, themes);
  pushLive({ themeId: currentThemeId });
}
$('btnFontSizeUp').addEventListener('click', () => {
  const t = themeById(currentThemeId);
  patchTheme({ fontSize: Math.min(15, (+t.fontSize || 7) + 0.5) });
  flash($('btnFontSizeUp'), `A+ ${t.fontSize}`);
});
$('btnFontSizeDown').addEventListener('click', () => {
  const t = themeById(currentThemeId);
  patchTheme({ fontSize: Math.max(3, (+t.fontSize || 7) - 0.5) });
  flash($('btnFontSizeDown'), `A− ${t.fontSize}`);
});
$('btnAlign').addEventListener('click', () => {
  const t = themeById(currentThemeId);
  const nextAlign = (t.align === 'left') ? 'center' : 'left';
  patchTheme({ align: nextAlign });
  flash($('btnAlign'), nextAlign === 'left' ? '⬅ Left' : '⬌ Center');
});

/* Light / dark operator mode */
function applyOperatorTheme(light) {
  document.body.classList.toggle('light', light);
  $('btnTheme').textContent = light ? '☀' : '🌙';
  LS.set(K.settings, Object.assign(LS.get(K.settings, {}), { light }));
}
$('btnTheme').addEventListener('click', () =>
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
    ? list.map(v => `<div class="ver-row"><span>📗 ${esc(v.name)}</span><button data-delver="${v.assetId}" class="danger" title="Remove this version from this device">✕</button></div>`).join('')
    : '<span class="dim">No added versions yet.</span>';
  updateAddVersionsGate();
}
function updateAddVersionsGate() {
  const m = workMode();
  const note = $('addVersionsModeNote');
  if (!note) return;
  if (m === 'base') note.textContent = 'Not available in Base Mode — switch to Sync or Local to add versions.';
  else if (m === 'sync') note.textContent = 'Added versions stay on this device (the cloud library keeps songs/themes/plans).';
  else note.textContent = 'Added versions stay on this device.';
  const btn = $('btnAddBible');
  if (btn) { btn.disabled = m === 'base'; btn.title = m === 'base' ? 'Switch to Sync or Local mode to add versions' : ''; }
}
$('btnAddBible').addEventListener('click', async () => {
  if (workMode() === 'base') { flash($('btnAddBible'), 'Sync/Local only'); return; }
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
  const s = LS.get(K.settings, {});
  s.customVersions = (s.customVersions || []).filter(v => v.assetId !== id);
  LS.set(K.settings, s);
  try { if (window.KOGGAssets) await window.KOGGAssets.del(id); } catch {}
  rebuildCustomOptions();
  if ($('translationSelect').value === 'idb:' + id) {
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
  flash($('btnLogoClear'), 'Removed ✓');
});
refreshLogoStatus();

/* ---------- starter hymns (bundled, all in the public domain) ---------- */
async function addStarterHymns() {
  let added = 0;
  try {
    const res = await fetch('data/hymns.json');
    const pack = await res.json();
    const have = new Set(songs.map(s => s.title.toLowerCase()));
    for (const h of (pack.hymns || [])) {
      if (have.has(h.title.toLowerCase())) continue;
      songs.push({ id: uid(), title: h.title, author: h.author || '', lyrics: h.lyrics });
      have.add(h.title.toLowerCase());
      added++;
    }
    if (added) LS.set(K.songs, songs);
    renderSongList();
  } catch { /* offline — first-run seeding retries next visit once cached */ }
  return added;
}
$('btnStarterHymns').addEventListener('click', async () => {
  const n = await addStarterHymns();
  flash($('btnStarterHymns'), n ? `+${n} hymns ✓` : 'No new ones ✓');
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
$('btnExport').addEventListener('click', () => {
  const data = { exported: new Date().toISOString(), songs, themes, service, plans: LS.get(K.plans, {}) };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'kogg-presenter-backup.json';
  a.click();
});
$('btnImport').addEventListener('click', () => $('importFile').click());
$('importFile').addEventListener('change', () => {
  const file = $('importFile').files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const d = JSON.parse(reader.result);
      if (d.songs) { songs = songs.concat(d.songs.filter(s => !songs.some(x => x.id === s.id))); LS.set(K.songs, songs); }
      if (d.plans) LS.set(K.plans, Object.assign(LS.get(K.plans, {}), d.plans));
      alert('Import complete.');
      renderSongList(); renderPlans();
    } catch { alert('Invalid backup file.'); }
  };
  reader.readAsText(file);
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
const savedSettings = LS.get(K.settings, {});
rebuildCustomOptions();      // custom versions must exist in the select before restore
if (savedSettings.currentTranslation) $('translationSelect').value = savedSettings.currentTranslation;
if (savedSettings.light) applyOperatorTheme(true);

/* first run: quietly add the bundled public-domain starter hymns */
(async function seedStarterHymns() {
  if (savedSettings.starterSeeded) return;
  const n = await addStarterHymns();
  LS.set(K.settings, Object.assign(LS.get(K.settings, {}), { starterSeeded: true }));
  if (n) refreshSyncBadge();
})();

renderSongList();
renderService();
renderPlans();
renderPreview();
renderMemory();
window.__koggBoot = true;
refreshSyncBadge();
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
loadBible($('translationSelect').value);
setVerseMode(savedSettings.verseMode || 'verse');
applyDocks();
initSplitters();
initDockDrag();
refreshLock();
