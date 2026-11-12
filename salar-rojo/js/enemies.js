// Máquinas enemigas, proyectiles, granadas y botín.
import * as THREE from '../vendor/three.module.min.js'
import { clamp, damp, dampAngle, lerp, pushOut, rand, raySphere, yawTo } from './util.js'
import { makeGrunt, makeRoller, makeDrone, makeBoss } from './characters.js'
import { zoneOf } from './level.js'

const ZONE_Z = { A: [-46.5, 11], B: [-100.5, -49.5], C: [-133.5, -103.5] }
const _v = new THREE.Vector3()
const _n = { x: 0, y: 1, z: 0 }

function follow(e, dt, speed) {
  if (!e.path || e.pi >= e.path.length) return true
  const wp = e.path[e.pi]
  let dx = wp.x - e.pos.x
  let dz = wp.z - e.pos.z
  const d = Math.hypot(dx, dz)
  if (d < 0.3) { e.pi++; return e.pi >= e.path.length }
  dx /= d; dz /= d
  const step = Math.min(d, speed * dt)
  e.pos.x += dx * step
  e.pos.z += dz * step
  e.yaw = dampAngle(e.yaw, yawTo(dx, dz), 10, dt)
  e.speed = speed
  return false
}

class Enemy {
  constructor(mgr, type, x, z, hp, model) {
    this.mgr = mgr
    this.game = mgr.game
    this.type = type
    this.pos = new THREE.Vector3(x, 0, z)
    this.yaw = 0
    this.hp = this.maxHp = hp
    this.alive = true
    this.deadT = 0
    this.spawnT = 0.6
    this.speed = 0
    this.flinch = 0
    this.model = model
    this.spheres = []
    this.zone = zoneOf(z)
    this.game.scene.add(model.root)
    model.root.position.copy(this.pos)
  }

  damage(amount, point, dir, part) {
    if (!this.alive || this.spawnT > 0.3) return
    const g = this.game
    this.hp -= amount
    this.flinch = Math.min(1, this.flinch + amount / 60)
    const kind = part ? part.kind : 'robot'
    if (point) g.fx.impact(point, dir ? { x: -dir.x, y: -dir.y + 0.3, z: -dir.z } : _n, kind)
    if (this.hp <= 0) {
      this.alive = false
      this.onDeath()
      this.mgr.onKill(this)
      g.hud.hitmarker('kill')
    } else {
      g.hud.hitmarker(kind === 'core' || (part && part.mult > 1.5) ? 'crit' : kind === 'armor' ? 'armor' : 'hit')
      g.audio.play(kind === 'armor' ? 'armor' : part && part.mult > 1.5 ? 'crit' : 'hit')
      this.onHurt(amount)
    }
  }

  onHurt() {}

  onDeath() {
    const g = this.game
    g.audio.playAt('death', this.pos.x, this.pos.z)
    g.fx.sparks(this.pos.x, 1.2, this.pos.z, 18, 1, 0.6, 0.2, 6)
    g.fx.puff(this.pos.x, 1.1, this.pos.z, 5, 0.9, 0.12, 0.55)
  }

  separate(r) {
    for (const o of this.mgr.list) {
      if (o === this || !o.alive || o.type === 'drone' || o.type === 'boss') continue
      const dx = this.pos.x - o.pos.x
      const dz = this.pos.z - o.pos.z
      const d2 = dx * dx + dz * dz
      if (d2 < r * r && d2 > 1e-6) {
        const d = Math.sqrt(d2)
        const k = ((r - d) / d) * 0.5
        this.pos.x += dx * k
        this.pos.z += dz * k
      }
    }
  }

  collide() {
    const cs = this.game.level.colliders
    for (let i = 0; i < cs.length; i++) if (cs[i].walk) pushOut(this.pos, 0.38, cs[i])
  }

  canSee(fromY, px = this.pos.x, pz = this.pos.z) {
    const p = this.game.player
    return this.game.level.clear(px, fromY, pz, p.pos.x, p.hitHeight - 0.2, p.pos.z)
  }
}

// ---------- Peón ----------

class Grunt extends Enemy {
  constructor(mgr, x, z) {
    super(mgr, 'grunt', x, z, 95, makeGrunt())
    this.radius = 0.45
    this.state = 'seek'
    this.timer = rand(0.1, 0.5)
    this.cp = null
    this.path = null
    this.pi = 0
    this.crouch = 0
    this.aim = 0
    this.peekOff = 0
    this.peeks = 0
    this.miss = 0
    this.burst = 0
    this.burstCd = rand(1, 2.5)
    this.retryT = 0
    this.stuckT = 0
    this.lastX = x
    this.lastZ = z
    this.spheres = [
      { x: 0, y: 0, z: 0, r: 0.2, mult: 2, kind: 'robot' },
      { x: 0, y: 0, z: 0, r: 0.4, mult: 1, kind: 'robot' },
      { x: 0, y: 0, z: 0, r: 0.33, mult: 0.8, kind: 'robot' },
    ]
  }

  release() {
    if (this.cp && this.cp.user === this) this.cp.user = null
    this.cp = null
  }

