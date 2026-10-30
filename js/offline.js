/* Browser-first offline preparation. No account or install prompt is required. */
(function () {
  'use strict';
  let registration = null, started = false;
  const status = () => document.getElementById('offlineStatus');
  const retry = () => document.getElementById('btnRetryOffline');
  function show(message, failed = false) { status().textContent = message; retry().hidden = !failed; }
  function requestStatus() {
    const worker = registration?.installing || registration?.waiting || registration?.active;
    worker?.postMessage({type:'offline-status-request'});
  }
  async function start() {
    if (started) return;
    started = true;
    retry().addEventListener('click', async () => {
      show('Preparing offline…');
      try {
        registration = await navigator.serviceWorker.register('sw.js');
        await registration.update();
        const worker = registration.installing || registration.waiting || registration.active;
        worker?.postMessage({type:'prepare-offline'});
        requestStatus();
      } catch { show('Offline setup failed — retry while online', true); }
    });
    if (!('serviceWorker' in navigator) || location.protocol === 'file:') { show('Offline setup needs HTTPS or localhost', true); return; }
    navigator.serviceWorker.addEventListener('message', event => {
      const data = event.data;
      if (data?.type !== 'offline-status') return;
      if (data.ready) show('Ready offline • 3 Bibles + basic hymnary');
      else if (data.error) show('Offline setup incomplete — retry while online', true);
      else show(`Preparing offline… ${data.done}/${data.total}`);
    });
    navigator.serviceWorker.addEventListener('controllerchange', requestStatus);
    try {
      show('Preparing offline…');
      registration = await navigator.serviceWorker.register('sw.js');
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'redundant') show('Offline setup incomplete — retry while online', true);
          else requestStatus();
        });
      });
      requestStatus();
    } catch { show('Offline setup failed — retry while online', true); }
  }
  window.KOGGOffline = {start};
})();
