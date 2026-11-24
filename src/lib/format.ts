/** Formateadores de presentación (moneda CLP, teléfono, textos). */

const clpFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
})

/** 12000 -> "$12.000" */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '$0'
  return clpFormatter.format(value)
}

/** 1234 -> "$1.234" sin símbolo de moneda explícito adicional. */
export function formatPrice(value: number | null | undefined): string {
  return formatCurrency(value)
}

/**
 * Normaliza un teléfono chileno a formato internacional sin signos:
 * "+56 9 1234 5678" -> "56912345678"
 */
export function normalizePhone(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('56')) return digits
  if (digits.length === 9) return `56${digits}`
  return digits
}

/** Muestra un teléfono de forma legible: "56912345678" -> "+56 9 1234 5678". */
export function formatPhoneDisplay(phone: string | null | undefined): string {
  const digits = (phone || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('56') && digits.length >= 11) {
    const rest = digits.slice(2)
    const prefix = rest.slice(0, 1)
    const block1 = rest.slice(1, 5)
    const block2 = rest.slice(5, 9)
    return `+56 ${prefix} ${block1} ${block2}`.trim()
  }
  return phone || ''
}

/** Construye un enlace de WhatsApp con mensaje predefinido. */
export function whatsappLink(phone: string | null | undefined, message?: string): string {
  const normalized = normalizePhone(phone || '')
  if (!normalized) return ''
  const text = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/${normalized}${text}`
}

/** Iniciales para avatares. */
export function initials(name: string): string {
  return (name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

/** Trunca texto manteniendo palabras completas. */
export function truncate(text: string, max = 140): string {
  if (!text || text.length <= max) return text || ''
  return `${text.slice(0, max).trimEnd()}…`
}

/** Rango horario legible: "10:00 – 20:00". */
export function timeRange(start: string, end: string): string {
  const s = (start || '').slice(0, 5)
  const e = (end || '').slice(0, 5)
  return `${s} – ${e}`
}
