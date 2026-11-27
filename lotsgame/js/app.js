// 主程式：路由、登入、大廳、戰績、紀錄、個人頁。
import { APP_NAME, APP_VERSION, START_COINS } from './config.js';
import * as store from './store.js';
import { h, fmt, signed, signClass, pct, timeAgo, toast, modal, confirmBox } from './ui.js';
import * as audio from './audio.js';
import { GAMES, COMING, CATEGORIES, gameById } from './games/registry.js';
import { paintCover } from './games/shared/draw.js';

const app = document.getElementById('app');
let unmountGame = null;
let unsub = null;

const navigate = (hash) => { if (location.hash === hash) render(); else location.hash = hash; };
const route = () => location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);

function cleanup() {
  if (unmountGame) { try { unmountGame(); } catch (e) { console.error(e); } unmountGame = null; }
  if (unsub) { unsub(); unsub = null; }
  if (modal.current && modal.current.isConnected) modal.current.close(null);
}

function render() {
  cleanup();
  window.scrollTo(0, 0);
  if (!store.isLoggedIn()) return renderLogin();
  const [a, b] = route();
  if (a === 'game' && gameById(b)) return renderGame(gameById(b));
  renderShell(['stats', 'history', 'me'].includes(a) ? a : 'lobby');
}

// ---------------------------------------------------------------------------
// 登入

function renderLogin() {
  const art = h('canvas', { class: 'login-art' });
  const err = h('div', { class: 'form-error' });
  const user = h('input', { type: 'text', autocomplete: 'username', autocapitalize: 'off', spellcheck: false, maxLength: 12, placeholder: '2–12 個字' });
  const pass = h('input', { type: 'password', autocomplete: 'current-password', maxLength: 40, placeholder: '至少 4 個字元' });
  const btn = h('button', { class: 'btn btn-gold btn-block', type: 'submit' }, '進入遊藝館');

  const submit = async (e) => {
    e.preventDefault();
    err.textContent = '';
    const name = user.value.trim();
    btn.disabled = true;
    btn.textContent = '登入中…';
    try {
      let r = await store.login(name, pass.value);
      if (r.needCreate) {
        const ok = await confirmBox('建立新帳號', '還沒有「<b>' + escapeHtml(name) + '</b>」這個帳號。<br>要用剛才輸入的密碼建立嗎？<br>新帳號會獲得 <b class="num">' + fmt(START_COINS) + '</b> 遊戲幣。' + (r.offline ? '<br><span style="color:var(--mute)">目前沒有網路，會先建立在這台裝置，連線後自動同步。</span>' : ''), '建立帳號');
        if (!ok) return;
        r = await store.login(name, pass.value, { create: true });
      }
      if (r.error) { err.textContent = r.error; return; }
      if (r.ok) {
        if (r.created) toast('帳號已建立，獲得 ' + fmt(START_COINS) + ' 遊戲幣');
        else if (r.offline) toast('離線登入，連線後會自動同步');
        navigate('#/');
        render();
      }
    } finally { btn.disabled = false; btn.textContent = '進入遊藝館'; }
  };

  app.replaceChildren(h('div', { class: 'login' }, art,
    h('form', { class: 'login-card', onSubmit: submit },
      h('div', { class: 'brand-mark' }, APP_NAME),
      h('div', { class: 'brand-sub' }, 'LOTS GAME HOUSE'),
      h('div', { class: 'rule' }),
      h('div', { class: 'form' },
        h('label', { class: 'field' }, h('span', null, '帳號'), user),
        h('label', { class: 'field' }, h('span', null, '密碼'), pass),
        err, btn),
      h('p', { class: 'login-note' }, '帳號就是你的玩家名稱。第一次輸入會直接建立帳號，', h('br'), '並獲得 ' + fmt(START_COINS) + ' 遊戲幣；登入後會一直保持登入。'))));
  requestAnimationFrame(() => paintCover(art, 'go'));
}

const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------------------------------------------------------------------------
// 外框

