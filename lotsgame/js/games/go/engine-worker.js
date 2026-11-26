// 圍棋 AI worker：以 onnxruntime-web 執行官方 KataGo 神經網路，外加輕量 MCTS。
import * as ort from '../../../vendor/ort/ort.webgpu.bundle.min.mjs';
import { EMPTY, BLACK, PASS, positionFromMoves, playPosition, scoreWithOwnership } from './rules.js';
import { buildFeatures, symmetryMap } from './features.js';

ort.env.wasm.wasmPaths = new URL('../../../vendor/ort/', import.meta.url).href;
ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
ort.env.logLevel = 'error';

const MODELS = {
  b6: { file: 'go-b6.onnx', size: 2067835 },
  b10: { file: 'go-b10.onnx', size: 6005747 },
  b18: { file: 'go-b18.onnx', size: 52715045 },
};
const CACHE = 'lots-models-v1';
const sessions = {};
let backendName = 'wasm';

async function fetchModel(key, onProgress) {
  const info = MODELS[key];
  const url = new URL('../../../models/' + info.file, import.meta.url).href;
  let cache = null;
  try { cache = await caches.open(CACHE); } catch (e) { /* 無快取也可運作 */ }
  if (cache) {
    const hit = await cache.match(url);
    if (hit) return await hit.arrayBuffer();
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error('model download failed: ' + res.status);
  const total = +res.headers.get('content-length') || info.size;
  const reader = res.body.getReader();
  const chunks = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    got += value.length;
    onProgress && onProgress(Math.min(1, got / total));
  }
  const buf = new Uint8Array(got);
  let o = 0;
  for (const c of chunks) { buf.set(c, o); o += c.length; }
  if (cache) {
    try { await cache.put(url, new Response(buf.slice().buffer, { headers: { 'content-type': 'application/octet-stream' } })); } catch (e) { /* 配額不足時略過 */ }
  }
  return buf.buffer;
}

async function createSession(buf) {
  const tryCreate = (ep) => ort.InferenceSession.create(buf, { executionProviders: [ep], graphOptimizationLevel: 'all' });
  if (self.navigator && navigator.gpu) {
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) {
        const s = await tryCreate('webgpu');
        const ok = await sanity(s);
        if (ok) { backendName = 'webgpu'; return s; }
      }
    } catch (e) { /* 退回 WASM */ }
  }
  backendName = 'wasm';
  return await tryCreate('wasm');
}

async function runRaw(session, n, bin, glob) {
  const feeds = {
    bin_input: new ort.Tensor('float32', bin, [1, 22, n, n]),
    global_input: new ort.Tensor('float32', glob, [1, 19]),
    size_scale: new ort.Tensor('float32', new Float32Array([(n - 14) / 10]), [1]),
  };
  const out = await session.run(feeds);
  return out;
}

async function sanity(session) {
  try {
    const n = 9, bin = new Float32Array(22 * n * n), glob = new Float32Array(19);
    for (let i = 0; i < n * n; i++) bin[i] = 1;
    glob[5] = -0.375;
    const out = await runRaw(session, n, bin, glob);
    const p = out.policy.data;
    let best = 0;
    for (let i = 1; i < n * n; i++) if (p[i] > p[best]) best = i;
    const x = best % n, y = (best / n) | 0;
    // 空棋盤第一手必然落在中腹附近
    return Number.isFinite(p[best]) && x >= 2 && x <= 6 && y >= 2 && y <= 6;
  } catch (e) { return false; }
}

async function ensureModel(key, onProgress) {
  if (sessions[key]) return sessions[key];
  const buf = await fetchModel(key, onProgress);
  sessions[key] = await createSession(buf);
  return sessions[key];
}

