import { cn } from "@/lib/utils/cn";
import { forwardRef } from "react";

type Variant = "primary" | "secondary" | "destructive" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary text-white shadow-sm hover:bg-primary/90 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  destructive:
    "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2",
  ghost:
    "text-gray-600 hover:bg-gray-100 hover:text-gray-900 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  outline:
    "border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-9 px-4 text-sm gap-2",
  lg: "h-11 px-5 text-sm gap-2",
};

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150 outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <>
            <svg className="animate-spin w-3.5 h-3.5 opacity-70" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {children}
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

// For use in Link-based buttons (server components)
export function buttonVariants(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return cn(
    "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150 outline-none",
    variantClasses[variant],
    sizeClasses[size],
    extra
  );
}
