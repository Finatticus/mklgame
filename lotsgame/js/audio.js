// 音效：Web Audio 播放預錄素材（落子、發牌、籌碼），勝負提示音以合成器產生。
import { getData } from './store.js';

let ctx = null;
const buffers = {};
const VARIANTS = {
  stone: ['stone1', 'stone2', 'stone3', 'stone4', 'stone5'],
  capture: ['capture'],
  card: ['card1', 'card2', 'card3'],
  flip: ['flip1', 'flip2'],
  shuffle: ['shuffle'],
  chip: ['chip1', 'chip2'],
  chips: ['chips1', 'chips2'],
  payout: ['chipswin'],
};

const enabled = () => { const d = getData(); return !d || d.settings.sound !== false; };

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

async function load(name) {
  if (buffers[name]) return buffers[name];
  buffers[name] = (async () => {
    const res = await fetch(new URL('../assets/sfx/' + name + '.wav', import.meta.url));
    const arr = await res.arrayBuffer();
    return await new Promise((ok, no) => ctx.decodeAudioData(arr, ok, no));
  })();
  return buffers[name];
}

export function preload(...groups) {
  if (!ensure()) return;
  for (const g of groups) for (const n of VARIANTS[g] || []) load(n).catch(() => {});
}

export async function play(group, { volume = 1, rate = 1 } = {}) {
  if (!enabled() || !ensure()) return;
  const list = VARIANTS[group];
  if (!list) return;
  try {
    const buf = await load(list[(Math.random() * list.length) | 0]);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate * (0.97 + Math.random() * 0.06);
    const gain = ctx.createGain();
    gain.gain.value = volume;
    src.connect(gain).connect(ctx.destination);
    src.start();
  } catch (e) { /* 音效失敗不影響遊戲 */ }
}

// 柔和的鐘聲：win 上行、lose 下行
export function chime(kind) {
  if (!enabled() || !ensure()) return;
  const notes = kind === 'win' ? [523.25, 659.25, 783.99, 1046.5] : kind === 'lose' ? [392, 329.63, 261.63] : [440, 523.25];
  const t0 = ctx.currentTime + 0.02;
  notes.forEach((f, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    const t = t0 + i * 0.11;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.13, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 0.9);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + 1);
  });
}

if (typeof window !== 'undefined') {
  const unlock = () => { ensure(); };
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock);
}
