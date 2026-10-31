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
        { h: "形容詞和副詞的位置", p: "中文的形容詞放在名詞前（紅色的車），法文大多放在**後面**：une voiture **rouge**。只有少數短又常用的形容詞放前面（petit、grand、bon、beau…，「形容詞的配合與位置」一章詳細說）。",
          ex: [["une voiture rouge", "一輛紅色的車"], ["un petit café", "一家小咖啡館"], ["Il parle très bien.", "他說得很好。"]] },
        { h: "怎麼把句子變成否定、問句", p: "否定：把 **ne … pas** 夾住動詞：Je **ne** parle **pas** anglais.\n問句：口語最簡單，句尾語調上揚：Tu parles anglais ? ↗\n細節在「否定句」和「問句」兩章。",
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
        { h: "縮合", p: "à / de + le / les 要合併成一個字（見「冠詞」一章）：**au、aux、du、des**。" },
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
          tip: "否定句裡 un / une / du / des 要變成 **de**（見「冠詞」一章）：Je n'ai pas **de** voiture。", warn: true }
    ],
    ex: [
        ["o", "Je / ne / parle / pas / allemand", "我不說德文。"],
        ["c", "Il ___ aime pas le café.", ["n'", "ne", "pas"], 0, "他不喜歡咖啡。"],
        ["c", "Je n'ai ___ mangé.", ["pas", "ne", "rien pas"], 0, "我還沒吃。"],
        ["c", "Je ne fume ___.", ["jamais", "personne", "rien"], 0, "我從不抽菸。"],
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
        ["c", "Elle est ___.", ["heureuse", "heureux", "heureuxe"], 0, "她很幸福。"],
        ["c", "un ___ ami", ["nouvel", "nouveau", "nouvelle"], 0, "一位新朋友"],
        ["c", "J'ai une voiture ___.", ["japonaise", "japonais", "japonaises"], 0, "我有一輛日本車。"],
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
    id: "fg-numbers", level: "A1", title: "數字、時間與日期", sub: "0 到一百萬、幾點、星期與日期",
    lessons: ["a1-03", "a1-08"],
    body: [
        { h: "0–16：要直接背", p: "0 到 16 每個都是獨立的字，沒有規律，一定要背熟。17 以後就開始用組合的。",
          tb: [["數字", "法文", "數字", "法文"], ["0", "zéro", "9", "neuf"], ["1", "un / une", "10", "dix"], ["2", "deux", "11", "onze"], ["3", "trois", "12", "douze"], ["4", "quatre", "13", "treize"], ["5", "cinq", "14", "quatorze"], ["6", "six", "15", "quinze"], ["7", "sept", "16", "seize"], ["8", "huit", "", ""]],
          tip: "**un** 會配合名詞：un livre、**une** table。其他數字不分陰陽性。", warn: false },
        { h: "17–69：組合起來", p: "17–19 是 **dix + 數字**，中間加連字號。20 以上：十位數 + 個位數，用連字號連起來；但個位數是 **1** 時用 **et un**（不加連字號）。",
          tb: [["數字", "法文", "規則"], ["17", "dix-sept", "10 + 7"], ["20", "vingt", ""], ["21", "vingt et un", "個位是 1：et un"], ["22", "vingt-deux", "連字號"], ["30", "trente", ""], ["31", "trente et un", ""], ["40", "quarante", ""], ["50", "cinquante", ""], ["60", "soixante", ""], ["69", "soixante-neuf", ""]],
          ex: [["J'ai vingt et un ans.", "我 21 歲。"], ["Il y a trente-cinq élèves.", "有 35 個學生。"]] },
        { h: "70–99：用加法和乘法", p: "這是法文數字最特別的地方，把它想成算式：\n**70 = 60 + 10**（soixante-dix），71 = 60 + 11（soixante **et** onze）\n**80 = 4 × 20**（quatre-vingt**s**），81 = 4 × 20 + 1（quatre-vingt-un，**沒有 et**）\n**90 = 4 × 20 + 10**（quatre-vingt-dix），99 = 4 × 20 + 19（quatre-vingt-dix-neuf）",
          tb: [["數字", "法文", "算式"], ["70", "soixante-dix", "60 + 10"], ["71", "soixante et onze", "60 + 11"], ["75", "soixante-quinze", "60 + 15"], ["80", "quatre-vingts", "4 × 20"], ["81", "quatre-vingt-un", "4 × 20 + 1"], ["90", "quatre-vingt-dix", "4 × 20 + 10"], ["91", "quatre-vingt-onze", "4 × 20 + 11"], ["99", "quatre-vingt-dix-neuf", "4 × 20 + 19"]],
          tip: "quatre-vingt**s** 只有剛好 80 時加 s，後面還有數字就不加：quatre-vingt-trois。比利時和瑞士說 septante（70）、nonante（90），在法國聽到不要嚇到，但自己說法國的版本就好。", warn: false },
        { h: "100 以上", p: "**cent**（100）、**mille**（1000）前面不加 un。cent 和 vingt 一樣：剛好是倍數時加 s（deux cent**s**），後面還有數字就不加（deux cent trois）。**mille 永遠不加 s**。**million** 是名詞，要加 s 並接 de：deux million**s de** personnes。",
          tb: [["數字", "法文"], ["100", "cent"], ["101", "cent un"], ["200", "deux cents"], ["250", "deux cent cinquante"], ["1 000", "mille"], ["2 000", "deux mille"], ["2026", "deux mille vingt-six"], ["1 000 000", "un million"]],
          tip: "法文寫數字的習慣和中文不同：千位用**空格**（1 000），小數點用**逗號**（3,5 = 三點五）。價格 2,50 € 唸 deux euros cinquante。", warn: false },
        { h: "數字的發音要注意", p: "**six、dix**：單獨說時尾音唸 [s]；接子音開頭的字時不唸（six livres）；接母音時唸 [z]（six‿ans）。\n**huit**：單獨時 t 要唸；接子音時常不唸（huit jours）。\n**neuf**：在 ans、heures 前唸成 [v]：neuf‿ans、neuf‿heures。\n**vingt**：單獨時 t 不唸；21–29 的 t 要唸（vingt-deux）。",
          ex: [["six", "六"], ["six livres", "六本書"], ["six ans", "六歲"], ["neuf heures", "九點"]] },
        { h: "序數：第一、第二…", p: "大多是**數字 + -ième**。「第一」最特別：**premier / première**（要配合陰陽性）。拼字小變化：cinq → cinq**u**ième、neuf → neu**v**ième；以 e 結尾的先去掉 e：quatre → quatrième。",
          tb: [["數字", "序數"], ["1", "premier / première"], ["2", "deuxième（或 second）"], ["3", "troisième"], ["4", "quatrième"], ["5", "cinquième"], ["9", "neuvième"], ["20", "vingtième"], ["21", "vingt et unième"]] },
        { h: "幾點：Il est … heure(s)", p: "問時間：**Quelle heure est-il ?** 或口語 **Il est quelle heure ?**\n回答一律用 **Il est + 數字 + heure(s)**，一點用單數 **une heure**。\n**et quart**（一刻）、**et demie**（半）、**moins le quart**（差一刻）、**moins dix**（差十分）。**midi**（中午）、**minuit**（午夜）後面不加 heures。",
          tb: [["時間", "日常說法", "24 小時制（車站、節目）"], ["8:00", "huit heures", "huit heures"], ["8:15", "huit heures et quart", "huit heures quinze"], ["8:30", "huit heures et demie", "huit heures trente"], ["8:45", "neuf heures moins le quart", "huit heures quarante-cinq"], ["8:50", "neuf heures moins dix", "huit heures cinquante"], ["12:30", "midi et demi", "douze heures trente"], ["20:10", "huit heures dix (du soir)", "vingt heures dix"]],
          ex: [["Quelle heure est-il ? — Il est trois heures et demie.", "現在幾點？——三點半。"], ["Le train part à dix-huit heures quinze.", "火車 18:15 開。"]],
          tip: "「在幾點」用 **à**：**À quelle heure** commence le film ? — **À** vingt heures.（電影幾點開始？——晚上八點。）", warn: false },
        { h: "星期、月份與日期", p: "星期和月份都**小寫**、都是陽性。\n**lundi**：這個星期一（某一天）；**le lundi**：每個星期一（習慣）。\n日期：**le + 數字 + 月份**，一號說 **le premier**，其他直接用數字：le 2 mai（le deux mai）。\n月份前用 **en** 或 **au mois de**：en juillet。年份前用 **en**：en 2026。",
          tb: [["星期", "", "月份", ""], ["lundi", "星期一", "janvier, février, mars", "1–3 月"], ["mardi", "星期二", "avril, mai, juin", "4–6 月"], ["mercredi", "星期三", "juillet, août, septembre", "7–9 月"], ["jeudi", "星期四", "octobre, novembre, décembre", "10–12 月"], ["vendredi", "星期五", "", ""], ["samedi, dimanche", "星期六、日", "", ""]],
          ex: [["On est le combien aujourd'hui ? — On est le premier mai.", "今天幾號？——今天五月一日。"], ["Je travaille le samedi.", "我每個星期六上班。"], ["Je suis né en 1998.", "我 1998 年出生。"]],
          tip: "日期的順序是**日 → 月 → 年**，和中文相反：le 14 juillet 2026。寫成數字是 14/07/2026。", warn: true }
    ],
    ex: [
        ["c", "21 怎麼說？", ["vingt et un", "vingt-un", "vingt et une"], 0, ""],
        ["c", "80 怎麼說？", ["quatre-vingts", "huitante", "quatre-vingt"], 0, ""],
        ["c", "71 怎麼說？", ["soixante et onze", "soixante-onze", "septante-un"], 0, ""],
        ["c", "92 怎麼說？", ["quatre-vingt-douze", "quatre-vingt-dix-deux", "nonante-deux"], 0, ""],
        ["c", "300 怎麼說？", ["trois cents", "trois cent", "trois centes"], 0, ""],
        ["c", "8:45 是？", ["neuf heures moins le quart", "huit heures et quart", "huit heures moins le quart"], 0, ""],
        ["c", "「每個星期天」是？", ["le dimanche", "dimanche", "en dimanche"], 0, ""],
        ["f", "J'ai ___ ans.（18）", "dix-huit", "我 18 歲。"],
        ["f", "Il est sept heures et ___.（7:30）", "demie", "七點半。"],
        ["f", "Aujourd'hui, c'est le ___ janvier.（1 號）", "premier", "今天是一月一日。"],
        ["t", "現在幾點？", ["Quelle heure est-il ?", "Il est quelle heure ?"]],
        ["t", "我的生日是五月三日。", ["Mon anniversaire, c'est le trois mai.", "Mon anniversaire est le trois mai.", "Mon anniversaire, c'est le 3 mai.", "Mon anniversaire est le 3 mai."]]
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
          tip: "複合過去式用 **être**：Je **me suis** levé(e) à sept heures（見「複合過去式」一章）。" }
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
        ["c", "Soudain, le téléphone ___.", ["a sonné", "sonnait", "sonne"], 0, "突然電話響了。"],
        ["c", "Il ___ beau hier.", ["faisait", "a fait", "fait"], 0, "昨天天氣很好。（描述）"],
        ["c", "Je dormais quand tu ___.", ["as appelé", "appelais", "appelles"], 0, "你打來的時候我正在睡覺。"],
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
        ["c", "Quand tu ___, appelle-moi.", ["arriveras", "arrives", "arrivais"], 0, "你到的時候打給我。"],
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
    id: "fg-devoir", level: "A2", title: "必須、應該與時間長短", sub: "il faut、devoir、avoir besoin de；depuis、il y a、pendant",
    lessons: ["a2-12", "b1-03"],
    body: [
        { h: "il faut + 原形：一般來說「得…」", p: "**il faut** 是無人稱的說法（主詞永遠是 il，不代表任何人），意思是「必須、需要」，說的是**一般的規則或做法**，沒有特別指誰。\n後面可以接**原形動詞**，也可以接**名詞**（需要某樣東西）。",
          ex: [["Il faut boire beaucoup d'eau.", "要多喝水。"], ["Il faut réserver à l'avance.", "得事先訂位。"], ["Il faut deux heures pour aller à Lyon.", "去里昂要兩個小時。"], ["Il faut du courage.", "需要勇氣。"]],
          tip: "要指定「某人必須」，用 **devoir**（下一節），或 **il faut que + 虛擬式**（B1「虛擬式」一章）：Il faut que tu partes。", warn: false },
        { h: "devoir：某人必須、應該、一定是", p: "**devoir** 是不規則動詞，後面接原形。它有三種意思：\n① **必須**：Je dois partir.（我得走了。）\n② **推測：一定是**：Il doit être fatigué.（他一定很累。）\n③ 條件式 **devrais** 表示「**應該**」，用來給建議，比較委婉：Tu devrais dormir.（你應該睡覺。）",
          tb: [["主詞", "現在式", "條件式（應該）"], ["je", "dois", "devrais"], ["tu", "dois", "devrais"], ["il / elle / on", "doit", "devrait"], ["nous", "devons", "devrions"], ["vous", "devez", "devriez"], ["ils / elles", "doivent", "devraient"]],
          ex: [["Je dois travailler ce soir.", "我今晚得工作。"], ["Vous devez montrer votre passeport.", "您必須出示護照。"], ["Elle doit être chez elle.", "她一定在家。"], ["Tu devrais voir un médecin.", "你應該去看醫生。"]] },
        { h: "最容易錯：「不必」不是 il ne faut pas", p: "中文「不用、不必」和「不可以」差很多，法文也一樣：\n**il ne faut pas / tu ne dois pas** = **不可以、禁止**\n**ce n'est pas la peine de / tu n'as pas besoin de / il n'est pas nécessaire de** = **不必、不需要**",
          tb: [["法文", "意思"], ["Il ne faut pas fumer ici.", "這裡**不可以**抽菸。"], ["Tu ne dois pas le dire.", "你**不可以**說出去。"], ["Ce n'est pas la peine de venir.", "你**不用**來。"], ["Tu n'as pas besoin de réserver.", "你**不需要**訂位。"]],
          tip: "想說「你不用付錢」，說 Tu n'as pas besoin de payer。說成 Tu ne dois pas payer 會變成「你不准付錢」。", warn: true },
        { h: "avoir besoin de：需要", p: "**avoir besoin de** + 名詞或原形：「需要…」。de 遇到母音變 d'；接名詞時，泛指的「需要一些」通常直接用 de（不用 du、des）。",
          ex: [["J'ai besoin d'aide.", "我需要幫忙。"], ["J'ai besoin de dormir.", "我需要睡覺。"], ["Tu as besoin de quelque chose ?", "你需要什麼嗎？"]] },
        { h: "avoir mal à：哪裡痛", p: "「…痛」= **avoir mal à** + 定冠詞 + 身體部位。à 會和冠詞合併：**au**（à + le）、**aux**（à + les）；la、l' 不變。",
          tb: [["身體部位", "…痛"], ["la tête（頭）", "J'ai mal à la tête."], ["le ventre（肚子）", "J'ai mal au ventre."], ["les dents（牙齒）", "J'ai mal aux dents."], ["l'oreille（耳朵）", "J'ai mal à l'oreille."], ["le dos（背）", "J'ai mal au dos."]],
          tip: "法文說身體部位時用**定冠詞**，不用所有格：J'ai mal **à la** tête，不說 à ma tête。", warn: true },
        { h: "depuis：從…到現在還在持續", p: "事情**從過去開始、現在還在繼續**時，法文用 **現在式 + depuis**。中文說「我學法文三年了」，法文是「我學法文從三年」：J'apprends le français **depuis** trois ans。\n**depuis** 後面可以接一段時間（depuis deux ans），也可以接起點（depuis 2023、depuis lundi）。\n問：**Depuis quand… ?**（從什麼時候？）、**Depuis combien de temps… ?**（多久了？）\n口語也常說 **Ça fait + 時間 + que + 現在式**：Ça fait trois ans que j'habite ici.",
          ex: [["J'habite à Paris depuis 2020.", "我從 2020 年起住在巴黎。"], ["Elle est malade depuis trois jours.", "她病了三天了（現在還病著）。"], ["Depuis combien de temps tu attends ?", "你等多久了？"]],
          tip: "這裡**不能**用複合過去式：J'ai habité ici depuis deux ans 是錯的，要說 J'habite ici depuis deux ans。", warn: true },
        { h: "il y a、pendant、en：其他時間長短", p: "**il y a** + 時間 =「…之前」，配**過去式**：Je suis arrivé il y a deux jours.（我兩天前到的。）\n**pendant** + 時間 =「（持續）…的期間」，事情已經結束或有明確長度：J'ai dormi pendant huit heures.（我睡了八個小時。）\n**en** + 時間 =「花多少時間完成」：J'ai fini en dix minutes.（我十分鐘就做完了。）",
          tb: [["說法", "意思", "例句"], ["depuis + 時間", "持續到現在（現在式）", "Je travaille ici depuis un an."], ["il y a + 時間", "…之前（過去式）", "Je suis venu il y a un an."], ["pendant + 時間", "持續了多久", "J'ai travaillé là-bas pendant un an."], ["en + 時間", "花多少時間完成", "Il a appris à nager en un mois."]] }
    ],
    ex: [
        ["c", "這裡不可以拍照：Il ___ prendre de photos ici.", ["ne faut pas", "n'a pas besoin de", "ne doit"], 0, ""],
        ["c", "你不用來：Tu ___ venir.", ["n'as pas besoin de", "ne dois pas", "ne faut pas"], 0, ""],
        ["c", "Tu ___ te reposer.（你應該休息）", ["devrais", "dois être", "faut"], 0, "給建議"],
        ["c", "J'ai mal ___ dos.", ["au", "à la", "aux"], 0, "我背痛。"],
        ["c", "J'ai mal ___ dents.", ["aux", "au", "à les"], 0, "我牙痛。"],
        ["c", "J'apprends le français ___ deux ans.", ["depuis", "il y a", "pendant"], 0, "我學法文兩年了（還在學）。"],
        ["c", "Je suis arrivé ___ une semaine.", ["il y a", "depuis", "en"], 0, "我一週前到的。"],
        ["c", "Il a dormi ___ dix heures.", ["pendant", "depuis", "il y a"], 0, "他睡了十個小時。"],
        ["f", "Nous ___ partir maintenant.（devoir）", "devons", "我們現在得走了。"],
        ["f", "Ils ___ être en retard.（devoir：一定是）", "doivent", "他們一定是遲到了。"],
        ["t", "我需要幫忙。", ["J'ai besoin d'aide.", "J'ai besoin d'aide !"]],
        ["t", "我住在這裡三年了。", ["J'habite ici depuis trois ans.", "Ça fait trois ans que j'habite ici."]]
    ]
},
{
    id: "fg-adverbs", level: "A2", title: "副詞", sub: "-ment 怎麼變、bon 和 bien、放在哪裡",
    lessons: ["a2-15", "a2-08"],
    body: [
        { h: "副詞是什麼", p: "副詞用來修飾**動詞、形容詞或其他副詞**，回答「怎麼做、多常、多少、什麼時候」。中文常用「…地」：慢慢**地**走。\n最重要的一點：**副詞不變化**，沒有陰陽性、單複數（和形容詞不一樣）。",
          ex: [["Il parle lentement.", "他說得很慢。（修飾動詞）"], ["C'est très bon.", "非常好吃。（修飾形容詞）"], ["Elle chante vraiment bien.", "她唱得真的很好。（修飾副詞）"]] },
        { h: "規則一：陰性形容詞 + -ment", p: "大部分 -ment 副詞的做法：先把形容詞變成**陰性**，再加 **-ment**（相當於英文的 -ly）。",
          tb: [["形容詞（陽 → 陰）", "副詞", "意思"], ["lent → lente", "lentement", "慢慢地"], ["heureux → heureuse", "heureusement", "幸好"], ["doux → douce", "doucement", "輕輕地"], ["sérieux → sérieuse", "sérieusement", "認真地"], ["léger → légère", "légèrement", "稍微"], ["complet → complète", "complètement", "完全地"]] },
        { h: "規則二：母音結尾直接加 -ment", p: "陽性形容詞以**母音**結尾時，直接用陽性加 -ment（不先變陰性）。",
          tb: [["形容詞", "副詞", "意思"], ["vrai", "vraiment", "真的"], ["poli", "poliment", "有禮貌地"], ["absolu", "absolument", "絕對"], ["facile", "facilement", "容易地"], ["rapide", "rapidement", "快速地"]],
          tip: "例外：**gai → gaiement**（快樂地）。", warn: false },
        { h: "規則三：-ant → -amment、-ent → -emment", p: "以 **-ant** 結尾的變成 **-amment**，以 **-ent** 結尾的變成 **-emment**。兩種寫法**發音一樣**，都唸 [amɑ̃]。",
          tb: [["形容詞", "副詞", "意思"], ["courant", "couramment", "流利地"], ["constant", "constamment", "不斷地"], ["évident", "évidemment", "當然"], ["récent", "récemment", "最近"], ["prudent", "prudemment", "小心地"]],
          tip: "**lent → lentement**、**présent → présentement** 是例外，照規則一。", warn: true },
        { h: "要另外記的特殊形", p: "有些副詞的變法不照規則，也有很多常用副詞根本不是 -ment 形，要直接背：",
          tb: [["形容詞", "副詞", "意思"], ["gentil", "gentiment", "親切地"], ["bref", "brièvement", "簡短地"], ["précis", "précisément", "精確地"], ["énorme", "énormément", "非常多"], ["profond", "profondément", "深深地"], ["bon", "bien", "好地"], ["mauvais", "mal", "差地、不好地"], ["meilleur", "mieux", "更好地"]],
          ex: [["Il parle vite.", "他說話很快。"], ["J'ai beaucoup mangé.", "我吃了很多。"], ["Elle arrive toujours en retard.", "她總是遲到。"]] },
        { h: "最常搞混：bon / bien、mauvais / mal", p: "**bon**（好的）、**mauvais**（壞的）是**形容詞**，修飾名詞，要配合陰陽性。\n**bien**（好地）、**mal**（差地）是**副詞**，修飾動詞，不變化。\n比較級也一樣分開：**meilleur**（形容詞）／**mieux**（副詞）。",
          tb: [["形容詞（修飾名詞）", "副詞（修飾動詞）"], ["C'est un bon cuisinier.（好廚師）", "Il cuisine bien.（煮得好）"], ["une mauvaise note（爛成績）", "J'ai mal dormi.（沒睡好）"], ["Ce gâteau est meilleur.（比較好吃）", "Elle chante mieux que moi.（唱得比我好）"]],
          tip: "**C'est bien !**（很好！真棒！）是固定說法，評論一件事的時候用 bien；評論**味道**才用 C'est bon !（好吃）。", warn: false },
        { h: "副詞放在哪裡", p: "① 一般放在**變化的動詞後面**：Il parle **bien** français.\n② **複合過去式**：短而常用的副詞（bien、mal、déjà、beaucoup、trop、assez、toujours、souvent、encore）放在**助動詞和過去分詞中間**：J'ai **bien** dormi。\n③ 較長的 -ment 副詞和時間、地點副詞（hier、aujourd'hui、ici、tard）多放在**過去分詞後**或句首：Il a parlé **lentement**、Je l'ai vu **hier**。\n④ 修飾形容詞或副詞時放在**前面**：**très** content、**trop** vite。",
          tb: [["時態", "例句", "中文"], ["現在式", "Il mange souvent ici.", "他常在這裡吃飯。"], ["複合過去式（短副詞）", "J'ai déjà fini.", "我已經做完了。"], ["複合過去式（短副詞）", "Nous avons beaucoup ri.", "我們笑得很開心。"], ["複合過去式（時間）", "Elle est partie hier.", "她昨天走了。"], ["原形動詞", "Il faut bien manger.", "要好好吃飯。"]],
          tip: "中文習慣把副詞放動詞前（我**常常**吃），法文要放在動詞**後面**：Je mange **souvent**，不說 Je souvent mange。", warn: true }
    ],
    ex: [
        ["c", "lent 的副詞是？", ["lentement", "lentment", "lentamment"], 0, ""],
        ["c", "heureux 的副詞是？", ["heureusement", "heureuxment", "heureusment"], 0, ""],
        ["c", "évident 的副詞是？", ["évidemment", "évidentement", "évidamment"], 0, ""],
        ["c", "Il chante très ___.", ["bien", "bon", "bonne"], 0, "他唱得很好。"],
        ["c", "C'est une ___ idée.", ["bonne", "bien", "bon"], 0, "這是個好主意。"],
        ["c", "Elle parle français ___ que moi.", ["mieux", "meilleur", "plus bien"], 0, "她法文說得比我好。"],
        ["c", "哪一句正確？", ["J'ai bien dormi.", "J'ai dormi bien.", "Je bien ai dormi."], 0, "我睡得很好。"],
        ["f", "Il parle ___.（courant → 副詞）", "couramment", "他說得很流利。"],
        ["f", "Parlez plus ___, s'il vous plaît.（doux → 副詞）", "doucement", "請說小聲一點。"],
        ["o", "Nous / avons / beaucoup / travaillé", "我們做了很多工作。"],
        ["o", "Je / mange / souvent / au / restaurant", "我常在餐廳吃飯。"],
        ["t", "我已經吃過了。", ["J'ai déjà mangé.", "J'ai déjà mangé !"]]
    ]
},
{
    id: "fg-stressed", level: "A2", title: "強調代名詞與所有格代名詞", sub: "moi、toi、lui；le mien、la tienne",
    lessons: ["a2-16"],
    body: [
        { h: "為什麼需要另一組「我、你」", p: "je、tu、il 只能當**主詞**，而且一定要緊貼在動詞前。其他位置（介系詞後面、單獨回答、強調）要換成**強調代名詞**。中文沒有這個區別，所以剛開始常會說出 avec je 這種錯誤。",
          tb: [["主詞代名詞", "強調代名詞", "中文"], ["je", "moi", "我"], ["tu", "toi", "你"], ["il", "lui", "他"], ["elle", "elle", "她"], ["on", "soi", "自己（一般人）"], ["nous", "nous", "我們"], ["vous", "vous", "您；你們"], ["ils", "eux", "他們"], ["elles", "elles", "她們"]] },
        { h: "什麼時候用強調代名詞", p: "① **介系詞後面**：avec moi、chez toi、pour lui、sans eux、à côté d'elle\n② **c'est 後面**：C'est moi.（是我。）Ce sont eux.（是他們。）\n③ **強調或對比**，放句首再接一般主詞：Moi, je préfère le thé.（我呢，比較喜歡茶。）\n④ **單獨回答**、沒有動詞時：Qui veut du café ? — **Moi !**\n⑤ **moi aussi**（我也是）、**moi non plus**（我也不）\n⑥ **比較級的 que 後面**：Il est plus grand que **moi**.",
          ex: [["Tu viens avec moi ?", "你要跟我來嗎？"], ["C'est lui qui a gagné.", "是他贏了。"], ["Moi, je reste ici.", "我呢，我留在這裡。"], ["J'aime le chocolat. — Moi aussi !", "我喜歡巧克力。——我也是！"], ["Je n'aime pas le café. — Moi non plus.", "我不喜歡咖啡。——我也不喜歡。"], ["Elle est plus jeune que toi.", "她比你年輕。"]],
          tip: "說「我也不」要用 **moi non plus**，不能說 moi aussi（它只用在肯定句後）。", warn: true },
        { h: "-même：自己", p: "強調代名詞 + **-même(s)** =「…自己」：moi-même（我自己）、toi-même、lui-même、elle-même、nous-mêmes、vous-même(s)、eux-mêmes、elles-mêmes。",
          ex: [["Je l'ai fait moi-même.", "這是我自己做的。"], ["Fais-le toi-même !", "你自己做！"]] },
        { h: "所有格代名詞：le mien、la tienne", p: "**所有格代名詞**取代「所有格形容詞 + 名詞」，避免重複：ma clé → **la mienne**（我的那把）。\n它要配合**被擁有的東西**的陰陽性和單複數（和 mon / ma / mes 一樣，不看擁有者是男是女）。",
          tb: [["", "陽性單數", "陰性單數", "陽性複數", "陰性複數"], ["我的", "le mien", "la mienne", "les miens", "les miennes"], ["你的", "le tien", "la tienne", "les tiens", "les tiennes"], ["他的／她的", "le sien", "la sienne", "les siens", "les siennes"], ["我們的", "le nôtre", "la nôtre", "les nôtres", "les nôtres"], ["你們的；您的", "le vôtre", "la vôtre", "les vôtres", "les vôtres"], ["他們的", "le leur", "la leur", "les leurs", "les leurs"]],
          ex: [["Ce n'est pas ma clé, c'est la tienne.", "這不是我的鑰匙，是你的。"], ["Mon vélo est rouge. Le sien est bleu.", "我的腳踏車是紅的，他的是藍的。"], ["Nos enfants jouent avec les leurs.", "我們的小孩和他們的小孩一起玩。"]] },
        { h: "要注意的細節", p: "① **le / les 會和 à、de 合併**：Je pense **au** mien（à + le mien）、Il parle **des** siens（de + les siens）。\n② **le nôtre、le vôtre 有 ^**，而所有格形容詞 notre、votre **沒有**；發音也不同：nôtre 的 o 是閉口音，notre 是開口音。\n③ 只是說「這是誰的」，口語更常用 **c'est à + 強調代名詞**：C'est à moi.（這是我的。）À qui est ce sac ? — Il est à elle.",
          ex: [["À qui est ce téléphone ? — C'est à moi.", "這支手機是誰的？——是我的。"], ["Votre voiture est plus grande que la nôtre.", "您的車比我們的大。"]],
          tip: "le sien / la sienne 和 son / sa 一樣，**不分**「他的」或「她的」：sa valise 可以是他的或她的行李箱，所以 la sienne 也是。", warn: false }
    ],
    ex: [
        ["c", "Tu viens avec ___ ?", ["moi", "je", "me"], 0, "你要跟我來嗎？"],
        ["c", "C'est ___ qui a appelé.", ["lui", "il", "le"], 0, "是他打的電話。"],
        ["c", "Ils dînent chez ___ ce soir.", ["eux", "ils", "leur"], 0, "他們今晚在自己家吃飯。"],
        ["c", "Je n'aime pas le froid. — Moi ___.", ["non plus", "aussi", "pas"], 0, "我不喜歡冷。——我也不。"],
        ["c", "Ce n'est pas mon sac, c'est ___.（你的）", ["le tien", "la tienne", "ton"], 0, "le sac 是陽性"],
        ["c", "Ta maison est grande. ___ est petite.（我的）", ["La mienne", "Le mien", "Ma"], 0, "la maison 是陰性"],
        ["c", "Nos parents et ___（他們的）se connaissent.", ["les leurs", "leurs", "le leur"], 0, ""],
        ["f", "Il est plus grand que ___.（我）", "moi", "他比我高。"],
        ["f", "Je l'ai fait ___.（我自己）", "moi-même", "我自己做的。"],
        ["f", "À qui est ce livre ? — Il est à ___.（她）", "elle", "這本書是誰的？——是她的。"],
        ["t", "我也是！", ["Moi aussi !", "Moi aussi."]],
        ["t", "這是你的嗎？", ["C'est à toi ?", "C'est le tien ?", "C'est la tienne ?", "C'est à vous ?"]]
    ]
},
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
        ["c", "Si j'avais le temps, je ___.", ["voyagerais", "voyagerai", "voyageais"], 0, "如果我有時間，我會去旅行。"],
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
        ["c", "Il faut que tu ___.", ["viennes", "viens", "viendras"], 0, "你一定要來。"],
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
        ["c", "Il chante en ___.", ["marchant", "marché", "marcher"], 0, "他邊走邊唱。"],
        ["f", "En ___, j'ai vu Paul.（arriver）", "arrivant", "我到的時候看到保羅。"],
        ["t", "這裡說法語。", ["On parle français ici.", "Ici, on parle français."]]
    ]
}
];
