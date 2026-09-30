import type { ButtonHTMLAttributes, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "chip";
  active?: boolean;
};

export function Button({ variant = "ghost", active, className, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-sm text-sm transition-colors disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent",
        variant === "primary" && "bg-accent px-3 py-1.5 font-medium text-surface hover:bg-accent/90",
        variant === "ghost" && "px-2 py-1 text-muted hover:bg-line/60 hover:text-ink",
        variant === "chip" && "border px-2 py-0.5 text-muted hover:text-ink",
        variant === "chip" && active && "border-accent bg-accent/10 text-ink",
        className,
      )}
      {...props}
    />
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "rounded-sm border bg-surface px-2 py-1.5 text-sm placeholder:text-muted focus:border-accent focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}
