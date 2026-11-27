// 西洋棋規則：走法合法性、入堡、吃過路兵、升變、SAN 記譜、和棋判定。
// 0x88 棋盤：sq = rank * 16 + file，rank 0 為白方底線。棋子以字母表示，大寫白、小寫黑。
export const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const FILES = 'abcdefgh';
export const sqName = (s) => FILES[s & 7] + ((s >> 4) + 1);
export const sqFrom = (n) => (n.charCodeAt(1) - 49) * 16 + (n.charCodeAt(0) - 97);
export const isWhite = (p) => p >= 'A' && p <= 'Z';
const colorOf = (p) => (isWhite(p) ? 'w' : 'b');

const N_D = [-33, -31, -18, -14, 14, 18, 31, 33];
const K_D = [-17, -16, -15, -1, 1, 15, 16, 17];
const B_D = [-17, -15, 15, 17];
const R_D = [-16, -1, 1, 16];

export function parseFen(fen) {
  const [board, turn, castle, ep, half, full] = fen.split(' ');
  const b = new Array(128).fill('');
  let r = 7, f = 0;
  for (const ch of board) {
    if (ch === '/') { r--; f = 0; continue; }
    if (ch >= '1' && ch <= '8') { f += +ch; continue; }
    b[r * 16 + f] = ch; f++;
  }
  return { b, turn, castle: castle === '-' ? '' : castle, ep: ep === '-' ? -1 : sqFrom(ep), half: +half || 0, full: +full || 1 };
}

export function toFen(st) {
  let s = '';
  for (let r = 7; r >= 0; r--) {
    let e = 0;
    for (let f = 0; f < 8; f++) { const p = st.b[r * 16 + f]; if (!p) { e++; continue; } if (e) { s += e; e = 0; } s += p; }
    if (e) s += e;
    if (r) s += '/';
  }
  return `${s} ${st.turn} ${st.castle || '-'} ${st.ep >= 0 ? sqName(st.ep) : '-'} ${st.half} ${st.full}`;
}

export function attacked(b, s, by) {
  const w = by === 'w';
  // 兵
  const pr = w ? -15 : 15, pl = w ? -17 : 17, pawn = w ? 'P' : 'p';
  for (const d of [pr, pl]) { const t = s + d; if (!(t & 0x88) && b[t] === pawn) return true; }
  const n = w ? 'N' : 'n', k = w ? 'K' : 'k', bq = w ? 'BQ' : 'bq', rq = w ? 'RQ' : 'rq';
  for (const d of N_D) { const t = s + d; if (!(t & 0x88) && b[t] === n) return true; }
  for (const d of K_D) { const t = s + d; if (!(t & 0x88) && b[t] === k) return true; }
  for (const d of B_D) { let t = s + d; while (!(t & 0x88)) { const p = b[t]; if (p) { if (bq.includes(p)) return true; break; } t += d; } }
  for (const d of R_D) { let t = s + d; while (!(t & 0x88)) { const p = b[t]; if (p) { if (rq.includes(p)) return true; break; } t += d; } }
  return false;
}

const kingSq = (b, c) => b.indexOf(c === 'w' ? 'K' : 'k');
export const inCheck = (st) => attacked(st.b, kingSq(st.b, st.turn), st.turn === 'w' ? 'b' : 'w');

