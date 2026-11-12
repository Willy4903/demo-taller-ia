// Salar Rojo: arranque, bucle principal, cámara en tercera persona y flujo del nivel.
import * as THREE from '../vendor/three.module.min.js'
import { createMaterials } from './textures.js'
import { Level } from './level.js'
import { Fx } from './fx.js'
import { GameAudio } from './audio.js'
import { Hud, showScreen } from './hud.js'
import { Player, WEAPONS } from './player.js'
import { Enemies } from './enemies.js'
import { clamp, damp, lerp, rand } from './util.js'
import { isTouchDevice, setupTouch } from './touch.js'

const canvas = document.getElementById('game')
const $ = (id) => document.getElementById(id)

// ---------- Entrada ----------

class Input {
  constructor() {
    this.keys = new Set()
    this.pressedKeys = new Set()
    this.buttons = [false, false, false]
    this.buttonsPressed = [false, false, false]
    this.dx = 0
    this.dy = 0
    this.wheel = 0
    this.locked = false
    this.freeLook = false
    // Táctil: ejes analógicos del joystick virtual.
    this.touch = false
    this.tx = 0
    this.tz = 0
    this.lastTouch = -1e9
  }
  axisX() { return clamp((this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0) + this.tx, -1, 1) }
  axisZ() { return clamp((this.keys.has('KeyW') ? 1 : 0) - (this.keys.has('KeyS') ? 1 : 0) + this.tz, -1, 1) }
  sprint() { return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.tz > 0.9 }
  down(code) { return this.keys.has(code) }
  pressed(code) { return this.pressedKeys.has(code) }
  mouse(b) { return this.buttons[b] }
  mousePressed(b) { return this.buttonsPressed[b] }
  reset() {
    this.keys.clear()
    this.buttons.fill(false)
    this.tx = this.tz = 0
  }
  endFrame() {
    this.pressedKeys.clear()
    this.buttonsPressed.fill(false)
    this.dx = this.dy = this.wheel = 0
  }
}

// ---------- Escena ----------

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.08
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFShadowMap

const scene = new THREE.Scene()
const FOG = 0xcf9a84
scene.fog = new THREE.FogExp2(FOG, 0.0062)
renderer.setClearColor(FOG)

const camera = new THREE.PerspectiveCamera(62, 1, 0.12, 1600)
camera.rotation.order = 'YXZ'

const SUN_DIR = new THREE.Vector3(-0.74, 0.46, 0.3).normalize()
const hemi = new THREE.HemisphereLight(0xa8c8d8, 0x7a5648, 1.3)
scene.add(hemi)
const sun = new THREE.DirectionalLight(0xffc79a, 3.1)
sun.castShadow = true
sun.shadow.mapSize.set(1536, 1536)
sun.shadow.camera.left = -36
sun.shadow.camera.right = 36
sun.shadow.camera.top = 36
sun.shadow.camera.bottom = -36
sun.shadow.camera.near = 1
sun.shadow.camera.far = 170
sun.shadow.bias = -0.0005
sun.shadow.normalBias = 0.04
scene.add(sun, sun.target)

// Cielo de atardecer en gradiente con disco solar.
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(1200, 32, 16),
  new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { sunDir: { value: SUN_DIR } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      varying vec3 vDir; uniform vec3 sunDir;
      void main(){
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 hor = vec3(1.0, 0.56, 0.36), mid = vec3(0.62, 0.36, 0.42), top = vec3(0.06, 0.15, 0.25);
        vec3 c = mix(hor, mid, smoothstep(0.0, 0.2, h));
        c = mix(c, top, smoothstep(0.14, 0.75, h));
        float s = max(dot(d, sunDir), 0.0);
        c += vec3(1.0, 0.8, 0.55) * pow(s, 420.0) * 4.0 + vec3(1.0, 0.5, 0.28) * pow(s, 10.0) * 0.45;
        c = mix(c, vec3(0.62, 0.42, 0.38), smoothstep(0.0, -0.08, h));
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }),
)
sky.renderOrder = -10
sky.frustumCulled = false
scene.add(sky)

// ---------- Juego ----------

const shot = { hit: false, t: 0, point: new THREE.Vector3(), normal: { x: 0, y: 1, z: 0 }, enemy: null, part: null }
const _a = new THREE.Vector3()
const _b = new THREE.Vector3()
const _c = new THREE.Vector3()

