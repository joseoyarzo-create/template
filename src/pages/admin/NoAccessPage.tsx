import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { useBusiness } from '@/context/BusinessContext'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { authService } from '@/services'
import { Button, Card, buttonClasses } from '@/components/ui'
import { Field, Input } from '@/components/ui/Form'
import { IconAlert, IconLock } from '@/components/ui/Icons'
import { toAppError } from '@/lib/errors'

/**
 * Se muestra cuando el usuario tiene sesión pero no pertenece a ninguna
 * empresa. Permite activar una invitación para obtener acceso.
 */
export function NoAccessPage() {
  const { user, reloadMemberships, signOut } = useAuth()
  const { displayName } = useBusiness()
  const toast = useToast()
  const navigate = useNavigate()

  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useDocumentMeta(`Sin acceso — ${displayName}`, 'Tu cuenta no tiene acceso a este panel')

  async function handleRedeem(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    if (!token.trim()) {
      setError('Ingresa el código de invitación.')
      return
    }
    setLoading(true)
    try {
      await authService.redeemAdminInvite(token.trim())
      await reloadMemberships()
      toast.success('Acceso concedido.')
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(toAppError(err).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-12">
      <Card className="w-full max-w-md">
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-amber-500/40 text-amber-300">
          <IconLock size={22} />
        </span>
        <h1 className="mt-5 font-display text-2xl text-white">Tu cuenta no tiene acceso</h1>
        <p className="mt-2 text-sm leading-relaxed text-white/60">
          Iniciaste sesión como
          <span className="mx-1 text-white/85">{user?.email}</span>
          pero esta cuenta no está vinculada a ningún negocio. Pide una invitación al
          administrador o actívala aquí.
        </p>

        <form onSubmit={handleRedeem} className="mt-6 space-y-4">
          <Field label="Código de invitación" required htmlFor="noaccess-token">
            <Input
              id="noaccess-token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Pega aquí el código recibido"
            />
          </Field>
          {error ? (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/5 px-3 py-2.5 text-sm text-red-200">
              <IconAlert size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}
          <Button type="submit" fullWidth loading={loading}>
            Activar invitación
          </Button>
        </form>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-ink-800 pt-5">
          <Link to="/" className="text-sm text-white/55 transition hover:text-brand">
            Volver al sitio
          </Link>
          <button
            type="button"
            onClick={() => void signOut()}
            className={buttonClasses('ghost', 'sm')}
          >
            Cerrar sesión
          </button>
        </div>
      </Card>
    </div>
  )
}
