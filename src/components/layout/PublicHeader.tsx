import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { businessConfig } from '@/config/business.config'
import { useBusiness } from '@/context/BusinessContext'
import { buttonClasses } from '@/components/ui/Button'
import { IconCalendar, IconClose, IconMenu, IconScissors } from '@/components/ui/Icons'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  to: string
  enabled: boolean
}

export function PublicHeader() {
  const { displayName, business, ready } = useBusiness()
  const [open, setOpen] = useState(false)
  const location = useLocation()

  // Cierra el menú móvil al navegar.
  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  const items: NavItem[] = [
    { label: 'Inicio', to: '/', enabled: true },
    { label: 'Servicios', to: '/servicios', enabled: true },
    { label: 'Galería', to: '/galeria', enabled: businessConfig.features.gallery },
    { label: 'Equipo', to: '/equipo', enabled: businessConfig.features.team },
    { label: 'Contacto', to: '/contacto', enabled: true },
  ]

  const logo = business?.logo_url

  return (
    <header className="sticky top-0 z-40 border-b border-ink-800/80 bg-ink-950/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-4 sm:h-20">
        <Link to="/" className="flex items-center gap-3">
          {logo ? (
            <img src={logo} alt={displayName} className="h-9 w-auto object-contain" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-brand/50 text-brand">
              <IconScissors size={18} />
            </span>
          )}
          <span className="flex flex-col leading-none">
            <span className="font-display text-lg text-white">{displayName}</span>
            <span className="mt-0.5 hidden text-[10px] uppercase tracking-[0.2em] text-white/45 sm:block">
              {business?.city || businessConfig.tagline}
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {items
            .filter((item) => item.enabled)
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
                    isActive ? 'text-brand' : 'text-white/70 hover:text-white',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/reservar"
            className={buttonClasses('primary', 'sm', 'hidden sm:inline-flex')}
            aria-disabled={!ready}
          >
            <IconCalendar size={16} />
            {businessConfig.copy.heroCta}
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-ink-700 text-white/80 lg:hidden"
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={open}
          >
            {open ? <IconClose size={18} /> : <IconMenu size={18} />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-ink-800 bg-ink-950/95 lg:hidden">
          <nav className="container-page flex flex-col py-3">
            {items
              .filter((item) => item.enabled)
              .map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'rounded-lg px-3 py-3 text-sm font-medium transition-colors',
                      isActive ? 'bg-ink-900 text-brand' : 'text-white/75 hover:bg-ink-900',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            <Link to="/reservar" className={buttonClasses('primary', 'md', 'mt-3')}>
              <IconCalendar size={16} />
              {businessConfig.copy.heroCta}
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  )
}
