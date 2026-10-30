// 3D 獎盃室：深色胡桃木牆板、綠色布面牆、黃銅崁燈、玻璃展示櫃、綠色地毯，最深處是冠軍更衣櫃
//   依存檔擺設：四大賽在中央展示櫃、巡迴賽獎盃上牆面層架、兒童盃與業餘獎牌在層架下排；拿到綠夾克才會掛在更衣櫃裡
//   操作：拖曳轉頭、點地板走過去、點獎盃拉近（旁邊顯示那一場的成績）
//   模型都由程式產生（旋轉體、管線、擠出形狀），從 Career/prototype/trophy-room.html 的原型改成依存檔擺設
//   房間前半部是收藏區（v101）：左牆裱框的旗、球衣、信與計分卡，右牆玻璃長櫃放簽名球、手套、球桿，旁邊立著球袋
//   房間跟著等級長大（v104）：童年書桌（小房間的書桌與層架）→ 家裡的玻璃櫃（客廳一角）→ 獎盃室（這間）
//     → 私人展覽館（兩層樓：二樓迴廊、樓梯、更多層架與大賽旗幟）→ 名人堂館（更大的大廳、大理石、柱子、中央的古銅紀念碑）
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { esc, toPar } from '../util.js';
import { ROOM_LEVELS } from '../data/items.js';
import { COLLECT_KIND } from '../data/story3.js';

