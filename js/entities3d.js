function makeBlobShadow(size) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(size, 14), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.08;
  return m;
}

function makeLabelTexture(txt, bg, fg) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 128, 64);
  g.fillStyle = fg; g.font = 'bold 38px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(txt, 64, 34);
  return new THREE.CanvasTexture(c);
}

function makeCheckerTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 32;
  const g = c.getContext('2d');
  g.fillStyle = '#101014'; g.fillRect(0, 0, 128, 32);
  g.fillStyle = '#f2f2f2';
  for (let i = 0; i < 8; i++) if (i % 2 === 0) g.fillRect(i * 16, 0, 16, 16);
  for (let i = 0; i < 8; i++) if (i % 2 === 1) g.fillRect(i * 16, 16, 16, 16);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

const CAR_TYPES = {
  sport: { name: 'Cheetah GTS', len: 46, wid: 19, accel: 375, maxF: 700, maxR: -200, colors: [0xff3860, 0x22d3ee, 0xffd23c, 0xffffff], hp: 100 },
  sedan: { name: 'Regalia', len: 48, wid: 21, accel: 288, maxF: 560, maxR: -180, colors: [0x9aa4b0, 0x4a6fd4, 0xc47fe8, 0x59c98f, 0x302f38], hp: 120 },
  taxi: { name: 'Taxi Vice', len: 48, wid: 21, accel: 288, maxF: 560, maxR: -180, colors: [0xf7c948], hp: 120 },
  pickup: { name: 'Bobcat', len: 52, wid: 23, accel: 253, maxF: 500, maxR: -170, colors: [0x8a5a33, 0x556b2f, 0x708090], hp: 150 },
  police: { name: 'VCPD Cruiser', len: 50, wid: 22, accel: 375, maxF: 660, maxR: -200, colors: [0xf4f4f4], hp: 160 }
};

