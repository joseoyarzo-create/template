import { Link } from 'react-router-dom'
import { buttonClasses } from '@/components/ui/Button'
import { initials } from '@/lib/format'
import { IconStar } from '@/components/ui/Icons'
import type { Service, Staff } from '@/types/database'

export function StaffCard({
  member,
  services,
}: {
  member: Staff
  /** Servicios que realiza este profesional (vacío = todos). */
  services: Service[]
}) {
  return (
    <article className="surface group flex flex-col overflow-hidden shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-brand/40">
      <div className="relative aspect-[4/3] overflow-hidden bg-ink-800">
        {member.photo_url ? (
          <img
            src={member.photo_url}
            alt={member.full_name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center font-display text-4xl text-brand/70">
            {initials(member.full_name)}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950 to-transparent p-4">
          <p className="font-display text-lg text-white">{member.full_name}</p>
          {member.title ? <p className="text-xs text-brand">{member.title}</p> : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        {member.bio ? (
          <p className="text-sm leading-relaxed text-white/60">{member.bio}</p>
        ) : null}

        {services.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {services.slice(0, 4).map((service) => (
              <span
                key={service.id}
                className="inline-flex items-center gap-1 rounded-full border border-ink-700 px-2.5 py-0.5 text-[11px] text-white/60"
              >
                <IconStar size={11} className="text-brand/70" />
                {service.name}
              </span>
            ))}
            {services.length > 4 ? (
              <span className="text-[11px] text-white/40">+{services.length - 4} más</span>
            ) : null}
          </div>
        ) : null}

        <Link
          to={`/reservar?barbero=${member.id}`}
          className={buttonClasses('secondary', 'sm', 'mt-5 w-full')}
        >
          Reservar con {member.full_name.split(' ')[0]}
        </Link>
      </div>
    </article>
  )
}
