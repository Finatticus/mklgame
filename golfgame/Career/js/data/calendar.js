// 賽程：各巡迴賽每年的比賽（週次、球場、獎金、人數、晉級線、積分等級）
//   球場 id：c_ 開頭是非真實球場（@C），其他是遊戲裡的真實 / 台灣 / 自創寫實球場
//   region：旅費的計算（na 北美、eu 歐洲、asia 亞洲、jp 日本、tw 台灣、latam 中南美、oce 大洋洲、me 中東）
//   tier：積分與世界排名的等級（見 tours.js 的 TIER）
import { teamSide } from './players.js';

// 四大賽與團體賽的場地輪替（第一年照 2026 年的真實場地）
export const ROTATION = {
  pga: ['c_aronimink', 'c_quailhollow', 'c_southernhills', 'c_valhalla', 'c_bethpage', 'kiawah', 'c_oakhill', 'c_whistling'],
  usopen: ['c_shinnecock', 'pebble', 'c_wingedfoot', 'c_pinehurst2', 'c_oakmont', 'c_lacc', 'c_oaklandhills', 'c_torreysouth'],
  open: ['c_birkdale', 'standrews', 'c_lytham', 'troon', 'c_portrush', 'carnoustie', 'c_hoylake', 'rsg', 'c_muirfield'],
  usam: ['c_merion', 'c_olympicclub', 'c_chambersbay', 'c_erinhills', 'c_prairiedunes', 'c_cherryhills', 'c_pinehurst4'],
  amateur: ['c_countydown', 'carnoustie', 'c_muirfield', 'c_birkdale', 'troon', 'c_portrush'],
  aac: ['c_kasumigaseki', 'c_sentosa', 'ticc', 'kawana', 'c_taiheiyo', 'mangilao'],
  ryderUS: ['c_bethpage', 'c_whistling', 'c_valhalla', 'c_oaklandhills'],
  ryderEU: ['c_adare', 'marcosimone', 'c_legolfnational', 'c_belfry', 'c_gleneagles'],
  presUS: ['c_quailhollow', 'c_harbourtown', 'c_muirfieldvillage', 'c_bethpage'],
  presIntl: ['rmw', 'c_kasumigaseki', 'c_sentosa', 'kawana'],
  olympic: { 2028: 'c_riviera', 2032: 'rmw', 2036: 'c_legolfnational', 2040: 'c_kasumigaseki', 2044: 'c_sentosa', 2048: 'standrews', 2052: 'c_riviera', 2056: 'kawana', 2060: 'marcosimone', 2064: 'pebble', 2068: 'c_adare', 2072: 'rmw' },
  bmw: ['c_cherryhills', 'c_oaklandhills', 'c_olympicclub', 'c_southernhills', 'c_wingedfoot'],
  ncaa: ['c_grayhawk', 'c_lacosta', 'c_richharvest', 'c_blessings'],
};
export const rot = (key, year) => { const r = ROTATION[key]; return r[((year - 2026) % r.length + r.length) % r.length]; };

// 獎金分配（PGA TOUR 標準比例，第 1~70 名；同分平分）
export const PAYOUT = [18, 10.9, 6.9, 4.9, 4.1, 3.625, 3.375, 3.125, 2.925, 2.725, 2.525, 2.325, 2.125, 1.925, 1.825, 1.725, 1.625, 1.525, 1.425, 1.325, 1.225, 1.125, 1.045, 0.965, 0.885, 0.805, 0.775, 0.745, 0.715, 0.685, 0.655, 0.625, 0.595, 0.57, 0.545, 0.52, 0.495, 0.475, 0.455, 0.435, 0.415, 0.395, 0.375, 0.355, 0.335, 0.315, 0.295, 0.279, 0.265, 0.257, 0.251, 0.245, 0.241, 0.237, 0.235, 0.233, 0.231, 0.229, 0.227, 0.225, 0.223, 0.221, 0.219, 0.217, 0.215, 0.213, 0.211, 0.209, 0.207, 0.205];

