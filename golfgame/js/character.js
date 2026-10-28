// 第三人稱角色
// ProceduralGolfer：程式內建角色（不需外部檔案）。手臂與腿用兩段 IK 求解，球桿是剛體，雙手永遠握在桿上。
// 寫實角色（Mixamo）在 mixamo.js，兩者對外介面相同。
// 兩者對外介面相同：setup() / setBackswing() / swing() / update() / setLook() / object
import * as THREE from 'three';
import { clamp, lerp } from './util.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);
const D2R = Math.PI / 180;
// 升級外觀：跟著頭轉的零件、兒童時一起放大的零件、固定的旋轉
const HEAD_PARTS = ['hairTop', 'hairBack', 'hair', 'cap', 'brim', 'ponytail', 'earL', 'earR', 'nose', 'eyeL', 'eyeR', 'irisL', 'irisR', 'browL', 'browR', 'mouth', 'beard', 'mustache', 'lensL', 'lensR', 'bridge', 'hairLong', 'hairBun', 'hairBob', 'hairCurl', 'visorBand', 'bucketTop', 'bucketBrim'];
const HEAD_SCALED = ['hairTop', 'hairBack', 'hair', 'cap', 'brim', 'ponytail', 'earL', 'earR', 'nose', 'hairLong', 'hairBun', 'hairBob', 'hairCurl', 'visorBand', 'bucketTop', 'bucketBrim', 'eyeL', 'eyeR', 'irisL', 'irisR', 'browL', 'browR', 'mouth', 'mustache', 'lensL', 'lensR', 'bridge'];
const QZ90 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
const QX90 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
const QMOUTH = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI * 1.1);

// 揮桿關鍵影格：phase, 手臂角 θ, 球桿角, 骨盆轉, 胸轉, 重心左右, 前傾, 膝彎
const FULL = [
  [0.0, 6, 0, 0, 0, 0, 38, 1],
  [0.5, -48, -102, -18, -46, -0.03, 37, 1],
  [1.0, -118, -214, -42, -94, -0.05, 35, 1],
  [1.5, -62, -150, 14, -36, 0.06, 36, 1],
  [2.0, 4, -2, 38, 12, 0.08, 37, 0.95],
  [2.5, 78, 150, 64, 78, 0.12, 24, 0.6],
  [3.0, 138, 255, 88, 110, 0.14, 8, 0.35],
];

function sampleKeys(keys, ph) {
  ph = clamp(ph, keys[0][0], keys[keys.length - 1][0]);
  let i = 1;
  while (i < keys.length - 1 && keys[i][0] < ph) i++;
  const a = keys[i - 1], b = keys[i];
  const t = (ph - a[0]) / (b[0] - a[0] || 1);
  const s = t * t * (3 - 2 * t);
  return a.map((v, k) => lerp(v, b[k], s));
}

const CLUB_GEOM = {
  driver: { len: 1.12, beta: 62 }, wood: { len: 1.04, beta: 62 }, iron: { len: 0.95, beta: 63 },
  wedge: { len: 0.9, beta: 64 }, putter: { len: 0.86, beta: 72 }, chipper: { len: 0.87, beta: 71 },
};
// 球桿類型 → 皮膚欄位
export const skinSlotOf = type => type === 'driver' || type === 'wood' ? 'driver' : type === 'putter' ? 'putter' : type === 'chipper' ? 'chipper' : 'iron';

// 寶刀（切推桿 35°）的桿頭：側面輪廓擠出成厚實的半月形刀身（輪廓座標 x = 擊球方向、y = 上、z = 趾端；
//   桿頭座標的 x、y 跟輪廓相反，最後整顆繞 z 轉 180°），
// 桿面後仰 35°、寬底板不容易挖地，背面一條飾帶、桿面嵌一片深色擊球面，跟鐵桿、推桿一眼分得出來
function chipperHead(bodyMat, accentMat, faceMat) {
  const T = Math.tan(35 * D2R), H = 0.044, depth = 0.084, F = 1;
  const s = new THREE.Shape();
  s.moveTo(F * 0.013, -0.022);                           // 前緣（桿面底）
  s.lineTo(F * (0.013 - H * T), 0.022);                  // 桿面頂（後仰 35°）
  s.quadraticCurveTo(F * -0.022, 0.026, F * -0.03, 0.012);   // 頂線往後圓下去
  s.quadraticCurveTo(F * -0.036, -0.004, F * -0.03, -0.02);  // 厚實的背面
  s.quadraticCurveTo(F * -0.012, -0.026, F * 0.013, -0.022); // 寬底板
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.0025, bevelSegments: 3, curveSegments: 10 });
  g.translate(0, 0, -0.006);
  const head = new THREE.Mesh(g, bodyMat);
  // 背面飾帶（沿刀身長邊）
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.009, depth * 0.78), accentMat);
  band.position.set(F * -0.0345, -0.002, depth * 0.5 - 0.006);
  // 桿面嵌片：貼在後仰 35° 的桿面上
  const face = new THREE.Mesh(new THREE.BoxGeometry(0.0015, H * 0.72, depth * 0.72), faceMat);
  face.position.set(F * (0.013 - H * T * 0.5 + 0.0012), 0, depth * 0.5 - 0.004);
  face.rotation.z = 35 * D2R;
  // 桿頸：從跟部接到桿身
  const hosel = new THREE.Mesh(new THREE.CylinderGeometry(0.0062, 0.0075, 0.034, 10), bodyMat);
  hosel.position.set(F * -0.004, 0.022, -0.004);
  hosel.rotation.x = 0.35;
  head.add(band, face, hosel);
  for (const m of [band, face, hosel]) m.castShadow = true;
  head.rotation.z = Math.PI;
  return head;
}

