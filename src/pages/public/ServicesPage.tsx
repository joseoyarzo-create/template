import { Link } from 'react-router-dom'
import { businessConfig } from '@/config/business.config'
import { useBusiness } from '@/context/BusinessContext'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { ServiceCard } from '@/components/public/ServiceCard'
import { Card } from '@/components/ui/Card'
import { buttonClasses } from '@/components/ui/Button'
import { EmptyState, ErrorBlock, LoadingBlock, SectionHeading } from '@/components/ui/Feedback'
import { IconScissors } from '@/components/ui/Icons'
import type { Service } from '@/types/database'

/**
 * Catálogo público de servicios, agrupado por categoría cuando existen.
 * Los datos provienen del catálogo cargado en BusinessContext.
 */
export function ServicesPage() {
  const { services, catalog, displayName, loading, error, ready } = useBusiness()

  useDocumentMeta(
    `Servicios y precios — ${displayName}`,
    businessConfig.copy.servicesSubtitle,
  )

  const categories = catalog?.categories ?? []

  // Agrupa respetando el orden de las categorías; los servicios sin categoría
  // van en un grupo final.
  const groups: Array<{ key: string; title: string | null; items: Service[] }> = []
  for (const category of categories) {
    const items = services.filter((s) => s.category_id === category.id)
    if (items.length > 0) groups.push({ key: category.id, title: category.name, items })
  }
  const uncategorized = services.filter((s) => !s.category_id)
  if (uncategorized.length > 0) {
    groups.push({ key: 'sin-categoria', title: categories.length > 0 ? 'Otros servicios' : null, items: uncategorized })
  }

  return (
    <div className="container-page py-14 sm:py-20">
      <SectionHeading
        eyebrow="Catálogo"
        title={businessConfig.copy.servicesTitle}
        subtitle={businessConfig.copy.servicesSubtitle}
      />

      {loading ? <LoadingBlock label="Cargando servicios…" /> : null}

      {error && !ready ? (
        <div className="mt-10">
          <ErrorBlock message={error} />
        </div>
      ) : null}

      {ready && services.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={<IconScissors size={22} />}
            title="Aún no hay servicios publicados"
            description="El negocio todavía no ha cargado su catálogo. Escríbenos por WhatsApp y te ayudamos."
            action={
              <Link to="/contacto" className={buttonClasses('secondary', 'md')}>
                Ir a contacto
              </Link>
            }
          />
        </div>
      ) : null}

      {groups.length > 0 ? (
        <div className="mt-12 space-y-14">
          {groups.map((group) => (
            <section key={group.key}>
              {group.title ? (
                <div className="mb-6 flex items-center gap-4">
                  <h2 className="font-display text-xl text-white sm:text-2xl">{group.title}</h2>
                  <span className="h-px flex-1 bg-gradient-to-r from-ink-700 to-transparent" />
                </div>
              ) : null}
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((service) => (
                  <ServiceCard key={service.id} service={service} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}

      {ready && services.length > 0 ? (
        <Card className="mt-14 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="font-display text-xl text-white">¿Listo para agendar?</h3>
            <p className="mt-1 text-sm text-white/60">
              Elige tu servicio y revisa los horarios disponibles.
            </p>
          </div>
          <Link to="/reservar" className={buttonClasses('primary', 'md')}>
            Reservar hora
          </Link>
        </Card>
      ) : null}
    </div>
  )
}
