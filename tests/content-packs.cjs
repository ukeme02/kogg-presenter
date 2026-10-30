const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const content=require('../js/content.js');
const basic=JSON.parse(fs.readFileSync('data/hymns.json','utf8'));
const extra=JSON.parse(fs.readFileSync('data/hymns-extra.json','utf8'));
test('basic hymnary has 300 complete unique texts and expansion adds 262',()=>{
 assert.equal(content.validatePack(basic).hymns.length,300);
 assert.equal(content.validatePack(extra).hymns.length,262);
 const first=content.mergeHymns([],basic),expanded=content.mergeHymns(first.songs,extra);
 assert.equal(first.added,300);assert.equal(expanded.added,262);
 assert.equal(new Set(expanded.songs.map(content.hymnKey)).size,562);
 for(const hymn of expanded.songs){assert.ok(hymn.lyrics.trim().length>50,hymn.title);assert.doesNotMatch(hymn.lyrics,/END OF THE PROJECT GUTENBERG|INDEX OF FIRST LINES/);}
});
test('reinstalling hymn packs preserves saved edits and does not duplicate hymns',()=>{
 const saved=content.mergeHymns([],basic).songs;saved[0].title='My title';saved[0].lyrics+='\nMy additional stanza';
 const result=content.mergeHymns(saved,basic);assert.equal(result.added,0);assert.equal(result.songs[0].title,'My title');assert.match(result.songs[0].lyrics,/My additional stanza/);
});
test('bad pack fails before any library merge',()=>{
 assert.throws(()=>content.mergeHymns([],{pack:'bad',hymns:[{title:'No lyrics'}]}),/Invalid hymn pack/);
});
test('expansion catalogue count and source credits match shipped data',()=>{
 const catalogue=JSON.parse(fs.readFileSync('data/content-catalog.json','utf8'));
 const entry=catalogue.hymnPacks.find(p=>p.id===extra.pack);assert.equal(entry.count,extra.hymns.length);
 assert.match(fs.readFileSync('data/hymnary-sources.txt','utf8'),/16455/);
});
