// Sonido sintetizado con Web Audio: efectos, ambiente de viento y un pulso de combate.
import { clamp } from './util.js'

export class GameAudio {
  constructor() {
    this.ctx = null
    this.volume = 0.7
    this.listener = { x: 0, z: 0, yaw: 0 }
    this.intensity = 0
    this.pulseT = 0
    this.pulseStep = 0
  }

  init() {
    if (this.ctx) { this.ctx.resume(); return }
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    const ctx = (this.ctx = new AC())
    this.master = ctx.createGain()
    this.master.gain.value = this.volume
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -14
    comp.ratio.value = 6
    this.master.connect(comp)
    comp.connect(ctx.destination)

    const len = ctx.sampleRate * 2
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = this.noiseBuf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1

    // Viento: ruido filtrado con una oscilación lenta.
    const wind = ctx.createBufferSource()
    wind.buffer = this.noiseBuf
    wind.loop = true
    const wf = ctx.createBiquadFilter()
    wf.type = 'bandpass'
    wf.frequency.value = 420
    wf.Q.value = 0.6
    const wg = ctx.createGain()
    wg.gain.value = 0.05
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.13
    const lg = ctx.createGain()
    lg.gain.value = 180
    lfo.connect(lg)
    lg.connect(wf.frequency)
    wind.connect(wf); wf.connect(wg); wg.connect(this.master)
    wind.start(); lfo.start()

    // Zumbido grave que crece con la intensidad del combate.
    this.droneGain = ctx.createGain()
    this.droneGain.gain.value = 0.0
    const df = ctx.createBiquadFilter()
    df.type = 'lowpass'
    df.frequency.value = 160
    for (const f of [41.2, 41.6, 61.9]) {
      const o = ctx.createOscillator()
      o.type = 'sawtooth'
      o.frequency.value = f
      o.connect(df)
      o.start()
    }
    df.connect(this.droneGain)
    this.droneGain.connect(this.master)
  }

  setVolume(v) {
    this.volume = v
    if (this.master) this.master.gain.value = v
  }

  suspend(on) {
    if (!this.ctx) return
    if (on) this.ctx.suspend()
    else this.ctx.resume()
  }

  update(dt, intensity) {
    if (!this.ctx) return
    this.intensity += (intensity - this.intensity) * Math.min(1, dt * 0.8)
    this.droneGain.gain.value = 0.015 + this.intensity * 0.05
    if (this.intensity > 0.25) {
      this.pulseT -= dt
      if (this.pulseT <= 0) {
        this.pulseT = 0.42
        const notes = [55, 55, 65.4, 55, 49, 55, 73.4, 65.4]
        const f = notes[this.pulseStep++ % notes.length]
        this.tone('triangle', f, f * 0.98, 0.3, 0.16 * this.intensity, 0)
        if (this.pulseStep % 2 === 0) this.noise(0.05, 5000, 2000, 0.03 * this.intensity, 0, 'highpass')
      }
    }
  }

