// 圍棋規則核心：棋盤、提子、劫、打劫禁著、征子判定、Benson 活棋判定。
// UI 與 AI worker 共用。座標 idx = y * n + x，PASS = -1。

export const EMPTY = 0, BLACK = 1, WHITE = 2, PASS = -1;
export const opp = (c) => 3 - c;

const NB_CACHE = {};
export function neighborsOf(n) {
  if (NB_CACHE[n]) return NB_CACHE[n];
  const nb = new Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const a = [];
    if (y > 0) a.push((y - 1) * n + x);
    if (x > 0) a.push(y * n + x - 1);
    if (x < n - 1) a.push(y * n + x + 1);
    if (y < n - 1) a.push((y + 1) * n + x);
    nb[y * n + x] = a;
  }
  return (NB_CACHE[n] = nb);
}

export class Board {
  constructor(n) {
    this.n = n;
    this.c = new Int8Array(n * n);
    this.ko = -1;
    this.nb = neighborsOf(n);
  }

  clone() {
    const b = new Board(this.n);
    b.c.set(this.c);
    b.ko = this.ko;
    return b;
  }

  // 回傳該串的棋子與氣（maxLibs 可提早結束氣的計算）
  chain(i) {
    const c = this.c, nb = this.nb, col = c[i];
    const stones = [i], libs = [];
    const seen = new Uint8Array(c.length);
    seen[i] = 1;
    for (let k = 0; k < stones.length; k++) {
      const a = nb[stones[k]];
      for (let j = 0; j < a.length; j++) {
        const q = a[j];
        if (seen[q]) continue;
        seen[q] = 1;
        if (c[q] === col) stones.push(q);
        else if (c[q] === EMPTY) libs.push(q);
      }
    }
    return { stones, libs };
  }

  libCount(i) { return this.chain(i).libs.length; }

  isLegal(i, col) {
    const c = this.c;
    if (i < 0 || c[i] !== EMPTY || i === this.ko) return false;
    const a = this.nb[i], o = 3 - col;
    for (let j = 0; j < a.length; j++) if (c[a[j]] === EMPTY) return true;
    for (let j = 0; j < a.length; j++) {
      const q = a[j];
      const L = this.libCount(q);
      if (c[q] === o && L === 1) return true;      // 提子
      if (c[q] === col && L > 1) return true;      // 接上還有氣
    }
    return false;
  }

  // 假設合法。回傳被提的棋子陣列。
  play(i, col) {
    if (i === PASS) { this.ko = -1; return []; }
    const c = this.c, a = this.nb[i], o = 3 - col;
    c[i] = col;
    let captured = [];
    for (let j = 0; j < a.length; j++) {
      const q = a[j];
      if (c[q] !== o) continue;
      const ch = this.chain(q);
      if (ch.libs.length === 0) {
        for (const s of ch.stones) c[s] = EMPTY;
        captured = captured.concat(ch.stones);
      }
    }
    this.ko = -1;
    if (captured.length === 1) {
      const me = this.chain(i);
      if (me.stones.length === 1 && me.libs.length === 1) this.ko = captured[0];
    }
    return captured;
  }
}

// ---------------------------------------------------------------------------
// 征子搜尋（對應 KataGo 的 searchIsLadderCaptured）

const LADDER_BUDGET = 6000;

function ladderRec(b, loc, isDefender, depth, st) {
  if (st.n >= LADDER_BUDGET) { st.abort = true; return false; }
  if (depth >= st.maxDepth) return true;
  const ch = b.chain(loc);
  const libs = ch.libs.length;
  const pla = b.c[loc], op = 3 - pla;
  if (!isDefender) {
    if (libs <= 1) return true;
    if (libs >= 3) return false;
    for (let k = 0; k < 2; k++) {
      const mv = ch.libs[k];
      if (!b.isLegal(mv, op)) continue;
      const nb2 = b.clone();
      nb2.play(mv, op);
      st.n++;
      const r = ladderRec(nb2, loc, true, depth + 1, st);
      if (st.abort) return false;
      if (r) return true;
    }
    return false;
  }
  if (libs >= 2) return false;
  if (b.ko !== -1) return false;
  // 守方：先試提掉周圍只剩一氣的對方棋串，再試長出去
  const moves = [];
  const seen = new Set();
  for (const s of ch.stones) {
    for (const q of b.nb[s]) {
      if (b.c[q] !== op) continue;
      const oc = b.chain(q);
      if (oc.libs.length === 1 && !seen.has(oc.libs[0])) { seen.add(oc.libs[0]); moves.push(oc.libs[0]); }
    }
  }
  if (!seen.has(ch.libs[0])) moves.push(ch.libs[0]);
  for (const mv of moves) {
    if (!b.isLegal(mv, pla)) continue;
    const nb2 = b.clone();
    nb2.play(mv, pla);
    st.n++;
    const r = ladderRec(nb2, loc, false, depth + 1, st);
    if (st.abort) return false;
    if (!r) return false;
  }
  return true;
}

function ladderCaptured(board, loc, defenderFirst) {
  const b = board.clone();
  if (defenderFirst) b.ko = -1;
  const st = { n: 0, abort: false, maxDepth: Math.floor(b.n * b.n * 3 / 2) };
  const r = ladderRec(b, loc, defenderFirst, 0, st);
  return st.abort ? false : r;
}

