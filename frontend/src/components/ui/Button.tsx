import React, { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "valorant" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export default function Button({
  variant = "primary",
  size = "md",
  loading,
  className = "",
  children,
  ...props
}: ButtonProps) {
  // Base classes (shared across all button styles)
  const baseClasses = "inline-flex items-center justify-center font-headline font-bold uppercase tracking-wider select-none transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";

  // Size classes
  const sizeClasses = {
    sm: "px-3 py-1.5 text-[10px] rounded-md",
    md: "px-5 py-2.5 text-xs rounded-xl",
    lg: "px-7 py-3.5 text-sm rounded-2xl",
  };

  // Variant classes
  const variantClasses = {
    primary: "bg-gradient-to-r from-neon-purple to-neon-blue text-white hover:brightness-110 hover-glow-purple",
    secondary: "bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white",
    ghost: "bg-transparent border border-white/12 text-zinc-300 hover:bg-white/5 hover:text-white",
    valorant: "bg-neon-cyan hover:bg-cyan-300 text-black clip-valorant hover-glow-blue",
    danger: "bg-gradient-to-r from-neon-pink to-red-600 text-white hover:brightness-110 hover-glow-pink",
  };

  // Override border radius for valorant clipped corners
  const customRadius = variant === "valorant" ? "rounded-none" : "";

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${customRadius} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Processing...
        </span>
      ) : (
        children
      )}
    </button>
  );
}
