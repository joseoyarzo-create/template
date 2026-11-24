import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useBusiness } from '@/context/BusinessContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { bookingsService, staffService } from '@/services'
import { AdminPageHeader } from '@/components/layout/AdminLayout'
import { Button, buttonClasses } from '@/components/ui/Button'
import { Select } from '@/components/ui/Form'
import { BookingStatusBadge } from '@/components/ui/Badge'
import { EmptyState, ErrorBlock, LoadingBlock } from '@/components/ui/Feedback'
import { IconChevronLeft, IconChevronRight, IconClock } from '@/components/ui/Icons'
import {
  addDaysToDate,
  formatInZone,
  formatTime,
  localDateTimeToUtcIso,
  todayInZone,
  weekdayOfDate,
  weekdayShortName,
} from '@/lib/datetime'
import { cn } from '@/lib/utils'

/** Inicio de semana (lunes) para una fecha yyyy-MM-dd. */
function startOfWeek(date: string): string {
  const offset = (weekdayOfDate(date) + 6) % 7
  return addDaysToDate(date, -offset)
}

/**
 * Calendario de citas en vista semanal.
 * Los datos provienen de la tabla bookings (protegida por RLS) y se muestran
 * en la zona horaria del negocio.
 */
export function CalendarPage() {
  const { businessId } = useAuth()
  const { business } = useBusiness()

  useDocumentMeta('Calendario de citas', 'Panel de gestión')

  const timezone = business?.timezone || 'America/Santiago'
  const today = todayInZone(timezone)

  const [weekStart, setWeekStart] = useState(() => startOfWeek(today))
  const [staffFilter, setStaffFilter] = useState('')

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDaysToDate(weekStart, i)),
    [weekStart],
  )

  const fromIso = localDateTimeToUtcIso(weekStart, '00:00', timezone)
  const toIso = localDateTimeToUtcIso(addDaysToDate(weekStart, 7), '00:00', timezone)

  const staff = useAsync(() => staffService.listStaff(businessId as string), [businessId], {
    enabled: Boolean(businessId),
  })

  const bookings = useAsync(
    () =>
      bookingsService.listBookings(businessId as string, {
        fromIso,
        toIso,
        staffId: staffFilter || undefined,
        status: 'all',
      }),
    [businessId, fromIso, toIso, staffFilter],
    { enabled: Boolean(businessId) },
  )

  const grouped = useMemo(() => {
    const map = new Map<string, NonNullable<typeof bookings.data>>()
    for (const day of weekDays) map.set(day, [])
    for (const booking of bookings.data ?? []) {
      const key = formatInZone(booking.starts_at, 'yyyy-MM-dd', timezone)
      const list = map.get(key)
      if (list) list.push(booking)
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    }
    return map
  }, [bookings.data, weekDays, timezone])

  const weekRangeLabel = `${weekDays[0]} — ${weekDays[6]}`

  return (
    <div>
      <AdminPageHeader
        title="Calendario de citas"
        description={`Semana del ${weekRangeLabel}`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setWeekStart(addDaysToDate(weekStart, -7))}
              icon={<IconChevronLeft size={16} />}
              aria-label="Semana anterior"
            >
              <span className="hidden sm:inline">Anterior</span>
            </Button>
            <button
              type="button"
              onClick={() => setWeekStart(startOfWeek(today))}
              className={buttonClasses('ghost', 'sm')}
            >
              Hoy
            </button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setWeekStart(addDaysToDate(weekStart, 7))}
              aria-label="Semana siguiente"
            >
              <span className="hidden sm:inline">Siguiente</span>
              <IconChevronRight size={16} />
            </Button>
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <label className="text-xs font-medium uppercase tracking-wider text-white/45">
          Profesional
        </label>
        <Select
          value={staffFilter}
          onChange={(e) => setStaffFilter(e.target.value)}
          className="w-full sm:w-56"
        >
          <option value="">Todos</option>
          {(staff.data ?? []).map((member) => (
            <option key={member.id} value={member.id}>
              {member.full_name}
            </option>
          ))}
        </Select>
      </div>

      {bookings.loading ? (
        <LoadingBlock />
      ) : bookings.error ? (
        <ErrorBlock message={bookings.error} onRetry={bookings.reload} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {weekDays.map((day) => {
            const isToday = day === today
            const list = grouped.get(day) ?? []
            return (
              <div
                key={day}
                className={cn(
                  'flex min-h-[160px] flex-col rounded-xl border bg-ink-950/40',
                  isToday ? 'border-brand/50' : 'border-ink-800',
                )}
              >
                <div
                  className={cn(
                    'flex items-center justify-between border-b px-3 py-2',
                    isToday ? 'border-brand/30 bg-brand/10' : 'border-ink-800',
                  )}
                >
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/70">
                    {weekdayShortName(weekdayOfDate(day))}
                  </span>
                  <span className={cn('text-sm', isToday ? 'text-brand' : 'text-white/55')}>
                    {day.slice(8, 10)}/{day.slice(5, 7)}
                  </span>
                </div>

                <div className="flex-1 space-y-2 p-2">
                  {list.length === 0 ? (
                    <p className="py-6 text-center text-[11px] text-white/30">Sin citas</p>
                  ) : (
                    list.map((booking) => (
                      <div
                        key={booking.id}
                        className="rounded-lg border border-ink-700 bg-ink-900/70 p-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-display text-sm text-brand">
                            {formatTime(booking.starts_at, timezone)}
                          </span>
                          <BookingStatusBadge status={booking.status} />
                        </div>
                        <p className="mt-1 truncate text-xs font-medium text-white">
                          {booking.customer_name}
                        </p>
                        <p className="truncate text-[11px] text-white/50">
                          {booking.service_name_snapshot}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-white/40">
                          <IconClock size={11} />
                          {booking.duration_minutes} min · {booking.staff_name_snapshot}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!bookings.loading && (bookings.data ?? []).length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<IconClock size={20} />}
            title="No hay citas esta semana"
            description={`Semana del ${weekRangeLabel}. Navega a otra semana o revisa la gestión de reservas.`}
            action={
              <Link to="/admin/reservas" className={buttonClasses('secondary', 'sm')}>
                Ir a reservas
              </Link>
            }
          />
        </div>
      ) : null}
    </div>
  )
}
