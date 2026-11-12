// Controles táctiles: joystick virtual a la izquierda, arrastre para mirar a la derecha y botones de acción.
import { clamp } from './util.js'

const STICK_R = 56
const LOOK = 2.5

export function isTouchDevice() {
  return ('ontouchstart' in window || navigator.maxTouchPoints > 0) && window.matchMedia('(pointer: coarse)').matches
}

export function setupTouch(game, onPause) {
  const inp = game.input
  const layer = document.getElementById('touch')
  const stick = document.getElementById('stick')
  const knob = stick.firstElementChild
  const aimBtn = layer.querySelector('[data-act="aim"]')
  const prompt = document.getElementById('prompt')
  const active = new Map()
  let stickId = null
  let baseX = 0
  let baseY = 0

  inp.touch = true
  inp.freeLook = true
  game.hud.touch = true
  document.body.classList.add('touch')

  const KEYS = { cover: 'Space', reload: 'KeyR', grenade: 'KeyG', swap: 'KeyQ', melee: 'KeyF' }

  const releaseStick = () => {
    stickId = null
    inp.tx = inp.tz = 0
    stick.classList.remove('on')
  }

  const releaseAll = () => {
    active.clear()
    releaseStick()
    inp.buttons[0] = false
    layer.querySelectorAll('.held').forEach((b) => b.classList.remove('held'))
  }

  function start(e) {
    inp.lastTouch = performance.now()
    if (game.state !== 'playing') return
    e.preventDefault()
    for (const t of e.changedTouches) {
      // El aviso contextual (cubrirse, interactuar) actúa como botón.
      if (game.hud.lastPrompt) {
        const r = prompt.getBoundingClientRect()
        if (t.clientX > r.left - 10 && t.clientX < r.right + 10 && t.clientY > r.top - 10 && t.clientY < r.bottom + 10) {
          if (prompt.dataset.key) inp.pressedKeys.add(prompt.dataset.key)
          continue
        }
      }
      const el = t.target.closest ? t.target.closest('[data-act]') : null
      const act = el ? el.dataset.act : null
      if (act === 'pause') { releaseAll(); onPause(); return }
      if (act === 'fire') {
        inp.buttons[0] = true
        inp.buttonsPressed[0] = true
        el.classList.add('held')
        active.set(t.identifier, { type: 'fire', x: t.clientX, y: t.clientY, el })
      } else if (act === 'aim') {
        inp.buttons[2] = !inp.buttons[2]
      } else if (act) {
        inp.pressedKeys.add(KEYS[act])
        el.classList.add('held')
        active.set(t.identifier, { type: 'tap', el })
      } else if (t.clientX < window.innerWidth * 0.42 && stickId === null) {
        stickId = t.identifier
        baseX = t.clientX
        baseY = t.clientY
        stick.style.left = baseX + 'px'
        stick.style.top = baseY + 'px'
        knob.style.transform = 'translate(-50%, -50%)'
        stick.classList.add('on')
        active.set(t.identifier, { type: 'stick' })
      } else {
        active.set(t.identifier, { type: 'look', x: t.clientX, y: t.clientY })
      }
    }
  }

  function move(e) {
    if (game.state !== 'playing') return
    e.preventDefault()
    for (const t of e.changedTouches) {
      const a = active.get(t.identifier)
      if (!a) continue
      if (a.type === 'stick') {
        const rx = t.clientX - baseX
        const ry = t.clientY - baseY
        const d = Math.hypot(rx, ry)
        const ux = d > 0 ? rx / d : 0
        const uy = d > 0 ? ry / d : 0
        const k = Math.min(1, d / STICK_R)
        knob.style.transform = `translate(calc(-50% + ${(ux * k * STICK_R).toFixed(0)}px), calc(-50% + ${(uy * k * STICK_R).toFixed(0)}px))`
        // Zona muerta pequeña para que el pulgar en reposo no mueva al personaje.
        const m = k < 0.14 ? 0 : (k - 0.14) / 0.86
        inp.tx = clamp(ux * m, -1, 1)
        inp.tz = clamp(-uy * m, -1, 1)
      } else if (a.type === 'look' || a.type === 'fire') {
        inp.dx += (t.clientX - a.x) * LOOK
        inp.dy += (t.clientY - a.y) * LOOK
        a.x = t.clientX
        a.y = t.clientY
      }
    }
  }

  function end(e) {
    inp.lastTouch = performance.now()
    for (const t of e.changedTouches) {
      const a = active.get(t.identifier)
      if (!a) continue
      active.delete(t.identifier)
      if (a.type === 'stick') releaseStick()
      else if (a.type === 'fire') { inp.buttons[0] = false; a.el.classList.remove('held') }
      else if (a.type === 'tap') a.el.classList.remove('held')
    }
    if (game.state === 'playing') e.preventDefault()
  }

  const opt = { passive: false }
  window.addEventListener('touchstart', start, opt)
  window.addEventListener('touchmove', move, opt)
  window.addEventListener('touchend', end, opt)
  window.addEventListener('touchcancel', end, opt)
  // Safari en iOS: sin zoom por pellizco ni por doble toque durante la partida.
  for (const ev of ['gesturestart', 'gesturechange', 'dblclick']) document.addEventListener(ev, (e) => e.preventDefault(), opt)

  return {
    releaseAll,
    // Refleja el estado real (apuntado activo o no) en el botón.
    sync() { aimBtn.classList.toggle('on', !!inp.buttons[2]) },
  }
}
