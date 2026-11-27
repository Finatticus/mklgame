// 象棋規則與搜尋引擎（介面與 AI Worker 共用）。
// 棋盤用 16×16 陣列：第 3–12 列、第 3–11 行是棋盤；紅方在下方（第 12 列是紅方底線），紅先。
// 棋子代碼：紅 8+種類、黑 16+種類；種類 0 帥將 1 仕士 2 相象 3 傌馬 4 俥車 5 炮砲 6 兵卒。
export const RED = 0, BLACK = 1;
export const K = 0, A = 1, B = 2, N = 3, R = 4, C = 5, P = 6;

const IN_BOARD = new Uint8Array(256), IN_FORT = new Uint8Array(256);
for (let y = 3; y <= 12; y++) for (let x = 3; x <= 11; x++) {
  IN_BOARD[y * 16 + x] = 1;
  if (x >= 6 && x <= 8 && (y <= 5 || y >= 10)) IN_FORT[y * 16 + x] = 1;
}
export const inBoard = (sq) => IN_BOARD[sq] === 1;
export const sqOf = (x, y) => (y + 3) * 16 + x + 3; // x 0–8 由紅方左至右，y 0–9 由上（黑方）至下
export const xOf = (sq) => (sq & 15) - 3;
export const yOf = (sq) => (sq >> 4) - 3;
const flip = (sq) => 254 - sq;
const sameHalf = (a, b) => ((a ^ b) & 0x80) === 0;
const ownHalf = (sq, side) => ((sq & 0x80) !== 0) === (side === RED);
const forward = (sq, side) => sq - 16 + (side << 5);
export const sideTag = (side) => 8 + (side << 3);
export const typeOf = (pc) => pc & 7;
export const sideOf = (pc) => (pc & 16 ? BLACK : RED);

const KING_D = [-16, -1, 1, 16];
const ADV_D = [-17, -15, 15, 17];
const KNIGHT_D = [[-33, -31], [-18, 14], [-14, 18], [31, 33]]; // 依馬腳 KING_D[i]
const KNIGHT_CHK = [[-33, -18], [-31, -14], [14, 31], [18, 33]]; // 依馬腳 ADV_D[i]

export const MATE = 10000, WIN = MATE - 200, BAN = MATE - 100;
const DRAW = 20;

