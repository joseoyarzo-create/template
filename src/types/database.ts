/**
 * Tipos del dominio, equivalentes 1:1 con el esquema SQL en /supabase/migrations.
 *
 * Si modificas una tabla en Supabase, actualiza también su interfaz aquí.
 * Para una generación automática puedes usar:
 *   npx supabase gen types typescript --project-id <ID> > src/types/supabase-generated.ts
 * y sustituir los tipos manuales por los generados.
 */

export type MemberRole = 'owner' | 'admin' | 'staff'
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
export type BlockType = 'holiday' | 'vacation' | 'block'

export interface Business {
  id: string
  slug: string
  name: string
  legal_name: string | null
  tagline: string | null
  description: string | null
  address: string | null
  city: string | null
  region: string | null
  phone: string | null
  whatsapp: string | null
  email: string | null
  instagram: string | null
  logo_url: string | null
  hero_image_url: string | null
  primary_color: string
  ink_color: string
  currency: string
  timezone: string
  map_url: string | null
  is_published: boolean
  booking_lead_minutes: number
  booking_max_advance_days: number
  slot_interval_minutes: number
  created_at: string
  updated_at: string
}

export interface ServiceCategory {
  id: string
  business_id: string
  name: string
  sort_order: number
  created_at: string
}

export interface Service {
  id: string
  business_id: string
  category_id: string | null
  name: string
  description: string | null
  duration_minutes: number
  price: number
  image_url: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Staff {
  id: string
  business_id: string
  user_id: string | null
  full_name: string
  title: string | null
  bio: string | null
  photo_url: string | null
  email: string | null
  phone: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface StaffService {
  staff_id: string
  service_id: string
  created_at: string
}

export interface WorkingHour {
  id: string
  business_id: string
  staff_id: string
  weekday: number
  start_time: string
  end_time: string
  is_active: boolean
  created_at: string
}

export interface ScheduleBlock {
  id: string
  business_id: string
  staff_id: string | null
  block_type: BlockType
  all_day: boolean
  starts_at: string
  ends_at: string
  reason: string | null
  created_at: string
}

export interface Customer {
  id: string
  business_id: string
  full_name: string
  phone: string
  email: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Booking {
  id: string
  business_id: string
  staff_id: string
  service_id: string | null
  customer_id: string | null
  reference_code: string
  customer_name: string
  customer_phone: string
  customer_email: string | null
  notes: string | null
  starts_at: string
  ends_at: string
  status: BookingStatus
  service_name_snapshot: string
  staff_name_snapshot: string
  duration_minutes: number
  price_snapshot: number
  source: string
  created_at: string
  updated_at: string
}

export interface GalleryImage {
  id: string
  business_id: string
  image_url: string
  title: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface AdminInvite {
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

export interface BusinessMembership {
  business_id: string
  business_slug: string
  business_name: string
  role: MemberRole
  is_published: boolean
}

/** Resultado del RPC get_public_catalog() */
export interface PublicCatalog {
  business: Business
  categories: ServiceCategory[]
  services: Service[]
  staff: Staff[]
  gallery: GalleryImage[]
  staffServices: Array<{ staff_id: string; service_id: string }>
  workingHours: WorkingHour[]
}

/** Resultado del RPC create_public_booking() */
export interface BookingResult {
  id: string
  reference_code: string
  starts_at: string
  ends_at: string
  status: BookingStatus
  service_name: string
  staff_name: string
  duration_minutes: number
  price: number
  customer_name: string
  customer_phone: string
  customer_email: string | null
  business_name: string
  business_slug: string
  business_timezone: string
  business_address: string | null
  business_phone: string | null
  business_whatsapp: string | null
}

export interface AvailableSlot {
  slot_start: string
  slot_end: string
}

export interface AvailableDay {
  day: string
  total: number
}

/** Resultado del RPC get_dashboard_stats() */
export interface DashboardStats {
  today_count: number
  upcoming_count: number
  week_count: number
  month_revenue: number
  month_bookings: number
  total_customers: number
  active_services: number
  active_staff: number
  today: string
}

export interface RevenuePoint {
  day: string
  bookings: number
  revenue: number
}
