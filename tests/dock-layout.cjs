const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('js/app.js','utf8');
const start=source.indexOf('function applyDocksToGridTemplate('),end=source.indexOf('\nfunction applyDocks()',start);
function arrange(sizes={}){const names=['books','chapters','verses','memory','quickgo','search','text'];const children=names.map(name=>({dataset:{dock:name},style:{},classList:{contains:c=>c==='dock'}}));const grid={children,style:{}};const context=vm.createContext({dockSizes:sizes,DOCK_DEFAULTS:{books:[3,4],chapters:[3,4],verses:[3,4],memory:[3,4],quickgo:[4,3],search:[4,3],text:[4,3]}});vm.runInContext(source.slice(start,end),context);context.applyDocksToGridTemplate(grid,420,false);return grid;}
test('all seven default docks occupy four equal top cells and three equal bottom cells',()=>{
 const grid=arrange();assert.equal(grid.style.gridTemplateRows,'205px 205px');
 assert.deepEqual(grid.children.slice(0,4).map(d=>d.style.gridRow),Array(4).fill('1 / 2'));
 assert.deepEqual(grid.children.slice(4).map(d=>d.style.gridRow),Array(3).fill('2 / 3'));
 assert.deepEqual(grid.children.map(d=>d.style.gridColumn),['1 / span 3','4 / span 3','7 / span 3','10 / span 3','1 / span 4','5 / span 4','9 / span 4']);
 assert.doesNotMatch(fs.readFileSync('index.html','utf8'),/class="span-btn"/);
});
test('mouse-resized dock heights change the row balance without overflowing the deck',()=>{
 const grid=arrange({books:[3,8]});const rows=grid.style.gridTemplateRows.split(' ').map(parseFloat);
 assert.ok(rows[0]>rows[1]);assert.equal(rows.reduce((a,b)=>a+b,0)+10,420);
});
