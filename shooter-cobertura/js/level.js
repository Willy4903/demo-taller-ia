// Nivel "Estación Salar Alto": geometría, colisiones, puntos de cobertura y navegación.
import * as THREE from '../vendor/three.module.min.js'
import { boxGeo, planeGeo } from './textures.js'
import { rayBox, hitN, clamp } from './util.js'

export const HALF_W = 22
export const Z_SOUTH = 12
export const Z_NORTH = -150
const NAV_W = HALF_W * 2
const NAV_H = Z_SOUTH - Z_NORTH

export const zoneOf = (z) => (z > -48 ? 'A' : z > -102 ? 'B' : 'C')

export class Level {
  constructor(scene, M) {
    this.scene = scene
    this.M = M
    this.colliders = []
    this.coverPoints = []
    this.doors = {}
    this.interactables = []
    this.blinkers = []
    this.time = 0
    this.blocked = new Uint8Array(NAV_W * NAV_H)
    this.gScore = new Float32Array(NAV_W * NAV_H)
    this.stamp = new Uint32Array(NAV_W * NAV_H)
    this.closed = new Uint32Array(NAV_W * NAV_H)
    this.parent = new Int32Array(NAV_W * NAV_H)
    this.searchId = 0
    this.spawns = {
      A: [[-19, -44], [19, -44], [-19.5, -27], [19.5, -31], [0, -45]],
      B: [[-19.5, -72], [19.5, -84], [-19.5, -97], [19.5, -58], [0, -99]],
      C: [[-19.5, -112], [19.5, -112], [-19.5, -129], [19.5, -129]],
    }
    this.build()
    this.buildCoverPoints()
    this.rebuildNav()
  }

  // ---------- Construcción ----------

  box(o) {
    const { x, z, w, d, h, mat, y0 = 0, cover = false, collide = true, visual = true, tile = 2.5, shadow = true } = o
    let mesh = null
    if (visual) {
      mesh = new THREE.Mesh(boxGeo(w, h, d, tile), mat)
      mesh.position.set(x, y0 + h / 2, z)
      mesh.castShadow = shadow
      mesh.receiveShadow = true
      this.scene.add(mesh)
    }
    let col = null
    if (collide) {
      col = { minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, y0, y1: y0 + h, cover: cover && y0 === 0, low: h < 1.5, walk: y0 < 1.6 }
      this.colliders.push(col)
    }
    return { mesh, col }
  }

  deco(geo, mat, x, y, z, shadow = true) {
    const m = new THREE.Mesh(geo, mat)
    m.position.set(x, y, z)
    m.castShadow = shadow
    m.receiveShadow = true
    this.scene.add(m)
    return m
  }

  barrier(x, z, alongX = true) {
    const M = this.M
    const w = alongX ? 3.2 : 0.8
    const d = alongX ? 0.8 : 3.2
    this.box({ x, z, w, d, h: 1.1, mat: M.concrete, cover: true, tile: 1.6 })
    this.box({ x, z, w: w + 0.02, d: d + 0.02, h: 0.22, y0: 0.72, mat: M.hazard, collide: false, tile: 0.8, shadow: false })
  }

  crate(x, z, h = 1.2, s = 1.5) {
    this.box({ x, z, w: s, d: s, h, mat: this.M.crate, cover: true, tile: s })
  }

  container(x, z, alongX, mat) {
    const w = alongX ? 6.2 : 2.6
    const d = alongX ? 2.6 : 6.2
    this.box({ x, z, w, d, h: 2.7, mat, cover: true, tile: 2.7 })
    this.box({ x, z, w: w + 0.06, d: d + 0.06, h: 0.12, y0: 2.7, mat: this.M.darkMetal, collide: false })
  }

  tank(x, z) {
    const M = this.M
    this.box({ x, z, w: 2.8, d: 2.8, h: 4.6, mat: M.tank, cover: true, visual: false })
    this.deco(new THREE.CylinderGeometry(1.55, 1.55, 4.2, 20), M.tank, x, 2.3, z)
    this.deco(new THREE.SphereGeometry(1.55, 20, 10, 0, 6.3, 0, 1.57), M.tank, x, 4.4, z)
    this.deco(new THREE.CylinderGeometry(1.7, 1.7, 0.25, 20), M.darkMetal, x, 0.125, z)
    this.deco(new THREE.TorusGeometry(1.57, 0.06, 6, 24), M.glowTeal, x, 3.2, z, false).rotation.x = Math.PI / 2
    this.deco(new THREE.CylinderGeometry(0.14, 0.14, 4.4, 8), M.steel, x + 1.1, 6.6, z)
  }

