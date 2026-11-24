import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useBusiness } from '@/context/BusinessContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { bookingsService, statsService } from '@/services'
import { AdminPageHeader } from '@/components/layout/AdminLayout'
import { Card, CardHeader, StatCard } from '@/components/ui/Card'
import { buttonClasses } from '@/components/ui/Button'
import { BookingStatusBadge } from '@/components/ui/Badge'
import { EmptyState, ErrorBlock, LoadingBlock } from '@/components/ui/Feedback'
import {
  IconCalendar,
  IconCheck,
  IconChart,
  IconClock,
  IconScissors,
  IconUsers,
} from '@/components/ui/Icons'
import { addDaysToDate, formatTime, localDateTimeToUtcIso, todayInZone } from '@/lib/datetime'
import { formatCurrency, initials } from '@/lib/format'

/** Resumen operativo del negocio: métricas del día/mes y agenda de hoy. */
export function DashboardPage() {
  const { businessId, user } = useAuth()
  const { business, displayName } = useBusiness()

  useDocumentMeta(`Resumen — ${displayName}`, 'Panel de gestión')

  const timezone = business?.timezone || 'America/Santiago'
  const today = todayInZone(timezone)
  const fromIso = localDateTimeToUtcIso(today, '00:00', timezone)
  const toIso = localDateTimeToUtcIso(addDaysToDate(today, 1), '00:00', timezone)

  const stats = useAsync(
    () => statsService.fetchDashboardStats(businessId as string),
    [businessId],
    { enabled: Boolean(businessId) },
  )
  const todayBookings = useAsync(
    () => bookingsService.listBookings(businessId as string, { fromIso, toIso }),
    [businessId, fromIso, toIso],
    { enabled: Boolean(businessId) },
  )

  if (!businessId) {
    return <ErrorBlock message="No se pudo determinar la empresa activa." />
  }

  return (
    <div>
      <AdminPageHeader
        title={`Hola, ${user?.email?.split('@')[0] ?? 'equipo'}`}
        description={`Resumen de ${displayName} · ${today}`}
        actions={
          <Link to="/admin/reservas" className={buttonClasses('primary', 'sm')}>
            <IconScissors size={15} />
            Gestionar reservas
          </Link>
        }
      />

      {/* Métricas */}
      {stats.loading ? (
        <LoadingBlock />
      ) : stats.error ? (
        <ErrorBlock message={stats.error} onRetry={stats.reload} />
      ) : stats.data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Hoy"
            value={stats.data.today_count}
            hint="Reservas agendadas para hoy"
            icon={<IconCalendar size={18} />}
          />
          <StatCard
            label="Próximas"
            value={stats.data.upcoming_count}
            hint="Reservas activas desde ahora"
            icon={<IconClock size={18} />}
          />
          <StatCard
            label="Esta semana"
            value={stats.data.week_count}
            hint="Reservas de los próximos 7 días"
            icon={<IconCheck size={18} />}
          />
          <StatCard
            label="Ingresos del mes"
            value={formatCurrency(stats.data.month_revenue)}
            hint={`${stats.data.month_bookings} reservas este mes`}
            icon={<IconChart size={18} />}
          />
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Agenda de hoy */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Agenda de hoy"
            subtitle={today}
            action={
              <Link
                to="/admin/calendario"
                className="text-sm font-medium text-brand transition hover:text-brand-soft"
              >
                Ver calendario
              </Link>
            }
          />

          {todayBookings.loading ? (
            <LoadingBlock />
          ) : todayBookings.error ? (
            <ErrorBlock message={todayBookings.error} onRetry={todayBookings.reload} />
          ) : (todayBookings.data ?? []).length === 0 ? (
            <EmptyState
              icon={<IconCalendar size={20} />}
              title="Sin reservas para hoy"
              description="Cuando lleguen nuevas reservas aparecerán aquí."
            />
          ) : (
            <ul className="divide-y divide-ink-800">
              {(todayBookings.data ?? []).map((booking) => (
                <li key={booking.id} className="flex items-center gap-4 py-3">
                  <span className="w-14 shrink-0 font-display text-lg text-brand">
                    {formatTime(booking.starts_at, timezone)}
                  </span>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-800 text-xs font-semibold text-white/80">
                    {initials(booking.customer_name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-white">
                      {booking.customer_name}
                    </span>
                    <span className="block truncate text-xs text-white/50">
                      {booking.service_name_snapshot} · {booking.staff_name_snapshot}
                    </span>
                  </span>
                  <BookingStatusBadge status={booking.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Accesos rápidos + contadores */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="En un vistazo" />
            <div className="grid grid-cols-2 gap-3">
              <MiniStat
                icon={<IconScissors size={16} />}
                label="Servicios activos"
                value={stats.data?.active_services ?? '—'}
              />
              <MiniStat
                icon={<IconUsers size={16} />}
                label="Profesionales"
                value={stats.data?.active_staff ?? '—'}
              />
              <MiniStat
                icon={<IconUsers size={16} />}
                label="Clientes"
                value={stats.data?.total_customers ?? '—'}
              />
              <MiniStat
                icon={<IconCalendar size={16} />}
                label="Reservas del mes"
                value={stats.data?.month_bookings ?? '—'}
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="Accesos rápidos" />
            <div className="space-y-2">
              <QuickLink to="/admin/calendario" label="Calendario de citas" />
              <QuickLink to="/admin/servicios" label="Servicios y precios" />
              <QuickLink to="/admin/personal" label="Personal y horarios" />
              <QuickLink to="/admin/clientes" label="Clientes" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-ink-800 bg-ink-950/50 p-3">
      <span className="flex items-center gap-2 text-brand">{icon}</span>
      <p className="mt-2 font-display text-2xl text-white">{value}</p>
      <p className="text-[11px] text-white/45">{label}</p>
    </div>
  )
}

function QuickLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between rounded-xl border border-ink-800 bg-ink-950/40 px-3.5 py-2.5 text-sm text-white/75 transition hover:border-brand/50 hover:text-white"
    >
      {label}
      <span className="text-brand">→</span>
    </Link>
  )
}
