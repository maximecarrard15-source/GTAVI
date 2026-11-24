function makeBlobShadow(size) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(size, 14), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.08;
  return m;
}

const CAR_TYPES = {
  sport: { name: 'Cheetah GTS', len: 46, wid: 19, accel: 430, maxF: 700, maxR: -200, colors: [0xff3860, 0x22d3ee, 0xffd23c, 0xffffff], hp: 100 },
  sedan: { name: 'Regalia', len: 48, wid: 21, accel: 330, maxF: 560, maxR: -180, colors: [0x9aa4b0, 0x4a6fd4, 0xc47fe8, 0x59c98f, 0x302f38], hp: 120 },
  taxi: { name: 'Taxi Vice', len: 48, wid: 21, accel: 330, maxF: 560, maxR: -180, colors: [0xf7c948], hp: 120 },
  pickup: { name: 'Bobcat', len: 52, wid: 23, accel: 290, maxF: 500, maxR: -170, colors: [0x8a5a33, 0x556b2f, 0x708090], hp: 150 },
  police: { name: 'VCPD Cruiser', len: 50, wid: 22, accel: 430, maxF: 660, maxR: -200, colors: [0xf4f4f4], hp: 160 }
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
    this.bodyMat = new THREE.MeshPhongMaterial({ color, shininess: 100, specular: 0x666666 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(t.len, 11, t.wid), this.bodyMat);
    body.position.y = 9; body.castShadow = true; this.group.add(body);
    const cabinMat = new THREE.MeshPhongMaterial({ color: 0x101b30, shininess: 140, specular: 0x99bbff });
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(t.len * 0.45, 9, t.wid * 0.82), cabinMat);
    cabin.position.set(-t.len * 0.05, 18.5, 0); cabin.castShadow = true; this.group.add(cabin);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(t.len * 0.46, 6, t.wid * 0.86), new THREE.MeshPhongMaterial({ color: 0x4a90c2, transparent: true, opacity: 0.35, shininess: 160 }));
    glass.position.set(-t.len * 0.05, 19.5, 0); this.group.add(glass);
    const bumpMat = new THREE.MeshLambertMaterial({ color: 0x1a1d22 });
    for (const bx of [t.len / 2 - 1, -t.len / 2 + 1]) {
      const bump = new THREE.Mesh(new THREE.BoxGeometry(4, 5, t.wid + 1), bumpMat);
      bump.position.set(bx, 5.5, 0); this.group.add(bump);
    }
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xff3526 });
    for (const hz of [-t.wid / 2 + 4, t.wid / 2 - 4]) {
      const tl = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3, 4), tailMat);
      tl.position.set(-t.len / 2 - 0.4, 10, hz); this.group.add(tl);
    }
    if (type === 'sport') {
      const spoiler = new THREE.Mesh(new THREE.BoxGeometry(4, 2, t.wid * 0.9), this.bodyMat);
      spoiler.position.set(-t.len / 2 + 2, 17, 0); this.group.add(spoiler);
    }
    if (type === 'taxi') {
      const sign = new THREE.Mesh(new THREE.BoxGeometry(8, 4, 5), new THREE.MeshBasicMaterial({ color: 0xffe066 }));
      sign.position.set(2, 25, 0); this.group.add(sign);
    }
    if (this.isPolice) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(t.len * 0.25, 11.2, t.wid + 0.4), new THREE.MeshPhongMaterial({ color: 0x14213d, shininess: 80 }));
      stripe.position.set(0, 9, 0); this.group.add(stripe);
      const hoodTxt = new THREE.Mesh(new THREE.BoxGeometry(1, 2.5, 12), new THREE.MeshBasicMaterial({ color: 0x14213d }));
      hoodTxt.position.set(t.len / 2 - 6, 15, 0); this.group.add(hoodTxt);
    }
    if (this.isPolice) {
      this.bar1 = new THREE.Mesh(new THREE.BoxGeometry(4, 3.5, 3.5), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
      this.bar1.position.set(0, 24.5, -4); this.group.add(this.bar1);
      this.bar2 = new THREE.Mesh(new THREE.BoxGeometry(4, 3.5, 3.5), new THREE.MeshBasicMaterial({ color: 0x2244ff }));
      this.bar2.position.set(0, 24.5, 4); this.group.add(this.bar2);
    }
    const wheelGeo = new THREE.CylinderGeometry(4.6, 4.6, 3.4, 10);
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    this.wheels = [];
    for (const [wx, wz] of [[t.len / 2 - 9, -t.wid / 2], [t.len / 2 - 9, t.wid / 2], [-t.len / 2 + 9, -t.wid / 2], [-t.len / 2 + 9, t.wid / 2]]) {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, 4.6, wz);
      const pivot = new THREE.Group(); pivot.add(w); pivot.position.set(wx, 4.6, wz); w.position.set(0, 0, 0);
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
      if (dx * fx + dz * fz > 0 && dx * fx + dz * fz < 95 && Math.abs(dx * -fz + dz * fx) < 18) { front = true; break; }
    }
    if (!front && Game.player.car !== this) {
      const p = Game.player.pos;
      const dx = p.x - this.pos.x, dz = p.z - this.pos.z;
      const fx = Math.cos(this.angle), fz = Math.sin(this.angle);
      if (dx * fx + dz * fz > 0 && dx * fx + dz * fz < 80 && Math.abs(dx * -fz + dz * fx) < 16) front = true;
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
    const skin = [0xe8b48a, 0xc98a5e, 0x8a5a3a, 0xf0c8a0][Math.floor(Math.random() * 4)];
    const shirt = [0xe75480, 0x30c5c0, 0xf2a541, 0xffffff, 0x7e57c2, 0xff7043][Math.floor(Math.random() * 6)];
    this.group = new THREE.Group();
    const torso = new THREE.Mesh(new THREE.BoxGeometry(8, 10, 5), new THREE.MeshLambertMaterial({ color: shirt }));
    torso.position.y = 14; this.group.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(3.4, 8, 6), new THREE.MeshLambertMaterial({ color: skin }));
    head.position.y = 21.5; this.group.add(head);
    for (const ax of [-5.2, 5.2]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(2.6, 8, 2.6), new THREE.MeshLambertMaterial({ color: shirt }));
      arm.position.set(ax, 13.5, 0); this.group.add(arm);
    }
    this.legMat = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
    for (const lx of [-2, 2]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(3, 9, 3.4), this.legMat);
      leg.position.set(lx, 4.5, 0); this.group.add(leg);
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
    const dx = this.pos.x - fromX, dz = this.pos.z - fromZ;
    if (Math.hypot(dx, dz) < 160) this.target = { x: this.pos.x + dx * 3, z: this.pos.z + dz * 3 };
  }

  update(dt) {
    if (this.dead) { this.deadT += dt; this.group.rotation.z = Math.min(Math.PI / 2, this.deadT * 6); return; }
    let dist = Math.hypot(this.target.x - this.pos.x, this.target.z - this.pos.z);
    if (dist < 14) {
      this.target = this.panic > 0 ? { x: this.pos.x + (Math.random() - 0.5) * 400, z: this.pos.z + (Math.random() - 0.5) * 400 } : City.randomSidewalkPoint();
    }
    const spd = this.panic > 0 ? this.speed * 2.4 : this.speed;
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
    this.group.children[1].position.y = 21.5 + Math.abs(Math.sin(this.walkT)) * 0.8;
  }

  die(byPlayer) {
    if (this.dead) return;
    this.dead = true;
    if (byPlayer) Police.crime(2.2);
  }
}

class Player {
  constructor() {
    this.pos = new THREE.Vector3(150, 0, 260);
    this.angle = 0; this.health = 100; this.armor = 0; this.money = 500;
    this.car = null; this.speed = 0;
    this.weapons = { pistol: { name: 'Pistolet', dmg: 14, rate: 0.34, ammo: Infinity, spd: 1100 }, smg: { name: 'SMG', dmg: 8, rate: 0.09, ammo: 0, spd: 1100 } };
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
    const arm = new THREE.Mesh(new THREE.BoxGeometry(3, 9, 3), new THREE.MeshLambertMaterial({ color: 0xe8b48a }));
    arm.position.set(-5.2, 16, 0); this.group.add(arm);
    const rArm = new THREE.Mesh(new THREE.BoxGeometry(3, 9, 3), new THREE.MeshLambertMaterial({ color: 0xe8b48a }));
    rArm.position.set(5.2, 16, 0); this.group.add(rArm);
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
