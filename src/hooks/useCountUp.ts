import { useEffect, useRef, useState } from 'react'

const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** Anima un número desde su valor anterior hasta el nuevo. */
export function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0)
  const from = useRef(0)

  useEffect(() => {
    if (reduced()) {
      from.current = target
      const id = requestAnimationFrame(() => setValue(target))
      return () => cancelAnimationFrame(id)
    }
    const start = performance.now()
    const origin = from.current
    let frame = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      const current = origin + (target - origin) * eased
      from.current = current
      setValue(current)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, duration])

  return Math.round(value)
}