  out(pan) {
    const ctx = this.ctx
    const g = ctx.createGain()
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner()
      p.pan.value = clamp(pan, -1, 1)
      g.connect(p)
      p.connect(this.master)
    } else g.connect(this.master)
    return g
  }

  noise(dur, f0, f1, vol, pan = 0, type = 'lowpass', q = 0.8) {
    const ctx = this.ctx
    if (!ctx) return
    const t = ctx.currentTime
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuf
    src.loop = true
    const f = ctx.createBiquadFilter()
    f.type = type
    f.Q.value = q
    f.frequency.setValueAtTime(f0, t)
    f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur)
    const g = this.out(pan)
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur)
    src.connect(f); f.connect(g)
    src.start(t, Math.random())
    src.stop(t + dur + 0.02)
  }

  tone(type, f0, f1, dur, vol, pan = 0, delay = 0) {
    const ctx = this.ctx
    if (!ctx) return
    const t = ctx.currentTime + delay
    const o = ctx.createOscillator()
    o.type = type
    o.frequency.setValueAtTime(f0, t)
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur)
    const g = this.out(pan)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(vol, t + 0.006)
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur)
    o.connect(g)
    o.start(t)
    o.stop(t + dur + 0.02)
  }

  // Reproduce un efecto en una posición del mundo, con atenuación y paneo simples.
  playAt(name, x, z, vol = 1) {
    const L = this.listener
    const dx = x - L.x
    const dz = z - L.z
    const d = Math.hypot(dx, dz)
    const att = 1 / (1 + d / 14)
    const rx = Math.cos(L.yaw)
    const rz = -Math.sin(L.yaw)
    const pan = d > 0.5 ? (dx * rx + dz * rz) / d : 0
    this.play(name, vol * att, pan * 0.8)
  }

  play(name, v = 1, pan = 0) {
    if (!this.ctx || this.ctx.state !== 'running') return
    switch (name) {
      case 'rifle':
        this.noise(0.11, 5200, 500, 0.5 * v, pan)
        this.tone('square', 190, 60, 0.07, 0.22 * v, pan)
        break
      case 'scatter':
        this.noise(0.3, 3000, 180, 0.75 * v, pan)
        this.tone('sawtooth', 120, 38, 0.2, 0.4 * v, pan)
        break
      case 'bolt':
        this.tone('sawtooth', 880, 190, 0.14, 0.14 * v, pan)
        this.noise(0.06, 6000, 2500, 0.1 * v, pan, 'bandpass', 2)
        break
      case 'cannon':
        this.tone('square', 300, 70, 0.16, 0.24 * v, pan)
        this.noise(0.14, 2500, 300, 0.3 * v, pan)
        break
      case 'hit':
        this.tone('square', 1500, 900, 0.035, 0.1 * v, pan)
        break
      case 'crit':
        this.tone('square', 2100, 1500, 0.05, 0.13 * v, pan)
        this.tone('sine', 3000, 2400, 0.08, 0.08 * v, pan, 0.03)
        break
      case 'armor':
        this.tone('triangle', 2600, 1900, 0.06, 0.1 * v, pan)
        this.noise(0.04, 7000, 5000, 0.08 * v, pan, 'highpass')
        break
      case 'hurt':
        this.noise(0.16, 900, 180, 0.42 * v, pan)
        this.tone('sine', 150, 70, 0.16, 0.34 * v, pan)
        break
      case 'explosion':
        this.noise(0.9, 1800, 50, 1.0 * v, pan)
        this.tone('sine', 95, 26, 0.7, 0.9 * v, pan)
        break
      case 'reload':
        this.tone('square', 700, 500, 0.03, 0.1 * v, pan)
        this.noise(0.05, 3500, 1500, 0.14 * v, pan, 'bandpass', 3)
        this.tone('square', 1000, 800, 0.03, 0.1 * v, pan, 0.22)
        break
      case 'reloadEnd':
        this.noise(0.05, 2500, 900, 0.2 * v, pan, 'bandpass', 2)
        this.tone('square', 420, 300, 0.05, 0.12 * v, pan, 0.04)
        break
      case 'empty':
        this.tone('square', 900, 700, 0.03, 0.09 * v, pan)
        break
      case 'step':
        this.noise(0.07, 700, 200, 0.08 * v, pan)
        break
      case 'roll':
        this.noise(0.28, 900, 250, 0.2 * v, pan)
        break
      case 'cover':
        this.noise(0.1, 500, 150, 0.22 * v, pan)
        this.tone('sine', 110, 70, 0.08, 0.16 * v, pan)
        break
      case 'vault':
        this.noise(0.2, 1300, 400, 0.18 * v, pan)
        break
      case 'melee':
        this.noise(0.12, 2200, 500, 0.3 * v, pan)
        this.tone('sine', 170, 60, 0.14, 0.4 * v, pan, 0.05)
        break
      case 'pickup':
        this.tone('sine', 660, 660, 0.07, 0.14 * v, pan)
        this.tone('sine', 990, 990, 0.12, 0.14 * v, pan, 0.07)
        break
      case 'ui':
        this.tone('sine', 520, 520, 0.05, 0.1 * v, pan)
        break
      case 'radio':
        this.noise(0.09, 2800, 2400, 0.06 * v, pan, 'bandpass', 4)
        this.tone('sine', 1250, 1250, 0.05, 0.05 * v, pan, 0.08)
        break
      case 'door':
        this.noise(1.3, 320, 120, 0.4 * v, pan)
        this.tone('sawtooth', 62, 46, 1.2, 0.22 * v, pan)
        break
      case 'alarm':
        this.tone('square', 620, 620, 0.16, 0.1 * v, pan)
        this.tone('square', 470, 470, 0.16, 0.1 * v, pan, 0.2)
        break
      case 'zap':
        this.tone('sawtooth', 1400, 110, 0.22, 0.28 * v, pan)
        this.noise(0.18, 7000, 1200, 0.22 * v, pan, 'highpass')
        break
      case 'charge':
        this.tone('sawtooth', 160, 760, 0.34, 0.12 * v, pan)
        break
      case 'mortar':
        this.noise(0.22, 800, 120, 0.5 * v, pan)
        this.tone('sine', 220, 70, 0.22, 0.4 * v, pan)
        break
      case 'vent':
        this.noise(1.4, 6500, 1500, 0.24 * v, pan, 'highpass')
        break
      case 'death':
        this.tone('sawtooth', 420, 36, 0.55, 0.22 * v, pan)
        this.noise(0.3, 3000, 300, 0.2 * v, pan)
        break
      case 'throw':
        this.noise(0.12, 1800, 600, 0.12 * v, pan, 'bandpass', 1)
        break
      case 'win':
        ;[392, 494, 587, 784].forEach((f, i) => this.tone('triangle', f, f, 0.5, 0.16 * v, 0, i * 0.16))
        break
      case 'lose':
        ;[294, 247, 196].forEach((f, i) => this.tone('triangle', f, f * 0.97, 0.6, 0.16 * v, 0, i * 0.22))
        break
    }
  }
}