function twoBoneIK(A, T, l1, l2, pole) {
  const AT = T.clone().sub(A);
  let d = AT.length();
  const dir = AT.normalize();
  d = clamp(d, Math.abs(l1 - l2) + 1e-3, (l1 + l2) * 0.9995);
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const pd = pole.clone().sub(A);
  pd.sub(dir.clone().multiplyScalar(pd.dot(dir))).normalize();
  const mid = A.clone().addScaledVector(dir, a).addScaledVector(pd, h);
  const end = A.clone().addScaledVector(dir, d);
  return [mid, end];
}

function placeLimb(mesh, a, b) {
  const d = b.clone().sub(a);
  mesh.position.copy(a).addScaledVector(d, 0.5);
  mesh.quaternion.setFromUnitVectors(UP, d.normalize());
}

export class ProceduralGolfer {
  constructor(look) {
    this.object = new THREE.Group();
    this.rig = new THREE.Group();          // 角色本地座標：x=目標方向，z=面向球，y=上
    this.object.add(this.rig);
    this.mats = {};
    this.phase = 0;
    this.anim = null;
    this.time = 0;
    this.build();
    this.setLook(look);
  }

  mat(name, rough = 0.75) {
    if (!this.mats[name]) this.mats[name] = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: rough, metalness: 0 });
    return this.mats[name];
  }

  mesh(geo, matName, rough) {
    const m = new THREE.Mesh(geo, this.mat(matName, rough));
    m.castShadow = true;
    m.receiveShadow = true;
    this.rig.add(m);
    return m;
  }

  build() {
    const cap = (r, l, seg = 12) => new THREE.CapsuleGeometry(r, l, 6, seg);
    this.L = { upper: 0.30, fore: 0.28, thigh: 0.45, shin: 0.44 };
    const P = this.parts = {};
    P.pelvis = this.mesh(new THREE.SphereGeometry(0.15, 20, 14), 'pants', 0.85);
    P.belt = this.mesh(new THREE.CylinderGeometry(0.152, 0.152, 0.04, 24), 'belt', 0.5);
    P.abdomen = this.mesh(cap(0.13, 0.12, 16), 'shirt', 0.88);
    P.chest = this.mesh(cap(0.145, 0.16, 18), 'shirt', 0.88);
    P.collar = this.mesh(new THREE.TorusGeometry(0.055, 0.016, 8, 16), 'shirt', 0.88);
    P.neck = this.mesh(cap(0.048, 0.06), 'skin', 0.6);
    P.head = this.mesh(new THREE.SphereGeometry(0.105, 24, 18), 'skin', 0.6);
    P.hair = this.mesh(new THREE.SphereGeometry(0.11, 20, 14, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.45), 'hair', 0.9);
    P.cap = this.mesh(new THREE.SphereGeometry(0.113, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), 'cap', 0.8);
    P.brim = this.mesh(new THREE.CylinderGeometry(0.085, 0.09, 0.012, 24, 1, false, -Math.PI * 0.5, Math.PI), 'cap', 0.8);
    P.ponytail = this.mesh(cap(0.035, 0.12), 'hair', 0.9);
    P.earL = this.mesh(new THREE.SphereGeometry(0.022, 10, 8), 'skin', 0.6);
    P.earR = this.mesh(new THREE.SphereGeometry(0.022, 10, 8), 'skin', 0.6);
    P.nose = this.mesh(new THREE.SphereGeometry(0.018, 10, 8), 'skin', 0.6);
    for (const s of ['L', 'R']) {
      P['shoulder' + s] = this.mesh(new THREE.SphereGeometry(0.068, 16, 12), 'shirt', 0.88);
      P['sleeve' + s] = this.mesh(cap(0.058, 0.13), 'shirt', 0.88);
      P['upper' + s] = this.mesh(cap(0.044, this.L.upper - 0.06), 'skin', 0.6);
      P['fore' + s] = this.mesh(cap(0.039, this.L.fore - 0.06), 'skin', 0.6);
      P['hand' + s] = this.mesh(new THREE.SphereGeometry(0.044, 14, 10), s === 'L' ? 'glove' : 'skin', 0.6);
      P['thigh' + s] = this.mesh(cap(0.078, this.L.thigh - 0.1), 'pants', 0.85);
      P['shin' + s] = this.mesh(cap(0.058, this.L.shin - 0.08), 'pants', 0.85);
      P['knee' + s] = this.mesh(new THREE.SphereGeometry(0.07, 12, 10), 'pants', 0.85);
      P['shoe' + s] = this.mesh(cap(0.05, 0.17), 'shoes', 0.55);
      P['sole' + s] = this.mesh(new THREE.BoxGeometry(0.1, 0.02, 0.27), 'sole', 0.9);
    }
    // 升級外觀（生涯模式的基礎選項；look.v2 才顯示，主遊戲的經典外觀不變）：臉、髮型、帽型、眼鏡、鬍子、背心、裙子
    const hide = m => { m.visible = false; return m; };
    for (const s of ['L', 'R']) {
      P['eye' + s] = hide(this.mesh(new THREE.SphereGeometry(0.016, 12, 10), 'eyeWhite', 0.3));
      P['iris' + s] = hide(this.mesh(new THREE.SphereGeometry(0.009, 10, 8), 'iris', 0.2));
      P['brow' + s] = hide(this.mesh(new THREE.BoxGeometry(0.034, 0.008, 0.01), 'hair', 0.9));
      P['lens' + s] = hide(this.mesh(new THREE.TorusGeometry(0.021, 0.0035, 6, 18), 'frame', 0.3));
    }
    P.bridge = hide(this.mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.022, 6), 'frame', 0.3));
    P.mouth = hide(this.mesh(new THREE.TorusGeometry(0.022, 0.004, 6, 16, Math.PI * 0.8), 'lips', 0.5));
    P.beard = hide(this.mesh(new THREE.SphereGeometry(0.078, 18, 12, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55), 'hair', 0.95));
    P.mustache = hide(this.mesh(new THREE.CapsuleGeometry(0.008, 0.03, 4, 8), 'hair', 0.9));
    P.hairTop = hide(this.mesh(new THREE.SphereGeometry(0.109, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.42), 'hair', 0.9));      // 頭頂（不戴球帽時看得到）
    P.hairBack = hide(this.mesh(new THREE.SphereGeometry(0.11, 20, 12, Math.PI * 0.85, Math.PI * 1.3, Math.PI * 0.2, Math.PI * 0.52), 'hair', 0.9));     // 後腦與兩側（臉的前面不蓋）
    P.hairLong = hide(this.mesh(cap(0.075, 0.16, 16), 'hair', 0.9));
    P.hairBun = hide(this.mesh(new THREE.SphereGeometry(0.045, 14, 10), 'hair', 0.9));
    P.hairBob = hide(this.mesh(new THREE.SphereGeometry(0.122, 20, 14, Math.PI * 0.84, Math.PI * 1.32, Math.PI * 0.15, Math.PI * 0.62), 'hair', 0.9));
    P.hairCurl = new THREE.Group(); P.hairCurl.visible = false; this.rig.add(P.hairCurl);
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; const m = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 8), this.mat('hair', 0.95)); m.position.set(Math.cos(a) * 0.08, 0.06 + Math.sin(i * 1.7) * 0.012, Math.sin(a) * 0.08 - 0.01); m.castShadow = true; P.hairCurl.add(m); }
    P.visorBand = hide(this.mesh(new THREE.TorusGeometry(0.108, 0.012, 6, 28), 'cap', 0.8));
    P.bucketTop = hide(this.mesh(new THREE.CylinderGeometry(0.1, 0.115, 0.09, 24), 'cap', 0.85));
    P.bucketBrim = hide(this.mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.008, 28), 'cap', 0.85));
    P.vest = hide(this.mesh(cap(0.152, 0.17, 18), 'vest', 0.9));
    P.skirt = hide(this.mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.24, 24, 1, true), 'pants', 0.85));
    // 球桿（剛體）：原點在握把頂端，+Y 指向桿頭
    this.club = new THREE.Group();
    this.rig.add(this.club);
  }

  // 裝備的球桿皮膚 { driver, iron, putter }（progress.js 的 SKINS）
  setClubSkins(sk) { this.skins = sk || null; this._clubKey = null; }
  clubHead() { return this.headMesh; }

  buildClub(type, lenOverride) {
    // 只有換球桿（或站位角度、長度改變）才重建；舊的模型要釋放，否則每次瞄準都會漏記憶體、越玩越卡
    const sk = this.skins && this.skins[skinSlotOf(type)];
    const skin = sk && !sk.std ? sk : null;
    const key = type + ':' + (this.lie || 0.9).toFixed(3) + ':' + (lenOverride || 0).toFixed(3) + ':' + (skin ? skin.id : '');
    if (this._clubKey === key) return;
    this._clubKey = key;
    this.club.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    this.club.clear();
    const g = { ...(CLUB_GEOM[type] || CLUB_GEOM.iron) };
    if (lenOverride) g.len = lenOverride;      // 寫實角色依站位算出的長度
    const chrome = new THREE.MeshStandardMaterial({ color: 0xd8dde0, roughness: 0.18, metalness: 1 });
    const black = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.35, metalness: 0.3 });
    const grip = new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.9 });
    // 皮膚：桿頭顏色 / 金屬感 / 自發光，桿身換色
    const skinHead = skin ? new THREE.MeshStandardMaterial({ color: skin.head, roughness: skin.metal ? 0.2 : 0.35, metalness: skin.metal ? 1 : 0.4, emissive: skin.glow || 0x000000, emissiveIntensity: skin.glow ? 0.8 : 0 }) : null;
    const shaftMat = skin ? new THREE.MeshStandardMaterial({ color: skin.shaft, roughness: 0.25, metalness: 0.8, emissive: skin.glow || 0x000000, emissiveIntensity: skin.glow ? 0.25 : 0 }) : chrome;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0075, g.len, 8), shaftMat);
    shaft.position.y = g.len / 2;
    const gr = new THREE.Mesh(new THREE.CylinderGeometry(0.0125, 0.0105, 0.27, 10), grip);
    gr.position.y = 0.135;
    this.club.add(shaft, gr);
    let head;
    if (type === 'driver' || type === 'wood') {
      const s = type === 'driver' ? 1 : 0.78;
      head = new THREE.Mesh(new THREE.SphereGeometry(0.06 * s, 24, 16), skinHead || black);
      head.scale.set(0.95, 0.55, 1.05);
      head.position.set(0.03 * s, 0, 0.055 * s);
    } else if (type === 'putter') {
      head = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.028, 0.11), skinHead || black);
      head.position.set(0.01, 0, 0.045);
    } else if (type === 'chipper') {
      // 標準款：霧銀刀身、金色飾帶、黑色擊球面；皮膚換刀身顏色，飾帶用皮膚的發光色（沒有就用桿身色）
      const satin = new THREE.MeshStandardMaterial({ color: 0xb8bcc0, roughness: 0.32, metalness: 1 });
      const acc = skin ? new THREE.MeshStandardMaterial({ color: skin.glow || skin.shaft, roughness: 0.3, metalness: 0.8, emissive: skin.glow || 0x000000, emissiveIntensity: skin.glow ? 1 : 0 })
        : new THREE.MeshStandardMaterial({ color: 0xd8a838, roughness: 0.25, metalness: 1 });
      head = chipperHead(skinHead || satin, acc, new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.5, metalness: 0.6 }));
      head.position.set(0.0, 0.0, 0.0);
    } else {
      head = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.05, 0.078), skinHead || (type === 'wedge' ? new THREE.MeshStandardMaterial({ color: 0xa9a59c, roughness: 0.4, metalness: 1 }) : chrome));
      head.position.set(0.006, 0.006, 0.035);
    }
    // 桿頭的「趾端」方向 = 本地 (0, cosλ, sinλ)，讓桿底平貼地面
    const lam = this.lie || 0.9;
    const holder = new THREE.Group();
    holder.position.y = g.len;
    holder.rotation.x = -(Math.PI / 2 - lam);
    holder.add(head);
    head.castShadow = shaft.castShadow = gr.castShadow = true;
    this.headMesh = head;
    this.club.add(holder);
    this.clubLen = g.len;
  }

  setLook(look = {}) {
    this.look = { ...look };
    const set = (k, c) => this.mat(k).color.set(c);
    set('skin', look.skin || '#d9a77c');
    set('hair', look.hair || '#2b2118');
    set('shirt', look.shirt || '#f2ead8');
    set('pants', look.pants || '#2a3442');
    set('cap', look.cap || '#1d3a2a');
    set('shoes', look.shoes || '#f4f1ea');
    set('glove', look.glove || '#ffffff');
    set('belt', '#2a2420');
    set('sole', '#d7d2c8');
    this.female = look.body === 'f';
    this.parts.ponytail.visible = this.female;
    this.rig.scale.setScalar(this.female ? 0.95 : 1);
    this.headK = 1; this.bodyW = 1;
    if (look.v2) this.applyV2(look);
  }

  // 升級外觀：年齡與身高（兒童頭比較大、身體比較小）、髮型、帽型、眼鏡、鬍子、長袖 / 背心 / 短褲 / 裙子、40 歲後白髮
  applyV2(look) {
    const P = this.parts, age = Number(look.age) || 25, set = (k, c) => this.mat(k).color.set(c);
    const grow = age >= 18 ? 1 : ({ 8: 0.73, 9: 0.76, 10: 0.79, 11: 0.83, 12: 0.86, 13: 0.9, 14: 0.93, 15: 0.96, 16: 0.98, 17: 0.99 })[Math.floor(age)] || 0.73;
    const cm = (look.height || (this.female ? 166 : 176)) * grow;
    this.rig.scale.setScalar(cm / 178);
    this.headK = 1 + Math.max(0, 16 - age) * 0.028;
    this.bodyW = look.build === 'slim' ? 0.9 : look.build === 'strong' ? 1.12 : 1;
    // 白髮：40 歲以後慢慢變灰
    const hc = new THREE.Color(look.hairColor || look.hair || '#2b2118');
    if (age > 40) hc.lerp(new THREE.Color('#c9c6c0'), Math.min(0.85, (age - 40) / 25));
    this.mat('hair').color.copy(hc);
    set('eyeWhite', '#f4f1ea'); set('iris', look.eyes || '#3a2a1e'); set('lips', '#a0584a'); set('frame', '#1c1c1c'); set('vest', look.vest || '#2a3442');
    for (const n of ['eyeL', 'eyeR', 'irisL', 'irisR', 'browL', 'browR', 'mouth']) P[n].visible = true;
    const brow = { thin: 0.5, natural: 1, thick: 1.4, straight: 1.6 }[look.brows || 'natural'];
    P.browL.scale.set(1, brow, 1); P.browR.scale.set(1, brow, 1);
    // 髮型
    const hs = look.hairStyle || (this.female ? 'pony' : 'short');
    // 原本的頭髮是繞頭一圈的帶子（經典外觀看不到臉，不影響）；升級外觀改用頭頂 + 後腦，臉的前面不蓋
    P.hair.visible = false;
    P.hairTop.visible = !['bald', 'curly'].includes(hs);
    P.hairBack.visible = !['bald', 'curly', 'buzz', 'bob'].includes(hs);
    P.ponytail.visible = hs === 'pony';
    P.hairLong.visible = hs === 'long'; P.hairBun.visible = hs === 'bun'; P.hairBob.visible = hs === 'bob'; P.hairCurl.visible = hs === 'curly';
    this.hairStyle = hs;
    // 帽型：cap 球帽、visor 遮陽帽、bucket 漁夫帽、none 不戴
    const hat = look.hat || 'cap';
    P.cap.visible = hat === 'cap'; P.brim.visible = hat === 'cap' || hat === 'visor';
    P.visorBand.visible = hat === 'visor'; P.bucketTop.visible = P.bucketBrim.visible = hat === 'bucket';
    // 眼鏡、鬍子（成年後）
    for (const n of ['lensL', 'lensR', 'bridge']) P[n].visible = !!look.glasses;
    const bd = age >= 18 ? look.beard || 'none' : 'none';
    P.beard.visible = bd === 'full' || bd === 'stubble' || bd === 'goatee';
    this.beardK = bd === 'goatee' ? [0.4, 0.7, 0.6] : bd === 'stubble' ? [1.02, 1, 1.02] : [1, 1, 1];
    P.mustache.visible = bd === 'mustache' || bd === 'full';
    // 上衣：長袖、外套 → 手臂用上衣的顏色；背心 → 胸前多一層
    const longSleeve = look.top === 'long' || look.top === 'jacket';
    for (const s of ['L', 'R']) { P['upper' + s].material = this.mat(longSleeve ? 'shirt' : 'skin', 0.75); P['fore' + s].material = this.mat(longSleeve ? 'shirt' : 'skin', 0.75); }
    P.vest.visible = look.top === 'vest';
    // 下身：短褲、裙子 → 小腿是皮膚
    const shorts = look.bottom === 'shorts' || look.bottom === 'skirt';
    for (const s of ['L', 'R']) { P['shin' + s].material = this.mat(shorts ? 'skin' : 'pants', 0.75); P['knee' + s].material = this.mat(shorts ? 'skin' : 'pants', 0.75); }
    P.skirt.visible = look.bottom === 'skirt';
  }

  // 依球的位置、瞄準方向與球桿，決定站位與揮桿平面
  setup(ballPos, yaw, clubIcon) {
    this.isPutt = clubIcon === 'putter' || clubIcon === 'chipper';      // 寶刀用推桿的站姿與動作
    this.clubType = clubIcon;
    const cg = CLUB_GEOM[clubIcon] || CLUB_GEOM.iron;
    this.stance = { driver: 0.27, wood: 0.25, iron: 0.21, wedge: 0.18, putter: 0.15, chipper: 0.15 }[clubIcon] || 0.21;
    this.armR = this.isPutt ? 0.5 : 0.53;
    this.betaH = cg.beta * D2R;
    // 在本地座標先擺出準備姿勢，算出手的位置與球的位置
    this.phase = 0;
    this.anim = null;
    this.headLock = null;
    this.finished = false;
    const p0 = this.solveBody(this.isPutt ? [0, 0, 0, 0, 0, 0, 44, 0.8] : FULL[0]);
    const hub = p0.hub;
    const e2 = V(0, -Math.sin(this.betaH), Math.cos(this.betaH));
    const hands0 = hub.clone().addScaledVector(e2, this.armR).add(V(this.isPutt ? 0 : 0.05, 0, 0));
    const c = cg.len;
    const drop = hands0.y - 0.022;
    this.lie = Math.asin(clamp(drop / c, 0.3, 0.98));
    const ballLocal = hands0.clone().add(V(0, -drop, Math.cos(this.lie) * c));
    this.hub0 = hub;
    this.e2h = e2;
    this.e1h = V(1, 0, 0);
    this.e2c = ballLocal.clone().sub(hands0).normalize();
    this.e1c = V(1, 0, 0).sub(this.e2c.clone().multiplyScalar(this.e2c.x)).normalize();
    this.nc = this.e1c.clone().cross(this.e2c).normalize().negate();
    this.buildClub(clubIcon);
    // 角色整體：本地 x→目標方向 d，z→右向量 r（面向球）
    const d = V(Math.sin(yaw), 0, -Math.cos(yaw)), r = V(Math.cos(yaw), 0, Math.sin(yaw));
    const m = new THREE.Matrix4().makeBasis(d, UP, r);
    this.object.quaternion.setFromRotationMatrix(m);
    const s = this.rig.scale.x;
    const off = ballLocal.clone().multiplyScalar(s).applyQuaternion(this.object.quaternion);
    this.object.position.copy(ballPos).sub(off);
    this.object.position.y = ballPos.y - 0.021;
    this.pose(this.phase);
    // 微調站位：球放在桿面「中間、正前方」，不和桿頭重疊
    this.object.updateMatrixWorld(true);
    if (this.headMesh) {
      const box = new THREE.Box3().setFromObject(this.headMesh);
      const c = box.getCenter(V());
      let front = -Infinity;
      for (const x of [box.min.x, box.max.x]) for (const z of [box.min.z, box.max.z]) front = Math.max(front, x * d.x + z * d.z);
      const along = (ballPos.x * d.x + ballPos.z * d.z) - 0.0213 - 0.004 - front;
      const side = (ballPos.x * r.x + ballPos.z * r.z) - (c.x * r.x + c.z * r.z);
      this.object.position.addScaledVector(d, along).addScaledVector(r, side);
      this.object.updateMatrixWorld(true);
    }
  }

  // 骨盆/胸/頭的位置
  solveBody(k) {
    const [, , , pelvisYaw, chestYaw, shift, tilt, knee] = k;
    const flex = 0.035 * knee;
    const pelvis = V(shift, 1.0 - flex, -0.05 - 0.04 * knee);
    const tiltR = tilt * D2R;
    const spineDir = V(0, Math.cos(tiltR), Math.sin(tiltR));
    const chest = pelvis.clone().addScaledVector(spineDir, 0.42);
    const hub = pelvis.clone().addScaledVector(spineDir, 0.5);
    return { pelvis, spineDir, chest, hub, pelvisYaw: pelvisYaw * D2R, chestYaw: chestYaw * D2R, knee };
  }

  keysAt(ph) {
    if (this.isPutt) {
      const A = 6 + 18 * (this.puttPower || 0.5);
      const keys = [[0, 0, 0, 0, 0, 0, 44, 0.8], [1, -A, -A * 1.12, -2, -A * 0.7, 0, 44, 0.8], [2, 0, 0, 0, 0, 0, 44, 0.8], [3, A * 1.25, A * 1.4, 3, A * 0.85, 0, 43, 0.8]];
      return sampleKeys(keys, ph);
    }
    return sampleKeys(FULL, ph);
  }

  pose(ph, override) {
    if (!this.hub0) return;
    const k = override || this.keysAt(ph);
    const [, theta, clubA] = k;
    const B = this.solveBody(k);
    const P = this.parts, L = this.L;
    const rotY = (v, a) => v.clone().applyAxisAngle(UP, a);
    // 胸部座標軸
    const cRight = rotY(V(1, 0, 0), B.chestYaw);
    const cUp = B.spineDir.clone();
    cRight.sub(cUp.clone().multiplyScalar(cRight.dot(cUp))).normalize();
    // 右手座標（cFwd = 身體前方）：之前少了一個負號變成鏡像矩陣，胸口的旋轉算錯、往前凸出一大塊
    const cFwd = cRight.clone().cross(cUp);
    const chestM = new THREE.Matrix4().makeBasis(cRight, cUp, cFwd);
    const pRight = rotY(V(1, 0, 0), B.pelvisYaw);
    const pFwd = rotY(V(0, 0, 1), B.pelvisYaw);
    const pelvisM = new THREE.Matrix4().makeBasis(pRight, UP, pFwd);

    P.pelvis.position.copy(B.pelvis);
    P.pelvis.quaternion.setFromRotationMatrix(pelvisM);
    P.pelvis.scale.set(1.15, 0.85, 0.85);
    P.belt.position.copy(B.pelvis).addScaledVector(B.spineDir, 0.1);
    P.belt.quaternion.setFromUnitVectors(UP, B.spineDir);
    P.belt.scale.set(1.08, 1, 0.82);
    P.abdomen.position.copy(B.pelvis).addScaledVector(B.spineDir, 0.2);
    P.abdomen.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(rotY(V(1, 0, 0), (B.pelvisYaw + B.chestYaw) / 2), B.spineDir, rotY(V(0, 0, 1), (B.pelvisYaw + B.chestYaw) / 2)));
    P.abdomen.scale.set(1.12 * (this.bodyW || 1), 1, 0.82 * (this.bodyW || 1));
    if (P.skirt.visible) { P.skirt.position.copy(B.pelvis).add(V(0, -0.1, 0)); P.skirt.quaternion.copy(P.pelvis.quaternion); }
    // 胸口：前後稍微壓扁、往背後移一點
    P.chest.position.copy(B.chest).addScaledVector(cUp, -0.08).addScaledVector(cFwd, -0.012);
    P.chest.quaternion.setFromRotationMatrix(chestM);
    P.chest.scale.set((this.female ? 1.12 : 1.28) * (this.bodyW || 1), 1, 0.72 * (this.bodyW || 1));
    if (P.vest.visible) { P.vest.position.copy(P.chest.position); P.vest.quaternion.copy(P.chest.quaternion); P.vest.scale.set((this.female ? 1.16 : 1.32) * (this.bodyW || 1), 1, 0.78 * (this.bodyW || 1)); }
    const neckBase = B.chest.clone().addScaledVector(cUp, 0.08);
    // 頭：保持準備姿勢時的位置，眼睛看球（下桿到送桿後才跟著轉）
    const headPos = this.headLock && ph < 2.15 ? this.headLock.clone() : neckBase.clone().addScaledVector(cUp, 0.08).add(V(0, 0.09, 0.03));
    if (!this.headLock && ph === 0) this.headLock = headPos.clone();
    placeLimb(P.neck, neckBase, headPos);
    P.head.position.copy(headPos);
    const look = ph > 2.3 ? V(1, -0.1, 0.4).normalize() : V(0.05, -0.85, 0.5).normalize();
    const hRight = V(0, 1, 0).cross(look).normalize().negate();
    const hUp = look.clone().cross(hRight).negate().normalize();
    const headM = new THREE.Matrix4().makeBasis(hRight, hUp, look);
    P.head.quaternion.setFromRotationMatrix(headM);
    const hk = this.headK || 1;
    P.head.scale.set(0.92 * hk, 1.06 * hk, hk);
    for (const n of HEAD_PARTS) P[n].quaternion.copy(P.head.quaternion);
    if (hk !== 1) for (const n of HEAD_SCALED) P[n].scale.setScalar(hk);
    const hq = P.head.quaternion;
    const at = (x, y, z) => headPos.clone().add(V(x * hk, y * hk, z * hk).applyQuaternion(hq));
    P.hair.position.copy(at(0, -0.005, -0.006));
    P.cap.position.copy(at(0, 0.018, 0));
    P.brim.position.copy(at(0, 0.03, 0.06));
    P.ponytail.position.copy(at(0, -0.02, -0.13));
    P.earL.position.copy(at(0.1, 0, -0.005)); P.earR.position.copy(at(-0.1, 0, -0.005));
    P.nose.position.copy(at(0, -0.015, 0.1));
    // 升級外觀的臉與配件
    if (this.look && this.look.v2) {
      for (const [s, x] of [['L', 0.036], ['R', -0.036]]) {
        P['eye' + s].position.copy(at(x, 0.012, 0.086)); P['iris' + s].position.copy(at(x, 0.012, 0.099));
        P['brow' + s].position.copy(at(x, 0.04, 0.095)); P['lens' + s].position.copy(at(x, 0.012, 0.106));
      }
      P.bridge.position.copy(at(0, 0.014, 0.108)); P.bridge.quaternion.multiply(QZ90);
      P.mouth.position.copy(at(0, -0.042, 0.09)); P.mouth.quaternion.multiply(QMOUTH);
      P.beard.position.copy(at(0, -0.02, 0.025)); if (this.beardK) P.beard.scale.set(this.beardK[0] * hk, this.beardK[1] * hk, this.beardK[2] * hk);
      P.mustache.position.copy(at(0, -0.028, 0.1)); P.mustache.quaternion.multiply(QZ90);
      P.hairTop.position.copy(at(0, 0.006, -0.006)); P.hairBack.position.copy(at(0, -0.004, -0.008)); if (this.hairStyle === 'buzz') P.hairTop.scale.set(hk, hk * 0.85, hk);
      P.hairLong.position.copy(at(0, -0.1, -0.075)); P.hairBun.position.copy(at(0, 0.06, -0.08)); P.hairBob.position.copy(at(0, -0.01, -0.008)); P.hairCurl.position.copy(at(0, 0, 0));
      if (this.hairStyle === 'buzz') P.hair.scale.set(hk, hk * 0.85, hk);
      P.visorBand.position.copy(at(0, 0.035, 0)); P.visorBand.quaternion.multiply(QX90);
      P.bucketTop.position.copy(at(0, 0.06, 0)); P.bucketBrim.position.copy(at(0, 0.02, 0));
    }
    P.collar.position.copy(neckBase);
    P.collar.quaternion.setFromUnitVectors(V(0, 0, 1), cUp);

    // 手與球桿
    const hub = B.hub;
    const handDir = this.isPutt
      ? this.e2h.clone().multiplyScalar(Math.cos(theta * D2R)).addScaledVector(this.e1h, Math.sin(theta * D2R))
      : this.e2h.clone().multiplyScalar(Math.cos(theta * D2R)).addScaledVector(this.e1h, Math.sin(theta * D2R));
    const hands = this.hub0.clone().lerp(hub, 0.5).addScaledVector(handDir, this.armR).add(V(this.isPutt ? 0 : 0.05 * Math.cos(theta * D2R), 0, 0));
    const shL = B.chest.clone().addScaledVector(cRight, this.female ? 0.17 : 0.19).addScaledVector(cUp, 0.03);
    const shR = B.chest.clone().addScaledVector(cRight, -(this.female ? 0.17 : 0.19)).addScaledVector(cUp, 0.03);
    const [elL, wrL] = twoBoneIK(shL, hands, L.upper, L.fore, B.pelvis.clone().add(V(0.25, -0.2, -0.3)));
    const cdir = this.e2c.clone().multiplyScalar(Math.cos(clubA * D2R)).addScaledVector(this.e1c, Math.sin(clubA * D2R)).normalize();
    const gripR = wrL.clone().addScaledVector(cdir, 0.085);
    const [elR, wrR] = twoBoneIK(shR, gripR, L.upper, L.fore, B.pelvis.clone().add(V(-0.25, -0.2, -0.3)));
    for (const [s, sh, el, wr] of [['L', shL, elL, wrL], ['R', shR, elR, wrR]]) {
      P['shoulder' + s].position.copy(sh);
      const sleeveEnd = sh.clone().lerp(el, 0.5);
      placeLimb(P['sleeve' + s], sh, sleeveEnd);
      placeLimb(P['upper' + s], sh.clone().lerp(el, 0.35), el);
      placeLimb(P['fore' + s], el, wr);
      P['hand' + s].position.copy(wr).addScaledVector(cdir, 0.02);
    }
    // 球桿姿態：Y=桿身方向，Z=揮桿平面法線
    const Y = cdir, Z = this.nc.clone().sub(cdir.clone().multiplyScalar(this.nc.dot(cdir))).normalize();
    const X = Y.clone().cross(Z).normalize();
    this.club.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
    this.club.position.copy(wrL).addScaledVector(cdir, -0.02);

    // 腿：腳固定，IK 求膝蓋
    const hipW = this.female ? 0.085 : 0.095;
    for (const [s, sign] of [['L', 1], ['R', -1]]) {
      const hip = B.pelvis.clone().addScaledVector(pRight, sign * hipW).add(V(0, -0.05, 0));
      const heelUp = s === 'R' && ph > 2.1 && !this.isPutt ? clamp((ph - 2.1) / 0.6, 0, 1) : 0;
      const ankle = V(sign * this.stance, 0.085 + heelUp * 0.07, 0.0 + heelUp * 0.02);
      const pole = hip.clone().add(V(sign * 0.12, -0.2, 0.5));
      const [knee, ank] = twoBoneIK(hip, ankle, L.thigh, L.shin, pole);
      placeLimb(P['thigh' + s], hip, knee);
      placeLimb(P['shin' + s], knee, ank);
      P['knee' + s].position.copy(knee);
      const footDir = V(sign * 0.25, -heelUp * 0.5, 1).normalize();
      const toe = ank.clone().add(V(0, -0.045, 0)).addScaledVector(footDir, 0.13);
      P['shoe' + s].position.copy(ank.clone().add(V(0, -0.04, 0)).lerp(toe, 0.5));
      P['shoe' + s].quaternion.setFromUnitVectors(UP, footDir);
      P['sole' + s].position.copy(P['shoe' + s].position).add(V(0, -0.045, 0));
      P['sole' + s].quaternion.setFromUnitVectors(V(0, 0, 1), footDir);
    }
  }

  // p: 0~1.1 拉桿程度
  setBackswing(p, puttPower) {
    if (this.anim) return;
    this.puttPower = puttPower ?? p;
    const top = this.isPutt ? clamp(p, 0, 1) : 0.15 + 0.85 * clamp(p, 0, 1.05);
    this.phase = top;
    this.topPhase = top;
    this.pose(top);
  }

  // 下桿 → 擊球 → 收桿
  swing(onImpact) {
    const from = this.keysAt(this.topPhase || 1);
    const impact = this.keysAt(2);
    this.anim = { t: 0, from, impact, fired: false, onImpact, down: this.isPutt ? 0.32 : 0.24 + 0.06 * (1 - (this.topPhase || 1)) };
  }

  update(dt) {
    this.time += dt;
    const a = this.anim;
    if (!a) {
      if (this.phase === 0) {
        // 準備時輕微呼吸
        const k = (this.isPutt ? [0, 0, 0, 0, 0, 0, 44, 0.8] : FULL[0]).slice();
        k[6] += Math.sin(this.time * 1.6) * 0.4;
        this.pose(0, k);
      }
      return;
    }
    a.t += dt;
    if (a.t < a.down) {
      const t = a.t / a.down;
      const ea = Math.pow(t, 1.5), ec = Math.pow(t, 2.6);   // 球桿比手慢 → 延遲釋放
      const k = a.from.map((v, i) => lerp(v, a.impact[i], i === 2 ? ec : ea));
      this.pose(1 + t, k);
    } else {
      if (!a.fired) { a.fired = true; a.onImpact && a.onImpact(); }
      const t = Math.min(1, (a.t - a.down) / (this.isPutt ? 0.6 : 0.9));
      const ph = 2 + (this.isPutt ? 1 : 1) * (1 - Math.pow(1 - t, 2.2));
      this.phase = ph;
      this.pose(ph);
      if (t >= 1) { this.anim = null; this.phase = 3; this.finished = true; }
    }
  }

  setVisible(v) { this.object.visible = v; }
}