// 偽合法走法 { from, to, promo, flag: 'ep' | 'castle' | 'double' }
function pseudo(st) {
  const out = [], b = st.b, me = st.turn, opp = me === 'w' ? 'b' : 'w';
  const own = (p) => p && colorOf(p) === me;
  const enemy = (p) => p && colorOf(p) === opp;
  for (let s = 0; s < 128; s++) {
    if (s & 0x88) { s += 7; continue; }
    const p = b[s];
    if (!own(p)) continue;
    const t = p.toLowerCase();
    if (t === 'p') {
      const fwd = me === 'w' ? 16 : -16, startR = me === 'w' ? 1 : 6, lastR = me === 'w' ? 7 : 0;
      const add = (to, flag) => {
        if ((to >> 4) === lastR) for (const q of 'qrbn') out.push({ from: s, to, promo: q });
        else out.push({ from: s, to, flag });
      };
      const one = s + fwd;
      if (!(one & 0x88) && !b[one]) {
        add(one);
        const two = one + fwd;
        if ((s >> 4) === startR && !b[two]) out.push({ from: s, to: two, flag: 'double' });
      }
      for (const d of [fwd - 1, fwd + 1]) {
        const to = s + d;
        if (to & 0x88) continue;
        if (enemy(b[to])) add(to);
        else if (to === st.ep) out.push({ from: s, to, flag: 'ep' });
      }
    } else if (t === 'n' || t === 'k') {
      for (const d of t === 'n' ? N_D : K_D) { const to = s + d; if (!(to & 0x88) && !own(b[to])) out.push({ from: s, to }); }
    } else {
      const dirs = t === 'b' ? B_D : t === 'r' ? R_D : K_D;
      for (const d of dirs) {
        let to = s + d;
        while (!(to & 0x88)) { if (own(b[to])) break; out.push({ from: s, to }); if (b[to]) break; to += d; }
      }
    }
  }
  // 入堡：王與車未動過、中間無子、王不在被將中、經過與到達的格子不受攻擊
  const rank = me === 'w' ? 0 : 0x70, K = me === 'w' ? 'K' : 'k', Rk = me === 'w' ? 'R' : 'r';
  if (b[rank + 4] === K && !attacked(b, rank + 4, opp)) {
    if (st.castle.includes(me === 'w' ? 'K' : 'k') && b[rank + 7] === Rk && !b[rank + 5] && !b[rank + 6] && !attacked(b, rank + 5, opp) && !attacked(b, rank + 6, opp))
      out.push({ from: rank + 4, to: rank + 6, flag: 'castle' });
    if (st.castle.includes(me === 'w' ? 'Q' : 'q') && b[rank] === Rk && !b[rank + 1] && !b[rank + 2] && !b[rank + 3] && !attacked(b, rank + 3, opp) && !attacked(b, rank + 2, opp))
      out.push({ from: rank + 4, to: rank + 2, flag: 'castle' });
  }
  return out;
}

export function apply(st, m) {
  const b = st.b.slice(), me = st.turn, p = b[m.from];
  const cap = b[m.to] || (m.flag === 'ep' ? b[m.to + (me === 'w' ? -16 : 16)] : '');
  b[m.to] = m.promo ? (me === 'w' ? m.promo.toUpperCase() : m.promo) : p;
  b[m.from] = '';
  if (m.flag === 'ep') b[m.to + (me === 'w' ? -16 : 16)] = '';
  if (m.flag === 'castle') {
    const r = m.to & 0x70;
    if ((m.to & 7) === 6) { b[r + 5] = b[r + 7]; b[r + 7] = ''; } else { b[r + 3] = b[r]; b[r] = ''; }
  }
  let castle = st.castle;
  const strip = (chars) => { for (const c of chars) castle = castle.replace(c, ''); };
  if (p === 'K') strip('KQ'); if (p === 'k') strip('kq');
  for (const s of [m.from, m.to]) { if (s === 0) strip('Q'); if (s === 7) strip('K'); if (s === 0x70) strip('q'); if (s === 0x77) strip('k'); }
  return {
    b, turn: me === 'w' ? 'b' : 'w', castle,
    ep: m.flag === 'double' ? (m.from + m.to) >> 1 : -1,
    half: p.toLowerCase() === 'p' || cap ? 0 : st.half + 1,
    full: st.full + (me === 'b' ? 1 : 0),
    cap,
  };
}

export function legalMoves(st) {
  return pseudo(st).filter((m) => { const n = apply(st, m); return !attacked(n.b, kingSq(n.b, st.turn), n.turn); });
}

