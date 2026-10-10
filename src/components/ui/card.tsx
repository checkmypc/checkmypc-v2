import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)] transition-[box-shadow,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        className,
      )}
      {...props}
    />
  );
}