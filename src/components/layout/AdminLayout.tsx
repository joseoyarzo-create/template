import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { businessConfig } from '@/config/business.config'
import { useAuth } from '@/context/AuthContext'
import { useBusiness } from '@/context/BusinessContext'
import { RoleBadge } from '@/components/ui/Badge'
import {
  IconBan,
  IconCalendar,
  IconChart,
  IconClose,
  IconHome,
  IconLogout,
  IconMenu,
  IconScissors,
  IconSettings,
  IconClock,
  IconUsers,
} from '@/components/ui/Icons'
import { cn } from '@/lib/utils'

type NavIcon = (props: { size?: number; className?: string }) => JSX.Element

interface AdminNavItem {
  label: string
  to: string
  icon: NavIcon
  end?: boolean
  /** Si se indica, el enlace solo aparece para owner/admin. */
  adminOnly?: boolean
  /** Requiere que la funcionalidad esté activa en la configuración. */
  feature?: 'adminStats'
}

const NAV_ITEMS: AdminNavItem[] = [
  { label: 'Resumen', to: '/admin', icon: IconHome, end: true },
  { label: 'Calendario', to: '/admin/calendario', icon: IconCalendar },
  { label: 'Reservas', to: '/admin/reservas', icon: IconScissors },
  { label: 'Servicios', to: '/admin/servicios', icon: IconScissors, adminOnly: true },
  { label: 'Personal', to: '/admin/personal', icon: IconUsers, adminOnly: true },
  { label: 'Horarios', to: '/admin/horarios', icon: IconClock, adminOnly: true },
  { label: 'Bloqueos', to: '/admin/bloqueos', icon: IconBan, adminOnly: true },
  { label: 'Clientes', to: '/admin/clientes', icon: IconUsers },
  { label: 'Estadísticas', to: '/admin/estadisticas', icon: IconChart, adminOnly: true, feature: 'adminStats' },
  { label: 'Configuración', to: '/admin/ajustes', icon: IconSettings, adminOnly: true },
]

export function AdminLayout() {
  const { user, role, isAdmin, signOut, membership } = useAuth()
  const { displayName } = useBusiness()
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const businessName = membership?.business_name || displayName

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.adminOnly && !isAdmin) return false
    if (item.feature && !businessConfig.features[item.feature]) return false
    return true
  })

  const sidebar = (
    <nav className="flex h-full flex-col">
      <div className="px-5 py-5">
        <Link to="/" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-brand/50 text-brand">
            <IconScissors size={18} />
          </span>
          <span className="font-display text-base leading-tight text-white">{businessName}</span>
        </Link>
        <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-white/35">Panel de gestión</p>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto px-3">
        {visibleItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand/10 text-brand'
                    : 'text-white/65 hover:bg-ink-800/70 hover:text-white',
                )
              }
            >
              <Icon size={18} />
              {item.label}
            </NavLink>
          )
        })}
      </div>

      <div className="border-t border-ink-800 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-800 text-xs font-semibold text-white/80">
            {(user?.email ?? '?').slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-white/75">{user?.email}</p>
            {role ? <RoleBadge role={role} /> : null}
          </div>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-3 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/60 transition hover:bg-ink-800/70 hover:text-white"
        >
          <IconLogout size={16} />
          Cerrar sesión
        </button>
      </div>
    </nav>
  )

  return (
    <div className="min-h-screen lg:flex">
      {/* Sidebar escritorio */}
      <aside className="hidden w-64 shrink-0 border-r border-ink-800 bg-ink-950/60 lg:block">
        <div className="sticky top-0 h-screen">{sidebar}</div>
      </aside>

      {/* Sidebar móvil */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative h-full w-72 max-w-[82%] border-r border-ink-800 bg-ink-950 animate-fade-in">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Cerrar menú"
              className="absolute right-3 top-3 text-white/50 hover:text-white"
            >
              <IconClose size={18} />
            </button>
            {sidebar}
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-ink-800 bg-ink-950/85 px-4 backdrop-blur-md lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-ink-700 text-white/80"
            aria-label="Abrir menú"
          >
            <IconMenu size={18} />
          </button>
          <span className="font-display text-sm text-white">Panel</span>
          <Link
            to="/"
            className="text-xs text-white/60 transition hover:text-brand"
          >
            Ver sitio
          </Link>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

/** Cabecera estándar para páginas del panel. */
export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl text-white">{title}</h1>
        {description ? <p className="mt-1 text-sm text-white/55">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
