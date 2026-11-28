// 蒼穹戰機：縱向捲軸射擊，五個關卡。不需下注，依分數與過關數發放遊戲幣。
import * as store from '../../store.js';
import * as audio from '../../audio.js';
import { h, fmt, toast, modal } from '../../ui.js';
import { segmented, hero } from '../shared/setup.js';
import { createGame } from './game.js';
import { STAGES, STAGE_BONUS } from './stages.js';

const ID = 'shooter', NAME = '蒼穹戰機';
const MAX_CONTINUES = 2;
const DIFFS = { normal: { label: '普通', rate: 1, desc: '敵彈較慢，適合熟悉關卡' }, hard: { label: '困難', rate: 1.5, desc: '敵彈更快更密，獎勵 1.5 倍' } };

export const RULES = `
<h4>目標</h4>
<p>駕駛戰機飛越海岸、山谷、沙漠、雪原與敵軍要塞五個關卡，擊落敵機、摧毀地面部隊，打倒每關最後的頭目。</p>
<h4>操作</h4>
<ul>
<li><strong>手指在畫面任何地方拖曳</strong>，戰機會跟著移動（移動量放大 1.25 倍，手指不會擋住機身）。射擊是自動的。</li>
<li>右下角圓鈕施放<strong>炸彈</strong>：清除畫面上所有敵彈、重創敵人，並短暫無敵。</li>
<li>電腦可用方向鍵或 WASD 移動，空白鍵或 X 放炸彈。</li>
<li>拖曳時機身中央會出現紅白小點，那是<strong>被擊中的判定點</strong>，只有它碰到子彈才算中彈。</li>
</ul>
<h4>道具</h4>
<table>
<tr><td>V／L</td><td>武器道具會在紅色 V（機砲，散射範圍廣）與藍色 L（雷射，集中貫穿）之間變換。撿到相同武器提升火力，不同武器則切換。火力最高 8 級。</td></tr>
<tr><td>P</td><td>目前武器火力提升一級。</td></tr>
<tr><td>M</td><td>追蹤飛彈，最高 4 級。</td></tr>
<tr><td>B</td><td>炸彈加一，最多 6 顆。</td></tr>
<tr><td>勳章</td><td>加分，連續撿取分數越來越高。</td></tr>
</table>
<p>道具通常由沙色的運輸直升機或卡車攜帶。中彈會失去一架戰機，火力下降兩級。</p>
<h4>勝負與接關</h4>
<ul>
<li>開局 3 架備用機，分數達到 10 萬與 30 萬各再加一架；全部用完即遊戲結束。可以接關 ${MAX_CONTINUES} 次，接關後分數歸零重新計算，但保留已過的關卡。</li>
<li>每次進入新關卡會自動存檔，離開後可從該關開頭接著玩。</li>
</ul>
<h4>遊戲幣</h4>
<p>不需下注。結束時依分數與過關數發放：</p>
<table>
<tr><th>項目</th><th>獎勵</th></tr>
<tr><td>分數</td><td>每 100 分 1 枚</td></tr>
${STAGE_BONUS.map((b, i) => `<tr><td>通過第 ${i + 1} 關</td><td>${fmt(b)}</td></tr>`).join('')}
<tr><td>困難模式</td><td>以上全部 × 1.5</td></tr>
</table>`;