const TABS = [['lobby', '大廳', '#/'], ['stats', '戰績', '#/stats'], ['history', '紀錄', '#/history'], ['me', '我的', '#/me']];

function renderShell(tab) {
  const purse = h('b', null, fmt(store.balance()));
  const page = h('main', { class: 'page' });
  app.replaceChildren(h('div', { class: 'shell' },
    h('header', { class: 'topbar' },
      h('div', { class: 'topbar-brand' }, APP_NAME),
      h('nav', { class: 'topbar-nav' }, TABS.map(([id, label, href]) => h('a', { class: 'navlink' + (id === tab ? ' on' : ''), href }, label))),
      h('div', { class: 'topbar-spacer' }),
      h('div', { class: 'purse' }, h('small', null, '遊戲幣'), purse)),
    page,
    h('nav', { class: 'tabbar' }, TABS.map(([id, label, href]) => h('button', { class: 'tab' + (id === tab ? ' on' : ''), onClick: () => navigate(href) }, label)))));
  const pages = { lobby: pageLobby, stats: pageStats, history: pageHistory, me: pageMe };
  const refresh = pages[tab](page);
  unsub = store.subscribe(() => { if (!store.isLoggedIn()) return; purse.textContent = fmt(store.balance()); refresh && refresh(); });
}

function syncLabel() {
  const s = store.syncState.status, d = store.getData();
  if (s === 'local') return ['單機模式', 'local'];
  if (d.conflict) return ['僅存於本機', 'error'];
  if (s === 'syncing') return ['同步中…', 'syncing'];
  if (s === 'offline' || !navigator.onLine) return [d.pending.length ? '離線 · ' + d.pending.length + ' 筆待同步' : '離線', 'offline'];
  if (s === 'error') return ['同步失敗，稍後重試', 'error'];
  if (d.pending.length) return [d.pending.length + ' 筆待同步', 'idle'];
  return ['已同步', 'ok'];
}

// ---------------------------------------------------------------------------
// 大廳

function greeting() {
  const hr = new Date().getHours();
  return hr < 5 ? '夜深了' : hr < 11 ? '早安' : hr < 18 ? '午安' : '晚安';
}

