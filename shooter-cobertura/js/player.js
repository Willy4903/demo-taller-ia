// Protagonista: movimiento, sistema de coberturas, armas y daño.
import * as THREE from '../vendor/three.module.min.js'
import { clamp, damp, dampAngle, lerp, pushOut, rand, yawTo, angleDiff, smooth } from './util.js'
import { makePlayer } from './characters.js'

export const WEAPONS = [
  { name: 'Carabina R-9', mag: 36, reserve: 180, maxReserve: 252, interval: 0.1, dmg: 21, pellets: 1, spreadAim: 0.005, spreadHip: 0.028, bloom: 0.005, reload: 1.5, range: 150, falloff: [45, 100], sound: 'rifle', recoil: 0.011, pickup: 30 },
  { name: 'Dispersor de arco', mag: 6, reserve: 30, maxReserve: 42, interval: 0.8, dmg: 15, pellets: 9, spreadAim: 0.045, spreadHip: 0.08, bloom: 0, reload: 2.1, range: 45, falloff: [7, 26], sound: 'scatter', recoil: 0.055, pickup: 6 },
]
const MAX_GRENADES = 4
const RADIUS = 0.4

const _m = new THREE.Vector3()
const _d = new THREE.Vector3()
const _t = new THREE.Vector3()

export class Player {
  constructor(game) {
    this.game = game
    this.model = makePlayer()
    game.scene.add(this.model.root)
    this.pos = new THREE.Vector3()
    this.vel = new THREE.Vector3()
    this.maxHp = 100
    this.stats = { shots: 0, hits: 0, kills: 0, deaths: 0 }
    this.ammo = WEAPONS.map((w) => ({ mag: w.mag, reserve: w.reserve }))
    this.grenades = 3
    this.reset({ x: 0, z: 8, yaw: 0 })
  }

  reset(cp) {
    this.pos.set(cp.x, 0, cp.z)
    this.vel.set(0, 0, 0)
    this.yaw = cp.yaw
    this.hp = this.maxHp
    this.dead = false
    this.state = 'normal'
    this.cover = null
    this.coverT = 0
    this.lean = 0
    this.leanSide = 0
    this.crouch = 0
    this.aiming = false
    this.aimAmt = 0
    this.sprinting = false
    this.rollT = -1
    this.vaultT = -1
    this.meleeT = -1
    this.fireCd = 0
    this.reloadT = 0
    this.grenadeCd = 0
    this.iframes = 1
    this.sinceHit = 99
    this.bloom = 0
    this.faceT = 0
    this.exitT = 0
    this.edgeT = 0
    this.stepDist = 0
    this.speed = 0
    this.hitHeight = 1.75
    this.wi = this.wi || 0
    this.model.setWeapon(this.wi)
    // Munición mínima al reaparecer.
    WEAPONS.forEach((w, i) => {
      const a = this.ammo[i]
      a.mag = w.mag
      a.reserve = Math.max(a.reserve, Math.round(w.reserve * 0.6))
    })
    this.grenades = Math.max(this.grenades, 2)
  }

  get inCover() { return this.state === 'cover' }

  getMuzzle(out) {
    const f = this.yaw
    const fx = -Math.sin(f), fz = -Math.cos(f)
    const rx = Math.cos(f), rz = -Math.sin(f)
    const low = this.inCover && this.cover.low
    const y = low && !this.aiming ? 1.32 : 1.42
    return out.set(this.pos.x + fx * 0.6 + rx * 0.2, y, this.pos.z + fz * 0.6 + rz * 0.2)
  }

  damage(amount, sx, sz) {
    const g = this.game
    if (this.dead || this.iframes > 0 || g.state !== 'playing') return
    this.hp -= amount
    this.sinceHit = 0
    const rel = angleDiff(g.camYaw, yawTo(sx - this.pos.x, sz - this.pos.z))
    g.hud.damageFrom(rel)
    g.audio.play('hurt', clamp(amount / 20, 0.5, 1.2))
    g.fx.shake(clamp(amount / 60, 0.12, 0.5))
    if (this.hp <= 0) {
      this.hp = 0
      this.dead = true
      this.stats.deaths++
      this.state = 'normal'
      this.cover = null
      g.onPlayerDeath()
    }
  }

