/** Utilidades genéricas sin dependencias externas. */

/** Une clases condicionalmente. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

/** Genera un slug seguro: "Corte Clásico Ñuñoa" -> "corte-clasico-nunoa". */
export function slugify(value: string): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

/** Limita un número a un rango. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Agrupa un arreglo por una clave derivada. */
export function groupBy<T, K extends string | number>(
  items: T[],
  keyFn: (item: T) => K,
): Record<K, T[]> {
  return items.reduce((acc, item) => {
    const key = keyFn(item)
    ;(acc[key] ||= []).push(item)
    return acc
  }, {} as Record<K, T[]>)
}

/** Ordena de forma estable por un número. */
export function sortBy<T>(items: T[], keyFn: (item: T) => number): T[] {
  return [...items].sort((a, b) => keyFn(a) - keyFn(b))
}

/** Devuelve un rango de números [start, end]. */
export function range(start: number, end: number): number[] {
  const out: number[] = []
  for (let i = start; i <= end; i += 1) out.push(i)
  return out
}

/** Verifica si un color HEX es válido. */
export function isHexColor(value: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value || '')
}

/** Genera un identificador temporal para llaves de React o formularios. */
export function tempId(): string {
  return Math.random().toString(36).slice(2, 10)
}
