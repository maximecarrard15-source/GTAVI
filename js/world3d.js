const WORLD = {
  W: 6200, H: 5550, ROAD: 110, LANE: 27,
  Xs: [150, 600, 1050, 1500, 1950, 2400, 2850, 3300, 3750, 4200, 4650, 5100],
  Ys: [150, 600, 1050, 1500, 1950, 2400, 2850, 3300, 3750, 4200, 4650, 5100],
  SAND_X: 5210, WATER_X: 5350, CITY_X_MAX: 5100,
  AIRPORT: { x0: 5470, x1: 6150, z0: 4640, z1: 5450, bridgeZ: 5150, rwA: { x: 6110, z: 5410 }, rwB: { x: 5510, z: 4810 } }
};

function aniso(t) {
  if (typeof Game !== 'undefined' && Game.renderer) t.anisotropy = Game.renderer.capabilities.getMaxAnisotropy();
  return t;
}

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
    const v = Math.random();
    g.fillStyle = v < 0.5 ? 'rgba(0,0,0,' + (0.04 + Math.random() * 0.07) + ')' : 'rgba(255,255,255,' + (0.03 + Math.random() * 0.05) + ')';
    g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1 + Math.random() * 3);
  }
  return c;
}

function grunge(g, w, h, n, a) {
  for (let i = 0; i < n; i++) {
    const dark = Math.random() < 0.55;
    g.fillStyle = dark ? 'rgba(0,0,0,' + (0.03 + Math.random() * a) + ')' : 'rgba(255,255,255,' + (0.02 + Math.random() * a * 0.8) + ')';
    const sz = 1 + Math.random() * 4;
    g.fillRect(Math.random() * w, Math.random() * h, sz, sz);
  }
}

function cracks(g, w, h, n, col, lw) {
  g.strokeStyle = col;
  for (let k = 0; k < n; k++) {
    let x = Math.random() * w, y = Math.random() * h;
    let a = Math.random() * Math.PI * 2;
    g.lineWidth = (lw || 1) * (0.6 + Math.random());
    g.beginPath(); g.moveTo(x, y);
    for (let s2 = 0, m = 3 + Math.floor(Math.random() * 4); s2 < m; s2++) {
      a += (Math.random() - 0.5) * 1.3;
      x += Math.cos(a) * (8 + Math.random() * 22); y += Math.sin(a) * (8 + Math.random() * 22);
      g.lineTo(x, y);
    }
    g.stroke();
  }
}

function stains(g, w, h, n, col, rmax) {
  for (let k = 0; k < n; k++) {
    const x = Math.random() * w, y = Math.random() * h, r = 6 + Math.random() * (rmax || 30);
    const gr = g.createRadialGradient(x, y, 1, x, y, r);
    gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
}

function texOf(c) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return aniso(t);
}

function makeRoadTexture() {
  const c = noiseCanvas(512, 512, '#262a30', 0);
  const g = c.getContext('2d');
  grunge(g, 512, 512, 2600, 0.08);
  for (let i = 0; i < 1600; i++) {
    g.fillStyle = 'rgba(158,164,175,' + (0.05 + Math.random() * 0.15) + ')';
    const sz = 1 + Math.random() * 2;
    g.fillRect(Math.random() * 512, Math.random() * 512, sz, sz);
  }
  for (const bx of [104, 200, 312, 408]) {
    const gr = g.createLinearGradient(bx - 30, 0, bx + 30, 0);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.15)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(bx - 30, 0, 60, 512);
  }
  cracks(g, 512, 512, 12, 'rgba(10,10,12,0.5)', 1.4);
  stains(g, 512, 512, 7, 'rgba(12,12,14,0.3)', 46);
  for (let k = 0; k < 3; k++) {
    const x = Math.random() * 420, y = Math.random() * 420, w2 = 30 + Math.random() * 60, h2 = 24 + Math.random() * 50;
    g.fillStyle = 'rgba(54,58,64,' + (0.45 + Math.random() * 0.3) + ')';
    g.fillRect(x, y, w2, h2);
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 2;
    g.strokeRect(x, y, w2, h2);
  }
  return texOf(c);
}

function makeSidewalkTexture() {
  const c = noiseCanvas(512, 512, '#9b9ea4', 0);
  const g = c.getContext('2d');
  const T = 64;
  for (let ty = 0; ty < 8; ty++) for (let tx = 0; tx < 8; tx++) {
    const v = Math.random();
    g.fillStyle = 'rgba(' + (v < 0.25 ? '70,72,76' : '255,255,255') + ',' + (0.03 + Math.random() * 0.06) + ')';
    g.fillRect(tx * T, ty * T, T, T);
  }
  for (let i = 0; i <= 8; i++) {
    g.strokeStyle = 'rgba(58,60,64,0.9)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(i * T, 0); g.lineTo(i * T, 512); g.stroke();
    g.beginPath(); g.moveTo(0, i * T); g.lineTo(512, i * T); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.28)'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(i * T + 2, 0); g.lineTo(i * T + 2, 512); g.stroke();
    g.beginPath(); g.moveTo(0, i * T + 2); g.lineTo(512, i * T + 2); g.stroke();
  }
  for (let k = 0; k < 14; k++) {
    const tx = Math.floor(Math.random() * 8), ty = Math.floor(Math.random() * 8);
    g.save();
    g.beginPath(); g.rect(tx * T + 3, ty * T + 3, T - 6, T - 6); g.clip();
    cracks(g, T, T, 1, 'rgba(40,42,46,0.5)', 1.1);
    g.restore();
  }
  for (let k = 0; k < 26; k++) {
    g.fillStyle = 'rgba(30,30,34,' + (0.12 + Math.random() * 0.15) + ')';
    const s2 = 2 + Math.random() * 4;
    g.fillRect(Math.random() * 500, Math.random() * 500, s2, s2);
  }
  stains(g, 512, 512, 8, 'rgba(50,48,44,0.18)', 40);
  grunge(g, 512, 512, 1400, 0.06);
  return texOf(c);
}

