import { supabase } from '@/lib/supabase'
import { unwrap } from '@/lib/errors'
import type { Business, BusinessMembership, MemberRole } from '@/types/database'

/* ===================== Configuración del negocio ========================= */

export type BusinessSettingsPatch = Partial<
  Pick<
    Business,
    | 'name'
    | 'legal_name'
    | 'tagline'
    | 'description'
    | 'address'
    | 'city'
    | 'region'
    | 'phone'
    | 'whatsapp'
    | 'email'
    | 'instagram'
    | 'logo_url'
    | 'hero_image_url'
    | 'primary_color'
    | 'ink_color'
    | 'map_url'
    | 'is_published'
    | 'booking_lead_minutes'
    | 'booking_max_advance_days'
    | 'slot_interval_minutes'
  >
>

export async function updateBusiness(id: string, patch: BusinessSettingsPatch): Promise<Business> {
  const { data, error } = await supabase.from('businesses').update(patch).eq('id', id).select('*').single()
  return unwrap<Business>({ data: data as Business | null, error })
}

/* ============================= Miembros ================================== */

export interface MemberRow {
  id: string
  business_id: string
  user_id: string
  role: MemberRole
  display_name: string | null
  created_at: string
}

export async function listMembers(businessId: string): Promise<MemberRow[]> {
  const { data, error } = await supabase
    .from('business_members')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: true })
  return unwrap<MemberRow[]>({ data: data as MemberRow[] | null, error })
}

export async function updateMemberRole(memberId: string, role: MemberRole): Promise<void> {
  const { error } = await supabase.from('business_members').update({ role }).eq('id', memberId)
  if (error) throw error
}

export async function removeMember(memberId: string): Promise<void> {
  const { error } = await supabase.from('business_members').delete().eq('id', memberId)
  if (error) throw error
}

/* ========================= Invitaciones ================================== */

export interface InviteRow {
  id: string
  business_id: string
  token: string
  role: MemberRole
  email: string | null
  expires_at: string | null
  used_at: string | null
  used_by: string | null
  created_at: string
}

/** Genera un token aleatorio criptográficamente seguro (24 bytes -> 48 hex). */
function randomToken(bytes = 24): string {
  const array = new Uint8Array(bytes)
  crypto.getRandomValues(array)
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
}

export async function listInvites(businessId: string): Promise<InviteRow[]> {
  const { data, error } = await supabase
    .from('admin_invites')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
  return unwrap<InviteRow[]>({ data: data as InviteRow[] | null, error })
}

export async function createInvite(
  businessId: string,
  options: { role?: MemberRole; email?: string | null; expiresInHours?: number } = {},
): Promise<InviteRow> {
  const hours = options.expiresInHours ?? 72
  const expiresAt = hours > 0 ? new Date(Date.now() + hours * 3_600_000).toISOString() : null
  const { data, error } = await supabase
    .from('admin_invites')
    .insert({
      business_id: businessId,
      token: randomToken(),
      role: options.role ?? 'admin',
      email: options.email?.trim() || null,
      expires_at: expiresAt,
    })
    .select('*')
    .single()
  return unwrap<InviteRow>({ data: data as InviteRow | null, error })
}

export async function deleteInvite(id: string): Promise<void> {
  const { error } = await supabase.from('admin_invites').delete().eq('id', id)
  if (error) throw error
}

/* ====================== Membresías del usuario actual ==================== */

export async function fetchMyMemberships(): Promise<BusinessMembership[]> {
  const { data, error } = await supabase.rpc('get_my_memberships')
  return unwrap<BusinessMembership[]>({ data: data as BusinessMembership[] | null, error })
}
