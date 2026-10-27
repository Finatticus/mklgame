// 連線（最多 4 人）：開房者是主機。每位客人和主機各開一條 WebRTC 資料通道直連，GAS 只負責交換連線資料；
// 客人之間不直接連，客人的訊息由主機轉給其他人。直連失敗的人自動改用 GAS 轉送訊息（高爾夫是輪流打，慢一點也能玩）。
import { CONFIG } from './config.js';
import { call } from './api.js';

export const MAX_PLAYERS = 4;

const waitIce = pc => new Promise(res => {
  if (pc.iceGatheringState === 'complete') return res();
  const t = setTimeout(res, 3500);
  pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); res(); } });
});
const sleep = ms => new Promise(r => setTimeout(r, ms));
const isOpen = dc => !!dc && dc.readyState === 'open';

export class Net {
  constructor() {
    this.handlers = [];
    this.seen = new Set();
    this.counter = 0;
    this.mode = 'connecting';     // 'p2p'（全部直連）| 'relay'（有人走 GAS 轉送）
    this.lastSeq = 0;
    this.closed = false;
    this.peers = new Map();       // 主機：每位客人的 { pc, dc }
    this.guests = [];             // 主機：目前在遊戲間的客人
  }

  on(fn) { this.handlers.push(fn); }
  emit(m) { for (const h of this.handlers) h(m); }

  setMode(mode) {
    if (this.closed || mode === this.mode) return;
    this.mode = mode;
    this.emit({ t: '_status', mode });
  }

  // 主機：所有客人都直連才算 p2p
  hostMode() {
    if (!this.guests.length) return;
    this.setMode(this.guests.every(u => this.peers.has(u) && isOpen(this.peers.get(u).dc)) ? 'p2p' : 'relay');
  }
  anyRelay() { return this.guests.some(u => !this.peers.has(u) || !isOpen(this.peers.get(u).dc)); }

  async host(config, user) {
    this.isHost = true;
    this.user = user;
    const room = await call('createRoom', { config });
    this.code = room.code;
    this.pollRoom();
    this.pollMsgs();
    return room.code;
  }

  // 主機：開打前一直看有沒有新客人；有的話用他留下的 offer 回一個 answer，建立直連
  async pollRoom() {
    while (!this.closed && !this.started) {
      try {
        const r = await call('getRoom', { code: this.code });
        const list = r.guests || (r.guest ? [r.guest] : []);
        for (const u of list) {
          if (!this.guests.includes(u)) { this.guests.push(u); this.emit({ t: '_guest', user: u }); }
          // 新的 offer（第一次加入，或在大廳重新輸入驗證碼）就回一次
          const sig = r.sig && r.sig[u];
          if (sig && sig.offer && this.peers.get(u)?.offer !== sig.offer) { this.answerGuest(u, sig.offer); setTimeout(() => this.hostMode(), 12000); }
        }
        for (const u of this.guests.slice()) if (!list.includes(u)) this.dropGuest(u, false);
      } catch (e) { this.emit({ t: '_error', error: e.message }); }
      await sleep(2000);
    }
  }

