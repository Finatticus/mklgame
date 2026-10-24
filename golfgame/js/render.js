// Three.js 3D 場景：天空 HDR、地形（顏色圖 + 寫實細節材質）、水面、樹、旗桿、球、彈道線、瞄準標記
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { paintMaps } from './terrain.js';
import { makeNoise, makeRng, clamp } from './util.js';
import { heatColor } from './hud.js';

const BALL_R = 0.021335;
const QUALITY = {
  high: { ratio: 2, shadow: 2048, grid: 1.5, trees: 1, far: 1 },
  medium: { ratio: 1.5, shadow: 1536, grid: 2, trees: 0.8, far: 0.6 },
  low: { ratio: 1, shadow: 1024, grid: 3, trees: 0.55, far: 0.3 },
};

// 奇幻主題：天空、霧、光線、岩壁顏色、外圍地形顏色（只改外觀）
const THEMES = {
  jungle: { fog: 0xa6cdb8, fogNear: 240, fogFar: 2600, sun: 0xfff1cc, sunI: 2.7, hemi: [0xd9f6e2, 0x2c5a28, 0.5], exposure: 1.0, rock: 0.5, rockTint: [0.78, 0.86, 0.72], skirt: [0.15, 0.34, 0.13], water: 0x1f9a8a },
  lava: { fog: 0x55291f, fogNear: 180, fogFar: 2300, sun: 0xffb27a, sunI: 2.3, hemi: [0xffa070, 0x2a120e, 0.55], exposure: 1.05, rock: 0.9, rockTint: [0.5, 0.46, 0.48], skirt: [0.11, 0.09, 0.09] },
  mushroom: { fog: 0x241e4a, fogNear: 140, fogFar: 1900, sun: 0xb4c4ff, sunI: 1.25, hemi: [0x8c7cff, 0x162a40, 0.8], exposure: 1.18, rock: 0.6, rockTint: [0.5, 0.5, 0.72], skirt: [0.09, 0.11, 0.2], water: 0x1b8fa6 },
  frost: { fog: 0x93a9c8, fogNear: 260, fogFar: 2700, sun: 0xdde8ff, sunI: 1.9, hemi: [0xbcd6ff, 0x7c8ca6, 0.75], exposure: 1.0, rock: 0.85, rockTint: [0.78, 0.88, 1.0], skirt: [0.86, 0.89, 0.95], water: 0x24486e },
  // 寫實主題（sky: 'hdr' = 用原本的真實天空）
  tropical: { sky: 'hdr', fog: 0xc4e6ee, fogNear: 420, fogFar: 3400, sun: 0xfff4dc, sunI: 3.0, hemi: [0xd8f0ff, 0x6a8a4a, 0.42], exposure: 1.0, rock: 0.35, rockTint: [1.0, 0.92, 0.8], skirt: [0.3, 0.5, 0.24], water: 0x1fb4c2, rockCol: 0x8a8070 },
  cliffs: { fog: 0xaeb8c0, fogNear: 260, fogFar: 2600, sun: 0xf2eee6, sunI: 2.2, hemi: [0xc8d2dc, 0x55603e, 0.5], exposure: 0.98, rock: 1.0, rockTint: [0.78, 0.76, 0.72], skirt: [0.4, 0.44, 0.28], water: 0x1c3f4a, rockCol: 0x6e6a64 },
  alpine: { sky: 'hdr', fog: 0xc6d6e6, fogNear: 420, fogFar: 3600, sun: 0xfff2e0, sunI: 2.9, hemi: [0xd0e4ff, 0x4a5a32, 0.4], exposure: 0.97, rock: 0.75, rockTint: [0.85, 0.85, 0.85], skirt: [0.2, 0.32, 0.15], water: 0x2a6070, rockCol: 0x7a7a76 },
  sakura: { fog: 0xead8d8, fogNear: 300, fogFar: 2800, sun: 0xfff0e4, sunI: 2.6, hemi: [0xffe6ee, 0x52603a, 0.45], exposure: 1.0, rock: 0.35, rockTint: [0.9, 0.86, 0.82], skirt: [0.22, 0.34, 0.17], water: 0x2e6a5e, rockCol: 0x8a8680 },
  dunes: { fog: 0xead6ae, fogNear: 360, fogFar: 3000, sun: 0xfff0d0, sunI: 3.1, hemi: [0xf6e6c8, 0x9a7a4a, 0.45], exposure: 0.95, rock: 0.6, rockTint: [1.1, 0.88, 0.66], skirt: [0.86, 0.68, 0.42], water: 0x1f8ea6, rockCol: 0xb08a5e },
  salt: { sky: 'hdr', fog: 0xdfe6ec, fogNear: 700, fogFar: 4200, sun: 0xffffff, sunI: 3.0, hemi: [0xe8f0ff, 0xd8d4c8, 0.5], exposure: 0.92, rock: 0.6, rockTint: [0.9, 0.82, 0.86], skirt: [0.9, 0.9, 0.87], water: 0x3cc2bc, rockCol: 0x9a8a88 },
  void: { fog: 0x2c1c50, fogNear: 320, fogFar: 2600, sun: 0xeee8ff, sunI: 2.6, hemi: [0xbfb0ff, 0x352258, 0.65], exposure: 1.05, rock: 1, rockTint: [0.6, 0.56, 0.82], skirt: null },
};

export class World {
  constructor(canvas, quality = 'high') {
    this.canvas = canvas;
    this.q = QUALITY[quality] || QUALITY.high;
    this.holeGroup = null;
    this.time = 0;
  }

