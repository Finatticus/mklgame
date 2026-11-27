// 百家樂（Punto Banco）：八副牌，依標準補牌表自動補牌，莊贏抽 5% 佣金，附珠盤路與大路。
import * as store from '../../store.js';
import * as audio from '../../audio.js';
import { h, fmt, toast, asset, fitCanvas } from '../../ui.js';

const ID = 'baccarat', NAME = '百家樂';
const DECKS = 8;
const CHIPS = [100, 500, 1000, 5000, 10000];
const SPOTS = {
  P: { name: '閒', en: 'PLAYER', odds: '1 : 1', max: 50000 },
  B: { name: '莊', en: 'BANKER', odds: '0.95 : 1', max: 50000 },
  T: { name: '和', en: 'TIE', odds: '8 : 1', max: 5000 },
  PP: { name: '閒對', en: 'P PAIR', odds: '11 : 1', max: 5000 },
  BP: { name: '莊對', en: 'B PAIR', odds: '11 : 1', max: 5000 },
};
const MIN_TOTAL = 100;

export const RULES = `
<h4>目標</h4>
<p>猜這一局「閒家」與「莊家」誰的點數比較接近 9 點，或是和局。你不用做任何決定，補牌完全依照規則自動進行。</p>
<h4>點數</h4>
<ul>
<li>A 算 1 點，2–9 依牌面，10、J、Q、K 算 0 點。</li>
<li>只看總和的個位數：例如 7 + 8 = 15，算 5 點。</li>
<li>前兩張就是 8 或 9 點稱為「例牌」，雙方都不再補牌。</li>
</ul>
<h4>補牌規則</h4>
<table>
<tr><th>閒家前兩張</th><th>動作</th></tr>
<tr><td>0–5 點</td><td>補一張</td></tr>
<tr><td>6–7 點</td><td>不補</td></tr>
</table>
<p>閒家沒補牌時，莊家 0–5 點補牌、6–7 點不補。閒家有補牌時，莊家依閒家第三張決定：</p>
<table>
<tr><th>莊家點數</th><th>閒家第三張為以下時莊家補牌</th></tr>
<tr><td>0–2</td><td>一律補</td></tr>
<tr><td>3</td><td>除了 8 以外都補</td></tr>
<tr><td>4</td><td>2–7</td></tr>
<tr><td>5</td><td>4–7</td></tr>
<tr><td>6</td><td>6–7</td></tr>
<tr><td>7</td><td>不補</td></tr>
</table>
<h4>操作</h4>
<ul>
<li>先在下方點選籌碼面額，再點桌上的下注區放上籌碼，可以同時押好幾區。</li>
<li>按「發牌」開始。「重複」會放回上一局的注碼。</li>
</ul>
<h4>遊戲幣</h4>
<table>
<tr><th>下注區</th><th>賠率</th><th>上限</th></tr>
<tr><td>閒</td><td>1 : 1</td><td>${fmt(SPOTS.P.max)}</td></tr>
<tr><td>莊</td><td>0.95 : 1（抽 5% 佣金）</td><td>${fmt(SPOTS.B.max)}</td></tr>
<tr><td>和</td><td>8 : 1</td><td>${fmt(SPOTS.T.max)}</td></tr>
<tr><td>閒對／莊對</td><td>11 : 1</td><td>${fmt(SPOTS.PP.max)}</td></tr>
</table>
<p>開出和局時，押莊、押閒的注碼退回。「對子」是指該方前兩張牌點數相同（例如兩張 7、兩張 K）。</p>
<h4>路單</h4>
<p>左邊是珠盤路，依序記錄每局結果；右邊是大路，同一方連續贏就往下排，換邊就換一行，綠色斜線代表中間開過和局。換新牌靴時路單會重新開始。</p>`;

const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
const val = (c) => (c[0] === 'A' ? 1 : 'TJQK'.includes(c[0]) ? 0 : +c[0]);
const points = (cards) => cards.reduce((s, c) => s + val(c), 0) % 10;
const rankOf = (c) => c[0];

function newShoe() {
  const shoe = [];
  for (let d = 0; d < DECKS; d++) for (const s of 'SHDC') for (const r of 'A23456789TJQK') shoe.push(r + s);
  for (let i = shoe.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [shoe[i], shoe[j]] = [shoe[j], shoe[i]]; }
  return shoe;
}

