import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useBusiness } from '@/context/BusinessContext'
import { useToast } from '@/context/ToastContext'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { bookingsService } from '@/services'
import { Button, buttonClasses, Card } from '@/components/ui'
import { BookingStatusBadge } from '@/components/ui/Badge'
import { ConfirmDialog } from '@/components/ui/Modal'
import { Field, Input } from '@/components/ui/Form'
import {
  IconAlert,
  IconCalendar,
  IconCheck,
  IconClock,
  IconMapPin,
  IconPhone,
  IconWhatsApp,
} from '@/components/ui/Icons'
import { toAppError } from '@/lib/errors'
import { formatCurrency, formatPhoneDisplay, whatsappLink } from '@/lib/format'
import { formatDayLong, formatDuration, formatTime } from '@/lib/datetime'
import type { Booking, BookingResult, BookingStatus } from '@/types/database'

interface BookingView {
  reference: string
  status: BookingStatus
  startsAt: string
  serviceName: string
  staffName: string
  durationMinutes: number
  price: number
  customerName: string
  businessName: string
  timezone: string
  address: string | null
  phone: string | null
  whatsapp: string | null
}

function fromResult(result: BookingResult): BookingView {
  return {
    reference: result.reference_code,
    status: result.status,
    startsAt: result.starts_at,
    serviceName: result.service_name,
    staffName: result.staff_name,
    durationMinutes: result.duration_minutes,
    price: result.price,
    customerName: result.customer_name,
    businessName: result.business_name,
    timezone: result.business_timezone,
    address: result.business_address,
    phone: result.business_phone,
    whatsapp: result.business_whatsapp,
  }
}

function fromBooking(booking: Booking, fallback: {
  businessName: string
  timezone: string
  address: string | null
  phone: string | null
  whatsapp: string | null
}): BookingView {
  return {
    reference: booking.reference_code,
    status: booking.status,
    startsAt: booking.starts_at,
    serviceName: booking.service_name_snapshot,
    staffName: booking.staff_name_snapshot,
    durationMinutes: booking.duration_minutes,
    price: booking.price_snapshot,
    customerName: booking.customer_name,
    businessName: fallback.businessName,
    timezone: fallback.timezone,
    address: fallback.address,
    phone: fallback.phone,
    whatsapp: fallback.whatsapp,
  }
}

/**
 * Confirmación de reserva.
 *
 * Si el usuario llega justo después de reservar, se muestra el resultado
 * devuelto por el servidor (vía state del router). Si recarga la página, se
 * ofrece consultar la reserva por referencia + teléfono.
 */
