import { Link } from 'react-router-dom'
import { businessConfig } from '@/config/business.config'
import { useBusiness } from '@/context/BusinessContext'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { OpeningHours } from '@/components/public/OpeningHours'
import { Card } from '@/components/ui/Card'
import { buttonClasses } from '@/components/ui/Button'
import { SectionHeading } from '@/components/ui/Feedback'
import {
  IconInstagram,
  IconMail,
  IconMapPin,
  IconPhone,
  IconWhatsApp,
} from '@/components/ui/Icons'
import { formatPhoneDisplay, whatsappLink } from '@/lib/format'

/**
 * Página de contacto: ubicación, horarios, teléfono, correo, redes y WhatsApp.
 * El número de WhatsApp y los datos se configuran desde el panel o en .env.
 */
export function ContactPage() {
  const { business, displayName } = useBusiness()

  useDocumentMeta(`Contacto y ubicación — ${displayName}`, businessConfig.copy.contactTitle)

  const phone = business?.phone || businessConfig.contact.phone
  const whatsapp = business?.whatsapp || businessConfig.contact.whatsapp
  const email = business?.email || businessConfig.contact.email
  const address = business?.address || businessConfig.contact.address
  const city = business?.city || businessConfig.contact.city
  const instagram = business?.instagram || businessConfig.contact.instagram
  const mapUrl = business?.map_url || businessConfig.contact.mapUrl

  const fullAddress = [address, city].filter(Boolean).join(', ')
  const mapsSearchUrl = fullAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`
    : ''

  return (
    <div className="container-page py-14 sm:py-20">
      <SectionHeading
        eyebrow="Estamos aquí"
        title={businessConfig.copy.contactTitle}
        subtitle="Visítanos, escríbenos o agenda tu hora en línea."
      />

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {/* Datos de contacto */}
        <Card className="lg:col-span-1">
          <h2 className="font-display text-lg text-white">Datos de contacto</h2>
          <ul className="mt-5 space-y-4 text-sm text-white/70">
            {fullAddress ? (
              <li className="flex gap-3">
                <IconMapPin size={18} className="mt-0.5 shrink-0 text-brand" />
                <span>{fullAddress}</span>
              </li>
            ) : null}
            {phone ? (
              <li className="flex gap-3">
                <IconPhone size={18} className="mt-0.5 shrink-0 text-brand" />
                <a href={`tel:${phone.replace(/\s/g, '')}`} className="transition hover:text-brand">
                  {formatPhoneDisplay(phone)}
                </a>
              </li>
            ) : null}
            {email ? (
              <li className="flex gap-3">
                <IconMail size={18} className="mt-0.5 shrink-0 text-brand" />
                <a href={`mailto:${email}`} className="transition hover:text-brand">
                  {email}
                </a>
              </li>
            ) : null}
            {instagram ? (
              <li className="flex gap-3">
                <IconInstagram size={18} className="mt-0.5 shrink-0 text-brand" />
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

          <div className="mt-6 space-y-3">
            <Link to="/reservar" className={buttonClasses('primary', 'md', 'w-full')}>
              Reservar hora
            </Link>
            {whatsapp ? (
              <a
                href={whatsappLink(whatsapp, `Hola ${displayName}, quiero hacer una consulta.`)}
                target="_blank"
                rel="noreferrer noopener"
                className={buttonClasses('secondary', 'md', 'w-full')}
              >
                <IconWhatsApp size={16} />
                Escribir por WhatsApp
              </a>
            ) : null}
          </div>

          <div className="mt-7 border-t border-ink-800 pt-6">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
              Horario de atención
            </h3>
            <OpeningHours className="mt-4 space-y-2 text-sm text-white/65" />
          </div>
        </Card>

        {/* Mapa */}
        <Card padding="none" className="overflow-hidden lg:col-span-2">
          {mapUrl ? (
            <iframe
              title="Ubicación"
              src={mapUrl}
              className="h-[420px] w-full border-0 lg:h-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : mapsSearchUrl ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-4 bg-ink-950/50 p-8 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-brand/40 text-brand">
                <IconMapPin size={22} />
              </span>
              <div>
                <p className="font-display text-lg text-white">{fullAddress}</p>
                <p className="mt-2 text-sm text-white/55">
                  Abre la ubicación en Google Maps para ver el mapa y cómo llegar.
                </p>
              </div>
              <a
                href={mapsSearchUrl}
                target="_blank"
                rel="noreferrer noopener"
                className={buttonClasses('secondary', 'md')}
              >
                Ver en Google Maps
              </a>
            </div>
          ) : (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 p-8 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-brand/40 text-brand">
                <IconMapPin size={22} />
              </span>
              <p className="text-sm text-white/55">
                La ubicación aún no está configurada. Un administrador puede agregarla desde el
                panel.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
