import { supabase } from '@/lib/supabase'
import { unwrap } from '@/lib/errors'
import { env } from '@/config/env'
import type { Booking, BookingResult, BookingStatus } from '@/types/database'

/* ==========================================================================
   Reservas
   - Público: solo a través de RPC (validación y conflictos en el servidor).
   - Panel: consultas directas protegidas por RLS.
   ========================================================================== */

export interface CreatePublicBookingInput {
  staffId: string
  serviceId: string
  /** Instante UTC en formato ISO (se construye con localDateTimeToUtcIso). */
  startsAtIso: string
  customerName: string
  customerPhone: string
  customerEmail?: string | null
  notes?: string | null
  slug?: string
}

/**
 * Crea la reserva en el servidor. Solo se considera CONFIRMADA si esta llamada
 * responde sin error: la fila ya está guardada en PostgreSQL.
 */
export async function createPublicBooking(input: CreatePublicBookingInput): Promise<BookingResult> {
  const { data, error } = await supabase.rpc('create_public_booking', {
    p_slug: input.slug ?? env.businessSlug,
    p_staff_id: input.staffId,
    p_service_id: input.serviceId,
    p_starts_at: input.startsAtIso,
    p_customer_name: input.customerName,
    p_customer_phone: input.customerPhone,
    p_customer_email: input.customerEmail ?? null,
    p_notes: input.notes ?? null,
  })
  return unwrap<BookingResult>({ data: data as BookingResult | null, error })
}

/** Consulta de la propia reserva desde el sitio público (referencia + teléfono). */
export async function fetchBookingByReference(
  reference: string,
  phone: string,
  slug: string = env.businessSlug,
): Promise<Booking | null> {
  const { data, error } = await supabase.rpc('get_booking_by_reference', {
    p_slug: slug,
    p_reference: reference,
    p_phone: phone,
  })
  if (error) throw error
  return (data as Booking | null) ?? null
}

/** Cancelación desde el sitio público. */
export async function cancelPublicBooking(
  reference: string,
  phone: string,
  slug: string = env.businessSlug,
): Promise<{ id: string; status: BookingStatus }> {
  const { data, error } = await supabase.rpc('cancel_public_booking', {
    p_slug: slug,
    p_reference: reference,
    p_phone: phone,
  })
  return unwrap<{ id: string; status: BookingStatus }>({
    data: data as { id: string; status: BookingStatus } | null,
    error,
  })
}

/* ----------------------------- Panel administrativo ---------------------- */

export interface BookingFilters {
  fromIso?: string
  toIso?: string
  staffId?: string
  status?: BookingStatus | 'all'
  search?: string
}

export async function listBookings(businessId: string, filters: BookingFilters = {}): Promise<Booking[]> {
  let query = supabase
    .from('bookings')
    .select('*')
    .eq('business_id', businessId)
    .order('starts_at', { ascending: true })

  if (filters.fromIso) query = query.gte('starts_at', filters.fromIso)
  if (filters.toIso) query = query.lt('starts_at', filters.toIso)
  if (filters.staffId) query = query.eq('staff_id', filters.staffId)
  if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status)
  if (filters.search) {
    const term = filters.search.replace(/[%,]/g, '')
    query = query.or(
      `customer_name.ilike.%${term}%,customer_phone.ilike.%${term}%,reference_code.ilike.%${term}%`,
    )
  }

  const { data, error } = await query
  return unwrap<Booking[]>({ data: data as Booking[] | null, error })
}

export async function getBooking(id: string): Promise<Booking | null> {
  const { data, error } = await supabase.from('bookings').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return (data as Booking | null) ?? null
}

export async function updateBookingStatus(id: string, status: BookingStatus): Promise<Booking> {
  const { data, error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', id)
    .select('*')
    .single()
  return unwrap<Booking>({ data: data as Booking | null, error })
}

export interface AdminBookingInput {
  businessId: string
  staffId: string
  serviceId: string
  startsAtIso: string
  durationMinutes: number
  serviceName: string
  staffName: string
  price: number
  customerName: string
  customerPhone: string
  customerEmail?: string | null
  notes?: string | null
  status?: BookingStatus
}

/**
 * Alta de reserva desde el panel. Genera el código de referencia en el cliente
 * y confía en la restricción de exclusión de la base de datos para impedir
 * cruces de horario (si hay choque, la operación falla y se informa).
 */
export async function createBookingAsAdmin(input: AdminBookingInput): Promise<Booking> {
  const endsAtIso = new Date(
    new Date(input.startsAtIso).getTime() + input.durationMinutes * 60_000,
  ).toISOString()

  const reference = `BK-${Math.random().toString(36).slice(2, 8).toUpperCase()}`

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      business_id: input.businessId,
      staff_id: input.staffId,
      service_id: input.serviceId,
      reference_code: reference,
      customer_name: input.customerName,
      customer_phone: input.customerPhone,
      customer_email: input.customerEmail ?? null,
      notes: input.notes ?? null,
      starts_at: input.startsAtIso,
      ends_at: endsAtIso,
      status: input.status ?? 'confirmed',
      service_name_snapshot: input.serviceName,
      staff_name_snapshot: input.staffName,
      duration_minutes: input.durationMinutes,
      price_snapshot: input.price,
      source: 'admin',
    })
    .select('*')
    .single()

  return unwrap<Booking>({ data: data as Booking | null, error })
}

export async function updateBooking(
  id: string,
  patch: Partial<Pick<Booking, 'starts_at' | 'ends_at' | 'notes' | 'staff_id' | 'status'>>,
): Promise<Booking> {
  const { data, error } = await supabase
    .from('bookings')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  return unwrap<Booking>({ data: data as Booking | null, error })
}

export async function deleteBooking(id: string): Promise<void> {
  const { error } = await supabase.from('bookings').delete().eq('id', id)
  if (error) throw error
}
