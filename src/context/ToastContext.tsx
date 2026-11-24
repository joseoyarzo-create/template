import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type ToastVariant = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  variant: ToastVariant
  message: string
  duration: number
}

interface ToastContextValue {
  show: (message: string, variant?: ToastVariant, duration?: number) => void
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100',
  error: 'border-red-500/40 bg-red-500/10 text-red-100',
  info: 'border-brand/40 bg-brand/10 text-white',
}

const VARIANT_ICON: Record<ToastVariant, string> = {
  success: '✓',
  error: '!',
  info: 'i',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  const show = useCallback(
    (message: string, variant: ToastVariant = 'info', duration = 4500) => {
      const id = Math.random().toString(36).slice(2, 10)
      setToasts((current) => [...current, { id, variant, message, duration }])
    },
    [],
  )

  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      success: (message: string) => show(message, 'success'),
      error: (message: string) => show(message, 'error', 6500),
      info: (message: string) => show(message, 'info'),
    }),
    [show],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => remove(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, toast.duration)
    return () => window.clearTimeout(timer)
  }, [toast.duration, onDismiss])

  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-card backdrop-blur animate-fade-in-up',
        VARIANT_STYLES[toast.variant],
      )}
    >
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/25 text-[11px] font-bold">
        {VARIANT_ICON[toast.variant]}
      </span>
      <p className="flex-1 leading-relaxed">{toast.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Cerrar notificación"
        className="shrink-0 text-white/50 transition hover:text-white"
      >
        ✕
      </button>
    </div>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>')
  return ctx
}