class Car {
  constructor(type, x, z, angle) {
    const t = CAR_TYPES[type] || CAR_TYPES.sedan;
    this.type = type; this.t = t;
    this.pos = new THREE.Vector3(x, 0, z);
    this.angle = angle; this.vx = 0; this.vz = 0;
    this.hp = t.hp; this.dead = false; this.burning = 0; this.exploded = false;
    this.isPolice = type === 'police';
    this.driver = null;
    this.node = null; this.dir = 0; this.cruise = 240 + Math.random() * 80;
    this.shootCd = 0;
    this.group = new THREE.Group();

    const color = t.colors[Math.floor(Math.random() * t.colors.length)];
    this.bodyMat = new THREE.MeshPhongMaterial({ color, shininess: 110, specular: 0x777777 });
    const cabinMat = new THREE.MeshPhongMaterial({ color: 0x101b30, shininess: 140, specular: 0x99bbff });
    const glassMat = new THREE.MeshPhongMaterial({ color: 0x22364e, transparent: true, opacity: 0.5, shininess: 180, specular: 0x99ccff });
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x1a1d22 });
    const chromeMat = new THREE.MeshPhongMaterial({ color: 0xd8dde3, shininess: 150, specular: 0xffffff });
    const box = (w2, h2, d2, mat, px, py, pz) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w2, h2, d2), mat);
      m.position.set(px, py, pz); m.castShadow = true; this.group.add(m); return m;
    };

    if (type === 'sport') {
      box(t.len, 8.5, t.wid, this.bodyMat, 0, 7.6, 0);
      const hood = box(t.len * 0.46, 3.2, t.wid * 0.97, this.bodyMat, t.len * 0.26, 12, 0); hood.rotation.z = 0.06;
      const cab = box(t.len * 0.38, 7, t.wid * 0.84, this.bodyMat, -t.len * 0.15, 15.5, 0); cab.rotation.z = -0.12;
      box(t.len * 0.32, 5, t.wid * 0.76, glassMat, -t.len * 0.14, 16.5, 0);
      box(6, 2.2, t.wid * 0.42, darkMat, t.len * 0.12, 14, 0);
      for (const sz of [-t.wid / 2 - 0.3, t.wid / 2 + 0.3]) box(t.len * 0.55, 1.6, 1.3, darkMat, -t.len * 0.05, 5.6, sz);
      for (const sz of [-4.5, 4.5]) box(2.4, 4.5, 2.4, this.bodyMat, -t.len / 2 + 2.5, 15.5, sz);
      box(4.5, 1.8, t.wid * 0.95, this.bodyMat, -t.len / 2 + 2, 18, 0);
      for (const ez of [-t.wid * 0.2, t.wid * 0.2]) box(3.5, 2, 2, chromeMat, -t.len / 2 - 1.4, 5, ez);
    } else if (type === 'pickup') {
      box(t.len * 0.5, 10, t.wid, this.bodyMat, t.len * 0.23, 8.6, 0);
      box(t.len * 0.3, 8.5, t.wid * 0.94, this.bodyMat, t.len * 0.12, 16.5, 0);
      box(t.len * 0.26, 5.5, t.wid * 0.82, glassMat, t.len * 0.12, 18, 0);
      box(t.len * 0.46, 2.2, t.wid * 0.9, darkMat, -t.len * 0.26, 8, 0);
      box(t.len * 0.46, 7.5, 2.2, this.bodyMat, -t.len * 0.26, 12.4, -t.wid / 2 + 1.1);
      box(t.len * 0.46, 7.5, 2.2, this.bodyMat, -t.len * 0.26, 12.4, t.wid / 2 - 1.1);
      box(2.2, 7.5, t.wid * 0.9, this.bodyMat, -t.len / 2 + 1.1, 12.4, 0);
      for (const sz of [-t.wid / 2 + 2, t.wid / 2 - 2]) {
        const roll = box(2.2, 14, 2.2, darkMat, t.len * 0.02, 22, sz); roll.rotation.x = 0;
      }
      box(t.len * 0.05, 9, t.wid * 0.5, darkMat, t.len * 0.5 + 1, 8, 0);
      for (const hz of [-t.wid * 0.28, t.wid * 0.28]) box(2.5, 2.4, 2.4, chromeMat, -t.len / 2 - 1.4, 5.2, hz);
    } else {
      box(t.len, 10, t.wid, this.bodyMat, 0, 9, 0);
      box(t.len * 0.26, 8.2, t.wid * 0.92, this.bodyMat, -t.len * 0.36, 8.8, 0);
      box(t.len * 0.18, 8.6, t.wid * 0.9, this.bodyMat, t.len * 0.4, 9.4, 0);
      box(t.len * 0.44, 8.5, t.wid * 0.84, this.bodyMat, -t.len * 0.04, 18, 0);
      box(t.len * 0.46, 5.5, t.wid * 0.86, glassMat, -t.len * 0.04, 19, 0);
      for (const sz of [-t.wid / 2 - 0.2, t.wid / 2 + 0.2]) box(t.len * 0.82, 1.5, 1.1, chromeMat, 0, 7.6, sz);
      box(t.len * 0.9, 0.8, 1, darkMat, 0, 13.2, t.wid / 2 + 0.15);
      box(t.len * 0.9, 0.8, 1, darkMat, 0, 13.2, -t.wid / 2 - 0.15);
    }

    const mirrorGeo = new THREE.BoxGeometry(1.6, 1.6, 3.4);
    const mirY = type === 'sport' ? 15 : (type === 'pickup' ? 18 : 19.5);
    for (const mz of [-t.wid / 2 - 1.6, t.wid / 2 + 1.6]) {
      const mir = new THREE.Mesh(mirrorGeo, cabinMat);
      mir.position.set(type === 'pickup' ? t.len * 0.22 : t.len * 0.13, mirY, mz); this.group.add(mir);
    }
    const plate = new THREE.Mesh(new THREE.BoxGeometry(1, 3.5, 7), new THREE.MeshPhongMaterial({ color: 0xe9e9e0, shininess: 40 }));
    plate.position.set(-t.len / 2 - 0.3, 6, 0); this.group.add(plate);
    const bumpMat = new THREE.MeshLambertMaterial({ color: 0x1a1d22 });
    for (const bx of [t.len / 2 - 1, -t.len / 2 + 1]) {
      const bump = new THREE.Mesh(new THREE.BoxGeometry(4, 5, t.wid + 1), bumpMat);
      bump.position.set(bx, 5.5, 0); this.group.add(bump);
    }
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xff3526 });
    const tlY = type === 'sport' ? 9.5 : 10;
    for (const hz of [-t.wid / 2 + 4, t.wid / 2 - 4]) {
      const tl = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3, 4), tailMat);
      tl.position.set(-t.len / 2 - 0.4, tlY, hz); this.group.add(tl);
    }

    const sideDecal = (txt, bg, fg, px, py, w2, h2) => {
      const tex = makeLabelTexture(txt, bg, fg);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w2, h2), new THREE.MeshBasicMaterial({ map: tex }));
      m.position.set(px, py, t.wid / 2 + 0.35); this.group.add(m);
      const m2 = new THREE.Mesh(new THREE.PlaneGeometry(w2, h2), new THREE.MeshBasicMaterial({ map: tex }));
      m2.position.set(px, py, -t.wid / 2 - 0.35); m2.rotation.y = Math.PI; this.group.add(m2);
    };
    if (type === 'taxi') {
      const signBase = box(9, 1.5, 4.5, darkMat, 0, 23.4, 0);
      const signTex = makeLabelTexture('TAXI', '#111', '#ffe066');
      const sign = new THREE.Mesh(new THREE.BoxGeometry(9, 4.5, 4.5), new THREE.MeshBasicMaterial({ map: signTex }));
      sign.position.set(0, 26.4, 0); this.group.add(sign);
      const checker = makeCheckerTexture(); checker.repeat.set(3, 1);
      for (const sz of [-t.wid / 2 - 0.45, t.wid / 2 + 0.45]) {
        const band = new THREE.Mesh(new THREE.BoxGeometry(t.len * 0.72, 3.2, 0.6), new THREE.MeshBasicMaterial({ map: checker }));
        band.position.set(t.len * 0.02, 9, sz); this.group.add(band);
      }
    }
    if (this.isPolice) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(t.len * 0.34, 10.4, t.wid + 0.3), new THREE.MeshPhongMaterial({ color: 0x14213d, shininess: 80 }));
      stripe.position.set(0, 9, 0); this.group.add(stripe);
      sideDecal('POLICE', '#14213d', '#ffffff', 0, 12.5, 20, 5);
      const hoodTxt = new THREE.Mesh(new THREE.BoxGeometry(1, 2.5, 12), new THREE.MeshBasicMaterial({ color: 0x14213d }));
      hoodTxt.position.set(t.len / 2 - 6, 14.5, 0); this.group.add(hoodTxt);
      for (const pz of [-6, 0, 6]) box(1.6, 8, 1.6, chromeMat, t.len / 2 + 2.4, 7, pz);
      box(1.6, 1.6, 13.6, chromeMat, t.len / 2 + 2.4, 10.5, 0);
      box(10, 2.4, 9, darkMat, 0, 22.6, 0);
      this.bar1 = new THREE.Mesh(new THREE.BoxGeometry(4, 3.5, 3.5), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
      this.bar1.position.set(0, 25, -4); this.group.add(this.bar1);
      this.bar2 = new THREE.Mesh(new THREE.BoxGeometry(4, 3.5, 3.5), new THREE.MeshBasicMaterial({ color: 0x2244ff }));
      this.bar2.position.set(0, 25, 4); this.group.add(this.bar2);
    }

    for (const hz of [-t.wid / 2 - 0.35, t.wid / 2 + 0.35]) for (const hx of [t.len * 0.16, -t.len * 0.14]) {
      box(3.4, 1.3, 0.9, chromeMat, hx, 11.5, hz);
    }
    box(1.2, 4, t.wid * 0.52, new THREE.MeshPhongMaterial({ color: 0x1c2126, shininess: 70 }), t.len / 2 + 0.3, 8.6, 0);
    if (type !== 'pickup') {
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 10, 4), new THREE.MeshLambertMaterial({ color: 0x17191d }));
      ant.position.set(-t.len / 2 + 6, 27, -t.wid / 4); this.group.add(ant);
      const antBall = new THREE.Mesh(new THREE.SphereGeometry(0.7, 6, 5), new THREE.MeshLambertMaterial({ color: 0xd0d3da }));
      antBall.position.set(-t.len / 2 + 6, 32.2, -t.wid / 4); this.group.add(antBall);
    }
    const exh = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.2, 4, 8), chromeMat);
    exh.rotation.z = Math.PI / 2;
    exh.position.set(-t.len / 2 - 1.4, 6.2, type === 'sport' ? t.wid / 4 : -t.wid / 4);
    this.group.add(exh);
    const exhCap = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.8, 8), new THREE.MeshPhongMaterial({ color: 0x0d0f12, shininess: 40 }));
    exhCap.rotation.z = Math.PI / 2; exhCap.position.set(-t.len / 2 - 3.4, 6.2, exh.position.z);
    this.group.add(exhCap);

    const wr = type === 'pickup' ? 5.3 : (type === 'sport' ? 4.1 : 4.6);
    const wwd = type === 'pickup' ? 4.2 : 3.4;
    const wheelGeo = new THREE.CylinderGeometry(wr, wr, wwd, 14);
    const wheelMat = new THREE.MeshPhongMaterial({ color: 0x15171b, shininess: 55 });
    const rimGeo = new THREE.CylinderGeometry(wr * 0.5, wr * 0.5, wwd + 0.15, 12);
    const rimMat = new THREE.MeshPhongMaterial({ color: type === 'sport' ? 0xe8eef4 : 0xc9ced6, shininess: 140, specular: 0xffffff });
    this.wheels = [];
    for (const [wx, wz] of [[t.len / 2 - 9, -t.wid / 2], [t.len / 2 - 9, t.wid / 2], [-t.len / 2 + 9, -t.wid / 2], [-t.len / 2 + 9, t.wid / 2]]) {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.add(new THREE.Mesh(rimGeo, rimMat));
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, wr, wz);
      const pivot = new THREE.Group(); pivot.add(w); pivot.position.set(wx, wr, wz); w.position.set(0, 0, 0);
      this.wheels.push(pivot);
      this.group.add(pivot);
    }
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
    for (const hz of [-t.wid / 2 + 4, t.wid / 2 - 4]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3, 4), hlMat);
      hl.position.set(t.len / 2 + 0.4, 9, hz); this.group.add(hl);
    }
    this.beamMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.16, depthWrite: false });
    this.beams = new THREE.Group();
    for (const hz of [-t.wid / 4, t.wid / 4]) {
      const beam = new THREE.Mesh(new THREE.ConeGeometry(9, 90, 8), this.beamMat);
      beam.rotation.z = Math.PI / 2; beam.rotation.x = Math.PI / 2;
      beam.position.set(t.len / 2 + 46, 8, hz);
      this.beams.add(beam);
    }
    this.beams.visible = false;
    this.group.add(this.beams);
    this.shadow = makeBlobShadow(t.len * 0.42);
    this.group.add(this.shadow);
    this.group.rotation.y = -this.angle;
  }

  forwardSpd() {
    const fx = Math.cos(this.angle), fz = Math.sin(this.angle);
    return this.vx * fx + this.vz * fz;
  }

  controlPlayer(dt, input) {
    const fx = Math.cos(this.angle), fz = Math.sin(this.angle);
    let fwd = this.vx * fx + this.vz * fz;
    let lat = this.vx * -fz + this.vz * fx;
    const hand = input.isDown('Space');
    if (input.isDown('KeyW', 'ArrowUp')) fwd += this.t.accel * dt;
    if (input.isDown('KeyS', 'ArrowDown')) fwd -= (fwd > 30 ? 700 : this.t.accel * 0.6) * dt;
    fwd = Math.max(this.t.maxR, Math.min(this.t.maxF, fwd));
    if (!input.isDown('KeyW', 'ArrowUp', 'KeyS', 'ArrowDown')) fwd *= Math.pow(0.992, dt * 60);
    if (hand) fwd *= Math.pow(0.965, dt * 60);
    const dirIn = input.isDown('KeyD', 'ArrowRight') ? 1 : (input.isDown('KeyA', 'ArrowLeft') ? -1 : 0);
    const grip = hand ? 0.985 : 0.86;
    lat *= Math.pow(grip, dt * 60);
    const sf = Math.min(1, Math.abs(fwd) / 160);
    this.angle += dirIn * (hand ? 3.3 : 2.5) * dt * sf * Math.sign(fwd || 1);
    const nfx = Math.cos(this.angle), nfz = Math.sin(this.angle);
    this.vx = nfx * fwd - nfz * lat;
    this.vz = nfz * fwd + nfx * lat;

    for (const w of this.wheels) w.children[0].rotation.x += fwd * dt * 0.25;
    this.wheels[0].rotation.y = dirIn * 0.45;
    this.wheels[1].rotation.y = dirIn * 0.45;
  }

  updateAI(dt) {
    const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    if (!this.node) return;
    const [di, dj] = dirs[this.dir];
    let tx, tz;
    if (di !== 0) { tx = WORLD.Xs[this.node[0]]; tz = WORLD.Ys[this.node[1]] + (di > 0 ? WORLD.LANE : -WORLD.LANE); }
    else { tx = WORLD.Xs[this.node[0]] + (dj > 0 ? -WORLD.LANE : WORLD.LANE); tz = WORLD.Ys[this.node[1]]; }
    const arrived = Math.abs(di !== 0 ? (this.pos.x - WORLD.Xs[this.node[0]]) : (this.pos.z - WORLD.Ys[this.node[1]])) < 22;
    if (arrived) {
      const opts = [];
      for (let d = 0; d < 4; d++) {
        if ((d + 2) % 4 === this.dir) continue;
        const [di2, dj2] = dirs[d];
        const ni = this.node[0] + di2, nj = this.node[1] + dj2;
        if (ni >= 0 && ni < WORLD.Xs.length && nj >= 0 && nj < WORLD.Ys.length) opts.push(d);
      }
      if (opts.length === 0) opts.push((this.dir + 2) % 4);
      let d = opts[Math.floor(Math.random() * opts.length)];
      if (opts.includes(this.dir) && Math.random() < 0.55) d = this.dir;
      this.dir = d;
      const [di3, dj3] = dirs[d];
      this.node = [this.node[0] + di3, this.node[1] + dj3];
      return;
    }
    const want = Math.atan2(tz - this.pos.z, tx - this.pos.x);
    let diff = want - this.angle;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    this.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff * 3 * dt));

    let front = false;
    for (const o of Game.cars) {
      if (o === this) continue;
      const dx = o.pos.x - this.pos.x, dz = o.pos.z - this.pos.z;
      const fx = Math.cos(this.angle), fz = Math.sin(this.angle);
      if (dx * fx + dz * fz > 0 && dx * fx + dz * fz < 150 && Math.abs(dx * -fz + dz * fx) < 24) { front = true; break; }
    }
    if (!front && Game.player.car !== this) {
      const p = Game.player.pos;
      const dx = p.x - this.pos.x, dz = p.z - this.pos.z;
      const fx = Math.cos(this.angle), fz = Math.sin(this.angle);
      if (dx * fx + dz * fz > 0 && dx * fx + dz * fz < 130 && Math.abs(dx * -fz + dz * fx) < 22) front = true;
    }
    const target = front ? 0 : (Math.abs(diff) > 0.5 ? this.cruise * 0.4 : this.cruise);
    const f = this.forwardSpd();
    const acc = target > f ? 380 : -520;
    const nf = Math.max(0, Math.min(this.cruise, f + acc * dt));
    this.vx = Math.cos(this.angle) * nf; this.vz = Math.sin(this.angle) * nf;
    for (const w of this.wheels) w.children[0].rotation.x += nf * dt * 0.25;
  }

  physics(dt) {
    const spd = Math.hypot(this.vx, this.vz);
    this.pos.x += this.vx * dt; this.pos.z += this.vz * dt;
    if (City.clampToLand(this.pos, 24) || City.collide(this.pos, 22)) {
      if (spd > 200) this.damage((spd - 160) / 9, false);
      if (spd > 60) { Sound.crash(spd / 800); Game.sparks(this.pos, 6); }
      this.vx *= -0.35; this.vz *= -0.35;
    }
    this.group.position.copy(this.pos);
    this.group.rotation.y = -this.angle;
    const tilt = Math.max(-0.12, Math.min(0.12, (this.vx * -Math.sin(this.angle) + this.vz * Math.cos(this.angle)) * 0.0004));
    this.group.rotation.z = -tilt;
  }

  damage(d, byPlayer) {
    if (this.dead) return;
    this.hp -= d;
    if (this.hp < 40 && !this.burnSmoke) { /* start smoking */ }
    if (this.hp <= 0) this.dead = true;
    if (byPlayer && this.isPolice) Police.crime(1.2);
    Game.dirtyCars = true;
  }

  setNight(on) { this.beams.visible = on && !this.dead; }
}

