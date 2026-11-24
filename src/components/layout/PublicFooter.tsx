import { Link } from 'react-router-dom'
import { businessConfig } from '@/config/business.config'
import { useBusiness } from '@/context/BusinessContext'
import { formatPhoneDisplay, whatsappLink } from '@/lib/format'
import { weekdayShortName } from '@/lib/datetime'
import { IconInstagram, IconMail, IconMapPin, IconPhone, IconWhatsApp } from '@/components/ui/Icons'

export function PublicFooter() {
  const { business, displayName, workingHours, staff } = useBusiness()

  const phone = business?.phone || businessConfig.contact.phone
  const email = business?.email || businessConfig.contact.email
  const address = business?.address || businessConfig.contact.address
  const city = business?.city || businessConfig.contact.city
  const instagram = business?.instagram || businessConfig.contact.instagram
  const wa = business?.whatsapp || businessConfig.contact.whatsapp

  // Horario general: unión de los tramos configurados por profesional.
  const generalHours = Array.from({ length: 7 }, (_, weekday) => {
    const ranges = workingHours.filter((wh) => wh.weekday === weekday)
    if (ranges.length === 0 || staff.length === 0) return null
    const start = ranges.reduce((min, r) => (r.start_time < min ? r.start_time : min), ranges[0].start_time)
    const end = ranges.reduce((max, r) => (r.end_time > max ? r.end_time : max), ranges[0].end_time)
    return { weekday, start: start.slice(0, 5), end: end.slice(0, 5) }
  }).filter(Boolean) as Array<{ weekday: number; start: string; end: string }>

  // Agrupa días consecutivos con el mismo horario.
  const grouped: Array<{ label: string; start: string; end: string }> = []
  for (const entry of generalHours) {
    const previous = grouped[grouped.length - 1]
    const sameRange = previous && previous.start === entry.start && previous.end === entry.end
    if (sameRange) {
      previous.label = `${previous.label.split(' a ')[0]} a ${weekdayShortName(entry.weekday)}`
    } else {
      grouped.push({
        label: weekdayShortName(entry.weekday),
        start: entry.start,
        end: entry.end,
      })
    }
  }

  return (
    <footer className="mt-20 border-t border-ink-800 bg-ink-950/80">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-xl text-white">{displayName}</p>
          <p className="mt-3 text-sm leading-relaxed text-white/55">
            {business?.tagline || businessConfig.tagline}
          </p>
          {wa ? (
            <a
              href={whatsappLink(wa, `Hola ${displayName}, quiero consultar por una hora.`)}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-5 inline-flex items-center gap-2 rounded-xl border border-brand/40 bg-brand/10 px-4 py-2 text-sm font-medium text-brand transition hover:bg-brand/20"
            >
              <IconWhatsApp size={16} />
              Escríbenos por WhatsApp
            </a>
          ) : null}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Navegación</p>
          <ul className="mt-4 space-y-2 text-sm">
            {[
              { to: '/', label: 'Inicio' },
              { to: '/servicios', label: 'Servicios' },
              ...(businessConfig.features.gallery ? [{ to: '/galeria', label: 'Galería' }] : []),
              ...(businessConfig.features.team ? [{ to: '/equipo', label: 'Equipo' }] : []),
              { to: '/reservar', label: 'Reservar hora' },
              { to: '/contacto', label: 'Contacto' },
            ].map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="text-white/65 transition hover:text-brand">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Horario</p>
          {grouped.length > 0 ? (
            <ul className="mt-4 space-y-2 text-sm text-white/65">
              {grouped.map((g) => (
                <li key={g.label} className="flex justify-between gap-3">
                  <span>{g.label}</span>
                  <span className="text-white/85">
                    {g.start} – {g.end}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-white/45">Consulta disponibilidad al reservar.</p>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Contacto</p>
          <ul className="mt-4 space-y-3 text-sm text-white/65">
            {address ? (
              <li className="flex gap-2">
                <IconMapPin size={16} className="mt-0.5 shrink-0 text-brand" />
                <span>
                  {address}
                  {city ? `, ${city}` : ''}
                </span>
              </li>
            ) : null}
            {phone ? (
              <li className="flex gap-2">
                <IconPhone size={16} className="mt-0.5 shrink-0 text-brand" />
                <a href={`tel:${phone.replace(/\s/g, '')}`} className="transition hover:text-brand">
                  {formatPhoneDisplay(phone)}
                </a>
              </li>
            ) : null}
            {email ? (
              <li className="flex gap-2">
                <IconMail size={16} className="mt-0.5 shrink-0 text-brand" />
                <a href={`mailto:${email}`} className="transition hover:text-brand">
                  {email}
                </a>
              </li>
            ) : null}
            {instagram ? (
              <li className="flex gap-2">
                <IconInstagram size={16} className="mt-0.5 shrink-0 text-brand" />
                <a
                  href={`https://instagram.com/${instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="transition hover:text-brand"
                >
                  @{instagram.replace('@', '')}
                </a>
              </li>
            ) : null}
          </ul>
        </div>
      </div>

      <div className="border-t border-ink-800/70">
        <div className="container-page flex flex-col items-center justify-between gap-3 py-5 text-xs text-white/40 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {displayName}. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-4">
            <span>Zona horaria: {business?.timezone || 'America/Santiago'}</span>
            {businessConfig.features.adminLink ? (
              <Link to="/admin/login" className="transition hover:text-brand">
                Acceso equipo
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </footer>
  )
}
