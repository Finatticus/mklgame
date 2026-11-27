// Stockfish（UCI）包裝：在 Web Worker 中執行單執行緒 WASM 版，不需跨源隔離。
const ENGINE_URL = new URL('./sf/stockfish-19-lite-single.js', import.meta.url);

export class Fish {
  constructor() {
    this.w = new Worker(ENGINE_URL);
    this.waiters = [];
    this.w.onmessage = (e) => {
      const line = String(e.data);
      for (const x of this.waiters.slice()) if (x.re.test(line)) { this.waiters.splice(this.waiters.indexOf(x), 1); x.ok(line); }
    };
    this.w.onerror = (e) => { for (const x of this.waiters.splice(0)) x.fail(new Error(e.message || '引擎載入失敗')); };
    this.ready = null;
  }

  send(cmd) { this.w.postMessage(cmd); }
  wait(re) { return new Promise((ok, fail) => this.waiters.push({ re, ok, fail })); }

  // elo 為 0 時以全力計算
  init(elo) {
    if (!this.ready) this.ready = (async () => {
      const u = this.wait(/^uciok/); this.send('uci'); await u;
      if (elo) {
        this.send('setoption name UCI_LimitStrength value true');
        this.send('setoption name UCI_Elo value ' + elo);
      }
      this.send('setoption name Hash value 32');
      const r = this.wait(/^readyok/); this.send('isready'); await r;
      this.send('ucinewgame');
    })();
    return this.ready;
  }

  async best(moves, movetime) {
    await this.ready;
    const r = this.wait(/^bestmove/);
    this.send('position startpos' + (moves.length ? ' moves ' + moves.join(' ') : ''));
    this.send('go movetime ' + movetime);
    const line = await r;
    return line.split(' ')[1];
  }

  stop() { this.send('stop'); }
  destroy() { this.w.terminate(); }
}
