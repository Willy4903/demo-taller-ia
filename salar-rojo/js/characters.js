// Modelos de personajes construidos con primitivas y animados por código.
import * as THREE from '../vendor/three.module.min.js'
import { clamp, damp, lerp } from './util.js'

const std = (o) => new THREE.MeshStandardMaterial(o)
const geoCache = new Map()
const geo = (key, make) => {
  let g = geoCache.get(key)
  if (!g) { g = make(); geoCache.set(key, g) }
  return g
}
const bx = (w, h, d) => geo(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d))
const cyl = (r1, r2, h, s = 12) => geo(`c${r1},${r2},${h},${s}`, () => new THREE.CylinderGeometry(r1, r2, h, s))
const cap = (r, l) => geo(`k${r},${l}`, () => new THREE.CapsuleGeometry(r, l, 4, 10))
const sph = (r, s = 14) => geo(`s${r},${s}`, () => new THREE.SphereGeometry(r, s, Math.max(8, s - 4)))
const tor = (r, t) => geo(`t${r},${t}`, () => new THREE.TorusGeometry(r, t, 8, 20))

function mesh(g, mat, parent, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(g, mat)
  o.position.set(x, y, z)
  o.castShadow = true
  parent.add(o)
  return o
}
function group(parent, x = 0, y = 0, z = 0) {
  const g = new THREE.Group()
  g.position.set(x, y, z)
  parent.add(g)
  return g
}

const MAT = {}
function mats() {
  if (MAT.suit) return MAT
  Object.assign(MAT, {
    suit: std({ color: 0xe5622a, roughness: 0.8 }),
    suitDark: std({ color: 0x8f3a1c, roughness: 0.85 }),
    white: std({ color: 0xe8e2d6, roughness: 0.55 }),
    dark: std({ color: 0x1f2328, roughness: 0.7, metalness: 0.3 }),
    visor: std({ color: 0x061d20, emissive: 0x2fe0d0, emissiveIntensity: 1.5, roughness: 0.15, metalness: 0.6 }),
    teal: std({ color: 0x0c2a2c, emissive: 0x39e6d2, emissiveIntensity: 2.4 }),
    gun: std({ color: 0x30363c, roughness: 0.45, metalness: 0.75 }),
    gunLight: std({ color: 0xb9bfc4, roughness: 0.4, metalness: 0.7 }),
    botYellow: std({ color: 0xc9981c, roughness: 0.6, metalness: 0.35 }),
    botDark: std({ color: 0x24282d, roughness: 0.55, metalness: 0.65 }),
    botSteel: std({ color: 0x7d858c, roughness: 0.4, metalness: 0.8 }),
    botRed: std({ color: 0x8c2a1c, roughness: 0.6, metalness: 0.4 }),
    eye: std({ color: 0x2a0503, emissive: 0xff1c08, emissiveIntensity: 1.5 }),
    amber: std({ color: 0x33200c, emissive: 0xff8a10, emissiveIntensity: 1.4 }),
    rotor: std({ color: 0x9aa4aa, transparent: true, opacity: 0.35, roughness: 0.3 }),
    core: std({ color: 0x0a2c2e, emissive: 0x3ff5e0, emissiveIntensity: 3.2 }),
  })
  return MAT
}

// ---------- Protagonista: técnica de mantenimiento con traje de altura ----------