// ---------- PGA TOUR（含四大賽、THE PLAYERS、季後賽、秋季賽）----------
const P = (w, id, name, course, purse, o = {}) => ({ w, id, name, course, purse, tour: 'pga', field: 144, cut: 65, tier: 'pga', region: 'na', ...o });
const PGA = [
  P(2, 'sentry', 'The Sentry', 'c_kapalua', 20e6, { field: 59, cut: 0, tier: 'sig', sig: true, region: 'oce', note: '開幕戰：前一年的冠軍與積分前段才能參加，不設晉級線' }),
  P(3, 'sony', 'Sony Open in Hawaii', 'c_waialae', 8.7e6, { region: 'oce' }),
  P(4, 'amex', 'The American Express', 'c_pgawest', 8.8e6, { field: 156 }),
  P(5, 'farmers', 'Farmers Insurance Open', 'c_torreysouth', 9.3e6, { field: 156 }),
  P(6, 'phoenix', 'WM Phoenix Open', 'c_tpcscottsdale', 9.6e6, { note: '16 洞被看台包圍，是全世界最吵的三桿洞' }),
  P(7, 'pebble', 'AT&T Pebble Beach Pro-Am', 'pebble', 20e6, { field: 80, cut: 0, tier: 'sig', sig: true, alt: 'c_spyglass' }),
  P(8, 'genesis', 'The Genesis Invitational', 'c_riviera', 20e6, { field: 72, cut: 50, tier: 'sig', sig: true }),
  P(9, 'cognizant', 'Cognizant Classic', 'c_pganational', 9.2e6),
  P(10, 'api', 'Arnold Palmer Invitational', 'c_bayhill', 20e6, { field: 72, cut: 50, tier: 'sig', sig: true }),
  P(11, 'players', 'THE PLAYERS Championship', 'sawgrass', 25e6, { tier: 'players', field: 144, cut: 65, note: '常被稱為第五大賽；17 洞島嶼果嶺', fedex: 750 }),
  P(12, 'valspar', 'Valspar Championship', 'c_copperhead', 8.7e6),
  P(14, 'valero', 'Valero Texas Open', 'c_tpcsanantonio', 9.5e6, { note: '名人賽前一週的最後一張門票（冠軍拿到名人賽邀請）' }),
  P(15, 'masters', 'Masters Tournament', 'c_augusta', 21e6, { tour: 'major', tier: 'major', field: 95, cut: 50, major: 'masters', invite: true, note: '奧古斯塔；晉級線前 50 名含同分' }),
  P(16, 'heritage', 'RBC Heritage', 'c_harbourtown', 20e6, { field: 72, cut: 0, tier: 'sig', sig: true }),
  P(18, 'truist', 'Truist Championship', 'c_quailhollow', 20e6, { field: 72, cut: 0, tier: 'sig', sig: true }),
  P(20, 'pgachamp', 'PGA Championship', 'rot:pga', 19e6, { tour: 'major', tier: 'major', field: 156, cut: 70, major: 'pga' }),
  P(21, 'colonial', 'Charles Schwab Challenge', 'c_colonial', 9.5e6, { field: 120 }),
  P(22, 'memorial', 'the Memorial Tournament', 'c_muirfieldvillage', 20e6, { field: 72, cut: 50, tier: 'sig', sig: true }),
  P(24, 'usopen', 'U.S. Open', 'rot:usopen', 21.5e6, { tour: 'major', tier: 'major', field: 156, cut: 60, major: 'usopen', note: '最難的場地設定，冠軍常常接近標準桿' }),
  P(25, 'travelers', 'Travelers Championship', 'c_riverhighlands', 20e6, { field: 72, cut: 0, tier: 'sig', sig: true }),
  P(26, 'rocket', 'Rocket Classic', 'c_detroit', 9.6e6, { field: 156 }),
  P(27, 'deere', 'John Deere Classic', 'c_deererun', 8.4e6, { field: 156 }),
  P(28, 'scottish', 'Genesis Scottish Open', 'c_gleneagles', 9e6, { region: 'eu', co: 'dp' }),
  P(29, 'open', 'The Open Championship', 'rot:open', 17e6, { tour: 'major', tier: 'major', field: 156, cut: 70, major: 'open', region: 'eu', note: '冠軍稱為 Champion Golfer of the Year' }),
  P(31, '3m', '3M Open', 'c_tpctwincities', 8.4e6, { field: 156 }),
  P(32, 'wyndham', 'Wyndham Championship', 'c_sedgefield', 8.2e6, { field: 156, note: '例行賽最後一站：聯邦快遞盃前 70 名進季後賽' }),
  P(33, 'stjude', 'FedEx St. Jude Championship', 'c_southwind', 20e6, { field: 70, cut: 0, tier: 'playoff', playoff: 1, note: '季後賽第一戰：前 70 名' }),
  P(34, 'bmw', 'BMW Championship', 'rot:bmw', 20e6, { field: 50, cut: 0, tier: 'playoff', playoff: 2, note: '季後賽第二戰：前 50 名' }),
  P(35, 'tourchamp', 'TOUR Championship', 'c_eastlake', 40e6, { field: 30, cut: 0, tier: 'playoff', playoff: 3, note: '聯邦快遞盃總決賽：前 30 名；冠軍就是聯邦快遞盃總冠軍' }),
  P(39, 'procore', 'Procore Championship', 'c_spyglass', 6e6, { fall: true }),
  P(41, 'sanderson', 'Sanderson Farms Championship', 'c_seaisland', 7.6e6, { fall: true }),
  P(43, 'zozo', 'Baycurrent Classic', 'c_taiheiyo', 8e6, { fall: true, field: 78, cut: 0, region: 'jp' }),
  P(45, 'worldwide', 'World Wide Technology Championship', 'c_panama', 7.2e6, { fall: true, region: 'latam' }),
  P(47, 'rsm', 'The RSM Classic', 'c_seaisland', 7.6e6, { fall: true, field: 156, note: '季末最後一站：積分第 100 名以內保住下一季全卡' }),
  P(49, 'hero', 'Hero World Challenge', 'c_emeraldbay', 5e6, { field: 20, cut: 0, tier: 'exh', exh: true, region: 'latam', note: '季末邀請賽（20 人，不計正式積分）' }),
];

