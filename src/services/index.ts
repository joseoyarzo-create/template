/**
 * Punto de entrada de la capa de servicios.
 * Centraliza los accesos a Supabase para que los componentes importen desde
 * un único lugar y la arquitectura se mantenga ordenada.
 *
 * Ejemplo:
 *   import { bookings, staff, availability } from '@/services'
 *   const slots = await availability.fetchAvailableSlots({ ... })
 */

export * as authService from '@/services/auth'
export * as availabilityService from '@/services/availability'
export * as bookingsService from '@/services/bookings'
export * as catalogService from '@/services/catalog'
export * as customersService from '@/services/customers'
export * as scheduleService from '@/services/schedule'
export * as servicesService from '@/services/services'
export * as settingsService from '@/services/settings'
export * as staffService from '@/services/staff'
export * as statsService from '@/services/stats'
