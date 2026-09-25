import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-xl px-3.5 py-2 text-base transition-all outline-none md:text-sm placeholder:text-muted-foreground",
        className
      )}
      style={{
        backgroundColor: 'var(--color-input-bg)',
        color: 'var(--color-input-text)',
        border: '1px solid var(--color-border)',
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-primary)'
        props.onFocus?.(e)
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-border)'
        props.onBlur?.(e)
      }}
      {...props}
    />
  )
}

export { Input }