// ---------- 團體賽 / 奧運 ----------
export function teamEvents(year) {
  const out = [];
  if (year % 2 === 1) out.push({ w: 38, id: 'ryder', name: 'Ryder Cup', tour: 'team', kind: 'ryder', course: year % 4 === 1 ? rot('ryderUS', Math.floor(year / 4)) : rot('ryderEU', Math.floor(year / 4)), host: year % 4 === 1 ? 'usa' : 'eur', field: 24, tier: 'team', region: year % 4 === 1 ? 'na' : 'eu', note: '歐洲隊對美國隊，三天比洞賽（四球賽、輪流擊球、單人賽）' });
  else out.push({ w: 38, id: 'presidents', name: 'Presidents Cup', tour: 'team', kind: 'presidents', course: year % 4 === 2 ? rot('presUS', Math.floor(year / 4)) : rot('presIntl', Math.floor(year / 4)), host: year % 4 === 2 ? 'usa' : 'intl', field: 24, tier: 'team', region: year % 4 === 2 ? 'na' : 'oce', note: '國際隊（歐洲以外）對美國隊' });
  if (year % 4 === 0 && year >= 2028) out.push({ w: 31, id: 'olympics', name: `奧運高爾夫（${year}）`, tour: 'olympic', kind: 'olympic', course: ROTATION.olympic[year] || 'c_riviera', field: 60, cut: 0, tier: 'olympic', region: 'na', note: '依世界排名，每國最多 2 人（世界前 15 名最多 4 人）；金銀銅牌' });
  return out;
}

// ---------- Korn Ferry Tour（前 20 名拿 PGA TOUR 卡）----------
const K = (w, id, name, course, purse = 1e6, o = {}) => ({ w, id: 'kft_' + id, name: 'Korn Ferry Tour · ' + name, course, purse, tour: 'kft', field: 156, cut: 65, tier: 'kft', region: 'na', ...o });
const KFT = [
  K(2, 'bahamas', 'The Bahamas Great Exuma Classic', 'c_emeraldbay', 1e6, { region: 'latam' }),
  K(3, 'abaco', 'The Bahamas Great Abaco Classic', 'c_emeraldbay', 1e6, { region: 'latam' }),
  K(6, 'panama', 'Panama Championship', 'c_panama', 1e6, { region: 'latam' }),
  K(8, 'astara', 'Astara Golf Championship', 'c_bogota', 1e6, { region: 'latam' }),
  K(11, 'lecom', 'LECOM Suncoast Classic', 'c_missioninn'),
  K(13, 'louisiana', 'Louisiana Open', 'c_seaisland'),
  K(16, 'sugarloaf', 'Huntsville Championship', 'c_sugarloaf'),
  K(18, 'carolina', 'Visit Knoxville Open', 'c_crestview'),
  K(20, 'wichita', 'Wichita Open', 'c_crestview'),
  K(22, 'compliance', 'The Compliance Solutions Championship', 'c_grayhawk'),
  K(24, 'bmwcharity', 'BMW Charity Pro-Am', 'c_blessings'),
  K(26, 'memorial_kft', 'Memorial Health Championship', 'c_richharvest'),
  K(28, 'frenchlick', 'Kansas City Classic', 'c_frenchlick'),
  K(30, 'utah', 'Utah Championship', 'c_hillcrest'),
  K(31, 'pinnacle', 'Pinnacle Bank Championship', 'c_indiancreek'),
  K(33, 'ohiostate', "Nationwide Children's Hospital Championship", 'c_ohiostate', 1.5e6),
  K(35, 'albertsons', 'Albertsons Boise Open', 'c_hillcrest', 1.5e6, { finals: true }),
  K(37, 'simmons', 'Simmons Bank Open', 'c_karstencreek', 1.5e6, { finals: true }),
  K(39, 'kftchamp', 'Korn Ferry Tour Championship', 'c_victoria', 2e6, { field: 75, cut: 0, finals: true, note: '最後一站：積分前 20 名拿到 PGA TOUR 全季資格' }),
];

