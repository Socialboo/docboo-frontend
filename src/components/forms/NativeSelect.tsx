import { cn } from '#/lib/utils'
import type { ComponentProps } from 'react'

/** Native <select> styled like the other inputs (keyboard and screen-reader friendly by default). */
export function NativeSelect({ className, ...props }: ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30',
        className,
      )}
      {...props}
    />
  )
}
