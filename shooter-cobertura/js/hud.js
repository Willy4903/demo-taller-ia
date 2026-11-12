// Interfaz en pantalla: vida, munición, objetivo, mirilla, avisos y pantallas.
const $ = (id) => document.getElementById(id)

export class Hud {
  constructor() {
    this.el = {
      hud: $('hud'), healthFill: $('health-fill'), healthWrap: $('health'), mag: $('ammo-mag'), res: $('ammo-res'),
      weapon: $('weapon-name'), grenades: $('grenades'), objective: $('objective-text'), prompt: $('prompt'),
      cross: $('crosshair'), hit: $('hitmarker'), dmg: $('dmg-layer'), sub: $('subtitle'), banner: $('banner'),
      boss: $('boss'), bossFill: $('boss-fill'), way: $('waypoint'), wayDist: $('waypoint-dist'), vignette: $('vignette'),
      hint: $('hint'), fade: $('fade'), reload: $('reload-tag'),
    }
    this.subT = 0
    this.bannerT = 0
    this.hintT = 0
    this.hitT = 0
    this.lastPrompt = null
    this.cache = {}
    this.touch = false
  }

  set(key, el, prop, value) {
    if (this.cache[key] === value) return
    this.cache[key] = value
    el[prop] = value
  }

  setHealth(f) {
    const pct = Math.round(Math.max(0, f) * 100)
    this.set('hp', this.el.healthFill.style, 'width', pct + '%')
    this.set('hpLow', this.el.healthWrap, 'className', f < 0.35 ? 'low' : '')
    this.set('vig', this.el.vignette.style, 'opacity', String(Math.round(Math.max(0, 1 - f * 1.35) * 20) / 20))
  }

  setAmmo(name, mag, reserve, grenades, reloading, lowMag) {
    this.set('wn', this.el.weapon, 'textContent', name)
    this.set('mag', this.el.mag, 'textContent', String(mag))
    this.set('res', this.el.res, 'textContent', String(reserve))
    this.set('magLow', this.el.mag, 'className', lowMag ? 'low' : '')
    this.set('gr', this.el.grenades, 'textContent', '◆'.repeat(grenades) + '◇'.repeat(Math.max(0, 4 - grenades)))
    this.set('rl', this.el.reload.style, 'opacity', reloading ? '1' : '0')
  }

  setObjective(text) {
    if (this.cache.obj === text) return
    this.cache.obj = text
    this.el.objective.textContent = text
    const p = this.el.objective.parentElement
    p.classList.remove('pulse')
    void p.offsetWidth
    p.classList.add('pulse')
  }

  setPrompt(html) {
    if (html === this.lastPrompt) return
    this.lastPrompt = html
    if (html && this.touch) {
      // En pantalla táctil el aviso es un botón: al tocarlo se ejecuta la acción.
      this.el.prompt.dataset.key = html.includes('ESPACIO') ? 'Space' : 'KeyE'
      html = html.replace(/<kbd>.*?<\/kbd>/, '<kbd>TOCA</kbd>')
    }
    this.el.prompt.innerHTML = html || ''
    this.el.prompt.style.opacity = html ? '1' : '0'
  }

  setCrosshair(gap, visible, onEnemy) {
    this.set('cg', this.el.cross.style, 'cssText', `--gap:${gap.toFixed(1)}px;opacity:${visible ? 1 : 0}`)
    this.set('ce', this.el.cross, 'className', onEnemy ? 'enemy' : '')
  }

  hitmarker(kind) {
    const h = this.el.hit
    h.className = kind
    h.style.opacity = '1'
    this.hitT = kind === 'kill' ? 0.3 : 0.14
  }

  damageFrom(rel) {
    const d = document.createElement('div')
    d.className = 'dmg'
    d.style.transform = `translate(-50%,-50%) rotate(${(-rel * 180) / Math.PI}deg)`
    this.el.dmg.appendChild(d)
    setTimeout(() => d.remove(), 900)
  }

  subtitle(speaker, text, dur = 5) {
    this.el.sub.innerHTML = `<b>${speaker}</b> ${text}`
    this.el.sub.style.opacity = '1'
    this.subT = dur
  }

  banner(title, sub, dur = 3.6) {
    this.el.banner.innerHTML = `<h2>${title}</h2><p>${sub || ''}</p>`
    this.el.banner.classList.remove('show')
    void this.el.banner.offsetWidth
    this.el.banner.classList.add('show')
    this.bannerT = dur
  }

  hint(text, dur = 4) {
    this.el.hint.textContent = text
    this.el.hint.style.opacity = '1'
    this.hintT = dur
  }

  boss(visible, frac, vulnerable) {
    this.set('bv', this.el.boss.style, 'opacity', visible ? '1' : '0')
    if (!visible) return
    this.set('bf', this.el.bossFill.style, 'width', Math.max(0, frac * 100).toFixed(1) + '%')
    this.set('bc', this.el.boss, 'className', vulnerable ? 'vent' : '')
  }

  waypoint(x, y, dist, visible) {
    const w = this.el.way
    if (!visible) { this.set('wv', w.style, 'opacity', '0'); return }
    this.set('wv', w.style, 'opacity', '1')
    w.style.transform = `translate(${x.toFixed(0)}px,${y.toFixed(0)}px)`
    this.set('wd', this.el.wayDist, 'textContent', Math.round(dist) + ' m')
  }

  show(on) {
    this.el.hud.style.opacity = on ? '1' : '0'
  }

  fade(opaque) {
    this.el.fade.style.opacity = opaque ? '1' : '0'
  }

  update(dt) {
    if (this.subT > 0) { this.subT -= dt; if (this.subT <= 0) this.el.sub.style.opacity = '0' }
    if (this.bannerT > 0) { this.bannerT -= dt; if (this.bannerT <= 0) this.el.banner.classList.remove('show') }
    if (this.hintT > 0) { this.hintT -= dt; if (this.hintT <= 0) this.el.hint.style.opacity = '0' }
    if (this.hitT > 0) { this.hitT -= dt; if (this.hitT <= 0) this.el.hit.style.opacity = '0' }
  }
}

export function showScreen(name) {
  for (const id of ['menu', 'pause', 'dead', 'win']) $(id).classList.toggle('open', id === name)
}
