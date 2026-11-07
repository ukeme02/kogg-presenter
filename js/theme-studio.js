/* Theme controls are local edits until the existing Save / Apply actions are used. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),buttons=[...document.querySelectorAll('[data-theme-page]')];
 function activate(button){for(const item of buttons){const selected=item===button;item.setAttribute('aria-selected',String(selected));item.tabIndex=selected?0:-1;$(item.getAttribute('aria-controls')).hidden=!selected;}}
 buttons.forEach((button,index)=>{button.addEventListener('click',()=>activate(button));button.addEventListener('keydown',event=>{let next;if(event.key==='ArrowRight')next=(index+1)%buttons.length;if(event.key==='ArrowLeft')next=(index+buttons.length-1)%buttons.length;if(event.key==='Home')next=0;if(event.key==='End')next=buttons.length-1;if(next!==undefined){event.preventDefault();activate(buttons[next]);buttons[next].focus();}});});
 function fit(theme){const box=$('themePreview'),text=$('themePreviewText'),content=$('themePreviewContent'),label=$('themePreviewLabel');if(!box?.clientHeight||!content||!text.clientWidth)return;
  const height=box.clientHeight;label.style.fontSize=height*(Number(theme.labelSize)||3)/100+'px';text.style.padding=height*.04+'px '+(Number(theme.margin)||4)+'%';
  const availableHeight=text.clientHeight-height*.08,availableWidth=content.clientWidth;if(availableHeight<=0||availableWidth<=0)return;
  let low=1,high=theme.fillScreen===false?height*(Number(theme.fontSize)||15)/100:height*.8;
  for(let i=0;i<12;i++){const size=(low+high)/2;text.style.fontSize=size+'px';if(content.scrollHeight<=availableHeight&&content.scrollWidth<=availableWidth+1)low=size;else high=size;}
  text.style.fontSize=low*Math.max(.2,Math.min(1,Number(theme.fontScale)||1))+'px';
 }
 function refresh(){if(typeof readThemeForm==='function')fit(readThemeForm());}
 window.KOGGThemeStudio={fit};
 if(typeof ResizeObserver!=='undefined'){const observer=new ResizeObserver(refresh);observer.observe($('themePreview'));}
 window.addEventListener('resize',refresh);document.fonts?.ready?.then(refresh).catch(()=>{});refresh();
})();
