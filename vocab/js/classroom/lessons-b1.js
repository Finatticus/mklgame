// ===================== B1 進階 =====================
FR_COURSE.push(
{
    id: "b1-01", level: "B1", title: "條件式現在時", fr: "Je voudrais, j'aimerais…",
    goal: "用條件式表達禮貌請求、願望與建議。",
    grammar: [
        { t: "構成", d: "**簡單未來式的字根 + 未完成過去式的字尾**（-ais, -ais, -ait, -ions, -iez, -aient）。不規則字根和未來式完全相同：être → ser-、avoir → aur-、aller → ir-、faire → fer-、pouvoir → pourr-、vouloir → voudr-、devoir → devr-。",
          tb: [["主詞", "aimer", "pouvoir", "être"], ["je / j'", "aimerais", "pourrais", "serais"], ["tu", "aimerais", "pourrais", "serais"], ["il / elle", "aimerait", "pourrait", "serait"], ["nous", "aimerions", "pourrions", "serions"], ["vous", "aimeriez", "pourriez", "seriez"], ["ils / elles", "aimeraient", "pourraient", "seraient"]] },
        { t: "用法", d: "①**禮貌**：Je voudrais…、Pourriez-vous… ?、Ça vous dérangerait de… ? ②**願望**：J'aimerais voyager au Japon. ③**建議**：Tu devrais te reposer.（你應該休息。）④**不確定的消息**（新聞常用）：Le président serait malade.（據說總統生病了。）",
          ex: [["Pourriez-vous m'aider, s'il vous plaît ?", "可以請您幫我嗎？"], ["J'aimerais bien habiter à la campagne.", "我很想住在鄉下。"], ["Tu devrais parler à ton professeur.", "你應該跟你的老師談談。"], ["À ta place, je prendrais le train.", "如果我是你，我會搭火車。"]] }
    ],
    vocab: [["aimer bien", "很想；滿喜歡", "loc."], ["à ta place", "如果我是你", "loc."], ["déranger", "打擾", "v."], ["conseiller", "建議", "v."], ["le conseil", "建議", "n.m."], ["le souhait", "願望", "n.m."], ["rêver de", "夢想", "loc."], ["volontiers", "樂意地", "adv."], ["le service", "幫忙；服務", "n.m."], ["la place", "位子；地方", "n.f."], ["l'information", "資訊；新聞", "n.f."], ["selon", "根據", "prép."]],
    dialog: [["Client", "Excusez-moi, pourriez-vous me dire où se trouve la gare ?", "不好意思，可以告訴我火車站在哪裡嗎？"], ["Passante", "Bien sûr. Vous devriez prendre le bus 12, c'est plus rapide.", "當然。您應該搭 12 號公車，比較快。"], ["Client", "Merci. Vous sauriez à quelle heure il passe ?", "謝謝。您知道它幾點會來嗎？"], ["Passante", "Toutes les dix minutes, je crois.", "我想每十分鐘一班。"], ["Client", "Parfait. J'aimerais aussi acheter un plan.", "太好了。我也想買一張地圖。"], ["Passante", "Il y a un kiosque juste là. Bon voyage !", "那邊就有書報攤。旅途愉快！"]],
    ex: [
        ["c", "___-vous m'aider, s'il vous plaît ?", ["Pourriez", "Pouvez", "Pourrez"], 0, "可以請您幫我嗎？"],
        ["c", "J'___ un café, s'il vous plaît.", ["aimerais", "aimerai", "aimais"], 0, "我想要一杯咖啡。"],
        ["f", "Tu ___ te reposer. (devoir，條件式)", "devrais", "你應該休息。"],
        ["f", "Nous ___ voyager plus souvent. (vouloir，條件式)", "voudrions", "我們想更常旅行。"],
        ["f", "À ta place, je ___ le train. (prendre，條件式)", "prendrais", "如果我是你，我會搭火車。"],
        ["t", "我想要住在巴黎。（用 aimer 的條件式）", ["J'aimerais habiter à Paris.", "J'aimerais vivre à Paris.", "J'aimerais bien habiter à Paris."]],
        ["l", "Ça vous dérangerait de fermer la fenêtre ?", "您介意把窗戶關起來嗎？"]
    ]
},
{
    id: "b1-02", level: "B1", title: "條件句：si 的用法", fr: "Si j'avais le temps…",
    goal: "會說真實的條件與假設的情況。",
    grammar: [
        { t: "真實條件：si + 現在式", d: "可能發生的事：**si + 現在式**，主要子句用**現在式、未來式或命令式**。si 後面**不能**接未來式。si + il 要省音成 **s'il**。",
          ex: [["S'il fait beau, nous irons à la plage.", "如果天氣好，我們就去海邊。"], ["Si tu as faim, mange quelque chose.", "如果你餓了就吃點東西。"], ["Si je finis tôt, je t'appelle.", "如果我早點做完就打給你。"]] },
        { t: "假設：si + 未完成過去式 → 條件式", d: "和現在事實相反、或不太可能的情況：**si + 未完成過去式**，主要子句用**條件式**。",
          tb: [["子句", "時態", "例句"], ["si 子句", "未完成過去式", "Si j'avais de l'argent,"], ["主要子句", "條件式現在時", "je ferais le tour du monde."]],
          ex: [["Si j'étais riche, j'achèterais une maison à Nice.", "如果我很有錢，我會在尼斯買一棟房子。"], ["Si tu venais avec moi, ce serait plus amusant.", "如果你跟我一起去，會更好玩。"], ["Qu'est-ce que tu ferais si tu gagnais au loto ?", "如果你中了樂透，你會做什麼？"]] }
    ],
    vocab: [["si", "如果", "conj."], ["riche", "有錢的", "adj."], ["gagner au loto", "中樂透", "loc."], ["faire le tour du monde", "環遊世界", "loc."], ["avoir faim", "肚子餓", "loc."], ["avoir soif", "口渴", "loc."], ["avoir le temps", "有時間", "loc."], ["amusant", "好玩的", "adj."], ["la chance", "運氣；機會", "n.f."], ["imaginer", "想像", "v."], ["sinon", "否則", "adv."], ["à condition que", "只要…（接虛擬式）", "loc."]],
    dialog: [["Sophie", "Qu'est-ce que tu ferais si tu ne travaillais pas ?", "如果你不用工作，你會做什麼？"], ["Malik", "Si je ne travaillais pas, je voyagerais tout le temps.", "如果我不用工作，我會一直旅行。"], ["Sophie", "Et si tu pouvais vivre n'importe où ?", "那如果你可以住在任何地方呢？"], ["Malik", "J'habiterais au bord de la mer, en Bretagne.", "我會住在海邊，在布列塔尼。"], ["Sophie", "Moi aussi ! Si on a des vacances en juillet, on y va ?", "我也是！如果我們七月有假，就去那裡吧？"], ["Malik", "D'accord, si tu réserves l'hôtel !", "好啊，如果妳訂飯店的話！"]],
    ex: [
        ["c", "S'il ___ beau demain, on ira à la plage.", ["fait", "fera", "faisait"], 0, "如果明天天氣好，我們就去海邊。"],
        ["c", "Si j'avais le temps, j'___ le piano.", ["apprendrais", "apprendrai", "apprends"], 0, "如果我有時間，我會學鋼琴。"],
        ["f", "Si nous ___ riches, nous voyagerions. (être)", "étions", "如果我們很有錢，我們會去旅行。"],
        ["f", "Si tu ___ faim, il y a du pain. (avoir，現在式)", "as", "如果你餓了，有麵包。"],
        ["c", "si + il → ___", ["s'il", "si il", "s'ils"], 0, "如果他"],
        ["t", "如果我很有錢，我會買一棟房子。", ["Si j'étais riche, j'achèterais une maison."]]
    ]
},
{
    id: "b1-03", level: "B1", title: "虛擬式（一）：構成與 il faut que", fr: "Il faut que tu viennes",
    goal: "學會虛擬式的構成，並用在 il faut que 等必要性的句型。",
    grammar: [
        { t: "什麼是虛擬式", d: "虛擬式（subjonctif）不是時態，而是一種**語氣**：表達必要、願望、情感、懷疑等主觀的看法。它幾乎都出現在 **que** 引導的子句裡。" },
        { t: "規則構成", d: "用 **ils 的現在式**去掉 -ent 當字根，加上 **-e, -es, -e, -ions, -iez, -ent**。nous、vous 的形式通常和未完成過去式一樣。",
          tb: [["主詞", "parler（ils parlent）", "finir（ils finissent）", "venir（ils viennent）"], ["que je", "parle", "finisse", "vienne"], ["que tu", "parles", "finisses", "viennes"], ["qu'il / elle", "parle", "finisse", "vienne"], ["que nous", "parlions", "finissions", "venions"], ["que vous", "parliez", "finissiez", "veniez"], ["qu'ils / elles", "parlent", "finissent", "viennent"]] },
        { t: "不規則虛擬式", d: "最常用的幾個要背。",
          tb: [["原形", "que je", "que nous"], ["être", "sois", "soyons"], ["avoir", "aie", "ayons"], ["aller", "aille", "allions"], ["faire", "fasse", "fassions"], ["pouvoir", "puisse", "puissions"], ["savoir", "sache", "sachions"], ["vouloir", "veuille", "voulions"]] },
        { t: "il faut que + 虛擬式", d: "「某人必須…」。比較：**Il faut partir.**（一般性：得走了）／**Il faut que tu partes.**（你得走了）。",
          ex: [["Il faut que tu viennes à la réunion.", "你必須來開會。"], ["Il faut que nous fassions les courses.", "我們得去採買。"], ["Il ne faut pas que vous soyez en retard.", "你們不可以遲到。"], ["Il faut qu'elle aille chez le médecin.", "她得去看醫生。"]] }
    ],
    vocab: [["il faut que", "必須（接虛擬式）", "loc."], ["la réunion", "會議", "n.f."], ["nécessaire", "必要的", "adj."], ["important", "重要的", "adj."], ["il est temps que", "是時候…了", "loc."], ["obligatoire", "強制的", "adj."], ["le dossier", "文件；資料夾", "n.m."], ["remplir", "填寫", "v."], ["le formulaire", "表格", "n.m."], ["la signature", "簽名", "n.f."], ["avant que", "在…之前（接虛擬式）", "loc."], ["à temps", "及時", "loc."]],
    dialog: [["Employée", "Pour votre carte de séjour, il faut que vous remplissiez ce formulaire.", "辦居留證，您必須填這張表格。"], ["Étudiant", "D'accord. Il faut que je donne autre chose ?", "好的。我還需要給其他東西嗎？"], ["Employée", "Oui, il faut que vous apportiez deux photos et votre passeport.", "需要，您必須帶兩張照片和護照。"], ["Étudiant", "Et il faut que je revienne quand ?", "那我什麼時候要再來？"], ["Employée", "Dans deux semaines. Il est important que vous soyez à l'heure.", "兩週後。您一定要準時。"], ["Étudiant", "Merci beaucoup, madame.", "非常感謝您。"]],
    ex: [
        ["c", "Il faut que tu ___ tes devoirs.", ["fasses", "fais", "feras"], 0, "你必須寫作業。"],
        ["c", "Il faut que nous ___ à l'heure.", ["soyons", "sommes", "serons"], 0, "我們必須準時。"],
        ["f", "Il faut qu'elle ___ à la banque. (aller)", "aille", "她得去銀行。"],
        ["f", "Il faut que vous ___ ce formulaire. (remplir)", "remplissiez", "您必須填這張表格。"],
        ["f", "Il faut que j'___ de la patience. (avoir)", "aie", "我必須有耐心。"],
        ["t", "你必須來。", ["Il faut que tu viennes."]],
        ["l", "Il est temps que nous partions.", "我們該走了。"]
    ]
},
{
    id: "b1-04", level: "B1", title: "虛擬式（二）：意願、情感與懷疑", fr: "Je veux que tu sois heureux",
    goal: "知道哪些動詞後面接虛擬式，哪些接直陳式。",
    grammar: [
        { t: "接虛擬式的情況", d: "主要子句表達**意願**、**情感**、**懷疑**、**必要**時，que 後面用虛擬式。**注意：兩個子句主詞相同時改用原形**：Je veux partir（不說 je veux que je parte）。",
          tb: [["類型", "常見說法"], ["意願", "vouloir que, souhaiter que, préférer que, demander que"], ["情感", "être content que, avoir peur que, regretter que, être triste que"], ["懷疑", "douter que, ne pas penser que, ne pas croire que"], ["必要", "il faut que, il est important que, il est nécessaire que"], ["連接詞", "bien que, pour que, avant que, à condition que, sans que"]],
          ex: [["Je veux que tu sois heureux.", "我希望你幸福。"], ["Je suis contente que vous puissiez venir.", "我很高興你們能來。"], ["J'ai peur qu'il soit trop tard.", "我怕太遲了。"], ["Je ne pense pas qu'elle ait raison.", "我不認為她是對的。"]] },
        { t: "接直陳式的情況", d: "表達**確定**、**肯定的看法**時用直陳式：penser que、croire que、être sûr que、il est évident que、espérer que。**否定或疑問**的 penser / croire 才接虛擬式。",
          tb: [["直陳式（確定）", "虛擬式（不確定）"], ["Je pense qu'il vient.", "Je ne pense pas qu'il vienne."], ["Je crois que c'est vrai.", "Je ne crois pas que ce soit vrai."], ["Je suis sûr qu'elle sait.", "Je doute qu'elle sache."], ["J'espère que tu vas bien.", "Je souhaite que tu ailles bien."]] }
    ],
    vocab: [["souhaiter", "希望；祝", "v."], ["regretter", "遺憾；後悔", "v."], ["douter", "懷疑", "v."], ["avoir raison", "是對的", "loc."], ["avoir tort", "是錯的", "loc."], ["sûr", "確定的", "adj."], ["triste", "難過的", "adj."], ["étonné", "驚訝的", "adj."], ["bien que", "雖然（接虛擬式）", "conj."], ["pour que", "為了讓（接虛擬式）", "conj."], ["espérer", "希望", "v."], ["vrai", "真的", "adj."]],
    dialog: [["Père", "Je voudrais que tu fasses des études de médecine.", "我希望你念醫學。"], ["Fille", "Je sais, mais je ne pense pas que ce soit pour moi.", "我知道，但我不認為那適合我。"], ["Père", "Pourquoi ? Tu es bonne en sciences.", "為什麼？妳理科很好啊。"], ["Fille", "Je préfère étudier le design. J'ai peur que tu sois déçu.", "我比較想念設計。我怕你會失望。"], ["Père", "Je ne suis pas déçu. L'important, c'est que tu sois heureuse.", "我不會失望。重要的是妳要快樂。"], ["Fille", "Merci, papa. Je suis contente que tu comprennes.", "謝謝爸。我很高興你能理解。"]],
    ex: [
        ["c", "Je veux que tu ___ la vérité.", ["dises", "dis", "diras"], 0, "我要你說實話。"],
        ["c", "Je pense qu'il ___ raison.", ["a", "ait", "aura"], 0, "我認為他是對的。"],
        ["c", "Je ne crois pas qu'il ___ venir.", ["puisse", "peut", "pourra"], 0, "我不相信他能來。"],
        ["c", "Je veux ___.", ["partir", "que je parte", "que je pars"], 0, "我想走。"],
        ["f", "Je suis content que vous ___ là. (être)", "soyez", "我很高興你們在這裡。"],
        ["f", "Bien qu'il ___ froid, nous sortons. (faire)", "fasse", "雖然很冷，我們還是出門。"],
        ["t", "我希望你幸福。（用 vouloir）", ["Je veux que tu sois heureux.", "Je veux que tu sois heureuse."]]
    ]
},
{
    id: "b1-05", level: "B1", title: "愈過去式", fr: "Il était déjà parti",
    goal: "用愈過去式說「在另一件過去的事之前就已經發生」。",
    grammar: [
        { t: "構成", d: "**avoir 或 être 的未完成過去式 + 過去分詞**。選助動詞和配合的規則跟複合過去式一樣。",
          tb: [["主詞", "manger", "partir"], ["j'", "avais mangé", "étais parti(e)"], ["tu", "avais mangé", "étais parti(e)"], ["il / elle", "avait mangé", "était parti(e)"], ["nous", "avions mangé", "étions parti(e)s"], ["vous", "aviez mangé", "étiez parti(e)(s)"], ["ils / elles", "avaient mangé", "étaient parti(e)s"]] },
        { t: "用法", d: "表示「過去的過去」：兩件過去的事，**比較早**發生的用愈過去式。也常用在後悔、轉述中。",
          ex: [["Quand je suis arrivé, le film avait déjà commencé.", "我到的時候，電影已經開始了。"], ["Elle m'a dit qu'elle avait perdu son portable.", "她跟我說她弄丟了手機。"], ["Il était fatigué parce qu'il n'avait pas dormi.", "他很累，因為他前一晚沒睡。"], ["Je n'avais jamais vu Paris avant cette année.", "今年以前我從沒看過巴黎。"]] }
    ],
    vocab: [["déjà", "已經", "adv."], ["avant", "之前", "adv."], ["après", "之後", "adv."], ["la veille", "前一天", "n.f."], ["auparavant", "以前；事先", "adv."], ["commencer", "開始", "v."], ["finir", "結束", "v."], ["prévenir", "通知；預防", "v."], ["la séance", "（電影）場次", "n.f."], ["rater", "錯過", "v."], ["se rendre compte", "意識到", "loc."], ["à peine", "才剛；幾乎不", "loc."]],
    dialog: [["Nora", "Tu as vu le film hier soir ?", "你昨晚看了那部電影嗎？"], ["Tim", "Non ! Quand je suis arrivé, la séance avait déjà commencé.", "沒有！我到的時候已經開演了。"], ["Nora", "Pourquoi tu étais en retard ?", "你為什麼遲到？"], ["Tim", "J'avais oublié mon portefeuille chez moi, alors je suis rentré.", "我把錢包忘在家裡，所以回去拿。"], ["Nora", "Tu avais acheté les billets en ligne ?", "你有在網路上買票嗎？"], ["Tim", "Non, heureusement ! Je n'avais rien payé.", "沒有，幸好！我還沒付錢。"]],
    ex: [
        ["c", "Quand je suis arrivé, il ___ déjà parti.", ["était", "avait", "est"], 0, "我到的時候，他已經走了。"],
        ["c", "Elle m'a dit qu'elle ___ fini.", ["avait", "était", "a"], 0, "她跟我說她做完了。"],
        ["f", "Nous ___ déjà mangé quand ils sont venus. (avoir)", "avions", "他們來的時候我們已經吃過了。"],
        ["f", "Ils étaient ___ avant midi. (partir)", "partis", "他們中午前就走了。"],
        ["o", "Le / film / avait / déjà / commencé", "電影已經開始了。"],
        ["t", "我到的時候，電影已經開始了。", ["Quand je suis arrivé, le film avait déjà commencé.", "Quand je suis arrivée, le film avait déjà commencé."]]
    ]
},
{
    id: "b1-06", level: "B1", title: "條件式過去時與後悔", fr: "Si j'avais su…",
    goal: "會表達後悔與「當初如果…就…」。",
    grammar: [
        { t: "條件式過去時", d: "**avoir 或 être 的條件式 + 過去分詞**：j'aurais aimé、je serais venu(e)。表示過去沒有實現的事、後悔或責備。",
          tb: [["主詞", "faire", "venir"], ["j' / je", "aurais fait", "serais venu(e)"], ["tu", "aurais fait", "serais venu(e)"], ["il / elle", "aurait fait", "serait venu(e)"], ["nous", "aurions fait", "serions venu(e)s"], ["vous", "auriez fait", "seriez venu(e)(s)"], ["ils / elles", "auraient fait", "seraient venu(e)s"]],
          ex: [["J'aurais aimé être là.", "我真希望當時在場。"], ["Tu aurais dû me le dire !", "你早該告訴我的！"], ["Nous serions venus avec plaisir.", "我們本來很樂意來的。"]] },
        { t: "si + 愈過去式 → 條件式過去時", d: "和過去事實相反的假設：**si + 愈過去式**，主要子句用**條件式過去時**。",
          ex: [["Si j'avais su, je serais venu plus tôt.", "早知道我就早點來了。"], ["Si tu avais étudié, tu aurais réussi l'examen.", "如果你有念書，考試就會過了。"], ["S'il n'avait pas plu, nous serions allés à la plage.", "如果沒下雨，我們就會去海邊了。"]] }
    ],
    vocab: [["regretter", "後悔", "v."], ["le regret", "遺憾", "n.m."], ["devoir", "應該；必須", "v."], ["réussir un examen", "通過考試", "loc."], ["rater un examen", "考試沒過", "loc."], ["l'occasion", "機會", "n.f."], ["plus tôt", "早一點", "loc."], ["avec plaisir", "樂意地", "loc."], ["malheureusement", "可惜", "adv."], ["la décision", "決定", "n.f."], ["prendre une décision", "做決定", "loc."], ["dommage", "可惜", "n.m."]],
    dialog: [["Inès", "Tu n'es pas venu à la fête samedi. C'était génial !", "你星期六沒來派對，超棒的！"], ["Hugo", "Je sais… Si j'avais su, je serais venu.", "我知道……早知道我就來了。"], ["Inès", "Tu aurais dû venir. Il y avait tous nos amis.", "你應該來的，我們的朋友都在。"], ["Hugo", "J'étais malade. Si je n'avais pas eu de fièvre, je serais sorti.", "我生病了。如果沒發燒，我就會出門了。"], ["Inès", "Dommage ! La prochaine fois, alors.", "可惜！那下次吧。"], ["Hugo", "Promis, je ne la raterai pas !", "保證，我不會錯過的！"]],
    ex: [
        ["c", "Si j'avais su, je ___ venu.", ["serais", "aurais", "serai"], 0, "早知道我就來了。"],
        ["c", "Tu ___ dû me téléphoner.", ["aurais", "avais", "as"], 0, "你早該打電話給我。"],
        ["f", "Si nous ___ parti plus tôt, nous n'aurions pas raté le train. (être)", "étions", "如果我們早點出發，就不會錯過火車了。"],
        ["f", "J'___ aimé voir ce film. (avoir)", "aurais", "我真希望能看那部電影。"],
        ["c", "S'il n'avait pas plu, nous ___ à la plage.", ["serions allés", "irions", "sommes allés"], 0, "如果沒下雨，我們就會去海邊了。"],
        ["t", "早知道！", ["Si j'avais su !"]]
    ]
},
{
    id: "b1-07", level: "B1", title: "關係代名詞 dont、ce qui、ce que", fr: "Ce dont j'ai besoin",
    goal: "用 dont 取代 de + 名詞，用 ce qui / ce que 表示「…的事」。",
    grammar: [
        { t: "dont", d: "**dont** 取代「**de** + 名詞」，常見於 parler de、avoir besoin de、avoir peur de、se souvenir de，以及所屬關係（某人的…）。",
          ex: [["C'est le livre dont je t'ai parlé.", "這就是我跟你說過的那本書。（parler de）"], ["Voici l'outil dont j'ai besoin.", "這就是我需要的工具。（avoir besoin de）"], ["J'ai un ami dont le père est pilote.", "我有個朋友，他爸爸是飛行員。"], ["La ville dont je me souviens le mieux, c'est Rome.", "我記得最清楚的城市是羅馬。"]] },
        { t: "ce qui、ce que、ce dont", d: "沒有明確的先行詞、意思是「…的事情」時，前面加 **ce**：ce qui（主詞）、ce que（受詞）、ce dont（de + …）。",
          tb: [["形式", "功能", "例句"], ["ce qui", "主詞", "Ce qui m'intéresse, c'est l'histoire."], ["ce que", "受詞", "Je ne comprends pas ce que tu dis."], ["ce dont", "de + …", "Dis-moi ce dont tu as besoin."]],
          ex: [["Fais ce que tu veux.", "做你想做的事。"], ["Ce qui est important, c'est la santé.", "重要的是健康。"]] }
    ],
    vocab: [["dont", "（關係代名詞，取代 de + 名詞）", "pron."], ["se souvenir de", "記得", "v."], ["l'outil", "工具", "n.m."], ["le pilote", "飛行員", "n.m."], ["intéresser", "使感興趣", "v."], ["la santé", "健康", "n.f."], ["le sujet", "主題", "n.m."], ["s'agir de", "關於；涉及", "loc."], ["fier de", "以…為傲", "adj."], ["la raison", "理由", "n.f."], ["exactement", "正是", "adv."], ["en fait", "其實", "loc."]],
    dialog: [["Vendeur", "Bonjour, je peux vous aider ?", "您好，需要幫忙嗎？"], ["Cliente", "Oui, je cherche le roman dont tout le monde parle.", "對，我在找大家都在談的那本小說。"], ["Vendeur", "Ah, celui qui a gagné le prix Goncourt ?", "啊，得了龔固爾獎的那本嗎？"], ["Cliente", "Exactement. C'est ce que ma sœur m'a conseillé.", "正是。這是我姊姊推薦給我的。"], ["Vendeur", "Le voici. C'est exactement ce dont vous avez besoin pour les vacances !", "就是這本。正是您度假需要的！"], ["Cliente", "Parfait, je le prends.", "太好了，我買了。"]],
    ex: [
        ["c", "C'est le film ___ je t'ai parlé.", ["dont", "que", "qui"], 0, "這就是我跟你提過的電影。"],
        ["c", "Je ne sais pas ___ il veut.", ["ce qu'", "ce dont", "ce qui"], 0, "我不知道他想要什麼。"],
        ["c", "___ me plaît, c'est le calme.", ["Ce qui", "Ce que", "Ce dont"], 0, "我喜歡的是安靜。"],
        ["f", "Dis-moi ce ___ tu as besoin.", "dont", "告訴我你需要什麼。"],
        ["f", "Fais ce ___ tu veux.", "que", "做你想做的事。"],
        ["t", "這就是我需要的書。（用 dont）", ["C'est le livre dont j'ai besoin.", "Voici le livre dont j'ai besoin."]]
    ]
},
{
    id: "b1-08", level: "B1", title: "lequel 與介系詞 + 關係代名詞", fr: "La raison pour laquelle…",
    goal: "在介系詞後使用 lequel、laquelle 與 qui。",
    grammar: [
        { t: "介系詞 + lequel", d: "介系詞（avec、pour、dans、sur、sans…）後面要接關係代名詞時：指**物**用 **lequel / laquelle / lesquels / lesquelles**（配合先行詞）；指**人**通常用 **qui**。",
          tb: [["", "陽性", "陰性"], ["單數", "lequel", "laquelle"], ["複數", "lesquels", "lesquelles"]],
          ex: [["Voici le stylo avec lequel j'ai signé.", "這就是我用來簽名的筆。"], ["C'est la raison pour laquelle je suis venu.", "這就是我來的原因。"], ["La personne avec qui je travaille est très sympa.", "跟我一起工作的人很好相處。"], ["Les amis sans qui je ne pourrais pas vivre.", "沒有他們我活不下去的朋友們。"]] },
        { t: "à 和 de 的縮寫", d: "**à + lequel = auquel**、**à + lesquels = auxquels**；**de + lequel = duquel**（常用在 près de、à côté de 等片語）。",
          ex: [["Le projet auquel je pense est ambitieux.", "我在想的那個計畫很有野心。（penser à）"], ["Le parc près duquel j'habite est immense.", "我家附近的公園非常大。"]] },
        { t: "疑問代名詞 lequel", d: "lequel 也可以單獨用來問「哪一個？」：**Lequel préfères-tu ?**（你比較喜歡哪一個？）" }
    ],
    vocab: [["lequel", "哪一個；（關係代名詞）", "pron."], ["la raison", "理由", "n.f."], ["signer", "簽名", "v."], ["le projet", "計畫", "n.m."], ["ambitieux", "有野心的", "adj."], ["immense", "巨大的", "adj."], ["le collègue", "同事", "n.m."], ["l'entreprise", "公司", "n.f."], ["participer à", "參加", "loc."], ["le concours", "比賽；考試", "n.m."], ["le contrat", "合約", "n.m."], ["sympa", "親切的；好相處的", "adj."]],
    dialog: [["RH", "Parlez-moi de l'entreprise dans laquelle vous travaillez.", "跟我談談您目前任職的公司。"], ["Candidat", "C'est une start-up avec laquelle je collabore depuis trois ans.", "是一家新創公司，我和他們合作三年了。"], ["RH", "Et quelle est la raison pour laquelle vous voulez partir ?", "那您想離開的原因是什麼？"], ["Candidat", "Je cherche un poste dans lequel je pourrai voyager.", "我在找一個可以出差的職位。"], ["RH", "Il y a un projet auquel vous avez participé et dont vous êtes fier ?", "有沒有您參與過、而且引以為傲的計畫？"], ["Candidat", "Oui, une application avec laquelle nous avons gagné un concours.", "有，我們用一個應用程式贏了一場比賽。"]],
    ex: [
        ["c", "C'est la raison pour ___ je pars.", ["laquelle", "lequel", "qui"], 0, "這就是我離開的原因。"],
        ["c", "Le stylo avec ___ j'écris est cassé.", ["lequel", "laquelle", "que"], 0, "我在用的這支筆壞了。"],
        ["c", "La collègue avec ___ je travaille est italienne.", ["qui", "que", "laquelle"], 0, "和我一起工作的同事是義大利人。"],
        ["c", "Le projet ___ je pense est difficile.", ["auquel", "duquel", "lequel"], 0, "我在想的計畫很難。"],
        ["f", "Voici les dossiers sur ___ nous travaillons. (陽性複數)", "lesquels", "這些是我們在處理的檔案。"],
        ["t", "你比較喜歡哪一個？（陽性）", ["Lequel préfères-tu ?", "Lequel tu préfères ?", "Tu préfères lequel ?"]]
    ]
},
{
    id: "b1-09", level: "B1", title: "雙受詞代名詞的順序", fr: "Je te le donne",
    goal: "兩個代名詞一起出現時排出正確順序。",
    grammar: [
        { t: "順序表", d: "直述句中，代名詞依下表**由左到右**排在動詞前。最常見的組合：me le、te la、le lui、les leur、lui en、y en。",
          tb: [["①", "②", "③", "④", "⑤"], ["me, te, se, nous, vous", "le, la, les", "lui, leur", "y", "en"]],
          ex: [["Tu me prêtes ton livre ? — Oui, je te le prête.", "你借我你的書嗎？——好，我借你。"], ["Il a donné la clé à Marie ? — Oui, il la lui a donnée.", "他把鑰匙給瑪麗了嗎？——給了。"], ["Je vais leur en parler.", "我會跟他們談這件事。"], ["Il y en a beaucoup.", "有很多。"]] },
        { t: "肯定命令式的順序", d: "肯定命令式中代名詞放動詞後，順序變成**直接受詞在前**：**Donne-le-moi !**（給我！）、**Envoie-la-lui !**（寄給他！）。否定命令式恢復一般順序：**Ne me le donne pas !**",
          ex: [["Montre-la-moi.", "給我看。"], ["Dites-le-lui.", "告訴他（她）。"], ["Ne le lui dis pas !", "別告訴他！"]] }
    ],
    vocab: [["prêter", "借出", "v."], ["rendre", "歸還", "v."], ["montrer", "給…看", "v."], ["envoyer", "寄", "v."], ["raconter", "講述", "v."], ["le secret", "秘密", "n.m."], ["la nouvelle", "消息", "n.f."], ["le document", "文件", "n.m."], ["la facture", "發票；帳單", "n.f."], ["le courriel", "電子郵件", "n.m."], ["dès que possible", "盡快", "loc."], ["promis", "說好了；保證", "adj."]],
    dialog: [["Chef", "Vous avez envoyé le contrat à M. Dubois ?", "您把合約寄給杜布瓦先生了嗎？"], ["Assistante", "Oui, je le lui ai envoyé ce matin.", "寄了，我今天早上寄給他了。"], ["Chef", "Et la facture ?", "那發票呢？"], ["Assistante", "Je ne la lui ai pas encore envoyée. Je vous la montre d'abord ?", "還沒寄給他。我先拿給您看嗎？"], ["Chef", "Oui, montrez-la-moi, s'il vous plaît.", "好，請拿給我看。"], ["Assistante", "La voici. Je la lui envoie dès que possible.", "在這裡。我會盡快寄給他。"]],
    ex: [
        ["c", "Tu me donnes le sel ? — Oui, je ___ donne.", ["te le", "le te", "te lui"], 0, "你可以把鹽給我嗎？——好，我給你。"],
        ["c", "Il donne les fleurs à sa mère. → Il ___ donne.", ["les lui", "lui les", "leur les"], 0, "他把花送給他媽媽。"],
        ["c", "（肯定命令式）把它給我！", ["Donne-le-moi !", "Donne-moi-le !", "Me le donne !"], 0, "給我！"],
        ["c", "Ne ___ dis pas ! (把它 / 對他)", ["le lui", "lui le", "le leur"], 0, "別跟他說！"],
        ["f", "Il y ___ a trois. (數量)", "en", "有三個。"],
        ["o", "Je / vais / leur / en / parler", "我會跟他們談這件事。"],
        ["t", "我借你。（借書給你）", ["Je te le prête."]]
    ]
},
{
    id: "b1-10", level: "B1", title: "間接引語", fr: "Il a dit qu'il viendrait",
    goal: "轉述別人說的話，正確調整時態與代名詞。",
    grammar: [
        { t: "現在時的轉述", d: "引述動詞是現在式時，時態不變，只改人稱：Il dit : « Je suis fatigué. » → **Il dit qu'il est fatigué.** 疑問句用 **si**（是非題）或疑問詞；qu'est-ce que 變 **ce que**，qu'est-ce qui 變 **ce qui**。命令句用 **de + 原形**。",
          ex: [["Elle demande si tu viens.", "她問你來不來。"], ["Il veut savoir où tu habites.", "他想知道你住哪裡。"], ["Je me demande ce qu'il fait.", "我在想他在做什麼。"], ["Le prof nous dit de faire attention.", "老師叫我們注意。"]] },
        { t: "過去時的轉述：時態後移", d: "引述動詞是過去式（il a dit、elle a demandé）時，被引述的時態要往過去移。",
          tb: [["直接引語", "間接引語"], ["現在式 « Je pars. »", "未完成過去式 Il a dit qu'il partait."], ["複合過去式 « J'ai fini. »", "愈過去式 Il a dit qu'il avait fini."], ["未來式 « Je viendrai. »", "條件式 Il a dit qu'il viendrait."], ["近未來 « Je vais partir. »", "Il a dit qu'il allait partir."]] },
        { t: "時間詞也要改", d: "aujourd'hui → **ce jour-là**、demain → **le lendemain**、hier → **la veille**、la semaine prochaine → **la semaine suivante**。",
          ex: [["Elle m'a dit : « Je viendrai demain. » → Elle m'a dit qu'elle viendrait le lendemain.", "她跟我說她隔天會來。"]] }
    ],
    vocab: [["dire", "說", "v."], ["demander", "問", "v."], ["répondre", "回答", "v."], ["expliquer", "解釋", "v."], ["annoncer", "宣布", "v."], ["se demander", "心想；納悶", "v."], ["le lendemain", "隔天", "n.m."], ["la veille", "前一天", "n.f."], ["suivant", "接下來的", "adj."], ["affirmer", "斷言", "v."], ["prétendre", "聲稱", "v."], ["la rumeur", "傳聞", "n.f."]],
    dialog: [["Camille", "Tu as parlé avec Julien ?", "你跟朱利安談過了嗎？"], ["Antoine", "Oui. Il m'a dit qu'il était malade et qu'il ne viendrait pas.", "談了。他跟我說他生病了，不會來。"], ["Camille", "Il t'a dit quand il reviendrait ?", "他有說什麼時候會回來嗎？"], ["Antoine", "Il a dit qu'il reviendrait la semaine suivante.", "他說他下週會回來。"], ["Camille", "Et il a demandé si on avait fini le projet ?", "那他有問我們做完計畫了沒嗎？"], ["Antoine", "Oui, je lui ai répondu qu'on l'avait presque terminé.", "有，我回答他說我們快做完了。"]],
    ex: [
        ["c", "« Je suis fatigué. » → Il a dit qu'il ___ fatigué.", ["était", "est", "sera"], 0, "他說他很累。"],
        ["c", "« Tu viens ? » → Elle demande ___ je viens.", ["si", "que", "ce que"], 0, "她問我來不來。"],
        ["c", "« Je viendrai. » → Il a dit qu'il ___.", ["viendrait", "viendra", "venait"], 0, "他說他會來。"],
        ["c", "« Qu'est-ce que tu fais ? » → Il demande ___ je fais.", ["ce que", "qu'est-ce que", "si"], 0, "他問我在做什麼。"],
        ["f", "« J'ai fini. » → Elle a dit qu'elle ___ fini.", "avait", "她說她做完了。"],
        ["f", "« Ferme la porte ! » → Il me dit ___ fermer la porte.", "de", "他叫我關門。"]
    ]
},
{
    id: "b1-11", level: "B1", title: "被動語態", fr: "La loi a été votée",
    goal: "認得並使用被動語態，知道法文常用的替代說法。",
    grammar: [
        { t: "構成", d: "**être（任何時態）+ 過去分詞**，過去分詞配合主詞；動作者用 **par** 引出（表示狀態或情感時常用 **de**）。",
          tb: [["時態", "主動", "被動"], ["現在式", "Le chef prépare le repas.", "Le repas est préparé par le chef."], ["複合過去式", "Le Parlement a voté la loi.", "La loi a été votée par le Parlement."], ["未來式", "On construira un pont.", "Un pont sera construit."]],
          ex: [["Ce livre a été écrit par Victor Hugo.", "這本書是雨果寫的。"], ["La réunion est annulée.", "會議取消了。"], ["Elle est aimée de tous.", "她受到大家喜愛。"]] },
        { t: "法文更常用的說法", d: "法文口語其實比較少用被動，常用 **on** 或**反身動詞**代替：On a volé mon vélo.（我的腳踏車被偷了。）Le français **se parle** dans 29 pays.（29 個國家說法語。）",
          ex: [["On m'a invité à la fête.", "我被邀請參加派對。"], ["Ce plat se mange froid.", "這道菜要冷著吃。"], ["Ça ne se fait pas.", "這種事不能做。（不禮貌）"]] }
    ],
    vocab: [["la loi", "法律", "n.f."], ["voter", "投票；表決", "v."], ["construire", "建造", "v."], ["annuler", "取消", "v."], ["voler", "偷；飛", "v."], ["publier", "出版；發表", "v."], ["découvrir", "發現", "v."], ["le gouvernement", "政府", "n.m."], ["le bâtiment", "建築物", "n.m."], ["l'auteur", "作者", "n.m."], ["le siècle", "世紀", "n.m."], ["détruire", "摧毀", "v."]],
    dialog: [["Guide", "Cette cathédrale a été construite au treizième siècle.", "這座大教堂建於十三世紀。"], ["Touriste", "Elle a été détruite pendant la guerre ?", "它在戰爭時被摧毀過嗎？"], ["Guide", "Elle a été endommagée, mais elle a été restaurée après.", "它受損過，但之後修復了。"], ["Touriste", "Et ces vitraux ?", "那這些彩繪玻璃呢？"], ["Guide", "Ils ont été réalisés par des artistes locaux. On les nettoie chaque année.", "是當地藝術家做的。我們每年清洗一次。"], ["Touriste", "C'est magnifique !", "太美了！"]],
    ex: [
        ["c", "La loi a été ___ par le Parlement.", ["votée", "voté", "votées"], 0, "這條法律由國會通過。"],
        ["c", "Ce roman a été écrit ___ Camus.", ["par", "de", "pour"], 0, "這本小說是卡繆寫的。"],
        ["f", "Le repas ___ préparé par le chef. (être，現在式)", "est", "餐點由主廚準備。"],
        ["f", "Les maisons seront ___ l'année prochaine. (construire)", "construites", "房子明年會蓋好。"],
        ["c", "我的腳踏車被偷了（口語）：", ["On a volé mon vélo.", "Mon vélo a volé.", "Mon vélo s'est volé par quelqu'un."], 0, "我的腳踏車被偷了。"],
        ["t", "會議取消了。", ["La réunion est annulée.", "La réunion a été annulée."]]
    ]
},
{
    id: "b1-12", level: "B1", title: "現在分詞與副動詞", fr: "En marchant…",
    goal: "用 en + 現在分詞表達同時、方法、條件。",
    grammar: [
        { t: "現在分詞的構成", d: "用 **nous 的現在式**去掉 -ons，加 **-ant**：nous parlons → parlant、nous finissons → finissant、nous faisons → faisant。三個例外：**être → étant**、**avoir → ayant**、**savoir → sachant**。" },
        { t: "副動詞 en + 現在分詞", d: "兩個動作的**主詞相同**時使用，可表達：①同時（一邊…一邊…）②方法（藉由…）③條件。",
          ex: [["Il chante en prenant sa douche.", "他一邊洗澡一邊唱歌。"], ["C'est en forgeant qu'on devient forgeron.", "熟能生巧。（打鐵才會成為鐵匠）"], ["En travaillant plus, tu réussiras.", "多努力一點你就會成功。"], ["Je l'ai rencontré en sortant du métro.", "我出地鐵的時候遇到他。"]] },
        { t: "現在分詞（書面）", d: "不加 en 的現在分詞多用在書面，相當於 qui 子句或原因：Les étudiants **ayant** un passeport peuvent partir.（持有護照的學生可以出發。）**Étant** malade, il est resté chez lui.（因為生病，他待在家裡。）" }
    ],
    vocab: [["en marchant", "一邊走", "loc."], ["en même temps", "同時", "loc."], ["marcher", "走路", "v."], ["conduire", "開車", "v."], ["apprendre", "學習", "v."], ["la méthode", "方法", "n.f."], ["l'habitude", "習慣", "n.f."], ["s'entraîner", "練習；訓練", "v."], ["progresser", "進步", "v."], ["les sous-titres", "字幕", "n.m."], ["le podcast", "播客", "n.m."], ["efficace", "有效的", "adj."]],
    dialog: [["Élève", "Comment tu as appris le français si vite ?", "你怎麼這麼快就學會法文？"], ["Kevin", "En regardant des séries avec des sous-titres français.", "看有法文字幕的影集。"], ["Élève", "Et pour parler ?", "那口說呢？"], ["Kevin", "En parlant tous les jours avec mes colocataires.", "每天跟室友聊天。"], ["Élève", "Moi, j'écoute des podcasts en conduisant.", "我是開車時聽播客。"], ["Kevin", "Bonne idée ! On progresse en s'entraînant régulièrement.", "好主意！規律練習就會進步。"]],
    ex: [
        ["c", "faire → 現在分詞：", ["faisant", "fant", "faiant"], 0, "做"],
        ["c", "être → 現在分詞：", ["étant", "êtant", "sommant"], 0, "是"],
        ["f", "Il mange en ___ la télé. (regarder)", "regardant", "他一邊看電視一邊吃飯。"],
        ["f", "On apprend en ___ des erreurs. (faire)", "faisant", "從錯誤中學習。"],
        ["o", "Je / l' / ai / vu / en / sortant / du / bureau", "我離開辦公室時看到他。"],
        ["t", "他一邊唱歌一邊做菜。", ["Il chante en cuisinant.", "Il cuisine en chantant."]]
    ]
},
{
    id: "b1-13", level: "B1", title: "表達意見與論證", fr: "À mon avis…",
    goal: "能有條理地表達看法、提出理由、讓步與結論。",
    grammar: [
        { t: "表達意見", d: "**À mon avis**、**Selon moi**、**Je pense que / Je trouve que**（接直陳式）、**Il me semble que**。表示同意：**Je suis d'accord avec toi.** 不同意：**Je ne suis pas d'accord.**、**Au contraire…**" },
        { t: "論證連接詞", d: "說清楚邏輯關係，讓口說和寫作更有條理。",
          tb: [["功能", "連接詞"], ["原因", "parce que, car, puisque, grâce à（好的原因）, à cause de（壞的原因）"], ["結果", "donc, alors, c'est pourquoi, par conséquent"], ["對比", "mais, pourtant, cependant, en revanche, par contre"], ["讓步", "bien que + 虛擬式, même si + 直陳式, malgré + 名詞"], ["補充", "de plus, en outre, d'ailleurs"], ["順序", "d'abord, ensuite, enfin, en conclusion"]],
          ex: [["Il pleut, donc nous restons à la maison.", "下雨了，所以我們待在家。"], ["Bien qu'il soit riche, il n'est pas heureux.", "雖然他很有錢，卻不快樂。"], ["Même s'il fait froid, je vais courir.", "即使很冷，我還是要去跑步。"], ["Grâce à toi, j'ai réussi. / À cause de la pluie, le match est annulé.", "多虧你我成功了。／因為下雨，比賽取消了。"]] }
    ],
    vocab: [["à mon avis", "依我看", "loc."], ["selon moi", "我認為", "loc."], ["être d'accord", "同意", "loc."], ["au contraire", "相反地", "loc."], ["pourtant", "然而", "adv."], ["cependant", "不過", "adv."], ["en revanche", "反之", "loc."], ["donc", "所以", "conj."], ["grâce à", "多虧", "loc."], ["à cause de", "因為（不好的原因）", "loc."], ["malgré", "儘管", "prép."], ["de plus", "此外", "loc."], ["l'avantage", "優點", "n.m."], ["l'inconvénient", "缺點", "n.m."], ["le télétravail", "遠距工作", "n.m."]],
    dialog: [["Animateur", "Le télétravail : avantage ou inconvénient ? Qu'en pensez-vous ?", "遠距工作：是優點還是缺點？您怎麼看？"], ["Clara", "À mon avis, c'est un grand avantage. On gagne du temps, car on ne prend plus les transports.", "我認為是一大優點。可以省時間，因為不用通勤。"], ["Louis", "Je ne suis pas tout à fait d'accord. Bien que ce soit pratique, on se sent souvent seul.", "我不完全同意。雖然方便，但常會覺得孤單。"], ["Clara", "C'est vrai. Pourtant, on peut organiser des réunions en ligne.", "沒錯。不過可以辦線上會議。"], ["Louis", "Oui, mais ce n'est pas la même chose. Par conséquent, je préfère un système mixte.", "對，但那不一樣。所以我比較喜歡混合制。"], ["Animateur", "En conclusion, chacun trouve son équilibre !", "總之，每個人都能找到自己的平衡！"]],
    ex: [
        ["c", "Il est malade, ___ il reste chez lui.", ["donc", "pourtant", "bien que"], 0, "他生病了，所以待在家。"],
        ["c", "___ il fasse froid, je sors.", ["Bien qu'", "Même s'", "Parce qu'"], 0, "雖然很冷，我還是出門。"],
        ["c", "___ la pluie, le match est annulé.", ["À cause de", "Grâce à", "Donc"], 0, "因為下雨，比賽取消了。"],
        ["f", "Même s'il ___ tard, je t'appellerai. (être，現在式)", "est", "即使很晚，我也會打給你。"],
        ["f", "À mon ___, c'est une bonne idée.", "avis", "依我看，這是個好主意。"],
        ["t", "我同意你。", ["Je suis d'accord avec toi.", "Je suis d'accord avec vous."]]
    ]
},
{
    id: "b1-14", level: "B1", title: "職場法語：面試與時間表達", fr: "Dès que possible",
    goal: "能應付面試、寫簡單的工作信件，並精確表達時間先後。",
    grammar: [
        { t: "時間的表達", d: "**avant de + 原形**（在…之前，主詞相同）、**après avoir / être + 過去分詞**（在…之後）、**dès que / aussitôt que**（一…就…，談未來時接未來式）、**pendant que**（在…期間）、**depuis que**（自從）、**jusqu'à ce que + 虛擬式**（直到）。",
          ex: [["Relisez votre CV avant de l'envoyer.", "寄出前再讀一次履歷。"], ["Après avoir terminé mes études, j'ai travaillé à Lyon.", "畢業之後，我在里昂工作。"], ["Je vous répondrai dès que j'aurai les résultats.", "一有結果我就會回覆您。"], ["Depuis que je travaille ici, j'ai beaucoup appris.", "自從在這裡工作，我學到很多。"], ["Restez jusqu'à ce que la réunion soit finie.", "請留到會議結束。"]] },
        { t: "正式信件的開頭與結尾", d: "開頭：**Madame, Monsieur,**（不知道對方名字時）。結尾常用：**Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.**（敬請接受我誠摯的問候。）電子郵件可以簡化為 **Cordialement,** 或 **Bien cordialement,**",
          ex: [["Je me permets de vous contacter au sujet du poste de chef de projet.", "冒昧與您聯繫，是關於專案經理一職。"], ["Je reste à votre disposition pour tout renseignement complémentaire.", "如需任何進一步資訊，請隨時與我聯絡。"]] }
    ],
    vocab: [["l'entretien", "面試", "n.m."], ["le CV", "履歷", "n.m."], ["le poste", "職位", "n.m."], ["l'expérience", "經驗", "n.f."], ["les compétences", "能力；技能", "n.f."], ["le salaire", "薪水", "n.m."], ["le stage", "實習", "n.m."], ["postuler", "應徵", "v."], ["embaucher", "雇用", "v."], ["la candidature", "應徵；申請", "n.f."], ["le chef de projet", "專案經理", "n.m."], ["la lettre de motivation", "求職信", "n.f."], ["cordialement", "誠摯地（信件結尾）", "adv."], ["dès que", "一…就…", "conj."], ["à votre disposition", "隨時為您服務", "loc."]],
    dialog: [["Recruteuse", "Bonjour, asseyez-vous. Parlez-moi de votre parcours.", "您好，請坐。談談您的經歷。"], ["Candidat", "Après avoir obtenu mon master, j'ai fait un stage de six mois chez Airbus.", "拿到碩士之後，我在空中巴士實習了六個月。"], ["Recruteuse", "Pourquoi avez-vous postulé chez nous ?", "您為什麼來應徵我們公司？"], ["Candidat", "Parce que vos projets internationaux correspondent à mes compétences.", "因為貴公司的國際專案符合我的能力。"], ["Recruteuse", "Quand pourriez-vous commencer ?", "您什麼時候可以開始上班？"], ["Candidat", "Dès que possible, à partir du premier septembre si vous voulez.", "越快越好，如果您希望，九月一日就可以。"], ["Recruteuse", "Très bien. Nous vous contacterons dès que nous aurons pris notre décision.", "很好。我們一做出決定就會聯絡您。"]],
    culture: "法國的履歷通常只有一頁，求職時常附一封 **lettre de motivation**（求職信）。面試時用 vous，除非對方先提議用 tu。",
    ex: [
        ["c", "Relisez la lettre avant ___ l'envoyer.", ["de", "que", "d'avoir"], 0, "寄信前再讀一次。"],
        ["c", "Après ___ mangé, nous sommes sortis.", ["avoir", "être", "avant"], 0, "吃完飯後我們出門了。"],
        ["c", "Je vous appellerai dès que j'___ les résultats.", ["aurai", "ai", "avais"], 0, "我一拿到結果就打給您。"],
        ["f", "Attendez jusqu'à ce qu'il ___ là. (être)", "soit", "等到他來為止。"],
        ["f", "Après être ___, elle a téléphoné. (arriver，陰性)", "arrivée", "她到了之後打了電話。"],
        ["t", "越快越好。", ["Dès que possible.", "Le plus tôt possible.", "Aussitôt que possible."]],
        ["l", "Je reste à votre disposition pour tout renseignement complémentaire.", "如需任何進一步資訊，請隨時與我聯絡。"]
    ]
}
);
