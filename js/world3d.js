const WORLD = {
  W: 4450, H: 3750, ROAD: 110, LANE: 27,
  Xs: [150, 600, 1050, 1500, 1950, 2400, 2850, 3300, 3660],
  Ys: [150, 600, 1050, 1500, 1950, 2400, 2850, 3300],
  SAND_X: 3760, WATER_X: 3900, CITY_X_MAX: 3660
};

const Colliders = {
  cells: new Map(), cs: 250,
  add(item) {
    const r = item.r || Math.max(item.hw, item.hd);
    for (let cx = Math.floor((item.x - r) / this.cs); cx <= Math.floor((item.x + r) / this.cs); cx++)
      for (let cz = Math.floor((item.z - r) / this.cs); cz <= Math.floor((item.z + r) / this.cs); cz++) {
        const k = cx + ',' + cz;
        if (!this.cells.has(k)) this.cells.set(k, []);
        this.cells.get(k).push(item);
      }
  },
  query(x, z, r) {
    r = r || 0;
    const out = [];
    for (let cx = Math.floor((x - r) / this.cs); cx <= Math.floor((x + r) / this.cs); cx++)
      for (let cz = Math.floor((z - r) / this.cs); cz <= Math.floor((z + r) / this.cs); cz++) {
        const arr = this.cells.get(cx + ',' + cz);
        if (arr) for (const it of arr) if (out.indexOf(it) === -1) out.push(it);
      }
    return out;
  }
};

function noiseCanvas(w, h, base, dots) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < dots; i++) {
    g.fillStyle = 'rgba(' + Math.floor(Math.random() * 255) + ',' + Math.floor(Math.random() * 255) + ',' + Math.floor(Math.random() * 255) + ',' + (0.03 + Math.random() * 0.05) + ')';
    g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1 + Math.random() * 3);
  }
  return c;
}

function tileTexture(base, dotCount, lineColor, tile) {
  const c = noiseCanvas(128, 128, base, dotCount);
  const g = c.getContext('2d');
  if (tile) {
    g.strokeStyle = lineColor; g.lineWidth = 2;
    for (let i = 0; i <= 128; i += 128 / tile) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke();
      g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function makeRoadTexture() {
  const c = noiseCanvas(128, 128, '#33373d', 600);
  const g = c.getContext('2d');
  g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(0, 64); g.lineTo(128, 64); g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function makeWindowsTexture(base, lit) {
  const c1 = document.createElement('canvas'); c1.width = 128; c1.height = 256;
  const g = c1.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, base);
  grad.addColorStop(1, shade(base, 0.8));
  g.fillStyle = grad; g.fillRect(0, 0, 128, 256);
  for (let ry = 0; ry < 9; ry++) {
    if (Math.random() < 0.12) {
      g.fillStyle = 'rgba(0,0,0,.12)';
      g.fillRect(10, 6 + ry * 28, 108, 24);
      continue;
    }
    for (let rx = 0; rx < 4; rx++) {
      const wx = 14 + rx * 28, wy = 10 + ry * 28;
      g.fillStyle = '#141d33';
      g.fillRect(wx, wy, 19, 15);
      g.fillStyle = 'rgba(190,220,255,' + (0.06 + Math.random() * 0.25) + ')';
      g.fillRect(wx + 2, wy + 2, 7, 5);
      g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = 2;
      g.strokeRect(wx, wy, 19, 15);
    }
  }
  const c2 = document.createElement('canvas'); c2.width = 128; c2.height = 256;
  const g2 = c2.getContext('2d');
  g2.fillStyle = '#000'; g2.fillRect(0, 0, 128, 256);
  for (let ry = 0; ry < 9; ry++) for (let rx = 0; rx < 4; rx++) {
    if (Math.random() < lit) {
      g2.fillStyle = Math.random() < 0.82 ? '#ffca7a' : '#8fd8ff';
      g2.fillRect(14 + rx * 28, 10 + ry * 28, 19, 15);
    }
  }
  return { map: new THREE.CanvasTexture(c1), emissive: new THREE.CanvasTexture(c2) };
}

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 255) * f), g2 = Math.min(255, ((n >> 8) & 255) * f), b = Math.min(255, (n & 255) * f);
  return 'rgb(' + Math.round(r) + ',' + Math.round(g2) + ',' + Math.round(b) + ')';
}