// 依補牌表算完整的一局
function playCoup(draw) {
  const p = [draw(), draw()], b = [draw(), draw()];
  // 發牌順序：閒、莊、閒、莊
  [p[1], b[0]] = [b[0], p[1]];
  const pt = points(p), bt = points(b);
  if (pt < 8 && bt < 8) {
    let p3 = null;
    if (pt <= 5) { p3 = draw(); p.push(p3); }
    const bNow = points(b);
    let bDraw;
    if (p3 === null) bDraw = bNow <= 5;
    else {
      const v = val(p3);
      bDraw = bNow <= 2 || (bNow === 3 && v !== 8) || (bNow === 4 && v >= 2 && v <= 7) || (bNow === 5 && v >= 4 && v <= 7) || (bNow === 6 && (v === 6 || v === 7));
    }
    if (bDraw) b.push(draw());
  }
  const fp = points(p), fb = points(b);
  return { p, b, winner: fp > fb ? 'P' : fb > fp ? 'B' : 'T', pPair: rankOf(p[0]) === rankOf(p[1]), bPair: rankOf(b[0]) === rankOf(b[1]) };
}

function payoutOf(bets, coup) {
  let back = 0;
  if (coup.winner === 'P') back += bets.P * 2;
  if (coup.winner === 'B') back += bets.B * 1.95;
  if (coup.winner === 'T') back += bets.P + bets.B + bets.T * 9;
  if (coup.pPair) back += bets.PP * 12;
  if (coup.bPair) back += bets.BP * 12;
  return Math.round(back);
}

// 大路：同一方連贏往下，換邊換行；碰底或碰到已有的格子就往右拖（長龍）
function bigRoad(results) {
  const cells = new Map(); // "c,r" -> { w, ties }
  const out = [];
  let lastW = null, startCol = -1, col = 0, row = 0, turned = false, lead = 0, last = null;
  for (const r of results) {
    if (r === 'T') { if (last) last.ties++; else lead++; continue; }
    if (r !== lastW) {
      startCol++;
      while (cells.has(startCol + ',0')) startCol++;
      col = startCol; row = 0; turned = false;
    } else if (!turned && row < 5 && !cells.has(col + ',' + (row + 1))) row++;
    else { col++; turned = true; }
    last = { c: col, r: row, w: r, ties: lead };
    lead = 0;
    cells.set(col + ',' + row, last);
    out.push(last);
    lastW = r;
  }
  return { cells: out, lead };
}