class Ped {
  constructor(x, z) {
    this.pos = new THREE.Vector3(x, 0, z);
    const skin = [0xe8b48a, 0xc98a5e, 0x8a5a3a, 0xf0c8a0, 0x6e452c][Math.floor(Math.random() * 5)];
    const shirt = [0xe75480, 0x30c5c0, 0xf2a541, 0xffffff, 0x7e57c2, 0xff7043, 0x2d6b4f, 0xd44a3a][Math.floor(Math.random() * 8)];
    const pants = [0x22304a, 0x3a3f47, 0x59422e, 0x6b2230, 0x2d4d3f, 0xd0d3da][Math.floor(Math.random() * 6)];
    const hairC = [0x2a1e16, 0x120d0a, 0x6b4a2a, 0xb8a878, 0x8a8f96, 0x4a2f6b][Math.floor(Math.random() * 6)];
    this.group = new THREE.Group();
    const pantsMat = new THREE.MeshLambertMaterial({ color: pants });
    const shirtMat = new THREE.MeshLambertMaterial({ color: shirt });
    const pelvis = new THREE.Mesh(new THREE.BoxGeometry(6.6, 4.5, 4.6), pantsMat);
    pelvis.position.y = 8.2; this.group.add(pelvis);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(8, 10.5, 5), shirtMat);
    torso.position.y = 15.5; this.group.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(3.3, 10, 8), new THREE.MeshLambertMaterial({ color: skin }));
    head.position.y = 23.2; this.group.add(head);
    this.head = head;
    if (Math.random() < 0.75) {
      const hair = new THREE.Mesh(new THREE.SphereGeometry(3.4, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: hairC }));
      hair.position.y = 23.2; this.group.add(hair);
      if (Math.random() < 0.3) {
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.6, 1.5, 10), new THREE.MeshLambertMaterial({ color: shirt }));
        cap.position.y = 25.4; this.group.add(cap);
      }
    }
    this.arms = [];
    const armGeo = new THREE.BoxGeometry(2.6, 9, 2.6);
    armGeo.translate(0, -3.8, 0);
    for (const ax of [-5.3, 5.3]) {
      const arm = new THREE.Mesh(armGeo, shirtMat);
      arm.position.set(ax, 20, 0); this.arms.push(arm); this.group.add(arm);
    }
    this.legs = [];
    const legGeo = new THREE.BoxGeometry(3, 8.5, 3.4);
    legGeo.translate(0, -4.2, 0);
    for (const lx of [-2, 2]) {
      const leg = new THREE.Mesh(legGeo, pantsMat);
      leg.position.set(lx, 8.4, 0); this.legs.push(leg); this.group.add(leg);
    }
    this.group.add(makeBlobShadow(6));
    this.target = City.randomSidewalkPoint();
    this.angle = Math.random() * Math.PI * 2;
    this.panic = 0; this.dead = false; this.deadT = 0; this.walkT = Math.random() * 10;
    this.speed = 60 + Math.random() * 40;
  }

  scare(fromX, fromZ) {
    if (this.dead) return;
    this.panic = Math.max(this.panic, 6);
    if (this.fugitive) return;
    const dx = this.pos.x - fromX, dz = this.pos.z - fromZ;
    if (Math.hypot(dx, dz) < 160) this.target = { x: this.pos.x + dx * 3, z: this.pos.z + dz * 3 };
  }

  fleeNode() {
    const pp = Game.playerPos();
    let bi = 0, bj = 0, bd = Infinity;
    for (let i = 0; i < WORLD.Xs.length; i++) { const d = Math.abs(WORLD.Xs[i] - this.pos.x); if (d < bd) { bd = d; bi = i; } }
    bd = Infinity;
    for (let j = 0; j < WORLD.Ys.length; j++) { const d = Math.abs(WORLD.Ys[j] - this.pos.z); if (d < bd) { bd = d; bj = j; } }
    const cand = [];
    if (bi > 0) cand.push([bi - 1, bj]);
    if (bi < WORLD.Xs.length - 1) cand.push([bi + 1, bj]);
    if (bj > 0) cand.push([bi, bj - 1]);
    if (bj < WORLD.Ys.length - 1) cand.push([bi, bj + 1]);
    let best = cand[0], bs = -1;
    for (const c of cand) {
      const s = Math.hypot(WORLD.Xs[c[0]] - pp.x, WORLD.Ys[c[1]] - pp.z) + Math.random() * 350;
      if (s > bs) { bs = s; best = c; }
    }
    return { x: WORLD.Xs[best[0]], z: WORLD.Ys[best[1]] };
  }

  update(dt) {
    if (this.dead) { this.deadT += dt; this.group.rotation.z = Math.min(Math.PI / 2, this.deadT * 6); return; }
    if (this.fugitive) {
      this.fleeT = (this.fleeT || 0) - dt;
      if (!this.target || this.fleeT <= 0 || Math.hypot(this.target.x - this.pos.x, this.target.z - this.pos.z) < 24) {
        this.target = this.fleeNode(); this.fleeT = 6;
      }
    } else {
      const dist = Math.hypot(this.target.x - this.pos.x, this.target.z - this.pos.z);
      if (dist < 14) {
        this.target = this.panic > 0 ? { x: this.pos.x + (Math.random() - 0.5) * 400, z: this.pos.z + (Math.random() - 0.5) * 400 } : City.randomSidewalkPoint();
      }
    }
    const spd = this.fugitive ? this.speed * (this.panic > 0 ? 1.35 : 1) : (this.panic > 0 ? this.speed * 2.4 : this.speed);
    if (this.panic > 0) this.panic -= dt;
    const dir = Math.atan2(this.target.z - this.pos.z, this.target.x - this.pos.x);
    this.angle = dir;
    this.pos.x += Math.cos(dir) * spd * dt;
    this.pos.z += Math.sin(dir) * spd * dt;
    City.clampToLand(this.pos, 6);
    City.collide(this.pos, 6);
    this.walkT += dt * spd * 0.12;
    this.group.position.copy(this.pos);
    this.group.rotation.y = -this.angle;
    const sw = Math.sin(this.walkT);
    this.legs[0].rotation.x = -sw * 0.75;
    this.legs[1].rotation.x = sw * 0.75;
    this.arms[0].rotation.x = sw * 0.5;
    this.arms[1].rotation.x = -sw * 0.5;
    this.head.position.y = 23.2 + Math.abs(sw) * 0.6 + Math.sin(this.walkT * 2) * 0.25;
  }

  die(byPlayer) {
    if (this.dead) return;
    this.dead = true;
    if (byPlayer) Police.crime(2.2);
  }
}