// ---------- PGA TOUR Americas（前 10 名拿 Korn Ferry Tour 卡）----------
const A = (w, id, name, course, o = {}) => ({ w, id: 'pta_' + id, name: 'PGA TOUR Americas · ' + name, course, purse: 225000, tour: 'pta', field: 144, cut: 60, tier: 'pta', region: 'latam', ...o });
const PTA = [
  A(9, 'bogota', 'Bupa Championship', 'c_bogota'), A(11, 'panama', 'Panama Open', 'c_panama'), A(14, 'mexico', 'Mexico Open', 'canyon'),
  A(16, 'argentina', 'Argentina Open', 'maple'), A(23, 'canada1', 'Royal Beach Victoria Open', 'cliffs', { region: 'na' }), A(25, 'canada2', 'ATB Classic', 'alpine', { region: 'na' }),
  A(27, 'canada3', 'Manitoba Open', 'heron', { region: 'na' }), A(29, 'canada4', 'Osprey Valley Open', 'palmcove', { region: 'na' }),
  A(32, 'canada5', 'CRMC Championship', 'c_crestview', { region: 'na' }), A(35, 'final', 'PGA TOUR Americas Championship', 'oasis', { region: 'na', field: 60, cut: 0 }),
];

// ---------- DP World Tour（前 10 名非 PGA 會員拿 PGA TOUR 卡）----------
const D = (w, id, name, course, purse, o = {}) => ({ w, id: 'dp_' + id, name, course, purse, tour: 'dp', field: 132, cut: 65, tier: 'dp', region: 'eu', ...o });
const DP = [
  D(3, 'dubai', 'Hero Dubai Desert Classic', 'saltflat', 9e6, { region: 'me', tier: 'dp+' }),
  D(4, 'abudhabi', 'Abu Dhabi Championship', 'oasis', 9e6, { region: 'me', tier: 'dp+' }),
  D(9, 'india', 'Hero Indian Open', 'canyon', 2.5e6, { region: 'asia' }),
  D(10, 'singapore', 'Singapore Classic', 'c_sentosa', 2.5e6, { region: 'asia', co: 'asia' }),
  D(17, 'japan', 'ISPS HANDA Japan Championship', 'kawana', 2.5e6, { region: 'jp', co: 'jp' }),
  D(19, 'korea', 'Korea Championship', 'maple', 2.5e6, { region: 'asia' }),
  D(23, 'belgian', 'Soudal Open', 'c_belfry', 2.5e6),
  D(25, 'italian', 'Italian Open', 'marcosimone', 3.25e6),
  D(26, 'bmwint', 'BMW International Open', 'alpine', 2.75e6),
  D(27, 'irish', 'Amgen Irish Open', 'c_countydown', 6e6, { tier: 'dp+' }),
  D(30, 'scandi', 'Scandinavian Mixed', 'heron', 2e6),
  D(36, 'european', 'Omega European Masters', 'sakura', 2.75e6),
  D(37, 'bmwpga', 'BMW PGA Championship', 'c_wentworth', 9e6, { tier: 'dp+', note: '歐巡旗艦賽' }),
  D(39, 'french', 'FedEx Open de France', 'c_legolfnational', 3.25e6),
  D(40, 'dunhill', 'Alfred Dunhill Links Championship', 'standrews', 5e6),
  D(42, 'andalucia', 'Estrella Damm N.A. Andalucía Masters', 'c_valderrama', 3e6),
  D(44, 'spanish', 'acciona Open de España', 'palmcove', 2.75e6),
  D(46, 'abudhabi2', 'Abu Dhabi HSBC Championship', 'oasis', 9e6, { region: 'me', tier: 'dp+', finals: true }),
  D(47, 'dpchamp', 'DP World Tour Championship', 'saltflat', 10e6, { region: 'me', tier: 'dp+', field: 50, cut: 0, finals: true, note: '歐洲巡迴賽總決賽（Race to Dubai）' }),
  D(49, 'australian', 'ISPS HANDA Australian Open', 'rmw', 2e6, { region: 'oce', co: 'asia' }),
];

