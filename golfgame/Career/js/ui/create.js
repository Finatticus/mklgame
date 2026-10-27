// 建立球員：外觀（基礎選項）→ 國籍、家鄉與家庭 → 名字 → 系統選項；之後進入序章
import { register, go, ui, story, toast } from './shell.js';
import { esc } from '../util.js';
import { setCur, localSave, sync } from '../state.js';
import { newCareer, skipChildhood, FAMILY, DIFF, LENGTH } from '../life.js';
import { COUNTRY_ZH } from '../data/players.js';
import { installHooks } from './ingame.js';
import { runPrologue } from '../childhood.js';

export const SKINS8 = ['#f6d7bd', '#efc39f', '#e0ac85', '#c98e62', '#b07a50', '#8f5b37', '#6f4428', '#4a2c1a'];
export const HAIRS = [['short', '短髮'], ['buzz', '平頭'], ['slick', '油頭'], ['side', '旁分'], ['curly', '捲髮'], ['pony', '綁馬尾'], ['bob', '短鮑伯'], ['long', '長直髮'], ['bun', '丸子頭'], ['bald', '光頭']];
export const HAIR_COLORS = ['#1b1511', '#2e2018', '#4a3020', '#6b4a2b', '#8a5a34', '#b08a5a', '#d8b878', '#a8452a', '#8c8c8c', '#e8e4dc'];
export const EYES = ['#3a2a1e', '#5a3a22', '#2f4f6f', '#3f6a4a', '#6a6a6a', '#1c1c1c'];
export const BROWS = [['thin', '細'], ['natural', '自然'], ['thick', '濃'], ['straight', '粗直']];
export const BEARDS = [['none', '無'], ['stubble', '短鬍渣'], ['goatee', '山羊鬍'], ['mustache', '八字鬍'], ['full', '落腮鬍']];
export const BUILDS = [['slim', '瘦'], ['normal', '標準'], ['strong', '壯']];
const COUNTRIES = ['TPE', 'JPN', 'KOR', 'CHN', 'USA', 'CAN', 'ENG', 'SCO', 'IRL', 'NIR', 'ESP', 'SWE', 'DEN', 'GER', 'FRA', 'ITA', 'NOR', 'AUS', 'NZL', 'RSA', 'THA', 'IND', 'MEX', 'ARG'];
const HOME_DEFAULT = { TPE: '台中', JPN: '千葉', KOR: '仁川', CHN: '廈門', USA: 'Orlando', CAN: 'Toronto', ENG: 'Surrey', SCO: 'Fife', IRL: 'Cork', NIR: 'Holywood', ESP: 'Málaga', SWE: 'Malmö', DEN: 'Aarhus', GER: 'München', FRA: 'Lyon', ITA: 'Torino', NOR: 'Oslo', AUS: 'Melbourne', NZL: 'Auckland', RSA: 'Durban', THA: 'Hua Hin', IND: 'Bengaluru', MEX: 'Guadalajara', ARG: 'Córdoba' };

