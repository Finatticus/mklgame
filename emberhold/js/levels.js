// 自訂關卡：在 Google 試算表的 levels 工作表設計，透過 GAS 下載並存在本機（離線也能玩）
const Levels = {
  KEY: 'emberhold_levels',
  list() { try { return JSON.parse(localStorage.getItem(this.KEY) || '[]'); } catch (e) { return []; } },
  valid(l) {
    return l && Array.isArray(l.map) && l.map.length === 11 && l.map.every(r => typeof r === 'string' && r.length <= 11)
      && l.map.join('').includes('S') && l.map.join('').includes('U') && l.hero && l.hero.hp > 0;
  },
  async fetch() {
    if (!Sync.enabled() || !navigator.onLine) return -1;
    try {
      const url = Sync.url() + (Sync.url().includes('?') ? '&' : '?') + 'action=levels';
      const j = await (await fetch(url)).json();
      if (!j.ok) return -1;
      const list = (j.levels || []).filter(l => this.valid(l));
      localStorage.setItem(this.KEY, JSON.stringify(list));
      return list.length;
    } catch (e) { return -1; }
  },
};
