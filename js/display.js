/* KOGG Presenter — output/display logic */
'use strict';

const $ = id => document.getElementById(id);
const screenEl = $('screen');
const textEl = $('slideText');
const labelEl = $('slideLabel');
const OVERLAY = new URLSearchParams(location.search).has('overlay'); // OBS transparent mode

function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function plain(s) { return String(s).replace(/\[(?:G|H)\d{1,5}]/g, '').replace(/ {2,}/g, ' '); }

function themeById(themes, id) { return themes.find(t => t.id === id) || themes[0]; }
function getThemes() {
  try { const t = JSON.parse(localStorage.getItem('cp_themes')); if (t && t.length) return t; } catch {}
  return [{ id: 't1', name: 'Black', bg: '#000000', bgImage: '', textColor: '#fff', font: "'Nunito Sans Expanded', Georgia, serif", fontSize: 7, weight: '700' }];
}
function getLive() {
  try { return JSON.parse(localStorage.getItem('cp_live')) || { mode: 'blank', slides: [], index: 0 }; }
  catch { return { mode: 'logo', slides: [], index: 0 }; }
}
function getSettings() {
  try { return JSON.parse(localStorage.getItem('cp_settings')) || {}; }
  catch { return {}; }
}

/* Big images (church logo, theme backgrounds) live in IndexedDB via js/idb.js;
   the theme/settings keys only carry an asset id. Cache + re-apply when resolved. */
const bgCache = new Map();   // assetId -> dataURL
function themeBgUrl(t) {
  if (t.bgImageId) {
    if (bgCache.has(t.bgImageId)) return bgCache.get(t.bgImageId);
    preloadBg(t.bgImageId);
    return '';
  }
  return t.bgImage;
}
async function preloadBg(id) {
  if (!window.KOGGAssets || bgCache.has(id)) return;
  const v = await window.KOGGAssets.get(id);
  if (v) {
    bgCache.set(id, v);
    const state = getLive();       // re-render with the image
    applyTheme(state);
    applyBackdrops(state);
  }
}

function applyTheme(state) {
  const t = themeById(getThemes(), state.themeId);
  if (OVERLAY) {
    screenEl.style.background = 'transparent';   // OBS composites over video
  } else {
    const url = themeBgUrl(t);
    screenEl.style.background = url ? `url("${url}") center/cover no-repeat` : t.bg;
  }
  screenEl.style.color = t.textColor;
  textEl.style.fontFamily = t.font;
  labelEl.style.fontFamily = t.font;
  textEl.style.fontSize = t.fontSize + 'vh';
  textEl.style.textAlign = t.align || 'center';
  textEl.style.fontWeight = t.weight || '700';
  return t;
}

function fitText() {
  if (textEl.style.display === 'none') return;
  // The selected font size is the upper bound; shrink only when content overflows.
  const maximum = parseFloat(getComputedStyle(textEl).fontSize) || 24;
  let low = 8, high = Math.max(8, maximum);
  const fits = () => textEl.scrollHeight <= textEl.clientHeight + 1 && textEl.scrollWidth <= textEl.clientWidth + 1;
  for (let i = 0; i < 12; i++) {
    const size = (low + high) / 2;
    textEl.style.fontSize = size + 'px';
    if (fits()) low = size; else high = size;
  }
  textEl.style.fontSize = low + 'px';
}

function render(state) {
  const blankOn = state.mode === 'blank' && !OVERLAY;   // "blank" means show nothing in OBS overlay mode
  $('countdown').classList.toggle('on', state.mode === 'countdown' && !OVERLAY);
  renderLogo(state);
  $('blankScreen').classList.toggle('on', blankOn);
  const showSlide = state.mode === 'normal' && state.slides.length > 0;
  const card = state.mode === 'normal' && state.strongsShowing && state.strongsCard ? state.strongsCard : null;
  $('strongsCard').classList.toggle('on', !!card);
  textEl.style.display = showSlide && !card ? '' : 'none';
  labelEl.style.display = showSlide && !card ? '' : 'none';
  if (state.mode === 'normal') {
    const t = applyTheme(state);
    if (card) {
      renderStrongsCard(card, t);   // the projector shows the word meaning — the verse stays queued
    } else {
      const slide = state.slides[state.index] || { text: '', label: '' };
      textEl.innerHTML = renderSlideText(slide, state);   // always clean text — numbers live only in the operator preview
      labelEl.textContent = plain(slide.label);
      textEl.style.fontSize = t.fontSize + 'vh';
      requestAnimationFrame(fitText);
    }
  } else if (!OVERLAY) {
    applyBackdrops(state);
  }
  renderLowerThird(state.mode === 'blank' ? null : state.lowerThird);
}

/* word highlight — the operator drags over words in the preview; the matching
   verse (label ends "…:<verse>") gets those words marked, live, on screen. */