// 子力位置表（紅方視角，第 0 列為黑方底線）。數值已含子力本身。
const T = {
  [K]: [
    [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 1, 1, 1, 0, 0, 0], [0, 0, 0, 2, 2, 2, 0, 0, 0], [0, 0, 0, 11, 15, 11, 0, 0, 0]],
  [A]: [
    [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 20, 0, 20, 0, 0, 0], [0, 0, 0, 0, 23, 0, 0, 0, 0], [0, 0, 0, 20, 0, 20, 0, 0, 0]],
  [B]: [
    [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 20, 0, 0, 0, 20, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0], [18, 0, 0, 0, 23, 0, 0, 0, 18], [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 20, 0, 0, 0, 20, 0, 0]],
  [N]: [
    [90, 90, 90, 96, 90, 96, 90, 90, 90], [90, 96, 103, 97, 94, 97, 103, 96, 90], [92, 98, 99, 103, 99, 103, 99, 98, 92],
    [93, 108, 100, 107, 100, 107, 100, 108, 93], [90, 100, 99, 103, 104, 103, 99, 100, 90], [90, 98, 101, 102, 103, 102, 101, 98, 90],
    [92, 94, 98, 95, 98, 95, 98, 94, 92], [93, 92, 94, 95, 92, 95, 94, 92, 93], [85, 90, 92, 93, 78, 93, 92, 90, 85], [88, 85, 90, 88, 90, 88, 90, 85, 88]],
  [R]: [
    [206, 208, 207, 213, 214, 213, 207, 208, 206], [206, 212, 209, 216, 233, 216, 209, 212, 206], [206, 208, 207, 214, 216, 214, 207, 208, 206],
    [206, 213, 213, 216, 216, 216, 213, 213, 206], [208, 211, 211, 214, 215, 214, 211, 211, 208], [208, 212, 212, 214, 215, 214, 212, 212, 208],
    [204, 209, 204, 212, 214, 212, 204, 209, 204], [198, 208, 204, 212, 212, 212, 204, 208, 198], [200, 208, 206, 212, 200, 212, 206, 208, 200], [194, 206, 204, 212, 200, 212, 204, 206, 194]],
  [C]: [
    [100, 100, 96, 91, 90, 91, 96, 100, 100], [98, 98, 96, 92, 89, 92, 96, 98, 98], [97, 97, 96, 91, 92, 91, 96, 97, 97],
    [96, 99, 99, 98, 100, 98, 99, 99, 96], [96, 96, 96, 96, 100, 96, 96, 96, 96], [95, 96, 99, 96, 100, 96, 99, 96, 95],
    [96, 96, 96, 96, 96, 96, 96, 96, 96], [97, 96, 100, 99, 101, 99, 100, 96, 97], [96, 97, 98, 98, 98, 98, 98, 97, 96], [96, 96, 97, 99, 99, 99, 97, 96, 96]],
  [P]: [
    [9, 9, 9, 11, 13, 11, 9, 9, 9], [19, 24, 34, 42, 44, 42, 34, 24, 19], [19, 24, 32, 37, 37, 37, 32, 24, 19],
    [19, 23, 27, 29, 30, 29, 27, 23, 19], [14, 18, 20, 27, 29, 27, 20, 18, 14], [7, 0, 13, 0, 16, 0, 13, 0, 7],
    [7, 0, 7, 0, 15, 0, 7, 0, 7], [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0]],
};
// 殘局時（對方攻擊子少）仕相價值下降、兵卒價值上升，由 evaluate() 依局面調整。
const PST = [];
for (let t = 0; t < 7; t++) {
  const a = new Int16Array(256);
  for (let y = 0; y < 10; y++) for (let x = 0; x < 9; x++) a[sqOf(x, y)] = T[t][y][x];
  PST.push(a);
}
const ATTACK_W = [0, 0, 0, 2, 4, 2, 1]; // 計算攻擊子力：車 4、馬炮 2、過河兵 1
const MVV = [50, 2, 2, 4, 9, 4, 2];

// 固定種子的 Zobrist 值，介面與 Worker 計算結果一致
let seed = 0x2545f491;
const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed | 0; };
const ZK = [], ZL = [];
for (let i = 0; i < 14; i++) { const k = new Int32Array(256), l = new Int32Array(256); for (let s = 0; s < 256; s++) { k[s] = rnd(); l[s] = rnd(); } ZK.push(k); ZL.push(l); }
const ZK_SIDE = rnd(), ZL_SIDE = rnd();

export const START_FEN = 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w';
const FEN_CH = 'kabnrcp';

export class Position {
  constructor(fen = START_FEN) { this.fromFen(fen); }

  fromFen(fen) {
    this.sq = new Uint8Array(256);
    this.vl = [0, 0];
    this.atk = [0, 0];
    this.king = [0, 0];
    this.zk = 0; this.zl = 0;
    this.side = RED;
    // 走子紀錄：mv、被吃子、走前的雜湊、這手是否將軍
    this.mvs = []; this.caps = []; this.keysK = []; this.keysL = []; this.chks = [];
    const [board, turn] = fen.split(' ');
    let y = 0, x = 0;
    for (const ch of board) {
      if (ch === '/') { y++; x = 0; continue; }
      if (ch >= '1' && ch <= '9') { x += +ch; continue; }
      const t = FEN_CH.indexOf(ch.toLowerCase());
      if (t >= 0) this.add(sqOf(x, y), (ch === ch.toUpperCase() ? 8 : 16) + t);
      x++;
    }
    if (turn === 'b') this.changeSide();
    this.inCheck = this.checked(this.side);
  }