let scene = null, renderer = null, camera = null, raf = null, shadowSpots = 0, PLAYER = { name: '', year: '' };
const loader = new THREE.TextureLoader();
// ---------- 程式產生的貼圖 ----------
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}
const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
// 木紋：深胡桃木
const woodTex = (base, rep) => canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 260; i++) {
    const y = rnd() * h, a = 0.04 + rnd() * 0.1;
    g.strokeStyle = rnd() < 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,200,150,${a * 0.5})`;
    g.lineWidth = 0.5 + rnd() * 2.5;
    g.beginPath(); g.moveTo(0, y);
    for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * 0.01 + i) * 4 + (rnd() - 0.5) * 2);
    g.stroke();
  }
}, rep);
// 地板：木條
const floorTex = canvasTex(1024, 1024, (g, w, h) => {
  const rows = 8;
  for (let r = 0; r < rows; r++) {
    let x = -rnd() * 300;
    while (x < w) {
      const len = 260 + rnd() * 240, l = 22 + rnd() * 10;
      g.fillStyle = `hsl(24, 42%, ${l}%)`;
      g.fillRect(x, r * h / rows, len, h / rows);
      for (let k = 0; k < 14; k++) { g.strokeStyle = `rgba(0,0,0,${0.05 + rnd() * 0.08})`; g.lineWidth = 1; const yy = r * h / rows + rnd() * h / rows; g.beginPath(); g.moveTo(x, yy); g.lineTo(x + len, yy + (rnd() - 0.5) * 6); g.stroke(); }
      g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(x, r * h / rows, 2, h / rows);
      x += len;
    }
    g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(0, r * h / rows, w, 2);
  }
}, [3, 4]);
// 牆面上半：深綠色布面
const fabricTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#123a2a'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${rnd() < .5 ? '0,0,0' : '120,170,140'},${rnd() * 0.08})`; g.fillRect(rnd() * w, rnd() * h, 1.5, 1.5); }
}, [6, 2]);
// 綠夾克毛料
const woolTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 9000; i++) { const v = 200 + rnd() * 55; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(rnd() * w, rnd() * h, 1, 1); }
}, [6, 6]);
// 地毯
const carpetTex = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#0d3b29'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#b89548'; g.lineWidth = 10; g.strokeRect(24, 24, w - 48, h - 48);
  g.lineWidth = 3; g.strokeRect(46, 46, w - 92, h - 92);
  for (let i = 0; i < 6000; i++) { g.fillStyle = `rgba(0,0,0,${rnd() * 0.12})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); }
});
// 黃銅名牌
const plateTex = (lines) => canvasTex(512, 160, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#8a6420'); gr.addColorStop(.45, '#f0d48a'); gr.addColorStop(.55, '#d4ae55'); gr.addColorStop(1, '#7a5418');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(60,40,10,.6)'; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16);
  g.fillStyle = '#3a2608'; g.textAlign = 'center';
  g.font = '700 54px "Noto Serif TC", serif'; g.fillText(lines[0], w / 2, 78);
  g.font = '500 30px "Noto Serif TC", serif'; g.fillText(lines[1], w / 2, 126);
});

// ---------- 材質 ----------
const M = {
  silver: new THREE.MeshPhysicalMaterial({ color: 0xeef0f3, metalness: 1, roughness: 0.12, clearcoat: 0.3 }),
  gold: new THREE.MeshPhysicalMaterial({ color: 0xe0b860, metalness: 1, roughness: 0.2 }),
  brass: new THREE.MeshStandardMaterial({ color: 0xc9a050, metalness: 1, roughness: 0.32 }),
  walnut: new THREE.MeshStandardMaterial({ map: woodTex('#4a2c18', [2, 2]), roughness: 0.45, metalness: 0 }),
  walnutDark: new THREE.MeshStandardMaterial({ map: woodTex('#2a170c', [2, 2]), roughness: 0.4 }),
  floor: new THREE.MeshPhysicalMaterial({ map: floorTex, color: 0x9a8070, roughness: 0.28, clearcoat: 0.5, clearcoatRoughness: 0.25 }),
  fabric: new THREE.MeshStandardMaterial({ map: fabricTex, roughness: 0.95 }),
  carpet: new THREE.MeshStandardMaterial({ map: carpetTex, roughness: 1 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.03, transmission: 1, thickness: 0.01, ior: 1.5, transparent: true, opacity: 0.18, envMapIntensity: 1.2 }),
  ceiling: new THREE.MeshStandardMaterial({ color: 0x241810, roughness: 0.9 }),
  jacket: new THREE.MeshPhysicalMaterial({ color: 0x0b4a2f, roughness: 0.82, sheen: 0.12, sheenColor: new THREE.Color(0x1f6a45), sheenRoughness: 0.8, bumpMap: woolTex, bumpScale: 1.4, side: THREE.DoubleSide }),
  lining: new THREE.MeshStandardMaterial({ color: 0x1b2a20, roughness: 0.5, side: THREE.DoubleSide }),
  lapel: new THREE.MeshPhysicalMaterial({ color: 0x093f28, roughness: 0.8, sheen: 0.12, sheenColor: new THREE.Color(0x1f6a45), bumpMap: woolTex, bumpScale: 1.0 }),
  shirt: new THREE.MeshStandardMaterial({ color: 0xf6f3ea, roughness: 0.7 }),
  tie: new THREE.MeshStandardMaterial({ color: 0x14301f, roughness: 0.6 }),
  felt: new THREE.MeshStandardMaterial({ color: 0x0f2a1e, roughness: 1 }),
  lockerIn: new THREE.MeshStandardMaterial({ map: woodTex('#5a3a22', [1, 2]), roughness: 0.55 }),
  // 書桌房間、客廳、名人堂館用
  paintKid: new THREE.MeshStandardMaterial({ color: 0xb9cfe0, roughness: 0.95 }),
  paintCream: new THREE.MeshStandardMaterial({ color: 0xe6d9c0, roughness: 0.95 }),
  trim: new THREE.MeshStandardMaterial({ color: 0xf1ece2, roughness: 0.6 }),
  woodLight: new THREE.MeshStandardMaterial({ map: woodTex('#9a6a40', [1, 1]), roughness: 0.5 }),
  floorLight: new THREE.MeshStandardMaterial({ map: woodTex('#a8784c', [4, 4]), roughness: 0.45 }),
  ceilingLight: new THREE.MeshStandardMaterial({ color: 0xf2eee6, roughness: 1 }),
  black: new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.35 }),
  sofa: new THREE.MeshStandardMaterial({ color: 0x5b6b5a, roughness: 0.95 }),
  bedding: new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.9 }),
  blanket: new THREE.MeshStandardMaterial({ color: 0x3f6f9a, roughness: 0.95 }),
  shade: new THREE.MeshStandardMaterial({ color: 0xf3e6c8, roughness: 0.8, side: THREE.DoubleSide, emissive: 0x6a5530, emissiveIntensity: 0.6 }),
  curtain: new THREE.MeshStandardMaterial({ color: 0xc9b48a, roughness: 1 }),
  bronze: new THREE.MeshPhysicalMaterial({ color: 0x6a4626, metalness: 0.9, roughness: 0.42, clearcoat: 0.15 }),
  stone: new THREE.MeshStandardMaterial({ color: 0xd9d4ca, roughness: 0.5 }),
  plant: new THREE.MeshStandardMaterial({ color: 0x2f5a32, roughness: 0.9 }),
};
// 名人堂館的大理石地板
const marbleTex = canvasTex(1024, 1024, (g, w, h) => {
  const n = 4, s = w / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const l = 86 + rnd() * 6; g.fillStyle = (i + j) % 2 ? `hsl(40, 12%, ${l}%)` : `hsl(30, 8%, ${l - 50}%)`; g.fillRect(i * s, j * s, s, s); }
  for (let k = 0; k < 60; k++) { g.strokeStyle = `rgba(120,110,100,${0.08 + rnd() * 0.15})`; g.lineWidth = 0.6 + rnd() * 1.6; g.beginPath(); let x = rnd() * w, y = rnd() * h; g.moveTo(x, y); for (let q = 0; q < 6; q++) { x += (rnd() - 0.3) * 120; y += (rnd() - 0.5) * 120; g.lineTo(x, y); } g.stroke(); }
  g.strokeStyle = 'rgba(160,130,70,.7)'; g.lineWidth = 3; for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.stroke(); g.beginPath(); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke(); }
}, [3, 3]);
M.marble = new THREE.MeshPhysicalMaterial({ map: marbleTex, roughness: 0.18, clearcoat: 0.6, clearcoatRoughness: 0.15 });

const add = (geo, mat, x = 0, y = 0, z = 0, parent = scene) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
};
const lathe = (pts, seg = 96) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
const smooth = (pts, n = 60) => new THREE.SplineCurve(pts.map(([r, y]) => new THREE.Vector2(r, y))).getPoints(n).map(v => [Math.max(0, v.x), v.y]);
const tube = (pts, r, mat, parent) => add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), 64, r, 16), mat, 0, 0, 0, parent);

// ---------- 房間 ----------
//   每一級：寬、深、高、二樓高度（0 = 沒有二樓）、二樓迴廊的深度、鏡頭起點與朝向
const LEVELS = [
  { kind: 'desk', w: 4.4, d: 5, h: 2.7, cam: [0.2, 1.35, 1.8], yaw: Math.PI + 0.05 },
  { kind: 'living', w: 6.6, d: 7.2, h: 3, cam: [-0.4, 1.5, 3.0], yaw: Math.PI + 0.1 },
  { kind: 'room', w: 11, d: 14, h: 4.2, cam: [0.6, 1.6, 5.4], yaw: Math.PI + 0.06 },
  { kind: 'gallery', w: 14, d: 16, h: 7.6, mez: 4.2, md: 2.6, cam: [0.6, 1.6, 6.6], yaw: Math.PI + 0.05 },
  { kind: 'hall', w: 16, d: 20, h: 9, mez: 4.2, md: 3, cam: [0.6, 1.6, 8.4], yaw: Math.PI + 0.04 },
];
let RW = 11, RD = 14, RH = 4.2, MEZ = 0, MD = 0, LV = LEVELS[2], STAIR = null;
const WALK = [];      // 可以走的地板：{ mesh, y, rect: [x1, x2, z1, z2], m: 離邊緣的距離 }
let floorMesh = null;
// 二樓下面的燈裝在二樓底下；其他照常裝在天花板
const underMez = (x, z) => MEZ && (z < -RD / 2 + MD || Math.abs(x) > RW / 2 - MD);
const lowH = (x, z) => (underMez(x, z) ? MEZ - 0.25 : Math.min(RH, 5.6));
function walkable(mesh, y, rect, m) { mesh.userData.walk = WALK.length; WALK.push({ mesh, y, rect, m }); }
function buildShell(style = 'wood') {
  const kid = style === 'kid', home = kid || style === 'living';
  const fm = style === 'hall' ? M.marble : home ? M.floorLight : M.floor;
  if (fm === M.floor) floorTex.repeat.set(RW / 3.7, RD / 3.5);
  if (fm === M.marble) marbleTex.repeat.set(RW / 4, RD / 4);
  if (fm === M.floorLight) fm.map.repeat.set(RW / 1.6, RD / 1.6);
  floorMesh = add(new THREE.PlaneGeometry(RW, RD).rotateX(-Math.PI / 2), fm);
  walkable(floorMesh, 0, [-RW / 2, RW / 2, -RD / 2, RD / 2], 0.7);
  if (!home) add(new THREE.PlaneGeometry(3.2, RD - 4).rotateX(-Math.PI / 2), M.carpet, 0, 0.004, 0.5);
  add(new THREE.PlaneGeometry(RW, RD).rotateX(Math.PI / 2), home ? M.ceilingLight : M.ceiling, 0, RH, 0);
  wall(RW, 0, -RD / 2, 0, style); wall(RD, -RW / 2, 0, Math.PI / 2, style); wall(RD, RW / 2, 0, -Math.PI / 2, style); wall(RW, 0, RD / 2, Math.PI, style);
  if (home) {
    // 家裡比較亮：整體的環境光 + 天花板的吸頂燈
    scene.add(new THREE.HemisphereLight(0xfff1dc, 0x3a3028, kid ? 0.9 : 0.6));
    add(new THREE.CylinderGeometry(0.28, 0.3, 0.06, 32), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2d8, emissiveIntensity: 1 }), 0, RH - 0.03, 0);
    const c = new THREE.PointLight(0xfff0d8, kid ? 6 : 8, 9, 1.4); c.position.set(0, RH - 0.25, 0); scene.add(c);
  } else {
    scene.add(new THREE.HemisphereLight(0xffe8c8, 0x20140a, style === 'room' || style === 'wood' ? 0.08 : 0.16));
    const warm = new THREE.PointLight(0xffc890, 3 * (RW / 11), 14 * (RW / 11), 1.4); warm.position.set(0, Math.min(RH - 0.8, 5), 2); scene.add(warm);
  }
}
function wall(w, x, z, ry, style = 'wood') {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
  if (style === 'kid' || style === 'living') {
    // 家裡的牆：油漆 + 白色踢腳板與天花板線板
    add(new THREE.PlaneGeometry(w, RH), style === 'kid' ? M.paintKid : M.paintCream, 0, RH / 2, 0, g);
    add(new THREE.BoxGeometry(w, 0.1, 0.02), M.trim, 0, 0.05, 0.01, g);
    add(new THREE.BoxGeometry(w, 0.06, 0.03), M.trim, 0, RH - 0.03, 0.015, g);
    return g;
  }
  add(new THREE.PlaneGeometry(w, 1.25), M.walnut, 0, 0.625, 0, g);                       // 下半部木牆板
  for (let i = -w / 2 + 0.6; i < w / 2; i += 1.2) add(new THREE.BoxGeometry(1.0, 0.9, 0.02), M.walnutDark, i, 0.62, 0.012, g);   // 鑲板
  add(new THREE.BoxGeometry(w, 0.08, 0.06), M.walnutDark, 0, 1.27, 0.03, g);             // 腰線
  add(new THREE.PlaneGeometry(w, RH - 1.3), M.fabric, 0, 1.3 + (RH - 1.3) / 2, 0, g);  // 上半部布面
  add(new THREE.BoxGeometry(w, 0.18, 0.12), M.walnutDark, 0, RH - 0.09, 0.06, g);        // 天花板線板
  add(new THREE.BoxGeometry(w, 0.12, 0.04), M.walnutDark, 0, 0.06, 0.02, g);              // 踢腳板
  return g;
}

// ---------- 燈光 ----------
function spot(x, y, z, tx, ty, tz, intensity = 30, angle = 0.42) {
  const s = new THREE.SpotLight(0xffe2b8, intensity * 3.2, 10, angle, 0.6, 1.6);
  s.position.set(x, y, z); s.target.position.set(tx, ty, tz);
  s.castShadow = shadowSpots++ < 3; s.shadow.mapSize.set(1024, 1024); s.shadow.bias = -0.0004; s.shadow.radius = 4;
  scene.add(s, s.target);
  add(new THREE.CylinderGeometry(0.07, 0.09, 0.05, 24), M.brass, x, y - 0.03, z);          // 天花板崁燈
  if (y < RH - 0.1 && !underMez(x, z)) add(new THREE.CylinderGeometry(0.008, 0.008, RH - y, 8), M.brass, x, (RH + y) / 2, z);   // 挑高的大廳用吊桿
  return s;
}

// ---------- 冠軍更衣櫃 + 綠夾克（後牆正中央）----------
function locker(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  const W = 1.5, H = 2.55, D = 0.7, t = 0.06;
  add(new THREE.BoxGeometry(W, H, t), M.lockerIn, 0, H / 2, -D / 2 + t / 2, g);            // 背板
  add(new THREE.BoxGeometry(t, H, D), M.walnut, -W / 2 + t / 2, H / 2, 0, g);
  add(new THREE.BoxGeometry(t, H, D), M.walnut, W / 2 - t / 2, H / 2, 0, g);
  add(new THREE.BoxGeometry(W, t * 2, D), M.walnut, 0, H - t, 0, g);
  add(new THREE.BoxGeometry(W, 0.32, D), M.walnut, 0, 0.16, 0, g);                         // 底座
  add(new THREE.BoxGeometry(W + 0.14, 0.12, D + 0.1), M.walnutDark, 0, H + 0.06, 0.03, g); // 頂冠
  add(new THREE.BoxGeometry(W - 0.14, 0.04, D - 0.1), M.walnutDark, 0, 2.05, 0, g);        // 上層隔板
  add(new THREE.CylinderGeometry(0.012, 0.012, W - 0.14, 16).rotateZ(Math.PI / 2), M.brass, 0, 1.9, 0, g); // 掛衣桿
  const plate = add(new THREE.PlaneGeometry(0.56, 0.175), new THREE.MeshStandardMaterial({ map: plateTex([PLAYER.name, PLAYER.year ? 'MASTERS CHAMPION · ' + PLAYER.year : 'CHAMPIONS LOCKER']), metalness: 0.6, roughness: 0.35 }), 0, 2.22, 0.36, g);
  plate.castShadow = false;
  // 打開的玻璃門
  const door = new THREE.Group(); door.position.set(W / 2, 0, D / 2); door.rotation.y = -1.1; g.add(door);
  add(new THREE.BoxGeometry(0.05, H - 0.4, 0.04), M.walnut, -0.025, H / 2 + 0.05, 0, door);
  add(new THREE.BoxGeometry(0.05, H - 0.4, 0.04), M.walnut, -W + 0.075, H / 2 + 0.05, 0, door);
  add(new THREE.BoxGeometry(W - 0.1, 0.05, 0.04), M.walnut, -W / 2 + 0.025, 0.37, 0, door);
  add(new THREE.BoxGeometry(W - 0.1, 0.05, 0.04), M.walnut, -W / 2 + 0.025, H - 0.08, 0, door);
  add(new THREE.PlaneGeometry(W - 0.12, H - 0.5), M.glass, -W / 2 + 0.025, H / 2 + 0.05, 0, door).castShadow = false;
  // 櫃內上層：高爾夫鞋、帽子、球
  add(new THREE.SphereGeometry(0.021, 24, 16), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 }), 0.45, 2.095, 0.05, g);
  const cap = add(new THREE.SphereGeometry(0.11, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.lapel, -0.38, 2.07, 0, g);
  add(new THREE.CylinderGeometry(0.11, 0.12, 0.01, 32, 1, false, -0.9, 1.8).translate(0, 0, 0.07), M.lapel, -0.38, 2.075, 0, g);
  if (PLAYER.year) jacket(g, 0, 1.9, 0);
  return g;
}

// 綠夾克：衣架 + 身體（壓扁的旋轉體）+ 肩 + 袖子 + 翻領 + 襯衫與領帶 + 鈕扣 + 口袋
function jacket(parent, x, y, z) {
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
  // 衣架
  tube([[-0.21, -0.07, 0], [-0.1, -0.025, 0], [0, -0.005, 0], [0.1, -0.025, 0], [0.21, -0.07, 0]], 0.014, M.walnut, g);
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.005, 12, 32, Math.PI * 1.3), M.brass);
  hook.position.set(0, 0.035, 0); hook.rotation.z = -0.3; g.add(hook);
  add(new THREE.CylinderGeometry(0.005, 0.005, 0.03), M.brass, 0, 0.0, 0, g);
  // 身體：上寬下窄一點、前後壓扁
  const bodyPts = smooth([[0.06, 0.0], [0.17, -0.03], [0.215, -0.09], [0.205, -0.25], [0.19, -0.42], [0.2, -0.58], [0.215, -0.74], [0.2, -0.76]]);
  const body = add(lathe(bodyPts, 80), M.jacket, 0, -0.04, 0, g);
  body.scale.set(1, 1, 0.52);
  // 下擺與前襟的開口：用深色細條表示
  add(new THREE.BoxGeometry(0.008, 0.38, 0.01), M.lapel, 0.012, -0.6, 0.112, g);
  // 肩：斜肩，和身體接在一起
  for (const s of [-1, 1]) {
    const sh = add(new THREE.SphereGeometry(0.08, 32, 16), M.jacket, s * 0.185, -0.085, 0, g);
    sh.scale.set(1.05, 0.42, 0.72); sh.rotation.z = s * -0.35;
    // 袖子：上粗下細，自然往身體內側、往前彎
    const geo = new THREE.CylinderGeometry(0.066, 0.054, 0.6, 32, 24, true);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const t = (0.3 - p.getY(i)) / 0.6; p.setX(i, p.getX(i) - s * 0.035 * t * t); p.setZ(i, p.getZ(i) * 0.82 + 0.03 * t * t); }
    geo.computeVertexNormals();
    add(geo, M.jacket, s * 0.235, -0.39, 0, g).rotation.z = s * 0.05;
    add(new THREE.CylinderGeometry(0.055, 0.055, 0.01, 32, 1, true), M.lining, s * 0.2, -0.695, 0.03, g);
    for (let k = 0; k < 3; k++) add(new THREE.SphereGeometry(0.007, 12, 8), M.brass, s * 0.2 + s * 0.045, -0.655 + k * 0.02, 0.07, g);
  }
  // V 領裡面看到的是內裡（掛著的夾克沒有襯衫）
  const vShape = new THREE.Shape(); vShape.moveTo(-0.075, 0); vShape.lineTo(0.075, 0); vShape.lineTo(0.004, -0.29); vShape.lineTo(-0.004, -0.29); vShape.closePath();
  add(new THREE.ShapeGeometry(vShape), M.lining, 0, -0.025, 0.107, g);
  // 翻領：寬一點、有缺角
  for (const s of [-1, 1]) {
    const L = new THREE.Shape();
    L.moveTo(0, 0); L.lineTo(s * 0.07, -0.005); L.lineTo(s * 0.09, -0.06); L.lineTo(s * 0.1, -0.075); L.lineTo(s * 0.078, -0.1); L.lineTo(s * 0.05, -0.27); L.lineTo(s * 0.008, -0.32); L.closePath();
    const lp = add(new THREE.ExtrudeGeometry(L, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.004, bevelSegments: 3 }), M.lapel, s * 0.004, -0.02, 0.1, g);
    lp.rotation.y = s * 0.2;
  }
  // 鈕扣
  for (const yy of [-0.43, -0.53]) add(new THREE.CylinderGeometry(0.013, 0.013, 0.006, 24).rotateX(Math.PI / 2), M.gold, 0.03, yy, 0.115, g);
  // 胸前口袋與徽章、下方兩個口袋蓋
  add(new THREE.BoxGeometry(0.09, 0.006, 0.006), M.lapel, -0.115, -0.25, 0.098, g).rotation.y = -0.35;
  const crest = canvasTex(128, 128, (c, w, h) => { c.fillStyle = '#0d5a3a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#e8c870'; c.lineWidth = 6; c.beginPath(); c.arc(64, 64, 50, 0, 7); c.stroke(); c.lineWidth = 5; c.beginPath(); c.moveTo(56, 92); c.lineTo(56, 34); c.lineTo(86, 46); c.lineTo(56, 58); c.stroke(); });
  const cr = add(new THREE.CircleGeometry(0.026, 32), new THREE.MeshStandardMaterial({ map: crest, roughness: 0.6, metalness: 0.2 }), -0.115, -0.21, 0.1, g);
  cr.rotation.y = -0.35;
  for (const s of [-1, 1]) { const f = add(new THREE.BoxGeometry(0.13, 0.035, 0.008), M.jacket, s * 0.12, -0.6, 0.094, g); f.rotation.y = s * 0.42; }
  return g;
}

// ---------- 獎盃（旋轉體）----------
// 葡萄酒壺：英國公開賽
function jug(x, y, z, s = 1, parent = scene) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s); parent.add(g);
  add(lathe(smooth([[0, 0], [0.075, 0], [0.078, 0.012], [0.05, 0.03], [0.026, 0.055], [0.03, 0.075], [0.085, 0.13], [0.112, 0.2], [0.112, 0.26], [0.09, 0.31], [0.052, 0.37], [0.04, 0.41], [0.046, 0.46], [0.05, 0.48], [0.0, 0.48]])), M.silver, 0, 0, 0, g);
  add(lathe(smooth([[0, 0.5], [0.04, 0.495], [0.05, 0.48], [0.0, 0.48]])), M.silver, 0, 0, 0, g);
  add(new THREE.SphereGeometry(0.014, 24, 16), M.silver, 0, 0.515, 0, g);
  for (const yy of [0.15, 0.24]) { const r = add(new THREE.TorusGeometry(yy < 0.2 ? 0.1 : 0.112, 0.002, 8, 96).rotateX(Math.PI / 2), M.silver, 0, yy, 0, g); }
  tube([[0.045, 0.45, 0], [0.12, 0.44, 0], [0.155, 0.36, 0], [0.13, 0.25, 0], [0.105, 0.2, 0]], 0.009, M.silver, g);
  const sp = add(new THREE.ConeGeometry(0.02, 0.07, 24, 1, true), M.silver, -0.06, 0.47, 0, g); sp.rotation.z = 1.25;
  return g;
}
// 有蓋的大銀盃：PGA 錦標賽
function bigCup(x, y, z, s = 1, mat = M.silver, parent = scene) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s); parent.add(g);
  add(lathe(smooth([[0, 0], [0.16, 0], [0.16, 0.035], [0.11, 0.06], [0.06, 0.1], [0.045, 0.17], [0.07, 0.2], [0.16, 0.28], [0.22, 0.4], [0.24, 0.5], [0.245, 0.55], [0.0, 0.55]])), mat, 0, 0, 0, g);
  add(lathe(smooth([[0.25, 0.55], [0.24, 0.6], [0.16, 0.67], [0.06, 0.7], [0.03, 0.74], [0.0, 0.76]])), mat, 0, 0, 0, g);
  add(new THREE.SphereGeometry(0.03, 24, 16), mat, 0, 0.78, 0, g);
  for (const s2 of [-1, 1]) tube([[s2 * 0.2, 0.5, 0], [s2 * 0.34, 0.5, 0], [s2 * 0.36, 0.38, 0], [s2 * 0.22, 0.3, 0]], 0.014, mat, g);
  add(new THREE.CylinderGeometry(0.2, 0.22, 0.12, 64), M.walnutDark, 0, -0.06, 0, g);
  return g;
}
// 雙耳高腳盃：美國公開賽
function tallCup(x, y, z, s = 1, mat = M.silver, parent = scene) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s); parent.add(g);
  add(new THREE.CylinderGeometry(0.11, 0.13, 0.1, 64), M.walnutDark, 0, 0.05, 0, g);
  add(lathe(smooth([[0, 0.1], [0.09, 0.1], [0.06, 0.13], [0.03, 0.2], [0.025, 0.33], [0.04, 0.37], [0.1, 0.42], [0.15, 0.52], [0.165, 0.62], [0.17, 0.66], [0.0, 0.66]])), mat, 0, 0, 0, g);
  for (const s2 of [-1, 1]) tube([[s2 * 0.15, 0.62, 0], [s2 * 0.27, 0.66, 0], [s2 * 0.26, 0.5, 0], [s2 * 0.12, 0.44, 0]], 0.011, mat, g);
  add(lathe(smooth([[0.17, 0.66], [0.13, 0.7], [0.05, 0.73], [0.02, 0.78], [0, 0.8]])), mat, 0, 0, 0, g);
  return g;
}
// 兒童盃：小金盃
function juniorCup(x, y, z, s = 1, parent = scene) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s); parent.add(g);
  add(new THREE.BoxGeometry(0.12, 0.06, 0.12), M.walnutDark, 0, 0.03, 0, g);
  add(lathe(smooth([[0, 0.06], [0.04, 0.06], [0.015, 0.09], [0.012, 0.15], [0.05, 0.2], [0.07, 0.27], [0.0, 0.27]])), M.gold, 0, 0, 0, g);
  for (const s2 of [-1, 1]) tube([[s2 * 0.06, 0.25, 0], [s2 * 0.1, 0.24, 0], [s2 * 0.09, 0.19, 0], [s2 * 0.045, 0.18, 0]], 0.006, M.gold, g);
  return g;
}

// ---------- 展示櫃 ----------
function vitrine(x, z, w, d, h, ry = 0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
  add(new RoundedBoxGeometry(w, 0.9, d, 3, 0.02), M.walnut, 0, 0.45, 0, g);
  add(new THREE.BoxGeometry(w + 0.06, 0.04, d + 0.06), M.walnutDark, 0, 0.92, 0, g);
  add(new THREE.BoxGeometry(w - 0.06, 0.01, d - 0.06), M.felt, 0, 0.945, 0, g);
  const glass = add(new THREE.BoxGeometry(w, h, d), M.glass, 0, 0.94 + h / 2, 0, g); glass.castShadow = false;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(new THREE.BoxGeometry(0.02, h, 0.02), M.brass, sx * w / 2, 0.94 + h / 2, sz * d / 2, g);
  add(new THREE.BoxGeometry(w + 0.02, 0.02, d + 0.02), M.brass, 0, 0.94 + h, 0, g);
  return g;
}

// 牆上的層架（左牆）
function shelfWall(x, z, ry, y = 0) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; scene.add(g);
  add(new THREE.BoxGeometry(4.2, 2.4, 0.06), M.walnutDark, 0, 2.3, 0.03, g);
  for (const yy of [1.55, 2.3, 3.05]) {
    add(new THREE.BoxGeometry(4.0, 0.05, 0.42), M.walnut, 0, yy, 0.25, g);
    add(new THREE.BoxGeometry(4.0, 0.02, 0.02), M.brass, 0, yy + 0.03, 0.46, g);
  }
  return g;
}


// 畫框與照片
function frame(img, x, y, z, ry, w, h) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; scene.add(g);
  add(new THREE.BoxGeometry(w + 0.12, h + 0.12, 0.05), M.walnutDark, 0, 0, 0.025, g);
  add(new THREE.BoxGeometry(w + 0.07, h + 0.07, 0.055), M.brass, 0, 0, 0.026, g);
  add(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ color: 0xf2ead8, roughness: 0.9 }), 0, 0, 0.056, g);
  const t = loader.load('Career/img/s/' + img); t.colorSpace = THREE.SRGBColorSpace;
  add(new THREE.PlaneGeometry(w * 0.84, h * 0.84), new THREE.MeshStandardMaterial({ map: t, roughness: 0.55 }), 0, 0, 0.058, g);
  return g;
}
// 空的展示櫃名牌（還沒拿到的大賽）
function emptyPlate(parent, text) {
  const m = add(new THREE.PlaneGeometry(0.5, 0.16), new THREE.MeshStandardMaterial({ map: plateTex([text, '— 空位 —']), metalness: 0.6, roughness: 0.4 }), 0, 1.05, 0, parent);
  m.rotation.x = -0.5; m.castShadow = false;
}
// 證書：牆上的裱框
function certificate(x, y, z, ry, t) {
  const tex = canvasTex(512, 360, (g, w, h) => {
    g.fillStyle = '#fbf7ec'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c9a85c'; g.lineWidth = 14; g.strokeRect(10, 10, w - 20, h - 20);
    g.fillStyle = '#2a2414'; g.textAlign = 'center'; g.font = '700 40px "Noto Serif TC", serif'; g.fillText('冠軍證書', w / 2, 90);
    g.font = '500 28px "Noto Serif TC", serif'; g.fillText(String(t.name).slice(0, 18), w / 2, 160); g.fillText(PLAYER.name, w / 2, 220); g.font = '500 24px "Noto Serif TC", serif'; g.fillText(String(t.y), w / 2, 290);
    g.strokeStyle = '#a3302a'; g.lineWidth = 4; g.beginPath(); g.arc(w - 90, h - 80, 36, 0, 7); g.stroke();
  });
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; scene.add(g);
  add(new THREE.BoxGeometry(0.72, 0.52, 0.04), M.walnutDark, 0, 0, 0.02, g);
  add(new THREE.PlaneGeometry(0.64, 0.45), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }), 0, 0, 0.045, g);
}

// ---------- 收藏區（房間前半部）----------
// 裱框收藏（旗、球衣、紀念品）：綠色絨布底的畫面＋下方名字
const cut = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1) + '…' : String(s));
function shadowBox(c, x, y, z, ry) {
  const tex = canvasTex(400, 440, (g, w, h) => {
    g.fillStyle = '#123425'; g.fillRect(0, 0, w, h);
    g.save(); g.translate(w / 2, 170);
    if (c.kind === 'flag') {
      g.fillStyle = '#d8d8d0'; g.fillRect(-70, -130, 8, 260);
      g.fillStyle = '#b8322a'; g.beginPath(); g.moveTo(-62, -128); g.lineTo(90, -128); g.lineTo(60, -78); g.lineTo(90, -28); g.lineTo(-62, -28); g.closePath(); g.fill();
      g.fillStyle = '#f4ead0'; g.font = '700 46px "Noto Serif TC", serif'; g.textAlign = 'center'; g.fillText('18', 6, -62);
      g.strokeStyle = 'rgba(244,234,208,.85)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-20, 40); g.bezierCurveTo(10, 10, 40, 70, 80, 30); g.stroke();      // 簽名
    } else if (c.kind === 'jersey') {
      g.fillStyle = '#20324f'; g.beginPath(); g.moveTo(-50, -120); g.lineTo(-20, -130); g.quadraticCurveTo(0, -112, 20, -130); g.lineTo(50, -120); g.lineTo(110, -70); g.lineTo(80, -40); g.lineTo(60, -58); g.lineTo(60, 120); g.lineTo(-60, 120); g.lineTo(-60, -58); g.lineTo(-80, -40); g.lineTo(-110, -70); g.closePath(); g.fill();
      g.fillStyle = '#c9a85c'; g.fillRect(-60, -20, 120, 8);
      g.fillStyle = '#f4ead0'; g.font = '700 70px "Noto Serif TC", serif'; g.textAlign = 'center'; g.fillText(String((c.name.length * 7) % 89 + 1), 0, 70);
    } else {
      g.rotate(-0.04); g.fillStyle = '#f4ecd8'; g.fillRect(-95, -125, 190, 250); g.strokeStyle = '#c9a85c'; g.lineWidth = 4; g.strokeRect(-85, -115, 170, 230);
      g.strokeStyle = '#8a7a5a'; g.lineWidth = 3; for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(-65, -80 + i * 26); g.lineTo(i === 6 ? 10 : 65, -80 + i * 26); g.stroke(); }
      g.strokeStyle = '#2a3a6a'; g.beginPath(); g.moveTo(-10, 100); g.bezierCurveTo(15, 70, 40, 115, 70, 88); g.stroke();
    }
    g.restore();
    g.fillStyle = '#c9a85c'; g.fillRect(40, 344, w - 80, 2);
    g.fillStyle = '#f4ead0'; g.textAlign = 'center'; g.font = '700 26px "Noto Serif TC", serif'; g.fillText(cut(c.name, 13), w / 2, 384);
    g.font = '400 22px "Noto Sans TC", sans-serif'; g.fillStyle = 'rgba(244,234,208,.75)'; g.fillText(`${c.y} · ${c.from || COLLECT_KIND[c.kind] || ''}`, w / 2, 418);
  });
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; scene.add(g);
  add(new THREE.BoxGeometry(0.86, 0.94, 0.09), M.walnutDark, 0, 0, 0.045, g);
  add(new THREE.BoxGeometry(0.8, 0.88, 0.095), M.brass, 0, 0, 0.046, g);
  add(new THREE.PlaneGeometry(0.74, 0.82), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }), 0, 0, 0.096, g);
  const gl = add(new THREE.PlaneGeometry(0.76, 0.84), M.glass, 0, 0, 0.1, g); gl.castShadow = false;
  return g;
}
// 收藏區的名牌（黃銅）
function zonePlate(x, y, z, ry, lines) {
  const m = add(new THREE.PlaneGeometry(1.1, 0.34), new THREE.MeshStandardMaterial({ map: plateTex(lines), metalness: 0.6, roughness: 0.4 }), x, y, z);
  m.rotation.y = ry; m.castShadow = false;
}
// 玻璃長櫃裡的小東西：簽名球（放在黃銅球座上）、手套、球桿（平放）
function smallItem(c, parent, x) {
  const g = new THREE.Group(); g.position.set(x, 0.95, 0); parent.add(g);
  if (c.kind !== 'club') g.scale.setScalar(1.4);      // 小東西放大一點，站在櫃前看得清楚
  if (c.kind === 'ball') {
    add(new THREE.CylinderGeometry(0.03, 0.04, 0.05, 20), M.brass, 0, 0.025, 0, g);
    add(new THREE.SphereGeometry(0.045, 32, 20), new THREE.MeshPhysicalMaterial({ color: 0xf6f4ee, roughness: 0.35, clearcoat: 0.6 }), 0, 0.095, 0, g);
  } else if (c.kind === 'glove') {
    const m = new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.75 });
    add(new RoundedBoxGeometry(0.11, 0.02, 0.15, 2, 0.008), m, 0, 0.012, 0, g);
    for (let i = 0; i < 4; i++) add(new THREE.CylinderGeometry(0.009, 0.009, 0.07, 10).rotateX(Math.PI / 2), m, -0.037 + i * 0.025, 0.014, -0.105, g);
    add(new THREE.BoxGeometry(0.11, 0.022, 0.03), new THREE.MeshStandardMaterial({ color: 0x1c3a2a, roughness: 0.6 }), 0, 0.013, 0.06, g);
  } else if (c.kind === 'club') {
    add(new THREE.CylinderGeometry(0.006, 0.008, 0.8, 12).rotateZ(Math.PI / 2), M.silver, 0, 0.02, 0.05, g);
    add(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 12).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 }), -0.36, 0.02, 0.05, g);
    add(new RoundedBoxGeometry(0.1, 0.05, 0.06, 2, 0.015), /木/.test(c.name) ? new THREE.MeshStandardMaterial({ color: 0x3a2414, roughness: 0.35 }) : M.silver, 0.42, 0.03, 0.03, g);
  } else {
    add(new THREE.BoxGeometry(0.16, 0.012, 0.22), new THREE.MeshStandardMaterial({ color: 0xf2ead8, roughness: 0.9 }), 0, 0.006, 0, g);
  }
  return g;
}
// 球袋：立在地上
function golfBag(x, z, c) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.z = 0.08; scene.add(g);
  const leather = new THREE.MeshStandardMaterial({ color: 0x5a2f16, roughness: 0.5 });
  add(new THREE.CylinderGeometry(0.15, 0.13, 0.9, 32), leather, 0, 0.45, 0, g);
  for (const yy of [0.12, 0.84]) add(new THREE.CylinderGeometry(0.155, 0.155, 0.04, 32), M.brass, 0, yy, 0, g);
  add(new THREE.BoxGeometry(0.06, 0.5, 0.05), leather, 0, 0.5, 0.15, g);
  for (let i = 0; i < 5; i++) { const a = i * 1.26; add(new THREE.CylinderGeometry(0.006, 0.006, 0.3, 8), M.silver, Math.cos(a) * 0.07, 1.02, Math.sin(a) * 0.07, g); add(new THREE.SphereGeometry(0.03, 12, 10), i % 2 ? M.silver : new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3 }), Math.cos(a) * 0.07, 1.18, Math.sin(a) * 0.07, g); }
  PICK.push({ obj: g, t: colT(c) });
}
const colT = c => ({ name: c.name, y: c.y, course: `${COLLECT_KIND[c.kind] || '收藏'}${c.from ? ' · 來自' + c.from : ''}`, desc: c.desc || '' });
function placeCollection(st) {
  const C = (st.collection || []).slice().reverse();      // 新的在前
  const wall = C.filter(c => ['flag', 'jersey', 'memo'].includes(c.kind) || !COLLECT_KIND[c.kind]).slice(0, 8);
  const cased = C.filter(c => ['ball', 'glove', 'club'].includes(c.kind)).slice(0, 8);
  const bags = C.filter(c => c.kind === 'bag').slice(0, 2);
  // 左牆前段：收藏牆（2 排 × 4 個裱框）
  const wx = -RW / 2 + 0.03, wz = RD / 2 - 3.8;
  add(new THREE.BoxGeometry(0.06, 2.3, 4.2), M.walnutDark, wx + 0.03, 2.35, wz);
  zonePlate(wx + 0.07, 3.68, wz, Math.PI / 2, ['收藏', `${(st.collection || []).length} 件`]);
  wall.forEach((c, i) => { const n = Math.min(4, wall.length - (i < 4 ? 0 : 4)); const o = shadowBox(c, wx + 0.06, i < 4 ? 2.95 : 1.95, wz + (i % 4) - (n - 1) / 2, Math.PI / 2); PICK.push({ obj: o, t: colT(c) }); });
  if (!wall.length) zonePlate(wx + 0.07, 2.4, wz, Math.PI / 2, ['收藏牆', '— 還沒有收藏 —']);
  spot(-RW / 2 + 1.8, lowH(-RW / 2 + 1.8, wz), wz, wx, 2.4, wz, 26, 0.55);
  // 右牆前段：玻璃長櫃（依數量平均排開）
  const v = vitrine(RW / 2 - 0.5, wz, 3.6, 0.6, 0.45, -Math.PI / 2);
  const gap = cased.length > 1 ? 3.0 / (cased.length - 1) : 0;
  cased.forEach((c, i) => { const o = smallItem(c, v, cased.length > 1 ? -1.5 + i * gap : 0); PICK.push({ obj: o, t: colT(c) }); });
  if (!cased.length) emptyPlate(v, '簽名球・手套・球桿');
  zonePlate(RW / 2 - 0.03, 2.2, wz, -Math.PI / 2, ['收藏櫃', '簽名球 · 手套 · 球桿']);
  spot(RW / 2 - 1.7, lowH(RW / 2 - 1.7, wz), wz, RW / 2 - 0.5, 1, wz, 26, 0.5);
  // 球袋：立在長櫃兩端
  bags.forEach((c, i) => golfBag(RW / 2 - 0.45, i ? wz - 2.25 : wz + 2.25, c));
}

// ---------- 依存檔擺設 ----------
const PICK = [];      // 可以點的獎盃：{ obj, t }
const MAJOR_IDS = ['masters', 'open', 'usopen', 'pgachamp'];
function place(st) {
  PICK.length = 0; WALK.length = 0; STAIR = null;
  const lv = Math.max(0, Math.min(LEVELS.length - 1, st.room || 0));
  LV = LEVELS[lv]; RW = LV.w; RD = LV.d; RH = LV.h; MEZ = LV.mez || 0; MD = LV.md || 0;
  const T = st.trophies, has = id => T.filter(t => t.id === id);
  const jackets = has('masters');
  PLAYER = { name: st.player.name, year: jackets.length ? jackets.map(j => j.y).join(' · ') : '' };
  const slots = ROOM_LEVELS[lv].slots, recent = T.slice().reverse().slice(0, slots);
  if (LV.kind === 'desk') return deskRoom(st, recent);
  if (LV.kind === 'living') return livingRoom(st, recent);
  buildShell(LV.kind === 'hall' ? 'hall' : LV.kind === 'gallery' ? 'gallery' : 'wood');
  const shown = mainFloor(st, T, has);
  if (MEZ) { mezzanine(); upperFloor(st, T, shown); }
  if (LV.kind === 'hall') statue(0, -2.75, st.year);
}
// 獎盃室（以及展覽館、名人堂館的一樓）：原本的擺設，位置跟著房間大小
function mainFloor(st, T, has) {
  const shown = new Set();
  locker(0, -RD / 2 + 0.36);
  spot(0, lowH(0, -RD / 2 + 2.8), -RD / 2 + 2.8, 0, 1.4, -RD / 2 + 0.4, 16, 0.3);
  frame('augusta-10.jpg', -2.9, 2.35, -RD / 2 + 0.01, 0, 1.6, 1.1);
  frame('hogan-bridge.jpg', 2.9, 2.35, -RD / 2 + 0.01, 0, 1.6, 1.1);
  // 中央展示櫃：四大賽（名人賽的紀念獎座、銀壺、PGA 大銀盃、美國公開賽高腳盃）
  const majors = [['masters', -2.3, -1.3, 1.2, 0.9, 1.2, '名人賽'], ['open', -2.3, -4.2, 1.0, 0.7, 0.95, '英國公開賽'], ['usopen', 2.3, -4.2, 1.0, 0.7, 0.95, '美國公開賽'], ['pgachamp', 2.3, -1.3, 1.2, 0.9, 1.2, 'PGA 錦標賽']];
  for (const [id, x, z, w, d, h, zh] of majors) {
    const v = vitrine(x, z, w, d, h), won = has(id);
    if (won.length) {
      const o = id === 'open' ? jug(0, 0.95, 0, 1.25, v) : id === 'usopen' ? tallCup(0, 0.95, 0, 0.95, M.silver, v) : bigCup(0, 1.01, 0, id === 'masters' ? 0.8 : 0.95, id === 'masters' ? M.gold : M.silver, v);
      PICK.push({ obj: o, t: { ...won[won.length - 1], name: `${zh}（${won.map(x2 => x2.y).join('、')}）` } });
      won.forEach(t => shown.add(t));
    } else emptyPlate(v, zh);
    spot(x, lowH(x, z), z, x, 1.2, z, 32, 0.3);
  }
  // 左牆：獎盃層架（下排巡迴賽 / 中排兒童盃與青少年 / 上排業餘與獎牌）
  shelfWall(-RW / 2 + 0.03, -2.5, Math.PI / 2);
  const sh = new THREE.Group(); sh.position.set(-RW / 2 + 0.03, 0, -2.5); sh.rotation.y = Math.PI / 2; scene.add(sh);
  const tour = T.filter(t => !['masters', 'open', 'usopen', 'pgachamp'].includes(t.id) && !['kidcup', 'medal'].includes(t.kind) && t.tour !== 'kids' && t.tour !== 'junior' && t.tour !== 'am' && t.tour !== 'ncaa').slice(-5);
  tour.forEach((t, i) => { const px = -1.6 + i * 0.8; const o = (t.kind === 'teamcup' || t.kind === 'players' || i % 2) ? tallCup(px, 1.58, 0.25, 0.42, t.kind === 'teamcup' ? M.gold : M.silver, sh) : bigCup(px, 1.6, 0.25, 0.42, M.silver, sh); PICK.push({ obj: o, t }); shown.add(t); });
  const kids = T.filter(t => t.tour === 'kids' || t.tour === 'junior' || t.kind === 'kidcup').slice(-5);
  kids.forEach((t, i) => { const o = juniorCup(-1.6 + i * 0.8, 2.33, 0.25, 1.4 + (i % 2) * 0.2, sh); PICK.push({ obj: o, t }); shown.add(t); });
  const am = T.filter(t => t.tour === 'am' || t.tour === 'ncaa' || t.kind === 'medal').slice(-3);
  am.forEach((t, i) => { const o = jug(-1.2 + i * 1.2, 3.08, 0.25, 0.55, sh); PICK.push({ obj: o, t }); shown.add(t); });
  spot(-RW / 2 + 1.9, lowH(-RW / 2 + 1.9, -2.5), -2.5, -RW / 2, 2.2, -2.5, 30, 0.55);
  // 右牆：照片與證書
  frame('swilcan.jpg', RW / 2 - 0.01, 2.6, -3.6, -Math.PI / 2, 1.5, 1.0);
  frame('sawgrass-17.jpg', RW / 2 - 0.01, 2.6, -1.6, -Math.PI / 2, 1.5, 1.0);
  frame('pebble-18.jpg', RW / 2 - 0.01, 2.6, 0.4, -Math.PI / 2, 1.5, 1.0);
  T.filter(t => t.tour !== 'kids').slice(-6).forEach((t, i) => certificate(RW / 2 - 0.01, 1.55, -4 + i * 0.85, -Math.PI / 2, t));
  spot(RW / 2 - 1.7, lowH(RW / 2 - 1.7, -1.6), -1.6, RW / 2, 2.2, -1.6, 26, 0.6);
  placeCollection(st);
  if (!MEZ) {
    for (let x = -RW / 2 + 1.1; x < RW / 2; x += 2.2) add(new THREE.BoxGeometry(0.14, 0.16, RD), M.walnutDark, x, RH - 0.08, 0);
    for (let z = -RD / 2 + 1.4; z < RD / 2; z += 2.8) add(new THREE.BoxGeometry(RW, 0.16, 0.14), M.walnutDark, 0, RH - 0.08, z);
  }
  return shown;
}

// 依獎盃種類挑模型；s = 大約的高度比例（1 ≈ 0.8 公尺）
function trophyFor(t, x, y, z, s, parent) {
  const kd = t.kind;
  let o;
  if (t.id === 'open' || t.tour === 'am' || t.tour === 'ncaa' || kd === 'medal' || kd === 'amcup') o = jug(x, y, z, 1.6 * s, parent);
  else if (t.tour === 'kids' || t.tour === 'junior' || kd === 'kidcup') o = juniorCup(x, y, z, 3 * s, parent);
  else if (t.id === 'usopen' || kd === 'teamcup' || kd === 'players') o = tallCup(x, y, z, s, kd === 'teamcup' ? M.gold : M.silver, parent);
  else o = bigCup(x, y + 0.12 * s, z, s, t.id === 'masters' || kd === 'jacket' ? M.gold : M.silver, parent);
  PICK.push({ obj: o, t });
  return o;
}
const box = (w, h, d, mat, x, y, z, parent) => add(new THREE.BoxGeometry(w, h, d), mat, x, y, z, parent);
// 窗戶：白色窗框 + 亮的天空 + 兩片窗簾 + 一盞冷色的光
function windowOn(side, z, y = 1.5, w = 1.1, h = 1.1) {
  const x = side * (RW / 2 - 0.01), g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = -side * Math.PI / 2; scene.add(g);
  box(w + 0.12, h + 0.12, 0.04, M.trim, 0, 0, 0.01, g);
  add(new THREE.PlaneGeometry(w, h), SKY, 0, 0, 0.035, g).castShadow = false;
  box(0.04, h, 0.04, M.trim, 0, 0, 0.05, g); box(w, 0.04, 0.04, M.trim, 0, 0, 0.05, g);
  for (const s of [-1, 1]) box(0.22, h + 0.5, 0.03, M.curtain, s * (w / 2 + 0.16), -0.1, 0.09, g);
  const l = new THREE.PointLight(0xdfeeff, 3, 6, 1.5); l.position.set(x - side * 0.7, y, z); scene.add(l);
}
// 窗外：藍天、雲、遠處的樹和草地
const SKY = new THREE.MeshBasicMaterial({ map: canvasTex(256, 256, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#6fa8dc'); gr.addColorStop(0.65, '#c4e0f4'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,255,255,.85)'; for (const [x, y, r] of [[60, 60, 22], [84, 52, 26], [108, 62, 20], [180, 95, 16], [198, 90, 20]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  g.fillStyle = '#3f6b3a'; g.beginPath(); g.moveTo(0, 190); for (let x = 0; x <= w; x += 16) g.lineTo(x, 182 - Math.abs(Math.sin(x * 0.05)) * 26); g.lineTo(w, h); g.lineTo(0, h); g.fill();
  g.fillStyle = '#6d9a4c'; g.fillRect(0, 214, w, h - 214);
}) });
// 小檯燈 / 立燈
function lamp(x, y, z, tall = false) {
  if (tall) { add(new THREE.CylinderGeometry(0.16, 0.18, 0.03, 24), M.black, x, 0.015, z); add(new THREE.CylinderGeometry(0.012, 0.012, 1.5, 12), M.brass, x, 0.75, z); }
  else { add(new THREE.CylinderGeometry(0.07, 0.08, 0.02, 24), M.black, x, y + 0.01, z); add(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 12), M.brass, x, y + 0.16, z); }
  const top = tall ? 1.55 : y + 0.32;
  add(new THREE.CylinderGeometry(tall ? 0.16 : 0.07, tall ? 0.22 : 0.1, tall ? 0.26 : 0.13, 32, 1, true), M.shade, x, top, z).castShadow = false;
  const l = new THREE.PointLight(0xffd8a0, tall ? 2.2 : 1.2, tall ? 4 : 2.6, 1.5); l.position.set(x, top - 0.05, z); scene.add(l);
}
// 牆上的裱框收藏（小房間用，縮小）
function wallItems(items, x, side, zs, y, s) {
  items.forEach((c, i) => { const o = shadowBox(c, x, y, zs[i], side * Math.PI / 2); o.scale.setScalar(s); PICK.push({ obj: o, t: colT(c) }); });
}

// ---------- 第 1 級：童年書桌（自己的小房間）----------
function deskRoom(st, list) {
  buildShell('kid');
  const bz = -RD / 2, dz = bz + 0.36;
  // 書桌（靠後牆）、抽屜、椅子、檯燈
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(0.045, 0.73, 0.045, M.woodLight, 0.3 + sx * 0.7, 0.365, dz + sz * 0.27);
  box(1.5, 0.045, 0.62, M.woodLight, 0.3, 0.755, dz);
  box(0.45, 0.16, 0.56, M.trim, 0.8, 0.64, dz); box(0.08, 0.014, 0.02, M.brass, 0.8, 0.64, dz + 0.285);
  lamp(-0.28, 0.78, dz - 0.12);
  // 椅子拉開、斜放（不擋住桌上的獎盃）
  const ch = new THREE.Group(); ch.position.set(1.15, 0, dz + 0.85); ch.rotation.y = -0.9; scene.add(ch);
  box(0.46, 0.04, 0.44, M.woodLight, 0, 0.45, 0, ch);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(0.035, 0.45, 0.035, M.woodLight, sx * 0.2, 0.225, sz * 0.19, ch);
  box(0.46, 0.5, 0.035, M.woodLight, 0, 0.72, 0.21, ch);
  // 書桌上方的兩層小層架
  for (const yy of [1.32, 1.74]) { box(1.3, 0.03, 0.22, M.woodLight, 0.3, yy, bz + 0.11); box(0.03, 0.14, 0.2, M.woodLight, -0.33, yy - 0.08, bz + 0.11); box(0.03, 0.14, 0.2, M.woodLight, 0.93, yy - 0.08, bz + 0.11); }
  // 獎盃：書桌 2 座、層架各 2 座（最新的放在書桌上）
  const P = [[0.15, 0.78, dz + 0.05], [0.5, 0.78, dz + 0.05], [0.0, 1.335, bz + 0.12], [0.6, 1.335, bz + 0.12], [0.0, 1.755, bz + 0.12], [0.6, 1.755, bz + 0.12]];
  list.slice(0, P.length).forEach((t, i) => trophyFor(t, ...P[i], 0.4, scene));
  if (!list.length) { const m = add(new THREE.PlaneGeometry(0.42, 0.13), new THREE.MeshStandardMaterial({ map: plateTex(['第一座獎盃', '— 放在這裡 —']), metalness: 0.5, roughness: 0.4 }), 0.35, 0.79, dz + 0.05); m.rotation.x = -1.2; m.castShadow = false; }
  spot(0.3, RH, bz + 0.9, 0.3, 1.1, bz + 0.2, 10, 0.5);
  // 床（靠左牆）、海報、窗戶、圓地毯
  const bx = -RW / 2 + 0.52, bzc = 0.75;
  box(1.0, 0.3, 2.0, M.woodLight, bx, 0.15, bzc); box(0.94, 0.16, 1.94, M.bedding, bx, 0.38, bzc);
  box(0.97, 0.07, 1.3, M.blanket, bx, 0.48, bzc + 0.32);
  add(new RoundedBoxGeometry(0.6, 0.12, 0.34, 3, 0.05), M.bedding, bx, 0.52, bzc - 0.72);
  box(1.0, 0.85, 0.05, M.woodLight, bx, 0.43, bzc - 1.0);
  frame('augusta-10.jpg', -RW / 2 + 0.01, 1.62, bzc, Math.PI / 2, 0.9, 0.62);
  windowOn(1, -0.7);
  add(new THREE.CircleGeometry(0.75, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x7c9a6a, roughness: 1 }), 0.4, 0.004, 0.7);
  // 收藏：右牆前段 3 個小裱框、球袋立在角落
  const C = (st.collection || []).slice().reverse();
  wallItems(C.filter(c => !['ball', 'glove', 'club', 'bag'].includes(c.kind)).slice(0, 3), RW / 2 - 0.02, -1, [0.55, 1.15, 1.75], 1.55, 0.55);
  C.filter(c => c.kind === 'bag').slice(0, 1).forEach(c => golfBag(RW / 2 - 0.3, RD / 2 - 0.35, c));
}

// ---------- 第 2 級：家裡的玻璃櫃（客廳一角）----------
function cabinet(x, z, list) {
  const w = 1.9, h = 2.15, d = 0.44, g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  box(w, h, 0.03, M.walnut, 0, h / 2, -d / 2, g);
  for (const s of [-1, 1]) box(0.05, h, d, M.walnut, s * (w / 2 - 0.025), h / 2, 0, g);
  box(w, 0.3, d, M.walnut, 0, 0.15, 0, g); box(w + 0.06, 0.06, d + 0.04, M.walnutDark, 0, h + 0.03, 0.01, g);
  const rows = [0.3, 0.75, 1.2, 1.65];
  rows.forEach(yy => { const s = add(new THREE.BoxGeometry(w - 0.1, 0.012, d - 0.06), M.glass, 0, yy, 0, g); s.castShadow = false; });
  const front = add(new THREE.PlaneGeometry(w - 0.1, h - 0.36), M.glass, 0, 0.3 + (h - 0.36) / 2, d / 2, g); front.castShadow = false;
  box(0.012, h - 0.36, 0.02, M.brass, 0, 0.3 + (h - 0.36) / 2, d / 2 + 0.01, g);
  const l = new THREE.PointLight(0xffe2b8, 1.6, 2.6, 1.4); l.position.set(x, 2.0, z + 0.05); scene.add(l);
  // 14 座：由上往下 4、4、3、3
  const per = [3, 3, 4, 4]; let k = 0;
  for (let r = 3; r >= 0 && k < list.length; r--) {
    const n = Math.min(per[r], list.length - k);
    for (let i = 0; i < n; i++, k++) trophyFor(list[k], -0.7 + (n > 1 ? i * 1.4 / (n - 1) : 0.7), rows[r] + 0.01, 0.02, 0.42, g);
  }
  if (!list.length) emptyPlate(g, '獎盃櫃');
  return g;
}
function livingRoom(st, list) {
  buildShell('living');
  const bz = -RD / 2;
  cabinet(-1.35, bz + 0.25, list);
  spot(-1.35, RH, bz + 1.4, -1.35, 1.2, bz + 0.25, 14, 0.45);
  // 電視櫃與電視
  box(1.7, 0.5, 0.42, M.walnut, 1.6, 0.25, bz + 0.22);
  box(1.3, 0.76, 0.05, M.black, 1.6, 1.38, bz + 0.04);
  // 地毯、茶几（上面放簽名球、手套）、沙發、立燈、盆栽
  add(new THREE.PlaneGeometry(3, 2.1).rotateX(-Math.PI / 2), M.carpet, 0.2, 0.004, 0.2);
  box(1.1, 0.05, 0.6, M.walnut, 0.2, 0.42, 0.2);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(0.04, 0.4, 0.04, M.walnutDark, 0.2 + sx * 0.5, 0.2, 0.2 + sz * 0.25);
  const tbl = new THREE.Group(); tbl.position.set(0.2, -0.505, 0.2); scene.add(tbl);
  const C = (st.collection || []).slice().reverse();
  const small = C.filter(c => ['ball', 'glove', 'club'].includes(c.kind) && c.kind !== 'club').slice(0, 3);
  small.forEach((c, i) => { const o = smallItem(c, tbl, -0.35 + i * 0.35); o.scale.setScalar(1); PICK.push({ obj: o, t: colT(c) }); });
  const sz = 2.05;
  box(2.2, 0.42, 0.9, M.sofa, 0.2, 0.21, sz); box(2.2, 0.6, 0.2, M.sofa, 0.2, 0.62, sz + 0.35);
  for (const s of [-1, 1]) box(0.2, 0.62, 0.9, M.sofa, 0.2 + s * 1.0, 0.31, sz);
  for (const s of [-1, 1]) add(new RoundedBoxGeometry(0.88, 0.14, 0.7, 3, 0.05), M.sofa, 0.2 + s * 0.45, 0.48, sz - 0.05);
  lamp(RW / 2 - 0.45, 0, RD / 2 - 0.9, true);
  add(new THREE.CylinderGeometry(0.2, 0.16, 0.38, 24), M.trim, -RW / 2 + 0.4, 0.19, bz + 0.4);
  add(new THREE.SphereGeometry(0.36, 20, 14), M.plant, -RW / 2 + 0.4, 0.78, bz + 0.4).scale.set(1, 1.3, 1);
  windowOn(1, -0.4, 1.55, 1.4, 1.3);
  // 左牆：收藏的裱框（最多 4 個）、照片；球袋立在玻璃櫃旁
  wallItems(C.filter(c => !['ball', 'glove', 'club', 'bag'].includes(c.kind)).slice(0, 4), -RW / 2 + 0.02, 1, [-1.8, -0.95, -0.1, 0.75], 1.6, 0.72);
  frame('pebble-18.jpg', -RW / 2 + 0.01, 1.7, 2.0, Math.PI / 2, 1.0, 0.7);
  C.filter(c => c.kind === 'bag').slice(0, 1).forEach(c => golfBag(-RW / 2 + 0.35, bz + 1.3, c));
}

// ---------- 第 4、5 級：二樓迴廊（ㄇ字形：後牆與左右兩側）、樓梯、欄杆、柱子 ----------
function rail(x1, z1, x2, z2, y) {
  const len = Math.hypot(x2 - x1, z2 - z1), g = new THREE.Group();
  g.position.set((x1 + x2) / 2, y, (z1 + z2) / 2); g.rotation.y = -Math.atan2(z2 - z1, x2 - x1); scene.add(g);
  add(new THREE.PlaneGeometry(len, 0.9), M.glass, 0, 0.5, 0, g).castShadow = false;
  box(len, 0.05, 0.07, M.brass, 0, 1.0, 0, g);
  for (let t = -len / 2; t <= len / 2 + 0.01; t += Math.max(1, len / Math.ceil(len / 1.6))) box(0.04, 1.0, 0.04, M.brass, t, 0.5, 0, g);
}
function column(x, z, h, hall) {
  if (hall) {
    add(new THREE.CylinderGeometry(0.26, 0.3, h - 0.5, 32), M.stone, x, h / 2, z);
    box(0.8, 0.25, 0.8, M.stone, x, 0.125, z); box(0.75, 0.25, 0.75, M.stone, x, h - 0.125, z);
  } else add(new THREE.CylinderGeometry(0.07, 0.07, h, 16), M.brass, x, h / 2, z);
}
function mezzanine() {
  const hw = RW / 2, hd = RD / 2, t = 0.25, hall = LV.kind === 'hall';
  const bands = [[-hw, hw, -hd, -hd + MD], [-hw, -hw + MD, -hd + MD, hd], [hw - MD, hw, -hd + MD, hd]];
  for (const [x1, x2, z1, z2] of bands) {
    // 從一樓往上看不到二樓的地板：點二樓的底板也算走上去
    walkable(box(x2 - x1, t, z2 - z1, M.walnutDark, (x1 + x2) / 2, MEZ - t / 2, (z1 + z2) / 2), MEZ, [x1, x2, z1, z2], 0.45);
    const top = add(new THREE.PlaneGeometry(x2 - x1, z2 - z1).rotateX(-Math.PI / 2), hall ? M.marble : M.floor, (x1 + x2) / 2, MEZ + 0.003, (z1 + z2) / 2);
    walkable(top, MEZ, [x1, x2, z1, z2], 0.45);
  }
  // 二樓的木牆板腰線
  for (const [w, x, z, ry] of [[RW, 0, -hd, 0], [RD, -hw, 0, Math.PI / 2], [RD, hw, 0, -Math.PI / 2]]) {
    const g = new THREE.Group(); g.position.set(x, MEZ, z); g.rotation.y = ry; scene.add(g);
    add(new THREE.PlaneGeometry(w, 1.0), M.walnut, 0, 0.5, 0.005, g); box(w, 0.07, 0.05, M.walnutDark, 0, 1.02, 0.03, g);
  }
  // 樓梯：靠右側迴廊，從前面往後爬，上去是一小塊平台接到後面的迴廊
  const n = Math.ceil(MEZ / 0.18), rise = MEZ / n, run = 0.28, sw = 1.2, sx = hw - MD - sw / 2, zTop = -hd + MD + 0.6;
  const steps = [];
  for (let i = 0; i < n; i++) {
    const hgt = (i + 1) * rise, z = zTop + (n - 1 - i + 0.5) * run;
    steps.push(box(sw, hgt, run, M.walnut, sx, hgt / 2, z)); box(sw, 0.02, 0.03, M.brass, sx, hgt - 0.01, z + run / 2 - 0.015);
  }
  box(sw, t, 0.6, M.walnutDark, sx, MEZ - t / 2, -hd + MD + 0.3);
  const land = add(new THREE.PlaneGeometry(sw, 0.6).rotateX(-Math.PI / 2), hall ? M.marble : M.floor, sx, MEZ + 0.003, -hd + MD + 0.3);
  walkable(land, MEZ, [sx - sw / 2, sx + sw / 2, -hd + MD, zTop], 0.3);
  steps.forEach(m => walkable(m, MEZ, [sx - sw / 2, sx + sw / 2, -hd + MD, zTop], 0.3));      // 點樓梯：走到樓梯上面的平台
  const zBot = zTop + n * run;
  tube([[sx - sw / 2, 1.0, zBot], [sx - sw / 2, MEZ + 1.0, zTop]], 0.025, M.brass);
  for (let k = 0; k <= 4; k++) { const f = k / 4, yy = (1 - f) * rise + f * MEZ; box(0.04, 1.0, 0.04, M.brass, sx - sw / 2, yy + 0.5 - (k === 0 ? 0 : 0), zBot + (zTop - zBot) * f); }
  STAIR = { bottom: new THREE.Vector3(sx, 1.6, zBot + 0.7), top: new THREE.Vector3(sx, MEZ + 1.6, -hd + MD + 0.3) };
  // 欄杆（樓梯接上來的地方留缺口）、柱子
  rail(-hw + MD, -hd + MD, sx - sw / 2, -hd + MD, MEZ);
  rail(-hw + MD, -hd + MD, -hw + MD, hd, MEZ);
  rail(hw - MD, -hd + MD + 0.6, hw - MD, hd, MEZ);
  for (const s of [-1, 1]) for (let z = -hd + MD; z <= hd - 0.5; z += 3.4) column(s * (hw - MD + (hall ? 0.34 : 0.1)), z, MEZ - t, hall);
  for (const x of [-RW / 6, RW / 6]) column(x, -hd + MD - (hall ? 0.34 : 0.1), MEZ - t, hall);
}
// 二樓：後牆兩組層架放一樓放不下的獎盃、兩側牆的證書、天花板垂下來的大賽旗幟
function upperFloor(st, T, shown) {
  const hw = RW / 2, hd = RD / 2, y0 = MEZ;
  const rest = T.slice().reverse().filter(t => !shown.has(t)).slice(0, 30);
  for (const [k, x] of [[0, -RW / 4], [1, RW / 4]]) {
    const g = shelfWall(x, -hd + 0.03, 0, y0 - 0.55);
    rest.slice(k * 15, k * 15 + 15).forEach((t, i) => trophyFor(t, -1.6 + (i % 5) * 0.8, [1.58, 2.33, 3.08][Math.floor(i / 5)], 0.25, 0.5, g));
    spot(x, RH, -hd + 2.2, x, y0 + 1.8, -hd, 30, 0.55);
  }
  if (!rest.length) zonePlate(0, y0 + 1.7, -hd + 0.05, 0, ['二樓展示區', '— 等待新的獎盃 —']);
  const certs = T.filter(t => t.tour !== 'kids').slice(0, -6).slice(-16);
  certs.forEach((t, i) => { const s = i % 2 ? 1 : -1, j = Math.floor(i / 2); certificate(s * (hw - 0.01), y0 + 1.6, -hd + MD + 1.2 + j * 1.0, -s * Math.PI / 2, t); });
  for (const s of [-1, 1]) spot(s * (hw - 1.2), RH, 0, s * hw, y0 + 1.6, 0, 26, 0.9);
  // 大賽旗幟（每座四大賽冠軍一面，沿著兩側欄杆垂下來）
  const ZH = { masters: '名人賽', open: '英國公開賽', usopen: '美國公開賽', pgachamp: 'PGA 錦標賽' };
  T.filter(t => MAJOR_IDS.includes(t.id)).slice(-10).forEach((t, i) => {
    const s = i % 2 ? 1 : -1, z = -hd + MD + 1.5 + Math.floor(i / 2) * 2.2;
    const tex = canvasTex(256, 600, (g, w, h) => {
      g.fillStyle = t.id === 'masters' ? '#0d4a2f' : t.id === 'open' ? '#1d2a4a' : t.id === 'usopen' ? '#5a1a1a' : '#2a2a2a'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#c9a85c'; g.lineWidth = 8; g.strokeRect(14, 14, w - 28, h - 70);
      g.fillStyle = '#e8c870'; g.textAlign = 'center'; g.font = '700 40px "Noto Serif TC", serif';
      [...ZH[t.id]].forEach((ch, k) => g.fillText(ch, w / 2, 110 + k * 52));
      g.font = '700 44px "Noto Serif TC", serif'; g.fillText(String(t.y), w / 2, h - 110);
      g.fillStyle = '#0b0806'; g.beginPath(); g.moveTo(0, h); g.lineTo(w / 2, h - 50); g.lineTo(w, h); g.fill();
    });
    const b = add(new THREE.PlaneGeometry(0.8, 1.9), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, side: THREE.DoubleSide, transparent: true, alphaTest: 0.5 }), s * (hw - MD - 0.25), RH - 1.4, z);
    b.rotation.y = s * Math.PI / 2; b.castShadow = false;
    box(0.9, 0.03, 0.03, M.brass, s * (hw - MD - 0.25), RH - 0.42, z).rotation.y = Math.PI / 2;
    add(new THREE.CylinderGeometry(0.006, 0.006, 0.4, 6), M.brass, s * (hw - MD - 0.25), RH - 0.2, z);
    PICK.push({ obj: b, t: { ...t, name: `${ZH[t.id]}冠軍旗幟` } });
  });
}
// 名人堂館：大廳正中央的古銅紀念碑（巨大的高爾夫球與旗桿）＋石頭基座與名牌
function statue(x, z, year) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = 0.5; scene.add(g);
  box(1.3, 1.0, 1.3, M.stone, 0, 0.5, 0, g); box(1.45, 0.08, 1.45, M.stone, 0, 1.04, 0, g); box(1.5, 0.12, 1.5, M.stone, 0, 0.06, 0, g);
  const pl = add(new THREE.PlaneGeometry(0.9, 0.28), new THREE.MeshStandardMaterial({ map: plateTex([PLAYER.name, '名人堂']), metalness: 0.6, roughness: 0.35 }), 0, 0.6, 0.651, g); pl.castShadow = false;
  // 古銅紀念碑：巨大的高爾夫球（凹洞紋路）立在球座上，旁邊一支插著旗子的旗桿
  const dimple = canvasTex(512, 256, (c, w, h) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.fillStyle = '#555'; for (let yy = 5; yy < h; yy += 10) for (let xx = (yy / 10) % 2 ? 5 : 0; xx < w; xx += 10) { c.beginPath(); c.arc(xx, yy, 3.8, 0, 7); c.fill(); } });
  const ball = new THREE.MeshPhysicalMaterial({ color: 0x7a5530, metalness: 0.9, roughness: 0.38, bumpMap: dimple, bumpScale: 1.3, clearcoat: 0.2 });
  add(new THREE.CylinderGeometry(0.05, 0.14, 0.36, 32), M.bronze, 0, 1.28, 0, g);
  add(new THREE.CylinderGeometry(0.2, 0.05, 0.06, 32), M.bronze, 0, 1.47, 0, g);
  add(new THREE.SphereGeometry(0.5, 64, 48), ball, 0, 1.98, 0, g);
  add(new THREE.CylinderGeometry(0.025, 0.025, 2.6, 16), M.bronze, 0.5, 2.38, -0.42, g);
  add(new THREE.SphereGeometry(0.04, 16, 12), M.gold, 0.5, 3.7, -0.42, g);
  const flag = new THREE.BufferGeometry(), P = [];
  for (let k = 0; k <= 12; k++) { const u = k / 12, wv = Math.sin(u * 3.2) * 0.06; P.push(0.5 + u * 0.75, 3.62, -0.42 + wv, 0.5 + u * 0.75, 3.62 - 0.46 + u * 0.06, -0.42 + wv); }
  const idx = []; for (let k = 0; k < 12; k++) { const a = k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  flag.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); flag.setIndex(idx); flag.computeVertexNormals();
  add(flag, new THREE.MeshPhysicalMaterial({ color: 0x6a4626, metalness: 0.9, roughness: 0.4, side: THREE.DoubleSide }), 0, 0, 0, g);
  spot(x + 1.2, RH * 0.75, z + 1.6, x, 1.9, z, 46, 0.32);
  spot(x - 1.4, RH * 0.75, z - 1.0, x, 1.9, z, 22, 0.32);
  PICK.push({ obj: g, t: { name: `${PLAYER.name} 名人堂紀念碑`, y: year, course: '名人堂館', desc: '古銅的球與旗桿，刻著你的名字' } });
}

// ---------- 打開 / 關閉 ----------
export function openRoom(st) {
  closeRoom();
  const box = document.createElement('div');
  box.id = 'cm-room';
  box.style.cssText = 'position:fixed;inset:0;z-index:75;background:#0b0806';
  const lvNow = Math.max(0, Math.min(LEVELS.length - 1, st.room || 0)), hint = ['拖曳轉頭 · 點地板走過去 · 點獎盃或收藏品拉近', '拖曳轉頭 · 點地板走過去 · 點玻璃櫃裡的獎盃拉近', '拖曳轉頭 · 點地板走過去 · 點獎盃或收藏品拉近 · 前半部是收藏區', '拖曳轉頭 · 點地板走過去 · 點樓梯或二樓走上去 · 點獎盃拉近', '拖曳轉頭 · 點地板走過去 · 點樓梯或二樓走上去 · 點獎盃或紀念碑拉近'][lvNow];
  box.innerHTML = `<div style="position:absolute;left:12px;right:80px;top:calc(env(safe-area-inset-top,0px) + 10px);z-index:2;color:#e7d29a;font:700 16px 'Noto Serif TC'">${esc(ROOM_LEVELS[lvNow].name)}<div style="font:400 11px 'Noto Sans TC';color:rgba(246,240,225,.7)">${hint}</div></div>
    <button id="rm-close" style="position:absolute;right:12px;top:calc(env(safe-area-inset-top,0px) + 10px);z-index:2;color:#e7d29a;border:1px solid rgba(201,168,92,.6);border-radius:14px;padding:4px 12px;background:rgba(0,0,0,.4)">離開</button>
    <div id="rm-info" style="position:absolute;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 16px);z-index:2;display:none;background:rgba(16,38,26,.92);color:#f6f0e1;border:1px solid rgba(201,168,92,.6);border-radius:12px;padding:10px 16px;font-size:13px;text-align:center;max-width:86vw"></div>`;
  document.body.appendChild(box);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  box.appendChild(renderer.domElement);
  scene = new THREE.Scene(); scene.background = new THREE.Color(0x0b0806);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  scene.environmentIntensity = 0.22;
  camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.05, 60);
  shadowSpots = 0;
  place(st);
  // 鏡頭：位置 + 轉向（yaw / pitch）
  const cam = { pos: new THREE.Vector3(...LV.cam), yaw: LV.yaw, pitch: MEZ ? 0.05 : -0.03, to: null, look: null, route: null };
  const apply = () => { camera.position.copy(cam.pos); const d = new THREE.Vector3(Math.sin(cam.yaw) * Math.cos(cam.pitch), Math.sin(cam.pitch), Math.cos(cam.yaw) * Math.cos(cam.pitch)); camera.lookAt(cam.pos.clone().add(d)); };
  apply();
  let drag = null, moved = 0;
  const el = renderer.domElement;
  el.style.touchAction = 'none';
  el.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; moved = 0; });
  el.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; moved += Math.abs(dx) + Math.abs(dy); cam.yaw -= dx * 0.005; cam.pitch = Math.max(-0.7, Math.min(MEZ ? 0.9 : 0.5, cam.pitch - dy * 0.004)); drag = { x: e.clientX, y: e.clientY }; cam.look = null; });
  el.addEventListener('pointerup', e => {
    const was = drag; drag = null;
    if (!was || moved > 8) return;
    const ray = new THREE.Raycaster(), v = new THREE.Vector2(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(v, camera);
    for (const p of PICK) {
      if (ray.intersectObject(p.obj, true).length) {
        const wp = new THREE.Vector3(); p.obj.getWorldPosition(wp);
        const dir = cam.pos.clone().sub(wp).setY(0).normalize();
        cam.route = null; cam.to = wp.clone().add(dir.multiplyScalar(RW < 5 ? 0.8 : 1.2)).setY(Math.max(1.3, wp.y + 0.4)); cam.look = wp.clone().add(new THREE.Vector3(0, 0.25, 0));
        const info = document.getElementById('rm-info'); info.style.display = '';
        info.innerHTML = `<b style="color:#e7d29a;font:700 15px 'Noto Serif TC'">${esc(p.t.name)}</b><br>${p.t.y} 年${p.t.course ? ' · ' + esc(p.t.course) : ''}${p.t.score ? `<br>${p.t.score} 桿（${toPar(p.t.toPar)}）` : ''}${p.t.desc ? `<br><span style="opacity:.8">${esc(p.t.desc)}</span>` : ''}`;
        return;
      }
    }
    // 點地板：一樓或二樓；換樓層時沿著樓梯走（樓梯下 → 樓梯上 → 目的地）
    const hit = ray.intersectObjects(WALK.map(w => w.mesh))[0];
    if (hit) {
      const w = WALK[hit.object.userData.walk], [x1, x2, z1, z2] = w.rect, m = w.m;
      const eye = RW < 5 ? 1.35 : RW < 7 ? 1.5 : 1.6;
      const tgt = new THREE.Vector3(Math.max(x1 + m, Math.min(x2 - m, hit.point.x)), w.y + eye, Math.max(z1 + m, Math.min(z2 - m, hit.point.z)));
      const up = cam.pos.y > MEZ + 0.8 && MEZ > 0, toUp = w.y > 0;
      cam.look = null; document.getElementById('rm-info').style.display = 'none';
      if (STAIR && up !== toUp) { cam.route = up ? [STAIR.top.clone(), STAIR.bottom.clone(), tgt] : [STAIR.bottom.clone(), STAIR.top.clone(), tgt]; cam.to = cam.route.shift(); }
      else { cam.route = null; cam.to = tgt; }
    }
  });
  const loop = () => {
    raf = requestAnimationFrame(loop);
    if (cam.to && cam.route) {
      // 走樓梯：等速走到每一個點
      const d = cam.to.clone().sub(cam.pos), L = d.length();
      if (L < 0.06) { cam.pos.copy(cam.to); cam.to = cam.route.length ? cam.route.shift() : null; if (!cam.to) cam.route = null; }
      else cam.pos.add(d.multiplyScalar(Math.min(1, 0.07 / L)));
      if (cam.to) { const h = cam.to.clone().sub(cam.pos); if (Math.hypot(h.x, h.z) > 0.3) cam.yaw += ((Math.atan2(h.x, h.z) - cam.yaw + Math.PI * 3) % (Math.PI * 2) - Math.PI) * 0.08; }
    } else if (cam.to) {
      cam.pos.lerp(cam.to, 0.08);
      if (cam.look) {
        const d = cam.look.clone().sub(cam.pos), ty = Math.atan2(d.x, d.z), tp = Math.atan2(d.y, Math.hypot(d.x, d.z));
        cam.yaw += ((ty - cam.yaw + Math.PI * 3) % (Math.PI * 2) - Math.PI) * 0.1; cam.pitch += (tp - cam.pitch) * 0.1;
      }
      if (cam.pos.distanceTo(cam.to) < 0.01 && !cam.look) cam.to = null;
    }
    apply();
    renderer.render(scene, camera);
  };
  loop();
  const onResize = () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); };
  addEventListener('resize', onResize);
  box._resize = onResize;
  box._cam = cam;      // 測試用：可以直接擺鏡頭
  document.getElementById('rm-close').onclick = closeRoom;
}
export function closeRoom() {
  const box = document.getElementById('cm-room');
  if (!box) return;
  cancelAnimationFrame(raf);
  removeEventListener('resize', box._resize);
  scene.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  renderer.dispose();
  box.remove();
  scene = null; renderer = null;
}
