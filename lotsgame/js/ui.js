// 小型 UI 工具：建立元素、數字格式、對話框、提示訊息。

export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  if (props) for (const k in props) {
    const v = props[k];
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k in el && k !== 'list') el[k] = v;
    else el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

export const fmt = (n) => Math.round(n).toLocaleString('en-US');
export const signed = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + fmt(Math.abs(n));
export const signClass = (n) => (n > 0 ? 'pos' : n < 0 ? 'neg' : '');
export const pct = (a, b) => (b ? Math.round((a / b) * 100) + '%' : '—');

export function timeAgo(iso) {
  const d = new Date(iso), now = new Date();
  const s = (now - d) / 1000;
  if (s < 60) return '剛剛';
  if (s < 3600) return Math.floor(s / 60) + ' 分鐘前';
  if (s < 86400 && d.getDate() === now.getDate()) return '今天 ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

let toastBox = null;
export function toast(msg, ms = 2400) {
  if (!toastBox) { toastBox = h('div', { class: 'toasts' }); document.body.append(toastBox); }
  const t = h('div', { class: 'toast' }, msg);
  toastBox.append(t);
  setTimeout(() => { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 320); }, ms);
}

// actions: [{ label, value, kind: 'gold' | 'danger' | '' }]
export function modal({ title, body, actions = [{ label: '好', value: true, kind: 'gold' }], dismiss = true, stack = false, center = false }) {
  return new Promise((resolve) => {
    const bodyEl = h('div', { class: 'modal-body' + (center ? ' center' : '') });
    if (typeof body === 'string') bodyEl.innerHTML = body; else if (body) bodyEl.append(body);
    const close = (v) => { wrap.remove(); document.removeEventListener('keydown', onKey); resolve(v); };
    const onKey = (e) => { if (e.key === 'Escape' && dismiss) close(null); };
    const box = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' },
      title && h('h3', null, title), bodyEl,
      actions.length ? h('div', { class: 'modal-actions' + (stack ? ' stack' : '') },
        actions.map((a) => h('button', { class: 'btn ' + (a.kind === 'gold' ? 'btn-gold' : a.kind === 'danger' ? 'btn-danger' : ''), onClick: () => close(a.value) }, a.label))) : null);
    const wrap = h('div', { class: 'modal-wrap', onClick: (e) => { if (e.target === wrap && dismiss) close(null); } }, box);
    document.addEventListener('keydown', onKey);
    document.body.append(wrap);
    wrap.close = close;
    modal.current = wrap;
  });
}

export const confirmBox = (title, body, okLabel = '確定', cancelLabel = '取消', kind = 'gold') =>
  modal({ title, body, center: true, actions: [{ label: cancelLabel, value: false }, { label: okLabel, value: true, kind }] });

const IMG = {};
export function loadImage(url) {
  if (!IMG[url]) IMG[url] = new Promise((resolve, reject) => { const im = new Image(); im.onload = () => resolve(im); im.onerror = reject; im.src = url; });
  return IMG[url];
}

export const asset = (path) => new URL('../assets/' + path, import.meta.url).href;

// 讓 canvas 以裝置像素繪製；回傳 { ctx, w, h }（CSS 像素）
export function fitCanvas(canvas, maxDpr = 3) {
  const r = canvas.getBoundingClientRect();
  const dpr = Math.min(maxDpr, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.round(r.width)), hh = Math.max(1, Math.round(r.height));
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(hh * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(hh * dpr); }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h: hh, dpr };
}
