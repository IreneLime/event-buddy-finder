import type { LabelHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/utils'

export function FieldLabel({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('mb-1.5 block text-sm font-medium text-stone-700', className)} {...props} />
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <div><FieldLabel>{label}</FieldLabel>{children}{hint && <p className="mt-1.5 text-xs text-stone-500">{hint}</p>}</div>
}
