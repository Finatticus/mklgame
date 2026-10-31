// ===================== A0 零基礎：上課前先建立觀念 =====================
// 完全沒學過法文的人先讀這四課，再進入 A1。格式同 lessons-a1.js
FR_COURSE.push(
{
    id: "a0-01", level: "A0", title: "法文和中文哪裡不一樣", fr: "Le français, c'est quoi ?",
    goal: "先知道法文最重要的五個特色。這一課不用背，看懂觀念就好，之後每一課都會用到。",
    grammar: [
        { t: "1. 詞序和中文很像", d: "法文的基本句子是 **主詞 + 動詞 + 受詞**，和中文「我 吃 蘋果」一樣。所以只要知道單字，很多句子可以照中文的順序排。",
          tb: [["主詞", "動詞", "受詞", "中文"], ["Je", "mange", "une pomme.", "我 吃 一個蘋果。"], ["Paul", "aime", "le café.", "保羅 喜歡 咖啡。"], ["Nous", "parlons", "français.", "我們 說 法文。"]],
          ex: [["Je mange une pomme.", "我吃一個蘋果。"], ["Paul aime le café.", "保羅喜歡咖啡。"]] },
        { t: "2. 動詞會跟著主詞改變", d: "中文的「說」不管誰說都一樣；法文的動詞會依「誰在做」改變形式，這叫**動詞變化**。字典裡的原形叫**不定式**，例如 parler（說）。\n好消息是：很多變化**寫法不同、發音相同**。下面 parle、parles、parlent 三個唸起來完全一樣。",
          tb: [["主詞", "parler（說）", "發音"], ["je（我）", "parle", "parl"], ["tu（你）", "parles", "parl"], ["il / elle（他／她）", "parle", "parl"], ["nous（我們）", "parlons", "parl-on"], ["vous（您；你們）", "parlez", "parl-é"], ["ils / elles（他們）", "parlent", "parl"]],
          ex: [["Je parle français.", "我說法文。"], ["Vous parlez anglais ?", "您說英文嗎？"]] },
        { t: "3. 每個名詞都有「性別」", d: "法文的名詞分成**陽性**和**陰性**，桌子是陰性、書是陽性，大多沒有道理可講。所以背單字時要**連冠詞一起背**：le livre（陽性）、la table（陰性）。\n單字本裡的 **n.m.** 是陽性名詞，**n.f.** 是陰性名詞。",
          tb: [["陽性 (m)", "陰性 (f)"], ["le livre 書", "la table 桌子"], ["le café 咖啡", "la pomme 蘋果"], ["le garçon 男孩", "la fille 女孩"]] },
        { t: "4. 名詞前面幾乎一定有冠詞", d: "中文說「我喜歡咖啡」，法文要說「我喜歡**這**咖啡」：J'aime **le** café。名詞前面通常要放 le、la、un、une 這類小字（冠詞），不能直接用光禿禿的名詞。第 8 課會完整介紹。",
          ex: [["J'aime le café.", "我喜歡咖啡。"], ["C'est un livre.", "這是一本書。"]] },
        { t: "5. 形容詞要跟名詞「配合」", d: "形容詞要跟著名詞變成陰性或複數，通常是加 **-e**（陰性）、**-s**（複數）。而且大部分形容詞放在名詞**後面**：un café chaud（一杯熱咖啡）。",
          tb: [["", "陽性", "陰性"], ["單數", "un petit chat", "une petite maison"], ["複數", "des petits chats", "des petites maisons"]],
          ex: [["un petit chat", "一隻小貓"], ["une petite maison", "一間小房子"]] }
    ],
    vocab: [["le livre", "書", "n.m."], ["la table", "桌子", "n.f."], ["le café", "咖啡；咖啡館", "n.m."], ["la pomme", "蘋果", "n.f."], ["le garçon", "男孩", "n.m."], ["la fille", "女孩；女兒", "n.f."], ["le chat", "貓", "n.m."], ["la maison", "房子；家", "n.f."], ["manger", "吃", "v."], ["parler", "說；講", "v."], ["aimer", "喜歡；愛", "v."], ["petit", "小的", "adj."], ["et", "和；而且", "conj."], ["très", "很；非常", "adv."]],
    culture: "法文約有三億人使用，除了法國，也是比利時、瑞士、加拿大魁北克和許多非洲國家的官方語言。英文裡大約三分之一的詞彙來自法文，例如 restaurant、café、menu。",
    ex: [
        ["c", "法文的基本詞序是？", ["主詞＋動詞＋受詞", "主詞＋受詞＋動詞", "動詞＋主詞＋受詞"], 0, "和中文很像"],
        ["c", "背法文名詞時，最好連什麼一起背？", ["冠詞（le / la）", "動詞", "形容詞"], 0, "才知道陰陽性"],
        ["c", "Je ___ français.", ["parle", "parlez", "parlons"], 0, "我說法文。"],
        ["c", "une ___ maison", ["petite", "petit", "petits"], 0, "一間小房子"],
        ["o", "Paul / aime / le / café", "保羅喜歡咖啡。"],
        ["l", "Je mange une pomme.", "我吃一個蘋果。"]
    ]
},
{
    id: "a0-02", level: "A0", title: "看字就會唸：拼字與發音規則", fr: "Lire le français",
    goal: "法文的拼字很規律。學會幾條規則，看到沒學過的字也大致唸得出來。",
    grammar: [
        { t: "規則一：字尾的子音通常不唸", d: "這是最重要的一條。Paris 的 s、petit 的 t、vous 的 s 都不發音。\n例外是 **c、r、f、l**（可以記成英文 **CaReFuL**）常常要唸：parc、bonjour、neuf、avril。但 -er 結尾的動詞（parler）r 不唸。",
          tb: [["拼法", "實際發音", "說明"], ["Paris", "pa-ri", "s 不唸"], ["petit", "pe-ti", "t 不唸"], ["vous", "vou", "s 不唸"], ["bonjour", "bon-jour", "r 要唸"], ["neuf", "neuf", "f 要唸"], ["parler", "par-lé", "-er 的 r 不唸"]] },
        { t: "規則二：字尾的 e、es、ent 不唸", d: "字尾的 **e** 不發音，但它會讓前面的子音唸出來：petit（pe-ti）→ petite（pe-tit）。動詞字尾的 **-es、-ent** 也不唸：ils parlent 唸起來和 il parle 一樣。",
          tb: [["拼法", "實際發音"], ["petit", "pe-ti"], ["petite", "pe-tit"], ["grand", "gran"], ["grande", "grand"], ["ils parlent", "il parl"]] },
        { t: "規則三：h 永遠不發音", d: "hôtel 唸 ô-tel，homme 唸 om。",
          ex: [["l'hôtel", "飯店"], ["l'homme", "男人"]] },
        { t: "重音符號", d: "法文字母上的小符號會改變發音或區分字義，不能省略：\n**é**（閉口的「ㄝ」，像「欸」）：café、été\n**è / ê**（開口的「ㄝ」）：mère、fête\n**ç**（唸 s）：français、garçon\n**à、ù** 發音不變，只用來分辨字義：à（在）／a（有）、où（哪裡）／ou（或）。",
          tb: [["符號", "例字", "意思"], ["é", "café", "咖啡"], ["è", "mère", "母親"], ["ê", "fête", "節日"], ["ç", "garçon", "男孩"], ["à", "à Paris", "在巴黎"]] },
        { t: "常見的字母組合", d: "幾個字母合起來唸一個音，看到就照表唸：",
          tb: [["組合", "發音", "例字"], ["ou", "烏", "vous、bonjour"], ["oi", "wa", "moi、trois"], ["au / eau", "歐", "chaud、beau"], ["ai", "ㄝ", "lait、j'ai"], ["eu", "介於「ㄜ」和「ㄡ」", "deux、bleu"], ["ch", "ㄕ（不是 ㄑ）", "chat、chocolat"], ["gn", "ㄋ一", "montagne"], ["qu", "k", "qui、quatre"], ["an / en", "鼻音 ㄤ", "France、enfant"], ["on", "鼻音 ㄛㄥ", "bonjour、maison"], ["in / ain", "鼻音 ㄢ", "vin、pain"]] },
        { t: "省音與連音", d: "兩個母音碰在一起時，法文會把前面的 e 或 a 省掉，用撇號連起來，這叫**省音**：je + ai → **j'ai**，le + ami → **l'ami**，la + école → **l'école**。\n平常不唸的字尾子音，如果下一個字是母音開頭，有時會唸出來連到下一個字，這叫**連音**：vous‿avez（vou-za-vé）、les‿amis（lé-za-mi）。",
          ex: [["J'ai un ami.", "我有一個朋友。"], ["Vous avez l'heure ?", "您知道現在幾點嗎？"], ["les amis", "朋友們（s 連音唸成 z）"]] }
    ],
    vocab: [["Paris", "巴黎", "n."], ["l'hôtel", "飯店", "n.m."], ["l'homme", "男人；人", "n.m."], ["la mère", "母親", "n.f."], ["le père", "父親", "n.m."], ["la fête", "節日；派對", "n.f."], ["l'été", "夏天", "n.m."], ["le lait", "牛奶", "n.m."], ["le pain", "麵包", "n.m."], ["le vin", "葡萄酒", "n.m."], ["l'enfant", "小孩", "n."], ["la montagne", "山", "n.f."], ["beau", "美的；帥的", "adj."], ["chaud", "熱的", "adj."], ["deux", "二", "adj."], ["trois", "三", "adj."]],
    culture: "法文的拼字保留了幾百年前的發音，所以很多字母不唸。但反過來說，規則很穩定：學會規則後，看字讀音的準確度比英文高很多。",
    ex: [
        ["c", "petit 的 t 要不要唸？", ["不唸", "要唸", "唸成 d"], 0, "字尾子音通常不唸"],
        ["c", "oi 的發音是？", ["wa", "oi", "o"], 0, "例如 moi、trois"],
        ["c", "je + ai 要寫成？", ["j'ai", "je ai", "jai"], 0, "省音"],
        ["c", "ch 在法文唸成？", ["ㄕ", "ㄑ", "k"], 0, "例如 chat"],
        ["c", "ç 唸成？", ["s", "k", "ch"], 0, "例如 français"],
        ["l", "Le pain est chaud.", "麵包是熱的。"],
        ["l", "J'ai trois enfants.", "我有三個小孩。"]
    ]
},
{
    id: "a0-03", level: "A0", title: "先學會這些就能開口", fr: "Les phrases de survie",
    goal: "先把最常用的固定說法當成「整句」背下來，不用分析文法。在法國遇到聽不懂、要買東西、找廁所時都用得到。",
    grammar: [
        { t: "聽不懂的時候", d: "學語言一定會聽不懂，這幾句可以讓對方放慢或換個說法。**s'il vous plaît**（請）加在句尾會更有禮貌。",
          ex: [["Je ne comprends pas.", "我聽不懂。"], ["Vous pouvez répéter, s'il vous plaît ?", "可以請您再說一次嗎？"], ["Plus lentement, s'il vous plaît.", "請說慢一點。"], ["Comment dit-on « 謝謝 » en français ?", "「謝謝」的法文怎麼說？"], ["Qu'est-ce que ça veut dire ?", "這是什麼意思？"], ["Vous parlez anglais ?", "您會說英文嗎？"]] },
        { t: "買東西、點餐", d: "**Je voudrais…**（我想要…）是點餐和購物最好用的禮貌說法，後面直接接你要的東西。",
          ex: [["Je voudrais un café, s'il vous plaît.", "我想要一杯咖啡，麻煩您。"], ["C'est combien ?", "這個多少錢？"], ["L'addition, s'il vous plaît.", "麻煩買單。"], ["Je peux payer par carte ?", "我可以刷卡嗎？"]] },
        { t: "找地方、求助", d: "**Où est…?** 是「…在哪裡？」，複數用 **Où sont…?**。",
          ex: [["Où sont les toilettes ?", "廁所在哪裡？"], ["Où est la gare ?", "火車站在哪裡？"], ["Excusez-moi, je suis perdu.", "不好意思，我迷路了。（男生）"], ["Je suis perdue.", "我迷路了。（女生）"], ["Au secours !", "救命！"]] },
        { t: "禮貌用語", d: "法國人非常重視禮貌。進店說 **Bonjour**，離開說 **Merci, au revoir**，麻煩別人時先說 **Excusez-moi**。",
          tb: [["法文", "中文"], ["Bonjour", "你好（白天）"], ["Merci (beaucoup)", "謝謝（非常感謝）"], ["De rien", "不客氣"], ["Pardon", "對不起；借過"], ["Excusez-moi", "不好意思（引起注意）"], ["Au revoir", "再見"]] }
    ],
    vocab: [["comprendre", "理解；聽懂", "v."], ["répéter", "重複", "v."], ["lentement", "慢慢地", "adv."], ["je voudrais", "我想要（禮貌）", "loc."], ["combien", "多少", "adv."], ["l'addition", "帳單（餐廳）", "n.f."], ["la carte", "卡；菜單；地圖", "n.f."], ["les toilettes", "廁所", "n.f."], ["la gare", "火車站", "n.f."], ["perdu", "迷路的；遺失的", "adj."], ["beaucoup", "很多；非常", "adv."], ["où", "哪裡", "adv."]],
    dialog: [["Mei", "Bonjour ! Je voudrais un café, s'il vous plaît.", "你好！我想要一杯咖啡，麻煩您。"], ["Serveur", "Un café… et avec ceci ?", "一杯咖啡……還需要別的嗎？"], ["Mei", "Pardon, je ne comprends pas. Plus lentement, s'il vous plaît.", "抱歉，我聽不懂。請說慢一點。"], ["Serveur", "Vous voulez autre chose ?", "您還想要別的東西嗎？"], ["Mei", "Ah ! Non, merci. C'est combien ?", "啊！不用了，謝謝。多少錢？"], ["Serveur", "Deux euros, s'il vous plaît.", "兩歐元，謝謝。"], ["Mei", "Merci, au revoir !", "謝謝，再見！"]],
    culture: "在咖啡館說 un café，送上來的是一小杯濃縮咖啡（espresso）。想要加牛奶要說 un café crème 或 un café au lait。",
    ex: [
        ["c", "聽不懂時可以說：", ["Je ne comprends pas.", "Je voudrais.", "C'est combien ?"], 0, "我聽不懂。"],
        ["c", "___ un café, s'il vous plaît.", ["Je voudrais", "Où est", "De rien"], 0, "我想要一杯咖啡，麻煩您。"],
        ["c", "Où ___ les toilettes ?", ["sont", "est", "es"], 0, "廁所在哪裡？"],
        ["f", "C'est ___ ?", "combien", "這個多少錢？"],
        ["o", "Plus / lentement / , / s'il / vous / plaît", "請說慢一點。"],
        ["t", "麻煩買單。", ["L'addition, s'il vous plaît.", "L'addition s'il vous plaît"]],
        ["l", "Vous pouvez répéter, s'il vous plaît ?", "可以請您再說一次嗎？"]
    ]
},
{
    id: "a0-04", level: "A0", title: "「我、你、他」與動詞變化", fr: "Je, tu, il…",
    goal: "認識八個主詞代名詞，並看懂一個動詞怎麼依主詞變化。學會之後，A1 的第一課就不會覺得跳太快。",
    grammar: [
        { t: "主詞代名詞", d: "法文每個句子幾乎都要有主詞，不能像中文一樣省略。下面八個一定要熟：",
          tb: [["法文", "中文", "說明"], ["je (j')", "我", "母音前寫成 j'"], ["tu", "你", "對熟人"], ["il", "他；它", "陽性名詞也用 il"], ["elle", "她；它", "陰性名詞也用 elle"], ["on", "我們；大家", "口語很常用，動詞變化同 il"], ["nous", "我們", "較正式"], ["vous", "您；你們", "禮貌的「你」或複數"], ["ils / elles", "他們／她們", "只要有一位男性就用 ils"]] },
        { t: "il、elle 也可以指東西", d: "因為名詞有陰陽性，「它」也要分：陽性的 le livre 用 **il**，陰性的 la table 用 **elle**。",
          ex: [["Le livre ? Il est sur la table.", "那本書？它在桌上。"], ["La maison ? Elle est grande.", "那間房子？它很大。"]] },
        { t: "動詞的原形與變化", d: "字典查到的是**原形（不定式）**，大多以 **-er、-ir、-re** 結尾。用的時候要依主詞變化。法文約九成的動詞是 **-er 動詞**，而且規則一樣：去掉 -er，再加上 **-e、-es、-e、-ons、-ez、-ent**。",
          tb: [["主詞", "aimer（喜歡）", "habiter（住）"], ["j'", "aime", "habite"], ["tu", "aimes", "habites"], ["il / elle / on", "aime", "habite"], ["nous", "aimons", "habitons"], ["vous", "aimez", "habitez"], ["ils / elles", "aiment", "habitent"]],
          ex: [["J'habite à Taipei.", "我住在台北。"], ["Tu aimes le chocolat ?", "你喜歡巧克力嗎？"], ["On aime la musique.", "我們喜歡音樂。"]] },
        { t: "最重要的兩個不規則動詞", d: "**être**（是）和 **avoir**（有）不照規則，但最常用，A1 第 6、7 課會詳細學。先看一眼：",
          tb: [["主詞", "être（是）", "avoir（有）"], ["je / j'", "suis", "ai"], ["tu", "es", "as"], ["il / elle / on", "est", "a"], ["nous", "sommes", "avons"], ["vous", "êtes", "avez"], ["ils / elles", "sont", "ont"]],
          ex: [["Je suis taïwanais.", "我是台灣人。（男）"], ["J'ai un chat.", "我有一隻貓。"]] }
    ],
    vocab: [["je", "我", "pron."], ["tu", "你", "pron."], ["il", "他；它", "pron."], ["elle", "她；它", "pron."], ["on", "我們；大家", "pron."], ["nous", "我們", "pron."], ["vous", "您；你們", "pron."], ["ils", "他們", "pron."], ["elles", "她們", "pron."], ["habiter", "住", "v."], ["être", "是；在", "v."], ["avoir", "有", "v."], ["la musique", "音樂", "n.f."], ["le chocolat", "巧克力", "n.m."]],
    dialog: [["Hugo", "Tu habites à Paris ?", "你住在巴黎嗎？"], ["Mei", "Non, j'habite à Lyon. Et toi ?", "不，我住在里昂。你呢？"], ["Hugo", "Moi, j'habite à Paris. J'aime Paris !", "我住在巴黎。我喜歡巴黎！"], ["Mei", "Nous aimons le chocolat, mon ami et moi.", "我和我朋友都喜歡巧克力。"]],
    ex: [
        ["c", "「她們」的法文是？", ["elles", "ils", "elle"], 0, "全部是女性"],
        ["c", "一群人裡有一位男性，「他們」要用？", ["ils", "elles", "on"], 0, ""],
        ["c", "Nous ___ le chocolat.", ["aimons", "aimez", "aiment"], 0, "我們喜歡巧克力。"],
        ["c", "Vous ___ à Taipei ?", ["habitez", "habitons", "habite"], 0, "您住在台北嗎？"],
        ["f", "Tu ___ la musique ?", "aimes", "你喜歡音樂嗎？"],
        ["f", "Ils ___ à Lyon.", "habitent", "他們住在里昂。"],
        ["t", "我住在台北。", ["J'habite à Taipei."]],
        ["l", "On aime la musique.", "我們喜歡音樂。"]
    ]
}
);
