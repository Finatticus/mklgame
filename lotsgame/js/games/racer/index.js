// 極速山道：第一人稱寫實賽車。生涯賽（報名費＋名次獎金）、計時賽（全玩家排行榜）、車庫（買車與升級）。
import * as store from '../../store.js';
import * as audio from '../../audio.js';
import { h, fmt, toast, modal, confirmBox } from '../../ui.js';
import { hero, segmented } from '../shared/setup.js';
import { CARS, AI_CARS, CLASS_ORDER, CLASS_NAME, UPGRADES, tunedSpec, TRACKS, TRACK_ORDER, CUPS, GRID, DRIVERS } from './data.js';

const ID = 'racer', NAME = '極速山道';
const mss = (t) => { if (t == null) return '—'; const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + s.toFixed(3).padStart(6, '0'); };
const PAINTS = [0xb8bcc4, 0x2a2d33, 0x8c1f1a, 0x1d3a6e, 0xd9d4c8, 0x3c5a3a, 0x7a6a52, 0x5e1e40];

export const RULES = `
<h4>操作</h4>
<ul>
<li><strong>傾斜操控</strong>（預設）：像拿方向盤一樣左右傾斜手機轉彎。右下角按住加油，左下角按住煞車。開賽時的手機角度就是正中，第一次會請你允許動作感測。</li>
<li><strong>按鈕操控</strong>：左側 ◀ ▶ 轉向，右側油門與煞車。可在「設定」切換。</li>
<li>電腦：方向鍵或 WASD 開車，C 切換車內／車外視角，R 回到賽道，Esc 暫停。</li>
<li>預設開啟「駕駛輔助」：循跡控制、車身穩定與隨速轉向，讓手機也好開。關閉後車子更靈活，但後驅車容易甩尾。</li>
<li>衝出賽道會在碎石與草地上大幅減速；撞到護欄或岩壁會反彈。卡住時可在暫停選單「回到賽道」。</li>
</ul>
<h4>生涯賽</h4>
<ul>
<li>四個盃賽：新人盃（D 級）、進階盃（C 級）、職業盃（B 級）、大師盃（A 級），各有三條賽道，每場兩圈、六台車。你從最後一位起跑。</li>
<li>每場先扣<strong>報名費</strong>（遊戲幣），前三名依名次領<strong>獎金</strong>；所有名次都會拿到<strong>賽車獎金</strong>，用來在車庫買車與升級。</li>
<li>只能開該盃賽級別的車。在一個盃賽的三條賽道都拿到前三名，就解鎖下一個盃賽。</li>
<li>比賽中途離開視為棄權，報名費不退還。</li>
</ul>
<table>
<tr><th>盃賽</th><th>報名費</th><th>第一／二／三名獎金</th></tr>
${CUPS.map((c) => `<tr><td>${c.name}（${CLASS_NAME[c.cls]}）</td><td>${fmt(c.fee)}</td><td>${c.prize.map(fmt).join('／')}</td></tr>`).join('')}
</table>
<h4>計時賽</h4>
<p>一個人在賽道上不限圈數挑戰最快圈速，個人最佳會以半透明的「幽靈車」陪跑。每圈最佳成績會上傳到全玩家排行榜（每位玩家每條賽道保留最佳一圈）。計時賽不花費也不發放遊戲幣。</p>
<h4>車款</h4>
<table>
${Object.values(CARS).map((c) => `<tr><td>${c.name}（${CLASS_NAME[c.cls]}）</td><td>${c.desc}</td></tr>`).join('')}
</table>
<p>車輛模型來自 Sketchfab 創作者 BHP3D、GORDEYKOMARK、Hari、geevisual55、bagged_ls、Blue3D、BaseOptimal（CC-BY 4.0），遊戲中已改名並去除廠徽；天空、地面與植物素材來自 Poly Haven（CC0）。</p>`;