  pickCover() {
    const g = this.game
    const p = g.player.pos
    let best = null
    let bs = 1e9
    for (const c of g.level.coverPoints) {
      if (c.zone !== this.zone || (c.user && c.user !== this)) continue
      const dx = p.x - c.x
      const dz = p.z - c.z
      const dist = Math.hypot(dx, dz)
      if (dist < 6.5 || dist > 34) continue
      const facing = (c.nx * dx + c.nz * dz) / dist
      if (facing > -0.45) continue
      const travel = Math.hypot(c.x - this.pos.x, c.z - this.pos.z)
      const s = Math.abs(dist - 15) + travel * 0.55 + rand(5) + (c === this.cp ? 6 : 0)
      if (s < bs) { bs = s; best = c }
    }
    this.release()
    if (!best) return false
    best.user = this
    this.cp = best
    this.path = g.level.findPath(this.pos.x, this.pos.z, best.x, best.z)
    this.pi = 0
    if (!this.path) { this.release(); return false }
    return true
  }

  coverValid() {
    const c = this.cp
    const p = this.game.player.pos
    const dx = p.x - c.x
    const dz = p.z - c.z
    const dist = Math.hypot(dx, dz)
    return dist > 4.5 && (c.nx * dx + c.nz * dz) / dist < -0.15
  }

  shoot() {
    const g = this.game
    const p = g.player
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw)
    const rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw)
    const mx = this.pos.x + fx * 0.75 + rx * 0.45
    const my = 1.5 - this.crouch * 0.6
    const mz = this.pos.z + fz * 0.75 + rz * 0.45
    const range = Math.hypot(p.pos.x - mx, p.pos.z - mz)
    const sp = (0.05 + (p.speed > 5 ? 0.035 : 0) + (p.rollT >= 0 ? 0.05 : 0)) * Math.max(4, range)
    const dx = p.pos.x - mx + rand(-1, 1) * sp
    const dy = p.hitHeight * 0.6 - my + rand(-1, 1) * sp * 0.6
    const dz = p.pos.z - mz + rand(-1, 1) * sp
    const l = Math.hypot(dx, dy, dz)
    this.mgr.fireBolt(mx, my, mz, dx / l, dy / l, dz / l, 36, 8, 'red')
    g.audio.playAt('bolt', mx, mz, 0.9)
    g.fx.flash(mx, my, mz, 0xff5020, 22, 0.06)
  }

  onHurt(amount) {
    if (this.state === 'peek' && (amount > 28 || Math.random() < 0.3)) {
      this.state = 'hide'
      this.timer = rand(0.8, 1.6)
    }
  }

  onDeath() {
    super.onDeath()
    this.release()
  }

  update(dt) {
    const g = this.game
    const p = g.player
    const toX = p.pos.x - this.pos.x
    const toZ = p.pos.z - this.pos.z
    const dist = Math.hypot(toX, toZ)
    this.speed = 0
    this.timer -= dt
    this.burstCd -= dt
    this.flinch = Math.max(0, this.flinch - dt * 3)
    let aimWant = 0
    let crouchWant = 0
    let peekWant = 0

    if (p.dead) {
      this.state = 'idle'
    }

    switch (this.state) {
      case 'idle':
        if (!p.dead) this.state = 'seek'
        break
      case 'seek':
        if (this.timer <= 0) {
          if (this.pickCover()) this.state = 'move'
          else { this.state = 'open'; this.retryT = 2.5; this.path = null }
        }
        break
      case 'move': {
        const arrived = follow(this, dt, 3.7)
        this.separate(0.9)
        this.collide()
        // Disparo ocasional en movimiento.
        if (this.burstCd <= 0 && dist < 26 && this.canSee(1.6)) {
          this.yaw = yawTo(toX, toZ)
          this.shoot()
          this.burstCd = rand(1.1, 2.2)
        }
        this.stuckT += dt
        if (this.stuckT > 1.2) {
          if (Math.hypot(this.pos.x - this.lastX, this.pos.z - this.lastZ) < 0.35) { this.state = 'seek'; this.timer = 0.1 }
          this.lastX = this.pos.x; this.lastZ = this.pos.z; this.stuckT = 0
        }
        if (this.cp && !this.coverValid()) { this.state = 'seek'; this.timer = 0.2 }
        else if (arrived) { this.state = 'hide'; this.timer = rand(0.4, 1.2); this.miss = 0; this.peeks = 0 }
        break
      }
      case 'hide': {
        const c = this.cp
        crouchWant = c.low ? 1 : 0
        this.yaw = dampAngle(this.yaw, yawTo(toX, toZ), 6, dt)
        if (!this.coverValid()) { this.state = dist < 5 ? 'open' : 'seek'; this.timer = 0.15; this.retryT = 1.5; break }
        if (this.timer <= 0) {
          const px = c.x + c.tx * c.side * 1.1
          const pz = c.z + c.tz * c.side * 1.1
          if (this.canSee(1.6, px, pz)) { this.state = 'peek'; this.timer = rand(0.4, 0.65); this.burst = 3 + ((Math.random() * 2) | 0) }
          else {
            this.miss++
            this.timer = 0.7
            if (this.miss >= 3) { this.state = 'seek'; this.timer = 0 }
          }
        }
        break
      }
      case 'peek': {
        const c = this.cp
        crouchWant = 0
        peekWant = c.low ? 0 : 1
        aimWant = 1
        this.yaw = dampAngle(this.yaw, yawTo(toX, toZ), 12, dt)
        if (this.timer <= 0 && this.burst > 0) {
          this.shoot()
          this.burst--
          this.timer = 0.14
        } else if (this.burst <= 0 && this.timer <= -0.25) {
          this.peeks++
          if (this.peeks >= 3 && Math.random() < 0.55) { this.state = 'seek'; this.timer = 0.2 }
          else { this.state = 'hide'; this.timer = rand(0.9, 2.1) }
        }
        break
      }
      case 'open': {
        // Sin cobertura útil: mantiene distancia y dispara ráfagas.
        aimWant = 1
        this.yaw = dampAngle(this.yaw, yawTo(toX, toZ), 8, dt)
        const want = dist > 13 ? 1 : dist < 8 ? -1 : 0
        if (want !== 0 && dist > 0.1) {
          this.pos.x += (toX / dist) * want * 2.4 * dt
          this.pos.z += (toZ / dist) * want * 2.4 * dt
          this.speed = 2.4
        }
        const lim = ZONE_Z[this.zone]
        this.pos.z = clamp(this.pos.z, lim[0], lim[1])
        this.separate(0.9)
        this.collide()
        if (this.burstCd <= 0 && this.canSee(1.6)) {
          this.burst = 3
          this.burstCd = rand(1.4, 2.2)
          this.timer = 0
        }
        if (this.burst > 0 && this.timer <= 0) { this.shoot(); this.burst--; this.timer = 0.14 }
        this.retryT -= dt
        if (this.retryT <= 0 && this.burst <= 0) { this.state = 'seek'; this.timer = 0 }
        break
      }
    }

    this.crouch = damp(this.crouch, crouchWant, 9, dt)
    this.aim = aimWant
    this.peekOff = damp(this.peekOff, peekWant, 7, dt)
    if ((this.state === 'hide' || this.state === 'peek') && this.cp) {
      const c = this.cp
      this.pos.x = damp(this.pos.x, c.x + c.tx * c.side * 1.1 * this.peekOff, 10, dt)
      this.pos.z = damp(this.pos.z, c.z + c.tz * c.side * 1.1 * this.peekOff, 10, dt)
      if (peekWant !== (this.peekOff > 0.5 ? 1 : 0)) this.speed = 2
    }

    const c = this.crouch
    const s = this.spheres
    s[0].x = s[1].x = s[2].x = this.pos.x
    s[0].z = s[1].z = s[2].z = this.pos.z
    s[0].y = lerp(1.9, 0.95, c)
    s[1].y = lerp(1.45, 0.7, c)
    s[2].y = lerp(0.62, 0.35, c)

    this.model.root.position.copy(this.pos)
    this.model.root.rotation.y = this.yaw
    this.model.update(dt, { speed: this.speed, crouch: this.crouch, aim: this.aim, dead: false, flinch: this.flinch, pitch: 0 })
  }
}