  addAmmo(scale = 1) {
    let got = false
    WEAPONS.forEach((w, i) => {
      const a = this.ammo[i]
      const n = Math.min(Math.round(w.pickup * scale), w.maxReserve - a.reserve)
      if (n > 0) { a.reserve += n; got = true }
    })
    return got
  }

  refill() {
    WEAPONS.forEach((w, i) => { this.ammo[i].reserve = w.maxReserve })
    this.grenades = MAX_GRENADES
  }

  enterCover(c) {
    this.state = 'cover'
    this.cover = c
    this.coverT = clamp(c.alongX ? this.pos.x : this.pos.z, c.lo, c.hi)
    this.lean = 0
    this.exitT = 0
    this.edgeT = 0
    this.vel.set(0, 0, 0)
    this.sprinting = false
    this.game.audio.play('cover')
    this.game.fx.puff(this.pos.x, 0.3, this.pos.z, 3, 0.5, 0.6, 0.3)
    this.game.fx.shake(0.08)
  }

  exitCover() {
    this.state = 'normal'
    this.cover = null
    this.lean = 0
  }

  switchWeapon(i) {
    if (i === this.wi || this.rollT >= 0) return
    this.wi = i
    this.reloadT = 0
    this.fireCd = Math.max(this.fireCd, 0.3)
    this.model.setWeapon(i)
    this.game.audio.play('reloadEnd', 0.7)
  }

  startReload() {
    const w = WEAPONS[this.wi]
    const a = this.ammo[this.wi]
    if (this.reloadT > 0 || a.mag >= w.mag || a.reserve <= 0) return
    this.reloadT = w.reload
    this.game.audio.play('reload')
  }

  fire() {
    const g = this.game
    const w = WEAPONS[this.wi]
    const a = this.ammo[this.wi]
    a.mag--
    this.fireCd = w.interval
    this.faceT = 0.55
    this.yaw = g.camYaw
    this.stats.shots++
    const blind = this.inCover && !this.aiming
    const muzzle = this.getMuzzle(_m)
    _d.copy(g.aimPoint).sub(muzzle)
    if (_d.length() < 0.4 || _d.dot(g.lookDir) < 0) _d.copy(g.lookDir)
    _d.normalize()
    // Ayuda a quemarropa: si hay una máquina pegada delante, el disparo va hacia ella.
    const close = g.enemies.closest(muzzle, g.lookDir, 3.2)
    if (close) _d.set(close.x - muzzle.x, close.y - muzzle.y, close.z - muzzle.z).normalize()
    const spread = (this.aiming ? w.spreadAim : w.spreadHip) * (blind ? 2 : 1) * (this.speed > 5 ? 1.5 : 1) + this.bloom
    let hitAny = false
    for (let i = 0; i < w.pellets; i++) {
      _t.set(_d.x + rand(-spread, spread), _d.y + rand(-spread, spread), _d.z + rand(-spread, spread)).normalize()
      const h = g.shoot(muzzle, _t, w.range)
      if (i % 2 === 0 || w.pellets === 1) g.fx.tracer(muzzle, h.point)
      if (h.enemy) {
        const fall = 1 - 0.55 * clamp((h.t - w.falloff[0]) / (w.falloff[1] - w.falloff[0]), 0, 1)
        h.enemy.damage(w.dmg * fall * h.part.mult, h.point, _t, h.part)
        hitAny = true
      } else if (h.hit) {
        g.fx.impact(h.point, h.normal, 'concrete')
      }
    }
    if (hitAny) this.stats.hits++
    this.bloom = Math.min(0.03, this.bloom + w.bloom)
    g.recoil(w.recoil * (this.aiming ? 0.75 : 1))
    g.fx.muzzleFlash(muzzle, _d, w.pellets > 1)
    g.audio.play(w.sound)
    g.fx.shake(w.pellets > 1 ? 0.22 : 0.035)
    this.model.kick()
  }

