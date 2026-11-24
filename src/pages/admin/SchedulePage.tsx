import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { staffService } from '@/services'
import { AdminPageHeader } from '@/components/layout/AdminLayout'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input, Select } from '@/components/ui/Form'
import { EmptyState, ErrorBlock, LoadingBlock } from '@/components/ui/Feedback'
import { IconClock, IconPlus, IconTrash, IconUsers } from '@/components/ui/Icons'
import { toAppError } from '@/lib/errors'
import { shortTime, weekdayName } from '@/lib/datetime'
import type { WorkingHourInput } from '@/services/staff'

interface Interval {
  start_time: string
  end_time: string
}

/** Orden de presentación: lunes a domingo. 0 = domingo (como en la base de datos). */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

function emptyWeek(): Interval[][] {
  return Array.from({ length: 7 }, () => [] as Interval[])
}

/**
 * Configuración de horarios.
 *
 * Cada profesional tiene su propio horario semanal (tabla `staff_working_hours`).
 * Los horarios se guardan en la zona del negocio; el servidor los usa para
 * calcular las horas realmente reservables.
 */
export function SchedulePage() {
  const { businessId } = useAuth()
  const toast = useToast()

  useDocumentMeta('Horarios', 'Panel de gestión')

  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [week, setWeek] = useState<Interval[][]>(emptyWeek)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const staff = useAsync(() => staffService.listStaff(businessId as string), [businessId], {
    enabled: Boolean(businessId),
  })
  const hours = useAsync(() => staffService.listWorkingHours(businessId as string), [businessId], {
    enabled: Boolean(businessId),
  })

  const staffRows = staff.data ?? []

  // Selecciona automáticamente el primer profesional disponible.
  useEffect(() => {
    if (!selectedStaffId && staffRows.length > 0) setSelectedStaffId(staffRows[0].id)
  }, [staffRows, selectedStaffId])

  // Vuelca en el formulario el horario guardado del profesional seleccionado.
  useEffect(() => {
    const next = emptyWeek()
    for (const row of hours.data ?? []) {
      if (row.staff_id !== selectedStaffId || !row.is_active) continue
      next[row.weekday] = [
        ...next[row.weekday],
        { start_time: shortTime(row.start_time), end_time: shortTime(row.end_time) },
      ]
    }
    setWeek(next)
  }, [hours.data, selectedStaffId])

  function addInterval(weekday: number) {
    setWeek((prev) => {
      const copy = prev.map((list) => [...list])
      copy[weekday] = [...copy[weekday], { start_time: '10:00', end_time: '19:00' }]
      return copy
    })
  }

  function removeInterval(weekday: number, index: number) {
    setWeek((prev) => {
      const copy = prev.map((list) => [...list])
      copy[weekday] = copy[weekday].filter((_, i) => i !== index)
      return copy
    })
  }

  function updateInterval(weekday: number, index: number, patch: Partial<Interval>) {
    setWeek((prev) => {
      const copy = prev.map((list) => [...list])
      copy[weekday] = copy[weekday].map((item, i) => (i === index ? { ...item, ...patch } : item))
      return copy
    })
  }

  async function handleSave() {
    if (!businessId || !selectedStaffId) return
    setError(null)

    const rows: WorkingHourInput[] = []
    for (let weekday = 0; weekday < 7; weekday += 1) {
      for (const interval of week[weekday]) {
        if (!interval.start_time || !interval.end_time) {
          setError(`Completa la hora de inicio y término del ${weekdayName(weekday).toLowerCase()}.`)
          return
        }
        if (interval.start_time >= interval.end_time) {
          setError(`El horario del ${weekdayName(weekday).toLowerCase()} no es válido (inicio debe ser antes del término).`)
          return
        }
        rows.push({
          weekday,
          start_time: interval.start_time,
          end_time: interval.end_time,
        })
      }
    }

    setSaving(true)
    try {
      await staffService.replaceWorkingHours(businessId, selectedStaffId, rows)
      toast.success('Horario guardado.')
      void hours.reload()
    } catch (err) {
      setError(toAppError(err).message)
    } finally {
      setSaving(false)
    }
  }

  if (!businessId) return <ErrorBlock message="No se pudo determinar la empresa activa." />

  return (
    <div>
      <AdminPageHeader
        title="Horarios"
        description="Define el horario semanal de cada profesional. Fuera de estos rangos no se ofrecen horas."
        actions={
          <Button onClick={handleSave} loading={saving} disabled={!selectedStaffId}>
            Guardar horario
          </Button>
        }
      />

      {staff.loading ? (
        <LoadingBlock />
      ) : staff.error ? (
        <ErrorBlock message={staff.error} onRetry={staff.reload} />
      ) : staffRows.length === 0 ? (
        <EmptyState
          icon={<IconUsers size={20} />}
          title="Primero agrega profesionales"
          description="Crea al menos un profesional para poder configurar sus horarios."
        />
      ) : (
        <div className="space-y-5">
          <Card padding="sm">
            <div className="max-w-sm">
              <Field label="Profesional">
                <Select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                >
                  {staffRows.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.full_name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </Card>

          {hours.loading ? (
            <LoadingBlock />
          ) : hours.error ? (
            <ErrorBlock message={hours.error} onRetry={hours.reload} />
          ) : (
            <Card padding="none">
              <ul className="divide-y divide-ink-800">
                {WEEK_ORDER.map((weekday) => {
                  const intervals = week[weekday]
                  return (
                    <li key={weekday} className="px-4 py-4 sm:px-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="w-28 shrink-0 pt-2">
                          <span className="text-sm font-medium text-white/85">
                            {weekdayName(weekday)}
                          </span>
                          {intervals.length === 0 ? (
                            <span className="block text-xs text-white/35">Cerrado</span>
                          ) : null}
                        </div>

                        <div className="flex-1 space-y-2">
                          {intervals.map((interval, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <Input
                                type="time"
                                value={interval.start_time}
                                onChange={(e) =>
                                  updateInterval(weekday, index, { start_time: e.target.value })
                                }
                                className="max-w-[130px]"
                                aria-label={`Hora de inicio ${weekdayName(weekday)}`}
                              />
                              <span className="text-white/40">–</span>
                              <Input
                                type="time"
                                value={interval.end_time}
                                onChange={(e) =>
                                  updateInterval(weekday, index, { end_time: e.target.value })
                                }
                                className="max-w-[130px]"
                                aria-label={`Hora de término ${weekdayName(weekday)}`}
                              />
                              <button
                                type="button"
                                onClick={() => removeInterval(weekday, index)}
                                className="rounded-lg p-2 text-white/50 transition hover:bg-red-500/15 hover:text-red-300"
                                aria-label="Quitar tramo"
                              >
                                <IconTrash size={15} />
                              </button>
                            </div>
                          ))}
                        </div>

                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<IconPlus size={14} />}
                          onClick={() => addInterval(weekday)}
                        >
                          Añadir tramo
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </Card>
          )}

          {error ? (
            <div className="rounded-xl border border-red-500/40 bg-red-500/5 px-3.5 py-2.5 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <p className="flex items-center gap-2 text-xs text-white/40">
            <IconClock size={14} />
            Puedes agregar varios tramos por día (por ejemplo, mañana y tarde). Los guardados no se
            confirmarán hasta que pulses “Guardar horario”.
          </p>
        </div>
      )}
    </div>
  )
}
