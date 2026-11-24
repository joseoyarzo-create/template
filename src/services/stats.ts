import { supabase } from '@/lib/supabase'
import { unwrap } from '@/lib/errors'
import type { DashboardStats, RevenuePoint } from '@/types/database'

/**
 * Estadísticas. Se calculan en el servidor y la función verifica que el usuario
 * pertenezca a la empresa antes de devolver cualquier dato.
 */

export async function fetchDashboardStats(businessId: string): Promise<DashboardStats> {
  const { data, error } = await supabase.rpc('get_dashboard_stats', { p_business_id: businessId })
  return unwrap<DashboardStats>({ data: data as DashboardStats | null, error })
}

export async function fetchRevenueSeries(businessId: string, days = 14): Promise<RevenuePoint[]> {
  const { data, error } = await supabase.rpc('get_revenue_series', {
    p_business_id: businessId,
    p_days: days,
  })
  return unwrap<RevenuePoint[]>({ data: data as RevenuePoint[] | null, error })
}
