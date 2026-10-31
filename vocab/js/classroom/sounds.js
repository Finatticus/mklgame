// ===================== 法文發音入門 =====================
// items：[法文, 說明]，每個例子都可以點來聽
const FR_SOUNDS = [
    {
        t: "字母", d: "法文用 26 個拉丁字母，名稱和英文不同。另外有五種符號：é（閉口 e）、è ê（開口 e）、à ù（只區分字義）、ç（發 s）、ë ï（分開唸）。",
        items: [["a b c d e f g", "a、bé、cé、dé、e、effe、gé"], ["h i j k l m n", "hache、i、ji、ka、elle、emme、enne"], ["o p q r s t u", "o、pé、ku、erre、esse、té、u"], ["v w x y z", "vé、double vé、iks、i grec、zède"], ["é è ê", "café、mère、fête"], ["ç", "français、garçon"]]
    },
    {
        t: "母音", d: "法文母音發音時嘴型固定，不像英文會滑動。u 的嘴型是噘嘴唸「一」；ou 是「烏」。",
        items: [["a", "papa、chat"], ["i / y", "lit、stylo"], ["u", "tu、rue、bus（噘嘴的「一」）"], ["ou", "vous、rouge、jour"], ["é / er / ez", "été、parler、nez（閉口 e）"], ["è / ê / ai", "mère、tête、lait（開口 e）"], ["e（字中）", "le、petit、demain（輕而短，像注音「ㄜ」）"], ["eu / œu", "deux、peu、sœur、heure"], ["o / au / eau", "mot、chaud、beau"], ["oi", "moi、trois、voiture（唸 wa）"]]
    },
    {
        t: "鼻母音", d: "母音後面接 n 或 m（而且後面不是母音）時，氣同時從鼻子出去，n / m 本身不發音。",
        items: [["an / en / am / em", "France、enfant、temps"], ["on / om", "bon、nom、maison"], ["in / ain / ein / un", "vin、pain、plein、lundi"], ["ien", "bien、chien、italien"], ["對照", "bon（鼻音）／bonne（不是鼻音）"]]
    },
    {
        t: "子音", d: "大部分和英文接近，幾個要特別注意：r 在喉嚨後方發音；h 永遠不發音；字尾子音通常不唸（但 c、r、f、l 常要唸，記法：CaReFuL）。",
        items: [["r", "rouge、Paris、merci"], ["h（不發音）", "hôtel、homme、heure"], ["ch", "chat、chocolat（像英文 sh）"], ["gn", "montagne、champagne（像注音「ㄋㄧ」）"], ["ill", "fille、famille（像 y）"], ["c / g + e i y", "ceci、genou（軟音 s、ʒ）"], ["c / g + a o u", "café、gare（硬音 k、g）"], ["qu", "qui、quatre（唸 k）"], ["th", "thé、théâtre（唸 t）"], ["字尾不發音", "petit、grand、vous、ils parlent"], ["CaReFuL", "avec、bonjour、neuf、sel"]]
    },
    {
        t: "連音 liaison", d: "原本不發音的字尾子音，遇到下一個字以母音或 h 開頭時要唸出來並連到下一個字。s、x 連音時唸 z。",
        items: [["les amis", "lé-za-mi"], ["vous êtes", "vou-zêtes"], ["un enfant", "un-nen-fant"], ["ils ont", "il-zont（對照 ils sont）"], ["deux heures", "deu-zheures"], ["c'est un homme", "c'es-tun-homme"], ["不連音：et", "toi et elle"]]
    },
    {
        t: "省音 élision", d: "le、la、je、me、te、se、ne、de、que 遇到母音或不發音的 h 開頭的字，要去掉母音改成撇號。",
        items: [["l'ami / l'école", "le ami → l'ami"], ["j'aime", "je aime → j'aime"], ["je m'appelle", "me appelle → m'appelle"], ["il n'est pas", "ne est → n'est"], ["l'hôtel", "h 不發音，也要省音"], ["qu'il", "que il → qu'il"]]
    },
    {
        t: "語調與重音", d: "法文每個字重音都在最後一個音節，而且很平均；一句話的重音落在意群的最後。疑問句可以只把句尾語調上揚。",
        items: [["Tu viens.", "陳述：句尾下降"], ["Tu viens ?", "疑問：句尾上揚"], ["Je voudrais un café, s'il vous plaît.", "練習平順地連讀"], ["C'est très intéressant.", "très-zin-té-res-sant"]]
    }
];

// 課程資料由 lessons-*.js 依序加入
const FR_COURSE = [];
