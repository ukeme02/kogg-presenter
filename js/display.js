/* KOGG Presenter — output/display logic */
'use strict';

const $ = id => document.getElementById(id);
const screenEl = $('screen');
const textEl = $('slideText');
const labelEl = $('slideLabel');
const OVERLAY = new URLSearchParams(location.search).has('overlay'); // OBS transparent mode

function themeById(themes, id) { return themes.find(t => t.id === id) || themes[0]; }
function getThemes() {
  try { const t = JSON.parse(localStorage.getItem('cp_themes')); if (t && t.length) return t; } catch {}
  return [{ id: 't1', name: 'Default', bg: 'linear-gradient(135deg,#1a2a6c,#b21f1f,#fdbb2d)', bgImage: '', textColor: '#fff', font: 'Georgia, serif', fontSize: 7 }];
}
function getLive() {
  try { return JSON.parse(localStorage.getItem('cp_live')) || { mode: 'logo', slides: [], index: 0 }; }
  catch { return { mode: 'logo', slides: [], index: 0 }; }
}

function applyTheme(state) {
  const t = themeById(getThemes(), state.themeId);
  if (OVERLAY) {
    screenEl.style.background = 'transparent';   // OBS composites over video
  } else {
    screenEl.style.background = t.bgImage ? `url("${t.bgImage}") center/cover no-repeat` : t.bg;
  }
  screenEl.style.color = t.textColor;
  textEl.style.fontFamily = t.font;
  labelEl.style.fontFamily = t.font;
  textEl.style.fontSize = t.fontSize + 'vh';
  textEl.style.textAlign = t.align || 'center';
  textEl.style.fontWeight = t.weight || '400';
  return t;
}

function fitText() {
  // shrink until the text fits vertically
  let size = parseFloat(getComputedStyle(textEl).fontSize);
  let guard = 40;
  while (guard-- > 0 && (textEl.scrollHeight > textEl.clientHeight || textEl.scrollWidth > textEl.clientWidth) && size > 12) {
    size -= 2;
    textEl.style.fontSize = size + 'px';
  }
}

function render(state) {
  const blankOn = state.mode === 'blank' && !OVERLAY;   // "blank" means show nothing in OBS overlay mode
  $('countdown').classList.toggle('on', state.mode === 'countdown' && !OVERLAY);
  $('logoScreen').classList.toggle('on', state.mode === 'logo' && !OVERLAY);
  $('blankScreen').classList.toggle('on', blankOn);
  const showSlide = state.mode === 'normal' && state.slides.length > 0;
  textEl.style.display = showSlide ? '' : 'none';
  labelEl.style.display = showSlide ? '' : 'none';
  if (state.mode === 'normal') {
    const t = applyTheme(state);
    const slide = state.slides[state.index] || { text: '', label: '' };
    textEl.textContent = slide.text;
    labelEl.textContent = slide.label;
    textEl.style.fontSize = t.fontSize + 'vh';
    requestAnimationFrame(fitText);
  } else if (!OVERLAY) {
    applyLogoTheme(state);
  }
  renderLowerThird(state.lowerThird);
  speakCurrent(state);
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

function applyLogoTheme(state) {
  const t = themeById(getThemes(), state.themeId);
  if (OVERLAY) return;
  if (state.mode === 'countdown') {
    $('countdown').style.background = t.bgImage ? `url("${t.bgImage}") center/cover no-repeat` : t.bg;
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

/* ---------- AI speech engine (lives on the output machine so the room hears it) ---------- */
let lastSpokenToken = null;
function speakCurrent(state) {
  if (!('speechSynthesis' in window)) return;
  if (!state.speak || state.mode !== 'normal' || !state.slides.length) {
    speechSynthesis.cancel();
    lastSpokenToken = null;
    return;
  }
  const slide = state.slides[state.index];
  const token = `${state.index}|${slide.text}`;
  if (token === lastSpokenToken) return;      // same slide re-rendered — don't repeat
  lastSpokenToken = token;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(`${slide.label}. ${slide.text}`);
  u.rate = 0.95;
  u.pitch = 1;
  u.onend = () => { if (channel && state.speak) channel.postMessage({ type: 'speakDone' }); };
  u.onerror = () => { if (channel && state.speak) channel.postMessage({ type: 'speakDone' }); };
  speechSynthesis.speak(u);
}
if (!OVERLAY) document.addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else document.documentElement.requestFullscreen().catch(() => {});
});
document.addEventListener('keydown', e => {
  if (e.key === 'F11') return; // let the browser handle it
});

if (OVERLAY) document.body.classList.add('overlay');
render(getLive());