// 2D 頭像（建立球員時預覽；3D 角色在比賽與角色頁）
export function avatarSvg(L, age = 8) {
  const k = age <= 12 ? 0.82 : age <= 16 ? 0.92 : 1, head = age <= 12 ? 1.18 : 1;
  const sk = L.skin || SKINS8[2], hc = L.hairColor || HAIR_COLORS[0], ey = L.eyes || EYES[0], shirt = L.shirt || '#f2ead8', pants = L.pants || '#2a3442';
  const w = L.build === 'slim' ? 0.88 : L.build === 'strong' ? 1.14 : 1;
  const hair = {
    short: `<path d="M-22 -6 Q-24 -30 0 -32 Q24 -30 22 -6 Q18 -20 0 -22 Q-18 -20 -22 -6Z" fill="${hc}"/>`,
    buzz: `<path d="M-21 -8 Q-20 -29 0 -30 Q20 -29 21 -8 Q14 -22 0 -23 Q-14 -22 -21 -8Z" fill="${hc}" opacity=".8"/>`,
    slick: `<path d="M-22 -4 Q-25 -32 2 -33 Q26 -30 22 -6 Q12 -26 -4 -24 Q-16 -18 -22 -4Z" fill="${hc}"/>`,
    side: `<path d="M-23 -2 Q-26 -32 0 -33 Q25 -31 23 -4 Q22 -18 6 -24 L-6 -20 Q-18 -18 -23 -2Z" fill="${hc}"/>`,
    curly: `<g fill="${hc}">${Array.from({ length: 9 }, (_, i) => `<circle cx="${-22 + i * 5.5}" cy="${-22 - Math.sin(i / 8 * Math.PI) * 10}" r="7"/>`).join('')}</g>`,
    pony: `<path d="M-22 -6 Q-24 -31 0 -32 Q24 -31 22 -6 Q16 -22 0 -23 Q-16 -22 -22 -6Z" fill="${hc}"/><path d="M18 -20 Q34 -12 28 14 Q24 0 18 -10Z" fill="${hc}"/>`,
    bob: `<path d="M-25 12 Q-30 -32 0 -33 Q30 -32 25 12 L18 12 Q20 -16 0 -22 Q-20 -16 -18 12Z" fill="${hc}"/>`,
    long: `<path d="M-25 34 Q-32 -32 0 -33 Q32 -32 25 34 L18 34 Q20 -16 0 -22 Q-20 -16 -18 34Z" fill="${hc}"/>`,
    bun: `<path d="M-22 -6 Q-24 -31 0 -32 Q24 -31 22 -6 Q16 -22 0 -23 Q-16 -22 -22 -6Z" fill="${hc}"/><circle cx="0" cy="-38" r="9" fill="${hc}"/>`,
    bald: '',
  }[L.hairStyle || 'short'];
  const brow = { thin: 1.2, natural: 2, thick: 3, straight: 3.4 }[L.brows || 'natural'];
  const beard = age >= 18 ? ({ stubble: `<path d="M-15 10 Q0 24 15 10 Q0 18 -15 10Z" fill="${hc}" opacity=".35"/>`, goatee: `<path d="M-5 14 Q0 24 5 14Z" fill="${hc}"/>`, mustache: `<path d="M-9 8 Q0 4 9 8 Q0 10 -9 8Z" fill="${hc}"/>`, full: `<path d="M-19 0 Q-18 26 0 27 Q18 26 19 0 Q12 16 0 17 Q-12 16 -19 0Z" fill="${hc}" opacity=".85"/>` }[L.beard] || '') : '';
  return `<svg class="cm-avatar" viewBox="-70 -60 140 180" aria-hidden="true">
    <g transform="scale(${k})">
      <ellipse cx="0" cy="112" rx="34" ry="5" fill="rgba(0,0,0,.12)"/>
      <rect x="${-15 * w}" y="58" width="${12 * w}" height="52" rx="5" fill="${pants}"/><rect x="${3 * w}" y="58" width="${12 * w}" height="52" rx="5" fill="${pants}"/>
      <rect x="${-27 * w}" y="16" width="${54 * w}" height="48" rx="14" fill="${shirt}" stroke="rgba(0,0,0,.08)"/>
      <rect x="${-36 * w}" y="20" width="12" height="40" rx="6" fill="${shirt}"/><rect x="${24 * w}" y="20" width="12" height="40" rx="6" fill="${shirt}"/>
      <circle cx="${-30 * w}" cy="62" r="6" fill="${sk}"/><circle cx="${30 * w}" cy="62" r="6" fill="${sk}"/>
      <g transform="scale(${head})">
        <rect x="-6" y="6" width="12" height="12" fill="${sk}"/>
        <ellipse cx="0" cy="-6" rx="21" ry="24" fill="${sk}"/>
        <ellipse cx="-21" cy="-4" rx="4" ry="6" fill="${sk}"/><ellipse cx="21" cy="-4" rx="4" ry="6" fill="${sk}"/>
        ${hair}
        <rect x="-13" y="-14" width="9" height="${brow}" rx="1" fill="${hc}"/><rect x="4" y="-14" width="9" height="${brow}" rx="1" fill="${hc}"/>
        <ellipse cx="-8" cy="-6" rx="3" ry="3.4" fill="#fff"/><ellipse cx="8" cy="-6" rx="3" ry="3.4" fill="#fff"/>
        <circle cx="-8" cy="-5.6" r="2" fill="${ey}"/><circle cx="8" cy="-5.6" r="2" fill="${ey}"/>
        <path d="M-2 0 Q0 5 2 0" stroke="rgba(0,0,0,.25)" fill="none"/>
        <path d="M-6 9 Q0 13 6 9" stroke="#8a4a3a" stroke-width="1.6" fill="none" stroke-linecap="round"/>
        ${beard}
      </g>
    </g></svg>`;
}

