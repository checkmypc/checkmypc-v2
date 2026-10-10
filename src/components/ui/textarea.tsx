import { type TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-28 w-full rounded-xl bg-surface px-3.5 py-2.5 text-sm text-fg shadow-[var(--shadow-border)] placeholder:text-muted outline-none transition-[box-shadow,background-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:shadow-[var(--shadow-border-hover)]",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";