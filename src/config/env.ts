/**
 * Lectura y validación de variables de entorno.
 *
 * Toda la configuración "de despliegue" vive aquí. Al copiar el proyecto para
 * otra barbería, basta con cambiar el archivo .env (o las variables de
 * Cloudflare Pages) SIN tocar el código.
 */

function read(key: keyof ImportMetaEnv, fallback = ''): string {
  const raw = import.meta.env[key]
  if (raw === undefined || raw === null) return fallback
  return String(raw).trim()
}

function readNumber(key: keyof ImportMetaEnv, fallback: number): number {
  const value = Number(read(key))
  return Number.isFinite(value) && value > 0 ? value : fallback
}

/** Slug del negocio del ejemplo incluido en supabase/migrations/0004_seed_example.sql. */
const DEFAULT_BUSINESS_SLUG = 'barberia-demo'

/**
 * Lee el slug público del negocio.
 *
 * Si VITE_BUSINESS_SLUG no está definida, o llega con el *nombre* de la
 * variable como valor (error frecuente al crearla en paneles como Vercel),
 * se usa el slug del ejemplo de la plantilla para no dejar el sitio inutilizado.
 */
function readBusinessSlug(): string {
  const raw = read('VITE_BUSINESS_SLUG')
  return !raw || raw === 'VITE_BUSINESS_SLUG' ? DEFAULT_BUSINESS_SLUG : raw
}

export const env = {
  /** URL del proyecto Supabase. Ej: https://abcd.supabase.co */
  supabaseUrl: read('VITE_SUPABASE_URL'),
  /** Clave pública (anon / publishable). NUNCA la service_role. */
  supabaseAnonKey: read('VITE_SUPABASE_ANON_KEY'),
  /** Identificador público de esta instalación (coincide con businesses.slug). */
  businessSlug: readBusinessSlug(),
  /** Anticipación mínima para reservar, en minutos. */
  minLeadMinutes: readNumber('VITE_MIN_LEAD_MINUTES', 60),
  /** Máximo de días hacia adelante que se pueden reservar. */
  maxAdvanceDays: readNumber('VITE_MAX_ADVANCE_DAYS', 60),
  /** Muestra el enlace al panel administrativo en el sitio público. */
  showAdminLink: read('VITE_SHOW_ADMIN_LINK', 'true') !== 'false',
  /** Sobrescrituras opcionales de datos de contacto (tienen prioridad sobre la BD). */
  overrides: {
    name: read('VITE_BUSINESS_NAME'),
    phone: read('VITE_BUSINESS_PHONE'),
    whatsapp: read('VITE_BUSINESS_WHATSAPP'),
    address: read('VITE_BUSINESS_ADDRESS'),
  },
} as const

/** Indica si falta configuración externa imprescindible. */
export const missingEnvKeys: string[] = [
  !env.supabaseUrl ? 'VITE_SUPABASE_URL' : '',
  !env.supabaseAnonKey ? 'VITE_SUPABASE_ANON_KEY' : '',
  !env.businessSlug ? 'VITE_BUSINESS_SLUG' : '',
].filter(Boolean)

export const isSupabaseConfigured = missingEnvKeys.length === 0