function makeGrassTexture() {
  const c = noiseCanvas(512, 512, '#3f7a44', 0);
  const g = c.getContext('2d');
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * 512, y = Math.random() * 512, r = 26 + Math.random() * 80;
    const light = Math.random() < 0.5;
    const gr = g.createRadialGradient(x, y, 2, x, y, r);
    gr.addColorStop(0, light ? 'rgba(120,190,90,0.16)' : 'rgba(18,52,26,0.2)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  for (let k = 0; k < 9; k++) {
    const x = Math.random() * 512, y = Math.random() * 512;
    g.fillStyle = 'rgba(108,84,48,0.3)';
    for (let b = 0; b < 6; b++) { g.beginPath(); g.arc(x + (Math.random() - 0.5) * 46, y + (Math.random() - 0.5) * 34, 7 + Math.random() * 10, 0, 7); g.fill(); }
  }
  for (let i = 0; i < 3400; i++) {
    const x = Math.random() * 512, y = Math.random() * 512;
    g.strokeStyle = 'rgba(' + Math.floor(46 + Math.random() * 60) + ',' + Math.floor(110 + Math.random() * 80) + ',' + Math.floor(38 + Math.random() * 30) + ',' + (0.25 + Math.random() * 0.45) + ')';
    g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * 4, y - 2.5 - Math.random() * 4); g.stroke();
  }
  for (let i = 0; i < 36; i++) {
    g.fillStyle = Math.random() < 0.5 ? 'rgba(240,235,120,0.75)' : 'rgba(240,240,245,0.7)';
    g.fillRect(Math.random() * 510, Math.random() * 510, 2.4, 2.4);
  }
  return texOf(c);
}

function makeSandTexture() {
  const c = noiseCanvas(512, 512, '#e6d5a4', 0);
  const g = c.getContext('2d');
  for (let y = 0; y < 512; y += 24) {
    g.strokeStyle = 'rgba(255,248,215,0.3)'; g.lineWidth = 3;
    g.beginPath();
    for (let x = 0; x <= 512; x += 16) g.lineTo(x, y + Math.sin(x * 0.05 + y) * 5);
    g.stroke();
    g.strokeStyle = 'rgba(120,100,60,0.18)'; g.lineWidth = 2;
    g.beginPath();
    for (let x = 0; x <= 512; x += 16) g.lineTo(x, y + 9 + Math.sin(x * 0.05 + y + 1) * 5);
    g.stroke();
  }
  for (let i = 0; i < 1100; i++) {
    g.fillStyle = Math.random() < 0.5 ? 'rgba(255,250,225,0.2)' : 'rgba(130,110,70,0.15)';
    const sz = 1 + Math.random() * 2.4;
    g.fillRect(Math.random() * 512, Math.random() * 512, sz, sz);
  }
  for (let i = 0; i < 26; i++) {
    g.fillStyle = 'rgba(245,242,235,0.85)';
    g.beginPath(); g.arc(Math.random() * 512, Math.random() * 512, 1.6 + Math.random() * 2, 0, 7); g.fill();
  }
  return texOf(c);
}

function makeWaterTexture() {
  const c = noiseCanvas(512, 512, '#1263c8', 0);
  const g = c.getContext('2d');
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * 512, y = Math.random() * 512, r = 30 + Math.random() * 90;
    const gr = g.createRadialGradient(x, y, 2, x, y, r);
    gr.addColorStop(0, 'rgba(6,40,110,0.22)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * 512, y = Math.random() * 512, r = 8 + Math.random() * 30;
    g.strokeStyle = 'rgba(255,255,255,' + (0.06 + Math.random() * 0.15) + ')';
    g.lineWidth = 1.4 + Math.random() * 2.4;
    g.beginPath();
    g.arc(x, y, r, Math.PI * (0.85 + Math.random() * 0.3), Math.PI * (1.7 + Math.random() * 0.3));
    g.stroke();
  }
  for (let i = 0; i < 46; i++) {
    const y = Math.random() * 512;
    g.strokeStyle = 'rgba(210,240,255,' + (0.05 + Math.random() * 0.12) + ')';
    g.lineWidth = 1.5;
    g.beginPath();
    for (let x = 0; x <= 512; x += 24) g.lineTo(x, y + Math.sin(x * 0.04 + i) * 6);
    g.stroke();
  }
  return texOf(c);
}

