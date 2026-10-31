// ===================== 法文文法講義 =====================
// 每章：{id, level（intro / A1 / A2 / B1）, title, sub, lessons（相關課程 id）, body: [{h, p, tb, ex, tip, warn}], ex（練習題，格式同課程）}
// p 與 tip 可用 **粗體** 與換行
const FR_GRAMMAR = [
// ---------------- 基礎觀念 ----------------
{
    id: "fg-sentence", level: "intro", title: "法文句子怎麼組成", sub: "詞序、主詞、動詞：先看全貌",
    lessons: ["a0-01", "a0-04"],
    body: [
        { h: "最基本的句型", p: "法文和中文一樣是 **主詞 → 動詞 → 受詞**。不同的是：\n1. 主詞**不能省略**（中文可以說「吃了嗎？」，法文一定要有 tu 或 vous）。\n2. 動詞要依主詞**變化**。\n3. 名詞前面通常要有**冠詞**。",
          tb: [["中文", "法文", "差別"], ["（我）喝咖啡。", "Je bois du café.", "要有主詞 je、冠詞 du"], ["她是老師。", "Elle est professeure.", "職業前不加冠詞"], ["我們住台北。", "Nous habitons à Taipei.", "城市前要加 à"]],
          ex: [["Je bois du café.", "我喝咖啡。"], ["Nous habitons à Taipei.", "我們住在台北。"]] },
        { h: "句子裡的「零件」", p: "看文法說明時會一直出現這些名稱，先認識：",
          tb: [["名稱", "意思", "例子"], ["主詞 sujet", "做動作的人或東西", "**Marie** chante."], ["動詞 verbe", "動作或狀態", "Marie **chante**."], ["受詞 complément", "動作的對象", "Je lis **un livre**."], ["冠詞 article", "名詞前的小字", "**le** livre、**une** table"], ["形容詞 adjectif", "形容名詞", "un livre **intéressant**"], ["副詞 adverbe", "修飾動詞、形容詞", "Il parle **vite**."], ["介系詞 préposition", "表示地點、時間、關係", "**à** Paris、**avec** moi"]] },
        { h: "形容詞和副詞的位置", p: "中文的形容詞放在名詞前（紅色的車），法文大多放在**後面**：une voiture **rouge**。只有少數短又常用的形容詞放前面（petit、grand、bon、beau…，第 10 章詳細說）。",
          ex: [["une voiture rouge", "一輛紅色的車"], ["un petit café", "一家小咖啡館"], ["Il parle très bien.", "他說得很好。"]] },
        { h: "怎麼把句子變成否定、問句", p: "否定：把 **ne … pas** 夾住動詞：Je **ne** parle **pas** anglais.\n問句：口語最簡單，句尾語調上揚：Tu parles anglais ? ↗\n細節在第 8、9 章。",
          ex: [["Je ne parle pas anglais.", "我不說英文。"], ["Tu parles anglais ?", "你說英文嗎？"]] }
    ],
    ex: [
        ["c", "法文句子可以省略主詞嗎？", ["幾乎不行", "可以，和中文一樣", "只有過去式可以"], 0, ""],
        ["c", "une voiture ___", ["rouge", "rouges", "la rouge"], 0, "一輛紅色的車"],
        ["o", "Nous / habitons / à / Taipei", "我們住在台北。"],
        ["o", "Je / ne / parle / pas / anglais", "我不說英文。"]
    ]
},
{
    id: "fg-gender", level: "intro", title: "名詞的陰陽性與單複數", sub: "怎麼猜性別、怎麼變複數",
    lessons: ["a0-01", "a1-04"],
    body: [
        { h: "為什麼要管陰陽性", p: "名詞的性別會決定：要用哪個冠詞（le / la）、形容詞怎麼變、要用 il 還是 elle 代替。所以背名詞時**一定連冠詞一起背**：不是背 livre，而是背 le livre。" },
        { h: "人和動物：依真實性別", p: "指人的名詞通常依真實性別，女性形常加 **-e**：",
          tb: [["陽性", "陰性", "中文"], ["un ami", "une amie", "朋友"], ["un étudiant", "une étudiante", "學生"], ["un acteur", "une actrice", "演員"], ["un chanteur", "une chanteuse", "歌手"], ["un boulanger", "une boulangère", "麵包師傅"], ["un élève", "une élève", "學生（同形）"]] },
        { h: "東西：看字尾猜", p: "東西的性別沒有道理，但字尾有規律（約八成準）：",
          tb: [["通常是陽性", "例子", "通常是陰性", "例子"], ["-age", "le fromage、le voyage", "-tion / -sion", "la nation、la télévision"], ["-ment", "le moment、l'appartement", "-té", "la liberté、la santé"], ["-eau", "le bureau、le gâteau", "-ette", "la baguette、la fourchette"], ["-isme", "le tourisme", "-ure", "la voiture、la culture"], ["-er / -ier", "le cahier、le dîner", "-ence / -ance", "la différence、la chance"]],
          tip: "例外也不少：**la plage**（海灘）、**l'image**（陰性）、**la page** 都是 -age 卻是陰性；**le lycée**、**le musée** 以 -ée 結尾卻是陽性。猜不到時就查單字本裡的 n.m. / n.f.。", warn: false },
        { h: "複數：大多加 -s，但不唸", p: "名詞變複數通常加 **-s**，而且**發音不變**（le livre / les livres 的 livre 唸法一樣）。聽的時候要靠冠詞 le / les 分辨單複數。",
          tb: [["規則", "單數", "複數"], ["一般：加 -s", "le livre", "les livres"], ["-s、-x、-z 結尾：不變", "le bus、le prix", "les bus、les prix"], ["-eau、-eu：加 -x", "le gâteau、le jeu", "les gâteaux、les jeux"], ["-al：變 -aux", "le journal、l'animal", "les journaux、les animaux"], ["特殊", "l'œil", "les yeux"]] }
    ],
    ex: [
        ["c", "___ télévision", ["la", "le", "l'"], 0, "-tion 通常是陰性"],
        ["c", "___ fromage", ["le", "la", "les"], 0, "-age 通常是陽性"],
        ["c", "le journal 的複數是？", ["les journaux", "les journals", "les journaus"], 0, ""],
        ["c", "le gâteau 的複數是？", ["les gâteaux", "les gâteaus", "les gâteau"], 0, ""],
        ["c", "une ___（女演員）", ["actrice", "acteur", "acteure"], 0, ""],
        ["f", "les ___（眼睛，單數 l'œil）", "yeux", ""]
    ]
},
{
    id: "fg-articles", level: "intro", title: "冠詞：le、un、du 怎麼選", sub: "定冠詞、不定冠詞、部分冠詞",
    lessons: ["a1-04", "a1-10"],
    body: [
        { h: "三種冠詞一覽", p: "法文名詞前幾乎都要有冠詞。選哪一種，看你講的是「特定的、一般的」還是「某一個」或「一些（數不清的）」。",
          tb: [["", "陽性", "陰性", "母音前", "複數"], ["定冠詞（這個；…這類東西）", "le", "la", "l'", "les"], ["不定冠詞（一個；一些）", "un", "une", "un / une", "des"], ["部分冠詞（一些，不可數）", "du", "de la", "de l'", "des"]] },
        { h: "定冠詞 le / la / les", p: "用在兩種情況：\n1. **特定的**東西（說話雙方都知道是哪一個）：Le livre est sur la table.（那本書在桌上）\n2. **泛指一整類**，特別是在 aimer、adorer、détester、préférer 後面：J'aime **le** café.（我喜歡咖啡——咖啡這種東西）",
          ex: [["Le livre est sur la table.", "那本書在桌上。"], ["J'aime le café.", "我喜歡咖啡。"], ["Les chats sont mignons.", "貓很可愛。（泛指）"]] },
        { h: "不定冠詞 un / une / des", p: "第一次提到、不特定的「一個」，複數「一些」用 **des**（中文常不翻）。",
          ex: [["J'ai un frère et une sœur.", "我有一個哥哥和一個妹妹。"], ["Il y a des pommes.", "有一些蘋果。"]] },
        { h: "部分冠詞 du / de la / de l'", p: "用在**不可數**、只取「一部分」的東西，例如食物、飲料、抽象概念。中文都翻成「一些」或不翻。\n對比：J'aime **le** pain（我喜歡麵包，泛指）／Je mange **du** pain（我吃（一些）麵包）。",
          ex: [["Je mange du pain.", "我吃麵包。"], ["Tu veux de la soupe ?", "你要喝點湯嗎？"], ["Il boit de l'eau.", "他喝水。"], ["Il faut du courage.", "需要勇氣。"]] },
        { h: "否定句裡變成 de", p: "un、une、des、du、de la、de l' 在否定句中都變成 **de**（母音前 **d'**）。但 le / la / les **不變**。",
          tb: [["肯定", "否定"], ["J'ai un chat.", "Je n'ai pas de chat."], ["Je mange de la viande.", "Je ne mange pas de viande."], ["Il y a des œufs.", "Il n'y a pas d'œufs."], ["J'aime le thé.", "Je n'aime pas le thé.（不變）"]],
          tip: "être 的否定例外，冠詞不變：C'est un livre → Ce n'est pas **un** livre。", warn: true },
        { h: "介系詞 à、de 和定冠詞合併", p: "à 和 de 遇到 le、les 要合併（la 和 l' 不合併）：",
          tb: [["", "+ le", "+ la", "+ l'", "+ les"], ["à", "au", "à la", "à l'", "aux"], ["de", "du", "de la", "de l'", "des"]],
          ex: [["Je vais au cinéma.", "我去電影院。"], ["Elle parle aux enfants.", "她對孩子們說話。"], ["Le livre du professeur.", "老師的書。"]] }
    ],
    ex: [
        ["c", "J'aime ___ chocolat.", ["le", "du", "un"], 0, "我喜歡巧克力。（泛指）"],
        ["c", "Je mange ___ chocolat.", ["du", "le", "de"], 0, "我吃巧克力。（一些）"],
        ["c", "Je n'ai pas ___ voiture.", ["de", "une", "la"], 0, "我沒有車。"],
        ["c", "Nous allons ___ cinéma.", ["au", "à le", "du"], 0, "我們去電影院。"],
        ["f", "Il boit ___ eau.", "de l'", "他喝水。"],
        ["f", "Il n'y a pas ___ œufs.", "d'", "沒有蛋。"],
        ["t", "我有一個哥哥。", ["J'ai un frère."]]
    ]
},
{
    id: "fg-elision", level: "intro", title: "省音、縮合與連音", sub: "j'ai、l'ami、au、les‿amis",
    lessons: ["a0-02", "a1-04"],
    body: [
        { h: "省音：遇到母音就省掉 e / a", p: "下列小字後面接**母音或不發音的 h** 時，要省掉最後的母音並加撇號：",
          tb: [["原本", "省音後", "例子"], ["je", "j'", "j'aime、j'habite"], ["le / la", "l'", "l'ami、l'école、l'hôtel"], ["ne", "n'", "je n'aime pas"], ["de", "d'", "un verre d'eau"], ["que", "qu'", "qu'est-ce que"], ["me / te / se", "m' / t' / s'", "je m'appelle"], ["si + il(s)", "s'il(s)", "s'il vous plaît（si + elle 不省）"]],
          tip: "這是**一定要做**的，不是可有可無：寫成 je aime 是錯的。", warn: true },
        { h: "縮合", p: "à / de + le / les 要合併成一個字（見第 3 章）：**au、aux、du、des**。" },
        { h: "連音：字尾子音連到下一個字", p: "平常不唸的字尾子音，在母音開頭的字前面要唸出來，而且常常變音：s、x 唸成 **z**，d 唸成 **t**。\n**一定要連**：冠詞＋名詞（les‿amis）、代名詞＋動詞（nous‿avons、ils‿ont）、短形容詞＋名詞（un petit‿enfant）。\n**不可以連**：et 後面（et / un）、單數名詞＋形容詞。",
          ex: [["les amis", "朋友們（lé-za-mi）"], ["nous avons", "我們有（nou-za-von）"], ["ils ont", "他們有（il-zon，注意和 ils sont 分辨）"], ["un grand homme", "一位偉人（d 唸成 t）"]],
          tip: "**ils ont**（他們有，z 音）和 **ils sont**（他們是，s 音）只差一個音，聽的時候要特別注意。", warn: false }
    ],
    ex: [
        ["c", "___ habite à Paris.", ["J'", "Je", "Je'"], 0, "我住在巴黎。"],
        ["c", "___ école", ["l'", "la", "le"], 0, "學校"],
        ["c", "Je ___ aime pas.", ["n'", "ne", "pas"], 0, "我不喜歡。"],
        ["c", "ils ont 的 s 唸成？", ["z", "s", "不唸"], 0, ""],
        ["f", "un verre ___ eau", "d'", "一杯水"]
    ]
},
{
    id: "fg-verbs", level: "intro", title: "動詞變化入門", sub: "原形、三類動詞、時態是什麼",
    lessons: ["a0-04", "a1-06"],
    body: [
        { h: "原形（不定式）", p: "字典裡的動詞形式叫**不定式**，相當於英文的 to + 動詞。依字尾分三類：",
          tb: [["類別", "字尾", "例子", "說明"], ["第一類", "-er", "parler、aimer、manger", "約九成動詞，幾乎全部規則（aller 除外）"], ["第二類", "-ir（nous …issons）", "finir、choisir", "規則"], ["第三類", "-ir、-re、-oir", "partir、prendre、vouloir", "不規則，要個別背"]] },
        { h: "變化 = 字根 + 字尾", p: "規則動詞去掉 -er / -ir / -re 得到**字根**，再依主詞加字尾。以現在式為例：",
          tb: [["主詞", "parler", "finir", "vendre"], ["je", "parl**e**", "fin**is**", "vend**s**"], ["tu", "parl**es**", "fin**is**", "vend**s**"], ["il / elle / on", "parl**e**", "fin**it**", "vend"], ["nous", "parl**ons**", "fin**issons**", "vend**ons**"], ["vous", "parl**ez**", "fin**issez**", "vend**ez**"], ["ils / elles", "parl**ent**", "fin**issent**", "vend**ent**"]] },
        { h: "時態一覽", p: "中文用「了、過、會、正在」表達時間，法文用不同的動詞變化。初學只要先會**現在式**，其他依課程慢慢學：",
          tb: [["時態", "用途", "例子", "學習階段"], ["現在式 présent", "現在、習慣、不久的未來", "je parle", "A1"], ["近未來 futur proche", "等一下要做", "je vais parler", "A1"], ["複合過去式 passé composé", "做完的事（了）", "j'ai parlé", "A2"], ["未完成過去式 imparfait", "過去的狀態、習慣", "je parlais", "A2"], ["簡單未來式 futur simple", "將來會…", "je parlerai", "A2"], ["條件式 conditionnel", "會…（假設）；禮貌", "je parlerais", "B1"], ["虛擬式 subjonctif", "希望、必須、情緒之後", "que je parle", "B1"]] },
        { h: "怎麼背最有效率", p: "1. 先背 **être、avoir、aller、faire** 四個最不規則又最常用的動詞。\n2. -er 動詞只要學一次規則就全部通用。\n3. 不規則動詞記「三個形式」：je、nous、ils，其他大多可以推出來。\n4. 用教室的「動詞變化」分頁查表、聽發音、做混合練習。" }
    ],
    ex: [
        ["c", "parler 屬於哪一類？", ["-er 第一類", "-ir 第二類", "第三類不規則"], 0, ""],
        ["c", "nous ___（finir）", ["finissons", "finons", "finisons"], 0, "我們完成"],
        ["c", "ils ___（parler）", ["parlent", "parlont", "parlez"], 0, "他們說"],
        ["f", "je ___（vendre）", "vends", "我賣"],
        ["f", "vous ___（parler）", "parlez", "您說"]
    ]
},
// ---------------- A1 ----------------
{
    id: "fg-etre-avoir", level: "A1", title: "être 與 avoir", sub: "兩個最重要的動詞與常見用法",
    lessons: ["a1-02", "a1-03"],
    body: [
        { h: "變化", tb: [["主詞", "être（是、在）", "avoir（有）"], ["je / j'", "suis", "ai"], ["tu", "es", "as"], ["il / elle / on", "est", "a"], ["nous", "sommes", "avons"], ["vous", "êtes", "avez"], ["ils / elles", "sont", "ont"]] },
        { h: "être 的用法", p: "表示身分、國籍、職業、特徵、地點。說職業和國籍時**不加冠詞**。",
          ex: [["Je suis étudiante.", "我是學生。（女）"], ["Il est français.", "他是法國人。"], ["Nous sommes fatigués.", "我們累了。"], ["Vous êtes où ?", "您在哪裡？"]] },
        { h: "avoir 的用法：中文用「是／覺得」的地方", p: "法文很多感覺和年齡是用「有」：",
          tb: [["法文", "直譯", "中文"], ["avoir 20 ans", "有 20 年", "20 歲"], ["avoir faim / soif", "有餓／渴", "餓／渴"], ["avoir chaud / froid", "有熱／冷", "覺得熱／冷"], ["avoir peur (de)", "有害怕", "害怕"], ["avoir raison / tort", "有理／錯", "說得對／錯"], ["avoir besoin de", "有需要", "需要"], ["avoir mal à", "有痛在", "…痛"]],
          ex: [["J'ai vingt-cinq ans.", "我二十五歲。"], ["Tu as faim ?", "你餓嗎？"], ["Elle a besoin d'aide.", "她需要幫忙。"], ["J'ai mal à la tête.", "我頭痛。"]],
          tip: "「我二十歲」不能說 je suis 20 ans，一定要用 avoir：**J'ai 20 ans**。「我很熱」也不能說 je suis chaud（意思會變得很奇怪），要說 **J'ai chaud**。", warn: true },
        { h: "c'est 和 il est", p: "**c'est** + 冠詞／名詞、人名、或泛指：C'est un ami. C'est Marie. C'est bon !\n**il / elle est** + 形容詞、職業、國籍（不加冠詞）：Il est grand. Elle est médecin.",
          ex: [["C'est un médecin.", "他是一位醫生。（有冠詞用 c'est）"], ["Il est médecin.", "他是醫生。（無冠詞用 il est）"], ["C'est intéressant !", "真有趣！"]] },
        { h: "il y a：有（存在）", p: "表示「某處有某物」用 **il y a**，不管後面單數複數都不變。否定 il n'y a pas de…",
          ex: [["Il y a un café près d'ici.", "這附近有一家咖啡館。"], ["Il y a trois chambres.", "有三個房間。"], ["Il n'y a pas de problème.", "沒問題。"]] }
    ],
    ex: [
        ["c", "J'___ vingt ans.", ["ai", "suis", "a"], 0, "我二十歲。"],
        ["c", "Nous ___ taïwanais.", ["sommes", "avons", "êtes"], 0, "我們是台灣人。"],
        ["c", "___ un bon restaurant.", ["C'est", "Il est", "Il a"], 0, "這是一家好餐廳。"],
        ["c", "Elle ___ médecin.", ["est", "a", "c'est"], 0, "她是醫生。"],
        ["f", "Tu ___ soif ?", "as", "你渴嗎？"],
        ["f", "Ils ___ en retard.", "sont", "他們遲到了。"],
        ["t", "我頭痛。", ["J'ai mal à la tête."]],
        ["t", "這附近有一家咖啡館。", ["Il y a un café près d'ici."]]
    ]
},
{
    id: "fg-er", level: "A1", title: "-er 動詞現在式", sub: "規則、發音、拼字變化",
    lessons: ["a1-06"],
    body: [
        { h: "規則", p: "去掉 **-er**，加上 **-e、-es、-e、-ons、-ez、-ent**。",
          tb: [["主詞", "parler", "aimer", "habiter"], ["je / j'", "parle", "aime", "habite"], ["tu", "parles", "aimes", "habites"], ["il / elle / on", "parle", "aime", "habite"], ["nous", "parlons", "aimons", "habitons"], ["vous", "parlez", "aimez", "habitez"], ["ils / elles", "parlent", "aiment", "habitent"]] },
        { h: "發音：其實只有三種", p: "je、tu、il、ils 的字尾 **-e、-es、-e、-ent 都不唸**，四個唸法完全一樣。只有 nous（-ons，鼻音）和 vous（-ez，唸 é）聽得出差別。",
          tip: "ils parlent 的 -ent **不唸**，不要唸成「parl-ent」。這是初學者最常見的發音錯誤。", warn: true },
        { h: "現在式 = 中文的「現在、正在、常常」", p: "法文的現在式涵蓋很廣：Je mange 可以是「我吃」「我正在吃」「我（平常）吃」。沒有另外的進行式。",
          ex: [["Je travaille à Taipei.", "我在台北工作。"], ["Qu'est-ce que tu fais ? — Je regarde la télé.", "你在做什麼？——我在看電視。"], ["Le week-end, nous jouons au tennis.", "週末我們打網球。"]] },
        { h: "拼字小變化（發音的關係）", p: "少數 -er 動詞為了保持發音，拼法會稍微變：",
          tb: [["類型", "例子", "變化"], ["-ger", "manger", "nous mang**e**ons（保留 g 的軟音）"], ["-cer", "commencer", "nous commen**ç**ons"], ["e + 子音 + er", "acheter", "j'ach**è**te、nous achetons"], ["é + 子音 + er", "préférer", "je préf**è**re、nous préférons"], ["-eler / -eter", "appeler", "je m'appe**ll**e、nous nous appelons"], ["-yer", "payer、envoyer", "je pa**i**e、j'envo**i**e"]],
          tip: "規律：重音落在字根的那幾個人稱（je、tu、il、ils）才變，nous、vous 不變。" }
    ],
    ex: [
        ["c", "Ils ___ au tennis.", ["jouent", "jouons", "jouez"], 0, "他們打網球。"],
        ["c", "Nous ___ à huit heures.", ["mangeons", "mangons", "mangez"], 0, "我們八點吃飯。"],
        ["c", "J'___ une baguette.", ["achète", "achete", "achètes"], 0, "我買一根長棍麵包。"],
        ["f", "Vous ___ français ?（parler）", "parlez", "您說法文嗎？"],
        ["f", "Tu ___ à Paris ?（habiter）", "habites", "你住在巴黎嗎？"],
        ["f", "Nous ___ à neuf heures.（commencer）", "commençons", "我們九點開始。"],
        ["l", "Elles travaillent le samedi.", "她們星期六工作。"]
    ]
},
{
    id: "fg-negation", level: "A1", title: "否定句", sub: "ne … pas 與其他否定",
    lessons: ["a1-06", "a2-14"],
    body: [
        { h: "ne … pas 夾住動詞", p: "把 **ne** 放在動詞前、**pas** 放在動詞後。母音前 ne → **n'**。",
          ex: [["Je ne parle pas allemand.", "我不說德文。"], ["Il n'aime pas le fromage.", "他不喜歡起司。"], ["Ce n'est pas grave.", "沒關係。"]] },
        { h: "有代名詞、助動詞時的位置", p: "ne 放在**受詞代名詞之前**，pas 放在**變化的那個動詞之後**：\n複合過去式：Je **n'**ai **pas** mangé.\n動詞＋原形：Je **ne** veux **pas** partir.\n反身動詞：Je **ne** me lève **pas** tôt.",
          ex: [["Je n'ai pas mangé.", "我還沒吃。"], ["Je ne veux pas partir.", "我不想走。"], ["Il ne se lève pas tôt.", "他不早起。"]] },
        { h: "其他否定", tb: [["法文", "中文", "例句"], ["ne … jamais", "從不", "Je ne fume jamais."], ["ne … plus", "不再", "Il ne travaille plus ici."], ["ne … rien", "什麼都沒", "Je ne vois rien."], ["ne … personne", "沒有人", "Je ne connais personne."], ["ne … pas encore", "還沒", "Elle n'est pas encore arrivée."], ["ne … que", "只（不是否定）", "Je n'ai que dix euros."]] },
        { h: "口語常省略 ne", p: "日常口語常把 ne 省掉：**J'sais pas**（= Je ne sais pas）、**C'est pas grave**。聽得懂就好，寫作時要寫完整。",
          tip: "否定句裡 un / une / du / des 要變成 **de**（見第 3 章）：Je n'ai pas **de** voiture。", warn: true }
    ],
    ex: [
        ["o", "Je / ne / parle / pas / allemand", "我不說德文。"],
        ["c", "Il ___ aime pas le café.", ["n'", "ne", "pas"], 0, "他不喜歡咖啡。"],
        ["c", "Je n'ai ___ mangé.", ["pas", "ne", "rien pas"], 0, "我還沒吃。"],
        ["c", "Je ne fume ___ .", ["jamais", "personne", "rien"], 0, "我從不抽菸。"],
        ["f", "Il ne travaille ___ ici.", "plus", "他不再在這裡工作了。"],
        ["t", "我什麼都沒看到。", ["Je ne vois rien.", "Je n'ai rien vu."]]
    ]
},
{
    id: "fg-questions", level: "A1", title: "問句", sub: "三種問法與疑問詞",
    lessons: ["a1-07"],
    body: [
        { h: "是非問句的三種問法", p: "同一個問題可以有三種說法，正式程度不同：",
          tb: [["方法", "例句", "使用場合"], ["語調上揚", "Tu parles français ?", "口語最常用"], ["Est-ce que + 句子", "Est-ce que tu parles français ?", "口語、書面都可"], ["主詞動詞倒裝", "Parles-tu français ?", "正式、書面"]],
          tip: "倒裝時如果動詞以母音結尾、主詞是 il / elle / on，中間要加 **-t-**：Parle-**t**-il français ? A-**t**-elle un chat ?" },
        { h: "疑問詞", tb: [["疑問詞", "意思", "例句"], ["qui", "誰", "Qui est-ce ?"], ["que / qu'est-ce que", "什麼", "Qu'est-ce que tu fais ?"], ["quoi", "什麼（放句尾）", "Tu fais quoi ?"], ["où", "哪裡", "Où habites-tu ?"], ["quand", "什麼時候", "Quand est-ce que tu pars ?"], ["comment", "怎麼；如何", "Comment tu t'appelles ?"], ["pourquoi", "為什麼", "Pourquoi tu ris ?"], ["combien (de)", "多少", "Combien de frères as-tu ?"], ["quel / quelle / quels / quelles", "哪個", "Quelle heure est-il ?"]] },
        { h: "疑問詞放哪裡", p: "口語可放句尾：Tu habites **où** ?\n標準：疑問詞 + est-ce que + 句子：**Où est-ce que** tu habites ?\n正式：疑問詞 + 倒裝：**Où** habites-**tu** ?",
          ex: [["Tu habites où ?", "你住哪裡？（口語）"], ["Où est-ce que tu habites ?", "你住哪裡？"], ["Où habites-tu ?", "你住哪裡？（正式）"]] },
        { h: "quel 要配合名詞", p: "**quel** 是形容詞，依後面名詞的陰陽性和單複數變化，四種寫法唸起來都一樣。",
          tb: [["", "陽性", "陰性"], ["單數", "quel jour ?", "quelle heure ?"], ["複數", "quels livres ?", "quelles couleurs ?"]],
          ex: [["Quel âge as-tu ?", "你幾歲？"], ["Quelle est ta couleur préférée ?", "你最喜歡什麼顏色？"]] }
    ],
    ex: [
        ["c", "___ tu habites ?", ["Où est-ce que", "Qu'est-ce que", "Est-ce qu'où"], 0, "你住哪裡？"],
        ["c", "___ heure est-il ?", ["Quelle", "Quel", "Quels"], 0, "現在幾點？"],
        ["c", "Parle-___-il anglais ?", ["t", "s", "il"], 0, "他說英文嗎？"],
        ["c", "___ tu fais ?", ["Qu'est-ce que", "Quoi", "Qui"], 0, "你在做什麼？"],
        ["f", "___ tu t'appelles ?", "Comment", "你叫什麼名字？"],
        ["f", "___ de frères as-tu ?", "Combien", "你有幾個兄弟？"],
        ["t", "你為什麼學法文？", ["Pourquoi tu apprends le français ?", "Pourquoi est-ce que tu apprends le français ?", "Pourquoi apprends-tu le français ?"]]
    ]
},
{
    id: "fg-adjectives", level: "A1", title: "形容詞的配合與位置", sub: "陰性、複數、放前面還是後面",
    lessons: ["a1-09"],
    body: [
        { h: "要配合名詞", p: "形容詞要跟名詞的**陰陽性、單複數一致**。基本規則：陰性加 **-e**、複數加 **-s**。",
          tb: [["", "陽性", "陰性"], ["單數", "un livre intéressant", "une histoire intéressante"], ["複數", "des livres intéressants", "des histoires intéressantes"]],
          tip: "陰性加 -e 時，原本不唸的字尾子音會唸出來：grand（gran）→ grande（grand）。聽到字尾子音，常常就是陰性。" },
        { h: "陰性的特殊變化", tb: [["規則", "陽性", "陰性"], ["已經是 -e：不變", "jeune、rouge", "jeune、rouge"], ["-eux → -euse", "heureux", "heureuse"], ["-if → -ive", "sportif", "sportive"], ["-er → -ère", "cher", "chère"], ["-en / -on → 雙寫加 e", "italien、bon", "italienne、bonne"], ["-el → -elle", "naturel", "naturelle"], ["不規則", "blanc、long、frais", "blanche、longue、fraîche"]] },
        { h: "位置：大多放後面", p: "顏色、國籍、形狀、較長的形容詞放**名詞後面**：un pull **noir**、une voiture **japonaise**。\n少數短而常用的放**前面**，記法 **BAGS**：\n**B**eauty 美醜：beau、joli\n**A**ge 新舊：jeune、vieux、nouveau\n**G**oodness 好壞：bon、mauvais\n**S**ize 大小：petit、grand、gros",
          ex: [["un pull noir", "一件黑色毛衣"], ["une jolie maison", "一間漂亮的房子"], ["un bon restaurant", "一家好餐廳"], ["une petite ville", "一個小鎮"]] },
        { h: "beau、nouveau、vieux 的特殊形", p: "這三個字在**母音開頭的陽性單數名詞前**有特別形式：",
          tb: [["一般陽性", "母音前陽性", "陰性", "例子"], ["beau", "bel", "belle", "un bel homme"], ["nouveau", "nouvel", "nouvelle", "un nouvel ami"], ["vieux", "vieil", "vieille", "un vieil hôtel"]] },
        { h: "複數 des + 前置形容詞 → de", p: "正式語中，複數形容詞放名詞前時，des 變成 **de**：de belles maisons、de bons amis。口語常仍說 des。" }
    ],
    ex: [
        ["c", "une robe ___", ["blanche", "blanc", "blanches"], 0, "一件白色洋裝"],
        ["c", "Elle est ___ .", ["heureuse", "heureux", "heureuxe"], 0, "她很幸福。"],
        ["c", "un ___ ami", ["nouvel", "nouveau", "nouvelle"], 0, "一位新朋友"],
        ["c", "J'ai une voiture ___ .", ["japonaise", "japonais", "japonaises"], 0, "我有一輛日本車。"],
        ["o", "C'est / un / bon / restaurant", "這是一家好餐廳。"],
        ["f", "des chaussures ___（noir）", "noires", "黑色的鞋子"]
    ]
},
{
    id: "fg-possessive", level: "A1", title: "所有格與指示形容詞", sub: "mon / ma / mes、ce / cette / ces",
    lessons: ["a1-05", "a1-15"],
    body: [
        { h: "所有格形容詞：看「被擁有的東西」", p: "法文的所有格要配合**後面的名詞**，不是擁有者。sa mère 可以是「他的媽媽」也可以是「她的媽媽」——用 sa 是因為 mère 是陰性。",
          tb: [["擁有者", "陽性單數", "陰性單數", "複數"], ["我的", "mon", "ma", "mes"], ["你的", "ton", "ta", "tes"], ["他的／她的", "son", "sa", "ses"], ["我們的", "notre", "notre", "nos"], ["您的；你們的", "votre", "votre", "vos"], ["他們的", "leur", "leur", "leurs"]],
          ex: [["mon père, ma mère, mes parents", "我的爸爸、媽媽、父母"], ["Paul aime sa sœur.", "保羅愛他的妹妹。"], ["Marie aime son frère.", "瑪麗愛她的哥哥。"]] },
        { h: "母音前一律用 mon / ton / son", p: "陰性名詞如果以母音開頭，為了好唸，用 **mon、ton、son**：mon amie（我的女性朋友）、ton école、son histoire。",
          tip: "不能說 ma amie，要說 **mon amie**。", warn: true },
        { h: "指示形容詞：這個、那個", tb: [["", "形式", "例子"], ["陽性", "ce", "ce livre"], ["陽性（母音前）", "cet", "cet homme、cet hôtel"], ["陰性", "cette", "cette maison"], ["複數", "ces", "ces enfants"]],
          ex: [["Ce livre est intéressant.", "這本書很有趣。"], ["J'aime cette chanson.", "我喜歡這首歌。"], ["Combien coûtent ces chaussures ?", "這雙鞋多少錢？"]],
          tip: "要特別分「這個」和「那個」時，在名詞後加 **-ci**（這）或 **-là**（那）：ce livre-ci / ce livre-là。" }
    ],
    ex: [
        ["c", "___ amie s'appelle Léa.", ["Mon", "Ma", "Mes"], 0, "我的朋友叫蕾雅。"],
        ["c", "Paul et ___ mère", ["sa", "son", "ses"], 0, "保羅和他的媽媽"],
        ["c", "___ hôtel est cher.", ["Cet", "Ce", "Cette"], 0, "這家飯店很貴。"],
        ["c", "Ils aiment ___ enfants.", ["leurs", "leur", "ses"], 0, "他們愛他們的孩子。"],
        ["f", "___ chanson est belle.（這首）", "Cette", "這首歌很美。"],
        ["f", "Vous avez ___ passeport ?（您的）", "votre", "您有護照嗎？"]
    ]
},
{
    id: "fg-irregular", level: "A1", title: "常用不規則動詞", sub: "aller、faire、venir、prendre、pouvoir、vouloir、devoir",
    lessons: ["a1-11", "a1-12", "a1-15"],
    body: [
        { h: "aller、faire、venir", tb: [["主詞", "aller（去）", "faire（做）", "venir（來）"], ["je", "vais", "fais", "viens"], ["tu", "vas", "fais", "viens"], ["il / elle", "va", "fait", "vient"], ["nous", "allons", "faisons", "venons"], ["vous", "allez", "faites", "venez"], ["ils / elles", "vont", "font", "viennent"]],
          ex: [["Je vais à la plage.", "我去海邊。"], ["Qu'est-ce que vous faites ?", "您在做什麼？"], ["Il fait beau.", "天氣很好。"], ["Je viens de Taïwan.", "我來自台灣。"]],
          tip: "vous **faites**、vous **dites**、vous **êtes** 是僅有的三個不以 -ez 結尾的 vous 形。" },
        { h: "prendre（拿、搭、吃喝）", p: "prendre 的用途很廣：搭交通工具、點餐、拿東西。apprendre（學）、comprendre（懂）變化相同。",
          tb: [["主詞", "prendre"], ["je", "prends"], ["tu", "prends"], ["il / elle", "prend"], ["nous", "prenons"], ["vous", "prenez"], ["ils / elles", "prennent"]],
          ex: [["Je prends le métro.", "我搭地鐵。"], ["Vous prenez un café ?", "您要喝杯咖啡嗎？"], ["J'apprends le français.", "我在學法文。"]] },
        { h: "pouvoir、vouloir、devoir + 原形動詞", p: "這三個動詞後面直接接**原形動詞**：",
          tb: [["主詞", "pouvoir（能）", "vouloir（想要）", "devoir（必須）"], ["je", "peux", "veux", "dois"], ["tu", "peux", "veux", "dois"], ["il / elle", "peut", "veut", "doit"], ["nous", "pouvons", "voulons", "devons"], ["vous", "pouvez", "voulez", "devez"], ["ils / elles", "peuvent", "veulent", "doivent"]],
          ex: [["Je peux entrer ?", "我可以進來嗎？"], ["Tu veux venir avec nous ?", "你想跟我們一起來嗎？"], ["Nous devons partir.", "我們必須走了。"]],
          tip: "點餐、請求時，把 je veux 換成 **je voudrais** 會禮貌很多。" }
    ],
    ex: [
        ["c", "Nous ___ au cinéma ce soir.", ["allons", "allez", "vont"], 0, "我們今晚去看電影。"],
        ["c", "Qu'est-ce que vous ___ ?", ["faites", "faisez", "font"], 0, "您在做什麼？"],
        ["c", "Ils ___ le bus.", ["prennent", "prenent", "prendent"], 0, "他們搭公車。"],
        ["c", "Tu ___ venir ?", ["veux", "veut", "voulez"], 0, "你想來嗎？"],
        ["f", "Je ___ de Taïwan.（venir）", "viens", "我來自台灣。"],
        ["f", "Elles ___ travailler.（devoir）", "doivent", "她們必須工作。"],
        ["t", "我可以進來嗎？", ["Je peux entrer ?", "Est-ce que je peux entrer ?", "Puis-je entrer ?"]]
    ]
},
{
    id: "fg-places", level: "A1", title: "地點介系詞", sub: "à、en、au、chez、dans…",
    lessons: ["a1-11", "a1-14"],
    body: [
        { h: "城市與國家", p: "「在／去」某地，依地名種類選介系詞：",
          tb: [["地點", "介系詞", "例子"], ["城市", "à", "à Paris、à Taipei"], ["陰性國家（多以 -e 結尾）", "en", "en France、en Chine"], ["陽性國家", "au", "au Japon、au Canada"], ["複數國家", "aux", "aux États-Unis"], ["母音開頭的國家", "en", "en Iran、en Israël"]],
          ex: [["J'habite à Taipei.", "我住在台北。"], ["Elle va en France.", "她去法國。"], ["Nous allons au Japon.", "我們去日本。"]],
          tip: "Taïwan 沒有冠詞，用 **à Taïwan**（像城市一樣）。" },
        { h: "從…來", p: "來自城市用 **de**；陰性國家 **de**；陽性國家 **du**；複數國家 **des**。",
          ex: [["Je viens de Taipei.", "我從台北來。"], ["Il vient du Japon.", "他從日本來。"], ["Elle vient des États-Unis.", "她從美國來。"]] },
        { h: "其他常用地點介系詞", tb: [["介系詞", "意思", "例子"], ["chez", "在…家；在…店", "chez moi、chez le médecin"], ["dans", "在…裡面", "dans la boîte"], ["sur / sous", "在…上／下", "sur la table、sous le lit"], ["devant / derrière", "在…前／後", "devant la gare"], ["à côté de", "在…旁邊", "à côté de la banque"], ["en face de", "在…對面", "en face du café"], ["près de / loin de", "離…近／遠", "près d'ici"], ["entre", "在…之間", "entre la poste et l'église"]],
          ex: [["Je suis chez moi.", "我在家。"], ["La pharmacie est en face de la gare.", "藥局在車站對面。"]] }
    ],
    ex: [
        ["c", "Je vais ___ Japon.", ["au", "en", "à"], 0, "我去日本。"],
        ["c", "Elle habite ___ Italie.", ["en", "au", "à"], 0, "她住在義大利。"],
        ["c", "Nous sommes ___ Lyon.", ["à", "en", "au"], 0, "我們在里昂。"],
        ["c", "Il vient ___ Canada.", ["du", "de", "au"], 0, "他來自加拿大。"],
        ["f", "Je dîne ___ mes parents.", "chez", "我在爸媽家吃晚餐。"],
        ["f", "La banque est à côté ___ la poste.", "de", "銀行在郵局旁邊。"]
    ]
},
{
    id: "fg-reflexive", level: "A1", title: "反身動詞", sub: "se lever、s'appeler：動作回到自己身上",
    lessons: ["a1-13"],
    body: [
        { h: "什麼是反身動詞", p: "動作的對象是**自己**：laver（洗）→ **se laver**（洗自己＝洗澡）。字典裡會寫成 se + 原形。很多日常作息都是反身動詞。" },
        { h: "變化：多一個反身代名詞", tb: [["主詞", "反身代名詞", "se lever（起床）"], ["je", "me (m')", "je me lève"], ["tu", "te (t')", "tu te lèves"], ["il / elle / on", "se (s')", "il se lève"], ["nous", "nous", "nous nous levons"], ["vous", "vous", "vous vous levez"], ["ils / elles", "se (s')", "ils se lèvent"]],
          ex: [["Je me lève à sept heures.", "我七點起床。"], ["Tu t'appelles comment ?", "你叫什麼名字？"], ["Nous nous promenons.", "我們在散步。"]] },
        { h: "常用反身動詞", tb: [["動詞", "中文"], ["se réveiller", "醒來"], ["se lever", "起床"], ["se doucher / se laver", "淋浴／洗澡"], ["s'habiller", "穿衣服"], ["se coucher", "上床睡覺"], ["se dépêcher", "趕快"], ["s'amuser", "玩得開心"], ["se reposer", "休息"], ["s'intéresser à", "對…有興趣"]] },
        { h: "否定與搭配其他動詞", p: "否定：ne 放在反身代名詞前：Je **ne** me lève **pas**.\n接在其他動詞後面時，反身代名詞要跟主詞一致：Je vais **me** coucher. Nous devons **nous** dépêcher.",
          ex: [["Je ne me lève pas tôt le dimanche.", "星期天我不早起。"], ["Je vais me coucher.", "我要去睡了。"]],
          tip: "複合過去式用 **être**：Je **me suis** levé(e) à sept heures（見第 16 章）。" }
    ],
    ex: [
        ["c", "Je ___ lève à sept heures.", ["me", "se", "te"], 0, "我七點起床。"],
        ["c", "Nous ___ promenons.", ["nous", "se", "vous"], 0, "我們在散步。"],
        ["c", "Ils ___ couchent tard.", ["se", "me", "leur"], 0, "他們很晚睡。"],
        ["o", "Je / ne / me / lève / pas / tôt", "我不早起。"],
        ["f", "Tu ___ appelles comment ?", "t'", "你叫什麼名字？"],
        ["f", "Je vais ___ coucher.", "me", "我要去睡了。"]
    ]
},
{
    id: "fg-near", level: "A1", title: "近未來、近過去、進行中", sub: "aller + 原形、venir de + 原形",
    lessons: ["a1-16"],
    body: [
        { h: "近未來：aller + 原形", p: "「等一下要／打算要…」，口語中最常用的未來說法。",
          ex: [["Je vais manger.", "我要去吃飯了。"], ["Il va pleuvoir.", "快下雨了。"], ["Nous allons voyager en été.", "我們夏天要去旅行。"]] },
        { h: "近過去：venir de + 原形", p: "「剛剛…」",
          ex: [["Je viens de manger.", "我剛吃完。"], ["Le train vient de partir.", "火車剛開走。"]] },
        { h: "正在：être en train de + 原形", p: "強調「此刻正在做」。一般情況用現在式就夠了。",
          ex: [["Je suis en train de travailler.", "我正在工作。"]] },
        { h: "三者對照", tb: [["時間", "結構", "例子"], ["剛剛", "venir de + 原形", "Je viens de finir."], ["正在", "être en train de + 原形", "Je suis en train de finir."], ["等一下", "aller + 原形", "Je vais finir."]],
          tip: "否定時 ne … pas 夾住 aller：Je **ne** vais **pas** venir。" }
    ],
    ex: [
        ["c", "Il ___ pleuvoir.", ["va", "vient de", "est"], 0, "快下雨了。"],
        ["c", "Je ___ manger, je n'ai pas faim.", ["viens de", "vais", "suis en train de"], 0, "我剛吃過，不餓。"],
        ["f", "Nous ___ voyager en juillet.", "allons", "我們七月要去旅行。"],
        ["o", "Je / ne / vais / pas / venir", "我不會來。"],
        ["t", "火車剛開走。", ["Le train vient de partir."]]
    ]
},
// ---------------- A2 ----------------
{
    id: "fg-pc", level: "A2", title: "複合過去式", sub: "avoir / être + 過去分詞",
    lessons: ["a2-01", "a2-02"],
    body: [
        { h: "用途", p: "表示**過去完成的動作**，相當於中文的「了、過」：J'ai mangé（我吃了）、Il est parti（他走了）。" },
        { h: "結構：助動詞現在式 + 過去分詞", p: "大部分動詞用 **avoir** 當助動詞。",
          tb: [["主詞", "avoir", "過去分詞"], ["j'", "ai", "mangé"], ["tu", "as", "mangé"], ["il / elle", "a", "mangé"], ["nous", "avons", "mangé"], ["vous", "avez", "mangé"], ["ils / elles", "ont", "mangé"]] },
        { h: "過去分詞怎麼變", tb: [["動詞", "規則", "例子"], ["-er", "→ -é", "parler → parlé"], ["-ir（finir 型）", "→ -i", "finir → fini"], ["-re（vendre 型）", "→ -u", "vendre → vendu"], ["不規則", "要背", "être → été、avoir → eu、faire → fait、prendre → pris、voir → vu、boire → bu、lire → lu、écrire → écrit、mettre → mis、ouvrir → ouvert、pouvoir → pu、vouloir → voulu、devoir → dû"]] },
        { h: "用 être 的動詞", p: "少數表示**移動或狀態改變**的動詞，以及**所有反身動詞**，用 **être** 當助動詞。常用的可以想成一間房子：進出、上下、來去、生死。",
          tb: [["動詞", "過去分詞", "動詞", "過去分詞"], ["aller 去", "allé", "venir 來", "venu"], ["arriver 到達", "arrivé", "partir 離開", "parti"], ["entrer 進入", "entré", "sortir 出去", "sorti"], ["monter 上", "monté", "descendre 下", "descendu"], ["naître 出生", "né", "mourir 死", "mort"], ["rester 留下", "resté", "tomber 跌倒", "tombé"], ["retourner 回去", "retourné", "devenir 變成", "devenu"]] },
        { h: "être 時過去分詞要配合主詞", p: "用 être 時，過去分詞像形容詞一樣配合主詞：女性加 **-e**，複數加 **-s**。",
          ex: [["Il est allé à Paris.", "他去了巴黎。"], ["Elle est allée à Paris.", "她去了巴黎。"], ["Nous sommes arrivés hier.", "我們昨天到的。"], ["Elles se sont levées tôt.", "她們很早就起床了。"]],
          tip: "用 avoir 時**不**配合主詞：Elle a mangé（不是 mangée）。", warn: true },
        { h: "否定與副詞位置", p: "ne … pas 夾住**助動詞**：Je **n'**ai **pas** vu ce film.\n短副詞放在助動詞和過去分詞中間：J'ai **bien** dormi. Il a **déjà** mangé.",
          ex: [["Je n'ai pas vu ce film.", "我沒看過這部電影。"], ["J'ai bien dormi.", "我睡得很好。"]] }
    ],
    ex: [
        ["c", "Hier, j'___ regardé un film.", ["ai", "suis", "a"], 0, "昨天我看了一部電影。"],
        ["c", "Elle est ___ au marché.", ["allée", "allé", "allés"], 0, "她去了市場。"],
        ["c", "Nous ___ partis à huit heures.", ["sommes", "avons", "sont"], 0, "我們八點出發。"],
        ["c", "J'ai ___ une lettre.", ["écrit", "écrivé", "écri"], 0, "我寫了一封信。"],
        ["f", "Tu as ___ ton café ?（boire）", "bu", "你喝完咖啡了嗎？"],
        ["f", "Ils ont ___ le train.（prendre）", "pris", "他們搭了火車。"],
        ["o", "Je / n' / ai / pas / vu / ce / film", "我沒看過這部電影。"],
        ["t", "她昨天到的。", ["Elle est arrivée hier."]]
    ]
},
{
    id: "fg-imparfait", level: "A2", title: "未完成過去式與兩種過去式的差別", sub: "imparfait vs passé composé",
    lessons: ["a2-03", "a2-04"],
    body: [
        { h: "構成", p: "取 **nous** 的現在式去掉 -ons 當字根，加上 **-ais、-ais、-ait、-ions、-iez、-aient**。唯一例外是 être（字根 ét-）。",
          tb: [["主詞", "parler（nous parlons）", "faire（nous faisons）", "être"], ["je", "parlais", "faisais", "étais"], ["tu", "parlais", "faisais", "étais"], ["il / elle", "parlait", "faisait", "était"], ["nous", "parlions", "faisions", "étions"], ["vous", "parliez", "faisiez", "étiez"], ["ils / elles", "parlaient", "faisaient", "étaient"]],
          tip: "-ais、-ait、-aient 三個唸法相同（都唸 ɛ）。" },
        { h: "未完成過去式的用途", p: "描述過去的**背景、狀態、習慣**——像電影裡的佈景：\n· 天氣、時間、年齡、感覺：Il faisait beau. J'avais dix ans.\n· 過去的習慣（以前常常）：Quand j'étais petit, je jouais au foot.\n· 正在進行的動作（被打斷的那個）：Je dormais quand…",
          ex: [["Quand j'étais petit, j'habitais à Tainan.", "我小時候住在台南。"], ["Il faisait froid et il pleuvait.", "那時天氣很冷，還下著雨。"], ["Avant, je fumais.", "我以前抽菸。"]] },
        { h: "怎麼選：佈景 vs 事件", p: "**複合過去式**＝發生了什麼事（一次性、完成、推進劇情）\n**未完成過去式**＝當時的情況（背景、持續、習慣）",
          tb: [["複合過去式 passé composé", "未完成過去式 imparfait"], ["一次完成的動作", "持續的狀態"], ["Hier, j'ai mangé une pizza.", "Avant, je mangeais souvent des pizzas."], ["突然發生的事", "當時正在做的事"], ["Le téléphone a sonné…", "…pendant que je dormais."], ["有明確次數或期間", "沒有明確結束"], ["J'ai vécu trois ans à Lyon.", "Je vivais à Lyon à l'époque."]],
          ex: [["Je regardais la télé quand mon frère est arrivé.", "我正在看電視的時候，我哥到了。"], ["Il pleuvait, alors nous sommes restés à la maison.", "那時在下雨，所以我們待在家。"]] },
        { h: "常見提示詞", tb: [["傾向複合過去式", "傾向未完成過去式"], ["hier、soudain（突然）、un jour", "souvent、tous les jours、d'habitude"], ["une fois、trois fois", "quand j'étais petit、autrefois"], ["pendant deux ans（明確期間）", "à cette époque、avant"]] }
    ],
    ex: [
        ["c", "Quand j'étais petit, je ___ au foot.", ["jouais", "ai joué", "joue"], 0, "我小時候常踢足球。"],
        ["c", "Soudain, le téléphone ___ .", ["a sonné", "sonnait", "sonne"], 0, "突然電話響了。"],
        ["c", "Il ___ beau hier.", ["faisait", "a fait", "fait"], 0, "昨天天氣很好。（描述）"],
        ["c", "Je dormais quand tu ___ .", ["as appelé", "appelais", "appelles"], 0, "你打來的時候我正在睡覺。"],
        ["f", "Nous ___ à Lyon à cette époque.（habiter）", "habitions", "那時我們住在里昂。"],
        ["f", "Elle ___ dix ans.（avoir，當時）", "avait", "她那時十歲。"],
        ["t", "那時在下雨。", ["Il pleuvait."]]
    ]
},
{
    id: "fg-object-pronouns", level: "A2", title: "受詞代名詞", sub: "le / la / les、lui / leur 與位置",
    lessons: ["a2-05", "a2-06", "b1-09"],
    body: [
        { h: "直接受詞與間接受詞", p: "**直接受詞**：動詞後面直接接的東西：Je vois **Marie**.\n**間接受詞**：動詞後面要加 **à** 的「人」：Je parle **à Marie**.\n要代替它們時，用不同的代名詞。" },
        { h: "代名詞一覽", tb: [["人稱", "直接受詞", "間接受詞"], ["我", "me (m')", "me (m')"], ["你", "te (t')", "te (t')"], ["他／它（陽）", "le (l')", "lui"], ["她／它（陰）", "la (l')", "lui"], ["我們", "nous", "nous"], ["您；你們", "vous", "vous"], ["他們／它們", "les", "leur"]],
          tip: "只有第三人稱不一樣：直接 le / la / les，間接 **lui / leur**。lui 男女通用。" },
        { h: "位置：放在動詞前面", p: "和中文、英文不同，受詞代名詞放在**動詞前面**：",
          ex: [["Tu vois Marie ? — Oui, je la vois.", "你看到瑪麗了嗎？——有，我看到她了。"], ["Je parle à Paul. → Je lui parle.", "我跟保羅說話 → 我跟他說話。"], ["Je ne le connais pas.", "我不認識他。"], ["Je vais les acheter.", "我要買它們。（接在原形前）"]] },
        { h: "常用間接受詞動詞（+ à + 人）", p: "這些動詞的「人」用 lui / leur：parler à、téléphoner à、répondre à、demander à、donner à、écrire à、dire à、offrir à、plaire à。",
          ex: [["Je lui téléphone ce soir.", "我今晚打電話給他／她。"], ["Tu leur as répondu ?", "你回覆他們了嗎？"]],
          tip: "中文說「打電話給他」，法文 téléphoner 要用間接受詞 **lui**，不是 le。", warn: true },
        { h: "複合過去式與命令式", p: "複合過去式：代名詞放在**助動詞前**：Je **l'**ai vu. 若是直接受詞且在前面，過去分詞要配合：Ces photos ? Je **les** ai pris**es**.\n肯定命令式：代名詞放在動詞**後面**，用連字號，me 變 moi：Regarde-**le** ! Donne-**moi** ça !",
          ex: [["Je l'ai vue hier.", "我昨天看到她了。"], ["Aide-moi !", "幫我！"], ["Ne le regarde pas !", "別看他！（否定命令放前面）"]] },
        { h: "兩個代名詞同時出現", p: "順序：**me / te / nous / vous → le / la / les → lui / leur → y → en**",
          ex: [["Il me le donne.", "他把它給我。"], ["Je le lui ai dit.", "我已經跟他說了（這件事）。"]] }
    ],
    ex: [
        ["c", "Tu connais Marie ? — Oui, je ___ connais.", ["la", "lui", "le"], 0, "你認識瑪麗嗎？——認識。"],
        ["c", "Je parle à mes parents. → Je ___ parle.", ["leur", "les", "lui"], 0, "我跟爸媽說話。"],
        ["c", "Tu as vu le film ? — Oui, je ___ ai vu.", ["l'", "le", "lui"], 0, "你看了那部電影嗎？——看了。"],
        ["c", "Il téléphone à Léa. → Il ___ téléphone.", ["lui", "la", "le"], 0, "他打電話給蕾雅。"],
        ["o", "Je / ne / le / connais / pas", "我不認識他。"],
        ["f", "Aide-___ !（我）", "moi", "幫我！"],
        ["t", "我要買它們。", ["Je vais les acheter."]]
    ]
},
{
    id: "fg-y-en", level: "A2", title: "代名詞 y 與 en", sub: "代替地點、à + 東西、數量",
    lessons: ["a2-07"],
    body: [
        { h: "y：那裡；à + 東西", p: "**y** 代替：\n1. 地點（à / en / chez / dans… + 地方）：Tu vas à Paris ? — Oui, j'**y** vais.\n2. à + 東西或想法：Tu penses à ton examen ? — Oui, j'**y** pense.",
          ex: [["On y va !", "走吧！（字面：我們去那裡）"], ["J'y habite depuis dix ans.", "我在那裡住了十年。"], ["Je n'y crois pas.", "我不相信（這件事）。"]] },
        { h: "en：一些；de + 東西", p: "**en** 代替：\n1. 部分冠詞或不定冠詞 + 名詞（du、de la、des、un…）：Tu veux du café ? — Oui, j'**en** veux.\n2. 數量（後面保留數字或數量詞）：Tu as des frères ? — J'**en** ai **deux**.\n3. de + 東西：Tu parles de ton voyage ? — Oui, j'**en** parle.",
          ex: [["Des pommes ? J'en achète un kilo.", "蘋果？我買一公斤。"], ["Il y en a trois.", "有三個。"], ["Je n'en ai pas.", "我沒有。"], ["J'en ai besoin.", "我需要它。"]],
          tip: "用 en 代替數量時，數字要留著：J'en ai **deux**（不能只說 j'en ai）。" },
        { h: "位置", p: "和其他受詞代名詞一樣放在動詞前；兩者同時出現時 **y 在 en 前**：Il **y en** a beaucoup（那裡有很多）。" }
    ],
    ex: [
        ["c", "Tu vas au cinéma ? — Oui, j'___ vais.", ["y", "en", "le"], 0, "你去電影院嗎？——去。"],
        ["c", "Tu as des enfants ? — Oui, j'___ ai deux.", ["en", "y", "les"], 0, "你有小孩嗎？——有兩個。"],
        ["c", "Tu penses à tes vacances ? — Oui, j'___ pense.", ["y", "en", "lui"], 0, ""],
        ["c", "Il ___ a beaucoup.", ["y en", "en y", "y"], 0, "那裡有很多。"],
        ["f", "On ___ va !", "y", "走吧！"],
        ["t", "我沒有。", ["Je n'en ai pas."]]
    ]
},
{
    id: "fg-futur", level: "A2", title: "簡單未來式", sub: "將來會…",
    lessons: ["a2-09"],
    body: [
        { h: "構成：原形 + 字尾", p: "大部分動詞用**原形**當字根（-re 動詞去掉 e），加上 **-ai、-as、-a、-ons、-ez、-ont**（就是 avoir 的現在式）。",
          tb: [["主詞", "parler", "finir", "prendre"], ["je", "parlerai", "finirai", "prendrai"], ["tu", "parleras", "finiras", "prendras"], ["il / elle", "parlera", "finira", "prendra"], ["nous", "parlerons", "finirons", "prendrons"], ["vous", "parlerez", "finirez", "prendrez"], ["ils / elles", "parleront", "finiront", "prendront"]] },
        { h: "不規則字根（要背）", p: "字尾一樣，只有字根特別：",
          tb: [["原形", "字根", "原形", "字根"], ["être", "ser-", "avoir", "aur-"], ["aller", "ir-", "faire", "fer-"], ["venir", "viendr-", "voir", "verr-"], ["pouvoir", "pourr-", "vouloir", "voudr-"], ["devoir", "devr-", "savoir", "saur-"], ["falloir", "il faudra", "pleuvoir", "il pleuvra"]] },
        { h: "簡單未來 vs 近未來", p: "**近未來**（aller + 原形）：口語、很快要發生、已經確定的計畫。\n**簡單未來**：較遠的未來、預測、承諾、書面語。",
          ex: [["Demain, il fera beau.", "明天天氣會很好。"], ["Je t'appellerai ce soir.", "我今晚會打給你。"], ["Un jour, j'irai au Japon.", "總有一天我會去日本。"]] },
        { h: "quand + 未來", p: "中文說「我到了的時候會打給你」，法文 quand 後面如果是未來的事，也要用**未來式**（英文用現在式，法文不行）。",
          ex: [["Quand j'arriverai, je t'appellerai.", "我到的時候會打給你。"]], tip: "Quand j'arrive, je t'appellerai 在書面語是錯的，要用 j'**arriverai**。", warn: true }
    ],
    ex: [
        ["c", "Demain, il ___ beau.", ["fera", "faira", "fait"], 0, "明天天氣會很好。"],
        ["c", "Nous ___ en France l'année prochaine.", ["irons", "allerons", "irez"], 0, "我們明年會去法國。"],
        ["c", "Quand tu ___ , appelle-moi.", ["arriveras", "arrives", "arrivais"], 0, "你到的時候打給我。"],
        ["f", "Je ___ ce soir.（venir）", "viendrai", "我今晚會來。"],
        ["f", "Tu ___ le temps ?（avoir）", "auras", "你會有時間嗎？"],
        ["t", "我會打給你。", ["Je t'appellerai."]]
    ]
},
{
    id: "fg-comparison", level: "A2", title: "比較級與最高級", sub: "plus、moins、aussi；le plus…",
    lessons: ["a2-08"],
    body: [
        { h: "形容詞、副詞的比較", tb: [["意思", "結構", "例子"], ["比較…", "plus + 形容詞 + que", "Paul est plus grand que moi."], ["比較不…", "moins + 形容詞 + que", "Ce film est moins long que l'autre."], ["一樣…", "aussi + 形容詞 + que", "Elle est aussi sympa que sa sœur."]],
          tip: "que 後面的人稱要用強調形：plus grand que **moi / toi / lui / elle**（不是 je、tu）。" },
        { h: "名詞與動詞的比較", p: "名詞：**plus de / moins de / autant de** + 名詞 + que\n動詞：動詞 + **plus / moins / autant** + que",
          ex: [["J'ai plus de livres que toi.", "我的書比你多。"], ["Il travaille autant que moi.", "他工作和我一樣多。"]] },
        { h: "最高級", p: "**le / la / les + plus / moins + 形容詞**（+ de + 範圍）。形容詞放名詞後時，冠詞要重複一次。",
          ex: [["C'est la plus belle ville du monde.", "這是世界上最美的城市。"], ["C'est le restaurant le plus cher de Paris.", "這是巴黎最貴的餐廳。"]] },
        { h: "不規則", tb: [["原形", "比較級", "最高級"], ["bon（好的）", "meilleur(e)", "le / la meilleur(e)"], ["bien（好地）", "mieux", "le mieux"], ["mauvais（壞的）", "plus mauvais / pire", "le pire"]],
          ex: [["Ce gâteau est meilleur que l'autre.", "這個蛋糕比另一個好吃。"], ["Elle chante mieux que moi.", "她唱得比我好。"]],
          tip: "不能說 plus bon，要說 **meilleur**；不能說 plus bien，要說 **mieux**。", warn: true }
    ],
    ex: [
        ["c", "Paris est ___ grand que Lyon.", ["plus", "plus de", "le plus"], 0, "巴黎比里昂大。"],
        ["c", "Ce vin est ___ que l'autre.", ["meilleur", "plus bon", "mieux"], 0, "這瓶酒比另一瓶好。"],
        ["c", "Elle parle ___ que moi.", ["mieux", "meilleur", "plus bien"], 0, "她說得比我好。"],
        ["c", "J'ai ___ temps que toi.", ["moins de", "moins", "moins que"], 0, "我的時間比你少。"],
        ["f", "C'est la ___ belle ville du monde.", "plus", "這是世界上最美的城市。"],
        ["t", "他和我一樣高。", ["Il est aussi grand que moi."]]
    ]
},
{
    id: "fg-relative", level: "A2", title: "關係代名詞（一）", sub: "qui、que、où",
    lessons: ["a2-11"],
    body: [
        { h: "把兩句連成一句", p: "中文用「的」：「我讀的書」「住在巴黎的朋友」。法文用關係代名詞把說明放在名詞**後面**。" },
        { h: "qui：後面缺主詞", p: "qui 在關係子句裡當**主詞**，後面直接接動詞。",
          ex: [["J'ai un ami qui habite à Paris.", "我有一個住在巴黎的朋友。"], ["C'est la femme qui parle chinois.", "就是那位會說中文的女士。"]] },
        { h: "que：後面缺受詞", p: "que 在關係子句裡當**受詞**，後面接主詞 + 動詞。母音前寫成 **qu'**。",
          ex: [["Le livre que je lis est intéressant.", "我在讀的書很有趣。"], ["C'est le film qu'il préfère.", "那是他最喜歡的電影。"]] },
        { h: "où：地點與時間", p: "où 代替地點，也可以代替時間（le jour où…）。",
          ex: [["La ville où j'habite est petite.", "我住的城市很小。"], ["Le jour où je suis arrivé, il pleuvait.", "我到的那天在下雨。"]] },
        { h: "判斷技巧", p: "看關係代名詞**後面**：\n· 直接接動詞 → **qui**\n· 接主詞（je、il、Paul…）→ **que**\n· 指地方或時間 → **où**",
          tip: "que + 複合過去式時，過去分詞要配合前面的名詞：La robe **que** j'ai achet**ée**.", warn: false }
    ],
    ex: [
        ["c", "C'est l'homme ___ habite ici.", ["qui", "que", "où"], 0, "就是住在這裡的那個男人。"],
        ["c", "Le film ___ j'ai vu est super.", ["que", "qui", "où"], 0, "我看的那部電影很棒。"],
        ["c", "La ville ___ je suis né est belle.", ["où", "que", "qui"], 0, "我出生的城市很美。"],
        ["c", "C'est le livre ___ il préfère.", ["qu'", "qui", "où"], 0, "那是他最喜歡的書。"],
        ["f", "J'ai une sœur ___ travaille à Lyon.", "qui", "我有個在里昂工作的姊姊。"],
        ["t", "我住的城市很小。", ["La ville où j'habite est petite."]]
    ]
},
{
    id: "fg-imperative", level: "A2", title: "命令式", sub: "給指示、建議、邀請",
    lessons: ["a2-10"],
    body: [
        { h: "構成：去掉主詞", p: "只有 tu、nous、vous 三種，用現在式去掉主詞。**-er 動詞的 tu 形要去掉 -s**。",
          tb: [["", "parler", "finir", "venir"], ["(tu)", "parle !", "finis !", "viens !"], ["(nous)", "parlons !", "finissons !", "venons !"], ["(vous)", "parlez !", "finissez !", "venez !"]],
          ex: [["Écoute !", "聽著！"], ["Allons-y !", "我們走吧！"], ["Prenez la deuxième rue à droite.", "請走右邊第二條路。"]] },
        { h: "不規則", tb: [["", "être", "avoir", "savoir", "vouloir"], ["(tu)", "sois", "aie", "sache", "veuille"], ["(nous)", "soyons", "ayons", "sachons", "—"], ["(vous)", "soyez", "ayez", "sachez", "veuillez"]],
          ex: [["Sois sage !", "要乖喔！"], ["N'aie pas peur.", "別怕。"], ["Veuillez patienter.", "請稍候。（正式）"]] },
        { h: "否定與代名詞", p: "否定：Ne + 動詞 + pas：**Ne** parle **pas** !\n肯定命令的代名詞放後面加連字號：Lève-**toi** ! Dis-**moi** !\n否定命令代名詞放前面：Ne **te** lève pas !",
          tip: "aller 的 tu 形是 va，但後面接 y 時要加 s：**Vas-y !**（去吧！）" }
    ],
    ex: [
        ["c", "（對朋友）___ !", ["Écoute", "Écoutes", "Écoutez"], 0, "聽著！"],
        ["c", "（對小孩）___ sage !", ["Sois", "Es", "Soit"], 0, "要乖喔！"],
        ["c", "___ -toi !", ["Lève", "Te lève", "Lèves"], 0, "起床！"],
        ["o", "Ne / parle / pas / si / vite", "別說那麼快。"],
        ["f", "___ -y !（aller，tu）", "Vas", "去吧！"],
        ["t", "別怕。", ["N'aie pas peur.", "N'ayez pas peur."]]
    ]
},
// ---------------- B1 ----------------
{
    id: "fg-conditional", level: "B1", title: "條件式與假設句", sub: "je voudrais、si j'avais…",
    lessons: ["b1-01", "b1-02", "b1-06"],
    body: [
        { h: "構成：未來式字根 + 未完成過去式字尾", p: "字根和簡單未來式相同（parler-、ser-、aur-、ir-…），字尾和未完成過去式相同（**-ais、-ais、-ait、-ions、-iez、-aient**）。",
          tb: [["主詞", "aimer", "être", "pouvoir"], ["je", "aimerais", "serais", "pourrais"], ["tu", "aimerais", "serais", "pourrais"], ["il / elle", "aimerait", "serait", "pourrait"], ["nous", "aimerions", "serions", "pourrions"], ["vous", "aimeriez", "seriez", "pourriez"], ["ils / elles", "aimeraient", "seraient", "pourraient"]] },
        { h: "用途一：禮貌", ex: [["Je voudrais un café.", "我想要一杯咖啡。"], ["Pourriez-vous m'aider ?", "您能幫我嗎？"], ["J'aimerais partir tôt.", "我想早點走。"]] },
        { h: "用途二：建議、傳聞", ex: [["Tu devrais te reposer.", "你應該休息一下。"], ["Il y aurait dix blessés.", "據說有十人受傷。（新聞用語）"]] },
        { h: "si 假設句的三種類型", tb: [["類型", "si 子句", "主要子句", "例子"], ["可能發生", "si + 現在式", "現在式／未來式／命令式", "S'il pleut, je resterai à la maison."], ["與現在事實相反", "si + 未完成過去式", "條件式", "Si j'avais de l'argent, je voyagerais."], ["與過去事實相反", "si + 愈過去式", "條件式過去時", "Si j'avais su, je serais venu."]],
          tip: "si 後面**絕對不能用條件式或未來式**：不能說 si j'aurais，要說 **si j'avais**。", warn: true },
        { h: "條件式過去時：後悔與責備", p: "**avoir / être 的條件式 + 過去分詞**：j'aurais dû（我早該）、tu aurais pu（你本來可以）。",
          ex: [["J'aurais dû partir plus tôt.", "我早該早點出門的。"], ["Tu aurais pu me prévenir !", "你本來可以先告訴我的！"]] }
    ],
    ex: [
        ["c", "Si j'avais le temps, je ___ .", ["voyagerais", "voyagerai", "voyageais"], 0, "如果我有時間，我會去旅行。"],
        ["c", "S'il pleut, nous ___ à la maison.", ["resterons", "resterions", "restions"], 0, "如果下雨，我們會待在家。"],
        ["c", "Si j'___ riche, j'achèterais une maison.", ["étais", "serais", "suis"], 0, "如果我有錢，我會買房子。"],
        ["c", "___ -vous m'aider ?", ["Pourriez", "Pouvriez", "Pourrez"], 0, "您能幫我嗎？（禮貌）"],
        ["f", "Tu ___ te reposer.（devoir，建議）", "devrais", "你應該休息一下。"],
        ["t", "我早該早點出門的。", ["J'aurais dû partir plus tôt."]]
    ]
},
{
    id: "fg-subjonctif", level: "B1", title: "虛擬式", sub: "il faut que、je veux que、bien que…",
    lessons: ["b1-03", "b1-04"],
    body: [
        { h: "什麼時候用", p: "虛擬式不是時態，而是一種「語氣」：表達**主觀**的東西——必要、願望、情緒、懷疑。它幾乎總是出現在 **que** 後面的子句。" },
        { h: "構成", p: "取 **ils** 的現在式去掉 -ent 當字根，加 **-e、-es、-e、-ions、-iez、-ent**。nous、vous 和未完成過去式長得一樣。",
          tb: [["主詞", "parler（ils parlent）", "finir（ils finissent）", "prendre（ils prennent）"], ["que je", "parle", "finisse", "prenne"], ["que tu", "parles", "finisses", "prennes"], ["qu'il / elle", "parle", "finisse", "prenne"], ["que nous", "parlions", "finissions", "prenions"], ["que vous", "parliez", "finissiez", "preniez"], ["qu'ils / elles", "parlent", "finissent", "prennent"]] },
        { h: "不規則（最常用）", tb: [["原形", "que je", "que nous"], ["être", "sois", "soyons"], ["avoir", "aie", "ayons"], ["aller", "aille", "allions"], ["faire", "fasse", "fassions"], ["pouvoir", "puisse", "puissions"], ["savoir", "sache", "sachions"], ["vouloir", "veuille", "voulions"]] },
        { h: "常見觸發詞", tb: [["類別", "例子"], ["必要", "il faut que、il est important que"], ["願望、要求", "je veux que、je voudrais que、je souhaite que"], ["情緒", "je suis content que、j'ai peur que、c'est dommage que"], ["懷疑、否定的看法", "je doute que、je ne pense pas que"], ["連接詞", "pour que（為了）、bien que（雖然）、avant que（在…之前）、à condition que（只要）"]],
          ex: [["Il faut que tu viennes.", "你一定要來。"], ["Je veux que vous soyez heureux.", "我希望你們幸福。"], ["Je suis contente que tu sois là.", "我很高興你在這裡。"], ["Bien qu'il soit fatigué, il travaille.", "雖然他很累，他還是在工作。"]] },
        { h: "注意：主詞相同時用原形", p: "兩個子句主詞相同時不用 que + 虛擬式，改用**原形**：Je veux **partir**（我想走），不說 je veux que je parte。\n**je pense que / je crois que**（肯定）後面用**直陳式**：Je pense qu'il **est** là。否定才用虛擬式：Je ne pense pas qu'il **soit** là。",
          tip: "**espérer que** 後面用直陳式（不是虛擬式）：J'espère que tu **vas** bien。", warn: true }
    ],
    ex: [
        ["c", "Il faut que tu ___ .", ["viennes", "viens", "viendras"], 0, "你一定要來。"],
        ["c", "Je veux que vous ___ heureux.", ["soyez", "êtes", "serez"], 0, "我希望你們幸福。"],
        ["c", "Je pense qu'il ___ raison.", ["a", "ait", "aie"], 0, "我認為他是對的。"],
        ["c", "Je ne pense pas qu'il ___ raison.", ["ait", "a", "aura"], 0, "我不認為他是對的。"],
        ["c", "J'espère que tu ___ bien.", ["vas", "ailles", "aille"], 0, "希望你一切都好。"],
        ["f", "Bien qu'il ___ fatigué, il travaille.（être）", "soit", "雖然他很累，他還是在工作。"],
        ["f", "Il faut que je ___ mes devoirs.（faire）", "fasse", "我得寫功課。"]
    ]
},
{
    id: "fg-pqp-reported", level: "B1", title: "愈過去式與間接引語", sub: "時態往前推",
    lessons: ["b1-05", "b1-10"],
    body: [
        { h: "愈過去式：過去的過去", p: "**avoir / être 的未完成過去式 + 過去分詞**。表示在另一個過去動作**之前**就已經完成的事。",
          ex: [["Quand je suis arrivé, le film avait commencé.", "我到的時候，電影已經開始了。"], ["Elle était déjà partie.", "她那時已經走了。"]] },
        { h: "間接引語：轉述別人的話", p: "Il dit : « Je suis fatigué. » → Il dit **qu'il est** fatigué.\n引述動詞是**現在式**時，時態不變，只改人稱。\n引述動詞是**過去式**（il a dit、il disait）時，時態要往前推：",
          tb: [["直接引語", "間接引語（過去）"], ["現在式 « Je suis malade. »", "未完成過去式 Il a dit qu'il était malade."], ["複合過去式 « J'ai fini. »", "愈過去式 Il a dit qu'il avait fini."], ["未來式 « Je viendrai. »", "條件式 Il a dit qu'il viendrait."], ["近未來 « Je vais partir. »", "allait + 原形 Il a dit qu'il allait partir."]] },
        { h: "問句與命令的轉述", tb: [["直接", "間接"], ["« Tu viens ? »", "Il demande si je viens."], ["« Où vas-tu ? »", "Il demande où je vais."], ["« Qu'est-ce que tu fais ? »", "Il demande ce que je fais."], ["« Ferme la porte ! »", "Il me dit de fermer la porte."]],
          tip: "時間詞也要改：demain → le lendemain、hier → la veille、aujourd'hui → ce jour-là。" }
    ],
    ex: [
        ["c", "Quand je suis arrivé, il ___ parti.", ["était", "est", "a"], 0, "我到的時候他已經走了。"],
        ["c", "Il a dit qu'il ___ malade.", ["était", "est", "sera"], 0, "他說他生病了。"],
        ["c", "Elle a dit qu'elle ___ demain.", ["viendrait", "viendra", "vient"], 0, "她說她隔天會來。"],
        ["c", "Il me demande ___ je fais.", ["ce que", "qu'est-ce que", "que"], 0, "他問我在做什麼。"],
        ["f", "Il demande ___ je viens.", "si", "他問我來不來。"],
        ["t", "他說他已經做完了。", ["Il a dit qu'il avait fini."]]
    ]
},
{
    id: "fg-relative2", level: "B1", title: "關係代名詞（二）", sub: "dont、ce qui、ce que、lequel",
    lessons: ["b1-07", "b1-08"],
    body: [
        { h: "dont：代替 de + 名詞", p: "動詞或片語本身要接 **de** 時用 dont：parler de、avoir besoin de、se souvenir de、être fier de……也可以表示所屬（…的）。",
          ex: [["Le livre dont je parle est épuisé.", "我說的那本書賣完了。（parler de）"], ["C'est l'outil dont j'ai besoin.", "這是我需要的工具。（avoir besoin de）"], ["Une amie dont le père est médecin.", "一位爸爸是醫生的朋友。"]] },
        { h: "ce qui、ce que：「…的事／東西」", p: "沒有明確的先行詞時用 **ce qui**（當主詞）、**ce que**（當受詞），相當於英文的 what。",
          ex: [["Ce qui est important, c'est la santé.", "重要的是健康。"], ["Dis-moi ce que tu veux.", "告訴我你想要什麼。"], ["Je ne sais pas ce qu'il pense.", "我不知道他在想什麼。"]] },
        { h: "介系詞 + lequel / qui", p: "介系詞（avec、pour、dans、sur…）後面：指人用 **qui**，指東西用 **lequel**（配合陰陽性單複數：lequel、laquelle、lesquels、lesquelles）。和 à、de 合併：auquel、duquel…",
          tb: [["", "陽性", "陰性"], ["單數", "lequel", "laquelle"], ["複數", "lesquels", "lesquelles"], ["à +", "auquel / auxquels", "à laquelle / auxquelles"]],
          ex: [["La personne avec qui je travaille est sympa.", "和我一起工作的人很好。"], ["La raison pour laquelle je suis venu…", "我來的原因……"], ["Le projet auquel je pense…", "我在想的那個計畫……"]] }
    ],
    ex: [
        ["c", "C'est le film ___ tout le monde parle.", ["dont", "que", "où"], 0, "這就是大家在談的電影。"],
        ["c", "___ me plaît, c'est le calme.", ["Ce qui", "Ce que", "Qui"], 0, "我喜歡的是寧靜。"],
        ["c", "Je comprends ___ tu dis.", ["ce que", "ce qui", "que"], 0, "我懂你說的。"],
        ["c", "La raison pour ___ il est parti…", ["laquelle", "lequel", "qui"], 0, "他離開的原因……"],
        ["f", "C'est l'outil ___ j'ai besoin.", "dont", "這是我需要的工具。"],
        ["t", "告訴我你想要什麼。", ["Dis-moi ce que tu veux.", "Dites-moi ce que vous voulez."]]
    ]
},
{
    id: "fg-passive", level: "B1", title: "被動語態與副動詞", sub: "être + 過去分詞；en + -ant",
    lessons: ["b1-11", "b1-12"],
    body: [
        { h: "被動語態", p: "**être（任何時態）+ 過去分詞**，過去分詞配合主詞；做動作的人用 **par** 引出。",
          tb: [["主動", "被動"], ["Le chef prépare le repas.", "Le repas est préparé par le chef."], ["On a construit ce pont en 1900.", "Ce pont a été construit en 1900."], ["La police arrêtera le voleur.", "Le voleur sera arrêté par la police."]],
          tip: "法文其實比較少用被動，口語常用 **on** 代替：On parle français ici（這裡說法語）。" },
        { h: "副動詞：en + 現在分詞", p: "現在分詞 = nous 的現在式去掉 -ons 加 **-ant**（parlant、finissant、faisant）。例外：étant、ayant、sachant。\n**en + -ant** 表示「一邊…一邊」「藉由…」「在…的時候」，主詞必須和主要子句相同。",
          ex: [["Il chante en marchant.", "他邊走邊唱。"], ["C'est en forgeant qu'on devient forgeron.", "熟能生巧。（打鐵才能成為鐵匠）"], ["En arrivant, j'ai vu Paul.", "我到的時候看到了保羅。"]] }
    ],
    ex: [
        ["c", "Ce pont a été ___ en 1900.", ["construit", "construire", "construisant"], 0, "這座橋建於 1900 年。"],
        ["c", "La lettre est écrite ___ Marie.", ["par", "de", "pour"], 0, "這封信是瑪麗寫的。"],
        ["c", "Il chante en ___ .", ["marchant", "marché", "marcher"], 0, "他邊走邊唱。"],
        ["f", "En ___ , j'ai vu Paul.（arriver）", "arrivant", "我到的時候看到保羅。"],
        ["t", "這裡說法語。", ["On parle français ici.", "Ici, on parle français."]]
    ]
}
];
