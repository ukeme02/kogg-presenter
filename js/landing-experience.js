/* Public, local-only demonstrations. Never connects to a presenter, phone or OBS. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),reduced=matchMedia('(prefers-reduced-motion: reduce)'),motionBlocked=()=>document.body.classList.contains('motion-paused');
 const moments=[
  {deck:'Slides',label:'Opening prayers',text:'Let us draw near.',note:'Choose a service slide. Give the room a clear beginning.',detail:'Opening prayers',kind:'title'},
  {deck:'Lyrics',label:'Praise & worship',text:'Amazing grace, how sweet the sound\nThat saved a wretch like me',note:'Paste a song. Empty lines become slides. Tap the next verse.',detail:'Amazing Grace · verse 1',kind:'lyrics'},
  {deck:'Scripture',label:'The reading',text:'The LORD is my shepherd; I shall not want.',note:'Book. Chapter. Verse. Or type a reference and press Enter.',detail:'Psalm 23:1 · KJV',kind:'scripture'},
  {deck:'Notes',label:'The message',text:['Walk in faith','Serve with love','Carry the light'],note:'Add a point as the minister speaks. Keep the words clear and readable.',detail:'Sermon points',kind:'points'},
  {deck:'Slides',label:'Go with purpose',text:'Carry the light\ninto your week.',note:'Close with an announcement or a final service slide.',detail:'Closing announcement',kind:'title'}
 ];
 function paintText(node,text){node.replaceChildren();if(Array.isArray(text)){const list=document.createElement('ul');for(const line of text){const li=document.createElement('li');li.textContent=line;list.appendChild(li);}node.appendChild(list);}else node.textContent=text;}
 const motions=new WeakMap();
 function arrival(node){if(motionBlocked()||!node?.animate)return;motions.get(node)?.cancel();motions.set(node,node.animate([{opacity:.3,transform:'translateY(9px)'},{opacity:1,transform:'translateY(0)'}],{duration:420,easing:'cubic-bezier(.2,.7,.2,1)'}));}
 function pulse(node){if(motionBlocked()||!node?.animate)return;node.animate([{opacity:0,transform:'scaleX(.1)'},{opacity:1,transform:'scaleX(1)'},{opacity:0,transform:'scaleX(1)'}],{duration:650,easing:'ease-out'});}
 function choices(selector,attribute,index){document.querySelectorAll(selector).forEach((button,i)=>button.setAttribute(attribute,String(i===index)));}
 let current=0,timer=null,visible=false,hover=false;
 const service=$('service-story'),storyButtons=[...document.querySelectorAll('[data-service-step]')];
 function drawStory(announce=false){const item=moments[current];paintText($('storyText'),item.text);$('storyLabel').textContent=item.detail;$('storyDeck').textContent=item.deck;$('storyNote').textContent=item.note;$('storyCount').textContent=String(current+1).padStart(2,'0')+' / 05';$('storyScreen').dataset.kind=item.kind;choices('[data-service-step]','aria-pressed',current);if(announce)$('storyAnnounce').textContent=item.label+' · '+item.deck+' preview';arrival($('storyContent'));pulse($('storySignal'));}
 function schedule(){clearTimeout(timer);if(!visible||hover||document.hidden||service.contains(document.activeElement)||motionBlocked())return;timer=setTimeout(()=>{current=(current+1)%moments.length;drawStory();schedule();},6000);}
 storyButtons.forEach((button,i)=>{button.addEventListener('click',()=>{current=i;drawStory(true);schedule();});button.addEventListener('keydown',event=>{let n;if(event.key==='ArrowDown'||event.key==='ArrowRight')n=(i+1)%moments.length;if(event.key==='ArrowUp'||event.key==='ArrowLeft')n=(i+moments.length-1)%moments.length;if(event.key==='Home')n=0;if(event.key==='End')n=moments.length-1;if(n!==undefined){event.preventDefault();storyButtons[n].focus();storyButtons[n].click();}});});
 service.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'){hover=true;schedule();}});service.addEventListener('pointerleave',()=>{hover=false;schedule();});service.addEventListener('focusin',schedule);service.addEventListener('focusout',()=>setTimeout(schedule,0));
 if(typeof IntersectionObserver!=='undefined'){new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;schedule();},{threshold:.2}).observe(service);}else{visible=true;schedule();}
 document.addEventListener('visibilitychange',schedule);reduced.addEventListener?.('change',schedule);window.addEventListener('kogg-motion-change',schedule);drawStory();

 // The phone buttons and both screens share this one miniature presentation state.
 let remoteIndex=0,blank=false,feed='lower';
 const remoteSlides=[{label:'Psalm 23:1 · KJV',text:'The LORD is my shepherd; I shall not want.'},{label:'Psalm 23:2 · KJV',text:'He maketh me to lie down in green pastures: he leadeth me beside the still waters.'},{label:'Psalm 23:3 · KJV',text:'He restoreth my soul: he leadeth me in the paths of righteousness for his name’s sake.'}];
 function remoteDraw(announce=false){const slide=remoteSlides[remoteIndex];for(const id of ['connectionRoom','connectionBroadcast']){$(id).classList.toggle('is-blank',blank);}for(const id of ['connectionRoomText','connectionBroadcastText'])$(id).textContent=slide.text;for(const id of ['connectionRoomRef','connectionBroadcastRef','phoneReference'])$(id).textContent=slide.label;$('phoneCount').textContent=blank?'Screen cleared':(remoteIndex+1)+' / '+remoteSlides.length;$('phoneBlank').textContent=blank?'Resume':'Blank';$('phoneBlank').setAttribute('aria-pressed',String(blank));$('phonePrev').disabled=blank||remoteIndex===0;$('phoneNext').disabled=blank||remoteIndex===remoteSlides.length-1;$('connectionBroadcast').dataset.feed=feed;document.querySelectorAll('[data-connection-feed]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.connectionFeed===feed)));if(announce)$('connectionStatus').textContent=blank?'Preview cleared on both screens.':slide.label+' shown in the room and broadcast previews.';arrival($('connectionRoomContent'));arrival($('connectionBroadcastContent'));pulse($('connectionSignal'));}
 $('phoneNext').addEventListener('click',()=>{remoteIndex=Math.min(remoteSlides.length-1,remoteIndex+1);remoteDraw(true);});$('phonePrev').addEventListener('click',()=>{remoteIndex=Math.max(0,remoteIndex-1);remoteDraw(true);});$('phoneBlank').addEventListener('click',()=>{blank=!blank;remoteDraw(true);});$('connectionReset').addEventListener('click',()=>{remoteIndex=0;blank=false;feed='lower';remoteDraw(true);});document.querySelectorAll('[data-connection-feed]').forEach(b=>b.addEventListener('click',()=>{feed=b.dataset.connectionFeed;remoteDraw(true);}));remoteDraw();

 $('heroShow').addEventListener('click',()=>{const ref=window.heroDemoApi?.parseQj($('qj').value);if(ref)window.heroDemoApi.liveVerse(ref,'proj');else{$('heroInputHint').textContent='Type a reference, for example John 3:16, or tap a sample.';$('qj').focus();}});
 document.addEventListener('kogg-preview',event=>{if(event.detail.where!=='proj')return;arrival($('projText'));pulse($('heroSignal'));document.querySelectorAll('[data-sample-ref]').forEach(b=>b.setAttribute('aria-pressed',String(event.detail.ref.startsWith(b.dataset.sampleRef))));});

 // Deep links open their relevant guide, including direct arrivals from Explorer.
 function revealTarget(hash){let node;try{node=document.getElementById(decodeURIComponent(hash.replace(/^#/,'')));}catch{return;}if(!node)return;let parent=node;while(parent){if(parent.tagName==='DETAILS')parent.open=true;parent=parent.parentElement;}if(node.id==='demo'||node.id==='features')$('fullTour').open=true;}
 document.addEventListener('click',event=>{const link=event.target.closest('a[href^="#"]');if(link)revealTarget(link.getAttribute('href'));});window.addEventListener('hashchange',()=>revealTarget(location.hash));revealTarget(location.hash);
 // Refit hidden tour previews when their disclosure opens.
 $('fullTour').addEventListener('toggle',()=>{if($('fullTour').open)window.dispatchEvent(new Event('resize'));});
 // Preserve movement while removing offscreen paint work and expensive phone tilt.
 if(typeof IntersectionObserver!=='undefined'){const observer=new IntersectionObserver(entries=>entries.forEach(e=>e.target.classList.toggle('experience-offscreen',!e.isIntersecting)),{rootMargin:'100px'});document.querySelectorAll('.service-story,.connection-story,.promise-grid').forEach(el=>observer.observe(el));}
})();