  async answerGuest(user, offer) {
    const old = this.peers.get(user);
    if (old) try { old.dc && old.dc.close(); old.pc.close(); } catch (e) { /* 已關閉 */ }
    try {
      const pc = new RTCPeerConnection({ iceServers: CONFIG.ICE });
      const peer = { pc, dc: null, offer };
      this.peers.set(user, peer);
      pc.ondatachannel = e => {
        const dc = peer.dc = e.channel;
        dc.onopen = () => this.hostMode();
        dc.onclose = () => this.hostMode();
        dc.onmessage = ev => this.receive(JSON.parse(ev.data), 'dc');
      };
      pc.onconnectionstatechange = () => { if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') this.hostMode(); };
      await pc.setRemoteDescription(JSON.parse(offer));
      await pc.setLocalDescription(await pc.createAnswer());
      await waitIce(pc);
      await call('updateRoom', { code: this.code, answerFor: user, answer: JSON.stringify(pc.localDescription) });
    } catch (e) { this.hostMode(); }
  }

  // 主機：客人在開打前離開大廳
  dropGuest(user, tellServer = true) {
    this.guests = this.guests.filter(u => u !== user);
    const p = this.peers.get(user);
    if (p) { try { p.dc && p.dc.close(); p.pc.close(); } catch (e) { /* 已關閉 */ } this.peers.delete(user); }
    if (tellServer) call('updateRoom', { code: this.code, drop: user }).catch(() => {});
    this.emit({ t: '_drop', user });
    this.hostMode();
  }

  // 主機按下開始：之後不再收新客人
  markStarted() {
    this.started = true;
    call('updateRoom', { code: this.code, started: true }).catch(() => {});
  }

  // user：自己的帳號。已經在這個遊戲間裡（中途離開又回來）就不再登記、不重新直連，直接用 GAS 轉送
  async join(code, user) {
    this.isHost = false;
    this.code = code;
    this.user = user;
    const room = await call('getRoom', { code });
    this.hostUser = room.host;
    const members = [room.host, ...(room.guests || (room.guest ? [room.guest] : []))];
    this.rejoin = !!user && room.started && members.includes(user);
    // 之前留在遊戲間的舊訊息不處理（例如上一次的「開始」），只看加入之後的
    try {
      const old = await call('getMsgs', { code, since: 0 });
      for (const m of old) this.lastSeq = Math.max(this.lastSeq, m.seq);
    } catch (e) { /* 沒有訊息 */ }
    if (this.rejoin) {
      this.setMode('relay');
      this.pollMsgs();
      return room;
    }
    // 客人先開資料通道、留下 offer，主機看到後回 answer
    let offer = null;
    try {
      const pc = this.pc = new RTCPeerConnection({ iceServers: CONFIG.ICE });
      pc.onconnectionstatechange = () => { if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') this.toRelay(); };
      const dc = this.dc = pc.createDataChannel('golf', { ordered: true });
      dc.onopen = () => this.setMode('p2p');
      dc.onclose = () => { if (!this.closed) this.toRelay(); };
      dc.onmessage = e => this.receive(JSON.parse(e.data), 'dc');
      await pc.setLocalDescription(await pc.createOffer());
      await waitIce(pc);
      offer = JSON.stringify(pc.localDescription);
    } catch (e) { offer = null; }
    const joined = await call('joinRoom', { code, offer });
    this.pollMsgs();
    if (offer) this.waitAnswer();
    setTimeout(() => { if (this.mode !== 'p2p') this.toRelay(); }, 15000);
    return joined;
  }

  // 客人：等主機回 answer（最多 14 秒）
  async waitAnswer() {
    for (let i = 0; i < 7 && !this.closed; i++) {
      await sleep(2000);
      try {
        const r = await call('getRoom', { code: this.code });
        const sig = r.sig && r.sig[this.user];
        if (sig && sig.answer) { await this.pc.setRemoteDescription(JSON.parse(sig.answer)).catch(() => {}); return; }
      } catch (e) { /* 再等一下 */ }
    }
  }

  // 客人：開打前離開大廳
  leaveLobby() {
    if (!this.isHost && this.code) call('updateRoom', { code: this.code, leave: true }).catch(() => {});
  }

  toRelay() {
    if (this.mode === 'relay' || this.closed) return;
    if (isOpen(this.dc)) return;
    this.setMode('relay');
  }

  // 一直輪詢 GAS 訊息（直連成功後就降低頻率，只當備援）
  async pollMsgs() {
    while (!this.closed) {
      try {
        const list = await call('getMsgs', { code: this.code, since: this.lastSeq });
        for (const m of list) { this.lastSeq = Math.max(this.lastSeq, m.seq); this.receive(m.msg, 'gas'); }
      } catch (e) {
        if (/關閉/.test(e.message)) { this.emit({ t: '_closed' }); return; }
      }
      await sleep(this.mode === 'p2p' ? 6000 : 1500);
    }
  }

  // 主機把訊息轉給直連的客人（不轉回原本送出的人）
  toPeers(json, except) {
    for (const [u, p] of this.peers) if (u !== except && isOpen(p.dc)) { try { p.dc.send(json); } catch (e) { /* 這位改走轉送 */ } }
  }

  receive(m, via) {
    if (this.closed || !m || !m.id || this.seen.has(m.id)) return;
    this.seen.add(m.id);
    if (this.isHost) {
      // 客人之間靠主機轉：直連的客人用資料通道轉；有人走 GAS 的話，直連收到的也補送一份到 GAS
      this.toPeers(JSON.stringify(m), m.u);
      if (via === 'dc' && !m.v && this.anyRelay()) call('sendMsg', { code: this.code, msg: m }).catch(() => {});
    }
    this.emit(m);
  }

  // volatile：瞄準預覽之類的訊息，沒有直連就不送（不走 GAS）
  send(m, opts = {}) {
    m.id = (this.isHost ? 'h' : 'g') + (++this.counter) + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    m.u = this.user;
    if (opts.volatile) m.v = 1;
    this.seen.add(m.id);
    if (this.isHost) {
      this.toPeers(JSON.stringify(m));
      if (opts.volatile || !this.anyRelay()) return;
    } else if (isOpen(this.dc)) {
      try { this.dc.send(JSON.stringify(m)); return; } catch (e) { /* 改走轉送 */ }
    } else if (opts.volatile) return;
    call('sendMsg', { code: this.code, msg: m }).catch(err => this.emit({ t: '_error', error: err.message }));
  }

  // keepRoom：遊戲間留著（別人還在打，自己之後還能用驗證碼回來）。沒指定時：主機關閉遊戲間、客人不關
  close(keepRoom = !this.isHost) {
    this.closed = true;
    this.handlers = [];
    try {
      this.dc && this.dc.close(); this.pc && this.pc.close();
      for (const p of this.peers.values()) { p.dc && p.dc.close(); p.pc.close(); }
    } catch (e) { /* 已關閉 */ }
    if (!keepRoom && this.code) call('closeRoom', { code: this.code }).catch(() => {});
  }
}