function pageLobby(page) {
  const d = store.getData();
  const chip = h('div', { class: 'sync-chip' });
  const notices = h('div');
  const figures = h('div', { class: 'figures' });

  // 遊戲卡片只建立一次（封面繪製較花時間），切換分類時只調整顯示
  const cards = GAMES.map((g) => {
    const cv = h('canvas');
    const card = h('button', { class: 'gcard', onClick: () => navigate('#/game/' + g.id) },
      h('div', { class: 'gcard-art' }, cv),
      h('div', { class: 'gcard-body' },
        h('div', { class: 'gcard-kicker' }, g.kicker),
        h('div', { class: 'gcard-name' }, g.name),
        h('div', { class: 'gcard-desc' }, g.desc)));
    card.game = g;
    card.cover = cv;
    return card;
  });
  const games = h('div', { class: 'games' }, cards);
  const soonCards = COMING.map((g) => Object.assign(h('div', { class: 'gcard soon' },
    h('div', { class: 'gcard-art' }, h('span', null, '籌備中')),
    h('div', { class: 'gcard-body' }, h('div', { class: 'gcard-kicker' }, g.kicker), h('div', { class: 'gcard-name' }, g.name))), { game: g }));
  const soon = h('div', { class: 'games' }, soonCards);
  const soonHead = h('div', { class: 'section-head' }, h('h2', null, '即將推出'), h('span', null, '陸續上架'));
  const countEl = h('span');
  const catBar = h('div', { class: 'cats', role: 'tablist' });
  let cat = sessionStorage.getItem('lots.cat') || 'all';
  if (!CATEGORIES.some((c) => c.id === cat)) cat = 'all';
  const painted = new Set();
  const applyCat = () => {
    sessionStorage.setItem('lots.cat', cat);
    catBar.replaceChildren(...CATEGORIES.map((c) => {
      const n = c.id === 'all' ? GAMES.length : GAMES.filter((g) => g.cat === c.id).length;
      return h('button', { class: 'cat' + (c.id === cat ? ' on' : ''), role: 'tab', 'aria-selected': c.id === cat ? 'true' : 'false', onClick: () => { if (cat !== c.id) { cat = c.id; applyCat(); } } }, c.name, h('small', null, n));
    }));
    let first = true, shown = 0;
    for (const card of cards) {
      const on = cat === 'all' || card.game.cat === cat;
      card.hidden = !on;
      card.classList.toggle('feature', on && first);
      if (on) {
        first = false; shown++;
        // 卡片尺寸改變（例如變成大卡）時重新繪製封面
        const key = card.game.id + (card.classList.contains('feature') ? ':f' : '');
        if (!painted.has(key)) { painted.add(key); requestAnimationFrame(() => paintCover(card.cover, card.game.id)); }
      }
    }
    countEl.textContent = shown + ' 款遊戲';
    let soonShown = 0;
    for (const s of soonCards) { s.hidden = !(cat === 'all' || s.game.cat === cat); if (!s.hidden) soonShown++; }
    soon.hidden = soonHead.hidden = !soonShown;
  };
  applyCat();

  page.append(
    h('div', { class: 'hello' }, h('div', null, h('h1', null, greeting() + '，' + d.user), h('p', null, '今天想玩點什麼？')), chip),
    notices,
    h('div', { class: 'section-head' }, h('h2', null, '遊戲大廳'), countEl),
    catBar,
    games,
    h('div', { class: 'section-head' }, h('h2', null, '我的戰績'), h('a', { href: '#/stats', style: 'color:var(--gold);text-decoration:none;font-size:13px;letter-spacing:.1em' }, '完整統計')),
    figures,
    soonHead,
    soon);

  const refresh = () => {
    const [label, s] = syncLabel();
    chip.textContent = label;
    chip.dataset.s = s;
    notices.replaceChildren();
    const daily = store.dailyInfo();
    if (!daily.claimed) notices.append(h('div', { class: 'notice' },
      h('div', { class: 'notice-text' }, h('b', null, '每日簽到 · 第 ' + daily.streak + ' 天'), h('span', null, '今天可領 ' + fmt(daily.amount) + '，連續簽到會加碼')),
      h('button', { class: 'btn btn-gold btn-sm', onClick: () => { const r = store.claimDaily(); if (r) { audio.play('payout'); toast('簽到成功，獲得 ' + fmt(r.amount) + ' 遊戲幣'); } } }, '領取')));
    const relief = store.reliefInfo();
    if (relief.available) notices.append(h('div', { class: 'notice' },
      h('div', { class: 'notice-text' }, h('b', null, '補給金'), h('span', null, '可領 ' + fmt(relief.amount) + '，今日剩 ' + relief.left + ' 次')),
      h('button', { class: 'btn btn-gold btn-sm', onClick: () => { if (store.claimRelief()) { audio.play('payout'); toast('已領取補給金'); } } }, '領取')));
    const pending = Object.keys(d.saves).map(gameById).filter(Boolean);
    for (const g of pending) notices.append(h('div', { class: 'notice' },
      h('div', { class: 'notice-text' }, h('b', null, g.name + ' · 有未完成的對局'), h('span', null, '已下注 ' + fmt(store.heldAmount(g.id)) + '，可接著玩')),
      h('button', { class: 'btn btn-sm', onClick: () => navigate('#/game/' + g.id) }, '繼續')));
    const t = d.stats.total;
    figures.replaceChildren(
      figure('總局數', fmt(t.plays), t.wins + ' 勝 ' + t.losses + ' 負 ' + t.draws + ' 和'),
      figure('勝率', pct(t.wins, t.plays), t.plays ? '最長連勝 ' + t.bestStreak + ' 局' : '還沒有對局'),
      figure('淨輸贏', signed(t.net), '累計下注 ' + fmt(t.wagered), signClass(t.net)),
      figure('資產高點', fmt(d.stats.peak), '起始 ' + fmt(START_COINS)));
  };
  refresh();
  return refresh;
}

