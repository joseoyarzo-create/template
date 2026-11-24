import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { unwrap } from '@/lib/errors'
import { fetchMyMemberships } from '@/services/settings'

/* ==========================================================================
   Autenticación (Supabase Auth).
   No se crean cuentas por defecto: el primer administrador se asigna canjeando
   una invitación de un solo uso (ver src/services/settings.ts y docs).
   ========================================================================== */

export async function signIn(email: string, password: string): Promise<Session> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  })
  if (error) throw error
  return data.session as Session
}

/** Crea la cuenta de un usuario que canjeará una invitación. */
export async function signUp(email: string, password: string): Promise<User | null> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
  })
  if (error) throw error
  return data.user
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

export function onAuthStateChange(callback: (session: Session | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session))
  return () => data.subscription.unsubscribe()
}

/** Canjea una invitación y vincula al usuario con la empresa. */
export async function redeemAdminInvite(token: string) {
  const { data, error } = await supabase.rpc('redeem_admin_invite', { p_token: token.trim() })
  return unwrap<{ business_id: string; business_slug: string; role: string }>({
    data: data as { business_id: string; business_slug: string; role: string } | null,
    error,
  })
}

/** Recupera las membresías del usuario autenticado. */
export { fetchMyMemberships }