const game = {
  state: 'menu',
  time: 0,
  playTime: 0,
  scene,
  camera,
  renderer,
  input: new Input(),
  audio: new GameAudio(),
  hud: new Hud(),
  camYaw: 0,
  camPitch: -0.06,
  camSide: 1,
  camDist: 3.3,
  lookDir: new THREE.Vector3(0, 0, -1),
  aimPoint: new THREE.Vector3(0, 1.4, -50),
  aimOnEnemy: false,
  sens: 1,
  deathT: 0,

  // Disparo instantáneo contra mundo y enemigos. Devuelve el objeto compartido `shot`.
  shoot(o, d, range) {
    const wt = this.level.raycast(o.x, o.y, o.z, d.x, d.y, d.z, range, shot.normal)
    const eh = this.enemies.raycast(o, d, wt >= 0 ? wt : range)
    shot.enemy = null
    shot.part = null
    if (eh) {
      shot.hit = true
      shot.t = eh.t
      shot.enemy = eh.enemy
      shot.part = eh.part
    } else if (wt >= 0) {
      shot.hit = true
      shot.t = wt
    } else {
      shot.hit = false
      shot.t = range
    }
    shot.point.set(o.x + d.x * shot.t, o.y + d.y * shot.t, o.z + d.z * shot.t)
    return shot
  },

  recoil(a) {
    this.camPitch += a
    this.camYaw += rand(-a, a) * 0.5
  },

  onPlayerDeath() {
    this.deathT = 1.8
    this.audio.play('lose')
    this.hud.setPrompt(null)
  },
}

const M = createMaterials()
game.level = new Level(scene, M)
game.fx = new Fx(scene)
game.player = new Player(game)
game.enemies = new Enemies(game)

// ---------- Director: oleadas, objetivos y puntos de control ----------

const WAVES = {
  A: [
    [['grunt', 0], ['grunt', 1], ['grunt', 4]],
    [['grunt', 2], ['grunt', 3], ['roller', 0], ['roller', 1], ['grunt', 4]],
    [['drone', 0], ['drone', 1], ['grunt', 0], ['grunt', 1], ['roller', 4], ['roller', 2]],
  ],
  B: [
    [['grunt', 0], ['grunt', 1], ['grunt', 4], ['drone', 3]],
    [['roller', 0], ['roller', 1], ['roller', 2], ['roller', 3], ['grunt', 4], ['grunt', 2]],
    [['grunt', 0], ['grunt', 1], ['grunt', 2], ['drone', 3], ['drone', 4], ['roller', 4], ['roller', 0]],
  ],
}

class Director {
  constructor(g) {
    this.g = g
    this.stage = 'idle'
    this.wave = 0
    this.waveT = 0
    this.minT = 0
    this.target = null
    this.lines = []
    this.lineT = 0
    this.tips = []
    this.bossT = 0
    this.checkpoint = { stage: 'A', x: 0, z: 8, yaw: 0 }
  }

  say(speaker, text) {
    this.lines.push([speaker, text])
  }

  begin() {
    const g = this.g
    g.hud.banner('SALAR ROJO', 'Patio de carga · 18:42')
    this.say('Control', 'Las unidades de mantenimiento ya no responden. Llega a la antena y transmite el apagado.')
    this.tips = g.input.touch
      ? [
          [2.5, 'Toca CUBRIR junto a una barrera o un muro'],
          [9, 'Activa APUNTAR para asomarte; sin apuntar disparas a ciegas'],
          [17, 'Los Peones se cubren: flanquéalos o lanza una granada'],
          [26, 'El visor rojo de las máquinas es su punto débil'],
        ]
      : [
          [2.5, 'ESPACIO junto a una barrera o un muro para cubrirte'],
          [9, 'Clic derecho para asomarte y apuntar; sin apuntar disparas a ciegas'],
          [17, 'Los Peones se cubren: flanquéalos o lanza una granada de pulso con G'],
          [26, 'El visor rojo de las máquinas es su punto débil'],
        ]
    this.startStage('A')
  }

