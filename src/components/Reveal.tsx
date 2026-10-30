import { useEffect, useRef, useState, type ReactNode } from 'react'

export function Reveal({ children, className = '', id }: { children: ReactNode; className?: string; id?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      const frame = requestAnimationFrame(() => setShown(true))
      return () => cancelAnimationFrame(frame)
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={ref} id={id} className={`reveal scroll-mt-14 ${shown ? 'in' : ''} ${className}`}>
      {children}
    </div>
  )
}

export function SectionHead({ kicker, title, children }: { kicker: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-4 max-w-3xl">
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-dorado-700">{kicker}</p>
      <h2 className="font-display text-4xl font-extrabold uppercase leading-none text-granate-800 sm:text-5xl">{title}</h2>
      {children ? <p className="mt-2 text-sm text-tinta/80 sm:text-base">{children}</p> : null}
    </header>
  )
}