// ---------- Rodador ----------

class Roller extends Enemy {
  constructor(mgr, x, z) {
    super(mgr, 'roller', x, z, 45, makeRoller())
    this.radius = 0.45
    this.state = 'chase'
    this.repath = 0
    this.timer = 0
    this.vel = 0
    this.charge = 0
    this.spheres = [{ x, y: 0.45, z, r: 0.52, mult: 1, kind: 'robot' }]
  }

  onDeath() {
    const g = this.game
    g.fx.explosion(this.pos.x, 0.5, this.pos.z, 0.45)
    g.audio.playAt('explosion', this.pos.x, this.pos.z, 0.45)
  }

  update(dt) {
    const g = this.game
    const p = g.player
    const dx = p.pos.x - this.pos.x
    const dz = p.pos.z - this.pos.z
    const dist = Math.hypot(dx, dz)
    this.timer -= dt
    this.charge = 0
    if (p.dead) this.state = 'wait'
    else if (this.state === 'wait') this.state = 'chase'

    if (this.state === 'chase') {
      this.repath -= dt
      if (this.repath <= 0) {
        this.repath = 0.45
        if (g.level.navClear(this.pos.x, this.pos.z, p.pos.x, p.pos.z)) { this.path = [{ x: p.pos.x, z: p.pos.z }]; this.pi = 0 }
        else { this.path = g.level.findPath(this.pos.x, this.pos.z, p.pos.x, p.pos.z); this.pi = 0 }
      }
      this.vel = damp(this.vel, 6.4, 3, dt)
      follow(this, dt, this.vel)
      this.separate(1.0)
      this.collide()
      if (dist < 1.9) { this.state = 'windup'; this.timer = 0.42; g.audio.playAt('charge', this.pos.x, this.pos.z) }
    } else if (this.state === 'windup') {
      this.charge = 1 - this.timer / 0.42
      this.vel = damp(this.vel, 0, 8, dt)
      this.speed = this.vel
      if (this.timer <= 0) {
        g.audio.playAt('zap', this.pos.x, this.pos.z)
        g.fx.sparks(this.pos.x, 0.6, this.pos.z, 22, 1, 0.75, 0.25, 7)
        g.fx.flash(this.pos.x, 0.8, this.pos.z, 0xffb040, 120, 0.15)
        if (dist < 2.5) p.damage(20, this.pos.x, this.pos.z)
        this.state = 'cool'
        this.timer = 1.0
      }
    } else if (this.state === 'cool') {
      this.speed = 0
      if (this.timer <= 0) { this.state = 'chase'; this.repath = 0 }
    } else this.speed = 0

    const s = this.spheres[0]
    s.x = this.pos.x; s.z = this.pos.z
    this.model.root.position.copy(this.pos)
    this.model.root.rotation.y = this.yaw
    this.model.update(dt, { speed: this.speed, charge: this.charge, dead: false })
  }
}

// ---------- Avispa ----------

