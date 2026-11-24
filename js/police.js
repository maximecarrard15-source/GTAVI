const Police = {
  list: [], wanted: 0, heat: 0, sight: 0, blinkT: 0, bustT: 0,
  STARS: [0, 4, 12, 22, 34],

  reset() {
    for (const c of this.list) Game.removeCar(c);
    this.list = []; this.wanted = 0; this.heat = 0; this.sight = 0; this.bustT = 0;
    Game.dirtyHUD = true;
  },

  crime(n) {
    this.heat += n;
    let lv = 0;
    for (let i = 0; i < this.STARS.length; i++) if (this.heat >= this.STARS[i]) lv = i;
    if (lv > this.wanted) { this.wanted = lv; Game.dirtyHUD = true; Game.toast('⚠ Les VCPD te cherchent !'); }
  },

  clear() { this.wanted = 0; this.heat = 0; this.bustT = 0; Game.dirtyHUD = true; },

  randomRoadSpot(maxDist) {
    for (let i = 0; i < 24; i++) {
      const x = WORLD.Xs[Math.floor(Math.random() * WORLD.Xs.length)];
      const z = 100 + Math.random() * (WORLD.H - 200);
      const d = Math.hypot(x - Game.playerPos().x, z - Game.playerPos().z);
      if (d > 320 && d < maxDist) return { x, z };
    }
    return null;
  },

  update(dt, night) {
    const p = Game.playerPos();
    let close = false, nearest = 1e9;
    for (const c of this.list) if (!c.dead) {
      const d = c.pos.distanceTo(p);
      if (d < 620) close = true;
      nearest = Math.min(nearest, d);
    }
    if (close) this.sight = 0; else this.sight += dt;
    if (this.sight > 11 && this.wanted > 0) {
      this.wanted--; this.heat = Math.max(0, this.heat - 8); this.sight = 0;
      Game.dirtyHUD = true;
      if (this.wanted === 0) Game.toast('▷ Tu as semé la police.');
    }
    if (this.wanted === 0 && this.heat > 0) this.heat = Math.max(0, this.heat - dt * 0.25);
    if (this.wanted >= 1 && this.wanted < 5 && close) this.heat += dt * 0.25;

    const want = Game.player.deadState ? 0 : Math.min(5, this.wanted);
    const alive = this.list.filter(c => !c.dead).length;
    if (alive < want * 2 + (want >= 4 ? 2 : 0)) {
      const spot = this.randomRoadSpot(1100);
      if (spot) {
        const cop = new Car('police', spot.x, spot.z, Math.floor(Math.random() * 4) % 2 === 0 ? 0 : Math.PI);
        cop.driver = 'cop';
        Game.addCar(cop); this.list.push(cop);
      }
    }
    for (let i = this.list.length - 1; i >= 0; i--) {
      const c = this.list[i];
      if (c.dead) { this.list.splice(i, 1); continue; }
      if (this.wanted === 0 && c.driver !== 'player' && c.pos.distanceTo(p) > 600) {
        Game.removeCar(c);
        continue;
      }
      if (c.driver !== 'player') {
        this.driveCop(c, dt, p);
        c.shootCd -= dt;
        const d = c.pos.distanceTo(p);
        if (this.wanted >= 2 && d < 220 && c.shootCd <= 0 && Math.abs(c.forwardSpd()) < 320) {
          c.shootCd = 1.6;
          Game.copShoot(c, p);
        }
      }
      this.blinkT += dt;
      const b = Math.floor(this.blinkT * 4) % 2 === 0;
      if (c.bar1) { c.bar1.material.color.setHex(b ? 0xff2222 : 0x330000); c.bar2.material.color.setHex(b ? 0x000033 : 0x2244ff); }
    }
    const anyCop = this.list.some(c => !c.dead && c.driver !== 'player');
    if (anyCop && this.wanted > 0) { Sound.startSiren(); Sound.setSirenVolume(Math.max(0, 1 - nearest / 700)); }
    else Sound.stopSiren();

    if (!Game.player.car && !Game.player.deadState && this.wanted >= 1) {
      let onFootThreat = false;
      for (const c of this.list) if (!c.dead && c.pos.distanceTo(p) < 42 && Math.abs(c.forwardSpd()) < 60) onFootThreat = true;
      if (onFootThreat) {
        this.bustT += dt;
        if (this.bustT > 1.6) Game.busted();
      } else this.bustT = Math.max(0, this.bustT - dt);
    }
  },

  driveCop(c, dt, target) {
    const dx = target.x - c.pos.x, dz = target.z - c.pos.z;
    const dist = Math.hypot(dx, dz);
    const want = Math.atan2(dz, dx);
    let diff = want - c.angle;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    c.angle += Math.max(-2.6 * dt, Math.min(2.6 * dt, diff * 2.5 * dt));
    let targetSpd = c.t.maxF * 0.85;
    if (dist < 70) targetSpd = 120;
    if (dist < 30) targetSpd = 0;
    if (Math.abs(diff) > 1.2) targetSpd = 150;
    const f = c.forwardSpd();
    const acc = targetSpd > f ? 460 : -560;
    const nf = Math.max(-200, Math.min(c.t.maxF, f + acc * dt));
    c.vx = Math.cos(c.angle) * nf; c.vz = Math.sin(c.angle) * nf;
    for (const w of c.wheels) w.children[0].rotation.x += nf * dt * 0.25;
  }
};