function makeRunwayTexture() {
  const c = noiseCanvas(256, 512, '#494f55', 0);
  const g = c.getContext('2d');
  for (let i = 0; i < 900; i++) {
    g.fillStyle = 'rgba(' + (20 + Math.random() * 40 | 0) + ',' + (22 + Math.random() * 40 | 0) + ',' + (26 + Math.random() * 40 | 0) + ',' + (0.06 + Math.random() * 0.1) + ')';
    g.fillRect(Math.random() * 256, Math.random() * 512, 3 + Math.random() * 14, 2 + Math.random() * 8);
  }
  for (let i = 0; i < 26; i++) {
    g.fillStyle = 'rgba(14,16,18,' + (0.1 + Math.random() * 0.14) + ')';
    g.beginPath(); g.ellipse(Math.random() * 256, Math.random() * 512, 12 + Math.random() * 22, 6 + Math.random() * 10, Math.random() * 3, 0, 7); g.fill();
  }
  g.fillStyle = '#e8d44c';
  for (let y = 20; y < 492; y += 48) g.fillRect(124, y, 8, 26);
  g.fillStyle = '#f2f2f2';
  for (let i = 0; i < 6; i++) {
    g.fillRect(24 + i * 16, 480, 10, 30);
    g.fillRect(24 + i * 16, 2, 10, 30);
  }
  g.fillStyle = '#e8e8e8';
  g.font = 'bold 54px Arial';
  g.save(); g.translate(58, 420); g.rotate(-Math.PI / 2); g.fillText('09', 0, 0); g.restore();
  return texOf(c);
}

function tileTexture(base, dotCount, lineColor, tile) {
  const c = noiseCanvas(256, 256, base, dotCount, 0);
  const g = c.getContext('2d');
  if (tile) {
    g.strokeStyle = lineColor; g.lineWidth = 3;
    for (let i = 0; i <= 256; i += 256 / tile) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke();
      g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke();
    }
    g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 1.2;
    for (let i = 0; i <= 256; i += 256 / tile) {
      g.beginPath(); g.moveTo(i + 2, 0); g.lineTo(i + 2, 256); g.stroke();
      g.beginPath(); g.moveTo(0, i + 2); g.lineTo(256, i + 2); g.stroke();
    }
  }
  grunge(g, 256, 256, 700, 0.07);
  return texOf(c);
}