export function makePlayer() {
  const M = mats()
  const root = new THREE.Group()
  const body = group(root)
  const hips = group(body, 0, 0.88, 0)
  mesh(bx(0.34, 0.2, 0.22), M.dark, hips, 0, 0.05, 0)
  mesh(bx(0.38, 0.07, 0.25), M.white, hips, 0, 0.16, 0)

  const mkLeg = (sx) => {
    const hip = group(hips, sx * 0.11, 0, 0)
    mesh(cap(0.085, 0.24), M.suit, hip, 0, -0.2, 0)
    mesh(bx(0.1, 0.12, 0.06), M.dark, hip, sx * 0.07, -0.18, 0)
    const knee = group(hip, 0, -0.41, 0)
    mesh(sph(0.085), M.white, knee, 0, 0, -0.03)
    mesh(cap(0.068, 0.24), M.suitDark, knee, 0, -0.2, 0)
    mesh(bx(0.13, 0.11, 0.28), M.dark, knee, 0, -0.41, -0.05)
    return { hip, knee }
  }
  const legL = mkLeg(-1)
  const legR = mkLeg(1)

  const torso = group(body, 0, 1.0, 0)
  mesh(bx(0.44, 0.46, 0.25), M.suit, torso, 0, 0.25, 0)
  mesh(bx(0.46, 0.1, 0.27), M.white, torso, 0, 0.44, 0)
  mesh(bx(0.2, 0.14, 0.03), M.dark, torso, 0, 0.3, -0.135)
  mesh(bx(0.05, 0.05, 0.02), M.teal, torso, 0.06, 0.3, -0.155)
  // Mochila con depósito de oxígeno.
  mesh(bx(0.34, 0.42, 0.16), M.white, torso, 0, 0.27, 0.2)
  mesh(cyl(0.06, 0.06, 0.36, 10), M.dark, torso, -0.09, 0.27, 0.3)
  mesh(cyl(0.06, 0.06, 0.36, 10), M.dark, torso, 0.09, 0.27, 0.3)
  mesh(bx(0.2, 0.03, 0.02), M.teal, torso, 0, 0.45, 0.285)

  const head = group(torso, 0, 0.5, 0)
  mesh(cyl(0.07, 0.09, 0.08, 10), M.dark, head, 0, 0.03, 0)
  mesh(sph(0.155, 18), M.white, head, 0, 0.17, 0)
  const visor = mesh(sph(0.125, 16), M.visor, head, 0, 0.165, -0.055)
  visor.scale.set(1.05, 0.72, 1)
  mesh(bx(0.33, 0.05, 0.1), M.suit, head, 0, 0.19, 0.03)
  mesh(cyl(0.012, 0.012, 0.16, 6), M.dark, head, 0.13, 0.33, 0.03)

  const mkArm = (sx) => {
    const sh = group(torso, sx * 0.285, 0.42, 0)
    mesh(sph(0.095), M.white, sh, 0, 0, 0)
    mesh(cap(0.062, 0.18), M.suit, sh, 0, -0.15, 0)
    const el = group(sh, 0, -0.3, 0)
    mesh(cap(0.054, 0.18), M.suitDark, el, 0, -0.13, 0)
    mesh(sph(0.062), M.dark, el, 0, -0.28, 0)
    return { sh, el }
  }
  const armL = mkArm(-1)
  const armR = mkArm(1)

  // Armas: carabina de remaches y dispersor de arco.
  const gun = group(torso, 0.2, 0.2, -0.3)
  const gunA = group(gun)
  mesh(bx(0.07, 0.13, 0.52), M.gun, gunA, 0, 0, 0)
  mesh(cyl(0.022, 0.022, 0.36, 8).clone().rotateX(Math.PI / 2), M.gunLight, gunA, 0, 0.02, -0.42)
  mesh(cyl(0.075, 0.075, 0.07, 14).clone().rotateZ(Math.PI / 2), M.gunLight, gunA, 0, -0.1, -0.04)
  mesh(bx(0.05, 0.12, 0.2), M.gun, gunA, 0, -0.02, 0.33)
  mesh(bx(0.02, 0.02, 0.3), M.teal, gunA, 0, 0.075, -0.05)
  mesh(bx(0.045, 0.12, 0.06), M.gun, gunA, 0, -0.11, 0.12)
  const gunB = group(gun)
  mesh(bx(0.1, 0.12, 0.42), M.gun, gunB, 0, 0, 0.02)
  mesh(cyl(0.05, 0.065, 0.34, 10).clone().rotateX(Math.PI / 2), M.gunLight, gunB, 0, 0.01, -0.34)
  mesh(tor(0.07, 0.014).clone(), M.teal, gunB, 0, 0.01, -0.5)
  mesh(bx(0.06, 0.12, 0.2), M.gun, gunB, 0, -0.03, 0.3)
  mesh(bx(0.045, 0.12, 0.06), M.gun, gunB, 0, -0.11, 0.14)
  gunB.visible = false

  root.traverse((o) => { if (o.isMesh) o.receiveShadow = false })

  let phase = 0
  let crouch = 0
  let aimK = 0
  let deadK = 0
  let kick = 0

  return {
    root,
    gun,
    setWeapon(i) { gunA.visible = i === 0; gunB.visible = i === 1 },
    kick() { kick = 1 },
    // s: { speed, crouch, aim, pitch, roll(0..1 o -1), vault(0..1 o -1), dead, melee(0..1 o -1), cover, sprint }
    update(dt, s) {
      const mv = clamp(s.speed / 4.6, 0, 1.5)
      phase += dt * (3 + s.speed * 1.75)
      crouch = damp(crouch, s.crouch, 12, dt)
      aimK = damp(aimK, s.aim, 14, dt)
      deadK = damp(deadK, s.dead ? 1 : 0, 6, dt)
      kick = Math.max(0, kick - dt * 12)
      const c = crouch
      const sw = Math.sin(phase)
      const cw = Math.cos(phase)
      const amp = 0.75 * Math.min(mv, 1.25) * (1 - c * 0.45)

      legL.hip.rotation.x = sw * amp + c * 1.3
      legL.knee.rotation.x = -Math.max(0, cw) * 1.1 * mv - c * 2.15 - 0.06
      legR.hip.rotation.x = -sw * amp + c * 0.45
      legR.knee.rotation.x = -Math.max(0, -cw) * 1.1 * mv - c * 1.85 - 0.06

      const bob = Math.abs(sw) * 0.05 * mv
      body.position.y = -c * 0.42 + bob - deadK * 0.78
      body.rotation.set(deadK * 1.45, 0, 0)

      let tx = -0.08 - (s.sprint ? 0.32 : 0) - c * 0.28 * (1 - aimK)
      tx = lerp(tx, s.pitch * 0.75, aimK)
      torso.rotation.x = tx
      torso.rotation.y = 0
      head.rotation.x = lerp(0.05 + c * 0.2, s.pitch * 0.2, aimK)

      // Brazos: arma en guardia baja o encarada al apuntar.
      const ready = lerp(0.35, 1.0, aimK)
      armR.sh.rotation.set(0.25 + ready * 0.25, 0, -0.1)
      armR.el.rotation.x = 1.15 + ready * 0.2
      armL.sh.rotation.set(0.75 + ready * 0.3, 0, 0.72)
      armL.el.rotation.x = 0.55
      gun.position.set(0.2, lerp(0.14, 0.3, aimK), lerp(-0.3, -0.36, aimK) + kick * 0.05)
      gun.rotation.set(lerp(-0.35, 0, aimK) + kick * 0.05, 0, 0)

      if (s.sprint && aimK < 0.3) {
        armR.sh.rotation.x += -sw * 0.35
        armL.sh.rotation.x += sw * 0.25
      }

      if (s.melee >= 0) {
        const k = Math.sin(Math.PI * s.melee)
        gun.position.z -= k * 0.4
        gun.rotation.x = -0.9 * k
        torso.rotation.y = -0.55 * k
        torso.rotation.x -= 0.25 * k
      }
      if (s.roll >= 0) {
        const k = s.roll
        body.rotation.x = -k * Math.PI * 2
        const tuck = Math.sin(Math.PI * k)
        body.position.y = -0.5 * tuck + 0.02
        legL.hip.rotation.x = legR.hip.rotation.x = 1.5 * tuck
        legL.knee.rotation.x = legR.knee.rotation.x = -2.0 * tuck
        torso.rotation.x = -0.7 * tuck
        // El giro es alrededor del centro del cuerpo, no de los pies.
        body.position.y += 0.9 * (1 - Math.cos(k * Math.PI * 2)) * 0.5 * tuck
      }
      if (s.vault >= 0) {
        const k = Math.sin(Math.PI * s.vault)
        body.position.y = 0.75 * k
        legL.hip.rotation.x = 1.3 * k
        legL.knee.rotation.x = -1.5 * k
        legR.hip.rotation.x = 0.9 * k
        legR.knee.rotation.x = -1.7 * k
        torso.rotation.x = -0.5 * k
      }
    },
  }
}

