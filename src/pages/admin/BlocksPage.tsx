import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useBusiness } from '@/context/BusinessContext'
import { useToast } from '@/context/ToastContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { scheduleService, staffService } from '@/services'
import { AdminPageHeader } from '@/components/layout/AdminLayout'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input, Select, Textarea, Toggle } from '@/components/ui/Form'
import { Badge, BlockTypeBadge, blockTypeLabel } from '@/components/ui/Badge'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { EmptyState, ErrorBlock, LoadingBlock } from '@/components/ui/Feedback'
import { IconBan, IconPlus, IconTrash } from '@/components/ui/Icons'
import { toAppError } from '@/lib/errors'
import {
  addDaysToDate,
  formatInZone,
  formatTime,
  localDateTimeToUtcIso,
  todayInZone,
} from '@/lib/datetime'
import type { BlockType, ScheduleBlock, Staff } from '@/types/database'

const BLOCK_TYPES: BlockType[] = ['holiday', 'vacation', 'block']

/**
 * Bloqueos de agenda.
 *
 * Permiten marcar feriados, vacaciones del personal o cierres puntuales. El
 * servidor excluye cualquier hora que caiga dentro de un bloqueo al calcular la
 * disponibilidad y al validar una reserva.
 */
export function BlocksPage() {
  const { businessId } = useAuth()
  const { business } = useBusiness()
  const toast = useToast()

  useDocumentMeta('Bloqueos', 'Panel de gestión')

  const timezone = business?.timezone || 'America/Santiago'

  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<ScheduleBlock | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const blocks = useAsync(() => scheduleService.listBlocks(businessId as string), [businessId], {
    enabled: Boolean(businessId),
  })
  const staff = useAsync(() => staffService.listStaff(businessId as string), [businessId], {
    enabled: Boolean(businessId),
  })

  async function handleDelete() {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      await scheduleService.deleteBlock(deleting.id)
      toast.success('Bloqueo eliminado.')
      setDeleting(null)
      void blocks.reload()
    } catch (err) {
      toast.error(toAppError(err).message)
    } finally {
      setDeleteLoading(false)
    }
  }

  if (!businessId) return <ErrorBlock message="No se pudo determinar la empresa activa." />

  const rows = blocks.data ?? []
  const staffRows = staff.data ?? []

  function staffName(staffId: string | null): string {
    if (!staffId) return 'Todo el equipo'
    return staffRows.find((member) => member.id === staffId)?.full_name ?? 'Profesional'
  }

  function describeRange(block: ScheduleBlock): string {
    if (block.all_day) {
      const start = formatInZone(block.starts_at, 'EEE d MMM', timezone)
      const end = formatInZone(new Date(new Date(block.ends_at).getTime() - 60_000), 'EEE d MMM', timezone)
      return start === end ? start : `${start} → ${end}`
    }
    return `${formatInZone(block.starts_at, 'EEE d MMM, HH:mm', timezone)} → ${formatTime(block.ends_at, timezone)}`
  }

  function isPast(block: ScheduleBlock): boolean {
    return new Date(block.ends_at).getTime() < Date.now()
  }

  return (
    <div>
      <AdminPageHeader
        title="Bloqueos y feriados"
        description="Marca días completos o tramos de hora en los que no se puede reservar."
        actions={
          <Button onClick={() => setFormOpen(true)} icon={<IconPlus size={16} />}>
            Nuevo bloqueo
          </Button>
        }
      />

      {blocks.loading ? (
        <LoadingBlock />
      ) : blocks.error ? (
        <ErrorBlock message={blocks.error} onRetry={blocks.reload} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<IconBan size={20} />}
          title="Sin bloqueos"
          description="Crea bloqueos para feriados, vacaciones del personal o cierres puntuales."
          action={
            <Button variant="secondary" size="sm" onClick={() => setFormOpen(true)}>
              Crear bloqueo
            </Button>
          }
        />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-ink-800 text-left text-xs uppercase tracking-wider text-white/45">
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Periodo</th>
                  <th className="px-4 py-3 font-medium">Aplica a</th>
                  <th className="px-4 py-3 font-medium">Motivo</th>
                  <th className="px-4 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {rows.map((block) => (
                  <tr key={block.id} className={isPast(block) ? 'opacity-50' : undefined}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <BlockTypeBadge type={block.block_type} />
                        {block.all_day ? <Badge tone="neutral">Día completo</Badge> : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white/75 whitespace-nowrap">
                      {describeRange(block)}
                    </td>
                    <td className="px-4 py-3 text-white/70">{staffName(block.staff_id)}</td>
                    <td className="px-4 py-3 text-white/55">{block.reason || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setDeleting(block)}
                          className="rounded-lg p-2 text-white/60 transition hover:bg-red-500/15 hover:text-red-300"
                          aria-label="Eliminar bloqueo"
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
        </Card>
      )}

      {formOpen ? (
        <BlockFormModal
          businessId={businessId}
          timezone={timezone}
          staff={staffRows}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false)
            void blocks.reload()
          }}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        danger
        title="Eliminar bloqueo"
        message={
          deleting
            ? `¿Eliminar este bloqueo (${blockTypeLabel(deleting.block_type)})? Las horas volverán a estar disponibles.`
            : ''
        }
        confirmLabel="Eliminar"
      />
    </div>
  )
}

