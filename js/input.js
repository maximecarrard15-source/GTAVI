const Input = {
  keys: {}, mouse: { x: 0, y: 0, down: false }, firstGesture: false,
  look: { yaw: 0, pitch: 0 }, locked: false, canvas: null,

  requestLock() {
    if (!this.canvas || this.locked) return;
    try { this.canvas.requestPointerLock && this.canvas.requestPointerLock(); } catch (e) { }
  },

  releaseLock() {
    if (document.exitPointerLock && this.locked) document.exitPointerLock();
  },

  init(canvas) {
    this.canvas = canvas;
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
      if (!this.locked) this.keys = {};
    });
    document.addEventListener('pointerlockerror', () => { this.locked = false; });
    canvas.addEventListener('click', () => {
      if (window.Game && Game.state === 'playing' && !(window.Net && Net.chatOpen)) this.requestLock();
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => {
      if (window.Net && Net.chatOpen) return;
      this.keys[e.code] = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      this.firstGesture = true;
    });
    window.addEventListener('keyup', (e) => { if (window.Net && Net.chatOpen) return; this.keys[e.code] = false; });
    window.addEventListener('mousemove', (e) => {
      if (this.locked) {
        this.look.yaw += e.movementX * 0.0026;
        this.look.pitch -= e.movementY * 0.0026;
        if (this.look.pitch > 1.45) this.look.pitch = 1.45;
        if (this.look.pitch < -1.45) this.look.pitch = -1.45;
      } else {
        this.mouse.x = e.clientX; this.mouse.y = e.clientY;
      }
    });
    window.addEventListener('mousedown', (e) => {
      if (window.Net && Net.chatOpen) return;
      if (e.button === 0) this.mouse.down = true;
      this.firstGesture = true;
    });
    window.addEventListener('mouseup', (e) => { if (e.button === 0) this.mouse.down = false; });
    window.addEventListener('blur', () => {
      this.keys = {}; this.mouse.down = false;
    });
  },

  isDown(...codes) { return codes.some(c => this.keys[c]); },
  axis(neg, pos) { return (this.isDown(pos) ? 1 : 0) - (this.isDown(neg) ? 1 : 0); }
};