  fen() {
    let s = '';
    for (let y = 0; y < 10; y++) {
      let e = 0;
      for (let x = 0; x < 9; x++) {
        const pc = this.sq[sqOf(x, y)];
        if (!pc) { e++; continue; }
        if (e) { s += e; e = 0; }
        const c = FEN_CH[pc & 7];
        s += pc & 8 ? c.toUpperCase() : c;
      }
      if (e) s += e;
      if (y < 9) s += '/';
    }
    return s + (this.side === RED ? ' w' : ' b');
  }

  add(sq, pc) {
    this.sq[sq] = pc;
    const side = pc & 16 ? 1 : 0, t = pc & 7, z = t + side * 7;
    this.vl[side] += PST[t][side ? flip(sq) : sq];
    if (t === K) this.king[side] = sq;
    else if (t !== P || !ownHalf(sq, side)) this.atk[side] += ATTACK_W[t];
    this.zk ^= ZK[z][sq]; this.zl ^= ZL[z][sq];
  }

  del(sq, pc) {
    this.sq[sq] = 0;
    const side = pc & 16 ? 1 : 0, t = pc & 7, z = t + side * 7;
    this.vl[side] -= PST[t][side ? flip(sq) : sq];
    if (t !== K && (t !== P || !ownHalf(sq, side))) this.atk[side] -= ATTACK_W[t];
    this.zk ^= ZK[z][sq]; this.zl ^= ZL[z][sq];
  }

  changeSide() { this.side ^= 1; this.zk ^= ZK_SIDE; this.zl ^= ZL_SIDE; }

  // 走一步；若走後自己被將（含對臉），還原並回傳 false
  make(mv) {
    const src = mv & 255, dst = mv >> 8, pc = this.sq[src], cap = this.sq[dst];
    this.keysK.push(this.zk); this.keysL.push(this.zl);
    if (cap) this.del(dst, cap);
    this.del(src, pc);
    this.add(dst, pc);
    if (this.checked(this.side)) {
      this.del(dst, pc); this.add(src, pc); if (cap) this.add(dst, cap);
      this.keysK.pop(); this.keysL.pop();
      return false;
    }
    this.changeSide();
    this.mvs.push(mv); this.caps.push(cap);
    this.inCheck = this.checked(this.side);
    this.chks.push(this.inCheck);
    return true;
  }

  undo() {
    const mv = this.mvs.pop(), cap = this.caps.pop();
    this.chks.pop(); this.keysK.pop(); this.keysL.pop();
    this.changeSide();
    const src = mv & 255, dst = mv >> 8, pc = this.sq[dst];
    this.del(dst, pc); this.add(src, pc);
    if (cap) this.add(dst, cap);
    this.inCheck = this.chks.length ? this.chks[this.chks.length - 1] : this.checked(this.side);
  }

  makeNull() {
    this.keysK.push(this.zk); this.keysL.push(this.zl);
    this.changeSide();
    this.mvs.push(0); this.caps.push(0); this.chks.push(false);
    this.inCheck = false;
  }

  undoNull() {
    this.mvs.pop(); this.caps.pop(); this.chks.pop(); this.keysK.pop(); this.keysL.pop();
    this.changeSide();
    this.inCheck = false;
  }

  // side 的帥（將）是否被攻擊
  checked(side) {
    const b = this.sq, k = this.king[side], opp = 16 - (side << 3);
    if (!k) return false;
    if (b[forward(k, side)] === opp + P || b[k - 1] === opp + P || b[k + 1] === opp + P) return true;
    for (let i = 0; i < 4; i++) {
      if (b[k + ADV_D[i]]) continue;
      if (b[k + KNIGHT_CHK[i][0]] === opp + N || b[k + KNIGHT_CHK[i][1]] === opp + N) return true;
    }
    for (let i = 0; i < 4; i++) {
      const d = KING_D[i];
      let s = k + d;
      while (IN_BOARD[s] && !b[s]) s += d;
      if (!IN_BOARD[s]) continue;
      const t = b[s];
      if (t === opp + R || t === opp + K) return true;
      s += d;
      while (IN_BOARD[s] && !b[s]) s += d;
      if (IN_BOARD[s] && b[s] === opp + C) return true;
    }
    return false;
  }