export async function mount(root, ctx) {
  let alive = true, game = null, run = null, V = null;
  const prefs = Object.assign({ diff: 'normal' }, store.getData().settings.shooter || {});
  const best = () => (store.getData().settings.shooterBest || 0);

  function payoutOf(r) {
    const bonus = r.cleared.reduce((a, i) => a + STAGE_BONUS[i], 0);
    return Math.round((Math.floor(r.bankScore / 100) + bonus) * DIFFS[r.diff].rate);
  }

  // ---------------- 選單 ----------------
  function showSetup() {
    teardown();
    const saved = store.loadGame(ID);
    const diffOpt = segmented({ label: '難度', hint: DIFFS[prefs.diff].desc, value: prefs.diff, options: Object.entries(DIFFS).map(([k, d]) => ({ value: k, label: d.label })), onChange: (v) => { prefs.diff = v; diffOpt.setHint(DIFFS[v].desc); store.setSetting('shooter', { diff: v }); } });
    const startBtn = h('button', { class: 'btn btn-gold btn-block', onClick: () => begin(null) }, '出擊');
    const resume = saved && saved.run ? h('button', { class: 'btn btn-block', style: 'margin-top:10px', onClick: () => begin(saved.run) }, '從第 ' + (saved.run.stage + 1) + ' 關繼續') : null;
    const stages = h('div', { class: 'sh-stages' }, ...STAGES.map((s, i) => h('div', { class: 'sh-stagechip' }, h('b', null, String(i + 1)), h('span', null, s.title.split(' · ')[1]))));
    root.replaceChildren(h('div', { class: 'setup' },
      hero(ID, NAME, '縱向射擊 · 五個關卡 · 手指拖曳操控'),
      stages, diffOpt,
      h('div', { class: 'stake-summary' }, h('div', null, h('small', null, '最高分'), h('b', null, fmt(best()))), h('div', null, h('small', null, '獎勵'), h('b', { class: 'pos' }, '依分數發放'))),
      startBtn, resume,
      h('p', { class: 'login-note', style: 'text-align:center' }, '不需下注。每 100 分得 1 枚遊戲幣，另有過關獎勵。')));
  }

  // ---------------- 遊戲畫面 ----------------
  async function begin(savedRun) {
    run = savedRun ? { ...savedRun } : { diff: prefs.diff, stage: 0, score: 0, bankScore: 0, cleared: [], continues: 0, lives: 3, bombs: 3, weapon: 'V', lv: 1, mis: 0 };
    const cv = h('canvas', { class: 'sh-cv' });
    const bombBtn = h('button', { class: 'sh-bomb', onClick: () => game && game.bomb() }, h('span', null, 'B'), h('small', null, '3'));
    const pauseBtn = h('button', { class: 'sh-pause', onClick: () => pause(true), 'aria-label': '暫停' }, h('i'), h('i'));
    const panel = h('div', { class: 'sh-panel' });
    const stage = h('div', { class: 'sh-stage' }, cv, pauseBtn, bombBtn, panel);
    root.replaceChildren(h('div', { class: 'sh' }, stage));
    V = { cv, bombBtn, pauseBtn, panel };
    audio.preload('boom', 'bigboom', 'hitm', 'power', 'laser', 'missile');
    try {
      game = await createGame(cv, { difficulty: run.diff, onEvent, onHud });
    } catch (e) { console.error(e); toast('載入失敗，請確認網路後再試'); showSetup(); return; }
    if (!alive) return game.destroy();
    if (location.hostname === 'localhost') window.__shooter = game; // 本機測試用
    game.start(run.stage, { score: run.score, lives: run.lives, bombs: run.bombs, weapon: run.weapon, lv: run.lv, mis: run.mis });
    saveCheckpoint();
  }
  function saveCheckpoint() { const s = game.snapshot(); Object.assign(run, s); store.saveGame(ID, { run }); }

  function onHud(s) {
    if (!V) return;
    V.bombBtn.querySelector('small').textContent = s.bombs;
    V.bombBtn.disabled = s.bombs <= 0;
  }

  function onEvent(type, snap) {
    if (!alive || !game) return;
    if (type === 'clear') {
      run.cleared = [...new Set(run.cleared.concat(snap.stage))];
      run.score = snap.score;
      const last = snap.stage === STAGES.length - 1;
      audio.chime('win');
      if (last) { finish(true); return; }
      panelShow(h('div', null,
        h('b', { class: 'sh-title' }, STAGES[snap.stage].title.split(' · ')[0] + ' 完成'),
        h('div', { class: 'sh-lines' }, h('div', null, h('span', null, '分數'), h('b', { class: 'num' }, fmt(snap.score))), h('div', null, h('span', null, '過關獎勵'), h('b', { class: 'num pos' }, '+' + fmt(Math.round(STAGE_BONUS[snap.stage] * DIFFS[run.diff].rate))))),
        h('button', { class: 'btn btn-gold btn-block', onClick: nextStage }, '前往' + STAGES[snap.stage + 1].title.split(' · ')[0])));
      setTimeout(() => { if (alive && game && game.G.state === 'clear' && V && V.panel.classList.contains('show')) nextStage(); }, 6000);
    }
    if (type === 'over') {
      run.score = snap.score;
      const left = MAX_CONTINUES - run.continues;
      panelShow(h('div', null,
        h('b', { class: 'sh-title' }, '戰機全毀'),
        h('div', { class: 'sh-lines' }, h('div', null, h('span', null, '分數'), h('b', { class: 'num' }, fmt(snap.score))), h('div', null, h('span', null, '已通過'), h('b', null, run.cleared.length + ' 關'))),
        left > 0 ? h('button', { class: 'btn btn-gold btn-block', onClick: cont }, '接關（剩 ' + left + ' 次，分數歸零）') : null,
        h('button', { class: 'btn btn-block', onClick: () => finish(false) }, '結束並結算')));
    }
  }
  function nextStage() {
    if (!game || game.G.state !== 'clear') return;
    panelHide();
    game.next();
    saveCheckpoint();
  }
  function cont() {
    run.bankScore += game.G.score; // 接關前的分數先存起來
    run.continues++;
    game.G.score = 0;
    panelHide();
    game.continueGame();
    saveCheckpoint();
  }
  function pause(v) {
    if (!game) return;
    if (v && (game.G.state === 'clear' || game.G.state === 'over')) return;
    game.pause(v);
    if (v) panelShow(h('div', null,
      h('b', { class: 'sh-title' }, '暫停'),
      h('div', { class: 'sh-lines' }, h('div', null, h('span', null, '目前分數'), h('b', { class: 'num' }, fmt(game.G.score))), h('div', null, h('span', null, '關卡'), h('b', null, STAGES[game.G.stageIdx].title))),
      h('button', { class: 'btn btn-gold btn-block', onClick: () => pause(false) }, '繼續'),
      h('button', { class: 'btn btn-block', onClick: () => finish(false) }, '結束並結算')));
    else panelHide();
  }
  function panelShow(content) { V.panel.replaceChildren(content); V.panel.classList.add('show'); }
  function panelHide() { V && V.panel.classList.remove('show'); }

  function finish(allClear) {
    if (!run || !game) return;
    run.bankScore += game.G.score;
    const total = run.bankScore;
    const payout = payoutOf(run);
    const st = store.getData().settings;
    if (total > (st.shooterBest || 0)) store.setSetting('shooterBest', total);
    const ev = store.settle(ID, {
      gameName: NAME, mode: DIFFS[run.diff].label, result: allClear ? 'win' : run.cleared.length ? 'draw' : 'lose', payout,
      note: '分數 ' + fmt(total) + ' · 通過 ' + run.cleared.length + ' 關' + (run.continues ? ' · 接關 ' + run.continues + ' 次' : ''),
      marks: allClear ? { shooterAllClear: 1 } : null,
    });
    store.clearGame(ID);
    const cleared = run.cleared.length;
    teardown();
    showSetup();
    modal({
      title: allClear ? '全破' : '出擊結算', center: true,
      body: h('div', null, h('div', { class: 'result-figure pos' }, '+' + fmt(ev.delta)),
        h('div', { class: 'result-lines' },
          h('div', null, h('span', null, '總分'), h('span', null, fmt(total))),
          h('div', null, h('span', null, '通過關卡'), h('span', null, cleared + ' / ' + STAGES.length)),
          h('div', null, h('span', null, '結算後餘額'), h('span', null, fmt(ev.balance))))),
      actions: [{ label: '好', value: true, kind: 'gold' }],
    });
  }

  function teardown() { if (game) { game.destroy(); game = null; } V = null; ctx && ctx.setGuard && ctx.setGuard(null); }

  const onVis = () => { if (document.hidden && game && !game.G.paused) pause(true); };
  document.addEventListener('visibilitychange', onVis);

  showSetup();
  // 離開時只保留關卡開頭的存檔，回來從該關開頭接著玩
  return () => { alive = false; document.removeEventListener('visibilitychange', onVis); teardown(); };
}
