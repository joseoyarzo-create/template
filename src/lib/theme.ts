import { businessConfig } from '@/config/business.config'

/**
 * Gestión del tema visual.
 *
 * Los colores viven como variables CSS en formato "R G B" para que Tailwind
 * pueda aplicarlos con opacidad (rgb(var(--brand-primary) / 0.5)).
 * Así cada despliegue puede tener su propia identidad sin recompilar el CSS.
 */

export interface ThemeInput {
  primary?: string | null
  ink?: string | null
}

export interface RgbTriplet {
  r: number
  g: number
  b: number
}

/** "#C9A227" -> { r: 201, g: 162, b: 39 } */
export function hexToRgb(hex: string): RgbTriplet | null {
  const clean = (hex || '').trim().replace('#', '')
  if (![3, 6].includes(clean.length)) return null
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean
  const num = Number.parseInt(full, 16)
  if (Number.isNaN(num)) return null
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
}

function toTripletString({ r, g, b }: RgbTriplet): string {
  return `${r} ${g} ${b}`
}

/** Aclara u oscurece un color mezclándolo con blanco/negro. */
export function shade(hex: string, amount: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  const target = amount >= 0 ? 255 : 0
  const ratio = Math.abs(amount)
  const mix = (channel: number) => Math.round(channel + (target - channel) * ratio)
  return toTripletString({ r: mix(rgb.r), g: mix(rgb.g), b: mix(rgb.b) })
}

/**
 * Aplica la identidad visual al documento.
 * Se llama al iniciar la app con los valores por defecto y de nuevo cuando
 * llegan los colores configurados en `businesses`.
 */
export function applyTheme({ primary, ink }: ThemeInput = {}): void {
  const root = document.documentElement
  const primaryHex = primary || businessConfig.brand.primary
  const inkHex = ink || businessConfig.brand.ink

  const primaryRgb = hexToRgb(primaryHex) ?? hexToRgb(businessConfig.brand.primary)!
  const inkRgb = hexToRgb(inkHex) ?? hexToRgb(businessConfig.brand.ink)!

  root.style.setProperty('--brand-primary', toTripletString(primaryRgb))
  root.style.setProperty('--brand-primary-soft', shade(primaryHex, 0.35))
  root.style.setProperty('--ink-950', toTripletString(inkRgb))
  root.style.setProperty(
    '--ink-900',
    toTripletString({
      r: Math.min(255, inkRgb.r + 10),
      g: Math.min(255, inkRgb.g + 10),
      b: Math.min(255, inkRgb.b + 12),
    }),
  )
  root.style.setProperty(
    '--ink-800',
    toTripletString({
      r: Math.min(255, inkRgb.r + 20),
      g: Math.min(255, inkRgb.g + 20),
      b: Math.min(255, inkRgb.b + 24),
    }),
  )
  root.style.setProperty(
    '--ink-700',
    toTripletString({
      r: Math.min(255, inkRgb.r + 34),
      g: Math.min(255, inkRgb.g + 34),
      b: Math.min(255, inkRgb.b + 40),
    }),
  )
  root.style.setProperty(
    '--ink-600',
    toTripletString({
      r: Math.min(255, inkRgb.r + 52),
      g: Math.min(255, inkRgb.g + 52),
      b: Math.min(255, inkRgb.b + 60),
    }),
  )

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', inkHex)
}