// ---------- Peón: máquina bípeda de mantenimiento con remachadora ----------

export function makeGrunt() {
  const M = mats()
  const eye = M.eye.clone()
  const root = new THREE.Group()
  const body = group(root)
  const hips = group(body, 0, 1.1, 0)
  mesh(cyl(0.2, 0.16, 0.22, 10), M.botDark, hips, 0, 0, 0)

  const mkLeg = (sx) => {
    const hip = group(hips, sx * 0.22, -0.02, 0)
    mesh(sph(0.1), M.botSteel, hip)
    mesh(bx(0.11, 0.45, 0.14), M.botYellow, hip, 0, -0.22, 0)
    const knee = group(hip, 0, -0.45, 0)
    mesh(cyl(0.07, 0.07, 0.16, 10).clone().rotateZ(Math.PI / 2), M.botSteel, knee)
    mesh(bx(0.08, 0.5, 0.1), M.botDark, knee, 0, -0.25, 0)
    const ankle = group(knee, 0, -0.5, 0)
    mesh(bx(0.07, 0.3, 0.09), M.botSteel, ankle, 0, -0.14, 0)
    mesh(bx(0.15, 0.06, 0.3), M.botDark, ankle, 0, -0.29, -0.06)
    return { hip, knee, ankle }
  }
  const legL = mkLeg(-1)
  const legR = mkLeg(1)

  const torso = group(body, 0, 1.2, 0)
  mesh(cyl(0.09, 0.12, 0.2, 8), M.botSteel, torso, 0, 0.06, 0)
  mesh(bx(0.72, 0.44, 0.42), M.botYellow, torso, 0, 0.38, 0)
  mesh(bx(0.74, 0.1, 0.44), M.botDark, torso, 0, 0.2, 0)
  mesh(bx(0.3, 0.2, 0.05), M.botDark, torso, 0, 0.4, -0.215)
  mesh(bx(0.5, 0.3, 0.12), M.botDark, torso, 0, 0.4, 0.26)
  const head = group(torso, 0, 0.7, -0.06)
  mesh(cyl(0.13, 0.13, 0.36, 12).clone().rotateZ(Math.PI / 2), M.botDark, head)
  mesh(sph(0.075, 12), eye, head, 0, 0, -0.11)
  mesh(cyl(0.01, 0.01, 0.3, 5), M.botSteel, head, -0.13, 0.22, 0.02)

  const mkArm = (sx, gunArm) => {
    const sh = group(torso, sx * 0.47, 0.5, 0)
    mesh(cyl(0.13, 0.13, 0.2, 12).clone().rotateZ(Math.PI / 2), M.botDark, sh)
    mesh(bx(0.09, 0.36, 0.1), M.botSteel, sh, 0, -0.2, 0)
    const el = group(sh, 0, -0.4, 0)
    if (gunArm) {
      mesh(bx(0.13, 0.15, 0.62), M.botDark, el, 0, -0.04, -0.24)
      mesh(cyl(0.035, 0.035, 0.3, 8).clone().rotateX(Math.PI / 2), M.botSteel, el, 0, -0.04, -0.66)
      mesh(bx(0.05, 0.05, 0.06), eye, el, 0, 0.05, -0.5)
    } else {
      mesh(bx(0.08, 0.34, 0.09), M.botYellow, el, 0, -0.17, 0)
      mesh(bx(0.16, 0.1, 0.05), M.botDark, el, 0, -0.38, -0.04)
    }
    return { sh, el }
  }
  const armL = mkArm(-1, false)
  const armR = mkArm(1, true)

  let phase = Math.random() * 6
  let crouch = 0
  let deadK = 0
  let aimK = 0

  return {
    root,
    eye,
    update(dt, s) {
      const mv = clamp(s.speed / 3.2, 0, 1.3)
      phase += dt * (2.5 + s.speed * 2.2)
      crouch = damp(crouch, s.crouch, 9, dt)
      aimK = damp(aimK, s.aim, 10, dt)
      deadK = damp(deadK, s.dead ? 1 : 0, 5, dt)
      const c = crouch
      const sw = Math.sin(phase) * 0.6 * mv
      const cw = Math.cos(phase)
      legL.hip.rotation.x = 0.5 + sw + c * 0.85
      legL.knee.rotation.x = -1.1 - Math.max(0, cw) * 0.6 * mv - c * 1.25
      legL.ankle.rotation.x = 0.6 + c * 0.4
      legR.hip.rotation.x = 0.5 - sw + c * 0.85
      legR.knee.rotation.x = -1.1 - Math.max(0, -cw) * 0.6 * mv - c * 1.25
      legR.ankle.rotation.x = 0.6 + c * 0.4
      body.position.y = -c * 0.62 + Math.abs(Math.sin(phase)) * 0.04 * mv - deadK * 0.95
      body.rotation.x = deadK * 1.35 + (s.flinch || 0) * 0.3
      body.rotation.z = deadK * 0.25
      torso.rotation.x = -0.12 - c * 0.55 + aimK * (s.pitch || 0) * 0.5
      head.rotation.x = c * 0.35
      armR.sh.rotation.x = lerp(0.25, 1.35, aimK)
      armR.el.rotation.x = lerp(0.5, 0.15, aimK)
      armL.sh.rotation.x = 0.3 - sw * 0.5
      armL.el.rotation.x = 0.7
      if (s.dead) eye.emissiveIntensity = Math.max(0, eye.emissiveIntensity - dt * 6)
    },
  }
}