  async init(onProgress = () => {}) {
    const r = this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.q.ratio));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 0.95;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.05, 6000);
    this.resize();
    window.addEventListener('resize', () => this.resize());

    const sun = this.sun = new THREE.DirectionalLight(0xfff0d8, 2.8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(this.q.shadow, this.q.shadow);
    const sc = sun.shadow.camera;
    sc.left = sc.bottom = -45; sc.right = sc.top = 45; sc.near = 1; sc.far = 400;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.04;
    this.sunDir = new THREE.Vector3(-0.45, 0.78, 0.35).normalize();
    this.scene.add(sun, sun.target);
    this.hemi = new THREE.HemisphereLight(0xcfe3ff, 0x4a5a32, 0.35);
    this.scene.add(this.hemi);

    const tl = new THREE.TextureLoader();
    const load = (url, srgb) => new Promise(res => tl.load(url, t => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = r.capabilities.getMaxAnisotropy();
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      onProgress();
      res(t);
    }, undefined, () => { onProgress(); res(null); }));
    const [hdr, grassD, grassN, sandD, sandN, rockD, rockN] = await Promise.all([
      new Promise(res => new RGBELoader().load('assets/textures/sky.hdr', t => { onProgress(); res(t); }, undefined, () => { onProgress(); res(null); })),
      load('assets/textures/grass_d.jpg', true), load('assets/textures/grass_n.jpg'),
      load('assets/textures/sand_d.jpg', true), load('assets/textures/sand_n.jpg'),
      load('assets/textures/rock_d.jpg', true), load('assets/textures/rock_n.jpg'),
    ]);
    this.tex = { grassD, grassN, sandD, sandN, rockD, rockN };
    if (hdr) {
      hdr.mapping = THREE.EquirectangularReflectionMapping;
      this.scene.background = hdr;
      const pm = new THREE.PMREMGenerator(r);
      this.scene.environment = pm.fromEquirectangular(hdr).texture;
      pm.dispose();
    } else {
      this.scene.background = new THREE.Color(0xbcd2df);
    }
    this.skyDefault = { bg: this.scene.background, env: this.scene.environment };
    this.skies = {};
    this.grassAvg = avgLum(grassD) || 0.3;
    this.sandAvg = avgLum(sandD) || 0.5;
    this.waterNormal = makeWaterNormal();

    this.buildBall();
    this.buildMarkers();
    this.buildTracer();
    return this;
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth, h = this.canvas.clientHeight || window.innerHeight;
    // 視窗被隱藏/切到背景時大小可能是 0，這時不更新（否則比例變成 NaN，鏡頭會壞掉）
    if (w < 2 || h < 2) return;
    this._w = w; this._h = h;
    this.renderer.setSize(w, h, false);
    const aspect = w / h;
    this.camera.aspect = aspect;
    // 橫向寬螢幕時限制水平視角約 72°，避免畫面邊緣的人物和樹被拉寬變胖
    this.camera.fov = aspect < 1 ? 62 : Math.min(50, 2 * Math.atan(Math.tan(36 * Math.PI / 180) / aspect) * 180 / Math.PI);
    this.camera.updateProjectionMatrix();
  }

  // ---------- 地形材質：顏色圖 × 照片細節（近距離）+ 陡坡岩石 ----------
  terrainMaterial(colorTex, maskTex, style, vertexColors, theme = null) {
    const th = THEMES[theme];
    const m = new THREE.MeshStandardMaterial({
      map: colorTex || null, vertexColors: !!vertexColors, roughness: 0.93, metalness: 0,
      normalMap: this.tex.grassN, normalScale: new THREE.Vector2(0.55, 0.55), envMapIntensity: 0.55,
    });
    if (colorTex) colorTex.channel = 1;
    const tex = this.tex;
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, {
        tGrassD: { value: tex.grassD }, tSandD: { value: tex.sandD }, tRock: { value: tex.rockD },
        tMask: { value: maskTex || tex.grassD }, uHasMask: { value: maskTex ? 1 : 0 },
        uGAvg: { value: this.grassAvg }, uSAvg: { value: this.sandAvg },
        uRock: { value: th ? th.rock : style === 'canyon' ? 1 : style === 'links' ? 0.15 : 0.35 },
        uSandAll: { value: !maskTex && style === 'canyon' ? 1 : 0 },
        uRockTint: { value: new THREE.Vector3(...(th ? th.rockTint : [1.08, 0.82, 0.72])) },
        // 浮島：島面以下的岩壁越往下越融入星雲色，看起來像懸在空中
        uVoid: { value: theme === 'void' ? 1 : 0 }, uVoidY: { value: this.voidY || 0 }, uVoidCol: { value: new THREE.Color(th ? th.fog : 0) },
      });
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWPos; varying vec3 vWN; varying vec2 vMaskUv;')
        .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
          vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal);
          #ifdef USE_MAP
            vMaskUv = vMapUv;
          #else
            vMaskUv = vec2(0.0);
          #endif`);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
          varying vec3 vWPos; varying vec3 vWN; varying vec2 vMaskUv;
          uniform sampler2D tGrassD; uniform sampler2D tSandD; uniform sampler2D tRock; uniform sampler2D tMask;
          uniform float uHasMask; uniform float uGAvg; uniform float uSAvg; uniform float uRock; uniform float uSandAll;
          uniform vec3 uRockTint; uniform float uVoid; uniform float uVoidY; uniform vec3 uVoidCol;
          float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }`)
        .replace('#include <map_fragment>', `#include <map_fragment>
          vec4 mk = uHasMask > 0.5 ? texture2D(tMask, vMaskUv) : vec4(uSandAll, 0.0, 0.0, 1.0);
          float dist = length(vWPos - cameraPosition);
          float fade = smoothstep(260.0, 12.0, dist);
          float g1 = lum(texture2D(tGrassD, vWPos.xz / 3.4).rgb) / uGAvg;
          float g2 = lum(texture2D(tGrassD, vWPos.xz / 29.0 + 0.37).rgb) / uGAvg;
          float s1 = lum(texture2D(tSandD, vWPos.xz / 2.6).rgb) / uSAvg;
          float det = mix(g1, s1, mk.r);
          float k = mix(1.0, det, mix(0.6, 0.22, mk.g) * fade) * mix(1.0, g2, 0.22 * (1.0 - mk.r));
          diffuseColor.rgb *= clamp(k, 0.55, 1.5);
          vec3 an = abs(vWN);
          vec3 rk = texture2D(tRock, vWPos.zy / 7.0).rgb * an.x + texture2D(tRock, vWPos.xy / 7.0).rgb * an.z + texture2D(tRock, vWPos.xz / 7.0).rgb * an.y;
          rk /= (an.x + an.y + an.z);
          float steep = smoothstep(0.42, 0.62, 1.0 - vWN.y) * uRock;
          diffuseColor.rgb = mix(diffuseColor.rgb, rk * uRockTint, steep);`)
        .replace('#include <fog_fragment>', `float vk = uVoid * smoothstep(uVoidY - 1.0, uVoidY - 12.0, vWPos.y);
          // 島邊岩壁約 10 公尺內逐漸淡出（抖動透空），下面接倒錐形的岩石底座
          if (vk > 0.0 && vk > fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))))) discard;
          gl_FragColor.rgb = mix(gl_FragColor.rgb, uVoidCol, vk * 0.7);
          #include <fog_fragment>`);
    };
    return m;
  }

  disposeHole() {
    if (!this.holeGroup) return;
    this.scene.remove(this.holeGroup);
    this.holeGroup.traverse(o => {
      // 樹的形狀是所有洞共用的，不釋放（否則每洞都要重新上傳到顯示卡）
      if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach(mt => { if (mt.map && mt.map.isCanvasTexture) mt.map.dispose(); mt.dispose(); });
      }
    });
    // 地形的顏色圖 / 材質遮罩（遮罩不在 material.map 上，要另外釋放，否則每換一洞就漏掉幾 MB 顯示記憶體）
    (this.holeTextures || []).forEach(t => t.dispose());
    this.holeTextures = [];
    this.waterMats = [];
    this.holeGroup = null;
  }

  async loadHole(hole) {
    this.disposeHole();
    this.hole = hole;
    const g = this.holeGroup = new THREE.Group();
    this.scene.add(g);
    const style = hole.course.style, theme = hole.course.theme || null, th = THEMES[theme];
    const fogCol = th ? th.fog : style === 'canyon' ? 0xd9c3a8 : style === 'links' ? 0xc8d6dc : 0xc6d4d6;
    this.scene.fog = new THREE.Fog(fogCol, th ? th.fogNear : 380, th ? th.fogFar : 3200);
    this.applyTheme(theme);
    // 浮島：島面大約的高度（岩壁從這裡往下漸隱）
    this.voidY = theme === 'void' ? Math.min(hole.heightUV(hole.tees[0].u, hole.tees[0].v), hole.heightUV(hole.green.u, hole.green.v)) - 4 : 0;

    // 顏色圖
    const maps = paintMaps(hole);
    const colorTex = new THREE.CanvasTexture(maps.color);
    colorTex.colorSpace = THREE.SRGBColorSpace;
    colorTex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    const maskTex = new THREE.CanvasTexture(maps.mask);
    this.holeTextures = [colorTex, maskTex];
    this.colorCanvas = maps.color;

    // 精細地形網格
    const b = hole.bbox, step = this.q.grid;
    const nx = Math.ceil((b.maxU - b.minU) / step) + 1, nz = Math.ceil((b.maxV - b.minV) / step) + 1;
    const pos = new Float32Array(nx * nz * 3), uv = new Float32Array(nx * nz * 2), uv1 = new Float32Array(nx * nz * 2);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const u = Math.min(b.minU + i * step, b.maxU), v = Math.min(b.minV + j * step, b.maxV);
      const k = j * nx + i;
      pos[k * 3] = u; pos[k * 3 + 1] = (hole.heightVisUV || hole.heightUV)(u, v); pos[k * 3 + 2] = -v;
      uv[k * 2] = u / 4; uv[k * 2 + 1] = v / 4;
      uv1[k * 2] = (u - b.minU) / (b.maxU - b.minU); uv1[k * 2 + 1] = (v - b.minV) / (b.maxV - b.minV);
    }
    const idx = new Uint32Array((nx - 1) * (nz - 1) * 6);
    let p = 0;
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i, c = a + nx;
      idx[p++] = a; idx[p++] = a + 1; idx[p++] = c; idx[p++] = a + 1; idx[p++] = c + 1; idx[p++] = c;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setAttribute('uv1', new THREE.BufferAttribute(uv1, 2));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeVertexNormals();
    this.tgrid = { minU: b.minU, minV: b.minV, step, nx, nz, pos };
    const terrain = new THREE.Mesh(geo, this.terrainMaterial(colorTex, maskTex, style, false, theme));
    terrain.receiveShadow = true;
    g.add(terrain);
    this.terrainMesh = terrain;
    await frame();

    // 外圍大地形（同一個高度函數，地圖範圍內往下壓避免重疊）
    if (!th || th.skirt) g.add(this.buildSkirt(hole, style, theme));
    if (hole.seaSide || style === 'links') g.add(this.buildSea(hole));
    this.buildWaters(hole, g);
    if (hole.islandUV) g.add(this.buildUnderside(hole));
    if (hole.moat) {
      // 果嶺孤島：果嶺下方一整片水 / 熔岩（果嶺和果嶺邊比較高，會把中間蓋住）
      const geo = new THREE.CircleGeometry(hole.moat.r, 64); geo.rotateX(-Math.PI / 2); worldUv(geo);
      const mat = this.hazardMaterial(); this.waterMats.push(mat);
      const m = new THREE.Mesh(geo, mat); m.position.set(hole.moat.u, hole.moat.level + 0.05, -hole.moat.v); m.receiveShadow = true; g.add(m);
    }
    this.buildSpecials(hole, g);
    this.buildSkyFx(hole, g);
    await frame();
    this.buildTrees(hole, g);
    await frame();
    this.buildTeeMarkers(hole, g);
    this.buildFlag(hole, g);
    this.buildGreenGrid(hole, g);
  }

  // 主題的天空、環境光、太陽；沒有主題就換回原本的 HDR 天空
  applyTheme(theme) {
    const th = THEMES[theme];
    if (this.curTheme === theme) return;
    this.curTheme = theme;
    if (!th) {
      this.scene.background = this.skyDefault.bg; this.scene.environment = this.skyDefault.env;
      this.sun.color.set(0xfff0d8); this.sun.intensity = 2.8;
      this.hemi.color.set(0xcfe3ff); this.hemi.groundColor.set(0x4a5a32); this.hemi.intensity = 0.35;
      this.renderer.toneMappingExposure = 0.95;
      return;
    }
    if (th.sky === 'hdr') this.skies[theme] = this.skyDefault;
    if (!this.skies[theme]) {
      const tex = new THREE.CanvasTexture(paintSky(theme));
      tex.mapping = THREE.EquirectangularReflectionMapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      const pm = new THREE.PMREMGenerator(this.renderer);
      this.skies[theme] = { bg: tex, env: pm.fromEquirectangular(tex).texture };
      pm.dispose();
    }
    this.scene.background = this.skies[theme].bg; this.scene.environment = this.skies[theme].env;
    this.sun.color.set(th.sun); this.sun.intensity = th.sunI;
    this.hemi.color.set(th.hemi[0]); this.hemi.groundColor.set(th.hemi[1]); this.hemi.intensity = th.hemi[2];
    this.renderer.toneMappingExposure = th.exposure;
  }

  buildSkirt(hole, style, theme = null) {
    const b = hole.bbox;
    const cu = (b.minU + b.maxU) / 2, cv = (b.minV + b.maxV) / 2;
    const size = 4200, n = Math.round(150 * (0.6 + 0.4 * this.q.far)) + 40;
    const geo = new THREE.PlaneGeometry(size, size, n, n);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const nz = makeNoise(77 + hole.holeIdx);
    const base = THEMES[theme] ? THEMES[theme].skirt : style === 'canyon' ? [0.70, 0.42, 0.27] : style === 'links' ? [0.55, 0.53, 0.33] : [0.24, 0.36, 0.16];
    for (let i = 0; i < pos.count; i++) {
      const u = pos.getX(i) + cu, v = -pos.getZ(i) + cv;
      const inside = Math.min(u - b.minU, b.maxU - u, v - b.minV, b.maxV - v);
      let hh = hole.heightUV(u, v);
      const far = Math.hypot(u - cu, v - cv);
      if (theme === 'dunes') hh += (18 * Math.abs(Math.sin(u / 90 + nz(u / 400, v / 400) * 3)) + 30 * Math.max(0, nz.fbm(u / 300, v / 300, 3))) * clamp((far - 350) / 400, 0, 1);
      else if (theme === 'alpine') hh += 140 * (0.4 + nz.fbm(u / 420, v / 420, 3)) * clamp((far - 450) / 700, 0, 1);
      else if (theme === 'salt') hh += 0;
      else if (theme === 'lava') hh += 70 * Math.max(0, nz.fbm(u / 260, v / 260, 3) + 0.1) * clamp((far - 450) / 500, 0, 1);
      else if (style === 'canyon') hh += 45 * Math.max(0, nz.fbm(u / 300, v / 300, 3) + 0.05) * clamp((far - 500) / 500, 0, 1);
      else if (style === 'parkland') hh += 30 * (0.5 + nz.fbm(u / 500, v / 500, 3)) * clamp((far - 450) / 700, 0, 1);
      else hh += 6 * nz.fbm(u / 120, v / 120, 2) * clamp((far - 400) / 400, 0, 1);
      if (inside > 0) hh -= 0.6 * clamp(inside / 12, 0, 1);
      pos.setXYZ(i, u, hh, -v);
      const f = 0.85 + 0.25 * nz(u / 40, v / 40);
      col[i * 3] = base[0] * f; col[i * 3 + 1] = base[1] * f; col[i * 3 + 2] = base[2] * f;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / 4, -pos.getZ(i) / 4);
    geo.computeVertexNormals();
    const mat = this.terrainMaterial(null, null, style, true, theme);
    mat.polygonOffset = true; mat.polygonOffsetFactor = 2; mat.polygonOffsetUnits = 2;
    const m = new THREE.Mesh(geo, mat);
    m.receiveShadow = true;
    return m;
  }

  // 浮島的岩石底座：島越寬的地方越深，往中間收成倒錐形（從下面或側面看像懸在空中）
  buildUnderside(hole) {
    const b = hole.bbox, step = 2.5, nz = makeNoise(13 + hole.holeIdx);
    const nx = Math.ceil((b.maxU - b.minU) / step) + 1, nzc = Math.ceil((b.maxV - b.minV) / step) + 1;
    const F = new Float32Array(nx * nzc), pos = new Float32Array(nx * nzc * 3), col = new Float32Array(nx * nzc * 3);
    for (let j = 0; j < nzc; j++) for (let i = 0; i < nx; i++) {
      const u = b.minU + i * step, v = b.minV + j * step, k = j * nx + i;
      const f = hole.islandUV(u, v); F[k] = f;
      const top = hole.heightUV(u, v) + (f < 0 ? 30 * Math.min(1, -f / 2.5) : 0);       // 島外的物理高度往下壓了 30 m，加回來
      const depth = 3 + 1.7 * Math.max(0, f) + 5 * Math.max(0, f) / (f + 8) * (1 + nz(u / 9, v / 9));
      pos[k * 3] = u; pos[k * 3 + 1] = top - depth; pos[k * 3 + 2] = -v;
      const t = clamp(depth / 40, 0, 1), n = 0.85 + 0.3 * Math.abs(nz(u / 4, v / 4));
      col[k * 3] = (0.46 - t * 0.28) * n; col[k * 3 + 1] = (0.38 - t * 0.26) * n; col[k * 3 + 2] = (0.6 - t * 0.3) * n;
    }
    const idx = [];
    for (let j = 0; j < nzc - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i, c = a + nx;
      if (Math.min(F[a], F[a + 1], F[c], F[c + 1]) < -1.5) continue;
      idx.push(a, c, a + 1, a + 1, c, c + 1);           // 面朝下
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true, side: THREE.DoubleSide }));
    return m;
  }

  // ---------- 奇幻機關的模型與動畫 ----------
  buildSpecials(hole, g) {
    this.specialAnims = [];
    this.specialPulses = {};
    this.ensureSpark();
    const glowBasic = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
    for (const sp of hole.specials || []) {
      if (sp.kind === 'ring' || sp.kind === 'portal') {
        const fire = sp.kind === 'ring';
        const ends = fire ? [[sp.u, sp.y, sp.v, sp.dir]] : [[sp.u, sp.y, sp.v, sp.dir], [sp.exit.u, sp.exit.y, sp.exit.v, sp.exit.dir]];
        ends.forEach(([u, y, v, dir], k) => {
          const grp = new THREE.Group();
          grp.position.set(u, y, -v);
          grp.lookAt(u + dir[0], y, -(v + dir[1]));
          const col = fire ? 0xd8ff6a : k === 0 ? 0x7ad8ff : 0xd07aff;
          const torus = new THREE.Mesh(new THREE.TorusGeometry(sp.r, fire ? 0.12 : 0.32, 10, 64), glowBasic(col, fire ? 0.55 : 0.9));
          grp.add(torus);
          if (!fire) {
            // 星門中間旋轉的漩渦
            const disc = new THREE.Mesh(new THREE.CircleGeometry(sp.r * 0.96, 48), new THREE.MeshBasicMaterial({ map: swirlTexture(), color: col, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
            grp.add(disc);
            // 底座：兩根石柱
            for (const sd of [-1, 1]) {
              const col2 = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, y - hole.heightUV(u, v) + 1.5, 6), new THREE.MeshStandardMaterial({ color: 0x5a4f80, roughness: 0.6, flatShading: true }));
              col2.position.set(sd * (sp.r + 0.5), -(y - hole.heightUV(u, v)) / 2 + 0.25, 0); grp.add(col2);
            }
            this.specialAnims.push(t => { disc.rotation.z = -t * (k ? -1.4 : 1.4); torus.material.opacity = 0.75 + 0.25 * Math.sin(t * 3 + k); });
          }
          // 繞著圓環飛的螢火蟲 / 光點
          const N = fire ? 70 : 40, pos = new Float32Array(N * 3), seeds = Array.from({ length: N }, () => [Math.random() * 6.28, 0.6 + Math.random() * 1.2, (Math.random() - 0.5) * 1.6, Math.random() * 6.28]);
          const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
          const pts = new THREE.Points(pg, new THREE.PointsMaterial({ map: this.sparkTex, color: fire ? 0xeaff8a : col, size: fire ? 0.55 : 0.45, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
          pts.frustumCulled = false; grp.add(pts);
          this.specialAnims.push(t => {
            for (let i = 0; i < N; i++) { const [a0, sp0, off, ph] = seeds[i]; const a = a0 + t * sp0 * (fire ? 0.6 : 1.5); const rr = sp.r + off * (fire ? 1 : 0.4) + 0.3 * Math.sin(t * 2 + ph); pos[i * 3] = Math.cos(a) * rr; pos[i * 3 + 1] = Math.sin(a) * rr; pos[i * 3 + 2] = Math.sin(t * 1.3 + ph) * (fire ? 0.8 : 0.3); }
            pg.attributes.position.needsUpdate = true;
            const pu = this.specialPulses[sp.kind] || 0;
            pts.material.opacity = (fire ? 0.55 + 0.45 * Math.sin(t * 2.2) ** 2 : 0.9) + pu;
            torus.scale.setScalar(1 + pu * 0.25);
          });
          g.add(grp);
        });
        if (fire) g.add(glowSprite(this, new THREE.Vector3(sp.u, sp.y, -sp.v), sp.r * 3.2, 0xb8ff5a, 0.25));
      } else if (sp.kind === 'vent') {
        // 噴發口：黑色小火山丘 + 發光的口 + 一直往上冒的火星與煙，每隔幾秒大噴發一次
        const gy = sp.y;
        const cone = new THREE.Mesh(new THREE.CylinderGeometry(sp.r * 0.55, sp.r * 1.5, 1.4, 12, 1, true), new THREE.MeshStandardMaterial({ color: 0x241c1c, roughness: 0.95, flatShading: true, side: THREE.DoubleSide }));
        cone.position.set(sp.u, gy + 0.3, -sp.v); g.add(cone);
        const mouth = new THREE.Mesh(new THREE.CircleGeometry(sp.r * 0.55, 20), new THREE.MeshBasicMaterial({ color: 0xff6a1a })); mouth.rotation.x = -Math.PI / 2; mouth.position.set(sp.u, gy + 0.9, -sp.v); g.add(mouth);
        const glow = glowSprite(this, new THREE.Vector3(sp.u, gy + 2, -sp.v), sp.r * 3, 0xff6a1a, 0.6); g.add(glow);
        const N = 80, pos = new Float32Array(N * 3), seeds = Array.from({ length: N }, () => [Math.random(), Math.random() * 6.28, Math.random()]);
        const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const pts = new THREE.Points(pg, new THREE.PointsMaterial({ map: this.sparkTex, color: 0xff8a3a, size: 0.7, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
        pts.frustumCulled = false; g.add(pts);
        const ph0 = Math.random() * 5;
        this.specialAnims.push(t => {
          const cyc = (t + ph0) % 5, burst = cyc < 1.2 ? Math.sin(cyc / 1.2 * Math.PI) : 0;
          for (let i = 0; i < N; i++) {
            const [a, ang, sp2] = seeds[i]; const life = (t * (0.35 + sp2 * 0.3) + a) % 1;
            const hgt = life * (4 + burst * 22), rr = 0.4 + life * (1 + burst * 2.5);
            pos[i * 3] = sp.u + Math.cos(ang + t) * rr; pos[i * 3 + 1] = gy + 0.9 + hgt; pos[i * 3 + 2] = -sp.v + Math.sin(ang + t) * rr;
          }
          pg.attributes.position.needsUpdate = true;
          glow.material.opacity = 0.45 + burst * 0.5 + (this.specialPulses.vent || 0);
          mouth.material.color.setRGB(1, 0.35 + burst * 0.4, 0.08);
        });
      } else if (sp.kind === 'shroom') {
        // 彈跳巨菇：發光的菇傘、淡色菇柄、地上一圈光
        const hue = 0.78 + sp.tint * 0.3;
        const capCol = new THREE.Color().setHSL(hue % 1, 0.85, 0.6);
        const stemH = sp.top - sp.y;
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(sp.r * 0.16, sp.r * 0.22, stemH, 12), glowMaterial({ color: 0xe8e2f2, roughness: 0.7 }, 0.18));
        stem.position.set(sp.u, sp.y + stemH / 2, -sp.v); stem.castShadow = true; g.add(stem);
        const capGeo = new THREE.SphereGeometry(sp.r, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2); capGeo.scale(1, 0.42, 1);
        const capMat = glowMaterial({ color: capCol, roughness: 0.45 }, 0.55);
        const cap = new THREE.Mesh(capGeo, capMat); cap.position.set(sp.u, sp.top - 0.1, -sp.v); cap.castShadow = true; g.add(cap);
        const under = new THREE.Mesh(new THREE.CircleGeometry(sp.r * 0.98, 32), new THREE.MeshStandardMaterial({ color: capCol.clone().multiplyScalar(0.35), side: THREE.DoubleSide, roughness: 0.9 }));
        under.rotation.x = Math.PI / 2; under.position.set(sp.u, sp.top - 0.12, -sp.v); g.add(under);
        // 菇傘上的白色斑點
        for (let i = 0; i < 7; i++) {
          const a = i / 7 * 6.28 + sp.tint * 3, rr = sp.r * (0.25 + (i % 3) * 0.22), yy = Math.sqrt(Math.max(0, 1 - (rr / sp.r) ** 2)) * sp.r * 0.42;
          const dot = new THREE.Mesh(new THREE.SphereGeometry(sp.r * 0.09, 8, 6), glowMaterial({ color: 0xffffff, roughness: 0.6 }, 0.5));
          dot.scale.y = 0.4; dot.position.set(sp.u + Math.cos(a) * rr, sp.top - 0.1 + yy, -sp.v + Math.sin(a) * rr); g.add(dot);
        }
        const halo = glowSprite(this, new THREE.Vector3(sp.u, sp.y + 0.6, -sp.v), sp.r * 3, capCol.getHex(), 0.35); g.add(halo);
        const ph0 = Math.random() * 6;
        this.specialAnims.push(t => { const pu = this.specialPulses.shroom || 0; cap.scale.set(1 + pu * 0.15, 1 - pu * 0.3 + 0.03 * Math.sin(t * 1.6 + ph0), 1 + pu * 0.15); halo.material.opacity = 0.28 + 0.12 * Math.sin(t * 1.6 + ph0) + pu; });
      } else if (sp.kind === 'wall') {
        // 冰鏡牆：半透明的冰板 + 發光的邊
        const ax = sp.a[0], az = -sp.a[1], bx = sp.b[0], bz = -sp.b[1], L = Math.hypot(bx - ax, bz - az);
        const geo = new THREE.BoxGeometry(L, sp.h + 1.2, 0.5);
        const mat = new THREE.MeshStandardMaterial({ color: 0xbfe6ff, emissive: 0x2a7acc, emissiveIntensity: 0.35, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.55 });
        const m = new THREE.Mesh(geo, mat);
        m.position.set((ax + bx) / 2, sp.y0 + (sp.h + 1.2) / 2 - 0.9, (az + bz) / 2);
        m.rotation.y = -Math.atan2(bz - az, bx - ax);
        g.add(m);
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0xc8f2ff, transparent: true, opacity: 0.9 }));
        edges.position.copy(m.position); edges.rotation.copy(m.rotation); g.add(edges);
        this.specialAnims.push(t => { const pu = this.specialPulses.wall || 0; mat.emissiveIntensity = 0.3 + 0.12 * Math.sin(t * 1.4 + ax) + pu * 1.5; });
      }
    }
  }

  // 機關觸發時，同一種機關一起閃一下
  specialPulse(kind) { (this.specialPulses = this.specialPulses || {})[kind] = 1; }

  // 天空的動態效果：極光（冰原、蘑菇森林）
  buildSkyFx(hole, g) {
    this.aurora = null;
    const th = hole.course.theme;
    if (th !== 'frost' && th !== 'mushroom') return;
    const b = hole.bbox, cu = (b.minU + b.maxU) / 2, cv = (b.minV + b.maxV) / 2;
    const geo = new THREE.CylinderGeometry(1600, 1600, 560, 96, 1, true);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uA: { value: th === 'frost' ? 1 : 0.45 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `varying vec2 vUv; uniform float uTime; uniform float uA;
        void main(){
          float x = vUv.x * 40.0;
          float w = sin(x * 0.9 + uTime * 0.25) * 0.5 + sin(x * 2.3 - uTime * 0.4) * 0.25 + sin(x * 5.1 + uTime * 0.7) * 0.1;
          float band = smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.45, vUv.y);
          float curtain = pow(0.5 + 0.5 * sin(x * 3.0 + w * 4.0 + uTime * 0.3), 3.0) * (0.6 + 0.4 * sin(x * 0.37 + uTime * 0.1));
          vec3 col = mix(vec3(0.2, 1.0, 0.55), vec3(0.85, 0.35, 1.0), smoothstep(0.35, 0.95, vUv.y + w * 0.15));
          float a = band * curtain * uA * 0.55;
          gl_FragColor = vec4(col * a, a);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide, fog: false,
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(cu, 300, -cv);
    m.renderOrder = -1;
    g.add(m);
    this.aurora = mat;
  }

  waterMaterial() {
    return new THREE.MeshStandardMaterial({
      color: 0x24464f, roughness: 0.06, metalness: 0.0, normalMap: this.waterNormal, normalScale: new THREE.Vector2(0.28, 0.28),
      envMapIntensity: 1.25, transparent: true, opacity: 0.94,
    });
  }

  // 主題的水面：叢林 = 綠松石潟湖、熔岩 = 會流動發光的熔岩（規則仍是水障礙）
  hazardMaterial() {
    const theme = this.hole && this.hole.course.theme;
    if (theme === 'lava') {
      if (!this.lavaTex) { this.lavaTex = makeLavaTexture(); }
      return new THREE.MeshStandardMaterial({ color: 0x140300, emissive: 0xffffff, emissiveMap: this.lavaTex, emissiveIntensity: 1.5, roughness: 0.85, metalness: 0,
        normalMap: this.waterNormal, normalScale: new THREE.Vector2(0.6, 0.6) });
    }
    const m = this.waterMaterial();
    if (THEMES[theme] && THEMES[theme].water && !['jungle', 'mushroom', 'frost'].includes(theme)) { m.color.set(THEMES[theme].water); m.envMapIntensity = 0.6; }
    if (theme === 'tropical' || theme === 'salt') { m.opacity = 0.9; m.envMapIntensity = 0.7; }
    if (theme === 'mushroom') { m.color.set(THEMES.mushroom.water); m.emissive = new THREE.Color(0x0c6a86); m.emissiveIntensity = 0.7; m.envMapIntensity = 0.6; }
    if (theme === 'frost') { m.color.set(THEMES.frost.water); m.roughness = 0.03; m.envMapIntensity = 1.4; m.opacity = 0.97; }
    if (theme === 'jungle') { m.color.set(THEMES.jungle.water); m.opacity = 0.95; m.envMapIntensity = 0.45; m.roughness = 0.12; }
    return m;
  }

  buildSea(hole) {
    const geo = new THREE.PlaneGeometry(8000, 8000, 1, 1);
    geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, this.hazardMaterial());
    m.position.y = -0.9;
    m.receiveShadow = true;
    this.waterMats = (this.waterMats || []).concat(m.material);
    return m;
  }

  buildWaters(hole, g) {
    this.waterMats = this.waterMats || [];
    for (const w of hole.waters) {
      if (w.kind !== 'pond') continue;
      if (w.cells) {
        // 描圖水池：每一列的水格子合成長條（往外多 3 格，岸邊地形會把多出來的蓋住）
        const G = w.grid, rows = new Map();
        for (const i of w.cells) { const x = i % G.W, y = (i / G.W) | 0; const r = rows.get(y); if (r) { r[0] = Math.min(r[0], x); r[1] = Math.max(r[1], x); } else rows.set(y, [x, x]); }
        const pos = [];
        for (const [y, [x0, x1]] of rows) {
          const ua = G.u0 + (x0 - 3.5) * G.mpp, ub = G.u0 + (x1 + 3.5) * G.mpp;
          const va = G.v0 - (y - 2) * G.mpp, vb = G.v0 - (y + 2) * G.mpp;
          pos.push(ua, 0, -va, ub, 0, -va, ub, 0, -vb, ua, 0, -va, ub, 0, -vb, ua, 0, -vb);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.computeVertexNormals();
        const mat = this.hazardMaterial();
        this.waterMats.push(mat);
        const m = new THREE.Mesh(geo, mat);
        m.position.y = w.level + 0.05;
        m.receiveShadow = true;
        g.add(m);
        continue;
      }
      const shape = new THREE.Shape();
      for (let i = 0; i <= 64; i++) {
        const a = i / 64 * Math.PI * 2;
        const lu = Math.cos(a) * w.rx * 1.35, lv = Math.sin(a) * w.ry * 1.35;
        const c = Math.cos(-w.rot), s = Math.sin(-w.rot);
        const u = w.u + lu * c - lv * s, v = w.v + lu * s + lv * c;
        if (i === 0) shape.moveTo(u, v); else shape.lineTo(u, v);
      }
      const geo = new THREE.ShapeGeometry(shape);
      geo.rotateX(-Math.PI / 2);
      worldUv(geo);
      const mat = this.hazardMaterial();
      this.waterMats.push(mat);
      const m = new THREE.Mesh(geo, mat);
      m.position.y = w.level + 0.05;
      m.receiveShadow = true;
      g.add(m);
    }
    const cr = hole.cross;
    if (cr && cr.kind === 'creek') {
      const pts = [];
      for (let d = -hole.course.corridor - 40; d <= hole.course.corridor + 40; d += 4) {
        const p = hole.pointAt(cr.s), dir = hole.dirAt(cr.s);
        pts.push([p[0] + dir[1] * d, p[1] - dir[0] * d, dir]);
      }
      const verts = [], idx = [];
      pts.forEach(([u, v, dir], i) => {
        const hw = cr.half + 3;
        verts.push(u - dir[0] * hw, 0, -(v - dir[1] * hw), u + dir[0] * hw, 0, -(v + dir[1] * hw));
        if (i > 0) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      });
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      worldUv(geo);
      const mat = this.hazardMaterial();
      mat.side = THREE.DoubleSide;
      this.waterMats.push(mat);
      const m = new THREE.Mesh(geo, mat);
      m.position.y = cr.level + 0.25;
      g.add(m);
    }
  }

  // ---------- 樹木 ----------
  treeGeos() {
    if (this._treeGeos) return this._treeGeos;
    const nz = makeNoise(42);
    const blob = (r, seg = 2) => {
      const gg = new THREE.IcosahedronGeometry(r, seg);
      const p = gg.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        const k = 1 + 0.2 * nz(x * 2.2 + 3, y * 2.2 + z * 1.7) + 0.09 * nz(x * 7, z * 7 + y * 3) + 0.05 * nz(x * 16 + y * 9, z * 16);
        p.setXYZ(i, x * k, y * k, z * k);
      }
      return gg;
    };
    const colorize = (gg, top, bot) => {
      const p = gg.attributes.position, c = new Float32Array(p.count * 3);
      gg.computeBoundingBox();
      const y0 = gg.boundingBox.min.y, y1 = gg.boundingBox.max.y;
      for (let i = 0; i < p.count; i++) {
        const t = (p.getY(i) - y0) / (y1 - y0);
        const n = 0.85 + 0.3 * Math.abs(nz(p.getX(i) * 5, p.getZ(i) * 5 + p.getY(i) * 3));
        for (let k = 0; k < 3; k++) c[i * 3 + k] = (bot[k] + (top[k] - bot[k]) * t) * n;
      }
      gg.setAttribute('color', new THREE.BufferAttribute(c, 3));
      return gg;
    };
    // 闊葉樹冠：多顆凹凸球合併，半徑約 1
    const parts = [[0, 0, 0, 0.72], [0.45, -0.15, 0.2, 0.55], [-0.42, -0.1, -0.25, 0.55], [0.1, 0.4, -0.3, 0.5], [-0.2, 0.35, 0.35, 0.48], [0.25, -0.35, -0.45, 0.45], [-0.35, -0.4, 0.4, 0.42]];
    const smoothBlob = (r, x, y, z) => { const gg = blob(r, 3); gg.deleteAttribute('uv'); gg.deleteAttribute('normal'); const m = mergeVertices(gg); m.computeVertexNormals(); return m.translate(x, y, z); };
    const broad = colorize(mergeGeometries(parts.map(([x, y, z, r]) => smoothBlob(r, x, y, z))), [1, 1, 1], [0.42, 0.48, 0.42]);
    // 松樹：四層錐體，高度 1、半徑約 0.35
    const cones = [];
    for (let i = 0; i < 8; i++) {
      const cg = new THREE.ConeGeometry(0.44 - i * 0.048, 0.26, 14, 3, true);
      const p = cg.attributes.position;
      for (let k = 0; k < p.count; k++) {
        const x = p.getX(k), y = p.getY(k), z = p.getZ(k);
        const a = Math.atan2(z, x);
        const f = 1 + 0.16 * nz(Math.cos(a) * 3 + i, Math.sin(a) * 3) + 0.12 * Math.sin(a * 7 + i) * (0.5 - y);
        p.setX(k, x * f); p.setZ(k, z * f); p.setY(k, y - 0.05 * Math.abs(Math.sin(a * 5 + i)) * (0.5 - y));
      }
      cg.translate(0, 0.24 + i * 0.095, 0);
      cg.deleteAttribute('uv');
      cones.push(cg);
    }
    const pine = colorize(mergeGeometries(cones), [0.95, 1, 0.95], [0.45, 0.5, 0.45]);
    pine.computeVertexNormals();
    const trunk = new THREE.CylinderGeometry(0.7, 1, 1, 7, 1);
    trunk.translate(0, 0.5, 0);
    const rock = blob(1, 1);
    rock.scale(1, 0.62, 1);
    rock.computeVertexNormals();
    // 仙人掌：主幹 + 兩支手臂
    const cyl = (r, h) => new THREE.CapsuleGeometry(r, h, 4, 8);
    const arm1 = cyl(0.11, 0.4).translate(0.32, 0.45, 0), arm1b = cyl(0.1, 0.35).rotateZ(Math.PI / 2).translate(0.2, 0.25, 0);
    const arm2 = cyl(0.1, 0.32).translate(-0.3, 0.55, 0), arm2b = cyl(0.09, 0.3).rotateZ(Math.PI / 2).translate(-0.18, 0.38, 0);
    const cactus = mergeGeometries([cyl(0.15, 0.8).translate(0, 0.5, 0), arm1, arm1b, arm2, arm2b].map(gg => { gg.deleteAttribute('uv'); return gg; }));
    this._treeGeos = { broad, pine, trunk, rock, cactus, shrub: broad, ...fantasyGeos(nz, blob, colorize) };
    for (const gg of Object.values(this._treeGeos)) gg.userData.shared = true;
    return this._treeGeos;
  }

  buildTrees(hole, g) {
    const G = this.treeGeos();
    const leafMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0, envMapIntensity: 0.5 });
    // 樹冠隨風擺動：位移方向 = 風向，幅度隨風速與高度增加，每棵樹相位不同
    this.windU = this.windU || { uTime: { value: 0 }, uWind: { value: new THREE.Vector2() } };
    leafMat.onBeforeCompile = sh => {
      sh.uniforms.uTime = this.windU.uTime;
      sh.uniforms.uWind = this.windU.uWind;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime; uniform vec2 uWind;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          #ifdef USE_INSTANCING
            mat3 swIm = mat3(instanceMatrix);
            float swPh = instanceMatrix[3].x * 0.13 + instanceMatrix[3].z * 0.17;
            float swWs = length(uWind);
            float swAmt = 0.6 + 0.4 * sin(uTime * (1.1 + swWs * 0.18) + swPh) + 0.15 * sin(uTime * 3.7 + swPh * 2.0);
            float swH = clamp(position.y + 0.7, 0.0, 1.8);
            vec3 swD = vec3(uWind.x, 0.0, uWind.y) * swAmt * swH * 0.05;
            vec3 swL = transpose(swIm) * swD;
            swL /= vec3(dot(swIm[0], swIm[0]), dot(swIm[1], swIm[1]), dot(swIm[2], swIm[2]));
            transformed += swL;
          #endif`);
    };
    const barkMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2c, roughness: 0.95 });
    const rockMat = new THREE.MeshStandardMaterial({ map: this.tex.rockD, normalMap: this.tex.rockN, color: 0xd29a7a, roughness: 0.95 });
    const cactusMat = new THREE.MeshStandardMaterial({ color: 0x4f6b3a, roughness: 0.75 });
    // 奇幻主題的材質
    const palmBark = new THREE.MeshStandardMaterial({ color: 0x8a7154, roughness: 0.9 });
    // 棕櫚 / 蕨類的葉子是薄片，兩面都要畫（一樣隨風擺動）
    const frondMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, envMapIntensity: 0.5, side: THREE.DoubleSide });
    frondMat.onBeforeCompile = leafMat.onBeforeCompile;
    const vcolMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, flatShading: true });
    const basaltMat = new THREE.MeshStandardMaterial({ color: 0x3e393b, roughness: 0.92, flatShading: true });
    const deadMat = new THREE.MeshStandardMaterial({ color: 0x2c2420, roughness: 1 });
    const crystalMat = glowMaterial({ roughness: 0.18, metalness: 0.15, flatShading: true }, 0.55);
    const shroomStemMat = glowMaterial({ color: 0xded6ea, roughness: 0.75 }, 0.15);
    const all = hole.trees.map(t => ({ ...t, near: true }));
    const keep = this.q.trees;
    const rng = makeRng(9);
    const BIG = { karst: 1, volcano: 1, isle: 1, bigshroom: 1, iceberg: 1, peak: 1 };     // 遠景的大型地標一定畫
    for (const t of hole.scenery) if (BIG[t.type] || rng() < keep * this.q.far + 0.15) all.push({ ...t, y: t.fy ?? hole.heightUV(t.uv[0], t.uv[1]), near: false });
    const groups = {};
    const add = (k, t) => (groups[k] = groups[k] || []).push(t);
    for (const t of all) {
      if (t.type === 'broad' || t.type === 'maple' || t.type === 'shrub' || t.type === 'juniper') { add('canopy' + (t.near ? 'N' : 'F'), t); if (t.type !== 'shrub') add('trunk' + (t.near ? 'N' : 'F'), t); }
      else if (t.type === 'pine') { add('pine' + (t.near ? 'N' : 'F'), t); add('trunk' + (t.near ? 'N' : 'F'), t); }
      else if (t.type === 'palm') add('palm' + (t.near ? 'N' : 'F'), t);
      else if (t.type === 'shroom') add('shroom' + (t.near ? 'N' : 'F'), t);
      else add(t.type, t);
    }
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
    const up = new THREE.Vector3(0, 1, 0);
    const make = (geo, mat, list, fn, shadow) => {
      if (!list || !list.length) return;
      const im = new THREE.InstancedMesh(geo, mat, list.length);
      list.forEach((t, i) => {
        const col = fn(t, p, s);
        q.setFromAxisAngle(up, t.rot);
        m4.compose(p, q, s);
        im.setMatrixAt(i, m4);
        if (col) im.setColorAt(i, col);
      });
      im.castShadow = shadow; im.receiveShadow = true;
      im.instanceMatrix.needsUpdate = true;
      g.add(im);
    };
    const canopyColor = t => {
      if (t.sakura) return c.setHSL(0.94 + t.tint * 0.04, 0.55 + t.tint * 0.2, 0.78 + t.tint * 0.08);
      if (t.birch) return c.setHSL(0.16 + t.tint * 0.04, 0.55, 0.42 + t.tint * 0.08);
      if (t.night) return c.setHSL(0.5 + t.tint * 0.12, 0.45, 0.16 + t.tint * 0.06);
      if (t.jungle) return c.setHSL(0.27 + t.tint * 0.07, 0.55 + t.tint * 0.15, 0.24 + t.tint * 0.08);
      if (t.type === 'maple') return c.setHSL(0.04 + t.tint * 0.06, 0.62, 0.36 + t.tint * 0.08);
      if (t.type === 'shrub') return c.setHSL(0.2, 0.3, 0.15 + t.tint * 0.05);
      if (t.type === 'juniper') return c.setHSL(0.22, 0.2, 0.17 + t.tint * 0.05);
      return c.setHSL(0.24 + t.tint * 0.06, 0.38 + t.tint * 0.12, 0.25 + t.tint * 0.07);
    };
    for (const sfx of ['N', 'F']) {
      make(G.broad, leafMat, groups['canopy' + sfx], (t, P, S) => {
        const lowCanopy = t.type === 'shrub' || t.type === 'juniper';
        P.set(t.x, lowCanopy ? t.y + t.h * 0.45 : t.y + t.h * 0.64, t.z);
        S.set(t.r, lowCanopy ? t.h * 0.55 : t.r * 1.08 + t.h * 0.05, t.r);
        return canopyColor(t);
      }, sfx === 'N');
      make(G.pine, leafMat, groups['pine' + sfx], (t, P, S) => {
        P.set(t.x, t.y, t.z); S.set(t.r / 0.4, t.h, t.r / 0.4);
        return t.snow ? c.setHSL(0.58, 0.12, 0.72 + t.tint * 0.12) : t.cypress ? c.setHSL(0.33, 0.28, 0.14 + t.tint * 0.04) : t.bonsai ? c.setHSL(0.3, 0.35, 0.22 + t.tint * 0.05) : c.setHSL(0.36, 0.3, 0.2 + t.tint * 0.05);
      }, sfx === 'N');
      make(G.trunk, barkMat, groups['trunk' + sfx], (t, P, S) => {
        P.set(t.x, t.y - 0.3, t.z);
        const tr = t.type === 'juniper' ? 0.12 : 0.16 + t.h * 0.012;
        S.set(tr, t.type === 'pine' ? t.h * 0.4 : t.h * 0.55, tr);
        return null;
      }, sfx === 'N');
    }
    const thc = THEMES[hole.course.theme];
    make(G.rock, hole.course.theme ? new THREE.MeshStandardMaterial({ map: this.tex.rockD, color: thc && thc.rockCol ? thc.rockCol : hole.course.theme === 'void' ? 0x8a80b0 : 0x5a5254, roughness: 0.95 }) : rockMat, groups.rock, (t, P, S) => { P.set(t.x, t.y + t.h * 0.15, t.z); S.set(t.r, t.h * 0.7, t.r * (0.7 + t.tint * 0.5)); return null; }, true);
    // ---- 奇幻主題 ----
    for (const sfx of ['N', 'F']) {
      const list = groups['palm' + sfx];
      // 棕櫚：樹幹往一側彎，樹冠在彎過去的頂端
      make(G.palmTrunk, palmBark, list, (t, P, S) => { P.set(t.x, t.y - 0.2, t.z); S.set(0.3 + t.h * 0.008, t.h, 0.3 + t.h * 0.008); return null; }, sfx === 'N');
      make(G.palmCrown, frondMat, list, (t, P, S) => {
        const bend = (0.3 + t.h * 0.008) * 6; P.set(t.x + Math.cos(t.rot) * bend, t.y + t.h * 0.97, t.z - Math.sin(t.rot) * bend); S.set(t.r, t.r * 0.85, t.r);
        return c.setHSL(0.24 + t.tint * 0.06, 0.55, 0.26 + t.tint * 0.06);
      }, sfx === 'N');
    }
    make(G.fern, frondMat, groups.fern, (t, P, S) => { P.set(t.x, t.y - 0.05, t.z); S.set(t.r, t.h, t.r); return c.setHSL(0.28 + t.tint * 0.05, 0.6, 0.22 + t.tint * 0.06); }, true);
    for (const sfx of ['N', 'F']) {
      const list = groups['shroom' + sfx];
      make(G.shroomStem, shroomStemMat, list, (t, P, S) => { P.set(t.x, t.y - 0.1, t.z); S.set(t.r * 0.18, t.h, t.r * 0.18); return null; }, sfx === 'N');
      make(G.shroomCap, crystalMat, list, (t, P, S) => { P.set(t.x, t.y + t.h * 0.97, t.z); S.set(t.r, t.r * 0.45, t.r); return c.setHSL((0.78 + t.tint * 0.35) % 1, 0.8, 0.55); }, sfx === 'N');
    }
    make(G.shroomStem, shroomStemMat, groups.bigshroom, (t, P, S) => { P.set(t.x, t.y - 2, t.z); S.set(t.r * 0.14, t.h, t.r * 0.14); return null; }, false);
    make(G.shroomCap, crystalMat, groups.bigshroom, (t, P, S) => { P.set(t.x, t.y - 2 + t.h * 0.97, t.z); S.set(t.r, t.r * 0.42, t.r); return c.setHSL((0.75 + t.tint * 0.4) % 1, 0.75, 0.5); }, false);
    make(G.crystal, crystalMat, groups.icespike, (t, P, S) => { P.set(t.x, t.y - 0.3, t.z); S.set(t.r, t.h, t.r); return c.setHSL(0.53 + t.tint * 0.06, 0.55, 0.78); }, true);
    make(G.bamboo, vcolMat, groups.bamboo, (t, P, S) => { P.set(t.x, t.y - 0.2, t.z); S.set(t.r, t.h, t.r); return null; }, true);
    make(G.peak, vcolMat, (groups.peak || []).filter(t => !t.desert), (t, P, S) => { P.set(t.x, t.y - 30, t.z); S.set(t.r, t.h, t.r); return null; }, false);
    make(G.mesa, vcolMat, (groups.peak || []).filter(t => t.desert), (t, P, S) => { P.set(t.x, t.y - 20, t.z); S.set(t.r, t.h, t.r); return null; }, false);
    make(G.iceberg, vcolMat, groups.iceberg, (t, P, S) => { P.set(t.x, t.y - 15, t.z); S.set(t.r, t.h, t.r); return null; }, false);
    make(G.crystal, crystalMat, groups.crystal, (t, P, S) => { P.set(t.x, t.y - 0.3, t.z); S.set(t.r, t.h, t.r); return c.setHSL(0.5 + t.tint * 0.36, 0.75, 0.55); }, true);
    make(G.basalt, basaltMat, groups.basalt, (t, P, S) => { P.set(t.x, t.y - 0.4, t.z); S.set(t.r, t.h, t.r); return null; }, true);
    make(G.deadtree, deadMat, groups.deadtree, (t, P, S) => { P.set(t.x, t.y - 0.2, t.z); S.set(t.h * 0.55, t.h, t.h * 0.55); return null; }, true);
    make(G.karst, vcolMat, groups.karst, (t, P, S) => { P.set(t.x, t.y - 25, t.z); S.set(t.r, t.h, t.r); return null; }, false);
    make(G.isle, vcolMat, groups.isle, (t, P, S) => { P.set(t.x, t.y, t.z); S.set(t.r, t.h, t.r); return null; }, false);
    make(G.volcano, vcolMat, groups.volcano, (t, P, S) => { P.set(t.x, t.y - 20, t.z); S.set(t.r, t.h, t.r); return null; }, false);
    // 火山口的光與煙
    for (const t of groups.volcano || []) {
      const top = new THREE.Vector3(t.x, t.y - 20 + t.h * 0.93, t.z);
      g.add(glowSprite(this, top, t.r * 0.55, 0xff6a1a, 0.9));
      g.add(glowSprite(this, top.clone().add(new THREE.Vector3(0, t.h * 0.05, 0)), t.r * 0.22, 0xffd27a, 1));
      for (let k = 0; k < 5; k++) g.add(glowSprite(this, top.clone().add(new THREE.Vector3(k * 40, t.h * (0.15 + k * 0.17), k * 15)), t.r * (0.25 + k * 0.1), 0x3a2a26, 0.55, true));
    }
    make(G.cactus, cactusMat, groups.cactus, (t, P, S) => { P.set(t.x, t.y - 0.2, t.z); S.set(t.h * 0.28, t.h * 0.95, t.h * 0.28); return null; }, true);
  }

  buildTeeMarkers(hole, g) {
    const geo = new THREE.SphereGeometry(0.11, 16, 12);
    for (const t of hole.tees) {
      const mat = new THREE.MeshStandardMaterial({ color: t.color, roughness: 0.35, metalness: 0.1 });
      for (const side of [-1, 1]) {
        const u = t.u + t.dir[1] * side * 3.6 + t.dir[0] * 1.5, v = t.v - t.dir[0] * side * 3.6 + t.dir[1] * 1.5;
        const m = new THREE.Mesh(geo, mat);
        m.position.set(u, hole.heightUV(u, v) + 0.08, -v);
        m.castShadow = true;
        g.add(m);
      }
    }
  }

  buildFlag(hole, g) {
    const [px, pz] = hole.pin;
    const py = hole.height(px, pz);
    const grp = this.flag = new THREE.Group();
    grp.position.set(px, py, pz);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 2.4, 8), new THREE.MeshStandardMaterial({ color: 0xf2e6a8, roughness: 0.4 }));
    pole.position.y = 1.2;
    pole.castShadow = true;
    const cloth = new THREE.PlaneGeometry(0.55, 0.38, 12, 6);
    cloth.translate(0.275, 0, 0);
    this.flagCloth = cloth;
    this.flagBase = cloth.attributes.position.array.slice();
    const flag = new THREE.Mesh(cloth, new THREE.MeshStandardMaterial({ color: 0xb2332b, roughness: 0.8, side: THREE.DoubleSide }));
    flag.position.y = 2.2;
    flag.castShadow = true;
    this.flagMesh = flag;
    const cup = new THREE.Mesh(new THREE.CircleGeometry(0.054, 24), new THREE.MeshBasicMaterial({ color: 0x0b0d08 }));
    cup.rotation.x = -Math.PI / 2;
    cup.position.y = 0.006;
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.056, 24), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.007;
    grp.add(pole, flag, cup, ring);
    g.add(grp);
  }

  // 果嶺高低格線（推桿時顯示）：比果嶺平均高 → 紅、低 → 藍、平 → 綠
  buildGreenGrid(hole, g) {
    const gr = hole.green;
    const pts = [], cols = [];
    const R = Math.max(gr.rx, gr.ry) * 1.3;
    const col = new THREE.Color();
    const gs = hole.greenStats();
    const addSeg = (u0, v0, u1, v1) => {
      const h0 = hole.heightUV(u0, v0) + 0.02, h1 = hole.heightUV(u1, v1) + 0.02;
      const [cr, cg, cb] = heatColor(((h0 + h1) / 2 - 0.02 - gs.h0) / gs.range);
      col.setRGB(cr / 255, cg / 255, cb / 255, THREE.SRGBColorSpace);
      pts.push(u0, h0, -v0, u1, h1, -v1);
      cols.push(col.r, col.g, col.b, col.r, col.g, col.b);
    };
    const stp = 1;
    for (let a = -R; a <= R; a += stp) for (let b2 = -R; b2 <= R; b2 += stp * 0.5) {
      for (const dirc of [0, 1]) {
        const u0 = gr.u + (dirc ? a : b2), v0 = gr.v + (dirc ? b2 : a);
        const u1 = u0 + (dirc ? 0 : stp * 0.5), v1 = v0 + (dirc ? stp * 0.5 : 0);
        if (hole.greenR(u0, v0) < 1.02 && hole.greenR(u1, v1) < 1.02) addSeg(u0, v0, u1, v1);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    this.greenGrid = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.75, depthWrite: false }));
    this.greenGrid.visible = false;
    g.add(this.greenGrid);
  }

  // 練習場沙坑：把發球台換成一片沙地（傳 null 隱藏）
  setSandPatch(tee) {
    if (!this.sandPatch) {
      const tex = this.tex.sandD.clone();
      tex.needsUpdate = true;
      tex.repeat.set(3, 2);
      const m = new THREE.MeshStandardMaterial({ map: tex, normalMap: this.tex.sandN, color: 0xf2e6c8, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      const g = new THREE.PlaneGeometry(12, 9, 1, 1);
      g.rotateX(-Math.PI / 2);
      this.sandPatch = new THREE.Mesh(g, m);
      this.sandPatch.receiveShadow = true;
      this.scene.add(this.sandPatch);
    }
    this.sandPatch.visible = !!tee && !!this.hole;
    if (!this.sandPatch.visible) return;
    this.sandPatch.position.set(tee.u, this.hole.heightUV(tee.u, tee.v) + 0.004, -tee.v);
    this.sandPatch.rotation.y = -Math.atan2(tee.dir[0], tee.dir[1]);
  }

  // ---------- 球、陰影、彈道、瞄準 ----------
  buildBall() {
    const tex = makeDimpleNormal();
    const ball = this.ball = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 32, 20), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, normalMap: tex, normalScale: new THREE.Vector2(0.6, 0.6), envMapIntensity: 0.9 }));
    ball.castShadow = true;
    this.scene.add(ball);
    const sh = this.ballShadow = new THREE.Mesh(new THREE.CircleGeometry(BALL_R * 1.1, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2;
    this.scene.add(sh);
  }

  // 畫面上地形網格（每 1.5m 一個點、三角形內插）的高度。凹下去的地方（沙坑）網格會比物理高度高一點
  meshHeight(x, z) {
    const g = this.tgrid;
    if (!g) return this.hole ? this.hole.height(x, z) : 0;
    const fi = (x - g.minU) / g.step, fj = (-z - g.minV) / g.step;
    const i = Math.max(0, Math.min(g.nx - 2, Math.floor(fi))), j = Math.max(0, Math.min(g.nz - 2, Math.floor(fj)));
    const fx = Math.max(0, Math.min(1, fi - i)), fz = Math.max(0, Math.min(1, fj - j));
    const H = (ii, jj) => g.pos[((jj * g.nx) + ii) * 3 + 1];
    const h00 = H(i, j), h10 = H(i + 1, j), h01 = H(i, j + 1), h11 = H(i + 1, j + 1);
    if (fx + fz <= 1) return h00 + (h10 - h00) * fx + (h01 - h00) * fz;
    return h11 + (h01 - h11) * (1 - fx) + (h10 - h11) * (1 - fz);
  }

  setBall(x, y, z) {
    const gh0 = this.hole ? this.hole.height(x, z) : y - BALL_R;
    // 球在地面上時，畫在「畫面網格」上面，不會看起來陷進沙裡或草裡
    if (this.hole && y - gh0 < BALL_R + 0.05) y = Math.max(y, this.meshHeight(x, z) + BALL_R);
    this.ball.position.set(x, y, z);
    const gh = gh0;
    this.ballShadow.position.set(x, gh + 0.01, z);
    const air = y - gh - BALL_R;
    this.ballShadow.visible = air > 0.05;
    this.ballShadow.material.opacity = clamp(0.35 - air * 0.006, 0.08, 0.35);
  }

  buildMarkers() {
    // 預估落點：一個白點（外圈一點深色邊，在亮草地上也看得到）
    const edge = new THREE.Mesh(new THREE.CircleGeometry(0.62, 32), new THREE.MeshBasicMaterial({ color: 0x0b1510, transparent: true, opacity: 0.45, depthWrite: false }));
    edge.rotation.x = -Math.PI / 2;
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.5, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, depthWrite: false }));
    dot.rotation.x = -Math.PI / 2;
    dot.position.y = 0.01;
    const tgt = this.target = new THREE.Group();
    tgt.add(edge, dot);
    tgt.renderOrder = 5;
    this.scene.add(tgt);
    // 推桿預測線
    const pl = new THREE.BufferGeometry();
    pl.setAttribute('position', new THREE.BufferAttribute(new Float32Array(600 * 3), 3));
    this.puttLine = new THREE.Points(pl, new THREE.PointsMaterial({ color: 0xffffff, size: 0.07, transparent: true, opacity: 0.95, depthWrite: false, depthTest: false }));
    this.puttLine.visible = false;
    this.puttLine.renderOrder = 10;   // 不做深度測試：草地網格起伏不會把引導線蓋掉
    this.puttLine.frustumCulled = false;
    this.scene.add(this.puttLine);
  }

  setTarget(x, z, scale = 1, visible = true) {
    this.target.visible = visible;
    if (!visible || !this.hole) return;
    this.target.position.set(x, this.hole.height(x, z) + 0.08, z);

  }

  setPuttLine(points) {
    if (!points) { this.puttLine.visible = false; return; }
    const arr = this.puttLine.geometry.attributes.position.array;
    const n = Math.min(points.length, 600);
    for (let i = 0; i < n; i++) { arr[i * 3] = points[i][0]; arr[i * 3 + 1] = points[i][1] + 0.015; arr[i * 3 + 2] = points[i][2]; }
    this.puttLine.geometry.setDrawRange(0, n);
    this.puttLine.geometry.attributes.position.needsUpdate = true;
    this.puttLine.visible = true;
  }

  buildTracer() {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(1200 * 6), 3));
    const idx = [];
    for (let i = 0; i < 1199; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    geo.setIndex(idx);
    this.tracer = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xf2d27a, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
    this.tracer.frustumCulled = false;
    this.tracerPts = [];
    this.scene.add(this.tracer);
  }

  clearTracer() { this.tracerPts = []; this.tracer.geometry.setDrawRange(0, 0); }
  pushTracer(x, y, z) { if (this.tracerPts.length < 1200) this.tracerPts.push(new THREE.Vector3(x, y, z)); }

  updateTracer() {
    const pts = this.tracerPts, n = pts.length;
    if (n < 2) { this.tracer.geometry.setDrawRange(0, 0); return; }
    const arr = this.tracer.geometry.attributes.position.array;
    const cam = this.camera.position, t = new THREE.Vector3(), v = new THREE.Vector3(), o = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      t.subVectors(b, a).normalize();
      v.subVectors(pts[i], cam);
      const w = Math.max(0.025, v.length() * 0.0022);
      o.crossVectors(t, v).normalize().multiplyScalar(w);
      arr[i * 6] = pts[i].x + o.x; arr[i * 6 + 1] = pts[i].y + o.y; arr[i * 6 + 2] = pts[i].z + o.z;
      arr[i * 6 + 3] = pts[i].x - o.x; arr[i * 6 + 4] = pts[i].y - o.y; arr[i * 6 + 5] = pts[i].z - o.z;
    }
    this.tracer.geometry.attributes.position.needsUpdate = true;
    this.tracer.geometry.setDrawRange(0, (n - 1) * 6);
  }

  // OK 推範圍：以洞為中心、半徑 = OK 推距離的淡白色圓圈（貼著果嶺起伏）。radius = 0 隱藏
  setGimmeRing(radius) {
    if (this.gimmeRing && (this.gimmeRing.userData.r !== radius || this.gimmeRing.userData.hole !== this.hole)) {
      this.scene.remove(this.gimmeRing); this.gimmeRing.geometry.dispose(); this.gimmeRing.material.dispose(); this.gimmeRing = null;
    }
    if (!radius || !this.hole) { if (this.gimmeRing) this.gimmeRing.visible = false; return; }
    if (!this.gimmeRing) {
      const [px, pz] = this.hole.pin;
      const pts = [];
      for (let i = 0; i < 96; i++) {
        const a = i / 96 * Math.PI * 2, x = px + Math.cos(a) * radius, z = pz + Math.sin(a) * radius;
        pts.push(new THREE.Vector3(x, this.meshHeight(x, z) + 0.02, z));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      this.gimmeRing = new THREE.LineLoop(geo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }));
      this.gimmeRing.renderOrder = 6;
      this.gimmeRing.userData = { r: radius, hole: this.hole };
      this.scene.add(this.gimmeRing);
    }
    this.gimmeRing.visible = true;
  }

  // 進洞小動畫：洞口噴出金色、白色小火花（受重力落下、慢慢淡出）
  cupBurst(x, y, z, hue = null, scale = 1) {
    const n = Math.round(80 * Math.min(2, scale));
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    const vel = [];
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      pos[i * 3] = x; pos[i * 3 + 1] = y + 0.02; pos[i * 3 + 2] = z;
      const a = Math.random() * Math.PI * 2, sp = (0.4 + Math.random() * 0.9) * scale;
      vel.push([Math.cos(a) * sp, (1.6 + Math.random() * 1.8) * scale, Math.sin(a) * sp]);
      c.setHSL((hue ?? 0.09) + Math.random() * 0.06, 1, Math.random() < 0.25 ? 0.85 : 0.55);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.ensureSpark();
    const mat = new THREE.PointsMaterial({ map: this.sparkTex, size: 0.11 * scale * scale, vertexColors: true, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    this.scene.add(pts);
    (this.bursts = this.bursts || []).push({ pts, vel, t: 0, y0: y });
  }

  // 圓形光點貼圖（中心亮、邊緣漸淡；進洞火花、環境粒子、光暈共用）
  ensureSpark() {
    if (!this.sparkTex) {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 64;
      const cx = cv.getContext('2d');
      const gr = cx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      cx.fillStyle = gr; cx.fillRect(0, 0, 64, 64);
      this.sparkTex = new THREE.CanvasTexture(cv);
    }
  }

  updateBursts(dt) {
    if (!this.bursts || !this.bursts.length) return;
    for (const b of this.bursts) {
      b.t += dt;
      const p = b.pts.geometry.attributes.position;
      for (let i = 0; i < b.vel.length; i++) {
        const v = b.vel[i];
        v[1] -= 6 * dt;
        p.setXYZ(i, p.getX(i) + v[0] * dt, Math.max(b.y0 - 50, p.getY(i) + v[1] * dt), p.getZ(i) + v[2] * dt);
      }
      p.needsUpdate = true;
      b.pts.material.opacity = Math.max(0, 1 - b.t / 1.3);
    }
    this.bursts = this.bursts.filter(b => {
      if (b.t < 1.3) return true;
      this.scene.remove(b.pts); b.pts.geometry.dispose(); b.pts.material.dispose();   // 貼圖共用，不釋放
      return false;
    });
  }

  // 風紋：鏡頭附近飄過的細白線，數量、速度、亮度隨風速增加（15 mph 最明顯）
  updateWindStreaks(dt, windVec) {
    const N = 140;
    if (!this.streaks) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 6), 3));
      const mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
      this.streaks = new THREE.LineSegments(geo, mat);
      this.streaks.frustumCulled = false;
      this.scene.add(this.streaks);
      this.streakData = Array.from({ length: N }, () => ({ p: new THREE.Vector3(), life: 0, len: 2, phase: Math.random() * 6 }));
    }
    const ws = windVec ? Math.hypot(windVec[0], windVec[1]) : 0;
    const strength = clamp(ws / 6.7, 0, 1);            // 6.7 m/s ≈ 15 mph
    const count = Math.round(strength * N);
    this.streaks.visible = count > 0 && !!this.hole;
    if (!this.streaks.visible) return;
    this.streaks.material.opacity = 0.12 + 0.28 * strength;
    const dir = new THREE.Vector3(windVec[0], 0, windVec[1]).normalize();
    const cam = this.camera.position;
    const fwd = new THREE.Vector3(); this.camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
    const center = cam.clone().addScaledVector(fwd, 18);
    const R = 26;
    const arr = this.streaks.geometry.attributes.position.array;
    const speed = ws * 1.6 + 2;
    for (let i = 0; i < N; i++) {
      const s = this.streakData[i];
      if (i >= count) { arr.fill(0, i * 6, i * 6 + 6); continue; }
      s.life -= dt;
      const ox = s.p.x - center.x, oz = s.p.z - center.z;   // 不建立新物件，避免每幀大量垃圾回收造成卡頓
      if (s.life <= 0 || ox * ox + oz * oz > R * R) {
        // 從上風處重新出現
        const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * R;
        s.p.set(center.x + Math.cos(a) * r, 0, center.z + Math.sin(a) * r).addScaledVector(dir, -R * 0.5 * Math.random());
        const gh = this.hole.height(s.p.x, s.p.z);
        s.p.y = gh + 0.4 + Math.random() * 6;
        s.life = 1.5 + Math.random() * 2.5;
        s.len = (1.2 + Math.random() * 2.5) * (0.6 + strength);
      }
      s.p.addScaledVector(dir, speed * dt);
      s.p.y += Math.sin(this.time * 2 + s.phase) * 0.15 * dt;
      arr[i * 6] = s.p.x; arr[i * 6 + 1] = s.p.y; arr[i * 6 + 2] = s.p.z;
      arr[i * 6 + 3] = s.p.x - dir.x * s.len; arr[i * 6 + 4] = s.p.y; arr[i * 6 + 5] = s.p.z - dir.z * s.len;
    }
    this.streaks.geometry.attributes.position.needsUpdate = true;
  }

  // ---------- 每幀 ----------
  // 自動畫質：連續約 2 秒每幀超過 1/32 秒（低於約 30fps），就把解析度降一級；最後一級再縮小陰影。只降不升，確保流暢
  watchPerf(dt) {
    const pf = this.perf || (this.perf = { ema: 1 / 60, slow: 0, level: 0 });
    pf.ema += (dt - pf.ema) * 0.05;
    if (pf.ema > 1 / 32) pf.slow += dt; else pf.slow = Math.max(0, pf.slow - dt * 0.5);
    if (pf.slow < 2 || pf.level >= 4) return;
    pf.slow = 0;
    pf.level++;
    const r = this.renderer;
    if (pf.level <= 3) {
      r.setPixelRatio(Math.max(0.75, r.getPixelRatio() * 0.8));
      this._w = 0;                     // 讓下一幀重新設定畫布大小
    } else {
      this.sun.shadow.mapSize.set(1024, 1024);
      if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
    }
    console.info('[Dixen] 畫面較慢，自動降低畫質一級', pf.level, r.getPixelRatio());
  }

  frame(dt, windVec) {
    this.time += dt;
    this.watchPerf(dt);
    // 手機轉向時 resize 事件可能比版面更新早，所以每幀檢查一次畫布大小
    if (this.canvas.clientWidth !== this._w || this.canvas.clientHeight !== this._h) this.resize();
    // 球在遠處放大，維持最小可見尺寸
    const d = this.camera.position.distanceTo(this.ball.position);
    this.ball.scale.setScalar(Math.max(1, d * 0.0028 / (2 * BALL_R)));
    this.ballShadow.scale.setScalar(this.ball.scale.x);
    // 陰影跟著鏡頭關注點
    const focus = this.shadowFocus || this.ball.position;
    this.sun.target.position.copy(focus);
    this.sun.position.copy(focus).addScaledVector(this.sunDir, 200);
    if (this.waterMats) for (const m of this.waterMats) { m.normalMap.offset.x = this.time * 0.012; m.normalMap.offset.y = this.time * 0.007; if (m.emissiveMap) m.emissiveIntensity = 1.35 + 0.25 * Math.sin(this.time * 1.3); }
    if (this.lavaTex) { this.lavaTex.offset.x = this.time * 0.006; this.lavaTex.offset.y = Math.sin(this.time * 0.1) * 0.03; }
    this.updateAmbient(dt);
    if (this.specialAnims) for (const f of this.specialAnims) f(this.time);
    if (this.specialPulses) for (const k in this.specialPulses) this.specialPulses[k] = Math.max(0, this.specialPulses[k] - dt * 1.5);
    if (this.aurora) this.aurora.uniforms.uTime.value = this.time;
    if (this.flagCloth && windVec) {
      const p = this.flagCloth.attributes.position, base = this.flagBase;
      const ws = Math.hypot(windVec[0], windVec[1]);
      for (let i = 0; i < p.count; i++) {
        const x = base[i * 3], y = base[i * 3 + 1];
        const amp = 0.02 + ws * 0.006;
        p.setZ(i, Math.sin(x * 9 - this.time * (4 + ws * 0.6) + y * 2) * amp * (x / 0.55));
        p.setY(i, y - x * Math.max(0, 0.5 - ws * 0.06) * 0.6);
      }
      p.needsUpdate = true;
      this.flagCloth.computeVertexNormals();
      if (ws > 0.1) this.flagMesh.rotation.y = Math.atan2(-windVec[1], windVec[0]);
    }
    if (this.greenGrid && this.greenGrid.visible) this.greenGrid.material.opacity = 0.68 + 0.1 * Math.sin(this.time * 2);
    // 落點白點依距離放大，在畫面上大約維持同樣大小
    if (this.target.visible) this.target.scale.setScalar(Math.max(0.3, this.camera.position.distanceTo(this.target.position) * 0.011));
    this.updateBursts(dt);
    if (this.windU && windVec) { this.windU.uTime.value = this.time; this.windU.uWind.value.set(windVec[0], windVec[1]); }
    this.updateWindStreaks(dt, windVec);
    this.updateTracer();
    this.renderer.render(this.scene, this.camera);
  }

  // 主題的空氣粒子：叢林 = 一明一滅的螢火蟲、熔岩 = 往上飄的火星、浮島 = 星塵、蘑菇森林 = 螢火蟲與彩色孢子、冰原 = 飄雪
  updateAmbient(dt) {
    const theme = this.hole && this.hole.course.theme;
    const N = 320;
    if (!this.ambient) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
      geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
      this.ensureSpark();
      const mat = new THREE.PointsMaterial({ map: this.sparkTex, size: 0.35, vertexColors: true, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending });
      this.ambient = new THREE.Points(geo, mat);
      this.ambient.frustumCulled = false;
      this.scene.add(this.ambient);
      this.ambData = Array.from({ length: N }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), life: 0, ph: Math.random() * 6, c: new THREE.Color(), blink: 1 + Math.random() * 2 }));
    }
    this.ambient.visible = !!theme;
    if (!theme) return;
    // [顏色們, 大小, 數量, 是否閃爍, 上下速度, 範圍]
    const conf = {
      jungle: [[0xd8ff5a, 0xfff07a, 0xa8ff8a], 0.42, 240, true, 0, 30],
      lava: [[0xff7a2a, 0xffb04a, 0xff4a1a], 0.32, 260, false, 1.2, 34],
      void: [[0xb8e6ff, 0xe0b8ff, 0xffffff], 0.3, 220, true, 0, 36],
      mushroom: [[0x7af0ff, 0xff8ae8, 0xc8ff7a, 0xb08aff], 0.45, 320, true, 0.15, 30],
      frost: [[0xffffff, 0xe8f2ff], 0.22, 320, false, -1.4, 28],
      sakura: [[0xffc8dc, 0xffe0ea, 0xf4a8c4], 0.28, 220, false, -0.5, 30],
    }[theme];
    if (!conf) { this.ambient.visible = false; return; }
    const [cols, size, n, blink, vy0, R] = conf;
    this.ambient.material.size = size;
    const cam = this.camera.position, pos = this.ambient.geometry.attributes.position.array, col = this.ambient.geometry.attributes.color.array;
    if (this.ambTheme !== theme) { this.ambTheme = theme; this.ambData.forEach((a, i) => { a.life = 0; a.c.set(cols[i % cols.length]); }); }
    for (let i = 0; i < N; i++) {
      const a = this.ambData[i];
      if (i >= n) { pos[i * 3 + 1] = -9999; continue; }
      a.life -= dt;
      const dx = a.p.x - cam.x, dz = a.p.z - cam.z;
      if (a.life <= 0 || dx * dx + dz * dz > R * R || (vy0 < 0 && a.p.y < this.hole.height(a.p.x, a.p.z))) {
        const ang = Math.random() * Math.PI * 2, r = 3 + Math.sqrt(Math.random()) * R;
        a.p.set(cam.x + Math.cos(ang) * r, 0, cam.z + Math.sin(ang) * r);
        const gh = this.hole.height(a.p.x, a.p.z);
        a.p.y = vy0 < 0 ? cam.y + 4 + Math.random() * 16 : Math.max(gh, cam.y - 25) + 0.5 + Math.random() * (theme === 'jungle' || theme === 'mushroom' ? 6 : 14);
        a.v.set((Math.random() - 0.5) * 0.6, vy0 + (vy0 > 0.5 ? Math.random() * 1.4 : (Math.random() - 0.5) * 0.3), (Math.random() - 0.5) * 0.6);
        a.life = 3 + Math.random() * 6;
      }
      a.p.addScaledVector(a.v, dt);
      a.p.x += Math.sin(this.time * 0.9 + a.ph) * (vy0 < 0 ? 0.6 : 0.25) * dt;
      a.p.y += (theme === 'jungle' || theme === 'mushroom') ? Math.sin(this.time * 1.7 + a.ph) * 0.25 * dt : 0;
      pos[i * 3] = a.p.x; pos[i * 3 + 1] = a.p.y; pos[i * 3 + 2] = a.p.z;
      // 螢火蟲：一明一滅（每隻節奏不同）
      const k = blink ? Math.max(0.05, Math.sin(this.time * a.blink + a.ph)) ** 2 : 0.85;
      col[i * 3] = a.c.r * k; col[i * 3 + 1] = a.c.g * k; col[i * 3 + 2] = a.c.b * k;
    }
    this.ambient.geometry.attributes.position.needsUpdate = true;
    this.ambient.geometry.attributes.color.needsUpdate = true;
  }

  // 把世界座標投影成畫面像素（HUD 標籤用）
  project(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(this.camera);
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    return { x: (v.x + 1) / 2 * w, y: (1 - v.y) / 2 * h, visible: v.z < 1 && v.z > -1 };
  }
}