// 單次網路評估。回傳合法著點機率、勝率、目數差、歸屬（黑方視角）。
async function evaluate(session, pos, sym) {
  const b = pos.board, n = b.n, n2 = n * n;
  const { bin, glob } = buildFeatures(pos, sym);
  const out = await runRaw(session, n, bin, glob);
  const map = symmetryMap(n, sym);
  const pol = out.policy.data, pas = out.pass.data;
  const logits = new Float32Array(n2 + 1);
  let mx = -1e30;
  for (let i = 0; i < n2; i++) {
    if (b.isLegal(i, pos.toPlay)) { logits[i] = pol[map[i]]; if (logits[i] > mx) mx = logits[i]; }
    else logits[i] = -1e30;
  }
  logits[n2] = pas[0];
  if (pas[0] > mx) mx = pas[0];
  const policy = new Float32Array(n2 + 1);
  let sum = 0;
  for (let i = 0; i <= n2; i++) { const v = logits[i] < -1e29 ? 0 : Math.exp(logits[i] - mx); policy[i] = v; sum += v; }
  for (let i = 0; i <= n2; i++) policy[i] /= sum;
  const v = out.value.data;
  const m = Math.max(v[0], v[1], v[2]);
  const e0 = Math.exp(v[0] - m), e1 = Math.exp(v[1] - m), e2 = Math.exp(v[2] - m);
  const win = e0 / (e0 + e1 + e2), loss = e1 / (e0 + e1 + e2);
  const lead = out.misc.data[2] * 20;
  const ownRaw = out.ownership.data;
  const own = new Float32Array(n2);
  const sign = pos.toPlay === BLACK ? 1 : -1;
  for (let i = 0; i < n2; i++) own[i] = Math.tanh(ownRaw[map[i]]) * sign;
  return { policy, win, loss, lead, own };
}

const utilityOf = (ev) => (ev.win - ev.loss) + 0.2 * Math.tanh(ev.lead / 20);

function makeNode(pos, ev) {
  const n2 = pos.board.c.length;
  const moves = [], priors = [];
  for (let i = 0; i <= n2; i++) if (ev.policy[i] > 0.0008) { moves.push(i === n2 ? PASS : i); priors.push(ev.policy[i]); }
  return { pos, ev, moves, priors, children: new Array(moves.length).fill(null), N: 1, W: utilityOf(ev) };
}

function selectChild(node) {
  const sqrtN = Math.sqrt(node.N);
  const parentQ = node.W / node.N;
  let best = -1, bestScore = -1e30;
  for (let i = 0; i < node.moves.length; i++) {
    const ch = node.children[i];
    const q = ch ? -(ch.W / ch.N) : parentQ - 0.25;
    const nvis = ch ? ch.N : 0;
    const s = q + 1.1 * node.priors[i] * sqrtN / (1 + nvis);
    if (s > bestScore) { bestScore = s; best = i; }
  }
  return best;
}

async function search(session, root, maxVisits, timeMs) {
  const start = performance.now();
  let visits = 1;
  while (visits < maxVisits && performance.now() - start < timeMs) {
    const path = [root];
    let node = root, leafValue = null;
    for (;;) {
      const i = selectChild(node);
      if (i < 0) { leafValue = node.W / node.N; break; }
      let ch = node.children[i];
      if (!ch) {
        const npos = playPosition(node.pos, node.moves[i]);
        const ev = await evaluate(session, npos, (Math.random() * 8) | 0);
        ch = makeNode(npos, ev);
        node.children[i] = ch;
        ch.N = 0; ch.W = 0;
        path.push(ch);
        leafValue = utilityOf(ev);
        break;
      }
      path.push(ch);
      node = ch;
    }
    // 回傳：leafValue 是葉節點行棋方視角
    let v = leafValue;
    for (let k = path.length - 1; k >= 0; k--) { path[k].N += 1; path[k].W += v; v = -v; }
    visits++;
  }
  return visits;
}

const LEVELS = {
  easy: { model: 'b6', visits: 1, timeMs: 0, sample: true },
  mid: { model: 'b10', visits: 48, timeMs: 1800, sample: false },
  hard: { model: 'b18', visits: 64, timeMs: 4500, sample: false },
};