export async function mount(root, ctx) {
  let alive = true, race = null, V = null, tab = null;
  const mobile = matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 600;
  const P = () => {
    const p = Object.assign({ control: mobile ? 'tilt' : 'buttons', view: 'cockpit', assist: true, credits: 0, owned: ['hatch'], up: {}, car: 'hatch', cups: {}, trial: {}, tab: 'career', tTrack: 'ridge' }, store.getData().settings.racer || {});
    p.up = p.up || {}; p.cups = p.cups || {}; p.trial = p.trial || {};
    return p;
  };
  const save = (p) => store.setSetting('racer', p);
  // 上次比賽中途離開（報名費仍被扣住）：視為棄權
  if (store.heldAmount(ID) > 0) store.settle(ID, { gameName: NAME, mode: '生涯賽', result: 'lose', payout: 0, note: '中途離開，棄權' });

  // ---------------- 選單 ----------------
  function showSetup() {
    teardown();
    const p = P();
    tab = p.tab || 'career';
    const body = h('div');
    const tabs = segmented({ label: '', value: tab, options: [{ value: 'career', label: '生涯賽' }, { value: 'trial', label: '計時賽' }, { value: 'garage', label: '車庫' }], onChange: (v) => { tab = v; const q = P(); q.tab = v; save(q); draw(); } });
    const draw = () => body.replaceChildren(tab === 'career' ? careerView() : tab === 'trial' ? trialView() : garageView());
    draw();
    root.replaceChildren(h('div', { class: 'setup rc-setup' },
      hero(ID, NAME, '第一人稱寫實賽車 · 三條山路賽道'),
      tabs, body,
      h('button', { class: 'btn btn-block', style: 'margin-top:12px', onClick: showSettings }, '設定（操控、視角、駕駛輔助）')));
  }

  const cupDone = (p, cup) => TRACK_ORDER.every((t) => (p.cups[cup.id] || {})[t] && p.cups[cup.id][t] <= 3);
  const cupOpen = (p, cup) => !cup.need || cupDone(p, CUPS.find((c) => c.id === cup.need));
  function careerView() {
    const p = P();
    return h('div', { class: 'rc-list' },
      h('div', { class: 'rc-credits' }, h('span', null, '賽車獎金'), h('b', { class: 'num' }, fmt(p.credits))),
      ...CUPS.map((cup) => {
        const open = cupOpen(p, cup), res = p.cups[cup.id] || {};
        return h('div', { class: 'rc-cup' + (open ? '' : ' locked') },
          h('div', { class: 'rc-cup-head' }, h('b', null, cup.name), h('span', null, CLASS_NAME[cup.cls] + ' · 報名費 ' + fmt(cup.fee))),
          open ? h('div', { class: 'rc-events' }, ...TRACK_ORDER.map((t) => h('button', { class: 'rc-event', onClick: () => preRace(cup, t) },
            h('b', null, TRACKS[t].name), h('span', { class: 'num' }, res[t] ? '最佳第 ' + res[t] + ' 名' : '未參賽'))))
            : h('p', { class: 'rc-lock' }, '在' + CUPS.find((c) => c.id === cup.need).name + '的三條賽道都拿到前三名後解鎖'));
      }));
  }
  function preRace(cup, trackId) {
    const p = P();
    const mine = p.owned.filter((id) => CARS[id].cls === cup.cls);
    if (!mine.length) { toast('需要一台' + CLASS_NAME[cup.cls] + '的車，請到車庫購買'); tab = 'garage'; const q = P(); q.tab = 'garage'; save(q); showSetup(); return; }
    if (store.balance() < cup.fee) { toast('遊戲幣不足以支付報名費'); return; }
    let carId = mine.includes(p.car) ? p.car : mine[0];
    const pick = segmented({ label: '車款', value: carId, options: mine.map((id) => ({ value: id, label: CARS[id].name })), onChange: (v) => { carId = v; } });
    modal({
      title: cup.name + ' · ' + TRACKS[trackId].name, center: true,
      body: h('div', null, h('p', { class: 'login-note', style: 'margin-bottom:10px' }, TRACKS[trackId].sub + '，' + TRACKS[trackId].laps + ' 圈，六台車，你從最後一位起跑。'), pick,
        h('div', { class: 'result-lines' },
          h('div', null, h('span', null, '報名費'), h('span', { class: 'num' }, fmt(cup.fee))),
          h('div', null, h('span', null, '第一名獎金'), h('span', { class: 'num pos' }, fmt(cup.prize[0]))),
          h('div', null, h('span', null, '賽車獎金'), h('span', { class: 'num' }, fmt(cup.credit[5]) + '–' + fmt(cup.credit[0]))))),
      actions: [{ label: '取消', value: false }, { label: '支付並出賽', value: true, kind: 'gold' }],
    }).then((ok) => {
      if (!ok) return;
      if (!store.hold(ID, cup.fee)) { toast('遊戲幣不足'); return; }
      const q = P(); q.car = carId; save(q);
      startRace({ mode: 'career', cup, trackId, carId });
    });
  }

  function trialView() {
    const p = P();
    let trackId = p.tTrack || 'ridge', carId = p.owned.includes(p.car) ? p.car : p.owned[0];
    const info = h('div', { class: 'result-lines' });
    const board = h('div', { class: 'rc-board' });
    const drawInfo = () => {
      const tb = p.trial[trackId];
      info.replaceChildren(h('div', null, h('span', null, '個人最佳'), h('span', { class: 'num' }, tb ? mss(tb.best) + ' · ' + tb.carName : '尚無紀錄')));
      board.replaceChildren();
    };
    const tr = segmented({ label: '賽道', value: trackId, options: TRACK_ORDER.map((t) => ({ value: t, label: TRACKS[t].name })), onChange: (v) => { trackId = v; const q = P(); q.tTrack = v; save(q); drawInfo(); } });
    const cr = segmented({ label: '車款', value: carId, options: p.owned.map((id) => ({ value: id, label: CARS[id].name })), onChange: (v) => { carId = v; } });
    drawInfo();
    return h('div', null, tr, cr, info,
      h('button', { class: 'btn btn-gold btn-block', style: 'margin-top:14px', onClick: () => startRace({ mode: 'trial', trackId, carId }) }, '開始計時賽'),
      h('button', { class: 'btn btn-block', style: 'margin-top:10px', onClick: async () => {
        board.replaceChildren(h('p', { class: 'rc-lock' }, '讀取排行榜中…'));
        const rows = await store.fetchRaceBoard(trackId);
        if (!rows) { board.replaceChildren(h('p', { class: 'rc-lock' }, store.hasBackend() ? '暫時連不上伺服器' : '單機模式沒有線上排行榜')); return; }
        board.replaceChildren(h('div', { class: 'rc-rows' }, ...(rows.length ? rows : []).map((r, i) => h('div', { class: r.user === store.getData().user ? 'me' : '' }, h('span', { class: 'num' }, String(i + 1)), h('b', null, r.user), h('small', null, r.car), h('span', { class: 'num' }, mss(r.ms / 1000)))), rows.length ? null : h('p', { class: 'rc-lock' }, '還沒有人留下紀錄')));
      } }, '全玩家排行榜'), board);
  }

  function garageView() {
    const p = P();
    const wrap = h('div', null);
    const draw = () => {
      const q = P();
      wrap.replaceChildren(
        h('div', { class: 'rc-credits' }, h('span', null, '賽車獎金'), h('b', { class: 'num' }, fmt(q.credits))),
        ...Object.entries(CARS).map(([id, c]) => {
          const own = q.owned.includes(id), up = q.up[id] || {};
          const spec = tunedSpec(id, up);
          return h('div', { class: 'rc-car' + (own ? ' own' : '') },
            h('div', { class: 'rc-car-head' }, h('b', null, c.name), h('span', null, CLASS_NAME[c.cls] + ' · ' + (c.drive === 'F' ? '前驅' : c.drive === 'A' ? '四驅' : '後驅'))),
            h('p', null, c.desc),
            h('div', { class: 'rc-spec num' }, Math.round(spec.power * 1.36) + ' 匹 · ' + Math.round(spec.mass) + ' 公斤 · 抓地 ' + spec.grip.toFixed(2)),
            own ? h('div', { class: 'rc-ups' }, ...Object.entries(UPGRADES).map(([k, u]) => {
              const lv = up[k] || 0, max = lv >= u.max, cost = u.cost[lv];
              return h('button', { class: 'btn btn-sm' + (max ? '' : ' btn-gold'), disabled: max || q.credits < cost, onClick: () => { const r = P(); r.credits -= cost; r.up[id] = { ...(r.up[id] || {}), [k]: lv + 1 }; save(r); audio.play('power', { volume: 0.3 }); draw(); } }, u.name + ' ' + lv + '/' + u.max + (max ? '' : ' · ' + fmt(cost)));
            })) : h('button', { class: 'btn btn-gold btn-block', disabled: q.credits < c.price, onClick: () => { const r = P(); r.credits -= c.price; r.owned.push(id); r.car = id; save(r); audio.chime('win'); toast('購入 ' + c.name); draw(); } }, '購買 · 賽車獎金 ' + fmt(c.price)));
        }));
    };
    draw();
    return wrap;
  }

  function showSettings() {
    const p = P();
    const ctl = segmented({ label: '操控', hint: '傾斜：左右傾斜手機轉彎', value: p.control, options: [{ value: 'tilt', label: '傾斜手機' }, { value: 'buttons', label: '螢幕按鈕' }], onChange: (v) => { const q = P(); q.control = v; save(q); ctl.setHint(v === 'tilt' ? '傾斜：左右傾斜手機轉彎' : '左側 ◀ ▶ 轉向，右側油門與煞車'); } });
    const vw = segmented({ label: '視角', value: p.view, options: [{ value: 'cockpit', label: '車內' }, { value: 'chase', label: '車外' }], onChange: (v) => { const q = P(); q.view = v; save(q); } });
    const as = segmented({ label: '駕駛輔助', value: p.assist ? 'on' : 'off', options: [{ value: 'on', label: '開啟' }, { value: 'off', label: '關閉' }], onChange: (v) => { const q = P(); q.assist = v === 'on'; save(q); } });
    modal({ title: '設定', body: h('div', null, ctl, vw, as), actions: [{ label: '完成', value: true, kind: 'gold' }] });
  }

  // ---------------- 比賽 ----------------
  async function startRace(cfg) {
    teardown();
    const p = P();
    const def = TRACKS[cfg.trackId];
    const car = CARS[cfg.carId];
    const spec = tunedSpec(cfg.carId, p.up[cfg.carId]);
    // 傾斜操控需要在使用者手勢中要求權限（iPhone）
    if (p.control === 'tilt' && typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) { try { await DeviceOrientationEvent.requestPermission(); } catch (e) {} }
    const opponents = [];
    if (cfg.mode === 'career') {
      const names = DRIVERS.slice().sort(() => Math.random() - 0.5);
      GRID[cfg.cup.cls].forEach(([id, perf], k) => {
        let s, model, name;
        if (CARS[id]) { s = { ...CARS[id] }; model = CARS[id].model; name = CARS[id].name; }
        else { const a = AI_CARS[id]; s = { ...CARS.hatch, ...a.base, name: a.name }; model = a.model; name = a.name; }
        s.power *= perf; s.grip *= 1 + (perf - 1) * 0.25;
        opponents.push({ spec: s, model, name: names[k], skill: cfg.cup.skill * (0.97 + k * 0.012), paint: PAINTS[(k * 3 + cfg.trackId.length) % PAINTS.length] });
      });
    }
    const cv = h('canvas', { class: 'rc-cv' });
    const loadBar = h('i');
    const loading = h('div', { class: 'wf-loading' }, h('b', null, def.name), h('div', { class: 'wf-loadbar' }, loadBar), h('small', null, '正在載入賽道與車輛'));
    const speedEl = h('b', { class: 'num' }, '0'), gearEl = h('span', { class: 'num' }, '1'), rpmFill = h('i');
    const posEl = h('b', { class: 'num' }), lapEl = h('span', { class: 'num' }), timeEl = h('b', { class: 'num' }), bestEl = h('span', { class: 'num' });
    const mini = h('canvas', { class: 'rc-mini' });
    const count = h('div', { class: 'rc-count' });
    const msg = h('div', { class: 'rc-msg' });
    const panel = h('div', { class: 'wf-panel' });
    const pauseBtn = h('button', { class: 'sh-pause rc-pause', 'aria-label': '暫停', onClick: (e) => { e.stopPropagation(); pause(true); } }, h('i'), h('i'));
    const viewBtn = h('button', { class: 'rc-view', onClick: (e) => { e.stopPropagation(); if (!race) return; const v = race.view === 'cockpit' ? 'chase' : 'cockpit'; race.setView(v); const q = P(); q.view = v; save(q); viewBtn.textContent = v === 'cockpit' ? '車外' : '車內'; } }, p.view === 'cockpit' ? '車外' : '車內');
    const pad = (cls, label) => h('div', { class: 'rc-pad ' + cls }, h('span', null, label));
    const gas = pad('gas', '油門'), brake = pad('brake', '煞車'), left = pad('left', '◀'), right = pad('right', '▶');
    const controls = h('div', { class: 'rc-ctl ' + p.control }, brake, gas, p.control === 'buttons' ? left : null, p.control === 'buttons' ? right : null);
    const hud = h('div', { class: 'rc-hud' },
      h('div', { class: 'rc-tl' }, cfg.mode === 'career' ? h('div', null, h('small', null, '名次'), posEl) : null, h('div', null, h('small', null, '圈數'), lapEl)),
      h('div', { class: 'rc-tr' }, h('div', null, h('small', null, '本圈'), timeEl), h('div', null, h('small', null, '最佳'), bestEl)),
      mini,
      h('div', { class: 'rc-speed' }, speedEl, h('small', null, 'km/h'), h('div', { class: 'rc-rpm' }, rpmFill), h('div', { class: 'rc-gear' }, h('small', null, '檔'), gearEl)));
    const stage = h('div', { class: 'rc-stage' }, cv, hud, count, msg, controls, pauseBtn, viewBtn, panel, loading);
    root.replaceChildren(h('div', { class: 'rc' }, stage));
    V = { stage, cv, speedEl, gearEl, rpmFill, posEl, lapEl, timeEl, bestEl, mini, count, msg, panel, controls, cfg };
    const { createRace } = await import('./race.js');
    const tb = p.trial[cfg.trackId];
    try {
      race = await createRace(cv, {
        track: def, mobile, laps: cfg.mode === 'career' ? def.laps : 0, view: p.view, assist: p.assist,
        player: { spec: { ...spec, name: car.name }, model: car.model, eye: car.eye },
        opponents, ghost: cfg.mode === 'trial' && tb && tb.ghost ? { frames: tb.ghost } : null, bestLap: cfg.mode === 'trial' && tb ? tb.best : null,
        onEvent, onProgress: (f) => { loadBar.style.width = Math.round(f * 100) + '%'; }, onHud,
      });
    } catch (e) {
      console.error(e);
      if (cfg.mode === 'career') store.release(ID);
      toast('載入失敗，請確認網路後再試');
      showSetup(); return;
    }
    if (!alive || !V) { race.destroy(); race = null; return; }
    if (['localhost', '127.0.0.1'].includes(location.hostname)) window.__race = race;
    const fit = () => { const r = stage.getBoundingClientRect(); race && race.resize(Math.max(1, r.width), Math.max(1, r.height)); drawMini(); };
    V.ro = new ResizeObserver(fit); V.ro.observe(stage); fit();
    bindControls(p.control);
    loading.classList.add('done'); setTimeout(() => loading.remove(), 600);
    race.start();
    if (mobile && innerHeight > innerWidth) say('橫放手機可以看得更遠', 2600);
  }

  // 小地圖
  let miniBase = null;
  function drawMini() {
    if (!V || !race) return;
    const c = V.mini, r = c.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    c.width = r.width * dpr; c.height = r.height * dpr;
    const T = race.T, b = T.bounds, pad = 8 * dpr, sc = Math.min((c.width - pad * 2) / (b.maxX - b.minX), (c.height - pad * 2) / (b.maxZ - b.minZ));
    // 地圖以北為上：x 向右、z 向上（畫面上 −z 在下）
    const tx = (x) => c.width / 2 - (x - (b.minX + b.maxX) / 2) * sc, tz = (z) => c.height / 2 - (z - (b.minZ + b.maxZ) / 2) * sc;
    const off = document.createElement('canvas'); off.width = c.width; off.height = c.height;
    const g = off.getContext('2d');
    g.lineJoin = 'round'; g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 5 * dpr; g.beginPath();
    for (let i = 0; i <= T.n; i += 2) { const k = i % T.n; i ? g.lineTo(tx(T.X[k]), tz(T.Z[k])) : g.moveTo(tx(T.X[k]), tz(T.Z[k])); }
    g.stroke(); g.strokeStyle = 'rgba(240,232,217,0.85)'; g.lineWidth = 2 * dpr; g.stroke();
    miniBase = { off, tx, tz, dpr };
  }
  function onHud(d) {
    if (!V) return;
    V.speedEl.textContent = Math.round(d.speed);
    V.gearEl.textContent = d.gear;
    V.rpmFill.style.transform = `scaleX(${Math.min(1, d.rpm / d.redline)})`;
    V.rpmFill.parentNode.classList.toggle('hot', d.rpm > d.redline * 0.92);
    V.posEl.textContent = d.pos + '/' + d.n;
    V.lapEl.textContent = d.laps ? d.lap + '/' + d.laps : String(Math.max(1, d.lap));
    V.timeEl.textContent = mss(d.lapT);
    V.bestEl.textContent = mss(d.best);
    if (d.state === 'count') { const n = Math.ceil(d.count); V.count.textContent = n > 3 ? '' : String(n); V.count.classList.toggle('on', n <= 3); }
    else if (V.count.textContent && V.count.textContent !== '出發') { V.count.textContent = '出發'; setTimeout(() => V && V.count.classList.remove('on'), 700); }
    V.stage.classList.toggle('wrong', d.wrong);
    if (miniBase) {
      const c = V.mini, g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height); g.drawImage(miniBase.off, 0, 0);
      for (const [x, z, me] of d.dots) { g.fillStyle = me ? '#f3d488' : 'rgba(210,90,70,0.95)'; g.beginPath(); g.arc(miniBase.tx(x), miniBase.tz(z), (me ? 4 : 3) * miniBase.dpr, 0, Math.PI * 2); g.fill(); }
    }
    if (d.wrong) say('方向錯誤', 900);
  }
  let sayT = 0;
  function say(t, ms = 1600) { if (!V) return; V.msg.textContent = t; V.msg.classList.add('on'); clearTimeout(sayT); sayT = setTimeout(() => V && V.msg.classList.remove('on'), ms); }

  function onEvent(type, d) {
    if (!alive || !V) return;
    const cfg = V.cfg;
    if (type === 'go') audio.play('power', { volume: 0.35, rate: 1.4 });
    if (type === 'lap') {
      say((d.pb ? '個人最佳 ' : '圈速 ') + mss(d.time), 2200);
      if (cfg.mode === 'trial' && d.pb) {
        const q = P(); const prev = q.trial[cfg.trackId];
        if (!prev || d.time < prev.best) {
          q.trial[cfg.trackId] = { best: d.time, car: cfg.carId, carName: CARS[cfg.carId].name, ghost: d.ghost };
          save(q);
          store.queueLap({ track: cfg.trackId, trackName: TRACKS[cfg.trackId].name, car: CARS[cfg.carId].name, ms: d.time * 1000 });
        }
      }
    }
    if (type === 'finish') finishCareer(d);
  }

  function finishCareer(d) {
    if (!race || !V) return;
    const cfg = V.cfg, cup = cfg.cup, pos = d.pos;
    const payout = cup.prize[pos - 1] || 0, credit = cup.credit[pos - 1] || 0;
    const q = P();
    q.credits += credit;
    q.cups[cup.id] = q.cups[cup.id] || {};
    if (!q.cups[cup.id][cfg.trackId] || pos < q.cups[cup.id][cfg.trackId]) q.cups[cup.id][cfg.trackId] = pos;
    const wasOpen = CUPS.map((c) => cupOpen(P(), c));
    save(q);
    const nowOpen = CUPS.map((c) => cupOpen(q, c));
    const unlocked = CUPS.find((c, i) => nowOpen[i] && !wasOpen[i]);
    const ev = store.settle(ID, { gameName: NAME, mode: cup.name + ' · ' + TRACKS[cfg.trackId].name, result: pos === 1 ? 'win' : pos <= 3 ? 'draw' : 'lose', payout, note: '第 ' + pos + ' 名 · ' + CARS[cfg.carId].name });
    if (pos === 1) audio.chime('win');
    const rows = d.results.map((r, i) => h('div', { class: r.isPlayer ? 'me' : '' }, h('span', { class: 'num' }, String(i + 1)), h('b', null, r.isPlayer ? '你' : r.name), h('small', null, r.car), h('span', { class: 'num' }, mss(r.time))));
    V.panel.replaceChildren(h('div', null,
      h('div', { class: 'wf-ptitle' }, '第 ' + pos + ' 名'),
      h('div', { class: 'rc-rows' }, ...rows),
      h('div', { class: 'result-lines' },
        h('div', null, h('span', null, '遊戲幣'), h('span', { class: 'num ' + (ev.delta >= 0 ? 'pos' : 'neg') }, (ev.delta >= 0 ? '+' : '−') + fmt(Math.abs(ev.delta)))),
        h('div', null, h('span', null, '賽車獎金'), h('span', { class: 'num' }, '+' + fmt(credit)))),
      unlocked ? h('p', { class: 'login-note', style: 'text-align:center;margin-top:8px' }, '已解鎖 ' + unlocked.name) : null,
      h('button', { class: 'btn btn-gold btn-block', style: 'margin-top:12px', onClick: () => showSetup() }, '回到選單')));
    V.panel.classList.add('show');
    V.done = true;
  }

  function pause(v) {
    if (!race || !V || V.done) return;
    race.pause(v);
    if (!v) { V.panel.classList.remove('show'); return; }
    const cfg = V.cfg;
    V.panel.replaceChildren(h('div', null, h('div', { class: 'wf-ptitle' }, '暫停'),
      h('button', { class: 'btn btn-gold btn-block', onClick: () => pause(false) }, '繼續'),
      h('button', { class: 'btn btn-block', style: 'margin-top:8px', onClick: () => { race.reset(); pause(false); } }, '回到賽道'),
      h('button', { class: 'btn btn-block', style: 'margin-top:8px', onClick: () => quit() }, cfg.mode === 'career' ? '棄權離開' : '結束計時賽')));
    V.panel.classList.add('show');
  }
  async function quit() {
    const cfg = V.cfg;
    if (cfg.mode === 'career' && !V.done) {
      if (!(await confirmBox('棄權離開', '報名費 ' + fmt(cfg.cup.fee) + ' 不會退還，確定要離開嗎？', '離開'))) return;
      store.settle(ID, { gameName: NAME, mode: cfg.cup.name + ' · ' + TRACKS[cfg.trackId].name, result: 'lose', payout: 0, note: '棄權' });
    }
    showSetup();
  }

  // ---------------- 操控 ----------------
  function bindControls(mode) {
    const st = { gas: false, brake: false, left: false, right: false, steer: 0, tilt: 0, zero: null, keys: new Set() };
    V.ctl = st;
    const press = (el, k) => {
      const on = (e) => { e.preventDefault(); st[k] = true; el.classList.add('on'); };
      const off = (e) => { e.preventDefault(); st[k] = false; el.classList.remove('on'); };
      el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('pointerleave', off);
    };
    const [brakeEl, gasEl, leftEl, rightEl] = V.controls.children;
    press(gasEl, 'gas'); press(brakeEl, 'brake');
    if (leftEl) press(leftEl, 'left'); if (rightEl) press(rightEl, 'right');
    V.onOri = (e) => {
      const ang = (screen.orientation && screen.orientation.angle) ?? window.orientation ?? 0;
      let raw = ang === 90 ? e.beta : ang === -90 || ang === 270 ? -e.beta : e.gamma;
      if (raw == null) return;
      if (st.zero == null) st.zero = raw;
      st.tilt = raw - st.zero;
    };
    if (mode === 'tilt') addEventListener('deviceorientation', V.onOri);
    const kmap = { ArrowUp: 'gas', KeyW: 'gas', ArrowDown: 'brake', KeyS: 'brake', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
    V.kd = (e) => {
      if (kmap[e.code]) { st.keys.add(kmap[e.code]); e.preventDefault(); }
      else if (e.code === 'KeyC') V.stage.querySelector('.rc-view').click();
      else if (e.code === 'KeyR') race && race.reset();
      else if (e.code === 'Escape' || e.code === 'KeyP') pause(!(race && race.S.paused));
    };
    V.ku = (e) => { if (kmap[e.code]) st.keys.delete(kmap[e.code]); };
    addEventListener('keydown', V.kd); addEventListener('keyup', V.ku);
    let last = performance.now();
    const loop = (now) => {
      if (!V || !race) return;
      V.ctlRaf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const L = st.left || st.keys.has('left'), R = st.right || st.keys.has('right');
      let steer;
      if (mode === 'tilt' && !L && !R && st.zero != null) { const t = st.tilt, dz = 1.5; steer = Math.abs(t) < dz ? 0 : Math.max(-1, Math.min(1, (t - Math.sign(t) * dz) / 24)); }
      else { const target = (R ? 1 : 0) - (L ? 1 : 0); st.steer += Math.max(-dt * 3.2, Math.min(dt * 3.2, target - st.steer)); if (!target) st.steer *= Math.max(0, 1 - dt * 6); steer = st.steer; }
      race.setInput({ steer, throttle: st.gas || st.keys.has('gas') ? 1 : 0, brake: st.brake || st.keys.has('brake') ? 1 : 0 });
    };
    V.ctlRaf = requestAnimationFrame(loop);
  }

  function teardown() {
    if (V) {
      V.ro && V.ro.disconnect();
      cancelAnimationFrame(V.ctlRaf);
      V.kd && removeEventListener('keydown', V.kd);
      V.ku && removeEventListener('keyup', V.ku);
      V.onOri && removeEventListener('deviceorientation', V.onOri);
    }
    if (race) { race.destroy(); race = null; }
    if (window.__race) window.__race = null;
    V = null; miniBase = null;
  }
  const onVis = () => { if (document.hidden && race && !race.S.paused) pause(true); };
  document.addEventListener('visibilitychange', onVis);
  showSetup();
  return () => {
    alive = false; document.removeEventListener('visibilitychange', onVis);
    // 比賽中離開：棄權
    if (V && V.cfg && V.cfg.mode === 'career' && !V.done && store.heldAmount(ID) > 0) store.settle(ID, { gameName: NAME, mode: '生涯賽', result: 'lose', payout: 0, note: '中途離開，棄權' });
    teardown();
  };
}
