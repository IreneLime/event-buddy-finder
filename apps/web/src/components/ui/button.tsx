import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:pointer-events-none disabled:opacity-45',
  {
    variants: {
      variant: {
        primary: 'bg-rose-600 text-white shadow-sm hover:bg-rose-700',
        secondary: 'bg-rose-50 text-rose-700 hover:bg-rose-100',
        outline: 'border border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50',
        ghost: 'text-stone-600 hover:bg-stone-100 hover:text-stone-950',
        dark: 'bg-stone-900 text-white hover:bg-stone-800',
      },
      size: {
        default: 'h-11 px-4',
        sm: 'h-9 rounded-lg px-3 text-xs',
        icon: 'size-10 rounded-xl',
        lg: 'h-12 px-5',
      },
    },
    defaultVariants: { variant: 'primary', size: 'default' },
  },
)

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Component = asChild ? Slot : 'button'
  return <Component className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
