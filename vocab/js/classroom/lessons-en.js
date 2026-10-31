// ===================== 英文教室 =====================
// 從 A2 開始（假設已經學過基礎英文），一路到 B2。欄位同法文課程；fr 欄位在英文課程中是英文副標題
const EN_COURSE = [
// ---------------- A2 ----------------
{
    id: "e-a2-01", level: "A2", title: "自我介紹：現在簡單式與進行式", fr: "Nice to meet you",
    goal: "自然地介紹自己的工作、生活和最近在做的事，分清楚 I work 和 I'm working。",
    grammar: [
        { t: "習慣用簡單式，最近、暫時用進行式", d: "**I work** in marketing.（長期的事實）\n**I'm working** on a big project this month.（這陣子、暫時）\n中文都說「我在做…」，英文要看是長期還是暫時。",
          tb: [["簡單式", "進行式"], ["I live in Taipei.", "I'm living with my parents for now."], ["She teaches math.", "She's teaching a summer class."], ["What do you do?（你做什麼工作？）", "What are you doing?（你在做什麼？）"]],
          ex: [["What do you do? — I'm a software engineer.", "你做什麼工作？——我是軟體工程師。"], ["I'm learning French at the moment.", "我最近在學法文。"]] },
        { t: "介紹自己常用句型", d: "**I'm originally from…**（我是…人）、**I've been living here for…**（我住這裡…年了）、**In my free time, I…**（空閒時我會…）、**I'm into…**（我很喜歡…，口語）。",
          ex: [["I'm originally from Tainan, but I live in Taipei now.", "我是台南人，但現在住台北。"], ["I'm really into hiking these days.", "我最近很迷爬山。"]] }
    ],
    vocab: [["originally", "原本；起初", "adv."], ["be into", "對…很著迷（口語）", "phr."], ["at the moment", "目前", "phr."], ["for now", "暫時", "phr."], ["work for", "在…公司工作", "phr."], ["work on", "致力於；正在做（專案）", "phr."], ["in charge of", "負責", "phr."], ["hometown", "家鄉", "n."], ["hobby", "嗜好", "n."], ["free time", "空閒時間", "n."], ["get to know", "逐漸認識", "phr."]],
    dialog: [["Emma", "Hi, I'm Emma. Nice to meet you.", "嗨，我是艾瑪，很高興認識你。"], ["Kai", "Nice to meet you too. I'm Kai. So, what do you do, Emma?", "我也很高興認識妳。我是凱。艾瑪，妳是做什麼的？"], ["Emma", "I work for a design company. What about you?", "我在一家設計公司工作。你呢？"], ["Kai", "I'm an engineer, but I'm taking a few months off right now.", "我是工程師，不過現在休息幾個月。"], ["Emma", "Oh, nice! What are you doing with all that free time?", "喔，真好！你都用空閒時間做什麼？"], ["Kai", "I'm learning to cook, and I'm really into hiking these days.", "我在學做菜，最近也很迷爬山。"]],
    culture: "英語系國家初次見面常問 **What do you do?**（做什麼工作），不太會直接問年齡、薪水或婚姻狀況，那些被認為比較私人。",
    ex: [
        ["c", "What ___ you do? — I'm a nurse.", ["do", "are", "does"], 0, "你做什麼工作？——我是護理師。"],
        ["c", "I ___ for a bank in Taipei.", ["work", "am work", "working"], 0, "我在台北一家銀行工作。"],
        ["c", "She ___ a new project this month.", ["is working on", "works on", "work on"], 0, "她這個月在做一個新專案。"],
        ["c", "I'm really ___ photography.", ["into", "in", "on"], 0, "我很喜歡攝影。"],
        ["f", "Where ___ you originally from?", "are", "你原本是哪裡人？"],
        ["o", "I'm / learning / French / at / the / moment", "我最近在學法文。"],
        ["t", "我在一家設計公司工作。", ["I work for a design company.", "I work at a design company."]],
        ["l", "In my free time, I like to go hiking.", "空閒時我喜歡去爬山。"]
    ]
},
{
    id: "e-a2-02", level: "A2", title: "週末做了什麼：過去式", fr: "How was your weekend?",
    goal: "用過去式說一段經歷，正確使用不規則動詞與 did，認識 used to。",
    grammar: [
        { t: "過去簡單式與 did", d: "肯定句用動詞過去式；否定句和問句用 **did + 原形**。",
          tb: [["肯定", "否定", "問句"], ["I went out.", "I didn't go out.", "Did you go out?"], ["She watched a movie.", "She didn't watch a movie.", "Did she watch a movie?"]],
          ex: [["What did you do last weekend?", "你上週末做了什麼？"], ["We didn't do much. We just stayed home.", "沒做什麼，就待在家。"]] },
        { t: "說故事的連接詞", d: "依時間順序串起來：**first**、**then**、**after that**、**later**、**in the end**、**finally**。",
          ex: [["First we had brunch, then we went to the beach.", "我們先吃早午餐，然後去海邊。"], ["In the end, we got home really late.", "最後我們很晚才到家。"]] },
        { t: "used to：以前常常", d: "**used to + 原形**：以前的習慣，現在不再。",
          ex: [["I used to play basketball every weekend.", "我以前每個週末都打籃球。"]] }
    ],
    vocab: [["chill", "放鬆（口語）", "v."], ["hang out", "出去玩；閒晃", "phr."], ["catch up", "敘舊；跟上", "phr."], ["brunch", "早午餐", "n."], ["exhausting", "令人筋疲力盡的", "adj."], ["amazing", "很棒的", "adj."], ["terrible", "糟糕的", "adj."], ["in the end", "最後", "phr."], ["after that", "在那之後", "phr."], ["go for a walk", "去散步", "phr."]],
    dialog: [["Lily", "Hey! How was your weekend?", "嘿！週末過得怎麼樣？"], ["Ben", "Pretty good, thanks. I went to Yilan with some friends.", "還不錯，謝謝。我和朋友去了宜蘭。"], ["Lily", "Oh, nice! What did you do there?", "喔，真好！你們在那裡做了什麼？"], ["Ben", "We went to a hot spring and ate a lot of seafood. What about you?", "我們去泡溫泉，吃了很多海鮮。妳呢？"], ["Lily", "I didn't do much. I just chilled at home and caught up on some shows.", "我沒做什麼，就在家放鬆、補看了一些劇。"], ["Ben", "Sounds relaxing!", "聽起來很放鬆！"]],
    culture: "週一在辦公室最常見的寒暄就是 **How was your weekend?**，簡單回答再反問 **What about you?** 是很自然的閒聊方式。",
    ex: [
        ["c", "We ___ to the beach on Saturday.", ["went", "go", "goed"], 0, "我們星期六去了海邊。"],
        ["c", "Did you ___ a good time?", ["have", "had", "has"], 0, "你玩得開心嗎？"],
        ["c", "I ___ much last weekend.", ["didn't do", "don't do", "didn't did"], 0, "我上週末沒做什麼。"],
        ["c", "I ___ play the piano, but I stopped.", ["used to", "use to", "was used to"], 0, "我以前彈鋼琴，但後來停了。"],
        ["f", "She ___ (catch) the last train home.", "caught", "她趕上了回家的末班車。"],
        ["f", "What ___ you do yesterday?", "did", "你昨天做了什麼？"],
        ["t", "最後我們很晚才到家。", ["In the end, we got home really late.", "In the end we got home very late.", "In the end, we got home late."]],
        ["l", "First we had brunch, then we went shopping.", "我們先吃早午餐，然後去逛街。"]
    ]
},
{
    id: "e-a2-03", level: "A2", title: "計畫與約定：談未來", fr: "What are you up to this weekend?",
    goal: "區分 will、be going to 和現在進行式，會約人、答應和改期。",
    grammar: [
        { t: "三種未來說法", d: "**will**：當下決定、承諾、提議。\n**be going to**：已經打算好。\n**現在進行式**：已經安排好的約、行程。",
          tb: [["情境", "說法"], ["朋友說好渴 → 你說「我去幫你拿水」", "I'll get you some water."], ["暑假打算", "I'm going to visit Japan."], ["已經約好", "I'm meeting Amy for dinner on Friday."]],
          ex: [["What are you up to this weekend?", "你這週末要做什麼？"], ["I'm going to visit my grandparents.", "我打算去看爺爺奶奶。"]] },
        { t: "邀約與回應", d: "邀約：**Do you want to…? / How about…? / Are you free on…?**\n接受：**Sounds great! / I'd love to.**\n婉拒：**I'd love to, but… / Can we make it another time?**",
          ex: [["Are you free on Saturday?", "你星期六有空嗎？"], ["I'd love to, but I'm working that day.", "我很想去，但那天要上班。"], ["Can we make it next week instead?", "我們可以改到下週嗎？"]] }
    ],
    vocab: [["be up to", "正在做；打算做（口語）", "phr."], ["plan", "計畫", "n."], ["free", "有空的", "adj."], ["available", "有空的；可用的", "adj."], ["make it", "趕上；能到", "phr."], ["call off", "取消", "phr."], ["put off", "延後", "phr."], ["book", "預訂", "v."], ["confirm", "確認", "v."], ["instead", "改為；代替", "adv."]],
    dialog: [["Mia", "Are you free this Saturday? There's a jazz concert downtown.", "你這星期六有空嗎？市中心有一場爵士音樂會。"], ["Leo", "I'd love to, but I'm helping my sister move that day.", "我很想去，但那天要幫我妹搬家。"], ["Mia", "Oh, no worries. What about Sunday? I'm going to try a new brunch place.", "喔，沒關係。那星期天呢？我打算去試一家新的早午餐店。"], ["Leo", "Sunday works. What time?", "星期天可以。幾點？"], ["Mia", "Let's say eleven. I'll send you the address.", "就十一點吧。我傳地址給你。"], ["Leo", "Perfect. See you then!", "太好了，到時見！"]],
    ex: [
        ["c", "It's cold in here. — I ___ close the window.", ["'ll", "'m going to", "close"], 0, "這裡好冷。——我去關窗。"],
        ["c", "I ___ meeting Tom at 6. We booked a table.", ["am", "will", "going to"], 0, "我六點要和湯姆見面，我們訂了位。"],
        ["c", "What are you ___ to this weekend?", ["up", "on", "in"], 0, "你這週末要做什麼？"],
        ["c", "I'd love ___, but I'm busy.", ["to", "it", "for"], 0, "我很想去，但我很忙。"],
        ["f", "We're ___ to buy a new car next year.", "going", "我們打算明年買新車。"],
        ["o", "Can / we / make / it / another / time / ?", "我們可以改天嗎？"],
        ["t", "你星期六有空嗎？", ["Are you free on Saturday?", "Are you free this Saturday?"]],
        ["l", "I'll send you the address.", "我傳地址給你。"]
    ]
},
{
    id: "e-a2-04", level: "A2", title: "點餐與購物：可數與不可數", fr: "Can I get a coffee?",
    goal: "自然地點餐、問數量，正確使用 some / any、much / many 與冠詞。",
    grammar: [
        { t: "可數、不可數與數量", d: "**可數**：a sandwich、two sandwiches → many、a few\n**不可數**：water、bread、advice → much、a little\n要數不可數名詞時用單位：**a glass of** water、**a slice of** bread、**a piece of** cake。",
          tb: [["單位", "例子"], ["a cup of", "a cup of coffee"], ["a bottle of", "a bottle of water"], ["a slice of", "a slice of pizza"], ["a piece of", "a piece of cake / advice"], ["a loaf of", "a loaf of bread"]] },
        { t: "點餐的說法", d: "**Can I get / Could I have…?** 比 I want… 自然有禮貌。\n店員常問：**For here or to go?**（內用還是外帶）、**Anything else?**（還需要什麼嗎）",
          ex: [["Can I get a large latte, please?", "可以給我一杯大杯拿鐵嗎？"], ["Could we have some more napkins?", "可以再給我們一些餐巾紙嗎？"], ["Is there any sugar in this?", "這裡面有加糖嗎？"]] }
    ],
    vocab: [["for here", "內用", "phr."], ["to go", "外帶", "phr."], ["napkin", "餐巾紙", "n."], ["refill", "續杯", "n."], ["slice", "片", "n."], ["portion", "一份", "n."], ["vegetarian", "素食的；素食者", "adj."], ["spicy", "辣的", "adj."], ["recommend", "推薦", "v."], ["the check", "帳單（美式）", "n."], ["split the bill", "各付各的；分攤", "phr."]],
    dialog: [["Server", "Hi there! What can I get for you?", "你好！請問要點什麼？"], ["Jay", "Can I get a medium iced latte and a slice of banana bread?", "可以給我一杯中杯冰拿鐵和一片香蕉蛋糕嗎？"], ["Server", "Sure. For here or to go?", "好的。內用還是外帶？"], ["Jay", "For here, please. Oh, and is there any nut in the banana bread?", "內用，謝謝。喔，香蕉蛋糕裡面有堅果嗎？"], ["Server", "Yes, it has some walnuts. Would you like a muffin instead?", "有，加了一些核桃。要不要改成瑪芬？"], ["Jay", "Yes, a blueberry muffin, please. Thanks!", "好，請給我藍莓瑪芬。謝謝！"]],
    culture: "在美國餐廳用餐通常要付 **15–20% 的小費**（tip），結帳說 **Can we get the check, please?**；英國說 **the bill**。",
    ex: [
        ["c", "Can I have a glass of ___ ?", ["water", "waters", "a water"], 0, "可以給我一杯水嗎？"],
        ["c", "How ___ sandwiches do you want?", ["many", "much", "little"], 0, "你要幾個三明治？"],
        ["c", "Is there ___ milk left?", ["any", "a", "many"], 0, "還有牛奶嗎？"],
        ["c", "Could I have a ___ of pizza?", ["slice", "loaf", "bottle"], 0, "可以給我一片披薩嗎？"],
        ["f", "For here or to ___ ?", "go", "內用還是外帶？"],
        ["f", "Can we ___ the check, please?", ["get", "have"], "麻煩結帳。"],
        ["t", "可以給我一杯大杯拿鐵嗎？", ["Can I get a large latte, please?", "Can I have a large latte, please?", "Could I have a large latte, please?", "Can I get a large latte?"]],
        ["l", "Would you like anything else?", "還需要什麼嗎？"]
    ]
},
{
    id: "e-a2-05", level: "A2", title: "比較與選擇：比較級、最高級", fr: "Which one is better?",
    goal: "比較產品、地方與選項，表達偏好。",
    grammar: [
        { t: "比較級與最高級", d: "短字加 **-er / -est**，長字用 **more / most**。不規則：good → better → best、bad → worse → worst。",
          ex: [["This laptop is lighter than that one.", "這台筆電比那台輕。"], ["It's the most comfortable chair I've ever tried.", "這是我坐過最舒服的椅子。"]] },
        { t: "表達偏好", d: "**I prefer A to B.**（比起 B 我比較喜歡 A）\n**I'd rather + 原形 (than…)**（我寧願…）\n**A is not as … as B.**（A 不如 B…）",
          ex: [["I prefer tea to coffee.", "比起咖啡我比較喜歡茶。"], ["I'd rather stay in tonight.", "我今晚寧願待在家。"], ["The new model isn't as good as the old one.", "新款沒有舊款好。"]] }
    ],
    vocab: [["compare", "比較", "v."], ["prefer", "比較喜歡", "v."], ["would rather", "寧願", "phr."], ["option", "選項", "n."], ["quality", "品質", "n."], ["value for money", "物超所值", "phr."], ["worth it", "值得", "phr."], ["durable", "耐用的", "adj."], ["convenient", "方便的", "adj."], ["affordable", "負擔得起的", "adj."]],
    dialog: [["Sales", "Are you looking for anything in particular?", "您在找什麼特定的東西嗎？"], ["Nina", "Yes, I need a new phone. Which one is better, this one or that one?", "對，我需要一支新手機。這支和那支哪個比較好？"], ["Sales", "This one has a better camera, but that one has a bigger battery.", "這支相機比較好，但那支電池比較大。"], ["Nina", "Hmm. Which is cheaper?", "嗯，哪支比較便宜？"], ["Sales", "That one is about a hundred dollars cheaper. It's great value for money.", "那支大概便宜一百元，很划算。"], ["Nina", "I think I'll go with the cheaper one. Battery life matters more to me.", "我想我選便宜那支，電池續航對我比較重要。"]],
    ex: [
        ["c", "This bag is ___ than mine.", ["bigger", "more big", "biggest"], 0, "這個包比我的大。"],
        ["c", "It's the ___ restaurant in the city.", ["best", "better", "goodest"], 0, "這是城裡最好的餐廳。"],
        ["c", "I prefer walking ___ driving.", ["to", "than", "from"], 0, "比起開車我比較喜歡走路。"],
        ["c", "I'd rather ___ at home tonight.", ["stay", "to stay", "staying"], 0, "我今晚寧願待在家。"],
        ["f", "The bus is not as fast ___ the train.", "as", "公車沒有火車快。"],
        ["o", "Which / one / is / more / comfortable / ?", "哪一個比較舒服？"],
        ["t", "比起咖啡我比較喜歡茶。", ["I prefer tea to coffee."]],
        ["l", "I think I'll go with the cheaper one.", "我想我選便宜的那個。"]
    ]
},
{
    id: "e-a2-06", level: "A2", title: "你曾經…？現在完成式說經驗", fr: "Have you ever…?",
    goal: "用現在完成式聊經驗，知道什麼時候要換成過去式補充細節。",
    grammar: [
        { t: "Have you ever + p.p.?", d: "問人生經驗（不在乎什麼時候）用現在完成式。回答後如果要說**什麼時候、細節**，改用**過去式**。",
          ex: [["Have you ever been to Europe? — Yes, I have. I went to Italy in 2019.", "你去過歐洲嗎？——去過，我 2019 年去了義大利。"], ["I've never tried stinky tofu.", "我從沒吃過臭豆腐。"]] },
        { t: "次數與 never / before", d: "**once、twice、three times**、**many times**、**never**、**before**。",
          tb: [["說法", "例子"], ["一次", "I've been there once."], ["兩次", "She's seen that movie twice."], ["從沒", "I've never been skiing."], ["以前…過", "Have we met before?"]] }
    ],
    vocab: [["ever", "曾經", "adv."], ["never", "從不；從沒", "adv."], ["once", "一次", "adv."], ["twice", "兩次", "adv."], ["experience", "經驗；經歷", "n."], ["bucket list", "人生清單", "n."], ["go skydiving", "去跳傘", "phr."], ["try", "嘗試；嚐", "v."], ["unforgettable", "難忘的", "adj."], ["scary", "可怕的", "adj."]],
    dialog: [["Tom", "Have you ever been to Japan?", "你去過日本嗎？"], ["Yuna", "Yes, I've been there three times. I went to Hokkaido last winter.", "去過三次。我去年冬天去了北海道。"], ["Tom", "Wow! Have you ever tried skiing?", "哇！妳滑過雪嗎？"], ["Yuna", "Yes, I tried it in Hokkaido. I fell over about a hundred times!", "有，我在北海道試過，跌倒了大概一百次！"], ["Tom", "Ha! I've never been skiing. It's on my bucket list.", "哈！我從沒滑過雪，那在我的人生清單上。"]],
    ex: [
        ["c", "Have you ever ___ to Korea?", ["been", "gone", "went"], 0, "你去過韓國嗎？"],
        ["c", "I ___ that movie last night.", ["saw", "have seen", "have saw"], 0, "我昨晚看了那部電影。"],
        ["c", "She's ___ eaten durian.", ["never", "ever", "yet"], 0, "她從沒吃過榴槤。"],
        ["c", "I've been to Paris ___.", ["twice", "two time", "second"], 0, "我去過巴黎兩次。"],
        ["f", "___ you ever met a celebrity?", "Have", "你見過名人嗎？"],
        ["f", "I've ___ (try) bungee jumping once.", "tried", "我玩過一次高空彈跳。"],
        ["t", "我從沒吃過臭豆腐。", ["I've never tried stinky tofu.", "I have never tried stinky tofu.", "I've never eaten stinky tofu.", "I have never eaten stinky tofu."]],
        ["l", "Have we met before?", "我們以前見過嗎？"]
    ]
},
// ---------------- B1 ----------------
{
    id: "e-b1-01", level: "B1", title: "完成式還是過去式？for 與 since", fr: "How long have you…?",
    goal: "能談從過去持續到現在的事，正確選擇現在完成式與過去式。",
    grammar: [
        { t: "持續到現在：How long have you…?", d: "**for + 一段時間**、**since + 起點**。強調過程時可用完成進行式 **have been + V-ing**。",
          ex: [["How long have you worked here? — For about five years.", "你在這裡工作多久了？——大約五年。"], ["I've been learning English since I was eight.", "我從八歲就開始學英文。"]] },
        { t: "有明確過去時間 → 過去式", d: "**yesterday、last…、ago、in 2020、when I was…** 都是明確的過去，要用過去式。",
          tb: [["現在完成式", "過去式"], ["I've lost my phone.（現在還沒找到）", "I lost my phone yesterday."], ["She's worked here for two years.（還在）", "She worked here for two years.（已離職）"], ["Have you finished?", "When did you finish?"]],
          ex: [["I started this job three years ago.", "我三年前開始做這份工作。"], ["I've had this job for three years.", "我做這份工作三年了。"]] }
    ],
    vocab: [["so far", "到目前為止", "phr."], ["lately", "最近", "adv."], ["recently", "最近", "adv."], ["ago", "…以前", "adv."], ["since then", "從那時起", "phr."], ["switch careers", "轉換跑道", "phr."], ["get used to", "逐漸習慣", "phr."], ["settle in", "安頓下來", "phr."], ["move", "搬家", "v."], ["miss", "想念；錯過", "v."]],
    dialog: [["Anna", "How long have you lived in London?", "你在倫敦住多久了？"], ["Wei", "I've lived here for about two years. I moved here in 2023.", "大約兩年了，我 2023 年搬來的。"], ["Anna", "Have you got used to the weather yet?", "你習慣這裡的天氣了嗎？"], ["Wei", "Not really! It's been raining all week.", "不太習慣！整個禮拜都在下雨。"], ["Anna", "What did you do before you came here?", "你來這裡之前在做什麼？"], ["Wei", "I worked as an accountant in Taipei, but I switched careers when I moved.", "我在台北當會計師，搬來時轉換了跑道。"]],
    ex: [
        ["c", "I ___ here since 2020.", ["have worked", "worked", "work"], 0, "我從 2020 年就在這裡工作。"],
        ["c", "She ___ to Canada three years ago.", ["moved", "has moved", "has been moving"], 0, "她三年前搬到加拿大。"],
        ["c", "How long ___ you known each other?", ["have", "did", "are"], 0, "你們認識多久了？"],
        ["c", "It ___ all day. I'm sick of it.", ["has been raining", "rained", "rains"], 0, "下了一整天雨，我受夠了。"],
        ["f", "We've been friends ___ high school.", "since", "我們從高中就是朋友。"],
        ["f", "I've had this car ___ ten years.", "for", "這台車我開了十年。"],
        ["t", "我三年前開始做這份工作。", ["I started this job three years ago."]],
        ["l", "I haven't seen him lately.", "我最近都沒看到他。"]
    ]
},
{
    id: "e-b1-02", level: "B1", title: "給建議與談規定：情態助動詞", fr: "You should…",
    goal: "能給建議、說明規定與義務，分清 mustn't 和 don't have to。",
    grammar: [
        { t: "建議", d: "語氣由輕到重：**You could… → You should… → You'd better…**\n也可以用問句：**Why don't you…? / Have you thought about…?**",
          ex: [["You could try a different approach.", "你可以試試別的方法。"], ["You should get some rest.", "你應該休息一下。"], ["Why don't you talk to your manager?", "你何不跟主管談談？"], ["You'd better hurry, or you'll miss the bus.", "你最好快點，不然會錯過公車。"]] },
        { t: "義務與禁止", tb: [["意思", "說法", "例子"], ["必須（規定）", "have to", "We have to wear ID badges."], ["必須（自己覺得）", "must", "I must remember to call her."], ["不必", "don't have to", "You don't have to dress up."], ["不可以", "mustn't / can't", "You mustn't use your phone during the exam."], ["過去必須", "had to", "I had to work late yesterday."]] }
    ],
    vocab: [["advice", "建議（不可數）", "n."], ["advise", "建議（動詞）", "v."], ["rule", "規則", "n."], ["allowed", "被允許的", "adj."], ["dress code", "服裝規定", "n."], ["deadline", "截止期限", "n."], ["get some rest", "休息一下", "phr."], ["burn out", "精疲力竭；倦怠", "phr."], ["work-life balance", "工作與生活的平衡", "n."], ["overtime", "加班", "n."]],
    dialog: [["Sam", "I'm so stressed. I've worked overtime every day this week.", "我壓力好大，這週每天都加班。"], ["Joy", "You should talk to your manager about your workload.", "你應該跟主管談談你的工作量。"], ["Sam", "I know, but I have to finish this project by Friday.", "我知道，但我得在週五前完成這個專案。"], ["Joy", "Why don't you ask someone to help you?", "你何不找人幫忙？"], ["Sam", "Maybe. But I don't want people to think I can't handle it.", "也許吧。但我不想讓人覺得我應付不來。"], ["Joy", "You mustn't burn yourself out. Your health comes first.", "你不能把自己累垮，健康最重要。"]],
    ex: [
        ["c", "You ___ see a doctor about that cough.", ["should", "mustn't", "don't have to"], 0, "你應該去看醫生。"],
        ["c", "It's optional. You ___ come if you don't want to.", ["don't have to", "mustn't", "have to"], 0, "這是自由參加的。"],
        ["c", "You ___ smoke in the hospital.", ["mustn't", "don't have to", "should"], 0, "醫院裡不能抽菸。"],
        ["c", "I ___ work late yesterday.", ["had to", "must", "have to"], 0, "我昨天得加班。"],
        ["c", "Can you give me some ___ ?", ["advice", "advices", "advise"], 0, "你可以給我一些建議嗎？"],
        ["f", "Why ___ you talk to your manager?", "don't", "你何不跟主管談談？"],
        ["t", "你最好快點，不然會錯過公車。", ["You'd better hurry, or you'll miss the bus.", "You had better hurry, or you will miss the bus.", "You'd better hurry or you'll miss the bus."]],
        ["l", "You don't have to dress up for the party.", "派對不用盛裝打扮。"]
    ]
},
{
    id: "e-b1-03", level: "B1", title: "如果…就…：零與第一條件句", fr: "If it rains…",
    goal: "能說明可能的情況與結果，正確使用 if、unless、as long as。",
    grammar: [
        { t: "零條件句：一般事實", d: "**If + 現在式, 現在式**：只要…就一定…",
          ex: [["If you heat water to 100°C, it boils.", "水加熱到一百度就會沸騰。"], ["If I drink coffee at night, I can't sleep.", "我晚上喝咖啡就會睡不著。"]] },
        { t: "第一條件句：可能發生", d: "**If + 現在式, will + 原形**。if 子句**不能用 will**。\n類似的連接詞：**unless**（除非）、**as long as**（只要）、**in case**（以防）。",
          ex: [["If it rains tomorrow, we'll stay home.", "如果明天下雨，我們就待在家。"], ["Unless you leave now, you'll be late.", "除非你現在出發，不然會遲到。"], ["You can borrow my car as long as you drive carefully.", "只要你小心開，就可以借我的車。"], ["Take an umbrella in case it rains.", "帶把傘以防下雨。"]] }
    ],
    vocab: [["unless", "除非", "conj."], ["as long as", "只要", "phr."], ["in case", "以防", "phr."], ["otherwise", "否則", "adv."], ["forecast", "預報", "n."], ["chance", "機會；可能性", "n."], ["probably", "可能", "adv."], ["definitely", "一定", "adv."], ["postpone", "延期", "v."], ["backup plan", "備案", "n."]],
    dialog: [["Max", "Are we still going hiking on Saturday?", "我們星期六還是去爬山嗎？"], ["Ivy", "If the weather's good, yes. The forecast says there's a chance of rain.", "如果天氣好就去。預報說有可能下雨。"], ["Max", "If it rains, we'll go to the museum instead.", "如果下雨，我們就改去博物館。"], ["Ivy", "Good idea. Let's meet at eight unless it's pouring.", "好主意。除非下大雨，不然我們八點見。"], ["Max", "I'll bring snacks in case we get hungry.", "我會帶點心，以防我們肚子餓。"]],
    ex: [
        ["c", "If it ___ tomorrow, we'll stay home.", ["rains", "will rain", "rained"], 0, "如果明天下雨，我們就待在家。"],
        ["c", "If you mix red and blue, you ___ purple.", ["get", "will got", "got"], 0, "紅色和藍色混在一起會變紫色。"],
        ["c", "___ you hurry, you'll miss the train.", ["Unless", "If", "As long as"], 0, "除非你快點，不然會錯過火車。"],
        ["c", "Take a jacket ___ it gets cold.", ["in case", "unless", "if not"], 0, "帶件外套以防變冷。"],
        ["f", "I'll lend you the money as long as you ___ (pay) me back.", "pay", "只要你還我，我就借你錢。"],
        ["o", "If / I / see / him / , / I'll / tell / him", "如果我看到他，我會告訴他。"],
        ["t", "如果下雨，我們就去博物館。", ["If it rains, we'll go to the museum.", "If it rains, we will go to the museum.", "If it rains we'll go to the museum."]],
        ["l", "Let's meet at eight unless it's pouring.", "除非下大雨，不然我們八點見。"]
    ]
},
{
    id: "e-b1-04", level: "B1", title: "假如我是你：第二條件句與 wish", fr: "If I were you…",
    goal: "談論假設與夢想，用 If I were you 給建議，用 wish 表達遺憾。",
    grammar: [
        { t: "第二條件句", d: "**If + 過去式, would + 原形**：與現在事實相反，或不太可能發生。be 動詞用 **were**。",
          ex: [["If I had more free time, I'd learn to play the guitar.", "如果我有更多空閒，我會學吉他。"], ["If I were you, I'd accept the offer.", "如果我是你，我會接受那個工作機會。"], ["What would you do if you lost your job?", "如果你失業了會怎麼辦？"]] },
        { t: "第一 vs 第二條件句", tb: [["第一（覺得可能）", "第二（覺得不太可能）"], ["If I win, I'll buy dinner.", "If I won the lottery, I'd quit my job."], ["If she calls, I'll tell her.", "If she called, I'd be surprised."]] },
        { t: "wish：希望現在不一樣", d: "**I wish + 過去式**：可惜現在不是這樣。\n**I wish I could…**：希望能夠…",
          ex: [["I wish I lived closer to the office.", "真希望我住得離公司近一點。"], ["I wish I could speak Japanese.", "真希望我會說日文。"]] }
    ],
    vocab: [["offer", "工作機會；提議", "n."], ["accept", "接受", "v."], ["turn down", "拒絕", "phr."], ["dream", "夢想", "n."], ["afford", "負擔得起", "v."], ["imagine", "想像", "v."], ["realistic", "實際的", "adj."], ["regret", "後悔", "v."], ["opportunity", "機會", "n."], ["take the risk", "冒險", "phr."]],
    dialog: [["Rita", "I got a job offer in Singapore, but I'm not sure about moving.", "我拿到新加坡的工作機會，但不確定要不要搬過去。"], ["Ken", "If I were you, I'd take it. It's a great opportunity.", "如果我是妳，我會接受。這是很好的機會。"], ["Rita", "But I'd miss my family. If they lived closer, it would be easier.", "可是我會想家人。如果他們住得近一點就容易多了。"], ["Ken", "Singapore isn't that far. You could fly back every few months.", "新加坡沒那麼遠，妳可以每幾個月飛回來一次。"], ["Rita", "True. I wish I could just try it for a year and decide.", "也是。真希望我可以先試一年再決定。"], ["Ken", "Why don't you ask them if that's possible?", "妳何不問問他們這樣可不可以？"]],
    ex: [
        ["c", "If I ___ you, I'd apologize.", ["were", "am", "would be"], 0, "如果我是你，我會道歉。"],
        ["c", "If I had a car, I ___ drive to work.", ["would", "will", "did"], 0, "如果我有車，我會開車上班。"],
        ["c", "What would you do if you ___ a million dollars?", ["had", "have", "would have"], 0, "如果你有一百萬美元會做什麼？"],
        ["c", "I wish I ___ taller.", ["were", "am", "will be"], 0, "真希望我高一點。"],
        ["f", "I wish I ___ speak Japanese.", "could", "真希望我會說日文。"],
        ["o", "If / I / were / you / , / I'd / take / it", "如果我是你，我會接受。"],
        ["t", "如果你失業了會怎麼辦？", ["What would you do if you lost your job?"]],
        ["l", "I wish I lived closer to the office.", "真希望我住得離公司近一點。"]
    ]
},
{
    id: "e-b1-05", level: "B1", title: "新聞與說明：被動語態", fr: "It was built in…",
    goal: "看懂新聞與說明文常見的被動語態，並能自己使用。",
    grammar: [
        { t: "be + 過去分詞", d: "被動的時態看 **be 動詞**：is made、was made、has been made、will be made、is being made、can be made。",
          ex: [["The museum was built in 1965.", "這座博物館建於 1965 年。"], ["Thousands of people have been affected by the floods.", "數千人受到水災影響。"], ["The results will be announced next week.", "結果將在下週公布。"]] },
        { t: "新聞常用句型", d: "**It is said / believed / reported that…**（據說…）\n**be expected to…**（預計…）",
          ex: [["It is reported that the company will close two factories.", "據報導這家公司將關閉兩座工廠。"], ["The new line is expected to open next year.", "新路線預計明年開通。"]] }
    ],
    vocab: [["announce", "宣布", "v."], ["affect", "影響", "v."], ["injure", "使受傷", "v."], ["arrest", "逮捕", "v."], ["damage", "損害", "v."], ["launch", "推出", "v."], ["be expected to", "預計會", "phr."], ["according to", "根據", "phr."], ["authorities", "當局", "n."], ["investigation", "調查", "n."]],
    dialog: [["Host", "Good evening. Here are tonight's top stories.", "晚安，以下是今晚的頭條新聞。"], ["Host", "A new bridge was opened in the city center this morning.", "今天早上市中心有一座新橋啟用。"], ["Host", "It was designed by a local architect and took four years to build.", "它由一位本地建築師設計，花了四年興建。"], ["Host", "Meanwhile, two people were injured in a car accident on the highway.", "另外，高速公路上發生車禍，兩人受傷。"], ["Host", "The cause of the accident is being investigated by the police.", "警方正在調查事故原因。"]],
    ex: [
        ["c", "This song ___ by a famous singer.", ["was written", "wrote", "is writing"], 0, "這首歌是一位知名歌手寫的。"],
        ["c", "The road ___ repaired right now.", ["is being", "is", "has"], 0, "這條路正在修。"],
        ["c", "The meeting ___ postponed until Friday.", ["has been", "has", "is being been"], 0, "會議已延到週五。"],
        ["c", "It ___ that the CEO will resign.", ["is reported", "reports", "is reporting"], 0, "據報導執行長將辭職。"],
        ["f", "The results will be ___ (announce) next week.", "announced", "結果將在下週公布。"],
        ["f", "Two people ___ injured in the accident.", "were", "兩人在事故中受傷。"],
        ["t", "這座博物館建於 1965 年。", ["The museum was built in 1965.", "This museum was built in 1965."]],
        ["l", "The new line is expected to open next year.", "新路線預計明年開通。"]
    ]
},
{
    id: "e-b1-06", level: "B1", title: "描述人事物：關係子句", fr: "The person who…",
    goal: "用 who、which、that、where、whose 把描述說得更完整。",
    grammar: [
        { t: "關係代名詞", d: "**who**（人）、**which**（物）、**that**（人或物）、**where**（地方）、**whose**（…的）。當受詞時可省略。",
          ex: [["She's the colleague who helped me with the report.", "她就是幫我寫報告的那位同事。"], ["The app (that) I use for learning is free.", "我用來學習的那個 app 是免費的。"], ["That's the café where we first met.", "那就是我們第一次見面的咖啡館。"], ["I have a friend whose brother is a chef.", "我有個朋友的哥哥是廚師。"]] },
        { t: "加逗號的補充說明", d: "只是補充（拿掉也不影響知道是誰）時加逗號，**不能用 that**。",
          ex: [["My mother, who is 70, still goes jogging every day.", "我媽媽七十歲了，還是每天慢跑。"], ["Taipei 101, which was finished in 2004, was once the tallest building in the world.", "台北 101 在 2004 年完工，曾經是世界最高的大樓。"]] }
    ],
    vocab: [["colleague", "同事", "n."], ["landmark", "地標", "n."], ["describe", "描述", "v."], ["recommend", "推薦", "v."], ["neighborhood", "社區；街坊", "n."], ["owner", "主人；老闆", "n."], ["remind", "使想起", "v."], ["the one", "那一個", "phr."], ["look like", "看起來像", "phr."], ["famous for", "以…聞名", "phr."]],
    dialog: [["Zoe", "Do you know a good place for dinner around here?", "你知道這附近有什麼好吃的晚餐嗎？"], ["Ian", "There's a small Thai restaurant that I really like.", "有一家我很喜歡的小泰式餐廳。"], ["Zoe", "Is it the one which is next to the bookstore?", "是在書店旁邊那家嗎？"], ["Ian", "Yes! The owner, who's from Chiang Mai, cooks everything herself.", "對！老闆是清邁人，所有菜都自己煮。"], ["Zoe", "Sounds great. Is that the place where you had your birthday dinner?", "聽起來很棒。那是你辦生日晚餐的地方嗎？"], ["Ian", "That's the one. Order the green curry. You won't regret it.", "就是那家。點綠咖哩，你不會後悔。"]],
    ex: [
        ["c", "He's the man ___ lives next door.", ["who", "which", "where"], 0, "他就是住在隔壁的男人。"],
        ["c", "This is the hotel ___ we stayed last year.", ["where", "which", "who"], 0, "這是我們去年住的飯店。"],
        ["c", "I met a woman ___ son goes to my school.", ["whose", "who", "who's"], 0, "我遇到一位兒子和我同校的女士。"],
        ["c", "My laptop, ___ is only a year old, has stopped working.", ["which", "that", "who"], 0, "我的筆電才用一年就壞了。"],
        ["f", "The book ___ I'm reading is fascinating.（填 that 或 which）", ["that", "which"], "我在讀的書很精彩。"],
        ["o", "That's / the / café / where / we / first / met", "那就是我們第一次見面的咖啡館。"],
        ["t", "她就是幫我的那位同事。", ["She's the colleague who helped me.", "She is the colleague who helped me.", "She's the colleague that helped me."]],
        ["l", "I have a friend whose brother is a chef.", "我有個朋友的哥哥是廚師。"]
    ]
},
{
    id: "e-b1-07", level: "B1", title: "喜好與決定：動名詞與不定詞", fr: "I enjoy… / I decided to…",
    goal: "分清楚動詞後面要接 V-ing 還是 to V，包含 stop、remember、try 的差別。",
    grammar: [
        { t: "要背的動詞", tb: [["+ V-ing", "+ to V"], ["enjoy、mind、finish、avoid、suggest、keep、consider、practice", "want、decide、plan、hope、agree、refuse、manage、afford"], ["I enjoy reading.", "I decided to move."], ["Would you mind waiting?", "She refused to answer."]] },
        { t: "意思會變的動詞", d: "**stop to do**（停下來去做）/ **stop doing**（不再做）\n**remember to do**（記得要做）/ **remember doing**（記得做過）\n**try to do**（努力）/ **try doing**（試試看）",
          ex: [["I stopped to buy a coffee.", "我停下來買了杯咖啡。"], ["I stopped drinking coffee.", "我戒咖啡了。"], ["Remember to lock the door.", "記得鎖門。"], ["I remember locking the door.", "我記得我有鎖門。"], ["Try restarting your computer.", "試試看重開電腦。"]] }
    ],
    vocab: [["mind", "介意", "v."], ["avoid", "避免", "v."], ["suggest", "建議", "v."], ["consider", "考慮", "v."], ["refuse", "拒絕", "v."], ["manage to", "設法做到", "phr."], ["give up", "放棄；戒除", "phr."], ["keep on", "持續", "phr."], ["habit", "習慣", "n."], ["goal", "目標", "n."]],
    dialog: [["Eva", "I've decided to give up sugar for a month.", "我決定戒糖一個月。"], ["Noah", "Wow. Do you think you'll manage to do it?", "哇，妳覺得做得到嗎？"], ["Eva", "I hope so. I keep eating snacks at work, so I want to stop.", "希望可以。我在公司一直吃零食，所以想戒掉。"], ["Noah", "Have you considered bringing fruit instead?", "妳有考慮過改帶水果嗎？"], ["Eva", "That's a good idea. Remember to remind me if you see me with chocolate!", "好主意。如果看到我拿巧克力，記得提醒我！"]],
    ex: [
        ["c", "Would you mind ___ the window?", ["opening", "to open", "open"], 0, "你介意開窗嗎？"],
        ["c", "We can't afford ___ a new car.", ["to buy", "buying", "buy"], 0, "我們買不起新車。"],
        ["c", "He suggested ___ a taxi.", ["taking", "to take", "take"], 0, "他建議搭計程車。"],
        ["c", "Please remember ___ me tomorrow.", ["to call", "calling", "call"], 0, "明天記得打給我。"],
        ["c", "She stopped ___ two years ago. She doesn't smoke now.", ["smoking", "to smoke", "smoke"], 0, "她兩年前戒菸了。"],
        ["f", "I finally managed ___ (finish) the report.", "to finish", "我終於設法完成了報告。"],
        ["t", "我決定搬家。", ["I decided to move.", "I've decided to move.", "I have decided to move."]],
        ["l", "Try restarting your computer.", "試試看重開電腦。"]
    ]
},
{
    id: "e-b1-08", level: "B1", title: "轉述別人的話：間接引語", fr: "She said that…",
    goal: "在會議、聊天中轉述別人說的話與問題。",
    grammar: [
        { t: "時態往後推", d: "said / told 之後，時態常往過去推一步：am → was、will → would、can → could、過去式 → had + p.p.",
          ex: [["\"I'm busy.\" → She said she was busy.", "「我很忙。」→ 她說她很忙。"], ["\"I'll send it.\" → He said he would send it.", "「我會寄出。」→ 他說他會寄。"], ["\"We finished.\" → They said they had finished.", "「我們做完了。」→ 他們說他們做完了。"]] },
        { t: "say、tell、ask", d: "**say (that)…**、**tell + 人 (that)…**、**ask + 人 + if / wh-…**、**ask / tell + 人 + to V**。",
          ex: [["He told me that the meeting was cancelled.", "他告訴我會議取消了。"], ["She asked me if I could help.", "她問我能不能幫忙。"], ["My boss asked me to update the slides.", "老闆要我更新投影片。"]] }
    ],
    vocab: [["mention", "提到", "v."], ["explain", "解釋", "v."], ["claim", "聲稱", "v."], ["admit", "承認", "v."], ["deny", "否認", "v."], ["promise", "承諾", "v."], ["warn", "警告", "v."], ["remind", "提醒", "v."], ["apparently", "據說；顯然", "adv."], ["pass on", "轉達", "phr."]],
    dialog: [["Amy", "You missed the meeting this morning. Do you want me to fill you in?", "你錯過了今天早上的會議，要我跟你說一下嗎？"], ["Dan", "Yes, please. What did the manager say?", "好，麻煩了。經理說了什麼？"], ["Amy", "She said the launch had been moved to next month.", "她說上線延到下個月了。"], ["Dan", "Did she say why?", "她有說為什麼嗎？"], ["Amy", "She said the designers needed more time. She also asked if you could send her your report by Friday.", "她說設計師需要更多時間。她也問你能不能週五前把報告寄給她。"], ["Dan", "OK, thanks for passing that on.", "好，謝謝妳轉達。"]],
    ex: [
        ["c", "He said he ___ tired.", ["was", "is being", "be"], 0, "他說他很累。"],
        ["c", "She ___ me that she would be late.", ["told", "said", "asked"], 0, "她告訴我她會遲到。"],
        ["c", "They asked me ___ I wanted to join.", ["if", "that", "what"], 0, "他們問我想不想加入。"],
        ["c", "My boss asked me ___ the slides.", ["to update", "update", "updating"], 0, "老闆要我更新投影片。"],
        ["f", "He said he ___ (will) call me later.", "would", "他說他晚點會打給我。"],
        ["f", "She asked where I ___ (live).", "lived", "她問我住在哪裡。"],
        ["t", "他告訴我會議取消了。", ["He told me that the meeting was cancelled.", "He told me the meeting was cancelled.", "He told me that the meeting had been cancelled.", "He told me the meeting had been canceled.", "He told me the meeting was canceled."]],
        ["l", "She said the launch had been moved to next month.", "她說上線延到下個月了。"]
    ]
},
// ---------------- B2 ----------------
{
    id: "e-b2-01", level: "B2", title: "說一個好故事：敘事時態", fr: "I'd never seen anything like it",
    goal: "用過去簡單、過去進行、過去完成（進行）式把故事說得有層次。",
    grammar: [
        { t: "四種敘事時態", tb: [["時態", "功能", "例子"], ["過去簡單", "主線事件", "I opened the door."], ["過去進行", "背景、正在發生", "It was raining heavily."], ["過去完成", "更早發生的事", "Someone had broken the window."], ["過去完成進行", "更早之前持續一段時間", "I had been waiting for hours."]],
          ex: [["I was walking home when I realized I had left my wallet at the café.", "我走路回家時發現錢包忘在咖啡館了。"], ["By the time help arrived, we had been waiting for three hours.", "救援抵達時，我們已經等了三個小時。"]] },
        { t: "讓故事生動的連接詞", d: "**as soon as**、**by the time**、**just as**、**suddenly**、**it turned out that**（結果原來是）、**to my surprise**。",
          ex: [["Just as I was about to leave, the phone rang.", "就在我要走的時候，電話響了。"], ["It turned out that he had been planning it for months.", "結果原來他已經計畫好幾個月了。"]] }
    ],
    vocab: [["realize", "意識到", "v."], ["by the time", "到…的時候", "phr."], ["just as", "就在…的時候", "phr."], ["turn out", "結果是", "phr."], ["to my surprise", "令我驚訝的是", "phr."], ["stranded", "受困的", "adj."], ["eventually", "最後", "adv."], ["panic", "驚慌", "v."], ["relieved", "鬆了一口氣的", "adj."], ["a close call", "千鈞一髮", "phr."]],
    dialog: [["Leah", "So what happened on your trip? I heard something went wrong.", "你的旅行怎麼了？聽說出了點狀況。"], ["Ryan", "Oh, it was a nightmare. We'd been driving for about five hours when the car broke down.", "喔，簡直是惡夢。我們開了大概五個小時車子就拋錨了。"], ["Leah", "No way! Where were you?", "不會吧！你們在哪裡？"], ["Ryan", "In the middle of nowhere. It was getting dark and we hadn't seen another car for ages.", "荒郊野外。天快黑了，我們很久都沒看到別的車。"], ["Leah", "So what did you do?", "那你們怎麼辦？"], ["Ryan", "Eventually a farmer stopped. It turned out he'd fixed cars for thirty years!", "最後有個農夫停下來，結果他修車修了三十年！"]],
    ex: [
        ["c", "When I got to the airport, my flight ___.", ["had already left", "already left", "has already left"], 0, "我到機場時班機已經飛走了。"],
        ["c", "I ___ dinner when the lights went out.", ["was cooking", "had cooked", "cooked"], 0, "停電時我正在煮晚餐。"],
        ["c", "She was exhausted because she ___ all day.", ["had been working", "was worked", "has worked"], 0, "她很累，因為她工作了一整天。"],
        ["c", "It ___ that he had lied to everyone.", ["turned out", "turned up", "turned off"], 0, "結果原來他對所有人說了謊。"],
        ["f", "By the ___ we arrived, the party had finished.", "time", "我們到的時候派對已經結束了。"],
        ["o", "Just / as / I / was / leaving / , / the / phone / rang", "就在我要走的時候，電話響了。"],
        ["t", "我發現我把錢包忘在咖啡館了。", ["I realized I had left my wallet at the café.", "I realized that I had left my wallet at the café.", "I realised I had left my wallet at the cafe.", "I realized I'd left my wallet at the café."]],
        ["l", "We had been driving for five hours when the car broke down.", "我們開了五個小時車子就拋錨了。"]
    ]
},
{
    id: "e-b2-02", level: "B2", title: "後悔與假設過去：第三條件句", fr: "If I had known…",
    goal: "談論過去的遺憾與假設，使用第三條件句、混合條件句與 should have。",
    grammar: [
        { t: "第三條件句", d: "**If + had + p.p., would have + p.p.**：和過去事實相反。",
          ex: [["If I had known about the traffic, I would have left earlier.", "如果我早知道會塞車，就會早點出門了。"], ["We wouldn't have got lost if we'd used the GPS.", "如果我們有用導航就不會迷路了。"]] },
        { t: "混合條件句", d: "過去的條件影響**現在**的結果：**If + had + p.p., would + 原形**。",
          ex: [["If I had studied medicine, I would be a doctor now.", "如果我當初讀醫，現在就是醫生了。"], ["If she hadn't missed the flight, she would be here now.", "如果她沒錯過班機，現在就在這裡了。"]] },
        { t: "表達後悔", d: "**I wish I had + p.p.**、**If only I had + p.p.**、**I should have + p.p.**、**I shouldn't have + p.p.**",
          ex: [["I wish I had listened to your advice.", "真希望我當初聽了你的建議。"], ["I shouldn't have said that.", "我不該說那句話的。"]] }
    ],
    vocab: [["regret", "後悔", "v."], ["if only", "要是…就好了", "phr."], ["in hindsight", "事後看來", "phr."], ["mistake", "錯誤", "n."], ["decision", "決定", "n."], ["consequence", "後果", "n."], ["get lost", "迷路", "phr."], ["miss out on", "錯過（好機會）", "phr."], ["blame", "責怪", "v."], ["learn the hard way", "吃了苦頭才學到", "phr."]],
    dialog: [["Chloe", "How was the interview?", "面試怎麼樣？"], ["Evan", "Not great. I got there twenty minutes late.", "不太好，我遲到了二十分鐘。"], ["Chloe", "Oh no. What happened?", "糟糕，發生什麼事？"], ["Evan", "I took the wrong train. If I had checked the route the night before, I wouldn't have been late.", "我搭錯車。如果我前一晚有查路線，就不會遲到了。"], ["Chloe", "Don't be too hard on yourself. You might still get it.", "別太自責，你可能還是會錄取。"], ["Evan", "I hope so. In hindsight, I should have left much earlier.", "希望如此。事後看來，我應該更早出門的。"]],
    ex: [
        ["c", "If I had known, I ___ you.", ["would have told", "would tell", "will tell"], 0, "如果我早知道，就會告訴你了。"],
        ["c", "If she ___ harder, she would have passed.", ["had studied", "studied", "would study"], 0, "如果她更用功，就會通過了。"],
        ["c", "If I had taken that job, I ___ in London now.", ["would be living", "would have lived", "will live"], 0, "如果我當初接了那份工作，現在就住在倫敦了。"],
        ["c", "I wish I ___ to your advice.", ["had listened", "listened", "would listen"], 0, "真希望我當初聽了你的建議。"],
        ["f", "I ___ (not / should) have said that.", "shouldn't", "我不該說那句話的。"],
        ["o", "If / only / I / had / left / earlier", "要是我早點出門就好了。"],
        ["t", "如果我們有用導航就不會迷路了。", ["If we had used the GPS, we wouldn't have got lost.", "If we had used the GPS, we wouldn't have gotten lost.", "We wouldn't have got lost if we had used the GPS.", "We wouldn't have gotten lost if we'd used the GPS."]],
        ["l", "In hindsight, I should have left much earlier.", "事後看來，我應該更早出門的。"]
    ]
},
{
    id: "e-b2-03", level: "B2", title: "推測與判斷：must have、can't have", fr: "She must have forgotten",
    goal: "用情態動詞推測現在與過去的情況。",
    grammar: [
        { t: "推測現在", d: "**must**（一定是）、**might / may / could**（可能）、**can't**（不可能）+ 原形。",
          ex: [["He's not answering. He must be in a meeting.", "他沒接，一定在開會。"], ["That can't be right. Check it again.", "那不可能是對的，再檢查一次。"]] },
        { t: "推測過去", d: "**must have / might have / can't have + p.p.**",
          ex: [["The streets are wet. It must have rained last night.", "街道是濕的，昨晚一定下過雨。"], ["She might have taken the wrong bus.", "她可能搭錯公車了。"], ["He can't have finished already. He only started an hour ago.", "他不可能已經做完了，他一小時前才開始。"]] }
    ],
    vocab: [["clue", "線索", "n."], ["evidence", "證據", "n."], ["conclude", "下結論", "v."], ["suppose", "猜想", "v."], ["obviously", "顯然", "adv."], ["no wonder", "難怪", "phr."], ["make sense", "合理", "phr."], ["by mistake", "不小心", "phr."], ["mix up", "搞混", "phr."], ["figure out", "想明白", "phr."]],
    dialog: [["Grace", "Have you seen my keys? I can't find them anywhere.", "你有看到我的鑰匙嗎？我到處都找不到。"], ["Owen", "You must have left them in the car.", "妳一定是把它們留在車上了。"], ["Grace", "I can't have. I used them to open the front door.", "不可能，我剛才用它們開了大門。"], ["Owen", "Then they must be somewhere in the house. Did you check your coat pocket?", "那就一定在家裡某處。妳檢查外套口袋了嗎？"], ["Grace", "Oh! Here they are. I must have put them there without thinking.", "喔！在這裡。我一定是不自覺放進去了。"], ["Owen", "No wonder you couldn't find them!", "難怪妳找不到！"]],
    ex: [
        ["c", "The lights are on. Someone ___ be home.", ["must", "can't", "mustn't"], 0, "燈開著，一定有人在家。"],
        ["c", "That ___ be Jack. He's on holiday in Spain.", ["can't", "must", "mustn't"], 0, "那不可能是傑克，他在西班牙度假。"],
        ["c", "She's late. She ___ have missed the train.", ["might", "can't", "should"], 0, "她遲到了，可能錯過火車了。"],
        ["c", "The ground is wet. It ___ rained.", ["must have", "can't have", "must"], 0, "地是濕的，一定下過雨。"],
        ["f", "He can't ___ (finish) already!", "have finished", "他不可能已經做完了！"],
        ["t", "她一定忘了。", ["She must have forgotten.", "She must have forgotten it."]],
        ["l", "No wonder you couldn't find them!", "難怪你找不到！"]
    ]
},
{
    id: "e-b2-04", level: "B2", title: "未來進行式與未來完成式", fr: "This time next year…",
    goal: "描述未來某個時間點正在進行或已經完成的事，做長期規劃。",
    grammar: [
        { t: "未來進行式：will be + V-ing", d: "未來某時刻**正在進行**的事；也常用來禮貌地詢問別人的計畫。",
          ex: [["This time tomorrow, I'll be flying to London.", "明天這個時候我正在飛往倫敦的飛機上。"], ["Will you be using the car tonight?", "你今晚會用車嗎？（禮貌詢問）"]] },
        { t: "未來完成式：will have + p.p.", d: "到未來某時間點**已經完成**的事，常搭配 **by**（在…之前）。",
          ex: [["By the end of the year, I'll have saved enough for a trip.", "到年底我就會存夠旅行的錢了。"], ["By 2030, they will have built a new airport.", "到 2030 年他們將建好新機場。"]] }
    ],
    vocab: [["by then", "到那時", "phr."], ["this time next year", "明年的這個時候", "phr."], ["in five years' time", "五年後", "phr."], ["career path", "職涯規劃", "n."], ["achieve", "達成", "v."], ["save up", "存錢", "phr."], ["pay off", "還清；得到回報", "phr."], ["long-term", "長期的", "adj."], ["ambitious", "有野心的", "adj."], ["milestone", "里程碑", "n."]],
    dialog: [["Interviewer", "Where do you see yourself in five years' time?", "你覺得五年後的自己會在哪裡？"], ["Jade", "I hope I'll be leading a small team by then.", "我希望到那時我能帶領一個小團隊。"], ["Interviewer", "That's ambitious. What steps are you taking?", "很有企圖心。你正在採取哪些行動？"], ["Jade", "I'm doing a management course, and by next summer I'll have finished it.", "我在上管理課程，到明年夏天就會完成。"], ["Interviewer", "Great. And what will you be doing differently from now?", "很好。那你會做哪些和現在不同的事？"], ["Jade", "I'll be focusing more on mentoring and long-term planning.", "我會更專注於指導他人和長期規劃。"]],
    ex: [
        ["c", "This time next week, I ___ on a beach.", ["will be lying", "will have lain", "lie"], 0, "下週這個時候我正躺在海灘上。"],
        ["c", "By 2030, I ___ my degree.", ["will have finished", "will be finishing", "finish"], 0, "到 2030 年我會完成學位。"],
        ["c", "___ you be using the printer this afternoon?", ["Will", "Do", "Have"], 0, "你今天下午會用印表機嗎？"],
        ["c", "By the time you arrive, we ___ dinner.", ["will have had", "will have", "had"], 0, "你到的時候我們應該已經吃完晚餐了。"],
        ["f", "I'll have ___ (save) enough money by December.", "saved", "到十二月我就會存夠錢。"],
        ["t", "明天這個時候我正在飛往倫敦。", ["This time tomorrow, I'll be flying to London.", "This time tomorrow I will be flying to London.", "This time tomorrow, I will be flying to London."]],
        ["l", "Where do you see yourself in five years' time?", "你覺得五年後的自己會在哪裡？"]
    ]
},
{
    id: "e-b2-05", level: "B2", title: "正式寫作：分詞構句與連接語", fr: "Having considered the options…",
    goal: "讓 email 和報告更精簡專業：分詞構句、正式連接語、避免太口語的用字。",
    grammar: [
        { t: "分詞構句", d: "主詞相同時把子句精簡：主動用 **V-ing**、被動用 **p.p.**、先發生用 **Having + p.p.**。",
          ex: [["Having reviewed your proposal, we would like to arrange a meeting.", "在審閱您的提案後，我們希望安排一次會議。"], ["Founded in 1998, the company now has offices in ten countries.", "這家公司成立於 1998 年，目前在十個國家設有辦公室。"]] },
        { t: "口語 vs 正式", tb: [["口語", "正式"], ["get", "receive / obtain"], ["ask for", "request"], ["find out", "discover / determine"], ["but", "however"], ["so", "therefore / consequently"], ["also", "in addition / furthermore"], ["about", "regarding / concerning"], ["sorry for", "we apologize for"]],
          ex: [["Regarding your request, please find the attached document.", "關於您的請求，請參閱附件。"], ["We apologize for any inconvenience this may cause.", "如造成任何不便，敬請見諒。"]] }
    ],
    vocab: [["regarding", "關於", "prep."], ["request", "要求；請求", "v."], ["inquiry", "詢問", "n."], ["attached", "附加的", "adj."], ["inconvenience", "不便", "n."], ["at your earliest convenience", "在您方便時盡早", "phr."], ["look forward to hearing from you", "期待您的回覆", "phr."], ["further", "進一步的", "adj."], ["consequently", "因此", "adv."], ["sincerely", "誠摯地（信件結尾）", "adv."]],
    dialog: [["Manager", "Can you check this email before I send it to the client?", "你可以在我寄給客戶前幫我看一下這封信嗎？"], ["Lin", "Sure. Instead of \"Sorry for the late reply\", you could write \"We apologize for the delay in responding\".", "好。與其說 Sorry for the late reply，可以寫 We apologize for the delay in responding。"], ["Manager", "Good. What about the first line?", "好。那第一行呢？"], ["Lin", "\"Having reviewed your feedback, we have made the following changes.\" It sounds more professional.", "「在審閱您的意見後，我們已做出以下修改。」聽起來比較專業。"], ["Manager", "Perfect. And the ending?", "很好。那結尾呢？"], ["Lin", "\"We look forward to hearing from you at your earliest convenience.\"", "「期待您盡早回覆。」"]],
    ex: [
        ["c", "___ your email, I called the client immediately.", ["Having read", "Read", "Having been read"], 0, "讀完你的信後，我立刻打給客戶。"],
        ["c", "___ in 1998, the company is now a global brand.", ["Founded", "Founding", "Having founded"], 0, "這家公司成立於 1998 年，現在是全球品牌。"],
        ["c", "___ your inquiry, we are happy to help.", ["Regarding", "About of", "Regard"], 0, "關於您的詢問，我們很樂意協助。"],
        ["c", "We apologize ___ any inconvenience.", ["for", "about", "of"], 0, "造成不便，敬請見諒。"],
        ["f", "Please find the ___ document.", "attached", "請參閱附件。"],
        ["f", "We look forward to ___ (hear) from you.", "hearing", "期待您的回覆。"],
        ["t", "如造成任何不便，敬請見諒。", ["We apologize for any inconvenience.", "We apologize for any inconvenience this may cause.", "We apologise for any inconvenience."]],
        ["l", "Having reviewed your proposal, we would like to arrange a meeting.", "在審閱您的提案後，我們希望安排一次會議。"]
    ]
},
{
    id: "e-b2-06", level: "B2", title: "加強語氣：倒裝句與強調句", fr: "Never have I…",
    goal: "在簡報、演講與寫作中用倒裝與強調句加強重點。",
    grammar: [
        { t: "否定副詞倒裝", d: "**Never / Rarely / Seldom / Not only / Hardly / No sooner / Only then** 放句首時，後面用問句語序（助動詞 + 主詞）。",
          ex: [["Never have I seen such a beautiful sunset.", "我從沒看過這麼美的夕陽。"], ["Not only is it cheaper, but it's also faster.", "它不但比較便宜，而且更快。"], ["Hardly had we sat down when the fire alarm went off.", "我們才剛坐下，火災警報就響了。"], ["Only after the meeting did I realize my mistake.", "會議結束後我才發現自己的錯誤。"]] },
        { t: "強調句", d: "**It is / was … that / who …**：強調某個部分。\n**What … is …**：強調東西或動作。\n**The thing / The reason / The problem is (that)…**",
          ex: [["It was the price that put me off, not the design.", "讓我打退堂鼓的是價格，不是設計。"], ["What we need is more time.", "我們需要的是更多時間。"], ["The problem is that nobody told us.", "問題在於沒有人告訴我們。"]] }
    ],
    vocab: [["seldom", "很少", "adv."], ["hardly", "幾乎不；才剛", "adv."], ["no sooner … than", "一…就…", "phr."], ["put off", "使反感；使打消念頭", "phr."], ["emphasize", "強調", "v."], ["highlight", "強調；重點", "v."], ["remarkable", "非凡的", "adj."], ["outcome", "結果", "n."], ["key point", "重點", "n."], ["above all", "最重要的是", "phr."]],
    dialog: [["Speaker", "Good morning, everyone. I'd like to start with a question.", "大家早安，我想先問一個問題。"], ["Speaker", "Never before have we had so much information, yet so little time.", "我們從來沒有擁有這麼多資訊，卻又這麼缺乏時間。"], ["Speaker", "What most people need is not more data, but better ways to use it.", "大多數人需要的不是更多數據，而是更好的使用方法。"], ["Speaker", "Not only does our tool save time, it also reduces mistakes.", "我們的工具不但節省時間，還能減少錯誤。"], ["Speaker", "It is this combination that makes it unique.", "正是這樣的組合讓它與眾不同。"]],
    ex: [
        ["c", "Never ___ such a mess in my life.", ["have I seen", "I have seen", "I saw"], 0, "我這輩子從沒看過這麼亂的。"],
        ["c", "Not only ___ late, but he also forgot his laptop.", ["was he", "he was", "he is"], 0, "他不但遲到，還忘了帶筆電。"],
        ["c", "___ we need is a clear plan.", ["What", "That", "It"], 0, "我們需要的是清楚的計畫。"],
        ["c", "It was Sarah ___ found the solution.", ["who", "which", "what"], 0, "找到解決方法的是莎拉。"],
        ["c", "Rarely ___ such talent.", ["do we see", "we see", "we do see"], 0, "我們很少看到這樣的天分。"],
        ["f", "Hardly ___ we sat down when the alarm went off.", "had", "我們才剛坐下警報就響了。"],
        ["t", "我們需要的是更多時間。", ["What we need is more time."]],
        ["l", "It is this combination that makes it unique.", "正是這樣的組合讓它與眾不同。"]
    ]
}
];

