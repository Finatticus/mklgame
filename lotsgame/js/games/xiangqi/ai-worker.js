// 象棋 AI Worker：開局庫 + 迭代加深 alpha-beta 搜尋。
import { Position, Searcher, adjudicate, iccsToMove, moveToIccs, RED, BLACK } from './engine.js';

// 常見正規開局（ICCS 座標），前幾手依權重隨機選，讓開局自然又有變化
const BOOK = [
  [6, 'h2e2 h9g7 h0g2 i9h9 i0h0 b9c7 b0c2 c6c5'], // 中炮對屏風馬
  [3, 'h2e2 h9g7 h0g2 i9h9 i0h0 b9c7 c3c4 c6c5'],
  [3, 'h2e2 h7e7 h0g2 h9g7 i0h0 i9h9'], // 順炮
  [2, 'h2e2 b7e7 h0g2 b9c7 i0h0'], // 列炮
  [3, 'h2e2 b9c7 h0g2 h9g7 i0h0 i9h9'],
  [4, 'g0e2 c6c5 h0g2 b9c7'], // 飛相局
  [2, 'g0e2 h9g7 h0g2 i9h9'],
  [4, 'c3c4 b7c7 h2e2 b9a7'], // 仙人指路對卒底炮
  [3, 'c3c4 c6c5 b0c2 b9c7'],
  [3, 'h0g2 g6g5 g3g4 h9g7'], // 起馬局
  [2, 'b2e2 b9c7 b0c2 a9b9'],
];

function bookMove(played) {
  const key = played.join(' ');
  const opts = new Map();
  for (const [w, line] of BOOK) {
    const mv = line.split(' ');
    if (mv.length <= played.length) continue;
    if (mv.slice(0, played.length).join(' ') !== key) continue;
    const next = mv[played.length];
    opts.set(next, (opts.get(next) || 0) + w);
  }
  if (!opts.size) return null;
  let x = Math.random() * [...opts.values()].reduce((a, b) => a + b, 0);
  for (const [m, w] of opts) { x -= w; if (x <= 0) return m; }
  return [...opts.keys()][0];
}

const LEVELS = {
  l1: { depth: 2, margin: 40 },
  l2: { depth: 4, margin: 15 },
  l3: { depth: 8, time: 600 },
  l4: { time: 1800 },
  l5: { time: 4500 },
};

const searcher = new Searcher();

// 會因長將、長捉被判負的走法，電腦不走
function losingRepeats(pos, history) {
  const avoid = new Set();
  const me = pos.side;
  for (const mv of pos.legalMoves()) {
    pos.make(mv);
    let seen = 0;
    const n = pos.mvs.length;
    for (let i = n - 1; i >= 0 && !pos.caps[i]; i--) if ((n - i) % 2 === 0 && pos.keysK[i] === pos.zk && pos.keysL[i] === pos.zl) seen++;
    pos.undo();
    if (seen >= 2) {
      const r = adjudicate([...history, mv]);
      if (r && r.winner === (me === RED ? BLACK : RED)) avoid.add(mv);
    }
  }
  return avoid;
}

self.onmessage = (e) => {
  const { id, payload } = e.data;
  try {
    const { moves, level } = payload;
    if (moves.length < 8) {
      const b = bookMove(moves);
      const pos = new Position();
      const hist = moves.map(iccsToMove);
      hist.forEach((m) => pos.make(m));
      if (b && pos.isLegal(iccsToMove(b))) { self.postMessage({ id, result: { move: b, book: true } }); return; }
    }
    const pos = new Position();
    const hist = moves.map(iccsToMove);
    for (const m of hist) if (!pos.make(m)) throw new Error('棋譜不合法');
    const opts = Object.assign({}, LEVELS[level] || LEVELS.l3);
    opts.avoid = losingRepeats(pos, hist);
    const r = searcher.think(pos, opts);
    self.postMessage({ id, result: { move: moveToIccs(r.move), score: r.score, depth: r.depth } });
  } catch (err) {
    self.postMessage({ id, error: String(err && err.message || err) });
  }
};