// ---------- Rodador: esfera de carga que embiste y descarga ----------

export function makeRoller() {
  const M = mats()
  const band = M.amber.clone()
  const root = new THREE.Group()
  const ball = group(root, 0, 0.44, 0)
  mesh(sph(0.42, 16), M.botDark, ball)
  mesh(tor(0.43, 0.04).clone().rotateY(Math.PI / 2), band, ball)
  mesh(cyl(0.16, 0.16, 0.9, 10).clone().rotateZ(Math.PI / 2), M.botSteel, ball)
  mesh(bx(0.06, 0.2, 0.06), M.botRed, ball, 0, 0.44, 0)
  mesh(bx(0.06, 0.2, 0.06), M.botRed, ball, 0, -0.44, 0)
  return {
    root,
    eye: band,
    update(dt, s) {
      ball.rotation.x -= s.speed * dt * 2.3
      band.emissiveIntensity = s.dead ? 0 : 1.3 + (s.charge || 0) * 5 + Math.sin(performance.now() * 0.02) * 0.3
      if (s.dead) ball.position.y = Math.max(0.42, ball.position.y - dt)
    },
  }
}

// ---------- Avispa: dron de inspección con remachadora ligera ----------

export function makeDrone() {
  const M = mats()
  const eye = M.eye.clone()
  const root = new THREE.Group()
  const body = group(root)
  const hull = mesh(sph(0.4, 16), M.botYellow, body)
  hull.scale.set(1, 0.42, 1.15)
  mesh(bx(0.3, 0.1, 0.5), M.botDark, body, 0, 0.14, 0)
  mesh(sph(0.09, 10), eye, body, 0, -0.02, -0.42)
  mesh(cyl(0.035, 0.035, 0.4, 8).clone().rotateX(Math.PI / 2), M.botSteel, body, 0, -0.2, -0.25)
  mesh(bx(0.1, 0.12, 0.26), M.botDark, body, 0, -0.18, -0.05)
  const rotors = []
  for (const [rx, rz] of [[-0.55, -0.4], [0.55, -0.4], [-0.55, 0.45], [0.55, 0.45]]) {
    mesh(bx(0.05, 0.04, 0.05), M.botDark, body, rx * 0.6, 0.06, rz * 0.6).scale.set(6, 1, 6)
    mesh(tor(0.24, 0.02).clone().rotateX(Math.PI / 2), M.botDark, body, rx, 0.1, rz)
    const r = mesh(cyl(0.22, 0.22, 0.015, 12), M.rotor, body, rx, 0.1, rz)
    r.castShadow = false
    rotors.push(r)
  }
  return {
    root,
    eye,
    update(dt, s) {
      for (const r of rotors) r.rotation.y += dt * 40
      body.rotation.z = damp(body.rotation.z, (s.bank || 0) * 0.5, 5, dt)
      body.rotation.x = damp(body.rotation.x, s.dead ? 0.9 : 0.12, 5, dt)
      if (s.dead) eye.emissiveIntensity = 0
    },
  }
}