  // 產生偽合法走法（未檢查送將）。caps 為 true 時只產生吃子。
  gen(out, caps = false) {
    const b = this.sq, side = this.side, self = sideTag(side), opp = 16 - (side << 3);
    const push = (src, dst) => {
      const t = b[dst];
      if (caps ? t & opp : !(t & self)) out.push(src | (dst << 8));
    };
    for (let src = 51; src <= 203; src++) {
      const pc = b[src];
      if (!(pc & self)) continue;
      switch (pc - self) {
        case K: for (let i = 0; i < 4; i++) { const d = src + KING_D[i]; if (IN_FORT[d]) push(src, d); } break;
        case A: for (let i = 0; i < 4; i++) { const d = src + ADV_D[i]; if (IN_FORT[d]) push(src, d); } break;
        case B:
          for (let i = 0; i < 4; i++) {
            const eye = src + ADV_D[i], d = eye + ADV_D[i];
            if (IN_BOARD[d] && sameHalf(src, d) && !b[eye]) push(src, d);
          }
          break;
        case N:
          for (let i = 0; i < 4; i++) {
            if (b[src + KING_D[i]]) continue;
            for (let j = 0; j < 2; j++) { const d = src + KNIGHT_D[i][j]; if (IN_BOARD[d]) push(src, d); }
          }
          break;
        case R:
          for (let i = 0; i < 4; i++) {
            const dd = KING_D[i];
            let d = src + dd;
            while (IN_BOARD[d]) {
              const t = b[d];
              if (!t) { if (!caps) out.push(src | (d << 8)); }
              else { if (t & opp) out.push(src | (d << 8)); break; }
              d += dd;
            }
          }
          break;
        case C:
          for (let i = 0; i < 4; i++) {
            const dd = KING_D[i];
            let d = src + dd;
            while (IN_BOARD[d] && !b[d]) { if (!caps) out.push(src | (d << 8)); d += dd; }
            d += dd;
            while (IN_BOARD[d]) { const t = b[d]; if (t) { if (t & opp) out.push(src | (d << 8)); break; } d += dd; }
          }
          break;
        case P: {
          const d = forward(src, side);
          if (IN_BOARD[d]) push(src, d);
          if (!ownHalf(src, side)) { if (IN_BOARD[src - 1]) push(src, src - 1); if (IN_BOARD[src + 1]) push(src, src + 1); }
          break;
        }
      }
    }
    return out;
  }

  legalMoves() {
    const list = this.gen([]), ok = [];
    for (const mv of list) if (this.make(mv)) { this.undo(); ok.push(mv); }
    return ok;
  }

  isLegal(mv) { return this.legalMoves().includes(mv); }

  evaluate() {
    const s = this.side;
    return this.vl[s] - this.vl[s ^ 1] + 3; // 3 為先手價值
  }

  // 重複局面：回傳 0 無重複；否則 1 + (我方長將 ? 2 : 0) + (對方長將 ? 4 : 0)
  repStatus(recur = 1) {
    let self = false, perp = true, oppPerp = true;
    for (let i = this.mvs.length - 1; i >= 0 && this.mvs[i] && !this.caps[i]; i--) {
      if (self) {
        perp = perp && this.chks[i];
        if (this.keysK[i] === this.zk && this.keysL[i] === this.zl && --recur <= 0) return 1 + (perp ? 2 : 0) + (oppPerp ? 4 : 0);
      } else oppPerp = oppPerp && this.chks[i];
      self = !self;
    }
    return 0;
  }

  drawValue(ply) { return ply & 1 ? DRAW : -DRAW; }

  repValue(st, ply) {
    const v = (st & 2 ? ply - BAN : 0) + (st & 4 ? BAN - ply : 0);
    return v === 0 ? this.drawValue(ply) : v;
  }

  // 空著裁剪的條件：子力太少時容易有「等著」局面，不做或要驗證
  nullOkay() { return this.vl[this.side] > 400; }
  nullSafe() { return this.vl[this.side] > 600; }

  pieceAt(x, y) { return this.sq[sqOf(x, y)]; }
}

