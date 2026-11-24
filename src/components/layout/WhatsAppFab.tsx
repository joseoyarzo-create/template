import { businessConfig } from '@/config/business.config'
import { useBusiness } from '@/context/BusinessContext'
import { whatsappLink } from '@/lib/format'
import { IconWhatsApp } from '@/components/ui/Icons'

/**
 * Botón flotante de WhatsApp. El número se configura en el panel
 * (businesses.whatsapp) o en .env como VITE_BUSINESS_WHATSAPP.
 * Si no hay número configurado, no se muestra nada.
 */
export function WhatsAppFab() {
  const { business, displayName } = useBusiness()
  const raw = business?.whatsapp || businessConfig.contact.whatsapp
  const href = whatsappLink(raw, `Hola ${displayName}, quiero reservar una hora.`)

  if (!href) return null

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      aria-label="Contactar por WhatsApp"
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-card transition-transform hover:scale-105 active:scale-95 sm:bottom-7 sm:right-7"
    >
      <IconWhatsApp size={26} />
    </a>
  )
}