class FootCop {
  constructor(x, z) {
    this.pos = new THREE.Vector3(x, 0, z);
    this.group = new THREE.Group();
    const navy = new THREE.MeshLambertMaterial({ color: 0x22355e });
    const navyDark = new THREE.MeshLambertMaterial({ color: 0x1a2740 });
    const pelvis = new THREE.Mesh(new THREE.BoxGeometry(6.6, 4.5, 4.6), navyDark);
    pelvis.position.y = 8.2; this.group.add(pelvis);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(8, 10.5, 5), navy);
    torso.position.y = 15.5; this.group.add(torso);
    const badge = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 0.8), new THREE.MeshLambertMaterial({ color: 0xffd23c }));
    badge.position.set(-2, 17.5, 2.7); this.group.add(badge);
    const head = new THREE.Mesh(new THREE.SphereGeometry(3.3, 10, 8), new THREE.MeshLambertMaterial({ color: 0xe8b48a }));
    head.position.y = 23.2; this.head = head; this.group.add(head);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(3.7, 3.9, 1.8, 10), navy);
    cap.position.y = 25.6; this.group.add(cap);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.8, 2.6), navyDark);
    visor.position.set(0, 24.8, 3.6); this.group.add(visor);
    this.arms = [];
    const armGeo = new THREE.BoxGeometry(2.6, 9, 2.6);
    armGeo.translate(0, -3.8, 0);
    for (const ax of [-5.3, 5.3]) {
      const arm = new THREE.Mesh(armGeo, navy);
      arm.position.set(ax, 20, 0); this.arms.push(arm); this.group.add(arm);
    }
    const gun = new THREE.Mesh(new THREE.BoxGeometry(6.5, 3, 2), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    gun.position.set(5.3, 14.5, 3.5); this.gun = gun; this.group.add(gun);
    this.legs = [];
    const legGeo = new THREE.BoxGeometry(3, 8.5, 3.4);
    legGeo.translate(0, -4.2, 0);
    for (const lx of [-2, 2]) {
      const leg = new THREE.Mesh(legGeo, navyDark);
      leg.position.set(lx, 8.4, 0); this.legs.push(leg); this.group.add(leg);
    }
    this.group.add(makeBlobShadow(6));
    this.angle = Math.random() * Math.PI * 2;
    this.hp = 30; this.dead = false; this.deadT = 0;
    this.shootCd = 1 + Math.random();
    this.walkT = Math.random() * 10;
    this.group.position.copy(this.pos);
  }

  update(dt) {
    if (this.dead) {
      this.deadT += dt;
      this.group.rotation.z = Math.min(Math.PI / 2, this.deadT * 7);
      return;
    }
    const p = Game.playerPos();
    const d = Math.hypot(p.x - this.pos.x, p.z - this.pos.z);
    let spd = 0;
    if (!Game.player.interior) {
      if (d > 60) spd = 165;
      else if (d > 26) spd = 70;
    }
    if (spd > 0) {
      const dir = Math.atan2(p.z - this.pos.z, p.x - this.pos.x);
      this.angle = dir;
      this.pos.x += Math.cos(dir) * spd * dt;
      this.pos.z += Math.sin(dir) * spd * dt;
      City.collide(this.pos, 6);
      this.walkT += dt * spd * 0.12;
    }
    this.group.position.copy(this.pos);
    this.group.rotation.y = -this.angle;
    const sw = Math.sin(this.walkT);
    this.legs[0].rotation.x = -sw * 0.75;
    this.legs[1].rotation.x = sw * 0.75;
    this.arms[0].rotation.x = sw * 0.5;
    this.arms[1].rotation.x = -sw * 0.5;
    this.shootCd -= dt;
  }

  die(byPlayer) {
    if (this.dead) return;
    this.dead = true;
    if (byPlayer) Police.crime(1.5);
  }
}

