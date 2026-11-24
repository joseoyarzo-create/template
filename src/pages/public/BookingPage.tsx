import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { businessConfig } from '@/config/business.config'
import { env } from '@/config/env'
import { useBusiness } from '@/context/BusinessContext'
import { useToast } from '@/context/ToastContext'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { availabilityService, bookingsService } from '@/services'
import { Button, buttonClasses, Card } from '@/components/ui'
import { Field, Input, Textarea } from '@/components/ui/Form'
import { EmptyState, ErrorBlock, LoadingBlock, Skeleton } from '@/components/ui/Feedback'
import { IconAlert, IconCalendar, IconCheck, IconClock } from '@/components/ui/Icons'
import { toAppError } from '@/lib/errors'
import { formatCurrency, initials } from '@/lib/format'
import { formatDuration, formatTime, todayInZone } from '@/lib/datetime'
import { cn } from '@/lib/utils'
import type { BookingResult, Service, Staff } from '@/types/database'

const STEPS = ['Servicio', 'Profesional', 'Fecha y hora', 'Tus datos'] as const

/**
 * Wizard de reserva.
 *
 * El navegador NUNCA decide disponibilidad: los días y horarios se consultan al
 * servidor (RPC) y la creación de la reserva vuelve a validarse allí. Solo se
 * considera confirmada si el RPC responde sin error (fila ya guardada en
 * PostgreSQL).
 */