  startStage(z) {
    const g = this.g
    this.stage = z
    this.wave = 0
    this.waveT = z === 'A' ? 3.4 : 1.2
    this.target = null
    g.hud.setObjective(z === 'A' ? 'Despeja el patio de carga' : 'Despeja la nave de proceso')
  }

  setTravel(stage) {
    const g = this.g
    this.stage = stage
    if (stage === 'toB') {
      g.hud.setObjective('Entra en la nave de proceso')
      this.target = { x: 0, z: -54 }
    } else if (stage === 'toC') {
      g.hud.setObjective('Sal a la plataforma de la antena')
      this.target = { x: 0, z: -108.2 }
    }
  }

  interact(it) {
    const g = this.g
    if (it.id === 'ammo') {
      g.player.refill()
      it.cooldown = 45
      g.audio.play('pickup')
      g.hud.hint('Munición y granadas repuestas', 2.5)
    } else if (it.id === 'consoleB' && this.stage === 'consoleB') {
      g.level.setConsole('consoleB', false)
      g.level.openDoor('B')
      g.audio.play('door')
      this.checkpoint = { stage: 'toC', x: 0, z: -96.5, yaw: 0 }
      this.setTravel('toC')
      this.say('Control', 'Compuerta abierta. La antena está al otro lado, pero el pórtico de carga se está moviendo solo.')
      g.hud.hint('Punto de control alcanzado', 2.5)
    } else if (it.id === 'antenna' && this.stage === 'antenna') {
      win()
    }
  }

  respawn() {
    const g = this.g
    const cp = this.checkpoint
    g.enemies.clear()
    g.player.reset(cp)
    g.camYaw = cp.yaw
    g.camPitch = -0.06
    for (const it of g.level.interactables) if (it.id === 'ammo') it.cooldown = 0.01
    g.hud.boss(false, 0, false)
    if (cp.stage === 'A') this.startStage('A')
    else this.setTravel(cp.stage)
  }

  update(dt) {
    const g = this.g
    const p = g.player
    const en = g.enemies

    if (this.lineT > 0) this.lineT -= dt
    else if (this.lines.length) {
      const [s, t] = this.lines.shift()
      g.hud.subtitle(s, t, 5.5)
      g.audio.play('radio')
      this.lineT = 6
    }
    if (this.tips.length && g.playTime > this.tips[0][0]) g.hud.hint(this.tips.shift()[1], 5)

    if (p.dead) return

    if (this.stage === 'A' || this.stage === 'B') {
      const waves = WAVES[this.stage]
      if (this.waveT > 0) {
        this.waveT -= dt
        if (this.waveT <= 0) {
          en.spawnGroup(waves[this.wave], this.stage)
          this.wave++
          this.minT = 5
          if (this.wave > 1) g.hud.hint(this.wave === waves.length ? 'Última oleada' : 'Llegan más máquinas', 2.5)
        }
      } else {
        this.minT -= dt
        const alive = en.aliveCount()
        if (this.wave < waves.length) { if (alive <= 1 && this.minT <= 0) this.waveT = 1.8 }
        else if (alive === 0) this.clearZone()
      }
    } else if (this.stage === 'toB') {
      if (p.pos.z < -51.5) {
        this.startStage('B')
        this.say('Control', 'Estás dentro. Las cintas siguen en marcha y hay movimiento entre los depósitos.')
      }
    } else if (this.stage === 'toC') {
      if (p.pos.z < -106) {
        this.stage = 'C'
        this.target = null
        en.spawn('boss', 0, -138)
        g.hud.banner('CAPATAZ', 'Grúa pórtico G-12')
        g.hud.setObjective('Destruye al Capataz')
        this.say('Control', 'Su blindaje es grueso. Cuando dispare los morteros tendrá que abrir el pecho para ventilar el núcleo.')
        g.audio.play('alarm', 1.5)
      }
    } else if (this.stage === 'C') {
      const b = en.boss
      if (b) g.hud.boss(true, b.hp / b.maxHp, b.vent)
      if (b && !b.alive) {
        this.bossT += dt
        if (this.bossT > 3.6) {
          this.stage = 'antenna'
          g.hud.boss(false, 0, false)
          g.level.setConsole('antenna', true)
          g.hud.setObjective('Transmite la orden de apagado desde la consola')
          this.target = { x: -8, z: -132 }
          this.say('Control', 'El pórtico ha caído. La consola de la antena está junto a las vías.')
        }
      } else this.bossT = 0
    }
  }