// ---------- 搜尋 ----------
const TT_BITS = 19, TT_SIZE = 1 << TT_BITS, TT_MASK = TT_SIZE - 1;
const LIMIT = 64;
const F_ALPHA = 1, F_BETA = 2, F_EXACT = 3;

export class Searcher {
  constructor() {
    this.ttLock = new Int32Array(TT_SIZE);
    this.ttMove = new Int32Array(TT_SIZE);
    this.ttVal = new Int16Array(TT_SIZE);
    this.ttDepth = new Int8Array(TT_SIZE);
    this.ttFlag = new Int8Array(TT_SIZE);
    this.hist = new Int32Array(65536);
    this.killers = [];
    for (let i = 0; i < LIMIT; i++) this.killers.push([0, 0]);
  }

  clear() {
    this.ttFlag.fill(0); this.hist.fill(0);
    for (const k of this.killers) { k[0] = 0; k[1] = 0; }
  }

  probe(alpha, beta, depth, ply) {
    const i = this.pos.zk & TT_MASK;
    if (!this.ttFlag[i] || this.ttLock[i] !== this.pos.zl) return null;
    let v = this.ttVal[i];
    const mv = this.ttMove[i];
    let mate = false;
    if (v > WIN) { if (v <= BAN) return { mv, hit: false }; v -= ply; mate = true; }
    else if (v < -WIN) { if (v >= -BAN) return { mv, hit: false }; v += ply; mate = true; }
    if (this.ttDepth[i] >= depth || mate) {
      const f = this.ttFlag[i];
      if (f === F_EXACT || (f === F_BETA && v >= beta) || (f === F_ALPHA && v <= alpha)) return { mv, hit: true, v };
    }
    return { mv, hit: false };
  }

  record(flag, v, depth, mv, ply) {
    const i = this.pos.zk & TT_MASK;
    if (this.ttFlag[i] && this.ttDepth[i] > depth && this.ttLock[i] === this.pos.zl) return;
    if (v > WIN) { if (mv === 0 && v <= BAN) return; v += ply; }
    else if (v < -WIN) { if (mv === 0 && v >= -BAN) return; v -= ply; }
    this.ttLock[i] = this.pos.zl; this.ttFlag[i] = flag; this.ttDepth[i] = depth; this.ttVal[i] = v; this.ttMove[i] = mv;
  }

  timeUp() {
    if ((++this.nodes & 1023) === 0 && performance.now() > this.deadline) this.stop = true;
    return this.stop;
  }

  mvvLva(mv) {
    const b = this.pos.sq;
    return MVV[b[mv >> 8] & 7] * 8 - MVV[b[mv & 255] & 7];
  }

  quies(alpha, beta, ply) {
    if (this.timeUp()) return 0;
    const pos = this.pos;
    let v = ply - MATE;
    if (v >= beta) return v;
    const rep = pos.repStatus();
    if (rep) return pos.repValue(rep, ply);
    if (ply >= LIMIT - 1) return pos.evaluate();
    let best = -MATE;
    let list;
    if (pos.inCheck) {
      list = pos.gen([]);
      const h = this.hist;
      list.sort((a, b) => h[b] - h[a]);
    } else {
      v = pos.evaluate();
      if (v >= beta) return v;
      best = v;
      if (v > alpha) alpha = v;
      list = pos.gen([], true);
      const sc = new Map();
      for (const m of list) sc.set(m, this.mvvLva(m));
      list.sort((a, b) => sc.get(b) - sc.get(a));
    }
    for (const mv of list) {
      if (!pos.make(mv)) continue;
      v = -this.quies(-beta, -alpha, ply + 1);
      pos.undo();
      if (this.stop) return 0;
      if (v > best) {
        best = v;
        if (v >= beta) return v;
        if (v > alpha) alpha = v;
      }
    }
    return best === -MATE ? ply - MATE : best;
  }

