// 8 號球規則（依 WPA 世界撲克撞球協會規則）。不需指定一般球的袋口（打進自己的球即有效），
// 8 號球必須指定袋口。判定只看一桿的事件紀錄與擊球前的狀態。
import { POCKETS, FOOT_Y, W, R } from './physics.js';

export const groupOf = (n) => (n === 0 ? 'cue' : n === 8 ? 'eight' : n < 8 ? 'solid' : 'stripe');
export const GROUP_NAME = { solid: '全色球', stripe: '花色球' };
export const other = (p) => 1 - p;

// 該玩家還在檯面上的己方球
export function remaining(balls, group) { return balls.filter((b) => b.on && groupOf(b.n) === group).map((b) => b.n); }

// 這一桿合法的第一顆目標球
export function legalTargets(st, balls) {
  const g = st.groups[st.turn];
  if (!g) return balls.filter((b) => b.on && b.n !== 0).map((b) => b.n); // 開放球局：任何球（打到 8 號球不算得分）
  const left = remaining(balls, g);
  return left.length ? left : [8];
}

// st：{ turn, groups:[g0,g1], isBreak, called }；before：擊球前的球；after：擊球後的球；ev：事件
// 回傳 { foul, reason, keep（是否繼續）, winner, groups, inHand（'kitchen' | 'anywhere' | null）, respot8, illegalBreak, msg }
export function judge(st, before, after, ev) {
  const me = st.turn, opp = other(me);
  const groups = st.groups.slice();
  const pocketed = ev.filter((e) => e.type === 'pocket').map((e) => ({ n: e.n, pocket: e.pocket }));
  const objPocketed = pocketed.filter((p) => p.n !== 0);
  const scratch = pocketed.some((p) => p.n === 0);
  const firstIdx = ev.findIndex((e) => e.type === 'ball' && (e.a === 0 || e.b === 0));
  const firstHit = firstIdx >= 0 ? (ev[firstIdx].a === 0 ? ev[firstIdx].b : ev[firstIdx].a) : null;
  const railAfter = firstIdx >= 0 && ev.slice(firstIdx).some((e) => e.type === 'cushion');
  const eight = pocketed.find((p) => p.n === 8);
  const res = { foul: false, reason: '', keep: false, winner: null, groups, inHand: null, respot8: false, illegalBreak: false, msg: '' };

  // ---------- 開球 ----------
  if (st.isBreak) {
    const railed = new Set(ev.filter((e) => e.type === 'cushion' && e.n !== 0).map((e) => e.n));
    const legal = objPocketed.length > 0 || railed.size >= 4;
    if (!legal) {
      res.illegalBreak = true; res.foul = true; res.reason = '開球不合法（未進球且碰庫的球少於 4 顆）';
      return res;
    }
    if (eight) res.respot8 = true;
    if (scratch) { res.foul = true; res.reason = '開球母球落袋'; res.inHand = 'kitchen'; return res; }
    res.keep = objPocketed.some((p) => p.n !== 8);
    res.msg = res.keep ? '開球進球，繼續擊球' : '開球沒有進球';
    if (eight && !res.keep) { res.keep = true; res.msg = '8 號球開球落袋，放回置球點後繼續'; }
    return res;
  }

  const myGroup = groups[me];
  const onEight = myGroup && remaining(before, myGroup).length === 0;

  // ---------- 犯規 ----------
  let foul = '';
  if (firstHit === null) foul = '母球沒有碰到任何球';
  else if (myGroup && !onEight && groupOf(firstHit) !== myGroup) foul = '先碰到的不是自己的球';
  else if (onEight && firstHit !== 8) foul = '應先碰 8 號球';
  else if (!railAfter && objPocketed.length === 0) foul = '碰球後沒有任何球碰庫或進袋';
  if (scratch) foul = foul || '母球落袋';

  // ---------- 8 號球 ----------
  if (eight) {
    if (!onEight) return Object.assign(res, { winner: opp, foul: !!foul, reason: foul, msg: '8 號球提前落袋，判負' });
    if (foul) return Object.assign(res, { winner: opp, foul: true, reason: foul, msg: '打進 8 號球時犯規，判負' });
    if (st.called !== eight.pocket) return Object.assign(res, { winner: opp, msg: '8 號球進錯袋（指定 ' + POCKETS[st.called].name + '），判負' });
    return Object.assign(res, { winner: me, msg: '8 號球進' + POCKETS[eight.pocket].name + '，獲勝' });
  }

  if (foul) {
    res.foul = true; res.reason = foul; res.inHand = 'anywhere';
    res.msg = foul + '，對手自由球';
    return res;
  }

  // ---------- 合法擊球 ----------
  if (!myGroup) {
    // 開放球局：先碰 8 號球時不計分；否則以第一顆進袋的球決定花色
    const valid = objPocketed.filter((p) => p.n !== 8);
    if (firstHit === 8) { res.msg = '開放球局先碰 8 號球，換對手'; return res; }
    if (valid.length) {
      const g = groupOf(valid[0].n);
      groups[me] = g; groups[opp] = g === 'solid' ? 'stripe' : 'solid';
      res.keep = true;
      res.msg = '確定花色：' + GROUP_NAME[g];
      return res;
    }
    res.msg = '沒有進球，換對手';
    return res;
  }
  const mine = objPocketed.filter((p) => groupOf(p.n) === myGroup);
  res.keep = mine.length > 0;
  res.msg = res.keep ? '進球，繼續' : '沒有進自己的球，換對手';
  return res;
}

// 8 號球放回置球點（被佔用時沿中線往檯尾移）
export function respot(balls, n = 8) {
  const b = balls.find((x) => x.n === n);
  let y = FOOT_Y;
  const clear = (yy) => balls.every((o) => !o.on || o === b || Math.hypot(o.x - W / 2, o.y - yy) >= 2 * R + 0.001);
  while (!clear(y) && y < 2.5) y += 0.004;
  Object.assign(b, { on: true, x: W / 2, y, vx: 0, vy: 0, wx: 0, wy: 0, wz: 0, moving: false });
  delete b.pocket;
}