register('create', (body, arg) => {
  const d = { step: 0, gender: 'm', skin: SKINS8[2], hairStyle: 'short', hairColor: HAIR_COLORS[0], eyes: EYES[0], brows: 'natural', build: 'normal', height: 176, country: 'TPE', home: HOME_DEFAULT.TPE, family: 'middle', name: '', difficulty: 'standard', length: 'standard', injuries: false, skip: false };
  const draw = () => {
    const sw = (key, arr) => `<div class="cm-swatches">${arr.map(c => `<button data-k="${key}" data-v="${c}" class="${d[key] === c ? 'on' : ''}" style="background:${c}"></button>`).join('')}</div>`;
    const seg = (key, arr) => `<div class="cm-seg">${arr.map(([v, n]) => `<button data-k="${key}" data-v="${v}" class="${String(d[key]) === String(v) ? 'on' : ''}">${n}</button>`).join('')}</div>`;
    const steps = ['外觀', '國籍與家庭', '名字', '系統選項'];
    let inner = '';
    if (d.step === 0) inner = `<div class="cm-grid2"><div>${avatarSvg({ ...d, shirt: '#f2ead8' }, 8)}<p class="cm-note" style="text-align:center">8 歲的你（會隨年齡長大）</p></div><div>
      <div class="cm-field"><label>性別</label>${seg('gender', [['m', '男'], ['f', '女']])}</div>
      <div class="cm-field"><label>膚色</label>${sw('skin', SKINS8)}</div>
      <div class="cm-field"><label>眼睛</label>${sw('eyes', EYES)}</div></div></div>
      <div class="cm-field"><label>髮型</label>${seg('hairStyle', HAIRS)}</div>
      <div class="cm-field"><label>髮色</label>${sw('hairColor', HAIR_COLORS)}</div>
      <div class="cm-field"><label>眉毛</label>${seg('brows', BROWS)}</div>
      <div class="cm-field"><label>體型</label>${seg('build', BUILDS)}</div>
      <div class="cm-field"><label>成年後的身高 <b class="num" id="cr-hv">${d.height}</b> cm（越高揮桿弧度越大：力量略高、準度略低，各最多 ±2）</label><input type="range" min="160" max="195" value="${d.height}" id="cr-h"></div>`;
    if (d.step === 1) inner = `<div class="cm-field"><label>國籍（決定國內賽事、團體賽陣營、奧運代表權）</label><select id="cr-c">${COUNTRIES.map(c => `<option value="${c}" ${d.country === c ? 'selected' : ''}>${COUNTRY_ZH[c]}</option>`).join('')}</select></div>
      <div class="cm-field"><label>家鄉</label><input type="text" id="cr-home" maxlength="12" value="${esc(d.home)}"></div>
      <div class="cm-field"><label>家庭背景（零用錢、家人分擔比賽費用的比例）</label>${seg('family', Object.entries(FAMILY).map(([k, v]) => [k, v.name]))}
      <p class="cm-note" style="margin-top:6px">${{ modest: '零用錢少，家人分擔 4 成的比賽費用；很早就要學會「拜託家人」。', middle: '家人分擔 7 成的比賽費用。', wealthy: '家人負擔全部的比賽費用，但成功之後的故事少了一點辛苦。' }[d.family]}</p></div>`;
    if (d.step === 2) inner = `<div style="text-align:center">${avatarSvg(d, 8)}</div><div class="cm-field"><label>球員的名字</label><input type="text" id="cr-name" maxlength="14" placeholder="例如：陳子安" value="${esc(d.name)}"></div>`;
    if (d.step === 3) inner = `<div class="cm-field"><label>難度</label>${seg('difficulty', Object.entries(DIFF).map(([k, v]) => [k, v.name]))}
      <p class="cm-note" style="margin-top:6px">${{ casual: '休閒：AI 弱一點、經驗 +30%、每輪 1 次重打。', standard: '標準：預設。', real: '寫實：AI 強、不能看落點範圍、模擬更保守、傷病開啟。' }[d.difficulty]}</p></div>
      <div class="cm-field"><label>生涯長度</label>${seg('length', Object.entries(LENGTH).map(([k, v]) => [k, v.name]))}
      <p class="cm-note" style="margin-top:6px">${{ fast: '快速：約 120 小時拿到綠夾克（經驗多、每季比賽少）。', standard: '標準：約 250 小時。', full: '完整：約 350 小時。' }[d.length]}</p></div>
      <div class="cm-field"><label>傷病</label>${seg('injuries', [[false, '關閉'], [true, '開啟']])}</div>
      ${arg && arg.others ? `<div class="cm-field"><label>童年</label>${seg('skip', [[false, '從 8 歲開始（新手引導）'], [true, '直接從 13 歲開始']])}</div>` : ''}`;
    body.innerHTML = `<div class="cm-card"><div class="cm-seg" style="margin-bottom:12px">${steps.map((s, i) => `<button class="${i === d.step ? 'on' : ''}" disabled>${i + 1}. ${s}</button>`).join('')}</div>${inner}
      <div class="cm-row" style="margin-top:14px"><button class="cm-btn ghost" id="cr-back">${d.step ? '上一步' : '取消'}</button><span style="flex:1"></span><button class="cm-btn green" id="cr-next">${d.step < 3 ? '下一步' : '開始我的人生'}</button></div></div>`;
    body.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { const v = b.dataset.v; d[b.dataset.k] = v === 'true' ? true : v === 'false' ? false : v; draw(); });
    const h = document.getElementById('cr-h'); if (h) h.oninput = () => { d.height = Number(h.value); document.getElementById('cr-hv').textContent = d.height; };
    const c = document.getElementById('cr-c'); if (c) c.onchange = () => { d.country = c.value; d.home = HOME_DEFAULT[c.value] || ''; draw(); };
    const hm = document.getElementById('cr-home'); if (hm) hm.oninput = () => (d.home = hm.value.trim());
    const nm = document.getElementById('cr-name'); if (nm) nm.oninput = () => (d.name = nm.value.trim());
    document.getElementById('cr-back').onclick = () => { if (d.step) { d.step--; draw(); } else go('slots'); };
    document.getElementById('cr-next').onclick = async () => {
      if (d.step === 2 && !d.name) return toast('請輸入名字');
      if (d.step < 3) { d.step++; return draw(); }
      await create(d, arg.slot);
    };
  };
  draw();
});

async function create(d, slot) {
  const ctx = ui.ctx;
  ctx.ui.loading(true, '建立世界：球員、巡迴賽、賽程…');
  await new Promise(r => setTimeout(r, 50));
  const look = { body: d.gender, skin: d.skin, hair: d.hairColor, hairColor: d.hairColor, hairStyle: d.hairStyle, eyes: d.eyes, brows: d.brows, build: d.build, beard: 'none', shirt: '#f2ead8', pants: '#2a3442', cap: '#1d3a2a', shoes: '#f4f1ea', glove: '#ffffff' };
  const st = newCareer({ user: ctx.session.user, slot, name: d.name, country: d.country, home: d.home, family: d.family, gender: d.gender, height: d.height, look, difficulty: d.difficulty, length: d.length });
  st.opt.injuries = !!d.injuries || d.difficulty === 'real';
  setCur(st);
  await installHooks(ctx);
  if (d.skip) {
    skipChildhood(st);
    ctx.ui.loading(false);
    localSave(st); sync(true);
    return go('home');
  }
  ctx.ui.loading(false);
  localSave(st); sync(true);
  await runPrologue(st);
}