  search(alpha, beta, depth, ply, noNull = false) {
    const pos = this.pos;
    if (depth <= 0) return this.quies(alpha, beta, ply);
    if (this.timeUp()) return 0;
    let v = ply - MATE;
    if (v >= beta) return v;
    const rep = pos.repStatus();
    if (rep) return pos.repValue(rep, ply);
    if (ply >= LIMIT - 1) return pos.evaluate();

    const pv = beta - alpha > 1;
    const tt = this.probe(alpha, beta, depth, ply);
    if (tt && tt.hit && !pv) return tt.v;
    const hashMv = tt ? tt.mv : 0;

    // 空著裁剪
    if (!pv && !noNull && !pos.inCheck && depth >= 2 && pos.nullOkay()) {
      const r = depth >= 6 ? 3 : 2;
      pos.makeNull();
      v = -this.search(-beta, 1 - beta, depth - 1 - r, ply + 1, true);
      pos.undoNull();
      if (this.stop) return 0;
      if (v >= beta && (pos.nullSafe() || this.search(beta - 1, beta, depth - r, ply, true) >= beta)) return v >= WIN ? beta : v;
    }

    // 走法排序：雜湊走法、吃子（MVV-LVA）、殺手、歷史
    const list = pos.gen([]);
    const kill = this.killers[ply];
    const b = pos.sq, h = this.hist;
    const score = new Int32Array(list.length);
    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      if (m === hashMv) score[i] = 1 << 30;
      else if (b[m >> 8]) score[i] = (1 << 29) + this.mvvLva(m);
      else if (m === kill[0]) score[i] = (1 << 28) + 2;
      else if (m === kill[1]) score[i] = (1 << 28) + 1;
      else score[i] = Math.min(h[m], (1 << 28) - 1);
    }
    const idx = Array.from(list.keys()).sort((x, y) => score[y] - score[x]);

    let best = -MATE, bestMv = 0, flag = F_ALPHA, legal = 0;
    const inCheck = pos.inCheck;
    for (const k of idx) {
      const mv = list[k];
      const isCap = b[mv >> 8] !== 0;
      if (!pos.make(mv)) continue;
      const gives = pos.inCheck;
      const nd = gives ? depth : depth - 1; // 將軍延伸
      if (legal === 0) v = -this.search(-beta, -alpha, nd, ply + 1);
      else {
        let red = 0;
        if (depth >= 3 && !inCheck && !gives && !isCap && legal >= 3 && mv !== kill[0] && mv !== kill[1]) red = legal >= 10 && depth >= 6 ? 2 : 1;
        v = -this.search(-alpha - 1, -alpha, nd - red, ply + 1);
        if (v > alpha && red) v = -this.search(-alpha - 1, -alpha, nd, ply + 1);
        if (v > alpha && v < beta) v = -this.search(-beta, -alpha, nd, ply + 1);
      }
      pos.undo();
      legal++;
      if (this.stop) return 0;
      if (v > best) {
        best = v; bestMv = mv;
        if (v >= beta) { flag = F_BETA; break; }
        if (v > alpha) { alpha = v; flag = F_EXACT; }
      }
    }
    if (legal === 0) return ply - MATE; // 將死或困斃都算輸
    this.record(flag, best, depth, bestMv, ply);
    if (bestMv && !b[bestMv >> 8]) {
      h[bestMv] += depth * depth;
      if (h[bestMv] > 1e8) for (let i = 0; i < 65536; i++) h[i] >>= 1;
      if (flag === F_BETA && kill[0] !== bestMv) { kill[1] = kill[0]; kill[0] = bestMv; }
    }
    return best;
  }

  // 根節點：每個走法都完整計分（低難度時用來挑「差不多好」的走法）
  rootSearch(depth, moves, prevBest) {
    const pos = this.pos;
    const res = [];
    let alpha = -MATE, best = -MATE;
    const order = prevBest ? [prevBest, ...moves.filter((m) => m !== prevBest)] : moves;
    for (const mv of order) {
      if (!pos.make(mv)) continue;
      const nd = pos.inCheck ? depth : depth - 1;
      let v;
      if (this.wide || best === -MATE) v = -this.search(-MATE, MATE, nd, 1);
      else {
        v = -this.search(-alpha - 1, -alpha, nd, 1);
        if (v > alpha && !this.stop) v = -this.search(-MATE, -alpha, nd, 1);
      }
      pos.undo();
      if (this.stop) break;
      res.push({ mv, v });
      if (v > best) { best = v; alpha = v; }
    }
    res.sort((a, b) => b.v - a.v);
    return res;
  }

  // opts: { depth, time, margin, avoid:Set<mv> }
  think(pos, { depth = 32, time = 1e9, margin = 0, avoid = null } = {}) {
    this.pos = pos;
    this.nodes = 0;
    this.stop = false;
    this.deadline = performance.now() + time;
    this.wide = margin > 0;
    for (const k of this.killers) { k[0] = 0; k[1] = 0; }
    for (let i = 0; i < 65536; i++) this.hist[i] >>= 2;
    let moves = pos.legalMoves();
    if (avoid && moves.some((m) => !avoid.has(m))) moves = moves.filter((m) => !avoid.has(m));
    if (moves.length === 0) return { move: 0, score: -MATE, depth: 0 };
    if (moves.length === 1) return { move: moves[0], score: 0, depth: 0 };
    let done = null, d = 0;
    for (d = 1; d <= depth; d++) {
      const res = this.rootSearch(d, moves, done ? done[0].mv : 0);
      if (this.stop) {
        // 未完成的一層：若第一個（上一層最佳）走法已算完且分數更高，可採用
        if (res.length && done && res[0].mv !== done[0].mv && res[0].v > done[0].v) done = [res[0], ...done.filter((r) => r.mv !== res[0].mv)];
        d--;
        break;
      }
      done = res;
      if (Math.abs(res[0].v) > WIN) break; // 找到殺棋
      if (performance.now() > this.deadline - (time * 0.55)) { if (time < 1e8) break; }
    }
    if (!done) return { move: moves[0], score: 0, depth: 0 };
    let pick = done[0];
    if (margin > 0) {
      const ok = done.filter((r) => r.v >= done[0].v - margin && r.v > -WIN);
      if (ok.length > 1) {
        // 越好的走法權重越高
        const w = ok.map((r) => Math.exp((r.v - done[0].v) / (margin / 2.5)));
        let x = Math.random() * w.reduce((a, b) => a + b, 0);
        for (let i = 0; i < ok.length; i++) { x -= w[i]; if (x <= 0) { pick = ok[i]; break; } }
      }
    }
    return { move: pick.mv, score: pick.v, depth: d, nodes: this.nodes };
  }
}

