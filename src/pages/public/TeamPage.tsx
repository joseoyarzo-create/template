import { Link } from 'react-router-dom'
import { businessConfig } from '@/config/business.config'
import { useBusiness } from '@/context/BusinessContext'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { StaffCard } from '@/components/public/StaffCard'
import { Card } from '@/components/ui/Card'
import { buttonClasses } from '@/components/ui/Button'
import { EmptyState, ErrorBlock, LoadingBlock, SectionHeading } from '@/components/ui/Feedback'
import { IconUsers } from '@/components/ui/Icons'

/**
 * Página del equipo. Se habilita con businessConfig.features.team.
 * Los servicios mostrados por profesional provienen de staff_services; si no
 * hay asignaciones explícitas, no se listan (el profesional realiza todo).
 */
export function TeamPage() {
  const { staff, services, staffServices, displayName, loading, error, ready } = useBusiness()

  useDocumentMeta(`Nuestro equipo — ${displayName}`, businessConfig.copy.teamSubtitle)

  const hasAssignments = staffServices.length > 0

  const servicesForStaff = (staffId: string) => {
    if (!hasAssignments) return []
    const ids = staffServices.filter((ss) => ss.staff_id === staffId).map((ss) => ss.service_id)
    return services.filter((s) => ids.includes(s.id))
  }

  return (
    <div className="container-page py-14 sm:py-20">
      <SectionHeading
        eyebrow="Quiénes te atienden"
        title={businessConfig.copy.teamTitle}
        subtitle={businessConfig.copy.teamSubtitle}
      />

      {loading ? <LoadingBlock label="Cargando equipo…" /> : null}

      {error && !ready ? (
        <div className="mt-10">
          <ErrorBlock message={error} />
        </div>
      ) : null}

      {ready && staff.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={<IconUsers size={22} />}
            title="Aún no hay profesionales publicados"
            description="El negocio todavía no ha cargado a su equipo."
            action={
              <Link to="/contacto" className={buttonClasses('secondary', 'md')}>
                Ir a contacto
              </Link>
            }
          />
        </div>
      ) : null}

      {staff.length > 0 ? (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {staff.map((member) => (
            <StaffCard key={member.id} member={member} services={servicesForStaff(member.id)} />
          ))}
        </div>
      ) : null}

      {ready && staff.length > 0 ? (
        <Card className="mt-14 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="font-display text-xl text-white">Reserva con tu profesional favorito</h3>
            <p className="mt-1 text-sm text-white/60">
              Selecciona el profesional al momento de reservar tu hora.
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
