// Efectos visuales: partículas, trazadoras, destellos, explosiones y marcas de impacto.
import * as THREE from '../vendor/three.module.min.js'
import { rand } from './util.js'

const VERT = `
attribute vec4 aColor;
attribute float aSize;
uniform float uScale;
varying vec4 vC;
void main() {
  vC = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uScale / max(0.1, -mv.z);
}`
const FRAG = `
varying vec4 vC;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.05, d);
  gl_FragColor = vec4(vC.rgb, vC.a * a);
}`

class Particles {
  constructor(scene, max, additive) {
    this.max = max
    this.next = 0
    this.pos = new Float32Array(max * 3)
    this.col = new Float32Array(max * 4)
    this.size = new Float32Array(max)
    this.vel = new Float32Array(max * 3)
    this.life = new Float32Array(max)
    this.maxLife = new Float32Array(max)
    this.s0 = new Float32Array(max)
    this.s1 = new Float32Array(max)
    this.a0 = new Float32Array(max)
    this.grav = new Float32Array(max)
    this.drag = new Float32Array(max)
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3))
    g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 4))
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1))
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: { uScale: { value: 600 } },
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    })
    this.points = new THREE.Points(g, this.mat)
    this.points.frustumCulled = false
    this.points.renderOrder = additive ? 11 : 10
    scene.add(this.points)
  }

  spawn(x, y, z, vx, vy, vz, life, s0, s1, r, g, b, a, grav, drag) {
    const i = this.next
    this.next = (i + 1) % this.max
    const i3 = i * 3
    const i4 = i * 4
    this.pos[i3] = x; this.pos[i3 + 1] = y; this.pos[i3 + 2] = z
    this.vel[i3] = vx; this.vel[i3 + 1] = vy; this.vel[i3 + 2] = vz
    this.col[i4] = r; this.col[i4 + 1] = g; this.col[i4 + 2] = b; this.col[i4 + 3] = a
    this.life[i] = life; this.maxLife[i] = life
    this.s0[i] = s0; this.s1[i] = s1; this.a0[i] = a
    this.grav[i] = grav; this.drag[i] = drag
    this.size[i] = s0
  }

  update(dt) {
    const { pos, vel, life, maxLife, col, size } = this
    for (let i = 0; i < this.max; i++) {
      if (life[i] <= 0) continue
      life[i] -= dt
      const i3 = i * 3
      if (life[i] <= 0) { size[i] = 0; col[i * 4 + 3] = 0; continue }
      const k = 1 - life[i] / maxLife[i]
      const dr = Math.max(0, 1 - this.drag[i] * dt)
      vel[i3] *= dr; vel[i3 + 2] *= dr
      vel[i3 + 1] = vel[i3 + 1] * dr - this.grav[i] * dt
      pos[i3] += vel[i3] * dt
      pos[i3 + 1] += vel[i3 + 1] * dt
      pos[i3 + 2] += vel[i3 + 2] * dt
      if (pos[i3 + 1] < 0.02 && this.grav[i] > 0) { pos[i3 + 1] = 0.02; vel[i3 + 1] *= -0.3; vel[i3] *= 0.6; vel[i3 + 2] *= 0.6 }
      size[i] = this.s0[i] + (this.s1[i] - this.s0[i]) * k
      col[i * 4 + 3] = this.a0[i] * (1 - k * k)
    }
    const g = this.points.geometry
    g.attributes.position.needsUpdate = true
    g.attributes.aColor.needsUpdate = true
    g.attributes.aSize.needsUpdate = true
  }
}

const UP = new THREE.Vector3(0, 1, 0)
const _v = new THREE.Vector3()
const _q = new THREE.Quaternion()
const Z = new THREE.Vector3(0, 0, 1)

export class Fx {
  constructor(scene) {
    this.scene = scene
    this.glow = new Particles(scene, 1400, true)
    this.smoke = new Particles(scene, 700, false)
    this.shakeAmt = 0

    // Trazadoras del jugador.
    this.tracers = []
    const tg = new THREE.BoxGeometry(0.035, 0.035, 1)
    for (let i = 0; i < 28; i++) {
      const m = new THREE.Mesh(tg, new THREE.MeshBasicMaterial({ color: 0xbff7ee, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }))
      m.visible = false
      m.frustumCulled = false
      scene.add(m)
      this.tracers.push({ mesh: m, life: 0 })
    }
    this.ti = 0

    // Luces puntuales reutilizables para fogonazos y explosiones.
    this.lights = []
    for (let i = 0; i < 3; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 16, 1.6)
      scene.add(l)
      this.lights.push({ light: l, life: 0, dur: 1, peak: 0 })
    }
    this.li = 0

