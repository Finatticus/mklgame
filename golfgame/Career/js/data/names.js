// 虛構球員的名字庫（同年紀的對手、新生代職業球員、大學隊友、教練…）：依國家產生
const TW_SUR = '陳林黃張李王吳劉蔡楊許鄭謝洪郭邱曾廖賴徐周葉蘇莊呂江何蕭羅高潘簡朱鍾彭游詹胡施沈余趙盧梁顏柯翁魏孫戴范方宋鄧'.split('');
const TW_GIV = ['子安', '逸凡', '志豪', '冠宇', '承恩', '宇翔', '柏翰', '家豪', '品睿', '彥廷', '俊傑', '育誠', '冠廷', '宥廷', '睿哲', '昱辰', '柏宇', '承翰', '定諺', '紹恩', '浩宇', '祐銓', '庭碩', '晉嘉', '偉倫', '振宇', '恩齊', '弘毅', '子睿', '書豪', '佳穎', '詠晴', '芷昀', '宜蓁', '昕妤', '品妍', '子晴', '雨彤', '語喬', '采潔'];
const JP_SUR = ['佐藤', '鈴木', '高橋', '田中', '渡邊', '伊藤', '山本', '中村', '小林', '加藤', '吉田', '山田', '松本', '井上', '木村', '清水', '森', '池田', '橋本', '石川', '前田', '藤田', '岡田', '長谷川', '石井'];
const JP_GIV = ['蓮', '大翔', '悠真', '湊', '颯太', '陽翔', '健太', '翔', '亮', '大輝', '拓海', '隼人', '優斗', '海斗', '蒼', '涼介', '直樹', '雄大', '啟太', '恭平'];
const KR_SUR = ['金', '李', '朴', '崔', '鄭', '姜', '趙', '尹', '張', '林', '韓', '吳', '申', '權', '宋'];
const KR_GIV = ['敏俊', '書俊', '道允', '睿俊', '時宇', '朱元', '河俊', '志浩', '俊瑞', '宇鎮', '成民', '炫宇', '在勳', '東炫', '承佑', '泰熙', '允浩'];
const CN_SUR = ['王', '李', '張', '劉', '陳', '楊', '趙', '黃', '周', '吳', '徐', '孫', '胡', '朱', '高', '林', '何', '郭', '馬', '羅'];
const CN_GIV = ['浩然', '子軒', '宇航', '博文', '俊熙', '天佑', '一鳴', '明哲', '思遠', '嘉懿', '澤宇', '昊天', '鑫', '雲帆', '若愚'];
const EN_FIRST = ['Liam', 'Noah', 'Oliver', 'Elijah', 'James', 'Henry', 'Lucas', 'Theo', 'Jack', 'Owen', 'Wyatt', 'Caleb', 'Luke', 'Grant', 'Cole', 'Tyler', 'Ryan', 'Ethan', 'Mason', 'Logan', 'Carter', 'Austin', 'Brady', 'Chase', 'Drew', 'Garrett', 'Hayden', 'Jake', 'Max', 'Nate', 'Parker', 'Reid', 'Sam', 'Trent', 'Wade', 'Blake', 'Colin', 'Davis', 'Evan', 'Finn'];
const EN_LAST = ['Hart', 'Carter', 'Mitchell', 'Brooks', 'Hayes', 'Bennett', 'Reeves', 'Sullivan', 'Walker', 'Price', 'Fletcher', 'Dalton', 'Graves', 'Holt', 'Kendall', 'Lawson', 'Mercer', 'Norris', 'Porter', 'Quinn', 'Ramsey', 'Sawyer', 'Tate', 'Vaughn', 'Wells', 'Ashby', 'Barlow', 'Coleman', 'Doyle', 'Ellison', 'Foster', 'Garrison', 'Hollis', 'Irwin', 'Jensen', 'Keller', 'Lowell', 'Monroe', 'Nash', 'Owens', 'Pruitt', 'Rowe', 'Stanton', 'Thorne', 'Underwood', 'Whitaker', 'York'];
const UK_LAST = ['Ashworth', 'Bellamy', 'Crawford', 'Dunbar', 'Fraser', 'Gallagher', 'Hamilton', 'Kerr', 'Lennox', 'MacLeod', 'Murray', 'O\'Neill', 'Pembroke', 'Ritchie', 'Sinclair', 'Thornton', 'Wallace', 'Whitmore'];
const EU = {
  ESP: [['Pablo', 'Álvaro', 'Javier', 'Marcos', 'Diego', 'Adri'], ['García', 'Fernández', 'Navarro', 'Romero', 'Ortega', 'Castillo']],
  SWE: [['Erik', 'Oskar', 'Linus', 'Viktor', 'Axel', 'Hugo'], ['Lindqvist', 'Berg', 'Sandberg', 'Holm', 'Ek', 'Nyström']],
  DEN: [['Mads', 'Rasmus', 'Frederik', 'Jonas', 'Emil'], ['Kjeldsen', 'Hansen', 'Lund', 'Madsen', 'Vestergaard']],
  GER: [['Lukas', 'Jonas', 'Felix', 'Moritz', 'Paul'], ['Schmidt', 'Weber', 'Becker', 'Wagner', 'Hoffmann']],
  FRA: [['Antoine', 'Victor', 'Romain', 'Julien', 'Théo'], ['Lefèvre', 'Moreau', 'Dubois', 'Laurent', 'Girard']],
  ITA: [['Matteo', 'Lorenzo', 'Alessandro', 'Filippo'], ['Rossi', 'Bianchi', 'Ferrari', 'Conti', 'Romano']],
  NOR: [['Magnus', 'Sander', 'Henrik', 'Eirik'], ['Solberg', 'Berge', 'Dahl', 'Haugen']],
};
const AU_FIRST = ['Jack', 'Lachlan', 'Cooper', 'Harrison', 'Riley', 'Mitchell', 'Bailey', 'Kane'];
const LAT = [['Santiago', 'Mateo', 'Sebastián', 'Tomás', 'Emiliano', 'Nicolás'], ['Rodríguez', 'Gómez', 'Herrera', 'Vargas', 'Morales', 'Restrepo']];
const ZA = [['Jayden', 'Thriston', 'Christiaan', 'Wilco', 'Ruan'], ['van der Merwe', 'Botha', 'du Plessis', 'Pretorius', 'Lombard']];
const TH = [['Phachara', 'Ratchanon', 'Kittipong', 'Sarut'], ['Saengchai', 'Wongsawat', 'Chaiyaphan', 'Boonma']];