class Drone extends Enemy {
  constructor(mgr, x, z) {
    super(mgr, 'drone', x, z, 50, makeDrone())
    this.pos.y = 2.5
    this.radius = 0.5
    this.angle = rand(6.28)
    this.dir = Math.random() < 0.5 ? 1 : -1
    this.orbit = rand(9, 13)
    this.alt = rand(3.6, 5.2)
    this.vx = 0
    this.vz = 0
    this.fireT = rand(1.5, 3)
    this.burst = 0
    this.turnT = rand(3, 7)
    this.vy = 0
    this.falling = false
    this.spheres = [{ x, y: 2.5, z, r: 0.52, mult: 1, kind: 'robot' }]
  }

  onDeath() {
    super.onDeath()
    this.falling = true
  }

  shoot() {
    const g = this.game
    const p = g.player
    const mx = this.pos.x, my = this.pos.y - 0.25, mz = this.pos.z
    const dx = p.pos.x - mx + rand(-0.6, 0.6)
    const dy = p.hitHeight * 0.6 - my + rand(-0.4, 0.4)
    const dz = p.pos.z - mz + rand(-0.6, 0.6)
    const l = Math.hypot(dx, dy, dz)
    this.mgr.fireBolt(mx, my, mz, dx / l, dy / l, dz / l, 30, 6, 'amber')
    g.audio.playAt('bolt', mx, mz, 0.7)
  }

  update(dt) {
    const g = this.game
    const p = g.player
    this.turnT -= dt
    if (this.turnT <= 0) { this.dir = -this.dir; this.turnT = rand(3, 7); this.orbit = rand(8, 13) }
    this.angle += this.dir * 0.45 * dt
    const lim = ZONE_Z[this.zone]
    const tx = clamp(p.pos.x + Math.cos(this.angle) * this.orbit, -20, 20)
    const tz = clamp(p.pos.z + Math.sin(this.angle) * this.orbit, lim[0] + 1, lim[1] - 1)
    const ax = clamp((tx - this.pos.x) * 1.4, -6, 6)
    const az = clamp((tz - this.pos.z) * 1.4, -6, 6)
    this.vx = damp(this.vx, ax, 2.5, dt)
    this.vz = damp(this.vz, az, 2.5, dt)
    this.pos.x += this.vx * dt
    this.pos.z += this.vz * dt
    const ceiling = this.zone === 'B' ? 6.8 : 9
    this.pos.y = damp(this.pos.y, Math.min(ceiling, this.alt + Math.sin(g.time * 1.7 + this.orbit) * 0.4), 2, dt)
    this.speed = Math.hypot(this.vx, this.vz)
    const dx = p.pos.x - this.pos.x
    const dz = p.pos.z - this.pos.z
    this.yaw = dampAngle(this.yaw, yawTo(dx, dz), 5, dt)

    this.fireT -= dt
    if (!p.dead && this.fireT <= 0) {
      if (this.burst > 0) { this.shoot(); this.burst--; this.fireT = this.burst > 0 ? 0.16 : rand(2, 3.2) }
      else if (g.level.clear(this.pos.x, this.pos.y - 0.2, this.pos.z, p.pos.x, p.hitHeight - 0.2, p.pos.z)) this.burst = 2
      else this.fireT = 0.4
    }
    const s = this.spheres[0]
    s.x = this.pos.x; s.y = this.pos.y; s.z = this.pos.z
    this.model.root.position.copy(this.pos)
    this.model.root.rotation.y = this.yaw
    const side = Math.cos(this.yaw) * this.vx - Math.sin(this.yaw) * this.vz
    this.model.update(dt, { bank: clamp(-side / 5, -1, 1), dead: false })
  }

  updateDead(dt) {
    if (!this.falling) return
    this.vy -= 14 * dt
    this.pos.y += this.vy * dt
    this.pos.x += this.vx * dt
    this.pos.z += this.vz * dt
    this.model.root.rotation.z += dt * 4
    this.model.root.position.copy(this.pos)
    if (this.pos.y <= 0.3) {
      this.falling = false
      this.game.fx.explosion(this.pos.x, 0.4, this.pos.z, 0.5)
      this.game.audio.playAt('explosion', this.pos.x, this.pos.z, 0.5)
      this.model.root.visible = false
    }
  }
}

// ---------- Capataz (jefe) ----------

class Boss extends Enemy {
  constructor(mgr) {
    super(mgr, 'boss', 0, -138, 3000, makeBoss())
    this.spawnT = 0
    this.radius = 2.2
    this.state = 'intro'
    this.timer = 2.6
    this.vent = false
    this.next = 'cannon'
    this.shots = 0
    this.addsAt = [0.7, 0.4]
    this.droneT = 28
    this.alert = 0
    this.ty = 4.3
    this.body = { x: 0, y: 4.3, z: -138, r: 2.0, mult: 0.3, kind: 'armor' }
    this.head = { x: 0, y: 6, z: -138, r: 0.7, mult: 1, kind: 'robot' }
    this.coreS = { x: 0, y: 4.15, z: -138, r: 0.78, mult: 2.4, kind: 'core' }
    this.spheres = [this.body, this.head]
    const lg = new THREE.BoxGeometry(0.05, 0.05, 1)
    this.laser = new THREE.Mesh(lg, new THREE.MeshBasicMaterial({ color: 0xff3020, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }))
    this.laser.visible = false
    this.laser.frustumCulled = false
    this.game.scene.add(this.laser)
  }

