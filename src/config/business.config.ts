import { env } from '@/config/env'

/**
 * =============================================================================
 *  CONFIGURACIÓN DE LA EMPRESA
 * =============================================================================
 *  Este es el ÚNICO archivo que deberías tocar al crear una instalación nueva
 *  para otra barbería (junto con el archivo .env).
 *
 *  Qué vive aquí:
 *    - Identidad visual por defecto (colores, tipografía, imágenes de respaldo).
 *    - Textos de marca y navegación.
 *    - Interruptores de funcionalidades.
 *
 *  Qué NO vive aquí (porque es contenido editable por el dueño del negocio):
 *    - Servicios, precios, profesionales, horarios, galería y datos de contacto.
 *      Todo eso se lee de Supabase y se administra desde el panel.
 *
 *  Los colores definidos aquí son el valor inicial; si la empresa tiene colores
 *  guardados en `businesses.primary_color` / `ink_color`, esos tienen prioridad.
 * =============================================================================
 */

export interface BusinessConfig {
  /** Slug público. Se toma de VITE_BUSINESS_SLUG. */
  slug: string
  /** Nombre por defecto si la base de datos aún no responde. */
  name: string
  /** Lema corto de portada. */
  tagline: string
  /** Descripción por defecto (la definitiva viene de la BD). */
  description: string
  brand: {
    /** Color de acento (dorado por defecto). Formato HEX. */
    primary: string
    /** Color base oscuro. Formato HEX. */
    ink: string
    /** Nombres de fuentes cargadas en index.html. */
    displayFont: string
    bodyFont: string
  }
  contact: {
    phone: string
    whatsapp: string
    email: string
    address: string
    city: string
    instagram: string
    mapUrl: string
  }
  social: {
    instagram: string
  }
  /** Imagen de portada de respaldo mientras carga la BD. */
  heroImage: string
  /** Textos de secciones del sitio público. */
  copy: {
    heroCta: string
    servicesTitle: string
    servicesSubtitle: string
    teamTitle: string
    teamSubtitle: string
    galleryTitle: string
    gallerySubtitle: string
    bookingTitle: string
    bookingSubtitle: string
    contactTitle: string
  }
  features: {
    /** Habilita la galería en la navegación y las rutas. */
    gallery: boolean
    /** Habilita la página de equipo. */
    team: boolean
    /** Habilita el módulo de estadísticas en el panel. */
    adminStats: boolean
    /** Muestra el enlace al panel en el footer público. */
    adminLink: boolean
  }
  /** Mensaje que se muestra si la reserva online está deshabilitada. */
  bookingDisabledMessage: string
}

export const businessConfig: BusinessConfig = {
  slug: env.businessSlug,
  name: env.overrides.name || 'Barbería',
  tagline: 'Estilo clásico, precisión moderna',
  description:
    'Cortes clásicos, arreglo de barba y cuidado personal con productos de primera línea. Agenda tu hora en línea en menos de un minuto.',
  brand: {
    primary: '#C9A227',
    ink: '#0B0B0C',
    displayFont: 'Playfair Display',
    bodyFont: 'Inter',
  },
  contact: {
    phone: env.overrides.phone || '+56 9 0000 0000',
    whatsapp: env.overrides.whatsapp || '',
    email: '',
    address: env.overrides.address || '',
    city: '',
    instagram: '',
    mapUrl: '',
  },
  social: {
    instagram: '',
  },
  heroImage:
    'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1600&q=80',
  copy: {
    heroCta: 'Reservar hora',
    servicesTitle: 'Servicios y precios',
    servicesSubtitle: 'Elige el servicio que necesitas y conoce su duración y valor.',
    teamTitle: 'Nuestro equipo',
    teamSubtitle: 'Profesionales con años de experiencia y pasión por el detalle.',
    galleryTitle: 'Galería',
    gallerySubtitle: 'Un vistazo a nuestro trabajo y a nuestro espacio.',
    bookingTitle: 'Reserva tu hora',
    bookingSubtitle: 'Selecciona servicio, profesional, día y hora. Recibirás un código de referencia.',
    contactTitle: 'Ubicación y contacto',
  },
  features: {
    gallery: true,
    team: true,
    adminStats: true,
    adminLink: env.showAdminLink,
  },
  bookingDisabledMessage:
    'La reserva en línea no está disponible todavía. Escríbenos por WhatsApp y te agendamos.',
}

export type BusinessConfigType = typeof businessConfig
