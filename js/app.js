/* KOGG Presenter — operator logic */
'use strict';

/* ---------- storage helpers ---------- */
const LS = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  set(key, value) { localStorage.setItem(key, JSON.stringify(value)); },
};
const K = { songs: 'cp_songs', themes: 'cp_themes', service: 'cp_service',
            settings: 'cp_settings', live: 'cp_live', plans: 'cp_plans' };

/* ---------- shared slide helpers (kept in sync with display.js) ---------- */
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
let songs = LS.get(K.songs, []);
let themes = LS.get(K.themes, null);
let service = LS.get(K.service, []);   // [{id,type,title,slides:[{text,label}]}]
let live = LS.get(K.live, { mode: 'logo', slides: [], index: 0, lowerThird: { on: false, l1: '', l2: '' } });
let editingSongId = null;

const DEFAULT_THEMES = [
  { id: 't1', name: 'Sunset',      bg: 'linear-gradient(135deg,#1a2a6c,#b21f1f,#fdbb2d)', bgImage: '', textColor: '#ffffff', font: 'Georgia, serif', fontSize: 7, align: 'center', weight: '400' },
  { id: 't2', name: 'Deep Blue',   bg: 'linear-gradient(135deg,#0f2027,#203a43,#2c5364)', bgImage: '', textColor: '#ffffff', font: 'Georgia, serif', fontSize: 7, align: 'center', weight: '400' },
  { id: 't3', name: 'Emerald',     bg: 'linear-gradient(135deg,#134e5e,#71b280)',          bgImage: '', textColor: '#ffffff', font: 'Georgia, serif', fontSize: 7, align: 'center', weight: '400' },
  { id: 't4', name: 'Plain Black', bg: 'linear-gradient(135deg,#000000,#434343)',          bgImage: '', textColor: '#ffffff', font: 'Arial, sans-serif', fontSize: 7, align: 'center', weight: '400' },
];
if (!themes || !themes.length) { themes = DEFAULT_THEMES; LS.set(K.themes, themes); }
// ensure older saved themes have the new fields
themes = themes.map(t => Object.assign({ align: 'center', weight: '400' }, t));
let currentThemeId = LS.get(K.settings, {}).currentThemeId || themes[0].id;

const $ = id => document.getElementById(id);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* ---------- sync to display ---------- */
const channel = ('BroadcastChannel' in window) ? new BroadcastChannel('kogg-presenter') : null;
function pushLive(patch = {}) {
  live = Object.assign({}, live, patch);
  LS.set(K.live, live);
  if (channel) channel.postMessage(live);
  renderPreview();
}
// messages coming back from the output screen (speech engine lives there)
if (channel) channel.onmessage = e => {
  const msg = e.data;
  if (msg && msg.type === 'speakDone' && live.speak && live.mode === 'normal'
      && live.index < live.slides.length - 1) {
    pushLive({ index: live.index + 1 });
  }
};