  clearZone() {
    const g = this.g
    if (this.stage === 'A') {
      g.level.openDoor('A')
      g.audio.play('door')
      this.checkpoint = { stage: 'toB', x: 0, z: -43.5, yaw: 0 }
      this.setTravel('toB')
      this.say('Control', 'Patio despejado. Abro la compuerta de la nave de proceso.')
      g.hud.hint('Punto de control alcanzado', 2.5)
    } else {
      this.stage = 'consoleB'
      g.level.setConsole('consoleB', true)
      g.hud.setObjective('Activa la consola de la compuerta norte')
      this.target = { x: 6.5, z: -99 }
      this.say('Control', 'Nave en silencio. La consola de la compuerta está al fondo, a la derecha.')
    }
  }
}

game.director = new Director(game)

// ---------- Cámara ----------

function updateCamera(dt) {
  const p = game.player
  const aim = p.aimAmt
  const cy = game.camYaw
  const cp = game.camPitch
  const cosP = Math.cos(cp)
  const look = game.lookDir.set(-Math.sin(cy) * cosP, Math.sin(cp), -Math.cos(cy) * cosP)
  const rx = Math.cos(cy)
  const rz = -Math.sin(cy)

  // En cobertura alta el hombro de la cámara sigue el lado por el que se asoma.
  let sideWant = 1
  if (p.inCover && !p.cover.low && p.leanSide) {
    const tx = p.cover.alongX ? 1 : 0
    const tz = p.cover.alongX ? 0 : 1
    sideWant = (rx * tx + rz * tz) * p.leanSide >= 0 ? 1 : -1
  }
  game.camSide = damp(game.camSide, sideWant, 6, dt)

  let distWant = lerp(3.35, 2.5, aim)
  if (p.sprinting) distWant += 0.25
  if (p.dead) distWant = 4.6
  game.camDist = damp(game.camDist, distWant, 9, dt)
  const pivotY = p.dead ? 1.0 : lerp(1.6, 1.2, p.crouch)
  const side = lerp(0.7, 1.0, aim) * game.camSide

  _a.set(p.pos.x, pivotY, p.pos.z)
  _b.set(_a.x + rx * side - look.x * game.camDist, _a.y + lerp(0.14, 0.22, aim) - look.y * game.camDist, _a.z + rz * side - look.z * game.camDist)
  _c.copy(_b).sub(_a)
  const len = _c.length()
  _c.divideScalar(len)
  const t = game.level.raycast(_a.x, _a.y, _a.z, _c.x, _c.y, _c.z, len + 0.3, null)
  const d = t >= 0 ? Math.max(0.35, t - 0.3) : len
  camera.position.set(_a.x + _c.x * d, Math.max(0.25, _a.y + _c.y * d), _a.z + _c.z * d)

  const sh = game.fx.shakeAmt
  camera.rotation.set(cp + rand(-1, 1) * sh * 0.022, cy + rand(-1, 1) * sh * 0.022, rand(-1, 1) * sh * 0.015)
  // En vertical se abre el campo de visión para no perder demasiada vista lateral.
  const tall = camera.aspect < 1
  const fov = lerp(tall ? 86 : 62, tall ? 66 : 47, aim) + (p.sprinting ? 5 : 0)
  if (Math.abs(camera.fov - fov) > 0.05) {
    camera.fov = damp(camera.fov, fov, 10, dt)
    camera.updateProjectionMatrix()
    game.fx.setViewport(renderer.domElement.height, camera.fov)
  }

  // Punto al que mira la mirilla, saltando lo que haya entre la cámara y el personaje.
  const skip = d + 0.4
  _b.set(camera.position.x + look.x * skip, camera.position.y + look.y * skip, camera.position.z + look.z * skip)
  const h = game.shoot(_b, look, 220)
  game.aimPoint.copy(h.point)
  game.aimOnEnemy = !!h.enemy

  sky.position.copy(camera.position)
}

function updateSun() {
  const p = game.player.pos
  const f = game.lookDir
  sun.target.position.set(p.x + f.x * 10, 0, p.z + f.z * 10)
  sun.position.copy(sun.target.position).addScaledVector(SUN_DIR, 80)
}

