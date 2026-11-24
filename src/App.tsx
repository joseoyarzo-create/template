import { Route, Routes } from 'react-router-dom'
import { isSupabaseConfigured, missingEnvKeys } from '@/config/env'
import { AuthProvider } from '@/context/AuthContext'
import { BusinessProvider } from '@/context/BusinessContext'
import { ToastProvider } from '@/context/ToastContext'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { RequireAdmin, RequireAuth } from '@/components/layout/ProtectedRoute'
import { ConfigNotice } from '@/components/ui/ConfigNotice'
import { businessConfig } from '@/config/business.config'

import { HomePage } from '@/pages/public/HomePage'
import { ServicesPage } from '@/pages/public/ServicesPage'
import { GalleryPage } from '@/pages/public/GalleryPage'
import { TeamPage } from '@/pages/public/TeamPage'
import { BookingPage } from '@/pages/public/BookingPage'
import { BookingConfirmationPage } from '@/pages/public/BookingConfirmationPage'
import { ContactPage } from '@/pages/public/ContactPage'
import { NotFoundPage } from '@/pages/public/NotFoundPage'

import { LoginPage } from '@/pages/admin/LoginPage'
import { NoAccessPage } from '@/pages/admin/NoAccessPage'
import { DashboardPage } from '@/pages/admin/DashboardPage'
import { CalendarPage } from '@/pages/admin/CalendarPage'
import { BookingsPage } from '@/pages/admin/BookingsPage'
import { AdminServicesPage } from '@/pages/admin/AdminServicesPage'
import { StaffPage } from '@/pages/admin/StaffPage'
import { SchedulePage } from '@/pages/admin/SchedulePage'
import { BlocksPage } from '@/pages/admin/BlocksPage'
import { CustomersPage } from '@/pages/admin/CustomersPage'
import { StatsPage } from '@/pages/admin/StatsPage'
import { SettingsPage } from '@/pages/admin/SettingsPage'

/**
 * Árbol de rutas.
 *
 * Si falta configuración externa (Supabase), se muestra un aviso explícito en
 * lugar de una aplicación sin datos.
 */
export default function App() {
  if (!isSupabaseConfigured) {
    return (
      <ToastProvider>
        <ConfigNotice missingKeys={missingEnvKeys} />
      </ToastProvider>
    )
  }

  return (
    <ToastProvider>
      <BusinessProvider>
        <AuthProvider>
          <Routes>
            {/* ---------------------------- Sitio público ---------------------- */}
            <Route element={<PublicLayout />}>
              <Route index element={<HomePage />} />
              <Route path="servicios" element={<ServicesPage />} />
              {businessConfig.features.gallery ? (
                <Route path="galeria" element={<GalleryPage />} />
              ) : null}
              {businessConfig.features.team ? <Route path="equipo" element={<TeamPage />} /> : null}
              <Route path="reservar" element={<BookingPage />} />
              <Route path="reserva/:reference" element={<BookingConfirmationPage />} />
              <Route path="contacto" element={<ContactPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>

            {/* --------------------------- Acceso al panel --------------------- */}
            <Route path="/admin/login" element={<LoginPage />} />
            <Route path="/admin/sin-acceso" element={<NoAccessPage />} />

            {/* --------------------- Panel (autenticado) ----------------------- */}
            <Route path="/admin" element={<RequireAuth />}>
              <Route element={<AdminLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="calendario" element={<CalendarPage />} />
                <Route path="reservas" element={<BookingsPage />} />
                <Route path="clientes" element={<CustomersPage />} />

                <Route element={<RequireAdmin />}>
                  <Route path="servicios" element={<AdminServicesPage />} />
                  <Route path="personal" element={<StaffPage />} />
                  <Route path="horarios" element={<SchedulePage />} />
                  <Route path="bloqueos" element={<BlocksPage />} />
                  {businessConfig.features.adminStats ? (
                    <Route path="estadisticas" element={<StatsPage />} />
                  ) : null}
                  <Route path="ajustes" element={<SettingsPage />} />
                </Route>
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </BusinessProvider>
    </ToastProvider>
  )
}