// ---------- 座標與記譜 ----------
// ICCS 座標：檔 a–i 由紅方左至右，列 0–9 由紅方底線往上
export function moveToIccs(mv) {
  const s = mv & 255, d = mv >> 8;
  const f = (sq) => 'abcdefghi'[xOf(sq)] + (9 - yOf(sq));
  return f(s) + f(d);
}
export function iccsToMove(str) {
  const p = (a, b) => sqOf('abcdefghi'.indexOf(a), 9 - +b);
  return p(str[0], str[1]) | (p(str[2], str[3]) << 8);
}

export const FACE = [['帥', '仕', '相', '傌', '俥', '炮', '兵'], ['將', '士', '象', '馬', '車', '砲', '卒']];
const CN = '〇一二三四五六七八九', FW = '０１２３４５６７８９';

// 中文記譜（走之前呼叫）：炮二平五、馬８進７、前車退二
export function moveName(pos, mv) {
  const src = mv & 255, dst = mv >> 8, pc = pos.sq[src], t = pc & 7, side = sideOf(pc);
  const num = (n) => (side === RED ? CN[n] : FW[n]);
  const fileNo = (sq) => (side === RED ? 9 - xOf(sq) : xOf(sq) + 1);
  // 同一直線上同種的子
  const same = [];
  for (let y = 0; y < 10; y++) { const s = sqOf(xOf(src), y); if (pos.sq[s] === pc) same.push(s); }
  let head;
  if (same.length >= 2 && t !== K && t !== A && t !== B) {
    // 由前（靠近對方）到後排列
    same.sort((a, b) => (side === RED ? yOf(a) - yOf(b) : yOf(b) - yOf(a)));
    const i = same.indexOf(src);
    const tag = same.length === 2 ? ['前', '後'][i] : same.length === 3 ? ['前', '中', '後'][i] : num(i + 1);
    head = tag + FACE[side][t];
  } else head = FACE[side][t] + num(fileNo(src));
  const dy = yOf(dst) - yOf(src);
  const fwd = side === RED ? dy < 0 : dy > 0;
  if (dy === 0) return head + '平' + num(fileNo(dst));
  const act = fwd ? '進' : '退';
  if (t === N || t === B || t === A) return head + act + num(fileNo(dst));
  return head + act + num(Math.abs(dy));
}

