/* API 層：正式模式呼叫 GAS；未設定網址時為示範模式（localStorage） */
(function () {
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };

  function apiUrl() {
    const o = LS.get('wo.apiUrl', '');
    if (o === 'demo') return ''; // 強制示範模式（本機測試用）
    return o || (window.APP_CONFIG && window.APP_CONFIG.API_URL) || '';
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
  const D = (col) => LS.get('wo.demo.' + col, col === 'settings' ? {} : []);
  const DS = (col, v) => LS.set('wo.demo.' + col, v);
  const upsert = (col, rec) => {
    const list = D(col);
    const r = Object.assign({}, rec);
    const i = r.id ? list.findIndex((x) => x.id === r.id) : -1;
    r.updatedAt = nowStr();
    if (i >= 0) { r.createdAt = list[i].createdAt; list[i] = r; } else { r.id = uid(); r.createdAt = nowStr(); list.push(r); }
    DS(col, list);
    return r;
  };
  const remove = (col, id) => DS(col, D(col).filter((x) => x.id !== id));
  function syncIbWeight(ib) {
    const day = String(ib.date || '').slice(0, 10);
    let ws = D('weight');
    const linked = ws.find((w) => w.inbodyId === ib.id);
    ws = ws.filter((w) => !(w.date === day && (!linked || w.id !== linked.id)));
    DS('weight', ws);
    if (ib.weight == null || ib.weight === '') { if (linked) remove('weight', linked.id); return; }
    upsert('weight', { id: linked ? linked.id : '', date: day, weight: ib.weight, source: 'InBody', inbodyId: ib.id, note: '' });
  }
  const demo = {
    async register({ account, password }) {
      await wait(300);
      const users = LS.get('wo.demo.users', {});
      if (users[account]) throw new ApiError('ACCOUNT_EXISTS', '此帳號已被註冊');
      users[account] = { password, approved: true };
      LS.set('wo.demo.users', users);
      return { status: 'pending' };
    },
    async login({ account, password }) {
      await wait(300);
      const u = LS.get('wo.demo.users', {})[account];
      if (!u || u.password !== password) throw new ApiError('BAD_LOGIN', '帳號或密碼錯誤');
      return { account, token: 'demo' };
    },
    async sync() {
      await wait(200);
      return { inbody: D('inbody'), weight: D('weight'), workout: D('workout'), food: D('food'), settings: D('settings') };
    },
    async 'inbody.list'() { return D('inbody'); },
    async 'inbody.save'({ record }) {
      await wait(300);
      const r = upsert('inbody', record);
      syncIbWeight(r);
      return { record: r, weight: D('weight') };
    },
    async 'inbody.delete'({ id }) {
      remove('inbody', id);
      DS('weight', D('weight').filter((w) => w.inbodyId !== id));
      return { id, weight: D('weight') };
    },
    async 'weight.save'({ record }) {
      await wait(200);
      const ws = D('weight');
      const same = ws.find((w) => w.date === record.date && w.id !== record.id);
      if (same && same.source === 'InBody') throw new ApiError('INBODY_DAY', `這天已有 InBody 量測（${same.weight} kg），以 InBody 為準`);
      const self = record.id ? ws.find((w) => w.id === record.id) : null;
      if (self && same) remove('weight', same.id);
      return upsert('weight', { id: (self || same || {}).id || '', date: record.date, weight: record.weight, source: '手動', inbodyId: '', note: record.note || '' });
    },
    async 'data.save'({ col, record }) {
      if (col === 'weight') return demo['weight.save']({ record });
      await wait(250);
      return upsert(col, record);
    },
    async 'data.delete'({ col, id }) { await wait(150); remove(col, id); return { id }; },
    async settings({ data }) { const s = Object.assign(D('settings'), data); DS('settings', s); return s; },
    async 'inbody.parse'() {
      await wait(1500);
      return { record: Object.assign({}, window.SEED_INBODY, { coachNote: '' }), notes: '示範模式：回傳的是範例資料，不是真的解析結果。', model: 'demo' };
    },
    async 'food.estimate'({ text }) {
      await wait(1200);
      return {
        items: [
          { name: '雞腿便當（白飯）', amount: '1 份，飯約 1 碗', kcal: 780, protein: 38, carb: 92, fat: 28, fiber: 4 },
          { name: '茶葉蛋', amount: '1 顆', kcal: 75, protein: 7, carb: 0.5, fat: 5, fiber: 0 },
        ],
        notes: '示範模式：這是範例估算，不是真的 AI 結果。描述：' + (text || ''),
        model: 'demo',
      };
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
