export class SoundFX {
  ctx?: AudioContext;
  motor?: OscillatorNode;
  gain?: GainNode;
  muted = false;
  constructor() {
    window.addEventListener(
      "pointerdown",
      () => {
        this.ctx = new AudioContext();
        this.ctx.resume();
        this.motor = this.ctx.createOscillator();
        this.gain = this.ctx.createGain();
        this.motor.type = "sawtooth";
        this.gain.gain.value = 0;
        this.motor.connect(this.gain).connect(this.ctx.destination);
        this.motor.start();
      },
      { once: true },
    );
  }
  rpm(speed: number, on: boolean) {
    if (!this.ctx) return;
    this.motor!.frequency.setTargetAtTime(
      38 + speed * 3,
      this.ctx.currentTime,
      0.1,
    );
    this.gain!.gain.setTargetAtTime(
      on && !this.muted ? 0.022 : 0,
      this.ctx.currentTime,
      0.1,
    );
  }
  pulse(noise: boolean, f = 1800, duration = 0.16) {
    let c = this.ctx;
    if (!c || this.muted) return;
    let g = c.createGain(),
      filter = c.createBiquadFilter();
    filter.frequency.value = noise ? f : 1200;
    let n;
    if (noise) {
      n = c.createBufferSource();
      let b = c.createBuffer(1, c.sampleRate * duration, c.sampleRate),
        v = b.getChannelData(0);
      for (let i = 0; i < v.length; i++) v[i] = Math.random() * 2 - 1;
      n.buffer = b;
    } else {
      n = c.createOscillator();
      n.frequency.value = f;
    }
    n.connect(filter).connect(g).connect(c.destination);
    g.gain.setValueAtTime(0.12, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    n.start();
    n.stop(c.currentTime + duration + 0.01);
  }
}
