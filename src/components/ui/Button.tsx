import * as React from "react"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

const buttonVariants = {
  variant: {
    default: "bg-[var(--accent)] text-white shadow hover:bg-[var(--accent)]/90 hover:shadow-[0_0_15px_var(--accent-glow)] border border-transparent hover:border-[var(--accent-glow)]",
    destructive: "bg-red-500 text-white shadow-sm hover:bg-red-600",
    outline: "border border-white/20 bg-transparent shadow-sm hover:bg-white/10 hover:text-white hover:border-[var(--accent-glow)]",
    secondary: "bg-[var(--accent-secondary)] text-white shadow-sm hover:bg-[var(--accent-secondary)]/80 hover:shadow-[0_0_15px_var(--accent-secondary)]",
    ghost: "hover:bg-white/10 hover:text-white",
    link: "text-[var(--accent)] underline-offset-4 hover:underline",
  },
  size: {
    default: "h-9 px-4 py-2",
    sm: "h-8 rounded-md px-3 text-xs",
    lg: "h-10 rounded-md px-8",
    icon: "h-9 w-9",
  },
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants.variant
  size?: keyof typeof buttonVariants.size
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", loading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 font-orbitron tracking-wider",
          buttonVariants.variant[variant],
          buttonVariants.size[size],
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button }
