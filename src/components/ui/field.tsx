'use client'

import { useId, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

const inputBase =
  'w-full rounded-[var(--radius)] border bg-cream px-3.5 py-2.5 text-[14px] focus:outline-none'
const inputOk = 'border-line focus:border-ink/40'
const inputErr = 'border-error focus:border-error'

/** Label, error/helper line, and the generated id every field below shares. */
interface FieldShellProps {
  label: ReactNode
  id?: string
  required?: boolean
  error?: string | null
  helper?: ReactNode
  className?: string
  children: (fieldId: string, controlClass: string) => ReactNode
}

function FieldShell({ label, id, required, error, helper, className, children }: FieldShellProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <div className={cn('block', className)}>
      <label htmlFor={fieldId} className="block text-[12px] text-muted">
        {label}
        {required && <span className="ml-0.5 text-error">*</span>}
      </label>
      <div className="mt-1">{children(fieldId, cn(inputBase, error ? inputErr : inputOk))}</div>
      {error ? (
        <p className="mt-1 text-[12px] text-error">{error}</p>
      ) : helper ? (
        <p className="mt-1 text-[12px] text-muted">{helper}</p>
      ) : null}
    </div>
  )
}

/** Props every control shares. `required` marks the label, it is not forwarded. */
interface CommonProps {
  label: ReactNode
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  error?: string | null
  helper?: ReactNode
  className?: string
  id?: string
  required?: boolean
}

type TextFieldProps = CommonProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'id' | 'required'>

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
  return (
    <FieldShell {...{ label, id, required, error, helper, className }}>
      {(fieldId, controlClass) => (
        <input
          id={fieldId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={Boolean(error)}
          className={controlClass}
          {...rest}
        />
      )}
    </FieldShell>
  )
}

type SelectFieldProps = CommonProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value' | 'id' | 'required'> & {
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
  return (
    <FieldShell {...{ label, id, required, error, helper, className }}>
      {(fieldId, controlClass) => (
        <select
          id={fieldId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={Boolean(error)}
          className={controlClass}
          {...rest}
        >
          {children}
        </select>
      )}
    </FieldShell>
  )
}

type TextAreaFieldProps = CommonProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value' | 'id' | 'required'>

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
  return (
    <FieldShell {...{ label, id, required, error, helper, className }}>
      {(fieldId, controlClass) => (
        <textarea
          id={fieldId}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={Boolean(error)}
          className={controlClass}
          {...rest}
        />
      )}
    </FieldShell>
  )
}

interface PhoneFieldProps extends CommonProps {
  /** National part only - the prefix is rendered, not typed. */
  prefix: string
}

/**
 * Phone input with the country code pinned outside the editable area, so a
 * customer can never delete it or type it twice.
 */
export function PhoneField({
  label,
  value,
  onChange,
  onBlur,
  error,
  helper,
  className,
  prefix,
  id,
  required,
}: PhoneFieldProps) {
  return (
    <FieldShell {...{ label, id, required, error, helper, className }}>
      {(fieldId) => (
        <div
          className={cn(
            'flex items-stretch overflow-hidden rounded-[var(--radius)] border bg-cream',
            error
              ? 'border-error focus-within:border-error'
              : 'border-line focus-within:border-ink/40',
          )}
        >
          <span
            aria-hidden
            className="flex items-center border-r border-line px-3 text-[14px] text-muted select-none"
          >
            {prefix}
          </span>
          <input
            id={fieldId}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            aria-invalid={Boolean(error)}
            aria-describedby={`${fieldId}-prefix`}
            className="w-full bg-transparent px-3.5 py-2.5 text-[14px] focus:outline-none"
          />
          <span id={`${fieldId}-prefix`} className="sr-only">
            Country code {prefix}
          </span>
        </div>
      )}
    </FieldShell>
  )
}