function updateHud(dt) {
  const p = game.player
  const hud = game.hud
  const w = WEAPONS[p.wi]
  const a = p.ammo[p.wi]
  hud.setHealth(p.hp / p.maxHp)
  hud.setAmmo(w.name, a.mag, a.reserve, p.grenades, p.reloadT > 0, a.mag <= w.mag * 0.25)
  const spread = (p.aiming ? w.spreadAim : w.spreadHip) * (p.inCover && !p.aiming ? 2 : 1) + p.bloom + (p.speed > 5 ? 0.02 : 0)
  hud.setCrosshair(4 + spread * 420, !p.dead && !p.sprinting && p.rollT < 0, game.aimOnEnemy)

  const tg = game.director.target
  if (tg && !p.dead) {
    const dist = Math.hypot(tg.x - p.pos.x, tg.z - p.pos.z)
    _a.set(tg.x, 1.6, tg.z).project(camera)
    const W = window.innerWidth
    const H = window.innerHeight
    let x = (_a.x * 0.5 + 0.5) * W
    let y = (-_a.y * 0.5 + 0.5) * H
    if (_a.z > 1) { x = W - x; y = H - 60 }
    hud.waypoint(clamp(x, 50, W - 50), clamp(y, 90, H - 90), dist, dist > 3)
  } else hud.waypoint(0, 0, 0, false)
  hud.update(dt)
}

// ---------- Estados ----------

let lastUnlock = 0
let lockFails = 0
let unlockedT = 0

function lock() {
  if (game.input.touch || game.input.freeLook || game.input.locked) return
  try {
    const r = canvas.requestPointerLock()
    if (r && r.catch) r.catch(() => onLockError())
  } catch { onLockError() }
}

function onLockError() {
  if (game.input.locked) return
  if (performance.now() - lastUnlock < 2200) { setTimeout(() => { if (game.state === 'playing') lock() }, 1300); return }
  lockFails++
  if (lockFails >= 2) enableFreeLook()
}

function enableFreeLook() {
  if (game.input.freeLook) return
  game.input.freeLook = true
  canvas.style.cursor = 'crosshair'
  game.hud.hint('Puntero libre: mueve el ratón sobre el juego o usa las flechas para girar', 6)
}

function start() {
  game.audio.init()
  game.audio.setVolume(Number($('opt-vol').value))
  game.state = 'playing'
  showScreen(null)
  game.hud.show(true)
  game.hud.fade(false)
  game.director.begin()
  if (game.input.touch && window.innerHeight > window.innerWidth) game.hud.hint('Si puedes girar el teléfono, en horizontal se ve más campo', 5)
  lock()
}

function pause() {
  if (game.state !== 'playing') return
  game.state = 'paused'
  game.input.reset()
  if (touchUi) touchUi.releaseAll()
  showScreen('pause')
  game.audio.suspend(true)
  if (document.pointerLockElement) document.exitPointerLock()
}

function resume() {
  if (game.state !== 'paused') return
  game.state = 'playing'
  showScreen(null)
  game.audio.suspend(false)
  lock()
}

function retry() {
  game.director.respawn()
  game.state = 'playing'
  showScreen(null)
  game.hud.show(true)
  lock()
}

function win() {
  const p = game.player
  game.state = 'won'
  game.hud.show(false)
  game.audio.play('win')
  const s = p.stats
  const acc = s.shots ? Math.round((s.hits / s.shots) * 100) : 0
  const t = Math.round(game.playTime)
  const mm = String(Math.floor(t / 60)).padStart(2, '0')
  const ss = String(t % 60).padStart(2, '0')
  $('stats').innerHTML = [['Tiempo', `${mm}:${ss}`], ['Máquinas', s.kills], ['Precisión', acc + ' %'], ['Caídas', s.deaths]]
    .map(([k, v]) => `<div><b>${v}</b><span>${k}</span></div>`).join('')
  showScreen('win')
  if (document.pointerLockElement) document.exitPointerLock()
}
game.win = win

