/* KOGG Presenter — IndexedDB asset store.
   Big binary-ish assets (church logo, theme background images) are stored here
   so they never blow the ~5MB localStorage quota. Small ones stay inline.
   Gracefully degrades: callers fall back to inline storage if IDB is missing. */
(function () {
  'use strict';
  const DB = 'kogg-assets';
  const STORE = 'assets';
  let dbp = null;
  const mem = Object.create(null);   // tiny runtime cache

  function open() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
      };
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
    return dbp.catch(() => null);
  }

  window.KOGGAssets = {
    async put(id, value) {
      if (!id || value == null) return false;
      mem[id] = value;
      try {
        const db = await open();
        if (!db) return false;
        await new Promise((res, rej) => {
          const tx = db.transaction(STORE, 'readwrite');
          tx.objectStore(STORE).put(value, id);
          tx.oncomplete = res;
          tx.onerror = () => rej(tx.error);
        });
        return true;
      } catch {
        return false;
      }
    },
    async get(id) {
      if (!id) return null;
      if (mem[id] != null) return mem[id];
      try {
        const db = await open();
        if (!db) return null;
        const v = await new Promise((res, rej) => {
          const tx = db.transaction(STORE, 'readonly');
          const rq = tx.objectStore(STORE).get(id);
          rq.onsuccess = () => res(rq.result);
          rq.onerror = () => rej(rq.error);
        });
        if (v != null) mem[id] = v;
        return v != null ? v : null;
      } catch {
        return null;
      }
    },
    async del(id) {
      if (!id) return;
      delete mem[id];
      try {
        const db = await open();
        if (!db) return;
        await new Promise((res) => {
          const tx = db.transaction(STORE, 'readwrite');
          tx.objectStore(STORE).delete(id);
          tx.oncomplete = res;
          tx.onerror = res;
        });
      } catch { /* ignore */ }
    }
  };
})();
