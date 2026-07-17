"use client";

import React from "react";
import { ArrowLeft, Copy, Check, Mic, MicOff, Video, VideoOff, LogOut } from "lucide-react";
import Button from "../ui/Button";

interface GameHeaderProps {
  code: string;
  copied: boolean;
  status: string;
  isVoiceActive: boolean;
  isVideoActive: boolean;
  handleLeaveRoom: () => void;
  handleCopyCode: () => void;
  toggleVoiceChat: () => void;
  toggleVideoChat: () => void;
}

export default function GameHeader({
  code,
  copied,
  status,
  isVoiceActive,
  isVideoActive,
  handleLeaveRoom,
  handleCopyCode,
  toggleVoiceChat,
  toggleVideoChat,
}: GameHeaderProps) {
  return (
    <header className="w-full glass border-b border-zinc-800/80 px-6 py-3 flex items-center justify-between z-20 shrink-0 h-[64px]">
      <div className="flex items-center gap-3">
        <Button
          onClick={handleLeaveRoom}
          variant="ghost"
          size="sm"
          className="p-2"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>

        <div className="text-left">
          <div className="flex items-center gap-2">
            <span className="font-headline font-extrabold text-xs tracking-wider uppercase text-zinc-300">
              Arena Room
            </span>
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[9px] text-zinc-300 hover:text-white transition-all cursor-pointer font-bold font-mono tracking-widest"
            >
              {code}
              {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
          <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-semibold mt-0.5 font-mono">
            Status: {status}
          </p>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-3">
        {/* Voice Chat Toggle */}
        <Button
          onClick={toggleVoiceChat}
          variant={isVoiceActive ? "ghost" : "secondary"}
          size="sm"
          className={
            isVoiceActive
              ? "bg-neon-blue/20 border-neon-blue text-neon-cyan glow-blue hover:bg-neon-blue/30"
              : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
          }
        >
          {isVoiceActive ? <Mic className="w-4 h-4 mr-1" /> : <MicOff className="w-4 h-4 mr-1" />}
          <span className="hidden sm:inline">{isVoiceActive ? "Voice On" : "Voice Off"}</span>
        </Button>

        {/* Video Chat Toggle */}
        <Button
          onClick={toggleVideoChat}
          variant={isVideoActive ? "ghost" : "secondary"}
          size="sm"
          className={
            isVideoActive
              ? "bg-neon-pink/20 border-neon-pink text-neon-pink glow-pink hover:bg-neon-pink/30"
              : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
          }
        >
          {isVideoActive ? <Video className="w-4 h-4 mr-1" /> : <VideoOff className="w-4 h-4 mr-1" />}
          <span className="hidden sm:inline">{isVideoActive ? "Video On" : "Video Off"}</span>
        </Button>

        {/* Leave Button */}
        <Button
          onClick={handleLeaveRoom}
          variant="ghost"
          size="sm"
          className="p-2 hover:bg-red-950/20 hover:border-red-900/40 text-zinc-400 hover:text-red-400"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}

