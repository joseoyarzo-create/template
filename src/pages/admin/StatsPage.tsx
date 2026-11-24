import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useBusiness } from '@/context/BusinessContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { statsService } from '@/services'
import { AdminPageHeader } from '@/components/layout/AdminLayout'
import { Card, StatCard } from '@/components/ui/Card'
import { Field, Select } from '@/components/ui/Form'
import { EmptyState, ErrorBlock, LoadingBlock } from '@/components/ui/Feedback'
import {
  IconCalendar,
  IconChart,
  IconClock,
  IconScissors,
  IconUsers,
} from '@/components/ui/Icons'
import { formatCurrency } from '@/lib/format'
import { formatInZone } from '@/lib/datetime'

const RANGE_OPTIONS = [7, 14, 30]

/**
 * Estadísticas básicas.
 *
 * Todos los números se calculan en el servidor mediante RPC, que verifica que
 * el usuario pertenezca a la empresa antes de devolver cualquier dato.
 */
export function StatsPage() {
  const { businessId } = useAuth()
  const { business } = useBusiness()

  useDocumentMeta('Estadísticas', 'Panel de gestión')

  const timezone = business?.timezone || 'America/Santiago'
  const [days, setDays] = useState(14)

  const stats = useAsync(() => statsService.fetchDashboardStats(businessId as string), [businessId], {
    enabled: Boolean(businessId),
  })
  const series = useAsync(
    () => statsService.fetchRevenueSeries(businessId as string, days),
    [businessId, days],
    { enabled: Boolean(businessId) },
  )

  if (!businessId) return <ErrorBlock message="No se pudo determinar la empresa activa." />

  const points = series.data ?? []
  const maxRevenue = points.reduce((max, point) => Math.max(max, point.revenue), 0)
  const totalRange = points.reduce((sum, point) => sum + point.revenue, 0)
  const totalBookings = points.reduce((sum, point) => sum + point.bookings, 0)

  return (
    <div>
      <AdminPageHeader
        title="Estadísticas"
        description="Resumen del movimiento del negocio."
      />

      {stats.loading ? (
        <LoadingBlock />
      ) : stats.error ? (
        <ErrorBlock message={stats.error} onRetry={stats.reload} />
      ) : stats.data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Reservas hoy"
            value={stats.data.today_count}
            icon={<IconCalendar size={18} />}
          />
          <StatCard
            label="Próximas reservas"
            value={stats.data.upcoming_count}
            hint="Pendientes o confirmadas"
            icon={<IconClock size={18} />}
          />
          <StatCard
            label="Ingresos del mes"
            value={formatCurrency(stats.data.month_revenue)}
            hint={`${stats.data.month_bookings} reservas`}
            icon={<IconChart size={18} />}
          />
          <StatCard
            label="Clientes"
            value={stats.data.total_customers}
            hint={`${stats.data.active_services} servicios · ${stats.data.active_staff} profesionales`}
            icon={<IconUsers size={18} />}
          />
        </div>
      ) : null}

      <Card className="mt-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="font-display text-lg text-white">Ingresos por día</h3>
            <p className="mt-1 text-sm text-white/55">
              {formatCurrency(totalRange)} en {totalBookings} reserva{totalBookings === 1 ? '' : 's'}
            </p>
          </div>
          <div className="w-40">
            <Field label="Periodo">
              <Select value={days} onChange={(e) => setDays(Number.parseInt(e.target.value, 10))}>
                {RANGE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    Últimos {option} días
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </div>

        {series.loading ? (
          <LoadingBlock />
        ) : series.error ? (
          <ErrorBlock message={series.error} onRetry={series.reload} />
        ) : points.length === 0 ? (
          <EmptyState
            icon={<IconChart size={20} />}
            title="Sin datos en este periodo"
            description="Cuando existan reservas, aquí verás la evolución de los ingresos."
          />
        ) : (
          <div className="flex h-56 items-end gap-1.5 overflow-x-auto pb-2">
            {points.map((point) => {
              const height = maxRevenue > 0 ? Math.max(4, (point.revenue / maxRevenue) * 100) : 4
              return (
                <div
                  key={point.day}
                  className="group flex min-w-[26px] flex-1 flex-col items-center justify-end gap-2"
                  title={`${formatInZone(`${point.day}T12:00:00`, 'EEE d MMM', timezone)}: ${formatCurrency(point.revenue)} · ${point.bookings} reservas`}
                >
                  <span className="text-[10px] text-white/40 opacity-0 transition group-hover:opacity-100">
                    {formatCurrency(point.revenue)}
                  </span>
                  <div
                    className="w-full rounded-t-md bg-brand/70 transition-colors group-hover:bg-brand"
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-[10px] text-white/35">
                    {formatInZone(`${point.day}T12:00:00`, 'd', timezone)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <p className="mt-4 flex items-center gap-2 text-xs text-white/40">
        <IconScissors size={14} />
        Los indicadores se calculan en el servidor según la zona horaria del negocio
        ({timezone}).
      </p>
    </div>
  )
}
