import type { PostgrestError } from '@supabase/supabase-js'

/**
 * Error de aplicación con código opcional. Todo error que llega a la interfaz
 * se normaliza a este tipo para poder mostrar mensajes claros.
 */
export class AppError extends Error {
  readonly code?: string
  readonly hint?: string

  constructor(message: string, code?: string, hint?: string) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.hint = hint
  }
}

/** Mensajes legibles para los códigos que emiten los RPC de reserva. */
const SERVER_ERROR_MESSAGES: Record<string, string> = {
  NOMBRE_INVALIDO: 'Ingresa tu nombre completo (mínimo 3 caracteres).',
  TELEFONO_INVALIDO: 'Ingresa un teléfono válido (al menos 8 dígitos).',
  NEGOCIO_NO_DISPONIBLE: 'La reserva en línea no está disponible en este momento.',
  SERVICIO_NO_DISPONIBLE: 'El servicio seleccionado ya no está disponible.',
  BARBERO_NO_DISPONIBLE: 'El profesional seleccionado ya no está disponible.',
  SERVICIO_NO_ASIGNADO: 'Ese profesional no realiza el servicio seleccionado.',
  HORARIO_INVALIDO: 'El horario seleccionado no es válido.',
  FUERA_DE_PLAZO: 'Ese horario ya no se puede reservar. Elige uno con más anticipación.',
  FUERA_DE_RANGO: 'La fecha está fuera del rango de reserva permitido.',
  FUERA_DE_HORARIO: 'Ese horario está fuera del horario de atención del profesional.',
  HORARIO_BLOQUEADO: 'Ese horario está bloqueado (feriado, vacaciones o cierre).',
  HORARIO_NO_DISPONIBLE: 'Otro cliente acaba de tomar ese horario. Elige otro, por favor.',
  RESERVA_NO_ENCONTRADA: 'No encontramos una reserva con esos datos.',
  RESERVA_NO_CANCELABLE: 'Esta reserva ya no se puede cancelar.',
  RESERVA_YA_PASADA: 'Esta reserva ya pasó.',
  INVITACION_INVALIDA: 'La invitación no es válida.',
  INVITACION_USADA: 'Esta invitación ya fue utilizada.',
  INVITACION_EXPIRADA: 'La invitación expiró. Solicita una nueva.',
  NO_AUTENTICADO: 'Debes iniciar sesión para continuar.',
  SIN_PERMISO: 'No tienes permisos para esta acción.',
}

/** Traduce un mensaje de error del servidor/Postgres a un texto para el usuario. */
export function translateServerMessage(message: string | undefined | null): string {
  if (!message) return 'Ocurrió un error inesperado. Inténtalo nuevamente.'

  for (const code of Object.keys(SERVER_ERROR_MESSAGES)) {
    if (message.includes(code)) return SERVER_ERROR_MESSAGES[code]
  }

  if (message.includes('duplicate key')) return 'Ese registro ya existe.'
  if (message.includes('violates row-level security'))
    return 'No tienes permisos para realizar esta acción.'
  if (message.includes('Failed to fetch') || message.includes('NetworkError'))
    return 'No pudimos conectar con el servidor. Revisa tu conexión.'

  return message
}

/** Convierte cualquier error desconocido en AppError. */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error

  if (error && typeof error === 'object' && 'message' in error) {
    const pg = error as PostgrestError
    return new AppError(translateServerMessage(pg.message), pg.code, pg.hint ?? undefined)
  }

  if (error instanceof Error) {
    return new AppError(translateServerMessage(error.message))
  }

  return new AppError('Ocurrió un error inesperado.')
}

/**
 * Desempaqueta una respuesta de Supabase: devuelve `data` o lanza AppError.
 * Evita repetir `if (error) throw` en cada consulta.
 */
export function unwrap<T>(response: {
  data: T | null
  error: PostgrestError | null
}): T {
  if (response.error) throw toAppError(response.error)
  return response.data as T
}

/** Igual que unwrap pero para consultas que pueden no encontrar fila. */
export function unwrapNullable<T>(response: {
  data: T | null
  error: PostgrestError | null
}): T | null {
  if (response.error) throw toAppError(response.error)
  return response.data
}
