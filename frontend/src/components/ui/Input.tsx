import React, { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, icon, className = "", ...props }, ref) => {
    return (
      <div className="w-full space-y-1 text-left">
        {label && (
          <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3 text-zinc-500 flex items-center justify-center pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`w-full ${
              icon ? "pl-9" : "px-4"
            } py-2.5 bg-black/40 border-b-2 border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:border-neon-blue focus:shadow-[0_4px_12px_-4px_rgba(0,229,255,0.3)] focus:outline-none transition-all duration-200 ${className}`}
            {...props}
          />
        </div>
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
