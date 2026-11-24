const WORLD = {
  W: 4450, H: 3750, ROAD: 110, LANE: 27,
  Xs: [150, 600, 1050, 1500, 1950, 2400, 2850, 3300, 3660],
  Ys: [150, 600, 1050, 1500, 1950, 2400, 2850, 3300],
  SAND_X: 3760, WATER_X: 3900, CITY_X_MAX: 3660
};

const Colliders = {
  cells: new Map(), cs: 250,
  key(x, z) { return Math.floor(x / this.cs) + ',' + Math.floor(z / this.cs); },
  add(item) {
    const r = item.r || Math.max(item.hw, item.hd);
    for (let cx = Math.floor((item.x - r) / this.cs); cx <= Math.floor((item.x + r) / this.cs); cx++)
      for (let cz = Math.floor((item.z - r) / this.cs); cz <= Math.floor((item.z + r) / this.cs); cz++) {
        const k = cx + ',' + cz;
        if (!this.cells.has(k)) this.cells.set(k, []);
        this.cells.get(k).push(item);
      }
  },
  query(x, z) { const out = this.cells.get(Math.floor(x / this.cs) + ',' + Math.floor(z / this.cs)); return out || []; }
};

function makeWindowsTexture(base, lit) {
  const c1 = document.createElement('canvas'); c1.width = 128; c1.height = 256;
  const g = c1.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 128, 256);
  for (let ry = 0; ry < 10; ry++) for (let rx = 0; rx < 4; rx++) {
    g.fillStyle = 'rgba(18,26,46,' + (0.75 + Math.random() * 0.25) + ')';
    g.fillRect(14 + rx * 28, 12 + ry * 24, 18, 14);
  }
  const c2 = document.createElement('canvas'); c2.width = 128; c2.height = 256;
  const g2 = c2.getContext('2d');
  g2.fillStyle = '#000'; g2.fillRect(0, 0, 128, 256);
  for (let ry = 0; ry < 10; ry++) for (let rx = 0; rx < 4; rx++) {
    if (Math.random() < lit) {
      g2.fillStyle = Math.random() < 0.85 ? '#ffca7a' : '#7ad7ff';
      g2.fillRect(14 + rx * 28, 12 + ry * 24, 18, 14);
    }
  }
  return { map: new THREE.CanvasTexture(c1), emissive: new THREE.CanvasTexture(c2) };
}

function makePalm() {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 4.5, 52, 6), new THREE.MeshLambertMaterial({ color: 0x8a6a42 }));
  trunk.position.y = 26; trunk.rotation.z = (Math.random() - 0.5) * 0.25;
  g.add(trunk);
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.Mesh(new THREE.PlaneGeometry(7, 34), new THREE.MeshLambertMaterial({ color: 0x2f9e57, side: THREE.DoubleSide }));
    leaf.position.set(Math.cos(i / 7 * Math.PI * 2) * 13, 52, Math.sin(i / 7 * Math.PI * 2) * 13);
    leaf.rotation.y = -i / 7 * Math.PI * 2;
    leaf.rotation.z = -0.9;
    leaf.geometry.translate(0, 17, 0);
    g.add(leaf);
  }
  return g;
}

