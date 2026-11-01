/* KOGG Presenter — output/display logic */
'use strict';

const $ = id => document.getElementById(id);
const screenEl = $('screen');
const textEl = $('slideText');
const contentEl = $('slideContent');
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
  let v;try{v=await window.KOGGAssets.get(id);}catch{return;}
  if (v) {
    bgCache.set(id, v);
    const state = getLive();       // re-render with the image
    applyTheme(state);
    applyBackdrops(state);
  }
}

function displayNumber(value,fallback,min,max){const n=Number(value);return value!==undefined&&value!==null&&Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;}
function themeBackground(t){const src=themeBgUrl(t),dim=displayNumber(t.dim,0,0,100)/100,shade=`linear-gradient(rgba(0,0,0,${dim}),rgba(0,0,0,${dim}))`;
 return src?`${shade},url("${src}") center/${t.imageFit==='contain'?'contain':'cover'} no-repeat ${t.bg?.startsWith('#')?t.bg:'#000'}`:`${shade},${t.bg?.startsWith('#')?`linear-gradient(${t.bg},${t.bg})`:t.bg||'#000'}`;
}
function applyTheme(state) {
  const t = themeById(getThemes(), state.themeId);
  if (OVERLAY) {
    screenEl.style.background = 'transparent';   // OBS composites over video
  } else {
    screenEl.style.background=themeBackground(t);
  }
  screenEl.style.color = t.textColor;
  textEl.style.fontFamily = t.font;
  labelEl.style.fontFamily = t.font;
  textEl.style.fontSize = t.fontSize + 'vh';
  textEl.style.textAlign = t.align || 'center';
  textEl.style.fontWeight = t.weight || '700';
  textEl.style.lineHeight=displayNumber(t.lineHeight,1.35,1,2);
  textEl.style.letterSpacing=displayNumber(t.spacing,0,0,.15)+'em';
  textEl.style.padding=`6vh ${displayNumber(t.margin,8,2,18)}vw`;
  textEl.style.alignItems=t.vertical==='top'?'flex-start':t.vertical==='bottom'?'flex-end':'center';
  textEl.style.textShadow=t.shadow===false?'none':'0 2px 10px rgba(0,0,0,.55)';
  labelEl.style.fontSize=displayNumber(t.labelSize,3,1.5,5)+'vh';
  labelEl.style.visibility=t.showLabel===false?'hidden':'visible';
  return t;
}

function fitText(enlargeScripture = false) {
  if (textEl.style.display === 'none') return;
  const style=getComputedStyle(textEl);
  const base = parseFloat(style.fontSize) || 24;
  // Short scripture can fill more of the output; lyrics retain their selected size.
  const maxPossible = window.innerHeight * 0.12;
  const maximum = enlargeScripture ? Math.max(base,Math.min(base*1.6,maxPossible)) : base;
  const availableHeight=textEl.clientHeight-(parseFloat(style.paddingTop)||0)-(parseFloat(style.paddingBottom)||0);
  const availableWidth=textEl.clientWidth-(parseFloat(style.paddingLeft)||0)-(parseFloat(style.paddingRight)||0);
  let low = 8, high = Math.max(8, maximum);
  // Ensure low <= high for binary search to work correctly
  if (low > high) high = low;
  const fits = () => contentEl.scrollHeight <= availableHeight + 1 && contentEl.scrollWidth <= availableWidth + 1;
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
      contentEl.innerHTML = renderSlideText(slide, state);
      if(slide.bullets)textEl.style.textAlign='left';   // always clean text — numbers live only in the operator preview
      labelEl.textContent = plain(slide.label) + (state.scripture?.versionName ? ' • ' + state.scripture.versionName : '');
      textEl.style.fontSize = t.fontSize + 'vh';
      requestAnimationFrame(()=>fitText(t.autoGrow!==false && (!!state.scripture || / \d+:\d+/.test(slide.label || ''))));
    }
  } else if (!OVERLAY) {
    applyBackdrops(state);
  }
  renderLowerThird(state.mode === 'blank' ? null : state.lowerThird);
  renderNotesAlert(state.mode === 'blank' ? null : state.alert);
}

/* word highlight — the operator drags over words in the preview; the matching
   verse (label ends "…:<verse>") gets those words marked, live, on screen. */