const figure = (label, value, note, cls = '') => h('div', { class: 'figure' }, h('small', null, label), h('b', { class: cls }, value), h('em', null, note));

// ---------------------------------------------------------------------------
// 戰績

function pageStats(page) {
  const body = h('div');
  page.append(h('h1', { class: 'page-title' }, '戰績'), h('p', { class: 'page-sub' }, '所有遊戲的累計統計'), body);
  const refresh = () => {
    const d = store.getData(), st = d.stats, t = st.total;
    const games = Object.entries(st.games);
    const fav = games.slice().sort((a, b) => b[1].plays - a[1].plays)[0];
    const best = games.filter(([, g]) => g.plays >= 3).sort((a, b) => b[1].wins / b[1].plays - a[1].wins / a[1].plays)[0];
    const lucky = games.slice().sort((a, b) => b[1].net - a[1].net)[0];
    const m = st.marks;
    const facts = [
      ['目前走勢', t.curStreak > 0 ? '連勝 ' + t.curStreak + ' 局' : t.curStreak < 0 ? '連敗 ' + -t.curStreak + ' 局' : '—'],
      ['最長連勝', t.bestStreak ? t.bestStreak + ' 局' : '—'],
      ['單局最大贏額', t.biggestWin ? '+' + fmt(t.biggestWin) : '—'],
      ['單局最大輸額', t.biggestLoss ? '−' + fmt(-t.biggestLoss) : '—'],
      ['最常玩的遊戲', fav ? fav[1].name : '—'],
      ['勝率最高的遊戲', best ? best[1].name : '—'],
      ['最賺錢的遊戲', lucky && lucky[1].net > 0 ? lucky[1].name : '—'],
      ['資產最高紀錄', fmt(st.peak)],
      ['資產最低紀錄', fmt(st.low)],
      ['遊玩天數', st.days.length + ' 天'],
      ['簽到與補給累計', fmt(st.bonus)],
      ['擊敗高段圍棋 AI', (m.goHardWins || 0) + ' 次'],
      ['擊敗高級五子棋 AI', (m.gomokuHardWins || 0) + ' 次'],
      ['拿到 Blackjack', (m.bjNaturals || 0) + ' 次'],
      ['加倍成功', (m.bjDoubleWins || 0) + ' 次'],
      ['百家樂押中和局', (m.bacTieWins || 0) + ' 次'],
      ['德州撲克打過', fmt(m.pkHands || 0) + ' 手'],
      ['麻將胡過 8 台以上', (m.mjBigHands || 0) + ' 次'],
      ['踩地雷高級過關', (m.msHardWins || 0) + ' 次'],
      ['2048 合出 2048', (m.tile2048 || 0) + ' 次'],
      ['圍棋總手數', fmt(m.goMoves || 0) + ' 手'],
    ];
    body.replaceChildren(
      h('div', { class: 'figures' },
        figure('總局數', fmt(t.plays), t.wins + ' 勝 ' + t.losses + ' 負 ' + t.draws + ' 和'),
        figure('勝率', pct(t.wins, t.plays), '不含和局也計入總局數'),
        figure('淨輸贏', signed(t.net), '累計下注 ' + fmt(t.wagered), signClass(t.net)),
        figure('目前遊戲幣', fmt(d.balance), '起始 ' + fmt(START_COINS))),
      h('div', { class: 'section-head' }, h('h2', null, '各遊戲')),
      h('div', { class: 'panel scroll-x' }, games.length ? h('table', { class: 'table' },
        h('thead', null, h('tr', null, ['遊戲', '局數', '勝', '負', '和', '勝率', '淨輸贏'].map((x) => h('th', null, x)))),
        h('tbody', null, games.map(([, g]) => h('tr', null,
          h('td', null, g.name), h('td', null, fmt(g.plays)), h('td', null, g.wins), h('td', null, g.losses), h('td', null, g.draws),
          h('td', null, pct(g.wins, g.plays)), h('td', { class: signClass(g.net) }, signed(g.net)))))) : h('div', { class: 'empty' }, '玩過的遊戲會出現在這裡')),
      h('div', { class: 'section-head' }, h('h2', null, '趣味數據')),
      h('div', { class: 'facts' }, facts.map(([k, v]) => h('div', { class: 'fact' }, h('small', null, k), h('b', null, v)))));
  };
  refresh();
  return refresh;
}