// ===================== 英文發音重點 =====================
const EN_SOUNDS = [
    { t: "長短母音", d: "中文沒有長短母音的分別，所以 ship / sheep、full / fool 容易唸成一樣。長音嘴型較緊、時間較長，短音放鬆、短促。",
      items: [["ship / sheep", "/ɪ/ 短而放鬆，/iː/ 長而嘴角往兩旁"], ["full / fool", "/ʊ/ 短，/uː/ 長"], ["cat / cut / cart", "/æ/ 嘴巴張大、/ʌ/ 短促、/ɑː/ 長"], ["bed / bad", "/e/ 和 /æ/：bad 嘴巴開更大"]] },
    { t: "th 的兩種音", d: "舌尖輕放在上下齒之間送氣。無聲 /θ/ 不是 s，有聲 /ð/ 不是 d 或 z。",
      items: [["think / three / thank", "無聲 /θ/"], ["this / that / mother", "有聲 /ð/"], ["sink / think", "s 和 th 的對比"]] },
    { t: "r 和 l", d: "l 舌尖頂住上排牙齒後方；r 舌尖往後捲但不碰任何地方。字尾的 l（暗 l）舌根要抬高，像輕輕的「ㄡ」。",
      items: [["light / right", "l 和 r 的對比"], ["fly / fry", "l 和 r 的對比"], ["feel / milk / people", "字尾暗 l"]] },
    { t: "v 和 w、f", d: "v 是上齒輕咬下唇並振動，w 是圓唇不碰牙齒。",
      items: [["very / berry", "v 和 b 的對比"], ["vest / west", "v 和 w 的對比"], ["fan / van", "f 無聲、v 有聲"]] },
    { t: "字尾子音不能吞掉", d: "中文字很少以子音結尾，所以常把英文字尾的 t、d、k 吞掉，或在後面多加母音（good 唸成 goodo）。字尾子音要輕輕唸出來。",
      items: [["cat / cap / cab", "字尾的 t、p、b 要清楚"], ["world / cold", "-ld 結尾"], ["asked / helped", "-ed 唸 /t/"], ["watches / buses", "-es 唸 /ɪz/"]] },
    { t: "重音", d: "多音節的字有一個重音節，唸錯重音比唸錯母音更難懂。有些字名詞、動詞重音不同。",
      items: [["photograph / photographer", "PHO-to-graph / pho-TO-gra-pher"], ["record (n.) / record (v.)", "REC-ord / re-CORD"], ["present (n.) / present (v.)", "PRES-ent / pre-SENT"], ["comfortable", "COM-fta-ble（三個音節）"]] },
    { t: "連音與弱讀", d: "自然的英文會把字連起來，虛詞（a、to、of、and、can）常弱讀成 /ə/。聽不懂常常就是因為連音。",
      items: [["an apple", "a-napple"], ["check it out", "che-ki-tout"], ["want to / going to", "口語常說成 wanna / gonna"], ["a cup of tea", "a cuppa tea（of 弱讀）"], ["I can swim", "can 弱讀 /kən/；can't 不弱讀"]] },
    { t: "語調", d: "Yes / No 問句尾音上揚；Wh- 問句和直述句尾音下降。列舉時前面上揚、最後一項下降。",
      items: [["Are you ready?", "尾音上揚"], ["Where are you going?", "尾音下降"], ["I'd like tea, coffee, or juice.", "列舉：前兩項上揚，最後下降"]] }
];
