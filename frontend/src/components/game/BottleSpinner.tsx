"use client";

import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../store";
import { setSpinning } from "../../store/gameSlice";
import gsap from "gsap";

interface BottleSpinnerProps {
  onSpinComplete?: () => void;
}

export default function BottleSpinner({ onSpinComplete }: BottleSpinnerProps) {
  const dispatch = useDispatch();
  const activeRoom = useSelector((state: RootState) => state.room.activeRoom);
  const spinning = useSelector((state: RootState) => state.game.spinning);

  const bottleRef = useRef<SVGSVGElement>(null);
  const [currentRotation, setCurrentRotation] = useState(0);

  if (!activeRoom) return null;

  const { players, game } = activeRoom;
  const playerCount = players.length;

  // React to room game turnState changes to trigger spin automatically
  useEffect(() => {
    // If the game is in 'choosing_type' state and we're not already spinning,
    // it means a spin result was received. Let's animate!
    if (game.status === "playing" && game.turnState === "choosing_type" && game.currentPlayerId) {
      const targetIndex = players.findIndex((p) => p.userId === game.currentPlayerId);
      if (targetIndex !== -1) {
        triggerSpin(targetIndex);
      }
    }
  }, [game.turnState, game.currentPlayerId]);

  const triggerSpin = (targetIndex: number) => {
    if (!bottleRef.current) return;

    dispatch(setSpinning(true));

    // Calculate rotation: points on circle are spaced by 360 / playerCount
    const playerAngle = (targetIndex * 360) / playerCount;
    
    // Add 4-5 full spins (1440 to 1800 deg) for visual flare
    // Points upward at index 0, clockwise.
    const additionalSpins = 360 * 4;
    const finalRotation = currentRotation + additionalSpins + (playerAngle - (currentRotation % 360));
    
    setCurrentRotation(finalRotation);

    gsap.to(bottleRef.current, {
      rotation: finalRotation,
      transformOrigin: "50% 50%",
      duration: 3.5,
      ease: "power4.out",
      onComplete: () => {
        dispatch(setSpinning(false));
        if (onSpinComplete) {
          onSpinComplete();
        }
      },
    });
  };

  return (
    <div className="relative w-full max-w-[450px] aspect-square flex items-center justify-center bg-black/30 rounded-full border border-zinc-800/60 p-4">
      {/* Outer Glowing Ring */}
      <div className="absolute inset-0 rounded-full border border-neon-purple/20 glow-purple animate-pulse-slow pointer-events-none" />

      {/* Render Players in a Circle */}
      {players.map((player, idx) => {
        const angle = (idx * 360) / playerCount;
        // Convert polar coordinates to Cartesian for layout positioning
        const radius = 38; // percentage radius
        const x = 50 + radius * Math.sin((angle * Math.PI) / 180);
        const y = 50 - radius * Math.cos((angle * Math.PI) / 180);

        const isCurrentTurn = game.currentPlayerId === player.userId;

        return (
          <div
            key={player.userId}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10 transition-all duration-300"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            {/* Active Turn Halo Ring */}
            <div
              className={`p-1 rounded-full transition-all duration-500 ${
                isCurrentTurn
                  ? "bg-gradient-to-r from-neon-purple to-neon-pink glow-pink scale-110"
                  : player.isOnline 
                    ? "bg-zinc-800 border border-zinc-700" 
                    : "bg-zinc-950 border border-zinc-900 opacity-40"
              }`}
            >
              <img
                src={player.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${player.username}`}
                alt={player.username}
                className="w-10 h-10 rounded-full bg-zinc-900"
              />
            </div>
            
            {/* Username Badge */}
            <span
              className={`text-[10px] font-bold mt-1.5 px-2 py-0.5 rounded-full select-none max-w-[70px] truncate ${
                isCurrentTurn
                  ? "bg-neon-purple text-white text-glow-purple"
                  : "bg-black/60 text-zinc-400 border border-zinc-900"
              }`}
            >
              {player.username}
            </span>
            <span className="text-[9px] text-zinc-500 font-semibold">{player.score} pts</span>
          </div>
        );
      })}

      {/* Neon Center Dial Grid */}
      <div className="absolute w-[200px] h-[200px] rounded-full bg-zinc-950/80 border border-zinc-800/80 flex items-center justify-center z-0">
        <div className="absolute inset-4 rounded-full border border-dashed border-zinc-800" />
        <div className="absolute inset-12 rounded-full border border-neon-blue/10 glow-blue animate-spin-slow pointer-events-none" />

        {/* Central Bottle SVG */}
        <svg
          ref={bottleRef}
          className="w-[120px] h-[120px] z-20 cursor-default select-none pointer-events-none"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Neon Glow Filter */}
          <defs>
            <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Bottle Body */}
          <path
            d="M50 15 C50 15 45 28 45 35 L45 75 C45 80 47 85 50 85 C53 85 55 80 55 75 L55 35 C55 35 50 28 50 15 Z"
            fill="url(#bottle-grad)"
            stroke="#a855f7"
            strokeWidth="2"
            filter="url(#neon-glow)"
          />

          {/* Bottle Cap */}
          <rect x="47" y="10" width="6" height="5" rx="1" fill="#ec4899" />

          {/* Liquid Indicator lines */}
          <path d="M47 50 H53" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="1 1" />
          <path d="M46 60 H54" stroke="#06b6d4" strokeWidth="1.5" />
          <path d="M46 70 H54" stroke="#06b6d4" strokeWidth="1.5" />

          {/* Gradients */}
          <defs>
            <linearGradient id="bottle-grad" x1="50" y1="10" x2="50" y2="90" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="50%" stopColor="#8644a2" />
              <stop offset="100%" stopColor="#1e1b4b" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}