  lamp(x, z, h, color, intensity, mat) {
    const M = this.M
    this.deco(new THREE.CylinderGeometry(0.08, 0.12, h, 8), M.darkMetal, x, h / 2, z)
    this.deco(new THREE.BoxGeometry(0.9, 0.12, 0.35), mat, x, h, z, false)
    const l = new THREE.PointLight(color, intensity, 26, 1.5)
    l.position.set(x, h - 0.4, z)
    this.scene.add(l)
    return l
  }

  spawnDoor(x, z) {
    // Persiana de servicio por la que salen las máquinas.
    const M = this.M
    const side = Math.abs(x) > 15 ? Math.sign(x) : 0
    if (side !== 0) {
      const wx = side * (HALF_W - 0.02)
      this.deco(new THREE.BoxGeometry(0.12, 3, 2.6), M.black, wx, 1.5, z, false)
      this.deco(new THREE.BoxGeometry(0.3, 3.3, 0.25), M.hazard, wx, 1.65, z - 1.42)
      this.deco(new THREE.BoxGeometry(0.3, 3.3, 0.25), M.hazard, wx, 1.65, z + 1.42)
      this.deco(new THREE.BoxGeometry(0.3, 0.3, 3.1), M.hazard, wx, 3.2, z)
      const b = this.deco(new THREE.BoxGeometry(0.2, 0.16, 0.5), M.glowRed.clone(), wx - side * 0.1, 3.55, z, false)
      this.blinkers.push({ mat: b.material, speed: 3 + Math.random(), base: 2.4 })
    }
  }