  muzzle(out) {
    const c = Math.cos(this.yaw), s = Math.sin(this.yaw)
    const lx = -2.05, lz = -3.5
    return out.set(this.pos.x + lx * c + lz * s, 4.5, -138 - lx * s + lz * c)
  }

  onHurt() {}

  onDeath() {
    const g = this.game
    this.laser.visible = false
    this.vent = false
    this.dieT = 0
    this.booms = 0
    g.audio.playAt('death', this.pos.x, -138, 2)
  }

  updateDead(dt) {
    if (this.booms >= 7) { this.model.update(dt, { vent: false, dead: true }); return }
    this.dieT -= dt
    if (this.dieT <= 0) {
      this.dieT = 0.38
      this.booms++
      const g = this.game
      const x = this.pos.x + rand(-5, 5)
      const y = rand(2, 8)
      g.fx.explosion(x, y, -138 + rand(-1, 1), rand(0.7, 1.3))
      g.audio.playAt('explosion', x, -138, 1)
      g.fx.shake(0.5)
    }
    this.model.update(dt, { vent: false, dead: true })
  }

  update(dt) {
    const g = this.game
    const p = g.player
    const frac = this.hp / this.maxHp
    const rate = frac < 0.5 ? 1.3 : 1
    this.timer -= dt * rate
    this.pos.x = damp(this.pos.x, clamp(p.pos.x * 0.75, -12, 12), 0.55, dt)
    const dx = p.pos.x - this.pos.x
    const dz = p.pos.z - -138
    this.yaw = dampAngle(this.yaw, yawTo(dx, dz), 2.6, dt)
    const dist = Math.hypot(dx, dz)
    const pitch = Math.atan2(4.5 - p.hitHeight * 0.6, Math.max(4, dist))
    this.alert = damp(this.alert, this.state === 'cannonAim' || this.state === 'cannonFire' ? 1 : 0, 6, dt)
    this.laser.visible = false

    switch (this.state) {
      case 'intro':
        if (this.timer <= 0) { this.state = 'idle'; this.timer = 1 }
        break
      case 'idle':
        if (this.timer <= 0 && !p.dead) {
          if (this.next === 'cannon') { this.state = 'cannonAim'; this.timer = 0.95; g.audio.playAt('charge', this.pos.x, -138, 1.6); this.next = 'mortar' }
          else { this.state = 'mortar'; this.timer = 0.5; this.shots = frac < 0.5 ? 6 : 4; this.next = 'cannon' }
        }
        break
      case 'cannonAim': {
        const m = this.muzzle(_v)
        const tx = p.pos.x, ty = p.hitHeight * 0.6, tz = p.pos.z
        this.laser.visible = true
        this.laser.position.set((m.x + tx) / 2, (m.y + ty) / 2, (m.z + tz) / 2)
        this.laser.lookAt(tx, ty, tz)
        this.laser.scale.set(1, 1, Math.hypot(tx - m.x, ty - m.y, tz - m.z))
        this.laser.material.opacity = 0.35 + 0.4 * Math.abs(Math.sin(g.time * 22))
        if (this.timer <= 0) { this.state = 'cannonFire'; this.shots = frac < 0.5 ? 22 : 16; this.timer = 0 }
        break
      }
      case 'cannonFire':
        if (this.timer <= 0 && this.shots > 0) {
          this.shots--
          this.timer = 0.1
          const m = this.muzzle(_v)
          const ddx = p.pos.x - m.x + rand(-1.3, 1.3)
          const ddy = p.hitHeight * 0.55 - m.y + rand(-0.5, 0.5)
          const ddz = p.pos.z - m.z + rand(-1.3, 1.3)
          const l = Math.hypot(ddx, ddy, ddz)
          this.mgr.fireBolt(m.x, m.y, m.z, ddx / l, ddy / l, ddz / l, 46, 9, 'amber')
          g.audio.playAt('cannon', m.x, m.z, 1.4)
          g.fx.flash(m.x, m.y, m.z, 0xffa030, 80, 0.07)
        } else if (this.shots <= 0 && this.timer <= 0) { this.state = 'idle'; this.timer = 1.3 }
        break
      case 'mortar':
        if (this.timer <= 0 && this.shots > 0) {
          this.shots--
          this.timer = 0.42
          const lead = 1.1
          const tx = clamp(p.pos.x + p.vel.x * lead + rand(-2.6, 2.6), -20.5, 20.5)
          const tz = clamp(p.pos.z + p.vel.z * lead + rand(-2.6, 2.6), -133, -104)
          const c = Math.cos(this.yaw), s = Math.sin(this.yaw)
          this.mgr.fireMortar(this.pos.x + 2.1 * c, 6.2, -138 - 2.1 * s, tx, tz)
          g.audio.playAt('mortar', this.pos.x, -138, 1.5)
        } else if (this.shots <= 0 && this.timer <= 0) {
          this.state = 'vent'
          this.timer = 5.2
          this.vent = true
          this.spheres = [this.coreS, this.body, this.head]
          g.audio.playAt('vent', this.pos.x, -138, 2)
          g.hud.hint('El núcleo del Capataz está expuesto: dispara al pecho', 4)
        }
        break
      case 'vent': {
        if (Math.random() < dt * 30) {
          const c = Math.cos(this.yaw), s = Math.sin(this.yaw)
          g.fx.smoke.spawn(this.pos.x - 1.4 * s + rand(-0.8, 0.8), 4.2 + rand(-0.6, 0.6), -138 - 1.4 * c, -s * rand(1, 3), rand(0.5, 2), -c * rand(1, 3), rand(0.6, 1.2), 0.5, 2.2, 0.85, 0.9, 0.9, 0.35, -0.6, 1)
        }
        if (this.timer <= 0) { this.vent = false; this.spheres = [this.body, this.head]; this.state = 'idle'; this.timer = 1.2 }
        break
      }
    }

    // Refuerzos por umbral de vida y drones periódicos.
    if (this.addsAt.length && frac < this.addsAt[0]) {
      this.addsAt.shift()
      this.mgr.spawnGroup([['roller', 0], ['roller', 1], ['roller', 2], ['grunt', 3], ['grunt', 0]], 'C')
      g.director.say('Control', 'Refuerzos entrando por las persianas laterales.')
    }
    this.droneT -= dt
    if (this.droneT <= 0) {
      this.droneT = 30
      if (this.mgr.aliveCount() < 4) this.mgr.spawnGroup([['drone', 0], ['drone', 1]], 'C')
    }

    const c = Math.cos(this.yaw), s = Math.sin(this.yaw)
    this.body.x = this.pos.x
    this.head.x = this.pos.x - 0.9 * s
    this.head.z = -138 - 0.9 * c
    this.coreS.x = this.pos.x - 1.15 * s
    this.coreS.z = -138 - 1.15 * c
    this.model.root.position.set(this.pos.x, 0, -138)
    this.model.torso.rotation.y = this.yaw
    this.model.update(dt, { vent: this.vent, dead: false, pitch: -pitch, alert: this.alert })
  }
}