const City = {
  group: null, buildings: [], carsMat: null, spray: { x: 3480, z: 2050 }, hospital: { x: 1050, z: 2050 },
  waterMesh: null, skyDay: new THREE.Color(0x87c5eb), skyNight: new THREE.Color(0x070a1c),

  build(scene) {
    this.group = new THREE.Group();
    scene.add(this.group);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.W + 150, WORLD.H + 150), new THREE.MeshLambertMaterial({ color: 0x4a7d4f }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(WORLD.W / 2 - 100, 0, WORLD.H / 2);
    this.group.add(ground);

    const concrete = new THREE.MeshLambertMaterial({ color: 0x9a9da3 });
    const roadMat = new THREE.MeshLambertMaterial({ color: 0x2e3238 });
    const lineMat = new THREE.MeshLambertMaterial({ color: 0xd8d8c8 });

    for (const x of WORLD.Xs) {
      const sw = new THREE.Mesh(new THREE.PlaneGeometry(170, WORLD.H), concrete);
      sw.rotation.x = -Math.PI / 2; sw.position.set(x, 0.01, WORLD.H / 2); this.group.add(sw);
      const rd = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.ROAD, WORLD.H), roadMat);
      rd.rotation.x = -Math.PI / 2; rd.position.set(x, 0.03, WORLD.H / 2); this.group.add(rd);
      for (let z = 40; z < WORLD.H; z += 90) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(3, 34), lineMat);
        dash.rotation.x = -Math.PI / 2; dash.position.set(x, 0.05, z); this.group.add(dash);
      }
    }
    for (const z of WORLD.Ys) {
      const sw = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.CITY_X_MAX + 160, 170), concrete);
      sw.rotation.x = -Math.PI / 2; sw.position.set((WORLD.CITY_X_MAX + 160) / 2 - 80, 0.015, z); this.group.add(sw);
      const rd = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.CITY_X_MAX + 120, WORLD.ROAD), roadMat);
      rd.rotation.x = -Math.PI / 2; rd.position.set(WORLD.CITY_X_MAX / 2, 0.035, z); this.group.add(rd);
      for (let x = 40; x < WORLD.CITY_X_MAX; x += 90) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(34, 3), lineMat);
        dash.rotation.x = -Math.PI / 2; dash.position.set(x, 0.05, z); this.group.add(dash);
      }
    }

    const palettes = ['#e794b4', '#8fd0cf', '#f2d47f', '#b8a8ea', '#e8e2d4', '#7fc3e8', '#e8a98a'];
    const mats = palettes.map(p => {
      const t = makeWindowsTexture(p, 0.3);
      const side = new THREE.MeshPhongMaterial({ map: t.map, emissive: new THREE.Color(0x000000), emissiveMap: t.emissive, shininess: 8 });
      const top = new THREE.MeshLambertMaterial({ color: new THREE.Color(p).multiplyScalar(0.55) });
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
          const grass = new THREE.Mesh(new THREE.PlaneGeometry(bw, bd), new THREE.MeshLambertMaterial({ color: 0x549a52 }));
          grass.rotation.x = -Math.PI / 2; grass.position.set(cxm, 0.02, czm); this.group.add(grass);
          for (let p = 0; p < 5; p++) {
            const px = x0 + 20 + Math.random() * (bw - 40), pz = z0 + 20 + Math.random() * (bd - 40);
            const palm = makePalm(); palm.position.set(px, 0, pz); this.group.add(palm);
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
          this.group.add(mesh);
          this.buildings.push({ x: bx, z: bz, hw, hd, h: hgt });
          Colliders.add({ x: bx, z: bz, hw, hd });
        }
        blockIdx++;
      }
    }

    const sand = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.W - WORLD.SAND_X + 120, WORLD.H + 80), new THREE.MeshLambertMaterial({ color: 0xead9a0 }));
    sand.rotation.x = -Math.PI / 2; sand.position.set(WORLD.SAND_X + (WORLD.W - WORLD.SAND_X + 120) / 2, 0.005, WORLD.H / 2); this.group.add(sand);
    for (let z = 100; z < WORLD.H; z += 130) {
      const palm = makePalm(); palm.position.set(WORLD.SAND_X + 30 + Math.random() * 40, 0, z); this.group.add(palm);
      Colliders.add({ x: palm.position.x, z, r: 6 });
    }
    this.waterMesh = new THREE.Mesh(new THREE.PlaneGeometry(1000, WORLD.H + 400), new THREE.MeshPhongMaterial({ color: 0x1a6fd4, transparent: true, opacity: 0.92, shininess: 90 }));
    this.waterMesh.rotation.x = -Math.PI / 2; this.waterMesh.position.set(WORLD.WATER_X + 500, 0.2, WORLD.H / 2);
    this.group.add(this.waterMesh);
  },

  update(t) { if (this.waterMesh) this.waterMesh.position.y = 0.2 + Math.sin(t * 1.4) * 0.25; },

  isOnRoad(x, z) {
    let ok = false;
    for (const rx of WORLD.Xs) if (Math.abs(x - rx) < WORLD.ROAD / 2) ok = true;
    for (const rz of WORLD.Ys) if (Math.abs(z - rz) < WORLD.ROAD / 2) ok = true;
    return ok;
  },

  randomSidewalkPoint() {
    if (Math.random() < 0.5) {
      const rx = WORLD.Xs[Math.floor(Math.random() * WORLD.Xs.length)];
      return { x: rx + (Math.random() < 0.5 ? -74 : 74), z: 100 + Math.random() * (WORLD.H - 200) };
    }
    const rz = WORLD.Ys[Math.floor(Math.random() * WORLD.Ys.length)];
    return { x: 100 + Math.random() * (WORLD.CITY_X_MAX - 200), z: rz + (Math.random() < 0.5 ? -74 : 74) };
  },

  clampToLand(p, r) {
    if (p.x > WORLD.WATER_X - r - 10) { p.x = WORLD.WATER_X - r - 10; return true; }
    if (p.x < r + 10) { p.x = r + 10; return true; }
    if (p.z < r + 10) { p.z = r + 10; return true; }
    if (p.z > WORLD.H - r - 10) { p.z = WORLD.H - r - 10; return true; }
    return false;
  },

  collide(p, r) {
    const near = Colliders.query(p.x, p.z);
    let hit = false;
    for (const b of near) {
      if (b.r !== undefined) {
        const dx = p.x - b.x, dz = p.z - b.z, d = Math.hypot(dx, dz), min = r + b.r;
        if (d < min && d > 0.001) { p.x = b.x + dx / d * min; p.z = b.z + dz / d * min; hit = true; }
      } else {
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
