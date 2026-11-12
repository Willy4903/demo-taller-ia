// Utilidades matemáticas y de colisión compartidas por todo el juego.

export const TAU = Math.PI * 2
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
export const lerp = (a, b, t) => a + (b - a) * t
export const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt))
export const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a))
export const pick = (arr) => arr[(Math.random() * arr.length) | 0]
export const smooth = (t) => t * t * (3 - 2 * t)

export function angleDiff(a, b) {
  let d = (b - a) % TAU
  if (d > Math.PI) d -= TAU
  if (d < -Math.PI) d += TAU
  return d
}
export const dampAngle = (a, b, k, dt) => a + angleDiff(a, b) * (1 - Math.exp(-k * dt))

// Convención: con yaw = 0 se mira hacia -Z. forward = (-sin, 0, -cos), right = (cos, 0, -sin).
export const yawTo = (dx, dz) => Math.atan2(-dx, -dz)

// Normal del último impacto de rayBox.
export const hitN = { x: 0, y: 0, z: 0 }

// Rayo contra caja alineada a los ejes {minX,maxX,minZ,maxZ,y0,y1}. Devuelve t o -1.
// Si el origen está dentro de la caja no cuenta como impacto.
export function rayBox(ox, oy, oz, dx, dy, dz, b, maxT) {
  let tmin = -1e9
  let tmax = maxT
  let nx = 0
  let ny = 0
  let nz = 0
  if (Math.abs(dx) < 1e-9) {
    if (ox < b.minX || ox > b.maxX) return -1
  } else {
    const inv = 1 / dx
    let t1 = (b.minX - ox) * inv
    let t2 = (b.maxX - ox) * inv
    let s = -1
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; s = 1 }
    if (t1 > tmin) { tmin = t1; nx = s; ny = 0; nz = 0 }
    if (t2 < tmax) tmax = t2
    if (tmin > tmax) return -1
  }
  if (Math.abs(dy) < 1e-9) {
    if (oy < b.y0 || oy > b.y1) return -1
  } else {
    const inv = 1 / dy
    let t1 = (b.y0 - oy) * inv
    let t2 = (b.y1 - oy) * inv
    let s = -1
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; s = 1 }
    if (t1 > tmin) { tmin = t1; nx = 0; ny = s; nz = 0 }
    if (t2 < tmax) tmax = t2
    if (tmin > tmax) return -1
  }
  if (Math.abs(dz) < 1e-9) {
    if (oz < b.minZ || oz > b.maxZ) return -1
  } else {
    const inv = 1 / dz
    let t1 = (b.minZ - oz) * inv
    let t2 = (b.maxZ - oz) * inv
    let s = -1
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; s = 1 }
    if (t1 > tmin) { tmin = t1; nx = 0; ny = 0; nz = s }
    if (t2 < tmax) tmax = t2
    if (tmin > tmax) return -1
  }
  if (tmin < 0) return -1
  hitN.x = nx; hitN.y = ny; hitN.z = nz
  return tmin
}

// Rayo contra esfera. Devuelve t o -1.
export function raySphere(ox, oy, oz, dx, dy, dz, cx, cy, cz, r) {
  const lx = cx - ox
  const ly = cy - oy
  const lz = cz - oz
  const tc = lx * dx + ly * dy + lz * dz
  if (tc < 0) return -1
  const d2 = lx * lx + ly * ly + lz * lz - tc * tc
  const r2 = r * r
  if (d2 > r2) return -1
  const t = tc - Math.sqrt(r2 - d2)
  return t < 0 ? 0 : t
}

// Empuja un círculo (p.x, p.z, radio r) fuera de una caja. Devuelve true si hubo contacto.
export function pushOut(p, r, b) {
  const cx = clamp(p.x, b.minX, b.maxX)
  const cz = clamp(p.z, b.minZ, b.maxZ)
  const dx = p.x - cx
  const dz = p.z - cz
  const d2 = dx * dx + dz * dz
  if (d2 >= r * r) return false
  if (d2 > 1e-10) {
    const d = Math.sqrt(d2)
    const k = (r - d) / d
    p.x += dx * k
    p.z += dz * k
  } else {
    const l = p.x - b.minX
    const rr = b.maxX - p.x
    const t = p.z - b.minZ
    const bb = b.maxZ - p.z
    const m = Math.min(l, rr, t, bb)
    if (m === l) p.x = b.minX - r
    else if (m === rr) p.x = b.maxX + r
    else if (m === t) p.z = b.minZ - r
    else p.z = b.maxZ + r
  }
  return true
}
