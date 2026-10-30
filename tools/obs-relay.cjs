/* Loopback-only operator + OBS bridge. Run: node tools/obs-relay.cjs */
'use strict';
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
function createRelay() {
  let snapshot = null;
  const viewers = new Set();
  const server = http.createServer((req,res) => {
    const expected = 'http://' + req.headers.host;
    if (req.headers.origin && req.headers.origin !== expected) { res.writeHead(403); res.end('Origin not allowed'); return; }
    let url;
    try { url = new URL(req.url, expected); } catch { res.writeHead(400); res.end(); return; }
    if (!/^127\.0\.0\.1(?::\d+)?$/.test(req.headers.host || '')) { res.writeHead(403); res.end('Use 127.0.0.1'); return; }
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    if (url.pathname === '/__kogg/status' && req.method === 'GET') { res.setHeader('Content-Type','application/json'); res.end('{"relay":true}'); return; }
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
          snapshot = JSON.stringify({live:data.live,themes:data.themes,settings:{logoId:data.settings.logoId || '',logoImage:data.settings.logoImage || '',logoName:data.settings.logoName || ''},assets:data.assets});
          for (const viewer of viewers) viewer.write('data: ' + snapshot + '\n\n');
          res.writeHead(204); res.end();
        } catch { res.writeHead(400); res.end('Invalid output state'); }
      }); return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
    let decoded;
    try { decoded = decodeURIComponent(url.pathname); } catch { res.writeHead(400); res.end(); return; }
    const relative = decoded === '/' ? 'index.html' : decoded.slice(1);
    if (!/^(?:(?:js|css|data|fonts|icons)\/[\w.\/-]+|index\.html|display\.html|landing\.html|manifest\.webmanifest|sw\.js)$/.test(relative) || relative.split('/').some(p=>p.startsWith('.'))) { res.writeHead(404); res.end(); return; }
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
if (require.main === module) createRelay().listen(8766,'127.0.0.1',() => console.log('Operator: http://127.0.0.1:8766/\nOBS Browser Source: http://127.0.0.1:8766/display.html?overlay=1\nKeep this process running during OBS use.'));
module.exports = {createRelay};