export const uci = (m) => sqName(m.from) + sqName(m.to) + (m.promo || '');
export function fromUci(st, s) {
  const from = sqFrom(s.slice(0, 2)), to = sqFrom(s.slice(2, 4)), promo = s[4] || undefined;
  return legalMoves(st).find((m) => m.from === from && m.to === to && (m.promo || undefined) === promo) || null;
}

export function san(st, m) {
  const p = st.b[m.from], t = p.toUpperCase();
  let s;
  if (m.flag === 'castle') s = (m.to & 7) === 6 ? 'O-O' : 'O-O-O';
  else {
    const cap = !!st.b[m.to] || m.flag === 'ep';
    if (t === 'P') s = (cap ? FILES[m.from & 7] + 'x' : '') + sqName(m.to) + (m.promo ? '=' + m.promo.toUpperCase() : '');
    else {
      const rivals = legalMoves(st).filter((o) => o.to === m.to && o.from !== m.from && st.b[o.from] === p);
      let dis = '';
      if (rivals.length) {
        const sameFile = rivals.some((o) => (o.from & 7) === (m.from & 7)), sameRank = rivals.some((o) => (o.from >> 4) === (m.from >> 4));
        dis = !sameFile ? FILES[m.from & 7] : !sameRank ? String((m.from >> 4) + 1) : sqName(m.from);
      }
      s = t + dis + (cap ? 'x' : '') + sqName(m.to);
    }
  }
  const n = apply(st, m);
  if (inCheck(n)) s += legalMoves(n).length ? '+' : '#';
  return s;
}

// 重複局面用的鍵：盤面、輪走方、入堡權、可實際吃過路兵的格子
export function posKey(st) {
  let ep = '-';
  if (st.ep >= 0 && legalMoves(st).some((m) => m.flag === 'ep')) ep = sqName(st.ep);
  return toFen(st).split(' ').slice(0, 3).join(' ') + ' ' + ep;
}

function insufficient(b) {
  const pcs = [];
  for (let s = 0; s < 128; s++) { if (s & 0x88) continue; const p = b[s]; if (p && p.toLowerCase() !== 'k') pcs.push({ p: p.toLowerCase(), c: ((s >> 4) + (s & 7)) & 1 }); }
  if (pcs.length === 0) return true;
  if (pcs.some((x) => x.p === 'p' || x.p === 'r' || x.p === 'q')) return false;
  if (pcs.length === 1) return true; // 單馬或單象
  if (pcs.every((x) => x.p === 'b') && pcs.every((x) => x.c === pcs[0].c)) return true; // 同色格的象
  return false;
}

// 依走法紀錄重建對局。回傳 { st, keys, sans, result: null | { winner: 'w'|'b'|'', reason } }
export function replay(ucis) {
  let st = parseFen(START);
  const keys = [posKey(st)], sans = [], states = [st];
  for (const u of ucis) {
    const m = fromUci(st, u);
    if (!m) throw new Error('棋譜不合法：' + u);
    sans.push(san(st, m));
    st = apply(st, m);
    states.push(st);
    keys.push(posKey(st));
  }
  return { st, keys, sans, states, result: outcome(st, keys) };
}

export function outcome(st, keys) {
  const moves = legalMoves(st);
  if (!moves.length) return inCheck(st) ? { winner: st.turn === 'w' ? 'b' : 'w', reason: '將死' } : { winner: '', reason: '逼和' };
  const last = keys[keys.length - 1];
  if (keys.filter((k) => k === last).length >= 3) return { winner: '', reason: '三次重複' };
  if (st.half >= 100) return { winner: '', reason: '50 步規則' };
  if (insufficient(st.b)) return { winner: '', reason: '子力不足' };
  return null;
}

// 雙方被吃的子（用來顯示子力差）
const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
export function material(b) {
  let w = 0, k = 0;
  for (let s = 0; s < 128; s++) { if (s & 0x88) continue; const p = b[s]; if (!p) continue; if (isWhite(p)) w += VAL[p.toLowerCase()]; else k += VAL[p]; }
  return { w, b: k };
}