async function genmove({ size, komi, moves, level, override }) {
  const cfg = Object.assign({}, LEVELS[level], override || {});
  const session = await ensureModel(cfg.model);
  const pos = positionFromMoves(size, komi, moves);
  const n2 = size * size;
  const ev = await evaluate(session, pos, (Math.random() * 8) | 0);
  const root = makeNode(pos, ev);
  let visits = 1;
  if (cfg.visits > 1) visits = await search(session, root, cfg.visits, cfg.timeMs);

  let win = ev.win, lead = ev.lead;
  if (visits > 1) { const q = root.W / root.N; win = Math.min(1, Math.max(0, (q + 1) / 2)); }

  // 對手剛虛手，而且現在終局我方必勝 → 直接虛手結束對局
  const lastWasPass = moves.length > 0 && moves[moves.length - 1] === PASS;
  if (lastWasPass) {
    const sc = scoreWithOwnership(pos.board, ev.own, komi);
    const meAhead = (pos.toPlay === BLACK ? sc.diff > 0 : sc.diff < 0) && ev.win > 0.5;
    if (meAhead) return { move: PASS, win, lead, visits, backend: backendName };
  }

  let move;
  if (cfg.sample) {
    // 入門：依策略機率抽樣（只在夠像樣的著點之中），棋形正常但會有緩著
    let pmax = 0;
    for (let i = 0; i < n2; i++) if (ev.policy[i] > pmax) pmax = ev.policy[i];
    if (ev.policy[n2] >= pmax) move = PASS;
    else {
      const cut = pmax * (moves.length < 8 ? 0.2 : 0.08);
      let tot = 0;
      for (let i = 0; i < n2; i++) if (ev.policy[i] >= cut) tot += ev.policy[i];
      let r = Math.random() * tot;
      move = 0;
      for (let i = 0; i < n2; i++) if (ev.policy[i] >= cut) { r -= ev.policy[i]; move = i; if (r <= 0) break; }
    }
  } else {
    let best = -1, bestN = -1, bestP = -1;
    for (let i = 0; i < root.moves.length; i++) {
      const ch = root.children[i];
      const nv = ch ? ch.N : 0;
      if (nv > bestN || (nv === bestN && root.priors[i] > bestP)) { best = i; bestN = nv; bestP = root.priors[i]; }
    }
    move = root.moves[best];
    // 開局幾手加入少量變化，避免每盤完全相同
    if (moves.length < 6) {
      const cands = [];
      for (let i = 0; i < root.moves.length; i++) if (root.moves[i] !== PASS && root.priors[i] >= root.priors[best] * 0.6) cands.push(root.moves[i]);
      if (cands.length > 1 && bestN <= 1 + visits * 0.6) move = cands[(Math.random() * cands.length) | 0];
    }
  }

  const resign = level !== 'easy' && moves.length > n2 * 0.35 && win < 0.02 && lead < -(size >= 13 ? 25 : 12);
  const out = { move, win, lead, visits, resign, backend: backendName, rawWin: ev.win, rawLead: ev.lead };
  if (override && override.debug) out.children = root.moves.map((m, i) => ({ m, p: +root.priors[i].toFixed(3), n: root.children[i] ? root.children[i].N : 0, q: root.children[i] && root.children[i].N ? +(-root.children[i].W / root.children[i].N).toFixed(3) : null })).filter((c) => c.n > 0 || c.p > 0.05);
  return out;
}

async function finalScore({ size, komi, moves, level }) {
  const cfg = LEVELS[level];
  const session = await ensureModel(cfg.model);
  const pos = positionFromMoves(size, komi, moves);
  const n2 = size * size;
  const own = new Float32Array(n2);
  for (let s = 0; s < 8; s++) {
    const ev = await evaluate(session, pos, s);
    for (let i = 0; i < n2; i++) own[i] += ev.own[i] / 8;
  }
  const sc = scoreWithOwnership(pos.board, own, komi);
  return { owner: Array.from(sc.owner), black: sc.black, white: sc.white, dead: sc.dead, diff: sc.diff };
}

self.onmessage = async (e) => {
  const { id, type, payload } = e.data;
  try {
    let result;
    if (type === 'load') {
      await ensureModel(LEVELS[payload.level].model, (p) => self.postMessage({ id, progress: p }));
      result = { backend: backendName };
    } else if (type === 'genmove') result = await genmove(payload);
    else if (type === 'score') result = await finalScore(payload);
    else if (type === 'bench') {
      const s = await ensureModel(payload.model);
      const pos = positionFromMoves(payload.size, 7.5, payload.moves || []);
      const t = performance.now();
      const ev = await evaluate(s, pos, 0);
      const top = Array.from(ev.policy).map((p, i) => [i, p]).sort((a, b) => b[1] - a[1]).slice(0, 6);
      result = { ms: performance.now() - t, backend: backendName, win: ev.win, lead: ev.lead, top };
    }
    self.postMessage({ id, result });
  } catch (err) {
    self.postMessage({ id, error: String(err && err.message || err) });
  }
};