  update(dt) {
    const g = this.game
    const inp = g.input
    const lvl = g.level
    const M = this.model

    if (this.dead) {
      M.root.position.copy(this.pos)
      M.update(dt, { speed: 0, crouch: 0, aim: 0, pitch: 0, roll: -1, vault: -1, melee: -1, dead: true, sprint: false })
      return
    }

    this.fireCd -= dt
    this.grenadeCd -= dt
    this.iframes -= dt
    this.faceT -= dt
    this.sinceHit += dt
    this.bloom = Math.max(0, this.bloom - dt * 0.05)
    if (this.sinceHit > 4.2 && this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + 24 * dt)

    const camYaw = g.camYaw
    const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw)
    const rx = Math.cos(camYaw), rz = -Math.sin(camYaw)
    const ix = (inp.down('KeyD') ? 1 : 0) - (inp.down('KeyA') ? 1 : 0)
    const iz = (inp.down('KeyW') ? 1 : 0) - (inp.down('KeyS') ? 1 : 0)
    let mx = fx * iz + rx * ix
    let mz = fz * iz + rz * ix
    const ml = Math.hypot(mx, mz)
    if (ml > 0) { mx /= ml; mz /= ml }
    const moving = ml > 0
    const busy = this.rollT >= 0 || this.vaultT >= 0
    let wantAim = inp.mouse(2) && !busy && this.meleeT < 0
    let prompt = null
    let space = inp.pressed('Space')

    // Cambios de arma, recarga, granada, golpe.
    if (inp.pressed('Digit1')) this.switchWeapon(0)
    if (inp.pressed('Digit2')) this.switchWeapon(1)
    if (inp.pressed('KeyQ') || inp.wheel !== 0) this.switchWeapon(1 - this.wi)
    if (inp.pressed('KeyR')) this.startReload()
    if (this.reloadT > 0) {
      this.reloadT -= dt
      if (this.reloadT <= 0) {
        const w = WEAPONS[this.wi]
        const a = this.ammo[this.wi]
        const n = Math.min(w.mag - a.mag, a.reserve)
        a.mag += n
        a.reserve -= n
        g.audio.play('reloadEnd')
      }
    }
    if (inp.pressed('KeyG') && this.grenades > 0 && this.grenadeCd <= 0 && !busy) {
      this.grenades--
      this.grenadeCd = 0.9
      this.faceT = 0.5
      this.yaw = camYaw
      _m.set(this.pos.x + rx * 0.3, 1.55 - this.crouch * 0.2, this.pos.z + rz * 0.3)
      _t.copy(g.lookDir).multiplyScalar(17)
      _t.y += 4.5
      g.enemies.throwGrenade(_m, _t)
      g.audio.play('throw')
    }
    if ((inp.pressed('KeyF') || inp.pressed('KeyV')) && this.meleeT < 0 && !busy) {
      this.meleeT = 0
      this.meleeHit = false
      this.yaw = camYaw
      this.faceT = 0.5
      if (this.inCover) this.exitCover()
    }
    if (this.meleeT >= 0) {
      this.meleeT += dt / 0.42
      if (!this.meleeHit && this.meleeT > 0.35) {
        this.meleeHit = true
        g.audio.play('melee')
        if (g.enemies.melee(this.pos, this.yaw, 2.2, 85)) g.fx.shake(0.3)
      }
      if (this.meleeT >= 1) this.meleeT = -1
    }

