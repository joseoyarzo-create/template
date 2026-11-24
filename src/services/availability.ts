import { supabase } from '@/lib/supabase'
import { unwrap } from '@/lib/errors'
import { env } from '@/config/env'
import type { AvailableDay, AvailableSlot } from '@/types/database'

/**
 * Disponibilidad. Se calcula SIEMPRE en el servidor (RPC) para que el
 * navegador no pueda inventar horarios libres. El servidor valida además al
 * momento de crear la reserva (doble control).
 */

/** Horas realmente disponibles para un profesional, servicio y día concretos. */
export async function fetchAvailableSlots(params: {
  staffId: string
  serviceId: string
  /** Fecha local del negocio en formato yyyy-MM-dd. */
  date: string
  slug?: string
}): Promise<AvailableSlot[]> {
  const { data, error } = await supabase.rpc('get_available_slots', {
    p_slug: params.slug ?? env.businessSlug,
    p_staff_id: params.staffId,
    p_service_id: params.serviceId,
    p_date: params.date,
  })
  return unwrap<AvailableSlot[]>({ data: data as AvailableSlot[] | null, error }) ?? []
}

/** Días con al menos una hora disponible, para pintar el calendario. */
export async function fetchAvailableDays(params: {
  staffId: string
  serviceId: string
  fromDate: string
  days?: number
  slug?: string
}): Promise<AvailableDay[]> {
  const { data, error } = await supabase.rpc('get_available_days', {
    p_slug: params.slug ?? env.businessSlug,
    p_staff_id: params.staffId,
    p_service_id: params.serviceId,
    p_from: params.fromDate,
    p_days: params.days ?? 30,
  })
  return unwrap<AvailableDay[]>({ data: data as AvailableDay[] | null, error }) ?? []
}
