// Texturas procedurales (canvas) y materiales. No se usa ningún recurso externo.
import * as THREE from '../vendor/three.module.min.js'

function makeCanvas(size, draw) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  draw(c.getContext('2d'), size)
  return c
}

function tex(c, srgb = true) {
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

function grain(g, s, n, alpha) {
  for (let i = 0; i < n; i++) {
    const a = alpha * Math.random()
    g.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`
    const r = 1 + Math.random() * 2
    g.fillRect(Math.random() * s, Math.random() * s, r, r)
  }
}

function blotches(g, s, n, rgb, maxR, alpha) {
  for (let i = 0; i < n; i++) {
    const x = Math.random() * s
    const y = Math.random() * s
    const r = maxR * (0.3 + Math.random() * 0.7)
    const gr = g.createRadialGradient(x, y, 0, x, y, r)
    gr.addColorStop(0, `rgba(${rgb},${alpha})`)
    gr.addColorStop(1, `rgba(${rgb},0)`)
    g.fillStyle = gr
    g.fillRect(x - r, y - r, r * 2, r * 2)
  }
}

function cracks(g, s, n, color, width) {
  g.strokeStyle = color
  g.lineWidth = width
  for (let i = 0; i < n; i++) {
    let x = Math.random() * s
    let y = Math.random() * s
    let a = Math.random() * Math.PI * 2
    g.beginPath()
    g.moveTo(x, y)
    const steps = 6 + ((Math.random() * 10) | 0)
    for (let k = 0; k < steps; k++) {
      a += (Math.random() - 0.5) * 1.1
      x += Math.cos(a) * s * 0.03
      y += Math.sin(a) * s * 0.03
      g.lineTo(x, y)
    }
    g.stroke()
  }
}

const concreteCanvas = (base) => makeCanvas(512, (g, s) => {
  g.fillStyle = base
  g.fillRect(0, 0, s, s)
  blotches(g, s, 26, '40,36,34', 120, 0.16)
  blotches(g, s, 18, '255,240,225', 90, 0.1)
  grain(g, s, 9000, 0.12)
  cracks(g, s, 7, 'rgba(30,26,24,0.5)', 1.2)
  g.strokeStyle = 'rgba(20,18,16,0.35)'
  g.lineWidth = 3
  g.strokeRect(1, 1, s - 2, s - 2)
})

const panelCanvas = (base, seams = 2) => makeCanvas(512, (g, s) => {
  g.fillStyle = base
  g.fillRect(0, 0, s, s)
  blotches(g, s, 16, '0,0,0', 140, 0.14)
  blotches(g, s, 10, '150,80,40', 70, 0.12)
  grain(g, s, 5000, 0.08)
  const step = s / seams
  for (let i = 0; i < seams; i++) {
    for (let j = 0; j < seams; j++) {
      const x = i * step
      const y = j * step
      g.strokeStyle = 'rgba(0,0,0,0.55)'
      g.lineWidth = 4
      g.strokeRect(x + 2, y + 2, step - 4, step - 4)
      g.strokeStyle = 'rgba(255,255,255,0.12)'
      g.lineWidth = 1.5
      g.strokeRect(x + 6, y + 6, step - 12, step - 12)
      g.fillStyle = 'rgba(0,0,0,0.5)'
      for (const [rx, ry] of [[16, 16], [step - 16, 16], [16, step - 16], [step - 16, step - 16]]) {
        g.beginPath()
        g.arc(x + rx, y + ry, 4, 0, 7)
        g.fill()
      }
    }
  }
  g.strokeStyle = 'rgba(255,255,255,0.08)'
  g.lineWidth = 1
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * s
    const y = Math.random() * s
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x + (Math.random() - 0.5) * 80, y + (Math.random() - 0.5) * 20)
    g.stroke()
  }
})

const corrugatedCanvas = (base, label) => makeCanvas(512, (g, s) => {
  g.fillStyle = base
  g.fillRect(0, 0, s, s)
  const ribs = 16
  const w = s / ribs
  for (let i = 0; i < ribs; i++) {
    const gr = g.createLinearGradient(i * w, 0, (i + 1) * w, 0)
    gr.addColorStop(0, 'rgba(0,0,0,0.38)')
    gr.addColorStop(0.35, 'rgba(255,255,255,0.14)')
    gr.addColorStop(0.7, 'rgba(0,0,0,0.05)')
    gr.addColorStop(1, 'rgba(0,0,0,0.38)')
    g.fillStyle = gr
    g.fillRect(i * w, 0, w, s)
  }
  blotches(g, s, 14, '110,55,25', 80, 0.28)
  blotches(g, s, 10, '0,0,0', 120, 0.15)
  grain(g, s, 5000, 0.08)
  g.fillStyle = 'rgba(0,0,0,0.5)'
  g.fillRect(0, 0, s, 14)
  g.fillRect(0, s - 14, s, 14)
  g.fillStyle = 'rgba(255,255,255,0.75)'
  g.font = 'bold 54px monospace'
  g.fillText(label, 40, 120)
  g.font = 'bold 22px monospace'
  g.fillText('SALAR ALTO · 4800 m', 40, 154)
})

const hazardCanvas = () => makeCanvas(256, (g, s) => {
  g.fillStyle = '#e2b021'
  g.fillRect(0, 0, s, s)
  g.fillStyle = '#17181a'
  for (let i = -4; i < 8; i++) {
    g.beginPath()
    g.moveTo(i * 64, 0)
    g.lineTo(i * 64 + 32, 0)
    g.lineTo(i * 64 + 32 + s, s)
    g.lineTo(i * 64 + s, s)
    g.closePath()
    g.fill()
  }
  grain(g, s, 2500, 0.14)
  blotches(g, s, 8, '0,0,0', 60, 0.2)
})

const asphaltCanvas = () => makeCanvas(512, (g, s) => {
  g.fillStyle = '#4a4543'
  g.fillRect(0, 0, s, s)
  grain(g, s, 16000, 0.16)
  blotches(g, s, 22, '235,215,205', 110, 0.16)
  blotches(g, s, 14, '0,0,0', 100, 0.2)
  cracks(g, s, 10, 'rgba(20,18,18,0.6)', 1.4)
})

const plateCanvas = () => makeCanvas(512, (g, s) => {
  g.fillStyle = '#3c4247'
  g.fillRect(0, 0, s, s)
  grain(g, s, 7000, 0.1)
  blotches(g, s, 12, '0,0,0', 110, 0.22)
  const step = s / 4
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      g.strokeStyle = 'rgba(0,0,0,0.6)'
      g.lineWidth = 3
      g.strokeRect(i * step + 1, j * step + 1, step - 2, step - 2)
      g.strokeStyle = 'rgba(255,255,255,0.07)'
      g.lineWidth = 2
      for (let k = 0; k < 5; k++) {
        const o = 20 + k * 20
        g.beginPath()
        g.moveTo(i * step + o, j * step + 18)
        g.lineTo(i * step + o + 14, j * step + 32)
        g.stroke()
      }
    }
  }
})

const saltCanvas = () => makeCanvas(512, (g, s) => {
  g.fillStyle = '#d9c3ba'
  g.fillRect(0, 0, s, s)
  blotches(g, s, 30, '255,245,240', 90, 0.35)
  blotches(g, s, 20, '190,120,110', 110, 0.2)
  grain(g, s, 6000, 0.06)
  // Polígonos de desecación: rejilla irregular.
  const n = 6
  const pts = []
  for (let j = 0; j <= n; j++) {
    for (let i = 0; i <= n; i++) {
      const jx = i === 0 || i === n ? 0 : (Math.random() - 0.5) * 0.6
      const jy = j === 0 || j === n ? 0 : (Math.random() - 0.5) * 0.6
      pts.push([((i + jx) * s) / n, ((j + jy) * s) / n])
    }
  }
  g.strokeStyle = 'rgba(255,250,246,0.85)'
  g.lineWidth = 3
  g.beginPath()
  for (let j = 0; j <= n; j++) {
    for (let i = 0; i <= n; i++) {
      const p = pts[j * (n + 1) + i]
      if (i < n) { const q = pts[j * (n + 1) + i + 1]; g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]) }
      if (j < n) { const q = pts[(j + 1) * (n + 1) + i]; g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]) }
    }
  }
  g.stroke()
})

const crateCanvas = () => makeCanvas(256, (g, s) => {
  g.fillStyle = '#5c6a5e'
  g.fillRect(0, 0, s, s)
  grain(g, s, 3000, 0.1)
  blotches(g, s, 8, '0,0,0', 70, 0.2)
  g.strokeStyle = 'rgba(0,0,0,0.6)'
  g.lineWidth = 10
  g.strokeRect(5, 5, s - 10, s - 10)
  g.lineWidth = 6
  g.beginPath()
  g.moveTo(14, 14); g.lineTo(s - 14, s - 14)
  g.moveTo(s - 14, 14); g.lineTo(14, s - 14)
  g.stroke()
  g.fillStyle = '#d8d2c4'
  g.fillRect(s / 2 - 46, s / 2 - 22, 92, 44)
  g.fillStyle = '#1b1c1e'
  g.font = 'bold 20px monospace'
  g.fillText('Li2CO3', s / 2 - 38, s / 2 + 7)
})

export function createMaterials() {
  const std = (o) => new THREE.MeshStandardMaterial(o)
  const textured = (canvas, o = {}) => std({ map: tex(canvas), bumpMap: tex(canvas, false), bumpScale: 1.2, roughness: 0.88, ...o })

  const M = {
    concrete: textured(concreteCanvas('#8f8a83'), { roughness: 0.95 }),
    concreteDark: textured(concreteCanvas('#5e5a57'), { roughness: 0.95 }),
    asphalt: textured(asphaltCanvas(), { roughness: 0.97 }),
    plate: textured(plateCanvas(), { roughness: 0.6, metalness: 0.5 }),
    platform: textured(concreteCanvas('#6f6a66'), { roughness: 0.9 }),
    salt: textured(saltCanvas(), { roughness: 1 }),
    wallMetal: textured(panelCanvas('#51606a'), { roughness: 0.62, metalness: 0.45 }),
    machine: textured(panelCanvas('#7a8086', 3), { roughness: 0.55, metalness: 0.55 }),
    machineYellow: textured(panelCanvas('#c39420', 2), { roughness: 0.6, metalness: 0.35 }),
    tank: textured(panelCanvas('#d7d1c3', 2), { roughness: 0.5, metalness: 0.3 }),
    containerTeal: textured(corrugatedCanvas('#1f6f73', 'SA-0417'), { roughness: 0.7, metalness: 0.3 }),
    containerRust: textured(corrugatedCanvas('#9b4a2a', 'SA-1182'), { roughness: 0.75, metalness: 0.3 }),
    containerCream: textured(corrugatedCanvas('#c9b98f', 'SA-0093'), { roughness: 0.7, metalness: 0.25 }),
    crate: textured(crateCanvas(), { roughness: 0.8 }),
    hazard: textured(hazardCanvas(), { roughness: 0.75 }),
    darkMetal: std({ color: 0x23272c, roughness: 0.55, metalness: 0.7 }),
    steel: std({ color: 0x8b949b, roughness: 0.4, metalness: 0.8 }),
    rust: std({ color: 0x7a4a33, roughness: 0.85, metalness: 0.3 }),
    rubber: std({ color: 0x161719, roughness: 0.95 }),
    paint: std({ color: 0xe9dfc8, roughness: 0.9 }),
    black: std({ color: 0x050607, roughness: 1 }),
    glowTeal: std({ color: 0x0c2a2c, emissive: 0x39e6d2, emissiveIntensity: 2.2 }),
    glowWarm: std({ color: 0x33200c, emissive: 0xffb45a, emissiveIntensity: 2.6 }),
    glowRed: std({ color: 0x330806, emissive: 0xff2410, emissiveIntensity: 1.6 }),
    glowGreen: std({ color: 0x08300f, emissive: 0x52ff7a, emissiveIntensity: 2.2 }),
    screen: std({ color: 0x06181c, emissive: 0x1fb6c4, emissiveIntensity: 1.3, roughness: 0.3 }),
  }
  M.hazard.map.repeat.set(1, 1)
  return M
}

// Caja con UV proporcionales a su tamaño real, para que las texturas no se estiren.
export function boxGeo(w, h, d, tile = 2) {
  const g = new THREE.BoxGeometry(w, h, d)
  const uv = g.attributes.uv
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]]
  for (let f = 0; f < 6; f++) {
    const [su, sv] = dims[f]
    for (let i = 0; i < 4; i++) {
      const k = f * 4 + i
      uv.setXY(k, (uv.getX(k) * su) / tile, (uv.getY(k) * sv) / tile)
    }
  }
  uv.needsUpdate = true
  return g
}

export function planeGeo(w, d, tile = 4) {
  const g = new THREE.PlaneGeometry(w, d)
  const uv = g.attributes.uv
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / tile, (uv.getY(i) * d) / tile)
  uv.needsUpdate = true
  g.rotateX(-Math.PI / 2)
  return g
}
