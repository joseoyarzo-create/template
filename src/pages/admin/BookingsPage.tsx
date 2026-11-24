import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useBusiness } from '@/context/BusinessContext'
import { useToast } from '@/context/ToastContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { bookingsService, servicesService, staffService } from '@/services'
import { AdminPageHeader } from '@/components/layout/AdminLayout'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input, Select, Textarea } from '@/components/ui/Form'
import { bookingStatusLabel } from '@/components/ui/Badge'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { EmptyState, ErrorBlock, LoadingBlock } from '@/components/ui/Feedback'
import { IconCalendar, IconPencil, IconPlus, IconTrash } from '@/components/ui/Icons'
import { toAppError } from '@/lib/errors'
import { formatCurrency, formatPhoneDisplay } from '@/lib/format'
import {
  addDaysToDate,
  formatDayShort,
  formatInZone,
  formatTime,
  localDateTimeToUtcIso,
  todayInZone,
} from '@/lib/datetime'
import type { Booking, BookingStatus, Service, Staff } from '@/types/database'

const STATUS_OPTIONS: BookingStatus[] = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show']

/**
 * Gestión de reservas del panel.
 * Permite filtrar, crear, editar, cambiar estado y eliminar reservas.
 * Los cruces de horario los impide la restricción de exclusión en PostgreSQL:
 * si hay choque, la operación falla y se informa al usuario.
 */
