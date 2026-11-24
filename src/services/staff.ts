import { supabase } from '@/lib/supabase'
import { unwrap } from '@/lib/errors'
import type { Staff, WorkingHour } from '@/types/database'

/* ======================== Profesionales (staff) ========================== */

export async function listStaff(businessId: string): Promise<Staff[]> {
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .eq('business_id', businessId)
    .order('sort_order', { ascending: true })
    .order('full_name', { ascending: true })
  return unwrap<Staff[]>({ data: data as Staff[] | null, error })
}

export interface StaffInput {
  business_id: string
  full_name: string
  title?: string | null
  bio?: string | null
  photo_url?: string | null
  email?: string | null
  phone?: string | null
  is_active?: boolean
  sort_order?: number
  user_id?: string | null
}

export async function createStaff(input: StaffInput): Promise<Staff> {
  const { data, error } = await supabase.from('staff').insert(input).select('*').single()
  return unwrap<Staff>({ data: data as Staff | null, error })
}

export async function updateStaff(id: string, patch: Partial<StaffInput>): Promise<Staff> {
  const { data, error } = await supabase.from('staff').update(patch).eq('id', id).select('*').single()
  return unwrap<Staff>({ data: data as Staff | null, error })
}

export async function deleteStaff(id: string): Promise<void> {
  const { error } = await supabase.from('staff').delete().eq('id', id)
  if (error) throw error
}

/* =================== Servicios que realiza cada profesional ============== */

export interface StaffServiceLink {
  staff_id: string
  service_id: string
}

/**
 * Devuelve los vínculos profesional–servicio de una empresa.
 * Si la empresa aún no tiene profesionales, no consulta nada.
 */
export async function listStaffServices(businessId: string): Promise<StaffServiceLink[]> {
  const staff = await listStaff(businessId)
  if (staff.length === 0) return []
  const ids = staff.map((s) => s.id)
  const { data, error } = await supabase
    .from('staff_services')
    .select('staff_id, service_id')
    .in('staff_id', ids)
  return unwrap<StaffServiceLink[]>({ data: data as StaffServiceLink[] | null, error })
}

/** Reemplaza por completo los servicios de un profesional. */
export async function setStaffServices(staffId: string, serviceIds: string[]): Promise<void> {
  const { error: delError } = await supabase.from('staff_services').delete().eq('staff_id', staffId)
  if (delError) throw delError
  if (serviceIds.length === 0) return
  const rows = serviceIds.map((service_id) => ({ staff_id: staffId, service_id }))
  const { error } = await supabase.from('staff_services').insert(rows)
  if (error) throw error
}

/* ============================ Horarios =================================== */

export async function listWorkingHours(businessId: string): Promise<WorkingHour[]> {
  const { data, error } = await supabase
    .from('staff_working_hours')
    .select('*')
    .eq('business_id', businessId)
    .order('weekday', { ascending: true })
    .order('start_time', { ascending: true })
  return unwrap<WorkingHour[]>({ data: data as WorkingHour[] | null, error })
}

export interface WorkingHourInput {
  weekday: number
  start_time: string
  end_time: string
}

/**
 * Reemplaza el horario semanal completo de un profesional.
 * Se hace delete + insert para que la configuración refleje exactamente lo que
 * el usuario guardó en el formulario.
 */
export async function replaceWorkingHours(
  businessId: string,
  staffId: string,
  rows: WorkingHourInput[],
): Promise<void> {
  const { error: delError } = await supabase
    .from('staff_working_hours')
    .delete()
    .eq('staff_id', staffId)
  if (delError) throw delError
  if (rows.length === 0) return
  const payload = rows.map((row) => ({
    business_id: businessId,
    staff_id: staffId,
    weekday: row.weekday,
    start_time: row.start_time,
    end_time: row.end_time,
    is_active: true,
  }))
  const { error } = await supabase.from('staff_working_hours').insert(payload)
  if (error) throw error
}