// ---------- Asian Tour（獎金榜冠軍拿 DP World Tour 卡）----------
const S = (w, id, name, course, purse, o = {}) => ({ w, id: 'as_' + id, name: 'Asian Tour · ' + name, course, purse, tour: 'asia', field: 144, cut: 65, tier: 'asia', region: 'asia', ...o });
const ASIA = [
  S(5, 'philippines', 'Philippine Open', 'palmcove', 5e5),
  S(10, 'singapore', 'Singapore Classic', 'c_sentosa', 2.5e6, { co: 'dp', tier: 'dp' }),
  S(12, 'thailand', 'Thailand Open', 'heron', 5e5),
  S(15, 'macao', 'International Series Macau', 'cliffs', 2e6, { tier: 'asia+' }),
  S(19, 'gsbc', 'GS Caltex Maekyung Open', 'maple', 1e6),
  S(22, 'yeangder', 'Yeangder TPC', 'lilygolf', 1e6, { region: 'tw' }),
  S(28, 'mandiri', 'Mandiri Indonesia Open', 'palmcove', 5e5),
  S(34, 'taiwanmasters', 'Taiwan Masters', 'taipei', 7e5, { region: 'tw' }),
  S(38, 'shinhan', 'Shinhan Donghae Open', 'sakura', 1.2e6, { co: 'jp' }),
  S(41, 'hongkong', 'Link Hong Kong Open', 'cliffs', 2e6, { tier: 'asia+' }),
  S(44, 'mercuries', 'Mercuries Taiwan Masters', 'taoyuan', 1e6, { region: 'tw' }),
  S(46, 'saudi', 'PIF Saudi International', 'saltflat', 5e6, { region: 'me', tier: 'asia+' }),
  S(48, 'guam', 'Guam Championship', 'mangilao', 7e5, { region: 'oce' }),
  S(50, 'riyadh', 'International Series Riyadh', 'oasis', 2e6, { region: 'me', tier: 'asia+', finals: true }),
];

// ---------- Japan Golf Tour ----------
const J = (w, id, name, course, purse, o = {}) => ({ w, id: 'jp_' + id, name: '日巡 · ' + name, course, purse, tour: 'jp', field: 132, cut: 60, tier: 'jp', region: 'jp', ...o });
const JPN = [
  J(15, 'tokenhome', 'Token Homemate Cup', 'sakura', 1.3e6), J(17, 'chunichi', 'Chunichi Crowns', 'alpine', 1.1e6),
  J(21, 'japangolf', 'Japan Golf Tour Championship', 'c_kasumigaseki', 1.0e6), J(23, 'mizuno', 'Mizuno Open', 'heron', 0.9e6, { note: '前段班拿到英國公開賽資格' }),
  J(36, 'fujisankei', 'Fujisankei Classic', 'kawana', 1.0e6), J(39, 'pana', 'Panasonic Open', 'maple', 1.0e6),
  J(41, 'japanopen', 'Japan Open', 'c_kasumigaseki', 1.4e6, { tier: 'jp+' }), J(44, 'mynavi', 'Mynavi ABC Championship', 'cliffs', 1.1e6),
  J(46, 'taiheiyo', 'Mitsui Sumitomo VISA Taiheiyo Masters', 'c_taiheiyo', 1.4e6, { tier: 'jp+' }), J(47, 'dunlop', 'Dunlop Phoenix', 'palmcove', 1.4e6, { tier: 'jp+' }),
  J(49, 'nippon', 'Golf Nippon Series JT Cup', 'kawana', 0.9e6, { field: 30, cut: 0, finals: true }),
];

// ---------- 台灣 PGA 巡迴賽（台灣球場）----------
const T = (w, id, name, course, purse, o = {}) => ({ w, id: 'tp_' + id, name: '台巡 · ' + name, course, purse, tour: 'tpga', field: 120, cut: 60, tier: 'tpga', region: 'tw', ...o });
const TPGA = [
  T(9, 'kaohsiung', '高雄公開賽', 'kaohsiung', 9e4), T(13, 'taichung', '台中國際公開賽', 'ticc', 1e5), T(17, 'tainan', '台南名人賽', 'tainan', 8e4),
  T(20, 'royal', '老爺關西錦標賽', 'royalkh', 9e4), T(25, 'sunrise', '揚昇公開賽', 'sunrise', 1e5), T(30, 'eastcoast', '東華邀請賽', 'donghua', 8e4),
  T(36, 'miramar', '美麗華錦標賽', 'miramar', 1e5), T(40, 'cggc', '長庚錦標賽', 'cggc', 1.2e5), T(45, 'taiwanopen', '台灣公開賽', 'taoyuan', 2e5, { tier: 'tpga+' }),
  T(50, 'final', '台巡年終總決賽', 'hsinchu', 1.5e5, { field: 40, cut: 0, finals: true }),
];