function makeWindowsTexture(base, lit) {
  const AW = 512, AH = 1024, SHOPH = 128, ROWS = 16, RH = (AH - SHOPH - 26) / ROWS, COLS = 10;
  const c1 = document.createElement('canvas'); c1.width = AW; c1.height = AH;
  const g = c1.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, AH);
  grad.addColorStop(0, shade(base, 1.05));
  grad.addColorStop(0.8, base);
  grad.addColorStop(1, shade(base, 0.86));
  g.fillStyle = grad; g.fillRect(0, 0, AW, AH);
  const ww = AW / COLS;
  for (let cx = 0; cx <= COLS; cx++) {
    const x = cx * ww;
    g.fillStyle = 'rgba(0,0,0,0.1)'; g.fillRect(x - 3, 0, 6, AH - SHOPH);
    g.fillStyle = 'rgba(255,255,255,0.13)'; g.fillRect(x + 3, 0, 2.5, AH - SHOPH);
  }
  for (let ry = 0; ry < ROWS; ry++) {
    const y = 14 + ry * RH;
    if (ry > 0 && ry % 4 === 0) {
      g.fillStyle = shade(base, 0.78); g.fillRect(0, y - 12, AW, 12);
      g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(0, y - 12, AW, 2.5);
    }
    if (Math.random() < 0.1) {
      g.fillStyle = 'rgba(0,0,0,.12)';
      g.fillRect(8, y, AW - 16, RH * 0.72);
      continue;
    }
    for (let rx = 0; rx < COLS; rx++) {
      const wx = rx * ww + ww * 0.14, wy = y, w2 = ww * 0.72, h2 = RH * 0.62;
      g.fillStyle = shade(base, 0.72);
      g.fillRect(wx - 4, wy - 4, w2 + 8, h2 + 8);
      g.fillStyle = '#16233d';
      g.fillRect(wx, wy, w2, h2);
      const gl = g.createLinearGradient(wx, wy, wx, wy + h2);
      gl.addColorStop(0, 'rgba(190,220,255,' + (0.1 + Math.random() * 0.28) + ')');
      gl.addColorStop(1, 'rgba(60,90,140,0.12)');
      g.fillStyle = gl;
      g.fillRect(wx + 2, wy + 2, w2 - 4, h2 - 4);
      if (Math.random() < 0.4) {
        g.fillStyle = 'rgba(225,230,240,0.5)';
        g.fillRect(wx + 3, wy + 3, w2 * (0.25 + Math.random() * 0.4), h2 - 6);
      }
      g.strokeStyle = 'rgba(255,255,255,.38)'; g.lineWidth = 2.5;
      g.strokeRect(wx, wy, w2, h2);
      g.fillStyle = shade(base, 0.66);
      g.fillRect(wx - 5, wy + h2 + 4, w2 + 10, 5);
      if (Math.random() < 0.16) {
        g.fillStyle = 'rgba(120,126,134,0.9)';
        g.fillRect(wx + w2 * 0.3, wy + h2 + 9, 22, 13);
        g.fillStyle = 'rgba(70,74,80,0.9)';
        g.fillRect(wx + w2 * 0.3 + 4, wy + h2 + 12, 14, 7);
      }
    }
  }
  const sy = AH - SHOPH;
  g.fillStyle = shade(base, 0.58); g.fillRect(0, sy, AW, SHOPH);
  g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(0, sy, AW, 3);
  const cols = ['#c94f6d', '#3f7fc4', '#d98e3b', '#5aa86c', '#8a63c9', '#d3c052'];
  const words = ['CAF\u00c9', 'HOTEL', 'CLUB', 'BAR', 'PIZZA', 'TATOO', 'MOTEL', 'DINER', 'NEON', 'MODE'];
  for (let rx = 0; rx < COLS; rx++) {
    const wx = rx * ww + 6, w2 = ww - 12;
    const cc = cols[Math.floor(Math.random() * cols.length)];
    g.fillStyle = cc;
    g.fillRect(wx, sy + 8, w2, 20);
    g.fillStyle = '#0c1424';
    g.fillRect(wx, sy + 34, w2, SHOPH - 34);
    g.fillStyle = 'rgba(180,215,255,.25)';
    g.fillRect(wx + 4, sy + 38, w2 * 0.3, SHOPH - 46);
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2;
    g.strokeRect(wx + 4, sy + 38, w2 * 0.3, SHOPH - 46);
    g.fillStyle = '#fff';
    g.font = 'bold 15px sans-serif';
    g.textAlign = 'center';
    const word = words[Math.floor(Math.random() * words.length)];
    g.fillText(word.slice(0, 6), wx + w2 / 2, sy + 24, w2 - 6);
    if (Math.random() < 0.5) {
      g.fillStyle = cc;
      for (let st = 0; st < 4; st++) g.fillRect(wx + st * (w2 / 4), sy + 30, w2 / 8, 6);
    }
  }
  g.textAlign = 'left';
  grunge(g, AW, AH, 1200, 0.05);
  const c2 = document.createElement('canvas'); c2.width = AW; c2.height = AH;
  const g2 = c2.getContext('2d');
  g2.fillStyle = '#000'; g2.fillRect(0, 0, AW, AH);
  for (let ry = 0; ry < ROWS; ry++) for (let rx = 0; rx < COLS; rx++) {
    if (Math.random() < lit) {
      const wx = rx * ww + ww * 0.14, wy = 14 + ry * RH, w2 = ww * 0.72, h2 = RH * 0.62;
      g2.fillStyle = Math.random() < 0.82 ? '#ffca7a' : '#8fd8ff';
      g2.fillRect(wx + 1, wy + 1, w2 - 2, h2 - 2);
      if (Math.random() < 0.4) {
        g2.fillStyle = 'rgba(0,0,0,0.55)';
        g2.fillRect(wx + 1, wy + 1, w2 * (0.2 + Math.random() * 0.35), h2 - 2);
      }
    }
  }
  for (let rx = 0; rx < COLS; rx++) {
    if (Math.random() < 0.65) {
      const wx = rx * ww + 6, w2 = ww - 12;
      g2.fillStyle = Math.random() < 0.5 ? 'rgba(255,190,110,0.95)' : 'rgba(150,200,255,0.9)';
      g2.fillRect(wx, AH - SHOPH + 34, w2, SHOPH - 34);
      g2.fillStyle = 'rgba(255,120,90,0.9)';
      g2.fillRect(wx, AH - SHOPH + 8, w2, 20);
    }
  }
  return { map: texOf(c1), emissive: texOf(c2) };
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
  group: null, buildings: [], spray: { x: 4680, z: 2775 }, hospital: { x: 1050, z: 2775 },
  waterMesh: null, palms: [], interiors: [], beacons: [], lampGlow: null,
  skyDay: new THREE.Color(0x87c5eb), skyNight: new THREE.Color(0x070a1c),
  windowMats: null,
  INTERIOR_NAMES: ['Malibu Club', 'Café Néon', 'Hôtel Flamingo', 'Bar Bourbon', 'Arcade Miami', 'Studio 84', 'Disco Tropico', 'Librairie Vice'],

  build(scene) {
    this.group = new THREE.Group();
    scene.add(this.group);

    const grassTex = makeGrassTexture(); grassTex.repeat.set(48, 43);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.W + 150, WORLD.H + 150), new THREE.MeshLambertMaterial({ map: grassTex }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(WORLD.W / 2 - 100, 0, WORLD.H / 2);
    ground.receiveShadow = true;
    this.group.add(ground);

    const swTexA = makeSidewalkTexture(); swTexA.repeat.set(1, 34);
    const swTexB = makeSidewalkTexture(); swTexB.repeat.set(34, 1);
    const asphaltX = makeRoadTexture(); asphaltX.repeat.set(1, 50);
    const asphaltZ = makeRoadTexture(); asphaltZ.repeat.set(47, 1);
    const concrete = new THREE.MeshLambertMaterial({ map: swTexA });
    const concreteB = new THREE.MeshLambertMaterial({ map: swTexB });
    const roadMat = new THREE.MeshLambertMaterial({ map: asphaltX });
    const roadMatB = new THREE.MeshLambertMaterial({ map: asphaltZ });
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
      const sw = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.CITY_X_MAX + 160, 170), concreteB);
      sw.rotation.x = -Math.PI / 2; sw.position.set((WORLD.CITY_X_MAX + 160) / 2 - 80, 0.015, z); sw.receiveShadow = true; this.group.add(sw);
      const rd = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.CITY_X_MAX + 120, WORLD.ROAD), roadMatB);
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
        const distC = Math.min(1, Math.hypot((cxm - WORLD.CITY_X_MAX * 0.5) / (WORLD.CITY_X_MAX * 0.52), (czm - WORLD.H / 2) / (WORLD.H * 0.52)));
        if (parkSet.has(blockIdx)) {
          const gt = makeGrassTexture(); gt.repeat.set(bw / 130, bd / 130);
          const grass = new THREE.Mesh(new THREE.PlaneGeometry(bw, bd), new THREE.MeshLambertMaterial({ map: gt }));
          grass.rotation.x = -Math.PI / 2; grass.position.set(cxm, 0.02, czm); grass.receiveShadow = true; this.group.add(grass);
          for (let p = 0; p < 6; p++) {
            const px = x0 + 20 + Math.random() * (bw - 40), pz = z0 + 20 + Math.random() * (bd - 40);
            const palm = makePalm(); palm.position.set(px, 0, pz); this.group.add(palm);
            this.palms.push(palm);
            Colliders.add({ x: px, z: pz, r: 6 });
          }
          for (let bn = 0; bn < 3; bn++) {
            const bx2 = cxm + (Math.random() - 0.5) * (bw - 120), bz2 = czm + (Math.random() - 0.5) * (bd - 120);
            const bench = new THREE.Group();
            const seat = new THREE.Mesh(new THREE.BoxGeometry(22, 2.5, 6), new THREE.MeshLambertMaterial({ color: 0x7a5230 }));
            seat.position.y = 5.5; seat.castShadow = true;
            const back = new THREE.Mesh(new THREE.BoxGeometry(22, 6, 2), new THREE.MeshLambertMaterial({ color: 0x6b4628 }));
            back.position.set(0, 9, -2.2); back.castShadow = true;
            for (const lx of [-8, 8]) {
              const leg = new THREE.Mesh(new THREE.BoxGeometry(2.4, 5.5, 5), new THREE.MeshLambertMaterial({ color: 0x3a3f45 }));
              leg.position.set(lx, 2.7, 0); bench.add(leg);
            }
            bench.add(seat, back);
            bench.position.set(bx2, 0, bz2);
            bench.rotation.y = Math.random() * Math.PI;
            this.group.add(bench);
            Colliders.add({ x: bx2, z: bz2, hw: 11, hd: 4 });
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
          const para = new THREE.Mesh(new THREE.BoxGeometry(hw * 2 + 4, 5, hd * 2 + 4), new THREE.MeshLambertMaterial({ color: m.top.color.clone().multiplyScalar(0.8) }));
          para.position.set(bx, hgt + 2, bz);
          this.group.add(para);
          if (Math.random() < 0.5) {
            const ac = new THREE.Mesh(new THREE.BoxGeometry(12, 5, 10), new THREE.MeshLambertMaterial({ color: 0x8f959c }));
            ac.position.set(bx + (Math.random() - 0.5) * hw, hgt + 4, bz + (Math.random() - 0.5) * hd);
            this.group.add(ac);
          }
          if (hgt > 120 && Math.random() < 0.55) {
            const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.4, 40, 5), new THREE.MeshLambertMaterial({ color: 0x5a5f66 }));
            ant.position.set(bx, hgt + 22, bz);
            this.group.add(ant);
            const beacon = new THREE.Mesh(new THREE.SphereGeometry(2.4, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3524 }));
            beacon.position.set(bx, hgt + 43, bz);
            this.beacons.push(beacon);
            this.group.add(beacon);
          } else if (Math.random() < 0.4) {
            const tank = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 16, 10), new THREE.MeshLambertMaterial({ color: 0x7d6a52 }));
            tank.position.set(bx + hw * 0.3, hgt + 10, bz - hd * 0.25);
            tank.castShadow = true;
            this.group.add(tank);
          }
          this.buildings.push({ x: bx, z: bz, hw, hd, h: hgt });
          Colliders.add({ x: bx, z: bz, hw, hd });
        }
        blockIdx++;
      }
    }

    const sandTex = makeSandTexture(); sandTex.repeat.set(12, 62);
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.W - WORLD.SAND_X + 120, WORLD.H + 80), new THREE.MeshLambertMaterial({ map: sandTex }));
    sand.rotation.x = -Math.PI / 2; sand.position.set(WORLD.SAND_X + (WORLD.W - WORLD.SAND_X + 120) / 2, 0.005, WORLD.H / 2);
    sand.receiveShadow = true;
    this.group.add(sand);
    for (let z = 100; z < WORLD.H; z += 130) {
      const palm = makePalm(); palm.position.set(WORLD.SAND_X + 30 + Math.random() * 40, 0, z); this.group.add(palm);
      this.palms.push(palm);
      Colliders.add({ x: palm.position.x, z, r: 6 });
    }
    const wt = makeWaterTexture();
    wt.repeat.set(7, 34);
    this.waterMesh = new THREE.Mesh(new THREE.PlaneGeometry(1100, WORLD.H + 500), new THREE.MeshPhongMaterial({ color: 0xffffff, map: wt, transparent: true, opacity: 0.94, shininess: 140, specular: 0x9fd4ff }));
    this.waterMesh.rotation.x = -Math.PI / 2; this.waterMesh.position.set(WORLD.WATER_X + 550, 0.2, WORLD.H / 2);
    this.group.add(this.waterMesh);

    this.buildSky(scene);
    this.buildLamps();
    this.buildDetails();
    this.buildInteriors();
    this.buildAirport();
  },

  buildAirport() {
    const ap = WORLD.AIRPORT;
    const apron = new THREE.MeshLambertMaterial({ color: 0x565c62 });
    const island = new THREE.Mesh(new THREE.BoxGeometry(ap.x1 - ap.x0, 1.2, ap.z1 - ap.z0), apron);
    island.position.set((ap.x0 + ap.x1) / 2, 0.1, (ap.z0 + ap.z1) / 2);
    island.receiveShadow = true;
    this.group.add(island);
    const bridgeLen = ap.x0 - WORLD.SAND_X + 40;
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(bridgeLen, 1.2, 80), apron);
    bridge.position.set(WORLD.SAND_X - 20 + bridgeLen / 2, 0.1, ap.bridgeZ);
    bridge.receiveShadow = true;
    this.group.add(bridge);
    for (const ez of [ap.bridgeZ - 39, ap.bridgeZ + 39]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(bridgeLen, 6, 2), new THREE.MeshLambertMaterial({ color: 0x9aa2ab }));
      rail.position.set(bridge.position.x, 4, ez);
      this.group.add(rail);
    }
    for (let bx = WORLD.WATER_X - 10; bx < ap.x0; bx += 45) {
      Colliders.add({ x: bx, z: ap.bridgeZ - 40, r: 4 });
      Colliders.add({ x: bx, z: ap.bridgeZ + 40, r: 4 });
    }
    const ang = Math.atan2(ap.rwB.z - ap.rwA.z, ap.rwB.x - ap.rwA.x);
    const rwLen = Math.hypot(ap.rwB.x - ap.rwA.x, ap.rwB.z - ap.rwA.z);
    const rwTex = makeRunwayTexture();
    rwTex.repeat.set(1, 10);
    const runway = new THREE.Mesh(new THREE.PlaneGeometry(72, rwLen + 60), new THREE.MeshLambertMaterial({ map: rwTex }));
    runway.rotation.x = -Math.PI / 2;
    runway.rotation.z = -ang;
    runway.position.set((ap.rwA.x + ap.rwB.x) / 2, 0.85, (ap.rwA.z + ap.rwB.z) / 2);
    runway.receiveShadow = true;
    this.group.add(runway);
    this.rwAngle = ang;
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff2c8 });
    for (let t2 = 0; t2 <= rwLen; t2 += 65) {
      for (const side of [-1, 1]) {
        const lx = ap.rwA.x + Math.cos(ang) * t2 - Math.sin(ang) * side * 40;
        const lz = ap.rwA.z + Math.sin(ang) * t2 + Math.cos(ang) * side * 40;
        const l = new THREE.Mesh(new THREE.SphereGeometry(2, 6, 5), lightMat);
        l.position.set(lx, 2, lz);
        this.group.add(l);
      }
    }
    const wt = makeWindowsTexture('#dfe4ea', 0.3);
    const termSide = new THREE.MeshPhongMaterial({ map: wt.map, emissiveMap: wt.emissive, emissiveIntensity: 0, shininess: 20 });
    const terminal = new THREE.Mesh(new THREE.BoxGeometry(300, 64, 130), termSide);
    terminal.position.set(5800, 33, 4760);
    terminal.castShadow = true;
    this.group.add(terminal);
    Colliders.add({ x: 5800, z: 4760, hw: 150, hd: 65 });
    const termRoof = new THREE.Mesh(new THREE.BoxGeometry(320, 6, 150), new THREE.MeshLambertMaterial({ color: 0x3c4249 }));
    termRoof.position.set(5800, 67, 4760);
    this.group.add(termRoof);
    const towerBase = new THREE.Mesh(new THREE.CylinderGeometry(16, 20, 110, 10), new THREE.MeshLambertMaterial({ color: 0xcfd5da }));
    towerBase.position.set(5560, 56, 4760);
    this.group.add(towerBase);
    Colliders.add({ x: 5560, z: 4760, r: 20 });
    const towerTop = new THREE.Mesh(new THREE.CylinderGeometry(26, 22, 22, 10), new THREE.MeshPhongMaterial({ color: 0x1c2833, shininess: 90 }));
    towerTop.position.set(5560, 122, 4760);
    this.group.add(towerTop);
    const towerRoof = new THREE.Mesh(new THREE.CylinderGeometry(28, 28, 4, 10), new THREE.MeshLambertMaterial({ color: 0x3c4249 }));
    towerRoof.position.set(5560, 135, 4760);
    this.group.add(towerRoof);
    const hangar = new THREE.Mesh(new THREE.BoxGeometry(150, 90, 120), new THREE.MeshPhongMaterial({ color: 0xb8bfc7, shininess: 30 }));
    hangar.position.set(6010, 46, 5250);
    hangar.castShadow = true;
    this.group.add(hangar);
    Colliders.add({ x: 6010, z: 5250, hw: 75, hd: 60 });
    const hangarDoor = new THREE.Mesh(new THREE.BoxGeometry(4, 62, 90), new THREE.MeshLambertMaterial({ color: 0x6e767e }));
    hangarDoor.position.set(5933, 32, 5250);
    this.group.add(hangarDoor);
    this.airport = ap;
  },

  buildDetails() {
    const dummy = new THREE.Object3D();
    const spots = [];
    for (const rx of WORLD.Xs) for (let z = 320; z < WORLD.H; z += 560) spots.push([rx + (Math.random() < 0.5 ? -WORLD.LANE : WORLD.LANE), z]);
    for (const rz of WORLD.Ys) for (let x = 320; x < WORLD.CITY_X_MAX; x += 560) spots.push([x, rz + (Math.random() < 0.5 ? -WORLD.LANE : WORLD.LANE)]);
    const mh = new THREE.InstancedMesh(new THREE.CircleGeometry(7, 14), new THREE.MeshLambertMaterial({ color: 0x1d2024 }), spots.length);
    for (let i = 0; i < spots.length; i++) {
      dummy.position.set(spots[i][0], 0.07, spots[i][1]); dummy.rotation.set(-Math.PI / 2, 0, Math.random() * Math.PI); dummy.updateMatrix();
      mh.setMatrixAt(i, dummy.matrix);
    }
    dummy.rotation.set(0, 0, 0);
    this.group.add(mh);

    const hyd = [];
    for (const rx of WORLD.Xs) for (let z = 260; z < WORLD.H; z += 780) hyd.push([rx + (WORLD.ROAD / 2 + 22), z]);
    for (const rz of WORLD.Ys) for (let x = 260; x < WORLD.CITY_X_MAX; x += 780) hyd.push([x, rz - (WORLD.ROAD / 2 + 22)]);
    const hbody = new THREE.InstancedMesh(new THREE.CylinderGeometry(2.6, 3, 9, 8), new THREE.MeshPhongMaterial({ color: 0xc23a2e, shininess: 60 }), hyd.length);
    const hcap = new THREE.InstancedMesh(new THREE.SphereGeometry(2.6, 8, 6), new THREE.MeshPhongMaterial({ color: 0xd9453a, shininess: 70 }), hyd.length);
    for (let i = 0; i < hyd.length; i++) {
      dummy.position.set(hyd[i][0], 4.5, hyd[i][1]); dummy.updateMatrix(); hbody.setMatrixAt(i, dummy.matrix);
      dummy.position.set(hyd[i][0], 9.6, hyd[i][1]); dummy.updateMatrix(); hcap.setMatrixAt(i, dummy.matrix);
      Colliders.add({ x: hyd[i][0], z: hyd[i][1], r: 3 });
    }
    this.group.add(hbody); this.group.add(hcap);

    const bins = [];
    for (const rx of WORLD.Xs) for (let z = 480; z < WORLD.H; z += 940) bins.push([rx - (WORLD.ROAD / 2 + 20), z]);
    for (const rz of WORLD.Ys) for (let x = 480; x < WORLD.CITY_X_MAX; x += 940) bins.push([x, rz + (WORLD.ROAD / 2 + 20)]);
    const bin = new THREE.InstancedMesh(new THREE.CylinderGeometry(4.4, 3.8, 10, 9), new THREE.MeshPhongMaterial({ color: 0x2e5e46, shininess: 30 }), bins.length);
    for (let i = 0; i < bins.length; i++) {
      dummy.position.set(bins[i][0], 5, bins[i][1]); dummy.updateMatrix(); bin.setMatrixAt(i, dummy.matrix);
      Colliders.add({ x: bins[i][0], z: bins[i][1], r: 4.5 });
    }
    this.group.add(bin);

  },

  buildSky(scene) {
    this.sky = new THREE.Group();
    this.sky.position.set(WORLD.W / 2, 0, WORLD.H / 2);
    scene.add(this.sky);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: { top: { value: new THREE.Color(0x3a92dd) }, bot: { value: new THREE.Color(0xd4ecfa) } },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bot; varying vec3 vP; void main(){ float h = clamp(normalize(vP).y, 0.0, 1.0); gl_FragColor = vec4(mix(bot, top, pow(h, 0.6)), 1.0); }'
    });
    this.skyU = mat.uniforms;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(5400, 28, 18), mat);
    this.sky.add(dome);
    const sp = [];
    for (let i = 0; i < 700; i++) {
      const a = Math.random() * Math.PI * 2, e = Math.random() * Math.PI * 0.48 + 0.05, r = 5000;
      sp.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    this.starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.6, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false });
    const stars = new THREE.Points(sg, this.starMat);
    this.sky.add(stars);
    const gc = document.createElement('canvas'); gc.width = 128; gc.height = 128;
    const gg = gc.getContext('2d');
    const grd = gg.createRadialGradient(64, 64, 4, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,250,230,1)'); grd.addColorStop(0.25, 'rgba(255,238,180,0.7)'); grd.addColorStop(1, 'rgba(255,220,140,0)');
    gg.fillStyle = grd; gg.fillRect(0, 0, 128, 128);
    this.sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(gc), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.9 }));
    const sd = new THREE.Vector3(0.55, 0.78, 0.28).normalize();
    this.sunSprite.position.copy(sd).multiplyScalar(4600);
    this.sunSprite.scale.set(900, 900, 1);
    this.sky.add(this.sunSprite);
  },

  buildLamps() {
    const pts = [];
    let side = 1;
    for (const rx of WORLD.Xs) {
      side = -side;
      for (let z = 240; z < WORLD.H; z += 470) pts.push([rx + side * (WORLD.ROAD / 2 + 15), z]);
    }
    for (const rz of WORLD.Ys) {
      side = -side;
      for (let x = 240; x < WORLD.CITY_X_MAX; x += 470) pts.push([x, rz + side * (WORLD.ROAD / 2 + 15)]);
    }
    const n = pts.length;
    const dummy = new THREE.Object3D();
    const poleGeo = new THREE.CylinderGeometry(1.1, 1.7, 38, 6);
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x3c4148 });
    const poles = new THREE.InstancedMesh(poleGeo, poleMat, n);
    const headGeo = new THREE.SphereGeometry(2.4, 8, 6);
    const headMat = new THREE.MeshBasicMaterial({ color: 0xffe2a8 });
    this.headMat = headMat;
    const heads = new THREE.InstancedMesh(headGeo, headMat, n);
    const glowPos = [];
    for (let i = 0; i < n; i++) {
      const [x, z] = pts[i];
      dummy.position.set(x, 19, z); dummy.updateMatrix(); poles.setMatrixAt(i, dummy.matrix);
      dummy.position.set(x, 39, z); dummy.updateMatrix(); heads.setMatrixAt(i, dummy.matrix);
      glowPos.push(x, 40, z);
      Colliders.add({ x, z, r: 2 });
    }
    this.group.add(poles);
    this.group.add(heads);
    const gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.Float32BufferAttribute(glowPos, 3));
    const gcan = document.createElement('canvas'); gcan.width = 64; gcan.height = 64;
    const g2 = gcan.getContext('2d');
    const grd = g2.createRadialGradient(32, 32, 2, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,225,160,0.9)'); grd.addColorStop(1, 'rgba(255,200,110,0)');
    g2.fillStyle = grd; g2.fillRect(0, 0, 64, 64);
    this.lampGlow = new THREE.Points(gg, new THREE.PointsMaterial({ map: new THREE.CanvasTexture(gcan), color: 0xffd28a, size: 55, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.group.add(this.lampGlow);
    this.beaconMats = this.beacons.map(b => b.material);
  },

  buildInteriors() {
    const candidates = this.buildings.filter(b => b.hw > 26 && b.hw < 80 && b.hd > 26 && b.hd < 80);
    const chosen = [];
    for (const b of candidates) {
      if (chosen.length >= 8) break;
      let bestRoad = null, bestD = 1e9, axis = 'x';
      for (const rx of WORLD.Xs) { const d = Math.abs((b.x - b.hw) - rx); if (d < bestD) { bestD = d; bestRoad = rx; axis = 'x'; } if (Math.abs((b.x + b.hw) - rx) < bestD) { bestD = Math.abs((b.x + b.hw) - rx); bestRoad = rx; axis = 'x'; } }
      for (const rz of WORLD.Ys) { const d = Math.abs((b.z - b.hd) - rz); if (d < bestD) { bestD = d; bestRoad = rz; axis = 'z'; } if (Math.abs((b.z + b.hd) - rz) < bestD) { bestD = Math.abs((b.z + b.hd) - rz); bestRoad = rz; axis = 'z'; } }
      if (bestD > 80) continue;
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
      const wKinds = ['shotgun', 'sniper', 'smg', 'minigun'];
      const kind = wKinds[i % 4];
      const wCols = { shotgun: 0xff7043, sniper: 0x9a5cff, smg: 0xffa726, minigun: 0xe53935 };
      const wmesh = new THREE.Mesh(new THREE.BoxGeometry(9, 6, 9), new THREE.MeshPhongMaterial({ color: wCols[kind], shininess: 90, emissive: 0x332211 }));
      wmesh.position.set(bx - 100, 8, bz + 100);
      this.group.add(wmesh);
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
        cash: { x: bx + 40, z: bz + 30, mesh: cash, cd: 0 },
        wpn: { kind, x: bx - 100, z: bz + 100, mesh: wmesh, cd: 0 }
      });
    });
  },

  update(t) {
    if (this.waterMesh) {
      this.waterMesh.position.y = 0.2 + Math.sin(t * 1.4) * 0.25;
      const m = this.waterMesh.material.map;
      m.offset.y = (t * 0.012) % 1;
      m.offset.x = Math.sin(t * 0.07) * 0.06;
    }
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
    const ap = WORLD.AIRPORT;
    if (p.x > WORLD.WATER_X - r - 10) {
      const onBridge = Math.abs(p.z - ap.bridgeZ) < 44;
      const onIsland = p.x > ap.x0 && p.z > ap.z0 && p.z < ap.z1;
      if (!onBridge && !onIsland) { p.x = WORLD.WATER_X - r - 10; return true; }
      let hit = false;
      if (p.x > ap.x1 - r - 8) { p.x = ap.x1 - r - 8; hit = true; }
      if (p.x > ap.x0) {
        if (p.z < ap.z0 + r) { p.z = ap.z0 + r; hit = true; }
        if (p.z > ap.z1 - r) { p.z = ap.z1 - r; hit = true; }
      } else {
        if (p.z < ap.bridgeZ - 40 + r) { p.z = ap.bridgeZ - 40 + r; hit = true; }
        if (p.z > ap.bridgeZ + 40 - r) { p.z = ap.bridgeZ + 40 - r; hit = true; }
      }
      return hit;
    }
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
