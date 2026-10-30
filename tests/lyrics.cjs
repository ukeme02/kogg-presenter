const test=require('node:test'),assert=require('node:assert/strict'),L=require('../js/lyrics.js');
test('blank lines split slides while headings become labels, not projected text',()=>{
 const song={title:'Example',lyrics:'[Verse 1]\r\nOne\r\nTwo\r\n \r\n[Chorus]\r\nThree\r\nFour\r\n\r\n\r\nFive'};
 assert.deepEqual(L.slides(song),[{label:'Example — Verse 1',text:'One\nTwo'},{label:'Example — Chorus',text:'Three\nFour'},{label:'Example',text:'Five'}]);
 assert.deepEqual(L.parse('[Empty]\n\n'),[]);
});
test('song order reuses sections without copying the chorus',()=>{
 const song={title:'Example',lyrics:'[Verse]\nOne\n\n[Chorus]\nTwo',order:[0,1,0,1]};
 assert.equal(L.parse(song.lyrics).length,2);assert.equal(L.slides(song).length,4);assert.equal(L.slides(song)[3].text,'Two');
});
test('slide operations preserve text through split, merge, reorder and duplicate',()=>{
 const original=L.parse('[Verse]\nOne\nTwo\nThree\nFour');const split=L.operation(original,0,'split');
 assert.equal(split.length,2);assert.equal(L.operation(split,0,'merge')[0].text,original[0].text);
 assert.equal(L.operation(split,0,'down')[0].text,'Three\nFour');assert.equal(L.operation(split,1,'up')[0].text,'Three\nFour');
 assert.equal(L.operation(split,0,'duplicate').length,3);assert.equal(L.operation(split,0,'delete').length,1);
 assert.equal(L.splitLines(L.parse('1\n2\n3\n4\n5'),4).length,2);
});
test('duplicate detection recognises edited punctuation and identical lyrics',()=>{
 assert.ok(L.duplicate([{id:'a',title:'Amazing Grace!',author:'Newton',lyrics:'old'}],{title:'Amazing Grace',author:'Newton',lyrics:'new'}));
 assert.ok(L.duplicate([{id:'a',title:'A',lyrics:'same'}],{title:'B',lyrics:'same'}));
});
test('online records require plain lyrics and retain provenance',()=>{
 assert.equal(L.fromRecord({id:1,trackName:'No words',plainLyrics:null}),null);
 assert.equal(L.fromRecord({id:'bad',trackName:'Bad',plainLyrics:'Text'}),null);
 assert.equal(L.fromRecord({id:123,trackName:'Title',artistName:'Artist',plainLyrics:'Lines'}).source.name,'LRCLIB');
});
test('SongSelect-style text import keeps credits outside projected lyrics',()=>{
 const song=L.importText('My song\n=======\n\nVerse 1\nFirst\nSecond\n\nChorus\nThird\n\nCCLI Song #123\nWriter Name\nCopyright Example');
 assert.equal(song.title,'My song');assert.equal(L.parse(song.lyrics)[0].section,'Verse 1');assert.doesNotMatch(song.lyrics,/CCLI|Copyright/);assert.match(song.source.credits,/Writer Name/);
});

test('isolated section headings label the next block, and order metadata survives sync merging',()=>{
 assert.deepEqual(L.parse('[Chorus]\n\nSing together'),[{section:'Chorus',text:'Sing together'}]);
 const lib=require('../js/library.js'),song={id:'song',title:'Test',lyrics:'A\n\nB',order:[0,1,0],source:{name:'Import',credits:'Writer'}};
 assert.equal(lib.validate({songs:[song]}).songs[0].order.length,3);
 assert.deepEqual(lib.merge({}, {songs:[song]}, {}).songs[0].order,[0,1,0]);
 assert.throws(()=>lib.validate({songs:[{...song,order:['bad']}]}),/Invalid songs/);
});