export async function mount(root) {
  let alive = true, lock = false;
  const saved0 = store.getData().settings.baccarat || {};
  const T = {
    shoe: Array.isArray(saved0.shoe) && saved0.shoe.length > 20 ? saved0.shoe : null,
    road: Array.isArray(saved0.road) ? saved0.road : [],
    last: saved0.last || null,
  };
  let chip = saved0.chip && CHIPS.includes(saved0.chip) ? saved0.chip : 1000;
  let bets = { P: 0, B: 0, T: 0, PP: 0, BP: 0 };
  let phase = 'bet'; // bet | dealing | done
  let coup = null, shown = { p: [], b: [], downP: true, downB: true }, outcome = null;

  const keep = () => store.setSetting('baccarat', { shoe: T.shoe, road: T.road.slice(-120), last: T.last, chip });

  // ---------------- 畫面 ----------------
  const roadCv = h('canvas', { class: 'bac-road-cv' });
  const roadCount = h('div', { class: 'bac-road-count' });
  const sideEl = (key) => {
    const cards = h('div', { class: 'bac-cards' });
    const pt = h('div', { class: 'bac-pt' });
    const el = h('div', { class: 'bac-side ' + key.toLowerCase() }, h('div', { class: 'bac-side-head' }, h('b', null, SPOTS[key].name), h('span', null, SPOTS[key].en)), cards, pt);
    return { el, cards, pt };
  };
  const PS = sideEl('P'), BS = sideEl('B');
  const msg = h('div', { class: 'bac-msg' });
  const spotEls = {};
  for (const k of Object.keys(SPOTS)) {
    const amt = h('div', { class: 'bac-amt' });
    spotEls[k] = { el: h('button', { class: 'bac-spot ' + k.toLowerCase(), onClick: () => place(k) }, h('b', null, SPOTS[k].name), h('small', null, SPOTS[k].odds), amt), amt };
  }
  const dock = h('div', { class: 'bj-dock-in' });
  const wrap = h('div', { class: 'bac' },
    h('div', { class: 'bac-road' }, roadCv, roadCount),
    h('div', { class: 'bac-table' }, h('div', { class: 'bac-hands' }, PS.el, BS.el), msg),
    h('div', { class: 'bac-spots' },
      h('div', { class: 'bac-spots-top' }, spotEls.PP.el, spotEls.T.el, spotEls.BP.el),
      h('div', { class: 'bac-spots-main' }, spotEls.P.el, spotEls.B.el)),
    h('div', { class: 'bj-dock' }, dock));
  root.replaceChildren(wrap);

  function cardEl(code, down, side) {
    const el = h('div', { class: 'bj-card' + (down ? ' down' : '') + (side ? ' side' : '') },
      h('div', { class: 'bj-card-in' },
        h('div', { class: 'bj-face' }, h('img', { src: asset('cards/' + code + '.webp'), alt: code, draggable: false })),
        h('div', { class: 'bj-back' })));
    el.dataset.code = code;
    return el;
  }
  function syncSide(S, cards, down) {
    while (S.cards.children.length > cards.length) S.cards.lastChild.remove();
    cards.forEach((c, i) => {
      let el = S.cards.children[i];
      if (!el || el.dataset.code !== c) { const f = cardEl(c, down && i < 2, i === 2); if (el) el.replaceWith(f); else S.cards.append(f); el = f; }
      if (i < 2) el.classList.toggle('down', down);
    });
    const vis = down ? cards.slice(2) : cards;
    S.pt.textContent = cards.length && vis.length ? String(points(vis)) : '';
    S.pt.hidden = !cards.length || (down && cards.length < 3);
  }

  const staged = () => Object.values(bets).reduce((a, b) => a + b, 0);

  function render() {
    syncSide(PS, shown.p, shown.downP);
    syncSide(BS, shown.b, shown.downB);
    PS.el.classList.toggle('win', !!outcome && outcome.winner === 'P');
    BS.el.classList.toggle('win', !!outcome && outcome.winner === 'B');
    for (const k in spotEls) {
      const v = bets[k];
      spotEls[k].amt.replaceChildren(...(v ? [h('i'), fmt(v)] : []));
      const s = spotEls[k].el;
      s.disabled = phase === 'dealing';
      s.classList.toggle('has', v > 0);
      const push = !!outcome && outcome.winner === 'T' && (k === 'P' || k === 'B');
      s.classList.toggle('hit', !!outcome && hitSpot(k));
      s.classList.toggle('miss', !!outcome && v > 0 && !hitSpot(k) && !push);
    }
    renderDock();
    drawRoad();
  }

  const hitSpot = (k) => (k === 'P' && outcome.winner === 'P') || (k === 'B' && outcome.winner === 'B') || (k === 'T' && outcome.winner === 'T') || (k === 'PP' && outcome.pPair) || (k === 'BP' && outcome.bPair);

  const btn = (label, sub, fn, cls = '', disabled = false) => h('button', { class: 'btn ' + cls, disabled, onClick: () => { if (!lock) fn(); } }, h('span', null, label), sub ? h('small', null, sub) : null);

  function renderDock() {
    const bal = store.balance();
    if (phase === 'dealing') { dock.replaceChildren(h('div', { class: 'bj-betline' }, h('small', null, '本局下注'), h('b', null, fmt(staged())), h('small', null, '餘額 ' + fmt(bal)))); return; }
    const lastTotal = T.last ? Object.values(T.last).reduce((a, b) => a + b, 0) : 0;
    dock.replaceChildren(
      h('div', { class: 'bj-betline' }, h('small', null, phase === 'done' ? '上局下注' : '下注'), h('b', null, fmt(staged())), h('small', null, '餘額 ' + fmt(bal))),
      h('div', { class: 'bj-chips' }, CHIPS.map((v) => h('button', { class: 'chip' + (v === chip ? ' sel' : ''), dataset: { v }, 'aria-label': '選擇籌碼 ' + v, onClick: () => { chip = v; audio.play('chip', { volume: 0.6 }); keep(); renderDock(); } }, h('span', null, v >= 1000 ? v / 1000 + 'K' : String(v))))),
      phase === 'done'
        ? h('div', { class: 'bj-row' },
          btn('重新下注', '', () => { reset(); render(); }),
          btn('同樣再來', fmt(lastTotal), () => { reset(); bets = Object.assign({}, T.last); deal(); }, 'btn-gold', !lastTotal || lastTotal > bal))
        : h('div', { class: 'bj-row' },
          btn('清除', '', () => { bets = { P: 0, B: 0, T: 0, PP: 0, BP: 0 }; render(); }, '', !staged()),
          btn('重複', lastTotal ? fmt(lastTotal) : '', () => { bets = Object.assign({}, T.last); audio.play('chips'); render(); }, '', !lastTotal || lastTotal > bal),
          btn('發牌', '', deal, 'btn-gold', staged() < MIN_TOTAL)));
  }

  function reset() {
    phase = 'bet'; coup = null; outcome = null;
    shown = { p: [], b: [], downP: true, downB: true };
    bets = { P: 0, B: 0, T: 0, PP: 0, BP: 0 };
    say(null);
  }

  function place(k) {
    if (lock || phase === 'dealing') return;
    if (phase === 'done') { reset(); }
    const room = SPOTS[k].max - bets[k];
    const add = Math.min(chip, room, store.balance() - staged());
    if (add < 100) { toast(room < 100 ? SPOTS[k].name + '已達上限 ' + fmt(SPOTS[k].max) : '遊戲幣不足'); render(); return; }
    bets[k] += add;
    audio.play('chip');
    render();
  }

  function say(a, b) { msg.replaceChildren(...(a ? [h('div', null, a, b ? h('small', null, b) : null)] : [])); wrap.classList.toggle('has-msg', !!a); }

  // ---------------- 路單 ----------------
  function drawRoad() {
    const { ctx, w, h: hh } = fitCanvas(roadCv);
    ctx.clearRect(0, 0, w, hh);
    const s = hh / 6;
    const beadCols = Math.max(4, Math.floor((w * 0.4) / s));
    const bw = beadCols * s;
    const grid = (x0, cols) => {
      ctx.strokeStyle = 'rgba(70,50,30,0.16)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let c = 0; c <= cols; c++) { ctx.moveTo(x0 + c * s + 0.5, 0); ctx.lineTo(x0 + c * s + 0.5, hh); }
      for (let r = 0; r <= 6; r++) { ctx.moveTo(x0, r * s + 0.5); ctx.lineTo(x0 + cols * s, r * s + 0.5); }
      ctx.stroke();
    };
    const COLOR = { B: '#c8463c', P: '#3c6fc8', T: '#3f9a5c' };
    // 珠盤路
    grid(0, beadCols);
    const start = Math.max(0, Math.ceil((T.road.length - beadCols * 6 + 6) / 6) * 6);
    const items = T.road.slice(start);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 ' + Math.round(s * 0.52) + 'px ' + getComputedStyle(document.body).getPropertyValue('--serif');
    items.forEach((r, i) => {
      const c = (i / 6) | 0, rr = i % 6;
      if (c >= beadCols) return;
      const x = c * s + s / 2, y = rr * s + s / 2;
      ctx.beginPath(); ctx.arc(x, y, s * 0.42, 0, Math.PI * 2); ctx.fillStyle = COLOR[r]; ctx.fill();
      ctx.fillStyle = '#fbf5e6'; ctx.fillText(SPOTS[r].name, x, y + s * 0.03);
    });
    // 大路
    const gx = bw + 8, cols = Math.max(1, Math.floor((w - gx) / s));
    grid(gx, cols);
    const big = bigRoad(T.road);
    const maxC = big.cells.reduce((m, c) => Math.max(m, c.c), 0);
    const off = Math.max(0, maxC - cols + 2);
    for (const cell of big.cells) {
      const c = cell.c - off;
      if (c < 0) continue;
      const x = gx + c * s + s / 2, y = cell.r * s + s / 2;
      ctx.beginPath(); ctx.arc(x, y, s * 0.36, 0, Math.PI * 2);
      ctx.strokeStyle = COLOR[cell.w]; ctx.lineWidth = Math.max(1.5, s * 0.14); ctx.stroke();
      if (cell.ties) {
        ctx.beginPath(); ctx.moveTo(x - s * 0.32, y + s * 0.32); ctx.lineTo(x + s * 0.32, y - s * 0.32);
        ctx.strokeStyle = COLOR.T; ctx.lineWidth = Math.max(1.5, s * 0.12); ctx.stroke();
        if (cell.ties > 1) { ctx.fillStyle = '#2f7a47'; ctx.font = '700 ' + Math.round(s * 0.42) + 'px system-ui'; ctx.fillText(String(cell.ties), x, y + s * 0.02); }
      }
    }
    const n = (k) => T.road.filter((r) => r === k).length;
    roadCount.replaceChildren(h('span', { class: 'b' }, '莊 ' + n('B')), h('span', { class: 'p' }, '閒 ' + n('P')), h('span', { class: 't' }, '和 ' + n('T')), h('span', null, '剩 ' + (T.shoe ? T.shoe.length : DECKS * 52) + ' 張'));
  }

  // ---------------- 流程 ----------------
  async function newShoeIfNeeded() {
    if (T.shoe && T.shoe.length >= 16) return;
    T.shoe = newShoe();
    T.road = [];
    const first = T.shoe.pop();
    const burn = val(first) || 10;
    T.shoe.splice(T.shoe.length - burn, burn);
    keep();
    say('換新牌靴', '翻開 ' + ({ T: '10', J: 'J', Q: 'Q', K: 'K', A: 'A' }[first[0]] || first[0]) + '，燒掉 ' + burn + ' 張牌');
    render();
    audio.play('shuffle', { volume: 0.7 });
    await sleep(1600);
    say(null);
  }

  async function deal() {
    const total = staged();
    if (total < MIN_TOTAL) return;
    if (!store.hold(ID, total)) return toast('遊戲幣不足');
    lock = true;
    phase = 'dealing';
    T.last = Object.assign({}, bets);
    audio.play('chips');
    render();
    await newShoeIfNeeded();
    if (!alive) return;
    coup = playCoup(() => T.shoe.pop());
    keep();
    store.saveGame(ID, { bets, coup });
    await reveal(true);
  }

  async function reveal(animate) {
    const wait = (ms) => (animate ? sleep(ms) : Promise.resolve());
    shown = { p: [], b: [], downP: true, downB: true };
    const order = [['p', 0], ['b', 0], ['p', 1], ['b', 1]];
    for (const [side, i] of order) {
      await wait(300);
      if (!alive) return;
      shown[side].push(coup[side][i]);
      if (animate) audio.play('card', { volume: 0.8 });
      render();
    }
    await wait(500);
    if (!alive) return;
    shown.downP = false; if (animate) audio.play('flip'); render();
    await wait(650);
    if (!alive) return;
    shown.downB = false; if (animate) audio.play('flip'); render();
    const pt = points(coup.p.slice(0, 2)), bt = points(coup.b.slice(0, 2));
    if (pt >= 8 || bt >= 8) { say('例牌', (pt >= 8 ? '閒 ' + pt : '') + (pt >= 8 && bt >= 8 ? ' · ' : '') + (bt >= 8 ? '莊 ' + bt : '') + '，雙方不補牌'); }
    await wait(800);
    for (const side of ['p', 'b']) {
      if (coup[side].length > 2) {
        say(null);
        if (!alive) return;
        shown[side].push(coup[side][2]);
        if (animate) audio.play('card', { volume: 0.8 });
        render();
        await wait(850);
      }
    }
    if (!alive) return;
    finish();
  }

  function finish() {
    outcome = coup;
    const payout = payoutOf(bets, coup);
    const wagered = staged();
    const net = payout - wagered;
    const result = net > 0 ? 'win' : net < 0 ? 'lose' : 'draw';
    const fp = points(coup.p), fb = points(coup.b);
    const winName = coup.winner === 'T' ? '和局' : SPOTS[coup.winner].name + '贏';
    const placed = Object.keys(SPOTS).filter((k) => bets[k]).map((k) => SPOTS[k].name).join('、');
    const marks = {};
    if (coup.winner === 'T' && bets.T) marks.bacTieWins = 1;
    if ((coup.pPair && bets.PP) || (coup.bPair && bets.BP)) marks.bacPairWins = 1;
    store.settle(ID, { gameName: NAME, mode: '押' + placed, result, payout, note: '閒 ' + fp + ' 對 莊 ' + fb + ' · ' + winName, marks });
    T.road.push(coup.winner);
    keep();
    phase = 'done';
    lock = false;
    const pairs = [coup.pPair ? '閒對' : '', coup.bPair ? '莊對' : ''].filter(Boolean).join('、');
    say(winName + ' ' + (coup.winner === 'T' ? fp + ' : ' + fb : (coup.winner === 'P' ? fp + ' : ' + fb : fb + ' : ' + fp)),
      (net > 0 ? '你贏了 +' + fmt(net) : net < 0 ? '輸 −' + fmt(-net) : '退回注碼') + (pairs ? ' · 開出' + pairs : ''));
    render();
    if (net > 0) { audio.play('payout'); audio.chime('win'); } else if (net < 0) audio.chime('lose'); else audio.chime('draw');
  }

  // ---------------- 啟動 ----------------
  audio.preload('card', 'flip', 'chip', 'chips', 'payout', 'shuffle');
  const pending = store.loadGame(ID);
  if (pending && pending.coup && store.heldAmount(ID) > 0) {
    bets = pending.bets; coup = pending.coup; phase = 'dealing'; lock = true;
    render();
    reveal(false);
  } else {
    store.release(ID);
    if (T.last) bets = { P: 0, B: 0, T: 0, PP: 0, BP: 0 };
    render();
  }
  const onResize = () => drawRoad();
  window.addEventListener('resize', onResize);
  document.fonts && document.fonts.ready.then(() => { if (alive) drawRoad(); });

  return () => { alive = false; window.removeEventListener('resize', onResize); };
}
