// 生涯模式入口：開放名單內的帳號在大廳按下卡片時才由 js/main.js 動態載入
import './achievements.js';
import { bind, cur, setCur, load, listSlots, removeSlot, summary, localSave, sync } from './state.js';
import { mount, register, go, ui, dialog, confirm2, toast } from './ui/shell.js';
import { esc, money } from './util.js';
import { CHAPTER_ZH, DIFF } from './life.js';
import './ui/create.js';
import './ui/home.js';
import './ui/calendar.js';
import './ui/eventview.js';
import './ui/player.js';
import './ui/team.js';
import './ui/trophy.js';
import './ui/more.js';
import { installHooks } from './ui/ingame.js';
import { renderRecordsTab } from './ui/more.js';

// 樣式表載入完才畫畫面（不會先閃一下沒有樣式的內容）
function ensureCss() {
  if (document.getElementById('cm-css')) return Promise.resolve();
  return new Promise(res => {
    const l = document.createElement('link');
    l.id = 'cm-css'; l.rel = 'stylesheet'; l.href = 'Career/css/career.css?v=' + (self.DIXEN_VERSION || '1');
    l.onload = l.onerror = () => res();
    document.head.appendChild(l);
    setTimeout(res, 4000);
  });
}

export async function openCareer(ctx, view) {
  await ensureCss();
  bind(ctx);
  mount(ctx);
  const user = ctx.session.user;
  if (cur() && cur().user === user) { await installHooks(ctx); return go(view === 'card' ? 'more' : 'home', view === 'card' ? 'card' : undefined); }
  setCur(null);
  go('slots');
}

// 紀錄頁的「生涯」分頁（不進入生涯也能看）
export async function renderCareerRecords(ctx, el) {
  await ensureCss();
  bind(ctx);
  await renderRecordsTab(ctx, el);
}

// ---------- 生涯欄位 ----------
register('slots', async body => {
  const ctx = ui.ctx, user = ctx.session.user;
  body.innerHTML = `<div class="cm-card"><h3>生涯欄位<small>最多 3 個</small></h3><div id="cm-slots" class="cm-grid3"><div class="cm-empty">讀取中…</div></div>
    <p class="cm-note" style="margin-top:10px">每個欄位是一段獨立的人生（例如一個重砲手、一個推桿名手）。存檔放在這台手機與伺服器的「生涯_${esc(user)}」工作頁，換手機也能接著玩。</p></div>`;
  const slots = await listSlots(user);
  const box = document.getElementById('cm-slots');
  box.innerHTML = [1, 2, 3].map(s => {
    const x = slots[s];
    return x ? `<div class="cm-slot full" data-s="${s}"><span>欄位 ${s}</span><b>${esc(x.name)}</b><span>${x.age} 歲 · ${esc(CHAPTER_ZH[x.chapter] || '')}</span><span>${x.wins || 0} 冠 · 大賽 ${x.majors || 0} · ${money(x.prize || 0, { short: true })}</span><span>${esc((DIFF[x.difficulty] || {}).name || '')}${x.retired ? ' · 已退休' : ''}</span></div>`
      : `<div class="cm-slot" data-s="${s}"><span>欄位 ${s}</span><b>＋ 開始新的生涯</b></div>`;
  }).join('');
  box.querySelectorAll('[data-s]').forEach(el => el.onclick = async () => {
    const s = Number(el.dataset.s);
    if (!slots[s]) return go('create', { slot: s, others: Object.keys(slots).length > 0 });
    const i = await dialog(`<p class="cm-note" style="font-size:14px;color:var(--ink)"><b>${esc(slots[s].name)}</b>　${slots[s].age} 歲</p>`, { title: '欄位 ' + s, buttons: [['刪除這個生涯', 'ghost'], ['繼續生涯', 'green']] });
    if (i === 1) {
      ctx.ui.loading(true, '讀取生涯…');
      const st = await load(user, s);
      ctx.ui.loading(false);
      if (!st) return toast('讀不到這個存檔');
      setCur(st);
      await installHooks(ctx);
      go('home');
    } else if (i === 0) {
      if (await confirm2(`確定要刪除「${esc(slots[s].name)}」的生涯嗎？這個動作不能復原。`, '刪除')) { await removeSlot(user, s); go('slots'); }
    }
  });
});