// 讓出一個畫面更新；分頁在背景時 requestAnimationFrame 不會觸發，用 setTimeout 保底
const frame = () => new Promise(r => { requestAnimationFrame(() => r()); setTimeout(r, 60); });

// 星門中間的漩渦（白色，材質再上色）
let _swirl = null;
function swirlTexture() {
  if (_swirl) return _swirl;
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d'), img = x.createImageData(S, S);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const dx = i / S * 2 - 1, dy = j / S * 2 - 1, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    const arm = 0.5 + 0.5 * Math.sin(a * 3 + r * 14);
    const v = r > 1 ? 0 : Math.pow(arm, 2) * (1 - r) * 1.2 + Math.max(0, 0.6 - r) * 0.8;
    const o = (j * S + i) * 4; img.data[o] = img.data[o + 1] = img.data[o + 2] = 255 * clamp(v, 0, 1); img.data[o + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  _swirl = new THREE.CanvasTexture(c);
  return _swirl;
}

// 用世界座標當 UV（熔岩貼圖約 36 公尺重複一次）
function worldUv(geo) {
  const p = geo.attributes.position, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getX(i) / 36; uv[i * 2 + 1] = p.getZ(i) / 36; }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

// 自己會發光的材質（顏色 = 實例顏色）：水晶
function glowMaterial(opts, glow) {
  const m = new THREE.MeshStandardMaterial(opts);
  m.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      totalEmissiveRadiance += diffuseColor.rgb * ${glow.toFixed(2)};`);
  };
  return m;
}

// 柔和的光暈 / 煙（永遠面向鏡頭）
function glowSprite(world, pos, size, color, opacity, smoke = false) {
  world.ensureSpark();
  const m = new THREE.SpriteMaterial({ map: world.sparkTex, color, transparent: true, opacity, depthWrite: false, blending: smoke ? THREE.NormalBlending : THREE.AdditiveBlending, fog: false });
  const sp = new THREE.Sprite(m);
  sp.position.copy(pos); sp.scale.set(size, size, 1);
  return sp;
}

// 熔岩：黑色的冷卻外殼 + 發光的裂縫（可無縫重複）
function makeLavaTexture() {
  const S = 512, n = makeNoise(31);
  const c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d'), img = x.createImageData(S, S);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const a = i / S * Math.PI * 2, b = j / S * Math.PI * 2;
    const X = Math.cos(a) * 1.6, Y = Math.sin(a) * 1.6, Z = Math.cos(b) * 1.6, W = Math.sin(b) * 1.6;
    const f = n.fbm(X + Z * 0.7 + 5, Y + W * 0.7, 5);
    const cr = 1 - Math.min(1, Math.abs(n(X * 2.2 + W, Y * 2.2 + Z) * 3.2));      // 裂縫（雜訊接近 0 的細線）
    let h = clamp(0.55 + f * 0.9, 0, 1) * 0.65 + Math.pow(cr, 3) * 0.6;
    h = clamp(h, 0, 1);
    const o = (j * S + i) * 4;
    img.data[o] = 255 * clamp(h * 1.6, 0, 1); img.data[o + 1] = 255 * clamp((h - 0.35) * 1.5, 0, 1) * 0.8; img.data[o + 2] = 255 * clamp((h - 0.8) * 3, 0, 1) * 0.5; img.data[o + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// 主題天空（等距長方投影：上半是天空，下半是地平線以下）
function paintSky(theme) {
  const W = 2048, H = 1024, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d'), rng = makeRng(theme.length * 97 + 3);
  const grad = stops => { const g = x.createLinearGradient(0, 0, 0, H); stops.forEach(([t, col]) => g.addColorStop(t, col)); x.fillStyle = g; x.fillRect(0, 0, W, H); };
  const blob = (cx, cy, r, col, a, sy = 1, wrap = true) => {
    x.save(); x.translate(cx, cy); x.scale(1, sy);
    const g = x.createRadialGradient(0, 0, 0, 0, 0, r); g.addColorStop(0, col.replace('A', a)); g.addColorStop(1, col.replace('A', 0));
    x.fillStyle = g; x.beginPath(); x.arc(0, 0, r, 0, Math.PI * 2); x.fill(); x.restore();
    if (wrap && cx - r < 0) blob(cx + W, cy, r, col, a, sy, false); else if (wrap && cx + r > W) blob(cx - W, cy, r, col, a, sy, false);   // 左右接縫
  };
  const stars = (n, y0, y1, maxA) => { for (let i = 0; i < n; i++) { const a = rng() * maxA; x.fillStyle = `rgba(255,255,255,${a})`; const r = rng() < 0.03 ? 1.6 : 0.8; x.fillRect(rng() * W, y0 + rng() * (y1 - y0), r, r); } };
  if (theme === 'jungle') {
    grad([[0, '#3d86b8'], [0.32, '#7fbfd2'], [0.47, '#d9ecd0'], [0.5, '#e8efc8'], [0.53, '#a9cdb6'], [1, '#2e5a3c']]);
    for (let i = 0; i < 70; i++) blob(rng() * W, H * (0.18 + rng() * 0.28), 40 + rng() * 120, 'rgba(255,255,255,A)', 0.25 + rng() * 0.3, 0.35);
    blob(W * 0.62, H * 0.3, 160, 'rgba(255,240,200,A)', 0.55);
    blob(W * 0.62, H * 0.3, 40, 'rgba(255,255,240,A)', 1);
  } else if (theme === 'lava') {
    grad([[0, '#0c0507'], [0.25, '#2a0d0c'], [0.42, '#6e1f12'], [0.49, '#d8501c'], [0.5, '#f07a2a'], [0.52, '#8a2a14'], [1, '#1a0806']]);
    for (let i = 0; i < 90; i++) blob(rng() * W, H * (0.1 + rng() * 0.36), 60 + rng() * 160, 'rgba(20,10,10,A)', 0.35 + rng() * 0.35, 0.3);   // 火山灰雲
    for (let i = 0; i < 40; i++) blob(rng() * W, H * (0.38 + rng() * 0.1), 50 + rng() * 120, 'rgba(255,90,30,A)', 0.15 + rng() * 0.2, 0.4);
    stars(300, 0, H * 0.3, 0.5);
    blob(W * 0.3, H * 0.36, 90, 'rgba(255,160,90,A)', 0.5);
  } else if (theme === 'cliffs') {
    // 陰天的海岸：厚雲、偶爾透出的陽光
    grad([[0, '#5a6a7a'], [0.3, '#8a98a6'], [0.47, '#c4ccd2'], [0.5, '#d4d8da'], [0.53, '#7a8a94'], [1, '#3a4a54']]);
    for (let i = 0; i < 120; i++) blob(rng() * W, H * (0.05 + rng() * 0.42), 60 + rng() * 180, rng() < 0.6 ? 'rgba(90,100,112,A)' : 'rgba(230,234,238,A)', 0.2 + rng() * 0.3, 0.4);
    blob(W * 0.4, H * 0.3, 220, 'rgba(255,248,230,A)', 0.4);
  } else if (theme === 'sakura') {
    // 春天早晨：淡藍到粉橘的天空、柔和的雲
    grad([[0, '#7aa6d8'], [0.3, '#b4cbe8'], [0.44, '#f2d6dc'], [0.5, '#fbe4d4'], [0.53, '#d8c8c4'], [1, '#6a7a5a']]);
    for (let i = 0; i < 60; i++) blob(rng() * W, H * (0.15 + rng() * 0.3), 50 + rng() * 140, 'rgba(255,240,244,A)', 0.25 + rng() * 0.3, 0.35);
    blob(W * 0.25, H * 0.36, 150, 'rgba(255,230,210,A)', 0.55);
    blob(W * 0.25, H * 0.36, 34, 'rgba(255,252,240,A)', 1);
  } else if (theme === 'dunes') {
    // 沙漠的熱霾：淡藍的天，地平線一片亮金色
    grad([[0, '#5c94c8'], [0.3, '#9cc0dc'], [0.45, '#e8dcc0'], [0.5, '#f6e6c4'], [0.53, '#d8b884'], [1, '#a07a48']]);
    for (let i = 0; i < 20; i++) blob(rng() * W, H * (0.12 + rng() * 0.25), 60 + rng() * 120, 'rgba(255,255,255,A)', 0.12 + rng() * 0.15, 0.25);
    blob(W * 0.55, H * 0.26, 240, 'rgba(255,240,200,A)', 0.5);
    blob(W * 0.55, H * 0.26, 36, 'rgba(255,255,245,A)', 1);
  } else if (theme === 'mushroom') {
    grad([[0, '#060818'], [0.28, '#141a44'], [0.44, '#3a2a70'], [0.49, '#5a4a9a'], [0.51, '#3f6a8a'], [0.54, '#1e1e44'], [1, '#0a0a1c']]);
    stars(3000, 0, H * 0.48, 0.9);
    for (let i = 0; i < 30; i++) blob(rng() * W, H * (0.3 + rng() * 0.18), 40 + rng() * 140, rng() < 0.5 ? 'rgba(80,220,255,A)' : 'rgba(255,110,220,A)', 0.05 + rng() * 0.08, 0.5);
    // 兩個月亮
    const moon = (mx, my, r, c0, c1) => { const g2 = x.createRadialGradient(mx - r * 0.3, my - r * 0.3, r * 0.1, mx, my, r); g2.addColorStop(0, c0); g2.addColorStop(1, c1); blob(mx, my, r * 3, 'rgba(200,210,255,A)', 0.18); x.fillStyle = g2; x.beginPath(); x.arc(mx, my, r, 0, Math.PI * 2); x.fill(); };
    moon(W * 0.62, H * 0.22, 70, '#f4f2ff', '#8a8ac8');
    moon(W * 0.7, H * 0.3, 26, '#ffd8f0', '#b05a98');
  } else if (theme === 'frost') {
    grad([[0, '#040814'], [0.3, '#0c1a38'], [0.45, '#2a4a78'], [0.495, '#8aa8d0'], [0.5, '#b8cce4'], [0.52, '#8aa0c0'], [1, '#d8e2f0']]);
    stars(4000, 0, H * 0.46, 1);
    // 靜態的極光（動態的那層另外畫）
    for (let i = 0; i < 160; i++) {
      const cx = rng() * W, top = H * (0.08 + rng() * 0.12), len = H * (0.12 + rng() * 0.18), wd = 6 + rng() * 22;
      const g2 = x.createLinearGradient(0, top, 0, top + len);
      const pink = rng() < 0.25;
      g2.addColorStop(0, pink ? 'rgba(220,90,255,0)' : 'rgba(80,255,170,0)'); g2.addColorStop(0.6, pink ? 'rgba(220,90,255,0.12)' : 'rgba(80,255,170,0.16)'); g2.addColorStop(1, 'rgba(80,255,170,0)');
      x.fillStyle = g2; x.fillRect(cx + Math.sin(cx * 0.01) * 40, top, wd, len);
    }
    blob(W * 0.35, H * 0.25, 30, 'rgba(240,248,255,A)', 1);
    blob(W * 0.35, H * 0.25, 120, 'rgba(200,220,255,A)', 0.2);
  } else {
    grad([[0, '#05030c'], [0.3, '#120a2a'], [0.47, '#3a2468'], [0.5, '#4a3080'], [0.53, '#2c1c50'], [1, '#0c0618']]);
    // 星雲
    for (let i = 0; i < 26; i++) blob(rng() * W, H * (0.08 + rng() * 0.4), 80 + rng() * 260, rng() < 0.5 ? 'rgba(220,70,200,A)' : 'rgba(60,170,255,A)', 0.06 + rng() * 0.12, 0.6 + rng() * 0.5);
    stars(5000, 0, H * 0.5, 1); stars(900, H * 0.5, H, 0.35);
    // 環狀行星
    const px = W * 0.7, py = H * 0.28, pr = 120;
    x.save(); x.translate(px, py); x.rotate(-0.35);
    const ring = (w, a) => { x.strokeStyle = `rgba(230,210,255,${a})`; x.lineWidth = w; x.beginPath(); x.ellipse(0, 0, pr * 2.1, pr * 0.5, 0, 0, Math.PI * 2); x.stroke(); };
    ring(18, 0.18); ring(6, 0.35);
    const pg = x.createRadialGradient(-pr * 0.4, -pr * 0.4, pr * 0.1, 0, 0, pr);
    pg.addColorStop(0, '#f2c9ff'); pg.addColorStop(0.5, '#a05ad8'); pg.addColorStop(1, '#2a104a');
    x.fillStyle = pg; x.beginPath(); x.arc(0, 0, pr, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.ellipse(0, 0, pr * 2.1, pr * 0.5, 0, 0, Math.PI); x.strokeStyle = 'rgba(240,220,255,0.55)'; x.lineWidth = 7; x.stroke();     // 前面那半圈環
    x.restore();
    // 小衛星
    const mg = x.createRadialGradient(W * 0.22 - 10, H * 0.2 - 10, 2, W * 0.22, H * 0.2, 34);
    mg.addColorStop(0, '#e8fbff'); mg.addColorStop(1, '#3a7a9a'); x.fillStyle = mg; x.beginPath(); x.arc(W * 0.22, H * 0.2, 34, 0, Math.PI * 2); x.fill();
  }
  return c;
}

// 奇幻主題的樹 / 地標形狀（單位大小，擺放時縮放）
function fantasyGeos(nz, blob, colorize) {
  const clean = gg => { if (gg.attributes.uv) gg.deleteAttribute('uv'); return gg.index ? gg.toNonIndexed() : gg; };
  // 葉片：細長、往下垂的薄片（長 1，從原點往 +x 長）
  const frond = (len, wid, droop) => {
    const gg = new THREE.PlaneGeometry(len, wid, 8, 2);
    gg.translate(len / 2, 0, 0); gg.rotateX(-Math.PI / 2);
    const p = gg.attributes.position;
    for (let i = 0; i < p.count; i++) { const t = p.getX(i) / len; p.setZ(i, p.getZ(i) * (1 - t * 0.85)); p.setY(i, -droop * t * t + 0.25 * t); }
    return clean(gg);
  };
  // 棕櫚樹幹：往 +x 彎的錐形（高 1）
  const pt = new THREE.CylinderGeometry(0.6, 1, 1, 8, 10, true);
  pt.translate(0, 0.5, 0);
  { const p = pt.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), k = 1 + 0.08 * Math.sin(y * 40); p.setX(i, p.getX(i) * k + y * y * 6); p.setZ(i, p.getZ(i) * k); } }
  pt.computeVertexNormals();
  // 棕櫚樹冠：11 片下垂的大葉
  const crown = [];
  for (let i = 0; i < 11; i++) { const f = frond(1, 0.32, 0.75); f.rotateZ(0.15); f.rotateY(i / 11 * Math.PI * 2 + (i % 2) * 0.2); crown.push(f); }
  const palmCrown = colorize(mergeGeometries(crown), [0.9, 1, 0.8], [0.45, 0.55, 0.4]);
  palmCrown.computeVertexNormals();
  // 蕨類：從地面往外翻的葉子
  const fr = [];
  for (let i = 0; i < 12; i++) { const f = frond(1, 0.22, 0.6); f.rotateZ(0.9 + (i % 3) * 0.15); f.rotateY(i / 12 * Math.PI * 2); f.translate(0, 0.05, 0); fr.push(f); }
  const fern = colorize(mergeGeometries(fr), [0.85, 1, 0.75], [0.35, 0.45, 0.3]);
  fern.computeVertexNormals();
  // 水晶：幾根六角尖柱（高 1）
  const cs = [];
  const shard = (h, r, ax, az, ox, oz) => {
    const body = new THREE.CylinderGeometry(r, r * 0.8, h * 0.78, 6, 1); body.translate(0, h * 0.39, 0);
    const tip = new THREE.ConeGeometry(r, h * 0.22, 6, 1); tip.translate(0, h * 0.89, 0);
    const m = mergeGeometries([clean(body), clean(tip)]); m.rotateX(ax); m.rotateZ(az); m.translate(ox, 0, oz); return m;
  };
  cs.push(shard(1, 0.2, 0, 0, 0, 0), shard(0.7, 0.15, 0.3, 0.25, 0.2, 0.1), shard(0.55, 0.13, -0.35, -0.2, -0.18, -0.1), shard(0.45, 0.12, 0.2, -0.45, -0.1, 0.22), shard(0.35, 0.1, -0.4, 0.5, 0.15, -0.2));
  const crystal = mergeGeometries(cs); crystal.computeVertexNormals();
  // 玄武岩柱：高高低低的六角柱（高 1、半徑 1）
  const bs = [];
  const rr = makeRng(17);
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2, r = i === 0 ? 0 : 0.55, h = i === 0 ? 1 : 0.35 + rr() * 0.55;
    const cg = new THREE.CylinderGeometry(0.34, 0.36, h, 6, 1); cg.translate(Math.cos(a) * r, h / 2, Math.sin(a) * r); bs.push(clean(cg));
  }
  const basalt = mergeGeometries(bs); basalt.computeVertexNormals();
  // 枯樹：歪斜的樹幹 + 幾根光禿的枝
  const br = [];
  const limb = (len, r, rx, rz, y) => { const cg = new THREE.CylinderGeometry(r * 0.35, r, len, 5, 1); cg.translate(0, len / 2, 0); cg.rotateZ(rz); cg.rotateY(rx); cg.translate(0, y, 0); return clean(cg); };
  br.push(limb(1, 0.06, 0, 0.08, 0), limb(0.45, 0.03, 0.4, 0.9, 0.55), limb(0.4, 0.028, 2.6, 0.8, 0.68), limb(0.35, 0.025, 4.4, 1.0, 0.45), limb(0.3, 0.02, 1.4, 0.6, 0.82));
  const deadtree = mergeGeometries(br); deadtree.computeVertexNormals();
  // 石柱山：粗糙的高柱（高 1、半徑 1），頂上一叢綠
  const kc = new THREE.CylinderGeometry(0.75, 1, 1, 14, 16, false);
  kc.translate(0, 0.5, 0);
  { const p = kc.attributes.position; for (let i = 0; i < p.count; i++) { const X = p.getX(i), Y = p.getY(i), Z = p.getZ(i), a = Math.atan2(Z, X); const k = 1 + 0.18 * nz(Math.cos(a) * 2, Y * 4) + 0.08 * nz(a * 3, Y * 12); p.setXYZ(i, X * k, Y, Z * k); } }
  const kcap = blob(0.95, 2); kcap.scale(0.92, 0.2, 0.92); kcap.translate(0, 1.0, 0);
  const vcol = (gg, fn) => { const p = gg.attributes.position, cc = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) { const col = fn(p.getX(i), p.getY(i), p.getZ(i)); cc[i * 3] = col[0]; cc[i * 3 + 1] = col[1]; cc[i * 3 + 2] = col[2]; } gg.setAttribute('color', new THREE.BufferAttribute(cc, 3)); return clean(gg); };
  const karst = mergeGeometries([
    vcol(kc, (X, Y) => { const n = 0.85 + 0.3 * Math.abs(nz(X * 5, Y * 9)); const g = Math.max(0, nz(X * 3 + 7, Y * 6) * 1.5); return [0.36 * n * (1 - g * 0.4), 0.4 * n + g * 0.12, 0.34 * n * (1 - g * 0.4)]; }),
    vcol(kcap, (X, Y, Z) => { const n = 0.8 + 0.4 * Math.abs(nz(X * 6, Z * 6)); return [0.1 * n, 0.26 * n, 0.09 * n]; }),
  ]);
  karst.computeVertexNormals();
  // 浮空島：上面是草地、下面是倒錐形的岩石（頂面在 y = 0，底到 y = -1）
  const top = new THREE.CylinderGeometry(1, 0.96, 0.06, 18, 1); top.translate(0, -0.03, 0);
  const under = new THREE.ConeGeometry(0.96, 0.94, 18, 6); under.rotateX(Math.PI); under.translate(0, -0.06 - 0.47, 0);
  { const p = under.attributes.position; for (let i = 0; i < p.count; i++) { const X = p.getX(i), Y = p.getY(i), Z = p.getZ(i), a = Math.atan2(Z, X); const k = 1 + 0.22 * nz(Math.cos(a) * 2.5, Y * 5) ; p.setXYZ(i, X * k, Y, Z * k); } }
  const isle = mergeGeometries([vcol(top, () => [0.22, 0.62, 0.56]), vcol(under, (X, Y) => { const t = clamp(-Y, 0, 1); const n = 0.8 + 0.3 * Math.abs(nz(X * 6, Y * 6)); return [(0.42 - t * 0.25) * n, (0.36 - t * 0.24) * n, (0.55 - t * 0.25) * n]; })]);
  isle.computeVertexNormals();
  // 火山：中間有火山口的錐形（高 1、半徑 1），越往上越紅
  const prof = [[0.001, 0], [1, 0], [0.6, 0.35], [0.28, 0.75], [0.13, 0.96], [0.1, 0.98], [0.07, 0.9], [0.001, 0.88]].map(([r, y]) => new THREE.Vector2(r, y));
  const vc = new THREE.LatheGeometry(prof, 40);
  { const p = vc.attributes.position; for (let i = 0; i < p.count; i++) { const X = p.getX(i), Y = p.getY(i), Z = p.getZ(i), a = Math.atan2(Z, X); const k = 1 + 0.12 * nz(Math.cos(a) * 3, Y * 6) * (1 - Y); p.setXYZ(i, X * k, Y, Z * k); } }
  const volcano = vcol(vc, (X, Y, Z) => { const hot = clamp((Y - 0.8) / 0.2, 0, 1); const streak = Math.max(0, Math.sin(Math.atan2(Z, X) * 7) - 0.85) * 4 * clamp((Y - 0.4) / 0.5, 0, 1); return [0.1 + hot * 0.9 + streak * 0.8, 0.07 + hot * 0.3 + streak * 0.25, 0.07]; });
  volcano.computeVertexNormals();
  // 蘑菇：菇柄（高 1、半徑 1）與半球形菇傘（半徑 1、頂在 y = 1）
  const shroomStem = new THREE.CylinderGeometry(0.8, 1, 1, 10, 1); shroomStem.translate(0, 0.5, 0);
  { const p = shroomStem.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) + Math.sin(y * 2.5) * 0.6); } }
  shroomStem.computeVertexNormals();
  const shroomCap = new THREE.SphereGeometry(1, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2); shroomCap.translate(0, -0.15, 0);
  // 冰山：尖銳的冰峰（高 1、半徑 1），越高越白
  const ib = new THREE.ConeGeometry(1, 1, 9, 6); ib.translate(0, 0.5, 0);
  { const p = ib.attributes.position; for (let i = 0; i < p.count; i++) { const X = p.getX(i), Y = p.getY(i), Z = p.getZ(i), a = Math.atan2(Z, X); const k = 1 + 0.3 * nz(Math.cos(a) * 3, Y * 4) + 0.15 * nz(a * 4, Y * 9); p.setXYZ(i, X * k, Y * (1 + 0.15 * nz(X * 3, Z * 3)), Z * k); } }
  const iceberg = vcol(ib, (X, Y, Z) => { const n = 0.85 + 0.2 * Math.abs(nz(X * 7, Z * 7 + Y * 5)); const b = clamp(0.55 + Y * 0.6, 0, 1); return [0.62 * b * n + 0.2, 0.74 * b * n + 0.2, 0.9 * n]; });
  iceberg.computeVertexNormals();
  // 竹叢：幾根細長的竹竿（高 1、半徑 1）+ 頂上的竹葉
  const bb = [], br2 = makeRng(23);
  for (let i = 0; i < 9; i++) {
    const a = br2() * 6.28, r = br2() * 0.7, h = 0.7 + br2() * 0.3, x0 = Math.cos(a) * r, z0 = Math.sin(a) * r;
    const cane = new THREE.CylinderGeometry(0.035, 0.045, h, 5, 4); cane.translate(x0, h / 2, z0);
    { const p = cane.attributes.position; for (let k = 0; k < p.count; k++) { const y = p.getY(k); p.setX(k, p.getX(k) + y * y * 0.12 * Math.cos(a)); p.setZ(k, p.getZ(k) + y * y * 0.12 * Math.sin(a)); } }
    bb.push(vcol(cane, (X, Y) => [0.24 + 0.06 * Math.sin(Y * 30), 0.4, 0.14]));
    const leaf = blob(0.22, 1); leaf.scale(1, 0.5, 1); leaf.translate(x0 + h * h * 0.12 * Math.cos(a), h - 0.05, z0 + h * h * 0.12 * Math.sin(a));
    bb.push(vcol(leaf, (X, Y, Z) => { const n = 0.8 + 0.4 * Math.abs(nz(X * 9, Z * 9)); return [0.25 * n, 0.5 * n, 0.16 * n]; }));
  }
  const bamboo = mergeGeometries(bb); bamboo.computeVertexNormals();
  // 雪峰：岩石山、上面是雪（高 1、半徑 1）
  const pk = new THREE.ConeGeometry(1, 1, 12, 10); pk.translate(0, 0.5, 0);
  { const p = pk.attributes.position; for (let i = 0; i < p.count; i++) { const X = p.getX(i), Y = p.getY(i), Z = p.getZ(i), a = Math.atan2(Z, X); const k = 1 + 0.28 * nz(Math.cos(a) * 2.5, Y * 3) + 0.12 * nz(a * 5, Y * 8); p.setXYZ(i, X * k, Y * (1 + 0.12 * nz(X * 2, Z * 2)), Z * k); } }
  const peak = vcol(pk, (X, Y, Z) => { const snow = clamp((Y - 0.7 + 0.1 * nz(X * 6, Z * 6)) / 0.08, 0, 1); const n = 0.75 + 0.35 * Math.abs(nz(X * 8, Y * 8 + Z * 3)); const rock = [0.3 * n, 0.32 * n, 0.34 * n]; return rock.map(c => c + (0.95 - c) * snow); });
  peak.computeVertexNormals();
  const ms = new THREE.ConeGeometry(1, 1, 12, 8); ms.translate(0, 0.5, 0);
  { const p = ms.attributes.position; for (let i = 0; i < p.count; i++) { const X = p.getX(i), Y = p.getY(i), Z = p.getZ(i), a = Math.atan2(Z, X); const k = 1 + 0.3 * nz(Math.cos(a) * 2, Y * 2.5); p.setXYZ(i, X * k, Y * 0.8, Z * k); } }
  const mesa = vcol(ms, (X, Y) => { const n = 0.85 + 0.2 * Math.abs(nz(X * 5, Y * 9)); return [(0.7 + Y * 0.1) * n, (0.44 + Y * 0.08) * n, (0.56 + Y * 0.06) * n]; });
  mesa.computeVertexNormals();
  return { palmTrunk: pt, palmCrown, fern, crystal, basalt, deadtree, karst, isle, volcano, shroomStem, shroomCap, iceberg, bamboo, peak, mesa };
}

function avgLum(tex) {
  try {
    const img = tex.image;
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0, 64, 64);
    const d = x.getImageData(0, 0, 64, 64).data;
    let s = 0;
    for (let i = 0; i < d.length; i += 4) s += (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
    // 貼圖是 sRGB，著色器取樣時已轉線性，平均值也轉線性
    return Math.pow(s / (d.length / 4), 2.2);
  } catch (e) { return 0; }
}

function heightToNormal(size, hf) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d');
  const img = x.createImageData(size, size);
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const hx = hf((i + 1) % size, j) - hf((i - 1 + size) % size, j);
    const hy = hf(i, (j + 1) % size) - hf(i, (j - 1 + size) % size);
    const l = Math.hypot(hx, hy, 1);
    const o = (j * size + i) * 4;
    img.data[o] = (-hx / l * 0.5 + 0.5) * 255; img.data[o + 1] = (-hy / l * 0.5 + 0.5) * 255; img.data[o + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[o + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function makeWaterNormal() {
  const n = makeNoise(5);
  const S = 256;
  // 可無縫重複：在圓環上取樣雜訊
  const hf = (i, j) => {
    const a = i / S * Math.PI * 2, b = j / S * Math.PI * 2;
    return n.fbm(Math.cos(a) * 2 + 10, Math.sin(a) * 2 + Math.cos(b) * 2, 4) * 6 + n(Math.sin(b) * 3, Math.cos(a) * 3) * 2;
  };
  const t = heightToNormal(S, hf);
  t.repeat.set(60, 60);
  return t;
}

function makeDimpleNormal() {
  const S = 256;
  const hf = (i, j) => {
    const u = i / S * 18, v = j / S * 10;
    const fu = u - Math.floor(u) - 0.5, fv = v - Math.floor(v + (Math.floor(u) % 2) * 0.5) - 0.5;
    const r = Math.hypot(fu, fv);
    return r < 0.42 ? -Math.cos(r / 0.42 * Math.PI / 2) * 3 : 0;
  };
  return heightToNormal(S, hf);
}
