'use client'

import { useId, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface FieldShellProps {
  label: ReactNode
  htmlFor: string
  required?: boolean
  error?: string | null
  helper?: ReactNode
  className?: string
  children: ReactNode
}

function FieldShell({ label, htmlFor, required, error, helper, className, children }: FieldShellProps) {
  return (
    <div className={cn('block', className)}>
      <label htmlFor={htmlFor} className="block text-[12px] text-muted">
        {label}
        {required && <span className="ml-0.5 text-error">*</span>}
      </label>
      <div className="mt-1">{children}</div>
      {error ? (
        <p className="mt-1 text-[12px] text-error">{error}</p>
      ) : helper ? (
        <p className="mt-1 text-[12px] text-muted">{helper}</p>
      ) : null}
    </div>
  )
}

const inputBase =
  'w-full rounded-[var(--radius)] border bg-cream px-3.5 py-2.5 text-[14px] focus:outline-none'
const inputOk = 'border-line focus:border-ink/40'
const inputErr = 'border-error focus:border-error'

interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label: ReactNode
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  error?: string | null
  helper?: ReactNode
  className?: string
}

export function TextField({
  label,
  value,
  onChange,
  onBlur,
  error,
  helper,
  className,
  id,
  required,
  ...rest
}: TextFieldProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <FieldShell
      htmlFor={fieldId}
      label={label}
      required={required}
      error={error}
      helper={helper}
      className={className}
    >
      <input
        id={fieldId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={Boolean(error)}
        className={cn(inputBase, error ? inputErr : inputOk)}
        {...rest}
      />
    </FieldShell>
  )
}

interface SelectFieldProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> {
  label: ReactNode
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  error?: string | null
  helper?: ReactNode
  className?: string
  children: ReactNode
}

export function SelectField({
  label,
  value,
  onChange,
  onBlur,
  error,
  helper,
  className,
  id,
  required,
  children,
  ...rest
}: SelectFieldProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <FieldShell
      htmlFor={fieldId}
      label={label}
      required={required}
      error={error}
      helper={helper}
      className={className}
    >
      <select
        id={fieldId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={Boolean(error)}
        className={cn(inputBase, error ? inputErr : inputOk)}
        {...rest}
      >
        {children}
      </select>
    </FieldShell>
  )
}

interface TextAreaFieldProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'> {
  label: ReactNode
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  error?: string | null
  helper?: ReactNode
  className?: string
}

export function TextAreaField({
  label,
  value,
  onChange,
  onBlur,
  error,
  helper,
  className,
  id,
  required,
  rows = 3,
  ...rest
}: TextAreaFieldProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <FieldShell
      htmlFor={fieldId}
      label={label}
      required={required}
      error={error}
      helper={helper}
      className={className}
    >
      <textarea
        id={fieldId}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={Boolean(error)}
        className={cn(inputBase, error ? inputErr : inputOk)}
        {...rest}
      />
    </FieldShell>
  )
}