// ---------- 資格賽 ----------
export const QSCHOOL = [
  { w: 40, id: 'q_pre', name: 'PGA TOUR Q-School 預選賽', tour: 'qs', stage: 0, course: 'c_crestview', rounds: 3, field: 78, adv: 30, fee: 4000, region: 'na', tier: 'qs' },
  { w: 42, id: 'q_first', name: 'PGA TOUR Q-School 第一關', tour: 'qs', stage: 1, course: 'c_hillcrest', rounds: 4, field: 78, adv: 30, fee: 5500, region: 'na', tier: 'qs' },
  { w: 46, id: 'q_second', name: 'PGA TOUR Q-School 第二關', tour: 'qs', stage: 2, course: 'c_lacosta', rounds: 4, field: 78, adv: 25, fee: 0, region: 'na', tier: 'qs' },
  { w: 50, id: 'q_final', name: 'PGA TOUR Q-School 決賽', tour: 'qs', stage: 3, course: 'sawgrass', rounds: 4, field: 156, adv: 10, fee: 0, region: 'na', tier: 'qs', note: '前 10 名（含同分）直接拿到 PGA TOUR 資格；其他依名次分到 Korn Ferry Tour 或 PGA TOUR Americas' },
  { w: 2, id: 'q_asia', name: 'Asian Tour Q-School 決賽', tour: 'qs', stage: 9, course: 'c_sentosa', rounds: 5, field: 120, adv: 35, fee: 3500, region: 'asia', tier: 'qs', note: '前 35 名（含同分）拿到亞巡全季資格' },
  { w: 45, id: 'q_dp', name: 'DP World Tour Q-School 決賽', tour: 'qs', stage: 8, course: 'c_valderrama', rounds: 6, field: 156, adv: 20, fee: 4000, region: 'eu', tier: 'qs', note: '前 20 名拿到 DP World Tour 資格' },
  { w: 1, id: 'q_tpga', name: '台巡資格賽', tour: 'qs', stage: 7, course: 'hsingfu', rounds: 3, field: 90, adv: 40, fee: 600, region: 'tw', tier: 'qs' },
];

