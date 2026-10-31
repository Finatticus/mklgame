// ===================== A1 入門 =====================
// 欄位：grammar[{t 標題, d 說明, tb 表格（第一列為標題）, ex 例句[法, 中]}]、vocab[法, 中, 詞性]、dialog[說話者, 法, 中]
// ex 練習：c 選擇 / f 填空 / o 重組 / t 中翻法 / l 聽寫（格式見 classroom.js）
FR_COURSE.push(
{
    id: "a1-01", level: "A1", title: "問候與道別", fr: "Bonjour !",
    goal: "會打招呼、道別、道謝，並分辨什麼時候用 tu、什麼時候用 vous。",
    grammar: [
        { t: "tu 和 vous", d: "法文的「你」有兩種：**tu** 用在朋友、家人、小孩、同學之間；**vous** 用在陌生人、長輩、店員、工作場合。vous 也是複數的「你們」。不確定時，用 vous 比較安全。",
          tb: [["說法", "對象"], ["tu", "親近的人（一個）"], ["vous", "不熟或需要禮貌的人；你們"]],
          ex: [["Salut ! Ça va ?", "嗨！你好嗎？（對朋友）"], ["Bonjour Madame, comment allez-vous ?", "女士您好，您好嗎？"], ["Et toi ?", "那你呢？"], ["Et vous ?", "那您呢？"]] },
        { t: "打招呼與回答", d: "白天說 **bonjour**，傍晚以後說 **bonsoir**，朋友之間說 **salut**（見面和道別都可以）。回答「好嗎？」可以說 **ça va bien**、**très bien**、**pas mal**（還不錯）、**comme ci, comme ça**（馬馬虎虎）。",
          ex: [["Bonsoir Monsieur !", "先生晚安！"], ["Ça va bien, merci.", "我很好，謝謝。"], ["Pas mal, et toi ?", "還不錯，你呢？"], ["Au revoir, à demain !", "再見，明天見！"]] }
    ],
    vocab: [["bonjour", "你好；早安", "interj."], ["bonsoir", "晚安（晚上見面時）", "interj."], ["salut", "嗨；再見（朋友間）", "interj."], ["au revoir", "再見", "loc."], ["à bientôt", "待會見；再會", "loc."], ["à demain", "明天見", "loc."], ["bonne nuit", "晚安（睡前）", "loc."], ["merci", "謝謝", "interj."], ["de rien", "不客氣", "loc."], ["s'il vous plaît", "請（對您）", "loc."], ["s'il te plaît", "請（對你）", "loc."], ["pardon", "對不起；借過", "interj."], ["excusez-moi", "不好意思", "loc."], ["oui", "是；對", "adv."], ["non", "不；不是", "adv."], ["Monsieur", "先生", "n.m."], ["Madame", "女士；太太", "n.f."]],
    dialog: [["Léa", "Bonjour Monsieur Martin !", "馬丁先生您好！"], ["M. Martin", "Bonjour Léa. Comment allez-vous ?", "蕾雅妳好。妳好嗎？"], ["Léa", "Très bien, merci. Et vous ?", "很好，謝謝。您呢？"], ["M. Martin", "Ça va bien, merci.", "我很好，謝謝。"], ["Hugo", "Salut Léa ! Ça va ?", "嗨蕾雅！妳好嗎？"], ["Léa", "Pas mal, et toi ?", "還不錯，你呢？"], ["Hugo", "Super ! Bon, à demain !", "很好！那明天見！"], ["Léa", "Salut, à demain !", "掰掰，明天見！"]],
    culture: "在法國，進商店、搭公車時先說 **Bonjour** 是基本禮貌；朋友見面常互相輕碰臉頰（la bise）。",
    ex: [
        ["c", "（對老師）Bonjour Madame, comment allez-___ ?", ["vous", "tu", "toi"], 0, "女士您好，您好嗎？"],
        ["c", "晚上見面要說：___ !", ["Bonsoir", "Bonne nuit", "Bonjour"], 0, "晚安！"],
        ["f", "Merci ! — De ___.", "rien", "謝謝！——不客氣。"],
        ["o", "Ça / va / bien / , / merci", "我很好，謝謝。"],
        ["t", "明天見！", ["À demain !", "A demain"]],
        ["l", "Au revoir, à bientôt !", "再見，待會見！"]
    ]
},
{
    id: "a1-02", level: "A1", title: "自我介紹：être 與名字、國籍", fr: "Je m'appelle Léa",
    goal: "會說名字、國籍、身分，學會最重要的動詞 être（是）。",
    grammar: [
        { t: "主詞代名詞與 être", d: "**être**（是、在）是最常用的不規則動詞，一定要背熟。il 是「他」，elle 是「她」；ils 是「他們」（只要有一個男性就用 ils），elles 是「她們」。",
          tb: [["主詞", "être", "意思"], ["je", "suis", "我是"], ["tu", "es", "你是"], ["il / elle", "est", "他／她是"], ["nous", "sommes", "我們是"], ["vous", "êtes", "您是；你們是"], ["ils / elles", "sont", "他們／她們是"]],
          ex: [["Je suis étudiant.", "我是學生。（男）"], ["Elle est professeure.", "她是老師。"], ["Nous sommes taïwanais.", "我們是台灣人。"], ["Vous êtes français ?", "您是法國人嗎？"]] },
        { t: "名字：s'appeler", d: "「我叫…」說 **je m'appelle…**。問別人：**Tu t'appelles comment ?**（口語）或 **Comment vous appelez-vous ?**（禮貌）。",
          ex: [["Je m'appelle Paul.", "我叫保羅。"], ["Comment tu t'appelles ?", "你叫什麼名字？"], ["Il s'appelle Thomas.", "他叫湯瑪士。"], ["Enchanté !", "很高興認識你！（男生說）"]] },
        { t: "國籍與職業的陰陽性", d: "說國籍、職業時**不加冠詞**。女性形通常在字尾加 **-e**，原本不唸的子音會唸出來：français 的 s 不發音，française 的 s 要唸成 z。字尾已經是 e 的不變（belge）。",
          tb: [["男性", "女性", "意思"], ["français", "française", "法國人"], ["taïwanais", "taïwanaise", "台灣人"], ["japonais", "japonaise", "日本人"], ["américain", "américaine", "美國人"], ["étudiant", "étudiante", "學生"], ["belge", "belge", "比利時人"]] }
    ],
    vocab: [["être", "是；在", "v."], ["s'appeler", "名叫", "v."], ["le nom", "姓；名字", "n.m."], ["le prénom", "名字（名）", "n.m."], ["étudiant", "學生（男）", "n.m."], ["étudiante", "學生（女）", "n.f."], ["le professeur", "老師", "n.m."], ["l'ami", "朋友（男）", "n.m."], ["l'amie", "朋友（女）", "n.f."], ["français", "法國的；法語", "adj."], ["taïwanais", "台灣的", "adj."], ["enchanté", "很高興認識你", "adj."], ["Taïwan", "台灣", "n."], ["la France", "法國", "n.f."], ["aussi", "也", "adv."]],
    dialog: [["Paul", "Bonjour ! Je m'appelle Paul. Et toi ?", "你好！我叫保羅。妳呢？"], ["Mei", "Je m'appelle Mei. Enchantée !", "我叫美。很高興認識你！"], ["Paul", "Enchanté ! Tu es japonaise ?", "很高興認識妳！妳是日本人嗎？"], ["Mei", "Non, je suis taïwanaise. Et toi, tu es français ?", "不，我是台灣人。你呢，你是法國人嗎？"], ["Paul", "Oui, je suis français. Je suis étudiant.", "對，我是法國人。我是學生。"], ["Mei", "Moi aussi, je suis étudiante !", "我也是學生！"]],
    ex: [
        ["c", "Nous ___ étudiants.", ["sommes", "êtes", "sont"], 0, "我們是學生。"],
        ["c", "Elle est ___.", ["taïwanaise", "taïwanais", "taïwanaises"], 0, "她是台灣人。"],
        ["f", "Vous ___ professeur ?", "êtes", "您是老師嗎？"],
        ["f", "Je m'___ Thomas.", "appelle", "我叫湯瑪士。"],
        ["o", "Tu / es / français / ?", "你是法國人嗎？"],
        ["t", "我是台灣人。（女生）", ["Je suis taïwanaise."]],
        ["l", "Ils sont japonais.", "他們是日本人。"]
    ]
},
{
    id: "a1-03", level: "A1", title: "數字與年齡：avoir", fr: "J'ai vingt-cinq ans",
    goal: "會數 0 到 100，用 avoir 說年齡、電話號碼。",
    grammar: [
        { t: "avoir（有）", d: "第二個必背動詞。法文說年齡用 **avoir**：「我有 20 歲」= J'ai vingt ans，**ans** 不能省略。注意 je + ai 要省音成 **j'ai**。",
          tb: [["主詞", "avoir"], ["j'", "ai"], ["tu", "as"], ["il / elle", "a"], ["nous", "avons"], ["vous", "avez"], ["ils / elles", "ont"]],
          ex: [["J'ai vingt-cinq ans.", "我二十五歲。"], ["Tu as quel âge ?", "你幾歲？"], ["Elle a un frère.", "她有一個哥哥（弟弟）。"], ["Ils ont un chat.", "他們有一隻貓。"]] },
        { t: "數字 0–69", d: "0–16 要背；17–19 是 dix + 數字；20 以上用連字號，但 21、31、41… 用 **et un**。",
          tb: [["數字", "法文"], ["0–5", "zéro, un, deux, trois, quatre, cinq"], ["6–10", "six, sept, huit, neuf, dix"], ["11–16", "onze, douze, treize, quatorze, quinze, seize"], ["17–19", "dix-sept, dix-huit, dix-neuf"], ["20, 21, 22", "vingt, vingt et un, vingt-deux"], ["30, 40, 50, 60", "trente, quarante, cinquante, soixante"]] },
        { t: "數字 70–100", d: "70–99 要用加法和乘法：70 = 60 + 10（**soixante-dix**），80 = 4 × 20（**quatre-vingts**），90 = 4 × 20 + 10（**quatre-vingt-dix**）。比利時和瑞士用 septante、nonante，但在法國不用。",
          tb: [["數字", "法文"], ["70", "soixante-dix"], ["71", "soixante et onze"], ["75", "soixante-quinze"], ["80", "quatre-vingts"], ["81", "quatre-vingt-un"], ["90", "quatre-vingt-dix"], ["99", "quatre-vingt-dix-neuf"], ["100", "cent"]],
          ex: [["Mon numéro, c'est le zéro six, douze, trente-quatre, cinquante-six, soixante-dix-huit.", "我的號碼是 06 12 34 56 78。"]] }
    ],
    vocab: [["avoir", "有", "v."], ["l'âge", "年齡", "n.m."], ["un an", "一年；歲", "n.m."], ["quel", "什麼；哪個（陽性）", "adj."], ["quelle", "什麼；哪個（陰性）", "adj."], ["le numéro", "號碼", "n.m."], ["le téléphone", "電話", "n.m."], ["combien", "多少", "adv."], ["vingt", "二十", "adj."], ["trente", "三十", "adj."], ["soixante", "六十", "adj."], ["cent", "一百", "adj."], ["le frère", "兄弟", "n.m."], ["la sœur", "姊妹", "n.f."]],
    dialog: [["Nina", "Tu as quel âge, Léo ?", "里歐，你幾歲？"], ["Léo", "J'ai dix-neuf ans. Et toi ?", "我十九歲。妳呢？"], ["Nina", "Moi, j'ai vingt et un ans.", "我二十一歲。"], ["Léo", "Tu as un numéro de téléphone ?", "妳有電話號碼嗎？"], ["Nina", "Oui : zéro six, quinze, quarante-deux, quatre-vingt-dix, soixante-dix.", "有：06 15 42 90 70。"], ["Léo", "Merci !", "謝謝！"]],
    ex: [
        ["c", "Tu ___ quel âge ?", ["as", "es", "a"], 0, "你幾歲？"],
        ["c", "80 用法文說：", ["quatre-vingts", "huitante", "soixante-vingt"], 0, "八十"],
        ["f", "J'___ trente ans.", "ai", "我三十歲。"],
        ["f", "Nous ___ deux enfants.", "avons", "我們有兩個孩子。"],
        ["c", "21 用法文說：", ["vingt et un", "vingt-un", "vingt et une un"], 0, "二十一"],
        ["t", "她二十歲。", ["Elle a vingt ans."]],
        ["l", "Il a soixante-quinze ans.", "他七十五歲。"]
    ]
},
{
    id: "a1-04", level: "A1", title: "名詞的陰陽性與冠詞", fr: "Un livre, la table",
    goal: "知道每個名詞都有陰陽性，會用不定冠詞 un / une / des 和定冠詞 le / la / l' / les。",
    grammar: [
        { t: "名詞的陰陽性", d: "法文每個名詞都是**陽性**或**陰性**，物品也一樣（le livre 書是陽性、la table 桌子是陰性）。陰陽性大多要跟著冠詞一起背。常見提示：-tion、-té、-ure 結尾多半是陰性；-ment、-age 結尾多半是陽性。" },
        { t: "不定冠詞與定冠詞", d: "不定冠詞 = 「一個／一些」，第一次提到時用；定冠詞 = 「這個／那個」，已知或泛指時用。le / la 遇到母音或不發音的 h 變成 **l'**。複數字尾加 -s 但不發音，所以要靠冠詞聽出單複數。",
          tb: [["", "陽性", "陰性", "複數"], ["不定冠詞", "un", "une", "des"], ["定冠詞", "le / l'", "la / l'", "les"]],
          ex: [["C'est un livre.", "這是一本書。"], ["C'est le livre de Paul.", "這是保羅的書。"], ["Il y a une chaise et des tables.", "有一張椅子和幾張桌子。"], ["J'aime l'école.", "我喜歡學校。"]] },
        { t: "c'est / ce sont / il y a", d: "**C'est** + 單數、**ce sont** + 複數，用來介紹「這是…」。**Il y a** 是「有…（存在）」，單複數都一樣。",
          ex: [["C'est une photo.", "這是一張照片。"], ["Ce sont des stylos.", "這些是原子筆。"], ["Il y a un sac sur la table.", "桌上有一個包包。"]] }
    ],
    vocab: [["le livre", "書", "n.m."], ["la table", "桌子", "n.f."], ["la chaise", "椅子", "n.f."], ["le stylo", "原子筆", "n.m."], ["le cahier", "筆記本", "n.m."], ["l'ordinateur", "電腦", "n.m."], ["la porte", "門", "n.f."], ["la fenêtre", "窗戶", "n.f."], ["le sac", "包包", "n.m."], ["la clé", "鑰匙", "n.f."], ["la photo", "照片", "n.f."], ["l'école", "學校", "n.f."], ["la salle de classe", "教室", "n.f."], ["il y a", "有（存在）", "loc."]],
    dialog: [["Prof", "Qu'est-ce que c'est ?", "這是什麼？"], ["Élève", "C'est un cahier.", "這是一本筆記本。"], ["Prof", "Et ça ?", "那這個呢？"], ["Élève", "Ce sont des stylos.", "這些是原子筆。"], ["Prof", "Qu'est-ce qu'il y a dans le sac ?", "包包裡有什麼？"], ["Élève", "Il y a un livre, une clé et un ordinateur.", "有一本書、一把鑰匙和一台電腦。"]],
    ex: [
        ["c", "C'est ___ chaise.", ["une", "un", "des"], 0, "這是一張椅子。"],
        ["c", "J'aime ___ école.", ["l'", "le", "la"], 0, "我喜歡學校。"],
        ["c", "___ des livres.", ["Ce sont", "C'est", "Il est"], 0, "這些是書。"],
        ["f", "Il y a ___ ordinateur sur la table. (一台)", "un", "桌上有一台電腦。"],
        ["o", "Il / y / a / une / clé / dans / le / sac", "包包裡有一把鑰匙。"],
        ["t", "這是一本書。", ["C'est un livre."]]
    ]
},
{
    id: "a1-05", level: "A1", title: "家人與所有格形容詞", fr: "Ma famille",
    goal: "會介紹家人，正確使用 mon / ma / mes 等所有格。",
    grammar: [
        { t: "所有格形容詞", d: "所有格的陰陽性要配合**後面的名詞**，不是配合擁有者：sa mère 可以是「他的媽媽」也可以是「她的媽媽」。陰性名詞以母音開頭時，用 **mon / ton / son** 以便發音（mon amie）。",
          tb: [["", "陽性單數", "陰性單數", "複數"], ["我的", "mon", "ma", "mes"], ["你的", "ton", "ta", "tes"], ["他／她的", "son", "sa", "ses"], ["我們的", "notre", "notre", "nos"], ["您的；你們的", "votre", "votre", "vos"], ["他們的", "leur", "leur", "leurs"]],
          ex: [["Voici mon père et ma mère.", "這是我爸爸和我媽媽。"], ["Mes parents habitent à Taipei.", "我父母住在台北。"], ["C'est son frère.", "這是他（她）的哥哥。"], ["Mon amie s'appelle Claire.", "我的朋友叫克萊兒。"]] },
        { t: "avoir 介紹家人", d: "**J'ai un frère et deux sœurs.**（我有一個兄弟和兩個姊妹。）沒有就說 **Je n'ai pas de frère.**（否定後 un / une / des 變成 de，第 6 課會再練習）。" }
    ],
    vocab: [["la famille", "家庭；家人", "n.f."], ["le père", "父親", "n.m."], ["la mère", "母親", "n.f."], ["les parents", "父母", "n.m."], ["le fils", "兒子", "n.m."], ["la fille", "女兒；女孩", "n.f."], ["le mari", "丈夫", "n.m."], ["la femme", "妻子；女人", "n.f."], ["l'enfant", "小孩", "n."], ["le grand-père", "祖父；外公", "n.m."], ["la grand-mère", "祖母；外婆", "n.f."], ["l'oncle", "叔叔；舅舅", "n.m."], ["la tante", "阿姨；姑姑", "n.f."], ["le cousin", "堂（表）兄弟", "n.m."], ["la cousine", "堂（表）姊妹", "n.f."], ["le chien", "狗", "n.m."], ["voici", "這是（介紹）", "prép."]],
    dialog: [["Emma", "C'est qui sur la photo ?", "照片上是誰？"], ["Yu", "Ce sont mes parents. Voici mon père, il s'appelle Wei.", "是我父母。這是我爸爸，他叫偉。"], ["Emma", "Et la jeune fille ?", "那個年輕女孩呢？"], ["Yu", "C'est ma sœur. Elle a seize ans.", "是我妹妹，她十六歲。"], ["Emma", "Tu as un frère aussi ?", "你也有兄弟嗎？"], ["Yu", "Non, je n'ai pas de frère. Mais j'ai un chien !", "沒有，我沒有兄弟。但我有一隻狗！"]],
    ex: [
        ["c", "Voici ___ mère.", ["ma", "mon", "mes"], 0, "這是我媽媽。"],
        ["c", "C'est ___ amie Claire.", ["mon", "ma", "mes"], 0, "這是我的朋友克萊兒。"],
        ["c", "Paul et ___ sœur.", ["sa", "son", "ses"], 0, "保羅和他的姊姊。"],
        ["f", "Nous aimons ___ parents. (我們的)", "nos", "我們愛我們的父母。"],
        ["o", "J' / ai / un / frère / et / deux / sœurs", "我有一個兄弟和兩個姊妹。"],
        ["t", "這是我爸爸。", ["C'est mon père.", "Voici mon père."]]
    ]
},
{
    id: "a1-06", level: "A1", title: "-er 動詞現在式與否定", fr: "J'aime le café",
    goal: "會變化最大宗的 -er 規則動詞，並用 ne … pas 否定。",
    grammar: [
        { t: "-er 動詞的變化", d: "法文九成的動詞是 -er 結尾，變化都一樣：去掉 -er，加上 **-e, -es, -e, -ons, -ez, -ent**。其中 -e、-es、-e、-ent 都**不發音**，所以 je parle、tu parles、il parle、ils parlent 唸起來一樣。",
          tb: [["主詞", "parler 說", "aimer 喜歡"], ["je / j'", "parle", "aime"], ["tu", "parles", "aimes"], ["il / elle", "parle", "aime"], ["nous", "parlons", "aimons"], ["vous", "parlez", "aimez"], ["ils / elles", "parlent", "aiment"]],
          ex: [["Je parle français.", "我說法語。"], ["Nous habitons à Lyon.", "我們住在里昂。"], ["Ils travaillent beaucoup.", "他們工作很多。"], ["Tu aimes danser ?", "你喜歡跳舞嗎？"]] },
        { t: "否定 ne … pas", d: "把動詞夾在 **ne** 和 **pas** 中間；ne 遇到母音變 **n'**。口語常省略 ne（Je sais pas），但寫的時候要保留。",
          ex: [["Je ne parle pas chinois.", "我不會說中文。"], ["Elle n'aime pas le café.", "她不喜歡咖啡。"], ["Nous ne travaillons pas le dimanche.", "我們星期天不工作。"]] },
        { t: "aimer + 定冠詞", d: "表達喜好時名詞用**定冠詞**（泛指）：J'aime **le** thé（我喜歡茶），不說 j'aime du thé。後面也可以接原形動詞：J'aime **lire**。" }
    ],
    vocab: [["parler", "說", "v."], ["aimer", "喜歡；愛", "v."], ["adorer", "非常喜歡", "v."], ["détester", "討厭", "v."], ["habiter", "居住", "v."], ["travailler", "工作", "v."], ["étudier", "讀書；學習", "v."], ["écouter", "聽", "v."], ["regarder", "看", "v."], ["manger", "吃", "v."], ["chanter", "唱歌", "v."], ["danser", "跳舞", "v."], ["la musique", "音樂", "n.f."], ["le sport", "運動", "n.m."], ["le café", "咖啡", "n.m."], ["le thé", "茶", "n.m."], ["beaucoup", "很多；非常", "adv."]],
    dialog: [["Lucas", "Tu aimes le café ?", "你喜歡咖啡嗎？"], ["Ana", "Non, je n'aime pas le café. J'adore le thé !", "不，我不喜歡咖啡。我超愛茶！"], ["Lucas", "Tu parles anglais ?", "妳會說英文嗎？"], ["Ana", "Oui, je parle anglais et un peu français.", "會，我說英文，也說一點法文。"], ["Lucas", "Tu travailles ou tu étudies ?", "妳工作還是念書？"], ["Ana", "J'étudie la musique à Paris.", "我在巴黎念音樂。"]],
    ex: [
        ["c", "Nous ___ français.", ["parlons", "parlez", "parlent"], 0, "我們說法語。"],
        ["f", "Ils ___ à Marseille. (habiter)", "habitent", "他們住在馬賽。"],
        ["f", "Vous ___ le sport ? (aimer)", "aimez", "您喜歡運動嗎？"],
        ["c", "Elle ___ le thé.", ["n'aime pas", "ne aime pas", "aime ne pas"], 0, "她不喜歡茶。"],
        ["o", "Je / ne / travaille / pas / le / samedi", "我星期六不工作。"],
        ["t", "我喜歡音樂。", ["J'aime la musique."]],
        ["l", "Tu écoutes la radio ?", "你在聽廣播嗎？"]
    ]
},
{
    id: "a1-07", level: "A1", title: "問句與疑問詞", fr: "Où habites-tu ?",
    goal: "會用三種方式問是非題，並用疑問詞問人、事、時、地、原因、數量。",
    grammar: [
        { t: "是非問句的三種說法", d: "從口語到正式：①只把語調上揚；②句首加 **est-ce que**；③主詞動詞倒裝並加連字號。倒裝時若動詞以母音結尾、主詞是 il / elle，中間要加 **-t-**。",
          tb: [["說法", "例句"], ["語調", "Tu parles français ?"], ["est-ce que", "Est-ce que tu parles français ?"], ["倒裝", "Parles-tu français ?"], ["倒裝 + t", "Parle-t-il français ?"]] },
        { t: "疑問詞", d: "疑問詞可以放句首接 est-ce que，或放句尾（口語）。「什麼」放句首用 **que / qu'est-ce que**，放句尾用 **quoi**。",
          tb: [["疑問詞", "意思", "例句"], ["qui", "誰", "Qui est-ce ?"], ["que / quoi", "什麼", "Qu'est-ce que tu fais ? / Tu fais quoi ?"], ["où", "哪裡", "Où est-ce que tu habites ?"], ["quand", "什麼時候", "Quand est-ce qu'il arrive ?"], ["comment", "怎麼；如何", "Comment ça va ?"], ["pourquoi", "為什麼", "Pourquoi tu étudies le français ?"], ["combien", "多少", "Ça coûte combien ?"], ["quel / quelle", "哪個；什麼", "Quelle heure est-il ?"]],
          ex: [["Pourquoi ? — Parce que j'aime la France.", "為什麼？——因為我喜歡法國。"], ["Où habites-tu ?", "你住哪裡？"], ["Tu t'appelles comment ?", "你叫什麼名字？"]] }
    ],
    vocab: [["qui", "誰", "pron."], ["quoi", "什麼", "pron."], ["où", "哪裡", "adv."], ["quand", "什麼時候；當", "adv."], ["comment", "怎麼；如何", "adv."], ["pourquoi", "為什麼", "adv."], ["parce que", "因為", "conj."], ["combien", "多少", "adv."], ["la question", "問題", "n.f."], ["la réponse", "回答", "n.f."], ["demander", "問；要求", "v."], ["répondre", "回答", "v."], ["est-ce que", "（疑問句開頭）", "loc."]],
    dialog: [["Inès", "Est-ce que tu habites à Paris ?", "你住在巴黎嗎？"], ["Kai", "Non, j'habite à Lille.", "不，我住在里爾。"], ["Inès", "Pourquoi tu étudies le français ?", "你為什麼學法文？"], ["Kai", "Parce que je travaille avec une entreprise française.", "因為我和一家法國公司合作。"], ["Inès", "Et tu rentres à Taïwan quand ?", "那你什麼時候回台灣？"], ["Kai", "En août, je pense.", "我想是八月吧。"]],
    ex: [
        ["c", "___ tu habites ? — À Nice.", ["Où", "Quand", "Qui"], 0, "你住哪裡？——在尼斯。"],
        ["c", "___ est-ce ? — C'est mon frère.", ["Qui", "Que", "Où"], 0, "這是誰？——是我哥哥。"],
        ["c", "Parle-___-il anglais ?", ["t", "s", "il"], 0, "他會說英文嗎？"],
        ["f", "Pourquoi ? — ___ que j'aime le français.", "Parce", "為什麼？——因為我喜歡法文。"],
        ["o", "Est-ce / que / vous / parlez / anglais / ?", "您會說英文嗎？"],
        ["t", "你叫什麼名字？（口語）", ["Tu t'appelles comment ?", "Comment tu t'appelles ?"]]
    ]
},
{
    id: "a1-08", level: "A1", title: "時間、星期與日期", fr: "Quelle heure est-il ?",
    goal: "會說幾點、星期幾、幾月幾號，約時間。",
    grammar: [
        { t: "幾點", d: "問時間：**Quelle heure est-il ?** 回答一律用 **Il est … heure(s)**。一點是 une heure（單數），其他用 heures。正式場合（車站、節目）常用 24 小時制。",
          tb: [["時間", "說法"], ["8:00", "Il est huit heures."], ["8:15", "Il est huit heures et quart."], ["8:30", "Il est huit heures et demie."], ["8:45", "Il est neuf heures moins le quart."], ["8:50", "Il est neuf heures moins dix."], ["12:00", "Il est midi. / Il est minuit."], ["20:30", "Il est vingt heures trente."]],
          ex: [["Le film commence à vingt heures.", "電影晚上八點開始。"], ["On se voit à midi ?", "我們中午見好嗎？"]] },
        { t: "星期、月份與日期", d: "星期和月份**小寫**，前面不加介系詞：lundi（星期一）；**le lundi** 是「每個星期一」。日期用 **le + 數字 + 月份**，一號說 **le premier**。月份前用 **en**：en mai。",
          tb: [["星期", "月份"], ["lundi, mardi, mercredi", "janvier, février, mars, avril"], ["jeudi, vendredi", "mai, juin, juillet, août"], ["samedi, dimanche", "septembre, octobre, novembre, décembre"]],
          ex: [["On est le combien aujourd'hui ? — On est le 14 juillet.", "今天幾號？——七月十四日。"], ["Mon anniversaire, c'est le premier mai.", "我的生日是五月一日。"], ["Je ne travaille pas le samedi.", "我每個星期六都不工作。"]] }
    ],
    vocab: [["l'heure", "小時；時間", "n.f."], ["la minute", "分鐘", "n.f."], ["le matin", "早上", "n.m."], ["l'après-midi", "下午", "n.m."], ["le soir", "晚上", "n.m."], ["la nuit", "夜晚", "n.f."], ["midi", "中午", "n.m."], ["aujourd'hui", "今天", "adv."], ["demain", "明天", "adv."], ["hier", "昨天", "adv."], ["la semaine", "星期；週", "n.f."], ["le mois", "月", "n.m."], ["l'année", "年", "n.f."], ["le week-end", "週末", "n.m."], ["l'anniversaire", "生日", "n.m."], ["lundi", "星期一", "n.m."], ["samedi", "星期六", "n.m."]],
    dialog: [["Hugo", "Excuse-moi, quelle heure est-il ?", "不好意思，現在幾點？"], ["Zoé", "Il est six heures et demie.", "六點半。"], ["Hugo", "Ah, le cours commence à sept heures !", "啊，課七點開始！"], ["Zoé", "Tu as cours le jeudi aussi ?", "你星期四也有課嗎？"], ["Hugo", "Oui, le mardi et le jeudi soir.", "有，星期二和星期四晚上。"], ["Zoé", "Moi, j'ai un examen le vingt mars.", "我三月二十日有考試。"]],
    ex: [
        ["c", "8:30 → Il est huit heures ___.", ["et demie", "et quart", "moins le quart"], 0, "八點半。"],
        ["c", "1:00 → Il est une ___.", ["heure", "heures", "minute"], 0, "一點。"],
        ["f", "Mon anniversaire, c'est le ___ janvier. (1 號)", "premier", "我的生日是一月一日。"],
        ["c", "我每個星期天去游泳 → Je nage ___.", ["le dimanche", "dimanche", "en dimanche"], 0, "我每個星期天游泳。"],
        ["o", "Le / train / part / à / dix / heures", "火車十點出發。"],
        ["t", "現在幾點？", ["Quelle heure est-il ?", "Il est quelle heure ?"]],
        ["l", "Il est neuf heures moins le quart.", "八點四十五分。"]
    ]
},
{
    id: "a1-09", level: "A1", title: "形容詞的配合與位置", fr: "Une petite maison bleue",
    goal: "會讓形容詞配合名詞的陰陽單複數，知道形容詞放在名詞前或後。",
    grammar: [
        { t: "陰陽性與單複數", d: "形容詞要配合名詞：陰性 **+e**、複數 **+s**、陰性複數 **+es**。有些字尾有固定的變法。",
          tb: [["規則", "陽性", "陰性"], ["+e", "grand", "grande"], ["-e 不變", "rouge", "rouge"], ["-eux → -euse", "heureux", "heureuse"], ["-if → -ive", "sportif", "sportive"], ["-er → -ère", "cher", "chère"], ["-en → -enne", "italien", "italienne"], ["特殊", "blanc / long", "blanche / longue"]] },
        { t: "位置", d: "大部分形容詞放在**名詞後面**（une voiture rouge）。少數常用短形容詞放在**前面**，可以記 **BAGS**：Beauté 美（beau, joli）、Âge 年齡（jeune, vieux, nouveau）、Goodness 好壞（bon, mauvais）、Size 大小（grand, petit）。",
          ex: [["une petite maison bleue", "一間藍色小房子"], ["un bon restaurant italien", "一間好的義大利餐廳"], ["des chaussures noires", "黑色的鞋子"], ["une jeune femme intéressante", "一位有意思的年輕女子"]] },
        { t: "beau、nouveau、vieux", d: "這三個字在母音開頭的陽性名詞前有特別的形式：**un bel homme**、**un nouvel ami**、**un vieil hôtel**。",
          tb: [["陽性", "陽性 + 母音", "陰性"], ["beau", "bel", "belle"], ["nouveau", "nouvel", "nouvelle"], ["vieux", "vieil", "vieille"]] }
    ],
    vocab: [["grand", "大的；高的", "adj."], ["petit", "小的", "adj."], ["beau", "美的；帥的", "adj."], ["joli", "漂亮的", "adj."], ["jeune", "年輕的", "adj."], ["vieux", "老的；舊的", "adj."], ["nouveau", "新的", "adj."], ["bon", "好的", "adj."], ["mauvais", "壞的；差的", "adj."], ["rouge", "紅色的", "adj."], ["bleu", "藍色的", "adj."], ["vert", "綠色的", "adj."], ["blanc", "白色的", "adj."], ["noir", "黑色的", "adj."], ["content", "高興的", "adj."], ["fatigué", "疲倦的", "adj."], ["facile", "容易的", "adj."], ["difficile", "困難的", "adj."], ["la maison", "房子", "n.f."], ["la voiture", "汽車", "n.f."]],
    dialog: [["Agent", "Voici l'appartement : il est petit mais très joli.", "這就是公寓：小，但很漂亮。"], ["Lina", "La cuisine est grande ?", "廚房大嗎？"], ["Agent", "Oui, et il y a une belle vue sur le parc.", "大，而且可以看到公園的美景。"], ["Lina", "Le quartier est calme ?", "這一區安靜嗎？"], ["Agent", "Très calme, et il y a un grand marché à côté.", "很安靜，旁邊還有一個大市場。"], ["Lina", "Parfait, je suis contente !", "太好了，我很滿意！"]],
    ex: [
        ["c", "une voiture ___", ["blanche", "blanc", "blancs"], 0, "一輛白色的汽車"],
        ["c", "un ___ ami", ["nouvel", "nouveau", "nouvelle"], 0, "一個新朋友"],
        ["c", "Elle est très ___.", ["sportive", "sportif", "sportifs"], 0, "她很愛運動。"],
        ["f", "des fleurs ___ (rouge)", "rouges", "紅色的花"],
        ["o", "C'est / une / petite / maison / bleue", "這是一間藍色的小房子。"],
        ["t", "她很高興。", ["Elle est contente."]]
    ]
},
{
    id: "a1-10", level: "A1", title: "食物與部分冠詞", fr: "Je voudrais du pain",
    goal: "會點餐、買食物，學會部分冠詞 du / de la / des 和數量說法。",
    grammar: [
        { t: "部分冠詞", d: "吃喝「一些」無法數的東西時用**部分冠詞**：du（陽性）、de la（陰性）、de l'（母音前）、des（複數）。比較：J'aime **le** fromage（我喜歡起司，泛指）↔ Je mange **du** fromage（我吃一些起司）。",
          tb: [["", "部分冠詞", "例子"], ["陽性", "du", "du pain, du café"], ["陰性", "de la", "de la viande, de la salade"], ["母音前", "de l'", "de l'eau"], ["複數", "des", "des légumes"]] },
        { t: "否定與數量後面用 de", d: "否定句裡 un / une / des / du / de la 都變成 **de（d'）**：Je ne mange pas **de** viande。數量詞後面也接 **de**：beaucoup **de** sucre、un kilo **de** pommes、une bouteille **d'**eau。",
          ex: [["Je ne bois pas de café.", "我不喝咖啡。"], ["Il y a beaucoup de légumes.", "有很多蔬菜。"], ["Un kilo de tomates, s'il vous plaît.", "請給我一公斤番茄。"]] },
        { t: "禮貌點餐：je voudrais", d: "**Je voudrais**（我想要）比 je veux 客氣，點餐、購物都用它。",
          ex: [["Je voudrais un café et un croissant, s'il vous plaît.", "請給我一杯咖啡和一個可頌。"], ["Vous avez de l'eau gazeuse ?", "你們有氣泡水嗎？"]] }
    ],
    vocab: [["le pain", "麵包", "n.m."], ["le fromage", "起司", "n.m."], ["la viande", "肉", "n.f."], ["le poisson", "魚", "n.m."], ["les légumes", "蔬菜", "n.m."], ["le fruit", "水果", "n.m."], ["la pomme", "蘋果", "n.f."], ["l'eau", "水", "n.f."], ["le vin", "葡萄酒", "n.m."], ["le lait", "牛奶", "n.m."], ["le sucre", "糖", "n.m."], ["le beurre", "奶油", "n.m."], ["l'œuf", "蛋", "n.m."], ["le riz", "米飯", "n.m."], ["le petit-déjeuner", "早餐", "n.m."], ["le déjeuner", "午餐", "n.m."], ["le dîner", "晚餐", "n.m."], ["boire", "喝", "v."], ["l'addition", "帳單", "n.f."]],
    dialog: [["Serveur", "Bonjour, vous désirez ?", "您好，想點什麼？"], ["Client", "Je voudrais une salade et de l'eau, s'il vous plaît.", "請給我一份沙拉和水。"], ["Serveur", "Plate ou gazeuse ?", "一般水還是氣泡水？"], ["Client", "Plate. Et vous avez du poisson aujourd'hui ?", "一般水。今天有魚嗎？"], ["Serveur", "Non, désolé, il n'y a pas de poisson. Mais il y a du poulet.", "抱歉，沒有魚，但有雞肉。"], ["Client", "D'accord, du poulet alors. Et l'addition, s'il vous plaît.", "好，那就雞肉。還有，麻煩結帳。"]],
    ex: [
        ["c", "Je mange ___ pain le matin.", ["du", "de la", "le"], 0, "我早上吃麵包。"],
        ["c", "Tu veux ___ eau ?", ["de l'", "du", "de la"], 0, "你要水嗎？"],
        ["c", "Je ne mange pas ___ viande.", ["de", "de la", "la"], 0, "我不吃肉。"],
        ["f", "Une bouteille ___ vin, s'il vous plaît.", "de", "請給我一瓶葡萄酒。"],
        ["c", "J'adore ___ fromage !", ["le", "du", "de"], 0, "我超愛起司！"],
        ["t", "我想要一杯咖啡。", ["Je voudrais un café.", "Je voudrais un café, s'il vous plaît."]],
        ["l", "Il y a beaucoup de légumes.", "有很多蔬菜。"]
    ]
},
{
    id: "a1-11", level: "A1", title: "去哪裡：aller、venir 與地點介系詞", fr: "Je vais à Paris",
    goal: "會說要去哪裡、從哪裡來，正確使用 à / en / au / de 與縮寫。",
    grammar: [
        { t: "aller 與 venir", d: "兩個常用的不規則動詞。aller 後面接 **à**（去…），venir 後面接 **de**（從…來）。",
          tb: [["主詞", "aller 去", "venir 來"], ["je", "vais", "viens"], ["tu", "vas", "viens"], ["il / elle", "va", "vient"], ["nous", "allons", "venons"], ["vous", "allez", "venez"], ["ils / elles", "vont", "viennent"]] },
        { t: "à 和 de 的縮寫", d: "à 和 de 碰到 le、les 要合併；碰到 la、l' 不變。",
          tb: [["", "à", "de"], ["+ le", "au", "du"], ["+ la", "à la", "de la"], ["+ l'", "à l'", "de l'"], ["+ les", "aux", "des"]],
          ex: [["Je vais au cinéma.", "我去電影院。"], ["Elle va à la banque.", "她去銀行。"], ["Nous allons à l'université.", "我們去大學。"], ["Il vient du supermarché.", "他從超市回來。"]] },
        { t: "城市與國家", d: "城市前用 **à**；陰性國家（多半是 -e 結尾）用 **en**；陽性國家用 **au**；複數國家用 **aux**。「從…來」對應 de / du / des。",
          tb: [["", "去／在", "從…來"], ["城市", "à Paris", "de Paris"], ["陰性國家", "en France", "de France"], ["陽性國家", "au Japon", "du Japon"], ["複數國家", "aux États-Unis", "des États-Unis"]],
          ex: [["J'habite à Taipei, à Taïwan.", "我住在台灣台北。"], ["Il vient du Canada.", "他來自加拿大。"]] }
    ],
    vocab: [["aller", "去", "v."], ["venir", "來", "v."], ["la ville", "城市", "n.f."], ["le pays", "國家", "n.m."], ["la gare", "火車站", "n.f."], ["l'aéroport", "機場", "n.m."], ["la banque", "銀行", "n.f."], ["le supermarché", "超市", "n.m."], ["le restaurant", "餐廳", "n.m."], ["le cinéma", "電影院", "n.m."], ["la poste", "郵局", "n.f."], ["l'université", "大學", "n.f."], ["la bibliothèque", "圖書館", "n.f."], ["la plage", "海灘", "n.f."], ["le musée", "博物館", "n.m."], ["le Japon", "日本", "n.m."], ["les États-Unis", "美國", "n.m."]],
    dialog: [["Marc", "Tu vas où ce week-end ?", "你這個週末要去哪裡？"], ["Sarah", "Je vais à Bordeaux avec ma sœur.", "我和我妹妹要去波爾多。"], ["Marc", "Super ! Vous allez au musée ?", "太好了！你們會去博物館嗎？"], ["Sarah", "Oui, et à la plage aussi. Et toi ?", "會，也會去海灘。你呢？"], ["Marc", "Mes cousins viennent du Canada, alors je reste à Paris.", "我的表兄弟從加拿大來，所以我留在巴黎。"]],
    ex: [
        ["c", "Je vais ___ cinéma.", ["au", "à le", "à la"], 0, "我去電影院。"],
        ["c", "Elle habite ___ France.", ["en", "au", "à"], 0, "她住在法國。"],
        ["c", "Ils viennent ___ États-Unis.", ["des", "de les", "du"], 0, "他們來自美國。"],
        ["f", "Nous ___ à la gare. (aller)", "allons", "我們去火車站。"],
        ["f", "Tu ___ d'où ? (venir)", "viens", "你從哪裡來？"],
        ["o", "Je / vais / au / Japon / en / avril", "我四月要去日本。"],
        ["t", "我住在台北。", ["J'habite à Taipei."]]
    ]
},
{
    id: "a1-12", level: "A1", title: "faire、天氣與休閒", fr: "Il fait beau",
    goal: "會談天氣與季節，說自己做什麼運動、休閒活動。",
    grammar: [
        { t: "faire", d: "**faire**（做）是萬用動詞：做菜 faire la cuisine、購物 faire les courses、運動 faire du sport。注意 vous **faites**、ils **font**。",
          tb: [["主詞", "faire"], ["je", "fais"], ["tu", "fais"], ["il / elle", "fait"], ["nous", "faisons"], ["vous", "faites"], ["ils / elles", "font"]] },
        { t: "天氣", d: "大部分天氣用 **il fait** + 形容詞；下雨、下雪用專門的動詞；有風、有太陽用 **il y a**。",
          ex: [["Il fait beau aujourd'hui.", "今天天氣很好。"], ["Il fait froid en hiver.", "冬天很冷。"], ["Il pleut.", "下雨了。"], ["Il neige à Noël.", "聖誕節下雪。"], ["Il y a du vent.", "有風。"], ["Quel temps fait-il ?", "天氣怎麼樣？"]] },
        { t: "faire de / jouer à / jouer de", d: "做運動用 **faire du / de la**；玩球類或遊戲用 **jouer au / à la**；演奏樂器用 **jouer du / de la**。",
          tb: [["結構", "例子"], ["faire du / de la + 運動", "faire du vélo, faire de la natation"], ["jouer au / à la + 球類", "jouer au football, jouer aux cartes"], ["jouer du / de la + 樂器", "jouer du piano, jouer de la guitare"]] }
    ],
    vocab: [["faire", "做", "v."], ["le temps", "天氣；時間", "n.m."], ["chaud", "熱的", "adj."], ["froid", "冷的", "adj."], ["pleuvoir", "下雨", "v."], ["neiger", "下雪", "v."], ["le vent", "風", "n.m."], ["le soleil", "太陽", "n.m."], ["la pluie", "雨", "n.f."], ["la saison", "季節", "n.f."], ["le printemps", "春天", "n.m."], ["l'été", "夏天", "n.m."], ["l'automne", "秋天", "n.m."], ["l'hiver", "冬天", "n.m."], ["le vélo", "腳踏車", "n.m."], ["la natation", "游泳", "n.f."], ["le football", "足球", "n.m."], ["la cuisine", "烹飪；廚房", "n.f."], ["les courses", "採買", "n.f."]],
    dialog: [["Tom", "Quel temps fait-il à Taipei en été ?", "台北夏天天氣怎麼樣？"], ["Lin", "Il fait très chaud et il pleut souvent.", "很熱，而且常下雨。"], ["Tom", "Qu'est-ce que tu fais le week-end ?", "你週末做什麼？"], ["Lin", "Je fais du vélo et je joue du piano.", "我騎腳踏車，也彈鋼琴。"], ["Tom", "Moi, je joue au football avec des amis.", "我和朋友踢足球。"], ["Lin", "On fait les courses ensemble samedi ?", "我們星期六一起去採買好嗎？"]],
    ex: [
        ["c", "Vous ___ du sport ?", ["faites", "faisez", "font"], 0, "您做運動嗎？"],
        ["c", "Il ___ beau aujourd'hui.", ["fait", "est", "a"], 0, "今天天氣很好。"],
        ["c", "Je joue ___ piano.", ["du", "au", "le"], 0, "我彈鋼琴。"],
        ["c", "Ils jouent ___ tennis.", ["au", "du", "de"], 0, "他們打網球。"],
        ["f", "En hiver, il ___ froid.", "fait", "冬天很冷。"],
        ["t", "下雨了。", ["Il pleut."]],
        ["l", "Nous faisons la cuisine ensemble.", "我們一起做菜。"]
    ]
},
{
    id: "a1-13", level: "A1", title: "日常作息：反身動詞", fr: "Je me lève à sept heures",
    goal: "會用反身動詞描述一天的作息，並用順序詞串起來。",
    grammar: [
        { t: "反身動詞", d: "動作作用在自己身上的動詞，前面多一個**反身代名詞**，要和主詞一致：je **me** lève（我起床）。me / te / se 遇到母音變 m' / t' / s'。",
          tb: [["主詞", "代名詞", "se lever 起床"], ["je", "me", "je me lève"], ["tu", "te", "tu te lèves"], ["il / elle", "se", "il se lève"], ["nous", "nous", "nous nous levons"], ["vous", "vous", "vous vous levez"], ["ils / elles", "se", "ils se lèvent"]] },
        { t: "否定與原形", d: "否定時 ne … pas 包住「代名詞 + 動詞」：Je **ne me** lève **pas** tôt。接在其他動詞後面用原形，代名詞仍要配合主詞：Je vais **me** coucher。",
          ex: [["Le dimanche, je ne me lève pas tôt.", "星期天我不早起。"], ["Tu te couches à quelle heure ?", "你幾點睡？"], ["Nous allons nous promener.", "我們要去散步。"]] },
        { t: "順序詞", d: "**d'abord**（首先）→ **ensuite / puis**（然後）→ **enfin**（最後）。頻率：**toujours**（總是）、**souvent**（常常）、**parfois**（有時）、**d'habitude**（通常）。",
          ex: [["D'abord, je me lave. Ensuite, je m'habille.", "首先我洗澡，然後穿衣服。"], ["D'habitude, je prends un café le matin.", "我通常早上喝一杯咖啡。"]] }
    ],
    vocab: [["se lever", "起床", "v."], ["se réveiller", "醒來", "v."], ["se laver", "洗澡；洗", "v."], ["se brosser les dents", "刷牙", "loc."], ["s'habiller", "穿衣服", "v."], ["se coucher", "上床睡覺", "v."], ["se reposer", "休息", "v."], ["se promener", "散步", "v."], ["prendre une douche", "淋浴", "loc."], ["tôt", "早", "adv."], ["tard", "晚", "adv."], ["d'abord", "首先", "adv."], ["ensuite", "然後", "adv."], ["puis", "然後；接著", "adv."], ["enfin", "最後；終於", "adv."], ["d'habitude", "通常", "adv."], ["toujours", "總是；還", "adv."], ["souvent", "常常", "adv."], ["parfois", "有時候", "adv."]],
    dialog: [["Journaliste", "Décrivez votre journée, s'il vous plaît.", "請描述您的一天。"], ["Chef", "Je me lève à cinq heures, très tôt.", "我五點起床，很早。"], ["Chef", "D'abord, je prends une douche, puis je m'habille.", "先淋浴，然後穿衣服。"], ["Chef", "Ensuite, je vais au marché.", "接著我去市場。"], ["Journaliste", "Et le soir ?", "那晚上呢？"], ["Chef", "Je rentre tard et je me couche vers minuit.", "我很晚回家，大概半夜睡覺。"]],
    ex: [
        ["c", "Je ___ lève à sept heures.", ["me", "se", "te"], 0, "我七點起床。"],
        ["c", "Nous ___ couchons tard.", ["nous", "se", "vous"], 0, "我們很晚睡。"],
        ["f", "Elle ___. (s'habiller)", "s'habille", "她穿衣服。"],
        ["c", "Il ___ le matin.", ["ne se rase pas", "se ne rase pas", "ne rase se pas"], 0, "他早上不刮鬍子。"],
        ["o", "Je / vais / me / coucher", "我要去睡了。"],
        ["t", "你幾點起床？", ["Tu te lèves à quelle heure ?", "À quelle heure tu te lèves ?", "À quelle heure est-ce que tu te lèves ?"]],
        ["l", "D'habitude, je me réveille tôt.", "我通常很早醒來。"]
    ]
},
{
    id: "a1-14", level: "A1", title: "方位與問路", fr: "La gare est à droite",
    goal: "會描述東西的位置，問路並聽懂指路。",
    grammar: [
        { t: "位置介系詞", d: "有 **de** 的介系詞要注意縮寫：à côté **du** parc、près **de la** gare、en face **de l'**hôtel。",
          tb: [["法文", "意思"], ["dans", "在…裡面"], ["sur / sous", "在…上面／下面"], ["devant / derrière", "在…前面／後面"], ["entre … et …", "在…和…之間"], ["à côté de", "在…旁邊"], ["en face de", "在…對面"], ["près de / loin de", "離…近／遠"]],
          ex: [["Le chat est sous la table.", "貓在桌子下面。"], ["La pharmacie est à côté de la banque.", "藥局在銀行旁邊。"], ["L'hôtel est en face du musée.", "飯店在博物館對面。"]] },
        { t: "問路與指路", d: "問路：**Pardon, pour aller à la gare, s'il vous plaît ?** 或 **Où est la gare ?** 指路時常用命令式（vous 的形式）：**allez** tout droit、**tournez** à gauche、**prenez** la deuxième rue。",
          ex: [["Excusez-moi, il y a une pharmacie près d'ici ?", "不好意思，這附近有藥局嗎？"], ["Allez tout droit, puis tournez à droite.", "直走，然後右轉。"], ["C'est à cinq minutes à pied.", "走路五分鐘。"]] }
    ],
    vocab: [["à gauche", "在左邊", "loc."], ["à droite", "在右邊", "loc."], ["tout droit", "直走", "loc."], ["la rue", "街", "n.f."], ["le carrefour", "十字路口", "n.m."], ["le feu", "紅綠燈；火", "n.m."], ["le pont", "橋", "n.m."], ["le quartier", "街區", "n.m."], ["la pharmacie", "藥局", "n.f."], ["l'hôtel", "飯店", "n.m."], ["le parc", "公園", "n.m."], ["près de", "在…附近", "prép."], ["loin de", "離…遠", "prép."], ["à côté de", "在…旁邊", "prép."], ["en face de", "在…對面", "prép."], ["tourner", "轉彎", "v."], ["traverser", "穿越", "v."], ["à pied", "步行", "loc."], ["le plan", "地圖", "n.m."]],
    dialog: [["Touriste", "Pardon Madame, pour aller au musée d'Orsay, s'il vous plaît ?", "女士不好意思，請問去奧賽美術館怎麼走？"], ["Passante", "Allez tout droit jusqu'au pont.", "直走到橋那裡。"], ["Passante", "Traversez le pont, puis tournez à gauche.", "過橋，然後左轉。"], ["Touriste", "C'est loin ?", "很遠嗎？"], ["Passante", "Non, c'est à dix minutes à pied. Le musée est au bord de la Seine.", "不遠，走路十分鐘。美術館就在塞納河邊。"], ["Touriste", "Merci beaucoup !", "非常感謝！"]],
    ex: [
        ["c", "Le livre est ___ la table.", ["sur", "dans", "entre"], 0, "書在桌上。"],
        ["c", "La banque est à côté ___ parc.", ["du", "de le", "de la"], 0, "銀行在公園旁邊。"],
        ["c", "Allez tout ___.", ["droit", "droite", "gauche"], 0, "直走。"],
        ["f", "Tournez à ___. (左)", "gauche", "左轉。"],
        ["o", "La / gare / est / près / d' / ici", "火車站在這附近。"],
        ["t", "請問火車站在哪裡？", ["Où est la gare, s'il vous plaît ?", "Pardon, où est la gare ?"]],
        ["l", "Prenez la deuxième rue à droite.", "走右邊第二條街。"]
    ]
},
{
    id: "a1-15", level: "A1", title: "購物：指示形容詞、vouloir 與 pouvoir", fr: "Combien ça coûte ?",
    goal: "會在商店問價格、試穿、付款，用 ce / cette 指東西。",
    grammar: [
        { t: "指示形容詞", d: "「這個／那個」：陽性 **ce**，陽性母音前 **cet**，陰性 **cette**，複數 **ces**。要強調「這個」或「那個」，可以在名詞後加 **-ci** / **-là**。",
          tb: [["", "單數", "複數"], ["陽性", "ce pull / cet homme", "ces pulls"], ["陰性", "cette robe", "ces robes"]],
          ex: [["Je voudrais essayer cette robe.", "我想試穿這件洋裝。"], ["Ce pull-ci ou ce pull-là ?", "這件毛衣還是那件？"]] },
        { t: "vouloir 與 pouvoir", d: "**vouloir**（想要）、**pouvoir**（能夠、可以）後面常接原形動詞。禮貌請求用 **Je voudrais…**、**Je peux… ?**、**Vous pouvez… ?**",
          tb: [["主詞", "vouloir", "pouvoir"], ["je", "veux", "peux"], ["tu", "veux", "peux"], ["il / elle", "veut", "peut"], ["nous", "voulons", "pouvons"], ["vous", "voulez", "pouvez"], ["ils / elles", "veulent", "peuvent"]],
          ex: [["Je peux payer par carte ?", "我可以刷卡嗎？"], ["Vous voulez une autre taille ?", "您要別的尺寸嗎？"]] },
        { t: "問價格", d: "**Combien ça coûte ?** / **C'est combien ?** 回答：**Ça coûte 25 euros.** 太貴說 **C'est trop cher.**" }
    ],
    vocab: [["acheter", "買", "v."], ["vendre", "賣", "v."], ["coûter", "價值；花費", "v."], ["le prix", "價格", "n.m."], ["cher", "貴的", "adj."], ["bon marché", "便宜的", "adj."], ["l'euro", "歐元", "n.m."], ["la taille", "尺寸；身高", "n.f."], ["le magasin", "商店", "n.m."], ["le vêtement", "衣服", "n.m."], ["la chemise", "襯衫", "n.f."], ["le pantalon", "褲子", "n.m."], ["la robe", "洋裝", "n.f."], ["les chaussures", "鞋子", "n.f."], ["le pull", "毛衣", "n.m."], ["essayer", "試穿；嘗試", "v."], ["payer", "付錢", "v."], ["la carte bancaire", "金融卡；信用卡", "n.f."], ["vouloir", "想要", "v."], ["pouvoir", "能夠；可以", "v."]],
    dialog: [["Vendeuse", "Bonjour, je peux vous aider ?", "您好，需要幫忙嗎？"], ["Cliente", "Oui, je voudrais essayer ce pantalon en taille 38.", "我想試穿這條褲子，38 號。"], ["Vendeuse", "Bien sûr. La cabine est au fond.", "當然。試衣間在最裡面。"], ["Cliente", "Il me va bien. Combien ça coûte ?", "很合身。多少錢？"], ["Vendeuse", "Quarante-cinq euros.", "四十五歐元。"], ["Cliente", "Parfait. Je peux payer par carte ?", "好。我可以刷卡嗎？"]],
    ex: [
        ["c", "Je voudrais ___ chemise.", ["cette", "ce", "cet"], 0, "我想要這件襯衫。"],
        ["c", "___ homme est mon professeur.", ["Cet", "Ce", "Cette"], 0, "這位男士是我的老師。"],
        ["c", "Vous ___ m'aider ?", ["pouvez", "pouvons", "peuvent"], 0, "您可以幫我嗎？"],
        ["f", "Ils ___ acheter une voiture. (vouloir)", "veulent", "他們想買一輛車。"],
        ["f", "Ça ___ combien ? (coûter)", "coûte", "這多少錢？"],
        ["t", "太貴了。", ["C'est trop cher."]],
        ["l", "Je peux essayer ces chaussures ?", "我可以試穿這雙鞋嗎？"]
    ]
},
{
    id: "a1-16", level: "A1", title: "近未來與近過去", fr: "Je vais partir",
    goal: "用 aller + 原形說「要做」，用 venir de + 原形說「剛做完」。",
    grammar: [
        { t: "近未來 aller + 原形", d: "表示**即將**或**計畫**要做的事，口語非常常用。否定時 ne … pas 包住 aller：Je **ne vais pas** sortir。",
          ex: [["Je vais partir en vacances.", "我要去度假了。"], ["Il va pleuvoir ce soir.", "今晚要下雨了。"], ["Nous allons visiter Lyon la semaine prochaine.", "我們下週要去里昂玩。"], ["Tu ne vas pas travailler demain ?", "你明天不上班嗎？"]] },
        { t: "近過去 venir de + 原形", d: "表示**剛剛**做完的事。注意 de 遇到母音變 **d'**。",
          ex: [["Je viens d'arriver.", "我剛到。"], ["Elle vient de partir.", "她剛走。"], ["Nous venons de manger.", "我們剛吃過。"]] },
        { t: "時間詞", d: "未來：**ce soir**（今晚）、**demain**（明天）、**la semaine prochaine**（下週）、**bientôt**（不久）。剛剛：**tout à l'heure**（剛才／等一下）、**juste**（剛好）、**déjà**（已經）。" }
    ],
    vocab: [["bientôt", "不久；很快", "adv."], ["ce soir", "今晚", "loc."], ["la semaine prochaine", "下週", "loc."], ["l'année prochaine", "明年", "loc."], ["tout de suite", "馬上", "loc."], ["tout à l'heure", "剛才；等一下", "loc."], ["déjà", "已經", "adv."], ["partir", "出發；離開", "v."], ["arriver", "抵達", "v."], ["commencer", "開始", "v."], ["finir", "結束", "v."], ["le projet", "計畫", "n.m."], ["les vacances", "假期", "n.f."], ["le train", "火車", "n.m."], ["le billet", "票", "n.m."], ["visiter", "參觀", "v."]],
    dialog: [["Chloé", "Allô, tu es où ?", "喂，你在哪裡？"], ["Max", "Je viens d'arriver à la gare.", "我剛到火車站。"], ["Chloé", "Le train va partir dans dix minutes !", "火車十分鐘後就要開了！"], ["Max", "Pas de problème, je viens d'acheter les billets.", "沒問題，我剛買好票了。"], ["Chloé", "Super. Qu'est-ce qu'on va faire à Nice ?", "太好了。我們到尼斯要做什麼？"], ["Max", "On va nager et on va manger des glaces !", "我們要游泳，還要吃冰淇淋！"]],
    ex: [
        ["c", "Demain, je ___ visiter le musée.", ["vais", "viens", "suis"], 0, "明天我要去參觀博物館。"],
        ["c", "Elle vient ___ arriver.", ["d'", "de", "à"], 0, "她剛到。"],
        ["f", "Nous ___ de manger. (剛吃完)", "venons", "我們剛吃過。"],
        ["f", "Ils ___ partir en vacances. (即將)", "vont", "他們要去度假了。"],
        ["o", "Je / ne / vais / pas / sortir / ce / soir", "我今晚不出去。"],
        ["t", "我剛到。", ["Je viens d'arriver."]],
        ["l", "Il va pleuvoir cet après-midi.", "今天下午要下雨了。"]
    ]
}
);