    // ----- Estados de movimiento -----
    if (this.rollT >= 0) {
      this.rollT += dt / 0.58
      const sp = lerp(9.6, 4.2, this.rollT)
      this.pos.x += this.rollDx * sp * dt
      this.pos.z += this.rollDz * sp * dt
      this.speed = sp
      this.yaw = yawTo(this.rollDx, this.rollDz)
      this.collide()
      if (this.rollT >= 1) this.rollT = -1
    } else if (this.vaultT >= 0) {
      this.vaultT += dt / 0.5
      const k = smooth(clamp(this.vaultT, 0, 1))
      this.pos.x = lerp(this.vaultFrom.x, this.vaultTo.x, k)
      this.pos.z = lerp(this.vaultFrom.z, this.vaultTo.z, k)
      this.speed = 4
      if (this.vaultT >= 1) { this.vaultT = -1; this.collide() }
    } else if (this.state === 'cover') {
      const c = this.cover
      const tx = c.alongX ? 1 : 0
      const tz = c.alongX ? 0 : 1
      const along = mx * tx + mz * tz
      const away = mx * c.nx + mz * c.nz
      const prevT = this.coverT
      if (Math.abs(along) > 0.3) this.coverT = clamp(this.coverT + Math.sign(along) * (wantAim ? 1.5 : 3.3) * dt, c.lo, c.hi)
      this.speed = Math.abs(this.coverT - prevT) / Math.max(dt, 1e-4)
      const atLo = this.coverT - c.lo < 0.15
      const atHi = c.hi - this.coverT < 0.15
      let leanTarget = 0
      if (wantAim && !c.low) {
        if (atLo && atHi) leanTarget = rx * tx + rz * tz >= 0 ? 1 : -1
        else if (atHi) leanTarget = 1
        else if (atLo) leanTarget = -1
        else { this.exitCover(); }
      }
      if (this.state === 'cover') {
        if (leanTarget !== 0) this.leanSide = leanTarget
        else if (!c.low) this.leanSide = atHi && !atLo ? 1 : atLo && !atHi ? -1 : this.leanSide || 1
        this.lean = damp(this.lean, leanTarget, 13, dt)
        const tpos = this.coverT + this.lean * 0.88
        const off = 0.48
        if (c.alongX) this.pos.set(tpos, 0, c.fixed + c.nz * off)
        else this.pos.set(c.fixed + c.nx * off, 0, tpos)

        const vaultable = c.low && c.thick <= 1.9
        if (away > 0.6) { this.exitT += dt; if (this.exitT > 0.16) this.exitCover() } else this.exitT = 0
        // Empujar más allá del borde durante un instante permite doblar la esquina.
        if ((atHi && along > 0.5) || (atLo && along < -0.5)) {
          this.edgeT += dt
          if (this.edgeT > 0.4 && !wantAim && this.state === 'cover') this.exitCover()
        } else this.edgeT = 0
        if (this.state === 'cover') {
          prompt = vaultable && away < -0.4 ? '<kbd>ESPACIO</kbd> Saltar la cobertura' : null
          if (space) {
            space = false
            if (vaultable && away < -0.4) this.tryVault(c)
            else this.exitCover()
          }
        }
      }
    }

    if (this.state === 'normal' && this.rollT < 0 && this.vaultT < 0) {
      this.sprinting = inp.down('ShiftLeft') && iz > 0 && !wantAim && this.faceT <= 0.2 && this.meleeT < 0
      const sp = wantAim ? 2.5 : this.sprinting ? 7.4 : 4.7
      this.vel.x = damp(this.vel.x, mx * sp, 14, dt)
      this.vel.z = damp(this.vel.z, mz * sp, 14, dt)
      this.pos.x += this.vel.x * dt
      this.pos.z += this.vel.z * dt
      this.collide()
      this.speed = Math.hypot(this.vel.x, this.vel.z)
      const cand = lvl.findCover(this.pos.x, this.pos.z, 1.3)
      const awayFromCand = cand ? mx * cand.nx + mz * cand.nz : 0
      if (cand && !(moving && awayFromCand > 0.5)) prompt = '<kbd>ESPACIO</kbd> Cubrirse'
      if (space && this.meleeT < 0) {
        if (cand && !(moving && awayFromCand > 0.5)) this.enterCover(cand)
        else if (moving) {
          this.rollT = 0
          this.rollDx = mx
          this.rollDz = mz
          this.iframes = Math.max(this.iframes, 0.34)
          this.reloadT = this.reloadT > 0 ? this.reloadT : 0
          g.audio.play('roll')
          g.fx.puff(this.pos.x, 0.2, this.pos.z, 3, 0.5, 0.6, 0.25)
        }
      }
    } else if (this.state !== 'normal') {
      this.sprinting = false
      this.vel.set(0, 0, 0)
    }