// ---------------------------------------------------------------------------
// 紀錄

function pageHistory(page) {
  const list = h('div', { class: 'panel log' });
  page.append(h('h1', { class: 'page-title' }, '紀錄'), h('p', { class: 'page-sub' }, '最近 300 筆輸贏與領取'), list);
  const refresh = () => {
    const hist = store.getData().history;
    if (!hist.length) return list.replaceChildren(h('div', { class: 'empty' }, '還沒有任何紀錄，去大廳開一局吧'));
    list.replaceChildren(...hist.map((e) => h('div', { class: 'log-row' },
      h('div', { class: 'log-title' }, e.game, h('i', null, e.result + (e.mode ? ' · ' + e.mode : ''))),
      h('div', { class: 'log-delta ' + signClass(e.delta) }, signed(e.delta)),
      h('div', { class: 'log-meta' }, timeAgo(e.t) + (e.bet ? ' · 下注 ' + fmt(e.bet) : '') + (e.note ? ' · ' + e.note : '')),
      h('div', { class: 'log-bal' }, '餘額 ' + fmt(e.balance)))));
  };
  refresh();
  return refresh;
}

// ---------------------------------------------------------------------------
// 我的

function pageMe(page) {
  const body = h('div');
  const board = h('div', { class: 'panel rows' }, h('div', { class: 'empty' }, store.hasBackend() ? '載入中…' : '連接雲端後會顯示所有玩家的排名'));
  page.append(h('h1', { class: 'page-title' }, '我的'), h('p', { class: 'page-sub' }, '帳號、設定與排行榜'), body,
    h('div', { class: 'section-head' }, h('h2', null, '富豪榜'), h('span', null, '依遊戲幣排名')), board,
    h('p', { style: 'margin-top:26px;text-align:center;font-size:12px;color:var(--mute);letter-spacing:.1em' }, APP_NAME + ' · v' + APP_VERSION));

  const toggle = (key) => { const sw = h('button', { class: 'switch' + (store.getData().settings[key] ? ' on' : ''), 'aria-label': key, onClick: () => { store.setSetting(key, !store.getData().settings[key]); audio.play('chip'); } }); return sw; };

  const refresh = () => {
    const d = store.getData();
    const [label] = syncLabel();
    body.replaceChildren(
      h('div', { class: 'panel rows' },
        h('div', { class: 'row' }, h('div', { class: 'row-main' }, h('b', null, d.user), h('span', null, '建立於 ' + new Date(d.createdAt).toLocaleDateString('zh-TW'))), h('div', { class: 'row-val', style: 'color:var(--gold-2)' }, fmt(d.balance))),
        h('div', { class: 'row' }, h('div', { class: 'row-main' }, h('b', null, '資料同步'), h('span', null, store.hasBackend() ? (store.syncState.lastError || (d.lastSync ? '上次同步：' + timeAgo(d.lastSync) : '尚未同步')) : '尚未連接雲端，資料只保存在這台裝置')),
          store.hasBackend() ? h('button', { class: 'btn btn-sm', onClick: () => store.sync() }, label === '已同步' ? '已同步' : '立即同步') : null)),
      h('div', { class: 'section-head' }, h('h2', null, '設定')),
      h('div', { class: 'panel rows' },
        h('div', { class: 'row' }, h('div', { class: 'row-main' }, h('b', null, '音效'), h('span', null, '落子、發牌與籌碼的聲音')), toggle('sound')),
        h('div', { class: 'row' }, h('div', { class: 'row-main' }, h('b', null, '落子前確認'), h('span', null, '先點選位置、再按確認，避免在手機上點錯')), toggle('confirmMove')),
        h('div', { class: 'row' }, h('div', { class: 'row-main' }, h('b', null, '安裝成 App'), h('span', null, 'iPhone：分享 → 加入主畫面。Android／電腦：瀏覽器選單 → 安裝應用程式。安裝後沒有網路也能玩。')), installBtn())),
      h('div', { style: 'margin-top:18px' }, h('button', { class: 'btn btn-danger btn-block', onClick: doLogout }, '登出')));
  };
  refresh();

  store.fetchLeaderboard().then((rows) => {
    if (!board.isConnected || !rows) { if (store.hasBackend() && board.isConnected) board.replaceChildren(h('div', { class: 'empty' }, '目前無法取得排行榜')); return; }
    const me = store.getData().user.toLowerCase();
    board.replaceChildren(...(rows.length ? rows.map((r, i) => h('div', { class: 'row' + (r.user.toLowerCase() === me ? ' me' : '') },
      h('div', { class: 'rank-no' }, i + 1),
      h('div', { class: 'row-main' }, h('b', null, r.user), h('span', null, r.plays + ' 局 · 勝率 ' + pct(r.wins, r.plays))),
      h('div', { class: 'row-val' }, fmt(r.balance)))) : [h('div', { class: 'empty' }, '還沒有玩家')]));
  });
  return refresh;
}

