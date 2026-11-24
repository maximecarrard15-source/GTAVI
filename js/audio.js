const Sound = {
  ctx: null, master: null, engineOsc: null, engineGain: null, engineFilter: null,
  sirenOsc: null, sirenGain: null, sirenState: 0, sirenTimer: null, noiseBuf: null, enabled: true,

  ensure() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { this.enabled = false; return; }
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.45;
    this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate * 0.5;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  now() { return this.ctx ? this.ctx.currentTime : 0; },

  startEngine() {
    if (!this.enabled || this.engineOsc) return;
    this.ensure(); if (!this.ctx) return;
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 50;
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 420;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineOsc.connect(this.engineFilter).connect(this.engineGain).connect(this.master);
    this.engineOsc.start();
  },
  setEngine(speed01, on) {
    if (!this.engineOsc) return;
    const t = this.now();
    this.engineOsc.frequency.setTargetAtTime(42 + speed01 * 105, t, 0.08);
    this.engineGain.gain.setTargetAtTime(on ? 0.10 + speed01 * 0.13 : 0, t, 0.12);
  },
  stopEngine() {
    if (!this.engineOsc) return;
    try { this.engineGain.gain.value = 0; this.engineOsc.stop(); } catch (e) {}
    this.engineOsc = null; this.engineGain = null;
  },

  startSiren() {
    if (!this.enabled || this.sirenTimer) return;
    this.ensure(); if (!this.ctx) return;
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'square';
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.value = 0.0;
    this.sirenOsc.connect(this.sirenGain).connect(this.master);
    this.sirenOsc.start();
    this.sirenGain.gain.setTargetAtTime(0.035, this.now(), 0.1);
    this.sirenTimer = setInterval(() => {
      if (!this.sirenOsc) return;
      this.sirenState = 1 - this.sirenState;
      this.sirenOsc.frequency.setTargetAtTime(this.sirenState ? 880 : 620, this.now(), 0.02);
    }, 380);
  },
  setSirenVolume(v) { if (this.sirenGain) this.sirenGain.gain.setTargetAtTime(0.045 * v, this.now(), 0.15); },
  stopSiren() {
    if (!this.sirenTimer) return;
    clearInterval(this.sirenTimer); this.sirenTimer = null;
    try { this.sirenGain.gain.value = 0; this.sirenOsc.stop(); } catch (e) {}
    this.sirenOsc = null; this.sirenGain = null;
  },

  burst(dur, freq, vol, type) {
    if (!this.enabled) return;
    this.ensure(); if (!this.ctx) return;
    const t = this.now();
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = type || 'highpass'; f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t); src.stop(t + dur + 0.05);
  },
  tone(f0, f1, dur, vol, type) {
    if (!this.enabled) return;
    this.ensure(); if (!this.ctx) return;
    const t = this.now();
    const o = this.ctx.createOscillator();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + dur + 0.05);
  },
  shot() { this.burst(0.16, 900, 0.5); this.tone(220, 60, 0.12, 0.25, 'square'); },
  smg() { this.burst(0.09, 1200, 0.34); },
  crash(v) { this.burst(0.22, 300, Math.min(0.6, 0.12 + v * 0.5), 'lowpass'); this.tone(120, 40, 0.25, 0.2, 'triangle'); },
  explosion() { this.burst(0.9, 120, 0.9, 'lowpass'); this.tone(90, 28, 0.9, 0.6, 'sawtooth'); },
  ding() { this.tone(880, 1320, 0.16, 0.25, 'sine'); },
  cash() { this.tone(660, 990, 0.12, 0.3, 'triangle'); setTimeout(() => this.tone(990, 1320, 0.14, 0.3, 'triangle'), 110); },
  horn() { this.tone(400, 400, 0.25, 0.2, 'square'); },
  passed() { this.tone(523, 523, 0.15, 0.3, 'triangle'); setTimeout(() => this.tone(659, 659, 0.15, 0.3, 'triangle'), 160); setTimeout(() => this.tone(784, 1046, 0.4, 0.34, 'triangle'), 320); },
  failed() { this.tone(330, 110, 0.7, 0.34, 'sawtooth'); }
};
