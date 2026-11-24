import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { env, isSupabaseConfigured } from '@/config/env'
import { fetchMyMemberships } from '@/services/settings'
import { signIn as signInRequest, signOut as signOutRequest } from '@/services/auth'
import { toAppError } from '@/lib/errors'
import type { BusinessMembership, MemberRole } from '@/types/database'

/**
 * Contexto de autenticación del panel.
 *
 * - Mantiene la sesión de Supabase Auth.
 * - Carga las membresías del usuario (empresa + rol) desde el servidor.
 * - Selecciona la empresa activa: la que coincide con el slug del despliegue.
 *
 * Importante: el rol se usa solo para la interfaz. La autorización real la
 * aplica PostgreSQL mediante RLS en cada consulta.
 */

interface AuthContextValue {
  session: Session | null
  user: User | null
  memberships: BusinessMembership[]
  /** Empresa activa para este despliegue. */
  membership: BusinessMembership | null
  businessId: string | null
  role: MemberRole | null
  isOwner: boolean
  isAdmin: boolean
  /** Puede ver el panel (cualquier miembro). */
  canAccessAdmin: boolean
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  reloadMemberships: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [memberships, setMemberships] = useState<BusinessMembership[]>([])
  const [loading, setLoading] = useState(isSupabaseConfigured)

  const loadMemberships = useCallback(async () => {
    if (!isSupabaseConfigured) return
    try {
      const rows = await fetchMyMemberships()
      setMemberships(rows)
    } catch {
      setMemberships([])
    }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    let active = true

    void (async () => {
      const { data } = await supabase.auth.getSession()
      if (!active) return
      setSession(data.session ?? null)
      if (data.session) await loadMemberships()
      if (active) setLoading(false)
    })()

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      if (nextSession) {
        void loadMemberships()
      } else {
        setMemberships([])
      }
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [loadMemberships])

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        await signInRequest(email, password)
        await loadMemberships()
      } catch (error) {
        throw toAppError(error)
      }
    },
    [loadMemberships],
  )

  const signOut = useCallback(async () => {
    await signOutRequest()
    setMemberships([])
    setSession(null)
  }, [])

  const value = useMemo<AuthContextValue>(() => {
    const membership =
      memberships.find((m) => m.business_slug === env.businessSlug) ?? memberships[0] ?? null
    const role = membership?.role ?? null
    return {
      session,
      user: session?.user ?? null,
      memberships,
      membership,
      businessId: membership?.business_id ?? null,
      role,
      isOwner: role === 'owner',
      isAdmin: role === 'owner' || role === 'admin',
      canAccessAdmin: role !== null,
      loading,
      signIn,
      signOut,
      reloadMemberships: loadMemberships,
    }
  }, [session, memberships, loading, signIn, signOut, loadMemberships])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
