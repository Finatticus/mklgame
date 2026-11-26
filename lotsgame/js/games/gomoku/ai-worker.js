// 五子棋 AI：以「五連窗」做增量評估，alpha-beta 迭代加深，並搭配 VCF（連續沖四）必勝搜尋。
const N = 15, N2 = N * N;
const WIN = 1e7;

// 所有長度 5 的連線窗
const WINDOWS = [];
const CELLW = Array.from({ length: N2 }, () => []);
for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const ex = x + dx * 4, ey = y + dy * 4;
    if (ex < 0 || ex >= N || ey < 0 || ey >= N) continue;
    const cells = [];
    for (let k = 0; k < 5; k++) cells.push((y + dy * k) * N + x + dx * k);
    const id = WINDOWS.length;
    WINDOWS.push(cells);
    for (const c of cells) CELLW[c].push(id);
  }
}
const NW = WINDOWS.length;
const NEAR = Array.from({ length: N2 }, (_, i) => {
  const x = i % N, y = (i / N) | 0, out = [];
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const nx = x + dx, ny = y + dy;
    if ((dx || dy) && nx >= 0 && nx < N && ny >= 0 && ny < N) out.push(ny * N + nx);
  }
  return out;
});

const W = [0, 1, 10, 110, 700, 0];          // 窗內只有單方 k 子的價值
const ATT = [1, 12, 110, 1300, 1e6];        // 落子後把己方窗從 k 變 k+1
const DEF = [0, 9, 90, 1000, 2e5];          // 擋住對方已有 k 子的窗

let board, cnt, score, near, stones;
let nodes = 0, deadline = 0, aborted = false, vcfNodes = 0, vcfCap = 0;

function reset() {
  board = new Int8Array(N2);
  cnt = [null, new Uint8Array(NW), new Uint8Array(NW)];
  score = [0, 0, 0];
  near = new Int16Array(N2);
  stones = 0;
}

function push(i, c) {
  board[i] = c;
  stones++;
  const o = 3 - c, mine = cnt[c], theirs = cnt[o], ws = CELLW[i];
  for (let k = 0; k < ws.length; k++) {
    const w = ws[k], m = mine[w], t = theirs[w];
    if (t === 0) score[c] += W[m + 1] - W[m];
    else if (m === 0) score[o] -= W[t];
    mine[w] = m + 1;
  }
  const nb = NEAR[i];
  for (let k = 0; k < nb.length; k++) near[nb[k]]++;
}

function pop(i) {
  const c = board[i], o = 3 - c, mine = cnt[c], theirs = cnt[o], ws = CELLW[i];
  board[i] = 0;
  stones--;
  for (let k = 0; k < ws.length; k++) {
    const w = ws[k], m = mine[w] - 1, t = theirs[w];
    mine[w] = m;
    if (t === 0) score[c] += W[m] - W[m + 1];
    else if (m === 0) score[o] += W[t];
  }
  const nb = NEAR[i];
  for (let k = 0; k < nb.length; k++) near[nb[k]]--;
}

// c 方只差一子就五連的落點
function fourCells(c) {
  const mine = cnt[c], theirs = cnt[3 - c], out = [];
  for (let w = 0; w < NW; w++) {
    if (mine[w] !== 4 || theirs[w] !== 0) continue;
    const cells = WINDOWS[w];
    for (let k = 0; k < 5; k++) if (board[cells[k]] === 0) { if (!out.includes(cells[k])) out.push(cells[k]); break; }
  }
  return out;
}

// c 方落子後會形成「四」的落點
function fourMakers(c) {
  const mine = cnt[c], theirs = cnt[3 - c], out = [];
  for (let w = 0; w < NW; w++) {
    if (mine[w] !== 3 || theirs[w] !== 0) continue;
    const cells = WINDOWS[w];
    for (let k = 0; k < 5; k++) if (board[cells[k]] === 0 && !out.includes(cells[k])) out.push(cells[k]);
  }
  return out;
}

// c 方是否有一手能做出「活四／雙四」（對方沒有四可沖時等同必勝）
function openFourMove(c) {
  const mk = fourMakers(c);
  for (let k = 0; k < mk.length; k++) {
    push(mk[k], c);
    const n = fourCells(c).length;
    pop(mk[k]);
    if (n >= 2) return mk[k];
  }
  return -1;
}

// 連續沖四必勝搜尋。回傳必勝的第一手，找不到回傳 -1。
function vcf(att, depth) {
  if (++vcfNodes > vcfCap) return -1;
  const def = 3 - att;
  const my4 = fourCells(att);
  if (my4.length) return my4[0];
  if (depth <= 0) return -1;
  const op4 = fourCells(def);
  if (op4.length > 1) return -1;
  let cands = fourMakers(att);
  if (op4.length === 1) cands = cands.includes(op4[0]) ? [op4[0]] : [];
  for (let k = 0; k < cands.length; k++) {
    const c = cands[k];
    push(c, att);
    const f = fourCells(att);
    let ok = false;
    if (fourCells(def).length === 0) {
      if (f.length >= 2) ok = true;
      else if (f.length === 1) {
        push(f[0], def);
        ok = vcf(att, depth - 1) >= 0;
        pop(f[0]);
      }
    }
    pop(c);
    if (ok) return c;
  }
  return -1;
}