class Player {
  constructor() {
    this.pos = new THREE.Vector3(150, 0, 260);
    this.angle = 0; this.health = 100; this.armor = 0; this.money = 500;
    this.car = null; this.speed = 0;
    this.weapons = {
      pistol: { name: 'Pistolet', dmg: 14, rate: 0.34, ammo: Infinity, spd: 1100 },
      smg: { name: 'SMG', dmg: 8, rate: 0.09, ammo: 0, spd: 1100 },
      shotgun: { name: 'Fusil à pompe', dmg: 9, rate: 0.95, ammo: 0, spd: 1100, pellets: 5 },
      sniper: { name: 'Sniper', dmg: 55, rate: 1.3, ammo: 0, spd: 1100 },
      minigun: { name: 'Mitrailleuse', dmg: 6, rate: 0.06, ammo: 0, spd: 1100 }
    };
    this.weapon = 'pistol';
    this.shootCd = 0;
    this.group = new THREE.Group();
    const torso = new THREE.Mesh(new THREE.BoxGeometry(9, 11, 5.5), new THREE.MeshPhongMaterial({ color: 0x2ec4b6, shininess: 30 }));
    torso.position.y = 15.5; torso.castShadow = true; this.group.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(3.8, 10, 8), new THREE.MeshLambertMaterial({ color: 0xe8b48a }));
    head.position.y = 24; this.group.add(head);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(3.9, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x2a1e16 }));
    hair.position.y = 24; this.group.add(hair);
    this.legs = [];
    for (const lx of [-2.4, 2.4]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(3.6, 10, 4), new THREE.MeshLambertMaterial({ color: 0x35507a }));
      leg.position.set(lx, 5, 0); this.group.add(leg); this.legs.push(leg);
    }
    const armGeo = new THREE.BoxGeometry(3, 9, 3);
    armGeo.translate(0, -3.5, 0);
    const arm = new THREE.Mesh(armGeo, new THREE.MeshLambertMaterial({ color: 0xe8b48a }));
    arm.position.set(-5.2, 19, 0); this.group.add(arm); this.arms = [arm];
    const rArm = new THREE.Mesh(armGeo, new THREE.MeshLambertMaterial({ color: 0xe8b48a }));
    rArm.position.set(5.2, 19, 0); this.group.add(rArm); this.arms.push(rArm);
    const gun = new THREE.Mesh(new THREE.BoxGeometry(7, 3, 2), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    gun.position.set(5.2, 17, 4.6); this.gun = gun; this.group.add(gun);
    this.gunVisible(true);
    this.group.add(makeBlobShadow(7));
  }

  gunVisible(on) { this.gun.visible = true; }

  get weaponDef() { return this.weapons[this.weapon]; }

  damage(d) {
    const a = Math.min(this.armor, d * 0.7);
    this.armor -= a; this.health -= (d - a);
    Game.dirtyHUD = true;
  }
}

