// ===================== A2 基礎 =====================
FR_COURSE.push(
{
    id: "a2-01", level: "A2", title: "複合過去式（一）：avoir", fr: "Hier, j'ai visité Paris",
    goal: "會用複合過去式說已經發生的事，記住常見的不規則過去分詞。",
    grammar: [
        { t: "構成：avoir + 過去分詞", d: "複合過去式（passé composé）是口語最常用的過去式，表示**已經完成**的事。大部分動詞用 **avoir 的現在式 + 過去分詞**。規則動詞的過去分詞：-er → **-é**、-ir → **-i**、-re → **-u**。",
          tb: [["原形", "過去分詞", "例句"], ["parler", "parlé", "J'ai parlé avec lui."], ["finir", "fini", "Tu as fini ?"], ["attendre", "attendu", "Nous avons attendu une heure."]] },
        { t: "常見不規則過去分詞", d: "這些要背起來，使用頻率非常高。",
          tb: [["原形", "過去分詞", "原形", "過去分詞"], ["être", "été", "avoir", "eu"], ["faire", "fait", "prendre", "pris"], ["mettre", "mis", "dire", "dit"], ["écrire", "écrit", "voir", "vu"], ["lire", "lu", "boire", "bu"], ["pouvoir", "pu", "vouloir", "voulu"], ["devoir", "dû", "savoir", "su"], ["connaître", "connu", "ouvrir", "ouvert"]] },
        { t: "否定與時間詞", d: "否定時 ne … pas 包住**助動詞**：Je **n'ai pas** mangé。常用時間詞：hier（昨天）、la semaine dernière（上週）、il y a deux jours（兩天前）、déjà（已經）、pas encore（還沒）。",
          ex: [["Hier, j'ai visité le Louvre.", "昨天我參觀了羅浮宮。"], ["Elle a pris le métro.", "她搭了地鐵。"], ["Je n'ai pas encore fini.", "我還沒做完。"], ["Il y a deux ans, nous avons fait un voyage au Maroc.", "兩年前我們去摩洛哥旅行。"]] }
    ],
    vocab: [["hier", "昨天", "adv."], ["avant-hier", "前天", "adv."], ["la semaine dernière", "上週", "loc."], ["le mois dernier", "上個月", "loc."], ["il y a", "…以前", "loc."], ["pas encore", "還沒", "loc."], ["une fois", "一次", "loc."], ["le voyage", "旅行", "n.m."], ["oublier", "忘記", "v."], ["perdre", "遺失；輸", "v."], ["trouver", "找到", "v."], ["gagner", "贏；賺", "v."], ["rencontrer", "遇見", "v."], ["la soirée", "晚會；晚上", "n.f."], ["le week-end dernier", "上週末", "loc."]],
    dialog: [["Julie", "Qu'est-ce que tu as fait le week-end dernier ?", "你上週末做了什麼？"], ["Ben", "J'ai vu un film et j'ai lu un roman.", "我看了一部電影，還讀了一本小說。"], ["Julie", "Tu as aimé le film ?", "你喜歡那部電影嗎？"], ["Ben", "Oui, beaucoup. Et toi ?", "很喜歡。妳呢？"], ["Julie", "Moi, j'ai fait une soirée chez moi. On a beaucoup mangé !", "我在家辦了個聚會。我們吃了很多！"], ["Ben", "Tu n'as pas invité Marc ?", "妳沒邀馬克嗎？"], ["Julie", "Si, mais il n'a pas pu venir.", "有啊，但他沒辦法來。"]],
    culture: "回答否定問句「Tu n'as pas… ?」時，若要表示「有，我有」，法文用 **si** 而不是 oui。",
    ex: [
        ["c", "Hier, j'___ mangé une pizza.", ["ai", "suis", "as"], 0, "昨天我吃了披薩。"],
        ["c", "faire 的過去分詞是：", ["fait", "faisé", "fai"], 0, "做"],
        ["f", "Nous avons ___ le train. (prendre)", "pris", "我們搭了火車。"],
        ["f", "Tu as ___ ce livre ? (lire)", "lu", "你讀過這本書嗎？"],
        ["o", "Je / n' / ai / pas / encore / fini", "我還沒做完。"],
        ["t", "昨天我看了一部電影。", ["Hier, j'ai vu un film.", "J'ai vu un film hier."]],
        ["l", "Il y a deux jours, elle a perdu ses clés.", "兩天前她弄丟了鑰匙。"]
    ]
},
{
    id: "a2-02", level: "A2", title: "複合過去式（二）：être 與配合", fr: "Elle est arrivée hier",
    goal: "知道哪些動詞用 être 當助動詞，並讓過去分詞配合主詞。",
    grammar: [
        { t: "用 être 的動詞", d: "表示**移動或狀態改變**的一組動詞（約 16 個）和**所有反身動詞**，複合過去式用 être。可以想像一棟房子：arriver / partir、entrer / sortir、monter / descendre、naître / mourir、aller / venir、rester、tomber、rentrer、retourner、devenir、revenir。",
          tb: [["原形", "過去分詞", "原形", "過去分詞"], ["aller", "allé", "venir", "venu"], ["arriver", "arrivé", "partir", "parti"], ["entrer", "entré", "sortir", "sorti"], ["monter", "monté", "descendre", "descendu"], ["naître", "né", "mourir", "mort"], ["rester", "resté", "tomber", "tombé"], ["devenir", "devenu", "rentrer", "rentré"]] },
        { t: "過去分詞要配合主詞", d: "用 être 時，過去分詞像形容詞一樣配合主詞：陰性 **+e**、複數 **+s**。用 avoir 時不配合。",
          ex: [["Il est allé à Rome.", "他去了羅馬。"], ["Elle est allée à Rome.", "她去了羅馬。"], ["Nous sommes partis à huit heures.", "我們八點出發。"], ["Mes sœurs sont nées en mai.", "我的姊妹們在五月出生。"]] },
        { t: "反身動詞的過去式", d: "反身動詞一律用 être：**je me suis levé(e)**。否定：je **ne me suis pas** levé(e)。",
          ex: [["Ce matin, je me suis réveillée à six heures.", "今天早上我六點醒來。（女）"], ["Ils se sont promenés dans le parc.", "他們在公園散步。"], ["Tu ne t'es pas reposé ?", "你沒有休息嗎？"]] }
    ],
    vocab: [["arriver", "抵達", "v."], ["partir", "出發", "v."], ["entrer", "進入", "v."], ["sortir", "出去", "v."], ["monter", "上去", "v."], ["descendre", "下去", "v."], ["tomber", "跌倒；掉下", "v."], ["naître", "出生", "v."], ["mourir", "死亡", "v."], ["rester", "停留", "v."], ["rentrer", "回家", "v."], ["retourner", "回去", "v."], ["devenir", "變成", "v."], ["l'escalier", "樓梯", "n.m."], ["l'étage", "樓層", "n.m."]],
    dialog: [["Mère", "Tu es rentrée à quelle heure hier soir ?", "妳昨晚幾點回家？"], ["Fille", "Je suis rentrée vers minuit.", "我大概半夜回來。"], ["Mère", "Vous êtes allés où ?", "你們去了哪裡？"], ["Fille", "Nous sommes allés au concert, puis nous sommes restés au café.", "我們去聽音樂會，然後待在咖啡廳。"], ["Mère", "Et ton frère ?", "那妳哥哥呢？"], ["Fille", "Il est parti tôt. Il est tombé dans l'escalier et il s'est fait mal au pied.", "他很早就走了。他在樓梯跌倒，腳受傷了。"]],
    ex: [
        ["c", "Elle ___ partie à six heures.", ["est", "a", "sont"], 0, "她六點出發。"],
        ["c", "Nous sommes ___ au cinéma.", ["allés", "allé", "allée"], 0, "我們去了電影院。"],
        ["c", "Hier soir, je ___ sorti avec des amis.", ["suis", "ai", "es"], 0, "昨晚我和朋友出去。"],
        ["f", "Mes parents sont ___ en 1960. (naître)", "nés", "我父母在 1960 年出生。"],
        ["f", "Elle s'est ___ à sept heures. (lever)", "levée", "她七點起床。"],
        ["t", "她昨天到了。", ["Elle est arrivée hier.", "Hier, elle est arrivée."]],
        ["l", "Ils sont restés à la maison.", "他們待在家裡。"]
    ]
},
{
    id: "a2-03", level: "A2", title: "未完成過去式", fr: "Quand j'étais petit…",
    goal: "用未完成過去式描述過去的狀態、習慣與背景。",
    grammar: [
        { t: "構成", d: "用 **nous 的現在式**去掉 -ons 當字根，加上 **-ais, -ais, -ait, -ions, -iez, -aient**。唯一的例外是 être：字根 **ét-**。",
          tb: [["主詞", "parler（nous parlons）", "faire（nous faisons）", "être"], ["je", "parlais", "faisais", "étais"], ["tu", "parlais", "faisais", "étais"], ["il / elle", "parlait", "faisait", "était"], ["nous", "parlions", "faisions", "étions"], ["vous", "parliez", "faisiez", "étiez"], ["ils / elles", "parlaient", "faisaient", "étaient"]] },
        { t: "什麼時候用", d: "未完成過去式像在**畫背景**：①過去的描述（天氣、外表、感覺）②過去的習慣（以前常常…）③正在進行的動作。常搭配 **autrefois**（從前）、**avant**（以前）、**d'habitude**（通常）、**tous les jours**（每天）、**quand j'étais petit(e)**（我小時候）。",
          ex: [["Quand j'étais petite, j'habitais à la campagne.", "我小時候住在鄉下。"], ["Il faisait beau et les enfants jouaient dehors.", "天氣很好，孩子們在外面玩。"], ["Avant, nous allions à la plage chaque été.", "以前我們每年夏天都去海邊。"], ["Mon grand-père était très gentil.", "我爺爺人很好。"]] }
    ],
    vocab: [["autrefois", "從前", "adv."], ["avant", "以前", "adv."], ["l'enfance", "童年", "n.f."], ["le village", "村莊", "n.m."], ["la campagne", "鄉下", "n.f."], ["tous les jours", "每天", "loc."], ["chaque été", "每年夏天", "loc."], ["le souvenir", "回憶；紀念品", "n.m."], ["grandir", "長大", "v."], ["vivre", "生活", "v."], ["gentil", "親切的", "adj."], ["timide", "害羞的", "adj."], ["dehors", "在外面", "adv."], ["la cour", "庭院", "n.f."]],
    dialog: [["Petite-fille", "Mamie, comment c'était, ton enfance ?", "奶奶，妳小時候是什麼樣子？"], ["Mamie", "J'habitais dans un petit village. Il n'y avait pas de télévision.", "我住在一個小村莊，那時沒有電視。"], ["Petite-fille", "Qu'est-ce que tu faisais le soir ?", "那妳晚上都做什麼？"], ["Mamie", "On lisait, on chantait, et mon père racontait des histoires.", "我們看書、唱歌，我爸爸會講故事。"], ["Petite-fille", "Tu allais à l'école à pied ?", "妳走路上學嗎？"], ["Mamie", "Oui, tous les jours. C'était loin, mais j'étais heureuse.", "對，每天都是。路很遠，但我很快樂。"]],
    ex: [
        ["c", "Quand j'___ petit, je jouais au foot.", ["étais", "ai été", "suis"], 0, "我小時候踢足球。"],
        ["f", "Avant, nous ___ à Lyon. (habiter)", "habitions", "我們以前住在里昂。"],
        ["f", "Il ___ beau. (faire，未完成過去式)", "faisait", "天氣很好。"],
        ["c", "Ils ___ souvent au cinéma.", ["allaient", "allaitent", "allions"], 0, "他們以前常去看電影。"],
        ["o", "Autrefois / il / n' / y / avait / pas / d' / internet", "從前沒有網路。"],
        ["t", "我小時候很害羞。", ["Quand j'étais petit, j'étais timide.", "Quand j'étais petite, j'étais timide."]],
        ["l", "Les enfants jouaient dans la cour.", "孩子們在院子裡玩。"]
    ]
},
{
    id: "a2-04", level: "A2", title: "複合過去式 vs 未完成過去式", fr: "Il pleuvait quand je suis sorti",
    goal: "會區分兩種過去式，講一段過去的故事。",
    grammar: [
        { t: "背景與事件", d: "把故事想成電影：**未完成過去式**是布景與正在進行的狀態（天氣、心情、當時在做什麼）；**複合過去式**是突然發生、推動劇情的事件。",
          tb: [["未完成過去式 imparfait", "複合過去式 passé composé"], ["描述、背景", "完成的動作、事件"], ["習慣、重複", "發生一次、次數明確"], ["沒有明確開始或結束", "有明確時間點"], ["souvent, toujours, pendant que", "soudain, tout à coup, un jour"]],
          ex: [["Il pleuvait quand je suis sorti.", "我出門的時候正在下雨。"], ["Je lisais quand le téléphone a sonné.", "電話響的時候我正在看書。"], ["Pendant que nous dînions, il est arrivé.", "我們吃晚餐時他到了。"], ["D'habitude je prenais le bus, mais ce jour-là j'ai pris un taxi.", "我平常搭公車，但那天我搭了計程車。"]] },
        { t: "同一個動詞，不同意思", d: "時態不同意思也會不同：**J'étais malade**（那時我生病，狀態）／**J'ai été malade**（我生了一場病，已經過去）。**Je connaissais Paul**（我那時認識保羅）／**J'ai connu Paul en 2010**（我在 2010 年認識保羅）。" }
    ],
    vocab: [["soudain", "突然", "adv."], ["tout à coup", "突然間", "loc."], ["un jour", "有一天", "loc."], ["pendant que", "在…的時候", "conj."], ["au moment où", "正當…的時候", "loc."], ["l'accident", "意外", "n.m."], ["la police", "警察", "n.f."], ["le voleur", "小偷", "n.m."], ["sonner", "（鈴）響", "v."], ["crier", "大叫", "v."], ["se passer", "發生", "v."], ["raconter", "講述", "v."], ["l'histoire", "故事；歷史", "n.f."], ["avoir peur", "害怕", "loc."]],
    dialog: [["Policier", "Racontez-moi ce qui s'est passé.", "請告訴我發生了什麼事。"], ["Témoin", "Il était huit heures. J'attendais le bus.", "那時是八點，我在等公車。"], ["Témoin", "Il faisait nuit et il y avait beaucoup de monde.", "天已經黑了，人很多。"], ["Témoin", "Tout à coup, un homme a pris le sac d'une dame.", "突然一個男人搶了一位女士的包包。"], ["Policier", "Comment était cet homme ?", "那個男人長什麼樣子？"], ["Témoin", "Il était grand et il portait une veste noire. Il est parti vers la gare.", "他很高，穿著黑色夾克。他往火車站跑了。"]],
    ex: [
        ["c", "Je dormais quand tu ___ .", ["as téléphoné", "téléphonais", "téléphones"], 0, "你打電話來的時候我正在睡覺。"],
        ["c", "Quand j'étais enfant, je ___ souvent chez mes grands-parents.", ["allais", "suis allé", "vais"], 0, "我小時候常去祖父母家。"],
        ["c", "Soudain, la lumière ___ .", ["s'est éteinte", "s'éteignait", "s'éteint"], 0, "突然燈熄了。"],
        ["f", "Il ___ (faire) froid quand nous sommes arrivés.", "faisait", "我們到的時候天氣很冷。"],
        ["f", "Pendant que je cuisinais, le téléphone a ___ . (sonner)", "sonné", "我在煮飯的時候電話響了。"],
        ["t", "我出門的時候正在下雨。", ["Il pleuvait quand je suis sorti.", "Il pleuvait quand je suis sortie."]]
    ]
},
{
    id: "a2-05", level: "A2", title: "直接受詞代名詞", fr: "Je le connais",
    goal: "用 le / la / les 等代名詞取代前面提過的人或東西，避免重複。",
    grammar: [
        { t: "直接受詞代名詞", d: "動詞後面直接接的人或物（沒有介系詞），可以用代名詞取代，放在**動詞前面**。le / la 遇到母音變 l'。",
          tb: [["人稱", "代名詞", "例句"], ["我", "me (m')", "Il me regarde."], ["你", "te (t')", "Je t'aime."], ["他／它（陽）", "le (l')", "Le film ? Je le regarde."], ["她／它（陰）", "la (l')", "La clé ? Je la cherche."], ["我們", "nous", "Ils nous invitent."], ["您；你們", "vous", "Je vous écoute."], ["他們；它們", "les", "Les livres ? Je les prends."]] },
        { t: "位置", d: "一般放在變化的動詞前；否定時被 ne … pas 包住；有原形動詞時放在**原形前**；複合過去式放在**助動詞前**。",
          ex: [["Tu connais Marie ? — Oui, je la connais.", "你認識瑪麗嗎？——認識，我認識她。"], ["Je ne le vois pas.", "我沒看到他（它）。"], ["Je vais les acheter demain.", "我明天要去買它們。"], ["Le gâteau ? Je l'ai mangé.", "蛋糕？我吃掉了。"]] }
    ],
    vocab: [["connaître", "認識；了解", "v."], ["inviter", "邀請", "v."], ["aider", "幫助", "v."], ["attendre", "等待", "v."], ["chercher", "尋找", "v."], ["prendre", "拿；搭乘", "v."], ["porter", "穿；拿著", "v."], ["la veste", "外套", "n.f."], ["le gâteau", "蛋糕", "n.m."], ["le journal", "報紙", "n.m."], ["les lunettes", "眼鏡", "n.f."], ["le portable", "手機", "n.m."]],
    dialog: [["Anne", "Tu as vu mes lunettes ?", "你有看到我的眼鏡嗎？"], ["Paul", "Non, je ne les vois pas. Tu les cherches où ?", "沒有，我沒看到。妳在哪裡找？"], ["Anne", "Partout ! Et mon portable, tu l'as pris ?", "到處都找了！還有我的手機，你拿走了嗎？"], ["Paul", "Oui, je l'ai mis sur la table.", "對，我把它放在桌上了。"], ["Anne", "Ah, merci. Tu m'attends ? Je pars dans cinq minutes.", "啊，謝謝。你等我嗎？我五分鐘後出門。"], ["Paul", "D'accord, je t'attends en bas.", "好，我在樓下等妳。"]],
    ex: [
        ["c", "Le film ? Je ___ regarde ce soir.", ["le", "la", "les"], 0, "那部電影？我今晚看。"],
        ["c", "Ta sœur ? Je ne ___ connais pas.", ["la", "le", "lui"], 0, "你姊姊？我不認識她。"],
        ["c", "Ces chaussures ? Je vais ___ acheter.", ["les", "leur", "le"], 0, "這雙鞋？我要買下來。"],
        ["f", "Tu ___ ? (我 + aimer)", "m'aimes", "你愛我嗎？"],
        ["o", "Je / l' / ai / mis / sur / la / table", "我把它放在桌上了。"],
        ["t", "我在等你。", ["Je t'attends."]]
    ]
},
{
    id: "a2-06", level: "A2", title: "間接受詞代名詞", fr: "Je lui téléphone",
    goal: "用 lui / leur 取代「à + 人」，分清楚 le 和 lui。",
    grammar: [
        { t: "間接受詞代名詞", d: "動詞後面用 **à + 人** 的時候（parler à、téléphoner à、donner à…），用間接受詞代名詞取代。me、te、nous、vous 和直接受詞相同；不同的是第三人稱：**lui**（他或她）、**leur**（他們）。",
          tb: [["人稱", "代名詞", "例句"], ["我", "me (m')", "Il me parle."], ["你", "te (t')", "Je te donne ce livre."], ["他／她", "lui", "Je lui téléphone."], ["我們", "nous", "Elle nous écrit."], ["您；你們", "vous", "Je vous réponds demain."], ["他們", "leur", "Nous leur offrons un cadeau."]] },
        { t: "常接 à + 人 的動詞", d: "parler à（跟…說話）、téléphoner à（打電話給）、écrire à（寫信給）、répondre à（回覆）、donner à（給）、offrir à（送）、demander à（問）、dire à（告訴）、envoyer à（寄給）、prêter à（借給）。注意：**aider、inviter、regarder** 是直接受詞（je **l'**aide），不要搞混。",
          ex: [["Tu as parlé à Marc ? — Oui, je lui ai parlé.", "你跟馬克說了嗎？——說了。"], ["Je leur envoie un message.", "我傳訊息給他們。"], ["Elle ne lui répond pas.", "她不回他。"], ["Qu'est-ce que tu vas offrir à ta mère ? — Je vais lui offrir des fleurs.", "你要送你媽媽什麼？——我要送她花。"]] }
    ],
    vocab: [["téléphoner", "打電話", "v."], ["écrire", "寫", "v."], ["répondre", "回答；回覆", "v."], ["donner", "給", "v."], ["offrir", "送；提供", "v."], ["prêter", "借出", "v."], ["envoyer", "寄；傳送", "v."], ["montrer", "給…看", "v."], ["expliquer", "解釋", "v."], ["dire", "說；告訴", "v."], ["le cadeau", "禮物", "n.m."], ["la lettre", "信", "n.f."], ["le message", "訊息", "n.m."], ["les fleurs", "花", "n.f."]],
    dialog: [["Léo", "C'est l'anniversaire de Sophie demain. On lui offre quoi ?", "明天是蘇菲的生日，我們送她什麼？"], ["Mia", "On peut lui offrir un livre. Elle adore lire.", "可以送她一本書，她超愛看書。"], ["Léo", "Bonne idée. Et ses parents, tu leur as parlé de la fête ?", "好主意。那她爸媽，妳跟他們說過派對的事了嗎？"], ["Mia", "Pas encore. Je vais leur téléphoner ce soir.", "還沒，我今晚打電話給他們。"], ["Léo", "Tu peux me prêter dix euros ? Je te les rends lundi.", "妳可以借我十歐元嗎？我星期一還妳。"], ["Mia", "Bien sûr !", "當然！"]],
    ex: [
        ["c", "Tu téléphones à ta mère ? — Oui, je ___ téléphone.", ["lui", "la", "leur"], 0, "你打電話給你媽媽嗎？——對，我打給她。"],
        ["c", "J'écris à mes amis. → Je ___ écris.", ["leur", "les", "lui"], 0, "我寫信給我的朋友們。"],
        ["c", "J'aide mon frère. → Je ___ aide.", ["l'", "lui", "leur"], 0, "我幫我弟弟。"],
        ["f", "Il ne ___ répond pas. (她)", "lui", "他不回她。"],
        ["o", "Je / vais / leur / envoyer / un / message", "我要傳訊息給他們。"],
        ["t", "我打電話給他。", ["Je lui téléphone."]]
    ]
},
{
    id: "a2-07", level: "A2", title: "代名詞 y 與 en", fr: "J'y vais, j'en veux",
    goal: "用 y 取代地點和「à + 事物」，用 en 取代「de + 名詞」和數量。",
    grammar: [
        { t: "y", d: "**y** 取代 ①地點（à、en、chez、dans…）②「à + 事物」。位置和其他代名詞一樣放在動詞前。",
          ex: [["Tu vas à la piscine ? — Oui, j'y vais.", "你要去游泳池嗎？——對，我要去。"], ["Elle habite en Italie ? — Oui, elle y habite depuis deux ans.", "她住在義大利嗎？——對，她住在那裡兩年了。"], ["Tu penses à ton examen ? — Oui, j'y pense.", "你在想考試的事嗎？——對，我在想。"], ["On y va !", "我們走吧！"]] },
        { t: "en", d: "**en** 取代 ①部分冠詞 + 名詞（du, de la, des）②「de + 事物」③數量（數量要留在後面）。",
          ex: [["Tu veux du café ? — Oui, j'en veux bien.", "你要咖啡嗎？——好，我要一點。"], ["Vous avez des enfants ? — Oui, j'en ai deux.", "您有小孩嗎？——有，我有兩個。"], ["Il parle de son voyage ? — Oui, il en parle tout le temps.", "他在講他的旅行嗎？——對，他一直在講。"], ["Je n'en ai pas.", "我沒有（那個東西）。"]] },
        { t: "y 還是 en？", d: "看介系詞：**à** → y；**de** → en。但「à / de + 人」不用 y / en：Je pense **à elle**、Je parle **de lui**。",
          tb: [["原句", "代名詞"], ["Je vais au marché.", "J'y vais."], ["Je reviens du marché.", "J'en reviens."], ["Je pense à mes vacances.", "J'y pense."], ["J'ai besoin d'argent.", "J'en ai besoin."]] }
    ],
    vocab: [["penser à", "想到", "loc."], ["réfléchir à", "思考", "loc."], ["parler de", "談論", "loc."], ["avoir besoin de", "需要", "loc."], ["avoir envie de", "想要", "loc."], ["s'occuper de", "照顧；處理", "loc."], ["la piscine", "游泳池", "n.f."], ["le marché", "市場", "n.m."], ["l'argent", "錢", "n.m."], ["plusieurs", "幾個；好幾個", "adj."], ["quelques", "一些", "adj."], ["depuis", "自從；已經…", "prép."]],
    dialog: [["Vendeur", "Bonjour ! Vous voulez des tomates ?", "您好！要番茄嗎？"], ["Cliente", "Oui, j'en voudrais un kilo.", "要，我要一公斤。"], ["Vendeur", "Et des fraises ? Elles sont délicieuses !", "草莓呢？很好吃喔！"], ["Cliente", "Non merci, j'en ai déjà à la maison.", "不用了，謝謝，我家已經有了。"], ["Vendeur", "Vous venez souvent au marché ?", "您常來市場嗎？"], ["Cliente", "Oui, j'y viens tous les samedis.", "對，我每個星期六都來。"]],
    ex: [
        ["c", "Tu vas à Paris ? — Oui, j'___ vais demain.", ["y", "en", "le"], 0, "你要去巴黎嗎？——對，我明天去。"],
        ["c", "Tu as des frères ? — Oui, j'___ ai trois.", ["en", "y", "les"], 0, "你有兄弟嗎？——有，我有三個。"],
        ["c", "Tu as besoin de ce livre ? — Oui, j'___ ai besoin.", ["en", "y", "le"], 0, "你需要這本書嗎？——需要。"],
        ["c", "Tu penses à ton travail ? — Oui, j'___ pense.", ["y", "en", "lui"], 0, "你在想工作嗎？——對。"],
        ["f", "Vous voulez du thé ? — Non merci, je n'___ veux pas.", "en", "您要茶嗎？——不用了，謝謝。"],
        ["t", "我們走吧！", ["On y va !", "Allons-y !"]]
    ]
},
{
    id: "a2-08", level: "A2", title: "比較級與最高級", fr: "Plus grand que Paris",
    goal: "會比較人事物，說「最…」，掌握 meilleur 和 mieux。",
    grammar: [
        { t: "比較級", d: "**plus / moins / aussi + 形容詞或副詞 + que**。比較名詞的數量用 **plus de / moins de / autant de + 名詞 + que**。形容詞照樣要配合。",
          ex: [["Lyon est moins grand que Paris.", "里昂比巴黎小。"], ["Elle est aussi intelligente que son frère.", "她和她哥哥一樣聰明。"], ["Il parle plus vite que moi.", "他講話比我快。"], ["J'ai autant de travail que toi.", "我的工作和你一樣多。"]] },
        { t: "最高級", d: "**le / la / les + plus / moins + 形容詞**（+ de …）。形容詞在名詞後時，冠詞要重複：la ville **la plus** peuplée **de** France。",
          ex: [["C'est la plus belle ville du monde.", "這是世界上最美的城市。"], ["Paris est la ville la plus peuplée de France.", "巴黎是法國人口最多的城市。"], ["C'est le moins cher.", "這是最便宜的。"]] },
        { t: "bon 和 bien 的特殊形", d: "**bon**（好的，形容詞）→ meilleur → le meilleur；**bien**（好地，副詞）→ mieux → le mieux。不說 plus bon。",
          tb: [["", "比較級", "最高級"], ["bon（形容詞）", "meilleur(e)(s)", "le / la / les meilleur(e)(s)"], ["bien（副詞）", "mieux", "le mieux"], ["mauvais", "pire / plus mauvais", "le pire"]],
          ex: [["Ce restaurant est meilleur que l'autre.", "這家餐廳比另一家好。"], ["Elle chante mieux que moi.", "她唱得比我好。"], ["C'est le meilleur gâteau de ma vie !", "這是我這輩子吃過最好吃的蛋糕！"]] }
    ],
    vocab: [["plus", "更", "adv."], ["moins", "更少；較不", "adv."], ["aussi", "一樣；也", "adv."], ["autant", "一樣多", "adv."], ["meilleur", "更好的", "adj."], ["mieux", "更好地", "adv."], ["pire", "更糟的", "adj."], ["rapide", "快的", "adj."], ["lent", "慢的", "adj."], ["moderne", "現代的", "adj."], ["ancien", "古老的；以前的", "adj."], ["peuplé", "人口多的", "adj."], ["le monde", "世界；人群", "n.m."], ["la vie", "生活；生命", "n.f."]],
    dialog: [["Hana", "Tu préfères Paris ou Lyon ?", "你比較喜歡巴黎還是里昂？"], ["Noé", "Paris est plus beau, mais Lyon est moins cher et plus calme.", "巴黎比較美，但里昂比較便宜也比較安靜。"], ["Hana", "Et pour manger ?", "那吃呢？"], ["Noé", "Pour moi, on mange mieux à Lyon. C'est la capitale de la gastronomie !", "對我來說，在里昂吃得比較好。那裡是美食之都！"], ["Hana", "Alors c'est la meilleure ville de France ?", "那它是法國最棒的城市囉？"], ["Noé", "Pas forcément. Chacun a ses goûts.", "也不一定，每個人喜好不同。"]],
    ex: [
        ["c", "Le train est ___ rapide que le bus.", ["plus", "plus de", "le plus"], 0, "火車比公車快。"],
        ["c", "Ce gâteau est ___ que l'autre.", ["meilleur", "mieux", "plus bon"], 0, "這個蛋糕比另一個好吃。"],
        ["c", "Il parle français ___ que moi.", ["mieux", "meilleur", "plus bien"], 0, "他法文說得比我好。"],
        ["f", "C'est la ville la plus peuplée ___ France.", "de", "這是法國人口最多的城市。"],
        ["f", "J'ai ___ de livres que toi. (一樣多)", "autant", "我的書和你一樣多。"],
        ["t", "她和我一樣高。", ["Elle est aussi grande que moi."]]
    ]
},
{
    id: "a2-09", level: "A2", title: "簡單未來式", fr: "Demain, il fera beau",
    goal: "會用簡單未來式談計畫、預測與承諾。",
    grammar: [
        { t: "構成", d: "**原形動詞 + -ai, -as, -a, -ons, -ez, -ont**（就是 avoir 的現在式字尾）。-re 動詞先去掉 e：prendre → je prendrai。",
          tb: [["主詞", "parler", "finir", "prendre"], ["je", "parlerai", "finirai", "prendrai"], ["tu", "parleras", "finiras", "prendras"], ["il / elle", "parlera", "finira", "prendra"], ["nous", "parlerons", "finirons", "prendrons"], ["vous", "parlerez", "finirez", "prendrez"], ["ils / elles", "parleront", "finiront", "prendront"]] },
        { t: "不規則字根", d: "字尾一樣，只有字根不同。",
          tb: [["原形", "字根", "原形", "字根"], ["être", "ser-", "avoir", "aur-"], ["aller", "ir-", "faire", "fer-"], ["venir", "viendr-", "pouvoir", "pourr-"], ["vouloir", "voudr-", "devoir", "devr-"], ["savoir", "saur-", "voir", "verr-"], ["envoyer", "enverr-", "falloir", "il faudra"]] },
        { t: "用法", d: "簡單未來式比近未來（aller + 原形）正式、比較遠的未來。**quand** 引導未來的子句時，法文也要用未來式：Quand je **serai** grand…（中文、英文都用現在式）。",
          ex: [["Demain, il fera beau.", "明天天氣會很好。"], ["Dans dix ans, je serai médecin.", "十年後我會是醫生。"], ["Quand tu arriveras, appelle-moi.", "你到的時候打給我。"], ["Je te promets, je ne recommencerai pas.", "我答應你，我不會再犯。"]] }
    ],
    vocab: [["l'avenir", "未來", "n.m."], ["plus tard", "以後", "loc."], ["dans dix ans", "十年後", "loc."], ["la carrière", "職業生涯", "n.f."], ["se marier", "結婚", "v."], ["déménager", "搬家", "v."], ["promettre", "承諾", "v."], ["le médecin", "醫生", "n.m."], ["l'ingénieur", "工程師", "n.m."], ["la retraite", "退休", "n.f."], ["peut-être", "也許", "adv."], ["sûrement", "一定", "adv."]],
    dialog: [["Prof", "Qu'est-ce que vous ferez après vos études ?", "你們畢業後要做什麼？"], ["Elsa", "Je travaillerai dans une entreprise internationale.", "我會在一家跨國公司工作。"], ["Rayan", "Moi, je partirai un an au Canada.", "我會去加拿大一年。"], ["Prof", "Et quand vous reviendrez ?", "那你們回來之後呢？"], ["Rayan", "Je chercherai un travail à Paris. On verra !", "我會在巴黎找工作。到時候再說！"], ["Elsa", "Et peut-être que nous serons collègues !", "說不定我們會成為同事！"]],
    ex: [
        ["c", "Demain, je ___ au cinéma.", ["irai", "allerai", "vais aller"], 0, "明天我會去看電影。"],
        ["c", "Nous ___ en vacances en août.", ["serons", "êterons", "sommes"], 0, "我們八月會去度假。"],
        ["f", "Ils ___ demain. (venir)", "viendront", "他們明天會來。"],
        ["f", "Tu ___ le temps ? (avoir)", "auras", "你會有時間嗎？"],
        ["c", "Quand tu ___ à Paris, appelle-moi.", ["arriveras", "arrives", "arrivais"], 0, "你到巴黎的時候打給我。"],
        ["t", "明天天氣會很好。", ["Demain, il fera beau.", "Il fera beau demain."]],
        ["l", "On verra ce que l'avenir nous réserve.", "我們看看未來會怎樣。"]
    ]
},
{
    id: "a2-10", level: "A2", title: "命令式", fr: "Viens ici !",
    goal: "會下指令、給建議、提出邀請，包含否定和反身動詞。",
    grammar: [
        { t: "構成", d: "用現在式的 **tu、nous、vous** 三種形式，去掉主詞。**-er 動詞**（和 aller）的 tu 形式去掉 -s：tu parles → **Parle !**",
          tb: [["原形", "tu", "nous", "vous"], ["parler", "parle", "parlons", "parlez"], ["finir", "finis", "finissons", "finissez"], ["attendre", "attends", "attendons", "attendez"], ["aller", "va", "allons", "allez"], ["faire", "fais", "faisons", "faites"]] },
        { t: "不規則命令式", d: "這四個要另外背。",
          tb: [["原形", "tu", "nous", "vous"], ["être", "sois", "soyons", "soyez"], ["avoir", "aie", "ayons", "ayez"], ["savoir", "sache", "sachons", "sachez"], ["vouloir", "veuille", "veuillons", "veuillez"]],
          ex: [["Sois sage !", "要乖喔！"], ["N'ayez pas peur.", "別害怕。"], ["Veuillez patienter.", "請稍候。（正式）"]] },
        { t: "否定與代名詞", d: "否定：ne … pas 照常包住動詞（**Ne parle pas !**）。肯定命令式的代名詞放在**動詞後面**並加連字號，me / te 變成 **moi / toi**；否定時代名詞回到前面。",
          ex: [["Regarde-moi !", "看著我！"], ["Ne me regarde pas !", "別看我！"], ["Lève-toi, il est tard !", "起床，很晚了！"], ["Ne t'inquiète pas.", "別擔心。"], ["Asseyez-vous, s'il vous plaît.", "請坐。"]] }
    ],
    vocab: [["écouter", "聽", "v."], ["attendre", "等", "v."], ["se dépêcher", "趕快", "v."], ["faire attention", "注意；小心", "loc."], ["fermer", "關", "v."], ["ouvrir", "打開", "v."], ["répéter", "重複", "v."], ["s'asseoir", "坐下", "v."], ["s'inquiéter", "擔心", "v."], ["sage", "乖的；明智的", "adj."], ["patienter", "耐心等候", "v."], ["la recette", "食譜", "n.f."], ["mélanger", "攪拌；混合", "v."], ["ajouter", "加入", "v."]],
    dialog: [["Mère", "Dépêche-toi, on va être en retard !", "快點，我們要遲到了！"], ["Fils", "J'arrive ! Attends-moi !", "來了！等我！"], ["Mère", "Prends ton manteau, il fait froid.", "帶上大衣，外面很冷。"], ["Fils", "Où sont mes clés ?", "我的鑰匙在哪裡？"], ["Mère", "Regarde sur la table. Et n'oublie pas ton sandwich !", "看看桌上。還有別忘了你的三明治！"], ["Fils", "Ne t'inquiète pas, maman, j'ai tout.", "別擔心，媽，我都帶了。"]],
    culture: "食譜常用 vous 的命令式或原形動詞：**Mélangez** la farine et les œufs, puis **ajoutez** le lait.（把麵粉和蛋混合，再加入牛奶。）",
    ex: [
        ["c", "（對朋友）___ ici !", ["Viens", "Viens-tu", "Venez-vous"], 0, "過來這裡！"],
        ["c", "（對朋友）___ attention !", ["Fais", "Faites-tu", "Fait"], 0, "小心！"],
        ["c", "（對朋友）別擔心：", ["Ne t'inquiète pas.", "Ne inquiète-toi pas.", "Inquiète-toi pas."], 0, "別擔心。"],
        ["f", "___ patient ! (être, tu)", "Sois", "要有耐心！"],
        ["f", "Parle ! → 否定：Ne ___ pas !", "parle", "別說話！"],
        ["o", "Asseyez-vous / , / s'il / vous / plaît", "請坐。"],
        ["t", "看著我！", ["Regarde-moi !", "Regardez-moi !"]]
    ]
},
{
    id: "a2-11", level: "A2", title: "關係代名詞 qui、que、où", fr: "La ville où j'habite",
    goal: "用 qui、que、où 把兩個句子連成一句，描述人事物。",
    grammar: [
        { t: "qui、que、où", d: "**qui** 取代後面子句的**主詞**（後面接動詞）；**que** 取代**受詞**（後面接主詞 + 動詞，遇母音變 qu'）；**où** 取代**地點或時間**。",
          tb: [["關係代名詞", "取代", "例句"], ["qui", "主詞", "J'ai un ami qui habite à Nice."], ["que (qu')", "直接受詞", "Le livre que je lis est génial."], ["où", "地點／時間", "C'est la ville où je suis né."]],
          ex: [["La fille qui chante est ma sœur.", "在唱歌的那個女孩是我妹妹。"], ["C'est le film que tu m'as conseillé.", "這就是你推薦給我的電影。"], ["Le jour où je suis arrivé, il neigeait.", "我到的那天在下雪。"], ["Voici le restaurant où nous avons dîné.", "這就是我們吃晚餐的餐廳。"]] },
        { t: "怎麼判斷", d: "看空格後面：直接接動詞 → **qui**；接主詞（je, tu, il, Marie…）→ **que**；說地點或時間 → **où**。" }
    ],
    vocab: [["l'endroit", "地方", "n.m."], ["le moment", "時刻", "n.m."], ["la personne", "人", "n.f."], ["l'acteur", "演員（男）", "n.m."], ["l'actrice", "演員（女）", "n.f."], ["préféré", "最喜歡的", "adj."], ["conseiller", "建議；推薦", "v."], ["génial", "很棒的", "adj."], ["le quartier", "街區", "n.m."], ["la chanson", "歌", "n.f."], ["le roman", "小說", "n.m."], ["célèbre", "有名的", "adj."]],
    dialog: [["Lou", "Tu connais le café qui est en face de la gare ?", "你知道火車站對面那家咖啡廳嗎？"], ["Sam", "Oui, c'est le café où on s'est rencontrés !", "知道，就是我們第一次見面的那家！"], ["Lou", "Exactement. Le serveur que tu trouvais sympa travaille toujours là.", "沒錯。你覺得很友善的那個服務生還在那裡工作。"], ["Sam", "Ah oui ? On y va ce soir ?", "真的嗎？我們今晚去吧？"], ["Lou", "D'accord. Et je vais t'offrir le gâteau que tu préfères.", "好啊。我要請你吃你最喜歡的蛋糕。"]],
    ex: [
        ["c", "J'ai une amie ___ parle japonais.", ["qui", "que", "où"], 0, "我有個會說日文的朋友。"],
        ["c", "Le film ___ j'ai vu hier était super.", ["que", "qui", "où"], 0, "我昨天看的電影很棒。"],
        ["c", "C'est la maison ___ j'ai grandi.", ["où", "que", "qui"], 0, "這就是我長大的房子。"],
        ["c", "La chanson ___ chante est triste.", ["qu'il", "qui il", "où il"], 0, "他唱的歌很悲傷。"],
        ["f", "Le jour ___ tu es né, il pleuvait.", "où", "你出生的那天在下雨。"],
        ["t", "這是我最喜歡的書。（用 que）", ["C'est le livre que je préfère."]]
    ]
},
{
    id: "a2-12", level: "A2", title: "身體與健康", fr: "J'ai mal à la tête",
    goal: "會說哪裡痛、看醫生、買藥，用 depuis 說持續多久。",
    grammar: [
        { t: "avoir mal à", d: "「…痛」= **avoir mal à** + 定冠詞 + 身體部位，注意 à 的縮寫：mal **au** ventre、mal **à la** tête、mal **aux** dents、mal **à l'**oreille。",
          ex: [["J'ai mal à la tête.", "我頭痛。"], ["Il a mal au dos.", "他背痛。"], ["Tu as mal aux yeux ?", "你眼睛痛嗎？"], ["J'ai mal partout.", "我全身都痛。"]] },
        { t: "depuis + 現在式", d: "從過去持續到現在的狀態，法文用**現在式 + depuis**：J'ai de la fièvre **depuis** hier（我從昨天開始發燒）。問「多久了？」：**Depuis quand ?** / **Depuis combien de temps ?**",
          ex: [["Je tousse depuis trois jours.", "我咳嗽三天了。"], ["Depuis quand avez-vous mal ?", "您什麼時候開始痛的？"]] },
        { t: "il faut / devoir", d: "給建議或說必須做的事：**il faut** + 原形（一般性）、**devoir** + 原形（某人必須）。",
          ex: [["Il faut boire beaucoup d'eau.", "要多喝水。"], ["Vous devez rester au lit.", "您必須臥床休息。"], ["Il ne faut pas fumer.", "不可以抽菸。"]] }
    ],
    vocab: [["la tête", "頭", "n.f."], ["le ventre", "肚子", "n.m."], ["le dos", "背", "n.m."], ["la gorge", "喉嚨", "n.f."], ["les dents", "牙齒", "n.f."], ["le bras", "手臂", "n.m."], ["la jambe", "腿", "n.f."], ["le pied", "腳", "n.m."], ["la main", "手", "n.f."], ["les yeux", "眼睛", "n.m."], ["l'oreille", "耳朵", "n.f."], ["malade", "生病的", "adj."], ["la fièvre", "發燒", "n.f."], ["tousser", "咳嗽", "v."], ["la grippe", "流感", "n.f."], ["le médicament", "藥", "n.m."], ["l'ordonnance", "處方", "n.f."], ["se sentir", "感覺", "v."], ["le rendez-vous", "約診；約會", "n.m."]],
    dialog: [["Médecin", "Bonjour. Qu'est-ce qui ne va pas ?", "您好，哪裡不舒服？"], ["Patient", "J'ai mal à la gorge et j'ai de la fièvre.", "我喉嚨痛，還發燒。"], ["Médecin", "Depuis quand ?", "從什麼時候開始的？"], ["Patient", "Depuis avant-hier. Et je tousse beaucoup.", "從前天開始。而且我咳得很厲害。"], ["Médecin", "C'est la grippe. Vous devez vous reposer et boire beaucoup.", "這是流感。您要休息、多喝水。"], ["Médecin", "Voici une ordonnance. Prenez ce médicament trois fois par jour.", "這是處方。這個藥一天吃三次。"]],
    ex: [
        ["c", "J'ai mal ___ ventre.", ["au", "à la", "aux"], 0, "我肚子痛。"],
        ["c", "Elle a mal ___ dents.", ["aux", "au", "à les"], 0, "她牙痛。"],
        ["c", "J'ai de la fièvre ___ hier.", ["depuis", "pendant", "il y a"], 0, "我從昨天開始發燒。"],
        ["f", "Il ___ boire beaucoup d'eau. (必須，一般性)", "faut", "要多喝水。"],
        ["o", "Je / tousse / depuis / trois / jours", "我咳嗽三天了。"],
        ["t", "我頭痛。", ["J'ai mal à la tête."]],
        ["l", "Prenez ce médicament deux fois par jour.", "這個藥一天吃兩次。"]
    ]
},
{
    id: "a2-13", level: "A2", title: "旅行與交通", fr: "Un aller-retour pour Lyon",
    goal: "會買車票、問班次、說搭什麼交通工具。",
    grammar: [
        { t: "交通工具的介系詞", d: "坐在「裡面」的交通工具多用 **en**（en train、en voiture、en avion、en bus、en métro）；騎乘或步行用 **à**（à pied、à vélo、à moto）。動詞 **prendre**：prendre le train、prendre l'avion。",
          ex: [["Je vais au travail en métro.", "我搭地鐵上班。"], ["Elle va à l'école à vélo.", "她騎腳踏車上學。"], ["Nous prenons l'avion à 7 h.", "我們七點的飛機。"]] },
        { t: "買票與詢問", d: "常用句：**Un aller simple / un aller-retour pour Lyon, s'il vous plaît.**（一張去里昂的單程／來回票。）**Le train part de quelle voie ?**（火車從哪個月台出發？）**Il faut combien de temps pour aller à… ?**（到…要多久？）",
          ex: [["À quelle heure part le prochain train pour Nice ?", "下一班到尼斯的火車幾點開？"], ["Il faut deux heures en TGV.", "搭高鐵要兩個小時。"], ["Le vol est en retard de trente minutes.", "班機延誤三十分鐘。"]] },
        { t: "準時、提早、遲到", d: "**à l'heure**（準時）、**en avance**（提早）、**en retard**（遲到、誤點）。" }
    ],
    vocab: [["l'avion", "飛機", "n.m."], ["le bus", "公車", "n.m."], ["le métro", "地鐵", "n.m."], ["le vol", "班機", "n.m."], ["la valise", "行李箱", "n.f."], ["le passeport", "護照", "n.m."], ["l'aller simple", "單程票", "n.m."], ["l'aller-retour", "來回票", "n.m."], ["la réservation", "預訂", "n.f."], ["réserver", "預訂", "v."], ["la voie", "月台；車道", "n.f."], ["le quai", "月台", "n.m."], ["la correspondance", "轉乘", "n.f."], ["en retard", "遲到；誤點", "loc."], ["à l'heure", "準時", "loc."], ["en avance", "提早", "loc."], ["le guichet", "售票窗口", "n.m."], ["la sortie", "出口", "n.f."]],
    dialog: [["Voyageur", "Bonjour, un aller-retour pour Lyon, s'il vous plaît.", "您好，一張到里昂的來回票。"], ["Agent", "Pour quand ?", "什麼時候的？"], ["Voyageur", "Pour demain matin, et retour dimanche soir.", "明天早上去，星期天晚上回來。"], ["Agent", "Il y a un TGV à 8 h 15. C'est direct, il faut deux heures.", "8 點 15 分有一班高鐵，直達，要兩個小時。"], ["Voyageur", "Parfait. Il part de quelle voie ?", "很好。從哪個月台出發？"], ["Agent", "La voie sera affichée vingt minutes avant le départ.", "月台會在發車前二十分鐘公告。"]],
    ex: [
        ["c", "Je vais à Lyon ___ train.", ["en", "à", "par"], 0, "我搭火車去里昂。"],
        ["c", "Il va au bureau ___ pied.", ["à", "en", "de"], 0, "他走路去辦公室。"],
        ["c", "Le train est en ___ de dix minutes.", ["retard", "avance", "heure"], 0, "火車誤點十分鐘。"],
        ["f", "Un aller-___ pour Paris, s'il vous plaît.", "retour", "一張到巴黎的來回票。"],
        ["o", "À / quelle / heure / part / le / train / ?", "火車幾點開？"],
        ["t", "我搭地鐵上班。", ["Je vais au travail en métro.", "Je prends le métro pour aller au travail."]]
    ]
},
{
    id: "a2-14", level: "A2", title: "更多否定說法", fr: "Je ne fume plus",
    goal: "會說「從不、不再、什麼都沒、沒有人、只有、還沒」。",
    grammar: [
        { t: "ne … 的各種否定", d: "結構和 ne … pas 一樣，把 pas 換成其他字。",
          tb: [["否定", "意思", "例句"], ["ne … jamais", "從不", "Je ne mange jamais de viande."], ["ne … plus", "不再", "Il ne fume plus."], ["ne … rien", "什麼都不", "Je ne vois rien."], ["ne … personne", "沒有人", "Je ne connais personne ici."], ["ne … que", "只有", "Je n'ai que dix euros."], ["ne … pas encore", "還沒", "Elle n'est pas encore arrivée."]] },
        { t: "複合過去式中的位置", d: "jamais、plus、rien、pas encore 放在助動詞後；**personne** 和 **que** 放在過去分詞後。",
          ex: [["Je n'ai rien compris.", "我什麼都沒聽懂。"], ["Nous n'avons jamais vu la mer.", "我們從沒看過海。"], ["Je n'ai vu personne.", "我誰都沒看到。"], ["Elle n'a mangé qu'une pomme.", "她只吃了一顆蘋果。"]] },
        { t: "當主詞的 rien、personne", d: "rien 和 personne 也可以當主詞，ne 仍然要放在動詞前：**Personne ne** répond.（沒有人回答。）**Rien n'**est impossible.（沒有不可能的事。）" }
    ],
    vocab: [["jamais", "從不", "adv."], ["plus", "不再（否定時）", "adv."], ["rien", "什麼都沒有", "pron."], ["personne", "沒有人", "pron."], ["quelque chose", "某件事", "pron."], ["quelqu'un", "某人", "pron."], ["encore", "還；再", "adv."], ["fumer", "抽菸", "v."], ["la mer", "海", "n.f."], ["impossible", "不可能的", "adj."], ["comprendre", "理解；聽懂", "v."], ["seulement", "只有", "adv."]],
    dialog: [["Ami", "Tu veux une cigarette ?", "要來根菸嗎？"], ["Kenji", "Non merci, je ne fume plus depuis un an.", "不了，謝謝，我戒菸一年了。"], ["Ami", "Bravo ! Et tu bois encore du café ?", "厲害！那你還喝咖啡嗎？"], ["Kenji", "Je n'en bois qu'un le matin.", "我只有早上喝一杯。"], ["Ami", "Il y a quelqu'un à la porte ?", "門口有人嗎？"], ["Kenji", "Non, il n'y a personne. Je n'ai rien entendu.", "沒有，沒人。我什麼都沒聽到。"]],
    ex: [
        ["c", "Je ne vais ___ au cinéma, je n'aime pas ça.", ["jamais", "personne", "rien"], 0, "我從不去看電影，我不喜歡。"],
        ["c", "Il n'y a ___ dans la salle.", ["personne", "rien", "jamais"], 0, "教室裡沒有人。"],
        ["c", "Je n'ai ___ compris.", ["rien", "personne", "que"], 0, "我什麼都沒聽懂。"],
        ["f", "Elle ne travaille ___ ici. (不再)", "plus", "她不在這裡工作了。"],
        ["f", "Je n'ai ___ cinq euros. (只有)", "que", "我只有五歐元。"],
        ["o", "Personne / ne / répond / au / téléphone", "沒有人接電話。"],
        ["t", "我還沒吃。", ["Je n'ai pas encore mangé."]]
    ]
},
{
    id: "a2-15", level: "A2", title: "副詞", fr: "Il parle couramment",
    goal: "會把形容詞變成副詞，正確放在句子中。",
    grammar: [
        { t: "-ment 副詞的構成", d: "大部分副詞由**形容詞的陰性形 + -ment** 構成。陽性以母音結尾的直接加 -ment；-ant / -ent 結尾變成 **-amment / -emment**（兩者發音相同）。",
          tb: [["形容詞", "副詞", "規則"], ["lent → lente", "lentement", "陰性 + ment"], ["heureux → heureuse", "heureusement", "陰性 + ment"], ["vrai", "vraiment", "母音結尾 + ment"], ["poli", "poliment", "母音結尾 + ment"], ["courant", "couramment", "-ant → -amment"], ["évident", "évidemment", "-ent → -emment"]] },
        { t: "不規則副詞", d: "常用的 **bien**（好地，← bon）、**mal**（差地，← mauvais）、**vite**（快）、**mieux**、**souvent**、**toujours**、**déjà** 不是 -ment 形。" },
        { t: "位置", d: "副詞通常放在**動詞後面**。複合過去式中，短的常用副詞（bien、mal、déjà、beaucoup、toujours、souvent）放在**助動詞和過去分詞之間**；長的 -ment 副詞多放在過去分詞後。",
          ex: [["Il parle couramment chinois.", "他說中文很流利。"], ["J'ai bien dormi.", "我睡得很好。"], ["Elle a déjà fini.", "她已經做完了。"], ["Il a conduit prudemment.", "他開車很小心。"], ["Malheureusement, je ne peux pas venir.", "很可惜，我不能來。"]] }
    ],
    vocab: [["lentement", "慢慢地", "adv."], ["rapidement", "快速地", "adv."], ["facilement", "容易地", "adv."], ["vraiment", "真的", "adv."], ["heureusement", "幸好", "adv."], ["malheureusement", "可惜", "adv."], ["évidemment", "當然", "adv."], ["couramment", "流利地", "adv."], ["prudemment", "謹慎地", "adv."], ["bien", "好地", "adv."], ["mal", "差地；不好", "adv."], ["vite", "快", "adv."], ["rarement", "很少", "adv."], ["conduire", "開車", "v."]],
    dialog: [["Collègue", "Tu parles vraiment bien français maintenant !", "你現在法文說得真好！"], ["Yu", "Merci ! J'étudie régulièrement, tous les soirs.", "謝謝！我很規律地讀，每天晚上。"], ["Collègue", "Tu comprends facilement les films ?", "你看電影能輕鬆聽懂嗎？"], ["Yu", "Pas encore. Ils parlent trop vite !", "還不行，他們講太快了！"], ["Collègue", "Heureusement, il y a des sous-titres.", "幸好有字幕。"], ["Yu", "Évidemment, je les utilise souvent.", "當然，我常常用。"]],
    ex: [
        ["c", "lent → ___", ["lentement", "lentment", "lentemment"], 0, "慢慢地"],
        ["c", "évident → ___", ["évidemment", "évidentement", "évidament"], 0, "當然"],
        ["c", "J'ai ___ dormi.", ["bien", "bon", "bonne"], 0, "我睡得很好。"],
        ["f", "vrai → ___", "vraiment", "真的"],
        ["f", "heureux → ___", "heureusement", "幸好"],
        ["t", "他說法文很流利。", ["Il parle couramment français.", "Il parle français couramment."]]
    ]
},
{
    id: "a2-16", level: "A2", title: "強調代名詞與所有格代名詞", fr: "C'est à moi !",
    goal: "會用 moi、toi、lui 等強調代名詞，以及 le mien、la tienne 等所有格代名詞。",
    grammar: [
        { t: "強調代名詞", d: "用在 ①介系詞後（avec moi、chez toi、pour lui）②c'est 後（C'est moi.）③強調或對比（Moi, je préfère le thé.）④單獨回答（Qui veut du café ? — Moi !）⑤moi aussi / moi non plus。",
          tb: [["主詞", "強調代名詞"], ["je", "moi"], ["tu", "toi"], ["il / elle", "lui / elle"], ["nous", "nous"], ["vous", "vous"], ["ils / elles", "eux / elles"]],
          ex: [["Tu viens avec moi ?", "你跟我一起來嗎？"], ["Je vais chez eux ce soir.", "我今晚去他們家。"], ["J'aime le jazz. — Moi aussi !", "我喜歡爵士樂。——我也是！"], ["Je n'aime pas le froid. — Moi non plus.", "我不喜歡冷。——我也不喜歡。"]] },
        { t: "所有格代名詞", d: "取代「所有格 + 名詞」，陰陽單複數配合**被擁有的東西**：Ce n'est pas ma clé, c'est **la tienne**。表示「屬於某人」也常說 **c'est à moi / à toi**。",
          tb: [["", "陽單", "陰單", "陽複", "陰複"], ["我的", "le mien", "la mienne", "les miens", "les miennes"], ["你的", "le tien", "la tienne", "les tiens", "les tiennes"], ["他／她的", "le sien", "la sienne", "les siens", "les siennes"], ["我們的", "le nôtre", "la nôtre", "les nôtres", "les nôtres"], ["你們的", "le vôtre", "la vôtre", "les vôtres", "les vôtres"], ["他們的", "le leur", "la leur", "les leurs", "les leurs"]],
          ex: [["À qui est ce sac ? — C'est le mien.", "這個包包是誰的？——是我的。"], ["Ta voiture est rouge, la mienne est blanche.", "你的車是紅色的，我的是白色的。"]] }
    ],
    vocab: [["moi", "我（強調）", "pron."], ["toi", "你（強調）", "pron."], ["lui", "他（強調）", "pron."], ["eux", "他們（強調）", "pron."], ["chez", "在…家", "prép."], ["avec", "和；跟", "prép."], ["sans", "沒有", "prép."], ["pour", "為了；給", "prép."], ["le mien", "我的（東西）", "pron."], ["le tien", "你的（東西）", "pron."], ["à qui", "誰的", "loc."], ["moi aussi", "我也是", "loc."], ["moi non plus", "我也不", "loc."]],
    dialog: [["Lucie", "C'est ton parapluie ?", "這是你的傘嗎？"], ["Adam", "Non, ce n'est pas le mien. Le mien est noir.", "不是，不是我的。我的是黑色的。"], ["Lucie", "Alors c'est à qui ? À Thomas ?", "那是誰的？湯瑪士的嗎？"], ["Adam", "Je ne sais pas. Demande-lui.", "我不知道。妳問他。"], ["Lucie", "Thomas, c'est à toi ?", "湯瑪士，這是你的嗎？"], ["Thomas", "Oui, c'est le mien ! Merci, je le cherchais partout.", "對，是我的！謝謝，我到處找。"]],
    ex: [
        ["c", "Tu viens avec ___ ? (我)", ["moi", "me", "je"], 0, "你跟我一起來嗎？"],
        ["c", "Je dîne chez ___ ce soir. (他們)", ["eux", "leur", "ils"], 0, "我今晚在他們家吃晚餐。"],
        ["c", "Ce n'est pas ta clé, c'est ___ . (我的)", ["la mienne", "le mien", "ma"], 0, "這不是你的鑰匙，是我的。"],
        ["f", "J'aime le chocolat. — Moi ___ !", "aussi", "我喜歡巧克力。——我也是！"],
        ["f", "Je n'aime pas le froid. — Moi non ___ .", "plus", "我不喜歡冷。——我也不喜歡。"],
        ["t", "這是我的。", ["C'est à moi.", "C'est le mien.", "C'est la mienne."]]
    ]
}
);