function candidates(side, limit) {
  const mine = cnt[side], theirs = cnt[3 - side];
  const list = [];
  for (let i = 0; i < N2; i++) {
    if (board[i] !== 0 || near[i] === 0) continue;
    const ws = CELLW[i];
    let s = 0;
    for (let k = 0; k < ws.length; k++) {
      const w = ws[k], m = mine[w], t = theirs[w];
      if (t === 0) s += ATT[m];
      else if (m === 0) s += DEF[t];
    }
    list.push([s, i]);
  }
  list.sort((a, b) => b[0] - a[0]);
  if (list.length > limit) list.length = limit;
  return list.map((x) => x[1]);
}

const evaluate = (side) => score[side] * 1.25 - score[3 - side];

function negamax(side, depth, alpha, beta, ply) {
  if ((++nodes & 1023) === 0 && performance.now() > deadline) aborted = true;
  if (aborted) return 0;
  const opp = 3 - side;
  if (fourCells(side).length) return WIN - ply;
  const op4 = fourCells(opp);
  if (op4.length >= 2) return -(WIN - ply - 1);
  let cands, forced = false;
  if (op4.length === 1) { cands = op4; forced = true; }
  else {
    if (openFourMove(side) >= 0) return WIN - ply - 2;
    if (depth <= 0 || ply > 40) return evaluate(side);
    cands = candidates(side, ply < 2 ? 12 : 9);
    if (!cands.length) return 0;
  }
  let best = -Infinity;
  for (let k = 0; k < cands.length; k++) {
    const c = cands[k];
    push(c, side);
    const v = -negamax(opp, forced ? depth : depth - 1, -beta, -alpha, ply + 1);
    pop(c);
    if (aborted) return 0;
    if (v > best) best = v;
    if (v > alpha) alpha = v;
    if (alpha >= beta) break;
  }
  return best;
}

const LEVELS = {
  easy: { maxDepth: 2, timeMs: 400, vcf: 0, width: 8, noise: 60 },
  mid: { maxDepth: 4, timeMs: 1200, vcf: 8, width: 10, noise: 6 },
  hard: { maxDepth: 12, timeMs: 2600, vcf: 16, width: 14, noise: 0 },
};

function chooseMove(moves, level) {
  const cfg = LEVELS[level];
  reset();
  for (let k = 0; k < moves.length; k++) push(moves[k], (k % 2) + 1);
  const side = (moves.length % 2) + 1, opp = 3 - side;
  const center = 7 * N + 7;
  if (moves.length === 0) return { move: center };
  if (moves.length === 1) {
    const x = moves[0] % N, y = (moves[0] / N) | 0;
    const opts = [];
    for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [0, 1], [-1, 0], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 2 && nx < N - 2 && ny >= 2 && ny < N - 2) opts.push(ny * N + nx);
    }
    return { move: opts.length ? opts[(Math.random() * opts.length) | 0] : center };
  }
  const my4 = fourCells(side);
  if (my4.length) return { move: my4[0], why: 'win' };
  const op4 = fourCells(opp);
  if (op4.length) return { move: op4[0], why: 'block' };

  if (cfg.vcf) {
    vcfNodes = 0; vcfCap = level === 'hard' ? 60000 : 8000;
    const m = vcf(side, cfg.vcf);
    if (m >= 0) return { move: m, why: 'vcf' };
  }

  let cands = candidates(side, cfg.width);
  if (!cands.length) {
    for (let i = 0; i < N2; i++) if (board[i] === 0) return { move: i };
    return { move: -1 };
  }

  // 對方若有連續沖四的殺棋，只保留能破解的應手
  if (level === 'hard') {
    vcfNodes = 0; vcfCap = 30000;
    if (vcf(opp, 12) >= 0) {
      const safe = [];
      for (const c of candidates(side, 20)) {
        push(c, side);
        vcfNodes = 0; vcfCap = 12000;
        const still = fourCells(side).length ? false : vcf(opp, 12) >= 0;
        pop(c);
        if (!still) safe.push(c);
      }
      if (safe.length) cands = safe.slice(0, cfg.width);
    }
  }

  deadline = performance.now() + cfg.timeMs;
  aborted = false;
  nodes = 0;
  let bestMove = cands[0], bestScore = 0, reached = 0;
  for (let depth = 2; depth <= cfg.maxDepth; depth += 2) {
    let alpha = -Infinity, iterBest = cands[0], iterScore = -Infinity;
    const scored = [];
    for (let k = 0; k < cands.length; k++) {
      const c = cands[k];
      push(c, side);
      let v = -negamax(opp, depth - 1, -Infinity, -alpha + (cfg.noise ? cfg.noise : 0), 1);
      pop(c);
      if (aborted) break;
      if (cfg.noise) v += (Math.random() - 0.5) * cfg.noise * 2;
      scored.push([v, c]);
      if (v > iterScore) { iterScore = v; iterBest = c; }
      if (v > alpha) alpha = v;
    }
    if (aborted && depth > 2) break;
    if (scored.length) {
      bestMove = iterBest; bestScore = iterScore; reached = depth;
      scored.sort((a, b) => b[0] - a[0]);
      const rest = cands.filter((c) => !scored.some((s) => s[1] === c));
      cands = scored.map((s) => s[1]).concat(rest);
    }
    if (aborted || Math.abs(bestScore) > WIN / 2) break;
  }
  return { move: bestMove, score: bestScore, depth: reached, nodes };
}

self.onmessage = (e) => {
  const { id, payload } = e.data;
  try { self.postMessage({ id, result: chooseMove(payload.moves, payload.level) }); }
  catch (err) { self.postMessage({ id, error: String(err && err.message || err) }); }
};