function makePalm() {
  const g = new THREE.Group();
  const bend = (Math.random() - 0.5) * 0.3;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 4.6, 56, 7), new THREE.MeshLambertMaterial({ color: 0x92744e }));
  trunk.position.y = 28; trunk.rotation.z = bend;
  trunk.castShadow = true;
  g.add(trunk);
  const crown = new THREE.Group();
  crown.position.set(-Math.sin(bend) * 54, 54, 0);
  for (let i = 0; i < 8; i++) {
    const leaf = new THREE.Mesh(new THREE.PlaneGeometry(7, 38), new THREE.MeshLambertMaterial({ color: i % 2 ? 0x2f9e57 : 0x3cb371, side: THREE.DoubleSide }));
    leaf.geometry.translate(0, 17, 0);
    leaf.position.y = 2;
    leaf.rotation.y = (i / 8) * Math.PI * 2;
    leaf.rotation.z = -0.85 - Math.random() * 0.25;
    leaf.castShadow = true;
    crown.add(leaf);
  }
  const coco = new THREE.Mesh(new THREE.SphereGeometry(2.6, 6, 5), new THREE.MeshLambertMaterial({ color: 0x6b4f2a }));
  coco.position.y = -3; crown.add(coco);
  g.add(crown);
  g.userData.crown = crown;
  return g;
}

