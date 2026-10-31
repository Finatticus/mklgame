// 魔塔式對戰視窗：照 Tower.duel 推演的順序一下一下播放；點畫面可快轉
const Battle = {
  play(hero, m, pr, loot) {
    return new Promise(async done => {
      const ev = pr.events;
      const fx = [m.fx && MON_FX[m.fx].name, m.fam && FAMILY[m.fam] + '系'].filter(Boolean).join('・');
      const wrap = document.createElement('div');
      wrap.className = 'battle';
      wrap.innerHTML = `<div class="bt ${m.boss ? 'boss' : m.elite ? 'elite' : ''}">
        <div class="bt-arena">
          <div class="bt-u hero" id="btH">${UI.token(hero.icon, 'big')}<b>${hero.name}</b>
            <div class="bar hp"><i></i><span></span></div><div class="bt-st">攻 ${hero.atk}　防 ${hero.def}</div></div>
          <div class="bt-vs"><b>VS</b><small id="btR">第 1 回合</small></div>
          <div class="bt-u mon" id="btM">${UI.token(m.icon, 'big')}<b>${m.name}${fx ? `<em class="fx">${fx}</em>` : ''}</b>
            <div class="bar hp foe"><i></i><span></span></div><div class="bt-st">攻 ${m.atk}　防 ${m.def}</div></div>
        </div>
        <div class="bt-loot" id="btL"></div>
        <div class="bt-tip">點擊畫面快轉</div></div>`;
      document.body.appendChild(wrap);
      requestAnimationFrame(() => wrap.classList.add('in'));
      let fast = false;
      wrap.addEventListener('click', () => { fast = true; });
      const H = wrap.querySelector('#btH'), M = wrap.querySelector('#btM');
      const setBar = (el, v, max) => {
        el.querySelector('.bar i').style.width = Math.max(0, Math.min(100, v / max * 100)) + '%';
        el.querySelector('.bar span').textContent = `${Math.max(0, Math.round(v))}`;
      };
      let hhp = hero.hp, round = 1, mmax = m.hp;
      setBar(H, hhp, hero.hp); setBar(M, m.hp, mmax);
      await sleep(380);
      const step = Math.max(70, Math.min(320, 2200 / Math.max(1, ev.length)));
      for (const e of ev) {
        if (e.by === 'x') {
          mmax = e.mhp; setBar(M, e.mhp, mmax);
          if (!fast) { FX.float(M.querySelector('.tok-wrap'), e.tag, 'status'); FX.anim(M, 'rise-up', 500); await sleep(500); }
          continue;
        }
        const atkEl = e.by === 'h' ? H : M, defEl = e.by === 'h' ? M : H;
        const self = e.tag === '反傷' || e.tag === '爆炸';
        if (!fast && !self) { FX.anim(atkEl, e.by === 'h' ? 'lunge-r' : 'lunge-l', step * 0.9); await sleep(step * 0.4); }
        if (e.by === 'h') setBar(M, e.mhp, mmax); else { hhp -= e.dmg; setBar(H, hhp, hero.hp); }
        if (!fast) {
          FX.anim(defEl, 'hurt', 260);
          FX.float(defEl.querySelector('.tok-wrap'), e.tag ? `${e.tag} -${e.dmg}` : e.dmg ? '-' + e.dmg : '格擋', e.by === 'h' ? 'dmg' : 'hurt');
          FX.sfx(e.by === 'h' ? 'hit' : e.dmg ? 'hurt' : 'block');
          await sleep(step * 0.6);
        }
        if (e.by === 'h') wrap.querySelector('#btR').textContent = `第 ${++round} 回合`;
      }
      setBar(H, hero.hp - pr.dmg, hero.hp); setBar(M, 0, mmax);
      M.classList.add('dead');
      FX.sfx('win');
      wrap.querySelector('#btL').innerHTML = `<b>勝利！</b><div>${loot.map(t => `<span>${t}</span>`).join('')}</div>`;
      wrap.querySelector('.bt-tip').textContent = pr.dmg ? `損失 ${pr.dmg} 生命` : '毫髮無傷';
      await new Promise(r => { const t = setTimeout(r, fast ? 500 : 1100); wrap.addEventListener('click', () => { clearTimeout(t); r(); }, { once: true }); });
      wrap.classList.remove('in');
      setTimeout(() => wrap.remove(), 200);
      done();
    });
  },
};
