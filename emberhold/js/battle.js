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
          <div class="bt-u hero" id="btH">${UI.token(hero.icon, 'big')}${hero.pet ? `<span class="bt-pet" id="btP">${Art.img(hero.pet.icon)}</span>` : ''}${hero.pet2 ? `<span class="bt-pet two" id="btP2">${Art.img(hero.pet2.icon)}</span>` : ''}<b>${hero.name}</b>
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
          const revive = e.tag === '再次站起！';
          if (revive) { mmax = e.mhp; setBar(M, e.mhp, mmax); }
          if (!fast) { FX.float((revive ? M : H).querySelector('.tok-wrap'), e.tag, 'status'); if (revive) FX.anim(M, 'rise-up', 500); else FX.anim(H, 'frozen', 500); await sleep(revive ? 500 : 300); }
          continue;
        }
        // 怪物再生、英雄吸血
        if (e.by === 'r' || e.by === 's') {
          if (e.by === 'r') setBar(M, e.mhp, mmax); else { hhp += e.heal; setBar(H, hhp, hero.hp); }
          if (!fast) { FX.float((e.by === 'r' ? M : H).querySelector('.tok-wrap'), (e.by === 'r' ? '再生 +' : '吸血 +') + e.heal, 'heal'); await sleep(step * 0.4); }
          continue;
        }
        // 寵物：追擊打怪物，或替英雄治療
        if (e.by === 'p') {
          const pet = wrap.querySelector('#btP') || wrap.querySelector('#btP2');
          if (e.heal) { hhp += e.heal; setBar(H, hhp, hero.hp); } else setBar(M, e.mhp, mmax);
          if (!fast) {
            if (pet) FX.anim(pet, 'hop', 350);
            await sleep(step * 0.3);
            if (e.heal) FX.float(H.querySelector('.tok-wrap'), '+' + e.heal, 'heal');
            else { FX.anim(M, 'hurt', 260); FX.float(M.querySelector('.tok-wrap'), '-' + e.dmg, 'dmg'); FX.sfx('hit'); }
            await sleep(step * 0.5);
          }
          continue;
        }
        const atkEl = e.by === 'h' ? H : M, defEl = e.by === 'h' ? M : H;
        const self = e.tag === '反傷' || e.tag === '爆炸';
        if (!fast && !self) { FX.anim(atkEl, e.by === 'h' ? 'lunge-r' : 'lunge-l', step * 0.9); await sleep(step * 0.4); }
        if (e.by === 'h') setBar(M, e.mhp, mmax); else { hhp -= e.dmg; setBar(H, hhp, hero.hp); }
        if (!fast) {
          FX.anim(defEl, 'hurt', 260);
          FX.float(defEl.querySelector('.tok-wrap'), e.tag === '落空' ? '閃避！' : e.tag ? `${e.tag} -${e.dmg}` : e.dmg ? '-' + e.dmg : '格擋', e.by === 'h' ? 'dmg' : 'hurt');
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
