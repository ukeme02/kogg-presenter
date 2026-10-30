/* Small pure helpers for scripture navigation and saved references. */
(function (scope) {
  'use strict';
  const valid = r => r && [r.bookIdx,r.ch,r.vFrom,r.vTo].every(Number.isInteger) && r.bookIdx >= 0 && r.ch > 0 && r.vFrom > 0 && r.vTo >= r.vFrom;
  const same = (a,b) => valid(a?.r) && valid(b?.r) && a.translation === b.translation && ['bookIdx','ch','vFrom','vTo'].every(k => a.r[k] === b.r[k]);
  function remember(history,entry,limit=100) {
    const items = Array.isArray(history) ? history.filter(e => valid(e?.r) && typeof e.translation === 'string') : [];
    return [entry,...items.filter(e => !same(e,entry))].slice(0,limit);
  }
  function adjacent(books,r,dir) {
    if (!valid(r) || !books[r.bookIdx]?.chapters[r.ch-1] || ![1,-1].includes(dir)) return null;
    let b=r.bookIdx,c=r.ch,v=dir>0?r.vTo:r.vFrom;
    for(let guard=0;guard<400;guard++) {
      v+=dir;
      if (v<1) { c--; if(c<1){b--;if(b<0)return null;c=books[b].chapters.length;}v=books[b].chapters[c-1].length; }
      if(v>books[b].chapters[c-1].length){c++;v=1;if(c>books[b].chapters.length){b++;c=1;if(b>=books.length)return null;}}
      if(books[b].chapters[c-1][v-1]?.trim())return {bookIdx:b,ch:c,vFrom:v,vTo:v};
    }
    return null;
  }
  function passage(data,r) {
    if(!valid(r))return '';
    const chapter=data?.books?.[r.bookIdx]?.chapters?.[r.ch-1];
    if(!chapter)return '';
    const lines=[];
    for(let v=r.vFrom;v<=Math.min(r.vTo,chapter.length);v++)if(chapter[v-1]?.trim())lines.push(v+' '+chapter[v-1]);
    return lines.join('\n');
  }
  const api={valid,same,remember,adjacent,passage};
  if(typeof module!=='undefined')module.exports=api;else scope.KOGGScripture=api;
})(typeof window!=='undefined'?window:globalThis);