export function BookingPage() {
  const { services, staff, staffServices, business, displayName, loading, error, ready } =
    useBusiness()
  const toast = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const timezone = business?.timezone || 'America/Santiago'

  const initialService = searchParams.get('servicio') || ''
  const initialStaff = searchParams.get('barbero') || ''
  const [step, setStep] = useState(initialService ? (initialStaff ? 2 : 1) : 0)

  const [serviceId, setServiceId] = useState(initialService)
  const [staffId, setStaffId] = useState(initialStaff)
  const [date, setDate] = useState('')
  const [slotStart, setSlotStart] = useState('')

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useDocumentMeta(
    businessConfig.copy.bookingTitle + ' — ' + displayName,
    businessConfig.copy.bookingSubtitle,
  )

  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceId) || null,
    [services, serviceId],
  )
  const selectedStaff = useMemo(() => staff.find((s) => s.id === staffId) || null, [staff, staffId])

  // Profesionales que pueden realizar el servicio elegido (misma regla que el servidor).
  const eligibleStaff = useMemo(() => {
    if (!serviceId) return staff
    if (staffServices.length === 0) return staff
    const assignedToService = staffServices
      .filter((ss) => ss.service_id === serviceId)
      .map((ss) => ss.staff_id)
    return staff.filter((member) => {
      const hasAnyAssignment = staffServices.some((ss) => ss.staff_id === member.id)
      if (!hasAnyAssignment) return true
      return assignedToService.includes(member.id)
    })
  }, [serviceId, staff, staffServices])

  const today = todayInZone(timezone)
  const windowDays = Math.min(env.maxAdvanceDays, 30)

  const [days, setDays] = useState<Array<{ day: string; total: number }> | null>(null)
  const [daysLoading, setDaysLoading] = useState(false)
  const [daysError, setDaysError] = useState<string | null>(null)

  const [slots, setSlots] = useState<Array<{ slot_start: string; slot_end: string }> | null>(null)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsError, setSlotsError] = useState<string | null>(null)

  // Carga de días disponibles cuando cambian profesional o servicio.
  useEffect(() => {
    if (!staffId || !serviceId) {
      setDays(null)
      return
    }
    let active = true
    setDaysLoading(true)
    setDaysError(null)
    availabilityService
      .fetchAvailableDays({ staffId, serviceId, fromDate: today, days: windowDays })
      .then((result) => {
        if (active) setDays(result)
      })
      .catch((err) => {
        if (active) setDaysError(toAppError(err).message)
      })
      .finally(() => {
        if (active) setDaysLoading(false)
      })
    return () => {
      active = false
    }
  }, [staffId, serviceId, today, windowDays])

  // Carga de horas disponibles del día elegido.
  useEffect(() => {
    if (!staffId || !serviceId || !date) {
      setSlots(null)
      return
    }
    let active = true
    setSlotsLoading(true)
    setSlotsError(null)
    availabilityService
      .fetchAvailableSlots({ staffId, serviceId, date })
      .then((result) => {
        if (active) setSlots(result)
      })
      .catch((err) => {
        if (active) setSlotsError(toAppError(err).message)
      })
      .finally(() => {
        if (active) setSlotsLoading(false)
      })
    return () => {
      active = false
    }
  }, [staffId, serviceId, date])

  // Al cambiar de profesional o servicio, se limpia la selección de fecha/hora.
  useEffect(() => {
    setDate('')
    setSlotStart('')
  }, [staffId, serviceId])

  function goTo(target: number) {
    setStep(target)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleSubmit() {
    setFormError(null)
    if (!selectedService || !selectedStaff || !slotStart) {
      setFormError('Falta información para completar la reserva.')
      return
    }
    if (name.trim().length < 3) {
      setFormError('Ingresa tu nombre completo.')
      return
    }
    if (phone.replace(/\D/g, '').length < 8) {
      setFormError('Ingresa un teléfono válido.')
      return
    }

    setSubmitting(true)
    bookingsService
      .createPublicBooking({
        staffId: selectedStaff.id,
        serviceId: selectedService.id,
        startsAtIso: slotStart,
        customerName: name.trim(),
        customerPhone: phone.trim(),
        customerEmail: email.trim() || null,
        notes: notes.trim() || null,
      })
      .then((result: BookingResult) => {
        toast.success('Reserva confirmada correctamente.')
        navigate(`/reserva/${result.reference_code}`, { state: { booking: result } })
      })
      .catch((err) => {
        const appError = toAppError(err)
        setFormError(appError.message)
        toast.error(appError.message)
        // Si el horario dejó de estar disponible, volvemos a elegir hora.
        if (appError.message.includes('tomar ese horario')) {
          setSlotStart('')
          if (staffId && serviceId && date) {
            availabilityService
              .fetchAvailableSlots({ staffId, serviceId, date })
              .then(setSlots)
              .catch(() => undefined)
          }
          goTo(2)
        }
      })
      .finally(() => setSubmitting(false))
  }

  /* ------------------------------ Estados base --------------------------- */

  if (loading) {
    return (
      <div className="container-page py-16">
        <LoadingBlock label="Preparando la reserva…" />
      </div>
    )
  }

  if (error && !ready) {
    return (
      <div className="container-page py-16">
        <ErrorBlock message={error} />
      </div>
    )
  }

  if (ready && (services.length === 0 || staff.length === 0)) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={<IconCalendar size={22} />}
          title="La reserva online no está disponible"
          description={businessConfig.bookingDisabledMessage}
          action={
            <Link to="/contacto" className={buttonClasses('secondary', 'md')}>
              Ir a contacto
            </Link>
          }
        />
      </div>
    )
  }

  const canContinue =
    (step === 0 && Boolean(serviceId)) ||
    (step === 1 && Boolean(staffId)) ||
    (step === 2 && Boolean(slotStart)) ||
    step === 3

  return (
    <div className="container-page py-10 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <p className="eyebrow">Agenda en línea</p>
          <h1 className="mt-3 font-display text-3xl text-white sm:text-4xl">
            {businessConfig.copy.bookingTitle}
          </h1>
          <p className="mt-3 text-sm text-white/60 sm:text-base">
            {businessConfig.copy.bookingSubtitle}
          </p>
        </div>

        {/* Indicador de pasos */}
        <ol className="mt-10 grid grid-cols-4 gap-2">
          {STEPS.map((label, index) => {
            const state = index === step ? 'current' : index < step ? 'done' : 'todo'
            return (
              <li key={label} className="flex flex-col items-center gap-2 text-center">
                <button
                  type="button"
                  onClick={() => index < step && goTo(index)}
                  disabled={index > step}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold transition',
                    state === 'current' && 'border-brand bg-brand text-ink-950',
                    state === 'done' && 'border-brand/50 bg-brand/10 text-brand',
                    state === 'todo' && 'border-ink-700 bg-ink-900 text-white/40',
                  )}
                  aria-current={state === 'current' ? 'step' : undefined}
                >
                  {state === 'done' ? <IconCheck size={16} /> : index + 1}
                </button>
                <span
                  className={cn(
                    'text-[11px] font-medium leading-tight sm:text-xs',
                    state === 'current' ? 'text-white' : 'text-white/45',
                  )}
                >
                  {label}
                </span>
              </li>
            )
          })}
        </ol>

        <Card className="mt-8">
          {/* ------------------------------ Paso 1 ------------------------------ */}
          {step === 0 ? (
            <div>
              <h2 className="font-display text-xl text-white">Elige un servicio</h2>
              <div className="mt-5 space-y-3">
                {services.map((service) => (
                  <ServiceOption
                    key={service.id}
                    service={service}
                    selected={service.id === serviceId}
                    onSelect={() => {
                      setServiceId(service.id)
                      setStaffId('')
                    }}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {/* ------------------------------ Paso 2 ------------------------------ */}
          {step === 1 ? (
            <div>
              <h2 className="font-display text-xl text-white">Elige un profesional</h2>
              {selectedService ? (
                <p className="mt-1 text-sm text-white/55">
                  Para {selectedService.name} · {formatDuration(selectedService.duration_minutes)}
                </p>
              ) : null}
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {eligibleStaff.map((member) => (
                  <StaffOption
                    key={member.id}
                    member={member}
                    selected={member.id === staffId}
                    onSelect={() => setStaffId(member.id)}
                  />
                ))}
              </div>
              {eligibleStaff.length === 0 ? (
                <p className="mt-4 text-sm text-amber-200">
                  Ningún profesional realiza este servicio. Elige otro servicio.
                </p>
              ) : null}
            </div>
          ) : null}

          {/* ------------------------------ Paso 3 ------------------------------ */}
          {step === 2 ? (
            <div>
              <h2 className="font-display text-xl text-white">Elige fecha y hora</h2>

              {daysLoading ? (
                <div className="mt-5 flex gap-2 overflow-hidden">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-16 shrink-0" />
                  ))}
                </div>
              ) : daysError ? (
                <div className="mt-5">
                  <ErrorBlock message={daysError} />
                </div>
              ) : (
                <div className="mt-5 -mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
                  {(days ?? []).map((entry) => {
                    const disabled = entry.total <= 0
                    const selected = entry.day === date
                    return (
                      <button
                        key={entry.day}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          setDate(entry.day)
                          setSlotStart('')
                        }}
                        className={cn(
                          'flex w-[68px] shrink-0 flex-col items-center rounded-xl border px-2 py-3 text-center transition',
                          selected
                            ? 'border-brand bg-brand/15 text-white'
                            : disabled
                              ? 'cursor-not-allowed border-ink-800 bg-ink-900/40 text-white/25'
                              : 'border-ink-700 bg-ink-900/60 text-white/75 hover:border-brand/50',
                        )}
                      >
                        <DayLabel date={entry.day} timezone={timezone} />
                        <span className="mt-1 text-[10px] text-white/45">
                          {disabled ? 'Sin horas' : `${entry.total} disp.`}
                        </span>
                      </button>
                    )
                  })}
                  {(days ?? []).length === 0 ? (
                    <p className="py-6 text-sm text-white/55">
                      No hay días disponibles en el rango permitido.
                    </p>
                  ) : null}
                </div>
              )}

              {date ? (
                <div className="mt-6">
                  <p className="text-sm font-medium text-white/80">Horas disponibles</p>
                  {slotsLoading ? (
                    <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="h-10" />
                      ))}
                    </div>
                  ) : slotsError ? (
                    <div className="mt-3">
                      <ErrorBlock message={slotsError} />
                    </div>
                  ) : (slots ?? []).length === 0 ? (
                    <p className="mt-3 text-sm text-white/55">
                      No quedan horas disponibles para este día. Prueba con otra fecha.
                    </p>
                  ) : (
                    <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {(slots ?? []).map((slot) => {
                        const selected = slot.slot_start === slotStart
                        return (
                          <button
                            key={slot.slot_start}
                            type="button"
                            onClick={() => setSlotStart(slot.slot_start)}
                            className={cn(
                              'rounded-xl border px-2 py-2.5 text-sm font-medium transition',
                              selected
                                ? 'border-brand bg-brand text-ink-950'
                                : 'border-ink-700 bg-ink-900/60 text-white/80 hover:border-brand/50',
                            )}
                          >
                            {formatTime(slot.slot_start, timezone)}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* ------------------------------ Paso 4 ------------------------------ */}
          {step === 3 ? (
            <div>
              <h2 className="font-display text-xl text-white">Tus datos</h2>

              <div className="mt-5 rounded-xl border border-ink-800 bg-ink-950/50 p-4 text-sm">
                <SummaryRow label="Servicio" value={selectedService?.name || '—'} />
                <SummaryRow label="Profesional" value={selectedStaff?.full_name || '—'} />
                <SummaryRow
                  label="Fecha"
                  value={date ? formatDayLongSafe(date, timezone) : '—'}
                />
                <SummaryRow
                  label="Hora"
                  value={slotStart ? formatTime(slotStart, timezone) : '—'}
                />
                {selectedService ? (
                  <SummaryRow
                    label="Duración"
                    value={formatDuration(selectedService.duration_minutes)}
                  />
                ) : null}
                {selectedService ? (
                  <SummaryRow label="Valor" value={formatCurrency(selectedService.price)} highlight />
                ) : null}
              </div>

              <div className="mt-5 space-y-4">
                <Field label="Nombre completo" required htmlFor="booking-name">
                  <Input
                    id="booking-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Juan Pérez"
                    autoComplete="name"
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Teléfono" required htmlFor="booking-phone">
                    <Input
                      id="booking-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+56 9 1234 5678"
                      inputMode="tel"
                      autoComplete="tel"
                    />
                  </Field>
                  <Field label="Correo (opcional)" htmlFor="booking-email">
                    <Input
                      id="booking-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tucorreo@ejemplo.cl"
                      autoComplete="email"
                    />
                  </Field>
                </div>
                <Field label="Comentarios (opcional)" htmlFor="booking-notes">
                  <Textarea
                    id="booking-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="¿Alguna preferencia o detalle que debamos saber?"
                  />
                </Field>
              </div>

              {formError ? (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/5 px-3 py-2.5 text-sm text-red-200">
                  <IconAlert size={16} className="mt-0.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              ) : null}

              <p className="mt-4 text-xs text-white/45">
                Al reservar aceptas que te contactemos al teléfono indicado para confirmar tu hora.
                Tu reserva quedará guardada y recibirás un código de referencia.
              </p>
            </div>
          ) : null}

          {/* ---------------------------- Navegación --------------------------- */}
          <div className="mt-8 flex items-center justify-between gap-3 border-t border-ink-800 pt-5">
            {step > 0 ? (
              <Button variant="ghost" onClick={() => goTo(step - 1)} disabled={submitting}>
                Volver
              </Button>
            ) : (
              <Link to="/" className={buttonClasses('ghost', 'md')}>
                Cancelar
              </Link>
            )}

            {step < 3 ? (
              <Button
                onClick={() => goTo(step + 1)}
                disabled={!canContinue}
                icon={step === 2 ? <IconCalendar size={16} /> : undefined}
              >
                Continuar
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                loading={submitting}
                icon={<IconCheck size={16} />}
                disabled={!canContinue}
              >
                Confirmar reserva
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

/* ------------------------------- Auxiliares ------------------------------- */

function ServiceOption({
  service,
  selected,
  onSelect,
}: {
  service: Service
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-center justify-between gap-4 rounded-xl border px-4 py-3.5 text-left transition',
        selected ? 'border-brand bg-brand/10' : 'border-ink-700 bg-ink-900/50 hover:border-brand/50',
      )}
    >
      <span className="min-w-0">
        <span className="block font-medium text-white">{service.name}</span>
        {service.description ? (
          <span className="mt-0.5 block truncate text-xs text-white/50">{service.description}</span>
        ) : null}
        <span className="mt-1 flex items-center gap-1.5 text-xs text-white/50">
          <IconClock size={13} className="text-brand/80" />
          {formatDuration(service.duration_minutes)}
        </span>
      </span>
      <span className="shrink-0 font-display text-lg text-brand">
        {formatCurrency(service.price)}
      </span>
    </button>
  )
}

function StaffOption({
  member,
  selected,
  onSelect,
}: {
  member: Staff
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition',
        selected ? 'border-brand bg-brand/10' : 'border-ink-700 bg-ink-900/50 hover:border-brand/50',
      )}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-ink-700 bg-ink-800 text-sm font-semibold text-brand">
        {member.photo_url ? (
          <img src={member.photo_url} alt="" className="h-full w-full object-cover" />
        ) : (
          initials(member.full_name)
        )}
      </span>
      <span className="min-w-0">
        <span className="block font-medium text-white">{member.full_name}</span>
        {member.title ? <span className="block text-xs text-brand">{member.title}</span> : null}
      </span>
    </button>
  )
}

function SummaryRow({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-ink-800/60 py-1.5 last:border-0">
      <span className="text-white/50">{label}</span>
      <span className={cn('text-right', highlight ? 'font-display text-brand' : 'text-white/85')}>
        {value}
      </span>
    </div>
  )
}

/** Fecha corta "lun 12 ago" desde yyyy-MM-dd. */
function DayLabel({ date, timezone }: { date: string; timezone: string }) {
  const parsed = new Date(`${date}T12:00:00`)
  const weekday = parsed.toLocaleDateString('es-CL', { weekday: 'short', timeZone: timezone })
  const day = parsed.toLocaleDateString('es-CL', { day: 'numeric', timeZone: timezone })
  const month = parsed.toLocaleDateString('es-CL', { month: 'short', timeZone: timezone })
  return (
    <>
      <span className="text-[11px] capitalize text-white/60">{weekday.replace('.', '')}</span>
      <span className="font-display text-lg leading-none text-white">{day}</span>
      <span className="text-[10px] capitalize text-white/45">{month.replace('.', '')}</span>
    </>
  )
}

/** Fecha larga desde yyyy-MM-dd, sin depender de la zona para no desfasar el día. */
function formatDayLongSafe(date: string, timezone: string): string {
  const parsed = new Date(`${date}T12:00:00`)
  return parsed.toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: timezone,
  })
}