  build() {
    const M = this.M
    const S = this.scene

    // Suelos.
    const floor = (zc, depth, mat, tile) => {
      const m = new THREE.Mesh(planeGeo(NAV_W + 2, depth, tile), mat)
      m.position.set(0, 0, zc)
      m.receiveShadow = true
      S.add(m)
    }
    floor(-18, 60, M.asphalt, 7)
    floor(-75, 54, M.plate, 5)
    floor(-126.5, 49, M.platform, 6)
    const salt = new THREE.Mesh(planeGeo(1400, 1400, 28), M.salt)
    salt.position.set(0, -0.06, -70)
    salt.receiveShadow = false
    S.add(salt)

    // Marcas pintadas en el patio y la plataforma.
    const line = (x, z, w, d) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), M.paint)
      m.position.set(x, 0.012, z)
      m.receiveShadow = true
      S.add(m)
    }
    for (let z = 6; z > -44; z -= 6) line(0, z, 0.18, 2.6)
    line(-8, -18, 0.18, 52); line(8, -18, 0.18, 52)
    const ringG = new THREE.RingGeometry(9.6, 10, 64).rotateX(-Math.PI / 2)
    const ring = new THREE.Mesh(ringG, M.paint)
    ring.position.set(0, 0.012, -118)
    S.add(ring)

    // Muros perimetrales.
    const sideWall = (zc, depth, h, mat) => {
      for (const sx of [-1, 1]) this.box({ x: sx * (HALF_W + 0.5), z: zc, w: 1, d: depth, h, mat, tile: 4 })
    }
    sideWall(-18, 60, 4.2, M.concreteDark)
    sideWall(-75, 54, 9.4, M.wallMetal)
    sideWall(-126, 48, 1.3, M.concreteDark)
    this.box({ x: 0, z: Z_SOUTH + 0.5, w: NAV_W + 2, d: 1, h: 4.2, mat: M.concreteDark, tile: 4 })
    this.box({ x: 0, z: Z_NORTH - 0.5, w: NAV_W + 2, d: 1, h: 1.3, mat: M.concreteDark, tile: 4 })
    for (const sx of [-1, 1]) {
      this.box({ x: sx * (HALF_W + 0.5), z: -18, w: 1.06, d: 60, h: 0.35, y0: 3.9, mat: M.hazard, collide: false, tile: 1.4 })
      // Barandilla de la plataforma.
      this.deco(new THREE.BoxGeometry(0.08, 0.08, 48), M.steel, sx * (HALF_W + 0.5), 1.9, -126, false)
      for (let z = -104; z > -150; z -= 4) this.deco(new THREE.BoxGeometry(0.08, 0.6, 0.08), M.steel, sx * (HALF_W + 0.5), 1.6, z, false)
    }

    // Muros divisorios con compuerta central.
    const divider = (z, name) => {
      for (const sx of [-1, 1]) this.box({ x: sx * 12.75, z, w: 19.5, d: 2, h: 9.4, mat: M.wallMetal, tile: 4 })
      this.box({ x: 0, z, w: 6, d: 2, h: 5.2, y0: 4.2, mat: M.wallMetal, tile: 4 })
      this.box({ x: 0, z, w: 6.4, d: 2.1, h: 0.4, y0: 4.0, mat: M.hazard, collide: false, tile: 1.4 })
      const col = { minX: -3, maxX: 3, minZ: z - 0.5, maxZ: z + 0.5, y0: 0, y1: 4.2, cover: false, low: false, walk: true }
      this.colliders.push(col)
      const panels = []
      for (const sx of [-1, 1]) {
        const p = new THREE.Mesh(boxGeo(3, 4, 0.5, 2), M.machine)
        p.position.set(sx * 1.5, 2, z)
        p.castShadow = true
        S.add(p)
        const s = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3.2, 0.56), M.glowRed.clone())
        s.position.set(-sx * 1.2, 0, 0)
        p.add(s)
        panels.push({ mesh: p, sx, light: s.material })
      }
      this.doors[name] = { col, panels, open: false, t: 0, z }
    }
    divider(-48, 'A')
    divider(-102, 'B')

    // ---- Zona A: patio de carga ----
    this.barrier(-5, -3); this.barrier(5, -4.5)
    this.crate(-0.8, -10.5); this.crate(0.8, -10.5, 2.4)
    this.container(-13, -13, true, M.containerTeal)
    this.container(13, -17, false, M.containerRust)
    this.barrier(-6, -19.5); this.barrier(6.5, -22, false)
    this.crate(-16, -24.5); this.crate(16.5, -7.5); this.crate(15, -7.3, 2.4, 1.5)
    this.container(1, -28.5, true, M.containerCream)
    this.barrier(-9.5, -31); this.barrier(10.5, -33.5)
    this.crate(-3.5, -36.5, 1.2, 1.7); this.crate(4.5, -38.5, 1.2, 1.7)
    this.barrier(-12.5, -40.5, false); this.barrier(12.5, -41, false)
    this.barrier(-7, -42.5); this.barrier(7, -43)
    this.container(-17.5, -3, false, M.containerRust)
    // Vehículo de transporte en el que llega la protagonista.
    this.box({ x: 9, z: 8.2, w: 3.4, d: 5.6, h: 2.2, mat: M.machine, cover: true })
    this.box({ x: 9, z: 8.2, w: 3.0, d: 2.2, h: 0.9, y0: 2.2, mat: M.wallMetal, collide: false })
    this.deco(new THREE.BoxGeometry(2.6, 0.5, 0.1), M.glowWarm, 9, 1.5, 5.36, false)
    for (const [wx, wz] of [[7.2, 6.4], [10.8, 6.4], [7.2, 10], [10.8, 10]]) this.deco(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 14).rotateZ(Math.PI / 2), M.rubber, wx, 0.55, wz)
    // Montones de sal junto a los muros.
    for (const [px, pz, r] of [[-19, 8, 2.6], [19.5, -24, 2.2], [-19.5, -36, 2.4]]) {
      this.deco(new THREE.ConeGeometry(r, r * 0.9, 14), M.salt, px, r * 0.45, pz)
      this.colliders.push({ minX: px - r * 0.6, maxX: px + r * 0.6, minZ: pz - r * 0.6, maxZ: pz + r * 0.6, y0: 0, y1: r * 0.6, cover: false, low: true, walk: true })
    }
    this.lamp(-20.5, -10, 6.5, 0xffb060, 140, M.glowWarm)
    this.lamp(20.5, -36, 6.5, 0xffb060, 140, M.glowWarm)

    // ---- Zona B: nave de proceso ----
    for (const sx of [-9, 9]) for (const z of [-57, -69, -81, -93]) {
      this.box({ x: sx, z, w: 1.2, d: 1.2, h: 9.4, mat: M.concrete, cover: true, tile: 2 })
      this.box({ x: sx, z, w: 1.26, d: 1.26, h: 0.9, y0: 0.4, mat: M.hazard, collide: false, tile: 0.9, shadow: false })
    }
    // Cintas transportadoras.
    for (const [cx, cz] of [[-3.5, -63.5], [3.5, -87]]) {
      this.box({ x: cx, z: cz, w: 1.7, d: 9, h: 1.0, mat: M.machine, cover: true, tile: 1.7 })
      this.box({ x: cx, z: cz, w: 1.4, d: 9.05, h: 0.08, y0: 1.0, mat: M.rubber, collide: false })
      for (let i = 0; i < 4; i++) this.deco(new THREE.DodecahedronGeometry(0.22), M.salt, cx + (i % 2 ? 0.2 : -0.2), 1.25, cz - 3.4 + i * 2.2)
    }
    this.tank(-16.5, -60); this.tank(16.5, -67); this.tank(-16.5, -82); this.tank(16.5, -91)
    this.crate(3.2, -57.5, 1.2, 1.6); this.crate(-4.2, -74.5, 1.2, 1.6); this.crate(5, -75.5, 1.2, 1.6); this.crate(-2, -84.5, 1.2, 1.6)
    this.crate(6.6, -75.5, 2.4, 1.6)
    this.barrier(0, -69); this.barrier(-12, -89); this.barrier(12, -77.5); this.barrier(-5, -55, false); this.barrier(13, -55.5)
    this.box({ x: -13.5, z: -71, w: 3, d: 4.4, h: 3.1, mat: M.machineYellow, cover: true })
    this.box({ x: 13.5, z: -80.5, w: 3, d: 4.4, h: 3.1, mat: M.machineYellow, cover: true })
    this.deco(new THREE.BoxGeometry(0.1, 0.5, 2.2), M.glowTeal, -11.96, 2.2, -71, false)
    this.deco(new THREE.BoxGeometry(0.1, 0.5, 2.2), M.glowTeal, 11.96, 2.2, -80.5, false)
    // Pupitre de control y consola de la compuerta norte.
    this.box({ x: 0, z: -93.5, w: 4.2, d: 1, h: 1.1, mat: M.machine, cover: true, tile: 1.4 })
    this.deco(new THREE.BoxGeometry(3.6, 0.5, 0.08), M.screen, 0, 1.36, -93.9, false).rotation.x = 0.5
    this.box({ x: 6.5, z: -100.2, w: 1.6, d: 0.9, h: 1.5, mat: M.machine })
    this.consoleB = this.deco(new THREE.BoxGeometry(1.2, 0.7, 0.08), M.glowRed.clone(), 6.5, 1.25, -99.72, false)
    // Techo con lucernarios, cerchas y tuberías.
    for (let z = -52; z > -100; z -= 8) {
      this.box({ x: 0, z, w: NAV_W + 2, d: 5.6, h: 0.3, y0: 9.4, mat: M.wallMetal, collide: false, tile: 5 })
      this.deco(new THREE.BoxGeometry(NAV_W, 0.5, 0.3), M.darkMetal, 0, 8.9, z + 2.8)
    }
    for (const sx of [-1, 1]) {
      this.deco(new THREE.CylinderGeometry(0.28, 0.28, 52, 10).rotateX(Math.PI / 2), M.rust, sx * 21.4, 6.2, -75)
      this.deco(new THREE.CylinderGeometry(0.16, 0.16, 52, 8).rotateX(Math.PI / 2), M.steel, sx * 21.5, 5.4, -75)
      for (let z = -54; z > -100; z -= 9) this.deco(new THREE.BoxGeometry(0.1, 0.35, 3.4), M.glowTeal, sx * 21.94, 3.4, z, false)
    }
    for (const [lx, lz] of [[-6, -60], [6, -72], [-6, -84], [6, -96]]) {
      this.deco(new THREE.BoxGeometry(2.4, 0.1, 0.5), M.glowTeal, lx, 8.6, lz, false)
      const l = new THREE.PointLight(0x9fe8e0, 150, 30, 1.5)
      l.position.set(lx, 8, lz)
      S.add(l)
    }

    // ---- Zona C: plataforma de la antena ----
    this.barrier(-8, -108); this.barrier(0, -109.5); this.barrier(8, -108)
    this.barrier(-13.5, -115.5, false); this.barrier(13.5, -115.5, false)
    this.box({ x: -6, z: -116.5, w: 2.4, d: 2.4, h: 2.5, mat: M.machineYellow, cover: true })
    this.box({ x: 6, z: -118.5, w: 2.4, d: 2.4, h: 2.5, mat: M.machineYellow, cover: true })
    this.deco(new THREE.BoxGeometry(1.6, 0.3, 0.08), M.glowWarm, -6, 1.9, -115.28, false)
    this.deco(new THREE.BoxGeometry(1.6, 0.3, 0.08), M.glowWarm, 6, 1.9, -117.28, false)
    this.crate(0, -116, 1.2, 1.6)
    this.barrier(-3.5, -122.5); this.barrier(4.5, -124.5); this.barrier(-11.5, -125); this.barrier(12, -123.5)
    this.crate(-17, -110); this.crate(17, -119); this.barrier(-16, -130.5); this.barrier(16.5, -130)
    this.barrier(0, -129.5)
    // Vías del pórtico y consola de la antena.
    this.colliders.push({ minX: -HALF_W, maxX: HALF_W, minZ: -150, maxZ: -134.4, y0: 0, y1: 0.5, cover: false, low: true, walk: true })
    this.box({ x: 0, z: -142.2, w: NAV_W, d: 15.6, h: 0.22, mat: M.concreteDark, collide: false, tile: 4 })
    for (const rz of [-136.6, -139.4]) this.deco(new THREE.BoxGeometry(NAV_W, 0.16, 0.2), M.steel, 0, 0.32, rz)
    for (let x = -21; x <= 21; x += 1.5) this.deco(new THREE.BoxGeometry(0.3, 0.1, 3.6), M.rust, x, 0.25, -138, false)
    this.box({ x: -8, z: -133.4, w: 1.8, d: 0.9, h: 1.5, mat: M.machine, cover: true })
    this.consoleC = this.deco(new THREE.BoxGeometry(1.4, 0.7, 0.08), M.glowRed.clone(), -8, 1.25, -132.92, false)
    // Torre de la antena.
    const tower = new THREE.Group()
    tower.position.set(0, 0, -147)
    S.add(tower)
    const leg = new THREE.CylinderGeometry(0.16, 0.22, 44, 6)
    for (const [lx, lz] of [[-2.2, -2.2], [2.2, -2.2], [-2.2, 2.2], [2.2, 2.2]]) {
      const m = new THREE.Mesh(leg, M.rust)
      m.position.set(lx * 0.6, 22, lz * 0.6)
      m.rotation.z = lx * 0.022
      m.rotation.x = -lz * 0.022
      m.castShadow = true
      tower.add(m)
    }
    for (let y = 3; y < 44; y += 4.5) {
      const s = 3 - y * 0.045
      const m = new THREE.Mesh(new THREE.BoxGeometry(s, 0.12, s), M.darkMetal)
      m.position.y = y
      tower.add(m)
    }
    const dish = new THREE.Mesh(new THREE.SphereGeometry(4.2, 24, 10, 0, 6.3, 0, 0.75), M.tank)
    dish.material.side = THREE.DoubleSide
    dish.position.set(0, 30, 2.5)
    dish.rotation.x = -1.95
    tower.add(dish)
    this.beacon = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), M.glowRed.clone())
    this.beacon.position.set(0, 44.4, 0)
    tower.add(this.beacon)
    this.blinkers.push({ mat: this.beacon.material, speed: 2, base: 5 })
    this.lamp(-20.5, -118, 6, 0xffc890, 120, M.glowWarm)
    this.lamp(20.5, -126, 6, 0xffc890, 120, M.glowWarm)

    // Persianas de servicio.
    for (const z of ['A', 'B', 'C']) for (const [sx, sz] of this.spawns[z]) this.spawnDoor(sx, sz)

    // Cajas de munición (se recargan con el tiempo).
    for (const [ax, az] of [[-3.2, 9.6], [-6.5, -46.2], [-6.5, -100.2], [18.5, -106], [-18.5, -121]]) {
      this.box({ x: ax, z: az, w: 1.3, d: 0.9, h: 0.8, mat: M.darkMetal, cover: false })
      const lid = this.deco(new THREE.BoxGeometry(1.1, 0.06, 0.7), M.glowGreen.clone(), ax, 0.83, az, false)
      this.interactables.push({ id: 'ammo', x: ax, z: az, r: 2.2, label: 'Reponer munición', enabled: true, cooldown: 0, mat: lid.material })
    }
    this.interactables.push({ id: 'consoleB', x: 6.5, z: -98.8, r: 2.4, label: 'Abrir compuerta norte', enabled: false, cooldown: 0, mat: this.consoleB.material })
    this.interactables.push({ id: 'antenna', x: -8, z: -132, r: 2.6, label: 'Transmitir orden de apagado', enabled: false, cooldown: 0, mat: this.consoleC.material })

    // Montañas lejanas.
    const mount = (radius, h, color, seed) => {
      const seg = 96
      const pos = []
      const idx = []
      for (let i = 0; i <= seg; i++) {
        const a = (i / seg) * Math.PI * 2
        const n = Math.sin(a * 5 + seed) * 0.35 + Math.sin(a * 13 + seed * 2.3) * 0.22 + Math.sin(a * 29 + seed * 0.7) * 0.12
        const top = h * (0.55 + 0.45 * Math.abs(n) * 2.2)
        pos.push(Math.cos(a) * radius, -2, Math.sin(a) * radius, Math.cos(a) * radius * 0.97, top, Math.sin(a) * radius * 0.97)
        if (i < seg) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2) }
      }
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
      g.setIndex(idx)
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, fog: true }))
      m.position.z = -70
      S.add(m)
    }
    mount(620, 95, 0x3a3550, 1.3)
    mount(480, 55, 0x4b3f55, 4.1)
  }

  // ---------- Coberturas ----------

  buildCoverPoints() {
    const free = (x, z) => {
      if (Math.abs(x) > HALF_W - 0.7 || z > Z_SOUTH - 0.7 || z < -133.8) return false
      for (const c of this.colliders) if (x > c.minX - 0.38 && x < c.maxX + 0.38 && z > c.minZ - 0.38 && z < c.maxZ + 0.38) return false
      return true
    }
    for (const b of this.colliders) {
      if (!b.cover) continue
      const faces = [
        { nx: 0, nz: 1, ax: 'x', fixed: b.maxZ }, { nx: 0, nz: -1, ax: 'x', fixed: b.minZ },
        { nx: 1, nz: 0, ax: 'z', fixed: b.maxX }, { nx: -1, nz: 0, ax: 'z', fixed: b.minX },
      ]
      for (const f of faces) {
        const lo = f.ax === 'x' ? b.minX : b.minZ
        const hi = f.ax === 'x' ? b.maxX : b.maxZ
        const len = hi - lo
        const samples = []
        if (b.low) {
          const n = Math.max(1, Math.round(len / 1.4))
          for (let i = 0; i < n; i++) samples.push({ t: lo + (len * (i + 0.5)) / n, side: 0 })
        } else {
          samples.push({ t: lo + 0.35, side: -1 }, { t: hi - 0.35, side: 1 })
        }
        for (const s of samples) {
          const x = f.ax === 'x' ? s.t : f.fixed + f.nx * 0.62
          const z = f.ax === 'x' ? f.fixed + f.nz * 0.62 : s.t
          if (!free(x, z)) continue
          const tx = f.ax === 'x' ? 1 : 0
          const tz = f.ax === 'x' ? 0 : 1
          if (s.side !== 0 && !free(x + tx * s.side * 1.15, z + tz * s.side * 1.15)) continue
          this.coverPoints.push({ x, z, nx: f.nx, nz: f.nz, tx, tz, side: s.side, low: b.low, box: b, zone: zoneOf(z), user: null })
        }
      }
    }
  }

  // Cara de cobertura más cercana a una posición (para el jugador). Devuelve null si no hay.
  findCover(px, pz, maxDist) {
    let best = null
    let bd = maxDist
    for (const b of this.colliders) {
      if (!b.cover) continue
      const cx = clamp(px, b.minX, b.maxX)
      const cz = clamp(pz, b.minZ, b.maxZ)
      const dx = px - cx
      const dz = pz - cz
      const d = Math.hypot(dx, dz)
      if (d >= bd || d < 1e-4) continue
      let nx = 0
      let nz = 0
      if (Math.abs(dx) > Math.abs(dz)) nx = Math.sign(dx)
      else nz = Math.sign(dz)
      bd = d
      best = { box: b, nx, nz }
    }
    if (!best) return null
    const b = best.box
    const alongX = best.nx === 0
    const lo = (alongX ? b.minX : b.minZ) + 0.3
    const hi = (alongX ? b.maxX : b.maxZ) - 0.3
    const mid = (lo + hi) / 2
    best.lo = lo <= hi ? lo : mid
    best.hi = lo <= hi ? hi : mid
    best.fixed = alongX ? (best.nz > 0 ? b.maxZ : b.minZ) : best.nx > 0 ? b.maxX : b.minX
    best.alongX = alongX
    best.low = b.low
    best.thick = alongX ? b.maxZ - b.minZ : b.maxX - b.minX
    best.dist = bd
    return best
  }

  // ---------- Rayos y colisiones ----------

  // Rayo contra el mundo (cajas y suelo). Devuelve t o -1; la normal queda en out.
  raycast(ox, oy, oz, dx, dy, dz, maxT, out) {
    let best = maxT
    let found = false
    let nx = 0, ny = 1, nz = 0
    if (dy < -1e-6) {
      const t = -oy / dy
      if (t >= 0 && t < best) { best = t; found = true }
    }
    const cs = this.colliders
    for (let i = 0; i < cs.length; i++) {
      const t = rayBox(ox, oy, oz, dx, dy, dz, cs[i], best)
      if (t >= 0 && t < best) { best = t; found = true; nx = hitN.x; ny = hitN.y; nz = hitN.z }
    }
    if (!found) return -1
    if (out) { out.x = nx; out.y = ny; out.z = nz }
    return best
  }

  // ¿Hay línea de visión despejada entre dos puntos?
  clear(ax, ay, az, bx, by, bz) {
    const dx = bx - ax, dy = by - ay, dz = bz - az
    const len = Math.hypot(dx, dy, dz)
    if (len < 1e-4) return true
    const ix = dx / len, iy = dy / len, iz = dz / len
    const cs = this.colliders
    for (let i = 0; i < cs.length; i++) if (rayBox(ax, ay, az, ix, iy, iz, cs[i], len) >= 0) return false
    return true
  }

  inside(x, z, r) {
    if (Math.abs(x) > HALF_W - r || z > Z_SOUTH - r || z < Z_NORTH + r) return true
    for (const c of this.colliders) if (c.walk && x > c.minX - r && x < c.maxX + r && z > c.minZ - r && z < c.maxZ + r) return true
    return false
  }

  // ---------- Navegación ----------

  cellX(x) { return clamp(Math.floor(x + HALF_W), 0, NAV_W - 1) }
  cellZ(z) { return clamp(Math.floor(Z_SOUTH - z), 0, NAV_H - 1) }

  rebuildNav() {
    for (let cz = 0; cz < NAV_H; cz++) {
      for (let cx = 0; cx < NAV_W; cx++) {
        const x = cx - HALF_W + 0.5
        const z = Z_SOUTH - cz - 0.5
        let b = 0
        for (const c of this.colliders) {
          if (c.walk && x > c.minX - 0.52 && x < c.maxX + 0.52 && z > c.minZ - 0.52 && z < c.maxZ + 0.52) { b = 1; break }
        }
        this.blocked[cz * NAV_W + cx] = b
      }
    }
  }

  navClear(ax, az, bx, bz) {
    const d = Math.hypot(bx - ax, bz - az)
    const n = Math.ceil(d / 0.4)
    for (let i = 0; i <= n; i++) {
      const t = n === 0 ? 0 : i / n
      if (this.blocked[this.cellZ(az + (bz - az) * t) * NAV_W + this.cellX(ax + (bx - ax) * t)]) return false
    }
    return true
  }

  nearestFree(cx, cz) {
    if (!this.blocked[cz * NAV_W + cx]) return cz * NAV_W + cx
    for (let r = 1; r < 6; r++) {
      for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue
        const x = cx + dx, z = cz + dz
        if (x < 0 || z < 0 || x >= NAV_W || z >= NAV_H) continue
        if (!this.blocked[z * NAV_W + x]) return z * NAV_W + x
      }
    }
    return -1
  }

  // A* sobre la rejilla. Devuelve una lista de puntos {x, z} o null.
  findPath(sx, sz, gx, gz) {
    const start = this.nearestFree(this.cellX(sx), this.cellZ(sz))
    const goal = this.nearestFree(this.cellX(gx), this.cellZ(gz))
    if (start < 0 || goal < 0) return null
    const id = ++this.searchId
    const { gScore, stamp, closed, parent, blocked } = this
    const gcx = goal % NAV_W, gcz = (goal / NAV_W) | 0
    const heap = []
    const push = (node, f) => {
      heap.push({ node, f })
      let i = heap.length - 1
      while (i > 0) {
        const p = (i - 1) >> 1
        if (heap[p].f <= heap[i].f) break
        const t = heap[p]; heap[p] = heap[i]; heap[i] = t
        i = p
      }
    }
    const pop = () => {
      const top = heap[0]
      const last = heap.pop()
      if (heap.length) {
        heap[0] = last
        let i = 0
        for (;;) {
          const l = i * 2 + 1, r = l + 1
          let m = i
          if (l < heap.length && heap[l].f < heap[m].f) m = l
          if (r < heap.length && heap[r].f < heap[m].f) m = r
          if (m === i) break
          const t = heap[m]; heap[m] = heap[i]; heap[i] = t
          i = m
        }
      }
      return top.node
    }
    gScore[start] = 0
    stamp[start] = id
    parent[start] = -1
    push(start, 0)
    let found = false
    let guard = 0
    while (heap.length && guard++ < 9000) {
      const cur = pop()
      if (cur === goal) { found = true; break }
      if (closed[cur] === id) continue
      closed[cur] = id
      const cx = cur % NAV_W, cz = (cur / NAV_W) | 0
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dz) continue
        const x = cx + dx, z = cz + dz
        if (x < 0 || z < 0 || x >= NAV_W || z >= NAV_H) continue
        const n = z * NAV_W + x
        if (blocked[n] || closed[n] === id) continue
        if (dx && dz && (blocked[cz * NAV_W + x] || blocked[z * NAV_W + cx])) continue
        const g = gScore[cur] + (dx && dz ? 1.414 : 1)
        if (stamp[n] === id && g >= gScore[n]) continue
        stamp[n] = id
        gScore[n] = g
        parent[n] = cur
        const hx = Math.abs(x - gcx), hz = Math.abs(z - gcz)
        push(n, g + Math.max(hx, hz) + 0.414 * Math.min(hx, hz))
      }
    }
    if (!found) return null
    const cells = []
    for (let n = goal; n !== -1; n = parent[n]) cells.push(n)
    cells.reverse()
    const pts = cells.map((n) => ({ x: (n % NAV_W) - HALF_W + 0.5, z: Z_SOUTH - ((n / NAV_W) | 0) - 0.5 }))
    // Suavizado: saltar puntos intermedios mientras haya paso libre.
    const out = []
    let i = 0
    let px = sx, pz = sz
    while (i < pts.length) {
      let j = pts.length - 1
      while (j > i && !this.navClear(px, pz, pts[j].x, pts[j].z)) j--
      out.push(pts[j])
      px = pts[j].x; pz = pts[j].z
      i = j + 1
    }
    out.push({ x: gx, z: gz })
    return out
  }

  // ---------- Dinámica ----------

  openDoor(name) {
    const d = this.doors[name]
    if (!d || d.open) return
    d.open = true
    const i = this.colliders.indexOf(d.col)
    if (i >= 0) this.colliders.splice(i, 1)
    this.rebuildNav()
    for (const p of d.panels) { p.light.emissive.setHex(0x52ff7a); p.light.color.setHex(0x08300f) }
  }

  setConsole(id, on) {
    const it = this.interactables.find((i) => i.id === id)
    if (!it) return
    it.enabled = on
    it.mat.emissive.setHex(on ? 0x52ff7a : 0x39e6d2)
    it.mat.color.setHex(on ? 0x08300f : 0x0c2a2c)
  }

  update(dt) {
    this.time += dt
    for (const name in this.doors) {
      const d = this.doors[name]
      if (d.open && d.t < 1) {
        d.t = Math.min(1, d.t + dt / 1.6)
        const k = d.t * d.t * (3 - 2 * d.t)
        for (const p of d.panels) p.mesh.position.x = p.sx * (1.5 + k * 2.9)
      }
    }
    for (const b of this.blinkers) b.mat.emissiveIntensity = b.base * (0.35 + 0.65 * Math.max(0, Math.sin(this.time * b.speed)))
    for (const it of this.interactables) {
      if (it.cooldown > 0) {
        it.cooldown -= dt
        it.mat.emissiveIntensity = it.cooldown > 0 ? 0.15 : 2.2
      }
    }
  }
}
