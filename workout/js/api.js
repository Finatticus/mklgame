/* API 層：正式模式呼叫 GAS；未設定網址時為示範模式（localStorage） */
(function () {
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };

  function apiUrl() {
    return LS.get('wo.apiUrl', '') || (window.APP_CONFIG && window.APP_CONFIG.API_URL) || '';
  }
  function isDemo() { return !apiUrl(); }

  class ApiError extends Error {
    constructor(code, message) { super(message); this.code = code; }
  }

  async function remote(action, payload) {
    const session = LS.get('wo.session', null);
    const body = Object.assign({ action }, session || {}, payload || {});
    let res;
    try {
      res = await fetch(apiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(body),
        redirect: 'follow',
      });
    } catch (e) {
      throw new ApiError('NETWORK', '連線失敗，請檢查網路');
    }
    let json;
    try { json = await res.json(); } catch (e) { throw new ApiError('BAD_RESPONSE', '後端回應格式錯誤，請確認 GAS 部署設定'); }
    if (!json.ok) throw new ApiError(json.error, json.message || '發生錯誤');
    return json.data;
  }

  /* ---------- 示範模式 ---------- */
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
  const nowStr = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
  const demo = {
    async register({ account, password }) {
      await wait(400);
      const users = LS.get('wo.demo.users', {});
      if (users[account]) throw new ApiError('ACCOUNT_EXISTS', '此帳號已被註冊');
      users[account] = { password, approved: true };
      LS.set('wo.demo.users', users);
      return { status: 'pending' };
    },
    async login({ account, password }) {
      await wait(400);
      const u = LS.get('wo.demo.users', {})[account];
      if (!u || u.password !== password) throw new ApiError('BAD_LOGIN', '帳號或密碼錯誤');
      return { account, token: 'demo' };
    },
    async me() { return { account: (LS.get('wo.session', {}) || {}).account }; },
    async 'inbody.list'() { await wait(200); return LS.get('wo.demo.inbody', []); },
    async 'inbody.save'({ record, photo }) {
      await wait(400);
      const list = LS.get('wo.demo.inbody', []);
      const rec = Object.assign({}, record);
      if (photo) rec.photoUrl = '';
      const i = rec.id ? list.findIndex((r) => r.id === rec.id) : -1;
      rec.updatedAt = nowStr();
      if (i >= 0) { rec.createdAt = list[i].createdAt; list[i] = rec; }
      else { rec.id = uid(); rec.createdAt = nowStr(); list.push(rec); }
      list.sort((a, b) => String(a.date).localeCompare(String(b.date)));
      LS.set('wo.demo.inbody', list);
      return rec;
    },
    async 'inbody.delete'({ id }) {
      await wait(200);
      LS.set('wo.demo.inbody', LS.get('wo.demo.inbody', []).filter((r) => r.id !== id));
      return { id };
    },
    async 'inbody.parse'() {
      await wait(1800);
      return { record: Object.assign({}, window.SEED_INBODY, { coachNote: '' }), notes: '示範模式：回傳的是範例資料，不是真的解析結果。', model: 'demo' };
    },
  };

  async function call(action, payload) {
    if (isDemo()) {
      if (!demo[action]) throw new ApiError('UNKNOWN_ACTION', action);
      return demo[action](payload || {});
    }
    return remote(action, payload);
  }

  window.API = { call, isDemo, apiUrl, ApiError, LS };
})();
