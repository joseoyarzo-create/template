import { Link } from 'react-router-dom'
import { businessConfig } from '@/config/business.config'
import { useBusiness } from '@/context/BusinessContext'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { ServiceCard } from '@/components/public/ServiceCard'
import { StaffCard } from '@/components/public/StaffCard'
import { OpeningHours } from '@/components/public/OpeningHours'
import { Card } from '@/components/ui/Card'
import { buttonClasses } from '@/components/ui/Button'
import { ErrorBlock, LoadingBlock, SectionHeading } from '@/components/ui/Feedback'
import {
  IconCalendar,
  IconClock,
  IconMapPin,
  IconPhone,
  IconStar,
  IconWhatsApp,
} from '@/components/ui/Icons'
import { formatPhoneDisplay, whatsappLink } from '@/lib/format'

/**
 * Página de inicio del sitio público.
 *
 * Todo el contenido (servicios, equipo, galería, contacto) proviene del
 * catálogo cargado desde Supabase en BusinessContext. Mientras carga, la
 * portada se muestra con los valores por defecto de business.config.ts para
 * evitar una pantalla vacía.
 */
export function HomePage() {
  const { services, staff, gallery, business, displayName, loading, error, ready } = useBusiness()

  useDocumentMeta(
    `${displayName} — Reserva tu hora online`,
    business?.description || businessConfig.description,
  )

  const heroImage = business?.hero_image_url || businessConfig.heroImage
  const tagline = business?.tagline || businessConfig.tagline
  const description = business?.description || businessConfig.description
  const whatsapp = business?.whatsapp || businessConfig.contact.whatsapp
  const phone = business?.phone || businessConfig.contact.phone
  const address = business?.address || businessConfig.contact.address
  const city = business?.city || businessConfig.contact.city

  const topServices = services.slice(0, 6)
  const topStaff = staff.slice(0, 3)
  const galleryPreview = gallery.slice(0, 8)

  return (
    <>
      {/* ------------------------------- Portada ------------------------------ */}
      <section className="relative isolate overflow-hidden">
        <img
          src={heroImage}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink-950/70 via-ink-950/85 to-ink-950" />

        <div className="container-page relative flex min-h-[78vh] flex-col justify-center py-20 sm:py-28">
          <div className="max-w-2xl animate-fade-in-up">
            <p className="eyebrow">{tagline}</p>
            <h1 className="mt-4 font-display text-4xl leading-tight text-white sm:text-6xl">
              {displayName}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
              {description}
            </p>

            {ready ? (
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link to="/reservar" className={buttonClasses('primary', 'lg')}>
                  <IconCalendar size={18} />
                  {businessConfig.copy.heroCta}
                </Link>
                <Link to="/servicios" className={buttonClasses('secondary', 'lg')}>
                  Ver servicios y precios
                </Link>
              </div>
            ) : (
              <div className="mt-8">
                <span className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200">
                  <IconClock size={16} />
                  Reserva online no disponible todavía
                </span>
              </div>
            )}

            <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/60">
              <li className="flex items-center gap-2">
                <IconStar size={15} className="text-brand" />
                Atención personalizada
              </li>
              <li className="flex items-center gap-2">
                <IconClock size={15} className="text-brand" />
                Reserva en menos de un minuto
              </li>
              <li className="flex items-center gap-2">
                <IconWhatsApp size={15} className="text-brand" />
                Confirmación al instante
              </li>
            </ul>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="container-page py-10">
          <LoadingBlock label="Cargando información del negocio…" />
        </div>
      ) : null}

      {error && !ready ? (
        <div className="container-page py-10">
          <ErrorBlock message={error} />
        </div>
      ) : null}

      {/* ------------------------------ Servicios ----------------------------- */}
      {topServices.length > 0 ? (
        <section className="container-page py-16 sm:py-20">
          <SectionHeading
            eyebrow="Nuestros servicios"
            title={businessConfig.copy.servicesTitle}
            subtitle={businessConfig.copy.servicesSubtitle}
          />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {topServices.map((service) => (
              <ServiceCard key={service.id} service={service} compact />
            ))}
          </div>
          {services.length > topServices.length ? (
            <div className="mt-8">
              <Link to="/servicios" className={buttonClasses('secondary', 'md')}>
                Ver todos los servicios
              </Link>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* -------------------------------- Equipo ------------------------------ */}
      {businessConfig.features.team && topStaff.length > 0 ? (
        <section className="border-y border-ink-800/70 bg-ink-950/40">
          <div className="container-page py-16 sm:py-20">
            <SectionHeading
              eyebrow="Quiénes te atienden"
              title={businessConfig.copy.teamTitle}
              subtitle={businessConfig.copy.teamSubtitle}
            />
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {topStaff.map((member) => (
                <StaffCard key={member.id} member={member} services={[]} />
              ))}
            </div>
            {staff.length > topStaff.length ? (
              <div className="mt-8">
                <Link to="/equipo" className={buttonClasses('secondary', 'md')}>
                  Conocer a todo el equipo
                </Link>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* ------------------------------- Galería ------------------------------ */}
      {businessConfig.features.gallery && galleryPreview.length > 0 ? (
        <section className="container-page py-16 sm:py-20">
          <SectionHeading
            eyebrow="Nuestro trabajo"
            title={businessConfig.copy.galleryTitle}
            subtitle={businessConfig.copy.gallerySubtitle}
          />
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {galleryPreview.map((image) => (
              <Link
                key={image.id}
                to="/galeria"
                className="group relative aspect-square overflow-hidden rounded-xl border border-ink-800"
              >
                <img
                  src={image.image_url}
                  alt={image.title || 'Trabajo de la barbería'}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* --------------------------- Información y CTA ------------------------ */}
      <section className="container-page pb-20">
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <p className="eyebrow">Visítanos</p>
            <h2 className="mt-3 font-display text-2xl text-white">
              {businessConfig.copy.contactTitle}
            </h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <ul className="space-y-4 text-sm text-white/70">
                {address ? (
                  <li className="flex gap-3">
                    <IconMapPin size={18} className="mt-0.5 shrink-0 text-brand" />
                    <span>
                      {address}
                      {city ? `, ${city}` : ''}
                    </span>
                  </li>
                ) : null}
                {phone ? (
                  <li className="flex gap-3">
                    <IconPhone size={18} className="mt-0.5 shrink-0 text-brand" />
                    <a href={`tel:${phone.replace(/\s/g, '')}`} className="hover:text-brand">
                      {formatPhoneDisplay(phone)}
                    </a>
                  </li>
                ) : null}
                <li className="flex gap-3">
                  <IconClock size={18} className="mt-0.5 shrink-0 text-brand" />
                  <OpeningHours className="flex-1 space-y-1" />
                </li>
              </ul>

              <div className="space-y-3">
                <Link to="/reservar" className={buttonClasses('primary', 'md', 'w-full')}>
                  <IconCalendar size={16} />
                  {businessConfig.copy.heroCta}
                </Link>
                <Link to="/contacto" className={buttonClasses('secondary', 'md', 'w-full')}>
                  Ver ubicación y contacto
                </Link>
                {whatsapp ? (
                  <a
                    href={whatsappLink(whatsapp, `Hola ${displayName}, quiero consultar por una hora.`)}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={buttonClasses('secondary', 'md', 'w-full')}
                  >
                    <IconWhatsApp size={16} />
                    Escribir por WhatsApp
                  </a>
                ) : null}
              </div>
            </div>
          </Card>

          <Card className="flex flex-col justify-between bg-gradient-to-br from-brand/15 to-transparent">
            <div>
              <p className="eyebrow">Agenda ahora</p>
              <h3 className="mt-3 font-display text-2xl text-white">
                Tu próxima visita, en un par de clics
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-white/65">
                Elige servicio, profesional, día y hora. Recibirás un código de referencia para
                confirmar y administrar tu reserva.
              </p>
            </div>
            <Link to="/reservar" className={buttonClasses('primary', 'md', 'mt-6 w-full')}>
              <IconCalendar size={16} />
              Reservar hora
            </Link>
          </Card>
        </div>
      </section>
    </>
  )
}