// ---------- Gestor ----------

export class Enemies {
  constructor(game) {
    this.game = game
    this.list = []
    this.bolts = []
    this.grenades = []
    this.mortars = []
    this.pickups = []
    this.queue = []
    this.boss = null
    this.grenadeGeo = new THREE.IcosahedronGeometry(0.11, 1)
    this.grenadeMat = new THREE.MeshStandardMaterial({ color: 0x1c2a2c, emissive: 0x39e6d2, emissiveIntensity: 2 })
    this.shellGeo = new THREE.SphereGeometry(0.3, 10, 8)
    this.shellMat = new THREE.MeshBasicMaterial({ color: 0xffa040 })
    const rg = new THREE.RingGeometry(3.1, 3.5, 40)
    rg.rotateX(-Math.PI / 2)
    this.markGeo = rg
    this.pickGeo = new THREE.BoxGeometry(0.34, 0.2, 0.22)
    this.pickMat = new THREE.MeshStandardMaterial({ color: 0x0c2a2c, emissive: 0x52ff7a, emissiveIntensity: 2.4 })
  }

  aliveCount() {
    let n = this.queue.length
    for (const e of this.list) if (e.alive && e.type !== 'boss') n++
    return n
  }

  spawn(type, x, z) {
    let e
    if (type === 'grunt') e = new Grunt(this, x, z)
    else if (type === 'roller') e = new Roller(this, x, z)
    else if (type === 'drone') e = new Drone(this, x, z)
    else { e = new Boss(this); this.boss = e }
    this.list.push(e)
    if (type !== 'boss') {
      this.game.fx.sparks(x, 1, z, 10, 1, 0.3, 0.2, 3)
      this.game.audio.playAt('alarm', x, z, 0.5)
    }
    return e
  }

  // spec: [[tipo, índice de persiana], ...]
  spawnGroup(spec, zone) {
    const pts = this.game.level.spawns[zone]
    spec.forEach(([type, idx], i) => {
      const s = pts[idx % pts.length]
      const inward = Math.abs(s[0]) > 15 ? -Math.sign(s[0]) * 1.4 : 0
      this.queue.push({ type, x: s[0] + inward + rand(-0.4, 0.4), z: s[1] + rand(-0.9, 0.9), t: i * 0.45 })
    })
  }

  clear() {
    const g = this.game
    for (const e of this.list) {
      g.scene.remove(e.model.root)
      if (e.laser) g.scene.remove(e.laser)
      if (e.release) e.release()
    }
    for (const b of this.bolts) g.fx.freeBolt(b.mesh)
    for (const o of this.grenades) g.scene.remove(o.mesh)
    for (const o of this.mortars) { g.scene.remove(o.mesh); g.scene.remove(o.mark); o.mark.material.dispose() }
    for (const o of this.pickups) g.scene.remove(o.mesh)
    for (const c of g.level.coverPoints) c.user = null
    this.list = []
    this.bolts = []
    this.grenades = []
    this.mortars = []
    this.pickups = []
    this.queue = []
    this.boss = null
  }

  onKill(e) {
    const g = this.game
    g.player.stats.kills++
    if (e.type !== 'boss' && Math.random() < (e.type === 'grunt' ? 0.5 : 0.3)) {
      const m = new THREE.Mesh(this.pickGeo, this.pickMat)
      m.position.set(e.pos.x, 0.35, e.pos.z)
      g.scene.add(m)
      this.pickups.push({ mesh: m, life: 40 })
    }
    if (e.type === 'boss') {
      // Al caer el jefe, el resto de máquinas se apaga.
      this.queue = []
      for (const o of this.list) if (o !== e && o.alive) { o.alive = false; o.onDeath() }
    }
  }

  raycast(o, d, maxT) {
    let best = null
    let bt = maxT
    for (const e of this.list) {
      if (!e.alive) continue
      for (const s of e.spheres) {
        const t = raySphere(o.x, o.y, o.z, d.x, d.y, d.z, s.x, s.y, s.z, s.r)
        if (t >= 0 && t < bt) { bt = t; best = { t, enemy: e, part: s } }
      }
    }
    return best
  }

