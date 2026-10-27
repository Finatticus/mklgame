# 生涯模式開發筆記（本機用，不上傳）

使用者 2026-10-27 指示：企劃書 6 個階段一次做完、不停下來、決定權在 Claude；
改了設計就同步改 Career/career-plan.html（做完後它就是說明書）；AI 球員用真實球員名字；
名人賽固定奧古斯塔國家@C（c_augusta），其他大賽照 s11c 輪替；最後告訴使用者部署步驟。

## 架構決定
- 生涯程式全部在 Career/（js/*.js、js/ui/*.js、js/data/*.js、js/trophy/room.js、css/career.css、gas/Career.gs、tools/autosim.js）。
- 開放名單在 js/config.js 的 CAREER_USERS（不是 Career/access.js：主程式要先知道名單才能決定要不要顯示入口，而且不能讓名單外的人下載 Career 的任何檔案）＋ Career/gas/Career.gs 的 CAREER_ACCESS。
- 主程式只在 cfg.career 存在時改行為；cfg 可 JSON 序列化；回呼掛在 game.careerHooks（errMul / turn / holeDone / roundDone / quit / drillShot）。
- 低素質：stats._min、_spd（年齡的桿頭速度倍率）。壓力：careerHooks.errMul 取代 pressure 布林。
- 兒童梯：cfg.career.teeYds → hole.teeAt(yards)。關鍵時刻：cfg.career.starts → game.careerStart。指定洞：cfg.holeIdx。
- 揮桿結果先存（pendingShot），APP 關掉再開直接播放那一桿（防重打）。中斷存檔 dixen.cresume（+ .meta）。
- 角色升級：look.v2 才啟用（臉、10 種髮型、帽型、眼鏡、鬍子、長袖 / 背心 / 短褲 / 裙子、年齡身高比例、白髮）；主遊戲經典外觀不變。寫實角色：帽子 / 眼鏡掛在 mixamorigHead。
- GAS 動作 cm*（cmSave/cmLoad/cmList/cmDelete/cmWeekSubmit/cmWeekBoard/cmAdminList）；api.js 本機模式也有。
- 存檔大小：世界排名積分每 4 週合成一筆、同儕只有前段拿積分、退休無冠軍的虛構球員 10 年後移除 → 約 300~400 KB。
- 世界：玩家 8 歲 = 2026 年。真實球員依出生年老化；虛構新人遞補；同儕 22 歲左右轉職業加入巡迴。

## 測試
- 本機：localStorage dixen.gas='local'，本機帳號 test（密碼只在本機 localdb）。
- .claude/career-auto.js：自動點劇情、自動把回合改模擬（測流程）。
- Career/tools/autosim.js：全模擬平衡測試（每週、每場比賽都模擬，記下拿卡、首勝、大賽、綠夾克的年紀與推估時數）。

## 進度（2026-10-28 完成 v92）
- [x] 六個階段全部做完；企劃書第一章後面加了「說明書」（Career/career-plan.html#s0m），寫清楚在遊戲哪裡、怎麼玩、和原企劃不同的地方。
- [x] 平衡（autosim seed h8）：13 歲 39、17 歲 53、21 歲 64、24 歲 73、28 歲 81.5、31 歲 84、34 歲 88；PGA 卡 26~27、首勝 28、第一座大賽 29、世界第一 30；29 歲約 145 小時。
  實力尺度：真實球員 −6（RATING_SHIFT），60 = 黑梯平標準桿、73 = PGA TOUR 平均、80 = PGA 冠軍、88 = 世界第一。成長倍率 ageMul（青少年 0.85、22~29 歲 1.8）。
- [x] 測過的流程：建立球員 → 序章 → 童年 5 個關鍵時刻 → 青少年每週 / 快轉 → 青少年賽（模擬、精華 9 洞自己打、中途離開）→ U.S. Amateur（資格賽 → 比洞賽）→ 萊德盃（入選 → 三天）→ 名人賽週（邀請函、練習輪、三桿洞大賽、四輪、綠夾克、生涯回顧）→ 名人堂 → 退休 → 第二人生 → 過一年；主遊戲單人回合照常。
- [ ] 之後可以做：觀戰房、經典重現、個人紀錄的篩選、場景升級（觀眾、看台、寫實樹）、輪流擊球自己打、隨機事件補到 200 個。
- 本機測試存檔：test 帳號的欄位 1（陳子安，13 歲）、2（測試業餘）、3（Test Pro，已退休）只在這台的 localStorage。
