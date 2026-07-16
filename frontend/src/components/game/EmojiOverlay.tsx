"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import gsap from "gsap";

interface Particle {
  id: string;
  emoji: string;
  left: number;
}

export default function EmojiOverlay() {
  const reactions = useSelector((state: RootState) => state.chat.reactions);
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (reactions.length === 0) return;
    
    // Get the latest reaction
    const latest = reactions[reactions.length - 1];
    
    // Create particle
    const newParticle: Particle = {
      id: latest.id,
      emoji: latest.emoji,
      left: 10 + Math.random() * 80, // random horizontal offset (10% to 90%)
    };

    setParticles((prev) => [...prev, newParticle]);
  }, [reactions]);

  // Handle animation on mount for each particle
  useEffect(() => {
    particles.forEach((p) => {
      const el = document.getElementById(`reaction-particle-${p.id}`);
      if (el && !el.dataset.animated) {
        el.dataset.animated = "true";
        
        // Custom animation pathway
        const randomXShift = (Math.random() - 0.5) * 150; // Sway path
        const randomRotate = (Math.random() - 0.5) * 90; // Rotation skew

        gsap.fromTo(
          el,
          { 
            y: "100%", 
            opacity: 0, 
            scale: 0.3,
            rotation: 0 
          },
          {
            y: "-400px",
            x: randomXShift,
            opacity: 1,
            scale: 1.8,
            rotation: randomRotate,
            duration: 2.2,
            ease: "power2.out",
            onComplete: () => {
              // Fade out at end of climb
              gsap.to(el, {
                opacity: 0,
                scale: 0.8,
                duration: 0.6,
                onComplete: () => {
                  setParticles((prev) => prev.filter((item) => item.id !== p.id));
                }
              });
            }
          }
        );
      }
    });
  }, [particles]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
      {particles.map((p) => (
        <div
          key={p.id}
          id={`reaction-particle-${p.id}`}
          className="absolute bottom-10 text-4xl select-none"
          style={{ left: `${p.left}%` }}
        >
          {p.emoji}
        </div>
      ))}
    </div>
  );
}
