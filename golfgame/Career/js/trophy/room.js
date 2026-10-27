// 3D 獎盃室：深色胡桃木牆板、綠色布面牆、黃銅崁燈、玻璃展示櫃、綠色地毯，最深處是冠軍更衣櫃
//   依存檔擺設：四大賽在中央展示櫃、巡迴賽獎盃上牆面層架、兒童盃與業餘獎牌在層架下排；拿到綠夾克才會掛在更衣櫃裡
//   操作：拖曳轉頭、點地板走過去、點獎盃拉近（旁邊顯示那一場的成績）
//   模型都由程式產生（旋轉體、管線、擠出形狀），從 Career/prototype/trophy-room.html 的原型改成依存檔擺設
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { esc, toPar } from '../util.js';
import { ROOM_LEVELS } from '../data/items.js';

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
};

const add = (geo, mat, x = 0, y = 0, z = 0, parent = scene) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
};
const lathe = (pts, seg = 96) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
const smooth = (pts, n = 60) => new THREE.SplineCurve(pts.map(([r, y]) => new THREE.Vector2(r, y))).getPoints(n).map(v => [Math.max(0, v.x), v.y]);
const tube = (pts, r, mat, parent) => add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), 64, r, 16), mat, 0, 0, 0, parent);

// ---------- 房間 ----------
const RW = 11, RD = 14, RH = 4.2;
let floorMesh = null;
function buildShell() {
  floorMesh = add(new THREE.PlaneGeometry(RW, RD).rotateX(-Math.PI / 2), M.floor);
  add(new THREE.PlaneGeometry(3.2, 10).rotateX(-Math.PI / 2), M.carpet, 0, 0.004, 0.5);
  add(new THREE.PlaneGeometry(RW, RD).rotateX(Math.PI / 2), M.ceiling, 0, RH, 0);
  wall(RW, 0, -RD / 2, 0); wall(RD, -RW / 2, 0, Math.PI / 2); wall(RD, RW / 2, 0, -Math.PI / 2); wall(RW, 0, RD / 2, Math.PI);
  scene.add(new THREE.HemisphereLight(0xffe8c8, 0x20140a, 0.08));
  const warm = new THREE.PointLight(0xffc890, 3, 14, 1.4); warm.position.set(0, 3.4, 2); scene.add(warm);
}
function wall(w, x, z, ry) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
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
  add(new THREE.CylinderGeometry(0.07, 0.09, 0.05, 24), M.brass, x, RH - 0.03, z);         // 天花板崁燈
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
function shelfWall(x, z, ry) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
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

// ---------- 依存檔擺設 ----------
const PICK = [];      // 可以點的獎盃：{ obj, t }
function place(st) {
  PICK.length = 0;
  const T = st.trophies, has = id => T.filter(t => t.id === id);
  const jackets = has('masters');
  PLAYER = { name: st.player.name, year: jackets.length ? jackets.map(j => j.y).join(' · ') : '' };
  buildShell();
  locker(0, -RD / 2 + 0.36);
  spot(0, RH, -4.2, 0, 1.4, -RD / 2 + 0.4, 16, 0.3);
  frame('augusta-10.jpg', -2.9, 2.35, -RD / 2 + 0.01, 0, 1.6, 1.1);
  frame('hogan-bridge.jpg', 2.9, 2.35, -RD / 2 + 0.01, 0, 1.6, 1.1);
  // 中央展示櫃：四大賽（名人賽的紀念獎座、銀壺、PGA 大銀盃、美國公開賽高腳盃）
  const majors = [['masters', -2.3, -1.3, 1.2, 0.9, 1.2, '名人賽'], ['open', -2.3, -4.2, 1.0, 0.7, 0.95, '英國公開賽'], ['usopen', 2.3, -4.2, 1.0, 0.7, 0.95, '美國公開賽'], ['pgachamp', 2.3, -1.3, 1.2, 0.9, 1.2, 'PGA 錦標賽']];
  for (const [id, x, z, w, d, h, zh] of majors) {
    const v = vitrine(x, z, w, d, h), won = has(id);
    if (won.length) {
      const o = id === 'open' ? jug(0, 0.95, 0, 1.25, v) : id === 'usopen' ? tallCup(0, 0.95, 0, 0.95, M.silver, v) : bigCup(0, 1.01, 0, id === 'masters' ? 0.8 : 0.95, id === 'masters' ? M.gold : M.silver, v);
      PICK.push({ obj: o, t: { ...won[won.length - 1], name: `${zh}（${won.map(x2 => x2.y).join('、')}）` } });
    } else emptyPlate(v, zh);
    spot(x, RH, z, x, 1.2, z, 32, 0.3);
  }
  // 左牆：獎盃層架（下排巡迴賽 / 中排兒童盃與青少年 / 上排業餘與獎牌）
  shelfWall(-RW / 2 + 0.03, -2.5, Math.PI / 2);
  const sh = new THREE.Group(); sh.position.set(-RW / 2 + 0.03, 0, -2.5); sh.rotation.y = Math.PI / 2; scene.add(sh);
  const tour = T.filter(t => !['masters', 'open', 'usopen', 'pgachamp'].includes(t.id) && !['kidcup', 'medal'].includes(t.kind) && t.tour !== 'kids' && t.tour !== 'junior' && t.tour !== 'am' && t.tour !== 'ncaa').slice(-5);
  tour.forEach((t, i) => { const px = -1.6 + i * 0.8; const o = (t.kind === 'teamcup' || t.kind === 'players' || i % 2) ? tallCup(px, 1.58, 0.25, 0.42, t.kind === 'teamcup' ? M.gold : M.silver, sh) : bigCup(px, 1.6, 0.25, 0.42, M.silver, sh); PICK.push({ obj: o, t }); });
  const kids = T.filter(t => t.tour === 'kids' || t.tour === 'junior' || t.kind === 'kidcup').slice(-5);
  kids.forEach((t, i) => { const o = juniorCup(-1.6 + i * 0.8, 2.33, 0.25, 1.4 + (i % 2) * 0.2, sh); PICK.push({ obj: o, t }); });
  const am = T.filter(t => t.tour === 'am' || t.tour === 'ncaa' || t.kind === 'medal').slice(-3);
  am.forEach((t, i) => { const o = jug(-1.2 + i * 1.2, 3.08, 0.25, 0.55, sh); PICK.push({ obj: o, t }); });
  spot(-3.6, RH, -2.5, -RW / 2, 2.2, -2.5, 30, 0.55);
  // 右牆：照片與證書
  frame('swilcan.jpg', RW / 2 - 0.01, 2.6, -3.6, -Math.PI / 2, 1.5, 1.0);
  frame('sawgrass-17.jpg', RW / 2 - 0.01, 2.6, -1.6, -Math.PI / 2, 1.5, 1.0);
  frame('pebble-18.jpg', RW / 2 - 0.01, 2.6, 0.4, -Math.PI / 2, 1.5, 1.0);
  T.filter(t => t.tour !== 'kids').slice(-6).forEach((t, i) => certificate(RW / 2 - 0.01, 1.55, -4 + i * 0.85, -Math.PI / 2, t));
  spot(3.8, RH, -1.6, RW / 2, 2.2, -1.6, 26, 0.6);
  for (let x = -RW / 2 + 1.1; x < RW / 2; x += 2.2) add(new THREE.BoxGeometry(0.14, 0.16, RD), M.walnutDark, x, RH - 0.08, 0);
  for (let z = -RD / 2 + 1.4; z < RD / 2; z += 2.8) add(new THREE.BoxGeometry(RW, 0.16, 0.14), M.walnutDark, 0, RH - 0.08, z);
}

