// 生涯模式設計的「夢想球場」：從這台手機的生涯存檔讀出來，用 @C 產生器做成球場，加進球場清單（主遊戲與生涯都能打）
import { COURSES } from './courses.js';
import { buildDream, dreamId } from './courses-creative.js';

export function registerDreams(designs, owner) {
  for (const d of designs || []) {
    const id = dreamId(d, owner);
    if (!COURSES.some(c => c.id === id)) COURSES.push(buildDream(d, owner));
  }
}
// 主遊戲登入時：讀這個帳號的 3 個生涯欄位
export function loadDreamsFromStorage(user) {
  for (const slot of [1, 2, 3]) {
    try {
      const st = JSON.parse(localStorage.getItem(`dixen.career.${user}.${slot}`) || 'null');
      if (st && st.designs && st.designs.length) registerDreams(st.designs, st.player.name);
    } catch (e) { /* 存檔壞掉就略過 */ }
  }
}
