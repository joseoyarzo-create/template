import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { fetchPublicCatalog } from '@/services/catalog'
import { businessConfig } from '@/config/business.config'
import { env, isSupabaseConfigured, missingEnvKeys } from '@/config/env'
import { applyTheme } from '@/lib/theme'
import { toAppError } from '@/lib/errors'
import type { Business, GalleryImage, PublicCatalog, Service, Staff, WorkingHour } from '@/types/database'

/**
 * Contexto del sitio público.
 *
 * Carga el catálogo de la empresa (servicios, equipo, galería, horarios) y
 * aplica la identidad visual guardada en la base de datos. Los componentes
 * nunca consultan Supabase directamente: usan este contexto.
 */

interface BusinessContextValue {
  catalog: PublicCatalog | null
  business: Business | null
  services: Service[]
  staff: Staff[]
  gallery: GalleryImage[]
  workingHours: WorkingHour[]
  staffServices: Array<{ staff_id: string; service_id: string }>
  /** Nombre visible: BD si está disponible, si no el configurado. */
  displayName: string
  /** true mientras se carga el catálogo. */
  loading: boolean
  /** true si el catálogo cargó correctamente. */
  ready: boolean
  /** Mensaje si la empresa no está publicada o no se pudo cargar. */
  error: string | null
  /** true si falta configuración de entorno (Supabase/slug). */
  needsConfiguration: boolean
  missingEnvKeys: string[]
  refresh: () => Promise<void>
}

const BusinessContext = createContext<BusinessContextValue | null>(null)

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<PublicCatalog | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await fetchPublicCatalog()
      if (!data) {
        setCatalog(null)
        setError(
          'La barbería aún no está publicada. Un administrador debe activar la publicación en el panel.',
        )
        return
      }
      setCatalog(data)
      applyTheme({ primary: data.business.primary_color, ink: data.business.ink_color })
    } catch (err) {
      setError(toAppError(err).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const value = useMemo<BusinessContextValue>(() => {
    const business = catalog?.business ?? null
    return {
      catalog,
      business,
      services: catalog?.services ?? [],
      staff: catalog?.staff ?? [],
      gallery: catalog?.gallery ?? [],
      workingHours: catalog?.workingHours ?? [],
      staffServices: catalog?.staffServices ?? [],
      displayName: business?.name || env.overrides.name || businessConfig.name || 'Barbería',
      loading,
      ready: Boolean(catalog?.business),
      error,
      needsConfiguration: !isSupabaseConfigured,
      missingEnvKeys,
      refresh: load,
    }
  }, [catalog, loading, error, load])

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>
}

export function useBusiness(): BusinessContextValue {
  const ctx = useContext(BusinessContext)
  if (!ctx) throw new Error('useBusiness debe usarse dentro de <BusinessProvider>')
  return ctx
}
