/* Stream is a lightweight control surface for the shared presentation output. */
(()=>{'use strict';
 const M=window.KOGGStream;let state;
 const fields={l1:'ltLine1',l2:'ltLine2',style:'streamStyle',position:'streamPosition',size:'streamSize',accent:'streamAccent',alert:'streamAlert',duration:'streamDuration',motion:'streamMotion',method:'streamMethod',feed:'streamFeed',platform:'streamPlatform'};
 function store(){return baseLyrics()?sessionStorage:localStorage;}
 function key(){return baseLyrics()?'cp_stream_session':'cp_stream_device';}
 function save(){try{store().setItem(key(),JSON.stringify(state));}catch{$('streamStatus').textContent='Draft could not be saved. Keep this tab open.';}}
 function read(){for(const [k,id] of Object.entries(fields))state[k]=$(id).value;state=M.normalise(state);save();connection();}
 function load(){let raw={};try{raw=JSON.parse(store().getItem(key()))||{};}catch{}state=M.normalise(raw);for(const [k,id] of Object.entries(fields))$(id).value=state[k];$('streamDraftStatus').textContent=baseLyrics()?'Base · drafts kept for this tab session':'Drafts saved on this device';connection();renderLive();}
 function connection(){
  const browser=state.method==='browser';$('streamBrowser').hidden=!browser;
  const local=location.hostname==='127.0.0.1'&&location.protocol==='http:';
  $('obsUrl').value=M.outputUrl(local?location.href:'http://127.0.0.1:8766/',state.feed);
  const instructions={obs:'Open Output, then add Window Capture in OBS and select that window. On macOS, use macOS Screen Capture. Keep the output visible and check the scene preview.',youtube:'Use OBS or another encoder to send your broadcast to YouTube. Capture the KOGG Output window in the encoder, then start streaming there.',facebook:'Use your streaming software to broadcast to Facebook Live. Capture KOGG Output as a source and check your scene before going live.',streamyard:'Open Output, then choose Present → Share screen in StreamYard. Select the Output window and add the shared screen to your broadcast.',other:'Share or capture the KOGG Output window using your platform’s screen-sharing controls. Browser Sources require a compatible broadcasting application.'};
  $('streamInstructions').textContent=browser?'For software that accepts a Browser Source: start the optional local bridge, open its KOGG operator, then add the URL below.':instructions[state.platform];
  const status=window.KOGGRelay?.status?.();$('streamConnection').textContent=status?.message||(local?'Bridge not checked yet.':'Open KOGG through the local bridge to check its connection. Window Capture works directly from this website.');
 }
 function renderLive(){if(!state)return;connection();const slide=live.mode==='normal'?live.slides?.[live.index]:null,box=$('streamPreview');applyOutputLook(box);projectorPreview(box,slide?esc(stripStrongs(slide.text)):'',slide);$('streamLiveStatus').textContent='Output: '+live.mode+' · tag '+(live.lowerThird?.on?'on':'off')+' · notice '+(live.alert?.on?'on':'off')+(live.mode==='countdown'?' · countdown runs in Output':'');}
 function act(fn,message){try{read();pushLive(fn(state,live));$('streamStatus').textContent=message;}catch(err){$('streamStatus').textContent=err.message;}}
 Object.values(fields).forEach(id=>$(id).addEventListener('input',read));
 $('streamUsePreset').addEventListener('click',()=>{const preset=M.presets[$('streamPreset').value];if(!preset)return;state=M.normalise({...state,...preset});for(const [k,id] of Object.entries(fields))$(id).value=state[k];save();$('streamStatus').textContent='Template loaded. Edit the name and press Show.';});
 $('btnLtShow').addEventListener('click',()=>act(M.tag,'Name tag is live.'));
 $('btnLtHide').addEventListener('click',()=>pushLive({lowerThird:{on:false}}));
 $('streamShowNotice').addEventListener('click',()=>act(M.notice,'Notice is live.'));
 $('streamHideNotice').addEventListener('click',()=>pushLive({alert:{on:false}}));
 $('streamClear').addEventListener('click',()=>pushLive({lowerThird:{on:false},alert:{on:false}}));
 $('streamOpenOutput').addEventListener('click',()=>openDisplayWindow());
 $('streamCheck').addEventListener('click',async()=>{const b=$('streamCheck');b.disabled=true;$('streamConnection').textContent='Checking…';try{await window.KOGGRelay?.check?.();connection();}finally{b.disabled=false;}});
 $('btnCopyObs').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('obsUrl').value);$('streamStatus').textContent='Source URL copied.';}catch{$('obsUrl').focus();$('obsUrl').select();$('streamStatus').textContent='Select and copy the source URL above.';}});
 document.querySelectorAll('[data-stream-pane]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-stream-pane]').forEach(x=>{const selected=x===b;x.setAttribute('aria-pressed',String(selected));$('streamPane-'+x.dataset.streamPane).hidden=!selected;});}));
 document.querySelectorAll('[data-tools-page]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-tools-page]').forEach(x=>{const selected=x===b;x.setAttribute('aria-pressed',String(selected));$('tools-'+x.dataset.toolsPage).hidden=!selected;});}));
 window.KOGGStreamDeck={load,renderLive};load();
})();
