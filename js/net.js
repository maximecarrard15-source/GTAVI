class RemotePlayer {
  constructor(name) {
    this.name = name;
    this.pos = new THREE.Vector3(1500, 0, 1500);
    this.tPos = new THREE.Vector3(1500, 0, 1500);
    this.angle = 0;
    this.tAngle = 0;
    this.walkT = 0;
    this.group = new THREE.Group();
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
    const shirt = [0xe75480, 0x30c5c0, 0xf2a541, 0x7e57c2, 0xff7043, 0x59c98f][Math.abs(hash) % 6];
    const torso = new THREE.Mesh(new THREE.BoxGeometry(9, 11, 5.5), new THREE.MeshPhongMaterial({ color: shirt, shininess: 30 }));
    torso.position.y = 15.5; this.group.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(3.8, 10, 8), new THREE.MeshLambertMaterial({ color: 0xe8b48a }));
    head.position.y = 24; this.group.add(head);
    this.legs = [];
    for (const lx of [-2.4, 2.4]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(3.6, 10, 4), new THREE.MeshLambertMaterial({ color: 0x35507a }));
      leg.position.set(lx, 5, 0); this.group.add(leg); this.legs.push(leg);
    }
    this.group.add(makeBlobShadow(7));
    this.sprite = makeNameSprite(name);
    this.sprite.position.y = 34;
    this.group.add(this.sprite);
  }

  update(dt) {
    this.pos.lerp(this.tPos, Math.min(1, dt * 12));
    let d = this.tAngle - this.angle;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    this.angle += d * Math.min(1, dt * 10);
    const moved = this.pos.distanceTo(this.tPos) > 4;
    this.walkT += dt * (moved ? 10 : 0);
    this.legs[0].position.z = Math.sin(this.walkT) * (moved ? 2.4 : 0);
    this.legs[1].position.z = -Math.sin(this.walkT) * (moved ? 2.4 : 0);
    this.group.position.copy(this.pos);
    this.group.rotation.y = -this.angle;
  }
}

function makeNameSprite(name) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.font = 'bold 34px Arial';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.strokeStyle = 'rgba(0,0,0,.9)'; g.lineWidth = 6;
  g.strokeText(name, 128, 32);
  g.fillStyle = '#ffd9f0';
  g.fillText(name, 128, 32);
  const tex = new THREE.CanvasTexture(c);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  spr.scale.set(30, 7.5, 1);
  return spr;
}

