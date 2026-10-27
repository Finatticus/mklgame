// 新手教學：新帳號第一次進大廳自動開始（這台裝置記住看過了），設定裡可以重看
//   第一段：帶到練習場實際揮兩桿（偵測真的打出去了才往下走）
//   第二段：回大廳，一個一個亮起功能，要換頁的地方請玩家自己點一次
// 畫面：暗色遮罩挖一個洞框住要看的東西；「下一步」型的步驟洞也擋住（不會誤點），「點這裡」型的步驟洞可以點穿
const $ = id => document.getElementById(id);
const KEY = u => 'dixen.tut.' + u;
export function tutorialSeen(user) { try { return localStorage.getItem(KEY(user)) === '1'; } catch (e) { return true; } }
function markSeen(user) { try { localStorage.setItem(KEY(user), '1'); } catch (e) { /* 私密模式：下次再看一次也沒關係 */ } }

const vis = el => el && el.offsetParent !== null && el.getBoundingClientRect().width > 0;
const q = sel => [...document.querySelectorAll(sel)].find(vis);
const screen = () => document.body.dataset.screen;
const shotShown = () => $('shot-data')?.classList.contains('show');

// api：{ user, startRange(), quitToLobby() }
export function startTutorial(api) {
  if ($('tut')) return;
  const root = document.createElement('div');
  root.id = 'tut';
  root.innerHTML = `<div class="tut-m t"></div><div class="tut-m b"></div><div class="tut-m l"></div><div class="tut-m r"></div><div class="tut-block"></div>
    <div class="tut-ring"></div><div class="tut-hand hidden"><i></i></div>
    <div class="tut-bub"><small class="tut-step"></small><p class="tut-txt"></p><div class="tut-btns"></div></div>`;
  document.body.appendChild(root);
  const el = c => root.querySelector(c);
  let i = -1, timer = null, shots = 0, wasShown = false;

  const steps = [
    // ---------- 第一段：揮桿 ----------
    { text: '<b>歡迎來到 Dixen Golf！</b><br>先帶你到練習場實際打一球，再帶你看看大廳的各個功能，大約兩分鐘。', btn: '開始', skip: true, mask: 'full',
      next: () => { api.startRange(); } },
    { text: '練習場準備中…', mask: 'none', wait: () => screen() === 'scr-game' && !$('swing-ui').classList.contains('off') && !$('hud').classList.contains('waiting') && vis(q('#swing-ui .ball-ring')), auto: true },
    { target: () => q('#swing-ui .ball-ring'), pad: 18, text: '圓圈裡是<b>你的球</b>。旁邊的直條是<b>力道條</b>，上面會顯示這個力道的<b>預估落點</b>。', btn: '下一步', mask: 'none' },
    { target: () => $('hud-club'), text: '左下是<b>目前的球桿</b>和平均距離。系統會依距離自動選桿，點一下可以自己換。', btn: '下一步', mask: 'none' },
    { target: () => q('.hud-env'), text: '右上是<b>風向、風速</b>和<b>小地圖</b>。羅盤箭頭朝上是順風、朝下是逆風。', btn: '下一步', mask: 'none' },
    { text: '<b>來揮一桿！</b><br>① 手指按住畫面<b>往下拉</b> = 上桿，力道條會變長<br>② 拉到 80~100% 後，<b>快速往上滑</b>就會擊球<br>（往上滑得慢只會把力道收小，不會擊球）', mask: 'none', hand: true,
      wait: () => shots >= 1, place: 'top' },
    { target: () => $('shot-data'), text: '<b>打出去了！</b>這是擊球數據：球速、Carry（飛行距離）、Total（含滾動）、偏移…<br><b>點一下畫面</b>關掉它。', mask: 'none', wait: () => !shotShown(), place: 'top' },
    { text: '<b>瞄準與曲球</b><br>擊球前在畫面上<b>左右滑</b>可以調整方向。出桿時往<b>左上 / 右上</b>快速滑，會打出左曲 / 右曲球。<br>再打一球試試看！', mask: 'none', hand: true, wait: () => shots >= 2, place: 'top' },
    { text: '<b>很好！</b>練習場可以一直練，也能切換沙坑、果嶺推桿。<br>接下來帶你看看大廳。', btn: '回大廳', mask: 'full',
      next: () => { api.quitToLobby(); } },
    { text: '回大廳中…', mask: 'none', wait: () => screen() === 'scr-lobby', auto: true },
    // ---------- 第二段：大廳功能 ----------
    { target: () => $('mode-single'), text: '<b>單人回合</b>：選球場、梯台、9 / 18 洞。打完的成績會進排行、球場護照與個人紀錄。', btn: '下一步' },
    { target: () => $('mode-chal'), text: '<b>挑戰模式</b>：500 個特別設計的關卡，每關 1~3 顆星，星星可以換外觀。', btn: '下一步' },
    { target: () => $('mode-host'), text: '<b>建立 / 加入遊戲間</b>：跟朋友連線一起打。建立的人會拿到 6 位數驗證碼，朋友在「加入遊戲間」輸入就好。', btn: '下一步' },
    { target: () => $('mode-practice'), text: '<b>練習</b>：剛剛的練習場，或任選一洞從開球打到進洞，不計分。', btn: '下一步' },
    { target: () => q('#scr-lobby .tabbar [data-tab="rank"]'), text: '下面是分頁。<b>點「排行」</b>看看。', click: true, wait: () => screen() === 'scr-rank' },
    { target: () => $('rk-tabs'), text: '<b>排行</b>：總桿排行（只比黑梯）、球場排行（可選梯台）、一桿進洞 / 老鷹、挑戰星數。用過重打的回合不列入排行。', btn: '下一步' },
    { target: () => q('#scr-rank .tabbar [data-tab="records"]'), text: '<b>點「紀錄」</b>。', click: true, wait: () => screen() === 'scr-records' },
    { target: () => $('rc-tabs'), text: '<b>紀錄</b>：個人紀錄是你的生涯儀表板；還有回合紀錄、成就徽章、球場護照（每座球場一個章）、實際下場紀錄。', btn: '下一步' },
    { target: () => q('#scr-records .tabbar [data-tab="char"]'), text: '<b>點「角色」</b>。', click: true, wait: () => screen() === 'scr-char' },
    { target: () => $('ch-tabs'), text: '<b>角色</b>：「能力值」用打球得到的能力點升級（能力值平均決定等級）；「外觀」換角色、球桿、球的造型。改完記得按儲存。', btn: '下一步' },
    { target: () => q('#scr-char .tabbar [data-tab="lobby"]'), text: '<b>點「大廳」</b>回去。', click: true, wait: () => screen() === 'scr-lobby' },
    { target: () => $('btn-lobby-set'), text: '最後是<b>設定</b>：畫質、字體大小、音效；<b>遊戲說明書</b>和<b>重看這個教學</b>也在裡面。<br>祝你打得開心！', btn: '完成' },
  ];

  function place() {
    const s = steps[i]; if (!s) return;
    const t = s.target && s.target();
    const r = t && vis(t) ? t.getBoundingClientRect() : null;
    const pad = s.pad ?? 6, W = innerWidth, H = innerHeight;
    const box = r ? { x: r.left - pad, y: r.top - pad, w: r.width + pad * 2, h: r.height + pad * 2 } : null;
    const mask = s.mask || 'hole';
    // 遮罩：none = 完全不擋（揮桿要用整個畫面）；full = 整片擋；hole = 挖洞（洞可不可以點看 click）
    const m = { t: el('.tut-m.t'), b: el('.tut-m.b'), l: el('.tut-m.l'), r: el('.tut-m.r') };
    if (mask === 'none') for (const k in m) m[k].style.display = 'none';
    else if (mask === 'full' || !box) { for (const k in m) m[k].style.display = 'none'; Object.assign(m.t.style, { display: 'block', left: 0, top: 0, width: W + 'px', height: H + 'px' }); }
    else {
      Object.assign(m.t.style, { display: 'block', left: 0, top: 0, width: W + 'px', height: Math.max(0, box.y) + 'px' });
      Object.assign(m.b.style, { display: 'block', left: 0, top: box.y + box.h + 'px', width: W + 'px', height: Math.max(0, H - box.y - box.h) + 'px' });
      Object.assign(m.l.style, { display: 'block', left: 0, top: box.y + 'px', width: Math.max(0, box.x) + 'px', height: box.h + 'px' });
      Object.assign(m.r.style, { display: 'block', left: box.x + box.w + 'px', top: box.y + 'px', width: Math.max(0, W - box.x - box.w) + 'px', height: box.h + 'px' });
    }
    const blk = el('.tut-block');
    blk.style.display = box && mask === 'hole' && !s.click ? 'block' : 'none';
    if (box) Object.assign(blk.style, { left: box.x + 'px', top: box.y + 'px', width: box.w + 'px', height: box.h + 'px' });
    const ring = el('.tut-ring');
    ring.style.display = box ? 'block' : 'none';
    ring.classList.toggle('tap', !!s.click);
    if (box) Object.assign(ring.style, { left: box.x + 'px', top: box.y + 'px', width: box.w + 'px', height: box.h + 'px' });
    // 說明框：放在框住的東西下面，放不下就放上面；沒有目標時放中間（揮桿步驟放上方，不擋到球）
    const bub = el('.tut-bub'), bw = Math.min(340, W - 24), bh = bub.offsetHeight || 140;
    let bx = W / 2 - bw / 2, by;
    if (box) {
      bx = Math.min(W - bw - 12, Math.max(12, box.x + box.w / 2 - bw / 2));
      by = box.y + box.h + 14 + bh < H - 8 ? box.y + box.h + 14 : Math.max(8, box.y - bh - 14);
    } else by = s.place === 'top' ? Math.max(8, H * 0.12) : H / 2 - bh / 2;
    Object.assign(bub.style, { left: bx + 'px', top: by + 'px', width: bw + 'px' });
  }

  function go(k) {
    i = k;
    const s = steps[i];
    if (!s) return finish();
    shots = Math.max(shots, 0);
    el('.tut-step').textContent = i <= 9 ? '新手教學 · 揮桿' : '新手教學 · 功能介紹';
    el('.tut-txt').innerHTML = s.text;
    const btns = el('.tut-btns'); btns.innerHTML = '';
    if (s.btn) { const b = document.createElement('button'); b.className = 'btn brass'; b.textContent = s.btn; b.onclick = () => { if (s.next) s.next(); go(i + 1); }; btns.appendChild(b); }
    if (!s.auto) { const k2 = document.createElement('button'); k2.className = 'tut-skip'; k2.textContent = '跳過教學'; k2.onclick = finish; btns.appendChild(k2); }
    el('.tut-hand').classList.toggle('hidden', !s.hand);
    const t = s.target && s.target();
    if (t && t.scrollIntoView) t.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    place();
  }

  function tick() {
    // 偵測擊球：擊球數據面板出現一次 = 打了一桿
    const sh = shotShown();
    if (sh && !wasShown) shots++;
    wasShown = sh;
    const s = steps[i];
    if (s && s.wait && s.wait()) { go(i + 1); return; }
    place();
  }

  function finish() {
    clearInterval(timer); removeEventListener('resize', place);
    markSeen(api.user);
    root.remove();
  }

  addEventListener('resize', place);
  timer = setInterval(tick, 250);
  go(0);
}
