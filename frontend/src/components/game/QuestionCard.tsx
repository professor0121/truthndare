"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Sparkles, AlertTriangle } from "lucide-react";

interface QuestionCardProps {
  type: "truth" | "dare" | null;
  text: string | null;
  visible: boolean;
}

export default function QuestionCard({ type, text, visible }: QuestionCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Trigger flip animation based on visibility
  useEffect(() => {
    if (cardRef.current) {
      if (visible) {
        // Flip to show content (Front)
        gsap.to(cardRef.current, {
          rotationY: 180,
          duration: 0.8,
          ease: "back.out(1.2)",
        });
      } else {
        // Flip back face up (Back)
        gsap.to(cardRef.current, {
          rotationY: 0,
          duration: 0.6,
          ease: "power2.out",
        });
      }
    }
  }, [visible]);

  const isTruth = type === "truth";

  return (
    <div className="w-full max-w-[340px] h-[220px] [perspective:1000px] select-none">
      <div
        ref={cardRef}
        className="relative w-full h-full duration-700 [transform-style:preserve-3d]"
      >
        {/* Card BACK (Face Down - Mystery view) */}
        <div className="absolute inset-0 w-full h-full rounded-2xl glass-card border border-neon-purple/40 glow-purple flex flex-col items-center justify-center p-6 [backface-visibility:hidden]">
          <div className="w-16 h-16 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center mb-3">
            <Sparkles className="w-8 h-8 text-neon-purple animate-pulse" />
          </div>
          <span className="text-sm font-bold uppercase tracking-widest text-zinc-400">
            Awaiting Choice...
          </span>
          <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-1">
            Truth or Dare
          </span>
        </div>

        {/* Card FRONT (Face Up - Display Question) */}
        <div 
          className={`absolute inset-0 w-full h-full rounded-2xl [backface-visibility:hidden] [transform:rotateY(180deg)] p-6 flex flex-col justify-between overflow-hidden border ${
            isTruth
              ? "bg-gradient-to-br from-indigo-950/80 via-zinc-950/90 to-zinc-950 border-neon-blue/50 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
              : "bg-gradient-to-br from-rose-950/80 via-zinc-950/90 to-zinc-950 border-neon-pink/50 shadow-[0_0_20px_rgba(236,72,153,0.3)]"
          }`}
        >
          {/* Holographic background line */}
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_95%,rgba(255,255,255,0.05)_95%)] bg-[size:100%_8px] pointer-events-none opacity-45" />

          {/* Card Header */}
          <div className="flex items-center justify-between z-10">
            <span
              className={`text-xs font-black tracking-widest uppercase px-2.5 py-1 rounded ${
                isTruth
                  ? "bg-neon-blue/20 text-neon-blue border border-neon-blue/30"
                  : "bg-neon-pink/20 text-neon-pink border border-neon-pink/30"
              }`}
            >
              {isTruth ? "Truth" : "Dare"}
            </span>
            <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-bold uppercase">
              <Sparkles className="w-3.5 h-3.5 text-neon-purple" />
              <span>AI Generated</span>
            </div>
          </div>

          {/* Card Content - Question text */}
          <div className="my-auto py-2 z-10 text-center">
            <p className="text-sm font-semibold text-white leading-relaxed tracking-wide">
              {text || "Generating challenge..."}
            </p>
          </div>

          {/* Card Footer */}
          <div className="flex items-center justify-between text-[10px] text-zinc-500 font-semibold z-10">
            <span>Points: +10 pts</span>
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
              <span>Do not skip!</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