const Net = {
  mode: 'offline', peer: null, conns: [], remotes: new Map(), ghosts: new Map(),
  pedGhosts: [], pickupGhosts: new Map(),
  nid: 1000, myName: 'Joueur' + Math.floor(100 + Math.random() * 900),
  roomCode: '', chatOpen: false, myCarNid: null, sendAcc: 0, tickAcc: 0,

  genCode() {
    const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 5; i++) s += abc[Math.floor(Math.random() * abc.length)];
    return s;
  },

  status(t, ok) {
    const el = document.getElementById('netStatus');
    if (el) { el.textContent = t; el.style.color = ok ? '#7be08a' : '#ff8080'; }
  },

  chip() {
    const el = document.getElementById('netChip');
    if (!el) return;
    if (this.mode === 'offline') { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    el.textContent = (this.mode === 'host' ? 'HÔTE ' : 'EN LIGNE ') + '· ' + this.roomCode +
      ' · ' + (this.mode === 'host' ? (this.conns.filter(c => c.open).length + 1) : '✓') + (this.mode === 'host' ? ' joueurs' : '');
  },

  launch() {
    Game.launch();
  },

  hostGame() {
    const code = this.genCode();
    this.status('Connexion au serveur de signaling…', true);
    const peer = new Peer('gtavix-' + code, { debug: 0 });
    this.peer = peer; this.roomCode = code; this.mode = 'host';
    peer.on('open', () => {
      this.status('Partie créée ! Code : ' + code, true);
      document.getElementById('hostCode').classList.remove('hidden');
      document.getElementById('codeTxt').textContent = code;
      this.chip();
      this.chatShow(true);
      this.system('Partie hébergée — code ' + code + '. Copie-le et envoie-le à tes amis !');
      this.launch();
    });
    peer.on('connection', (conn) => this.setupHostConn(conn));
    peer.on('error', (e) => {
      this.status('Erreur : ' + (e.type === 'unavailable-id' ? 'code déjà pris, réessaie' : e.type), false);
      this.mode = 'offline';
    });
  },

  joinGame(code) {
    if (!code || code.length < 4) { this.status('Code invalide.', false); return; }
    this.status('Connexion à ' + code + '…', true);
    const peer = new Peer(null, { debug: 0 });
    this.peer = peer; this.roomCode = code; this.mode = 'client_joining';
    peer.on('open', () => {
      const conn = peer.connect('gtavix-' + code, { reliable: true });
      conn.on('open', () => {
        this.mode = 'client';
        this.setupClientConn(conn);
        this.chip();
        this.chatShow(true);
        this.launch();
      });
      conn.on('error', () => this.status('Connexion impossible.', false));
      setTimeout(() => { if (this.mode === 'client_joining') { this.status('Introuvable. Vérifie le code.', false); this.mode = 'offline'; } }, 9000);
    });
    peer.on('error', (e) => {
      this.status('Erreur : ' + (e.type === 'peer-unavailable' ? 'partie introuvable' : e.type), false);
      this.mode = 'offline';
    });
  },

  setupHostConn(conn) {
    conn.on('open', () => { conn._name = 'Joueur?'; conn._st = null; });
    conn.on('data', (d) => this.hostData(conn, d));
    conn.on('close', () => {
      this.conns = this.conns.filter(c => c !== conn);
      if (conn._pid && this.remotes.has(conn._pid)) {
        Game.group.remove(this.remotes.get(conn._pid).group);
        this.remotes.delete(conn._pid);
      }
      for (const c of Game.cars) if (c.driver === conn._pid) c.driver = null;
      this.system((conn._name || 'Un joueur') + ' a quitté la partie.');
      this.chip();
    });
    setTimeout(() => { if (conn.open && !this.conns.includes(conn)) this.conns.push(conn); }, 300);
  },

  setupClientConn(conn) {
    this.hostConn = conn;
    conn.send({ t: 'hi', name: this.myName });
    conn.on('data', (d) => this.clientData(d));
    conn.on('close', () => {
      Game.toast('Hôte déconnecté.', true);
      this.mode = 'offline';
      this.chip();
      if (Game.state === 'playing') { Game.state = 'paused'; document.getElementById('pause').classList.remove('hidden'); }
    });
  },

  hostData(conn, d) {
    if (!d || !d.t) return;
    if (d.t === 'hi') {
      conn._name = (d.name || 'Joueur').slice(0, 14);
      conn._pid = 'p' + (this.nid++);
      const rp = new RemotePlayer(conn._name);
      this.remotes.set(conn._pid, rp);
      Game.group.add(rp.group);
      this.system(conn._name + ' a rejoint la partie !');
      Sound.ding();
      this.chip();
    } else if (d.t === 'st') {
      conn._st = d;
      const rp = this.remotes.get(conn._pid);
      if (rp) { rp.tPos.set(d.x, 0, d.z); rp.tAngle = d.a; rp.group.visible = d.ct === null; }
      const car = Game.cars.find(c => c.nid === d.ct && c.driver === conn._pid);
      if (car) { car.pos.set(d.x, 0, d.z); car.angle = d.a; car.vx = d.vx; car.vz = d.vz; }
    } else if (d.t === 'chat') {
      const txt = (d.m || '').slice(0, 120);
      this.chatLog(conn._name, txt);
      this.broadcast({ t: 'ev', k: 'chat', n: conn._name, m: txt }, conn);
    } else if (d.t === 'shot') {
      const from = new THREE.Vector3(d.x, 0, d.z);
      const dir = new THREE.Vector3(d.dx, 0, d.dz).normalize();
      Game.shoot(from, dir, false, d.d || 14, 'smg');
      this.broadcast({ t: 'ev', k: 'tracer', x: d.x, z: d.z, dx: d.dx, dz: d.dz }, conn);
    } else if (d.t === 'enter') {
      let best = null, bd = 90;
      for (const c of Game.cars) {
        if (c.dead || (c.driver && c.driver !== conn._pid)) continue;
        const dist = c.pos.distanceTo(new THREE.Vector3(d.x, 0, d.z));
        if (dist < bd) { bd = dist; best = c; }
      }
      if (best) {
        best.driver = conn._pid;
        if (best.nid === undefined) best.nid = this.nid++;
        conn.send({ t: 'you', nid: best.nid });
      }
    } else if (d.t === 'exit') {
      for (const c of Game.cars) if (c.driver === conn._pid) { c.driver = null; c.vx *= 0.2; c.vz *= 0.2; }
      conn.send({ t: 'you', nid: null });
    }
  },

  clientData(d) {
    if (!d || !d.t) return;
    if (d.t === 'snap') {
      if (!this._purged) {
        this._purged = true;
        for (let i = Game.cars.length - 1; i >= 0; i--) Game.removeCar(Game.cars[i]);
        for (const pd of Game.peds) Game.group.remove(pd.group);
        Game.peds = [];
        for (const pk of Game.pickups) Game.group.remove(pk.mesh);
        Game.pickups = [];
      }
      const seen = new Set();
      for (const ce of d.cs) {
        seen.add(ce.i);
        if (ce.i === this.myCarNid) {
          if (this.ghosts.has(ce.i)) {
            const g = this.ghosts.get(ce.i);
            if (Game.player.car) Game.player.car.hp = ce.hp;
            if (ce.dd && Game.player.car) { Game.player.car.dead = true; }
          }
          continue;
        }
        let g = this.ghosts.get(ce.i);
        if (!g) {
          const car = new Car(ce.ty, ce.x, ce.z, ce.a);
          car.driver = 'remote'; car.nid = ce.i;
          Game.addCar(car);
          g = { car, suppressed: false };
          this.ghosts.set(ce.i, g);
        }
        const car = g.car;
        car.tPos = car.tPos || new THREE.Vector3();
        car.tPos.set(ce.x, 0, ce.z);
        car.tAngle = ce.a;
        car.dead = ce.dd;
        car.hp = ce.hp;
        if (g.suppressed) { g.car.group.visible = false; }
      }
      for (const [nid, g] of [...this.ghosts]) {
        if (!seen.has(nid)) {
          Game.removeCar(g.car);
          this.ghosts.delete(nid);
        }
      }
      for (const pe of d.pl) {
        if (pe.id === 'me') {
          this.myCarNid = pe.ct;
          continue;
        }
        let rp = this.remotes.get(pe.id);
        if (!rp) { rp = new RemotePlayer(pe.n || 'Joueur'); this.remotes.set(pe.id, rp); Game.group.add(rp.group); }
        rp.tPos.set(pe.x, 0, pe.z); rp.tAngle = pe.a; rp.group.visible = pe.ct === null;
      }
      for (const [id, rp] of [...this.remotes]) {
        if (!d.pl.find(p => p.id === id)) {
          Game.group.remove(rp.group);
          this.remotes.delete(id);
        }
      }
      Police.wanted = d.w;
      Game.dirtyHUD = true;
      Game.dayT = d.t;
      this.applyMarker(Game.sprayMarker, d.sp);
      this.applyMarker(Game.hospitalMarker, d.hp2);
      if (Missions.startMarker) this.applyMarker(Missions.startMarker, d.sm);
      if (Missions.marker) this.applyMarker(Missions.marker, d.mk);
      const pkSeen = new Set();
      for (const pk of d.pks) {
        pkSeen.add(pk.k + '_' + Math.round(pk.x) + '_' + Math.round(pk.z));
        const key = pk.k + '_' + Math.round(pk.x) + '_' + Math.round(pk.z);
        if (!this.pickupGhosts.has(key)) {
          const colors = { health: 0x37d067, armor: 0x3fa9f5, cash: 0x7be08a, smg: 0xffa726 };
          const mesh = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshPhongMaterial({ color: colors[pk.k], shininess: 80 }));
          mesh.position.set(pk.x, 7, pk.z);
          Game.group.add(mesh);
          this.pickupGhosts.set(key, mesh);
        }
      }
      for (const [key, mesh] of [...this.pickupGhosts]) {
        if (!pkSeen.has(key)) { Game.group.remove(mesh); this.pickupGhosts.delete(key); }
      }
    } else if (d.t === 'peds') {
      while (this.pedGhosts.length < d.l.length) {
        const g = new THREE.Group();
        const torso = new THREE.Mesh(new THREE.BoxGeometry(8, 10, 5), new THREE.MeshLambertMaterial({ color: 0xc0c8d0 }));
        torso.position.y = 14;
        const head = new THREE.Mesh(new THREE.SphereGeometry(3.4, 8, 6), new THREE.MeshLambertMaterial({ color: 0xe8b48a }));
        head.position.y = 21.5;
        g.add(torso, head, makeBlobShadow(6));
        Game.group.add(g);
        this.pedGhosts.push({ g, tPos: new THREE.Vector3(), fresh: true });
      }
      while (this.pedGhosts.length > d.l.length) {
        const pg = this.pedGhosts.pop();
        Game.group.remove(pg.g);
      }
      d.l.forEach((pe, i) => {
        const pg = this.pedGhosts[i];
        if (pg.fresh) { pg.g.position.set(pe.x, 0, pe.z); pg.fresh = false; }
        pg.tPos.set(pe.x, 0, pe.z);
        pg.g.rotation.y = -pe.a;
      });
    } else if (d.t === 'you') {
      if (d.nid !== null && d.nid !== undefined) {
        this.myCarNid = d.nid;
        const g = this.ghosts.get(d.nid);
        if (g) {
          g.suppressed = true;
          g.car.group.visible = false;
          const mine = new Car(g.car.type, g.car.pos.x, g.car.pos.z, g.car.angle);
          mine.driver = 'player';
          Game.addCar(mine);
          Game.player.car = mine;
          Sound.startEngine();
        }
      } else {
        if (Game.player.car) { Game.removeCar(Game.player.car); Game.player.car = null; Sound.stopEngine(); }
        this.myCarNid = null;
        for (const [, g] of this.ghosts) if (g.suppressed) { g.suppressed = false; g.car.group.visible = true; }
      }
    } else if (d.t === 'ev') {
      if (d.k === 'chat') this.chatLog(d.n, d.m);
      else if (d.k === 'sys') this.system(d.m);
      else if (d.k === 'tracer') {
        const m = new THREE.Mesh(new THREE.SphereGeometry(1.1, 4, 4), new THREE.MeshBasicMaterial({ color: 0xfff060 }));
        m.position.set(d.x, 18, d.z);
        Game.group.add(m);
        Game.bullets.push({ m, dx: d.dx, dz: d.dz, life: 1.1, byCop: false, dmg: 0, fx: true });
      } else if (d.k === 'boom') Game.explosion(new THREE.Vector3(d.x, 0, d.z), true);
      else if (d.k === 'toast') Game.toast(d.m, d.bad);
      else if (d.k === 'pk') {
        if (d.k2 === 'health') { Game.player.health = Math.min(100, Game.player.health + 50); Game.toast('+50 Santé'); }
        if (d.k2 === 'armor') { Game.player.armor = Math.min(100, Game.player.armor + 50); Game.toast('+50 Armure'); }
        if (d.k2 === 'cash') { Game.player.money += d.v; Game.toast('+$' + d.v); }
        if (d.k2 === 'smg') { Game.player.weapons.smg.ammo += 90; Game.player.weapon = 'smg'; Game.toast('SMG +90 balles'); }
        Sound.ding(); Game.dirtyHUD = true;
      }
    }
  },

  broadcast(msg, except) {
    for (const c of this.conns) if (c.open && c !== except) { try { c.send(msg); } catch (e) {} }
  },

  hostTick(dt) {
    if (this.mode !== 'host') return;
    this.tickAcc += dt;
    this.updateVisuals(dt);
    if (this.tickAcc < 1 / 15) return;
    this.tickAcc = 0;
    const cs = [];
    for (const c of Game.cars) {
      if (c.nid === undefined) c.nid = this.nid++;
      cs.push({ i: c.nid, x: +c.pos.x.toFixed(1), z: +c.pos.z.toFixed(1), a: +c.angle.toFixed(2), t: c.type, dd: c.dead, hp: Math.round(c.hp) });
    }
    const pl = [{ id: 'me', n: this.myName, x: +Game.playerPos().x.toFixed(1), z: +Game.playerPos().z.toFixed(1), a: +Game.player.angle.toFixed(2), ct: Game.player.car && Game.player.car.nid !== undefined ? Game.player.car.nid : null }];
    for (const [pid, rp] of this.remotes) {
      const c = Game.cars.find(cc => cc.driver === pid);
      pl.push({ id: pid, n: rp.name, x: +rp.pos.x.toFixed(1), z: +rp.pos.z.toFixed(1), a: +rp.angle.toFixed(2), ct: c && c.nid !== undefined ? c.nid : null });
    }
    const pks = Game.pickups.slice(0, 12).map(p => ({ k: p.kind, x: +p.pos.x.toFixed(0), z: +p.pos.z.toFixed(0) }));
    const base = {
      t: 'snap',
      pl, cs, pks,
      w: Police.wanted,
      d: +Game.dayT.toFixed(2),
      sm: Missions.startMarker.visible ? this.packM(Missions.startMarker) : null,
      mk: Missions.marker.visible ? this.packM(Missions.marker) : null,
      sp: this.packM(Game.sprayMarker), hp2: this.packM(Game.hospitalMarker)
    };
    this.broadcast(base);
    for (const conn of this.conns) {
      if (!conn.open || !conn._st) continue;
      const me = { x: conn._st.x, z: conn._st.z };
      const near = Game.peds.filter(p => !p.dead)
        .map(p => ({ p, d: Math.hypot(p.pos.x - me.x, p.pos.z - me.z) }))
        .sort((a, b) => a.d - b.d).slice(0, 18)
        .map(o => ({ x: +o.p.pos.x.toFixed(1), z: +o.p.pos.z.toFixed(1), a: +o.p.angle.toFixed(2) }));
      try { conn.send({ t: 'peds', l: near }); } catch (e) {}
    }
  },

  packM(marker) {
    return { v: marker.visible, x: +marker.position.x.toFixed(0), z: +marker.position.z.toFixed(0), c: marker.material.color.getHex() };
  },

  applyMarker(mesh, d) {
    if (!mesh || !d) return;
    mesh.visible = d.v;
    if (d.v) { mesh.position.set(d.x, mesh.position.y, d.z); mesh.material.color.setHex(d.c); }
  },

  clientStep(dt) {
    if (this.mode !== 'client' || !this.hostConn || !this.hostConn.open) return;
    this.updateVisuals(dt);
    this.sendAcc += dt;
    if (this.sendAcc < 1 / 15) return;
    this.sendAcc = 0;
    const p = Game.playerPos();
    try {
      this.hostConn.send({
        t: 'st',
        x: +p.x.toFixed(1), z: +p.z.toFixed(1), a: +Game.player.angle.toFixed(2),
        ct: Game.player.car ? 1 : null,
        vx: Game.player.car ? +Game.player.car.vx.toFixed(1) : 0,
        vz: Game.player.car ? +Game.player.car.vz.toFixed(1) : 0
      });
    } catch (e) {}
  },

  updateVisuals(dt) {
    for (const [, rp] of this.remotes) rp.update(dt);
    for (const [, g] of this.ghosts) {
      if (g.suppressed) continue;
      const car = g.car;
      if (car.tPos) {
        car.pos.lerp(car.tPos, Math.min(1, dt * 14));
        let d2 = car.tAngle - car.angle;
        while (d2 > Math.PI) d2 -= 2 * Math.PI;
        while (d2 < -Math.PI) d2 += 2 * Math.PI;
        car.angle += d2 * Math.min(1, dt * 14);
        car.group.position.copy(car.pos);
        car.group.rotation.y = -car.angle;
      }
      if (car.isPolice) {
        const b = Math.floor(performance.now() / 250) % 2 === 0;
        car.bar1.material.color.setHex(b ? 0xff2222 : 0x330000);
        car.bar2.material.color.setHex(b ? 0x000033 : 0x2244ff);
      }
    }
    for (const pg of this.pedGhosts) {
      pg.g.position.lerp(pg.tPos, Math.min(1, dt * 10));
    }
    let i = 0;
    for (const [, mesh] of this.pickupGhosts) mesh.position.y = 7 + Math.sin(performance.now() / 300 + i++) * 2;
  },

  clientEnterExit(f) {
    if (f && !this._prevF) {
      try {
        if (Game.player.car) this.hostConn.send({ t: 'exit' });
        else {
          const p = Game.playerPos();
          this.hostConn.send({ t: 'enter', x: p.x, z: p.z });
        }
      } catch (e) {}
    }
    this._prevF = f;
  },

  sendShot(from, dir, dmg) {
    if (this.mode !== 'client') return;
    try { this.hostConn.send({ t: 'shot', x: +from.x.toFixed(1), z: +from.z.toFixed(1), dx: +dir.x.toFixed(2), dz: +dir.z.toFixed(2), d: dmg }); } catch (e) {}
  },

  chatShow(on) {
    const el = document.getElementById('chat');
    if (el) el.classList.toggle('off', !on);
  },

  chatLog(name, txt) {
    const log = document.getElementById('chatLog');
    if (!log) return;
    const div = document.createElement('div');
    const b = document.createElement('b');
    b.textContent = name + ' : ';
    div.appendChild(b);
    div.appendChild(document.createTextNode(txt));
    log.appendChild(div);
    while (log.children.length > 8) log.removeChild(log.firstChild);
    log.scrollTop = log.scrollHeight;
  },

  system(txt) {
    const log = document.getElementById('chatLog');
    if (!log) return;
    const div = document.createElement('div');
    div.className = 'sys';
    div.textContent = '⚙ ' + txt;
    log.appendChild(div);
    while (log.children.length > 8) log.removeChild(log.firstChild);
  },

  openChat() {
    if (this.mode === 'offline') return;
    this.chatOpen = true;
    const inp = document.getElementById('chatInput');
    inp.classList.add('open');
    inp.focus();
  },

  closeChat() {
    this.chatOpen = false;
    const inp = document.getElementById('chatInput');
    inp.value = '';
    inp.classList.remove('open');
    inp.blur();
  },

  sendChat() {
    const inp = document.getElementById('chatInput');
    const txt = inp.value.trim().slice(0, 120);
    this.closeChat();
    if (!txt) return;
    if (this.mode === 'host') {
      this.chatLog(this.myName, txt);
      this.broadcast({ t: 'ev', k: 'chat', n: this.myName, m: txt });
    } else if (this.mode === 'client') {
      try { this.hostConn.send({ t: 'chat', m: txt }); } catch (e) {}
    }
  },

  handleKeys() {
    const t = Input.isDown('KeyT');
    if (t && !this._prevT && !this.chatOpen) this.openChat();
    this._prevT = t;
  }
};
