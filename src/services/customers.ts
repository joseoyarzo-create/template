import { supabase } from '@/lib/supabase'
import { unwrap } from '@/lib/errors'
import type { Booking, Customer } from '@/types/database'

/* ============================== Clientes ================================= */

export async function listCustomers(businessId: string, search?: string): Promise<Customer[]> {
  let query = supabase
    .from('customers')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  if (search) {
    const term = search.replace(/[%,]/g, '')
    query = query.or(`full_name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`)
  }

  const { data, error } = await query
  return unwrap<Customer[]>({ data: data as Customer[] | null, error })
}

export interface CustomerInput {
  business_id: string
  full_name: string
  phone: string
  email?: string | null
  notes?: string | null
}

export async function createCustomer(input: CustomerInput): Promise<Customer> {
  const { data, error } = await supabase.from('customers').insert(input).select('*').single()
  return unwrap<Customer>({ data: data as Customer | null, error })
}

export async function updateCustomer(id: string, patch: Partial<CustomerInput>): Promise<Customer> {
  const { data, error } = await supabase.from('customers').update(patch).eq('id', id).select('*').single()
  return unwrap<Customer>({ data: data as Customer | null, error })
}

export async function deleteCustomer(id: string): Promise<void> {
  const { error } = await supabase.from('customers').delete().eq('id', id)
  if (error) throw error
}

/** Reservas de un cliente concreto (para su ficha). */
export async function listCustomerBookings(customerPhone: string, businessId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('business_id', businessId)
    .eq('customer_phone', customerPhone)
    .order('starts_at', { ascending: false })
  return unwrap<Booking[]>({ data: data as Booking[] | null, error })
}