// ---------- 業餘（大學、業餘大賽）----------
export function amateurEvents(year) {
  const ev = [
    { w: 33, id: 'usam', name: 'U.S. Amateur', tour: 'am', course: rot('usam', year), field: 64, kind: 'usam', tier: 'am_major', region: 'na', note: '兩天比桿賽選出 64 人，之後比洞賽；冠軍拿到名人賽、美國公開賽、英國公開賽邀請' },
    { w: 24, id: 'amateur', name: 'The Amateur Championship', tour: 'am', course: rot('amateur', year), field: 64, kind: 'usam', tier: 'am_major', region: 'eu', note: '英國業餘錦標賽：冠軍拿到名人賽、英國公開賽、美國公開賽邀請' },
    { w: 43, id: 'aac', name: 'Asia-Pacific Amateur Championship', tour: 'am', course: rot('aac', year), field: 120, cut: 60, tier: 'am_major', region: 'asia', asiaOnly: true, note: '亞太業餘錦標賽：冠軍拿到名人賽邀請' },
  ];
  if (year % 2 === 0) ev.push({ w: 41, id: 'eisenhower', name: 'Eisenhower Trophy', tour: 'am', course: rot('aac', year + 3), field: 120, cut: 0, tier: 'am', region: 'asia', national: true, note: '世界業餘隊際錦標賽（偶數年）；國家代表隊' });
  else ev.push({ w: 36, id: 'walker', name: 'Walker Cup', tour: 'am', kind: 'walker', course: year % 4 === 1 ? 'c_merion' : 'c_countydown', field: 20, tier: 'am', region: year % 4 === 1 ? 'na' : 'eu', note: '英國與愛爾蘭對美國的業餘團體賽' });
  return ev;
}
export function collegeEvents(year) {
  const fall = ['c_yale', 'c_prairiedunes', 'c_karstencreek', 'c_cherryhills', 'c_stanford'], spring = ['c_southernhighlands', 'c_missioninn', 'c_stanford', 'c_blessings', 'c_richharvest', 'c_lacosta'];
  const C = (w, id, name, course, o = {}) => ({ w, id: 'nc_' + id, name, course, tour: 'ncaa', field: 75, cut: 0, rounds: 3, tier: 'college', region: 'na', team: true, ...o });
  return [
    C(37, 'fall1', '秋季邀請賽 · ' + 'Carmel Cup', fall[(year) % 5]), C(39, 'fall2', '秋季邀請賽 · Fighting Illini Invitational', fall[(year + 1) % 5]),
    C(41, 'fall3', '秋季邀請賽 · Jackson T. Stephens Cup', fall[(year + 2) % 5]), C(43, 'fall4', '秋季邀請賽 · East Lake Cup', 'c_eastlake', { field: 32, note: '秋季最受矚目的大學比洞賽' }),
    C(45, 'fall5', '秋季邀請賽 · Golf Club of Georgia Collegiate', fall[(year + 3) % 5]),
    C(6, 'spr1', '春季邀請賽 · Southern Highlands Collegiate', 'c_southernhighlands'), C(8, 'spr2', '春季邀請賽 · Puerto Rico Classic', spring[(year + 1) % 6]),
    C(10, 'spr3', '春季邀請賽 · Valspar Collegiate', 'c_copperhead'), C(12, 'spr4', '春季邀請賽 · Western Intercollegiate', 'c_stanford'),
    C(14, 'spr5', '春季邀請賽 · Calusa Cup', spring[(year + 4) % 6]),
    C(17, 'conf', '聯盟錦標賽', spring[year % 6], { note: '聯盟冠軍隊伍直接進 NCAA 區域賽' }),
    C(19, 'regional', 'NCAA 區域賽', 'c_karstencreek', { note: '每區前 5 隊與最佳個人晉級 NCAA 錦標賽' }),
    C(21, 'ncaa', 'NCAA Championship', rot('ncaa', year), { rounds: 4, field: 156, cut: 0, tier: 'college+', note: '個人冠軍與團體冠軍；PGA TOUR University 排名結算' }),
    { w: 23, id: 'palmer', name: 'Palmer Cup', tour: 'ncaa', kind: 'palmer', course: year % 2 ? 'c_adare' : 'c_cherryhills', field: 24, tier: 'college', region: year % 2 ? 'eu' : 'na', note: '大學生的國際團體賽（美國對國際）' },
  ];
}

