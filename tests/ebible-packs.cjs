const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const sources=JSON.parse(fs.readFileSync('tools/ebible-sources.json','utf8'));
const receipts=JSON.parse(fs.readFileSync('docs/ebible-import-receipts.json','utf8'));
const base=JSON.parse(fs.readFileSync('data/kjv.json','utf8')).books;
const catalogue=JSON.parse(fs.readFileSync('data/content-catalog.json','utf8'));
const wording={yor:'Ní ìbẹ̀rẹ̀ ohun gbogbo Ọlọ́run dá àwọn ọ̀run àti ayé.',hausa:'A farko-farko, Allah ya halicci sama da ƙasa.',ibo:'Na mmalite Chineke kere eluigwe na ụwa.',engmsb:'In the beginning God created the heavens and the earth.'};
for(const s of sources)test(`${s.short}: complete, attributed optional pack with preserved references`,()=>{
 const raw=fs.readFileSync(s.file),b=JSON.parse(raw),receipt=receipts.find(r=>r.id===s.id),row=catalogue.bibles.find(r=>r.file===s.file);
 assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),receipt.sha256);
 assert.equal(row.bytes,raw.length);assert.equal(b.metadata.license,s.license);assert.equal(b.metadata.source,s.source);
 assert.deepEqual(b.books.map(x=>x.name),base.map(x=>x.name));
 assert.deepEqual(b.books.map(x=>x.chapters.length),base.map(x=>x.chapters.length));
 assert.equal(b.books[0].chapters[0][0],wording[s.id]);
 const absent=[];let count=0;
 b.books.forEach(book=>book.chapters.forEach((ch,ci)=>ch.forEach((v,vi)=>{
  assert.equal(typeof v,'string');assert.equal(v.trim(),v);assert.ok(!/[\uFFFD\x00-\x08\x0b\x0c\x0e-\x1f<>]/.test(v),`${book.name} ${ci+1}:${vi+1}`);
  if(v)count++;else absent.push(`${book.name} ${ci+1}:${vi+1}`);
 })));
 assert.equal(count,receipt.verses);assert.deepEqual(absent,receipt.absentVerses);
 assert.ok(b.books[34].chapters[2][0], 'Habakkuk 3:1 is not lost with headings');
 assert.ok(b.books[42].chapters[2][15].length>100,'John 3:16');
 if(s.id==='yor'||s.id==='hausa'){
  assert.equal(b.books[39].chapters[16][20],'');assert.ok(b.books[39].chapters[16][21]);
  assert.match(b.metadata.attribution,/original work by Biblica/);assert.equal(b.metadata.licenseUrl,'https://creativecommons.org/licenses/by-sa/4.0/');
 }
});
