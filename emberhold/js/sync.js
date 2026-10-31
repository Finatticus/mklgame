// 與 Google Apps Script 同步：有網路時上傳/下載，離線時只存在本機
const Sync = (() => {
  const URL_KEY = 'emberhold_gas_url';
  let status = 'off';
  let lastSync = 0;
  let busy = false;
  const listeners = [];

  const url = () => localStorage.getItem(URL_KEY) || CONFIG.GAS_URL || '';
  function setUrl(u) { localStorage.setItem(URL_KEY, u.trim()); setStatus(u ? 'idle' : 'off'); }
  function setStatus(s) { status = s; listeners.forEach(f => f(s)); }
  const enabled = () => !!url();

  async function request(method, payload) {
    if (method === 'GET') {
      const q = new URLSearchParams(payload).toString();
      const r = await fetch(url() + (url().includes('?') ? '&' : '?') + q, { method: 'GET' });
      return r.json();
    }
    // text/plain 避免 CORS 預檢（GAS 不支援 OPTIONS）
    const r = await fetch(url(), {
      method: 'POST', body: JSON.stringify(payload),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    });
    return r.json();
  }

  // 下載雲端存檔；雲端較新（或 force）時覆蓋本機。回傳 'pulled' | 'kept' | 'empty' | 'error'
  async function pull(force = false) {
    if (!enabled()) return 'off';
    if (!navigator.onLine) { setStatus('offline'); return 'offline'; }
    setStatus('syncing');
    try {
      const res = await request('GET', { action: 'load', id: Store.playerId() });
      if (!res.ok) throw new Error(res.error || 'load failed');
      lastSync = Date.now();
      setStatus('ok');
      if (!res.save) return 'empty';
      if (force || res.save.updatedAt > Store.S.updatedAt) { Store.replace(res.save); return 'pulled'; }
      return 'kept';
    } catch (e) {
      console.warn('sync pull', e); setStatus('error'); return 'error';
    }
  }

  async function push() {
    if (!enabled() || busy) return 'off';
    if (!navigator.onLine) { setStatus('offline'); return 'offline'; }
    busy = true; setStatus('syncing');
    try {
      const res = await request('POST', { action: 'save', id: Store.playerId(), save: Store.S });
      if (!res.ok) throw new Error(res.error || 'save failed');
      lastSync = Date.now();
      Store.clearDirty();
      setStatus('ok');
      if (res.result === 'stale' && res.save) { Store.replace(res.save); return 'replaced'; }
      return 'saved';
    } catch (e) {
      console.warn('sync push', e); setStatus('error'); return 'error';
    } finally { busy = false; }
  }

  function pushBeacon() {
    if (!enabled() || !navigator.onLine) return;
    try {
      fetch(url(), {
        method: 'POST', keepalive: true, headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'save', id: Store.playerId(), save: Store.S }),
      });
    } catch (e) {}
  }

  function start(onReplaced) {
    setStatus(enabled() ? (navigator.onLine ? 'idle' : 'offline') : 'off');
    const after = r => { if (r === 'replaced' || r === 'pulled') onReplaced(); };
    window.addEventListener('online', async () => { after(await pull()); after(await push()); });
    window.addEventListener('offline', () => enabled() && setStatus('offline'));
    setInterval(async () => { if (Store.isDirty()) after(await push()); }, CONFIG.SYNC_INTERVAL_MS);
    document.addEventListener('visibilitychange', () => { if (document.hidden) pushBeacon(); });
  }

  return {
    url, setUrl, enabled, pull, push, start,
    get status() { return status; }, get lastSync() { return lastSync; },
    onStatus: f => listeners.push(f),
  };
})();