// 國家的出現比例（產生國際賽事的對手時用）
export const COUNTRY_MIX = [['USA', 46], ['ENG', 6], ['SCO', 2], ['IRL', 2], ['NIR', 1], ['AUS', 5], ['RSA', 3], ['CAN', 3], ['JPN', 5], ['KOR', 5], ['CHN', 2], ['TPE', 2], ['ESP', 3], ['SWE', 3], ['DEN', 2], ['GER', 2], ['FRA', 2], ['ITA', 1], ['NOR', 1], ['THA', 1], ['ARG', 1], ['COL', 1], ['MEX', 1], ['NZL', 1]];

export function pickCountry(r, mix = COUNTRY_MIX) {
  const tot = mix.reduce((s, x) => s + x[1], 0);
  let k = r() * tot;
  for (const [c, w] of mix) { if ((k -= w) < 0) return c; }
  return 'USA';
}

// 依國家產生名字：東方國家回傳中文名，其他回傳英文名
export function makeName(r, country, female = false) {
  const p = a => a[Math.floor(r() * a.length)];
  switch (country) {
    case 'TPE': return p(TW_SUR) + p(female ? TW_GIV.slice(30) : TW_GIV.slice(0, 30));
    case 'JPN': return p(JP_SUR) + p(JP_GIV);
    case 'KOR': return p(KR_SUR) + p(KR_GIV);
    case 'CHN': return p(CN_SUR) + p(CN_GIV);
    case 'ENG': case 'SCO': case 'IRL': case 'NIR': case 'WAL': return `${p(EN_FIRST)} ${p(UK_LAST)}`;
    case 'AUS': case 'NZL': return `${p(AU_FIRST)} ${p(EN_LAST)}`;
    case 'RSA': { const [a, b] = ZA; return `${p(a)} ${p(b)}`; }
    case 'THA': { const [a, b] = TH; return `${p(a)} ${p(b)}`; }
    case 'ARG': case 'COL': case 'MEX': case 'CHI': { const [a, b] = LAT; return `${p(a)} ${p(b)}`; }
    default:
      if (EU[country]) { const [a, b] = EU[country]; return `${p(a)} ${p(b)}`; }
      return `${p(EN_FIRST)} ${p(EN_LAST)}`;
  }
}
export const isEastern = c => ['TPE', 'JPN', 'KOR', 'CHN'].includes(c);
