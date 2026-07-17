"use client";

import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../store";
import { setSpinning } from "../../store/gameSlice";
import gsap from "gsap";
import Button from "../ui/Button";

interface VideoFeedProps {
  stream: MediaStream;
  muted?: boolean;
}

function VideoFeed({ stream, muted = false }: VideoFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className="w-full h-full object-cover"
    />
  );
}

interface BottleSpinnerProps {
  onSpinComplete?: () => void;
  localStream?: MediaStream | null;
  remoteStreams?: Record<string, MediaStream>;
  onPlayerClick?: (userId: string) => void;
}

export default function BottleSpinner({
  onSpinComplete,
  localStream,
  remoteStreams = {},
  onPlayerClick,
}: BottleSpinnerProps) {
  const dispatch = useDispatch();
  const activeRoom = useSelector((state: RootState) => state.room.activeRoom);
  const authUser = useSelector((state: RootState) => state.auth.user);
  
  const bottleRef = useRef<SVGSVGElement>(null);
  const [currentRotation, setCurrentRotation] = useState(0);
  const [radius, setRadius] = useState(260);

  // Responsive radial positioning listener
  useEffect(() => {
    function handleResize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      
      // Responsive radial positioning adapting to both width & height to avoid clash
      if (w < 480 || h < 550) {
        setRadius(100);
      } else if (w < 640 || h < 650) {
        setRadius(120);
      } else if (w < 1024 || h < 750) {
        setRadius(150);
      } else if (w < 1280) {
        setRadius(180);
      } else if (w < 1536) {
        setRadius(210);
      } else {
        setRadius(240);
      }
    }
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!activeRoom) return null;

  const { players, game } = activeRoom;
  const playerCount = players.length;

  // React to room game turnState changes to trigger spin automatically
  useEffect(() => {
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
    
    // Add 4 full spins (1440 deg)
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
    <div 
      className="relative w-full aspect-square flex items-center justify-center pointer-events-none"
      style={{ maxWidth: "100%", maxHeight: "100%" }}
    >
      {/* Central bottle platform glow */}
      <div 
        className="absolute w-[200px] h-[200px] rounded-full bg-neon-purple/20 blur-[60px] animate-pulse pointer-events-none z-0" 
      />

      {/* Render Players in CSS Rotate-Translate Circle */}
      {players.map((player, idx) => {
        const angle = (idx * 360) / playerCount;
        const isCurrentTurn = game.currentPlayerId === player.userId;

        // Custom style using pure CSS transform rotation & Y translation
        const circularTransform = {
          transform: `rotate(${angle}deg) translateY(-${radius}px) rotate(-${angle}deg)`,
        };

        const avatarUrl = player.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${player.username}`;

        // Dynamic status rank tag
        const isOnline = player.isOnline;
        const rank = player.score && player.score >= 100 ? "MASTER" : "ROOKIE";

        const stream = player.userId === authUser?._id ? localStream : remoteStreams[player.userId];
        const hasVideo = stream && stream.getVideoTracks().length > 0;

        return (
          <div
            key={player.userId}
            className="absolute z-10 transition-all duration-500 ease-out pointer-events-auto"
            style={circularTransform}
          >
            {/* Player Stream Card matching Stitch specs */}
            <div 
              onClick={() => onPlayerClick?.(player.userId)}
              className={`w-16 sm:w-20 md:w-24 aspect-[3/4] rounded-2xl overflow-hidden glass-card border transition-all duration-300 cursor-pointer hover:scale-110 active:scale-95 ${
                isCurrentTurn
                  ? "speaking-indicator border-neon-purple scale-105 shadow-[0_0_20px_rgba(188,19,254,0.3)] z-20"
                  : isOnline
                    ? "border-white/10 hover:border-white/30"
                    : "border-white/5 opacity-55"
              }`}
            >
              <div className="h-full relative bg-zinc-950/60">
                {hasVideo && stream ? (
                  <VideoFeed stream={stream} muted={player.userId === authUser?._id} />
                ) : (
                  <img
                    src={avatarUrl}
                    alt={player.username}
                    className="w-full h-full object-cover opacity-80"
                  />
                )}

                {/* Status bottom overlay info */}
                <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/90 to-transparent text-left">
                  <p className="font-headline text-[9px] text-white truncate font-extrabold uppercase tracking-wide">
                    {player.username}
                  </p>
                  
                  <div className="flex items-center gap-1 mt-0.5">
                    <span 
                      className={`w-1 h-1 rounded-full shrink-0 ${
                        isOnline ? "bg-neon-cyan shadow-[0_0_6px_#00e5ff]" : "bg-zinc-600"
                      }`} 
                    />
                    <span className="text-[7px] font-headline font-bold text-neon-cyan tracking-widest font-mono uppercase">
                      {isCurrentTurn ? "TURN" : rank}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Central Dial with Neon grids & Bottle SVG */}
      <div className="absolute w-[180px] h-[180px] rounded-full bg-zinc-950/80 border border-zinc-900 flex items-center justify-center z-20 shadow-[0_0_40px_rgba(188,19,254,0.15)] pointer-events-auto">
        <div className="absolute inset-4 rounded-full border border-dashed border-zinc-800/80" />
        <div className="absolute inset-10 rounded-full border border-neon-blue/10 glow-blue animate-spin-slow pointer-events-none" />

        {/* Central Bottle SVG */}
        <svg
          ref={bottleRef}
          className="w-[100px] h-[100px] z-30 select-none pointer-events-none"
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
            stroke="#bc13fe"
            strokeWidth="2.5"
            filter="url(#neon-glow)"
          />

          {/* Bottle Cap */}
          <rect x="47" y="10" width="6" height="5" rx="1" fill="#ff2d55" />

          {/* Liquid Indicators */}
          <path d="M47 50 H53" stroke="#00e5ff" strokeWidth="1.5" strokeDasharray="1 1" />
          <path d="M46 60 H54" stroke="#00e5ff" strokeWidth="1.5" />
          <path d="M46 70 H54" stroke="#00e5ff" strokeWidth="1.5" />

          {/* Gradients */}
          <defs>
            <linearGradient id="bottle-grad" x1="50" y1="10" x2="50" y2="90" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ebb2ff" />
              <stop offset="50%" stopColor="#bc13fe" />
              <stop offset="100%" stopColor="#141319" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}
