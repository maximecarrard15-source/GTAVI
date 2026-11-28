const Game = {
  scene: null, camera: null, renderer: null, canvas: null, group: null,
  player: null, cars: [], peds: [], bullets: [], particles: [], pickups: [],
  state: 'menu', dayT: 260, camYaw: 0, camPos: new THREE.Vector3(),
  dirtyHUD: true, dirtyCars: true, deadT: 0, prevF: false, prevV: false,
  bannerEl: null, sprayMarker: null, hospitalMarker: null, lastFrame: 0,
  keys: {}, hemi: null, sun: null, windowMats: null, camMode: 0, fxOn: true, composer: null,

  playerPos() { return this.player.car ? this.player.car.pos : this.player.pos; },

  init() {
    this.canvas = document.getElementById('game');
    Input.init(this.canvas);
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.22;
    this.scene = new THREE.Scene();
    this.scene.background = City.skyDay.clone();
    this.scene.fog = new THREE.Fog(City.skyDay.clone().getHex(), 600, 4300);
    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.5, 13000);
    this.camera.position.set(150, 60, 400);
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.hemi = new THREE.HemisphereLight(0xcfe8ff, 0x4a5a3a, 0.95);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff4d6, 0.8);
    this.sun.position.set(600, 1200, 300);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 100;
    this.sun.shadow.camera.far = 3400;
    this.sun.shadow.camera.left = -700; this.sun.shadow.camera.right = 700;
    this.sun.shadow.camera.top = 700; this.sun.shadow.camera.bottom = -700;
    this.sun.shadow.bias = -0.0004;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    City.build(this.scene);
    this.windowMats = City.windowMats;

    try {
      this.composer = new THREE.EffectComposer(this.renderer);
      this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      this.composer.setSize(window.innerWidth, window.innerHeight);
      this.composer.addPass(new THREE.RenderPass(this.scene, this.camera));
      this.bloom = new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.5, 0.65, 0.78);
      this.composer.addPass(this.bloom);
      this.fxaa = new THREE.ShaderPass(THREE.FXAAShader);
      const pr = this.composer.getPixelRatio ? this.composer.getPixelRatio() : this.renderer.getPixelRatio();
      this.fxaa.material.uniforms['resolution'].value.set(1 / (window.innerWidth * pr), 1 / (window.innerHeight * pr));
      this.composer.addPass(this.fxaa);
    } catch (e) { this.composer = null; }

    this.player = new Player();
    this.group.add(this.player.group);

    for (let i = 0; i < 26; i++) this.spawnTraffic();
    for (let i = 0; i < 12; i++) this.spawnParked();
    for (let i = 0; i < 70; i++) {
      const pt = City.randomSidewalkPoint();
      if (Math.hypot(pt.x - this.player.pos.x, pt.z - this.player.pos.z) < 250) continue;
      const ped = new Ped(pt.x, pt.z);
      this.peds.push(ped); this.group.add(ped.group);
    }

    for (let i = 0; i < 14; i++) this.spawnPickup(true);

    const mk = (color) => new THREE.Mesh(
      new THREE.CylinderGeometry(18, 18, 50, 12),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45, depthWrite: false })
    );
    this.sprayMarker = mk(0x39c0ff); this.sprayMarker.position.set(City.spray.x, 25, City.spray.z); this.scene.add(this.sprayMarker);
    this.hospitalMarker = mk(0xffffff); this.hospitalMarker.position.set(City.hospital.x, 25, City.hospital.z); this.scene.add(this.hospitalMarker);
    this.interiorLight = new THREE.PointLight(0xffc58a, 0, 900, 2);
    this.interiorLight.position.set(0, 45, 0);
    this.scene.add(this.interiorLight);
    for (const it of City.interiors) {
      const dm = new THREE.Mesh(
        new THREE.CylinderGeometry(9, 11, 46, 12),
        new THREE.MeshBasicMaterial({ color: 0xffa726, transparent: true, opacity: 0.55, depthWrite: false })
      );
      dm.position.set(it.door.x, 23, it.door.z);
      this.scene.add(dm);
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(34, 30, 4),
        new THREE.MeshBasicMaterial({ color: 0xffd54f })
      );
      frame.position.set(it.door.x, 15, it.door.z);
      this.scene.add(frame);
      it.doorMesh = dm;
      it.doorFrame = frame;
      it._hinted = false;
    }
    Missions.buildMeshes(this.scene);

    this.bannerEl = document.getElementById('missionBanner');
    this.initHUD();
    this.initMinimap();
    this.bindMenus();
    this.bindChat();

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      if (this.composer) {
        this.composer.setSize(window.innerWidth, window.innerHeight);
        const pr = this.composer.getPixelRatio ? this.composer.getPixelRatio() : this.renderer.getPixelRatio();
        if (this.fxaa) this.fxaa.material.uniforms['resolution'].value.set(1 / (window.innerWidth * pr), 1 / (window.innerHeight * pr));
      }
    });

    requestAnimationFrame(t => this.loop(t));
  },

  bindMenus() {
    const show = (id, on) => document.getElementById(id).classList.toggle('hidden', !on);
    this._show = show;
    document.getElementById('btnPlay').onclick = () => { Sound.ensure(); Sound.resume(); Net.mode = 'offline'; this.launch(); };
    document.getElementById('btnNet').onclick = () => { show('menu', false); show('mnet', true); };
    document.getElementById('btnNetBack').onclick = () => { show('mnet', false); show('menu', true); };
    document.getElementById('btnHost').onclick = () => { Sound.ensure(); Sound.resume(); Net.hostGame(); };
    document.getElementById('btnJoin').onclick = () => { Sound.ensure(); Sound.resume(); Net.joinGame(document.getElementById('joinCode').value.trim().toUpperCase()); };
    document.getElementById('btnHelp').onclick = () => { show('menu', false); show('help', true); };
    document.getElementById('btnBack').onclick = () => { show('help', false); show('menu', true); };
    document.getElementById('btnResume').onclick = () => { show('pause', false); this.state = 'playing'; };
    document.getElementById('btnFx').onclick = () => {
      this.fxOn = !this.fxOn;
      document.getElementById('btnFx').textContent = 'EFFETS VISUELS : ' + (this.fxOn ? 'ACTIVÉS' : 'DÉSACTIVÉS');
    };
    document.getElementById('btnMenuBack').onclick = () => { show('pause', false); show('menu', true); this.state = 'menu'; Net.chatShow(false); };
  },

  launch() {
    if (this._launched) { this._show('menu', false); this._show('mnet', false); this.state = 'playing'; return; }
    this._launched = true;
    this._show('menu', false);
    this._show('mnet', false);
    this.state = 'playing';
    Net.chatShow(true);
    if (Net.mode !== 'offline') Net.system('Tu es ' + Net.myName + (Net.mode === 'host' ? ' (hôte)' : '') + '. Appuie sur T pour chatter.');
    this.banner('BIENVENUE À LEONIDA');
    this.toast('V pour changer de vue, F pour entrer dans les bâtiments (colonnes orange), T pour le tchat (/time set day)');
    setTimeout(() => this.bannerEl.classList.remove('show'), 3500);
  },

  bindChat() {
    const inp = document.getElementById('chatInput');
    inp.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { Net.sendChat(); }
      else if (e.key === 'Escape') { Net.closeChat(); }
    });
  },

  initHUD() {
    this.el = {
      money: document.getElementById('money'), wanted: document.getElementById('wanted').children,
      health: document.getElementById('healthBar'), armor: document.getElementById('armorBar'),
      weapon: document.getElementById('weapon'), speedo: document.getElementById('speedo'),
      clock: document.getElementById('clock'), toast: document.getElementById('toast'),
      objective: document.getElementById('objective'), wasted: document.getElementById('wasted'),
      wastedTxt: document.querySelector('.wastedTxt'), missionDone: document.getElementById('missionDone')
    };
  },

  initMinimap() {
    const off = document.createElement('canvas'); off.width = 176; off.height = 176;
    const g = off.getContext('2d');
    const sc = 176 / (WORLD.W + 150);
    g.fillStyle = '#22301f'; g.fillRect(0, 0, 176, 176);
    g.fillStyle = '#4c4630'; g.fillRect(WORLD.SAND_X * sc, 0, 176, 176);
    g.fillStyle = '#1a49a0'; g.fillRect(WORLD.WATER_X * sc, 0, 176, 176);
    g.strokeStyle = '#565b64'; g.lineWidth = 3;
    for (const x of WORLD.Xs) { g.beginPath(); g.moveTo(x * sc, 0); g.lineTo(x * sc, WORLD.H * sc); g.stroke(); }
    for (const z of WORLD.Ys) { g.beginPath(); g.moveTo(0, z * sc); g.lineTo(WORLD.CITY_X_MAX * sc, z * sc); g.stroke(); }
    this.minimapBase = off;
    this.mm = document.getElementById('minimap').getContext('2d');
  },

  spawnTraffic() {
    for (let t = 0; t < 40; t++) {
      const xi = Math.floor(Math.random() * WORLD.Xs.length);
      const zi = Math.floor(Math.random() * WORLD.Ys.length);
      const moves = [];
      if (xi + 1 < WORLD.Xs.length) moves.push([1, 0]);
      if (zi + 1 < WORLD.Ys.length) moves.push([0, 1]);
      if (xi - 1 >= 0) moves.push([-1, 0]);
      if (zi - 1 >= 0) moves.push([0, -1]);
      const [di, dj] = moves[Math.floor(Math.random() * moves.length)];
      const segT = Math.random();
      const nx = WORLD.Xs[xi + di], nz = WORLD.Ys[zi + dj];
      let x, z, angle;
      if (di !== 0) {
        x = WORLD.Xs[xi] + (nx - WORLD.Xs[xi]) * segT;
        z = WORLD.Ys[zi] + (di > 0 ? WORLD.LANE : -WORLD.LANE);
        angle = di > 0 ? 0 : Math.PI;
      } else {
        x = WORLD.Xs[xi] + (dj > 0 ? -WORLD.LANE : WORLD.LANE);
        z = WORLD.Ys[zi] + (nz - WORLD.Ys[zi]) * segT;
        angle = dj > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
      const d = Math.hypot(x - this.playerPos().x, z - this.playerPos().z);
      if (d < 350 || d > 1700) continue;
      const types = ['sedan', 'sedan', 'sport', 'taxi', 'pickup'];
      const car = new Car(types[Math.floor(Math.random() * types.length)], x, z, angle);
      car.driver = 'ai';
      car.dir = di !== 0 ? (di > 0 ? 0 : 2) : (dj > 0 ? 1 : 3);
      car.node = [xi + di, zi + dj];
      this.addCar(car);
      return;
    }
  },

  spawnParked() {
    for (let t = 0; t < 30; t++) {
      const onX = Math.random() < 0.5;
      const road = onX ? WORLD.Xs[Math.floor(Math.random() * WORLD.Xs.length)] : WORLD.Ys[Math.floor(Math.random() * WORLD.Ys.length)];
      const along = 300 + Math.random() * ((onX ? WORLD.H : WORLD.CITY_X_MAX) - 600);
      const side = Math.random() < 0.5 ? 1 : -1;
      const off = side * (WORLD.ROAD / 2 - 14);
      const x = onX ? road + off : along;
      const z = onX ? along : road + off;
      if (Math.hypot(x - this.playerPos().x, z - this.playerPos().z) < 300) continue;
      let clash = false;
      for (const c of this.cars) if (Math.hypot(c.pos.x - x, c.pos.z - z) < 90) { clash = true; break; }
      if (clash) continue;
      const types = ['sedan', 'sedan', 'pickup', 'taxi', 'sport'];
      const car = new Car(types[Math.floor(Math.random() * types.length)], x, z, onX ? (side > 0 ? 0 : Math.PI) : (side > 0 ? Math.PI / 2 : -Math.PI / 2));
      car.driver = null;
      this.addCar(car);
      return;
    }
  },

  spawnPickup(free) {
    const pt = City.randomSidewalkPoint();
    const kinds = ['health', 'armor', 'cash', 'smg'];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    const colors = { health: 0x37d067, armor: 0x3fa9f5, cash: 0x7be08a, smg: 0xffa726 };
    const box = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshPhongMaterial({ color: colors[kind], shininess: 80 }));
    box.position.set(pt.x, 7, pt.z);
    this.group.add(box);
    this.pickups.push({ kind, mesh: box, pos: new THREE.Vector3(pt.x, 0, pt.z), ttl: free ? Infinity : 60 });
  },

  addCar(c) { this.cars.push(c); this.group.add(c.group); },
  removeCar(c) {
    const i = this.cars.indexOf(c);
    if (i >= 0) this.cars.splice(i, 1);
    const j = Police.list.indexOf(c);
    if (j >= 0) Police.list.splice(j, 1);
    this.group.remove(c.group);
  },

  banner(t) { this.bannerEl.textContent = t; this.bannerEl.classList.add('show'); },
  toast(msg, bad) {
    const t = this.el ? this.el.toast : null;
    if (!t) return;
    t.textContent = msg;
    t.style.background = bad ? 'rgba(160,20,20,.75)' : 'rgba(0,0,0,.6)';
    t.classList.add('show');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => t.classList.remove('show'), 2400);
  },
  setObjective(t) { if (this.el) this.el.objective.textContent = ''; document.getElementById('objective').textContent = t; },

  sparks(pos, n, color) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1.1, 4, 4), new THREE.MeshBasicMaterial({ color: color || 0xffd23c, transparent: true }));
      m.position.copy(pos); m.position.y = 8 + Math.random() * 8;
      this.group.add(m);
      this.particles.push({ m, vx: (Math.random() - 0.5) * 160, vy: 60 + Math.random() * 160, vz: (Math.random() - 0.5) * 160, life: 0.5 });
    }
  },

  explosion(pos, fxOnly) {
    Sound.explosion();
    const m = new THREE.Mesh(new THREE.SphereGeometry(8, 12, 10), new THREE.MeshBasicMaterial({ color: 0xff8830, transparent: true, opacity: 0.9 }));
    m.position.copy(pos); m.position.y = 12;
    this.group.add(m);
    this.particles.push({ m, ex: true, life: 0.8 });
    this.sparks(pos, 14, 0xff6630);
    const R = 110;
    if (fxOnly) return;
    for (const pd of this.peds) if (!pd.dead && pd.pos.distanceTo(pos) < R) pd.die(false);
    const pp = this.playerPos();
    if (!this.player.deadState && pp.distanceTo(pos) < R) {
      const c2 = this.player.car;
      const dmg = 95 * (1 - pp.distanceTo(pos) / R);
      if (c2) c2.damage(dmg, false); else this.player.damage(dmg);
    }
    Police.crime(this.player.car ? 0.5 : 2.5);
  },

  shoot(fromPos, dir, byCop, dmg, weapon) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1.1, 4, 4), new THREE.MeshBasicMaterial({ color: byCop ? 0xff5050 : 0xfff060 }));
    m.position.copy(fromPos); m.position.y = byCop ? 14 : 18;
    this.group.add(m);
    this.bullets.push({ m, dx: dir.x, dz: dir.z, life: 1.1, byCop, dmg: dmg || 14 });
    if (byCop) Sound.shot(); else if (weapon === 'smg' || weapon === 'minigun') Sound.smg(); else Sound.shot();
  },

  copShoot(cop, target) {
    const d = new THREE.Vector3(target.x - cop.pos.x, 0, target.z - cop.pos.z).normalize();
    const spread = (Math.random() - 0.5) * 0.35;
    const cos = Math.cos(spread), sin = Math.sin(spread);
    const dx = d.x * cos - d.z * sin, dz = d.x * sin + d.z * cos;
    this.shoot(cop.pos, new THREE.Vector3(dx, 0, dz), true, 3.5 + Police.wanted * 0.9, null);
  },

  bulletUpdate(dt) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      const step = 1150 * dt;
      const nx = b.m.position.x + b.dx * step, nz = b.m.position.z + b.dz * step;
      let hit = nx < 0 || nz < 0 || nx > WORLD.W || nz > WORLD.H;
      const probe = { x: nx, z: nz };
      if (!hit) {
        for (const c of Colliders.query(nx, nz)) {
          if (c.hw !== undefined && Math.abs(nx - c.x) < c.hw && Math.abs(nz - c.z) < c.hd) { hit = true; this.sparks(new THREE.Vector3(nx, 0, nz), 3); break; }
        }
      }
      if (!hit && !b.byCop) {
        for (const c of this.cars) {
          if (c === this.player.car) continue;
          if (Math.hypot(c.pos.x - nx, c.pos.z - nz) < 26) { c.damage(b.dmg * 0.8, true); this.sparks(new THREE.Vector3(nx, 0, nz), 3); hit = true; break; }
        }
        if (!hit) for (const pd of this.peds) if (!pd.dead && Math.hypot(pd.pos.x - nx, pd.pos.z - nz) < 7) { pd.die(true); pd.scare(nx, nz); this.sparks(new THREE.Vector3(nx, 0, nz), 4, 0xc33); hit = true; Police.crime(1.2); break; }
        if (!hit) for (const f of (Police.foots || [])) if (!f.dead && Math.hypot(f.pos.x - nx, f.pos.z - nz) < 8) { f.die(true); this.sparks(new THREE.Vector3(nx, 0, nz), 4, 0xc33); hit = true; break; }
        if (!hit) for (const [pid, rp] of Net.remotes) {
          if (rp.inCar) continue;
          if (Math.hypot(rp.pos.x - nx, rp.pos.z - nz) < 10) {
            this.sparks(new THREE.Vector3(nx, 0, nz), 4, 0xc33);
            Net.playerHit(pid, b.dmg);
            Police.crime(1);
            hit = true; break;
          }
        }
        if (!hit && !this.player.car && !this.player.deadState && Net.mode === 'host') {
          const pp = this.playerPos();
          if (Math.hypot(pp.x - nx, pp.z - nz) < 10) { this.player.damage(b.dmg); this.dirtyHUD = true; hit = true; }
        }
        if (!hit && Missions.targetPed && Missions.targetPed.pos.distanceTo(new THREE.Vector3(nx, 0, nz)) < 8) { Missions.targetPed.scare(nx, nz); this.sparks(new THREE.Vector3(nx, 0, nz), 3, 0xc33); }
      }
      if (!hit && b.byCop) {
        if (!this.player.car && !this.player.deadState && Math.hypot(this.player.pos.x - nx, this.player.pos.z - nz) < 8) {
          this.player.damage(b.dmg); hit = true;
        } else if (this.player.car && Math.hypot(this.player.car.pos.x - nx, this.player.car.pos.z - nz) < 26) {
          this.player.car.damage(b.dmg * 0.6); hit = true;
        }
      }
      b.m.position.x = nx; b.m.position.z = nz;
      b.life -= dt;
      if (hit || b.life <= 0) { this.group.remove(b.m); this.bullets.splice(i, 1); }
    }
  },

  particlesUpdate(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.ex) {
        p.m.scale.multiplyScalar(1 + dt * 6);
        p.m.material.opacity = Math.max(0, p.life) * 1.1;
      } else {
        p.vy -= 500 * dt;
        p.m.position.x += p.vx * dt; p.m.position.y += p.vy * dt; p.m.position.z += p.vz * dt;
        if (p.m.position.y < 1) { p.m.position.y = 1; p.vy *= -0.4; }
        p.m.material.opacity = Math.min(1, p.life * 2);
      }
      if (p.life <= 0) { this.group.remove(p.m); this.particles.splice(i, 1); }
    }
  },

  nearestDoor() {
    let best = null, bd = 34;
    const p = this.playerPos();
    for (const it of City.interiors) {
      const d = Math.hypot(p.x - it.door.x, p.z - it.door.z);
      if (d < bd) { bd = d; best = it; }
    }
    return best;
  },

  enterInterior(it) {
    this.player.returnPos = this.player.pos.clone();
    this.player.pos.set(it.enter.x, 0, it.enter.y === undefined ? it.enter.z : it.enter.y);
    this.player.interior = it;
    this.player.moveDir = null;
    it.light = it.light || null;
    if (this.interiorLight) { this.interiorLight.position.set(it.room.x, 45, it.room.z); this.interiorLight.intensity = 1.7; }
    Sound.ding();
    this.toast('🏠 ' + it.name + ' — F près du marqueur rose pour sortir');
  },

  exitInterior() {
    const it = this.player.interior;
    this.player.pos.copy(this.player.returnPos || new THREE.Vector3(it.door.x, 0, it.door.z));
    this.player.interior = null;
    if (this.interiorLight) this.interiorLight.intensity = 0;
    City.collide(this.player.pos, 8);
    Sound.ding();
  },

  tryEnterExit() {
    const f = Input.isDown('KeyF', 'Enter');
    if (f && !this.prevF) {
      if (this.player.car) {
        if (Net.mode === 'client') { Net.clientEnterExit('exit'); this.prevF = f; return; }
      } else {
        if (this.player.interior) {
          const it = this.player.interior;
          const p = this.player.pos;
          if (Math.hypot(p.x - it.exit.x, p.z - it.exit.z) < 40) { this.exitInterior(); this.prevF = f; return; }
        } else {
          const door = this.nearestDoor();
          if (door) { this.enterInterior(door); this.prevF = f; return; }
        }
      }
      if (Net.mode === 'client') { Net.clientEnterExit(this.player.car ? 'exit' : 'enter'); this.prevF = f; return; }
      if (this.player.car) {
        const car = this.player.car;
        if (Math.abs(car.forwardSpd()) > 260) { this.toast('Trop rapide pour sortir !'); }
        else {
          car.driver = null; car.vx *= 0.2; car.vz *= 0.2;
          const side = new THREE.Vector3(Math.cos(car.angle), 0, Math.sin(car.angle));
          side.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
          this.player.pos.copy(car.pos).add(side.multiplyScalar(34));
          City.collide(this.player.pos, 10);
          this.player.car = null;
          Sound.stopEngine();
        }
      } else {
        let best = null, bd = 90;
        for (const c of this.cars) {
          const d = c.pos.distanceTo(this.player.pos);
          if (d < bd && !c.dead) { bd = d; best = c; }
        }
        if (best) {
          if (best.driver === 'ai') { Police.crime(0.8); this.toast('Véhicule volé !'); }
          if (best.isPolice) Police.crime(1.4);
          best.driver = 'player';
          this.player.car = best;
          Sound.startEngine();
        }
      }
    }
    this.prevF = f;
  },

  playerShoot() {
    if (this.player.deadState || Net.chatOpen) return;
    const w = this.player.weaponDef;
    const cd = this.player.shootCd;
    this.player.shootCd -= 1 / 60;
    if (!Input.mouse.down || cd > 0) return;
    if (w.ammo <= 0) { this.player.weapon = 'pistol'; return; }
    this.player.shootCd = w.rate;
    if (w.ammo !== Infinity) { w.ammo--; this.dirtyHUD = true; }
    const ray = this.aimRay();
    const from = this.player.car ? this.player.car.pos.clone() : this.player.pos.clone();
    from.y = 0;
    if (Net.mode === 'client') {
      Net.sendShot(from, ray, w.dmg);
      return;
    }
    const pellets = w.pellets || 1;
    for (let pi = 0; pi < pellets; pi++) {
      let pr = ray;
      if (pi > 0) {
        const sp = (Math.random() - 0.5) * 0.32;
        const c2 = Math.cos(sp), s2 = Math.sin(sp);
        pr = new THREE.Vector3(ray.x * c2 - ray.z * s2, 0, ray.x * s2 + ray.z * c2);
      }
      this.shoot(from.clone().add(pr.clone().normalize().multiplyScalar(16)), pr, false, w.dmg, this.player.weapon);
    }
    Police.crime(0.15);
    for (const pd of this.peds) pd.scare(this.playerPos().x, this.playerPos().z);
  },

  aimRay() {
    if (Input.locked || this.camMode === 1) {
      const d = new THREE.Vector3();
      this.camera.getWorldDirection(d);
      d.y = 0;
      return d.lengthSq() < 0.001 ? new THREE.Vector3(1, 0, 0) : d.normalize();
    }
    const ndc = new THREE.Vector2(
      (this.mouseX() / window.innerWidth) * 2 - 1,
      -(this.mouseY() / window.innerHeight) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, this.camera);
    const o = raycaster.ray.origin, d = raycaster.ray.direction;
    const t = -o.y / d.y;
    const pt = o.clone().add(d.clone().multiplyScalar(Math.max(0, t)));
    const dir = pt.sub(this.playerPos());
    dir.y = 0;
    return dir.lengthSq() < 1 ? new THREE.Vector3(1, 0, 0) : dir.normalize();
  },
  mouseX() { return Input.mouse.x; },
  mouseY() { return Input.mouse.y; },

  pickupsUpdate(dt) {
    const p = this.playerPos();
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pk = this.pickups[i];
      pk.mesh.rotation.y += dt * 2;
      pk.mesh.position.y = 7 + Math.sin(this.dayT * 3 + i) * 2;
      pk.ttl -= dt;
      if (p.distanceTo(pk.pos) < 26) {
        if (pk.kind === 'health') { this.player.health = Math.min(100, this.player.health + 50); this.toast('+50 Santé'); }
        if (pk.kind === 'armor') { this.player.armor = Math.min(100, this.player.armor + 50); this.toast('+50 Armure'); }
        if (pk.kind === 'cash') { const v = 100 + Math.floor(Math.random() * 250); this.player.money += v; this.toast('+$' + v); Sound.cash(); }
        if (pk.kind === 'smg') { this.player.weapons.smg.ammo += 90; this.player.weapon = 'smg'; this.toast('SMG +90 balles'); }
        Sound.ding(); this.dirtyHUD = true;
        this.group.remove(pk.mesh); this.pickups.splice(i, 1);
        setTimeout(() => { if (this.state !== 'menu') this.spawnPickup(); }, 25000);
      } else if (pk.ttl <= 0) { this.group.remove(pk.mesh); this.pickups.splice(i, 1); }
    }
  },

  sprayCheck() {
    const car = this.player.car;
    if (!car) return;
    if (car.pos.distanceTo(new THREE.Vector3(City.spray.x, 0, City.spray.z)) < 34) {
      if (Math.hypot(car.vx, car.vz) > 90) return;
      if (Police.wanted === 0 && car.hp >= car.t.hp) return;
      if (this.player.money < 300) { this.toast('Pay\'n\'Spray : il te faut $300 !', true); return; }
      this.player.money -= 300;
      car.hp = car.t.hp; car.dead = false; car.burning = 0;
      Police.clear();
      this.dirtyHUD = true;
      this.toast('🔑 Caisse repeinte — wanted effacé !');
      Sound.ding();
    }
  },

  deadStateLoop(dt) {
    if (!this.player.deadState) return;
    this.deadT -= dt;
    this.player.fallT = Math.min(1, (this.player.fallT || 0) + dt * 4.5);
    const a = this.player.fallT, ease = a * a * (3 - 2 * a);
    this.player.group.rotation.z = ease * Math.PI / 2;
    this.player.group.position.y = ease * 2.4;
    if (this.deadT <= 0) {
      this.player.deadState = false;
      this.el.wasted.classList.add('hidden');
      document.getElementById('pause').classList.add('hidden');
      this.player.group.rotation.z = 0;
      this.player.group.position.y = 0;
      this.player.health = 100; this.player.armor = 0;
      if (this.player.car) { this.player.car.driver = null; this.player.car = null; Sound.stopEngine(); }
      this.player.pos.set(City.hospital.x + 120, 0, City.hospital.z + 40);
      Police.reset();
      this.player.money = Math.max(0, this.player.money - 200);
      this.dirtyHUD = true;
      this.state = 'playing';
      this.toast('Tu te réveilles à l\'hôpital (-$200)');
    }
  },

  wasted() {
    this.player.deadState = true; this.deadT = 2.8;
    Input.releaseLock();
    this.el.wastedTxt.textContent = 'WASTED';
    this.el.wasted.classList.remove('hidden');
    Sound.stopEngine(); Sound.failed();
    if (this.player.car) { this.player.car.driver = null; this.player.car = null; }
    if (this.player.group) { this.player.group.rotation.z = 0; this.player.fallT = 0; }
  },

  busted() {
    Input.releaseLock();
    this.el.wastedTxt.textContent = 'BUSTED';
    this.el.wasted.classList.remove('hidden');
    Sound.stopEngine(); Sound.failed();
    this.player.money = Math.max(0, this.player.money - 150);
    Police.reset();
    if (this.player.car) { this.player.car.driver = null; this.player.car = null; }
    this.player.pos.set(City.hospital.x + 120, 0, City.hospital.z + 40);
    this.player.health = 100;
    setTimeout(() => this.el.wasted.classList.add('hidden'), 2600);
    this.dirtyHUD = true;
    this.toast('BUSTED — arrestation (-$150)');
  },

  nightFactor() {
    const cyc = (this.dayT % 300) / 300;
    return Math.min(1, Math.max(0, (cyc < 0.5 ? 0 : (cyc - 0.5) * 4)));
  },

  dayNight() {
    const nf = this.nightFactor();
    const pp = this.playerPos();
    if (this.sun && this.sun.castShadow) {
      this.sun.position.set(pp.x + 600, 1200, pp.z + 300);
      this.sun.target.position.set(pp.x, 0, pp.z);
      this.sun.target.updateMatrixWorld();
    }
    const night = nf > 0.5;
    this.scene.background.copy(City.skyDay).lerp(City.skyNight, nf);
    if (City.skyU) {
      City.skyU.top.value.setHex(0x3a92dd).lerp(City.skyNight, nf);
      City.skyU.bot.value.setHex(0xd4ecfa).lerp(new THREE.Color(0x101a3a), nf);
      this.scene.fog.color.copy(City.skyU.bot.value);
    } else {
      this.scene.fog.color.copy(this.scene.background);
    }
    if (City.starMat) City.starMat.opacity = nf;
    if (City.sunSprite) City.sunSprite.material.opacity = Math.max(0, 1 - nf * 1.5) * 0.9;
    if (City.lampGlow) City.lampGlow.material.opacity = Math.min(1, nf * 1.5) * 0.85;
    if (City.headMat) City.headMat.visible = night;
    for (const b of City.beacons) b.visible = Math.sin(this.dayT * 3.5 + b.position.x) > 0;
    this.hemi.intensity = 0.95 - nf * 0.75;
    this.hemi.color.setHex(night ? 0x4a5f8a : 0xcfe8ff);
    this.hemi.groundColor.setHex(night ? 0x1a2233 : 0x4a5a3a);
    this.sun.intensity = 0.8 - nf * 0.72;
    this.sun.color.setHex(night ? 0xaab8e8 : 0xfff4d6);
    if (this.windowMats) for (const m of this.windowMats) { m.emissive.setHex(night ? 0x9a5f1e : 0x000000).multiplyScalar(Math.min(1, nf * 2)); m.emissiveIntensity = Math.min(1.3, nf * 2.6); }
    for (const c of this.cars) c.setNight(night);
    const h = Math.floor(((this.dayT % 300) / 300) * 24);
    const mn = Math.floor((((this.dayT % 300) / 300) * 24 % 1) * 60);
    if (this.el && this.dirtyHUD) this.el.clock.textContent = String(h).padStart(2, '0') + ':' + String(mn).padStart(2, '0') + (night ? ' 🌙' : ' ☀');
  },

  carCollisions() {
    for (let i = 0; i < this.cars.length; i++) for (let j = i + 1; j < this.cars.length; j++) {
      const a = this.cars[i], b = this.cars[j];
      if (a.dead || b.dead) continue;
      const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
      const d = Math.hypot(dx, dz), min = 40;
      if (d < min && d > 0.01) {
        const nx = dx / d, nz = dz / d;
        const push = (min - d) / 2;
        a.pos.x -= nx * push; a.pos.z -= nz * push;
        b.pos.x += nx * push; b.pos.z += nz * push;
        const rel = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
        if (rel > 0) {
          a.vx -= nx * rel * 0.6; a.vz -= nz * rel * 0.6;
          b.vx += nx * rel * 0.6; b.vz += nz * rel * 0.6;
          const imp = Math.abs(rel);
          const playerInvolved = a.driver === 'player' || b.driver === 'player';
          if (imp > 140 && playerInvolved) {
            a.damage(imp / 14, b.driver === 'player');
            b.damage(imp / 14, a.driver === 'player');
            Sound.crash(imp / 900);
            this.sparks(a.pos.clone().lerp(b.pos, 0.5), 5);
            const other = a.driver === 'player' ? b : a;
            if (other.isPolice) Police.crime(0.5);
          } else if (imp > 200) {
            Sound.crash(imp / 1200);
          }
        }
      }
    }
    if (!this.player.car && !this.player.deadState) {
      for (const c of this.cars) {
        if (c.dead) continue;
        const spd = Math.hypot(c.vx, c.vz);
        if (spd > 210 && c.pos.distanceTo(this.player.pos) < 14) {
          const fx = Math.cos(c.angle), fz = Math.sin(c.angle);
          const ddx = this.player.pos.x - c.pos.x, ddz = this.player.pos.z - c.pos.z;
          const dot = (ddx * fx + ddz * fz) / (Math.hypot(ddx, ddz) || 1);
          if (dot > 0.55) {
            this.player.damage(spd * 0.14);
            this.sparks(this.player.pos, 4, 0xc33);
            if (this.player.health <= 0) this.wasted();
          }
        }
      }
    }
    for (const c of this.cars) {
      if (c.dead || (!c.driver && Math.hypot(c.vx, c.vz) < 5)) continue;
      const spd = Math.hypot(c.vx, c.vz);
      if (spd < 120) continue;
      for (const pd of this.peds) {
        if (pd.dead) continue;
        if (c.pos.distanceTo(pd.pos) < 16) {
          pd.die(c.driver === 'player' || c.driver === 'cop');
          if (c.driver === 'player') { Police.crime(1.3); this.toast('Oups...', true); }
          pd.pos.x += c.vx * 0.25; pd.pos.z += c.vz * 0.25;
        }
      }
    }
  },

  updateCars(dt) {
    if (Net.mode === 'client') {
      if (this.player.car) {
        if (this.player.car.hp <= 0) {
          this.removeCar(this.player.car);
          this.player.car = null;
          Sound.stopEngine();
        } else {
          this.player.car.controlPlayer(dt, Input);
          this.player.car.physics(dt);
        }
      }
      return;
    }
    for (let i = this.cars.length - 1; i >= 0; i--) {
      const c = this.cars[i];
      if (c.dead && !c.exploded) { c.exploded = true; this.explosion(c.pos.clone()); }
      if (c.dead) {
        c.burning += dt;
        c.bodyMat.color.setHex(0x1c1c1c);
        if (Math.random() < dt * 12) this.sparks(c.pos, 1, 0xff6630);
        if (c === this.player.car) { this.player.car = null; Sound.stopEngine(); }
        if (c.burning > 1.5) this.removeCar(c);
        continue;
      }
      if (c === this.player.car) { c.controlPlayer(dt, Input); c.physics(dt); }
      else if (c.driver && c.driver !== 'ai' && c.driver !== 'cop') { }
      else { c.updateAI(dt); c.physics(dt); }
      const d = c.pos.distanceTo(this.playerPos());
      if (c.driver === 'ai' && d > 1900) this.removeCar(c);
    }
    if (this.cars.filter(c => c.driver === 'ai' && !c.dead).length < 22) this.spawnTraffic();
  },

  updatePeds(dt) {
    for (let i = this.peds.length - 1; i >= 0; i--) {
      const pd = this.peds[i];
      pd.update(dt);
      if (pd.dead && pd.deadT > 14) { this.group.remove(pd.group); this.peds.splice(i, 1); }
    }
    for (const pd of this.peds) if (!pd.dead) {
      const d = this.playerPos().distanceTo(pd.pos);
      if (d < 900) { pd.group.visible = true; } else pd.group.visible = false;
    }
    if (this.peds.filter(p => !p.dead).length < 34) {
      const pt = City.randomSidewalkPoint();
      if (Math.hypot(pt.x - this.playerPos().x, pt.z - this.playerPos().z) > 220) {
        const pd = new Ped(pt.x, pt.z);
        this.peds.push(pd); this.group.add(pd.group);
      }
    }
  },

  updateCamera(dt) {
    const p = this.playerPos();
    const yaw = Input.look.yaw, pit = Input.look.pitch;
    this.camYaw = yaw;
    const fx = Math.cos(yaw), fz = Math.sin(yaw);
    if (this.camMode === 1) {
      const hy = (this.player.interior ? 19 : (this.player.car ? 20.5 : 21)) + (this.player.jz || 0);
      const c = this.player.car;
      const hx = c ? c.pos.x + fx * c.t.len * 0.12 : p.x;
      const hz = c ? c.pos.z + fz * c.t.len * 0.12 : p.z;
      this.camera.position.set(hx, hy, hz);
      this.camera.lookAt(hx + fx * 200, hy + Math.sin(pit) * 200, hz + fz * 200);
      return;
    }
    const inside = !!this.player.interior;
    const f = this.player.car ? Math.hypot(this.player.car.vx, this.player.car.vz) : 0;
    const dist = (inside ? 26 : 30) + f * 0.03;
    const base = inside ? 6 : 14;
    const jz = this.player.jz || 0;
    const ey = base + Math.sin(-pit) * dist * 0.55 + jz * 0.85;
    this.camera.position.set(p.x - fx * dist, Math.max(3, ey), p.z - fz * dist);
    this.camera.lookAt(p.x, (inside ? 4 : 12) + Math.sin(pit) * 60 + jz, p.z);
  },

  interiorLogic(dt) {
    for (const it of City.interiors) {
      if (it.exitMesh) it.exitMesh.rotation.y += dt * 1.5;
      if (it.cash.mesh) {
        it.cash.mesh.rotation.y += dt * 1.5;
        it.cash.mesh.position.y = 10 + Math.sin(this.dayT * 3) * 1.5;
      }
      if (it.doorMesh) it.doorMesh.material.opacity = 0.4 + Math.abs(Math.sin(this.dayT * 2)) * 0.35;
      if (it.wpn && it.wpn.mesh) {
        it.wpn.mesh.rotation.y += dt * 1.5;
        it.wpn.mesh.position.y = 8 + Math.sin(this.dayT * 3 + 2) * 1.5;
      }
      it.cash.cd -= dt;
    }
    if (Net.chatOpen) return;
    const p = this.playerPos();
    if (this.player.interior) {
      const it = this.player.interior;
      const nearExit = Math.hypot(p.x - it.exit.x, p.z - it.exit.z) < 40;
      if (nearExit && !it._exitHint) { this.toast('F — Sortir'); it._exitHint = true; }
      if (!nearExit) it._exitHint = false;
      if (it.cash.cd <= 0 && Math.hypot(p.x - it.cash.x, p.z - it.cash.z) < 24) {
        const v = 80 + Math.floor(Math.random() * 140);
        this.player.money += v;
        it.cash.cd = 45;
        Sound.cash();
        this.toast('+ $' + v);
        this.dirtyHUD = true;
      }
      if (it.wpn) {
        it.wpn.cd -= dt;
        if (it.wpn.cd <= 0 && Math.hypot(p.x - it.wpn.x, p.z - it.wpn.z) < 24) {
          const wk = this.player.weapons[it.wpn.kind];
          if (wk) {
            const amt = it.wpn.kind === 'sniper' ? 8 : it.wpn.kind === 'shotgun' ? 20 : it.wpn.kind === 'minigun' ? 250 : 90;
            wk.ammo += amt;
            this.player.weapon = it.wpn.kind;
            it.wpn.cd = 60;
            Sound.ding();
            this.toast('\ud83d\udd2b ' + wk.name + ' +' + amt + ' munitions');
            this.dirtyHUD = true;
          }
        }
      }
    } else {
      const door = this.nearestDoor();
      if (door && !door._hinted) { this.toast('F — Entrer au ' + door.name); door._hinted = true; }
      if (!door) for (const it of City.interiors) it._hinted = false;
    }
  },

  updateHUD() {
    if (!this.dirtyHUD) return;
    this.dirtyHUD = false;
    this.el.money.textContent = '$' + this.player.money;
    for (let i = 0; i < 5; i++) this.el.wanted[i].className = i < Police.wanted ? 'on' : '';
    this.el.health.style.width = Math.max(0, this.player.health) + '%';
    this.el.armor.style.width = this.player.armor + '%';
    const w = this.player.weaponDef;
    this.el.weapon.textContent = w.name + ' ' + (w.ammo === Infinity ? '∞' : w.ammo);
    if (this.player.car) {
      const kmh = Math.round(Math.hypot(this.player.car.vx, this.player.car.vz) * 0.32);
      this.el.speedo.textContent = kmh + ' km/h — ' + this.player.car.t.name;
    } else this.el.speedo.textContent = 'À pied';
  },

  drawMinimap() {
    const g = this.mm, sc = 176 / (WORLD.W + 150);
    g.clearRect(0, 0, 176, 176);
    g.drawImage(this.minimapBase, 0, 0);
    const px = this.playerPos().x, pz = this.playerPos().z;
    const blip = (x, z, color, r) => {
      g.fillStyle = color;
      g.beginPath(); g.arc(x * sc, z * sc, r || 3.4, 0, 7); g.fill();
    };
    if (Missions.state === 'idle') blip(Missions.startMarker.position.x, Missions.startMarker.position.z, '#ffd23c');
    else if (Missions.marker.visible) blip(Missions.marker.position.x, Missions.marker.position.z, '#ffd23c');
    for (const it2 of City.interiors) blip(it2.door.x, it2.door.z, '#ffa726', 3);
    for (const c of this.cars) if (c.isPolice && !c.dead) blip(c.pos.x, c.pos.z, Math.floor(this.dayT * 2) % 2 ? '#ff4444' : '#4467ff');
    for (const f of (Police.foots || [])) if (!f.dead) blip(f.pos.x, f.pos.z, '#ff4444', 2.6);
    for (const [, rp] of Net.remotes) blip(rp.pos.x, rp.pos.z, '#ff9de2');
    blip(City.spray.x, City.spray.z, '#39c0ff');
    blip(City.hospital.x, City.hospital.z, '#ffffff');
    for (const pk of this.pickups) blip(pk.pos.x, pk.pos.z, '#7be08a', 2.4);
    blip(px, pz, '#ffffff', 4.4);
    g.strokeStyle = '#ffffff'; g.lineWidth = 2;
    g.beginPath();
    g.moveTo(px * sc, pz * sc);
    g.lineTo(px * sc + Math.cos(this.camYaw) * 8, pz * sc + Math.sin(this.camYaw) * 8);
    g.stroke();
  },

  loop(now) {
    requestAnimationFrame(t => this.loop(t));
    const dt = Math.min(0.05, (now - this.lastFrame) / 1000 || 0.016);
    this.lastFrame = now;
    this.dayT += dt;
    this.dayNight();
    City.update(this.dayT);

    if (this.state === 'playing' && !this.player.deadState) {
      if (Input.isDown('Escape', 'KeyP')) { this.state = 'paused'; document.getElementById('pause').classList.remove('hidden'); if (Net.chatOpen) Net.closeChat(); Input.releaseLock(); Sound.setEngine(0, false); }
      Net.handleKeys();
      const v = Input.isDown('KeyV');
      if (v && !this.prevV) { this.camMode = 1 - this.camMode; Input.requestLock(); this.toast(this.camMode ? '👁 Vue : première personne — souris pour regarder' : '🎥 Vue : troisième personne — look libre'); }
      this.prevV = v;
      const wk = { Digit1: 'pistol', Digit2: 'smg', Digit3: 'shotgun', Digit4: 'sniper', Digit5: 'minigun' };
      for (const k in wk) {
        if (Input.isDown(k)) {
          const w2 = this.player.weapons[wk[k]];
          if (w2 && (w2.ammo === Infinity || w2.ammo > 0) && this.player.weapon !== wk[k]) {
            this.player.weapon = wk[k];
            this.toast(w2.name);
            this.dirtyHUD = true;
          }
        }
      }
      this.tryEnterExit();
      const client = Net.mode === 'client';
      Missions.update(dt);
      Missions.animate(dt);
      if (!client) {
        Police.update(dt, this.nightFactor() > 0.5);
        this.updatePeds(dt);
        this.bulletUpdate(dt);
        this.pickupsUpdate(dt);
        this.sprayCheck();
        this.carCollisions();
      }
      this.updateCars(dt);
      this.particlesUpdate(dt);
      this.playerShoot();
      if (Net.mode === 'host') Net.hostTick(dt);
      if (client) Net.clientStep(dt);
      if (this.player.car) Sound.setEngine(Math.min(1, Math.abs(this.player.car.forwardSpd()) / this.player.car.t.maxF), true);
      else Sound.setEngine(0, false);
      if (Input.isDown('KeyH')) Sound.horn();
      if (!this.player.car) {
        this.updatePlayerWalk(dt);
        this.interiorLogic(dt);
        if (this.player.health <= 0) this.wasted();
      } else {
        this.player.pos.copy(this.player.car.pos);
        this.player.angle = this.player.car.angle;
        this.player.group.position.copy(this.player.pos);
        this.player.group.visible = false;
        if (this.player.car.dead) this.player.damage(80);
      }
      if (this.player.car && this.player.health <= 0) this.wasted();
      this.updateCamera(dt);
      this.updateHUD();
      this.dirtyHUD = true;
      this.drawMinimap();
      if (this.player.group) {
        this.player.group.rotation.y = -this.player.angle;
        this.player.group.visible = !this.player.car && this.camMode !== 1;
      }
      this.updateCrosshair();
    } else if (this.state === 'playing' && this.player.deadState) {
      this.deadStateLoop(dt);
      this.particlesUpdate(dt);
      this.updateCamera(dt);
    }
    if (this.composer && this.fxOn) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  },

  updateCrosshair() {
    const on = Input.locked || this.camMode === 1;
    const el = document.getElementById('cross');
    if (el && el.style.display !== (on ? 'block' : 'none')) el.style.display = on ? 'block' : 'none';
  },

  updatePlayerWalk(dt) {
    this.player.angle = Input.look.yaw;
    const jump = Input.isDown('Space');
    if (jump && !this.prevSpace && (this.player.jz || 0) <= 0) this.player.jv = 250;
    this.prevSpace = jump;
    this.player.jz = Math.max(0, (this.player.jz || 0) + (this.player.jv || 0) * dt);
    this.player.jv = this.player.jz > 0 ? (this.player.jv || 0) - 720 * dt : 0;
    const move = Input.axis('KeyS', 'KeyW') || Input.axis('ArrowDown', 'ArrowUp');
    const strafe = Input.axis('KeyA', 'KeyD') || Input.axis('ArrowLeft', 'ArrowRight');
    const spd = 150;
    if (move !== 0 || strafe !== 0) {
      const fx = Math.cos(Input.look.yaw), fz = Math.sin(Input.look.yaw);
      const rx = -Math.sin(Input.look.yaw), rz = Math.cos(Input.look.yaw);
      let dx = fx * move + rx * strafe;
      let dz = fz * move + rz * strafe;
      const len = Math.hypot(dx, dz) || 1;
      dx /= len; dz /= len;
      this.player.pos.x += dx * spd * dt;
      this.player.pos.z += dz * spd * dt;
      this.player.angle = Math.atan2(dz, dx);
      this.player.moveDir = this.player.angle;
      this.player.walkT = (this.player.walkT || 0) + dt * 10;
      this.player.legs[0].position.z = Math.sin(this.player.walkT) * 2.4;
      this.player.legs[1].position.z = -Math.sin(this.player.walkT) * 2.4;
      const sw = Math.sin(this.player.walkT);
      this.player.arms[0].rotation.x = -sw * 0.6;
      this.player.arms[1].rotation.x = sw * 0.25;
    } else {
      this.player.moveDir = null;
      this.player.legs[0].position.z = 0;
      this.player.legs[1].position.z = 0;
      this.player.arms[0].rotation.x = 0;
      this.player.arms[1].rotation.x = 0;
    }
    if (!this.player.interior) City.clampToLand(this.player.pos, 8);
    City.collide(this.player.pos, 8);
    this.player.group.position.set(this.player.pos.x, this.player.jz || 0, this.player.pos.z);
  }
};

window.addEventListener('load', () => {
  if (typeof THREE === 'undefined') {
    console.error('three.js introuvable');
    return;
  }
  Game.init();
});