export function BookingsPage() {
  const { businessId } = useAuth()
  const { business } = useBusiness()
  const toast = useToast()

  useDocumentMeta('Reservas', 'Panel de gestión')

  const timezone = business?.timezone || 'America/Santiago'
  const today = todayInZone(timezone)

  const [search, setSearch] = useState('')
  const [staffFilter, setStaffFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>('all')
  const [fromDate, setFromDate] = useState(today)
  const [toDate, setToDate] = useState(addDaysToDate(today, 30))

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Booking | null>(null)
  const [deleting, setDeleting] = useState<Booking | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const staff = useAsync(() => staffService.listStaff(businessId as string), [businessId], {
    enabled: Boolean(businessId),
  })
  const services = useAsync(() => servicesService.listServices(businessId as string), [businessId], {
    enabled: Boolean(businessId),
  })

  const fromIso = localDateTimeToUtcIso(fromDate, '00:00', timezone)
  const toIso = localDateTimeToUtcIso(addDaysToDate(toDate, 1), '00:00', timezone)

  const bookings = useAsync(
    () =>
      bookingsService.listBookings(businessId as string, {
        fromIso,
        toIso,
        staffId: staffFilter || undefined,
        status: statusFilter,
        search: search.trim() || undefined,
      }),
    [businessId, fromIso, toIso, staffFilter, statusFilter, search],
    { enabled: Boolean(businessId) },
  )

  const rows = bookings.data ?? []

  async function changeStatus(booking: Booking, status: BookingStatus) {
    try {
      await bookingsService.updateBookingStatus(booking.id, status)
      toast.success('Estado actualizado.')
      void bookings.reload()
    } catch (err) {
      toast.error(toAppError(err).message)
    }
  }

  async function handleDelete() {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      await bookingsService.deleteBooking(deleting.id)
      toast.success('Reserva eliminada.')
      setDeleting(null)
      void bookings.reload()
    } catch (err) {
      toast.error(toAppError(err).message)
    } finally {
      setDeleteLoading(false)
    }
  }

  if (!businessId) return <ErrorBlock message="No se pudo determinar la empresa activa." />

  return (
    <div>
      <AdminPageHeader
        title="Reservas"
        description="Administra las citas del negocio."
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
            icon={<IconPlus size={16} />}
          >
            Nueva reserva
          </Button>
        }
      />

      {/* Filtros */}
      <Card padding="sm" className="mb-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Buscar">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nombre, teléfono o código"
            />
          </Field>
          <Field label="Desde">
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </Field>
          <Field label="Hasta">
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </Field>
          <Field label="Profesional">
            <Select value={staffFilter} onChange={(e) => setStaffFilter(e.target.value)}>
              <option value="">Todos</option>
              {(staff.data ?? []).map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Estado">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as BookingStatus | 'all')}
            >
              <option value="all">Todos</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {bookingStatusLabel(status)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      {/* Tabla */}
      {bookings.loading ? (
        <LoadingBlock />
      ) : bookings.error ? (
        <ErrorBlock message={bookings.error} onRetry={bookings.reload} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<IconCalendar size={20} />}
          title="No hay reservas en este rango"
          description="Ajusta los filtros o registra una nueva reserva manualmente."
          action={
            <Button variant="secondary" size="sm" onClick={() => setFormOpen(true)}>
              Nueva reserva
            </Button>
          }
        />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-ink-800 text-left text-xs uppercase tracking-wider text-white/45">
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Servicio</th>
                  <th className="px-4 py-3 font-medium">Profesional</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Valor</th>
                  <th className="px-4 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {rows.map((booking) => (
                  <tr key={booking.id} className="align-middle">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="block text-white/85">
                        {formatDayShort(booking.starts_at, timezone)}
                      </span>
                      <span className="block text-xs text-brand">
                        {formatTime(booking.starts_at, timezone)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="block text-white/85">{booking.customer_name}</span>
                      <span className="block text-xs text-white/45">
                        {formatPhoneDisplay(booking.customer_phone)}
                      </span>
                      <span className="block font-mono text-[11px] text-white/35">
                        {booking.reference_code}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/70">
                      {booking.service_name_snapshot}
                      <span className="block text-xs text-white/40">
                        {booking.duration_minutes} min
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/70">{booking.staff_name_snapshot}</td>
                    <td className="px-4 py-3">
                      <Select
                        value={booking.status}
                        onChange={(e) => void changeStatus(booking, e.target.value as BookingStatus)}
                        className="h-9 min-w-[130px] py-1 text-xs"
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {bookingStatusLabel(status)}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-white/70">
                      {formatCurrency(booking.price_snapshot)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(booking)
                            setFormOpen(true)
                          }}
                          className="rounded-lg p-2 text-white/60 transition hover:bg-ink-800 hover:text-white"
                          aria-label="Editar reserva"
                        >
                          <IconPencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(booking)}
                          className="rounded-lg p-2 text-white/60 transition hover:bg-red-500/15 hover:text-red-300"
                          aria-label="Eliminar reserva"
                        >
                          <IconTrash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-ink-800 px-4 py-3 text-xs text-white/40">
            {rows.length} reserva{rows.length === 1 ? '' : 's'} en el rango seleccionado.
          </div>
        </Card>
      )}

      {formOpen ? (
        <BookingFormModal
          businessId={businessId}
          timezone={timezone}
          services={services.data ?? []}
          staff={staff.data ?? []}
          booking={editing}
          onClose={() => {
            setFormOpen(false)
            setEditing(null)
          }}
          onSaved={() => {
            setFormOpen(false)
            setEditing(null)
            void bookings.reload()
          }}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        danger
        title="Eliminar reserva"
        message={
          deleting
            ? `¿Eliminar definitivamente la reserva ${deleting.reference_code} de ${deleting.customer_name}? Esta acción no se puede deshacer.`
            : ''
        }
        confirmLabel="Eliminar"
      />
    </div>
  )
}

/* ------------------------ Formulario de reserva (modal) ------------------- */

function BookingFormModal({
  businessId,
  timezone,
  services,
  staff,
  booking,
  onClose,
  onSaved,
}: {
  businessId: string
  timezone: string
  services: Service[]
  staff: Staff[]
  booking: Booking | null
  onClose: () => void
  onSaved: () => void
}) {
  const toast = useToast()
  const isEdit = Boolean(booking)

  const initialDate = booking
    ? formatInZone(booking.starts_at, 'yyyy-MM-dd', timezone)
    : todayInZone(timezone)
  const [date, setDate] = useState(initialDate)
  const [time, setTime] = useState(booking ? formatTime(booking.starts_at, timezone) : '10:00')
  const [serviceId, setServiceId] = useState(booking?.service_id || services[0]?.id || '')
  const [staffId, setStaffId] = useState(booking?.staff_id || staff[0]?.id || '')
  const [name, setName] = useState(booking?.customer_name || '')
  const [phone, setPhone] = useState(booking?.customer_phone || '')
  const [email, setEmail] = useState(booking?.customer_email || '')
  const [notes, setNotes] = useState(booking?.notes || '')
  const [status, setStatus] = useState<BookingStatus>(booking?.status || 'confirmed')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedService = services.find((s) => s.id === serviceId) || null
  const selectedStaff = staff.find((s) => s.id === staffId) || null

  async function handleSave() {
    setError(null)
    if (!date || !time || !staffId) {
      setError('Completa profesional, fecha y hora.')
      return
    }
    if (!isEdit && (!serviceId || name.trim().length < 3 || phone.replace(/\D/g, '').length < 8)) {
      setError('Completa servicio, nombre y un teléfono válido.')
      return
    }
    const startsAtIso = localDateTimeToUtcIso(date, time, timezone)
    setSaving(true)
    try {
      if (booking) {
        const duration = booking.duration_minutes
        const endsAtIso = new Date(
          new Date(startsAtIso).getTime() + duration * 60_000,
        ).toISOString()
        await bookingsService.updateBooking(booking.id, {
          starts_at: startsAtIso,
          ends_at: endsAtIso,
          staff_id: staffId,
          notes: notes.trim() || null,
          status,
        })
        toast.success('Reserva actualizada.')
      } else {
        if (!selectedService) throw new Error('Selecciona un servicio.')
        await bookingsService.createBookingAsAdmin({
          businessId,
          staffId,
          serviceId,
          startsAtIso,
          durationMinutes: selectedService.duration_minutes,
          serviceName: selectedService.name,
          staffName: selectedStaff?.full_name || '',
          price: selectedService.price,
          customerName: name.trim(),
          customerPhone: phone.trim(),
          customerEmail: email.trim() || null,
          notes: notes.trim() || null,
          status,
        })
        toast.success('Reserva creada.')
      }
      onSaved()
    } catch (err) {
      setError(toAppError(err).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Editar reserva' : 'Nueva reserva'}
      description={
        isEdit
          ? `Referencia ${booking?.reference_code}. Puedes ajustar profesional, horario y estado.`
          : 'Registra una reserva para un cliente (por teléfono o presencial).'
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} loading={saving}>
            {isEdit ? 'Guardar cambios' : 'Crear reserva'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {!isEdit ? (
          <Field label="Servicio" required>
            <Select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
              <option value="">Selecciona un servicio</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} — {formatCurrency(service.price)} ({service.duration_minutes} min)
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <div className="rounded-xl border border-ink-800 bg-ink-950/50 px-3.5 py-2.5 text-sm text-white/70">
            Servicio: <span className="text-white">{booking?.service_name_snapshot}</span> ·{' '}
            {booking?.duration_minutes} min · {formatCurrency(booking?.price_snapshot ?? 0)}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Profesional" required>
            <Select value={staffId} onChange={(e) => setStaffId(e.target.value)}>
              <option value="">Selecciona</option>
              {staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Fecha" required>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Hora" required>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre del cliente" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Juan Pérez" />
          </Field>
          <Field label="Teléfono" required>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+56 9 1234 5678"
              inputMode="tel"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Correo (opcional)">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cliente@correo.cl"
            />
          </Field>
          <Field label="Estado">
            <Select value={status} onChange={(e) => setStatus(e.target.value as BookingStatus)}>
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {bookingStatusLabel(option)}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Notas (opcional)">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        {error ? (
          <div className="rounded-xl border border-red-500/40 bg-red-500/5 px-3.5 py-2.5 text-sm text-red-200">
            {error}
          </div>
        ) : null}
      </div>
    </Modal>
  )
}
