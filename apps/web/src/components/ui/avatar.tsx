import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

const avatarColors = ['bg-rose-100 text-rose-700', 'bg-amber-100 text-amber-800', 'bg-emerald-100 text-emerald-800', 'bg-sky-100 text-sky-800']

export function Avatar({ name, className, ...props }: HTMLAttributes<HTMLSpanElement> & { name: string }) {
  const initials = name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()
  const color = avatarColors[name.charCodeAt(0) % avatarColors.length]
  return <span aria-label={name} className={cn('inline-flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold', color, className)} {...props}>{initials}</span>
}