export function BookingConfirmationPage() {
  const { reference = '' } = useParams()
  const location = useLocation()
  const { business, displayName } = useBusiness()
  const toast = useToast()

  const timezone = business?.timezone || 'America/Santiago'
  const initial = (location.state as { booking?: BookingResult } | null)?.booking ?? null

  const [view, setView] = useState<BookingView | null>(initial ? fromResult(initial) : null)
  const [phone, setPhone] = useState(initial?.customer_phone ?? '')
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)

  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  useDocumentMeta(`Reserva ${reference} — ${displayName}`, 'Detalle de tu reserva')

  function lookup() {
    setLookupError(null)
    if (!reference.trim() || phone.replace(/\D/g, '').length < 8) {
      setLookupError('Ingresa la referencia y el teléfono con el que reservaste.')
      return
    }
    setLookupLoading(true)
    bookingsService
      .fetchBookingByReference(reference.trim(), phone.trim())
      .then((booking) => {
        if (!booking) {
          setLookupError('No encontramos una reserva con esos datos.')
          return
        }
        setView(
          fromBooking(booking, {
            businessName: displayName,
            timezone,
            address: business?.address ?? null,
            phone: business?.phone ?? null,
            whatsapp: business?.whatsapp ?? null,
          }),
        )
      })
      .catch((err) => setLookupError(toAppError(err).message))
      .finally(() => setLookupLoading(false))
  }

  function confirmCancel() {
    if (!view) return
    setCancelling(true)
    bookingsService
      .cancelPublicBooking(reference.trim(), phone.trim())
      .then(() => {
        setView({ ...view, status: 'cancelled' })
        toast.success('Tu reserva fue cancelada.')
        setCancelOpen(false)
      })
      .catch((err) => {
        const appError = toAppError(err)
        toast.error(appError.message)
      })
      .finally(() => setCancelling(false))
  }

  const canCancel = view && (view.status === 'pending' || view.status === 'confirmed')

  return (
    <div className="container-page py-14 sm:py-20">
      <div className="mx-auto max-w-2xl">
        {!view ? (
          <Card>
            <div className="text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-brand/40 text-brand">
                <IconCalendar size={24} />
              </span>
              <h1 className="mt-5 font-display text-2xl text-white">Consulta tu reserva</h1>
              <p className="mt-2 text-sm text-white/60">
                Ingresa el código de referencia y el teléfono con el que reservaste.
              </p>
            </div>
            <div className="mt-6 space-y-4">
              <Field label="Código de referencia" htmlFor="lookup-ref">
                <Input id="lookup-ref" value={reference} readOnly placeholder="BK-XXXXXX" />
              </Field>
              <Field label="Teléfono" required htmlFor="lookup-phone">
                <Input
                  id="lookup-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+56 9 1234 5678"
                  inputMode="tel"
                />
              </Field>
              {lookupError ? (
                <div className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/5 px-3 py-2.5 text-sm text-red-200">
                  <IconAlert size={16} className="mt-0.5 shrink-0" />
                  <span>{lookupError}</span>
                </div>
              ) : null}
              <Button onClick={lookup} loading={lookupLoading} fullWidth>
                Buscar mi reserva
              </Button>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="text-center">
              <span
                className={
                  'mx-auto flex h-14 w-14 items-center justify-center rounded-full border ' +
                  (view.status === 'cancelled'
                    ? 'border-red-500/50 text-red-300'
                    : 'border-emerald-500/50 text-emerald-300')
                }
              >
                {view.status === 'cancelled' ? <IconAlert size={24} /> : <IconCheck size={26} />}
              </span>
              <h1 className="mt-5 font-display text-3xl text-white">
                {view.status === 'cancelled' ? 'Reserva cancelada' : '¡Reserva confirmada!'}
              </h1>
              <p className="mt-2 text-sm text-white/60">
                {view.status === 'cancelled'
                  ? 'Esta reserva ya no está activa.'
                  : 'Guardamos tu hora correctamente. Te esperamos.'}
              </p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <span className="rounded-lg border border-brand/40 bg-brand/10 px-3 py-1.5 font-display text-lg tracking-wider text-brand">
                  {view.reference}
                </span>
                <BookingStatusBadge status={view.status} />
              </div>
            </div>

            <div className="mt-7 space-y-4">
              <div className="rounded-xl border border-ink-800 bg-ink-950/50 p-4">
                <DetailRow
                  icon={<IconCalendar size={16} />}
                  label="Fecha"
                  value={formatDayLong(view.startsAt, view.timezone)}
                />
                <DetailRow
                  icon={<IconClock size={16} />}
                  label="Hora"
                  value={`${formatTime(view.startsAt, view.timezone)} · ${formatDuration(view.durationMinutes)}`}
                />
                <DetailRow label="Servicio" value={view.serviceName} />
                <DetailRow label="Profesional" value={view.staffName} />
                <DetailRow label="Valor" value={formatCurrency(view.price)} highlight />
                <DetailRow label="A nombre de" value={view.customerName} />
              </div>

              {view.address || view.phone ? (
                <div className="rounded-xl border border-ink-800 bg-ink-950/50 p-4 text-sm text-white/70">
                  {view.address ? (
                    <p className="flex gap-2">
                      <IconMapPin size={16} className="mt-0.5 shrink-0 text-brand" />
                      <span>{view.address}</span>
                    </p>
                  ) : null}
                  {view.phone ? (
                    <p className="mt-2 flex gap-2">
                      <IconPhone size={16} className="mt-0.5 shrink-0 text-brand" />
                      <span>{formatPhoneDisplay(view.phone)}</span>
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                {view.whatsapp ? (
                  <a
                    href={whatsappLink(
                      view.whatsapp,
                      `Hola ${view.businessName}, tengo la reserva ${view.reference} y quiero confirmar.`,
                    )}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={buttonClasses('primary', 'md', 'flex-1')}
                  >
                    <IconWhatsApp size={16} />
                    Contactar por WhatsApp
                  </a>
                ) : null}
                {canCancel ? (
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setCancelOpen(true)}
                  >
                    Cancelar reserva
                  </Button>
                ) : null}
              </div>

              <div className="pt-2 text-center">
                <Link to="/" className="text-sm text-white/50 transition hover:text-brand">
                  Volver al inicio
                </Link>
              </div>
            </div>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={confirmCancel}
        loading={cancelling}
        danger
        title="Cancelar reserva"
        message="¿Seguro que quieres cancelar esta reserva? Esta acción no se puede deshacer."
        confirmLabel="Sí, cancelar"
      />
    </div>
  )
}

function DetailRow({
  icon,
  label,
  value,
  highlight,
}: {
  icon?: React.ReactNode
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-ink-800/60 py-2 last:border-0">
      <span className="flex items-center gap-2 text-sm text-white/50">
        {icon ? <span className="text-brand">{icon}</span> : null}
        {label}
      </span>
      <span
        className={
          'text-right text-sm ' + (highlight ? 'font-display text-brand' : 'text-white/85')
        }
      >
        {value}
      </span>
    </div>
  )
}