function BlockFormModal({
  businessId,
  timezone,
  staff,
  onClose,
  onSaved,
}: {
  businessId: string
  timezone: string
  staff: Staff[]
  onClose: () => void
  onSaved: () => void
}) {
  const toast = useToast()
  const today = todayInZone(timezone)

  const [scope, setScope] = useState('')
  const [blockType, setBlockType] = useState<BlockType>('holiday')
  const [allDay, setAllDay] = useState(true)
  const [startDate, setStartDate] = useState(today)
  const [startTime, setStartTime] = useState('09:00')
  const [endDate, setEndDate] = useState(today)
  const [endTime, setEndTime] = useState('18:00')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setError(null)
    if (!startDate) {
      setError('Selecciona la fecha de inicio.')
      return
    }

    let startsAtIso: string
    let endsAtIso: string

    if (allDay) {
      const lastDate = endDate || startDate
      startsAtIso = localDateTimeToUtcIso(startDate, '00:00', timezone)
      endsAtIso = localDateTimeToUtcIso(addDaysToDate(lastDate, 1), '00:00', timezone)
    } else {
      if (!startTime || !endTime || !endDate) {
        setError('Completa fecha y hora de inicio y término.')
        return
      }
      startsAtIso = localDateTimeToUtcIso(startDate, startTime, timezone)
      endsAtIso = localDateTimeToUtcIso(endDate, endTime, timezone)
    }

    if (new Date(endsAtIso).getTime() <= new Date(startsAtIso).getTime()) {
      setError('El término debe ser posterior al inicio.')
      return
    }

    setSaving(true)
    try {
      await scheduleService.createBlock({
        business_id: businessId,
        staff_id: scope || null,
        block_type: blockType,
        all_day: allDay,
        starts_at: startsAtIso,
        ends_at: endsAtIso,
        reason: reason.trim() || null,
      })
      toast.success('Bloqueo creado.')
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
      title="Nuevo bloqueo"
      description="Las horas dentro de este rango dejarán de ofrecerse a los clientes."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} loading={saving}>
            Crear bloqueo
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo de bloqueo" required>
            <Select value={blockType} onChange={(e) => setBlockType(e.target.value as BlockType)}>
              {BLOCK_TYPES.map((type) => (
                <option key={type} value={type}>
                  {blockTypeLabel(type)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Aplica a" hint="Déjalo en “Todo el equipo” para un feriado general">
            <Select value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="">Todo el equipo</option>
              {staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="rounded-xl border border-ink-800 bg-ink-950/40 p-4">
          <Toggle
            checked={allDay}
            onChange={setAllDay}
            label="Día(s) completo(s)"
            description="Bloquea desde las 00:00 hasta el final del último día"
          />

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Desde" required>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Field>
            <Field label="Hasta" required hint="Puede ser el mismo día">
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </Field>
          </div>

          {!allDay ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Hora de inicio" required>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </Field>
              <Field label="Hora de término" required>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </Field>
            </div>
          ) : null}
        </div>

        <Field label="Motivo (opcional)">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej: Feriado irrenunciable, vacaciones de Diego…"
          />
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
