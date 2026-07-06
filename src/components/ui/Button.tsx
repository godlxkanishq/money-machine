import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "subtle" | "danger";
type Size = "sm" | "md" | "lg" | "icon" | "icon-sm";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-foreground hover:bg-accent/90 shadow-xs",
  secondary:
    "bg-card text-foreground border border-border hover:bg-muted/60 shadow-xs",
  ghost: "text-muted-foreground hover:text-foreground hover:bg-muted/60",
  subtle: "bg-muted/70 text-foreground hover:bg-muted",
  danger: "bg-danger/10 text-danger hover:bg-danger/15 border border-danger/20",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm rounded-sm gap-1.5",
  md: "h-9 px-4 text-base rounded-md gap-2",
  lg: "h-11 px-5 text-base rounded-md gap-2",
  icon: "h-9 w-9 rounded-md",
  "icon-sm": "h-8 w-8 rounded-sm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium whitespace-nowrap select-none",
          "transition-all duration-150 active:scale-[0.98]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          "disabled:opacity-40 disabled:pointer-events-none",
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
