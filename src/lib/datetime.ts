/**
 * Utilidades de fecha y hora.
 *
 * Regla del proyecto: TODAS las fechas se guardan en Supabase como timestamptz
 * (UTC) y se muestran/leen SIEMPRE en la zona horaria del negocio
 * (por defecto America/Santiago). Así el listado de horas no cambia según el
 * dispositivo del visitante.
 */

import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import { es } from 'date-fns/locale'
import { addDays, differenceInCalendarDays, parseISO } from 'date-fns'

export const DEFAULT_TIMEZONE = 'America/Santiago'

/** Fecha de hoy (yyyy-MM-dd) en la zona horaria indicada. */
export function todayInZone(timeZone: string = DEFAULT_TIMEZONE, reference: Date = new Date()): string {
  return formatInTimeZone(reference, timeZone, 'yyyy-MM-dd')
}

/** Hora actual (HH:mm) en la zona horaria indicada. */
export function nowTimeInZone(timeZone: string = DEFAULT_TIMEZONE, reference: Date = new Date()): string {
  return formatInTimeZone(reference, timeZone, 'HH:mm')
}

/**
 * Convierte una fecha local + hora local del negocio a un instante UTC ISO.
 * Es lo que se envía al servidor al crear una reserva.
 */
export function localDateTimeToUtcIso(
  date: string, // yyyy-MM-dd
  time: string, // HH:mm
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  const local = `${date}T${time.length === 5 ? `${time}:00` : time}`
  return fromZonedTime(local, timeZone).toISOString()
}

/** Convierte un instante UTC a Date "desplazado" para operar con date-fns. */
export function utcToZoneDate(iso: string | Date, timeZone: string = DEFAULT_TIMEZONE): Date {
  return new Date(formatInTimeZone(iso, timeZone, "yyyy-MM-dd'T'HH:mm:ss"))
}

/** Formatea un instante UTC con un patrón, en la zona del negocio. */
export function formatInZone(
  iso: string | Date,
  pattern: string,
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  try {
    return formatInTimeZone(iso, timeZone, pattern, { locale: es })
  } catch {
    return ''
  }
}

/** Hora corta: "14:30". */
export function formatTime(iso: string | Date, timeZone: string = DEFAULT_TIMEZONE): string {
  return formatInZone(iso, 'HH:mm', timeZone)
}

/** Fecha compacta: "lun 12 ago". */
export function formatDayShort(iso: string, timeZone: string = DEFAULT_TIMEZONE): string {
  return formatInZone(iso, 'EEE d MMM', timeZone)
}

/** Fecha larga: "lunes 12 de agosto de 2025". */
export function formatDayLong(iso: string, timeZone: string = DEFAULT_TIMEZONE): string {
  return formatInZone(iso, "EEEE d 'de' MMMM 'de' yyyy", timeZone)
}

/** Fecha + hora: "lun 12 ago, 14:30". */
export function formatDateTime(iso: string, timeZone: string = DEFAULT_TIMEZONE): string {
  return formatInZone(iso, "EEE d MMM, HH:mm", timeZone)
}

const WEEKDAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

/** Nombre del día de la semana a partir del índice (0 = domingo). */
export function weekdayName(weekday: number): string {
  return WEEKDAY_NAMES[((weekday % 7) + 7) % 7]
}

/** Nombre corto del día (0 = domingo). */
export function weekdayShortName(weekday: number): string {
  return ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][((weekday % 7) + 7) % 7]
}

/** Índice de día de semana (0 = domingo) de una fecha yyyy-MM-dd. */
export function weekdayOfDate(date: string): number {
  return parseISO(`${date}T12:00:00`).getDay()
}

/** Suma días a una fecha yyyy-MM-dd. */
export function addDaysToDate(date: string, days: number): string {
  return formatInZone(addDays(parseISO(`${date}T12:00:00`), days), 'yyyy-MM-dd', 'UTC')
}

/** Días de diferencia entre dos fechas yyyy-MM-dd. */
export function daysBetween(from: string, to: string): number {
  return differenceInCalendarDays(parseISO(`${to}T12:00:00`), parseISO(`${from}T12:00:00`))
}

/** "HH:mm:ss" -> "HH:mm". */
export function shortTime(time: string | null | undefined): string {
  if (!time) return ''
  return time.slice(0, 5)
}

/** Duración legible: 90 -> "1 h 30 min". */
export function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '0 min'
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} min`
  if (rest === 0) return `${hours} h`
  return `${hours} h ${rest} min`
}
