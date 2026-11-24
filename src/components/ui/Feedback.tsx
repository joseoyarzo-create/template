import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/Button'

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'left',
  className,
}: {
  eyebrow?: string
  title: ReactNode
  subtitle?: ReactNode
  align?: 'left' | 'center'
  className?: string
}) {
  return (
    <div
      className={cn(
        'max-w-2xl',
        align === 'center' && 'mx-auto text-center',
        className,
      )}
    >
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h2 className="mt-3 font-display text-3xl text-white sm:text-4xl">{title}</h2>
      {subtitle ? <p className="mt-3 text-base leading-relaxed text-white/60">{subtitle}</p> : null}
      <div className={cn('gold-rule mt-5', align === 'center' && 'mx-auto')} />
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'surface flex flex-col items-center justify-center px-6 py-12 text-center',
        className,
      )}
    >
      {icon ? (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-brand/40 bg-brand/10 text-brand">
          {icon}
        </div>
      ) : null}
      <h3 className="font-display text-lg text-white">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-white/55">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

export function LoadingBlock({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-14 text-sm text-white/60">
      <Spinner />
      <span>{label}</span>
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-ink-800/70', className)} />
}

export function ErrorBlock({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <div className="surface border-red-500/30 bg-red-500/5 p-6 text-center">
      <p className="text-sm text-red-200">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 text-sm font-medium text-brand underline-offset-4 hover:underline"
        >
          Reintentar
        </button>
      ) : null}
    </div>
  )
}
