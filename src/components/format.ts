export const ordinal = (n: number): string => `${n}.º`

export const signed = (n: number): string => (n > 0 ? `+${n}` : String(n))

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function shortDate(iso: string | null): string {
  if (!iso) return 'Sin fecha'
  const [, m, d] = iso.split('-')
  return `${Number(d)} ${MONTHS[Number(m) - 1] ?? ''}`
}

export function longDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${Number(d)} de ${MONTHS[Number(m) - 1] ?? ''} de ${y}`
}

export function download(filename: string, content: string): void {
  // BOM para que Excel reconozca UTF-8 con tildes.
  const blob = new Blob(['﻿', content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
