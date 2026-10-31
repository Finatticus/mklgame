// 離線快取：App 本體 cache-first；字型與圖示 stale-while-revalidate；GAS 請求永遠走網路
const VERSION = 'emberhold-v3.0.0';
// 美術素材（離線也能顯示）
const ASSETS = ["assets/icon/armor.webp", "assets/icon/armorgold.webp", "assets/icon/aurared.webp", "assets/icon/axe.webp", "assets/icon/bag.webp", "assets/icon/bigcatwhite.webp", "assets/icon/birdblue.webp", "assets/icon/book.webp", "assets/icon/bookholy.webp", "assets/icon/boots.webp", "assets/icon/chest.webp", "assets/icon/crossbow.webp", "assets/icon/dragon.webp", "assets/icon/fireball.webp", "assets/icon/frostball.webp", "assets/icon/glove.webp", "assets/icon/go.webp", "assets/icon/goldcoins.webp", "assets/icon/hammerheavy.webp", "assets/icon/helmet.webp", "assets/icon/legarmor.webp", "assets/icon/no.webp", "assets/icon/orc.webp", "assets/icon/potionblue.webp", "assets/icon/potionempty.webp", "assets/icon/potionred.webp", "assets/icon/ringmagic.webp", "assets/icon/shield.webp", "assets/icon/shield2.webp", "assets/icon/sword.webp", "assets/icon/swordblood.webp", "assets/icon/yes.webp", "assets/item/armor.webp", "assets/item/armor_gold.webp", "assets/item/arrows.webp", "assets/item/arrows_fire.webp", "assets/item/arrows_ice.webp", "assets/item/axe.webp", "assets/item/axe_fire.webp", "assets/item/axe_ice.webp", "assets/item/backpack.webp", "assets/item/book.webp", "assets/item/boots.webp", "assets/item/boots_gold.webp", "assets/item/bow.webp", "assets/item/crystal.webp", "assets/item/crystal_green.webp", "assets/item/dagger.webp", "assets/item/dagger_fire.webp", "assets/item/dagger_ice.webp", "assets/item/gauntlet.webp", "assets/item/gauntlet_gold.webp", "assets/item/gem_blue.webp", "assets/item/gem_purple.webp", "assets/item/gem_red.webp", "assets/item/key_b.webp", "assets/item/key_r.webp", "assets/item/key_y.webp", "assets/item/potion_green.webp", "assets/item/potion_purple.webp", "assets/item/potion_red.webp", "assets/item/potion_teal.webp", "assets/item/potion_yellow.webp", "assets/item/ring_green.webp", "assets/item/ring_red.webp", "assets/item/scroll_blue.webp", "assets/item/scroll_red.webp", "assets/item/shield.webp", "assets/item/shield_gold.webp", "assets/item/shield_wood.webp", "assets/item/shield_wood_gold.webp", "assets/item/sword.webp", "assets/item/sword_fire.webp", "assets/item/sword_ice.webp", "assets/item/torch.webp", "assets/mon/abyssal.webp", "assets/mon/airelemental.webp", "assets/mon/banshee.webp", "assets/mon/blob1.webp", "assets/mon/blob10.webp", "assets/mon/blob11.webp", "assets/mon/blob12.webp", "assets/mon/blob13.webp", "assets/mon/blob14.webp", "assets/mon/blob15.webp", "assets/mon/blob16.webp", "assets/mon/blob17.webp", "assets/mon/blob18.webp", "assets/mon/blob19.webp", "assets/mon/blob2.webp", "assets/mon/blob20.webp", "assets/mon/blob21.webp", "assets/mon/blob22.webp", "assets/mon/blob23.webp", "assets/mon/blob24.webp", "assets/mon/blob25.webp", "assets/mon/blob26.webp", "assets/mon/blob27.webp", "assets/mon/blob28.webp", "assets/mon/blob29.webp", "assets/mon/blob3.webp", "assets/mon/blob30.webp", "assets/mon/blob31.webp", "assets/mon/blob32.webp", "assets/mon/blob33.webp", "assets/mon/blob34.webp", "assets/mon/blob35.webp", "assets/mon/blob36.webp", "assets/mon/blob37.webp", "assets/mon/blob38.webp", "assets/mon/blob39.webp", "assets/mon/blob4.webp", "assets/mon/blob40.webp", "assets/mon/blob5.webp", "assets/mon/blob6.webp", "assets/mon/blob7.webp", "assets/mon/blob8.webp", "assets/mon/blob9.webp", "assets/mon/bonegolem.webp", "assets/mon/cabalistnun.webp", "assets/mon/catkinwarlock.webp", "assets/mon/centaur.webp", "assets/mon/chaosspawn.webp", "assets/mon/chibi_goblin.webp", "assets/mon/chibi_ogre.webp", "assets/mon/chibi_orc.webp", "assets/mon/crystalgolem.webp", "assets/mon/darkapprentice.webp", "assets/mon/deepelf.webp", "assets/mon/deepelfassassin.webp", "assets/mon/deepelfwizard.webp", "assets/mon/deepranger.webp", "assets/mon/deepspawn.webp", "assets/mon/demilich.webp", "assets/mon/devilkin.webp", "assets/mon/doppelganger.webp", "assets/mon/dragonkinevoker.webp", "assets/mon/dragonkinknight.webp", "assets/mon/dragonwhelp.webp", "assets/mon/drake.webp", "assets/mon/draugr.webp", "assets/mon/earthelemental.webp", "assets/mon/fireelemental.webp", "assets/mon/frogling.webp", "assets/mon/ghoul.webp", "assets/mon/giant.webp", "assets/mon/giantspider.webp", "assets/mon/goblin.webp", "assets/mon/goblinboomer.webp", "assets/mon/goblinhermit.webp", "assets/mon/goblinrunts.webp", "assets/mon/goblinscout.webp", "assets/mon/goblinveteran.webp", "assets/mon/gorgoth.webp", "assets/mon/hag.webp", "assets/mon/hellion.webp", "assets/mon/hellionminstrel.webp", "assets/mon/heresiarch.webp", "assets/mon/imp.webp", "assets/mon/medusa.webp", "assets/mon/merfolk.webp", "assets/mon/minotaur.webp", "assets/mon/naga.webp", "assets/mon/ooze.webp", "assets/mon/orc.webp", "assets/mon/orcishberserker.webp", "assets/mon/plaguezombie.webp", "assets/mon/planaradept.webp", "assets/mon/ratling.webp", "assets/mon/sanctumguardian.webp", "assets/mon/skeleton.webp", "assets/mon/skygiant.webp", "assets/mon/starelemental.webp", "assets/mon/treefolk.webp", "assets/mon/vampirechilder.webp", "assets/mon/waterelemental.webp", "assets/mon/werewolfcub.webp", "assets/mon/wight.webp", "assets/mon/wraith.webp", "assets/mon/zombie.webp"];
const SHELL = [
  './', 'index.html', 'css/style.css', 'manifest.webmanifest', 'icon.svg',
  'js/config.js', 'js/data.js', 'js/store.js', 'js/art.js', 'js/fx.js', 'js/sync.js', 'js/levels.js',
  'js/camp.js', 'js/tower.js', 'js/battle.js', 'js/play.js', 'js/main.js', 'CREDITS.md', 'guide.html',
  ...ASSETS,
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.hostname.includes('script.google')) return;

  const runtime = /fonts\.(googleapis|gstatic)\.com/.test(url.hostname);
  if (runtime) {
    e.respondWith(caches.open(VERSION).then(async c => {
      const hit = await c.match(e.request);
      const net = fetch(e.request).then(r => { if (r.ok || r.type === 'opaque') c.put(e.request, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  if (url.origin === location.origin) {
    // 本體：先網路（拿到更新），失敗再用快取
    e.respondWith(fetch(e.request).then(r => {
      const copy = r.clone();
      caches.open(VERSION).then(c => c.put(e.request, copy));
      return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
  }
});
