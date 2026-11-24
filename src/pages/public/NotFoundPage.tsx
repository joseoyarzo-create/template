import { Link } from 'react-router-dom'
import { buttonClasses } from '@/components/ui/Button'
import { IconScissors } from '@/components/ui/Icons'

export function NotFoundPage() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full border border-brand/40 text-brand">
        <IconScissors size={24} />
      </span>
      <h1 className="mt-6 font-display text-4xl text-white">Página no encontrada</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-white/55">
        La dirección que buscas no existe o cambió de ubicación.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link to="/" className={buttonClasses('primary', 'md')}>
          Volver al inicio
        </Link>
        <Link to="/reservar" className={buttonClasses('secondary', 'md')}>
          Reservar una hora
        </Link>
      </div>
    </div>
  )
}