let installEvent = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvent = e; });
function installBtn() {
  if (!installEvent) return null;
  return h('button', { class: 'btn btn-sm', onClick: async () => { installEvent.prompt(); installEvent = null; } }, '安裝');
}

async function doLogout() {
  const d = store.getData();
  const warn = d.pending.length && store.hasBackend() ? '<br>還有 ' + d.pending.length + ' 筆紀錄尚未同步，會保留在這台裝置，下次登入時再上傳。' : '';
  if (!(await confirmBox('登出', '確定要登出「' + escapeHtml(d.user) + '」嗎？' + warn, '登出', '取消', 'danger'))) return;
  store.logout();
  navigate('#/');
  render();
}

// ---------------------------------------------------------------------------
// 遊戲頁

async function renderGame(game) {
  const coins = h('span', { class: 'gbar-coins' }, fmt(store.balance()));
  const main = h('div', { class: 'gmain' }, h('div', { class: 'empty' }, '載入中…'));
  let rules = null;
  const rulesBtn = h('button', { class: 'gbar-link', onClick: () => rules && modal({ title: game.name + '規則', body: h('div', { class: 'rules', html: rules }), actions: [{ label: '知道了', value: true, kind: 'gold' }] }) }, '規則');
  let guard = null; // 遊戲可設定離開前的確認
  const back = h('button', { class: 'gbar-link', onClick: async () => { if (guard && !(await guard())) return; navigate('#/'); } }, '‹ 大廳');
  app.replaceChildren(h('div', { class: 'gpage', dataset: { game: game.id } },
    h('header', { class: 'gbar' }, h('div', { class: 'gbar-left' }, back), h('div', { class: 'gbar-title' }, game.name), h('div', { class: 'gbar-right' }, coins, rulesBtn)),
    main));
  unsub = store.subscribe(() => { if (store.isLoggedIn()) coins.textContent = fmt(store.balance()); });
  try {
    const mod = await game.load();
    if (!main.isConnected) return;
    rules = mod.RULES;
    main.replaceChildren();
    unmountGame = await mod.mount(main, { game, navigate, setGuard: (fn) => { guard = fn; } });
  } catch (e) {
    console.error(e);
    main.replaceChildren(h('div', { class: 'empty' }, '遊戲載入失敗，請確認網路後再試一次。'));
  }
}

// ---------------------------------------------------------------------------

window.addEventListener('hashchange', render);
store.restoreSession();
render();
if (store.isLoggedIn()) store.scheduleSync(1000);

// 本機開發時不啟用快取（避免改了程式卻看到舊版）；網址加上 ?sw=1 可在本機測試離線功能
const isDev = ['localhost', '127.0.0.1'].includes(location.hostname) && !location.search.includes('sw=1');
if ('serviceWorker' in navigator && location.protocol !== 'file:' && !isDev) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => {}); });
}
