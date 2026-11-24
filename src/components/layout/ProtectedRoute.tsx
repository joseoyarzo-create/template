import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { LoadingBlock } from '@/components/ui/Feedback'

/**
 * Guardas de navegación del panel.
 *
 * IMPORTANTE: estas guardas solo controlan la interfaz. La autorización real
 * la aplica PostgreSQL con RLS: aunque alguien salte la guarda, no podrá leer
 * ni escribir datos que no le correspondan.
 */

function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoadingBlock label="Verificando sesión…" />
    </div>
  )
}

/** Exige sesión activa y pertenencia a la empresa. */
export function RequireAuth() {
  const { session, loading, canAccessAdmin } = useAuth()
  const location = useLocation()

  if (loading) return <FullPageLoader />
  if (!session) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  if (!canAccessAdmin) return <Navigate to="/admin/sin-acceso" replace />
  return <Outlet />
}

/** Exige rol owner o admin (además de RequireAuth como padre). */
export function RequireAdmin() {
  const { loading, isAdmin } = useAuth()

  if (loading) return <FullPageLoader />
  if (!isAdmin) return <Navigate to="/admin" replace />
  return <Outlet />
}
