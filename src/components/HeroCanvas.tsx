import { useEffect, useRef } from 'react'

interface Mote {
  x: number
  y: number
  r: number
  v: number
  a: number
}

/** Fondo de estadio de noche: conos de luz que barren y polvo dorado en suspensión. */
export function HeroCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    let w = 0
    let h = 0
    let visible = true
    let frame = 0
    const motes: Mote[] = []

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      motes.length = 0
      const count = Math.round(Math.min(90, (w * h) / 14000))
      for (let i = 0; i < count; i++) {
        motes.push({ x: Math.random() * w, y: Math.random() * h, r: 0.6 + Math.random() * 1.6, v: 0.08 + Math.random() * 0.3, a: 0.2 + Math.random() * 0.6 })
      }
    }

    const draw = (time: number) => {
      const t = time / 1000
      const bg = ctx.createLinearGradient(0, 0, 0, h)
      bg.addColorStop(0, '#12040a')
      bg.addColorStop(0.55, '#3a070e')
      bg.addColorStop(1, '#1b0509')
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)

      ctx.globalCompositeOperation = 'lighter'
      const lamps = 5
      for (let i = 0; i < lamps; i++) {
        const baseX = (w * (i + 0.5)) / lamps
        const sway = Math.sin(t * 0.35 + i * 1.7) * w * 0.07
        const x0 = baseX + sway * 0.2
        const x1 = baseX + sway + (i - 2) * w * 0.05
        const spread = w * 0.09
        const g = ctx.createLinearGradient(0, 0, 0, h)
        g.addColorStop(0, 'rgba(255, 226, 150, 0.26)')
        g.addColorStop(0.6, 'rgba(226, 185, 71, 0.07)')
        g.addColorStop(1, 'rgba(226, 185, 71, 0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.moveTo(x0 - 6, 0)
        ctx.lineTo(x0 + 6, 0)
        ctx.lineTo(x1 + spread, h)
        ctx.lineTo(x1 - spread, h)
        ctx.closePath()
        ctx.fill()
      }

      for (const m of motes) {
        if (!still) {
          m.y -= m.v
          m.x += Math.sin(t + m.y * 0.01) * 0.08
          if (m.y < -4) {
            m.y = h + 4
            m.x = Math.random() * w
          }
        }
        ctx.fillStyle = `rgba(240, 208, 120, ${m.a * 0.55})`
        ctx.beginPath()
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2)
        ctx.fill()
      }

      const vignette = ctx.createRadialGradient(w / 2, h * 0.45, h * 0.2, w / 2, h * 0.5, Math.max(w, h) * 0.75)
      vignette.addColorStop(0, 'rgba(0,0,0,0)')
      vignette.addColorStop(1, 'rgba(0,0,0,0.65)')
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = vignette
      ctx.fillRect(0, 0, w, h)
    }

    const loop = (time: number) => {
      if (visible && !document.hidden) draw(time)
      frame = requestAnimationFrame(loop)
    }

    resize()
    const ro = new ResizeObserver(() => {
      resize()
      if (still) draw(0)
    })
    ro.observe(canvas)
    const io = new IntersectionObserver(([e]) => {
      visible = e?.isIntersecting ?? true
    })
    io.observe(canvas)
    if (still) draw(0)
    else frame = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(frame)
      ro.disconnect()
      io.disconnect()
    }
  }, [])

  return <canvas ref={ref} aria-hidden="true" className="absolute inset-0 h-full w-full" />
}