    // ----- Postura, encare y disparo -----
    const nowBusy = this.rollT >= 0 || this.vaultT >= 0
    wantAim = wantAim && !nowBusy
    this.aiming = wantAim
    this.aimAmt = damp(this.aimAmt, wantAim ? 1 : 0, 14, dt)
    const lowCover = this.state === 'cover' && this.cover.low
    this.crouch = lowCover ? (wantAim ? 0 : this.faceT > 0 ? 0.55 : 1) : 0
    this.hitHeight = nowBusy ? 1.0 : lowCover ? (wantAim ? 1.75 : this.faceT > 0 ? 1.3 : 0.98) : 1.75

    if (!nowBusy) {
      if (wantAim || this.faceT > 0) this.yaw = dampAngle(this.yaw, camYaw, 22, dt)
      else if (this.state === 'cover') {
        const c = this.cover
        const target = c.low ? yawTo(-c.nx, -c.nz) : yawTo((c.alongX ? 1 : 0) * (this.leanSide || 1), (c.alongX ? 0 : 1) * (this.leanSide || 1))
        this.yaw = dampAngle(this.yaw, target, 12, dt)
      } else if (moving) this.yaw = dampAngle(this.yaw, yawTo(mx, mz), 12, dt)
    }

    const w = WEAPONS[this.wi]
    const a = this.ammo[this.wi]
    if (inp.mouse(0) && this.fireCd <= 0 && this.reloadT <= 0 && !nowBusy && this.meleeT < 0) {
      if (a.mag > 0) this.fire()
      else if (a.reserve > 0) this.startReload()
      else if (inp.mousePressed(0)) { g.audio.play('empty'); g.hud.hint('Sin munición: busca una caja de suministros', 3) }
    }
    if (a.mag === 0 && a.reserve > 0 && this.reloadT <= 0 && !inp.mouse(0)) this.startReload()

    // Interacción.
    let near = null
    for (const it of lvl.interactables) {
      if (!it.enabled || it.cooldown > 0) continue
      if (Math.hypot(it.x - this.pos.x, it.z - this.pos.z) < it.r) { near = it; break }
    }
    if (near) {
      prompt = `<kbd>E</kbd> ${near.label}`
      if (inp.pressed('KeyE')) g.director.interact(near)
    }
    g.hud.setPrompt(prompt)

    // Pasos.
    if (!nowBusy && this.speed > 1) {
      this.stepDist += this.speed * dt
      if (this.stepDist > (this.sprinting ? 2.6 : 2.1)) { this.stepDist = 0; g.audio.play('step', this.sprinting ? 1.3 : 0.8) }
    }

    M.root.position.copy(this.pos)
    M.root.rotation.y = this.yaw
    M.update(dt, {
      speed: this.speed,
      crouch: this.crouch,
      aim: wantAim || this.faceT > 0 ? 1 : 0,
      pitch: g.camPitch,
      roll: this.rollT,
      vault: this.vaultT,
      melee: this.meleeT,
      dead: false,
      sprint: this.sprinting && this.speed > 5,
    })
  }

  tryVault(c) {
    const lvl = this.game.level
    const dist = c.thick + 0.48 * 2 + 0.1
    const tx = this.pos.x - c.nx * dist
    const tz = this.pos.z - c.nz * dist
    if (lvl.inside(tx, tz, RADIUS - 0.05)) { this.exitCover(); return }
    this.vaultFrom = { x: this.pos.x, z: this.pos.z }
    this.vaultTo = { x: tx, z: tz }
    this.vaultT = 0
    this.yaw = yawTo(-c.nx, -c.nz)
    this.exitCover()
    this.game.audio.play('vault')
  }

  collide() {
    const cs = this.game.level.colliders
    for (let k = 0; k < 2; k++) {
      for (let i = 0; i < cs.length; i++) if (cs[i].walk) pushOut(this.pos, RADIUS, cs[i])
    }
    this.pos.x = clamp(this.pos.x, -21.6, 21.6)
    this.pos.z = clamp(this.pos.z, -149.6, 11.6)
  }
}
