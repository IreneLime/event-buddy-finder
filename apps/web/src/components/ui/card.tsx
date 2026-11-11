import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-2xl border border-stone-200/80 bg-white shadow-[0_4px_24px_rgba(41,37,36,0.04)]', className)} {...props} />
}
