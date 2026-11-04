const test=require('node:test'),assert=require('node:assert/strict'),M=require('../js/slides.js');
test('uniform switching keeps individual designs and adopts selected style when enabled',()=>{
 const s=M.normalise({uniform:false,items:[{id:'a',title:'Prayers',style:{background:'gold',dim:45}},{id:'b',title:'Offering',style:{background:'green',fontSize:25}}],selected:'a'});
 M.setUniform(s,true);assert.equal(M.effective(s,s.items[1]).background,'gold');s.shared.fontSize=30;
 M.setUniform(s,false);assert.equal(M.effective(s,s.items[1]).background,'green');assert.equal(M.effective(s,s.items[1]).fontSize,25);assert.equal(M.effective(s,s.items[0]).dim,45);
});
test('slides preserve image references, manual sizing and order through reload',()=>{
 const s=M.normalise({uniform:false,items:[{id:'a',title:'Prayer',style:{bgImageId:'slide-bg-1',fontSize:23,dim:66}},{id:'b',title:'Offering'}]});M.move(s,'b',-1);const copy=M.normalise(JSON.parse(JSON.stringify(s)));assert.equal(copy.items[0].id,'b');const theme=M.theme(copy,copy.items[1]);assert.equal(theme.bgImageId,'slide-bg-1');assert.equal(theme.fontSize,23);assert.equal(theme.dim,66);assert.equal(theme.fillScreen,false);assert.equal(theme.showLabel,false);
});
test('empty decks stay empty and corrupt styles are bounded',()=>{
 assert.equal(M.normalise({items:[]}).items.length,0);const s=M.style({fontSize:400,dim:-3,background:'url(https://unwanted)',textColor:'invalid',font:'unknown'});assert.equal(s.fontSize,60);assert.equal(s.dim,0);assert.equal(s.background,'blue');assert.equal(s.textColor,'#ffffff');assert.equal(s.font,M.fonts[0]);
});

test('title slides and their backgrounds pass backup and named-plan validation',()=>{
 const lib=require('../js/library.js'),s=M.normalise({items:[{id:'opening',title:'Opening Prayers',style:{bgImageId:'slide-bg-image'}}],uniform:false});
 const theme=M.theme(s,s.items[0]),item={id:'service-slide',type:'text',title:'Opening Prayers',themeId:theme.id,slides:[{text:'Opening Prayers',label:'Opening Prayers'}]};
 const data=lib.validate({version:2,service:[item],plans:{Sunday:[item]},themes:[theme]});assert.equal(data.plans.Sunday[0].themeId,theme.id);assert.ok(lib.assetIds(data).includes('slide-bg-image'));
});
