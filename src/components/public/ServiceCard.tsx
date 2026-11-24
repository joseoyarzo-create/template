import { Link } from 'react-router-dom'
import { formatCurrency } from '@/lib/format'
import { formatDuration } from '@/lib/datetime'
import { buttonClasses } from '@/components/ui/Button'
import { IconClock } from '@/components/ui/Icons'
import type { Service } from '@/types/database'

export function ServiceCard({ service, compact }: { service: Service; compact?: boolean }) {
  return (
    <article className="surface group flex flex-col p-5 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-brand/40">
      <div className="flex items-start justify-between gap-4">
        <h3 className="font-display text-lg text-white">{service.name}</h3>
        <span className="shrink-0 font-display text-lg text-brand">
          {formatCurrency(service.price)}
        </span>
      </div>

      {service.description && !compact ? (
        <p className="mt-2 text-sm leading-relaxed text-white/60">{service.description}</p>
      ) : null}

      <div className="mt-4 flex items-center gap-2 text-xs text-white/50">
        <IconClock size={14} className="text-brand/80" />
        <span>Duración: {formatDuration(service.duration_minutes)}</span>
      </div>

      <Link
        to={`/reservar?servicio=${service.id}`}
        className={buttonClasses('secondary', 'sm', 'mt-5 w-full group-hover:border-brand/60')}
      >
        Reservar este servicio
      </Link>
    </article>
  )
}
