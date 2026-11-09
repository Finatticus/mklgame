/* InBody 欄位定義（前端 UI 用）。key 需與 gas/Code.gs 的 INBODY_FIELDS 一致。 */
(function () {
  const SEGMENTS = [
    ['la', '左臂'], ['ra', '右臂'], ['tr', '軀幹'], ['ll', '左腿'], ['rl', '右腿'],
  ];
  const EXERCISES = [
    ['golf', '高爾夫球'], ['gateball', '槌球'], ['walk', '走路'], ['yoga', '瑜伽'],
    ['badminton', '羽毛球'], ['tabletennis', '桌球'], ['tennis', '網球'], ['cycling', '自行車'],
    ['boxing', '拳擊'], ['basketball', '籃球'], ['hiking', '健行'], ['jumprope', '跳繩'],
    ['aerobic', '有氧運動'], ['jogging', '慢跑'], ['soccer', '足球'], ['swimming', '游泳'],
    ['kendo', '日本劍道'], ['racquetball', '短柄牆球'], ['squash', '壁球'], ['taekwondo', '跆拳道'],
  ];
  const EVAL3 = ['低', '正常', '高'];
  const BAL = ['平衡', '輕度失衡', '嚴重失衡'];

  // 表單分組；row 型別：
  //  { k, label, unit, range:true }  → 數值 + 標準範圍上下限
  //  { k, label, unit }              → 數值
  //  { k, label, type:'text'|'select'|'datetime'|'textarea', options }
  const GROUPS = [
    {
      id: 'basic', title: '基本資料', rows: [
        { k: 'date', label: '檢測日期', type: 'datetime' },
        { k: 'height', label: '身高', unit: 'cm' },
        { k: 'age', label: '年齡', unit: '歲' },
        { k: 'sex', label: '性別', type: 'select', options: ['男', '女'] },
        { k: 'device', label: '機型', type: 'text' },
        { k: 'gym', label: '檢測地點', type: 'text' },
        { k: 'memberId', label: 'ID', type: 'text' },
      ],
    },
    {
      id: 'comp', title: '身體組成分析', rows: [
        { k: 'tbw', label: '身體總水重', unit: 'L', range: true },
        { k: 'protein', label: '蛋白質重', unit: 'kg', range: true },
        { k: 'mineral', label: '礦物質重', unit: 'kg', range: true },
        { k: 'bfm', label: '體脂肪重', unit: 'kg', range: true },
        { k: 'weight', label: '體重', unit: 'kg', range: true },
      ],
    },
    {
      id: 'mf', title: '肌肉脂肪・肥胖分析', rows: [
        { k: 'smm', label: '骨骼肌重', unit: 'kg' },
        { k: 'bmi', label: 'BMI', unit: 'kg/m²' },
        { k: 'pbf', label: '體脂率', unit: '%' },
        { k: 'bodyType', label: '體型', type: 'select', options: ['C', 'I', 'D'] },
      ],
    },
    {
      id: 'lean', title: '部位別肌肉分析', seg: 'lean',
    },
    {
      id: 'fat', title: '部位別脂肪分析', seg: 'fat',
    },
    {
      id: 'score', title: 'InBody 評分・體重控制', rows: [
        { k: 'score', label: 'InBody 評分', unit: '分' },
        { k: 'target_weight', label: '目標體重', unit: 'kg' },
        { k: 'weight_ctrl', label: '體重控制', unit: 'kg' },
        { k: 'fat_ctrl', label: '脂肪控制', unit: 'kg' },
        { k: 'muscle_ctrl', label: '肌肉控制', unit: 'kg' },
      ],
    },
    {
      id: 'eval', title: '肥胖・平衡評估', rows: [
        { k: 'bmi_eval', label: 'BMI 評估', type: 'select', options: ['低', '正常', '稍高', '高'] },
        { k: 'pbf_eval', label: 'PBF 評估', type: 'select', options: ['正常', '稍高', '高'] },
        { k: 'bal_upper', label: '上半身', type: 'select', options: BAL },
        { k: 'bal_lower', label: '下半身', type: 'select', options: BAL },
        { k: 'bal_ul', label: '上－下半身', type: 'select', options: BAL },
      ],
    },
    {
      id: 'whr', title: '腰臀圍比・內臟脂肪', rows: [
        { k: 'whr', label: '腰臀圍比', unit: '', range: true, step: '0.01' },
        { k: 'vfl', label: '內臟脂肪級別', unit: '級' },
      ],
    },
    {
      id: 'research', title: '研究參數', rows: [
        { k: 'ffm', label: '除脂體重', unit: 'kg' },
        { k: 'bmr', label: '基礎代謝率', unit: 'kcal', range: true },
        { k: 'smi', label: 'SMI', unit: 'kg/m²' },
        { k: 'kcal_rec', label: '建議熱量攝取', unit: 'kcal' },
      ],
    },
    { id: 'ex', title: '運動熱量消耗（30 分鐘）', ex: true },
    { id: 'z', title: '阻抗 Z(Ω)', z: true },
    {
      id: 'note', title: '備註', rows: [
        { k: 'coachNote', label: '教練備註 / 自己的筆記', type: 'textarea' },
      ],
    },
  ];

  // 趨勢圖可選的指標
  const METRICS = [
    { k: 'weight', label: '體重', unit: 'kg', lo: 'weight_lo', hi: 'weight_hi', better: 'down', d: 1 },
    { k: 'smm', label: '骨骼肌', unit: 'kg', better: 'up', d: 1 },
    { k: 'pbf', label: '體脂率', unit: '%', better: 'down', d: 1, band: (r) => (r.sex === '女' ? [18, 28] : [10, 20]) },
    { k: 'bfm', label: '體脂肪', unit: 'kg', lo: 'bfm_lo', hi: 'bfm_hi', better: 'down', d: 1 },
    { k: 'bmi', label: 'BMI', unit: '', better: 'down', d: 1, band: () => [18.5, 25] },
    { k: 'vfl', label: '內臟脂肪', unit: '級', better: 'down', d: 0, band: () => [1, 9] },
    { k: 'score', label: 'InBody 評分', unit: '分', better: 'up', d: 0 },
    { k: 'bmr', label: '基礎代謝', unit: 'kcal', lo: 'bmr_lo', hi: 'bmr_hi', better: 'up', d: 0 },
    { k: 'whr', label: '腰臀比', unit: '', lo: 'whr_lo', hi: 'whr_hi', better: 'down', d: 2 },
    { k: 'ffm', label: '除脂體重', unit: 'kg', better: 'up', d: 1 },
    { k: 'smi', label: 'SMI', unit: 'kg/m²', better: 'up', d: 1 },
    { k: 'tbw', label: '總水重', unit: 'L', lo: 'tbw_lo', hi: 'tbw_hi', better: 'up', d: 1 },
    { k: 'protein', label: '蛋白質', unit: 'kg', lo: 'protein_lo', hi: 'protein_hi', better: 'up', d: 1 },
    { k: 'mineral', label: '礦物質', unit: 'kg', lo: 'mineral_lo', hi: 'mineral_hi', better: 'up', d: 2 },
  ];

  // 所有 key（含 range 衍生欄位），用於表單收集
  function allKeys() {
    const keys = [];
    GROUPS.forEach((g) => {
      (g.rows || []).forEach((r) => {
        keys.push(r.k);
        if (r.range) keys.push(r.k + '_lo', r.k + '_hi');
      });
      if (g.seg) SEGMENTS.forEach(([s]) => keys.push(`${g.seg}_${s}`, `${g.seg}_${s}_pct`, `${g.seg}_${s}_eval`));
      if (g.ex) EXERCISES.forEach(([e]) => keys.push('ex_' + e));
      if (g.z) ['20', '100'].forEach((f) => SEGMENTS.forEach(([s]) => keys.push(`z${f}_${s}`)));
    });
    return keys;
  }
  const TEXT_KEYS = new Set(['date', 'sex', 'device', 'gym', 'memberId', 'bodyType', 'bmi_eval', 'pbf_eval',
    'bal_upper', 'bal_lower', 'bal_ul', 'coachNote', 'photoUrl',
    ...SEGMENTS.flatMap(([s]) => [`lean_${s}_eval`, `fat_${s}_eval`])]);

  window.SCHEMA = { SEGMENTS, EXERCISES, EVAL3, BAL, GROUPS, METRICS, allKeys, TEXT_KEYS };
})();
