// ===================== 英文文法講義 =====================
// 格式同 grammar-fr.js
const EN_GRAMMAR = [
// ---------------- 基礎觀念 ----------------
{
    id: "eg-sentence", level: "intro", title: "英文句子的骨架", sub: "詞性與五大句型",
    lessons: ["e-a2-01"],
    body: [
        { h: "八大詞性", p: "看文法說明時會一直遇到這些名稱。同一個字可能有好幾種詞性，要看它在句子裡的位置：",
          tb: [["詞性", "功能", "例子"], ["名詞 n.", "人、事、物", "teacher、idea、water"], ["代名詞 pron.", "代替名詞", "he、it、them、this"], ["動詞 v.", "動作或狀態", "run、be、seem"], ["形容詞 adj.", "修飾名詞", "a **quiet** room"], ["副詞 adv.", "修飾動詞、形容詞、整句", "speak **quietly**、**very** quiet"], ["介系詞 prep.", "表示時間、地點、關係", "**on** Monday、**at** home"], ["連接詞 conj.", "連接字詞或句子", "and、but、because"], ["感嘆詞 interj.", "表達情緒", "oh、wow"]] },
        { h: "五大句型", p: "英文每個句子都至少有**主詞和動詞**。動詞後面接什麼，決定了句型：",
          tb: [["句型", "結構", "例子"], ["1", "S + V", "The baby **cried**."], ["2", "S + V + 補語", "She **is** a nurse. / He **looks** tired."], ["3", "S + V + 受詞", "I **love** coffee."], ["4", "S + V + 人 + 物", "He **gave** me a book."], ["5", "S + V + 受詞 + 補語", "The news **made** her happy."]],
          ex: [["The news made her happy.", "這個消息讓她很開心。"], ["He gave me a book.", "他給了我一本書。"]] },
        { h: "和中文最大的差別", p: "1. **主詞不能省略**：中文說「下雨了」，英文要說 **It** is raining。\n2. **動詞要跟主詞、時間變化**：he goes、she went。中文用「了、過、會」，英文改動詞形式。\n3. **名詞要分單複數、可不可數**：a book / two books / some water。\n4. **修飾語的位置**：長的修飾語放在名詞後面：the man **who lives next door**（住在隔壁的那個男人）。",
          tip: "台灣學生最常漏掉的：第三人稱單數現在式加 **-s**（she **likes**）、名詞複數 **-s**、可數名詞前的 **a / the**。", warn: true }
    ],
    ex: [
        ["c", "She looks ___.", ["tired", "tiredly", "tire"], 0, "她看起來很累。（look + 形容詞）"],
        ["c", "___ is raining.", ["It", "There", "This"], 0, "下雨了。"],
        ["c", "He ___ coffee every morning.", ["drinks", "drink", "drinking"], 0, "他每天早上喝咖啡。"],
        ["o", "The / news / made / her / happy", "這個消息讓她很開心。"]
    ]
},
{
    id: "eg-tenses", level: "intro", title: "時態總覽", sub: "一張表看懂英文時態",
    lessons: ["e-a2-01", "e-a2-02", "e-b1-01"],
    body: [
        { h: "時間 × 樣貌", p: "英文時態由兩件事決定：**什麼時候**（過去、現在、未來）和**動作的樣貌**（簡單、進行、完成、完成進行）。",
          tb: [["", "簡單", "進行", "完成", "完成進行"], ["現在", "I work", "I am working", "I have worked", "I have been working"], ["過去", "I worked", "I was working", "I had worked", "I had been working"], ["未來", "I will work", "I will be working", "I will have worked", "I will have been working"]] },
        { h: "四種樣貌的意思", tb: [["樣貌", "重點", "例子"], ["簡單", "事實、習慣、一次完成的事", "I **work** in Taipei."], ["進行", "某個時間點正在發生", "I **am working** now."], ["完成", "到某個時間點為止的結果或經驗", "I **have finished** my report."], ["完成進行", "持續到某個時間點、強調過程", "I **have been working** since 8."]] },
        { h: "最常用的八種", p: "日常英文 90% 只用到這些：現在簡單、現在進行、過去簡單、過去進行、現在完成、未來（will / be going to）、過去完成、現在完成進行。其他時態認得就好。",
          tip: "中文「我吃了」可能是 I ate（過去）也可能是 I have eaten（完成），要看有沒有明確的過去時間。見「現在完成式」一章。" }
    ],
    ex: [
        ["c", "Look! It ___.", ["is snowing", "snows", "has snowed"], 0, "你看！在下雪。"],
        ["c", "I ___ here since 2020.", ["have lived", "live", "lived"], 0, "我從 2020 年就住在這裡。"],
        ["c", "When I arrived, she ___ already ___.", ["had / left", "has / left", "was / leaving"], 0, "我到的時候她已經走了。"]
    ]
},
// ---------------- A2 ----------------
{
    id: "eg-present", level: "A2", title: "現在簡單式 vs 現在進行式", sub: "習慣與事實 vs 正在發生",
    lessons: ["e-a2-01"],
    body: [
        { h: "現在簡單式：習慣、事實、時刻表", p: "主詞是 he / she / it 時動詞加 **-s / -es**。否定和問句用 **do / does**，此時動詞回到原形。",
          tb: [["", "肯定", "否定", "問句"], ["I / you / we / they", "work", "don't work", "Do you work?"], ["he / she / it", "works", "doesn't work", "Does she work?"]],
          ex: [["She works at a bank.", "她在銀行工作。"], ["Water boils at 100 degrees.", "水在一百度沸騰。"], ["The train leaves at 7.", "火車七點開。（時刻表）"]] },
        { h: "-s 的拼法與發音", tb: [["規則", "例子"], ["一般加 -s", "works、plays"], ["-s、-sh、-ch、-x、-o 加 -es", "watches、goes、fixes"], ["子音 + y → -ies", "study → studies"], ["不規則", "have → has"]],
          tip: "發音：無聲子音後唸 /s/（works）、有聲音後唸 /z/（plays）、-es 唸 /ɪz/（watches）。" },
        { h: "現在進行式：此刻、這陣子、暫時", p: "**am / is / are + V-ing**。",
          ex: [["I'm cooking right now.", "我現在正在煮飯。"], ["She's studying for an exam this week.", "她這禮拜在準備考試。"], ["Prices are going up.", "物價在上漲。（變化中）"]] },
        { h: "狀態動詞不用進行式", p: "表示**狀態、感覺、想法、擁有**的動詞通常不用進行式：know、like、love、hate、want、need、believe、understand、belong、own、seem。",
          tb: [["錯誤", "正確"], ["I am knowing him.", "I know him."], ["She is wanting a coffee.", "She wants a coffee."]],
          tip: "有些動詞意思不同時可以用：I **think** it's good（我認為）/ I'm **thinking** about it（我在考慮）；I **have** a car（擁有）/ I'm **having** lunch（在吃）。", warn: true }
    ],
    ex: [
        ["c", "My brother ___ in Tokyo.", ["lives", "live", "is live"], 0, "我哥住在東京。"],
        ["c", "Be quiet! The baby ___.", ["is sleeping", "sleeps", "sleep"], 0, "安靜！寶寶在睡覺。"],
        ["c", "I ___ what you mean.", ["understand", "am understanding", "understands"], 0, "我懂你的意思。"],
        ["c", "___ she speak French?", ["Does", "Do", "Is"], 0, "她會說法文嗎？"],
        ["f", "He ___ (not / like) coffee.", ["doesn't like", "does not like"], "他不喜歡咖啡。"],
        ["f", "She ___ (study) English every day.", "studies", "她每天讀英文。"],
        ["t", "我這禮拜在家工作。", ["I'm working from home this week.", "I am working from home this week."]]
    ]
},
{
    id: "eg-past", level: "A2", title: "過去式", sub: "過去簡單式、過去進行式、used to",
    lessons: ["e-a2-02", "e-b2-01"],
    body: [
        { h: "過去簡單式", p: "過去某個時間完成的事。規則動詞加 **-ed**；否定和問句用 **did**，動詞回原形。",
          ex: [["I visited my grandma last weekend.", "我上週末去看了奶奶。"], ["We didn't go out yesterday.", "我們昨天沒出門。"], ["Did you see the game?", "你有看比賽嗎？"]],
          tip: "Did you **saw**? 是錯的。用了 did 之後動詞一定用原形：Did you **see**?", warn: true },
        { h: "常見不規則動詞", tb: [["原形", "過去式", "過去分詞"], ["go", "went", "gone"], ["see", "saw", "seen"], ["take", "took", "taken"], ["make", "made", "made"], ["buy", "bought", "bought"], ["think", "thought", "thought"], ["bring", "brought", "brought"], ["teach", "taught", "taught"], ["write", "wrote", "written"], ["eat", "ate", "eaten"], ["get", "got", "got / gotten"], ["leave", "left", "left"], ["feel", "felt", "felt"], ["tell", "told", "told"]] },
        { h: "-ed 的發音", tb: [["前一個音", "-ed 唸", "例子"], ["t、d", "/ɪd/", "wanted、needed"], ["無聲子音（p、k、s、sh、ch、f）", "/t/", "stopped、watched"], ["其他（有聲）", "/d/", "played、cleaned"]] },
        { h: "過去進行式：當時正在", p: "**was / were + V-ing**。常和過去簡單式搭配：長的背景動作用進行式，打斷它的短動作用簡單式。",
          ex: [["I was taking a shower when you called.", "你打來的時候我正在洗澡。"], ["What were you doing at 9 last night?", "你昨晚九點在做什麼？"]] },
        { h: "used to：以前常常（現在不再）", p: "**used to + 原形**：過去的習慣或狀態，暗示現在已經不是了。否定 didn't use to。",
          ex: [["I used to smoke.", "我以前抽菸（現在不抽了）。"], ["There used to be a cinema here.", "這裡以前有一家電影院。"]],
          tip: "別和 **be used to + V-ing**（習慣於…）搞混：I'm used to getting up early（我已經習慣早起）。" }
    ],
    ex: [
        ["c", "We ___ to Tainan last summer.", ["went", "go", "have gone"], 0, "我們去年夏天去了台南。"],
        ["c", "Did you ___ the email?", ["get", "got", "gets"], 0, "你收到郵件了嗎？"],
        ["c", "I ___ TV when the power went out.", ["was watching", "watched", "am watching"], 0, "停電的時候我正在看電視。"],
        ["c", "I ___ live in Kaohsiung, but now I live in Taipei.", ["used to", "use to", "am used to"], 0, "我以前住高雄。"],
        ["f", "She ___ (buy) a new phone yesterday.", "bought", "她昨天買了新手機。"],
        ["f", "They ___ (not / come) to the party.", ["didn't come", "did not come"], "他們沒來派對。"],
        ["t", "你昨晚九點在做什麼？", ["What were you doing at 9 last night?", "What were you doing at nine last night?"]]
    ]
},
{
    id: "eg-perfect", level: "A2", title: "現在完成式", sub: "經驗、結果、持續；和過去式的差別",
    lessons: ["e-a2-06", "e-b1-01"],
    body: [
        { h: "結構", p: "**have / has + 過去分詞**。I've、she's 是常見縮寫。",
          tb: [["", "肯定", "否定", "問句"], ["I / you / we / they", "have finished", "haven't finished", "Have you finished?"], ["he / she / it", "has finished", "hasn't finished", "Has she finished?"]] },
        { h: "三種用法", tb: [["用法", "常見搭配", "例子"], ["經驗（到現在為止）", "ever、never、before、once、twice", "Have you **ever** been to Japan?"], ["結果（和現在有關）", "just、already、yet", "I've **just** finished. / I haven't eaten **yet**."], ["持續（從過去到現在）", "for、since、how long", "I've lived here **for** ten years."]],
          ex: [["I've been to Paris twice.", "我去過巴黎兩次。"], ["She's lost her keys.", "她把鑰匙弄丟了。（現在還沒找到）"], ["We've known each other since 2015.", "我們從 2015 年就認識了。"]] },
        { h: "for 和 since", p: "**for + 一段時間**：for three years、for a long time\n**since + 起點**：since 2019、since Monday、since I was a child" },
        { h: "現在完成式 vs 過去簡單式", p: "有**明確的過去時間**（yesterday、last year、in 2020、ago、when…）就要用**過去簡單式**。沒有說時間、重點在「到現在」的經驗或結果，用**現在完成式**。",
          tb: [["過去簡單式", "現在完成式"], ["I saw that movie **last week**.", "I've seen that movie.（看過）"], ["She lived in London **in 2018**.", "She's lived in London **for five years**.（現在還住）"], ["Did you finish it **yesterday**?", "Have you finished it **yet**?"]],
          tip: "I have seen him **yesterday** 是錯的。有 yesterday、ago、last… 就不能用完成式。", warn: true },
        { h: "been 和 gone", p: "She **has been** to Japan.（她去過日本，已經回來了）\nShe **has gone** to Japan.（她去日本了，現在不在這裡）" }
    ],
    ex: [
        ["c", "Have you ever ___ sushi?", ["eaten", "ate", "eat"], 0, "你吃過壽司嗎？"],
        ["c", "I ___ him last night.", ["saw", "have seen", "see"], 0, "我昨晚見到他。"],
        ["c", "She has worked here ___ 2019.", ["since", "for", "from"], 0, "她從 2019 年就在這裡工作。"],
        ["c", "We've been married ___ ten years.", ["for", "since", "during"], 0, "我們結婚十年了。"],
        ["c", "I haven't finished my homework ___.", ["yet", "already", "just"], 0, "我還沒寫完作業。"],
        ["f", "He ___ (lose) his wallet, so he can't pay.", ["has lost", "'s lost"], "他把錢包弄丟了，所以沒辦法付錢。"],
        ["t", "我去過巴黎兩次。", ["I've been to Paris twice.", "I have been to Paris twice."]]
    ]
},
{
    id: "eg-future", level: "A2", title: "表達未來", sub: "will、be going to、現在進行式",
    lessons: ["e-a2-03", "e-b2-04"],
    body: [
        { h: "三種主要說法", tb: [["說法", "用途", "例子"], ["will + 原形", "當下決定、承諾、提議、預測", "I'll call you later. / It will rain tomorrow."], ["be going to + 原形", "已經打算好的計畫；有跡象的預測", "I'm going to study abroad. / Look at the clouds — it's going to rain."], ["現在進行式", "已經安排好的行程（有時間、對象）", "I'm meeting Tom at 6."]] },
        { h: "怎麼選", p: "電話響了，你說「我來接」→ **I'll** get it.（當下決定）\n朋友問你暑假計畫 → I**'m going to** visit Japan.（早就打算）\n已經訂好機票 → I**'m flying** to Tokyo on Friday.（已安排）",
          ex: [["I'll help you with that.", "我來幫你。"], ["We're going to buy a house next year.", "我們打算明年買房。"], ["I'm having dinner with my parents tonight.", "我今晚要和爸媽吃飯。"]] },
        { h: "時間子句用現在式", p: "**when、before、after、as soon as、until、if** 後面講未來的事，英文用**現在式**（和法文不同）。",
          ex: [["I'll call you when I get home.", "我到家會打給你。"], ["As soon as he arrives, we'll start.", "他一到我們就開始。"]],
          tip: "When I **will get** home 是錯的，要說 When I **get** home。", warn: true }
    ],
    ex: [
        ["c", "The phone's ringing. — I ___ get it.", ["'ll", "'m going to", "am getting"], 0, "電話響了。——我來接。"],
        ["c", "I ___ visit my aunt next month. I've already booked the tickets.", ["am going to", "will", "visit"], 0, ""],
        ["c", "I'll text you when I ___.", ["arrive", "will arrive", "arriving"], 0, "我到了會傳訊息給你。"],
        ["c", "Look at those clouds! It ___ rain.", ["is going to", "will", "rains"], 0, ""],
        ["f", "I ___ (meet) Tom at 6 tonight.", ["am meeting", "'m meeting"], "我今晚六點要和湯姆見面。"],
        ["t", "我來幫你。", ["I'll help you.", "I will help you."]]
    ]
},
{
    id: "eg-articles", level: "A2", title: "冠詞 a / an / the", sub: "什麼時候要、什麼時候不要",
    lessons: ["e-a2-04"],
    body: [
        { h: "a / an：不特定的一個", p: "用在**單數可數名詞**、第一次提到或不特定的時候。看**發音**決定：母音開頭用 an。",
          ex: [["a book, a university", "一本書、一所大學（u 唸 /ju/）"], ["an apple, an hour", "一顆蘋果、一小時（h 不發音）"], ["She's a doctor.", "她是醫生。（職業要加 a）"]] },
        { h: "the：特定的、雙方都知道的", tb: [["情況", "例子"], ["第二次提到", "I bought a shirt. **The** shirt is blue."], ["只有一個", "**the** sun、**the** internet"], ["前面有限定", "**the** man in the red coat"], ["最高級、序數", "**the** best、**the** first"], ["樂器", "play **the** piano"]] },
        { h: "不加冠詞的情況", tb: [["情況", "例子"], ["泛指複數或不可數", "I like **dogs**. / **Water** is important."], ["三餐、學科、語言", "have **lunch**、study **math**、speak **English**"], ["go to + 機構的功能", "go to **school** / **bed** / **work**"], ["大部分國家、城市、人名", "**Taiwan**、**Paris**（但 **the** US、**the** UK）"]],
          tip: "中文說「我喜歡狗」，英文要說 I like **dogs**（複數泛指），不能說 I like dog 或 I like the dog（那是指特定一隻）。", warn: true }
    ],
    ex: [
        ["c", "She's ___ engineer.", ["an", "a", "the"], 0, "她是工程師。"],
        ["c", "It takes ___ hour.", ["an", "a", "the"], 0, "要花一小時。"],
        ["c", "I love ___.", ["cats", "cat", "the cat"], 0, "我喜歡貓。（泛指）"],
        ["c", "He plays ___ guitar.", ["the", "a", "—"], 0, "他彈吉他。"],
        ["c", "We had ___ lunch at noon.", ["—", "a", "the"], 0, "我們中午吃午餐。（不加冠詞）"],
        ["f", "___ sun rises in the east.", "The", "太陽從東邊升起。"]
    ]
},
{
    id: "eg-countable", level: "A2", title: "可數與不可數名詞", sub: "much / many、a few / a little、some / any",
    lessons: ["e-a2-04"],
    body: [
        { h: "怎麼分", p: "**可數**：可以一個一個數，有複數形：a chair、two chairs。\n**不可數**：液體、材料、抽象概念、整體的東西：water、money、information、advice、furniture、luggage、news、homework。",
          tip: "這些在中文可以數，英文卻不可數，最常錯：**advice、information、furniture、luggage、news、homework、equipment、research**。不能加 -s，也不能用 a。要數時用 **a piece of advice**。", warn: true },
        { h: "數量詞", tb: [["", "可數（複數）", "不可數"], ["很多（問句、否定）", "many", "much"], ["很多（肯定句常用）", "a lot of / lots of", "a lot of / lots of"], ["一些（肯定）", "a few / some", "a little / some"], ["很少（幾乎沒有）", "few", "little"], ["多少", "How many…?", "How much…?"]],
          ex: [["How many people came?", "來了多少人？"], ["I don't have much time.", "我時間不多。"], ["She has a few friends here.", "她在這裡有幾個朋友。（有一些）"], ["He has few friends.", "他幾乎沒有朋友。（負面）"]] },
        { h: "some 和 any", p: "**some** 用在肯定句、以及希望對方說 yes 的提議／請求。\n**any** 用在否定句和一般問句。",
          ex: [["I need some help.", "我需要一些幫忙。"], ["Would you like some tea?", "要喝點茶嗎？（提議）"], ["Do you have any questions?", "有任何問題嗎？"], ["There isn't any milk.", "沒有牛奶了。"]] }
    ],
    ex: [
        ["c", "Can I give you some ___ ?", ["advice", "advices", "an advice"], 0, "我可以給你一些建議嗎？"],
        ["c", "How ___ money do you need?", ["much", "many", "few"], 0, "你需要多少錢？"],
        ["c", "There are only ___ seats left.", ["a few", "a little", "much"], 0, "只剩幾個位子。"],
        ["c", "Do you have ___ questions?", ["any", "some", "a"], 0, "有任何問題嗎？"],
        ["f", "I have ___ luggage. Just one bag.（很少，但有一些）", "a little", "我行李不多，只有一個包。"],
        ["t", "我時間不多。", ["I don't have much time.", "I do not have much time."]]
    ]
},
{
    id: "eg-comparison", level: "A2", title: "比較級與最高級", sub: "-er / more、-est / most、as … as",
    lessons: ["e-a2-05"],
    body: [
        { h: "規則", tb: [["形容詞", "比較級", "最高級"], ["單音節：加 -er / -est", "cheaper", "the cheapest"], ["短母音 + 單子音：雙寫", "bigger", "the biggest"], ["子音 + y：→ -ier / -iest", "easier", "the easiest"], ["兩音節以上：more / most", "more expensive", "the most expensive"], ["不規則", "good → better、bad → worse、far → farther / further", "the best、the worst"]] },
        { h: "常用句型", ex: [["Taipei is bigger than Tainan.", "台北比台南大。"], ["This is the most beautiful beach I've ever seen.", "這是我看過最美的海灘。"], ["She's as tall as her brother.", "她和她哥一樣高。"], ["It's not as cold as yesterday.", "沒有昨天那麼冷。"], ["The more you practice, the better you get.", "練得越多就越好。"]] },
        { h: "修飾比較級", p: "加強：**much / far / a lot** + 比較級（much better）\n一點點：**a bit / slightly** + 比較級（a bit cheaper）",
          tip: "不能說 more better 或 very better，要說 **much better**。", warn: true }
    ],
    ex: [
        ["c", "This bag is ___ than that one.", ["cheaper", "more cheap", "cheapest"], 0, "這個包比那個便宜。"],
        ["c", "It's the ___ day of the year.", ["hottest", "hotest", "most hot"], 0, "這是一年中最熱的一天。"],
        ["c", "Your English is ___ better now!", ["much", "very", "more"], 0, "你的英文現在好多了！"],
        ["c", "He's ___ tall ___ me.", ["as / as", "so / than", "as / than"], 0, "他和我一樣高。"],
        ["f", "This is the ___ (good) pizza in town.", "best", "這是鎮上最好吃的披薩。"],
        ["t", "台北比台南大。", ["Taipei is bigger than Tainan."]]
    ]
},
// ---------------- B1 ----------------
{
    id: "eg-modals", level: "B1", title: "情態助動詞", sub: "can、should、must、have to、might…",
    lessons: ["e-b1-02", "e-b2-03"],
    body: [
        { h: "基本規則", p: "情態助動詞後面接**原形動詞**，不加 to、不加 -s：She **can** swim（不是 cans、can to swim）。" },
        { h: "依功能整理", tb: [["功能", "助動詞", "例子"], ["能力", "can / could / be able to", "I can swim. / I could swim when I was five."], ["許可", "can / may / could", "Can I sit here? / May I come in?"], ["請求（禮貌）", "could / would", "Could you help me? / Would you mind…?"], ["建議", "should / ought to / had better", "You should see a doctor."], ["義務（自己覺得）", "must", "I must call my mom."], ["義務（外在規定）", "have to", "I have to wear a uniform."], ["不必", "don't have to", "You don't have to come."], ["禁止", "mustn't / can't", "You mustn't smoke here."], ["可能性", "might / may / could", "It might rain later."]] },
        { h: "must not vs don't have to", p: "這兩個意思完全不同：\n**mustn't** = 不可以（禁止）\n**don't have to** = 不必（可以做也可以不做）",
          ex: [["You mustn't park here.", "你不可以停在這裡。"], ["You don't have to pay. It's free.", "你不用付錢，是免費的。"]], warn: true, tip: "要表達「不必」，不能說 mustn't。" },
        { h: "had better：最好…（否則有後果）", p: "**had better + 原形**，語氣比 should 強，帶有警告意味。縮寫 you'd better。",
          ex: [["You'd better leave now, or you'll miss the train.", "你最好現在出發，不然會趕不上火車。"]] }
    ],
    ex: [
        ["c", "You ___ see a doctor.", ["should", "should to", "shoulds"], 0, "你應該去看醫生。"],
        ["c", "You ___ wear a seatbelt. It's the law.", ["have to", "don't have to", "might"], 0, "你必須繫安全帶，這是法律規定。"],
        ["c", "It's free. You ___ pay.", ["don't have to", "mustn't", "can't"], 0, "免費的，你不用付錢。"],
        ["c", "___ you open the window, please?", ["Could", "Should", "Must"], 0, "可以請你開窗嗎？"],
        ["c", "Take an umbrella. It ___ rain.", ["might", "must", "should to"], 0, "帶把傘，可能會下雨。"],
        ["t", "你不可以在這裡抽菸。", ["You mustn't smoke here.", "You must not smoke here.", "You can't smoke here."]]
    ]
},
{
    id: "eg-conditionals", level: "B1", title: "條件句", sub: "零、第一、第二、第三條件句",
    lessons: ["e-b1-03", "e-b1-04", "e-b2-02"],
    body: [
        { h: "四種條件句", tb: [["類型", "意思", "if 子句", "主要子句", "例子"], ["零", "一般事實", "現在式", "現在式", "If you heat ice, it melts."], ["第一", "很可能發生", "現在式", "will + 原形", "If it rains, I'll stay home."], ["第二", "與現在事實相反／不太可能", "過去式", "would + 原形", "If I had more time, I would travel."], ["第三", "與過去事實相反", "had + p.p.", "would have + p.p.", "If I had studied, I would have passed."]] },
        { h: "第一條件句", p: "if 子句用**現在式**，不能用 will。",
          ex: [["If you leave now, you'll catch the bus.", "你現在出發的話就趕得上公車。"], ["Unless you hurry, you'll be late.", "除非你快點，不然會遲到。"]],
          tip: "If it **will rain** 是錯的，要說 If it **rains**。", warn: true },
        { h: "第二條件句：想像現在", p: "**if + 過去式, would + 原形**。be 動詞在正式英文中所有人稱都用 **were**。",
          ex: [["If I were you, I'd take the job.", "如果我是你，我會接受那份工作。"], ["What would you do if you won the lottery?", "如果你中了樂透會做什麼？"]] },
        { h: "第三條件句：後悔過去", ex: [["If I had left earlier, I wouldn't have missed the flight.", "如果我早點出門，就不會錯過班機了。"], ["She would have come if you had invited her.", "如果你有邀請她，她就會來了。"]] },
        { h: "wish：希望（但不是事實）", tb: [["想說", "結構", "例子"], ["希望現在不同", "wish + 過去式", "I wish I **had** a car.（可惜沒有）"], ["後悔過去", "wish + had + p.p.", "I wish I **had studied** harder."], ["希望別人改變", "wish + would", "I wish you **would** stop talking."]] }
    ],
    ex: [
        ["c", "If it ___ tomorrow, we'll cancel the picnic.", ["rains", "will rain", "rained"], 0, "如果明天下雨，我們就取消野餐。"],
        ["c", "If I ___ rich, I would buy a house.", ["were", "am", "will be"], 0, "如果我有錢，我會買房子。"],
        ["c", "If she had studied, she ___ the exam.", ["would have passed", "would pass", "will pass"], 0, "如果她有讀書，就會通過考試了。"],
        ["c", "I wish I ___ speak French.", ["could", "can", "will"], 0, "真希望我會說法文。"],
        ["f", "If I ___ (be) you, I'd apologize.", "were", "如果我是你，我會道歉。"],
        ["t", "如果你中了樂透會做什麼？", ["What would you do if you won the lottery?"]]
    ]
},
{
    id: "eg-passive", level: "B1", title: "被動語態", sub: "be + 過去分詞",
    lessons: ["e-b1-05"],
    body: [
        { h: "結構", p: "**be（依時態變化）+ 過去分詞**。做動作的人如果重要，用 **by** 引出。",
          tb: [["時態", "主動", "被動"], ["現在簡單", "They make cars here.", "Cars **are made** here."], ["過去簡單", "Someone stole my bike.", "My bike **was stolen**."], ["現在完成", "They have sold the house.", "The house **has been sold**."], ["未來", "They will announce the results.", "The results **will be announced**."], ["情態", "You must sign the form.", "The form **must be signed**."], ["進行", "They are repairing the road.", "The road **is being repaired**."]] },
        { h: "什麼時候用被動", p: "1. 不知道或不重要是誰做的：My phone was stolen.\n2. 重點在動作的對象：This bridge was built in 1990.\n3. 正式文件、新聞、科學報告：The results were analyzed…",
          ex: [["English is spoken all over the world.", "全世界都說英文。"], ["The meeting has been postponed.", "會議延期了。"], ["He was born in Taichung.", "他在台中出生。"]] },
        { h: "get 被動與 have something done", p: "口語常用 **get + p.p.**：He **got fired**.（他被開除了）\n請別人幫你做：**have / get + 東西 + p.p.**：I **had my hair cut**.（我去剪了頭髮）",
          tip: "「我剪頭髮了」若是去理髮廳，要說 I had my hair cut，說 I cut my hair 表示自己剪。" }
    ],
    ex: [
        ["c", "My wallet ___ yesterday.", ["was stolen", "stole", "is stealing"], 0, "我的錢包昨天被偷了。"],
        ["c", "English ___ in many countries.", ["is spoken", "speaks", "is speaking"], 0, "很多國家說英文。"],
        ["c", "The road ___ repaired at the moment.", ["is being", "is", "has"], 0, "這條路正在修。"],
        ["c", "I ___ my car washed yesterday.", ["had", "was", "did"], 0, "我昨天去洗車了。"],
        ["f", "The results will ___ (announce) tomorrow.", "be announced", "結果明天公布。"],
        ["t", "他在台中出生。", ["He was born in Taichung."]]
    ]
},
{
    id: "eg-relative", level: "B1", title: "關係子句", sub: "who、which、that、where、whose",
    lessons: ["e-b1-06"],
    body: [
        { h: "用法", p: "中文說「住在隔壁的那個男人」，修飾語在前；英文要放在名詞**後面**，用關係代名詞連接：the man **who lives next door**。",
          tb: [["關係詞", "代替", "例子"], ["who", "人", "The woman **who** called you is my aunt."], ["which", "東西", "The book **which** I bought is great."], ["that", "人或東西（限定用法）", "The movie **that** we saw was boring."], ["whose", "…的（所有格）", "The boy **whose** dog is lost is crying."], ["where", "地方", "This is the café **where** we met."], ["when", "時間", "I remember the day **when** we met."]] },
        { h: "可以省略的時候", p: "關係代名詞在子句裡當**受詞**時可以省略：The book (that) I bought… / The person (who) I met…\n當**主詞**時不能省略：The man **who** lives next door…（不能說 The man lives next door…）" },
        { h: "限定 vs 非限定", p: "**限定**：沒有逗號，用來指出是哪一個，可以用 that。\n**非限定**：有逗號，只是補充說明，**不能用 that**。",
          ex: [["My brother who lives in Canada is a doctor.", "我住在加拿大的那個哥哥是醫生。（暗示有不只一個哥哥）"], ["My brother, who lives in Canada, is a doctor.", "我哥哥住在加拿大，他是醫生。（只有一個哥哥）"]],
          tip: "非限定子句不能用 that：My car, **that** is red… 是錯的，要用 **which**。", warn: true }
    ],
    ex: [
        ["c", "The woman ___ lives upstairs is a teacher.", ["who", "which", "whose"], 0, "住在樓上的女人是老師。"],
        ["c", "This is the restaurant ___ we had our first date.", ["where", "which", "who"], 0, "這是我們第一次約會的餐廳。"],
        ["c", "I have a friend ___ father is a pilot.", ["whose", "who", "who's"], 0, "我有一個爸爸是機師的朋友。"],
        ["c", "My phone, ___ I bought last year, is already broken.", ["which", "that", "who"], 0, "我去年買的手機已經壞了。"],
        ["f", "The movie ___ we watched was boring.（填 that 或 which）", ["that", "which"], "我們看的電影很無聊。"],
        ["t", "住在隔壁的那個男人是醫生。", ["The man who lives next door is a doctor.", "The man that lives next door is a doctor."]]
    ]
},
{
    id: "eg-gerund", level: "B1", title: "動名詞與不定詞", sub: "doing 還是 to do？",
    lessons: ["e-b1-07"],
    body: [
        { h: "接動名詞（V-ing）的動詞", p: "enjoy、mind、finish、avoid、suggest、keep、practice、consider、admit、deny、miss、can't help、look forward to、be used to",
          ex: [["I enjoy cooking.", "我喜歡煮飯。"], ["Would you mind closing the door?", "你介意關門嗎？"], ["I'm looking forward to seeing you.", "我很期待見到你。"]],
          tip: "look forward **to** 的 to 是介系詞，後面要接 V-ing：look forward to **seeing**（不是 to see）。", warn: true },
        { h: "接不定詞（to V）的動詞", p: "want、need、decide、plan、hope、expect、agree、refuse、promise、manage、afford、learn、would like",
          ex: [["I decided to quit my job.", "我決定辭職。"], ["We can't afford to buy a car.", "我們買不起車。"], ["She managed to finish on time.", "她設法準時完成了。"]] },
        { h: "兩種都可以，但意思不同", tb: [["動詞", "+ to V", "+ V-ing"], ["stop", "停下來去做另一件事：stop **to eat**", "停止做某事：stop **eating**"], ["remember", "記得要去做：remember **to lock** the door", "記得做過：remember **locking** it"], ["forget", "忘了要做", "忘了做過"], ["try", "努力嘗試：try **to open** it", "試試看（某方法）：try **restarting** it"], ["regret", "很遺憾要告知：regret **to tell** you", "後悔做過：regret **saying** that"]] },
        { h: "介系詞後面一律用 V-ing", ex: [["She's good at drawing.", "她擅長畫畫。"], ["Thanks for helping me.", "謝謝你幫我。"], ["He left without saying goodbye.", "他沒說再見就走了。"]] }
    ],
    ex: [
        ["c", "I enjoy ___ in the rain.", ["walking", "to walk", "walk"], 0, "我喜歡在雨中散步。"],
        ["c", "We decided ___ a taxi.", ["to take", "taking", "take"], 0, "我們決定搭計程車。"],
        ["c", "I'm looking forward to ___ you.", ["meeting", "meet", "met"], 0, "我很期待見到你。"],
        ["c", "Please remember ___ the lights.", ["to turn off", "turning off", "turn off"], 0, "請記得關燈。"],
        ["c", "He stopped ___ ten years ago.", ["smoking", "to smoke", "smoke"], 0, "他十年前戒菸了。"],
        ["f", "Thanks for ___ (help) me.", "helping", "謝謝你幫我。"],
        ["t", "我們買不起車。", ["We can't afford to buy a car.", "We cannot afford to buy a car.", "We can't afford a car."]]
    ]
},
{
    id: "eg-reported", level: "B1", title: "間接引語", sub: "轉述別人說的話",
    lessons: ["e-b1-08"],
    body: [
        { h: "時態往後退一步", p: "轉述動詞是過去式（said、told）時，原本的時態通常往過去推：",
          tb: [["直接引語", "間接引語"], ["\"I **am** tired.\"", "She said (that) she **was** tired."], ["\"I **'m working**.\"", "He said he **was working**."], ["\"I **finished** it.\"", "He said he **had finished** it."], ["\"I **have seen** it.\"", "She said she **had seen** it."], ["\"I **will** call.\"", "He said he **would** call."], ["\"I **can** help.\"", "She said she **could** help."]],
          tip: "如果內容到現在仍然成立，可以不改時態：He said he **lives** in Taipei.（現在還住）" },
        { h: "say 和 tell", p: "**say** (that)…：不接人，或用 say **to** someone\n**tell + 人** (that)…：一定要接人",
          tb: [["錯誤", "正確"], ["She said me that…", "She **told me** that… / She **said** that…"]], warn: true, tip: "tell 後面一定要接人；say 後面不能直接接人。" },
        { h: "問句與命令", tb: [["直接", "間接"], ["\"Are you OK?\"", "He asked **if** I was OK."], ["\"Where do you live?\"", "She asked where I **lived**.（不倒裝）"], ["\"Please sit down.\"", "He asked me **to sit** down."], ["\"Don't be late.\"", "She told me **not to be** late."]],
          tip: "間接問句用**直述句語序**：She asked where I lived（不是 where did I live）。", warn: true },
        { h: "時間、地點詞也要改", tb: [["直接", "間接"], ["now", "then"], ["today", "that day"], ["tomorrow", "the next day"], ["yesterday", "the day before"], ["here", "there"], ["this", "that"]] }
    ],
    ex: [
        ["c", "She said she ___ tired.", ["was", "is being", "were"], 0, "她說她很累。"],
        ["c", "He ___ me that he would be late.", ["told", "said", "say"], 0, "他告訴我他會遲到。"],
        ["c", "She asked me where I ___.", ["lived", "did live", "do I live"], 0, "她問我住在哪裡。"],
        ["c", "He asked me ___ I was OK.", ["if", "that", "what"], 0, "他問我還好嗎。"],
        ["f", "She told me ___ (not / be) late.", "not to be", "她叫我不要遲到。"],
        ["t", "他說他會打電話。", ["He said he would call.", "He said that he would call."]]
    ]
},
// ---------------- B2 ----------------
{
    id: "eg-narrative", level: "B2", title: "敘事時態與完成進行式", sub: "過去完成式、完成進行式",
    lessons: ["e-b2-01"],
    body: [
        { h: "過去完成式：過去的過去", p: "**had + p.p.**，表示在另一個過去事件**之前**就已發生的事。",
          ex: [["When we got to the station, the train had already left.", "我們到車站時，火車已經開走了。"], ["I realized I had left my keys at home.", "我發現我把鑰匙忘在家裡了。"]] },
        { h: "現在完成進行式：持續到現在", p: "**have / has been + V-ing**，強調從過去持續到現在的**過程**，常有 for / since，或解釋現在看得到的結果。",
          ex: [["I've been studying English for ten years.", "我學英文學了十年（現在還在學）。"], ["You look tired. — I've been running.", "你看起來好累。——我剛剛在跑步。"]] },
        { h: "完成式 vs 完成進行式", tb: [["現在完成式", "現在完成進行式"], ["強調結果、次數", "強調過程、持續多久"], ["I've written three emails.", "I've been writing emails all morning."], ["I've read the book.（讀完了）", "I've been reading the book.（還沒讀完）"]] },
        { h: "敘事時的搭配", p: "說故事時常混用：**過去簡單**（主線事件）、**過去進行**（背景）、**過去完成**（更早的事）、**過去完成進行**（更早之前持續的事）。",
          ex: [["It was raining. I had been waiting for an hour when she finally arrived.", "那時在下雨。我已經等了一個小時她才終於出現。"]] }
    ],
    ex: [
        ["c", "When I arrived, the movie ___.", ["had started", "has started", "starts"], 0, "我到的時候電影已經開始了。"],
        ["c", "I ___ English for ten years.", ["have been learning", "am learning", "learned"], 0, "我學英文學了十年。"],
        ["c", "Your eyes are red. ___ you been crying?", ["Have", "Did", "Are"], 0, "你眼睛好紅，你剛剛在哭嗎？"],
        ["c", "She ___ three books this year.", ["has written", "has been writing", "wrote been"], 0, "她今年寫了三本書。"],
        ["f", "I realized I ___ (leave) my phone at home.", "had left", "我發現我把手機忘在家了。"],
        ["t", "我已經等了一個小時。", ["I've been waiting for an hour.", "I have been waiting for an hour.", "I had been waiting for an hour."]]
    ]
},
{
    id: "eg-deduction", level: "B2", title: "推測的情態動詞", sub: "must be、can't be、might have…",
    lessons: ["e-b2-03"],
    body: [
        { h: "推測現在", tb: [["確定程度", "結構", "例子"], ["幾乎確定是", "must + 原形", "He must be tired. He worked all night."], ["可能", "might / may / could + 原形", "She might be at home."], ["幾乎確定不是", "can't + 原形", "That can't be true!"]] },
        { h: "推測過去", p: "**情態動詞 + have + p.p.**",
          tb: [["意思", "結構", "例子"], ["一定已經…", "must have + p.p.", "She must have forgotten."], ["可能已經…", "might / may / could have + p.p.", "They might have missed the bus."], ["不可能…", "can't / couldn't have + p.p.", "He can't have finished already."], ["本來應該…（卻沒有）", "should have + p.p.", "You should have told me."], ["本來可以…（卻沒有）", "could have + p.p.", "We could have won."]],
          ex: [["You should have told me earlier.", "你早該跟我說的。"], ["I could have been killed!", "我差點就沒命了！"]] },
        { h: "常見錯誤", p: "must 的否定推測不是 mustn't，而是 **can't**：He **can't** be at home（他不可能在家），He mustn't be at home 意思是「他不准在家」。", warn: true, tip: "推測「不可能」用 can't，不用 mustn't。" }
    ],
    ex: [
        ["c", "The lights are off. They ___ be out.", ["must", "can't", "should"], 0, "燈關著，他們一定出門了。"],
        ["c", "That ___ be Tom. He's in Japan.", ["can't", "mustn't", "must"], 0, "那不可能是湯姆，他在日本。"],
        ["c", "She's late. She ___ have missed the bus.", ["might", "can't", "should"], 0, "她遲到了，可能沒趕上公車。"],
        ["c", "You ___ have told me! I would have helped.", ["should", "must", "can"], 0, "你早該跟我說的！"],
        ["t", "她一定忘了。", ["She must have forgotten.", "She must have forgotten it."]]
    ]
},
{
    id: "eg-advanced", level: "B2", title: "分詞構句、倒裝與強調", sub: "讓句子更精簡、更正式",
    lessons: ["e-b2-05", "e-b2-06"],
    body: [
        { h: "分詞構句", p: "兩個子句**主詞相同**時，可以把其中一個改成分詞，讓句子更精簡：\n主動 → **V-ing**；被動 → **p.p.**；先發生 → **Having + p.p.**",
          tb: [["原句", "分詞構句"], ["When I walked home, I saw an accident.", "**Walking** home, I saw an accident."], ["Because he was tired, he went to bed early.", "**Being** tired, he went to bed early."], ["After she had finished, she left.", "**Having finished**, she left."], ["The book was written in 1900. It is still popular.", "**Written** in 1900, the book is still popular."]],
          tip: "主詞必須相同：Walking home, **the rain** started 是錯的（雨不會走路回家）。", warn: true },
        { h: "否定副詞倒裝", p: "正式英文中，把否定或限制性的副詞放句首加強語氣，後面要**倒裝**（助動詞 + 主詞）：",
          ex: [["Never have I seen such a beautiful view.", "我從沒看過這麼美的景色。"], ["Not only did he lie, but he also stole money.", "他不但說謊，還偷了錢。"], ["Rarely do we get snow here.", "我們這裡很少下雪。"], ["Only then did I understand.", "那時我才明白。"]] },
        { h: "強調句（分裂句）", p: "**It is / was … that …**：強調某個部分。\n**What … is / was …**：強調動作或東西。",
          ex: [["It was Mary who called you, not Jane.", "打給你的是瑪麗，不是珍。"], ["What I need is a long holiday.", "我需要的是一個長假。"], ["What surprised me was his reaction.", "讓我驚訝的是他的反應。"]] }
    ],
    ex: [
        ["c", "___ home, I met an old friend.", ["Walking", "Walked", "To walk"], 0, "走路回家時，我遇到一位老朋友。"],
        ["c", "___ in 1990, the building needs repairs.", ["Built", "Building", "Having built"], 0, "這棟建於 1990 年的大樓需要維修。"],
        ["c", "Never ___ such a mess!", ["have I seen", "I have seen", "I saw"], 0, "我從沒看過這麼亂的！"],
        ["c", "___ I need is some sleep.", ["What", "That", "Which"], 0, "我需要的是睡一覺。"],
        ["f", "Not only ___ he late, but he also forgot the documents.", "was", "他不但遲到，還忘了帶文件。"]
    ]
}
];