// ---------- Capataz: grúa pórtico armada, jefe del nivel ----------

export function makeBoss() {
  const M = mats()
  const eye = M.eye.clone()
  const core = M.core.clone()
  const root = new THREE.Group()
  // Pórtico.
  for (const sx of [-1, 1]) {
    mesh(bx(0.9, 8.4, 1.8), M.botYellow, root, sx * 6.2, 4.4, 0)
    mesh(bx(1.5, 0.6, 3.6), M.botDark, root, sx * 6.2, 0.55, 0)
    mesh(bx(0.92, 1.2, 1.82), M.botDark, root, sx * 6.2, 3, 0)
    for (const wz of [-1.3, 1.3]) mesh(cyl(0.34, 0.34, 0.3, 12).clone().rotateZ(Math.PI / 2), M.botSteel, root, sx * 6.2, 0.56, wz)
    mesh(bx(0.3, 0.3, 0.3), M.amber, root, sx * 6.2, 8.75, 0)
  }
  mesh(bx(13.6, 1.1, 1.9), M.botYellow, root, 0, 8.4, 0)
  mesh(bx(13.7, 0.3, 1.95), M.botDark, root, 0, 7.8, 0)
  mesh(bx(2.6, 0.7, 2.2), M.botDark, root, 0, 7.45, 0)
  for (const cx of [-0.8, 0.8]) mesh(cyl(0.07, 0.07, 1.4, 6), M.botSteel, root, cx, 6.5, 0)

  // Torso colgante que gira hacia el objetivo. Su frente es -Z local.
  const torso = group(root, 0, 4.3, 0)
  mesh(bx(3.2, 3.0, 2.4), M.botYellow, torso)
  mesh(bx(3.3, 0.5, 2.5), M.botDark, torso, 0, -1.1, 0)
  mesh(bx(3.3, 0.35, 2.5), M.botDark, torso, 0, 1.25, 0)
  mesh(bx(2.2, 1.2, 0.6), M.botDark, torso, 0, 0.2, 1.3)
  mesh(cyl(0.5, 0.7, 0.9, 12), M.botDark, torso, 0, 1.9, 0)
  const head = group(torso, 0, 1.75, -0.9)
  mesh(bx(1.5, 0.6, 0.9), M.botDark, head)
  for (const ex of [-0.45, 0, 0.45]) mesh(sph(0.13, 10), eye, head, ex, 0, -0.46)
  // Núcleo y compuertas del pecho.
  mesh(bx(1.9, 1.5, 0.3), M.botDark, torso, 0, -0.15, -1.1)
  const coreMesh = mesh(sph(0.62, 18), core, torso, 0, -0.15, -1.05)
  const shutL = mesh(bx(0.98, 1.5, 0.16), M.botSteel, torso, -0.48, -0.15, -1.3)
  const shutR = mesh(bx(0.98, 1.5, 0.16), M.botSteel, torso, 0.48, -0.15, -1.3)
  // Brazo cañón (izquierda del jefe) y lanzador de mortero (derecha).
  const armL = group(torso, -2.05, 0.5, 0)
  mesh(sph(0.55, 14), M.botDark, armL)
  mesh(bx(0.7, 0.8, 1.6), M.botRed, armL, 0, -0.3, -0.5)
  mesh(cyl(0.2, 0.24, 2.6, 12).clone().rotateX(Math.PI / 2), M.botSteel, armL, 0, -0.3, -2.3)
  mesh(tor(0.26, 0.05), eye, armL, 0, -0.3, -3.5)
  const armR = group(torso, 2.05, 0.7, 0)
  mesh(sph(0.55, 14), M.botDark, armR)
  mesh(bx(1.1, 1.0, 1.2), M.botRed, armR, 0.1, 0.3, 0)
  for (const [mx, mz] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) {
    mesh(cyl(0.16, 0.16, 0.9, 10), M.botDark, armR, 0.1 + mx, 1.0, mz)
  }
  armR.rotation.x = 0.35

  let open = 0
  let deadK = 0
  return {
    root,
    torso,
    armL,
    eye,
    core,
    update(dt, s) {
      open = damp(open, s.vent ? 1 : 0, 6, dt)
      shutL.position.x = -0.48 - open * 0.95
      shutR.position.x = 0.48 + open * 0.95
      core.emissiveIntensity = s.dead ? 0.05 : 1.2 + open * 3.5 + Math.sin(performance.now() * 0.012) * 0.6 * open
      coreMesh.scale.setScalar(1 + open * 0.08 * Math.sin(performance.now() * 0.02))
      deadK = damp(deadK, s.dead ? 1 : 0, 1.6, dt)
      torso.position.y = 4.3 - deadK * 2.2
      torso.rotation.z = deadK * 0.35
      torso.rotation.x = deadK * 0.25
      armL.rotation.x = s.dead ? damp(armL.rotation.x, -1.1, 2, dt) : (s.pitch || 0)
      eye.emissiveIntensity = s.dead ? Math.max(0, eye.emissiveIntensity - dt * 2) : 1.5 + (s.alert || 0) * 3
    },
  }
}
