// 魔塔核心：樓層產生、地圖解析、戰鬥計算、可解性模擬
// 格子代碼：
//   ''地板 '#'牆 'h'暗牆 'U'/'D'上下樓 'dY/dB'門 'kY/kB'鑰匙 'gA/gD'寶石 'pS/pL'藥水 '$'金幣袋
//   'c' 或 'c:寶物id' 寶箱  'i:道具' 消耗品  't:工具' 工具  'n:npc' NPC  'm:怪:階:旗標' 怪物（旗標 G 守衛 P 巡邏 r 復活 s 分裂體）
//   'I'鐵門 'L'機關門 'o'壓力板 'O'已踩下的壓力板 '~'毒沼 'v'藤蔓 '^'冰面 'x'岩漿 'T:n'傳送陣 'X'封印水晶 'q:英雄'印記門
const Tower = (() => {
  const W = 11, N = W * W;
  const MAIN_SEED = 'emberhold-main-v3';
  // 平衡參數：ref 參考玩家每層成長倍率、藥水（以樓層傷害單位 U 計）、怪物整體與每區的生命／傷害倍率
  const K = { ref: 1.4, potS: 4, potL: 10, hp: 1, dmg: 1, zoneHp: 0.12, zoneDmg: 0.15 };
  const GOLD_TIER = { rd: 0.3, hits: 4, dmg: 0.5, exp: 12, gold: 25 };

  // ---------- 亂數 ----------
  function hash(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; }
    return (h ^ h >>> 16) >>> 0;
  }
  function rng(seed) {
    let a = seed >>> 0;
    const f = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    f.int = (lo, hi) => lo + Math.floor(f() * (hi - lo + 1));
    f.pick = arr => arr[Math.floor(f() * arr.length)];
    f.shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(f() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
    return f;
  }

  // ---------- 基本 ----------
  const zoneOf = f => Math.min(ZONES.length - 1, Math.floor((f - 1) / 10));
  // 寶石值：每升一區 +2，讓塔內成長跟得上越來越強的怪物
  const gemVal = f => 1 + Math.floor((f - 1) / 10) * 2;
  const isBoss = f => f % 10 === 0;
  const xy = i => [i % W, Math.floor(i / W)];
  const at = (x, y) => y * W + x;
  const nbrs = i => { const [x, y] = xy(i), o = []; if (x > 0) o.push(i - 1); if (x < W - 1) o.push(i + 1); if (y > 0) o.push(i - W); if (y < W - 1) o.push(i + W); return o; };
  const isMon = c => !!c && c[0] === 'm' && c[1] === ':';
  const isItem = c => c === 'c' || c === '$' || c.startsWith('c:') || c.startsWith('i:') || c.startsWith('t:') || (c.length === 2 && 'kgp'.includes(c[0]));
  // 可以站上去的格子（上下樓另外處理）
  const walkable = c => c === '' || c === 'O' || c === 'o' || c === '~' || c === '^' || c === 'x' || c.startsWith('T:') || isItem(c);

  // 樓層傷害單位 U：越高層成長越快（藥水、地形、怪物傷害都以它計）
  const unit = f => Math.round(20 + 8 * (f - 1) + 0.06 * (f - 1) * (f - 1));
  function mainRef(f) {
    let a = 10, d = 10;
    for (let i = 1; i < f; i++) { a += 2 * gemVal(i) * K.ref; d += 2 * gemVal(i) * K.ref; }
    return { A: Math.round(a), D: Math.round(d), U: unit(f) };
  }
  function dailyRef(base, f) {
    let a = base.atk, d = base.def;
    for (let i = 1; i < f; i++) { a += 2 * gemVal(i) * K.ref; d += 2 * gemVal(i) * K.ref; }
    return { A: Math.round(a), D: Math.round(d), U: Math.round(base.hp / 50 * (1 + 0.14 * (f - 1))) };
  }

  // ---------- 世界規則（新周目詛咒、挑戰詞綴、每日規則、季節） ----------
  function world(opts = {}) {
    const w = { atk: 1, def: 1, hp: 1, eliteHp: 1, bossAtk: 1, potion: 1, gem: 1, shop: 1, gold: 1, exp: 1,
      oddFirst: false, allFirst: false, dark: false, lessY: 0, lessB: 0, noPot: false, noBlue: false, patrolHalf: false,
      altarAll: false, merchAll: false, undeadExp: 1 };
    const c = opts.curse || 0;
    const cur = [() => w.atk *= 1.1, () => w.potion *= 0.8, () => w.eliteHp *= 1.25, () => w.lessY++, () => w.oddFirst = true,
      () => w.gem *= 0.8, () => w.shop *= 1.5, () => w.def *= 1.1, () => w.atk *= 1.1, () => w.dark = true,
      () => w.hp *= 1.15, () => w.potion *= 0.8, () => w.bossAtk *= 1.25, () => w.lessB++, () => w.def *= 1.1,
      () => w.atk *= 1.15, () => w.eliteHp *= 1.25, () => w.gem *= 0.85, () => w.hp *= 1.15, () => w.atk *= 1.2];
    for (let i = 0; i < Math.min(c, cur.length); i++) cur[i]();
    // 抗咒天賦：詛咒讓怪物增加的攻擊與生命打折
    if (opts.curseRes) for (const k of ['atk', 'hp', 'eliteHp', 'bossAtk']) w[k] = 1 + (w[k] - 1) * (1 - opts.curseRes);
    for (const m of opts.mods || []) {
      if (m === 'mAtk') w.atk *= 1.2;
      if (m === 'noPot') w.noPot = true;
      if (m === 'fewKey') w.lessY++;
      if (m === 'dark') w.dark = true;
      if (m === 'first') w.allFirst = true;
      if (m === 'halfGem') w.gem *= 0.5;
    }
    const r = opts.rule;
    if (r === 'gemNoPot') { w.gem *= 2; w.noPot = true; }
    if (r === 'noBlue') { w.noBlue = true; w.lessY++; }
    if (r === 'patrol') w.patrolHalf = true;
    if (r === 'gold') { w.gold *= 2; w.altarAll = true; }
    if (r === 'dark') { w.dark = true; w.exp *= 1.5; }
    if (r === 'merchant') w.merchAll = true;
    if (r === 'giant') { w.hp *= 1.5; w.exp *= 1.5; w.gold *= 1.5; }
    const s = opts.season;
    if (s === 'halloween') w.undeadExp = 2;
    if (s === 'winter') w.potion *= 1.5;
    if (s === 'spring') w.gold *= 1.5;
    if (s === 'summer') w.exp *= 1.5;
    return w;
  }

  // ---------- 怪物 ----------
  function monFx(code, fl) {
    const [, key, t] = code.split(':'), z = ZONES[fl.zone];
    return t === 'B' ? z.bossFx : t === 'E' ? z.eliteFx : (z.mobs.indexOf(key) >= 0 ? z.fx[z.mobs.indexOf(key)] : null);
  }
  function monster(code, fl, i) {
    const [, key, t, flags = ''] = code.split(':');
    const w = fl.w || world();
    const tier = t === 'B' ? BOSS_TIER : t === 'E' ? ELITE_TIER : t === 'R' ? GOLD_TIER : MON_TIERS[+t];
    const fx = t === 'R' ? null : monFx(code, fl);
    const { A, D, U } = fl.ref, f = fl.f, zone = fl.zone || 0;
    // 手工謎題已經驗證過可解，不套用難度倍率
    const kh = fl.layout === 'hand' ? 1 : K.hp * (1 + K.zoneHp * zone), kd = fl.layout === 'hand' ? 1 : K.dmg * (1 + K.zoneDmg * zone);
    let def = Math.floor(A * tier.rd * w.def);
    if (i !== undefined && i >= 0 && fx !== 'guard') {
      for (const j of nbrs(i)) { const c = fl.cells[j]; if (isMon(c) && monFx(c, fl) === 'guard') { def = Math.floor(def * 1.25); break; } }
    }
    const pd = Math.max(1, A - Math.floor(A * tier.rd));
    // 越高的區域，怪物越耐打、越痛
    let hp = (pd * tier.hits - Math.floor(pd * 0.3)) * w.hp * kh;
    if (t === 'E' || t === 'B') hp *= w.eliteHp;
    let hit = tier.dmg * U * w.atk * kd * (t === 'B' ? w.bossAtk : 1);
    if (fx === 'double') hit *= 0.55;
    if (fx === 'triple') hit *= 0.4;
    if (fx === 'drain') hit *= 0.6;
    if (fx === 'thorns' || fx === 'explode') hit *= 0.85;
    if (fx === 'rage' || fx === 'heavy') hit *= 0.78;
    if (fx === 'shock' || fx === 'pierce') hit *= 0.85;
    if (fx === 'chill') hit *= 0.9;
    if (fx === 'evade' || fx === 'armor') hp *= 0.8;
    if (fx === 'regen') hp *= 0.85;
    if (flags.includes('s')) { hp *= 0.3; hit *= 0.7; }
    if (flags.includes('r')) hp *= 0.5;
    hp = Math.max(1, Math.round(hp)); hit = Math.round(hit);
    // 怪物攻擊 = 參考防禦 + 每下傷害；穿刺只算你一半的防禦
    const atk = fx === 'magic' ? Math.round(hit * 0.8) : Math.round(D * (fx === 'pierce' ? 0.5 : 1) * w.atk) + hit;
    const fam = MON_FAMILY[key] || null;
    const odd = t !== 'B' && t !== 'E' && t !== 'R' && +t % 2 === 1;
    const exp = flags.includes('s') ? 0 : Math.round(tier.exp * (1 + f / 6) * w.exp * (flags.includes('r') ? 0.5 : 1) * (fam === 'undead' ? w.undeadExp : 1));
    return {
      key, code, name: (MON_NAMES[key] || key) + (flags.includes('s') ? '（分裂體）' : flags.includes('r') ? '（復活）' : ''), icon: 'mon/' + key, tier: t,
      hp, atk, def, fx, fam, U, flags,
      cap: fx === 'hard' ? Math.ceil(hp / tier.hits) : 0,
      first: fx === 'first' || w.allFirst || (w.oddFirst && odd),
      exp, gold: flags.includes('s') ? 0 : Math.round(tier.gold * (1 + f / 4) * w.gold),
      elite: t === 'E', boss: t === 'B', golden: t === 'R', guardian: flags.includes('G'), patrol: flags.includes('P'),
      revives: fx === 'undead' && !flags.includes('r'),
    };
  }

  // ---------- 戰鬥：一下一下推演雙方出手 ----------
  // P：{ atk, def, hp }；mods：英雄被動、寶物、技能、天賦、裝備、寵物等
  // 事件 by：h 英雄、m 怪物、p 寵物、s 英雄自己回血、r 怪物再生、x 狀態提示
  function duel(P, m, mods = {}) {
    let mdef = m.def;
    if (mods.pierce) mdef = 0;
    else {
      if (mods.analyze) mdef = Math.floor(mdef * (1 - mods.analyze));
      if (mods.magic) mdef = Math.floor(mdef * (1 - mods.magic));
      const brk = Math.min(0.6, (mods.petBreak || 0) + (mods.brk || 0));
      if (brk) mdef = Math.floor(mdef * (1 - brk));
    }
    let atk = P.atk * (1 + (mods.atkMult || 0));
    if (m.elite || m.boss) atk *= 1 + (mods.bossAtk || 0);
    if (m.fam && mods['fam_' + m.fam]) atk *= 1 + mods['fam_' + m.fam];
    atk = Math.floor(atk);
    let pd = atk - mdef;
    if (pd <= 0) return { can: false, reason: `攻擊需高於 ${mdef}`, dmg: Infinity, events: [], hits: 0 };
    if (m.cap && !mods.noHard) pd = Math.min(pd, m.cap);
    const mAtk = m.atk * (1 - (mods.bastion || 0));
    const pierce = m.fx === 'pierce' && !mods.noPierce;
    let base = m.fx === 'magic' ? mAtk : Math.max(0, mAtk - Math.floor(P.def * (pierce ? 0.5 : 1)));
    // 穿刺被擋下時，怪物的攻擊回到一般計算（但牠的攻擊值是照穿刺設計的，所以會變弱）
    if (m.fx === 'magic' && mods.magicRes) base *= 1 - Math.min(0.8, mods.magicRes);
    let keep = mods.shield ? 0 : (1 - (mods.reduce || 0)) * (1 - (mods.firstFight || 0));
    if ((m.elite || m.boss) && mods.bossRes) keep *= 1 - Math.min(0.5, mods.bossRes);
    const hitOf = mult => Math.floor(Math.floor(base * mult) * keep);
    const first = m.first && !mods.alwaysFirst && !mods.noFirst && !mods.bastionFirst;
    const hazard = Math.min(0.9, mods.hazard || 0);
    const ev = [];
    let total = 0, hits = 0, peak = 0;
    const hurt = d => { total += d; peak = Math.max(peak, total); };
    const heal = (h, by, mhp, tag) => { h = Math.min(h, total); if (h > 0) { total -= h; ev.push({ by, heal: h, mhp, tag }); } };
    // 寵物：開場撞擊、追擊（受硬甲上限限制）、受傷後治療
    const capPet = d => Math.max(1, m.cap && !mods.noHard ? Math.min(d, m.cap) : d);
    const petOpen = mods.petOpen ? capPet(Math.floor(pd * mods.petOpen)) : 0;
    const petHit = mods.petHit ? capPet(Math.floor(pd * mods.petHit)) : 0, every = mods.petEvery || 1;
    const evade = m.fx === 'evade' && !mods.noEvade, chill = m.fx === 'chill' && !mods.noChill;
    const rage = m.fx === 'rage', heavy = m.fx === 'heavy' && !mods.noHeavy;
    const shock = m.fx === 'shock' && !mods.noShock ? Math.floor(Math.max(1, Math.floor(m.U * 0.1 * (1 - hazard))) * (mods.shield ? 0 : 1)) : 0;
    const swings = m.fx === 'double' ? 2 : m.fx === 'triple' ? 3 : 1;
    const thorn = m.fx === 'thorns' && !mods.noThorns ? Math.max(1, Math.floor(m.U * 0.15 * (1 - hazard))) : 0;
    const fights = [m.hp];
    if (m.revives && !mods.cross) fights.push(Math.ceil(m.hp / 2));
    if (m.fx === 'drain') { const d = Math.floor(Math.floor(P.hp / 5) * keep); hurt(d); ev.push({ by: 'm', dmg: d, tag: '吸血', mhp: m.hp }); }
    let alive = false;
    fights.forEach((fhp, fi) => {
      if (alive) return;
      let mhp = fhp, skip = mods.skipFirstHit ? 1 : 0, n = 0, hn = 0, round = 0, swing = 0, armorLeft = m.fx === 'armor' ? 3 : 0;
      const regen = m.fx === 'regen' && !mods.noRegen ? Math.max(1, Math.floor(fhp * 0.08)) : 0;
      const mAttack = () => {
        round++;
        const mult = (m.boss && mhp <= fhp / 2 ? 1.3 : 1) * (rage ? 1 + 0.12 * (round - 1) : 1);
        for (let k = 0; k < swings; k++) {
          swing++;
          const big = heavy && swing % 3 === 0;
          const d = hitOf(big ? mult * 2.5 : mult); hurt(d); ev.push({ by: 'm', dmg: d, mhp, tag: big ? '重擊' : undefined });
          if (shock) { hurt(shock); ev.push({ by: 'm', dmg: shock, mhp, tag: '感電' }); }
          if (mods.petHeal && d) heal(Math.floor(d * mods.petHeal), 'p', mhp);
        }
        if (regen && mhp < fhp) { const r = Math.min(regen, fhp - mhp); mhp += r; ev.push({ by: 'r', heal: r, mhp }); }
      };
      if (fi > 0) ev.push({ by: 'x', tag: '再次站起！', mhp });
      if (fi === 0 && petOpen) { const d = Math.min(petOpen, mhp); mhp -= d; ev.push({ by: 'p', dmg: d, mhp }); if (mhp <= 0) return; }
      if (first) { if (skip) skip--; else mAttack(); }
      for (let guard = 0; guard < 400; guard++) {
        hn++;
        if (evade && hn % 3 === 0) ev.push({ by: 'h', dmg: 0, mhp, tag: '落空' });
        else {
          let d = pd;
          if (armorLeft > 0) { d = Math.max(1, Math.floor(d / 2)); armorLeft--; }
          d = Math.min(d, mhp); mhp -= d; hits++;
          ev.push({ by: 'h', dmg: d, mhp });
          if (mods.leech) heal(Math.floor(d * mods.leech), 's', mhp, '吸血');
          if (thorn) { hurt(thorn); ev.push({ by: 'm', dmg: thorn, tag: '反傷', mhp }); }
          if (mhp <= 0) break;
          if (petHit && ++n % every === 0) { const p = Math.min(petHit, mhp); mhp -= p; ev.push({ by: 'p', dmg: p, mhp }); if (mhp <= 0) break; }
        }
        if (skip) { skip--; continue; }
        if (chill && hn % 2 === 0) { ev.push({ by: 'x', tag: '被凍住了！', mhp }); mAttack(); }
        mAttack();
      }
      if (mhp > 0) alive = true;
    });
    if (alive) return { can: false, reason: '傷害不夠，打不倒牠（再生太快）', dmg: Infinity, events: [], hits: 0 };
    if (m.fx === 'explode' && !mods.noThorns) { const d = Math.floor(m.U * (1 - hazard)); hurt(d); ev.push({ by: 'm', dmg: d, tag: '爆炸', mhp: 0 }); }
    // 以戰鬥中最低點判斷撐不撐得住（治療是事後才補回來的）
    return { can: peak < P.hp, dmg: total, peak, events: ev, hits, reason: peak >= P.hp ? '生命不足' : '' };
  }

  // ---------- 地圖格局 ----------
  // 每個格局是一組房間矩形 [x, y, w, h]，房間之間用一格牆隔開
  const LAYOUTS = {
    rooms9:   [[0, 0, 3, 3], [4, 0, 3, 3], [8, 0, 3, 3], [0, 4, 3, 3], [4, 4, 3, 3], [8, 4, 3, 3], [0, 8, 3, 3], [4, 8, 3, 3], [8, 8, 3, 3]],
    rooms6:   [[0, 0, 5, 3], [6, 0, 5, 3], [0, 4, 5, 3], [6, 4, 5, 3], [0, 8, 5, 3], [6, 8, 5, 3]],
    hall:     [[0, 0, 11, 2], [0, 3, 2, 5], [3, 3, 5, 5], [9, 3, 2, 5], [0, 9, 5, 2], [6, 9, 5, 2]],
    columns:  [[0, 0, 3, 5], [0, 6, 3, 5], [4, 0, 3, 3], [4, 4, 3, 3], [4, 8, 3, 3], [8, 0, 3, 5], [8, 6, 3, 5]],
    mixed:    [[0, 0, 4, 4], [5, 0, 6, 4], [0, 5, 7, 2], [8, 5, 3, 6], [0, 8, 3, 3], [4, 8, 3, 3]],
    quad:     [[0, 0, 5, 5], [6, 0, 5, 5], [0, 6, 5, 5], [6, 6, 5, 5]],
    corridor: [[0, 0, 2, 11], [3, 0, 5, 3], [3, 4, 5, 3], [3, 8, 5, 3], [9, 0, 2, 5], [9, 6, 2, 5]],
  };
  const LAYOUT_KEYS = Object.keys(LAYOUTS);
  function transform(rects, R) {
    let r = rects.map(a => a.slice());
    if (R() < 0.5) r = r.map(([x, y, w, h]) => [W - x - w, y, w, h]);
    if (R() < 0.5) r = r.map(([x, y, w, h]) => [x, W - y - h, w, h]);
    if (R() < 0.5) r = r.map(([x, y, w, h]) => [y, x, h, w]);
    return r;
  }

  // ---------- 樓層產生 ----------
  function build(R, f, ref, w, opts) {
    const zi = zoneOf(f), zone = ZONES[zi], cells = Array(N).fill('#'), owner = Array(N).fill(-1);
    const boss = isBoss(f);
    const lay = boss ? 'quad' : R.pick(LAYOUT_KEYS);
    const rects = transform(LAYOUTS[lay], R);
    rects.forEach(([x, y, w2, h], r) => { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w2; xx++) { cells[at(xx, yy)] = ''; owner[at(xx, yy)] = r; } });
    const rooms = rects.map((_, r) => owner.map((o, i) => o === r ? i : -1).filter(i => i >= 0));
    const n = rooms.length;
    // 房間之間可以開門的牆
    const cand = {};
    for (let i = 0; i < N; i++) {
      if (cells[i] !== '#') continue;
      const [x, y] = xy(i);
      const pairs = [[x > 0 && x < W - 1 ? owner[i - 1] : -1, x > 0 && x < W - 1 ? owner[i + 1] : -1], [y > 0 && y < W - 1 ? owner[i - W] : -1, y > 0 && y < W - 1 ? owner[i + W] : -1]];
      for (const [a, b] of pairs) if (a >= 0 && b >= 0 && a !== b) { const k = Math.min(a, b) + '-' + Math.max(a, b); (cand[k] = cand[k] || []).push(i); }
    }
    const edges = Object.keys(cand).map(k => k.split('-').map(Number));
    const adj = r => edges.filter(([a, b]) => a === r || b === r).map(([a, b]) => a === r ? b : a);
    // 大房間加柱子（彼此不相鄰，不會切斷房間）
    for (let r = 0; r < n; r++) {
      const [x, y, w2, h] = rects[r];
      if (w2 < 3 || h < 3 || w2 * h < 12) continue;
      const inner = R.shuffle(rooms[r].filter(i => { const [cx, cy] = xy(i); return cx > x && cx < x + w2 - 1 && cy > y && cy < y + h - 1; }));
      const placed = [];
      for (const c of inner) {
        if (placed.length >= Math.floor(w2 * h / 10)) break;
        if (placed.some(p => { const [px, py] = xy(p), [cx, cy] = xy(c); return Math.abs(px - cx) <= 1 && Math.abs(py - cy) <= 1; })) continue;
        if (R() < 0.6) { cells[c] = '#'; placed.push(c); }
      }
    }
    // 生成樹
    const start = R.int(0, n - 1), depth = Array(n).fill(-1), parent = Array(n).fill(-1), order = [start];
    depth[start] = 0;
    const front = [start];
    while (order.length < n && front.length) {
      const a = R.pick(front), o2 = adj(a).filter(b => depth[b] < 0);
      if (!o2.length) { front.splice(front.indexOf(a), 1); continue; }
      const b = R.pick(o2); depth[b] = depth[a] + 1; parent[b] = a; order.push(b); front.push(b);
    }
    const kids = r => order.filter(c => parent[c] === r);
    const upRoom = order.reduce((best, r) => depth[r] > depth[best] ? r : best, order[order.length - 1]);
    const used = new Set();
    const free = r => rooms[r].filter(i => !used.has(i) && cells[i] === '');
    const put = (r, code) => { const c = free(r); if (!c.length) return -1; const i = R.pick(c); cells[i] = code; used.add(i); return i; };
    const mech = new Set(opts.mech || zone.mech);
    const mobCode = (d, flags = '') => {
      const t = Math.max(0, Math.min(8, Math.round(d * 1.1 + (f % 10) * 0.35 + R.int(-1, 1))));
      let fl = flags;
      if (!fl.includes('P') && ((mech.has('patrol') && R() < 0.25) || (w.patrolHalf && R() < 0.5))) fl += 'P';
      return `m:${zone.mobs[t]}:${t}${fl ? ':' + fl : ''}`;
    };

    // 起點、樓梯
    const startCell = put(start, '');
    const downCell = put(start, 'D');
    const upCell = put(upRoom, 'U');

    // 獎勵房：葉子房間，用藤蔓、暗牆、印記門或冰／岩漿擋住；不放關鍵鑰匙
    const leaves = R.shuffle(order.filter(r => r !== start && r !== upRoom && kids(r).length === 0));
    const bonus = new Map();
    const bonusKinds = ['vine', 'hidden', 'ice', 'lava'].filter(k => mech.has(k));
    if (R() < 0.25 && opts.heroes && opts.heroes.length) bonusKinds.push('rune');
    for (const r of leaves.slice(0, Math.min(2, bonusKinds.length))) bonus.set(r, R.pick(bonusKinds));

    // 依深度處理每道門：鑰匙一定放在門之前可到達、且不是獎勵房的房間
    const reached = [start];
    let seals = boss ? zone.seals : 0;
    const gateOf = (a, b) => R.pick(cand[Math.min(a, b) + '-' + Math.max(a, b)]);
    const byDepth = order.slice(1).sort((a, b) => depth[a] - depth[b]);
    const teleport = mech.has('teleport') && R() < 0.6;
    let tpUsed = false;
    for (const r of byDepth) {
      const g = gateOf(parent[r], r), b = bonus.get(r);
      const keyRoom = () => R.pick(reached.filter(x => !bonus.has(x)));
      if (b === 'vine') cells[g] = 'v';
      else if (b === 'hidden') cells[g] = 'h';
      else if (b === 'rune') cells[g] = 'q:' + R.pick(opts.heroes);
      else if (b === 'ice' || b === 'lava') { cells[g] = ''; const t = b === 'ice' ? '^' : 'x'; rooms[r].forEach(i => { if (cells[i] === '' && !nbrs(i).includes(g)) cells[i] = t; }); }
      else if (r === upRoom && boss) cells[g] = `m:${zone.boss}:B`;
      else if (teleport && !tpUsed && r !== upRoom) {
        cells[g] = '#'; tpUsed = true;
        if (put(keyRoom(), 'T:0') < 0 || put(r, 'T:0') < 0) cells[g] = '';
      } else {
        const x = R();
        let type = r === upRoom ? (x < 0.5 ? 'mon' : 'dY') : x < 0.22 ? 'open' : x < 0.6 ? 'dY' : (x < 0.72 && f >= 3 && !w.noBlue) ? 'dB' : x < 0.86 ? 'mon' : 'special';
        if (type === 'special') type = mech.has('iron') && R() < 0.5 ? 'iron' : mech.has('plate') ? 'plate' : 'mon';
        if (type === 'dY' || type === 'dB') { cells[g] = type; put(keyRoom(), 'k' + type[1]); }
        else if (type === 'mon') cells[g] = mobCode(depth[r] + 1);
        else if (type === 'iron') { cells[g] = 'I'; const kr = keyRoom(); put(kr, `m:${zone.mobs[4]}:4:G`); if (R() < 0.5) put(kr, `m:${zone.mobs[3]}:3:G`); }
        else if (type === 'plate') { cells[g] = 'L'; put(keyRoom(), 'o'); }
        else cells[g] = '';
      }
      // 首領的封印水晶分散在一路上的房間
      if (seals > 0 && r !== upRoom && !b) { put(r, 'X'); seals--; }
      if (!bonus.has(r)) reached.push(r);
    }
    while (seals-- > 0) put(R.pick(reached.filter(x => x !== upRoom)), 'X');
    // 額外的迴路（捷徑）
    const loops = R.shuffle(edges.filter(([a, b]) => parent[a] !== b && parent[b] !== a && !bonus.has(a) && !bonus.has(b)));
    for (const [a, b] of loops.slice(0, f > 2 ? R.int(1, 2) : 0)) {
      const g = gateOf(a, b);
      cells[g] = mech.has('hidden') && R() < 0.4 ? 'h' : R() < 0.5 ? 'dY' : mobCode(Math.max(depth[a], depth[b]));
    }

    // 房間內容
    const normalRooms = order.filter(r => !bonus.has(r));
    const weightRoom = () => { const ws = normalRooms.map(r => r === start ? 0.5 : depth[r] + 1); let x = R() * ws.reduce((s, v) => s + v, 0); for (let i = 0; i < normalRooms.length; i++) { x -= ws[i]; if (x <= 0) return normalRooms[i]; } return normalRooms[normalRooms.length - 1]; };
    for (const r of normalRooms) {
      if (r === start) { if (f > 1 && R() < 0.5) put(r, mobCode(0)); continue; }
      const cnt = boss ? R.int(0, 1) : Math.max(1, Math.round(rooms[r].length / 9)) * (R.int(0, 1) + (depth[r] >= 2 ? 1 : 0));
      for (let k = 0; k < cnt; k++) put(r, mobCode(depth[r]));
    }
    const gemsA = boss ? 1 : 2, gemsD = Math.max(0, (boss ? 1 : 2) - w.lessB);
    for (let k = 0; k < gemsA; k++) put(weightRoom(), 'gA');
    for (let k = 0; k < gemsD; k++) put(weightRoom(), 'gD');
    if (!w.noPot) {
      for (let k = 0, c = R.int(2, 3); k < c; k++) put(weightRoom(), 'pS');
      if (f % 3 === 0 || boss) put(weightRoom(), 'pL');
    }
    put(weightRoom(), '$');
    if (R() < 0.5 - 0.25 * w.lessY) put(R.pick(normalRooms), 'kY');
    if (f % 5 === 0 && !boss) { const rr = byDepth.filter(r => !bonus.has(r) && r !== upRoom).pop() ?? upRoom; put(rr, `m:${zone.elite}:E`); put(rr, 'c'); }
    if (boss) put(upRoom, 'c');
    else if (R() < 0.12) put(weightRoom(), 'c');
    // 獎勵房的寶物
    for (const [r, kind] of bonus) {
      const gifts = kind === 'rune' ? ['c', 'gA', 'gD'] : R.pick([['gA', 'gD'], ['c'], ['gA', 'pL'], ['gD', '$', 'pS']]);
      const spots = rooms[r].filter(i => cells[i] === '' || cells[i] === '^' || cells[i] === 'x');
      for (const g of gifts) { const s = spots.filter(i => !used.has(i)); if (!s.length) break; const i = R.pick(s); cells[i] = g; used.add(i); }
    }
    // 工具：每區第 2 層（打開本區機關的鑰匙）
    if (f % 10 === 2 && opts.tools !== false) put(R.pick(normalRooms.filter(r => r !== start)), 't:' + zone.tool);
    // 研究解鎖的道具
    for (const it of opts.items || []) if (R() < (it === 'feather' ? 0.12 : 0.3)) put(weightRoom(), 'i:' + it);
    // 毒沼
    if (mech.has('swamp')) for (const r of R.shuffle(normalRooms.filter(r => r !== start)).slice(0, 2)) rooms[r].forEach(i => { if (cells[i] === '' && !used.has(i) && R() < 0.35) cells[i] = '~'; });
    // NPC
    const npcRooms = normalRooms.length > 1 ? normalRooms.slice(1) : normalRooms;
    if (f % 5 === 2 || w.altarAll) put(R.pick(npcRooms), 'n:altar');
    if (f % 5 === 4 || w.merchAll) put(R.pick(npcRooms), 'n:merch');
    if (f % 10 === 1) put(start, 'n:sage');
    if (opts.season && f === 5) put(weightRoom(), 'c:' + opts.season);

    const dark = w.dark || (mech.has('dark') && R() < 0.5);
    return { f, zone: zi, cells, ref: { ...ref }, w, start: startCell, down: downCell, up: upCell, dark, layout: lay };
  }

  // ---------- 手工地圖解析 ----------
  // '#'牆 '.'地板 'S'起點 'D'下樓 'U'上樓 'y/b'黃藍門 'Y/B'黃藍鑰匙 'a/d'紅藍寶石 'p/P'小大藥水 '$'金幣 'c'寶箱
  // '0'-'8'怪物階級 'E'精英 'K'首領 'g'守衛 'I'鐵門 'o'壓力板 'L'機關門 'h'暗牆 '~'毒沼 'v'藤蔓 '^'冰 'x'岩漿
  // 'T'傳送陣（依出現順序兩兩配對） 'X'封印水晶 'n'修女 'm'商人 's'學者 'A'斧 'C'十字 'Z'冰爪 'F'冰霜 'M'提燈 '*'炸彈 'k'鎬 'f'羽毛
  function parseMap(rows, f, ref, w, zi) {
    const zone = ZONES[zi], cells = Array(N).fill('#');
    let start = 0, down = -1, up = -1, tp = 0;
    const map = { '#': '#', '.': '', y: 'dY', b: 'dB', Y: 'kY', B: 'kB', a: 'gA', d: 'gD', p: 'pS', P: 'pL', $: '$', c: 'c', I: 'I', o: 'o', L: 'L', h: 'h',
      '~': '~', v: 'v', '^': '^', x: 'x', X: 'X', n: 'n:altar', m: 'n:merch', s: 'n:sage', A: 't:axe', C: 't:cross', Z: 't:skates', F: 't:frost', M: 't:lamp',
      '*': 'i:bomb', k: 'i:pick', f: 'i:feather', U: 'U', D: 'D', E: `m:${zone.elite}:E`, K: `m:${zone.boss}:B`, g: `m:${zone.mobs[4]}:4:G` };
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
      const ch = (rows[y] || '')[x] || '#', i = at(x, y);
      if (ch === 'S') { start = i; cells[i] = ''; }
      else if (ch >= '0' && ch <= '8') cells[i] = `m:${zone.mobs[+ch]}:${ch}`;
      else if (ch === 'T') cells[i] = 'T:' + Math.floor(tp++ / 2);
      else cells[i] = map[ch] ?? '';
      if (ch === 'D') down = i;
      if (ch === 'U') up = i;
    }
    return { f, zone: zi, cells, ref: { ...ref }, w, start, down, up, dark: false, layout: 'hand' };
  }

  // ---------- 貪婪模擬：用參考玩家確認走得到上樓梯 ----------
  function simulate(fl, P0, extra = {}) {
    const cells = fl.cells.slice(), P = { ...P0 }, keys = { Y: 0, B: 0 };
    const pos = fl.start;
    let taken = 0, healed = 0;
    const pot = fl.w ? fl.w.potion : 1, gem = (fl.w ? fl.w.gem : 1) * gemVal(fl.f);
    const pass = c => c === '' || c === 'U' || c === 'O' || c === 'o' || c === '~' || c.startsWith('T:') || isItem(c);
    const pair = i => cells.findIndex((c, j) => j !== i && c === cells[i]);
    const view = { ...fl, cells };
    for (let guard = 0; guard < 400; guard++) {
      if (!cells.some(c => isMon(c) && (c.split(':')[3] || '').includes('G'))) for (let i = 0; i < N; i++) if (cells[i] === 'I') cells[i] = '';
      const seen = new Set([pos]), q = [pos], front = new Set();
      while (q.length) {
        const i = q.shift(), c = cells[i];
        if (c === 'U') return { ok: true, taken, healed };
        if (c === 'kY' || c === 'kB') { keys[c[1]]++; cells[i] = ''; }
        if (c === 'gA') { P.atk += gem; cells[i] = ''; }
        if (c === 'gD') { P.def += gem; cells[i] = ''; }
        if (c === 'pS' || c === 'pL') { const h = (c === 'pS' ? K.potS : K.potL) * fl.ref.U * pot; P.hp += h; healed += h; cells[i] = ''; }
        if (c === 'o') { cells[i] = 'O'; for (let j = 0; j < N; j++) if (cells[j] === 'L') cells[j] = ''; }
        if (c.startsWith('T:')) { const p = pair(i); if (p >= 0 && !seen.has(p)) { seen.add(p); q.push(p); } }
        for (const j of nbrs(i)) {
          if (seen.has(j)) continue;
          if (pass(cells[j])) { seen.add(j); q.push(j); }
          else if (cells[j] === 'dY' || cells[j] === 'dB' || cells[j] === 'X' || isMon(cells[j])) front.add(j);
        }
      }
      let best = null, bestCost = Infinity;
      const sealed = cells.includes('X');
      for (const j of front) {
        const c = cells[j];
        if (c === 'X') { best = j; bestCost = -1; break; }
        if (c === 'dY' && keys.Y > 0 && bestCost > 0) { best = j; bestCost = 0; }
        else if (c === 'dB' && keys.B > 0 && bestCost > 1) { best = j; bestCost = 1; }
        else if (isMon(c)) {
          const m = monster(c, view, j);
          if (m.boss && sealed) continue;
          const pr = duel(P, m, extra);
          if (pr.can && pr.dmg + 2 < bestCost) { best = j; bestCost = pr.dmg + 2; }
        }
      }
      if (best === null) return { ok: false, taken, healed };
      const c = cells[best];
      if (c === 'X') cells[best] = '';
      else if (c[0] === 'd') { keys[c[1]]--; cells[best] = ''; }
      else {
        const m = monster(c, view, best), pr = duel(P, m, extra);
        P.hp -= pr.dmg; taken += pr.dmg; cells[best] = '';
        if (m.fx === 'split' && !m.flags.includes('s')) nbrs(best).filter(k => cells[k] === '').slice(0, 2).forEach(k => cells[k] = `m:${m.key}:${m.tier}:s`);
      }
    }
    return { ok: false, taken, healed };
  }

  // 回溯搜尋：試各種開門與打怪的順序，回傳抵達上樓時最多能剩下的生命（-1 表示解不開）
  function solve(fl, P0, maxStates = 30000) {
    const pot = fl.w ? fl.w.potion : 1, gem = (fl.w ? fl.w.gem : 1) * gemVal(fl.f);
    const pass = c => c === '' || c === 'U' || c === 'O' || c === 'o' || c === '~' || c.startsWith('T:') || isItem(c);
    const memo = new Map();
    let best = -1, states = 0;
    function expand(cells, P, keys) {
      // 自動撿起能走到的道具、踩壓力板、守衛全倒就開鐵門
      for (let changed = true; changed;) {
        changed = false;
        if (cells.includes('I') && !cells.some(c => isMon(c) && (c.split(':')[3] || '').includes('G'))) { for (let i = 0; i < N; i++) if (cells[i] === 'I') cells[i] = ''; changed = true; }
        const seen = new Set([fl.start]), q = [fl.start];
        while (q.length) {
          const i = q.shift(), c = cells[i];
          if (c === 'kY' || c === 'kB') { keys[c[1]]++; cells[i] = ''; changed = true; }
          else if (c === 'gA') { P.atk += gem; cells[i] = ''; changed = true; }
          else if (c === 'gD') { P.def += gem; cells[i] = ''; changed = true; }
          else if (c === 'pS' || c === 'pL') { P.hp += (c === 'pS' ? K.potS : K.potL) * fl.ref.U * pot; cells[i] = ''; changed = true; }
          else if (c === 'o') { cells[i] = 'O'; for (let j = 0; j < N; j++) if (cells[j] === 'L') cells[j] = ''; changed = true; }
          if (c.startsWith('T:')) { const p = cells.findIndex((x, j) => j !== i && x === c); if (p >= 0 && !seen.has(p)) { seen.add(p); q.push(p); } }
          for (const j of nbrs(i)) if (!seen.has(j) && pass(cells[j])) { seen.add(j); q.push(j); }
        }
        if (!changed) return seen;
      }
    }
    function dfs(cells, P, keys) {
      if (++states > maxStates) return;
      const seen = expand(cells, P, keys);
      if ([...seen].some(i => cells[i] === 'U')) { best = Math.max(best, P.hp); return; }
      const k = cells.join('|') + keys.Y + ',' + keys.B + ',' + P.atk + ',' + P.def;
      if ((memo.get(k) ?? -1) >= P.hp) return;
      memo.set(k, P.hp);
      const front = new Set();
      for (const i of seen) for (const j of nbrs(i)) if (!seen.has(j)) front.add(j);
      const acts = [];
      const sealed = cells.includes('X');
      for (const j of front) {
        const c = cells[j];
        if (c === 'X') acts.push([j, 0]);
        else if ((c === 'dY' && keys.Y) || (c === 'dB' && keys.B)) acts.push([j, 0]);
        else if (isMon(c)) {
          const m = monster(c, { ...fl, cells }, j);
          if (m.boss && sealed) continue;
          const pr = duel(P, m);
          if (pr.can) acts.push([j, pr.dmg, m]);
        }
      }
      acts.sort((a, b) => a[1] - b[1]);
      for (const [j, cost, m] of acts) {
        const c2 = cells.slice(), P2 = { ...P }, k2 = { ...keys };
        if (c2[j][0] === 'd') k2[c2[j][1]]--;
        P2.hp -= cost; c2[j] = '';
        if (m && m.fx === 'split' && !m.flags.includes('s')) nbrs(j).filter(x => c2[x] === '').slice(0, 2).forEach(x => c2[x] = `m:${m.key}:${m.tier}:s`);
        dfs(c2, P2, k2);
      }
    }
    dfs(fl.cells.slice(), { ...P0 }, { Y: 0, B: 0 });
    return { best, states };
  }

  function genFloor(seed, f, ref, w, opts = {}) {
    let last = null;
    for (let attempt = 0; attempt < 50; attempt++) {
      const R = rng(hash(`${seed}:${f}:${attempt}`));
      const fl = build(R, f, ref, w, opts);
      if (attempt >= 30) fl.ref.A = Math.round(fl.ref.A * 0.85); // 多次失敗就降低怪物防禦
      const sim = simulate(fl, { hp: 1e9, atk: ref.A, def: ref.D });
      last = fl;
      // 高區的怪物傷害有額外倍率，驗證門檻跟著放寬
      const zk = 1 + K.zoneDmg * zoneOf(f);
      if (sim.ok && sim.taken - sim.healed <= 16 * ref.U * zk && sim.taken <= 45 * ref.U * zk) return fl;
    }
    return last;
  }

  return { W, N, MAIN_SEED, K, LAYOUTS, hash, rng, zoneOf, gemVal, isBoss, xy, at, nbrs, isMon, isItem, walkable,
    mainRef, dailyRef, world, monster, monFx, duel, parseMap, simulate, solve, genFloor, build };
})();