function renderSlideText(slide, state) {
  const words = plain(slide.text).trim().split(/([\r\n]+)/).flatMap(part => /^[\r\n]+$/.test(part) ? [part] : part.split(/[^\S\r\n]+/).filter(Boolean));
  let hl = null;
  if (state.highlight) {
    const m = /:(\d+)$/.exec(slide.label || '');
    if (m && +m[1] === state.highlight.v) hl = state.highlight;
  }
  let wordIndex = 0;
  return words.map(w => {
    if (/^[\r\n]+$/.test(w)) return w;
    wordIndex++;
    return hl && wordIndex >= hl.wFrom && wordIndex <= hl.wTo ? `<mark class="whl">${esc(w)}</mark>` : esc(w);
  }).join(' ').replace(/ *\n */g, '\n');
}

/* Strong's word card — shown when the operator taps a word number in the
   "On the projector" preview. Styled with the live theme. */
function renderStrongsCard(card, t) {
  const box = $('strongsCard');
  box.style.color = t.textColor;
  box.style.fontFamily = t.font;
  box.innerHTML = `
    <div class="sc-top"><span class="sc-num">${esc(card.sn)}</span><span class="sc-lang">${esc(card.lang)} word</span></div>
    ${card.word ? `<div class="sc-word${card.lang === 'Hebrew' ? ' rtl' : ''}">${esc(card.word)}</div>` : ''}
    ${card.translit ? `<div class="sc-translit">${esc(card.translit)}${card.pron ? ' &nbsp;·&nbsp; ' + esc(card.pron) : ''}</div>` : ''}
    ${card.def ? `<div class="sc-def">${esc(card.def)}</div>` : ''}
    ${card.kjv ? `<div class="sc-kjv"><b>KJV renders:</b> ${esc(card.kjv)}</div>` : ''}
    ${card.deriv ? `<div class="sc-deriv"><b>From:</b> ${esc(card.deriv)}</div>` : ''}
    ${card.ref ? `<div class="sc-ref">${esc(card.ref)}${card.verse ? '<span class="sc-verse">“' + esc(card.verse) + '”</span>' : ''}</div>` : ''}
    <div class="sc-hint">tap the same number in the console to return to the verse</div>`;
}

/* church logo screen — custom logo image if the operator uploaded one */
let logoToken = 0;
async function renderLogo(state) {
  const on = state.mode === 'logo' && !OVERLAY;
  $('logoScreen').classList.toggle('on', on);
  if (!on) return;
  const token = ++logoToken;
  const s = getSettings();
  let src = '';
  if (s.logoId && window.KOGGAssets) src = (await window.KOGGAssets.get(s.logoId)) || '';
  if (!src && s.logoImage) src = s.logoImage;
  if (token !== logoToken) return;   // superseded by a newer render
  const img = $('logoImg');
  const svg = $('logoSvg');
  if (src) { img.src = src; img.hidden = false; svg.hidden = true; }
  else { img.hidden = true; svg.hidden = false; }
  $('logoName').textContent = s.logoName || 'KOGG Presenter';
}

function renderLowerThird(lt) {
  const on = !!(lt && lt.on && (lt.l1 || lt.l2));
  const el = $('lowerThird');
  el.classList.toggle('lt-hidden', !on);
  if (on) {
    $('ltLine1').textContent = lt.l1 || '';
    $('ltLine2').textContent = lt.l2 || '';
    $('ltLine2').style.display = lt.l2 ? '' : 'none';
    el.classList.remove('lt-animate');      // restart slide-in animation
    void el.offsetWidth;
    el.classList.add('lt-animate');
  }
}

function applyBackdrops(state) {
  const t = themeById(getThemes(), state.themeId);
  if (OVERLAY) return;
  if (state.mode === 'countdown') {
    const url = themeBgUrl(t);
    $('countdown').style.background = url ? `url("${url}") center/cover no-repeat` : t.bg;
    $('countdown').style.color = t.textColor;
  }
}

/* countdown ticker */
let lastSec = -1;
setInterval(() => {
  const state = getLive();
  if (state.mode !== 'countdown') return;
  const remain = Math.max(0, Math.floor(((state.until || 0) - Date.now()) / 1000));
  if (remain !== lastSec) {
    lastSec = remain;
    const m = String(Math.floor(remain / 60)).padStart(2, '0');
    const s = String(remain % 60).padStart(2, '0');
    $('countdownTime').textContent = `${m}:${s}`;
  }
  $('clock').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}, 500);

/* sync */
const channel = ('BroadcastChannel' in window) ? new BroadcastChannel('kogg-presenter') : null;
if (channel) {
  channel.onmessage = e => {
    if (e.data && e.data.type) return;   // messages from other displays, not state
    render(e.data);
  };
}
window.addEventListener('storage', e => { if (e.key === 'cp_live') render(getLive()); });

if (!OVERLAY) document.addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else document.documentElement.requestFullscreen().catch(() => {});
});
document.addEventListener('keydown', e => {
  if (e.key === 'F11') return; // let the browser handle it
});

if (OVERLAY) { document.documentElement.classList.add('overlay'); document.body.classList.add('overlay'); }
render(getLive());

window.addEventListener('resize', () => render(getLive()));
if (document.fonts?.ready) document.fonts.ready.then(() => render(getLive()));
