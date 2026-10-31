// 爬塔遊玩：移動、地形、拾取、戰鬥、機關、NPC、技能、星級、結局，以及塔的畫面
const Play = {
  busy: false,
  mode: null,         // 'wall'（穿牆術）| 'pick'（開鎖）| 'midas'（點金術）| 'tool'（破牆鎬）
  get key() { return Store.S.tower.inside; },
  get T() { return this.key ? Store.S.tower[this.key] : null; },
  fl() { return this.T.floors[this.T.floor]; },
  hero() { return HEROES[Store.S.active]; },
  hs() { return Store.S.heroes[Store.S.active]; },
  today: () => Store.today(),
  weekId() { const d = new Date(); const j = new Date(d.getFullYear(), 0, 1); return `${d.getFullYear()}-w${Math.ceil(((d - j) / 86400000 + j.getDay() + 1) / 7)}`; },
  dailyRule() { return DAILY_RULES[Tower.hash('rule-' + this.today()) % DAILY_RULES.length]; },
  season() {
    const d = new Date(), md = (d.getMonth() + 1) * 100 + d.getDate();
    return SEASONS.find(s => { const a = s.from[0] * 100 + s.from[1], b = s.to[0] * 100 + s.to[1]; return a <= b ? md >= a && md <= b : md >= a || md <= b; }) || null;
  },

  // ---------- 屬性與修正 ----------
  // 戰鬥用的修正（英雄被動、覺醒、技能、寶物、天賦、工具）
  mods() {
    const T = this.T, S = Store.S, m = {}, h = S.active, aw = this.hs().awaken, br = this.hs().branch;
    if (T.fixed) return { cross: !!T.tools.cross };
    for (const id of T.treasures) { const t = TREASURES[id].mods; for (const k in t) m[k] = (m[k] || 0) + t[k]; }
    if (h === 'knight') m.reduce = aw >= 1 ? 0.18 : 0.1;
    if (h === 'ranger') { m.alwaysFirst = 1; if (aw >= 1) m.fam_beast = (m.fam_beast || 0) + 0.2; }
    if (h === 'wizard') m.magic = aw >= 1 ? 0.35 : 0.2;
    if (h === 'assassin') m.goldPct = (m.goldPct || 0) + (aw >= 1 ? 0.8 : 0.5);
    if (h === 'vampire') m.killHeal = (m.killHeal || 0) + (aw >= 1 ? 1.2 : 0.8);
    if (h === 'catkin') m.goldPct = (m.goldPct || 0) + (aw >= 1 ? 1.5 : 1);
    if (h === 'apprentice' && aw >= 1) m.expPct = (m.expPct || 0) + 0.2;
    if (T.flags.shield) m.shield = 1;
    if (T.flags.pierce) { m.pierce = 1; if (br === 'B' && h === 'ranger') m.skipFirstHit = 1; }
    if (T.flags.analyze) m.analyze = br === 'B' && h === 'apprentice' ? 0.75 : 0.5;
    if (T.flags.bastion === T.floor) { m.bastion = br === 'A' && h === 'guardian' ? 0.3 : 0.2; if (br === 'B' && h === 'guardian') m.bastionFirst = 1; }
    if (T.tools.cross) { m.cross = 1; m.fam_undead = (m.fam_undead || 0) + 0.2; }
    m.bossAtk = (m.bossAtk || 0) + S.talents.hunter * 0.05;
    m.hazard = S.talents.antidote * 0.25;
    const firstFight = !T.fought || T.fought !== T.floor;
    if (firstFight && S.talents.fury) m.atkMult = (m.atkMult || 0) + S.talents.fury * 0.1;
    if (firstFight && S.talents.aegis) m.firstFight = 0.5;
    if (T.curseDebuff) m.atkMult = (m.atkMult || 0) - T.curseDebuff;
    return m;
  },
  P() {
    const T = this.T, m = this.mods();
    if (T.fixed) return { atk: T.fixed.atk + T.gAtk, def: T.fixed.def + T.gDef, hp: T.hp };
    const hs = Store.heroStats(Store.S.active);
    const meal = T.meal ? { soup: [0.05, 0], stew: [0, 0.05], feast: [0.1, 0.1] }[T.meal] || [0, 0] : [0, 0];
    return {
      atk: Math.floor((hs.atk + T.gAtk) * (1 + (m.atkPct || 0) + meal[0])),
      def: Math.floor((hs.def + T.gDef) * (1 + (m.defPct || 0) + meal[1])),
      hp: T.hp,
    };
  },
  U() { return this.fl().ref.U; },
  w() { return this.fl().w || Tower.world(); },
  gold(n) { return Math.round(n * (1 + Store.S.talents.fortune * 0.1 + (this.mods().goldPct || 0)) * (Store.buff('gold') ? 1.3 : 1)); },
  soulMult() { return (1 + Store.S.talents.reaper * 0.1) * (Store.buff('soul') ? 1.25 : 1) * (this.key !== 'main' && Store.has('stars') ? 1.25 : 1) * (1 + ((this.T && this.T.curse) || 0) * 0.15); },
  potionMult() { const T = this.T; return this.w().potion * (1 + Store.S.talents.alchemy * 0.1 + (Store.has('potions') ? 0.2 : 0) + (this.mods().potionPct || 0)) * (Store.S.active === 'vampire' && !T.fixed ? 0.5 : 1); },
  gemMult(kind) {
    const T = this.T, h = Store.S.active, aw = this.hs().awaken, m = this.mods();
    let g = this.w().gem * (1 + (m.gemPct || 0));
    if (!T.fixed && h === 'guardian') g *= kind === 'A' ? (aw >= 1 ? 0.85 : 0.75) : (aw >= 1 ? 1.75 : 1.5);
    if (!T.fixed && h === 'catkin') g *= aw >= 1 ? 0.85 : 0.75;
    return g;
  },
  skillMax() {
    const T = this.T;
    if (T.fixed) return 0;
    const h = this.hs();
    return this.hero().skill.uses + (h.branch === 'A' ? 1 : 0) + Store.S.talents.focus + (this.mods().skillPlus || 0) + (T.meal === 'pie' ? 1 : 0);
  },
  skillLeft() { const s = this.T.skill; return s.f === this.T.floor ? this.skillMax() - s.n : this.skillMax(); },
  sees(kind) {
    const T = this.T, h = Store.S.active;
    if (kind === 'hidden') return h === 'apprentice' || Store.S.talents.scout > 0;
    if (kind === 'invisible') return h === 'apprentice' || Store.has('bestiary');
    return false;
  },
  sight() { return 3 + (Store.has('maps') ? 2 : 0) + (Store.S.active === 'apprentice' ? 2 : 0); },

  // ---------- 建立 / 進出 ----------
  blank(mode, hp) {
    return { mode, floor: 1, pos: 0, hp, gAtk: 0, gDef: 0, gold: 0, keys: { Y: 0, B: 0 }, potions: 0, items: { bomb: 0, pick: 0, feather: 0 }, tools: {},
      floors: {}, maxFloor: 0, shopBuys: 0, skill: { f: 1, n: 0 }, poison: 0, treasures: [], flags: {}, log: '', curse: 0, curseDebuff: 0, fought: 0, meal: null };
  },
  genOpts() {
    const S = Store.S;
    return { items: Object.keys(ITEMS).filter(k => Store.has(ITEMS[k].research)), heroes: HERO_ORDER.filter(h => S.heroes[h].owned) };
  },
  enter(key) {
    const S = Store.S;
    if (key === 'main' && !S.tower.main) {
      S.tower.main = Object.assign(this.blank('main', Store.heroStats(S.active).hp), { curse: S.tower.cycle });
    }
    if (key === 'daily' && (!S.tower.daily || S.tower.daily.date !== this.today())) {
      const hs = Store.heroStats(S.active), season = this.season();
      const best = (S.tower.dailyBest && S.tower.dailyBest.date === this.today()) ? S.tower.dailyBest.best : 0;
      const T = Object.assign(this.blank('daily', hs.hp), { date: this.today(), seed: 'daily-' + this.today(), base: hs, best, prevBest: best,
        rule: this.dailyRule().id, mods: S.tower.mods.slice(), season: season ? season.id : null,
        bonus: 1 + S.tower.mods.reduce((s, k) => s + MODIFIERS[k].bonus, 0) });
      const t = S.talents.blessing && this.rollTreasure(T);
      if (t) T.treasures.push(t);
      for (const id of S.memory.equipped) if (!T.treasures.includes(id)) T.treasures.push(id);
      T.keys.Y += S.talents.locksmith;
      S.tower.daily = T;
    }
    if (key === 'weekly') {
      const wk = this.weekId();
      if (!S.tower.weekly || S.tower.weekly.week !== wk) {
        const order = Tower.rng(Tower.hash(wk)).shuffle(PUZZLES.map((_, i) => i)).slice(0, 3);
        const levels = (window.Levels && Levels.list()) || [];
        const custom = levels.filter(l => l.type === 'weekly').slice(0, 3);
        const T = Object.assign(this.blank('weekly', 0), { week: wk, puzzles: order, custom: custom.length ? custom : null });
        S.tower.weekly = T;
      }
      const T = S.tower.weekly;
      if (!T.started || T.done) {
        const first = T.custom ? T.custom[0] : PUZZLES[T.puzzles[0]];
        Object.assign(T, this.blank('weekly', first.hero.hp), { week: T.week, puzzles: T.puzzles, custom: T.custom, fixed: { ...first.hero }, started: true, done: false });
      }
    }
    S.tower.inside = key;
    const T = this.T;
    // 料理：進塔前吃一道
    if (S.farm.meal && key !== 'weekly') {
      const id = S.farm.meal;
      if ((S.farm.dishes[id] || 0) > 0) { S.farm.dishes[id]--; T.meal = id; T.mealHp = id === 'bread'; FX.toast(`吃了${DISHES[id].name}：${DISHES[id].desc}`); }
      S.farm.meal = null;
    }
    // 主塔：把倉庫裡做好的鑰匙與藥水帶進去
    if (key === 'main') {
      const got = [];
      for (const k of ['Y', 'B']) { const n = Math.floor(S.stash[k]); if (n) { T.keys[k] += n; S.stash[k] -= n; got.push(`${n} 把${k === 'Y' ? '黃' : '藍'}鑰匙`); } }
      const p = Math.floor(S.stash.potion); if (p) { T.potions += p; S.stash.potion -= p; got.push(`${p} 瓶藥水`); }
      if (got.length) FX.toast('從營地帶來 ' + got.join('、'));
    }
    this.goFloor(T.floor, T.maxFloor ? 'stay' : 'start');
    if (T.mealHp) { T.hp += 6 * this.U(); T.mealHp = false; }
    S.stats.towers++;
    App.go('run');
  },
  leave() {
    const T = this.T;
    if (this.key === 'daily') return this.endDaily();
    if (this.key === 'weekly') return this.endWeekly(false);
    Store.S.tower.inside = null;
    T.meal = null;
    this.mode = null;
    FX.setTheme(null); App.closeSheet(); App.commit();
    FX.toast(`已回營地，主塔進度保留在第 ${T.floor} 層`);
  },
  async endDaily() {
    const ok = await FX.modal('<h3>結束今日挑戰？</h3><p class="dim">今天之內可以重新挑戰，但只有超過今日最高層的樓層才有獎勵。</p>',
      [{ label: '繼續爬', value: false }, { label: '結束', value: true, cls: 'primary' }]);
    if (!ok) return;
    const S = Store.S, T = this.T;
    S.tower.dailyBest = { date: T.date, best: Math.max(T.best, T.maxFloor) };
    S.tower.daily = null; S.tower.inside = null;
    FX.setTheme(null); App.closeSheet(); App.commit();
    FX.modal(`<div class="center">${UI.ico('item/torch', 'hero-ico')}<h3>今日挑戰結束</h3><p>抵達第 ${T.maxFloor} 層</p><p class="dim">明天會出現一座全新的挑戰塔</p></div>`);
  },
  async endWeekly(cleared) {
    const S = Store.S, T = this.T, soulMult = this.soulMult();
    if (!cleared) {
      const ok = await FX.modal('<h3>放棄這次謎題挑戰？</h3><p class="dim">本週可以重新開始，最佳紀錄會保留。</p>', [{ label: '繼續', value: false }, { label: '放棄', value: true, cls: 'primary' }]);
      if (!ok) return;
    }
    T.done = true; S.tower.inside = null;
    FX.setTheme(null); App.closeSheet();
    if (cleared) {
      const prev = S.tower.weeklyBest && S.tower.weeklyBest.week === T.week ? S.tower.weeklyBest.score : -1;
      const first = prev < 0;
      S.tower.weeklyBest = { week: T.week, score: Math.max(prev, T.hp) };
      S.stats.weekly++;
      const soul = first ? Math.round(30 * soulMult) : 0;
      S.res.soul += soul;
      if (first) S.res.ember += 1;
      App.commit();
      FX.sfx('win');
      FX.modal(`<div class="center">${UI.ico('item/scroll_red', 'hero-ico')}<h3>謎題塔完成！</h3><p>剩餘生命 <b class="gold">${T.hp}</b>${T.hp > prev && !first ? '（新紀錄！）' : ''}</p>
        ${first ? `<div class="loot"><span>${UI.res('soul')}+${soul}</span><span>${UI.res('ember')}+1</span></div>` : '<p class="dim">本週獎勵已領過，挑戰更高分吧</p>'}</div>`);
    } else App.commit();
  },

  // 進入樓層：'start' 從入口出現、'top' 從上樓梯旁出現、'stay' 保持位置
  goFloor(f, where) {
    const T = this.T, S = Store.S;
    if (!T.floors[f]) T.floors[f] = this.makeFloor(f);
    const fl = T.floors[f];
    if (T.floor !== f) { T.curseDebuff = 0; T.flags.bastion = 0; }
    T.floor = f;
    if (where === 'start') T.pos = fl.start;
    if (where === 'top') T.pos = Tower.nbrs(fl.up).find(i => Tower.walkable(fl.cells[i])) ?? fl.start;
    if (f > T.maxFloor) this.firstReach(f);
    FX.setTheme(fl.zone);
    this.mode = null;
    this.reveal();
  },
  makeFloor(f) {
    const T = this.T, key = this.key;
    let fl;
    if (key === 'weekly') {
      const p = T.custom ? T.custom[f - 1] : PUZZLES[T.puzzles[f - 1]];
      fl = Tower.parseMap(p.map, f, { A: 10, D: 10, U: 20 }, Tower.world(), (T.custom ? f : T.puzzles[f - 1]) % ZONES.length);
      fl.name = p.name;
    } else if (key === 'main') {
      const w = Tower.world({ curse: T.curse });
      fl = Tower.genFloor(Tower.MAIN_SEED + ':' + T.curse, f, Tower.mainRef(f), w, this.genOpts());
      if (f === FINAL_FLOOR) fl.cells = fl.cells.map(c => c === 'U' ? '' : c);
    } else {
      const w = Tower.world({ mods: T.mods, rule: T.rule, season: T.season });
      const s = T.season ? SEASONS.find(x => x.id === T.season) : null;
      fl = Tower.genFloor(T.seed, f, Tower.dailyRef(T.base, f), w, { ...this.genOpts(), season: s ? s.treasure : null });
    }
    fl.seen = fl.dark ? Array(Tower.N).fill(0) : null;
    fl.pat = {};
    return fl;
  },
  firstReach(f) {
    const T = this.T, S = Store.S;
    T.maxFloor = f;
    if (this.key === 'weekly') return;
    if (f % 10 === 1 && f > 1) T.keys.Y += S.talents.locksmith;
    if (this.key === 'main') {
      S.stats.bestFloor = Math.max(S.stats.bestFloor, f);
      if (f % 10 === 1) setTimeout(() => this.zoneIntro(Tower.zoneOf(f)), 300);
      if (f > 1) { const s = Math.round((1 + f / 3) * this.soulMult()); S.res.soul += s; FX.toast(`首次抵達第 ${f} 層：魂晶 +${s}`); }
    } else {
      S.stats.bestDaily = Math.max(S.stats.bestDaily, f);
      if (f > T.best && f > 1) {
        const s = Math.round((2 + f * 0.5) * this.soulMult() * (T.bonus || 1));
        S.res.soul += s;
        let msg = `挑戰塔新紀錄 第 ${f} 層：魂晶 +${s}`;
        if (f % 10 === 0) { S.res.ember += 1; msg += '、餘燼 +1'; }
        T.best = f;
        FX.toast(msg, 'gold');
      }
    }
  },
  zoneIntro(z) {
    const S = Store.S, key = 'zone' + z + '-' + (this.T.curse || 0);
    if (S.story[key]) return;
    S.story[key] = 1;
    const zone = ZONES[z];
    FX.modal(`<div class="center"><h3>${zone.name}</h3><p>${zone.story}</p><p class="dim">本區機關：${zone.mech.map(m => MECH_NAMES[m]).join('、')}</p></div>`, [{ label: '前進', value: true, cls: 'primary' }]);
  },

  // ---------- 視野（黑暗樓層） ----------
  reveal() {
    const fl = this.fl();
    if (!fl.seen) return;
    if (this.T.tools.lamp) { fl.seen.fill(1); return; }
    const [px, py] = Tower.xy(this.T.pos), r = this.sight();
    for (let i = 0; i < Tower.N; i++) { const [x, y] = Tower.xy(i); if ((x - px) ** 2 + (y - py) ** 2 <= r * r + 1) fl.seen[i] = 1; }
  },
  visible(i) { const fl = this.fl(); return !fl.seen || fl.seen[i]; },

  // ---------- 移動 ----------
  enterable(c, allow = {}) {
    if (c === '~' && !allow.swamp) return false;
    if (c === 'x' && !allow.lava) return false;
    return Tower.walkable(c);
  },
  // 往某方向走一步會停在哪裡（冰面會一直滑、傳送陣會傳送）；回傳 { to, via }
  move(from, dir, allow = {}, cells = this.fl().cells) {
    const [x, y] = Tower.xy(from), [dx, dy] = dir, nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= Tower.W || ny >= Tower.W) return null;
    let cur = Tower.at(nx, ny);
    if (!this.enterable(cells[cur], allow)) return null;
    const via = [cur];
    if (!this.T.tools.skates) {
      while (cells[cur] === '^') {
        const [cx, cy] = Tower.xy(cur), tx = cx + dx, ty = cy + dy;
        if (tx < 0 || ty < 0 || tx >= Tower.W || ty >= Tower.W) break;
        const t = Tower.at(tx, ty);
        if (!this.enterable(cells[t], { swamp: true, lava: allow.lava })) break;
        cur = t; via.push(t);
      }
    }
    if (cells[cur].startsWith('T:')) {
      const p = cells.findIndex((c, j) => j !== cur && c === cells[cur]);
      if (p >= 0) { cur = p; via.push(p); }
    }
    return { to: cur, via };
  },
  DIRS: [[0, -1], [0, 1], [-1, 0], [1, 0]],
  // 找路：先避開毒沼與岩漿，走不到再放寬；target 可以是上下樓
  path(from, to) {
    const cells = this.fl().cells, frost = !!this.T.tools.frost;
    const passes = [{}, { swamp: true }, { swamp: true, lava: frost }, { swamp: true, lava: true }];
    for (const allow of passes) {
      const prev = new Map([[from, null]]), q = [from];
      while (q.length) {
        const i = q.shift();
        if (i === to) break;
        for (const d of this.DIRS) {
          const [x, y] = Tower.xy(i), nx = x + d[0], ny = y + d[1];
          if (nx < 0 || ny < 0 || nx >= Tower.W || ny >= Tower.W) continue;
          const n = Tower.at(nx, ny);
          if (n === to && (cells[n] === 'U' || cells[n] === 'D') && !prev.has(n)) { prev.set(n, { i, via: [n] }); q.push(n); continue; }
          const mv = this.move(i, d, allow);
          if (!mv || prev.has(mv.to)) continue;
          prev.set(mv.to, { i, via: mv.via }); q.push(mv.to);
        }
      }
      if (prev.has(to)) {
        const out = [];
        for (let k = to; prev.get(k); k = prev.get(k).i) out.unshift(prev.get(k).via);
        return out;
      }
    }
    return null;
  },
  // 走到目標旁邊（目標本身不可走）
  pathNear(target) {
    if (Tower.nbrs(target).includes(this.T.pos)) return [];
    let best = null;
    for (const j of Tower.nbrs(target)) {
      if (!Tower.walkable(this.fl().cells[j])) continue;
      const p = this.path(this.T.pos, j);
      if (p && p.length && p[p.length - 1].slice(-1)[0] === j && (!best || p.length < best.length)) best = p;
    }
    return best;
  },

  async walk(steps) {
    for (const via of steps) {
      for (const i of via) {
        this.T.pos = i;
        const stop = this.onStep(i);
        this.drawToken();
        await sleep(via.length > 1 ? 55 : 85);
        if (stop) return false;
        if (!this.T) return false;
      }
      this.afterStep();
      if (!this.T) return false;
    }
    return true;
  },
  // 每走一步：毒、巡邏怪移動、視野、星級
  afterStep() {
    const T = this.T, fl = this.fl();
    if (T.poison) {
      const d = Math.max(1, Math.round(this.U() * 0.15 * (1 - Store.S.talents.antidote * 0.25)));
      T.hp = Math.max(1, T.hp - d);
    }
    this.patrol();
    this.reveal();
    this.checkStars();
    this.drawBoard(); this.drawHud();
  },
  patrol() {
    const fl = this.fl(), cells = fl.cells, moved = new Set();
    for (let i = 0; i < Tower.N; i++) {
      const c = cells[i];
      if (!Tower.isMon(c) || !(c.split(':')[3] || '').includes('P') || moved.has(i)) continue;
      if (Tower.nbrs(i).includes(this.T.pos)) continue; // 你站在旁邊時，牠會停下來面對你
      let d = fl.pat[i] ?? 3;
      const tryDir = dd => {
        const [x, y] = Tower.xy(i), nx = x + this.DIRS[dd][0], ny = y + this.DIRS[dd][1];
        if (nx < 0 || ny < 0 || nx >= Tower.W || ny >= Tower.W) return -1;
        const n = Tower.at(nx, ny);
        return cells[n] === '' && n !== this.T.pos ? n : -1;
      };
      let n = tryDir(d);
      if (n < 0) { d = d ^ 1; n = tryDir(d); }
      if (n < 0) { d = (d + 2) % 4; n = tryDir(d); }
      delete fl.pat[i];
      if (n >= 0) { cells[n] = c; cells[i] = ''; fl.pat[n] = d; moved.add(n); } else fl.pat[i] = d;
    }
  },

  // 踩到東西：撿起道具、地形效果、上下樓；回傳 true 表示要停下
  onStep(i) {
    const T = this.T, fl = this.fl(), c = fl.cells[i], U = this.U(), m = this.mods();
    const tok = () => document.getElementById('heroTok');
    if (c === 'U') { this.climb(1); return true; }
    if (c === 'D') { this.climb(-1); return true; }
    if (!c || c === 'O' || c === '^' || c.startsWith('T:')) return false;
    if (c === '~') {
      if (!m.noPoison && !T.poison) { T.poison = 1; FX.float(tok(), '中毒', 'poison'); }
      return false;
    }
    if (c === 'x') {
      if (!T.tools.frost) { const d = Math.round(2 * U * (1 - Store.S.talents.antidote * 0.25)); T.hp = Math.max(1, T.hp - d); FX.float(tok(), '岩漿 -' + d, 'hurt'); }
      return false;
    }
    if (c === 'o') {
      fl.cells[i] = 'O';
      let n = 0; fl.cells.forEach((x, j) => { if (x === 'L') { fl.cells[j] = ''; n++; } });
      FX.sfx('block'); FX.toast(n ? '壓力板被踩下，石門打開了' : '壓力板被踩下');
      return false;
    }
    let msg = '', cls = 'heal';
    if (c[0] === 'k') { T.keys[c[1]]++; msg = (c[1] === 'Y' ? '黃' : '藍') + '鑰匙 +1'; cls = 'status'; }
    if (c === 'gA' || c === 'gD') {
      const v = Math.max(1, Math.round(Tower.gemVal(T.floor) * this.gemMult(c[1])));
      if (c === 'gA') { T.gAtk += v; msg = `攻擊 +${v}`; cls = 'crit'; } else { T.gDef += v; msg = `防禦 +${v}`; cls = 'status'; }
    }
    if (c === 'pS' || c === 'pL') { const h = Math.round((c === 'pS' ? Tower.K.potS : Tower.K.potL) * U * this.potionMult()); T.hp += h; T.poison = 0; msg = `生命 +${h}`; }
    if (c === '$') { const g = this.gold(U * 0.6 * this.w().gold); T.gold += g; msg = `金幣 +${g}`; cls = 'crit'; }
    if (c.startsWith('i:')) { const k = c.slice(2); T.items[k] = (T.items[k] || 0) + 1; msg = ITEMS[k].name + ' +1'; cls = 'status'; }
    if (c.startsWith('t:')) {
      const k = c.slice(2); T.tools[k] = 1; fl.cells[i] = '';
      FX.sfx('win'); this.drawBoard(); this.drawHud();
      FX.modal(`<div class="center">${UI.ico(TOOLS[k].icon, 'hero-ico')}<h3>獲得 ${TOOLS[k].name}</h3><p>${TOOLS[k].desc}</p><p class="dim">工具在這座塔裡永久有效</p></div>`, [{ label: '收下', value: true, cls: 'primary' }]);
      return true;
    }
    if (c === 'c' || c.startsWith('c:')) { fl.cells[i] = ''; this.openChest(c.slice(2) || null); return true; }
    fl.cells[i] = '';
    if (msg) { FX.float(tok(), msg, cls); FX.sfx(c[0] === 'g' ? 'upgrade' : 'coin'); }
    this.drawBoard(); this.drawHud();
    return false;
  },

  climb(dir) {
    const T = this.T, m = this.mods();
    if (dir < 0 && T.floor === 1) { this.leave(); return; }
    if (dir > 0) this.markStar(T.floor, 1);
    T.poison = 0;
    if (dir > 0 && this.key === 'weekly') {
      const total = T.custom ? T.custom.length : T.puzzles.length;
      if (T.floor >= total) { this.endWeekly(true); return; }
      const next = T.custom ? T.custom[T.floor] : PUZZLES[T.puzzles[T.floor]];
      T.fixed = { atk: next.hero.atk, def: next.hero.def }; T.gAtk = 0; T.gDef = 0; T.keys = { Y: 0, B: 0 };
    }
    if (dir > 0 && m.stairHeal) T.hp += Math.round(m.stairHeal * this.U());
    this.goFloor(T.floor + dir, dir > 0 ? 'start' : 'top');
    FX.sfx('upgrade');
    Store.saveLocal();
    this.render();
    App.render();
  },

  // ---------- 星級（主塔） ----------
  markStar(f, bit) {
    if (this.key !== 'main') return;
    const S = Store.S, before = S.stars[f] || 0;
    if (before & bit) return;
    S.stars[f] = before | bit;
    S.stats.stars = Store.starCount();
    FX.toast(`第 ${f} 層 ★ ${{ 1: '抵達上樓', 2: '收集全部寶石', 4: '擊敗全部怪物' }[bit]}`, 'gold');
  },
  checkStars() {
    if (this.key !== 'main') return;
    const fl = this.fl();
    if (!fl.cells.some(c => c === 'gA' || c === 'gD')) this.markStar(fl.f, 2);
    if (!fl.cells.some(Tower.isMon)) this.markStar(fl.f, 4);
  },

  // ---------- 點擊與滑動 ----------
  async tap(i) {
    i = +i;
    if (this.busy) return;
    const T = this.T, fl = this.fl(), c = fl.cells[i];
    if (i === T.pos || !this.visible(i)) return;
    if (this.mode && Tower.nbrs(T.pos).includes(i)) return this.useMode(i);
    if (Tower.walkable(c) || c === 'U' || c === 'D') {
      const p = this.path(T.pos, i);
      if (!p) return FX.toast('走不過去', 'bad');
      return this.run(() => this.walk(p));
    }
    if (Tower.isMon(c)) {
      const m = Tower.monster(c, fl, i), pr = Tower.duel(this.P(), m, this.mods()), p = this.pathNear(i);
      if (!pr.can || pr.dmg >= T.hp * 0.5 || !p || (m.boss && fl.cells.includes('X')) || (m.fx === 'invisible' && !this.sees('invisible'))) return this.monsterSheet(i, !p);
      return this.run(async () => { if (await this.walk(p)) await this.bump(i); });
    }
    if (c === '#' || (c === 'h' && !this.sees('hidden'))) return;
    const p = this.pathNear(i);
    if (!p) return FX.toast('走不過去', 'bad');
    return this.run(async () => { if (await this.walk(p)) await this.bump(i); });
  },
  async step(dir) {
    if (this.busy || !this.T) return;
    const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
    const [x, y] = Tower.xy(this.T.pos), nx = x + d[0], ny = y + d[1];
    if (nx < 0 || ny < 0 || nx >= Tower.W || ny >= Tower.W) return;
    const i = Tower.at(nx, ny), c = this.fl().cells[i];
    if (this.mode) return this.useMode(i);
    if (c === 'U' || c === 'D') return this.run(() => this.walk([[i]]));
    const mv = this.move(this.T.pos, d, { swamp: true, lava: true });
    if (mv) return this.run(() => this.walk([mv.via]));
    this.run(() => this.bump(i, true));
  },
  async run(fn) { this.busy = true; try { await fn(); } finally { this.busy = false; Store.saveLocal(); if (this.T) this.drawHud(); } },

  // 撞到障礙物
  async bump(i) {
    const T = this.T, fl = this.fl(), c = fl.cells[i];
    const tok = document.getElementById('heroTok');
    if (!c) return FX.toast('牠走掉了', 'bad');
    if (Tower.isMon(c)) {
      const m = Tower.monster(c, fl, i), pr = Tower.duel(this.P(), m, this.mods());
      if (m.boss && fl.cells.includes('X')) return FX.toast(`${m.name} 被封印水晶保護著，先擊碎所有水晶`, 'bad');
      if (pr.can && (pr.dmg < T.hp * 0.5 || (m.fx === 'invisible' && !this.sees('invisible')))) return this.fight(i);
      return this.monsterSheet(i);
    }
    if (c === 'dY' || c === 'dB') {
      const k = c[1];
      if (T.keys[k] <= 0) return FX.toast(`需要${k === 'Y' ? '黃' : '藍'}鑰匙`, 'bad');
      T.keys[k]--; fl.cells[i] = ''; FX.sfx('block'); this.afterAction(); return;
    }
    if (c === 'h') { fl.cells[i] = ''; FX.float(tok, '暗牆！', 'status'); FX.sfx('hit'); this.afterAction(); return; }
    if (c === 'X') {
      fl.cells[i] = ''; FX.sfx('crit'); FX.anim(document.querySelector(`[data-cell="${i}"]`), 'hit', 200);
      const left = fl.cells.filter(x => x === 'X').length;
      FX.toast(left ? `擊碎封印水晶，還剩 ${left} 顆` : '所有封印都碎了，首領失去了保護！', left ? '' : 'gold');
      this.afterAction(); return;
    }
    if (c === 'v') {
      if (!T.tools.axe) return FX.toast('需要樵夫斧才能砍開藤蔓', 'bad');
      fl.cells[i] = ''; FX.sfx('hit'); FX.float(tok, '砍斷藤蔓', 'status'); this.afterAction(); return;
    }
    if (c === 'I') return FX.toast('鐵門：擊敗所有金框守衛就會打開', 'bad');
    if (c === 'L') return FX.toast('石門：找到這層的壓力板踩下去', 'bad');
    if (c.startsWith('q:')) {
      const h = c.slice(2);
      if (Store.S.active !== h) return FX.toast(`印記門：只有${HEROES[h].name}能打開`, 'bad');
      fl.cells[i] = ''; FX.sfx('win'); FX.toast('印記門回應了你'); this.afterAction(); return;
    }
    if (c.startsWith('n:')) return this.npc(i);
  },
  afterAction() { this.checkStars(); this.drawBoard(); this.drawHud(); Store.saveLocal(); },

  // ---------- 戰鬥 ----------
  monsterSheet(i, unreachable) {
    const fl = this.fl(), c = fl.cells[i], m = Tower.monster(c, fl, i), pr = Tower.duel(this.P(), m, this.mods());
    const hidden = m.fx === 'invisible' && !this.sees('invisible');
    const sealed = m.boss && fl.cells.includes('X');
    const tags = [m.fx && `<b>${MON_FX[m.fx].name}</b>${MON_FX[m.fx].desc}`, m.fam && `<b>${FAMILY[m.fam]}系</b>`, m.guardian && '<b>守衛</b>打倒所有守衛，鐵門就會打開',
      m.patrol && '<b>巡邏</b>你每走一步，牠也會走一步；站到牠旁邊時牠會停下', m.boss && '<b>首領</b>生命低於一半時攻擊 ×1.3', sealed && '<b>封印</b>這層的封印水晶全部擊碎前無法攻擊'].filter(Boolean);
    const danger = pr.dmg >= this.T.hp * 0.5;
    App.openSheet(() => `<div class="sheet-head">${UI.token(m.icon, 'big')}<div><h3>${m.name}${m.boss ? ' <em class="boss-tag">首領</em>' : m.elite ? ' <em class="elite-tag">精英</em>' : ''}</h3>
      <div class="mstats">${hidden ? '<span>數值未知</span>' : `<span>生命 <b>${m.hp}</b></span><span>攻擊 <b>${m.atk}</b></span><span>防禦 <b>${m.def}</b></span>`}</div>
      <div class="dim">經驗 ${m.exp}・金幣 ${this.gold(m.gold)}</div></div></div>
      ${tags.map(t => `<div class="mfx">${t}</div>`).join('')}
      <div class="predict ${pr.can && !sealed ? '' : 'no'}">${sealed ? '先擊碎封印水晶' : hidden ? (pr.can ? '看不清楚，但你打得贏' : '看不清楚，現在打不贏') : pr.can ? `預計損失 <b>${pr.dmg}</b> 生命<small>（剩 ${this.T.hp - pr.dmg}）</small>` : `無法擊敗：${pr.reason}`}</div>
      ${unreachable ? '<button class="btn" data-act="closeSheet">目前走不到</button>' : pr.can && !sealed ? `<button class="btn ${danger ? 'danger' : 'primary'}" data-act="towerFight" data-arg="${i}">${danger ? '還是要打' : '戰鬥'}</button>` : '<button class="btn" data-act="closeSheet">先離開</button>'}`);
  },
  async fightFromSheet(i) {
    App.closeSheet();
    const p = this.pathNear(+i);
    if (!p) return FX.toast('走不過去', 'bad');
    this.run(async () => { if (await this.walk(p)) await this.fight(+i); });
  },
  async fight(i) {
    const T = this.T, fl = this.fl(), c = fl.cells[i];
    if (!Tower.isMon(c)) return;
    const m = Tower.monster(c, fl, i), mods = this.mods(), P = this.P(), pr = Tower.duel(P, m, mods);
    if (!pr.can) return this.monsterSheet(i);
    const S = Store.S, h = S.active, br = this.hs().branch;
    const gold = this.gold(m.gold);
    let exp = Math.round(m.exp * (1 + (mods.expPct || 0)) * Store.xpMult());
    if (T.flags.shield && h === 'knight' && br === 'B') exp *= 2;
    const fresh = this.key === 'main' || (this.key === 'daily' && T.floor > (T.prevBest || 0));
    const soul = (m.elite || m.boss) && fresh ? Math.round((m.boss ? 10 + T.floor : 3 + T.floor / 2) * this.soulMult()) : 0;
    const ember = m.boss && fresh ? 1 + Tower.zoneOf(T.floor) + (T.curse || 0) : 0;
    const feast = T.flags.feast ? (br === 'B' && h === 'vampire' ? 1.5 : 1) : 0;
    const loot = [`${UI.ico('icon/goldcoins', 'ri')}+${gold}`, exp && `經驗 +${exp}`, soul && `${UI.res('soul')}+${soul}`, ember && `${UI.res('ember')}+${ember}`, feast && '血宴吸回生命'].filter(Boolean);
    await Battle.play({ name: T.fixed ? '挑戰者' : this.hero().name, icon: this.hero().icon, hp: T.hp, atk: P.atk, def: P.def }, m, pr, loot);

    T.hp -= pr.dmg;
    if (feast) T.hp += Math.round(pr.dmg * feast);
    T.flags.shield = false; T.flags.pierce = false; T.flags.analyze = false; T.flags.feast = false;
    T.fought = T.floor;
    fl.cells[i] = '';
    if (m.fx === 'poison' && !mods.noPoison) T.poison = 1;
    if (m.fx === 'steal' && !(h === 'assassin' && this.hs().awaken >= 1)) { const s = Math.floor(T.gold * 0.25); T.gold -= s; if (s) FX.toast(`${m.name} 偷走了 ${s} 金幣`, 'bad'); }
    if (m.fx === 'curse') { T.curseDebuff = Math.min(0.3, (T.curseDebuff || 0) + 0.1); FX.toast('受到詛咒：攻擊 −10%（換樓層解除）', 'bad'); }
    if (m.fx === 'split' && !m.flags.includes('s')) {
      Tower.nbrs(i).filter(k => fl.cells[k] === '' && k !== T.pos).slice(0, 2).forEach(k => fl.cells[k] = `m:${m.key}:${m.tier}:s`);
    }
    if (mods.killHeal) T.hp += Math.round(this.U() * mods.killHeal);
    T.gold += gold; S.stats.kills++;
    S.codex[m.key] = (S.codex[m.key] || 0) + 1;
    S.res.soul += soul; S.res.ember += ember;
    if (m.guardian && !fl.cells.some(x => Tower.isMon(x) && (x.split(':')[3] || '').includes('G'))) {
      fl.cells.forEach((x, j) => { if (x === 'I') fl.cells[j] = ''; });
      FX.toast('守衛全倒，鐵門打開了！', 'gold');
    }
    if (!T.fixed && exp) {
      const lv = Store.addXp(h, exp);
      if (lv.ups) {
        T.hp += 50 * lv.ups;
        for (const k of ['main', 'daily']) if (k !== this.key && S.tower[k]) S.tower[k].hp += 50 * lv.ups;
        FX.toast(`${this.hero().name} 升到 Lv${this.hs().lvl}！攻擊、防禦 +${lv.ups}、生命 +${50 * lv.ups}`, 'gold');
        FX.sfx('win');
      }
    }
    T.log = `擊敗 ${m.name}`;
    FX.float(document.querySelector(`[data-cell="${i}"]`), '+' + gold, 'crit');
    if (m.boss) { S.stats.bossKills++; this.bossDown(Tower.zoneOf(T.floor)); }
    this.afterAction();
    App.checkAch();
  },
  bossDown(z) {
    const T = this.T, S = Store.S;
    if (this.key !== 'main') return;
    if (T.floor === FINAL_FLOOR) return setTimeout(() => this.ending(), 400);
    FX.modal(`<div class="center">${UI.token('mon/' + ZONES[z].boss, 'huge')}<h3>${MON_NAMES[ZONES[z].boss]} 倒下了</h3><p>${STORY.bosses[z]}</p></div>`, [{ label: '繼續', value: true, cls: 'primary' }]);
  },
  async ending() {
    const S = Store.S, T = this.T, lv = T.curse || 0;
    S.stats.clears++;
    S.stats.bestCurse = Math.max(S.stats.bestCurse, lv);
    const reward = { ember: 10 + lv * 3, soul: 200 + lv * 80 };
    Store.gain(reward);
    App.commit();
    FX.sfx('win');
    const go = await FX.modal(`<div class="center">${UI.token('mon/abyssal', 'huge')}<h3>${lv ? `詛咒等級 ${lv} 通關！` : '深淵之主被擊敗了'}</h3><p>${STORY.bosses[4]}</p><p>${STORY.ending}</p>
      <div class="loot"><span>${UI.res('ember')}+${reward.ember}</span><span>${UI.res('soul')}+${reward.soul}</span></div>
      <p class="dim">開啟新周目：塔會重新生成，並加上詛咒等級 ${lv + 1}（${CURSES[lv] || '最高等級'}）。英雄、營地都會保留，獎勵也會更好。</p></div>`,
      [{ label: '留在這裡', value: false }, { label: `開啟詛咒 ${Math.min(lv + 1, CURSES.length)}`, value: true, cls: 'primary' }]);
    if (go) this.newCycle();
  },
  async confirmNewCycle() {
    const ok = await FX.modal('<h3>開始新周目？</h3><p class="dim">目前主塔的進度（樓層、寶石、寶物）會清除，詛咒等級 +1。英雄、營地、星星紀錄都保留。</p>',
      [{ label: '取消', value: false }, { label: '開始', value: true, cls: 'danger' }]);
    if (ok) this.newCycle();
  },
  newCycle() {
    const S = Store.S;
    S.tower.cycle = Math.min(CURSES.length, (S.tower.main ? S.tower.main.curse : S.tower.cycle) + 1);
    S.tower.main = null;
    if (S.tower.inside === 'main') S.tower.inside = null;
    FX.setTheme(null); App.closeSheet(); App.commit();
    FX.toast(`新周目開始：詛咒等級 ${S.tower.cycle}`, 'gold');
  },

  // ---------- 寶箱、NPC ----------
  rollTreasure(T) {
    const pool = Object.keys(TREASURES).filter(k => !T.treasures.includes(k) && !TREASURES[k].season);
    if (!pool.length) return null;
    const w = pool.map(k => [0, 6, 3, 1][TREASURES[k].r]);
    let x = Math.random() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i++) { x -= w[i]; if (x <= 0) return pool[i]; }
    return pool[0];
  },
  openChest(fixed) {
    const T = this.T, S = Store.S;
    const id = fixed && TREASURES[fixed] && !T.treasures.includes(fixed) ? fixed : this.rollTreasure(T);
    if (!id) { const g = Math.round(this.U() * 5); T.gold += g; this.drawHud(); FX.toast(`寶箱裡有 ${g} 金幣`); return; }
    T.treasures.push(id);
    S.memory.seen[id] = 1;
    const t = TREASURES[id];
    FX.sfx('win');
    this.drawBoard(); this.drawHud();
    FX.modal(`<div class="center">${UI.ico(t.icon, 'hero-ico')}<h3>${t.name}</h3><p style="color:${RARITY[t.r].color}">${RARITY[t.r].name}寶物</p><p>${t.desc}</p><p class="dim">已記錄到祭壇的「寶物記憶」</p></div>`,
      [{ label: '收下', value: true, cls: 'primary' }]);
  },
  shopPrice() { return Math.round((30 + 25 * this.T.shopBuys) * Math.pow(1.4, Tower.zoneOf(this.T.floor)) * this.w().shop * (1 - (this.mods().shopOff || 0)) * (1 - Store.S.talents.midas * 0.2)); },
  keyPrice(k) { return ({ Y: 15, B: 60, bomb: 40, pick: 50, feather: 120 }[k]) * (Tower.zoneOf(this.T.floor) + 1); },
  goldBtn(act, arg, price, label) {
    return `<button class="btn cost" data-act="${act}" data-arg="${arg}" ${this.T.gold < price ? 'disabled' : ''}><span class="lbl">${label}</span>
      <span class="chip ${this.T.gold < price ? 'short' : ''}">${UI.ico('icon/goldcoins', 'ri')}${price}</span></button>`;
  },
  npc(i) {
    const fl = this.fl(), c = fl.cells[i], [, who, used] = c.split(':');
    const T = this.T, U = this.U(), gv = Math.max(1, Math.round(Tower.gemVal(T.floor) * 2 * this.w().gem));
    const purse = () => `<p class="dim">塔內金幣：${UI.ico('icon/goldcoins', 'ri')}<b>${T.gold}</b></p>`;
    if (who === 'altar') {
      App.openSheet(() => { const p = this.shopPrice(); return `<div class="sheet-head">${UI.token(NPCS.altar.icon, 'big')}<div><h3>${NPCS.altar.name}</h3><div class="dim">「獻上金幣，換取力量。每次獻上，代價都會更高。」</div></div></div>
        ${purse()}<div class="col">${this.goldBtn('shopBuy', 'hp', p, `生命 +${U * 10}`)}${this.goldBtn('shopBuy', 'atk', p, `攻擊 +${gv}`)}${this.goldBtn('shopBuy', 'def', p, `防禦 +${gv}`)}</div>`; });
    } else if (who === 'merch') {
      const goods = ['Y', 'B', ...Object.keys(ITEMS).filter(k => Store.has(ITEMS[k].research))];
      const label = k => k === 'Y' ? `${UI.ico('item/key_y', 'ri')} 黃鑰匙` : k === 'B' ? `${UI.ico('item/key_b', 'ri')} 藍鑰匙` : `${UI.ico(ITEMS[k].icon, 'ri')} ${ITEMS[k].name}`;
      App.openSheet(() => `<div class="sheet-head">${UI.token(NPCS.merch.icon, 'big')}<div><h3>${NPCS.merch.name}</h3><div class="dim">「鑰匙？道具？我這裡多的是。」</div></div></div>
        ${purse()}<div class="col">${goods.map(k => this.goldBtn('merchBuy', k, this.keyPrice(k), label(k))).join('')}</div>`);
    } else if (who === 'sage') {
      if (!used && !T.fixed) { T.keys.Y += 1; T.potions += 1; fl.cells[i] = 'n:sage:1'; FX.sfx('coin'); this.drawHud(); }
      const z = Tower.zoneOf(T.floor), S = Store.S;
      let quest = '';
      if (this.key === 'main') {
        const have = Store.zoneStars(z), claimed = S.zoneQuest[z];
        if (!claimed && have >= ZONE_QUEST_STARS) {
          S.zoneQuest[z] = 1; const r = { soul: 30 * (z + 1), ember: z + 1 }; Store.gain(r);
          quest = `<p class="gold">任務完成！在${ZONES[z].name}拿到 ${ZONE_QUEST_STARS} 顆星：魂晶 +${r.soul}、餘燼 +${r.ember}</p>`;
        } else quest = claimed ? '<p class="dim">本區任務已完成。</p>' : `<p class="dim">任務：在${ZONES[z].name}（第 ${z * 10 + 1}–${z * 10 + 10} 層）拿到 ${ZONE_QUEST_STARS} 顆星（目前 ${have}）。完成後回來找我。</p>`;
      }
      const tips = ['點怪物會自動走過去開打；打不過或太危險時會先告訴你。', '每層三顆星：抵達上樓、收集全部寶石、擊敗全部怪物。', '冰面會一直滑到撞到東西才停，先想好方向。',
        '卡關時回營地升級裝備、學天賦，數值會直接帶進塔裡。', '金框的守衛全部倒下，鐵門才會打開。'];
      FX.modal(`<div class="center">${UI.token(NPCS.sage.icon, 'big')}<h3>${NPCS.sage.name}</h3>${used || T.fixed ? '' : '<p class="gold">送你 1 把黃鑰匙與 1 瓶藥水。</p>'}${quest}<p>「${tips[z % tips.length]}」</p></div>`);
      App.commit();
    }
  },
  shopBuy(kind) {
    const p = this.shopPrice(), T = this.T, U = this.U(), gv = Math.max(1, Math.round(Tower.gemVal(T.floor) * 2 * this.w().gem));
    if (T.gold < p) return FX.toast('金幣不足', 'bad');
    T.gold -= p; T.shopBuys++;
    if (kind === 'hp') T.hp += U * 10;
    if (kind === 'atk') T.gAtk += gv;
    if (kind === 'def') T.gDef += gv;
    FX.sfx('upgrade'); Store.saveLocal(); App.render();
  },
  merchBuy(k) {
    const p = this.keyPrice(k), T = this.T;
    if (T.gold < p) return FX.toast('金幣不足', 'bad');
    T.gold -= p;
    if (k === 'Y' || k === 'B') T.keys[k]++; else T.items[k] = (T.items[k] || 0) + 1;
    FX.sfx('coin'); Store.saveLocal(); App.render();
  },

  // ---------- 技能、道具、藥水、手冊、傳送 ----------
  skill() {
    if (this.busy) return;
    const T = this.T, sk = this.hero().skill;
    if (this.skillLeft() <= 0) return FX.toast(T.fixed ? '謎題塔不能用技能' : '本層的技能次數用完了', 'bad');
    if (T.skill.f !== T.floor) T.skill = { f: T.floor, n: 0 };
    const flagSkill = { shield: '龍鱗盾：下一場戰鬥不受傷', pierce: '穿甲箭：下一場戰鬥無視防禦', analyze: '解析：下一場戰鬥怪物防禦大減', feast: '血宴：下一場戰鬥的損失會吸回來' };
    if (flagSkill[sk.id]) {
      if (T.flags[sk.id]) return FX.toast('已經準備好了');
      T.flags[sk.id] = true; T.skill.n++; FX.toast(flagSkill[sk.id]);
    } else if (sk.id === 'bastion') {
      if (T.flags.bastion === T.floor) return FX.toast('堡壘已經展開');
      T.flags.bastion = T.floor; T.skill.n++; FX.toast('堡壘：本層怪物攻擊降低');
    } else {
      const m = { phase: 'wall', pick: 'pick', midas: 'midas' }[sk.id];
      this.mode = this.mode === m ? null : m;
      FX.toast(this.mode ? { wall: '點旁邊的一面牆擊碎它', pick: '點旁邊的一扇門打開它', midas: '點旁邊的一隻怪物把牠變成金幣' }[m] : '取消');
    }
    FX.sfx('click'); Store.saveLocal(); this.render(); App.render();
  },
  useItem(k) {
    if (this.busy) return;
    const T = this.T, fl = this.fl();
    if (!T.items[k]) return FX.toast(`沒有${ITEMS[k].name}`, 'bad');
    if (k === 'bomb') {
      const hits = Tower.nbrs(T.pos).filter(j => Tower.isMon(fl.cells[j]) && !/:[EB](:|$)/.test(fl.cells[j]));
      if (!hits.length) return FX.toast('身邊沒有可以炸的怪物', 'bad');
      T.items.bomb--; hits.forEach(j => fl.cells[j] = '');
      if (!fl.cells.some(x => Tower.isMon(x) && (x.split(':')[3] || '').includes('G'))) fl.cells.forEach((x, j) => { if (x === 'I') fl.cells[j] = ''; });
      FX.sfx('crit'); FX.anim(document.getElementById('board'), 'shake', 350); FX.toast(`炸掉了 ${hits.length} 隻怪物`);
      return this.afterAction();
    }
    if (k === 'pick') { this.mode = this.mode === 'tool' ? null : 'tool'; FX.toast(this.mode ? '點旁邊的一面牆敲掉它' : '取消'); return this.render(); }
    if (k === 'feather') {
      const to = Tower.nbrs(fl.up).find(j => Tower.walkable(fl.cells[j]));
      if (fl.up < 0 || fl.cells[fl.up] !== 'U' || to === undefined) return FX.toast('這層的上樓梯周圍沒有空位', 'bad');
      T.items.feather--; T.pos = to; FX.sfx('upgrade'); this.reveal(); return this.afterAction();
    }
  },
  useMode(i) {
    const T = this.T, fl = this.fl(), c = fl.cells[i], br = this.hs().branch, h = Store.S.active;
    if (!Tower.nbrs(T.pos).includes(i)) return FX.toast('只能對旁邊的格子使用', 'bad');
    const ok = {
      wall: c === '#' || c === 'h' || (br === 'B' && h === 'wizard' && (c === 'I' || c === 'v' || c === 'L')),
      tool: c === '#' || c === 'h',
      pick: c === 'dY' || (br === 'B' && h === 'assassin' && c === 'dB'),
      midas: Tower.isMon(c) && !/:B(:|$)/.test(c) && (!/:E(:|$)/.test(c) || (br === 'B' && h === 'catkin')),
    }[this.mode];
    if (!ok) return FX.toast('不能對那一格使用', 'bad');
    if (this.mode === 'midas') { const m = Tower.monster(c, fl, i); fl.cells[i] = ''; T.gold += this.gold(m.gold * 2); FX.float(document.getElementById('heroTok'), '金幣 +' + this.gold(m.gold * 2), 'crit'); }
    else fl.cells[i] = '';
    if (this.mode === 'tool') T.items.pick--; else T.skill.n++;
    FX.sfx('hit'); this.mode = null; Store.saveLocal(); this.render(); App.render();
  },
  potion() {
    const T = this.T;
    if (T.potions <= 0) return FX.toast('沒有藥水了。營地的藥師小屋會慢慢製作。', 'bad');
    T.potions--;
    const h = Math.round(8 * this.U() * this.potionMult());
    T.hp += h; T.poison = 0;
    FX.float(document.getElementById('heroTok'), '+' + h, 'heal'); FX.sfx('heal');
    Store.saveLocal(); this.drawHud();
  },
  manual() {
    const fl = this.fl(), P = this.P(), mods = this.mods(), seen = new Set(), rows = [];
    fl.cells.forEach((c, i) => { if (Tower.isMon(c) && this.visible(i) && !seen.has(c)) { seen.add(c); rows.push([c, i]); } });
    App.openSheet(() => `<h3>怪物手冊・第 ${fl.f} 層</h3><div class="manual">` + (rows.map(([c, i]) => {
      const m = Tower.monster(c, fl, i), pr = Tower.duel(P, m, mods), hid = m.fx === 'invisible' && !this.sees('invisible');
      return `<div class="mrow">${UI.token(m.icon)}<div><b>${m.name}</b>${m.fx ? `<em class="fx">${MON_FX[m.fx].name}</em>` : ''}${m.fam ? `<em class="fx fam">${FAMILY[m.fam]}</em>` : ''}
        <div class="dim">${hid ? '數值未知' : `生命 ${m.hp}・攻擊 ${m.atk}・防禦 ${m.def}`}</div></div><span class="${pr.can ? '' : 'no'}">${hid ? '?' : pr.can ? '-' + pr.dmg : '打不過'}</span></div>`;
    }).join('') || '<p class="dim">這層沒有看得到的怪物了</p>') + '</div>');
  },
  fly() {
    const T = this.T, S = Store.S, btns = Array.from({ length: T.maxFloor }, (_, k) => k + 1).map(f => {
      const b = this.key === 'main' ? S.stars[f] || 0 : 0;
      const st = this.key === 'main' ? `<small>${'★'.repeat((b & 1) + (b >> 1 & 1) + (b >> 2 & 1)) || '·'}</small>` : '';
      return `<button class="btn sm ${f === T.floor ? 'primary' : ''}" data-act="flyTo" data-arg="${f}">${f}${st}</button>`;
    }).join('');
    App.openSheet(() => `<h3>樓層傳送</h3><p class="dim">傳送到去過的樓層，會出現在該層入口。星星：抵達上樓・全部寶石・全部怪物。</p><div class="fly">${btns}</div>`);
  },
  flyTo(f) { App.closeSheet(); if (+f === this.T.floor) return; this.T.poison = 0; this.goFloor(+f, 'start'); Store.saveLocal(); this.render(); App.render(); },

  // ---------- 畫面 ----------
  render() {
    if (!this.T) return this.renderLobby();
    const T = this.T, fl = this.fl(), z = ZONES[fl.zone];
    const title = this.key === 'weekly' ? `謎題 ${T.floor}：${fl.name || ''}` : `第 ${T.floor} 層`;
    const tag = this.key === 'daily' ? '・每日挑戰' : this.key === 'main' && T.curse ? `・詛咒 ${T.curse}` : '';
    return `<div class="tower">
      <div class="t-head"><div><b>${this.key === 'weekly' ? '每週謎題' : z.name}</b><span>${title}${tag}</span></div>
        <div class="row"><button class="btn sm" data-act="towerManual">手冊</button>${T.maxFloor > 1 && this.key !== 'weekly' ? '<button class="btn sm" data-act="towerFly">傳送</button>' : ''}<button class="btn sm ghost" data-act="towerLeave">${this.key === 'main' ? '回營地' : '結束'}</button></div></div>
      <div id="tHud" class="t-hud glass"></div>
      <div class="board-wrap"><div id="board" class="board ${this.mode ? 'mode-' + this.mode : ''} ${fl.dark ? 'dark' : ''}" style="--fl:${z.pal[0]};--fl2:${z.pal[1]};--wa:${z.pal[2]};--wb:${z.pal[3]};--glow:${z.pal[4]}"></div></div>
      <div class="t-foot">${T.fixed ? '' : '<button class="btn skillbtn" data-act="towerSkill" id="tSkill"></button>'}
        <button class="btn" data-act="towerPotion" id="tPotion"></button></div>
      <div id="tItems" class="t-items"></div>
      <div id="tLog" class="t-log"></div>
    </div>`;
  },
  afterRender() {
    if (!this.T || !document.getElementById('board')) return;
    this.drawBoard(); this.drawHud();
    const b = document.getElementById('board');
    let sx = 0, sy = 0;
    b.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    b.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return;
      e.preventDefault();
      this.step(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    });
  },
  cellHtml(c, i, fl, P, mods) {
    const [x, y] = Tower.xy(i);
    let inner = '', cls = (x + y) % 2 ? 'c alt' : 'c';
    if (!this.visible(i)) return `<div class="${cls} fog" data-cell="${i}"></div>`;
    if (c === '#') cls += ' w';
    else if (c === 'h') cls += ' w' + (this.sees('hidden') ? ' crack' : '');
    else if (c === 'U' || c === 'D') { cls += ' st'; inner = `<span class="stair ${c === 'U' ? 'up' : 'dn'}"><b>${c === 'U' ? '▲' : '▼'}</b><small>${c === 'U' ? '上樓' : fl.f === 1 ? '出口' : '下樓'}</small></span>`; }
    else if (c === 'dY' || c === 'dB') { cls += ' door d' + c[1]; inner = '<span class="arch"><i></i></span>'; }
    else if (c === 'I') cls += ' iron';
    else if (c === 'L') cls += ' slab';
    else if (c === 'v') cls += ' vine';
    else if (c === '~') cls += ' swamp';
    else if (c === '^') cls += ' ice';
    else if (c === 'x') cls += ' lava';
    else if (c === 'o') { cls += ' plate'; inner = '<span class="btnp"></span>'; }
    else if (c === 'O') { cls += ' plate on'; inner = '<span class="btnp"></span>'; }
    else if (c.startsWith('T:')) { cls += ' tp'; inner = '<span class="ring"></span>'; }
    else if (c === 'X') { cls += ' seal'; inner = Art.img('item/crystal', 'it gem'); }
    else if (c.startsWith('q:')) { cls += ' door dQ'; inner = `<span class="arch"></span>${Art.img(HEROES[c.slice(2)].icon, 'rune')}`; }
    else if (c[0] === 'k') inner = Art.img('item/key_' + c[1].toLowerCase(), 'it');
    else if (c === 'gA') inner = Art.img('item/gem_red', 'it gem');
    else if (c === 'gD') inner = Art.img('item/gem_blue', 'it gem');
    else if (c === 'pS') inner = Art.img('item/potion_red', 'it small');
    else if (c === 'pL') inner = Art.img('item/potion_purple', 'it');
    else if (c === '$') inner = Art.img('icon/goldcoins', 'it sq');
    else if (c === 'c' || c.startsWith('c:')) inner = Art.img('icon/chest', 'it sq');
    else if (c.startsWith('i:')) inner = Art.img(ITEMS[c.slice(2)].icon, 'it sq');
    else if (c.startsWith('t:')) { cls += ' toolc'; inner = Art.img(TOOLS[c.slice(2)].icon, 'it sq'); }
    else if (c.startsWith('n:')) { const n = NPCS[c.split(':')[1]]; inner = Art.img(n.icon, 'tok') + '<i class="bang">!</i>'; }
    else if (Tower.isMon(c)) {
      const m = Tower.monster(c, fl, i), pr = Tower.duel(P, m, mods);
      const hid = m.fx === 'invisible' && !this.sees('invisible'), sealed = m.boss && fl.cells.includes('X');
      cls += (m.boss ? ' boss' : m.elite ? ' elite' : '') + (m.guardian ? ' guardm' : '') + (hid ? ' ghost' : '');
      const lab = sealed ? '封印' : hid ? '?' : pr.can ? pr.dmg : '✕';
      inner = Art.img(m.icon, 'tok') + `<i class="dmg ${sealed || !pr.can ? 'no' : pr.dmg > P.hp * 0.4 ? 'warn' : ''}">${lab}</i>${m.patrol ? '<i class="pat">⇄</i>' : ''}`;
    }
    return `<div class="${cls}" data-cell="${i}" data-act="towerTap" data-arg="${i}">${inner}</div>`;
  },
  drawBoard() {
    const b = document.getElementById('board'); if (!b || !this.T) return;
    const fl = this.fl(), P = this.P(), mods = this.mods();
    const html = fl.cells.map((c, i) => this.cellHtml(c, i, fl, P, mods)), icon = this.hero().icon;
    // 只換掉有變的格子；整盤重建會讓所有圖片和動畫重來而閃爍
    if (b._fl !== fl || b._icon !== icon || !b._cells) {
      b.innerHTML = html.join('') + `<div id="heroTok" class="hero-tok">${Art.img(icon)}</div>`;
      b._fl = fl; b._icon = icon; b._cells = html;
    } else {
      const els = b.children;
      html.forEach((h, i) => { if (b._cells[i] !== h) { els[i].outerHTML = h; b._cells[i] = h; } });
    }
    this.drawToken();
  },
  drawToken() {
    const t = document.getElementById('heroTok'); if (!t || !this.T) return;
    const [x, y] = Tower.xy(this.T.pos);
    t.style.transform = `translate(${x * 100}%, ${y * 100}%)`;
    t.classList.toggle('poison', !!this.T.poison);
  },
  drawHud() {
    const h = document.getElementById('tHud'); if (!h || !this.T) return;
    const T = this.T, P = this.P(), S = Store.S, sk = this.hero().skill;
    const tr = T.treasures.map(id => `<span class="tr" data-act="treasureInfo" data-arg="${id}">${Art.img(TREASURES[id].icon)}</span>`).join('');
    const tools = Object.keys(T.tools).map(k => `<span class="tr tool" data-act="toolInfo" data-arg="${k}">${Art.img(TOOLS[k].icon)}</span>`).join('');
    const b = this.key === 'main' ? S.stars[T.floor] || 0 : 0;
    const stars = this.key === 'main' ? `<span class="stars">${[1, 2, 4].map(k => `<i class="${b & k ? 'on' : ''}">★</i>`).join('')}</span>` : '';
    setHtml(h, `<div class="hs">${UI.token(this.hero().icon)}<div class="hv">
        <span class="hp">生命 <b>${fmt(T.hp)}</b></span><span>攻擊 <b>${P.atk}</b></span><span>防禦 <b>${P.def}</b></span>
        <span>${T.fixed ? '謎題' : 'Lv'} <b>${T.fixed ? T.floor : this.hs().lvl}</b></span></div></div>
      <div class="keys">${['Y', 'B'].map(k => `<span>${Art.img('item/key_' + k.toLowerCase())}<b>${T.keys[k]}</b></span>`).join('')}
        <span>${Art.img('icon/goldcoins')}<b>${T.gold}</b></span>${stars}
        ${T.poison ? '<span class="poison-tag">中毒</span>' : ''}${T.curseDebuff ? '<span class="poison-tag curse">詛咒</span>' : ''}
        ${['shield', 'pierce', 'analyze', 'feast'].filter(k => T.flags[k]).map(k => `<span class="buff">${HERO_ORDER.map(x => HEROES[x].skill).find(s => s.id === k).name}</span>`).join('')}
        ${T.flags.bastion === T.floor ? '<span class="buff">堡壘</span>' : ''}${T.meal ? `<span class="buff meal">${DISHES[T.meal].name}</span>` : ''}</div>
      ${tr || tools ? `<div class="trs">${tools}${tr}</div>` : ''}`);
    const s = document.getElementById('tSkill');
    setHtml(s, `${sk.name}<small>剩 ${this.skillLeft()} 次</small>`);
    const p = document.getElementById('tPotion');
    setHtml(p, `${UI.ico('item/potion_red', 'ri')}藥水 ×${T.potions}`);
    const it = document.getElementById('tItems');
    setHtml(it, Object.keys(ITEMS).filter(k => T.items[k]).map(k => `<button class="btn sm" data-act="towerItem" data-arg="${k}">${UI.ico(ITEMS[k].icon, 'ri')}${ITEMS[k].name} ×${T.items[k]}</button>`).join(''));
    const l = document.getElementById('tLog');
    if (l) l.textContent = this.mode ? { wall: '穿牆術：點旁邊的牆', tool: '破牆鎬：點旁邊的牆', pick: '開鎖：點旁邊的門', midas: '點金術：點旁邊的怪物' }[this.mode]
      : (T.log || '點格子移動，也可以滑動。點怪物會走過去開打。');
  },
  treasureInfo(id) {
    const t = TREASURES[id];
    FX.modal(`<div class="center">${UI.ico(t.icon, 'hero-ico')}<h3>${t.name}</h3><p style="color:${RARITY[t.r].color}">${RARITY[t.r].name}</p><p>${t.desc}</p></div>`);
  },
  toolInfo(k) { FX.modal(`<div class="center">${UI.ico(TOOLS[k].icon, 'hero-ico')}<h3>${TOOLS[k].name}</h3><p>${TOOLS[k].desc}</p></div>`); },

  // ---------- 大廳 ----------
  toggleMod(k) {
    const m = Store.S.tower.mods, i = m.indexOf(k);
    if (i >= 0) m.splice(i, 1); else if (m.length < 3) m.push(k); else return FX.toast('最多選 3 個詞綴', 'bad');
    Store.saveLocal(); App.render();
  },
  pickMeal(id) {
    const f = Store.S.farm;
    f.meal = f.meal === id ? null : id;
    Store.saveLocal(); App.render();
  },
  claimStars() {
    const S = Store.S, total = Store.starCount();
    let n = 0;
    while (S.starClaimed < STAR_REWARDS.length && total >= STAR_REWARDS[S.starClaimed].stars) { Store.gain(STAR_REWARDS[S.starClaimed].reward); S.starClaimed++; n++; }
    if (n) { FX.sfx('coin'); FX.toast(`領取了 ${n} 份星星獎勵`, 'gold'); App.commit(); }
  },
  renderLobby() {
    const S = Store.S, M = S.tower.main, d = HEROES[S.active], hs = Store.heroStats(S.active);
    const D = S.tower.daily && S.tower.daily.date === this.today() ? S.tower.daily : null;
    const best = S.tower.dailyBest && S.tower.dailyBest.date === this.today() ? S.tower.dailyBest.best : 0;
    const rule = this.dailyRule(), season = this.season(), stash = S.stash, total = Store.starCount();
    const next = STAR_REWARDS[S.starClaimed];
    const wk = this.weekId(), WB = S.tower.weeklyBest && S.tower.weeklyBest.week === wk ? S.tower.weeklyBest.score : null;
    const W = S.tower.weekly && S.tower.weekly.week === wk ? S.tower.weekly : null;
    const dishes = Object.keys(DISHES).filter(k => S.farm.dishes[k] > 0);
    const curse = M ? M.curse : S.tower.cycle;
    return `<section class="lobby-hero">${UI.token(d.icon, 'huge')}<div><h1>燼火之塔</h1><p class="dim">${d.name}・Lv ${this.hs().lvl}${S.title ? `・<span class="gold">${S.title}</span>` : ''}</p>
        <div class="stats"><span>攻擊<b>${hs.atk}</b></span><span>防禦<b>${hs.def}</b></span><span>生命<b>${hs.hp}</b></span></div>
        <button class="btn sm" data-act="go" data-arg="heroes">換英雄</button></div></section>
      ${season ? `<div class="event-banner">🎃 <b>${season.name}</b>進行中：${season.desc}</div>` : ''}
      ${dishes.length ? `<div class="tower-card glass"><b>進塔前吃一道料理</b><div class="row">${dishes.map(k => `<button class="btn sm ${S.farm.meal === k ? 'primary' : ''}" data-act="pickMeal" data-arg="${k}">${UI.ico(DISHES[k].icon, 'ri')}${DISHES[k].name} ×${S.farm.dishes[k]}</button>`).join('')}</div>
        <p class="dim">${S.farm.meal ? `下次進塔會吃：${DISHES[S.farm.meal].name}（${DISHES[S.farm.meal].desc}）` : '選一道，下次進塔（主塔或挑戰塔）時會吃掉並獲得效果'}</p></div>` : ''}
      <div class="tower-card glass main">
        <div class="tc-head">${UI.ico('item/sword_fire')}<div><h3>主塔${curse ? `<em class="curse-tag">詛咒 ${curse}</em>` : ''}</h3><p class="dim">50 層的高塔，第 50 層有最終首領。進度永久保留，卡關就回營地變強。</p></div></div>
        ${M ? `<div class="stats"><span>目前<b>${M.floor} 層</b></span><span>最高<b>${M.maxFloor} 層</b></span><span>生命<b>${fmt(M.hp)}</b></span></div>` : ''}
        <div class="stars-row"><span>★ ${total} / 150</span>${next ? `<span class="dim">下一份獎勵：${next.stars} 星</span>` : '<span class="dim">星星獎勵已全部領完</span>'}
          ${next && total >= next.stars ? '<button class="btn sm primary" data-act="claimStars">領取</button>' : ''}</div>
        <div class="dim">倉庫：${UI.ico('item/key_y', 'ri')}${Math.floor(stash.Y)} ${UI.ico('item/key_b', 'ri')}${Math.floor(stash.B)} ${UI.ico('item/potion_red', 'ri')}${Math.floor(stash.potion)}（進塔自動帶上）</div>
        <button class="btn primary big" data-act="towerEnter" data-arg="main">${M ? '繼續攀登' : curse ? `開始詛咒 ${curse}` : '開始攀登'}</button>
        ${S.stats.clears && M ? `<button class="btn sm ghost" data-act="newCycle">放棄目前進度，開始詛咒 ${Math.min(CURSES.length, curse + 1)}</button>` : ''}</div>
      <div class="tower-card glass daily">
        <div class="tc-head">${UI.ico('item/scroll_red')}<div><h3>每日挑戰塔</h3><p class="dim">每天一座新塔，難度依你的實力調整。刷新今日紀錄得魂晶。</p></div></div>
        <div class="rule"><b>今日規則：${rule.name}</b>${rule.desc}</div>
        ${D ? '' : `<div class="mods"><span class="dim">自選詞綴（最多 3 個，難度與魂晶一起提高）</span><div class="row">${Object.keys(MODIFIERS).map(k => `<button class="chipbtn ${S.tower.mods.includes(k) ? 'on' : ''}" data-act="toggleMod" data-arg="${k}"><b>${MODIFIERS[k].name}</b><small>${MODIFIERS[k].desc}・+${Math.round(MODIFIERS[k].bonus * 100)}%</small></button>`).join('')}</div></div>`}
        ${S.memory.equipped.length ? `<div class="dim">記憶寶物：${S.memory.equipped.map(id => TREASURES[id].name).join('、')}</div>` : ''}
        <div class="stats"><span>今日最高<b>${Math.max(best, D ? D.maxFloor : 0)} 層</b></span>${D ? `<span>進行中<b>${D.floor} 層</b></span><span>獎勵<b>×${(D.bonus || 1).toFixed(2)}</b></span>` : ''}</div>
        <button class="btn big" data-act="towerEnter" data-arg="daily">${D ? '繼續挑戰' : '開始今日挑戰'}</button></div>
      <div class="tower-card glass">
        <div class="tc-head">${UI.ico('icon/book')}<div><h3>每週謎題塔</h3><p class="dim">每週 3 層手工設計的謎題。數值固定、不能用技能，比誰剩下的生命最多。</p></div></div>
        <div class="stats"><span>本週最佳<b>${WB === null ? '—' : WB}</b></span>${W && W.started && !W.done ? `<span>進行中<b>謎題 ${W.floor}</b></span>` : ''}</div>
        <button class="btn big" data-act="towerEnter" data-arg="weekly">${W && W.started && !W.done ? '繼續解謎' : '開始解謎'}</button></div>
      <p class="dim center" style="margin-top:14px"><a href="guide.html" target="_blank">完整玩法說明</a></p>`;
  },
};

const MECH_NAMES = { hidden: '暗牆', iron: '鐵門與守衛', swamp: '毒沼', vine: '藤蔓', patrol: '巡邏怪', ice: '冰面', plate: '壓力板', lava: '岩漿', teleport: '傳送陣', dark: '黑暗' };

window.addEventListener('keydown', e => {
  if (!Play.T || App.view !== 'run' || App.sheetFn || document.querySelector('.modal-wrap, .battle')) return;
  const d = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[e.key];
  if (d) { e.preventDefault(); Play.step(d); }
});
