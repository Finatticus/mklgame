// 劇情文字：主線事件、隨機事件、新聞標題、記者會題目
//   效果（fx）：mood 心情、energy 體能、money 資金、fame 人氣、fol 追蹤數、form 手感、grade 學業、
//              rel:{家人 family / 導師 mentor / 玩伴 friend / 宿敵 rival / 教練 coach / 桿弟 caddie / 經紀人 agent / 隊友 team}、
//              train:{long/iron/short/putt/mind: 訓練經驗}、stat:{素質: 點數}、pers:{gent 紳士 / conf 自信 / humor 幽默}、xp 經驗
//   {name} = 球員名、{friend} = 童年玩伴、{mentor} = 啟蒙導師、{rival} = 目前的宿敵、{caddie} = 桿弟、{home} = 家鄉

// ---------- 主線事件（插畫卡 + 對話；可以跳過）----------
export const MAIN = {
  // 序章
  prologue: { ch: 0, title: '那年四月，我八歲', img: 'masters-gallery.jpg', text: ['客廳的電視正在轉播名人賽最後一輪。奧古斯塔的松樹、白色的沙坑、安靜得聽得見呼吸的果嶺。', '{champ} 推進最後一顆球，上屆冠軍把綠夾克披到他的肩上。', '爺爺說：「那件衣服，全世界只有幾十個人穿過。」', '你盯著螢幕，心裡想：總有一天，我也要穿上它。'], goal: '穿上綠夾克' },
  // 第二章
  ch2_start: { ch: 2, title: '拜師', img: 'young-putting.jpg', text: ['國一那年，三位教練看了你的比賽。', '技術派要你重新打掉揮桿、數據派給你一份三年的訓練表、心理派只問了一句：「你為什麼打球？」'], choose: 'coach' },
  first_set: { ch: 2, title: '第一套成人球桿', img: 'bag-clubs.jpg', text: ['你長高了，兒童桿已經握不住了。', '{family_who}帶你去球具店，挑了第一套屬於自己的成人球桿。店員說：「好好照顧它們，它們會記得你的每一桿。」'], fx: { mood: 10 } },
  social: { ch: 2, title: '開了自己的社群帳號', img: 'swing-sunset.jpg', text: ['15 歲，你開了第一個社群帳號。', '第一篇貼文是一段練習場的揮桿影片，按讚的人大多是同學。這是你的第一批球迷。'], fx: { fol: 120 } },
  rival_born: { ch: 2, title: '最好的朋友，最強的對手', img: 'boy-flag.jpg', text: ['{friend} 在排名賽最後一洞推進一顆 6 碼的博蒂，贏了你一桿。', '頒獎時他朝你笑了一下。從那天起，你們不只是一起長大的朋友。'], fx: { rel: { rival: 10 } } },
  national: { ch: 2, title: '入選國家代表隊', img: 'kids-camp.jpg', text: ['{fed}公布了青少年國家代表隊名單，你的名字在上面。', '集訓的第一天，教練說：「從今天起，你代表的不只是你自己。」'], fx: { mood: 15, fame: 800 } },
  style: { ch: 2, title: '你的球風', img: 'range-holma.jpg', text: ['青少年的最後一年，你的球已經有了自己的樣子。', '你是哪一種球員？（決定之後每一項素質的上限）'], choose: 'style' },
  crossroads: { ch: 2, title: '十八歲的三條路', img: 'ra-clubhouse.jpg', text: ['高中畢業前，家裡的餐桌上放著三份文件：國內大學的保送通知、美國大學的獎學金信、還有一份經紀公司的職業合約草稿。'], choose: 'path' },
  // 第三章
  ch3_start: { ch: 3, title: '第一次離家', img: 'kids-camp2.jpg', text: ['行李箱裡放著球鞋、課本，還有{family_who}偷偷塞進去的一包家鄉的茶葉。', '宿舍的室友是一位從德州來的高個子，他說他的夢想是打進 PGA TOUR。你說，你的夢想是名人賽。'] },
  masters_am: { ch: 3, title: '業餘身分的名人賽邀請', img: 'augusta-clubhouse.jpg', text: ['信封上印著奧古斯塔的徽章。', '業餘選手會住在會館頂樓的 Crow\'s Nest，和職業選手同場比賽。成績最好的業餘選手，星期天會在頒獎台上拿到銀盃。'], fx: { mood: 25, fame: 6000 } },
  crows_nest: { ch: 3, title: "Crow's Nest", img: 'augusta-aerial.jpg', text: ['會館頂樓的小房間，窗外是整片的松樹。', '牆上貼著歷屆業餘選手的簽名。你在最下面一行簽上自己的名字。'] },
  pga_u: { ch: 3, title: 'PGA TOUR University', img: 'ra-clubhouse.jpg', text: ['大學最後一個賽季結束，PGA TOUR University 的排名公布了。'] },
  turn_pro: { ch: 3, title: '轉職業', img: 'ball-tee.jpg', text: ['你在合約的最後一頁簽下名字。從今天起，每一桿都和存款有關。'], fx: { mood: 10 } },
  // 第四章
  ch4_start: { ch: 4, title: '沒有人認識你的週一', img: 'range-puttenham.jpg', text: ['週一資格賽，早上六點半開球。一百五十個人搶四個正賽名額。', '你的車停在停車場最遠的角落，後車廂是全部家當。'] },
  agent: { ch: 4, title: '第一位經紀人', img: 'bag-scottish.jpg', text: ['三家經紀公司都打了電話。他們幫你談合約、排行程、處理媒體，然後抽一份佣金。'], choose: 'agent' },
  base: { ch: 4, title: '選擇基地', img: 'green-sun.jpg', text: ['留在{home}：家人近，但每次出國比賽都很累。', '搬到美國佛州：去哪裡比賽都近，佛州沒有州所得稅，但離家很遠。'], choose: 'base' },
  first_caddie: { ch: 4, title: '第一位全職桿弟', img: 'caddies-vintage.jpg', text: ['好的桿弟不會幫你揮桿，但會在你想打旗桿的時候說：「這個果嶺後面比較好救。」'], choose: 'caddie' },
  first_card: { ch: 4, title: '第一張巡迴卡', img: 'swing-sunset.jpg', text: ['{tour} 的會員卡寄到了。卡片很輕，但你拿著它的手一直在抖。'], fx: { mood: 20 } },
  pga_card: { ch: 4, title: 'PGA TOUR 卡', img: 'sawgrass-17.jpg', text: ['你拿到了 PGA TOUR 的全季資格。', '下個月，你會和電視上那些名字站在同一個發球台。'], fx: { mood: 30, fame: 15000 } },
  // 第五章
  ch5_start: { ch: 5, title: 'PGA TOUR 新人', img: 'sawgrass-17b.jpg', text: ['置物櫃上貼著你的名字。隔壁是一位大賽冠軍，他點頭跟你說：「歡迎來到 TOUR。」'] },
  rival2: { ch: 5, title: '同期新人', img: 'pebble-18.jpg', text: ['{rival} 也是今年的新人。記者已經開始拿你們兩個比較：誰會先拿到首勝？誰是新人王？'] },
  first_win: { ch: 5, title: 'PGA TOUR 首勝', img: 'pebble-coast.jpg', text: ['最後一推掉進洞裡，你抬頭看見{caddie}已經哭了。', '冠軍的獎勵：兩年全季資格、名人賽邀請、Signature Events 資格。'], fx: { mood: 40 } },
  rookie_year: { ch: 5, title: '新人王', img: 'swing-sunset.jpg', text: ['球員們投票選出年度最佳新人：Arnold Palmer Award。'], fx: { fame: 30000 } },
  // 第六章
  ch6_start: { ch: 6, title: '大賽挑戰者', img: 'kiawah-18.jpg', text: ['你已經是巡迴賽的冠軍了。現在大家問的只有一個問題：你什麼時候拿大賽？'] },
  rival3: { ch: 6, title: '世界第一', img: 'augusta-leaderboard.jpg', text: ['{rival} 是現任世界第一。每一次大賽的週日，排行榜最上面總有他的名字。'] },
  invite: { ch: 6, title: '來自奧古斯塔的邀請函', img: 'augusta-clubhouse.jpg', text: ['十二月，一封印著奧古斯塔徽章的信寄到家裡。', '「本會謹邀請您出席四月於奧古斯塔舉行之名人賽。」'] },
  // 第七章
  green_jacket: { ch: 7, title: '綠夾克', img: 'augusta-10.jpg', text: ['Butler Cabin 的燈光很暖。上屆冠軍 {prev} 拿著那件綠色的夾克，等你把手臂伸進去。', '從 8 歲的那個晚上，已經過了 {years} 年。'] },
  // 第八章
  defend: { ch: 8, title: '冠軍晚宴', img: 'augusta-clubhouse.jpg', text: ['衛冕冠軍決定冠軍晚宴的菜單，只有歷屆冠軍可以出席。', '你要端出什麼家鄉菜給這些傳奇？'], choose: 'menu' },
  hof: { ch: 8, title: '世界高爾夫名人堂', img: 'hof-main.jpg', text: ['委員會的投票結果出來了。'], choose: 'presenter' },
  farewell: { ch: 8, title: '最後一次走過 Swilcan Bridge', img: 'swilcan.jpg', text: ['全場觀眾起立。你在橋上停下來，回頭看了一眼第 18 洞。'] },
  retire: { ch: 8, title: '第二人生', img: 'green-sun.jpg', text: ['球袋收進倉庫的那天，你接到好幾通電話：長青巡迴、團體賽隊長、球場設計、學院。'], choose: 'second' },
};

