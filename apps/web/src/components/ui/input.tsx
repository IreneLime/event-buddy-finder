import type { InputHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn('h-11 w-full rounded-xl border border-stone-200 bg-white px-3.5 text-sm text-stone-900 shadow-sm outline-none placeholder:text-stone-400 focus:border-rose-300 focus:ring-4 focus:ring-rose-100', className)} {...props} />
}