// ---------- 青少年（依國籍的國內賽 + 國際賽）----------
// 各國的國內球場（青少年排名賽、國內業餘賽、兒童盃）
export const HOME_COURSES = {
  TPE: ['taipei', 'tashee', 'taoyuan', 'yunghan', 'sunrise', 'lungtan', 'royalkh', 'lilygolf', 'hsinchu', 'zaixing', 'paoshan', 'ticc', 'hunghsi', 'taifong', 'nanfeng', 'chianan', 'tainan', 'kaohsiung', 'hsinyi', 'donghua', 'miramar', 'cggc'],
  JPN: ['kawana', 'c_taiheiyo', 'c_kasumigaseki', 'sakura', 'alpine', 'heron'],
  KOR: ['maple', 'sakura', 'alpine', 'heron', 'cliffs', 'palmcove'],
  USA: ['c_seaisland', 'c_carmelvalley', 'c_missioninn', 'c_torreynorth', 'c_pinehurst4', 'c_pinehurst8', 'c_crestview', 'c_hillcrest'],
  EUR: ['c_countydown', 'c_belfry', 'c_gleneagles', 'carnoustie', 'troon', 'c_wentworth', 'heron'],
};
export const homeCourses = c => HOME_COURSES[c] || (teamSide(c) === 'eur' ? HOME_COURSES.EUR : HOME_COURSES.TPE);
export const DOMESTIC_NAME = {
  TPE: { rank: '全國青少年高爾夫排名賽', school: '全國中等學校運動會', open: '全國業餘高爾夫公開賽', kids: '兒童盃', fed: '中華高爾夫協會' },
  JPN: { rank: '日本青少年高爾夫排名賽', school: '全國高校高爾夫選手權', open: '日本業餘錦標賽', kids: '全國少年高爾夫大會', fed: '日本高爾夫協會' },
  KOR: { rank: '韓國青少年排名賽', school: '全國體育大會', open: '韓國業餘錦標賽', kids: '全國少年盃', fed: '大韓高爾夫協會' },
  USA: { rank: 'Junior Tour 排名賽', school: '高中州冠軍賽', open: 'U.S. Junior Amateur', kids: 'U.S. Kids Golf 地區賽', fed: 'USGA' },
  EUR: { rank: '國家青少年排名賽', school: '校際錦標賽', open: '國家業餘錦標賽', kids: '兒童錦標賽', fed: '國家高爾夫協會' },
};
export const domesticName = c => DOMESTIC_NAME[c] || (teamSide(c) === 'eur' ? DOMESTIC_NAME.EUR : DOMESTIC_NAME.TPE);
export function juniorEvents(year, country) {
  const hc = homeCourses(country), dn = domesticName(country), dom = country === 'USA' ? 'na' : teamSide(country) === 'eur' ? 'eu' : country === 'TPE' ? 'tw' : country === 'JPN' ? 'jp' : 'asia';
  const J = (w, id, name, course, o = {}) => ({ w, id: 'jr_' + id, name, course, tour: 'junior', field: 72, cut: 0, rounds: 2, tier: 'junior', region: dom, ...o });
  const ev = [];
  [5, 11, 17, 22, 30, 39, 46].forEach((w, i) => ev.push(J(w, 'rank' + (i + 1), `${dn.rank} 第 ${i + 1} 站`, hc[(year * 3 + i * 5) % hc.length], { rank: true })));
  ev.push(J(16, 'school', dn.school, hc[(year + 2) % hc.length], { rounds: 3, team: true, note: '學校團體賽：和隊友一起拿團體獎牌' }));
  ev.push(J(40, 'open', dn.open, hc[(year + 7) % hc.length], { rounds: 4, field: 120, cut: 60, tier: 'am', open: true, note: '和成人業餘一起比；17 歲之前拿到冠軍是很大的成就' }));
  ev.push(J(26, 'ajga1', 'AJGA · Sea Island Junior', 'c_seaisland', { region: 'na', rounds: 3, ajga: true, inv: 'ajga' }));
  ev.push(J(28, 'ajga2', 'AJGA · Carmel Valley Invitational', 'c_carmelvalley', { region: 'na', rounds: 3, ajga: true, inv: 'ajga' }));
  ev.push(J(29, 'img', 'IMG Academy Junior World Championships', 'c_torreynorth', { region: 'na', rounds: 4, field: 156, cut: 0, tier: 'junior+', inv: 'img', note: '每年夏天在聖地牙哥舉行的世界青少年錦標賽' }));
  ev.push(J(32, 'ajga3', 'AJGA · Rolex Tournament of Champions', 'c_missioninn', { region: 'na', rounds: 4, ajga: true, inv: 'ajga_elite', tier: 'junior+' }));
  ev.push({ w: 37, id: year % 2 ? 'jr_ryder' : 'jr_pres', name: year % 2 ? 'Junior Ryder Cup' : 'Junior Presidents Cup', tour: 'junior', kind: year % 2 ? 'jryder' : 'jpres', course: year % 2 ? 'c_adare' : 'c_harbourtown', field: 24, tier: 'junior+', region: year % 2 ? 'eu' : 'na', inv: 'jteam', note: '依國籍；入選是青少年的最高榮譽' });
  if ((year - 2026) % 4 === 0 || year === 2026) ev.push(J(38, 'asiangames', `亞運高爾夫（${year}）`, rot('aac', year + 1), { region: 'asia', rounds: 4, field: 80, tier: 'am', national: true, asiaOnly: true, note: '每四年；國家代表隊才能參加' }));
  return ev;
}

// 一年的職業賽程（依巡迴）
export function tourCalendar(tour, year) {
  const list = { pga: PGA, kft: KFT, pta: PTA, dp: DP, asia: ASIA, jp: JPN, tpga: TPGA }[tour] || [];
  return list.map(e => ({ ...e, year, course: resolveCourse(e.course, year) }));
}
export function resolveCourse(c, year) {
  return typeof c === 'string' && c.startsWith('rot:') ? rot(c.slice(4), year) : c;
}
// 所有巡迴的大賽（給「名人賽的邀請」「新聞」用）
export const MAJORS = ['masters', 'pgachamp', 'usopen', 'open'];
export const MAJOR_ZH = { masters: '名人賽', pgachamp: 'PGA 錦標賽', usopen: '美國公開賽', open: '英國公開賽' };
export const TOUR_ZH = { pga: 'PGA TOUR', major: '四大賽', kft: 'Korn Ferry Tour', pta: 'PGA TOUR Americas', dp: 'DP World Tour', asia: 'Asian Tour', jp: 'Japan Golf Tour', tpga: '台灣 PGA 巡迴賽', qs: '資格賽', am: '業餘大賽', ncaa: 'NCAA 大學聯賽', junior: '青少年賽', team: '團體賽', olympic: '奧運', champions: 'PGA TOUR Champions', kids: '兒童賽', exh: '表演賽' };
