// 月下白狼：寫實 3D 倖存者。操控白狼在夜林中求生，擊退狼群、巨蛛、戰馬與飛龍，撐過十五分鐘並打倒最終頭目。
import * as store from '../../store.js';
import * as audio from '../../audio.js';
import { h, fmt, toast, modal, confirmBox } from '../../ui.js';
import { hero, segmented } from '../shared/setup.js';
import { BREEDS, REGIONS, FACTIONS, regionById, ownedCount, healthyWolves } from './pack.js';
import { WEAPONS, EVOS, PASSIVES, MAPS, META, BOSSES, RUN_SECONDS, metaCost, xpNeed, WEAPON_MAX, PASSIVE_MAX } from './data.js';

const ID = 'wolf', NAME = '月下白狼';
const mmss = (s) => { s = Math.max(0, Math.floor(s)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };

export const RULES = `
<h4>目標</h4>
<p>你是一匹白狼。夜裡的敵人會從四面八方湧來，越來越多也越來越強。撐過 15 分鐘，打倒最後現身的頭目「焚翼」即獲勝。途中第 5、10 分鐘各有一隻頭目。</p>
<h4>操作</h4>
<ul>
<li><strong>手指按住畫面任何地方拖曳</strong>就是搖桿，往哪拖白狼就往哪跑；放開就停下。電腦可用方向鍵或 WASD。</li>
<li>攻擊全部自動進行，你只需要走位、閃避、收集魂晶。</li>
<li>擊倒敵人會累積右下角的<strong>嚎月</strong>，滿了點一下：震退並重創周圍所有敵人、震散敵方投射物。</li>
</ul>
<h4>成長</h4>
<ul>
<li>撿起敵人留下的<strong>魂晶</strong>累積經驗，升級時從三個選項中挑一個：新武器、武器升級或被動能力。武器最多 6 種、被動最多 6 種。</li>
<li>武器升到 ${WEAPON_MAX} 級、並擁有對應的被動能力時，可在升級或寶箱中<strong>進化</strong>：
  月牙爪＋利齒、霜息＋野性、月輪＋月華、幽狼＋疾風、雷擊＋狼嗅、鬼火＋恢復。</li>
<li>金色的精英敵人與頭目會掉落<strong>寶箱</strong>。地上偶爾出現月泉（回復生命）與狼嗅石（吸取全部魂晶）。</li>
</ul>
<h4>敵人</h4>
<table>
<tr><td>幼蛛</td><td>數量多、移動快，但很脆弱。</td></tr>
<tr><td>暗狼</td><td>速度接近白狼，會成群追擊。</td></tr>
<tr><td>巨蛛</td><td>行動緩慢，血量厚。</td></tr>
<tr><td>夢魘戰馬</td><td>靠近後揚蹄，接著直線高速衝鋒，看到揚蹄就橫向閃開。</td></tr>
<tr><td>灰翼飛龍</td><td>在空中保持距離，朝你吐火球。</td></tr>
</table>
<h4>狼群模式</h4>
<ul>
<li>從月光谷出發，一塊塊攻下夜林與霜原的十二塊領地，最後打倒焚翼之巢的焚翼。</li>
<li>只能出征和我方領地相鄰的地方。出征時最多帶五匹健康的狼同行，牠們會自動跟隨、攻擊，各有品種技能：灰狼撲擊、赤狼撕咬流血、霜狼冰牙緩速、影狼暗襲爆擊、黑狼守護吸引敵人。</li>
<li>出征目標是擊倒足夠的敵人，再打倒現身的頭目；防守則要撐過時間。左下角可切換「集合」（緊跟白狼）與「進攻」（自由追擊）。嚎月會同時替狼群回血並提升攻擊。</li>
<li>在戰鬥中倒下的狼不會死，但要休養兩天。每次出征或狩獵都會過一天：領地產出食物，每匹狼每天吃掉 1 份；食物不夠會挨餓，下一場生命與攻擊 −20%。</li>
<li>攻下領地後有機會收服新的狼（暗狼部族最容易）。狼會隨出征升級（最高 Lv 10）。營地可用食物擴建巢穴（狼群上限）、獵場（食物產量）、月石（狼群生命與攻擊）。</li>
<li>從第三天起，敵人可能反攻你的邊境領地，當天不去防守就會失守。</li>
<li>每場出征結束都會依結果發放遊戲幣與魂石。</li>
</ul>
<h4>魂石與局外成長</h4>
<p>每局結束依擊倒數、存活時間與頭目獲得<strong>魂石</strong>，可在「魂石商店」永久強化白狼。在月影森林存活 10 分鐘可解鎖「霜原遺跡」（敵人更強，獎勵 1.3 倍）。</p>
<h4>遊戲幣</h4>
<p>不需下注，結束時依表現發放：</p>
<table>
<tr><th>項目</th><th>獎勵</th></tr>
<tr><td>每存活 1 分鐘</td><td>60</td></tr>
<tr><td>每擊倒 10 隻</td><td>4</td></tr>
${BOSSES.map((b) => `<tr><td>擊倒${b.name}</td><td>${fmt(b.reward)}</td></tr>`).join('')}
<tr><td>獲勝</td><td>1,500</td></tr>
<tr><td>霜原遺跡</td><td>以上全部 × 1.3</td></tr>
</table>
<p>中途離開會自動保存成長進度，下次從離開的時間點繼續（場上的敵人會重新出現）。</p>`;

function itemName(c) {
  if (c.type === 'weapon') return WEAPONS[c.id].name;
  if (c.type === 'passive') return PASSIVES[c.id].name;
  if (c.type === 'evo') return EVOS[c.id].name;
  if (c.type === 'heal') return '月泉';
  return '魂石';
}
function itemDesc(c) {
  if (c.type === 'weapon') return WEAPONS[c.id].desc[c.lv - 1];
  if (c.type === 'passive') return PASSIVES[c.id].desc;
  if (c.type === 'evo') return EVOS[c.id].desc;
  if (c.type === 'heal') return '回復 30 生命';
  return '本局額外獲得 5 魂石';
}
function itemTag(c) {
  if (c.type === 'evo') return '進化';
  if (c.type === 'weapon') return c.lv === 1 ? '新武器' : 'Lv ' + c.lv;
  if (c.type === 'passive') return c.lv === 1 ? '新能力' : 'Lv ' + c.lv;
  return '';
}

export async function mount(root, ctx) {
  let alive = true, game = null, V = null, saveTimer = 0, finished = false;
  const mobile = matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 600;
  const prog = () => Object.assign({ meta: {}, souls: 0, unlocked: { forest: true }, best: {}, map: 'forest' }, store.getData().settings.wolf || {});
  const saveProg = (p) => store.setSetting('wolf', p);

  // ---------------- 選單 ----------------
  function showSetup() {
    teardown();
    const p = prog();
    if (p.mode === 'pack') return showPackSetup(p);
    const saved = store.loadGame(ID);
    let mapId = p.unlocked[p.map] ? p.map : 'forest';
    const cards = h('div', { class: 'wf-maps' });
    const drawMaps = () => cards.replaceChildren(...Object.entries(MAPS).map(([k, m]) => {
      const locked = !p.unlocked[k];
      return h('button', { class: 'wf-map' + (k === mapId ? ' on' : '') + (locked ? ' locked' : ''), disabled: locked, onClick: () => { mapId = k; p.map = k; saveProg(p); drawMaps(); } },
        h('b', null, m.name), h('small', null, locked ? m.unlock : m.sub),
        h('span', { class: 'num' }, locked ? '未解鎖' : (p.best[k] ? '最佳 ' + mmss(p.best[k]) : '尚未挑戰')));
    }));
    drawMaps();
    const resume = saved && saved.snap ? h('button', { class: 'btn btn-block', style: 'margin-top:10px', onClick: () => begin(saved.snap.mapId, saved.snap) }, '繼續上一局（' + MAPS[saved.snap.mapId].name + ' ' + mmss(saved.snap.t) + '）') : null;
    root.replaceChildren(h('div', { class: 'setup' },
      hero(ID, NAME, '寫實 3D 倖存者 · 撐過十五分鐘'),
      modeSwitch(p),
      cards,
      h('div', { class: 'stake-summary' },
        h('div', null, h('small', null, '魂石'), h('b', { class: 'num' }, fmt(p.souls))),
        h('div', null, h('small', null, '局外強化'), h('b', null, Object.values(p.meta).reduce((a, b) => a + b, 0) + ' 級'))),
      h('button', { class: 'btn btn-gold btn-block', onClick: async () => { if (saved && saved.snap && !(await confirmBox('重新出發', '上一局的進度會被放棄，確定嗎？', '重新出發'))) return; begin(mapId, null); } }, '出發'),
      resume,
      h('button', { class: 'btn btn-block', style: 'margin-top:10px', onClick: showShop }, '魂石商店'),
      h('p', { class: 'login-note', style: 'text-align:center' }, '不需下注。依存活時間、擊倒數與頭目發放遊戲幣。')));
  }

  function modeSwitch(p) {
    return segmented({ label: '模式', hint: p.mode === 'pack' ? '攻佔領地、收服新狼，帶狼群一起作戰' : '單獨求生十五分鐘', value: p.mode || 'solo', options: [{ value: 'solo', label: '生存模式' }, { value: 'pack', label: '狼群模式' }], onChange: (v) => { p.mode = v; saveProg(p); showSetup(); } });
  }
  function showPackSetup(p) {
    const c = p.pack;
    const body = c
      ? [h('div', { class: 'stake-summary', style: 'grid-template-columns: repeat(3, 1fr)' },
          h('div', null, h('small', null, '已過'), h('b', { class: 'num' }, c.day + ' 天')),
          h('div', null, h('small', null, '領地'), h('b', { class: 'num' }, ownedCount(c) + ' / ' + REGIONS.length)),
          h('div', null, h('small', null, '狼群'), h('b', { class: 'num' }, c.wolves.length + ' 匹'))),
        h('button', { class: 'btn btn-gold btn-block', onClick: () => openCampaign() }, c.won ? '檢視征途' : '繼續征途'),
        h('button', { class: 'btn btn-block', style: 'margin-top:10px', onClick: async () => { if (await confirmBox('重新開始', '目前的領地與狼群會全部重來，確定嗎？', '重新開始', '取消', 'danger')) { const { newCampaign } = await import('./pack.js'); p.pack = newCampaign(); saveProg(p); openCampaign(); } } }, '重新開始征途')]
      : [h('p', { class: 'login-note', style: 'margin:4px 0 14px' }, '白狼帶著兩匹同伴從月光谷出發。攻下鄰近的領地、收服新的狼、擴建營地，直到夜林與霜原都屬於你的狼群。'),
        h('button', { class: 'btn btn-gold btn-block', onClick: async () => { const { newCampaign } = await import('./pack.js'); p.pack = newCampaign(); saveProg(p); openCampaign(); } }, '開始征途')];
    root.replaceChildren(h('div', { class: 'setup' },
      hero(ID, NAME, '狼群模式 · 攻佔十二塊領地'),
      modeSwitch(p),
      ...body,
      h('button', { class: 'btn btn-block', style: 'margin-top:10px', onClick: showShop }, '魂石商店'),
      h('p', { class: 'login-note', style: 'text-align:center' }, '不需下注。每場出征依結果發放遊戲幣與魂石。')));
  }
  let campaignOff = null;
  async function openCampaign() {
    teardown();
    const p = prog();
    const c = p.pack;
    const { showCampaign } = await import('./packui.js');
    const page = h('div', { class: 'setup wp-page' });
    root.replaceChildren(page);
    campaignOff = showCampaign(page, c, {
      save: () => { const q = prog(); q.pack = c; saveProg(q); },
      startBattle: (spec, allies, hungry) => { campaignOff && campaignOff(); campaignOff = null; begin(spec.biome, null, { spec, allies, hungry }); },
    });
    page.prepend(h('div', { class: 'wp-top' }, h('button', { class: 'btn btn-sm', onClick: () => { campaignOff && campaignOff(); campaignOff = null; showSetup(); } }, '‹ 返回'), h('b', null, '狼群征途'), h('span')));
  }

  function showShop() {
    const p = prog();
    const list = h('div', { class: 'wf-shop' });
    const head = h('div', { class: 'wf-shop-head' });
    const draw = () => {
      head.replaceChildren(h('span', null, '持有魂石'), h('b', { class: 'num' }, fmt(p.souls)));
      list.replaceChildren(...Object.entries(META).map(([k, m]) => {
        const lv = p.meta[k] || 0, max = lv >= m.max, cost = metaCost(k, lv);
        return h('div', { class: 'wf-shop-row' },
          h('div', { class: 'wf-shop-text' }, h('b', null, m.name, h('small', { class: 'num' }, ' ' + lv + ' / ' + m.max)), h('span', null, m.desc)),
          h('button', { class: 'btn btn-sm' + (max ? '' : ' btn-gold'), disabled: max || p.souls < cost, onClick: () => { p.souls -= cost; p.meta[k] = lv + 1; saveProg(p); audio.play('power', { volume: 0.3 }); draw(); } }, max ? '已滿' : fmt(cost)));
      }));
    };
    draw();
    modal({ title: '魂石商店', body: h('div', null, head, list), actions: [{ label: '完成', value: true, kind: 'gold' }] }).then(() => alive && showSetup());
  }

  // ---------------- 遊戲 ----------------
  let packCfg = null;
  async function begin(mapId, snap, pack = null) {
    teardown();
    finished = false;
    packCfg = pack;
    const p = prog();
    const cv = h('canvas', { class: 'wf-cv' });
    const loadBar = h('i');
    const loading = h('div', { class: 'wf-loading' }, h('b', null, pack ? pack.spec.name : MAPS[mapId].name), h('div', { class: 'wf-loadbar' }, loadBar), h('small', null, '正在載入模型與地形'));
    const xpFill = h('i');
    const lvEl = h('b', { class: 'num' }, 'Lv 1'), timeEl = h('b', { class: 'num wf-time' }, '00:00'), killEl = h('span', { class: 'num' }, '0');
    const bossName = h('span'), bossFill = h('i');
    const bossBar = h('div', { class: 'wf-boss' }, bossName, h('div', { class: 'wf-bossbar' }, bossFill));
    const hpFill = h('i'), hpBar = h('div', { class: 'wf-hp' }, hpFill);
    const ultRing = h('div', { class: 'wf-ult-ring' });
    const ultBtn = h('button', { class: 'wf-ult', onClick: (e) => { e.stopPropagation(); if (game && game.howl()) { ultBtn.classList.remove('ready'); } } }, ultRing, h('span', null, '嚎月'));
    const pauseBtn = h('button', { class: 'sh-pause wf-pausebtn', 'aria-label': '暫停', onClick: (e) => { e.stopPropagation(); pause(true); } }, h('i'), h('i'));
    const joy = h('div', { class: 'wf-joy' }, h('i'));
    const banner = h('div', { class: 'wf-banner' });
    const panel = h('div', { class: 'wf-panel' });
    // 狼群模式：任務進度、同伴血條、指令
    const goalFill = h('i'), goalText = h('span');
    const goal = pack ? h('div', { class: 'wf-goal' }, goalText, h('div', { class: 'wf-goalbar' }, goalFill)) : null;
    const party = pack ? h('div', { class: 'wf-party' }, ...pack.allies.map((a) => h('div', { class: 'wf-pm', dataset: { id: a.id } }, h('b', null, a.name), h('div', { class: 'wf-pmbar' }, h('i'))))) : null;
    const cmdBtn = pack && pack.allies.length ? h('button', { class: 'wf-cmd', onClick: (e) => { e.stopPropagation(); const f = game && game.S.cmd === 'attack'; game && game.setCommand(f ? 'follow' : 'attack'); cmdBtn.classList.toggle('follow', f); cmdBtn.firstChild.textContent = f ? '集合' : '進攻'; } }, h('span', null, '進攻'), h('small', null, '切換')) : null;
    const allyBars = pack ? pack.allies.map(() => { const b = h('div', { class: 'wf-hp ally' }, h('i')); return b; }) : [];
    const hud = h('div', { class: 'wf-hud' },
      h('div', { class: 'wf-xp' }, xpFill),
      h('div', { class: 'wf-top' }, lvEl, timeEl, h('span', { class: 'wf-kills' }, killEl, h('small', null, ' 擊倒'))),
      goal, bossBar, party);
    const stage = h('div', { class: 'wf-stage' }, cv, h('div', { class: 'wf-vignette' }), ...allyBars, hpBar, hud, pauseBtn, ultBtn, cmdBtn, joy, banner, panel, loading);
    root.replaceChildren(h('div', { class: 'wf' }, stage));
    V = { stage, cv, xpFill, lvEl, timeEl, killEl, bossBar, bossName, bossFill, hpBar, hpFill, ultBtn, ultRing, joy, banner, panel, loading, goalFill, goalText, party, allyBars };
    audio.preload('boom', 'bigboom', 'hitm', 'power', 'missile');
    const { createGame } = await import('./game.js');
    try {
      game = await createGame(cv, { mapId, meta: p.meta, mobile, saved: snap, pack, onEvent, onProgress: (f) => { loadBar.style.width = Math.round(f * 100) + '%'; } });
    } catch (e) {
      console.error(e);
      toast('載入失敗，請確認網路後再試');
      showSetup();
      return;
    }
    if (!alive || !V) { game.destroy(); game = null; return; }
    if (['localhost', '127.0.0.1'].includes(location.hostname)) window.__wolf = game;
    const fit = () => { const r = stage.getBoundingClientRect(); game && game.resize(Math.max(1, r.width), Math.max(1, r.height)); };
    fit();
    V.ro = new ResizeObserver(fit); V.ro.observe(stage);
    bindInput(stage);
    loading.classList.add('done');
    setTimeout(() => loading.remove(), 600);
    game.start();
    hudLoop();
    if (pack) setTimeout(() => showBanner(pack.spec.name, pack.spec.kind === 'defend' ? '守住領地' : '擊倒' + pack.spec.kills + '隻敵人'), 400);
    else {
      store.saveGame(ID, { snap: game.snapshot() });
      if (!snap) setTimeout(() => showBanner(MAPS[mapId].name, '撐過十五分鐘'), 400);
    }
  }

  // ---------------- 介面更新 ----------------
  const _v = { x: 0, y: 0, z: 0 };
  let lastUlt = -1;
  function hudLoop() {
    if (!V || !game) return;
    V.raf = requestAnimationFrame(hudLoop);
    const S = game.S;
    V.xpFill.style.transform = `scaleX(${Math.min(1, S.xp / xpNeed(S.lv))})`;
    V.lvEl.textContent = 'Lv ' + S.lv;
    V.timeEl.textContent = mmss(S.t);
    V.killEl.textContent = fmt(S.kills);
    V.hpFill.style.transform = `scaleX(${Math.max(0, S.hp / S.maxhp)})`;
    V.hpBar.classList.toggle('low', S.hp / S.maxhp < 0.3);
    // 血條跟著白狼
    const cam = game.W.camera;
    const vec = cam.position.clone().set(S.x, 0, S.z + 1.0);
    vec.project(cam);
    const r = V.stage.getBoundingClientRect();
    V.hpBar.style.left = ((vec.x + 1) / 2) * r.width + 'px';
    V.hpBar.style.top = ((1 - vec.y) / 2) * r.height + 8 + 'px';
    const u = Math.round(S.ult * 100);
    if (u !== lastUlt) { lastUlt = u; V.ultRing.style.background = `conic-gradient(rgba(232,211,160,0.95) ${u}%, rgba(232,211,160,0.12) 0)`; V.ultBtn.classList.toggle('ready', u >= 100); }
    if (S.boss && !S.boss.dying) {
      V.bossBar.classList.add('show');
      V.bossName.textContent = S.boss.def.name;
      V.bossFill.style.transform = `scaleX(${Math.max(0, S.boss.hp / S.boss.maxhp)})`;
    } else V.bossBar.classList.remove('show');
    if (packCfg) {
      const G = S.goal;
      if (G.kind === 'defend') { V.goalText.textContent = '守住' + G.name + ' · 剩 ' + mmss(Math.max(0, G.time - S.t)); V.goalFill.style.transform = `scaleX(${Math.min(1, S.t / G.time)})`; }
      else { V.goalText.textContent = G.boss ? '打倒頭目' : '壓制' + G.name + ' ' + Math.min(S.kills, G.need) + ' / ' + G.need; V.goalFill.style.transform = `scaleX(${Math.min(1, S.kills / G.need)})`; }
      S.allies.forEach((a, k) => {
        const row = V.party.children[k];
        if (row) { row.classList.toggle('down', a.down); row.lastChild.firstChild.style.transform = `scaleX(${Math.max(0, a.hp / a.maxhp)})`; }
        const bar = V.allyBars[k];
        if (bar) {
          if (a.down) { bar.style.display = 'none'; return; }
          bar.style.display = '';
          vec.set(a.x, 0, a.z + 0.9).project(cam);
          bar.style.left = ((vec.x + 1) / 2) * r.width + 'px'; bar.style.top = ((1 - vec.y) / 2) * r.height + 6 + 'px';
          bar.firstChild.style.transform = `scaleX(${Math.max(0, a.hp / a.maxhp)})`;
        }
      });
      return;
    }
    saveTimer += 1 / 60;
    if (saveTimer > 12 && S.state === 'play' && !S.dead && !S.won) { saveTimer = 0; store.saveGame(ID, { snap: game.snapshot() }); }
  }
  function showBanner(t, sub) {
    if (!V) return;
    V.banner.replaceChildren(...[h('b', null, t)].concat(sub ? [h('small', null, sub)] : []));
    V.banner.classList.remove('show'); void V.banner.offsetWidth; V.banner.classList.add('show');
  }
  function panelShow(content) { V.panel.replaceChildren(content); V.panel.classList.add('show'); }
  function panelHide() { V && V.panel.classList.remove('show'); }

  // ---------------- 事件 ----------------
  function onEvent(type, d) {
    if (!alive || !V) return;
    if (type === 'levelup') {
      const box = h('div', { class: 'wf-cards' }, ...d.choices.map((c) => h('button', { class: 'wf-card' + (c.type === 'evo' ? ' evo' : ''), onClick: () => { panelHide(); game.choose(c); } },
        h('div', { class: 'wf-card-top' }, h('b', null, itemName(c)), h('span', null, itemTag(c))),
        h('p', null, itemDesc(c)))));
      panelShow(h('div', null, h('div', { class: 'wf-ptitle' }, '升級', h('small', { class: 'num' }, ' Lv ' + d.lv)), box));
    }
    if (type === 'chest') {
      panelShow(h('div', null, h('div', { class: 'wf-ptitle' }, d.big ? '頭目寶箱' : '寶箱'),
        h('div', { class: 'wf-got' }, ...d.got.map((c) => h('div', { class: c.type === 'evo' ? 'evo' : '' }, h('b', null, itemName(c)), h('span', null, itemTag(c) || itemDesc(c))))),
        h('button', { class: 'btn btn-gold btn-block', onClick: () => { panelHide(); game.resume(); } }, '收下')));
    }
    if (type === 'boss') showBanner(d.name, '現身');
    if (type === 'bossdown') showBanner(d.name, '已擊倒');
    if (type === 'banner') showBanner(d.text);
    if (type === 'revive') showBanner('不屈', '白狼重新站起');
    if (type === 'dead') setTimeout(() => finish(false), 1400);
    if (type === 'allydown') showBanner(d.name + ' 倒下', '休養兩天後歸隊');
    if (type === 'packend') { if (d.win) audio.chime('win'); setTimeout(() => finishPack(d), d.win ? 200 : 1400); }
    if (type === 'victory') { audio.chime('win'); finish(true); }
  }

  function pause(v) {
    if (!game || finished) return;
    const S = game.S;
    if (v && (S.state !== 'play' || S.dead)) return;
    game.pause(v);
    if (!v) return panelHide();
    if (!packCfg) store.saveGame(ID, { snap: game.snapshot() });
    const build = h('div', { class: 'wf-build' },
      ...S.weapons.map((w) => h('div', null, h('b', null, WEAPONS[w.id] ? WEAPONS[w.id].name : EVOS[w.id].name), h('span', { class: 'num' }, EVOS[w.id] ? '進化' : 'Lv ' + w.lv))),
      ...Object.entries(S.passives).map(([k, lv]) => h('div', { class: 'pas' }, h('b', null, PASSIVES[k].name), h('span', { class: 'num' }, 'Lv ' + lv))));
    panelShow(h('div', null, h('div', { class: 'wf-ptitle' }, '暫停', h('small', { class: 'num' }, ' ' + mmss(S.t))), build,
      h('button', { class: 'btn btn-gold btn-block', onClick: () => pause(false) }, '繼續'),
      packCfg ? h('button', { class: 'btn btn-block', style: 'margin-top:8px', onClick: () => finishPack({ win: false, allies: game.S.allies.map((a) => ({ id: a.id, kills: a.kills, down: a.down })), kills: game.S.kills, t: game.S.t, elitesWolf: 0 }) }, '撤退')
        : h('button', { class: 'btn btn-block', style: 'margin-top:8px', onClick: () => finish(false) }, '結束並結算')));
  }

  // 狼群模式：一場出征結束
  async function finishPack(res) {
    if (!game || finished || !packCfg) return;
    finished = true;
    const spec = packCfg.spec, win = res.win;
    const p = prog();
    const payout = Math.round(win ? 150 + spec.lv * 120 + (spec.final ? 1500 : 0) : 40 + Math.floor(res.t / 60) * 30);
    const souls = Math.round((Math.floor(res.kills / 20) + (win ? 5 + spec.lv * 3 : 1)) * (1 + 0.1 * (p.meta.greed || 0)));
    p.souls += souls;
    saveProg(p);
    const ev = store.settle(ID, { gameName: NAME, mode: '狼群 · ' + spec.name, result: win ? 'win' : 'lose', payout, note: (spec.kind === 'defend' ? '防守' : '出征') + spec.name + ' · 擊倒 ' + fmt(res.kills) });
    teardown();
    packCfg = null;
    root.replaceChildren(h('div', { class: 'setup' }));
    const { battleReport } = await import('./packui.js');
    await battleReport(p.pack, spec, res, { delta: ev.delta, souls, balance: ev.balance }, () => saveProg(p));
    if (alive) openCampaign();
  }

  function finish(won) {
    if (!game || finished) return;
    finished = true;
    const S = game.S, map = MAPS[S.mapId];
    const p = prog();
    const sec = Math.min(S.t, RUN_SECONDS + 120);
    const bossR = BOSSES.filter((b) => S.bossesDone.includes(b.id)).reduce((a, b) => a + b.reward, 0);
    const payout = Math.round(((Math.min(sec, RUN_SECONDS) / 60) * 60 + Math.floor(S.kills / 10) * 4 + bossR + (won ? 1500 : 0)) * map.reward);
    const greed = 1 + 0.1 * (p.meta.greed || 0);
    const souls = Math.round((Math.floor(S.kills / 15) + Math.floor(sec / 60) * 3 + S.bossesDone.length * 20 + S.elitesKilled * 2 + (won ? 50 : 0) + (S.bonusSouls || 0)) * greed * map.reward);
    p.souls += souls;
    const prevBest = p.best[S.mapId] || 0;
    if (sec > prevBest) p.best[S.mapId] = Math.floor(sec);
    let unlockedNow = false;
    if (S.mapId === 'forest' && sec >= 600 && !p.unlocked.frost) { p.unlocked.frost = true; unlockedNow = true; }
    saveProg(p);
    const ev = store.settle(ID, {
      gameName: NAME, mode: map.name, result: won ? 'win' : sec >= 300 ? 'draw' : 'lose', payout,
      note: '存活 ' + mmss(sec) + ' · 擊倒 ' + fmt(S.kills) + ' · Lv ' + S.lv,
      marks: won ? { wolfWin: 1 } : null,
    });
    store.clearGame(ID);
    const stats = { sec, kills: S.kills, lv: S.lv, souls, unlockedNow };
    teardown();
    showSetup();
    modal({
      title: won ? '黎明降臨' : '白狼倒下', center: true,
      body: h('div', null, h('div', { class: 'result-figure pos' }, '+' + fmt(ev.delta)),
        h('div', { class: 'result-lines' },
          h('div', null, h('span', null, '存活時間'), h('span', { class: 'num' }, mmss(stats.sec))),
          h('div', null, h('span', null, '擊倒'), h('span', { class: 'num' }, fmt(stats.kills))),
          h('div', null, h('span', null, '等級'), h('span', { class: 'num' }, 'Lv ' + stats.lv)),
          h('div', null, h('span', null, '魂石'), h('span', { class: 'num' }, '+' + fmt(stats.souls))),
          h('div', null, h('span', null, '結算後餘額'), h('span', { class: 'num' }, fmt(ev.balance)))),
        stats.unlockedNow ? h('p', { class: 'login-note', style: 'text-align:center;margin-top:10px' }, '已解鎖新地圖：霜原遺跡') : null),
      actions: [{ label: '好', value: true, kind: 'gold' }],
    });
  }

  // ---------------- 操控 ----------------
  function bindInput(stage) {
    const J = { id: null, ox: 0, oy: 0 };
    const R = 52;
    const set = (dx, dy) => {
      const l = Math.hypot(dx, dy), k = l > R ? R / l : 1;
      const nx = dx * k, ny = dy * k;
      V.joy.firstChild.style.transform = `translate(${nx}px, ${ny}px)`;
      game && game.setInput(nx / R, ny / R);
    };
    stage.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button, .wf-panel')) return;
      if (J.id !== null) return;
      J.id = e.pointerId; J.ox = e.clientX; J.oy = e.clientY;
      const r = stage.getBoundingClientRect();
      V.joy.style.left = e.clientX - r.left + 'px'; V.joy.style.top = e.clientY - r.top + 'px';
      V.joy.classList.add('on');
      stage.setPointerCapture?.(e.pointerId);
      set(0, 0);
    });
    stage.addEventListener('pointermove', (e) => { if (e.pointerId !== J.id) return; set(e.clientX - J.ox, e.clientY - J.oy); });
    const up = (e) => { if (e.pointerId !== J.id) return; J.id = null; V && V.joy.classList.remove('on'); game && game.setInput(0, 0); };
    stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
    const keys = new Set();
    const kmap = { ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1], ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0] };
    const applyKeys = () => { let x = 0, z = 0; for (const k of keys) { x += kmap[k][0]; z += kmap[k][1]; } if (J.id === null && game) game.setInput(x, z); };
    V.kd = (e) => {
      if (kmap[e.code]) { keys.add(e.code); applyKeys(); e.preventDefault(); }
      else if (e.code === 'Space') { game && game.howl(); e.preventDefault(); }
      else if (e.code === 'Escape' || e.code === 'KeyP') pause(!(game && game.S.paused));
    };
    V.ku = (e) => { if (kmap[e.code]) { keys.delete(e.code); applyKeys(); } };
    addEventListener('keydown', V.kd); addEventListener('keyup', V.ku);
  }

  function teardown() {
    if (game && !finished && !game.S.dead && !packCfg) store.saveGame(ID, { snap: game.snapshot() });
    if (campaignOff) { campaignOff(); campaignOff = null; }
    if (V) {
      cancelAnimationFrame(V.raf);
      V.ro && V.ro.disconnect();
      V.kd && removeEventListener('keydown', V.kd);
      V.ku && removeEventListener('keyup', V.ku);
    }
    if (game) { game.destroy(); game = null; }
    if (window.__wolf) window.__wolf = null;
    V = null;
  }

  const onVis = () => { if (document.hidden && game && !game.S.paused) pause(true); };
  document.addEventListener('visibilitychange', onVis);
  showSetup();
  return () => { alive = false; document.removeEventListener('visibilitychange', onVis); teardown(); };
}