  // Esfera de impacto enemiga más cercana dentro de un cono frontal corto.
  closest(o, dir, range) {
    let best = null
    let bd = range
    for (const e of this.list) {
      if (!e.alive || e.type === 'boss') continue
      const s = e.spheres[Math.min(1, e.spheres.length - 1)]
      const dx = s.x - o.x, dy = s.y - o.y, dz = s.z - o.z
      const d = Math.hypot(dx, dy, dz)
      if (d >= bd || d < 0.05) continue
      const h = Math.hypot(dx, dz) || 1
      const lh = Math.hypot(dir.x, dir.z) || 1
      if ((dx * dir.x + dz * dir.z) / (h * lh) < 0.55) continue
      bd = d
      best = s
    }
    return best
  }

  // Esfera enemiga más alineada con la mirada, dentro de un cono estrecho (ayuda de puntería táctil).
  assist(o, dir, cosMin) {
    let best = null
    let bc = cosMin
    for (const e of this.list) {
      if (!e.alive || e.spawnT > 0) continue
      for (const s of e.spheres) {
        const dx = s.x - o.x, dy = s.y - o.y, dz = s.z - o.z
        const d = Math.hypot(dx, dy, dz)
        if (d < 1 || d > 90) continue
        const c = (dx * dir.x + dy * dir.y + dz * dir.z) / d
        if (c > bc) { bc = c; best = s }
      }
    }
    return best
  }