// ---------- 對局判定（介面用） ----------
// 依「長將判負、長捉判負、其餘重複作和」的亞洲規則簡化實作。
const VALUE = [0, 2, 2, 4, 9, 4.5, 1];

// 走完 mv 後，走子方的這顆子是否「捉」對方某子（不含將與兵卒）：
// 對方子無保護，或攻擊者價值較低（如馬捉車）。
function isChase(pos, mv) {
  const dst = mv >> 8, attackerT = pos.sq[dst] & 7;
  if (attackerT === K || attackerT === P) return false;
  if (pos.inCheck) return false;
  // 換成走子方視角產生它的吃子
  pos.changeSide();
  const caps = pos.gen([], true).filter((m) => (m & 255) === dst);
  let chase = false;
  for (const m of caps) {
    const victim = pos.sq[m >> 8], vt = victim & 7;
    if (vt === K || vt === P) continue;
    if (!pos.make(m)) continue;
    // 吃下後，對方能否吃回（是否有保護）
    const recapture = pos.legalMoves().some((r) => (r >> 8) === (m >> 8));
    pos.undo();
    if (!recapture || VALUE[vt] > VALUE[attackerT]) { chase = true; break; }
  }
  pos.changeSide();
  return chase;
}

// history: 由開局起的走法陣列。回傳 null（繼續）或 { winner: RED/BLACK/-1, reason }
export function adjudicate(moves) {
  const pos = new Position();
  const chase = [];
  for (const m of moves) {
    pos.make(m);
    chase.push(isChase(pos, m));
  }
  const side = pos.side;
  if (pos.legalMoves().length === 0) return { winner: side ^ 1, reason: pos.inCheck ? '將死' : '困斃' };
  // 三次重複
  let count = 1, first = -1;
  const n0 = pos.mvs.length;
  for (let i = n0 - 1; i >= 0 && !pos.caps[i]; i--) {
    if ((n0 - i) % 2 === 0 && pos.keysK[i] === pos.zk && pos.keysL[i] === pos.zl) { count++; first = i; }
  }
  if (count >= 3) {
    const n = pos.mvs.length;
    const stats = [{ check: true, chase: true }, { check: true, chase: true }];
    for (let i = first; i < n; i++) {
      const s = i % 2 === 0 ? RED : BLACK; // 紅先，偶數手為紅
      stats[s].check = stats[s].check && pos.chks[i];
      stats[s].chase = stats[s].chase && (pos.chks[i] || chase[i]);
    }
    const [r, b] = stats;
    if (r.check && !b.check) return { winner: BLACK, reason: '紅方長將' };
    if (b.check && !r.check) return { winner: RED, reason: '黑方長將' };
    if (r.chase && !b.chase) return { winner: BLACK, reason: '紅方長捉' };
    if (b.chase && !r.chase) return { winner: RED, reason: '黑方長捉' };
    return { winner: -1, reason: '重複局面' };
  }
  // 自然限著：60 回合無吃子
  let quiet = 0;
  for (let i = pos.mvs.length - 1; i >= 0 && !pos.caps[i]; i--) quiet++;
  if (quiet >= 120) return { winner: -1, reason: '60 回合無吃子' };
  if (pos.atk[0] === 0 && pos.atk[1] === 0 && !hasPawn(pos)) return { winner: -1, reason: '雙方無攻擊子' };
  return null;
}

function hasPawn(pos) {
  for (let s = 51; s <= 203; s++) if ((pos.sq[s] & 7) === P && pos.sq[s]) return true;
  return false;
}