    // Bolas de fuego y ondas de choque.
    this.blasts = []
    const sg = new THREE.IcosahedronGeometry(1, 2)
    const rg = new THREE.RingGeometry(0.82, 1, 40)
    rg.rotateX(-Math.PI / 2)
    for (let i = 0; i < 6; i++) {
      const ball = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ color: 0xffb060, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }))
      const ring = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: 0xffd9a8, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }))
      ball.visible = ring.visible = false
      scene.add(ball, ring)
      this.blasts.push({ ball, ring, life: 0, scale: 1 })
    }
    this.bi = 0

    // Marcas de impacto.
    this.decals = []
    const dg = new THREE.CircleGeometry(1, 10)
    const dm = new THREE.MeshBasicMaterial({ color: 0x0b0b0c, transparent: true, opacity: 0.75, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })
    for (let i = 0; i < 90; i++) {
      const m = new THREE.Mesh(dg, dm)
      m.visible = false
      scene.add(m)
      this.decals.push(m)
    }
    this.di = 0

    // Fogonazo del arma del jugador.
    const fg = new THREE.ConeGeometry(0.13, 0.5, 6, 1, true)
    fg.rotateX(-Math.PI / 2)
    fg.translate(0, 0, -0.25)
    this.muzzle = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ color: 0xc8fff4, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }))
    this.muzzle.visible = false
    this.muzzleT = 0
    scene.add(this.muzzle)

    // Proyectiles enemigos (malla reutilizable).
    this.boltGeo = new THREE.BoxGeometry(0.09, 0.09, 1.1)
    this.boltMats = {
      red: new THREE.MeshBasicMaterial({ color: 0xff5a2a, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }),
      amber: new THREE.MeshBasicMaterial({ color: 0xffb030, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }),
    }
    this.boltPool = []
  }

  setViewport(h, fovDeg) {
    const s = h / (2 * Math.tan((fovDeg * Math.PI) / 360))
    this.glow.mat.uniforms.uScale.value = s
    this.smoke.mat.uniforms.uScale.value = s
  }

  getBolt(kind) {
    const m = this.boltPool.pop() || new THREE.Mesh(this.boltGeo, this.boltMats.red)
    m.material = this.boltMats[kind] || this.boltMats.red
    m.visible = true
    m.frustumCulled = false
    this.scene.add(m)
    return m
  }

  freeBolt(m) {
    m.visible = false
    this.scene.remove(m)
    this.boltPool.push(m)
  }

  shake(a) {
    this.shakeAmt = Math.min(1.4, this.shakeAmt + a)
  }

  flash(x, y, z, color, intensity, dur) {
    const s = this.lights[this.li]
    this.li = (this.li + 1) % this.lights.length
    s.light.color.setHex(color)
    s.light.position.set(x, y, z)
    s.life = s.dur = dur
    s.peak = intensity
    s.light.intensity = intensity
  }

  tracer(from, to, color = 0xbff7ee) {
    const t = this.tracers[this.ti]
    this.ti = (this.ti + 1) % this.tracers.length
    const len = from.distanceTo(to)
    if (len < 0.2) return
    t.mesh.position.copy(from).add(to).multiplyScalar(0.5)
    t.mesh.lookAt(to)
    t.mesh.scale.set(1, 1, len)
    t.mesh.material.color.setHex(color)
    t.mesh.material.opacity = 0.9
    t.mesh.visible = true
    t.life = 0.07
  }

  muzzleFlash(pos, dir, big) {
    this.muzzle.position.copy(pos)
    _q.setFromUnitVectors(Z, _v.copy(dir).negate())
    this.muzzle.quaternion.copy(_q)
    this.muzzle.rotateZ(Math.random() * 6.28)
    const s = big ? 1.9 : 1 + Math.random() * 0.4
    this.muzzle.scale.set(s, s, s)
    this.muzzle.visible = true
    this.muzzleT = 0.045
    this.flash(pos.x, pos.y, pos.z, 0x9ff5e6, big ? 40 : 18, 0.07)
  }

  decal(p, n, size) {
    const m = this.decals[this.di]
    this.di = (this.di + 1) % this.decals.length
    m.position.set(p.x + n.x * 0.012, p.y + n.y * 0.012, p.z + n.z * 0.012)
    _q.setFromUnitVectors(Z, _v.set(n.x, n.y, n.z))
    m.quaternion.copy(_q)
    m.scale.setScalar(size)
    m.visible = true
  }

  // kind: 'concrete' | 'metal' | 'robot' | 'core' | 'armor'
  impact(p, n, kind) {
    const nx = n.x, ny = n.y, nz = n.z
    if (kind === 'concrete') {
      for (let i = 0; i < 4; i++) this.smoke.spawn(p.x, p.y, p.z, nx * rand(0.5, 2) + rand(-0.6, 0.6), ny * rand(0.5, 2) + rand(0.2, 1), nz * rand(0.5, 2) + rand(-0.6, 0.6), rand(0.4, 0.8), 0.15, 0.7, 0.62, 0.58, 0.55, 0.5, 0.5, 2)
      for (let i = 0; i < 3; i++) this.glow.spawn(p.x, p.y, p.z, nx * rand(2, 6) + rand(-2, 2), ny * rand(2, 6) + rand(-1, 3), nz * rand(2, 6) + rand(-2, 2), rand(0.12, 0.3), 0.07, 0.02, 1, 0.8, 0.5, 1, 12, 1)
      this.decal(p, n, rand(0.04, 0.075))
    } else {
      const c = kind === 'core' ? [0.3, 1, 0.9] : kind === 'robot' ? [1, 0.55, 0.15] : [1, 0.85, 0.6]
      const count = kind === 'core' ? 12 : 7
      for (let i = 0; i < count; i++) this.glow.spawn(p.x, p.y, p.z, nx * rand(2, 7) + rand(-3, 3), ny * rand(2, 7) + rand(-1, 4), nz * rand(2, 7) + rand(-3, 3), rand(0.15, 0.45), 0.08, 0.02, c[0], c[1], c[2], 1, 14, 1)
      if (kind === 'robot') this.smoke.spawn(p.x, p.y, p.z, rand(-0.4, 0.4), rand(0.5, 1.2), rand(-0.4, 0.4), rand(0.4, 0.7), 0.12, 0.5, 0.08, 0.08, 0.09, 0.5, -0.4, 1.5)
      if (kind === 'metal') this.decal(p, n, rand(0.03, 0.05))
    }
  }

  sparks(x, y, z, count, r = 1, g = 0.6, b = 0.2, speed = 5) {
    for (let i = 0; i < count; i++) this.glow.spawn(x, y, z, rand(-speed, speed), rand(0, speed), rand(-speed, speed), rand(0.2, 0.7), 0.09, 0.02, r, g, b, 1, 12, 0.8)
  }

  puff(x, y, z, count, size = 1, dark = 0.3, alpha = 0.45) {
    for (let i = 0; i < count; i++) this.smoke.spawn(x + rand(-0.3, 0.3), y + rand(-0.2, 0.2), z + rand(-0.3, 0.3), rand(-0.8, 0.8), rand(0.3, 1.4), rand(-0.8, 0.8), rand(0.7, 1.6), 0.4 * size, 1.6 * size, dark, dark, dark * 1.05, alpha, -0.3, 1.2)
  }

  explosion(x, y, z, scale = 1) {
    const b = this.blasts[this.bi]
    this.bi = (this.bi + 1) % this.blasts.length
    b.life = 0.42
    b.scale = scale
    b.ball.position.set(x, y, z)
    b.ring.position.set(x, 0.06, z)
    b.ball.visible = b.ring.visible = true
    this.flash(x, y + 0.9, z, 0xffa040, 130 * scale, 0.3)
    for (let i = 0; i < 36; i++) {
      const a = rand(6.28)
      const s = rand(3, 14) * scale
      this.glow.spawn(x, y, z, Math.cos(a) * s, rand(1, 11) * scale, Math.sin(a) * s, rand(0.3, 0.9), 0.14, 0.03, 1, rand(0.45, 0.8), 0.2, 1, 14, 0.7)
    }
    for (let i = 0; i < 10; i++) this.glow.spawn(x + rand(-0.5, 0.5), y + rand(0, 0.6), z + rand(-0.5, 0.5), rand(-2, 2), rand(0.5, 3), rand(-2, 2), rand(0.2, 0.45), 1.4 * scale, 2.6 * scale, 1, 0.55, 0.2, 0.8, 0, 1)
    for (let i = 0; i < 16; i++) {
      const a = rand(6.28)
      const s = rand(0.5, 4) * scale
      this.smoke.spawn(x, y + rand(0, 0.5), z, Math.cos(a) * s, rand(0.5, 3.5), Math.sin(a) * s, rand(1.2, 2.6), 0.8 * scale, 3.2 * scale, 0.12, 0.11, 0.11, 0.6, -0.5, 1.4)
    }
    this.decal({ x, y: 0, z }, UP, 1.5 * scale)
  }

  update(dt) {
    this.glow.update(dt)
    this.smoke.update(dt)
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 2.6)
    for (const t of this.tracers) {
      if (t.life <= 0) continue
      t.life -= dt
      t.mesh.material.opacity = Math.max(0, t.life / 0.07) * 0.9
      if (t.life <= 0) t.mesh.visible = false
    }
    for (const s of this.lights) {
      if (s.life <= 0) continue
      s.life -= dt
      s.light.intensity = s.life > 0 ? s.peak * (s.life / s.dur) : 0
    }
    for (const b of this.blasts) {
      if (b.life <= 0) continue
      b.life -= dt
      const k = 1 - Math.max(0, b.life) / 0.42
      b.ball.scale.setScalar((0.5 + k * 2.4) * b.scale)
      b.ball.material.opacity = Math.max(0, 1 - k * 1.6)
      b.ring.scale.setScalar((0.6 + k * 6.5) * b.scale)
      b.ring.material.opacity = Math.max(0, 0.8 * (1 - k))
      if (b.life <= 0) b.ball.visible = b.ring.visible = false
    }
    if (this.muzzleT > 0) {
      this.muzzleT -= dt
      if (this.muzzleT <= 0) this.muzzle.visible = false
    }
  }
}
