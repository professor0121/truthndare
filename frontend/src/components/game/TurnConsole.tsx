"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { api } from "../../lib/api";
import { HelpCircle, Flame, Check, X, Clock } from "lucide-react";
import Button from "../ui/Button";
import Card from "../ui/Card";

interface TurnConsoleProps {
  roomCode: string;
}

export default function TurnConsole({ roomCode }: TurnConsoleProps) {
  const { activeRoom } = useSelector((state: RootState) => state.room);
  const { user } = useSelector((state: RootState) => state.auth);
  const { secondsLeft, timerActive } = useSelector((state: RootState) => state.game);
  
  const [maxTime, setMaxTime] = useState(() => {
    return Number(process.env.NEXT_PUBLIC_TURN_TIMER_LIMIT) || 30;
  });
  const [loadingAction, setLoadingAction] = useState(false);

  // Sync max countdown duration on initial start
  useEffect(() => {
    if (secondsLeft > maxTime) {
      setMaxTime(secondsLeft);
    }
  }, [secondsLeft]);

  // Reset max time when timer stops
  useEffect(() => {
    if (!timerActive) {
      setMaxTime(Number(process.env.NEXT_PUBLIC_TURN_TIMER_LIMIT) || 30);
    }
  }, [timerActive]);

  if (!activeRoom || !user) return null;

  const { game, players } = activeRoom;
  const isMyTurn = game.currentPlayerId === user._id;
  const currentPlayer = players.find((p) => p.userId === game.currentPlayerId);
  const currentPlayerName = currentPlayer ? currentPlayer.username : "Someone";

  const handleChooseType = async (type: "truth" | "dare") => {
    setLoadingAction(true);
    try {
      await api.post(`/rooms/code/${roomCode}/choice`, { type });
    } catch (err) {
      console.error("Failed to make choice:", err);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleSubmitOutcome = async (outcome: "completed" | "skipped") => {
    setLoadingAction(true);
    try {
      await api.post(`/rooms/code/${roomCode}/submit`, { outcome });
    } catch (err) {
      console.error("Failed to submit outcome:", err);
    } finally {
      setLoadingAction(false);
    }
  };

  const progressPercent = maxTime > 0 ? (secondsLeft / maxTime) * 100 : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <Card className="w-full max-w-md flex flex-col items-center">
      {/* 1. Timer indicator */}
      {timerActive && (
        <div className="w-full space-y-2 mb-6">
          <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-zinc-400">
            <span className="flex items-center gap-1 font-headline">
              <Clock className="w-4 h-4 text-neon-pink animate-pulse" />
              Time Remaining
            </span>
            <span className="text-neon-pink font-mono">
              {secondsLeft >= 60 ? formatTime(secondsLeft) : `${secondsLeft}s`}
            </span>
          </div>
          <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800">
            <div 
              className="bg-gradient-to-r from-neon-pink to-red-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* 2. State specific layout panels */}
      {isMyTurn ? (
        <div className="w-full text-center space-y-5">
          {game.turnState === "choosing_type" && (
            <>
              <h3 className="text-base font-headline font-extrabold uppercase tracking-widest text-white text-glow-purple">
                Your Turn: Make Your Choice!
              </h3>
              <p className="text-xs text-zinc-400">Select Truth for questions or Dare for physical/social actions.</p>
              
              <div className="grid grid-cols-2 gap-4 pt-2">
                <Button
                  onClick={() => handleChooseType("truth")}
                  disabled={loadingAction}
                  variant="ghost"
                  className="py-6 flex flex-col items-center justify-center gap-2 border-2 border-neon-blue/80 hover:bg-neon-blue/10 hover-glow-blue cursor-pointer select-none rounded-2xl"
                >
                  <HelpCircle className="w-8 h-8 text-neon-blue" />
                  Truth
                </Button>
                
                <Button
                  onClick={() => handleChooseType("dare")}
                  disabled={loadingAction}
                  variant="ghost"
                  className="py-6 flex flex-col items-center justify-center gap-2 border-2 border-neon-pink/80 hover:bg-neon-pink/10 hover-glow-pink cursor-pointer select-none rounded-2xl"
                >
                  <Flame className="w-8 h-8 text-neon-pink" />
                  Dare
                </Button>
              </div>
            </>
          )}

          {game.turnState === "answering" && (
            <>
              <h3 className="text-base font-headline font-extrabold uppercase tracking-widest text-white text-glow-pink">
                Complete Your Challenge!
              </h3>
              <p className="text-xs text-zinc-400">Perform the action on stream/chat and report your completion status.</p>
              
              <div className="flex flex-col sm:flex-row gap-3.5 pt-2">
                <Button
                  onClick={() => handleSubmitOutcome("completed")}
                  disabled={loadingAction}
                  variant="ghost"
                  className="flex-1 py-3.5 flex items-center justify-center gap-2 bg-neon-green hover:brightness-110 hover-glow-green text-black border-none"
                >
                  <Check className="w-5 h-5" />
                  I Completed It
                </Button>
                
                <Button
                  onClick={() => handleSubmitOutcome("skipped")}
                  disabled={loadingAction}
                  variant="secondary"
                  className="flex-1 py-3.5 flex items-center justify-center gap-2"
                >
                  <X className="w-5 h-5 text-red-400" />
                  Skip (-0 pts)
                </Button>
              </div>
            </>
          )}
        </div>
      ) : (
        /* Other Player's Turn Screen */
        <div className="w-full text-center space-y-4 py-2">
          {game.turnState === "selecting" && (
            <div className="space-y-2">
              <h3 className="text-sm font-headline font-bold uppercase tracking-widest text-zinc-400">
                Lobby Host is Spinning the Bottle...
              </h3>
              <p className="text-xs text-zinc-500 font-semibold">Wait for the spinner to pick the next player.</p>
            </div>
          )}

          {game.turnState === "choosing_type" && (
            <div className="space-y-2">
              <h3 className="text-sm font-headline font-bold uppercase tracking-widest text-zinc-300">
                <span className="text-neon-purple font-black">{currentPlayerName}</span> is choosing...
              </h3>
              <p className="text-xs text-zinc-500 font-semibold">Awaiting selection of Truth or Dare.</p>
            </div>
          )}

          {game.turnState === "answering" && (
            <div className="space-y-2">
              <h3 className="text-sm font-headline font-bold uppercase tracking-widest text-zinc-300">
                <span className="text-neon-pink font-black">{currentPlayerName}</span> is answering...
              </h3>
              <p className="text-xs text-zinc-500 font-semibold leading-relaxed">
                Type in {currentPlayerName}'s stream and watch their response!
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