function setQuality(q) {
  const dpr = window.devicePixelRatio || 1
  renderer.setPixelRatio(q === 2 ? Math.min(dpr, 2) : q === 1 ? Math.min(dpr, 1.25) : Math.min(dpr, 1) * 0.75)
  const on = q > 0
  if (renderer.shadowMap.enabled !== on) {
    renderer.shadowMap.enabled = on
    scene.traverse((o) => { if (o.material && o.material.isMaterial) o.material.needsUpdate = true })
  }
  const size = q === 2 ? 2048 : 1536
  if (sun.shadow.mapSize.x !== size) {
    sun.shadow.mapSize.set(size, size)
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null }
  }
  game.quality = q
  resize()
}

function resize() {
  const w = window.innerWidth
  const h = window.innerHeight
  renderer.setSize(w, h, false)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  game.fx.setViewport(renderer.domElement.height, camera.fov)
}

// ---------- Eventos ----------

const inp = game.input
window.addEventListener('keydown', (e) => {
  if (game.state === 'playing' && ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault()
  if (e.repeat) return
  inp.keys.add(e.code)
  inp.pressedKeys.add(e.code)
  if (e.code === 'KeyP' || (e.code === 'Escape' && !inp.locked)) {
    if (game.state === 'playing') pause()
    else if (game.state === 'paused') resume()
  }
})
window.addEventListener('keyup', (e) => inp.keys.delete(e.code))
window.addEventListener('blur', () => { inp.reset(); if (game.state === 'playing') pause() })
document.addEventListener('visibilitychange', () => { if (document.hidden && game.state === 'playing') pause() })
// Tras un toque, el navegador emite eventos de ratón simulados: se ignoran.
const fromTouch = () => performance.now() - inp.lastTouch < 900
canvas.addEventListener('mousedown', (e) => {
  if (game.state !== 'playing' || fromTouch()) return
  if (!inp.locked && !inp.freeLook) lock()
  if (e.button < 3) { inp.buttons[e.button] = true; inp.buttonsPressed[e.button] = true }
  e.preventDefault()
})
window.addEventListener('mouseup', (e) => { if (e.button < 3) inp.buttons[e.button] = false })
window.addEventListener('mousemove', (e) => {
  if (game.state !== 'playing' || fromTouch()) return
  if (inp.locked || inp.freeLook) { inp.dx += e.movementX || 0; inp.dy += e.movementY || 0 }
})
window.addEventListener('wheel', (e) => { if (game.state === 'playing') inp.wheel += Math.sign(e.deltaY) }, { passive: true })
canvas.addEventListener('contextmenu', (e) => e.preventDefault())
document.addEventListener('pointerlockchange', () => {
  inp.locked = document.pointerLockElement === canvas
  if (inp.locked) lockFails = 0
  else {
    lastUnlock = performance.now()
    if (game.state === 'playing' && !inp.freeLook && game.deathT <= 0) pause()
  }
})
document.addEventListener('pointerlockerror', onLockError)
window.addEventListener('resize', resize)

$('btn-play').addEventListener('click', start)
$('btn-resume').addEventListener('click', resume)
$('btn-retry').addEventListener('click', retry)
$('btn-restart').addEventListener('click', () => location.reload())
$('btn-again').addEventListener('click', () => location.reload())
$('opt-quality').addEventListener('change', (e) => setQuality(Number(e.target.value)))
for (const id of ['opt-sens', 'opt-sens2']) $(id).addEventListener('input', (e) => {
  game.sens = Number(e.target.value)
  $('opt-sens').value = $('opt-sens2').value = e.target.value
})
for (const id of ['opt-vol', 'opt-vol2']) $(id).addEventListener('input', (e) => {
  game.audio.setVolume(Number(e.target.value))
  $('opt-vol').value = $('opt-vol2').value = e.target.value
})

// ---------- Bucle ----------

function update(dt) {
  const p = game.player
  game.time += dt
  if (!p.dead) {
    game.playTime += dt
    const k = 0.0023 * game.sens * (p.aiming ? 0.6 : 1)
    game.camYaw -= inp.dx * k
    game.camPitch -= inp.dy * k
    const ax = (inp.down('ArrowLeft') ? 1 : 0) - (inp.down('ArrowRight') ? 1 : 0)
    const ay = (inp.down('ArrowUp') ? 1 : 0) - (inp.down('ArrowDown') ? 1 : 0)
    game.camYaw += ax * 2.2 * dt * (p.aiming ? 0.5 : 1)
    game.camPitch += ay * 1.4 * dt * (p.aiming ? 0.5 : 1)
  } else {
    game.camYaw += dt * 0.25
    game.camPitch = damp(game.camPitch, -0.3, 2, dt)
    if (game.deathT > 0) {
      game.deathT -= dt
      if (game.deathT <= 0 && game.state === 'playing') {
        game.state = 'dead'
        showScreen('dead')
        game.hud.show(false)
        if (document.pointerLockElement) document.exitPointerLock()
      }
    }
  }
  game.camPitch = clamp(game.camPitch, -1.05, 1.15)

  // Si el navegador ignora la captura del puntero (por ejemplo dentro de un marco), se pasa a puntero libre.
  if (!inp.locked && !inp.freeLook) {
    unlockedT += dt
    if (unlockedT > 2.5) enableFreeLook()
  } else unlockedT = 0

  p.update(dt)
  game.enemies.update(dt)
  game.director.update(dt)
  game.level.update(dt)
  game.fx.update(dt)
  updateCamera(dt)
  updateSun()
  updateHud(dt)
  if (touchUi) touchUi.sync()

  const alive = game.enemies.aliveCount()
  const boss = game.enemies.boss
  game.audio.listener.x = p.pos.x
  game.audio.listener.z = p.pos.z
  game.audio.listener.yaw = game.camYaw
  game.audio.update(dt, boss && boss.alive ? 1 : alive > 0 ? clamp(0.45 + alive / 10, 0, 1) : 0)
}

function idle(dt) {
  // Menú y pantalla final: cámara en órbita lenta.
  game.time += dt
  const p = game.player
  const cx = game.state === 'won' ? p.pos.x : 0
  const cz = game.state === 'won' ? p.pos.z : -6
  const a = game.time * 0.07 + 0.6
  camera.position.set(cx + Math.sin(a) * 15, 4.6, cz + Math.cos(a) * 15)
  camera.lookAt(cx, 1.6, cz - 3)
  sky.position.copy(camera.position)
  sun.target.position.set(cx, 0, cz)
  sun.position.copy(sun.target.position).addScaledVector(SUN_DIR, 80)
  game.level.update(dt)
  game.fx.update(dt)
  p.model.root.position.copy(p.pos)
  p.model.root.rotation.y = p.yaw
  p.model.update(dt, { speed: 0, crouch: 0, aim: 0, pitch: 0, roll: -1, vault: -1, melee: -1, dead: false, sprint: false })
  if (game.state === 'won') game.enemies.update(dt)
}

let last = performance.now()
let slowFrames = 0
let shownState = ''
function frame(now) {
  requestAnimationFrame(frame)
  const raw = (now - last) / 1000
  last = now
  const dt = Math.min(0.05, raw)
  if (game.state === 'playing' || game.state === 'dead') {
    update(dt)
    // Si el equipo no llega a 30 fps de forma sostenida, baja la calidad sola.
    if (game.state === 'playing' && game.quality > 0) {
      slowFrames = raw > 0.04 ? slowFrames + 1 : Math.max(0, slowFrames - 2)
      if (slowFrames > 150) {
        slowFrames = 0
        setQuality(game.quality - 1)
        $('opt-quality').value = String(game.quality)
        game.hud.hint('Calidad gráfica reducida para mantener la fluidez', 3)
      }
    }
  } else if (game.state === 'menu' || game.state === 'won') idle(dt)
  renderer.render(scene, camera)
  inp.endFrame()
  if (game.state !== shownState) {
    shownState = game.state
    document.body.classList.toggle('playing', shownState === 'playing')
  }
}

// Los controles táctiles se activan en móviles y tabletas, o al primer toque en equipos híbridos.
let touchUi = null
const enableTouch = () => { if (!touchUi) touchUi = setupTouch(game, pause) }
if (isTouchDevice()) enableTouch()
else window.addEventListener('touchstart', enableTouch, { once: true, passive: true })

setQuality(1)
game.hud.setObjective('')
setTimeout(() => game.hud.fade(false), 60)
// Avance manual de la simulación, usado por las pruebas automáticas.
game.step = (n, dt = 1 / 30) => { for (let i = 0; i < n; i++) { update(dt); inp.endFrame() } }
window.__salar = game
requestAnimationFrame(frame)
