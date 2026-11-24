import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env, isSupabaseConfigured, missingEnvKeys } from '@/config/env'

/**
 * Cliente único de Supabase.
 *
 * Seguridad:
 *  - Solo se usa la clave pública (anon/publishable). El acceso a datos depende
 *    de las políticas RLS, no de la clave.
 *  - NUNCA incluir la clave service_role en el frontend: daría acceso total.
 *  - Si faltan variables de entorno, se crea un cliente inerte para que la app
 *    muestre un aviso claro en pantalla en lugar de fallar en blanco.
 */
export const supabase: SupabaseClient = createClient(
  env.supabaseUrl || 'https://placeholder.supabase.co',
  env.supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
    global: {
      headers: { 'x-application-name': 'barberia-template' },
    },
  },
)

export { isSupabaseConfigured, missingEnvKeys }

/** Nombre del bucket de Supabase Storage para imágenes (crear según docs). */
export const PUBLIC_ASSETS_BUCKET = 'public-assets'
