"use client";

import React from "react";
import { Users, Crown, Play } from "lucide-react";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Badge from "../ui/Badge";

interface Player {
  userId: string;
  username: string;
  avatar?: string;
  score?: number;
  isOnline: boolean;
  isHost: boolean;
}

interface LobbyViewProps {
  players: Player[];
  isHost: boolean;
  loading: boolean;
  handleStartGame: () => void;
}

export default function LobbyView({
  players,
  isHost,
  loading,
  handleStartGame,
}: LobbyViewProps) {
  return (
    <Card glow="purple" className="w-full max-w-md text-center space-y-4 max-h-[90vh] flex flex-col justify-between overflow-hidden">
      <div className="space-y-1">
        <Users className="w-10 h-10 text-neon-purple mx-auto mb-1 animate-pulse" />
        <h2 className="text-xl font-headline font-extrabold text-white uppercase tracking-wider text-glow-purple">
          Lobby Waiting Room
        </h2>
        <p className="text-[11px] text-zinc-400 leading-normal">
          Invite friends using the code at the top. Needs 2+ players to launch.
        </p>
      </div>

      {/* Joined Players Lists */}
      <div className="space-y-2 flex-1 flex flex-col overflow-hidden text-left">
        <h3 className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">
          Joined Players ({players.length})
        </h3>
        <div className="space-y-1.5 overflow-y-auto pr-1 flex-1 max-h-[min(180px,22vh)]">
          {players.map((p) => (
            <div
              key={p.userId}
              className="glass border border-zinc-800/80 px-3.5 py-2.5 rounded-2xl flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <img
                  src={p.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.username}`}
                  alt={p.username}
                  className="w-8 h-8 rounded-full bg-zinc-950 border border-zinc-800"
                />
                <div className="text-left">
                  <span className="font-bold text-xs text-zinc-200 flex items-center gap-1.5">
                    {p.username}
                    {p.isHost && <Crown className="w-3.5 h-3.5 text-yellow-500 fill-current" />}
                  </span>
                  <span className="text-[9px] text-zinc-500 font-bold uppercase font-mono">
                    XP: {p.score || 0}
                  </span>
                </div>
              </div>

              {/* Online Presence light */}
              <Badge variant={p.isOnline ? "green" : "zinc"}>
                {p.isOnline ? "Online" : "Offline"}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Start game actions */}
      <div className="pt-2">
        {isHost ? (
          <Button
            onClick={handleStartGame}
            disabled={players.length < 2 || loading}
            variant="valorant"
            className="w-full py-3 flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            Start Session Arena
          </Button>
        ) : (
          <div className="p-2.5 bg-zinc-950/60 border border-zinc-900 rounded-2xl text-center">
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider animate-pulse-slow">
              Waiting for Lobby Host to Start...
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