function renderSlideText(slide, state) {
  if(state.notesKey){const hl=state.textHighlight,active=hl&&hl.key===state.notesKey&&hl.index===state.index&&hl.text===slide.text;let word=0;const annotate=line=>plain(line).split(/(\s+)/).map(token=>{if(!token.trim())return esc(token);word++;return active&&word>=hl.from&&word<=hl.to?'<mark class="whl">'+esc(token)+'</mark>':esc(token);}).join('');return slide.bullets?'<ul class="notes-bullet-list">'+slide.text.split('\n').filter(line=>line.trim()).map(line=>'<li>'+annotate(line.replace(/^•\s*/,''))+'</li>').join('')+'</ul>':annotate(slide.text);}
  if(slide.bullets)return '<ul class="notes-bullet-list">'+plain(slide.text).split('\n').filter(line=>line.trim()).map(line=>'<li>'+esc(line.replace(/^•\s*/,''))+'</li>').join('')+'</ul>';
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
 const token=++logoToken,on=state.mode==='logo'&&!OVERLAY;$('logoScreen').classList.toggle('on',on);if(!on)return;
 const s=getSettings();let style=['combination','wordmark','mark','custom'].includes(s.logoStyle)?s.logoStyle:(s.logoId||s.logoImage?'custom':'combination'),src='';
 const img=$('logoImg'),svg=$('logoSvg'),name=$('logoName');img.hidden=true;svg.hidden=true;name.hidden=true;
 if(style==='custom'){try{if(s.logoId&&window.KOGGAssets)src=await window.KOGGAssets.get(s.logoId)||'';}catch{}if(!src&&s.logoImage)src=s.logoImage;if(!src)style='combination';}
 if(token!==logoToken)return;
 $('logoScreen').className='on logo-'+style;
 if(src){img.src=src;img.hidden=false;name.textContent=s.logoName||'';name.hidden=!s.logoName;}
 else{svg.hidden=style==='wordmark';name.hidden=style==='mark';name.innerHTML='<span class="output-kogg-wordmark" role="img" aria-label="KOGG"></span><span class="output-presenter">Presenter</span>';}
 const tagline=$('logoTagline');if(tagline)tagline.hidden=style==='custom'||style==='mark';
}

function renderNotesAlert(alert){
 const el=$('notesAlert'),track=$('notesAlertTrack');if(!el||!track)return;
 const on=!!(alert?.on&&typeof alert.text==='string'&&alert.text.trim());el.hidden=!on;document.body.classList.toggle('has-notes-alert',on);
 if(on){const text=alert.text.slice(0,2000);if(track.textContent!==text){track.textContent=text;track.classList.remove('alert-moving');void track.offsetWidth;track.classList.add('alert-moving');}track.style.animationDuration=Math.max(15,Math.min(90,Number(alert.duration)||25))+'s';}
}

function renderLowerThird(lt) {
  const on = !!(lt && lt.on && (lt.l1 || lt.l2));
  const el = $('lowerThird');
  const entering=el.classList.contains?.('lt-hidden')!==false;
  el.classList.toggle('lt-hidden', !on);
  if (on) {
    $('ltLine1').textContent = lt.l1 || '';
    $('ltLine2').textContent = lt.l2 || '';
    $('ltLine2').style.display = lt.l2 ? '' : 'none';
    if(entering){el.classList.remove('lt-animate');void el.offsetWidth;el.classList.add('lt-animate');}
  }
}