const City = {
  group: null, buildings: [], spray: { x: 3480, z: 2050 }, hospital: { x: 1050, z: 2050 },
  waterMesh: null, palms: [], interiors: [], skyDay: new THREE.Color(0x87c5eb), skyNight: new THREE.Color(0x070a1c),
  windowMats: null,
  INTERIOR_NAMES: ['Malibu Club', 'Café Néon', 'Hôtel Flamingo', 'Bar Bourbon', 'Arcade Miami', 'Studio 84', 'Disco Tropico', 'Librairie Vice'],

  build(scene) {
    this.group = new THREE.Group();
    scene.add(this.group);

    const grassTex = tileTexture('#4f8a52', 900, null, null); grassTex.repeat.set(40, 34);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.W + 150, WORLD.H + 150), new THREE.MeshLambertMaterial({ map: grassTex }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(WORLD.W / 2 - 100, 0, WORLD.H / 2);
    ground.receiveShadow = true;
    this.group.add(ground);

    const swTex = tileTexture('#a3a6ab', 350, 'rgba(0,0,0,.16)', 6); swTex.repeat.set(40, 400);
    const asphalt = makeRoadTexture(); asphalt.repeat.set(2, 100);
    const concrete = new THREE.MeshLambertMaterial({ map: swTex });
    const roadMat = new THREE.MeshLambertMaterial({ map: asphalt });
    const lineMat = new THREE.MeshLambertMaterial({ color: 0xe6e2cf });

    for (const x of WORLD.Xs) {
      const sw = new THREE.Mesh(new THREE.PlaneGeometry(170, WORLD.H), concrete);
      sw.rotation.x = -Math.PI / 2; sw.position.set(x, 0.01, WORLD.H / 2); sw.receiveShadow = true; this.group.add(sw);
      const rd = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.ROAD, WORLD.H), roadMat);
      rd.rotation.x = -Math.PI / 2; rd.position.set(x, 0.03, WORLD.H / 2); rd.receiveShadow = true; this.group.add(rd);
      for (let z = 40; z < WORLD.H; z += 90) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(3, 34), lineMat);
        dash.rotation.x = -Math.PI / 2; dash.position.set(x, 0.05, z); this.group.add(dash);
      }
    }
    for (const z of WORLD.Ys) {
      const sw = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.CITY_X_MAX + 160, 170), concrete);
      sw.rotation.x = -Math.PI / 2; sw.position.set((WORLD.CITY_X_MAX + 160) / 2 - 80, 0.015, z); sw.receiveShadow = true; this.group.add(sw);
      const rd = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.CITY_X_MAX + 120, WORLD.ROAD), roadMat);
      rd.rotation.x = -Math.PI / 2; rd.position.set(WORLD.CITY_X_MAX / 2, 0.035, z); rd.receiveShadow = true; this.group.add(rd);
      for (let x = 40; x < WORLD.CITY_X_MAX; x += 90) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(34, 3), lineMat);
        dash.rotation.x = -Math.PI / 2; dash.position.set(x, 0.05, z); this.group.add(dash);
      }
    }

    const crossMat = new THREE.MeshLambertMaterial({ color: 0xe9e9e2 });
    for (const x of WORLD.Xs) for (const z of WORLD.Ys) {
      for (let s = -3; s <= 3; s++) {
        const a = new THREE.Mesh(new THREE.PlaneGeometry(7, 26), crossMat);
        a.rotation.x = -Math.PI / 2; a.position.set(x + s * 13, 0.06, z - WORLD.ROAD / 2 - 16); this.group.add(a);
        const b = new THREE.Mesh(new THREE.PlaneGeometry(7, 26), crossMat);
        b.rotation.x = -Math.PI / 2; b.position.set(x + s * 13, 0.06, z + WORLD.ROAD / 2 + 16); this.group.add(b);
        const c = new THREE.Mesh(new THREE.PlaneGeometry(26, 7), crossMat);
        c.rotation.x = -Math.PI / 2; c.position.set(x - WORLD.ROAD / 2 - 16, 0.06, z + s * 13); this.group.add(c);
        const d = new THREE.Mesh(new THREE.PlaneGeometry(26, 7), crossMat);
        d.rotation.x = -Math.PI / 2; d.position.set(x + WORLD.ROAD / 2 + 16, 0.06, z + s * 13); this.group.add(d);
      }
    }

    const palettes = ['#e794b4', '#8fd0cf', '#f2d47f', '#b8a8ea', '#e8e2d4', '#7fc3e8', '#e8a98a', '#f5f0e6'];
    const mats = palettes.map(p => {
      const t = makeWindowsTexture(p, 0.34);
      const side = new THREE.MeshPhongMaterial({ map: t.map, emissive: new THREE.Color(0x000000), emissiveMap: t.emissive, emissiveIntensity: 0, shininess: 22 });
      const top = new THREE.MeshLambertMaterial({ color: new THREE.Color(p).multiplyScalar(0.42) });
      return { side, top };
    });
    this.windowMats = mats.map(m => m.side);

    const parkSet = new Set();
    while (parkSet.size < 9) parkSet.add(Math.floor(Math.random() * 90));
    let blockIdx = 0;

    const boundsX = [0].concat(WORLD.Xs).concat([WORLD.SAND_X]);
    const boundsY = [0].concat(WORLD.Ys).concat([WORLD.H]);
    for (let i = 0; i < boundsX.length - 1; i++) {
      for (let j = 0; j < boundsY.length - 1; j++) {
        const x0 = boundsX[i] + (i === 0 ? 40 : 67), x1 = boundsX[i + 1] - 67;
        const z0 = boundsY[j] + (j === 0 ? 40 : 67), z1 = boundsY[j + 1] - (j === boundsY.length - 2 ? 40 : 67);
        const bw = x1 - x0, bd = z1 - z0;
        if (bw < 60 || bd < 60) { blockIdx++; continue; }
        const cxm = (x0 + x1) / 2, czm = (z0 + z1) / 2;
        const distC = Math.hypot((cxm - 1800) / 1800, (czm - 1800) / 1800);
        if (parkSet.has(blockIdx)) {
          const gt = tileTexture('#549a52', 900, null, null); gt.repeat.set(bw / 100, bd / 100);
          const grass = new THREE.Mesh(new THREE.PlaneGeometry(bw, bd), new THREE.MeshLambertMaterial({ map: gt }));
          grass.rotation.x = -Math.PI / 2; grass.position.set(cxm, 0.02, czm); grass.receiveShadow = true; this.group.add(grass);
          for (let p = 0; p < 6; p++) {
            const px = x0 + 20 + Math.random() * (bw - 40), pz = z0 + 20 + Math.random() * (bd - 40);
            const palm = makePalm(); palm.position.set(px, 0, pz); this.group.add(palm);
            this.palms.push(palm);
            Colliders.add({ x: px, z: pz, r: 6 });
          }
          blockIdx++; continue;
        }
        const cols = bw > 280 ? 2 : 1, rows = bd > 280 ? 2 : 1;
        for (let ci = 0; ci < cols; ci++) for (let cj = 0; cj < rows; cj++) {
          if (Math.random() < 0.12) continue;
          const cw = (bw - (cols - 1) * 16) / cols, cd = (bd - (rows - 1) * 16) / rows;
          const bx = x0 + ci * (cw + 16) + cw / 2, bz = z0 + cj * (cd + 16) + cd / 2;
          const hw = cw / 2 - 4, hd = cd / 2 - 4;
          const hgt = 26 + Math.random() * 90 + Math.max(0, 1 - distC) * 110;
          const m = mats[Math.floor(Math.random() * mats.length)];
          const mesh = new THREE.Mesh(new THREE.BoxGeometry(hw * 2, hgt, hd * 2), [m.side, m.side, m.top, m.top, m.side, m.side]);
          mesh.position.set(bx, hgt / 2, bz);
          mesh.castShadow = true; mesh.receiveShadow = true;
          this.group.add(mesh);
          const para = new THREE.Mesh(new THREE.BoxGeometry(hw * 2 + 4, 5, hd * 2 + 4), new THREE.MeshLambertMaterial({ color: new THREE.Color(p).multiplyScalar(0.32) }));
          para.position.set(bx, hgt + 2, bz);
          this.group.add(para);
          if (Math.random() < 0.5) {
            const ac = new THREE.Mesh(new THREE.BoxGeometry(12, 5, 10), new THREE.MeshLambertMaterial({ color: 0x8f959c }));
            ac.position.set(bx + (Math.random() - 0.5) * hw, hgt + 4, bz + (Math.random() - 0.5) * hd);
            this.group.add(ac);
          }
          this.buildings.push({ x: bx, z: bz, hw, hd, h: hgt });
          Colliders.add({ x: bx, z: bz, hw, hd });
        }
        blockIdx++;
      }
    }

    const sandTex = tileTexture('#ead9a0', 800, null, null); sandTex.repeat.set(8, 40);
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.W - WORLD.SAND_X + 120, WORLD.H + 80), new THREE.MeshLambertMaterial({ map: sandTex }));
    sand.rotation.x = -Math.PI / 2; sand.position.set(WORLD.SAND_X + (WORLD.W - WORLD.SAND_X + 120) / 2, 0.005, WORLD.H / 2);
    sand.receiveShadow = true;
    this.group.add(sand);
    for (let z = 100; z < WORLD.H; z += 130) {
      const palm = makePalm(); palm.position.set(WORLD.SAND_X + 30 + Math.random() * 40, 0, z); this.group.add(palm);
      this.palms.push(palm);
      Colliders.add({ x: palm.position.x, z, r: 6 });
    }
    const wt = tileTexture('#1a6fd4', 300, 'rgba(255,255,255,.2)', 8);
    this.waterMesh = new THREE.Mesh(new THREE.PlaneGeometry(1000, WORLD.H + 400), new THREE.MeshPhongMaterial({ color: 0x1a6fd4, map: wt, transparent: true, opacity: 0.93, shininess: 120 }));
    this.waterMesh.rotation.x = -Math.PI / 2; this.waterMesh.position.set(WORLD.WATER_X + 500, 0.2, WORLD.H / 2);
    this.group.add(this.waterMesh);

    this.buildInteriors();
  },

  buildInteriors() {
    const candidates = this.buildings.filter(b => b.hw > 26 && b.hw < 80 && b.hd > 26 && b.hd < 80);
    const chosen = [];
    for (const b of candidates) {
      if (chosen.length >= 8) break;
      let bestRoad = null, bestD = 1e9, axis = 'x';
      for (const rx of WORLD.Xs) { const d = Math.abs((b.x - b.hw) - rx); if (d < bestD) { bestD = d; bestRoad = rx; axis = 'x'; } if (Math.abs((b.x + b.hw) - rx) < bestD) { bestD = Math.abs((b.x + b.hw) - rx); bestRoad = rx; axis = 'x'; } }
      for (const rz of WORLD.Ys) { const d = Math.abs((b.z - b.hd) - rz); if (d < bestD) { bestD = d; bestRoad = rz; axis = 'z'; } if (Math.abs((b.z + b.hd) - rz) < bestD) { bestD = Math.abs((b.z + b.hd) - rz); bestRoad = rz; axis = 'z'; } }
      if (bestD > 60) continue;
      if (chosen.some(c => Math.hypot(c.door.x - b.x, c.door.z - b.z) < 500)) continue;
      const door = axis === 'x'
        ? { x: (b.x < bestRoad ? b.x - b.hw - 8 : b.x + b.hw + 8), z: b.z }
        : { x: b.x, z: (b.z < bestRoad ? b.z - b.hd - 8 : b.z + b.hd + 8) };
      chosen.push({ b, door, name: this.INTERIOR_NAMES[chosen.length % this.INTERIOR_NAMES.length] });
    }
    const roomTex = tileTexture('#6e5a7a', 400, 'rgba(0,0,0,.12)', 8);
    chosen.forEach((c, i) => {
      const bx = 500 + i * 600, bz = WORLD.H + 700;
      const S = 300;
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(S, S), new THREE.MeshLambertMaterial({ map: roomTex }));
      floor.rotation.x = -Math.PI / 2; floor.position.set(bx, 0.2, bz); floor.receiveShadow = true;
      this.group.add(floor);
      const wallMat = new THREE.MeshLambertMaterial({ color: 0xc4b5d6 });
      const TH = 8, HGT = 11;
      const walls = [
        [0, -S / 2, S, TH], [0, S / 2, S, TH], [-S / 2, 0, TH, S], [S / 2, 0, TH, S]
      ];
      for (const [ox, oz, w2, d2] of walls) {
        const w = new THREE.Mesh(new THREE.BoxGeometry(w2, HGT, d2), wallMat);
        w.position.set(bx + ox, HGT / 2, bz + oz); w.castShadow = true;
        this.group.add(w);
        Colliders.add({ x: bx + ox, z: bz + oz, hw: w2 / 2, hd: d2 / 2 });
      }
      const neonCols = [0xff4fb0, 0x37f4e8, 0xffd23c, 0x9a5cff, 0xff7043];
      const neon = new THREE.Mesh(new THREE.BoxGeometry(60, 8, 4), new THREE.MeshBasicMaterial({ color: neonCols[i % neonCols.length] }));
      neon.position.set(bx, HGT - 2, bz - S / 2 + TH);
      this.group.add(neon);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(90, 12, 20), new THREE.MeshLambertMaterial({ color: 0x4a2c1a }));
      bar.position.set(bx - 60, 6, bz - 90); bar.castShadow = true;
      this.group.add(bar);
      Colliders.add({ x: bx - 60, z: bz - 90, hw: 45, hd: 10 });
      const bottleRack = new THREE.Mesh(new THREE.BoxGeometry(80, 20, 6), new THREE.MeshLambertMaterial({ color: 0x2d1b0e }));
      bottleRack.position.set(bx - 60, 12, bz - S / 2 + 14);
      this.group.add(bottleRack);
      for (let bt = 0; bt < 7; bt++) {
        const bottle = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.5, 8, 6), new THREE.MeshPhongMaterial({ color: [0x39c463, 0xc4a739, 0xc33939, 0x39c4c0][bt % 4], shininess: 90, transparent: true, opacity: 0.9 }));
        bottle.position.set(bx - 88 + bt * 9, 26, bz - S / 2 + 14);
        this.group.add(bottle);
      }
      for (let st = 0; st < 4; st++) {
        const stool = new THREE.Mesh(new THREE.CylinderGeometry(5, 6, 9, 8), new THREE.MeshLambertMaterial({ color: 0xb04a5a }));
        stool.position.set(bx - 88 + st * 22, 4.5, bz - 62);
        this.group.add(stool);
        Colliders.add({ x: stool.position.x, z: stool.position.z, r: 6 });
      }
      const rugCol = neonCols[(i + 2) % neonCols.length];
      const rug = new THREE.Mesh(new THREE.PlaneGeometry(90, 70), new THREE.MeshLambertMaterial({ color: rugCol }));
      rug.rotation.x = -Math.PI / 2; rug.position.set(bx + 40, 0.25, bz + 40);
      this.group.add(rug);
      const sofa = new THREE.Mesh(new THREE.BoxGeometry(60, 14, 22), new THREE.MeshLambertMaterial({ color: 0x2d6b6e }));
      sofa.position.set(bx + 40, 7, bz + 80); sofa.castShadow = true;
      this.group.add(sofa);
      Colliders.add({ x: bx + 40, z: bz + 80, hw: 30, hd: 11 });
      const table = new THREE.Mesh(new THREE.CylinderGeometry(12, 12, 3, 10), new THREE.MeshLambertMaterial({ color: 0xd8d0c0 }));
      table.position.set(bx + 40, 7, bz + 30);
      this.group.add(table);
      Colliders.add({ x: bx + 40, z: bz + 30, r: 12 });
      const npc = new THREE.Group();
      const nose = new THREE.Mesh(new THREE.BoxGeometry(8, 10, 5), new THREE.MeshLambertMaterial({ color: 0xffffff }));
      nose.position.y = 14;
      const apron = new THREE.Mesh(new THREE.BoxGeometry(9, 11, 5.5), new THREE.MeshLambertMaterial({ color: 0x14213d }));
      apron.position.y = 15.5;
      const face = new THREE.Mesh(new THREE.SphereGeometry(3.8, 8, 6), new THREE.MeshLambertMaterial({ color: 0xe8b48a }));
      face.position.y = 24;
      npc.add(nose, apron, face);
      npc.position.set(bx - 60, 0, bz - 78);
      this.group.add(npc);
      const cash = new THREE.Mesh(new THREE.BoxGeometry(10, 8, 10), new THREE.MeshPhongMaterial({ color: 0x4cd964, shininess: 90, emissive: 0x1d5c2a }));
      cash.position.set(bx + 40, 10, bz + 30);
      this.group.add(cash);
      const exitM = new THREE.Mesh(
        new THREE.CylinderGeometry(14, 14, 44, 10),
        new THREE.MeshBasicMaterial({ color: 0xff4fb0, transparent: true, opacity: 0.4, depthWrite: false })
      );
      exitM.position.set(bx + 100, 22, bz + 100);
      this.group.add(exitM);
      this.interiors.push({
        name: c.name, door: c.door,
        room: { x: bx, z: bz }, enter: { x: bx + 100, z: bz + 100 },
        exit: { x: bx + 100, z: bz + 100 }, exitMesh: exitM,
        cash: { x: bx + 40, z: bz + 30, mesh: cash, cd: 0 }
      });
    });
  },

  update(t) {
    if (this.waterMesh) this.waterMesh.position.y = 0.2 + Math.sin(t * 1.4) * 0.25;
    for (const palm of this.palms) if (palm.userData.crown) palm.userData.crown.rotation.z = Math.sin(t * 1.1 + palm.position.x * 0.05) * 0.05;
  },

  isOnRoad(x, z) {
    let ok = false;
    for (const rx of WORLD.Xs) if (Math.abs(x - rx) < WORLD.ROAD / 2) ok = true;
    for (const rz of WORLD.Ys) if (Math.abs(z - rz) < WORLD.ROAD / 2) ok = true;
    return ok;
  },

  randomSidewalkPoint() {
    if (Math.random() < 0.5) {
      const rx = WORLD.Xs[Math.floor(Math.random() * WORLD.Xs.length)];
      return { x: rx + (Math.random() < 0.5 ? -61 : 61), z: 100 + Math.random() * (WORLD.H - 200) };
    }
    const rz = WORLD.Ys[Math.floor(Math.random() * WORLD.Ys.length)];
    return { x: 100 + Math.random() * (WORLD.CITY_X_MAX - 200), z: rz + (Math.random() < 0.5 ? -61 : 61) };
  },

  clampToLand(p, r) {
    if (p.x > WORLD.WATER_X - r - 10) { p.x = WORLD.WATER_X - r - 10; return true; }
    if (p.x < r + 10) { p.x = r + 10; return true; }
    if (p.z < r + 10) { p.z = r + 10; return true; }
    if (p.z > WORLD.H - r - 10) { p.z = WORLD.H - r - 10; return true; }
    return false;
  },

  collide(p, r) {
    const near = Colliders.query(p.x, p.z, r);
    let hit = false;
    for (const b of near) {
      if (b.r !== undefined) {
        const dx = p.x - b.x, dz = p.z - b.z, d = Math.hypot(dx, dz), min = r + b.r;
        if (d < min && d > 0.001) { p.x = b.x + dx / d * min; p.z = b.z + dz / d * min; hit = true; }
      } else {
        if (Math.abs(p.x - b.x) > b.hw + r || Math.abs(p.z - b.z) > b.hd + r) continue;
        const cx = Math.max(b.x - b.hw, Math.min(p.x, b.x + b.hw));
        const cz = Math.max(b.z - b.hd, Math.min(p.z, b.z + b.hd));
        const dx = p.x - cx, dz = p.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 < r * r) {
          hit = true;
          if (d2 > 0.0001) {
            const d = Math.sqrt(d2);
            p.x = cx + dx / d * r; p.z = cz + dz / d * r;
          } else {
            const dl = p.x - (b.x - b.hw), dr = (b.x + b.hw) - p.x;
            const db = p.z - (b.z - b.hd), df = (b.z + b.hd) - p.z;
            const m = Math.min(dl, dr, db, df);
            if (m === dl) p.x = b.x - b.hw - r; else if (m === dr) p.x = b.x + b.hw + r;
            else if (m === db) p.z = b.z - b.hd - r; else p.z = b.z + b.hd + r;
          }
        }
      }
    }
    return hit;
  }
};
