// 遊戲清單。新增遊戲：在 js/games/<id>/index.js 實作 mount()，於 shared/draw.js 加封面，再在此登記。
// cat 對應 CATEGORIES 的 id，大廳會依此分類。
export const CATEGORIES = [
  { id: 'all', name: '全部' },
  { id: 'board', name: '棋類' },
  { id: 'cards', name: '牌桌' },
  { id: 'tiles', name: '麻將' },
  { id: 'sport', name: '運動' },
  { id: 'puzzle', name: '益智' },
];

export const GAMES = [
  { id: 'go', cat: 'board', name: '圍棋', kicker: '棋類 · 神經網路對手', desc: '9／13／19 路，最高業餘高段以上', load: () => import('./go/index.js') },
  { id: 'mahjong', cat: 'tiles', name: '台灣麻將', kicker: '麻將 · 十六張', desc: '四人對局，照台數計分', load: () => import('./mahjong/index.js') },
  { id: 'holdem', cat: 'cards', name: '德州撲克', kicker: '牌桌 · 無限注', desc: '六人桌，對手會算勝率', load: () => import('./holdem/index.js') },
  { id: 'billiards', cat: 'sport', name: '撞球', kicker: '運動 · 8 號球', desc: '真實物理，五級對手', load: () => import('./billiards/index.js') },
  { id: 'minigolf', cat: 'sport', name: '迷你高爾夫', kicker: '運動 · 只用推桿', desc: '六座球場 54 洞', load: () => import('./minigolf/index.js') },
  { id: 'xiangqi', cat: 'board', name: '象棋', kicker: '棋類 · 五級強度', desc: '亞洲規則，長將判負', load: () => import('./xiangqi/index.js') },
  { id: 'chess', cat: 'board', name: '西洋棋', kicker: '棋類 · Stockfish', desc: '等級分 1350 起', load: () => import('./chess/index.js') },
  { id: 'gomoku', cat: 'board', name: '五子棋', kicker: '棋類 · 搜尋引擎對手', desc: '15 路，連成五子者勝', load: () => import('./gomoku/index.js') },
  { id: 'blackjack', cat: 'cards', name: '21 點', kicker: '牌桌 · 六副牌', desc: '加倍、分牌、保險', load: () => import('./blackjack/index.js') },
  { id: 'baccarat', cat: 'cards', name: '百家樂', kicker: '牌桌 · 八副牌', desc: '莊閒和、對子，附路單', load: () => import('./baccarat/index.js') },
  { id: 'minesweeper', cat: 'puzzle', name: '踩地雷', kicker: '益智 · 計時挑戰', desc: '三種標準盤面', load: () => import('./minesweeper/index.js') },
  { id: 'g2048', cat: 'puzzle', name: '2048', kicker: '益智 · 數字合併', desc: '方塊越大，賠率越高', load: () => import('./g2048/index.js') },
];

// 規劃中的遊戲（大廳預留位置）
export const COMING = [
  { name: '黑白棋', kicker: '棋類', cat: 'board' },
  { name: '暗棋', kicker: '棋類', cat: 'board' },
  { name: '大老二', kicker: '牌桌', cat: 'cards' },
];

export const gameById = (id) => GAMES.find((g) => g.id === id);
