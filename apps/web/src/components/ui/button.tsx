import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer duration-150",
  {
    variants: {
      variant: {
        default: "bg-white text-slate-950 shadow hover:bg-slate-100 hover:-translate-y-0.5",
        destructive: "bg-red-900/80 text-white shadow-sm hover:bg-red-950 hover:-translate-y-0.5 border border-red-800/60",
        outline: "border border-slate-800 bg-slate-950 text-slate-200 shadow-sm hover:bg-slate-900 hover:text-white hover:border-slate-700",
        secondary: "bg-slate-900 text-slate-200 shadow-sm hover:bg-slate-800 hover:text-white border border-slate-800/80 hover:border-slate-700",
        ghost: "hover:bg-slate-900 text-slate-400 hover:text-slate-200",
        link: "text-indigo-400 underline-offset-4 hover:underline hover:text-indigo-300",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
