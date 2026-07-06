import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Kbd({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-[20px] items-center justify-center rounded px-1.5",
        "border border-border bg-muted/60 text-[11px] font-medium text-muted-foreground",
        "font-sans",
        className,
      )}
      {...props}
    />
  );
}