  melee(pos, yaw, range, dmg) {
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw)
    let hit = false
    for (const e of this.list) {
      if (!e.alive || e.type === 'boss') continue
      const dx = e.pos.x - pos.x
      const dz = e.pos.z - pos.z
      const d = Math.hypot(dx, dz)
      if (d > range || (e.type === 'drone' && e.pos.y > 2.6)) continue
      if (d > 0.3 && (dx * fx + dz * fz) / d < 0.35) continue
      _v.set(e.pos.x, e.type === 'grunt' ? 1.3 : 0.6, e.pos.z)
      e.damage(dmg, _v, { x: fx, y: 0, z: fz }, { mult: 1, kind: 'robot' })
      if (e.alive) { e.pos.x += fx * 0.8; e.pos.z += fz * 0.8; if (e.collide) e.collide() }
      hit = true
    }
    return hit
  }

  explode(x, y, z, radius, dmg, fromPlayer) {
    const g = this.game
    g.fx.explosion(x, y, z, radius / 5)
    g.audio.playAt('explosion', x, z, 1.2)
    const p = g.player
    const pd = Math.hypot(p.pos.x - x, p.pos.z - z)
    g.fx.shake(clamp(1.2 - pd / 18, 0, 0.9))
    if (pd < radius) p.damage(dmg * (1 - (pd / radius) * 0.7) * (fromPlayer ? 0.35 : 1), x, z)
    if (!fromPlayer) return
    let any = false
    for (const e of this.list) {
      if (!e.alive) continue
      const big = e.type === 'boss'
      const ey = big ? 4.3 : e.type === 'drone' ? e.pos.y : 1
      const d = Math.hypot(e.pos.x - x, ey - y, e.pos.z - z) - (big ? 2 : 0)
      if (d > radius) continue
      const m = big ? (e.vent ? 1.2 : 0.35) : 1
      e.damage(dmg * (1 - (Math.max(0, d) / radius) * 0.7) * m, null, null, { mult: 1, kind: big && !e.vent ? 'armor' : 'robot' })
      any = true
    }
    if (any) p.stats.hits++
  }

  fireBolt(x, y, z, dx, dy, dz, speed, dmg, kind) {
    const mesh = this.game.fx.getBolt(kind)
    mesh.position.set(x, y, z)
    mesh.lookAt(x + dx, y + dy, z + dz)
    this.bolts.push({ x, y, z, dx, dy, dz, speed, dmg, life: 4, mesh, sx: x, sz: z })
  }

  fireMortar(x, y, z, tx, tz) {
    const g = this.game
    const mesh = new THREE.Mesh(this.shellGeo, this.shellMat)
    const mark = new THREE.Mesh(this.markGeo, new THREE.MeshBasicMaterial({ color: 0xff4020, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }))
    mark.position.set(tx, 0.05, tz)
    g.scene.add(mesh, mark)
    this.mortars.push({ sx: x, sy: y, sz: z, tx, tz, t: 0, dur: 2.1, mesh, mark })
  }

  throwGrenade(pos, vel) {
    const mesh = new THREE.Mesh(this.grenadeGeo, this.grenadeMat)
    mesh.position.copy(pos)
    mesh.castShadow = true
    this.game.scene.add(mesh)
    this.grenades.push({ p: pos.clone(), v: vel.clone(), fuse: 1.9, mesh })
  }

  update(dt) {
    const g = this.game
    const lvl = g.level
    const p = g.player

    // Cola de aparición.
    for (let i = this.queue.length - 1; i >= 0; i--) {
      const q = this.queue[i]
      q.t -= dt
      if (q.t <= 0) { this.queue.splice(i, 1); this.spawn(q.type, q.x, q.z) }
    }

    // Enemigos.
    for (let i = this.list.length - 1; i >= 0; i--) {
      const e = this.list[i]
      if (e.alive) {
        if (e.spawnT > 0) {
          e.spawnT -= dt
          const k = clamp(1 - e.spawnT / 0.6, 0.05, 1)
          e.model.root.scale.setScalar(k)
          e.model.root.position.copy(e.pos)
          continue
        }
        e.update(dt)
      } else {
        e.deadT += dt
        if (e.updateDead) e.updateDead(dt)
        else if (e.type === 'grunt') e.model.update(dt, { speed: 0, crouch: 0, aim: 0, dead: true })
        else if (e.type === 'roller') e.model.root.visible = false
        if (e.type !== 'boss' && e.deadT > 9) {
          e.model.root.position.y -= dt * 0.4
          if (e.deadT > 12) { g.scene.remove(e.model.root); this.list.splice(i, 1) }
        }
      }
    }

    // Proyectiles enemigos.
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i]
      const step = b.speed * dt
      let end = false
      let t = lvl.raycast(b.x, b.y, b.z, b.dx, b.dy, b.dz, step, _n)
      const reach = t >= 0 ? t : step
      // Impacto con la protagonista (cilindro vertical).
      if (!p.dead) {
        const hx = p.pos.x - b.x
        const hz = p.pos.z - b.z
        const s = clamp(hx * b.dx + hz * b.dz, 0, reach)
        const cx = b.x + b.dx * s, cy = b.y + b.dy * s, cz = b.z + b.dz * s
        if (Math.hypot(p.pos.x - cx, p.pos.z - cz) < 0.42 && cy > 0 && cy < p.hitHeight) {
          p.damage(b.dmg, b.sx, b.sz)
          g.fx.sparks(cx, cy, cz, 5, 1, 0.5, 0.2, 3)
          end = true
        }
      }
      if (!end && t >= 0) {
        _v.set(b.x + b.dx * t, b.y + b.dy * t, b.z + b.dz * t)
        g.fx.impact(_v, _n, 'concrete')
        end = true
      }
      b.x += b.dx * step; b.y += b.dy * step; b.z += b.dz * step
      b.life -= dt
      b.mesh.position.set(b.x, b.y, b.z)
      if (end || b.life <= 0) { g.fx.freeBolt(b.mesh); this.bolts.splice(i, 1) }
    }

    // Granadas.
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const o = this.grenades[i]
      o.fuse -= dt
      o.v.y -= 19 * dt
      const sp = o.v.length()
      const step = sp * dt
      if (sp > 0.01) {
        const dx = o.v.x / sp, dy = o.v.y / sp, dz = o.v.z / sp
        const t = lvl.raycast(o.p.x, o.p.y, o.p.z, dx, dy, dz, step + 0.12, _n)
        if (t >= 0) {
          const dot = o.v.x * _n.x + o.v.y * _n.y + o.v.z * _n.z
          o.v.x -= 2 * dot * _n.x; o.v.y -= 2 * dot * _n.y; o.v.z -= 2 * dot * _n.z
          o.v.multiplyScalar(0.42)
          if (_n.y > 0.5 && Math.abs(o.v.y) < 1.2) o.v.y = 0
        } else o.p.addScaledVector(o.v, dt)
      }
      if (o.p.y < 0.11) { o.p.y = 0.11; if (o.v.y < 0) o.v.y = 0; o.v.x *= 1 - 3 * dt; o.v.z *= 1 - 3 * dt }
      o.mesh.position.copy(o.p)
      o.mesh.rotation.x += dt * 9
      if (o.fuse <= 0) {
        g.scene.remove(o.mesh)
        this.grenades.splice(i, 1)
        this.explode(o.p.x, Math.max(0.4, o.p.y), o.p.z, 6, 170, true)
      }
    }

    // Morteros del jefe.
    for (let i = this.mortars.length - 1; i >= 0; i--) {
      const o = this.mortars[i]
      o.t += dt
      const k = o.t / o.dur
      o.mesh.position.set(lerp(o.sx, o.tx, k), lerp(o.sy, 0, k) + Math.sin(Math.PI * k) * 13, lerp(o.sz, o.tz, k))
      o.mark.material.opacity = 0.35 + 0.5 * Math.abs(Math.sin(o.t * (6 + k * 14)))
      o.mark.scale.setScalar(1.25 - 0.25 * k)
      if (Math.random() < dt * 40) g.fx.smoke.spawn(o.mesh.position.x, o.mesh.position.y, o.mesh.position.z, 0, 0.3, 0, 0.5, 0.3, 0.9, 0.3, 0.28, 0.28, 0.4, 0, 1)
      if (k >= 1) {
        g.scene.remove(o.mesh)
        g.scene.remove(o.mark)
        o.mark.material.dispose()
        this.mortars.splice(i, 1)
        this.explode(o.tx, 0.4, o.tz, 3.8, 42, false)
      }
    }

    // Botín.
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const o = this.pickups[i]
      o.life -= dt
      o.mesh.rotation.y += dt * 2.5
      o.mesh.position.y = 0.35 + Math.sin(g.time * 3 + i) * 0.06
      let gone = o.life <= 0
      if (!p.dead && Math.hypot(o.mesh.position.x - p.pos.x, o.mesh.position.z - p.pos.z) < 1.3) {
        const got = p.addAmmo(1)
        const nade = p.grenades < 4 && Math.random() < 0.25
        if (nade) p.grenades++
        if (got || nade) { g.audio.play('pickup'); gone = true }
      }
      if (gone) { g.scene.remove(o.mesh); this.pickups.splice(i, 1) }
    }
  }
}

