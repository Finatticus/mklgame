// 遊戲清單。新增遊戲：在 js/games/<id>/index.js 實作 mount()，於 shared/draw.js 加封面，再在此登記。
export const GAMES = [
  { id: 'go', name: '圍棋', kicker: '棋類 · 神經網路對手', desc: '9／13／19 路，最高業餘高段以上', load: () => import('./go/index.js') },
  { id: 'gomoku', name: '五子棋', kicker: '棋類 · 搜尋引擎對手', desc: '15 路，連成五子者勝', load: () => import('./gomoku/index.js') },
  { id: 'blackjack', name: '21 點', kicker: '牌桌 · 六副牌', desc: '加倍、分牌、保險', load: () => import('./blackjack/index.js') },
];

// 規劃中的遊戲（大廳預留位置）
export const COMING = [
  { name: '象棋', kicker: '棋類' },
  { name: '德州撲克', kicker: '牌桌' },
  { name: '百家樂', kicker: '牌桌' },
  { name: '黑白棋', kicker: '棋類' },
];

export const gameById = (id) => GAMES.find((g) => g.id === id);