// ---------- 名人賽冠軍晚宴的菜單（衛冕冠軍決定）----------
export const MENUS = { TPE: ['牛肉麵', '滷肉飯', '芒果冰'], JPN: ['壽司', '和牛', '抹茶冰淇淋'], KOR: ['韓式烤肉', '拌飯', '人蔘雞湯'], USA: ['牛排', '起司漢堡', '蘋果派'], EUR: ['炸魚薯條', '烤羊排', '提拉米蘇'] };

// ---------- 隨機事件（依年齡、章節、人際關係觸發；每週約 22% 機率）----------
//   s：適用的階段（child 童年、junior 青少年、college 大學、road 職業之路、tour PGA 之後、legend 傳奇）
const E = (id, s, text, choices, o = {}) => ({ id, s, text, choices, ...o });
export const RANDOM = [
  // ===== 青少年 =====
  E('movie', 'junior', '同學約你週末去看電影。', [['去看電影', { mood: 8, rel: { friend: 3 } }, '電影很好看，你好久沒有這麼放鬆了。'], ['留下來練球', { train: { iron: 25 }, mood: -3 }, '練習場只剩你一個人，夕陽把影子拉得很長。']]),
  E('shop_try', 'junior', '球具店老闆讓你試打一支新的一號木。', [['認真試打', { train: { long: 20 } }, '你發現原來桿身的軟硬差這麼多。'], ['拍成影片', { fol: 60 }, '老闆很高興，把影片轉貼到店裡的帳號。']]),
  E('typhoon', 'junior', '颱風來了，學校停課一天。', [['在家練推桿', { train: { putt: 30 } }, '地毯上的推桿線，你推了三百顆。'], ['睡一整天', { energy: 25, mood: 5 }, '醒來的時候外面還在下雨。']]),
  E('exam_stress', 'junior', '期中考快到了，你的課本一頁都還沒翻。', [['熬夜念書', { grade: 8, energy: -15 }, '考試及格了，但下一週你的揮桿很沉。'], ['相信自己', { grade: -6, mood: 3 }, '你看著考卷，想起昨天的那顆小鳥推。']]),
  E('fan_letter', 'junior', '一位小學生寫信給你，說他是因為看你打球才開始學高爾夫。', [['回信', { mood: 10, fame: 120, pers: { gent: 1 } }, '你在信的最後畫了一顆高爾夫球。'], ['貼到社群', { fol: 150, pers: { conf: 1 } }, '貼文是你帳號第一篇超過一千個讚的。']]),
  E('family_sick', 'junior', '{family_who}生病住院了。', [['請假陪在醫院', { rel: { family: 10 }, mood: -5, energy: 5 }, '你在病床旁邊寫功課，偶爾看一下比賽轉播。'], ['照常比賽，打完再去', { rel: { family: -3 }, mood: -8 }, '你把每一桿都打得很快，只想趕快打完。']]),
  E('pro_tip', 'junior', '在家鄉球場當桿弟時，一位職業球員看了你的揮桿。', [['請他指點', { train: { long: 40 }, xp: 60 }, '他只說了一句：「右手肘再貼近身體一點。」那天你開球遠了十碼。'], ['不好意思打擾', { mood: -2 }, '你看著他打完 18 洞，默默記下他每一洞的選桿。']]),
  E('growth_spurt', 'junior', '你這半年長高了 8 公分，揮桿的感覺整個變了。', [['重新調整站位', { train: { iron: 30 }, form: -1 }, '前兩週很不順，但你知道這是必經的過程。'], ['先不管它', { form: -2 }, '球開始忽左忽右。']], { age: [13, 16] }),
  E('teammate_conflict', 'junior', '校隊的隊友說你只顧自己練球，不參加團體練習。', [['道歉，參加團練', { rel: { team: 8 }, train: { short: 15 } }, '你們一起練了一下午的切球，有說有笑。'], ['不理他', { rel: { team: -8 }, train: { long: 25 } }, '你一個人在練習場打了兩籃球。']]),
  E('rain_round', 'junior', '練習賽下起大雨，大家都躲進會館了。', [['冒雨打完', { train: { short: 20 }, energy: -8, pers: { conf: 1 } }, '全身濕透，但你學會了濕地怎麼切球。'], ['一起躲雨聊天', { rel: { team: 5 }, mood: 4 }, '學長分享了他去美國比賽的故事。']]),
  E('lost_ball', 'junior', '你在樹林裡找到一顆寫著「Masters」字樣的舊球。', [['留作紀念', { mood: 6 }, '你把它放在書桌上，就在那張名人賽的照片旁邊。'], ['送給爺爺', { rel: { family: 6, mentor: 4 } }, '爺爺把球擦得很亮，說要放進他的球袋。']]),
  E('school_trip', 'junior', '學校的畢業旅行和一場排名賽撞期。', [['去畢業旅行', { mood: 12, rel: { friend: 6 }, skipEvent: true }, '你和同學在海邊拍了好多照片。'], ['去比賽', { mood: -6, rel: { friend: -4 } }, '你在比賽中途收到同學傳來的照片。']]),
  E('club_break', 'junior', '你的 7 號鐵在練習時斷了。', [['花錢買新的', { money: -120 }, '新的桿身比較硬，要適應一下。'], ['用 6 號鐵加減打', { form: -1 }, '你學會了收桿打的距離控制。']]),
  E('dad_bet', 'junior', '{family_who}說，如果你這個月打出 75 以下，就帶你去吃大餐。', [['接受挑戰', { form: 1, mood: 5 }, '你開始在每一個推桿前多看一眼線。'], ['說不用了', { pers: { gent: 1 } }, '你說，打好球本身就是獎勵。']]),
  E('ranking_snub', 'junior', '青少年排名公布了，你比預期的低了五名。', [['加倍練習', { train: { iron: 30, putt: 20 }, energy: -10 }, '你把排名截圖設成手機桌布。'], ['不在意', { mood: 3, pers: { humor: 1 } }, '你說排名只是數字，下一場再說。']]),
  E('friend_quit', 'junior', '一起練球的朋友說他想放棄高爾夫，專心考大學。', [['勸他再想想', { rel: { friend: 5 } }, '他說謝謝你，但他已經決定了。'], ['尊重他的決定', { pers: { gent: 1 }, mood: -3 }, '你們約好以後還是要一起打球。']]),
  E('local_paper', 'junior', '地方報紙想訪問你。', [['接受訪問', { fame: 300, pers: { conf: 1 } }, '報導的標題是「{home}的明日之星」。'], ['婉拒', { pers: { gent: 1 } }, '你說等拿到更好的成績再說。']]),
  E('coach_extra', 'junior', '教練說週末可以幫你加課，但要多付一筆學費。', [['加課', { money: -300, train: { iron: 25, short: 25 } }, '兩個小時，你只打了五十球，但每一球都有目的。'], ['自己練', { train: { iron: 15 } }, '你把教練上次說的重點寫在手套上。']]),
  E('broken_window', 'junior', '你在後院練切球，把鄰居的窗戶打破了。', [['去道歉賠錢', { money: -150, pers: { gent: 2 } }, '鄰居笑著說：「以後你成名了，這塊玻璃要裱框。」'], ['裝作不知道', { pers: { conf: 1 }, mood: -4 }, '那天晚上你睡得很不安穩。']]),
  E('new_putter', 'junior', '你在二手店看到一支很順手的老推桿。', [['買下來', { money: -60, stat: { touch: 1 } }, '那支推桿的握把已經被磨得很光滑。'], ['不買', {}, '你在店裡試推了十幾顆才離開。']]),
  E('junior_camp', 'junior', '暑假有一個職業球員辦的青少年訓練營，學費不便宜。', [['報名', { money: -900, xp: 150, train: { short: 30, putt: 30 } }, '營隊最後一天，你贏了推桿比賽。'], ['在家鄉自主訓練', { train: { iron: 25 } }, '你照著網路上的影片練了一個夏天。']], { holiday: true }),
  E('first_crush', 'junior', '隔壁班的同學在你比賽時跑來加油。', [['比完請他吃冰', { mood: 12, money: -10 }, '你說今天的博蒂是為了他打的。他笑了。'], ['害羞地跑掉', { mood: 3 }, '你一直到晚上都在想他說的那句「加油」。']]),
  E('caddie_tip', 'junior', '打工時，一位會員給了你很多小費。', [['存起來', { money: 80 }, '存錢筒又重了一點。'], ['請阿土伯喝飲料', { money: 40, rel: { mentor: 5 } }, '阿土伯教了你這座球場最難讀的那個果嶺。']]),
  // ===== 大學 =====
  E('roommate_party', 'college', '室友要在宿舍辦派對，邀你一起參加。', [['參加', { mood: 10, energy: -10, rel: { team: 5 } }, '你學會了三首美國鄉村歌曲。'], ['去圖書館', { grade: 5 }, '圖書館很安靜，你把報告寫完了。']]),
  E('ncaa_media', 'college', '大學的體育新聞社想拍一支你的專訪影片。', [['接受', { fol: 800, fame: 600 }, '影片在學校的帳號播了好幾天。'], ['婉拒', { pers: { gent: 1 } }, '你說想專心比賽。']]),
  E('nil_offer', 'college', '一家在地的咖啡店想和你簽 NIL 合作，拍一支廣告。', [['簽約', { money: 2500, fol: 300, energy: -5 }, '你在廣告裡說：「早上六點的練習場，需要一杯好咖啡。」'], ['拒絕，專心練球', { train: { iron: 20 } }, '你在練習場待到天黑。']]),
  E('exam_conflict', 'college', '期末考和一場邀請賽撞期。', [['先去比賽，回來補考', { grade: -8 }, '教授勉強答應讓你補考。'], ['留下來考試', { grade: 6, skipEvent: true }, '你考完試，用手機看隊友比賽的即時成績。']]),
  E('teammate_slump', 'college', '隊上的學長陷入低潮，連續三場沒進前五。', [['陪他練球', { rel: { team: 10 }, train: { short: 15 } }, '最後一天，他推進一顆長推，大叫了一聲。'], ['專心自己的事', { train: { iron: 20 } }, '你是隊上唯一一個連續三場前十的人。']]),
  E('pro_am_invite', 'college', '一場職業賽的 Pro-Am 邀你以業餘身分參加。', [['參加', { xp: 120, fame: 400, energy: -8 }, '你和一位巡迴賽球員同組，他問你什麼時候轉職業。'], ['婉拒', {}, '你把時間留給學校的團練。']]),
  E('injury_wrist', 'college', '練球太久，你的手腕開始痠痛。', [['休息一週', { energy: 20, form: -1 }, '休息完，手腕好了很多。'], ['貼著肌貼繼續練', { energy: -10, injury: 0.25 }, '你咬著牙打完那一籃球。']]),
  E('homesick', 'college', '你很想家。', [['打視訊電話回家', { mood: 10, rel: { family: 6 } }, '{family_who}說家裡的狗每天都在門口等你。'], ['去練習場', { train: { long: 20 }, mood: -3 }, '你把想家的感覺全部打進一號木裡。']]),
  E('scholarship_bonus', 'college', '你的學業成績進了系上前十名，學校多給了一筆獎學金。', [['存起來', { money: 1500 }, '你的旅費多了一點餘裕。'], ['請隊友吃飯', { money: 600, rel: { team: 8 } }, '大家說你是全隊最好的隊長人選。']], { grade: 75 }),
  E('swing_change', 'college', '大學教練建議你改一點揮桿的動作，讓球路更穩定。', [['照教練的建議改', { form: -1, train: { iron: 40 } }, '前兩週很彆扭，之後球路變得很穩。'], ['維持自己的揮桿', { rel: { coach: -5 }, pers: { conf: 1 } }, '教練說他尊重你的決定。']]),
  // ===== 職業之路 =====
  E('car_breakdown', 'road', '比賽前一晚，你的車在高速公路上拋錨了。', [['叫拖吊', { money: -400, energy: -10 }, '你在修車廠的長椅上睡了四個小時。'], ['搭便車', { energy: -15, pers: { humor: 1 } }, '載你的卡車司機說他也打高爾夫，差點 28。']]),
  E('cheap_motel', 'road', '汽車旅館的冷氣壞了，整晚都睡不好。', [['換一間比較貴的', { money: -180, energy: 8 }, '你終於睡了一個好覺。'], ['忍耐', { energy: -12, money: 0 }, '早上起來，你的背很僵。']]),
  E('teaching_gig', 'road', '一家練習場請你週末去教課。', [['接下來', { money: 1200, energy: -8 }, '你教一位退休的老先生打出他人生第一顆 200 碼的開球。'], ['專心練球', { train: { iron: 25, putt: 15 } }, '你需要的是成績，不是課時費。']]),
  E('sponsor_small', 'road', '{home}的一家企業想給你一筆小額贊助，條件是帽子上放他們的標誌。', [['接受', { money: 8000, fame: 200 }, '那是你帽子上的第一個標誌。'], ['再等等更好的', { pers: { conf: 1 } }, '你相信更好的合約會來。']]),
  E('monday_friend', 'road', '在週一資格賽遇到大學的隊友，他說他已經打算放棄了。', [['鼓勵他', { rel: { team: 6 }, mood: -2 }, '他說再撐一季看看。'], ['請他當桿弟', { rel: { team: 8 }, money: -300 }, '他說：「至少我還能在球場上。」']]),
  E('savings_low', 'road', '存款快見底了，下一季的旅費還沒有著落。', [['向家人借錢', { money: 10000, rel: { family: -4 }, mood: -6 }, '{family_who}什麼都沒問，只說記得吃飯。'], ['少打幾站，先打工', { money: 4000, energy: -10, skipEvent: true }, '你在球具店當了兩週的店員。']], { cashBelow: 5000 }),
  E('rookie_hazing', 'road', '巡迴賽的老鳥叫你幫他撿練習球。', [['笑著幫忙', { pers: { humor: 1 }, rel: { team: 3 } }, '他後來在記者面前說你是「懂規矩的年輕人」。'], ['拒絕', { pers: { conf: 1 } }, '他聳聳肩走了。']]),
  E('jetlag', 'road', '連續兩週的長途飛行，你的時差還沒調過來。', [['多休息一天', { energy: 12, skipPractice: true }, '你錯過了練習輪，但精神好多了。'], ['硬撐', { energy: -10, form: -1 }, '你在 Pro-Am 打了三個柏忌。']]),
  E('club_lost', 'road', '航空公司把你的球袋送錯城市了。', [['借一套球桿', { form: -2, money: -150 }, '借來的推桿太短，你只能彎著腰推。'], ['等球袋送來', { energy: -8, mood: -5 }, '球袋在開賽前兩小時才到。']]),
  // ===== PGA TOUR 之後 =====
  E('charity', 'tour', '一家兒童醫院請你去探望病童。', [['去', { fame: 2000, mood: 8, pers: { gent: 2 } }, '一個小男孩問你綠夾克是不是真的很綠。'], ['捐款代替', { money: -20000, fame: 800 }, '醫院寄來一張所有孩子簽名的卡片。']]),
  E('commercial', 'tour', '一家汽車公司想請你拍廣告，拍攝要一整天。', [['拍', { money: 60000, energy: -12, fame: 3000 }, '廣告裡你要從車窗把球打上果嶺，拍了四十次。'], ['推掉', { energy: 5 }, '經紀人嘆了一口氣。']]),
  E('fan_invasion', 'tour', '一位球迷在球道上衝過來要你簽名，被保全攔下。', [['過去幫他簽名', { fame: 1500, pers: { gent: 1 }, energy: -3 }, '影片在網路上被轉傳了幾十萬次。'], ['專心比賽', { pers: { conf: 1 } }, '你戴上耳機，走向下一個發球台。']]),
  E('podcast', 'tour', '一個很紅的高爾夫 Podcast 邀請你上節目。', [['上節目', { fol: 25000, fame: 5000, pers: { humor: 1 } }, '主持人問你最喜歡哪一座球場，你講了二十分鐘。'], ['婉拒', {}, '你說等拿到大賽再來。']]),
  E('equipment_change', 'tour', '球具廠商推出新一代的一號木，希望你改用。', [['改用新桿', { form: -1, money: 30000 }, '前幾週要適應，但廠商很開心。'], ['堅持用舊的', { form: 1 }, '你說，不會換掉能幫你贏球的桿子。']]),
  E('rival_trash', 'tour', '{rival} 在記者會上說你「只是運氣好」。', [['在記者會上回應', { pers: { conf: 2 }, rel: { rival: -10 }, fame: 3000 }, '你說：「下週見，我會讓他看看什麼叫運氣。」'], ['一笑置之', { pers: { gent: 1 }, mood: -3 }, '你說你很尊重他，然後去練習場打到天黑。']]),
  E('family_visit', 'tour', '{family_who}說想來看你比賽。', [['幫他們訂機票', { money: -8000, mood: 15, rel: { family: 10 } }, '你在 18 洞的果嶺邊看到他們揮手。'], ['說這週太忙', { rel: { family: -5 } }, '{family_who}說沒關係，會在電視上看。']]),
  E('back_tight', 'tour', '早上起床時，你的下背很緊。', [['找物理治療師', { money: -2000, energy: 10 }, '治療師說還好發現得早。'], ['照常練球', { injury: 0.3, energy: -5 }, '揮桿時你一直感覺到那一塊肌肉。']]),
  E('kid_lesson', 'tour', '一位小球迷在練習場等了你兩個小時，只想問你一個問題。', [['陪他練十分鐘', { mood: 10, fame: 1000, pers: { gent: 2 } }, '他問你：「怎麼樣才能像你一樣？」你說：「每天都去練習場。」'], ['簽名後離開', {}, '他拿著簽名球跑回爸爸身邊。']]),
  E('viral_shot', 'tour', '你在練習輪打出一顆特技球，被球迷拍下來。', [['在社群分享', { fol: 40000, fame: 3000 }, '影片在一天內有三百萬次觀看。'], ['不理它', {}, '影片還是被轉傳了。']]),
  E('captain_pick', 'tour', '團體賽隊長打電話給你，說他在考慮外卡人選。', [['表達強烈意願', { pers: { conf: 1 }, flag: 'wantPick' }, '隊長說他會把你的名字寫在名單最上面。'], ['說一切聽隊長安排', { pers: { gent: 1 } }, '隊長說他欣賞你的態度。']]),
  E('bad_weather_fly', 'tour', '暴風雪讓航班全部取消，你可能趕不上週二的練習輪。', [['租私人飛機', { money: -25000, energy: 5 }, '你在練習輪開始前一小時到球場。'], ['開車十個小時', { energy: -15 }, '你在加油站吃了三餐。']]),
  E('mentor_call', 'tour', '{mentor}打電話來，說他看了你上週的比賽。', [['聊很久', { mood: 10, rel: { mentor: 8 } }, '他說：「你推桿的時候，頭還是抬太早。」'], ['簡短謝謝他', { rel: { mentor: 2 } }, '他說：「記得享受。」']]),
  E('tax_audit', 'tour', '稅務單位寄來一封信，要你補報去年在各州比賽的所得。', [['請會計處理', { money: -15000 }, '會計說，職業選手每年都要報十幾個州的稅。'], ['自己處理', { energy: -10, money: -5000, mood: -6 }, '你花了整整一個週末填表格。']]),
  E('ace_bet', 'tour', '練習輪的三桿洞，同組球員和你賭一頓晚餐。', [['接受', { mood: 6, pers: { humor: 1 } }, '你打到旗桿邊一呎，他請了牛排。'], ['不賭', {}, '你說你只賭比賽的獎金。']]),
  // ===== 傳奇 =====
  E('young_fan_pro', 'legend', '一位新人在記者會上說，他是看你的比賽長大的。', [['請他吃飯', { mood: 10, pers: { gent: 1 } }, '他問你名人賽的週日是什麼感覺。'], ['在社群祝福他', { fol: 20000 }, '他把你的留言截圖設成手機桌布。']]),
  E('design_offer', 'legend', '一家地產公司想請你設計一座球場。', [['接下來', { money: 400000, energy: -10, flag: 'designer' }, '你在空白的地圖上畫下第一個果嶺。'], ['再等等', {}, '你說你還想多打幾年。']]),
  E('broadcast_offer', 'legend', '電視台想請你在大賽當球評。', [['試一場', { money: 50000, fame: 10000 }, '你在轉播裡說：「這一推我會往洞口左邊一顆球。」結果推進了。'], ['婉拒', {}, '你說你還想在球場上，而不是轉播席上。']]),
  E('old_caddie', 'legend', '{caddie}說他的膝蓋不好了，想問你今年是不是他最後一年。', [['陪他走完這一年', { rel: { caddie: 15 }, mood: 5 }, '你們說好最後一場一起走過 18 洞的果嶺。'], ['幫他安排退休', { money: -50000, rel: { caddie: 10 } }, '他說，你是他揹過最好的球員。']]),
];

