import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useBusiness } from '@/context/BusinessContext'
import { useToast } from '@/context/ToastContext'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { supabase } from '@/lib/supabase'
import { authService } from '@/services'
import { Button, Card } from '@/components/ui'
import { Field, Input } from '@/components/ui/Form'
import { IconAlert, IconLock, IconScissors } from '@/components/ui/Icons'
import { toAppError } from '@/lib/errors'
import { cn } from '@/lib/utils'

type Tab = 'login' | 'invite'

/**
 * Acceso al panel administrativo.
 *
 * No existen credenciales por defecto: para crear el primer administrador se
 * debe canjear una invitación de un solo uso (ver docs/SUPABASE_SETUP.md).
 */
export function LoginPage() {
  const { signIn, session, canAccessAdmin, loading } = useAuth()
  const { displayName } = useBusiness()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const inviteFromUrl = searchParams.get('invite') || ''
  const [tab, setTab] = useState<Tab>(inviteFromUrl ? 'invite' : 'login')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState(inviteFromUrl)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const from = (location.state as { from?: string } | null)?.from || '/admin'

  useDocumentMeta(`Acceso equipo — ${displayName}`, 'Panel de administración')

  // Si ya hay sesión válida, entra directo al panel.
  useEffect(() => {
    if (!loading && session && canAccessAdmin) {
      navigate(from, { replace: true })
    }
  }, [loading, session, canAccessAdmin, from, navigate])

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signIn(email.trim(), password)
      toast.success('Sesión iniciada.')
    } catch (err) {
      setError(toAppError(err).message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRedeem(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    if (!token.trim()) {
      setError('Ingresa el código de invitación.')
      return
    }
    setSubmitting(true)
    try {
      let activeSession = session
      if (!activeSession) {
        // Crea la cuenta y comprueba si Supabase ya devolvió sesión.
        await authService.signUp(email.trim(), password)
        const { data } = await supabase.auth.getSession()
        activeSession = data.session
        if (!activeSession) {
          setError(
            'Tu cuenta fue creada. Revisa tu correo para confirmarla y luego vuelve a ingresar con tu contraseña para activar la invitación.',
          )
          return
        }
      }

      await authService.redeemAdminInvite(token.trim())
      toast.success('Invitación activada. Ya puedes administrar el negocio.')
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(toAppError(err).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex flex-col items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-brand/50 text-brand">
              <IconScissors size={22} />
            </span>
            <span className="font-display text-xl text-white">{displayName}</span>
          </Link>
          <p className="mt-3 text-xs uppercase tracking-[0.2em] text-white/40">
            Panel de gestión
          </p>
        </div>

        <Card>
          {/* Pestañas */}
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl border border-ink-800 bg-ink-950/60 p-1">
            {(['login', 'invite'] as Tab[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setTab(value)
                  setError(null)
                }}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition',
                  tab === value ? 'bg-brand/15 text-brand' : 'text-white/60 hover:text-white',
                )}
              >
                {value === 'login' ? 'Iniciar sesión' : 'Activar invitación'}
              </button>
            ))}
          </div>

          {tab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-white/55">
                <IconLock size={16} className="text-brand" />
                Ingresa con tu cuenta autorizada.
              </div>
              <Field label="Correo electrónico" required htmlFor="login-email">
                <Input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.cl"
                  autoComplete="email"
                  required
                />
              </Field>
              <Field label="Contraseña" required htmlFor="login-password">
                <Input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </Field>
              {error ? <ErrorLine message={error} /> : null}
              <Button type="submit" fullWidth loading={submitting}>
                Entrar al panel
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRedeem} className="space-y-4">
              <p className="text-sm leading-relaxed text-white/55">
                Si recibiste un código de invitación, crea tu cuenta o inicia sesión y actívalo
                aquí para acceder al panel.
              </p>
              <Field label="Correo electrónico" required htmlFor="invite-email">
                <Input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.cl"
                  autoComplete="email"
                  required
                />
              </Field>
              <Field
                label="Contraseña"
                required
                htmlFor="invite-password"
                hint="Mínimo 6 caracteres. Se usará si aún no tienes cuenta."
              >
                <Input
                  id="invite-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                />
              </Field>
              <Field label="Código de invitación" required htmlFor="invite-token">
                <Input
                  id="invite-token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Pega aquí el código recibido"
                  required
                />
              </Field>
              {error ? <ErrorLine message={error} /> : null}
              <Button type="submit" fullWidth loading={submitting}>
                Activar y entrar
              </Button>
            </form>
          )}
        </Card>

        <p className="mt-6 text-center text-xs text-white/40">
          <Link to="/" className="transition hover:text-brand">
            Volver al sitio público
          </Link>
        </p>
      </div>
    </div>
  )
}

function ErrorLine({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/5 px-3 py-2.5 text-sm text-red-200">
      <IconAlert size={16} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  )
}
