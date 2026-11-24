import { supabase } from '@/lib/supabase'
import { unwrap, unwrapNullable } from '@/lib/errors'
import { env } from '@/config/env'
import type { Business, PublicCatalog } from '@/types/database'

/**
 * Lecturas públicas del sitio.
 * Se resuelven por RPC SECURITY DEFINER acotadas al slug de la instalación:
 * el navegador no puede pedir datos de otra empresa ni aunque modifique el slug
 * (el RPC solo devuelve empresas publicadas).
 */

/** Catálogo completo en una sola llamada. Devuelve null si la empresa no está publicada. */
export async function fetchPublicCatalog(slug: string = env.businessSlug): Promise<PublicCatalog | null> {
  const { data, error } = await supabase.rpc('get_public_catalog', { p_slug: slug })
  if (error) throw error
  return (data as PublicCatalog | null) ?? null
}

/** Datos básicos del negocio. */
export async function fetchPublicBusiness(slug: string = env.businessSlug): Promise<Business | null> {
  const { data, error } = await supabase.rpc('get_public_business', { p_slug: slug })
  return unwrapNullable<Business>({ data: data as Business | null, error })
}

/** Negocio por id (uso interno del panel, protegido por RLS). */
export async function fetchBusinessById(id: string): Promise<Business | null> {
  const { data, error } = await supabase.from('businesses').select('*').eq('id', id).maybeSingle()
  return unwrapNullable<Business>({ data: data as Business | null, error })
}
