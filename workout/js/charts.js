/* 輕量 SVG 圖表（不依賴外部函式庫） */
(function () {
  const fmt = (v, d) => (v == null || isNaN(v) ? '–' : Number(v).toFixed(d));

  function niceTicks(min, max, count) {
    if (min === max) { min -= 1; max += 1; }
    const span = max - min;
    const step0 = span / Math.max(count - 1, 1);
    const mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const norm = step0 / mag;
    const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
    const lo = Math.floor(min / step) * step;
    const hi = Math.ceil(max / step) * step;
    const ticks = [];
    for (let v = lo; v <= hi + step / 2; v += step) ticks.push(+v.toFixed(6));
    return ticks;
  }

  function parseDate(s) {
    const m = String(s || '').match(/(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/);
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0));
  }

  /**
   * 折線圖
   * opts: { points:[{date, value, id}], band:[lo,hi]|null, unit, decimals, id }
   */
  function line(opts) {
    const W = 340, H = 190, P = { l: 36, r: 14, t: 18, b: 26 };
    const pts = opts.points.filter((p) => p.value != null && !isNaN(p.value));
    if (!pts.length) return `<div class="chart-empty">還沒有資料</div>`;
    const d = opts.decimals ?? 1;
    const vals = pts.map((p) => p.value);
    let min = Math.min(...vals), max = Math.max(...vals);
    if (opts.band) { min = Math.min(min, opts.band[0]); max = Math.max(max, opts.band[1]); }
    const pad = (max - min) * 0.12 || Math.abs(max) * 0.05 || 1;
    const ticks = niceTicks(min - pad, max + pad, 4);
    const y0 = ticks[0], y1 = ticks[ticks.length - 1];
    const times = pts.map((p) => (parseDate(p.date) || new Date()).getTime());
    const t0 = Math.min(...times), t1 = Math.max(...times);
    const iw = W - P.l - P.r, ih = H - P.t - P.b;
    // 點數少時用等距，多時用時間軸
    const useIndex = pts.length < 3 || t1 === t0;
    const X = (i) => {
      if (pts.length === 1) return P.l + iw / 2;
      return useIndex ? P.l + (iw * i) / (pts.length - 1) : P.l + (iw * (times[i] - t0)) / (t1 - t0);
    };
    const Y = (v) => P.t + ih - (ih * (v - y0)) / (y1 - y0);

    let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" data-chart="${opts.id || ''}">`;
    if (opts.band) {
      const a = Y(Math.min(opts.band[1], y1)), b = Y(Math.max(opts.band[0], y0));
      s += `<rect x="${P.l}" y="${a}" width="${iw}" height="${Math.max(b - a, 0)}" class="band"/>`;
      s += `<text x="${P.l + 6}" y="${b - 6}" class="band-label">標準範圍</text>`;
    }
    ticks.forEach((t) => {
      const y = Y(t);
      s += `<line x1="${P.l}" x2="${W - P.r}" y1="${y}" y2="${y}" class="grid"/>`;
      s += `<text x="${P.l - 8}" y="${y + 3.5}" class="axis" text-anchor="end">${+t.toFixed(2)}</text>`;
    });
    // x 軸日期（最多 5 個）
    const every = Math.ceil(pts.length / 5);
    pts.forEach((p, i) => {
      if (i % every !== 0 && i !== pts.length - 1) return;
      const dt = parseDate(p.date);
      const lbl = dt ? `${dt.getMonth() + 1}/${dt.getDate()}` : '';
      s += `<text x="${X(i)}" y="${H - 6}" class="axis" text-anchor="middle">${lbl}</text>`;
    });
    if (pts.length > 1) {
      const path = pts.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.value).toFixed(1)}`).join('');
      const area = path + `L${X(pts.length - 1).toFixed(1)},${P.t + ih}L${X(0).toFixed(1)},${P.t + ih}Z`;
      s += `<path d="${area}" class="area"/>`;
      s += `<path d="${path}" class="line"/>`;
    }
    pts.forEach((p, i) => {
      const last = i === pts.length - 1;
      s += `<circle cx="${X(i)}" cy="${Y(p.value)}" r="${last ? 4.5 : 3}" class="${last ? 'dot dot-last' : 'dot'}"/>`;
      s += `<rect x="${X(i) - 14}" y="${P.t}" width="28" height="${ih}" fill="transparent" class="hit" data-i="${i}"/>`;
    });
    const lp = pts[pts.length - 1];
    const lx = X(pts.length - 1), ly = Y(lp.value);
    s += `<text x="${Math.min(Math.max(lx, P.l + 20), W - P.r - 4)}" y="${ly - 10}" class="val" text-anchor="${pts.length === 1 ? 'middle' : 'end'}">${fmt(lp.value, d)}</text>`;
    s += `</svg>`;
    return s;
  }

  /** 範圍條：標準範圍淺色帶 + 數值點，回傳 HTML */
  function rangeBar(value, lo, hi, opts = {}) {
    if (value == null) return '';
    const hasRange = lo != null && hi != null && hi > lo;
    let min, max;
    if (opts.scale) [min, max] = opts.scale;
    else if (hasRange) {
      const span = hi - lo;
      min = Math.min(lo - span * 0.9, value - span * 0.15);
      max = Math.max(hi + span * 0.9, value + span * 0.15);
    } else { min = 0; max = value * 1.5 || 1; }
    min = Math.max(min, opts.floor ?? -Infinity);
    const pct = (v) => Math.min(Math.max(((v - min) / (max - min)) * 100, 0), 100);
    const state = !hasRange ? 'na' : value < lo ? 'low' : value > hi ? 'high' : 'ok';
    let h = `<div class="rbar rbar-${state}">`;
    h += `<div class="rbar-track">`;
    if (hasRange) h += `<div class="rbar-band" style="left:${pct(lo)}%;width:${pct(hi) - pct(lo)}%"></div>`;
    h += `<div class="rbar-fill" style="width:${pct(value)}%"></div>`;
    h += `<div class="rbar-dot" style="left:${pct(value)}%"></div>`;
    h += `</div>`;
    if (hasRange) h += `<div class="rbar-scale"><span style="left:${pct(lo)}%">${lo}</span><span style="left:${pct(hi)}%">${hi}</span></div>`;
    h += `</div>`;
    return h;
  }

  /** 環形分數 */
  function ring(value, max, label) {
    const r = 34, c = 2 * Math.PI * r;
    const p = Math.max(0, Math.min(value / max, 1));
    return `<svg class="ring" viewBox="0 0 84 84">
      <circle cx="42" cy="42" r="${r}" class="ring-bg"/>
      <circle cx="42" cy="42" r="${r}" class="ring-fg" stroke-dasharray="${c * p} ${c}" transform="rotate(-90 42 42)"/>
      <text x="42" y="44" text-anchor="middle" class="ring-v">${value ?? '–'}</text>
      <text x="42" y="58" text-anchor="middle" class="ring-l">${label || ''}</text>
    </svg>`;
  }

  /**
   * 時間軸多序列圖
   * opts: { series:[{points:[{date,value,...}], cls, line, dots, dotClass:(p)=>str}], refs:[{value,label,cls}], decimals, height, from, to }
   */
  function timeChart(opts) {
    const W = 340, H = opts.height || 200, P = { l: 36, r: 14, t: 16, b: 24 };
    const all = [];
    opts.series.forEach((s) => s.points.forEach((p) => { if (p.value != null && !isNaN(p.value)) all.push(p); }));
    if (!all.length) return `<div class="chart-empty">這段期間沒有資料</div>`;
    const vals = all.map((p) => p.value).concat((opts.refs || []).map((r) => r.value));
    let min = Math.min(...vals), max = Math.max(...vals);
    const pad = (max - min) * 0.1 || 1;
    const ticks = niceTicks(min - pad, max + pad, 4);
    const y0 = ticks[0], y1 = ticks[ticks.length - 1];
    const tOf = (p) => (parseDate(p.date) || new Date()).getTime();
    let t0 = opts.from ? parseDate(opts.from).getTime() : Math.min(...all.map(tOf));
    let t1 = opts.to ? parseDate(opts.to).getTime() : Math.max(...all.map(tOf));
    if (t1 - t0 < 864e5 * 6) { const c = (t0 + t1) / 2; t0 = c - 864e5 * 3.5; t1 = c + 864e5 * 3.5; }
    const iw = W - P.l - P.r, ih = H - P.t - P.b;
    const X = (p) => P.l + (iw * (tOf(p) - t0)) / (t1 - t0);
    const Y = (v) => P.t + ih - (ih * (v - y0)) / (y1 - y0);
    let s = `<svg class="chart" viewBox="0 0 ${W} ${H}">`;
    ticks.forEach((t) => {
      s += `<line x1="${P.l}" x2="${W - P.r}" y1="${Y(t)}" y2="${Y(t)}" class="grid"/>`;
      s += `<text x="${P.l - 8}" y="${Y(t) + 3.5}" class="axis" text-anchor="end">${+t.toFixed(2)}</text>`;
    });
    // x 軸：最多 5 個日期
    for (let i = 0; i <= 4; i++) {
      const t = t0 + ((t1 - t0) * i) / 4;
      const d = new Date(t);
      s += `<text x="${P.l + (iw * i) / 4}" y="${H - 5}" class="axis" text-anchor="${i === 0 ? 'start' : i === 4 ? 'end' : 'middle'}">${d.getMonth() + 1}/${d.getDate()}</text>`;
    }
    (opts.refs || []).forEach((r) => {
      if (r.value < y0 || r.value > y1) return;
      s += `<line x1="${P.l}" x2="${W - P.r}" y1="${Y(r.value)}" y2="${Y(r.value)}" class="ref ${r.cls || ''}"/>`;
      s += `<text x="${W - P.r}" y="${Y(r.value) - 4}" class="ref-label" text-anchor="end">${r.label}</text>`;
    });
    opts.series.forEach((ser) => {
      const pts = ser.points.filter((p) => p.value != null && !isNaN(p.value));
      if (ser.line && pts.length > 1) {
        s += `<path d="${pts.map((p, i) => `${i ? 'L' : 'M'}${X(p).toFixed(1)},${Y(p.value).toFixed(1)}`).join('')}" class="line ${ser.cls || ''}"/>`;
      }
      if (ser.dots) pts.forEach((p) => {
        s += `<circle cx="${X(p).toFixed(1)}" cy="${Y(p.value).toFixed(1)}" r="${ser.r || 3}" class="dot ${ser.cls || ''} ${ser.dotClass ? ser.dotClass(p) : ''}"/>`;
      });
    });
    s += `</svg>`;
    return s;
  }

  /** 直條圖：items:[{label, value, cls, sub}], target */
  function bars(opts) {
    const W = 340, H = opts.height || 150, P = { l: 6, r: 6, t: 18, b: 22 };
    const items = opts.items;
    const max = Math.max(opts.target || 0, ...items.map((i) => i.value || 0), 1) * 1.12;
    const iw = W - P.l - P.r, ih = H - P.t - P.b;
    const bw = (iw / items.length) * 0.56;
    let s = `<svg class="chart bars" viewBox="0 0 ${W} ${H}">`;
    items.forEach((it, i) => {
      const cx = P.l + (iw * (i + 0.5)) / items.length;
      const h = ((it.value || 0) / max) * ih;
      s += `<rect x="${cx - bw / 2}" y="${P.t + ih - h}" width="${bw}" height="${Math.max(h, it.value ? 2 : 0)}" rx="4" class="bar ${it.cls || ''}"/>`;
      if (it.value) s += `<text x="${cx}" y="${P.t + ih - h - 5}" class="bar-v" text-anchor="middle">${Math.round(it.value)}</text>`;
      s += `<text x="${cx}" y="${H - 6}" class="axis ${it.cls && it.cls.includes('today') ? 'strong' : ''}" text-anchor="middle">${it.label}</text>`;
    });
    if (opts.target) {
      const y = P.t + ih - (opts.target / max) * ih;
      s += `<line x1="${P.l}" x2="${W - P.r}" y1="${y}" y2="${y}" class="ref"/>`;
      s += `<text x="${W - P.r}" y="${y - 4}" class="ref-label" text-anchor="end">目標 ${opts.target}</text>`;
    }
    return s + `</svg>`;
  }

  /** 迷你走勢 */
  function spark(values, w = 110, h = 34) {
    const v = values.filter((x) => x != null && !isNaN(x));
    if (v.length < 2) return '';
    const min = Math.min(...v), max = Math.max(...v);
    const X = (i) => 2 + ((w - 4) * i) / (v.length - 1);
    const Y = (x) => 3 + (h - 6) * (1 - (x - min) / (max - min || 1));
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><path d="${v.map((x, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(x).toFixed(1)}`).join('')}"/><circle cx="${X(v.length - 1)}" cy="${Y(v[v.length - 1])}" r="2.6"/></svg>`;
  }

  window.Charts = { line, rangeBar, ring, parseDate, fmt, timeChart, bars, spark };
})();
