import React, { HTMLAttributes } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "purple" | "blue" | "pink" | "green" | "zinc";
}

export default function Badge({
  variant = "zinc",
  className = "",
  children,
  ...props
}: BadgeProps) {
  const baseClasses = "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border select-none";

  const variantClasses = {
    purple: "bg-neon-purple/10 border-neon-purple/35 text-neon-purple-dim text-glow-purple",
    blue: "bg-neon-blue/10 border-neon-blue/35 text-neon-cyan text-glow-blue",
    pink: "bg-neon-pink/10 border-neon-pink/35 text-neon-pink text-glow-pink",
    green: "bg-neon-green/10 border-neon-green/35 text-neon-green",
    zinc: "bg-zinc-900 border-zinc-800 text-zinc-400",
  };

  return (
    <span
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