// 第二批（data/story2.js）合在一起
import { RANDOM2 } from './story2.js';
RANDOM.push(...RANDOM2);
// 依階段與年紀過濾
export const eventsFor = stage => RANDOM.filter(e => e.s === stage || (e.s === 'tour' && stage === 'legend'));

// ---------- 新聞標題（依真實成績組合）----------
export const NEWS = {
  win: ['{name} 在 {event} 封王，{total} 桿 {toPar}', '{name} 奪下 {event} 冠軍！最後一洞{finish}', '{name} 拿下生涯第 {wins} 勝'],
  win_first: ['{name} 拿下生涯首勝！{event} 以 {toPar} 封王', '新星誕生：{name} 首勝在 {event}'],
  win_major: ['{name} 成為 {major} 冠軍！', '{name} 拿下大賽！{event} 以 {toPar} 奪冠'],
  top10: ['{name} 在 {event} 拿下第 {pos} 名', '{name} {event} 前十，本季第 {top10} 次'],
  cut_missed: ['{name} 在 {event} 沒有晉級', '{name} 差一桿無緣週末'],
  round_lead: ['{name} 在 {event} 第 {round} 輪後領先！', '{name} 打出 {score}，暫居 {event} 領先'],
  low_round: ['{name} 打出 {score} 桿的低桿！', '{name} 單輪 {toPar}，{event} 的最佳成績之一'],
  world: ['{winner} 拿下 {event} 冠軍', '{winner} 在 {event} 以 {toPar} 封王', '{event}：{winner} 奪冠'],
  world_major: ['{winner} 成為 {major} 冠軍！', '{event}：{winner} 拿下大賽'],
  rank: ['{name} 世界排名升到第 {rank} 名', '{name} 創下生涯最高世界排名：第 {rank} 名'],
};

