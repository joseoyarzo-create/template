import { Link } from 'react-router-dom'
import { buttonClasses } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

/**
 * Aviso de configuración pendiente.
 *
 * Se muestra cuando falta alguna variable de entorno (Supabase o slug).
 * Indica exactamente qué falta para que la app pueda funcionar con datos
 * reales; nunca simula datos falsos.
 */
export function ConfigNotice({ missingKeys }: { missingKeys: string[] }) {
  return (
    <div className="container-page py-16">
      <Card className="mx-auto max-w-2xl border-amber-500/40 bg-amber-500/5">
        <p className="eyebrow text-amber-300">Configuración pendiente</p>
        <h1 className="mt-3 font-display text-2xl text-white">
          Falta conectar la base de datos
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-white/70">
          Esta instalación todavía no está enlazada a Supabase. Crea un archivo
          <code className="mx-1 rounded bg-ink-800 px-1.5 py-0.5 text-xs text-brand">.env</code>
          (o define las variables en Cloudflare Pages) con los siguientes valores:
        </p>
        <ul className="mt-4 space-y-2">
          {missingKeys.map((key) => (
            <li
              key={key}
              className="flex items-center gap-2 rounded-lg border border-ink-800 bg-ink-950/60 px-3 py-2 text-sm"
            >
              <span className="text-amber-300">●</span>
              <code className="text-white/85">{key}</code>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-white/50">
          Revisa <code className="text-brand">docs/INSTALL.md</code> y
          <code className="ml-1 text-brand">docs/SUPABASE_SETUP.md</code> para los pasos completos.
        </p>
        <Link to="/admin/login" className={buttonClasses('secondary', 'sm', 'mt-6')}>
          Ir al panel administrativo
        </Link>
      </Card>
    </div>
  )
}
