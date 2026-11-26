// 開局設定畫面的共用元件。
import { h, fmt } from '../../ui.js';
import { paintCover } from './draw.js';

// options: [{ value, label, sub, disabled }]
export function segmented({ label, hint, options, value, onChange, numeric = false }) {
  const hintEl = h('em', null, hint || '');
  const row = h('div', { class: 'seg' });
  const paint = () => {
    row.replaceChildren(...options.map((o) => h('button', {
      type: 'button', class: (o.value === value ? 'on' : ''), disabled: !!o.disabled,
      onClick: () => { value = o.value; paint(); onChange(value); },
    }, h('span', { class: numeric ? 'num' : '' }, o.label), o.sub ? h('small', null, o.sub) : null)));
  };
  paint();
  const el = h('div', { class: 'opt' }, h('div', { class: 'opt-label' }, h('span', null, label), hintEl), row);
  el.setHint = (t) => { hintEl.textContent = t; };
  el.setOptions = (opts, v) => { options = opts; value = v; paint(); };
  return el;
}

export function hero(gameId, title, sub) {
  const cv = h('canvas');
  requestAnimationFrame(() => paintCover(cv, gameId));
  return h('div', { class: 'setup-hero' }, cv, h('div', { class: 'setup-hero-text' }, h('h1', null, title), h('p', null, sub)));
}

export function stakeSummary() {
  const win = h('b', { class: 'pos' }), lose = h('b', { class: 'neg' });
  const el = h('div', { class: 'stake-summary' }, h('div', null, h('small', null, '獲勝可得'), win), h('div', null, h('small', null, '落敗損失'), lose));
  el.update = (stake, profit) => { win.textContent = '+' + fmt(profit); lose.textContent = '−' + fmt(stake); };
  return el;
}

export const STAKES = [1000, 5000, 20000, 50000];
export function stakeOptions(balance) {
  return STAKES.map((v) => ({ value: v, label: fmt(v), disabled: v > balance }));
}
export function defaultStake(balance, preferred) {
  if (preferred && preferred <= balance) return preferred;
  const ok = STAKES.filter((v) => v <= balance);
  return ok.length ? ok[Math.min(1, ok.length - 1)] : 0;
}
