/* Landing interactions are isolated from the operator and its saved library. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const theme=$('themeBtn');
 function setTheme(dark){document.body.classList.toggle('dark',dark);theme.textContent=dark?'☾':'☀';theme.setAttribute('aria-label',dark?'Switch to light appearance':'Switch to dark appearance');}
 setTheme(true);theme.addEventListener('click',()=>setTheme(!document.body.classList.contains('dark')));
 const menu=$('menuToggle');menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));$('siteNav').classList.toggle('is-open',open);});
 $('siteNav').addEventListener('click',e=>{if(e.target.closest('a')){menu.setAttribute('aria-expanded','false');$('siteNav').classList.remove('is-open');}});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){menu.setAttribute('aria-expanded','false');$('siteNav').classList.remove('is-open');}});
 function tabs(selector,onChange){const buttons=[...document.querySelectorAll(selector)];
  function activate(button){buttons.forEach(b=>{const selected=b===button;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;const panel=$(b.getAttribute('aria-controls'));if(panel && panel!==$('modeDetails'))panel.hidden=!selected;});onChange?.(button);}
  buttons.forEach((b,i)=>{b.addEventListener('click',()=>activate(b));b.addEventListener('keydown',e=>{let next;if(e.key==='ArrowRight'||e.key==='ArrowDown')next=(i+1)%buttons.length;if(e.key==='ArrowLeft'||e.key==='ArrowUp')next=(i-1+buttons.length)%buttons.length;if(e.key==='Home')next=0;if(e.key==='End')next=buttons.length-1;if(next!==undefined){e.preventDefault();activate(buttons[next]);buttons[next].focus();}});});
 }
 tabs('[data-hero-tab]');tabs('[data-tour-tab]');
 const heroLyrics=[['Amazing Grace · Verse 1','Amazing grace, how sweet the sound\nThat saved a wretch like me'],['Amazing Grace · Verse 2','’Twas grace that taught my heart to fear\nAnd grace my fears relieved']];
 document.querySelectorAll('[data-hero-verse]').forEach(b=>b.addEventListener('click',()=>{const [label,text]=heroLyrics[+b.dataset.heroVerse];$('heroLyricLabel').textContent=label;$('heroLyricText').textContent=text;document.querySelectorAll('[data-hero-verse]').forEach(x=>x.classList.toggle('selected',x===b));}));
 const original=$('demoLyrics').value;let lyricIndex=0;
 function drawLyrics(){const slides=window.KOGGLyrics.slides({title:'Amazing Grace',lyrics:$('demoLyrics').value});lyricIndex=Math.min(lyricIndex,Math.max(0,slides.length-1));const cards=$('demoLyricCards');cards.replaceChildren();
  slides.forEach((slide,i)=>{const button=document.createElement('button');button.className=i===lyricIndex?'selected':'';button.setAttribute('aria-pressed',String(i===lyricIndex));const title=document.createElement('b'),text=document.createElement('span');title.textContent=String(i+1)+' · '+slide.label.split(' — ').pop();text.textContent=slide.text;button.append(title,text);button.addEventListener('click',()=>{lyricIndex=i;drawLyrics();});cards.appendChild(button);});
  $('demoLyricRef').textContent=slides[lyricIndex]?.label||'No slide selected';$('demoLyricText').textContent=slides[lyricIndex]?.text||'Paste a few lines to start.';$('demoLyricCount').textContent=slides.length+' slide'+(slides.length===1?'':'s')+' · blank lines create new slides';
 }
 $('demoLyrics').addEventListener('input',drawLyrics);$('resetDemoLyrics').addEventListener('click',()=>{$('demoLyrics').value=original;lyricIndex=0;drawLyrics();});drawLyrics();
 const modes={base:{title:'Open once.<br>Be ready offline.',intro:'Wait for Ready offline, then present the three core Bibles and included hymns without installing or signing in.',points:['Core Scripture and hymns stay available offline.','Base lyrics are temporary; End session clears that workspace.']},local:{title:'Your songs.<br>Your device.',intro:'Keep saved songs, service plans, themes and downloaded content on this device. An installed browser app icon is optional.',points:['Saved songs and downloaded content work offline.','Use a full library backup when you want to transfer device-local work.']},sync:{title:'Your library.<br>A little more portable.',intro:'Sign in to keep a local working copy and sync saved songs, service plans, themes and artwork when connected.',points:['Open another device online and let it sync before travelling.','Custom Bible files remain device-local; conflicts are shown for attention.']}};
 let mode='base',online=true;
 function drawMode(){const data=modes[mode],panel=$('modeDetails');panel.setAttribute('aria-labelledby','mode-'+mode);panel.innerHTML='<h3>'+data.title+'</h3><p>'+data.intro+'</p><ul>'+data.points.map(p=>'<li>'+p+'</li>').join('')+'<li>'+(online?(mode==='sync'?'Online: saved changes can sync; source services are reachable when available.':'Online: lyrics search and connected Bible sources can be used.'):(mode==='sync'?'Offline: your prepared local copy works; sync waits for reconnection.':'Offline: use cached content, saved songs and pasted lyrics; online sources wait.'))+'</li></ul>';$('modeCta').textContent='Open the app and choose '+mode[0].toUpperCase()+mode.slice(1)+' ↗';}
 tabs('[data-mode-demo]',b=>{mode=b.dataset.modeDemo;drawMode();});$('demoConnection').addEventListener('click',()=>{online=!online;$('demoConnection').setAttribute('aria-checked',String(online));$('demoConnection').textContent='Demo connection: '+(online?'online':'offline');drawMode();});drawMode();
 const devices={desktop:{label:'WINDOWS / CHROME OR EDGE',steps:['Open KOGG in Chrome or Edge.','Wait for “Ready offline” in the operator.','Choose Install app from your browser’s menu, if available.']},android:{label:'ANDROID / BROWSER APP',steps:['Open KOGG in Chrome on your Android device.','Wait for “Ready offline” and prepare your content.','Open the browser menu and choose Install app or Add to Home screen.']},ios:{label:'IPHONE & IPAD / SAFARI',steps:['Open KOGG in Safari.','Wait for “Ready offline” and prepare your content.','Tap Share, then Add to Home Screen. Open the icon and recheck readiness.']}};
 Object.assign(devices,{
 macos:{label:'MACOS / MODERN BROWSER',steps:['Open KOGG in a current browser on your Mac.','Wait for “Ready offline” and prepare your content.','Use your browser’s app-install option if available; Chrome or Edge is recommended for automatic screen placement.']},
 linux:{label:'LINUX / MODERN BROWSER',steps:['Open KOGG in a current browser on your Linux computer.','Wait for “Ready offline” and prepare your content.','Install a browser app icon if offered, or bookmark KOGG. Window placement depends on your browser and desktop environment.']},
 chromeos:{label:'CHROMEOS / CHROME',steps:['Open KOGG in Chrome on your Chromebook.','Wait for “Ready offline” and prepare your content.','Use Chrome’s install option if offered, or bookmark the app for quick access.']},
 browser:{label:'OTHER DEVICES / COMPATIBLE BROWSER',steps:['Open KOGG in a modern browser with JavaScript and local storage enabled.','Check the workspace on your screen and wait for offline readiness if supported.','Keep using the browser; app installation and advanced features depend on that device.']}
 });
 document.querySelectorAll('[data-device]').forEach(b=>b.addEventListener('click',()=>{const device=devices[b.dataset.device];$('deviceLabel').textContent=device.label;$('installSteps').replaceChildren(...device.steps.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));document.querySelectorAll('[data-device]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));}));
 // Decorative motion never drives app state, network requests or presentation output.
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 // KOGG's decorative motion is enabled by default; no extra Play step.
 const paused=false;let frame=0;
 function motionBlocked(){return false;}
 document.body.classList.remove('motion-paused');
 document.body.classList.add('motion-enabled');
 const revealTargets=document.querySelectorAll('.section-heading,.tour-panel,.mode-explorer,.library-card,.update-grid article,.install-card,.faq-list,.closing,.facts,.service-flow,.display-grid article,.roadmap-rows article');
 if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}}),{threshold:.08});revealTargets.forEach((el,i)=>{el.classList.add('reveal-ready');el.style.setProperty('--reveal-delay',(el.matches('.library-card,.update-grid article')?i%3*80:el.matches('.display-grid article,.roadmap-rows article')?i%4*70:0)+'ms');observer.observe(el);});}
 function progress(){frame=0;const range=document.documentElement.scrollHeight-innerHeight;document.querySelector('.reading-progress i').style.transform='scaleX('+(range>0?Math.min(1,Math.max(0,scrollY/range)):0)+')';}
 window.addEventListener('scroll',()=>{if(!frame)frame=requestAnimationFrame(()=>{progress();headerFrame=0;settleHeader();});},{passive:true});window.addEventListener('resize',()=>{headerFrame=0;settleHeader();progress();});
 const header=document.querySelector('.site-header');let headerFrame=0;
 function settleHeader(){headerFrame=0;header.classList.toggle('scrolled',scrollY>6);}
 document.addEventListener('click',e=>{if(!e.target.closest('.site-header')){menu.setAttribute('aria-expanded','false');$('siteNav').classList.remove('is-open');}});
 const stageCards=document.querySelectorAll('.mini-console,.lyric-demo,.display-card,.mode-detail,.library-card,.update-grid article,.install-card,.obs-quick,.obs-connection,.partnership-grid article,.closing');
 stageCards.forEach(card=>{card.classList.add('stage-card');card.addEventListener('pointermove',event=>{if(event.pointerType!=='mouse'||!window.matchMedia('(hover:hover) and (pointer:fine)').matches)return;const r=card.getBoundingClientRect(),x=(event.clientX-r.left)/r.width,y=(event.clientY-r.top)/r.height;card.style.setProperty('--card-x',x*100+'%');card.style.setProperty('--card-y',y*100+'%');card.style.setProperty('--card-rx',((x-.5)*2)+'deg');card.style.setProperty('--card-ry',((.5-y)*2)+'deg');});card.addEventListener('pointerleave',()=>{card.style.setProperty('--card-rx','0deg');card.style.setProperty('--card-ry','0deg');});});
 const product=document.querySelector('.hero-product');
 product.addEventListener('pointermove',e=>{if(motionBlocked()||e.pointerType!=='mouse')return;const r=product.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;product.style.setProperty('--tilt-x',((x-.5)*5)+'deg');product.style.setProperty('--tilt-y',((.5-y)*4)+'deg');product.style.setProperty('--glow-x',x*100+'%');product.style.setProperty('--glow-y',y*100+'%');});
 product.addEventListener('pointerleave',()=>{product.style.removeProperty('--tilt-x');product.style.removeProperty('--tilt-y');});
 document.querySelectorAll('[role="tab"],.sample-refs button').forEach(button=>button.addEventListener('click',()=>{if(motionBlocked())return;const panel=$(button.getAttribute('aria-controls'))||button.closest('[role="tabpanel"]');if(panel){panel.classList.remove('preview-arrival');void panel.offsetWidth;panel.classList.add('preview-arrival');}}));

 /* The hero runs on local preview text: no Bible download, synthetic clicks or focus stealing. */
 const stage=document.querySelector('.hero-product');
 const heroButtons=[...document.querySelectorAll('[data-hero-tab]')];
 const dots=[...document.querySelectorAll('.scene-dots i')];
 const scenes=[
  {tab:0,ref:'John 11:35 · KJV',text:'Jesus wept.'},
  {tab:0,ref:'Psalm 23:1 · KJV',text:'The LORD is my shepherd; I shall not want.'},
  {tab:1,ref:'Amazing Grace · Verse 1',text:'Amazing grace, how sweet the sound\nThat saved a wretch like me'},
  {tab:1,ref:'Amazing Grace · Verse 2',text:'’Twas grace that taught my heart to fear\nAnd grace my fears relieved'}
 ];
 let scene=0,stageVisible=false,hovered=false,heroTimer=null;
 const sceneAnimations=new Map();
 function animatePreview(element){
  if(!element||motionBlocked()||!element.animate)return;
  sceneAnimations.get(element)?.cancel();
  sceneAnimations.set(element,element.animate([{opacity:.15,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],{duration:650,easing:'cubic-bezier(.2,.7,.2,1)'}));
 }
 function updateDots(){dots.forEach((dot,i)=>dot.classList.toggle('on',i===scene));}
 function showScene(){
  const next=scenes[scene],button=heroButtons[next.tab];
  heroButtons.forEach(b=>{const active=b===button;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;$(b.getAttribute('aria-controls')).hidden=!active;});
  const text=$(next.tab?'heroLyricText':'projText'),label=$(next.tab?'heroLyricLabel':'projRef');
  text.textContent=next.text;label.textContent=next.ref;text.classList.toggle('long-passage',next.text.length>120);
  animatePreview($(button.getAttribute('aria-controls')).querySelector('.hero-screen'));updateDots();
 }
 function scheduleHero(){
  clearTimeout(heroTimer);
  if(motionBlocked()||document.hidden||!stageVisible||hovered||stage.contains(document.activeElement))return;
  heroTimer=setTimeout(()=>{scene=(scene+1)%scenes.length;showScene();scheduleHero();},6500);
 }
 if('IntersectionObserver' in window){new IntersectionObserver(entries=>{stageVisible=entries[0].isIntersecting;scheduleHero();},{threshold:.25}).observe(stage);}
 else {stageVisible=true;scheduleHero();}
 stage.addEventListener('pointerenter',()=>{hovered=true;scheduleHero();});stage.addEventListener('pointerleave',()=>{hovered=false;scheduleHero();});
 stage.addEventListener('focusin',scheduleHero);stage.addEventListener('focusout',()=>setTimeout(scheduleHero,0));
 stage.addEventListener('input',scheduleHero);document.addEventListener('visibilitychange',scheduleHero);
 heroButtons.forEach((button,i)=>button.addEventListener('click',()=>{scene=i?2:0;updateDots();animatePreview($(button.getAttribute('aria-controls')).querySelector('.hero-screen'));scheduleHero();}));
 document.querySelectorAll('[data-hero-verse], [data-sample-ref]').forEach(button=>button.addEventListener('click',()=>{animatePreview(button.closest('[role="tabpanel"]').querySelector('.hero-screen'));scheduleHero();}));
 updateDots();
 $('copyObsGuide').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('obsGuideUrl').textContent);$('obsCopyStatus').textContent='OBS URL copied. Paste it into the Browser Source properties.';}catch{$('obsCopyStatus').textContent='Select and copy the URL above.';}});
 // Show one coherent chapter at a time; anchors and browser Back still work.
 const main=$('main'),chapterNodes=[...main.children];
 const chapters={welcome:['welcome'],explore:['demo'],screens:['display','obs'],modes:['modes','library'],updates:['updates','roadmap'],start:['get','faq'],mission:['partner']};
 const chapterFirst={welcome:'welcome',explore:'demo',screens:'display',modes:'modes',updates:'updates',start:'get',mission:'partner'};
 chapterNodes.forEach(node=>{let chapter=Object.keys(chapters).find(key=>chapters[key].includes(node.id));if(!chapter){if(node.matches('.hero,.facts,.service-flow'))chapter='welcome';else if(node.matches('.closing,.mission-ribbon'))chapter='mission';else if(node.matches('.ticker'))chapter=node.classList.contains('ticker-flip')?'start':'explore';}if(chapter){node.dataset.chapter=chapter;node.classList.add('chapter-pane');}});
 function selectChapter(id,scroll){const target=$(id),pane=target&&chapterNodes.find(node=>node===target||node.contains(target));const chapter=pane?.dataset.chapter||'welcome';chapterNodes.forEach(node=>{if(node.dataset.chapter)node.hidden=node.dataset.chapter!==chapter;});document.body.classList.add('chapter-view');const controls=document.querySelector('.chapter-controls');if(controls){controls.hidden=false;const order=Object.keys(chapters),index=order.indexOf(chapter),names=['Welcome','Explore','Screens & OBS','Work modes','Updates','Get started','The mission'];$('chapterPosition').textContent=(index+1)+' / '+order.length+' · '+names[index];$('chapterPrevious').hidden=index===0;$('chapterNext').hidden=index===order.length-1;if(index>0)$('chapterPrevious').href='#'+chapterFirst[order[index-1]];if(index<order.length-1){$('chapterNext').href='#'+chapterFirst[order[index+1]];$('chapterNext').textContent='Next: '+names[index+1]+' →';}}document.querySelectorAll('[data-chapter-link]').forEach(link=>{if(link.dataset.chapterLink===chapter)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});if(scroll){(target||$('welcome')).scrollIntoView({behavior:'smooth',block:'start'});}requestAnimationFrame(progress);}
 document.addEventListener('click',event=>{const link=event.target.closest('a[href^="#"]');if(!link)return;const id=link.getAttribute('href').slice(1)||'welcome';if(!$(id))return;selectChapter(id,false);if(location.hash==='#'+id)$(id).scrollIntoView({behavior:'smooth',block:'start'});});
 window.addEventListener('hashchange',()=>selectChapter(location.hash.slice(1)||'welcome',true));
 selectChapter(location.hash.slice(1)||'welcome',false);
 const share=$('shareKogg'),shareStatus=$('shareStatus');
 share.addEventListener('click',async()=>{
  const url='https://kogg-presenter.pages.dev/landing.html';
  try{if(navigator.share){await navigator.share({title:'KOGG Presenter',text:'A lightweight Scripture and lyrics presentation tool, built to serve the church. Try it and share it with your media team.',url});shareStatus.textContent='Thank you for helping another church discover KOGG.';}
  else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);shareStatus.textContent='Link copied. Share it with your church or media team.';}
  else {shareStatus.textContent='Share this link: '+url;}}
  catch(error){if(error.name!=='AbortError')shareStatus.textContent='Share this link: '+url;}
 });
 })();