/* ---------- preview ---------- */
function renderPreview() {
  const now = live.mode === 'normal' ? live.slides[live.index] : null;
  $('previewNow').textContent = live.mode === 'blank' ? '— BLANK —'
    : live.mode === 'logo' ? '— LOGO —'
    : live.mode === 'countdown' ? '— COUNTDOWN —'
    : now ? `${now.label} — ${now.text}` : 'Ready';
  $('previewNext').textContent = live.mode === 'normal' && live.slides[live.index + 1]
    ? `${live.slides[live.index + 1].label} — ${live.slides[live.index + 1].text}` : '—';
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

/* =========================================================
   SCRIPTURE
========================================================= */
async function loadBible(file) {
  $('scripturePreview').textContent = 'Loading Bible…';
  const res = await fetch(file);
  bible = await res.json();
  const bookSel = $('bookSelect');
  bookSel.innerHTML = bible.books.map((b, i) => `<option value="${i}">${b.name}</option>`).join('');
  fillChapters();
  $('scripturePreview').textContent = `Loaded ${bible.translation} — ${bible.books.length} books (offline).`;
}
function fillChapters() {
  const book = bible.books[+$('bookSelect').value];
  $('chapterSelect').innerHTML = book.chapters.map((_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('');
  fillVerses();
}
function fillVerses() {
  const book = bible.books[+$('bookSelect').value];
  const ch = +$('chapterSelect').value;
  const count = book.chapters[ch - 1].length;
  const opts = Array.from({ length: count }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('');
  $('verseFrom').innerHTML = opts;
  $('verseTo').innerHTML = opts;
  $('verseFrom').value = 1;
  $('verseTo').value = 1;
}
function currentScriptureRange() {
  return {
    bookIdx: +$('bookSelect').value,
    ch: +$('chapterSelect').value,
    vFrom: Math.min(+$('verseFrom').value, +$('verseTo').value),
    vTo: Math.max(+$('verseFrom').value, +$('verseTo').value),
  };
}
function updateScripturePreview() {
  if (!bible) return;
  const r = currentScriptureRange();
  const book = bible.books[r.bookIdx];
  const lines = [];
  for (let v = r.vFrom; v <= r.vTo; v++) {
    const t = book.chapters[r.ch - 1][v - 1];
    if (t == null) break;
    lines.push(`${v} ${t}`);
  }
  const title = `${book.name} ${r.ch}:${r.vFrom}${r.vTo > r.vFrom ? '-' + r.vTo : ''}`;
  $('scripturePreview').textContent = title + '\n\n' + lines.join('\n');
  $('scripturePreview').dataset.title = title;
}
$('bookSelect').addEventListener('change', fillChapters);
$('chapterSelect').addEventListener('change', fillVerses);
$('verseFrom').addEventListener('change', updateScripturePreview);
$('verseTo').addEventListener('change', updateScripturePreview);
$('translationSelect').addEventListener('change', () => {
  const file = $('translationSelect').value;
  LS.set(K.settings, Object.assign(LS.get(K.settings, {}), { currentTranslation: file }));
  loadBible(file).then(updateScripturePreview);
});

$('btnGoScripture').addEventListener('click', () => {
  const r = currentScriptureRange();
  const book = bible.books[r.bookIdx];
  const slides = scriptureToSlides(bible.books, r.bookIdx, r.ch, r.vFrom, r.vTo);
  pushLive({ mode: 'normal', slides, index: 0, title: `${book.name} ${r.ch}:${r.vFrom}${r.vTo > r.vFrom ? '-' + r.vTo : ''}`, themeId: currentThemeId });
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
  reader.onload = () => {
    const t = themeById($('themeSelect').value);
    t.bgImage = reader.result;   // dataURL
    LS.set(K.themes, themes);
    flash($('themeBgImage'), 'Image loaded ✓');
  };
  reader.readAsDataURL(file);
});
$('btnNewTheme').addEventListener('click', () => {
  const t = { id: uid(), name: 'New Theme', bg: 'linear-gradient(135deg,#0f2027,#203a43,#2c5364)',
              bgImage: '', textColor: '#ffffff', font: 'Georgia, serif', fontSize: 7, align: 'center', weight: '400' };
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
  LS.set(K.settings, { currentThemeId });
  pushLive({ themeId: currentThemeId });
  flash($('btnApplyTheme'), 'Applied ✓');
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
  // keep the scripture tab in sync so the operator sees what's live
  $('bookSelect').value = r.bookIdx; fillChapters();
  $('chapterSelect').value = r.ch; fillVerses();
  $('verseFrom').value = r.vFrom; $('verseTo').value = r.vTo;
  updateScripturePreview();
}
function quickGoLive(item) {
  if (item.type === 'scripture') goLiveScripture(item.ref);
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
      snippet: (book.chapters[r.ch - 1][r.vFrom - 1] || '').slice(0, 80),
      ref,
    });
  }
  const ql = q.trim().toLowerCase();
  songs.filter(s => s.title.toLowerCase().includes(ql))
    .slice(0, 5)
    .forEach(s => out.push({ type: 'song', icon: '🎵', label: s.title, snippet: (s.author || 'song'), song: s }));
  return out.slice(0, 7);
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
function syncUI() {
  const cfgOk = window.KOGGSync && window.KOGGSync.configured;
  $('authNotConfigured').hidden = !!cfgOk;
  $('authForm').hidden = !cfgOk || !!window._koggUser;
  $('authSignedIn').hidden = !cfgOk || !window._koggUser;
  if (window._koggUser) $('authWho').textContent = `Signed in as ${window._koggUser.email}`;
}
async function refreshUser() {
  if (!(window.KOGGSync && window.KOGGSync.configured)) { syncUI(); return; }
  try {
    window._koggUser = await window.KOGGSync.currentUser();
  } catch { window._koggUser = null; }
  syncUI();
}
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
    status.textContent = window._koggUser ? 'Signed in ✓ — pulling your library…' : 'Signed in.';
    if (window._koggUser) await pullCloud(true);
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
  } catch (err) { alert('Push failed: ' + err.message); }
}
async function pullCloud(silent) {
  try {
    const data = await window.KOGGSync.pull();
    if (!data) { if (!silent) flash($('btnPullCloud'), 'Cloud empty'); return; }
    if (data.songs) { songs = data.songs; LS.set(K.songs, songs); }
    if (data.themes && data.themes.length) { themes = data.themes; LS.set(K.themes, themes); }
    if (data.plans) LS.set(K.plans, data.plans);
    if (data.settings && data.settings.currentThemeId) {
      currentThemeId = data.settings.currentThemeId;
      LS.set(K.settings, Object.assign(LS.get(K.settings, {}), { currentThemeId }));
    }
    renderSongList(); renderPlans(); renderThemesTab();
    if (!silent) flash($('btnPullCloud'), 'Pulled ✓');
  } catch (err) { if (!silent) alert('Pull failed: ' + err.message); }
}
$('btnPushCloud').addEventListener('click', pushCloud);
$('btnPullCloud').addEventListener('click', () => pullCloud(false));
refreshUser();

/* =========================================================
   GLOBAL CONTROLS
========================================================= */
function next() { if (live.mode === 'normal' && live.index < live.slides.length - 1) pushLive({ index: live.index + 1 }); }
function prev() { if (live.mode === 'normal' && live.index > 0) pushLive({ index: live.index - 1 }); }
$('btnNext').addEventListener('click', next);
$('btnPrev').addEventListener('click', prev);
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
    $('previewNow').textContent = 'Tip: on the output window press F11; or Win+Shift+→ to send it to the projector.';
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

/* AI speech — the output screen does the talking, we just toggle and auto-advance */
$('btnSpeak').addEventListener('click', () => {
  pushLive({ speak: !live.speak });
  $('btnSpeak').classList.toggle('active', !!live.speak);
  flash($('btnSpeak'), live.speak ? 'Speaking ✓' : 'Stopped');
});

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
const savedSettings = LS.get(K.settings, {});
if (savedSettings.currentTranslation) $('translationSelect').value = savedSettings.currentTranslation;
if (savedSettings.light) applyOperatorTheme(true);
renderSongList();
renderService();
renderPlans();
renderPreview();
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
loadBible($('translationSelect').value).then(updateScripturePreview);
