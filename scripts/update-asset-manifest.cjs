/* Run before tests/deployment after changing a cached file. No dependency install. */
const fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
const root=path.resolve(__dirname,'..'),file=path.join(root,'sw.js');
let source=fs.readFileSync(file,'utf8');
const entries=[];
for(const variable of ['ASSETS','OPTIONAL_ASSETS']){
 const block=source.match(new RegExp('const '+variable+' = \\[([\\s\\S]*?)\\];'))?.[1];
 if(!block)throw new Error('Missing '+variable);
 for(const match of block.matchAll(/'([^']+)'/g))entries.push(match[1]);
}
const hashes=Object.fromEntries([...new Set(entries)].map(asset=>[asset,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,asset==='./'?'index.html':asset))).digest('hex')]));
const generated='// BEGIN ASSET HASHES\nconst ASSET_HASHES = '+JSON.stringify(hashes,null,2)+';\n// END ASSET HASHES';
source=source.replace(/\/\/ BEGIN ASSET HASHES[\s\S]*?\/\/ END ASSET HASHES/,generated);
fs.writeFileSync(file,source);
