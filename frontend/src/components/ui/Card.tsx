import React, { HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glow?: "purple" | "blue" | "pink" | "none";
  hoverEffect?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ glow = "none", hoverEffect = false, className = "", children, ...props }, ref) => {
    const baseClasses = "glass-card rounded-3xl p-6 relative overflow-hidden transition-all duration-300";
    
    const glowClasses = {
      purple: "glow-purple",
      blue: "glow-blue",
      pink: "glow-pink",
      none: "",
    };

    const hoverClasses = hoverEffect
      ? "hover:-translate-y-1 hover:border-white/20 " + (glow === "purple" ? "hover-glow-purple" : glow === "blue" ? "hover-glow-blue" : glow === "pink" ? "hover-glow-pink" : "")
      : "";

    return (
      <div
        ref={ref}
        className={`${baseClasses} ${glowClasses[glow]} ${hoverClasses} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export default Card;
