/* Loopback-only operator + OBS bridge. Run: node tools/obs-relay.cjs */
'use strict';
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const crypto=require('node:crypto'),os=require('node:os');
const ROOT = path.resolve(__dirname, '..');
function createRelay(options={}) {
  const remote=options.remote===true,hosts=new Set(['127.0.0.1',...(options.remoteHosts||[])]);
  let pairing=crypto.randomBytes(24).toString('hex'),operator=null,revision=0,lastCommand=0;
  const completed=new Map(),pending=new Map();
  function tokenOK(req){const supplied=(req.headers.authorization||'').replace(/^Bearer /,'');return /^[a-f0-9]{48}$/.test(supplied)&&crypto.timingSafeEqual(Buffer.from(supplied),Buffer.from(pairing));}
  function finish(id,status,message){const p=pending.get(id);if(!p)return;clearTimeout(p.timer);pending.delete(id);const result={status,body:JSON.stringify({ok:status===200,message})};completed.set(id,result);if(completed.size>200)completed.delete(completed.keys().next().value);p.res.writeHead(status,{'Content-Type':'application/json'});p.res.end(result.body);}
  function body(req,res,fn){let text='';req.on('data',chunk=>{text+=chunk;if(text.length>2048){res.writeHead(413);res.end();req.destroy();}});req.on('end',()=>{if(text.length>2048)return;try{fn(JSON.parse(text));}catch{res.writeHead(400);res.end('Invalid request');}});}

  let snapshot = null;
  const viewers = new Set();
  const server = http.createServer((req,res) => {
    const expected = 'http://' + req.headers.host;
    if (req.headers.origin && req.headers.origin !== expected) { res.writeHead(403); res.end('Origin not allowed'); return; }
    let url;
    try { url = new URL(req.url, expected); } catch { res.writeHead(400); res.end(); return; }
    if (!hosts.has(url.hostname)) { res.writeHead(403); res.end('Use the bridge address'); return; }
    const local=!remote||['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket?.remoteAddress);
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    const json=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
    if(url.pathname.startsWith('/__kogg/remote/')){
      if(!remote){json(404,{message:'Restart the bridge with --remote to enable phone pairing.'});return;}
      if(url.pathname==='/__kogg/remote/pair'&&local&&req.method==='GET'){const port=url.port;json(200,{urls:[...hosts].filter(x=>x!=='127.0.0.1').map(host=>'http://'+host+(port?':'+port:'')+'/remote.html#'+pairing)});return;}
      if(url.pathname==='/__kogg/remote/revoke'&&local&&req.method==='POST'){pairing=crypto.randomBytes(24).toString('hex');for(const id of pending.keys())finish(id,403,'Pairing revoked');completed.clear();json(200,{ok:true});return;}
      if(url.pathname==='/__kogg/remote/operator'&&local&&req.method==='GET'){
        if(operator){json(409,{message:'Another operator is already connected.'});return;}
        res.writeHead(200,{'Content-Type':'text/event-stream','Connection':'keep-alive'});res.write(': operator connected\n\n');operator=res;
        const heartbeat=setInterval(()=>res.write(': keepalive\n\n'),15000);req.on('close',()=>{clearInterval(heartbeat);if(operator===res)operator=null;for(const id of pending.keys())finish(id,503,'Operator disconnected');});return;
      }
      if(url.pathname==='/__kogg/remote/ack'&&local&&req.method==='POST'){body(req,res,data=>{finish(data.id,data.ok?200:409,data.message||'Command handled');json(200,{ok:true});});return;}
      if(!tokenOK(req)){json(401,{message:'Pair again using the current link from the operator.'});return;}
      if(url.pathname==='/__kogg/remote/state'&&req.method==='GET'){const live=snapshot?JSON.parse(snapshot).live:{mode:'blank',slides:[]},slide=live.slides?.[live.index]||{};json(200,{connected:!!operator,revision,mode:live.mode,index:live.index||0,total:live.slides?.length||0,label:String(slide.label||live.title||'No slide').slice(0,200),text:String(slide.text||'').slice(0,2500)});return;}
      if(url.pathname==='/__kogg/remote/command'&&req.method==='POST'){body(req,res,data=>{
        if(!['next','previous','blank','resume'].includes(data.action)||typeof data.id!=='string'||!/^[a-zA-Z0-9-]{12,80}$/.test(data.id)){json(400,{message:'Unsupported command'});return;}
        if(completed.has(data.id)){const done=completed.get(data.id);res.writeHead(done.status,{'Content-Type':'application/json'});res.end(done.body);return;}
        if(pending.has(data.id)){json(409,{message:'Command already pending'});return;}
        if(!operator){json(503,{message:'Open the local operator first.'});return;}
        if(data.revision!==revision){json(409,{message:'Output changed. Review the current slide and try again.'});return;}
        if(Date.now()-lastCommand<180){json(429,{message:'Wait for the previous tap.'});return;}lastCommand=Date.now();
        pending.set(data.id,{res,timer:setTimeout(()=>finish(data.id,504,'Operator did not acknowledge. Check its connection before retrying.'),4000)});
        operator.write('data: '+JSON.stringify({id:data.id,action:data.action})+'\n\n');
      });return;}
      json(404,{message:'Not found'});return;
    }
    // Only the laptop operator may publish or read complete output snapshots.
    if(!local&&url.pathname.startsWith('/__kogg/')){json(403,{message:'Laptop operator only'});return;}
    if (url.pathname === '/__kogg/status' && req.method === 'GET') { res.setHeader('Content-Type','application/json'); res.end(JSON.stringify({relay:true,readers:viewers.size,remote})); return; }
    if (url.pathname === '/__kogg/events' && req.method === 'GET') {
      res.writeHead(200,{'Content-Type':'text/event-stream','Connection':'keep-alive'});
      res.write(': connected\n\n'); if (snapshot) res.write('data: ' + snapshot + '\n\n');
      viewers.add(res);
      const heartbeat = setInterval(() => res.write(': keepalive\n\n'),15000);
      req.on('close',() => { clearInterval(heartbeat); viewers.delete(res); }); return;
    }
    if (url.pathname === '/__kogg/state' && req.method === 'POST') {
      let chunks = [], size = 0;
      req.on('data',chunk => { size += chunk.length; if (size > 20*1024*1024) { res.writeHead(413); res.end(); req.destroy(); } else chunks.push(chunk); });
      req.on('end',() => {
        try {
          const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          if (!data.live || !Array.isArray(data.live.slides) || !Array.isArray(data.themes) || !data.themes.length || !data.settings || !data.assets) throw Error('Invalid state');
          // Do not retain arbitrary properties or any authentication/session state.
          snapshot = JSON.stringify({live:data.live,themes:data.themes,settings:{logoStyle:data.settings.logoStyle || 'combination',logoId:data.settings.logoId || '',logoImage:data.settings.logoImage || '',logoName:data.settings.logoName || ''},assets:data.assets});
          revision++;
          for (const viewer of viewers) viewer.write('data: ' + snapshot + '\n\n');
          res.writeHead(204); res.end();
        } catch { res.writeHead(400); res.end('Invalid output state'); }
      }); return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
    let decoded;
    try { decoded = decodeURIComponent(url.pathname); } catch { res.writeHead(400); res.end(); return; }
    const relative = decoded === '/' ? 'index.html' : decoded.slice(1);
    if (!/^(?:(?:js|css|data|fonts|icons)\/[\w.\/-]+|index\.html|display\.html|landing\.html|remote\.html|manifest\.webmanifest|sw\.js)$/.test(relative) || relative.split('/').some(p=>p.startsWith('.'))) { res.writeHead(404); res.end(); return; }
    if(!local&&!['remote.html','js/remote.js','css/remote.css','fonts/NunitoSans-Variable.woff2','icons/kogg-symbol-white.svg'].includes(relative)){res.writeHead(403);res.end('Phone remote only');return;}
    const file = path.resolve(ROOT,relative);
    if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403); res.end(); return; }
    fs.stat(file,(error,stat) => {
      if (error || !stat.isFile()) { res.writeHead(404); res.end(); return; }
      const real = fs.realpathSync(file);
      if (!real.startsWith(fs.realpathSync(ROOT) + path.sep)) { res.writeHead(403); res.end(); return; }
      const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.woff2':'font/woff2'};
      res.setHeader('Content-Type',mime[path.extname(file)] || 'application/octet-stream');
      if (req.method === 'HEAD') res.end(); else fs.createReadStream(file).on('error',()=>res.destroy()).pipe(res);
    });
  });
  return server;
}
if (require.main === module) {
 const remote=process.argv.includes('--remote'),remoteHosts=[...new Set(Object.values(os.networkInterfaces()).flat().filter(x=>x&&x.family==='IPv4'&&!x.internal&&/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(x.address)).map(x=>x.address))];
 createRelay({remote,remoteHosts}).listen(8766,remote?'0.0.0.0':'127.0.0.1',()=>console.log('Operator: http://127.0.0.1:8766/\nOBS Browser Source: http://127.0.0.1:8766/display.html?overlay=1\n'+(remote?'Phone remote enabled on private network interfaces. Pair from Stream in the laptop operator.':'Phone remote off. Add --remote to enable trusted Wi-Fi pairing.')+'\nKeep this process running during use.'));
}
module.exports = {createRelay};