// ---------- 打開 / 關閉 ----------
export function openRoom(st) {
  closeRoom();
  const box = document.createElement('div');
  box.id = 'cm-room';
  box.style.cssText = 'position:fixed;inset:0;z-index:75;background:#0b0806';
  box.innerHTML = `<div style="position:absolute;left:12px;top:calc(env(safe-area-inset-top,0px) + 10px);z-index:2;color:#e7d29a;font:700 16px 'Noto Serif TC'">${esc(ROOM_LEVELS[st.room || 0].name)}<div style="font:400 11px 'Noto Sans TC';color:rgba(246,240,225,.7)">拖曳轉頭 · 點地板走過去 · 點獎盃拉近</div></div>
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
  const cam = { pos: new THREE.Vector3(0.6, 1.6, 5.4), yaw: Math.PI + 0.06, pitch: -0.03, to: null, look: null };
  const apply = () => { camera.position.copy(cam.pos); const d = new THREE.Vector3(Math.sin(cam.yaw) * Math.cos(cam.pitch), Math.sin(cam.pitch), Math.cos(cam.yaw) * Math.cos(cam.pitch)); camera.lookAt(cam.pos.clone().add(d)); };
  apply();
  let drag = null, moved = 0;
  const el = renderer.domElement;
  el.style.touchAction = 'none';
  el.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; moved = 0; });
  el.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; moved += Math.abs(dx) + Math.abs(dy); cam.yaw -= dx * 0.005; cam.pitch = Math.max(-0.7, Math.min(0.5, cam.pitch - dy * 0.004)); drag = { x: e.clientX, y: e.clientY }; cam.look = null; });
  el.addEventListener('pointerup', e => {
    const was = drag; drag = null;
    if (!was || moved > 8) return;
    const ray = new THREE.Raycaster(), v = new THREE.Vector2(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(v, camera);
    for (const p of PICK) {
      if (ray.intersectObject(p.obj, true).length) {
        const wp = new THREE.Vector3(); p.obj.getWorldPosition(wp);
        const dir = cam.pos.clone().sub(wp).setY(0).normalize();
        cam.to = wp.clone().add(dir.multiplyScalar(1.2)).setY(Math.max(1.3, wp.y + 0.4)); cam.look = wp.clone().add(new THREE.Vector3(0, 0.25, 0));
        const info = document.getElementById('rm-info'); info.style.display = '';
        info.innerHTML = `<b style="color:#e7d29a;font:700 15px 'Noto Serif TC'">${esc(p.t.name)}</b><br>${p.t.y} 年${p.t.course ? ' · ' + esc(p.t.course) : ''}${p.t.score ? `<br>${p.t.score} 桿（${toPar(p.t.toPar)}）` : ''}`;
        return;
      }
    }
    const hit = ray.intersectObject(floorMesh)[0];
    if (hit) { cam.to = new THREE.Vector3(Math.max(-RW / 2 + 0.8, Math.min(RW / 2 - 0.8, hit.point.x)), 1.6, Math.max(-RD / 2 + 1, Math.min(RD / 2 - 0.6, hit.point.z))); cam.look = null; document.getElementById('rm-info').style.display = 'none'; }
  });
  const loop = () => {
    raf = requestAnimationFrame(loop);
    if (cam.to) {
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