// ---------- 記者會（重要結果之後；三選一累積個性）----------
export const PRESS = [
  { when: 'win', q: '今天最後幾洞，你在想什麼？', a: [['gent', '我只想把每一桿打好，尊重這座球場。'], ['conf', '我知道這座獎盃是我的，只是時間的問題。'], ['humor', '我在想晚餐要吃什麼。']] },
  { when: 'win', q: '這座冠軍，你最想感謝誰？', a: [['gent', '{mentor}。他帶我去的第一個練習場，就在家旁邊。'], ['conf', '我自己。這一路上沒有人比我更努力。'], ['humor', '我的桿弟。他說今天如果沒贏，就要換老闆。']] },
  { when: 'major', q: '從 8 歲在電視前看名人賽，到今天站在這裡，你最想感謝誰？', a: [['gent', '{mentor}。是他讓我愛上這項運動。'], ['conf', '我自己。這件夾克，我等了二十年。'], ['humor', '我的桿弟。他說今天如果沒贏，就要換老闆。']] },
  { when: 'lead', q: '明天你要從領先的位置出發，會緊張嗎？', a: [['gent', '會，但我會照自己的節奏打。'], ['conf', '不會。後面的人才該緊張。'], ['humor', '今天晚上應該會睡不著，有人要一起看電影嗎？']] },
  { when: 'miss', q: '這週沒能晉級，你怎麼看？', a: [['gent', '這座球場給了我很好的一課，下週會更好。'], ['conf', '只是推桿沒進而已，我的球打得很好。'], ['humor', '至少週末可以睡晚一點。']] },
  { when: 'rival', q: '你和 {rival} 的對決，是不是現在最好看的故事？', a: [['gent', '他是很棒的球員，能和他競爭是我的榮幸。'], ['conf', '只要他繼續贏，我就會繼續打敗他。'], ['humor', '我們比較常比的是誰的鞋子比較好看。']] },
  { when: 'top10', q: '這週的成績，你最滿意哪一個部分？', a: [['gent', '我在逆境裡都保持冷靜。'], ['conf', '我的鐵桿是全場最好的。'], ['humor', '我沒有把球打進觀眾席，這是個進步。']] },
];
