"use client";

import React from "react";
import { Trophy, Award } from "lucide-react";
import Button from "../ui/Button";
import Card from "../ui/Card";

interface Player {
  userId: string;
  username: string;
  avatar?: string;
  score?: number;
}

interface GameState {
  winnerId: string | null;
}

interface PodiumViewProps {
  players: Player[];
  game: GameState;
  handleReturnToDashboard: () => void;
}

export default function PodiumView({
  players,
  game,
  handleReturnToDashboard,
}: PodiumViewProps) {
  return (
    <Card glow="purple" className="w-full max-w-md text-center space-y-4 max-h-[90vh] flex flex-col justify-between overflow-hidden">
      <div className="space-y-1">
        <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-1 animate-bounce" />
        <h2 className="text-xl font-headline font-extrabold text-white uppercase tracking-wider text-glow-purple">
          Session Completed!
        </h2>
        <p className="text-[11px] text-zinc-400 leading-normal">
          Final scores and winner podium standing.
        </p>
      </div>

      {/* Standings table */}
      <div className="space-y-2 text-left flex-1 flex flex-col overflow-hidden">
        <h3 className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">
          Final Standings
        </h3>

        <div className="space-y-1.5 overflow-y-auto pr-1 flex-1 max-h-[min(200px,28vh)]">
          {[...players]
            .sort((a, b) => (b.score || 0) - (a.score || 0))
            .map((p, idx) => {
              const isWinner = game.winnerId === p.userId;
              return (
                <div
                  key={p.userId}
                  className={`glass border px-3.5 py-2.5 rounded-2xl flex items-center justify-between ${
                    isWinner ? "border-yellow-500/50 bg-yellow-950/10" : "border-zinc-800"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="font-bold font-mono text-xs text-zinc-400 w-5">
                      #{idx + 1}
                    </div>
                    <img
                      src={p.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.username}`}
                      alt={p.username}
                      className="w-7.5 h-7.5 rounded-full bg-zinc-950 border border-zinc-800"
                    />
                    <span className="font-bold text-xs text-zinc-200 flex items-center gap-1.5">
                      {p.username}
                      {isWinner && <Award className="w-3.5 h-3.5 text-yellow-500 fill-current" />}
                    </span>
                  </div>
                  <span className="font-bold font-mono text-xs text-white">{p.score || 0} pts</span>
                </div>
              );
            })}
        </div>
      </div>

      {/* Action options */}
      <div className="pt-2">
        <Button
          onClick={handleReturnToDashboard}
          variant="valorant"
          className="w-full py-3"
        >
          Return to Dashboard
        </Button>
      </div>
    </Card>
  );
}

