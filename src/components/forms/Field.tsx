import { Label } from '#/components/ui/label'
import type { ReactNode } from 'react'

/** Label + control + hint/errors, with the ids wired for accessibility. */
export function Field({
  id,
  label,
  required,
  hint,
  errors,
  children,
}: {
  id: string
  label: string
  required?: boolean
  hint?: string
  errors?: Array<string>
  children: ReactNode
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive" aria-hidden> *</span>}
      </Label>
      {children}
      {hint && !errors?.length && <p className="text-xs text-muted-foreground">{hint}</p>}
      {errors?.map((e) => (
        <p key={e} id={`${id}-error`} className="text-xs text-destructive">
          {e}
        </p>
      ))}
    </div>
  )
}

/** Normalizes TanStack Form / Standard Schema errors to strings. */
export function errorMessages(errors: ReadonlyArray<unknown>): Array<string> {
  return [...new Set(errors.map((e) => (typeof e === 'string' ? e : ((e as { message?: string } | null)?.message ?? ''))).filter(Boolean))]
}