// 回傳 { laddered: Uint8Array(各點是否為被征死的棋), working: [對方兩氣棋串的有效征子著點] }
export function ladderInfo(board, oppColor) {
  const n2 = board.c.length;
  const laddered = new Uint8Array(n2);
  const done = new Uint8Array(n2);
  const working = [];
  for (let i = 0; i < n2; i++) {
    if (board.c[i] === EMPTY || done[i]) continue;
    const ch = board.chain(i);
    for (const s of ch.stones) done[s] = 1;
    const L = ch.libs.length;
    if (L !== 1 && L !== 2) continue;
    let lad = false;
    let works = [];
    if (L === 1) lad = ladderCaptured(board, i, true);
    else {
      const attacker = 3 - board.c[i];
      for (const mv of ch.libs) {
        if (!board.isLegal(mv, attacker)) continue;
        const b2 = board.clone();
        b2.play(mv, attacker);
        if (ladderCaptured(b2, i, true)) works.push(mv);
      }
      lad = works.length > 0;
    }
    if (lad) {
      for (const s of ch.stones) laddered[s] = 1;
      if (board.c[i] === oppColor && L > 1) for (const w of works) working.push(w);
    }
  }
  return { laddered, working };
}

// ---------------------------------------------------------------------------
// Benson 活棋 + 領地（對應 KataGo calculateArea，三個旗標皆為 true）

function areaForPla(board, pla, result) {
  const n2 = board.c.length, c = board.c, nb = board.nb, op = 3 - pla;
  // 己方棋串編號
  const chainId = new Int16Array(n2).fill(-1);
  const chains = [];
  let atLeastOnePla = false;
  for (let i = 0; i < n2; i++) {
    if (c[i] !== pla || chainId[i] !== -1) continue;
    atLeastOnePla = true;
    const ch = board.chain(i);
    const id = chains.length;
    for (const s of ch.stones) chainId[s] = id;
    chains.push({ stones: ch.stones, vital: 0, killed: false });
  }
  const regionOf = new Int16Array(n2).fill(-1);
  const regions = [];
  for (let seed = 0; seed < n2; seed++) {
    if (regionOf[seed] !== -1 || c[seed] !== EMPTY) continue;
    const id = regions.length;
    let vital = [];
    for (const q of nb[seed]) if (c[q] === pla && !vital.includes(chainId[q])) vital.push(chainId[q]);
    const locs = [seed];
    regionOf[seed] = id;
    let internal = 0, containsOpp = false;
    for (let k = 0; k < locs.length; k++) {
      const loc = locs[k];
      let adjPla = false;
      const adjIds = [];
      for (const q of nb[loc]) if (c[q] === pla) { adjPla = true; adjIds.push(chainId[q]); }
      if (vital.length && c[loc] === EMPTY) vital = vital.filter((v) => adjIds.includes(v));
      if (internal < 2 && !adjPla) internal++;
      if (c[loc] === op) containsOpp = true;
      for (const q of nb[loc]) {
        if ((c[q] === EMPTY || c[q] === op) && regionOf[q] === -1) { regionOf[q] = id; locs.push(q); }
      }
    }
    for (const v of vital) chains[v].vital++;
    regions.push({ locs, vital, internal, containsOpp, bordersDead: false });
  }
  for (;;) {
    let killedAny = false;
    for (const ch of chains) {
      if (ch.killed || ch.vital >= 2) continue;
      ch.killed = true;
      killedAny = true;
      for (const s of ch.stones) for (const q of nb[s]) {
        const r = regionOf[q];
        if (r >= 0 && !regions[r].bordersDead) {
          regions[r].bordersDead = true;
          for (const v of regions[r].vital) chains[v].vital--;
        }
      }
    }
    if (!killedAny) break;
  }
  for (const ch of chains) if (!ch.killed) for (const s of ch.stones) result[s] = pla;
  for (const r of regions) {
    const mark = atLeastOnePla && !r.bordersDead && (r.internal <= 1 || !r.containsOpp);
    if (mark) for (const l of r.locs) result[l] = pla;
    else if (!r.containsOpp && atLeastOnePla) for (const l of r.locs) if (result[l] === EMPTY) result[l] = pla;
  }
}

export function calculateArea(board) {
  const result = new Int8Array(board.c.length);
  areaForPla(board, BLACK, result);
  areaForPla(board, WHITE, result);
  for (let i = 0; i < result.length; i++) if (result[i] === EMPTY) result[i] = board.c[i];
  return result;
}

// ---------------------------------------------------------------------------
// 局面（含 KataGo 特徵所需的歷史）

export function newPosition(n, komi) {
  return { board: new Board(n), toPlay: BLACK, komi, hist: [], prev1: null, prev2: null, moveNum: 0 };
}

export function playPosition(pos, move) {
  const b = pos.board.clone();
  const captured = b.play(move, pos.toPlay);
  return {
    board: b, toPlay: 3 - pos.toPlay, komi: pos.komi,
    hist: [move, ...pos.hist].slice(0, 5),
    prev1: pos.board, prev2: pos.prev1,
    moveNum: pos.moveNum + 1, captured,
  };
}

export function positionFromMoves(n, komi, moves) {
  let pos = newPosition(n, komi);
  for (const m of moves) pos = playPosition(pos, m);
  return pos;
}

// 依歸屬（黑方視角 -1..1）計算最終結果（中國規則數子）。
export function scoreWithOwnership(board, ownership, komi) {
  const n2 = board.c.length;
  const owner = new Int8Array(n2);
  let black = 0, white = 0;
  const dead = [];
  for (let i = 0; i < n2; i++) {
    const o = ownership[i];
    let w = EMPTY;
    // 歸屬明確的點依預測歸屬（含死子）；接近 0 的是單官或雙活，維持現狀
    if (o > 0.12) w = BLACK; else if (o < -0.12) w = WHITE; else w = board.c[i];
    owner[i] = w;
    if (w === BLACK) black++; else if (w === WHITE) white++;
    if (board.c[i] !== EMPTY && w !== EMPTY && w !== board.c[i]) dead.push(i);
  }
  return { owner, black, white, dead, komi, diff: black - white - komi };
}
