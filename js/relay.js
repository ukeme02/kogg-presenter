/* Optional same-origin loopback bridge for OBS's separate browser process. */
(function () {
  'use strict';
  const local = location.hostname === '127.0.0.1' && location.protocol === 'http:';
  let active = false, sequence = 0, receiving = 0, sendQueue = Promise.resolve();
  async function publish(live, themes, settings) {
    if (!active) return;
    const token = ++sequence;
    try {
      const data = {live,themes,settings:window.KOGGLibrary.portableSettings(settings),assets:{}};
      for (const id of window.KOGGLibrary.assetIds(data,false)) {
        const image = await window.KOGGAssets?.get(id);
        if (image) data.assets[id] = image;
      }
      if (token !== sequence) return;
      sendQueue = sendQueue.catch(() => {}).then(async () => {
        if (token !== sequence) return;
        const response = await fetch('/__kogg/state',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
        if (!response.ok) throw new Error('Output bridge failed (' + response.status + ')');
      });
      await sendQueue;
    } catch (err) { console.warn(err.message); }
  }
  window.KOGGRelay = {publish};
  if (!local) return;
  fetch('/__kogg/status').then(r => r.ok ? r.json() : null).then(status => {
    if (!status?.relay) return;
    active = true;
    if (!location.pathname.endsWith('display.html')) {
      const read = (k,fallback) => { try { return JSON.parse(localStorage.getItem(k)) || fallback; } catch { return fallback; } };
      publish(read('cp_live',{mode:'blank',slides:[],index:0}),read('cp_themes',[]),read('cp_settings',{}));
      return;
    }
    const events = new EventSource('/__kogg/events');
    events.onmessage = async event => {
      const token = ++receiving;
      try {
        const data = JSON.parse(event.data);
        for (const [id,image] of Object.entries(data.assets || {})) await window.KOGGAssets?.put(id,image);
        if (token !== receiving) return;
        localStorage.setItem('cp_themes',JSON.stringify(data.themes));
        localStorage.setItem('cp_settings',JSON.stringify(data.settings));
        localStorage.setItem('cp_live',JSON.stringify(data.live));
        if (typeof render === 'function') render(data.live);
      } catch (err) { console.warn('Output bridge:',err.message); }
    };
  }).catch(() => {});
})();
