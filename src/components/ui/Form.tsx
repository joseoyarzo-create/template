import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { cn } from '@/lib/utils'

const FIELD_BASE =
  'w-full rounded-xl border border-ink-700 bg-ink-950/60 px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 transition-colors focus:border-brand/70 focus:outline-none focus:ring-2 focus:ring-brand/25 disabled:opacity-60'

export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
  className,
}: {
  label?: string
  hint?: string
  error?: string | null
  required?: boolean
  htmlFor?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label ? (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-white/80">
          {label}
          {required ? <span className="ml-1 text-brand">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="text-xs text-red-400">{error}</p>
      ) : hint ? (
        <p className="text-xs text-white/45">{hint}</p>
      ) : null}
    </div>
  )
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

export function Input({ className, invalid, ...rest }: InputProps) {
  return <input className={cn(FIELD_BASE, invalid && 'border-red-500/70', className)} {...rest} />
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(FIELD_BASE, 'min-h-[96px] resize-y', className)} {...rest} />
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean
}

export function Select({ className, invalid, children, ...rest }: SelectProps) {
  return (
    <select className={cn(FIELD_BASE, 'pr-9', invalid && 'border-red-500/70', className)} {...rest}>
      {children}
    </select>
  )
}

export function TextField({
  label,
  hint,
  error,
  required,
  id,
  ...rest
}: InputProps & { label?: string; hint?: string; error?: string | null; required?: boolean }) {
  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={id}>
      <Input id={id} invalid={Boolean(error)} required={required} {...rest} />
    </Field>
  )
}

export function TextAreaField({
  label,
  hint,
  error,
  required,
  id,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string
  hint?: string
  error?: string | null
  required?: boolean
}) {
  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={id}>
      <Textarea id={id} required={required} {...rest} />
    </Field>
  )
}

export function SelectField({
  label,
  hint,
  error,
  required,
  id,
  children,
  ...rest
}: SelectProps & { label?: string; hint?: string; error?: string | null; required?: boolean }) {
  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={id}>
      <Select id={id} invalid={Boolean(error)} required={required} {...rest}>
        {children}
      </Select>
    </Field>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  id,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
  description?: string
  id?: string
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition-colors',
          checked ? 'border-brand bg-brand/80' : 'border-ink-700 bg-ink-800',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white transition-transform',
            checked ? 'translate-x-[22px]' : 'translate-x-0.5',
          )}
        />
      </button>
      <span>
        <span className="block text-sm font-medium text-white/90">{label}</span>
        {description ? <span className="block text-xs text-white/45">{description}</span> : null}
      </span>
    </label>
  )
}
