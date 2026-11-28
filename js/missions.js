const Missions = {
  idx: 0, state: 'idle', def: null, timer: 0, cpIndex: 0, cps: [], packages: [], targetPed: null,
  startMarker: null, marker: null, arrow: null, bannerT: 0, failT: 0,

  DEFINITIONS: [
    {
      name: 'LIVRAISON EXPRESS',
      brief: 'Vole une voiture et livre le colis au marqueur jaune.',
      startPt: { x: 2400, z: 2050 },
      reward: 650,
      init(obj) {
        obj.timer = 80;
        obj.dest = null; obj.gotCar = false;
      },
      update(obj, dt) {
        const pos = Game.playerPos();
        if (!obj.dest) {
          if (Game.player.car) {
            obj.gotCar = true; obj.dest = Missions.randomNode(Game.playerPos(), 2200);
            Missions.setMarker(obj.dest, 0xffd23c);
            Game.toast('Bien. File à la destination — suis la colonne jaune et la flèche en haut !');
          }
          else obj.setObjective('Vole une voiture pour commencer la livraison.');
        } else {
          const dd = Math.round(pos.distanceTo(new THREE.Vector3(obj.dest.x, 0, obj.dest.z)) / 13);
          obj.setObjective('Livraison : ' + dd + ' m — ' + Math.ceil(obj.timer) + 's');
          if (Game.player.car && pos.distanceTo(new THREE.Vector3(obj.dest.x, 0, obj.dest.z)) < 75) return 'done';
        }
        return null;
      }
    },
    {
      name: 'VICE RUSH',
      brief: 'Course sauvage : 6 checkpoints au volant.',
      startPt: { x: 1050, z: 2050 },
      reward: 950,
      init(obj) {
        obj.timer = 100; obj.cps = [];
        let prev = { x: 1050, z: 2050 };
        for (let i = 0; i < 6; i++) {
          let pt, tries = 0;
          do { pt = Missions.randomNode(500); tries++; } while (tries < 20 && (pt.x === prev.x && pt.z === prev.z));
          obj.cps.push(pt); prev = pt;
        }
        obj.cpIndex = 0;
        Missions.setMarker(obj.cps[0], 0x37d067);
      },
      update(obj, dt) {
        if (!Game.player.car) return 'fail-noCar';
        obj.timer -= dt;
        const cp = obj.cps[obj.cpIndex];
        const pos = Game.playerPos();
        const cd = Math.round(pos.distanceTo(new THREE.Vector3(cp.x, 0, cp.z)) / 13);
        obj.setObjective('Checkpoint ' + (obj.cpIndex + 1) + '/6 : ' + cd + ' m — ' + Math.ceil(obj.timer) + 's');
        if (pos.distanceTo(new THREE.Vector3(cp.x, 0, cp.z)) < 75) {
          obj.cpIndex++; obj.timer += 6; Sound.ding();
          if (obj.cpIndex >= obj.cps.length) return 'done';
          Missions.setMarker(obj.cps[obj.cpIndex], 0x37d067);
        }
        return obj.timer <= 0 ? 'fail-time' : null;
      }
    },
    {
      name: 'CHASSEUR DE PRIMES',
      brief: 'Traque le fugitif et percute-le avec le véhicule.',
      startPt: { x: 2850, z: 2850 },
      reward: 800,
      init(obj) {
        const pt = City.randomSidewalkPoint();
        obj.targetPed = new Ped(pt.x, pt.z);
        obj.targetPed.fugitive = true;
        obj.targetPed.speed = 130;
        Game.group.add(obj.targetPed.group);
        obj.peds = [obj.targetPed];
        Missions.setMarker(obj.targetPed.pos, 0xff7043);
      },
      update(obj, dt) {
        obj.setObjective('Percute le fugitif avec une voiture !');
        const t = obj.targetPed;
        if (t.dead) return 'fail-dead';
        t.scare(Game.playerPos().x, Game.playerPos().z);
        Missions.setMarker(t.pos, 0xff7043);
        const pos = Game.playerPos();
        const car = Game.player.car;
        if (car && car.pos.distanceTo(t.pos) < 34 && Math.hypot(car.vx, car.vz) > 120) return 'done';
        return null;
      }
    },
    {
      name: 'CONTREBANDE',
      brief: 'Récupère 3 colis épars sur la ville.',
      startPt: { x: 600, z: 600 },
      reward: 700,
      init(obj) {
        obj.packages = [];
        for (let i = 0; i < 3; i++) {
          const pt = City.randomSidewalkPoint();
          const m = new THREE.Mesh(new THREE.BoxGeometry(12, 12, 12), new THREE.MeshPhongMaterial({ color: 0xb5651d, shininess: 30 }));
          m.position.set(pt.x, 8, pt.z);
          Game.group.add(m);
          obj.packages.push({ mesh: m, pos: new THREE.Vector3(pt.x, 0, pt.z), got: false });
          if (i === 0) Missions.setMarker(obj.packages[0].pos, 0xb5651d);
        }
        obj.timer = 140;
      },
      update(obj, dt) {
        obj.timer -= dt;
        if (obj.timer <= 0) return 'fail-time';
        const pos = Game.playerPos();
        const next = obj.packages.find(p => !p.got);
        if (next) {
          obj.setObjective('Colis restants : ' + obj.packages.filter(p => !p.got).length + ' — ' + Math.ceil(obj.timer) + 's');
          Missions.setMarker(next.pos, 0xb5651d);
          for (const p of obj.packages) {
            if (!p.got && pos.distanceTo(p.pos) < 36) {
              p.got = true; Game.group.remove(p.mesh); Sound.ding(); Game.toast('Colis récupéré ! (' + obj.packages.filter(q => q.got).length + '/3)');
              const nx2 = obj.packages.find(q => !q.got);
              if (nx2) Missions.setMarker(nx2.pos, 0xb5651d);
            }
          }
        } else return 'done';
        return null;
      }
    }
  ],

  buildMeshes(scene) {
    const mk = (color) => new THREE.Mesh(
      new THREE.CylinderGeometry(16, 16, 60, 12),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4, depthWrite: false })
    );
    const beamMk = (color) => {
      const b = new THREE.Mesh(
        new THREE.CylinderGeometry(10, 18, 900, 12, 1, true),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide })
      );
      b.position.y = 450;
      return b;
    };
    this.startMarker = mk(0xffd23c);
    this.startMarker.position.set(this.DEFINITIONS[0].startPt.x, 30, this.DEFINITIONS[0].startPt.z);
    scene.add(this.startMarker);
    this.startBeam = beamMk(0xffd23c);
    this.startBeam.position.x = this.DEFINITIONS[0].startPt.x;
    this.startBeam.position.z = this.DEFINITIONS[0].startPt.z;
    scene.add(this.startBeam);
    this.setObjective = (t) => Game.setObjective(t);
    this.marker = mk(0xffd23c); this.marker.visible = false; scene.add(this.marker);
    this.beam = beamMk(0xffd23c); this.beam.visible = false; scene.add(this.beam);
  },

  setMarker(pos, color) {
    this.marker.visible = true;
    this.marker.material.color.setHex(color);
    this.marker.position.set(pos.x, 30, pos.z);
    this.beam.visible = true;
    this.beam.material.color.setHex(color);
    this.beam.position.set(pos.x, 450, pos.z);
  },

  randomNode(maxDistFrom, maxD) {
    for (let i = 0; i < 40; i++) {
      const x = WORLD.Xs[Math.floor(Math.random() * WORLD.Xs.length)];
      const z = WORLD.Ys[Math.floor(Math.random() * WORLD.Ys.length)];
      const d = Math.hypot(x - maxDistFrom.x, z - maxDistFrom.z);
      if (d > 700 && (!maxD || d < maxD)) return { x, z, d };
    }
    return { x: WORLD.Xs[Math.floor(WORLD.Xs.length / 2)], z: WORLD.Ys[Math.floor(WORLD.Ys.length / 2)], d: 700 };
  },

  cleanup() {
    if (this.targetPed) { Game.group.remove(this.targetPed.group); this.targetPed = null; }
    for (const p of this.packages) Game.group.remove(p.mesh);
    this.packages = [];
    this.marker.visible = false;
    this.beam.visible = false;
  },

  reset() {
    this.cleanup();
    this.state = 'idle'; this.def = null;
    const d = this.DEFINITIONS[this.idx % this.DEFINITIONS.length];
    this.startMarker.position.set(d.startPt.x, 30, d.startPt.z);
    this.startMarker.visible = true;
    this.startBeam.position.set(d.startPt.x, 450, d.startPt.z);
    this.startBeam.visible = true;
    this.timer = 0;
    Game.setObjective('');
  },

  update(dt) {
    const p = Game.playerPos();
    if (this.state === 'idle') {
      const d = p.distanceTo(this.startMarker.position);
      if (d < 90) this.start();
      else if (d < 300 && !this._hinted) { this._hinted = true; Game.toast('📦 Mission livraison ici — entre dans la colonne jaune !'); }
      else if (d >= 300) this._hinted = false;
    } else if (this.state === 'running') {
      if (this.targetPed && !this.targetPed.dead) this.targetPed.update(dt);
      const res = this.def.update(this, dt);
      if (res === 'done') this.complete();
      else if (res && res.startsWith('fail')) {
        const why = res.split('-')[1];
        Game.toast('✖ Mission échouée : ' + (why === 'time' ? 'temps écoulé' : why === 'noCar' ? 'tu es sorti du véhicule' : 'cible morte'), true);
        Sound.failed(); this.reset();
      }
    }
  },

  start() {
    this.def = this.DEFINITIONS[this.idx % this.DEFINITIONS.length];
    this.state = 'running';
    this.startMarker.visible = false;
    this.startBeam.visible = false;
    Game.setObjective(this.def.brief);
    Game.banner(this.def.name);
    this.def.init(this);
  },

  animate(dt) {
    const pulse = 0.14 + 0.1 * (0.5 + 0.5 * Math.sin(performance.now() / 300));
    if (this.startMarker && this.startMarker.visible) {
      this.startMarker.rotation.y += dt * 1.2;
      this.startMarker.position.y = 30 + Math.sin(performance.now() / 400) * 5;
      this.startBeam.material.opacity = pulse;
      this.startBeam.rotation.y -= dt * 0.5;
    }
    if (this.marker && this.marker.visible) {
      this.marker.rotation.y -= dt * 1.6;
      this.marker.position.y = 30 + Math.sin(performance.now() / 350) * 5;
      this.beam.material.opacity = pulse;
      this.beam.rotation.y += dt * 0.5;
    }
  },

  complete() {
    Game.player.money += this.def.reward;
    Game.dirtyHUD = true;
    Sound.passed();
    Game.banner('MISSION PASSED !  $' + this.def.reward);
    this.idx++;
    this.reset();
    setTimeout(() => { if (Game.bannerEl) Game.bannerEl.classList.remove('show'); }, 4200);
  }
};
