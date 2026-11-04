/* The Slides workspace uses the existing output and Service plan pipeline. */
(()=>{'use strict';
 const M=window.KOGGSlides;let state,uploadToken=0,previewToken=0;
 const selected=()=>state.items.find(x=>x.id===state.selected);
 const store=()=>baseLyrics()?sessionStorage:localStorage;
 const key=()=>baseLyrics()?'cp_title_slides_session':'cp_title_slides_device';
 function save(){try{store().setItem(key(),JSON.stringify(state));return true;}catch{$('slidesStatus').textContent='Could not save these slides: device storage is full or unavailable. Keep this tab open.';return false;}}
 function load(){uploadToken++;let raw={};try{raw=JSON.parse(store().getItem(key()))||{};}catch{}state=M.normalise(raw,uid);render();}
 function view(showLive){$('slidesDesignPane').hidden=showLive;$('slidesLivePane').hidden=!showLive;$('slidesViewDesign').setAttribute('aria-pressed',String(!showLive));$('slidesViewLive').setAttribute('aria-pressed',String(showLive));preview();renderLive();}
 function renderList(){
  $('titleSlideList').innerHTML=state.items.map((item,i)=>`<div class="title-slide-row${item.id===state.selected?' selected':''}"><button data-slide-select="${esc(item.id)}" aria-pressed="${item.id===state.selected}"><small>${i+1}</small><b>${esc(item.title||'Untitled slide')}</b></button><button data-slide-display="${esc(item.id)}" aria-label="Display ${esc(item.title||'slide')}" ${item.title.trim()?'':'disabled'}>▶</button></div>`).join('')||'<p class="hint">Choose a moment above and add your first slide.</p>';
  const index=state.items.findIndex(x=>x.id===state.selected);$('slidesUp').disabled=index<=0;$('slidesDown').disabled=index<0||index>=state.items.length-1;
  ['slidesDelete','slidesTitle','slidesUniform','slidesBackground','slidesImage','slidesDim','slidesFont','slidesColor','slidesSize','slidesAutoFit'].forEach(id=>$(id).disabled=index<0);
  $('slidesAdd').disabled=state.items.length>=100;
  $('slidesDisplay').disabled=$('slidesOneService').disabled=!selected()?.title.trim();$('slidesAddService').disabled=!state.items.some(x=>x.title.trim());
 }
 function render(){
  const item=selected(),s=M.effective(state,item||{style:{}});$('slidesTitle').value=item?.title||'';$('slidesUniform').checked=state.uniform;
  $('slidesBackground').value=s.background;$('slidesDim').value=s.dim;$('slidesFont').value=s.font;$('slidesColor').value=s.textColor;$('slidesSize').value=s.fontSize;$('slidesAutoFit').checked=s.fillScreen;
  $('slidesStorageStatus').textContent=baseLyrics()?'Base · slides kept for this tab session':'Drafts saved on this device · add to Service to include in plans and Sync';
  $('slidesStyleHint').textContent=state.uniform?'One design for all slides. Individual designs are kept for when you turn this off.':'Free form: these controls change only the selected slide.';
  renderList();preview();renderLive();
 }
 async function preview(){
  const token=++previewToken,item=selected(),box=$('titleSlidePreview');if(!item){box.innerHTML='';box.style.background='#000';return;}
  const t=M.theme(state,item);$('slidesDimValue').textContent=t.dim+'%';$('slidesSizeValue').textContent=t.fillScreen?'Auto-fit':t.fontSize+' vh';$('slidesRemoveImage').disabled=!t.bgImage&&!t.bgImageId;
  if(t.bgImageId&&window.KOGGAssets&&!previewBgCache.has(t.bgImageId)){try{previewBgCache.set(t.bgImageId,await window.KOGGAssets.get(t.bgImageId)||'');}catch{}}
  if(token!==previewToken)return;
  box.style.background=previewBackground(t);box.style.color=t.textColor;box.style.fontFamily=t.font;box.style.fontWeight=t.weight;box.style.lineHeight=t.lineHeight;
  box.innerHTML='<div class="preview-content">'+esc(item.title)+'</div>';fitProjectorPreview(box,t);
 }
 function renderLive(){
  const box=$('titleSlideLive'),slide=live.mode==='normal'?live.slides?.[live.index]:null;
  $('titleLiveLabel').textContent=slide?'LIVE · '+(slide.label||live.title||'Slide'):'Output '+live.mode;
  applyOutputLook(box);projectorPreview(box,slide?esc(stripStrongs(slide.text)):'',slide);
  $('slidesPrev').disabled=!slide||live.index<=0;$('slidesNext').disabled=!slide||live.index>=live.slides.length-1;
 }
 function changeStyle(){const item=selected();if(!item)return;const old=M.effective(state,item);const s=M.style({...old,background:$('slidesBackground').value,dim:$('slidesDim').value,font:$('slidesFont').value,textColor:$('slidesColor').value,fontSize:$('slidesSize').value,fillScreen:$('slidesAutoFit').checked});if(state.uniform)state.shared=s;else item.style=s;save();view(false);}
 function itemsForOutput(items){
  const prepared=items.filter(x=>x.title.trim()).map(item=>{const t=M.theme(state,item);
   // Snapshot the design: editing or displaying a later draft cannot change an
   // already-live slide or a saved Service plan that references this theme.
   let saved=themes.find(x=>x.id.startsWith('slide-')&&Object.keys(t).filter(k=>k!=='id'&&k!=='name').every(k=>x[k]===t[k]));
   if(!saved){saved={...t,id:'slide-'+uid()};themes.push(saved);}
   return {id:uid(),type:'text',title:item.title,themeId:saved.id,slides:[{text:item.title,label:item.title}],sessionOnly:baseLyrics(),lyricsSession:baseLyrics()?lyricSession.id:null};
  });if(prepared.length)themeSave();return prepared;
 }
 function display(id=state.selected){const item=state.items.find(x=>x.id===id);if(!item?.title.trim())return;state.selected=id;const items=itemsForOutput(state.items);const index=state.items.filter(x=>x.title.trim()).findIndex(x=>x.id===id);const frames=items.map(serviceFrame);pushLive({mode:'normal',slides:items.map(x=>x.slides[0]),index,title:'Service slides',...frames[index],serviceFrames:frames});save();render();view(true);$('slidesStatus').textContent='Slide displayed. Use Previous / Next to move through this order.';}
 function addService(all){const items=itemsForOutput(all?state.items:[selected()].filter(Boolean));if(!items.length)return;service.push(...items);LS.set(K.service,service);renderService();$('slidesStatus').textContent=items.length+' slide'+(items.length===1?'':'s')+' added to '+(baseLyrics()?'this session’s Service queue.':'Service.');}
 $('slidesPreset').innerHTML=M.presets.concat('Custom slide').map(x=>'<option>'+esc(x)+'</option>').join('');
 $('slidesFont').innerHTML=M.fonts.map((font,i)=>`<option value="${esc(font)}">${['Nunito Sans Expanded','Arial','Georgia','Verdana','System UI','Impact'][i]}</option>`).join('');
 $('slidesAdd').addEventListener('click',()=>{if(state.items.length>=100)return;const item={id:uid(),title:$('slidesPreset').value,style:M.style(state.shared)};state.items.push(item);state.selected=item.id;save();render();$('slidesTitle').focus();});
 $('titleSlideList').addEventListener('click',e=>{const show=e.target.closest('[data-slide-display]');if(show){display(show.dataset.slideDisplay);return;}const button=e.target.closest('[data-slide-select]');if(button){state.selected=button.dataset.slideSelect;save();render();view(false);}});
 $('slidesTitle').addEventListener('input',()=>{if(!selected())return;selected().title=$('slidesTitle').value;save();renderList();view(false);});
 $('slidesUniform').addEventListener('change',()=>{uploadToken++;M.setUniform(state,$('slidesUniform').checked);save();render();view(false);});
 ['slidesBackground','slidesDim','slidesFont','slidesColor','slidesSize','slidesAutoFit'].forEach(id=>$(id).addEventListener('input',()=>{if(id==='slidesSize')$('slidesAutoFit').checked=false;if(id==='slidesBackground'){uploadToken++;const item=selected();if(item){const style=state.uniform?state.shared:item.style;style.bgImage='';style.bgImageId='';}}changeStyle();}));
 $('slidesRemoveImage').addEventListener('click',()=>{uploadToken++;const item=selected();if(!item)return;const s=M.effective(state,item);s.bgImage='';s.bgImageId='';if(state.uniform)state.shared=s;else item.style=s;save();view(false);});
 $('slidesImage').addEventListener('change',async()=>{
  const file=$('slidesImage').files?.[0],item=selected();if(!file||!item)return;const token=++uploadToken,workspace=state,uniform=state.uniform;$('slidesStatus').textContent='Preparing background…';
  try{const data=await readPresentationImage(file);if(token!==uploadToken||workspace!==state)return;const stored=await storeImage(data,'slide-bg');if(token!==uploadToken||workspace!==state||!state.items.includes(item))return;const s=M.effective(state,item);s.bgImage=typeof stored==='string'?stored:'';s.bgImageId=typeof stored==='string'?'':stored.id;if(uniform)state.shared=s;else item.style=s;const saved=save();view(false);if(saved)$('slidesStatus').textContent='Background ready. Press Display when ready.';}catch(error){$('slidesStatus').textContent=error.message;}finally{if(token===uploadToken)$('slidesImage').value='';}
 });
 $('slidesDelete').addEventListener('click',()=>{const item=selected();if(!item||!confirm('Delete this slide? Live output and Service copies stay.'))return;uploadToken++;const i=state.items.indexOf(item);state.items.splice(i,1);state.selected=state.items[Math.min(i,state.items.length-1)]?.id||'';save();render();});
 ['slidesUp','slidesDown'].forEach((id,i)=>$(id).addEventListener('click',()=>{M.move(state,state.selected,i?1:-1);save();render();}));
 $('slidesDisplay').addEventListener('click',()=>display());$('slidesOneService').addEventListener('click',()=>addService(false));$('slidesAddService').addEventListener('click',()=>addService(true));
 ['slidesPrev','slidesNext'].forEach((id,i)=>$(id).addEventListener('click',()=>advanceLiveSlide(i?1:-1)));
 document.querySelector('.tab[data-tab="slides"]')?.addEventListener('click',render);
 if(typeof ResizeObserver!=='undefined'){const observer=new ResizeObserver(()=>{preview();renderLive();});observer.observe($('titleSlidePreview'));observer.observe($('titleSlideLive'));}
 document.fonts?.ready?.then(()=>{preview();renderLive();});
 $('slidesViewDesign').addEventListener('click',()=>view(false));$('slidesViewLive').addEventListener('click',()=>view(true));
 window.KOGGSlideDeck={load,renderLive};load();
})();
