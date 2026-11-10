/* Verify the actual packaged bytes, not just a Windows working tree. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(process.argv[2]||'.'),coreOnly=process.argv.includes('--core');
const source=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const hashes=JSON.parse(source.match(/const ASSET_HASHES = (\{[\s\S]*?\});/)[1]);
const optional=new Set([...source.match(/const OPTIONAL_ASSETS = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(m=>m[1]));
let checked=0;
for(const [asset,expected] of Object.entries(hashes)){
 const file=path.join(root,asset==='./'?'index.html':asset);
 if(coreOnly&&optional.has(asset)&&!fs.existsSync(file))continue;
 const actual=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
 if(actual!==expected)throw Error('Offline release integrity mismatch: '+asset);
 checked++;
}
console.log('Verified '+checked+' packaged offline asset hashes.');
