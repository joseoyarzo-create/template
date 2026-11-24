import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { BookingStatus, BlockType, MemberRole } from '@/types/database'

export type BadgeTone = 'neutral' | 'gold' | 'success' | 'warning' | 'danger' | 'info'

const TONES: Record<BadgeTone, string> = {
  neutral: 'border-ink-700 bg-ink-800/70 text-white/70',
  gold: 'border-brand/40 bg-brand/10 text-brand',
  success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  warning: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
  danger: 'border-red-500/40 bg-red-500/10 text-red-200',
  info: 'border-sky-500/40 bg-sky-500/10 text-sky-200',
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: BadgeTone
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  completed: 'Completada',
  no_show: 'No asistió',
}

const BOOKING_STATUS_TONE: Record<BookingStatus, BadgeTone> = {
  pending: 'warning',
  confirmed: 'success',
  cancelled: 'danger',
  completed: 'info',
  no_show: 'neutral',
}

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return <Badge tone={BOOKING_STATUS_TONE[status]}>{BOOKING_STATUS_LABEL[status]}</Badge>
}

export const bookingStatusLabel = (status: BookingStatus) => BOOKING_STATUS_LABEL[status]

const BLOCK_TYPE_LABEL: Record<BlockType, string> = {
  holiday: 'Feriado',
  vacation: 'Vacaciones',
  block: 'Bloqueo',
}

const BLOCK_TYPE_TONE: Record<BlockType, BadgeTone> = {
  holiday: 'info',
  vacation: 'warning',
  block: 'neutral',
}

export function BlockTypeBadge({ type }: { type: BlockType }) {
  return <Badge tone={BLOCK_TYPE_TONE[type]}>{BLOCK_TYPE_LABEL[type]}</Badge>
}

export const blockTypeLabel = (type: BlockType) => BLOCK_TYPE_LABEL[type]

const ROLE_LABEL: Record<MemberRole, string> = {
  owner: 'Propietario',
  admin: 'Administrador',
  staff: 'Profesional',
}

export function RoleBadge({ role }: { role: MemberRole }) {
  const tone: BadgeTone = role === 'owner' ? 'gold' : role === 'admin' ? 'info' : 'neutral'
  return <Badge tone={tone}>{ROLE_LABEL[role]}</Badge>
}

export const roleLabel = (role: MemberRole) => ROLE_LABEL[role]