function applyBackdrops(state) {
  const t = themeById(getThemes(), state.themeId);
  if (OVERLAY) return;
  if(state.mode==='countdown'||state.mode==='logo'){const el=$(state.mode==='logo'?'logoScreen':'countdown');el.style.background=themeBackground(t);el.style.color=state.mode==='logo'?'#f3f7ff':t.textColor;}
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

// The operator owns popup placement. A standalone output can manage itself.
let duplicateOutput = false;
let outputScreensDetails = null, outputScreensHooked = false;
let standaloneHome = null, standaloneTarget = null, standalonePlacement = '';
const managedOutput = !!window.opener;
function chooseStandaloneScreen() {
  if (!outputScreensDetails) return null;
  const screens = outputScreensDetails.screens;
  const same = (a,b) => a && b && a.left === b.left && a.top === b.top;
  const existing = screens.find(s => same(s, standaloneTarget));
  if (screens.length < 2) { standaloneTarget = null; standalonePlacement = ''; return null; }
  standaloneTarget = existing || screens.find(s => !same(s, standaloneHome)) || null;
  return standaloneTarget;
}
async function placeStandaloneOutput() {
  const target = chooseStandaloneScreen();
  if (!target) return;
  const key = [target.left,target.top,target.width,target.height].join(':');
  if (key === standalonePlacement) return;
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    window.moveTo(target.left,target.top);
    window.resizeTo(target.width,target.height);
    standalonePlacement = key;
  } catch {}
}
async function hookOutputScreens() {
  if (outputScreensHooked || OVERLAY || managedOutput || !('getScreenDetails' in window)) return;
  try {
    outputScreensDetails = await window.getScreenDetails();
    const current = outputScreensDetails.currentScreen;
    standaloneHome = {left:current.left,top:current.top};
    // A standalone output already on a secondary screen should stay there.
    if (current.isPrimary === false) standaloneTarget = {left:current.left,top:current.top};
    outputScreensHooked = true;
    outputScreensDetails.addEventListener('screenschange', placeStandaloneOutput);
    outputScreensDetails.screens.forEach(screen => screen.addEventListener?.('change', placeStandaloneOutput));
    await placeStandaloneOutput();
  } catch {}
}
async function enterOutputFullscreen() {
  if (OVERLAY || document.fullscreenElement || duplicateOutput) return;
  try { await document.documentElement.requestFullscreen(); } catch {}
}
if (!OVERLAY) document.addEventListener('click', async () => {
  if (document.fullscreenElement || duplicateOutput) return;
  // Calling during a click allows the browser to ask for screen permission.
  if (!managedOutput) await hookOutputScreens();
  const target = !managedOutput && chooseStandaloneScreen();
  try { await document.documentElement.requestFullscreen(target ? {screen:target} : undefined); } catch {}
});
// Reuse an existing grant on a directly opened display, without an unsolicited prompt.
if (!OVERLAY && !managedOutput && navigator.permissions?.query) {
  navigator.permissions.query({name:'window-management'}).then(permission => {
    if (permission.state === 'granted') void hookOutputScreens();
  }).catch(() => {});
}

if (OVERLAY) { document.documentElement.classList.add('overlay'); document.body.classList.add('overlay'); }
render(getLive());

window.addEventListener('resize', () => render(getLive()));
if (document.fonts?.ready) document.fonts.ready.then(() => render(getLive()));

// Tell the operator this document actually loaded, including when its screen is intentionally blank.
if (channel) channel.postMessage({type:'display-ready'});
try { window.opener?.postMessage({type:'display-ready'}, location.origin); } catch {}
window.addEventListener('message', event => {
  if (event.origin !== location.origin || event.source !== window.opener) return;
  if (event.data?.type === 'output-state') render(event.data.live);
  if (event.data?.type === 'output-fullscreen') void enterOutputFullscreen();
});

// Web Locks arbitrate across presenter tabs without timer-based leader races.
if (!OVERLAY && navigator.locks?.request) {
  duplicateOutput = true;
  screenEl.style.visibility = 'hidden';
  navigator.locks.request('kogg-presentation-output',{ifAvailable:true},async lock => {
    if (!lock) {
      duplicateOutput = true;
      try { window.opener?.postMessage({type:'output-duplicate'},location.origin); } catch {}
      const notice=document.createElement('p');
      notice.textContent='KOGG Output is already open. Return to the existing output window. You can close this duplicate tab.';
      notice.style.cssText='color:#fff;background:#111827;padding:24px;font:18px sans-serif;position:fixed;inset:0;margin:0;z-index:100';
      document.body.appendChild(notice);
      if (window.opener) window.close();
      return;
    }
    duplicateOutput = false;
    screenEl.style.visibility = 'visible';
    render(getLive());
    // Succeeds automatically only where browser permission/settings allow it.
    if (window.opener) void enterOutputFullscreen();
    await new Promise(resolve=>window.addEventListener('pagehide',()=>{screenEl.style.visibility='hidden';resolve();},{once:true}));
  }).catch(()=>{duplicateOutput=false;screenEl.style.visibility='visible';});
  window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
}