class Plane {
  constructor(i) {
    const ap = WORLD.AIRPORT;
    this.livery = [0xe0533f, 0x2f9fdb, 0xf2b134][i % 3];
    this.pos = new THREE.Vector3(ap.rwA.x, 0, ap.rwA.z);
    this.angle = Math.atan2(ap.rwB.z - ap.rwA.z, ap.rwB.x - ap.rwA.x);
    this.speed = 0;
    this.y = 0;
    this.pitch = 0;
    this.prevX = this.pos.x;
    this.prevZ = this.pos.z;
    this.phase = 'wait';
    this.phaseT = 4 + i * 7;
    this.turnT = 0;
    this.group = new THREE.Group();
    this.group.rotation.order = 'YXZ';
    const body = new THREE.MeshPhongMaterial({ color: 0xf2f4f6, shininess: 110, specular: 0xbbccdd });
    const acc = new THREE.MeshPhongMaterial({ color: this.livery, shininess: 90 });
    const dark = new THREE.MeshPhongMaterial({ color: 0x22262b, shininess: 60 });
    const glass = new THREE.MeshPhongMaterial({ color: 0x20303e, shininess: 160, specular: 0x99ccee });
    const fus = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 84, 12), body);
    fus.rotation.z = Math.PI / 2;
    fus.position.y = 26;
    fus.castShadow = true;
    this.group.add(fus);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(6, 12, 9), body);
    nose.position.set(42, 26, 0);
    this.group.add(nose);
    const stripeL = new THREE.Mesh(new THREE.BoxGeometry(74, 3.4, 0.7), acc);
    stripeL.position.set(0, 29, 6);
    this.group.add(stripeL);
    const stripeR = stripeL.clone();
    stripeR.position.z = -6;
    this.group.add(stripeR);
    const cockpit = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 9.5), glass);
    cockpit.position.set(35, 33, 0);
    this.group.add(cockpit);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(27, 2.6, 112), body);
    wing.position.set(2, 20, 0);
    wing.castShadow = true;
    this.group.add(wing);
    const wingStripe = new THREE.Mesh(new THREE.BoxGeometry(27, 1, 6), acc);
    wingStripe.position.set(2, 21.4, 0);
    this.group.add(wingStripe);
    for (const ez of [-28, 28]) {
      const eng = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.6, 15, 10), dark);
      eng.rotation.z = Math.PI / 2;
      eng.position.set(8, 15, ez);
      this.group.add(eng);
      const fan = new THREE.Mesh(new THREE.CircleGeometry(4.2, 10), new THREE.MeshLambertMaterial({ color: 0x0b0d10 }));
      fan.rotation.y = Math.PI / 2;
      fan.position.set(15.6, 15, ez);
      this.group.add(fan);
    }
    const fin = new THREE.Mesh(new THREE.BoxGeometry(15, 24, 2.6), acc);
    fin.position.set(-39, 41, 0);
    this.group.add(fin);
    const stab = new THREE.Mesh(new THREE.BoxGeometry(10, 2, 38), body);
    stab.position.set(-40, 30, 0);
    this.group.add(stab);
    this.gear = [];
    for (const gp of [[24, 0], [-8, -14], [-8, 14]]) {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 12, 6), dark);
      strut.position.set(gp[0], 8, gp[1]);
      this.group.add(strut);
      const wheel = new THREE.Mesh(new THREE.SphereGeometry(3, 8, 6), new THREE.MeshLambertMaterial({ color: 0x14161a }));
      wheel.scale.y = 0.55;
      wheel.position.set(gp[0], 2.5, gp[1]);
      this.group.add(wheel);
      this.gear.push(strut, wheel);
    }
    this.beacon = new THREE.Mesh(new THREE.SphereGeometry(1.6, 6, 5), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    this.beacon.position.set(0, 33.5, 0);
    this.group.add(this.beacon);
  }

  localOf(p) {
    const dx = p.x - this.pos.x, dz = p.z - this.pos.z;
    const c = Math.cos(this.angle), s = Math.sin(this.angle);
    return { x: dx * c + dz * s, z: -dx * s + dz * c };
  }

  worldOf(lx, lz) {
    const c = Math.cos(this.angle), s = Math.sin(this.angle);
    return { x: this.pos.x + lx * c - lz * s, z: this.pos.z + lx * s + lz * c };
  }

  topAt(lx, lz) {
    if (Math.abs(lx) < 13 && Math.abs(lz) < 6.5) return 32.5;
    if (lx > -16 && lx < 15 && Math.abs(lz) < 56) return 21.3;
    return null;
  }

  move(dt) {
    this.pos.x += Math.cos(this.angle) * this.speed * dt;
    this.pos.z += Math.sin(this.angle) * this.speed * dt;
  }

  update(dt) {
    const ap = WORLD.AIRPORT;
    this.prevX = this.pos.x;
    this.prevZ = this.pos.z;
    let targetPitch = 0;
    if (this.phase === 'wait') {
      this.speed = 0;
      this.phaseT -= dt;
      if (this.phaseT <= 0) this.phase = 'takeoff';
    } else if (this.phase === 'takeoff') {
      this.speed = Math.min(310, this.speed + 95 * dt);
      this.move(dt);
      if (this.speed >= 250) this.phase = 'climb';
    } else if (this.phase === 'climb') {
      this.speed = Math.min(450, this.speed + 65 * dt);
      this.y = Math.min(560, this.y + 160 * dt);
      this.move(dt);
      targetPitch = 0.3;
      if (this.y >= 560) this.phase = 'out';
    } else if (this.phase === 'out') {
      this.speed = 450;
      const want = Math.atan2(700 - this.pos.z, 700 - this.pos.x);
      let da = want - this.angle;
      while (da > Math.PI) da -= 2 * Math.PI;
      while (da < -Math.PI) da += 2 * Math.PI;
      this.angle += da * Math.min(1, dt * 1.2);
      this.move(dt);
      targetPitch = 0.05;
      if (Math.hypot(700 - this.pos.x, 700 - this.pos.z) < 350) { this.phase = 'turn'; this.turnT = 0; }
    } else if (this.phase === 'turn') {
      this.speed = 400;
      this.angle += dt * 1.15;
      this.turnT += dt * 1.15;
      this.move(dt);
      if (this.turnT >= Math.PI) { this.angle = this.baseAngle + Math.PI; this.phase = 'back'; }
    } else if (this.phase === 'back') {
      this.speed = 430;
      const want = Math.atan2(ap.rwB.z - this.pos.z, ap.rwB.x - this.pos.x);
      let da = want - this.angle;
      while (da > Math.PI) da -= 2 * Math.PI;
      while (da < -Math.PI) da += 2 * Math.PI;
      this.angle += da * Math.min(1, dt * 1.5);
      this.move(dt);
      const dB = Math.hypot(ap.rwB.x - this.pos.x, ap.rwB.z - this.pos.z);
      if (dB < 900) this.phase = 'descend';
    } else if (this.phase === 'descend') {
      const dx = ap.rwB.x - this.pos.x, dz = ap.rwB.z - this.pos.z;
      const d = Math.hypot(dx, dz);
      const want = Math.atan2(dz, dx);
      let da = want - this.angle;
      while (da > Math.PI) da -= 2 * Math.PI;
      while (da < -Math.PI) da += 2 * Math.PI;
      this.angle += da * Math.min(1, dt * 2.2);
      this.speed = 330;
      this.y = Math.max(0, Math.min(560, (d - 100) * 1.05));
      this.move(dt);
      targetPitch = -0.12;
      if (d < 110) {
        this.y = 0;
        this.angle = this.baseAngle + Math.PI;
        this.phase = 'roll';
      }
    } else if (this.phase === 'roll') {
      this.speed = Math.max(0, this.speed - 130 * dt);
      this.move(dt);
      const c = Math.cos(this.angle), s = Math.sin(this.angle);
      const t = Math.max(0, Math.min(rwLenSafe(), (this.pos.x - ap.rwB.x) * c + (this.pos.z - ap.rwB.z) * s));
      this.pos.x = ap.rwB.x + c * t;
      this.pos.z = ap.rwB.z + s * t;
      if (this.speed <= 4) { this.speed = 0; this.phase = 'taxi'; }
    } else if (this.phase === 'taxi') {
      this.speed = 90;
      this.move(dt);
      const dA = Math.hypot(ap.rwA.x - this.pos.x, ap.rwA.z - this.pos.z);
      if (dA < 30) { this.pos.x = ap.rwA.x; this.pos.z = ap.rwA.z; this.speed = 0; this.phase = 'groundturn'; this.turnT = 0; }
    } else if (this.phase === 'groundturn') {
      this.angle += dt * 1.5;
      this.turnT += dt * 1.5;
      if (this.turnT >= Math.PI) { this.angle = this.baseAngle; this.phase = 'wait'; this.phaseT = 7; }
    }
    if (this.phase === 'climb' || this.phase === 'out' || this.phase === 'turn' || this.phase === 'back' || this.phase === 'descend') {
      if (this.pos.x < 250 || this.pos.z < 250 || this.pos.x > WORLD.W - 200 || this.pos.z > WORLD.H - 100) {
        this.pos.x = Math.max(250, Math.min(WORLD.W - 200, this.pos.x));
        this.pos.z = Math.max(250, Math.min(WORLD.H - 100, this.pos.z));
      }
    }
    this.pitch += (targetPitch - this.pitch) * Math.min(1, dt * 3);
    this.group.position.set(this.pos.x, this.y, this.pos.z);
    this.group.rotation.y = -this.angle;
    this.group.rotation.z = this.pitch;
    const onGround = this.y < 2;
    for (const g2 of this.gear) g2.visible = onGround;
    this.beacon.visible = Math.floor(performance.now() / 450) % 2 === 0;
  }

  get baseAngle() {
    const ap = WORLD.AIRPORT;
    return Math.atan2(ap.rwB.z - ap.rwA.z, ap.rwB.x - ap.rwA.x);
  }
}

function rwLenSafe() {
  const ap = WORLD.AIRPORT;
  return Math.hypot(ap.rwB.x - ap.rwA.x, ap.rwB.z - ap.rwA.z);
}
