import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
  trailing?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, trailing, ...props }, ref) => {
    return (
      <div className="relative flex items-center">
        {icon && (
          <span className="absolute left-3 text-muted-foreground pointer-events-none [&_svg]:h-4 [&_svg]:w-4">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={cn(
            "h-9 w-full rounded-md border border-input bg-card text-base",
            "placeholder:text-muted-foreground/70 text-foreground",
            "transition-colors duration-150",
            "focus:outline-none focus:border-accent/60 focus:ring-2 focus:ring-ring/25",
            icon ? "pl-9" : "pl-3.5",
            trailing ? "pr-9" : "pr-3.5",
            className,
          )}
          {...props}
        />
        {trailing && (
          <span className="absolute right-3 text-muted-foreground">{trailing}</span>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";
