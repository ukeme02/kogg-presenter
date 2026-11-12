const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const S=require('../js/scripture-tools.js'),raw=fs.readFileSync('data/efik-nt.json'),pack=JSON.parse(raw),source=require('../tools/efik-source.json'),receipt=require('../docs/efik-import-receipt.json'),base=JSON.parse(fs.readFileSync('data/kjv.json')).books;
test('Efik NT retains all source verses and canonical reference positions without invented OT text',()=>{
 assert.equal(S.bibleData(pack),true);assert.equal(pack.metadata.scope,'NT');
 assert.deepEqual(pack.books.map(b=>b.name),base.map(b=>b.name));
 assert.ok(pack.books.slice(0,39).every(b=>b.chapters.length===0));
 assert.deepEqual(pack.books.slice(39).map(b=>b.chapters.length),base.slice(39).map(b=>b.chapters.length));
 assert.equal(pack.books.reduce((n,b)=>n+b.chapters.length,0),260);
 let count=0;for(const b of pack.books)for(const c of b.chapters)for(const v of c){assert.ok(v.trim());assert.ok(!/[\uFFFD\x00-\x08\x0b\x0c\x0e-\x1f<>]/.test(v));count++;}
 assert.equal(count,7958);assert.equal(receipt.verses,count);
 assert.equal(pack.books[39].chapters[0][0],'Emi edi ñwed emana Jisọs Kraist, emi ekedide eyen Defid, emi okotode ke ubon Ebraham.');
 assert.match(pack.books[42].chapters[2][15],/Abasi/);
});
test('Efik pack carries its licence, reviewed revision and reproducible integrity receipt',()=>{
 assert.equal(pack.metadata.license,'CC BY-SA 4.0');assert.equal(pack.metadata.copyright,'Copyright © 1995 by Biblica, Inc.');assert.equal(pack.metadata.revision,4);
 assert.equal(pack.metadata.sourceArchiveSha256,source.archiveSha256);assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),receipt.sha256);
 const row=require('../data/content-catalog.json').bibles.find(b=>b.file==='data/efik-nt.json');assert.equal(row.bytes,raw.length);assert.match(row.short,/New Testament/);
});
test('partial editions require an explicit NT scope and cannot silently omit a New Testament book',()=>{
 const wrong=structuredClone(pack);delete wrong.metadata.scope;assert.equal(S.bibleData(wrong),false);
 wrong.metadata.scope='NT';wrong.books[42].chapters=[];assert.equal(S.bibleData(wrong),false);
});
test('navigation stops before Matthew and after Revelation, and crosses NT books correctly',()=>{
 assert.equal(S.adjacent(pack.books,{bookIdx:39,ch:1,vFrom:1,vTo:1},-1),null);
 assert.equal(S.adjacent(pack.books,{bookIdx:65,ch:22,vFrom:21,vTo:21},1),null);
 assert.deepEqual(S.adjacent(pack.books,{bookIdx:39,ch:28,vFrom:20,vTo:20},1),{bookIdx:40,ch:1,vFrom:1,vTo:1});
 assert.equal(S.passage(pack,{bookIdx:18,ch:23,vFrom:1,vTo:1}),'');
});
