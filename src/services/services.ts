import { supabase } from '@/lib/supabase'
import { unwrap } from '@/lib/errors'
import type { Service, ServiceCategory } from '@/types/database'

/* ============================ Servicios ================================== */

export async function listServices(businessId: string): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('business_id', businessId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
  return unwrap<Service[]>({ data: data as Service[] | null, error })
}

export interface ServiceInput {
  business_id: string
  name: string
  description?: string | null
  duration_minutes: number
  price: number
  category_id?: string | null
  image_url?: string | null
  is_active?: boolean
  sort_order?: number
}

export async function createService(input: ServiceInput): Promise<Service> {
  const { data, error } = await supabase.from('services').insert(input).select('*').single()
  return unwrap<Service>({ data: data as Service | null, error })
}

export async function updateService(id: string, patch: Partial<ServiceInput>): Promise<Service> {
  const { data, error } = await supabase.from('services').update(patch).eq('id', id).select('*').single()
  return unwrap<Service>({ data: data as Service | null, error })
}

export async function deleteService(id: string): Promise<void> {
  const { error } = await supabase.from('services').delete().eq('id', id)
  if (error) throw error
}

/* ============================ Categorías ================================= */

export async function listCategories(businessId: string): Promise<ServiceCategory[]> {
  const { data, error } = await supabase
    .from('service_categories')
    .select('*')
    .eq('business_id', businessId)
    .order('sort_order', { ascending: true })
  return unwrap<ServiceCategory[]>({ data: data as ServiceCategory[] | null, error })
}

export async function createCategory(
  businessId: string,
  name: string,
  sortOrder = 0,
): Promise<ServiceCategory> {
  const { data, error } = await supabase
    .from('service_categories')
    .insert({ business_id: businessId, name, sort_order: sortOrder })
    .select('*')
    .single()
  return unwrap<ServiceCategory>({ data: data as ServiceCategory | null, error })
}

export async function updateCategory(
  id: string,
  patch: Partial<Pick<ServiceCategory, 'name' | 'sort_order'>>,
): Promise<ServiceCategory> {
  const { data, error } = await supabase
    .from('service_categories')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  return unwrap<ServiceCategory>({ data: data as ServiceCategory | null, error })
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('service_categories').delete().eq('id', id)
  if (error) throw error
}
