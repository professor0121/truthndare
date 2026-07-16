"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { api } from "../../lib/api";
import { HelpCircle, Flame, Check, X, Clock } from "lucide-react";

interface TurnConsoleProps {
  roomCode: string;
}

export default function TurnConsole({ roomCode }: TurnConsoleProps) {
  const { activeRoom } = useSelector((state: RootState) => state.room);
  const { user } = useSelector((state: RootState) => state.auth);
  const { secondsLeft, timerActive } = useSelector((state: RootState) => state.game);
  
  const [maxTime, setMaxTime] = useState(30);
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
      setMaxTime(30);
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

  return (
    <div className="w-full max-w-md bg-zinc-950/80 border border-zinc-800 rounded-2xl p-6 glass flex flex-col items-center">
      {/* 1. Timer indicator */}
      {timerActive && (
        <div className="w-full space-y-2 mb-6">
          <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-zinc-400">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-neon-pink animate-pulse" />
              Time Remaining
            </span>
            <span className="text-neon-pink">{secondsLeft}s</span>
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
              <h3 className="text-base font-extrabold uppercase tracking-widest text-white text-glow-purple">
                Your Turn: Make Your Choice!
              </h3>
              <p className="text-xs text-zinc-400">Select Truth for questions or Dare for physical/social actions.</p>
              
              <div className="grid grid-cols-2 gap-4 pt-2">
                <button
                  onClick={() => handleChooseType("truth")}
                  disabled={loadingAction}
                  className="py-5 flex flex-col items-center justify-center gap-2 font-black uppercase tracking-widest text-white bg-indigo-950/40 border-2 border-neon-blue rounded-xl hover:bg-indigo-950/70 hover:glow-blue active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 select-none"
                >
                  <HelpCircle className="w-8 h-8 text-neon-blue" />
                  Truth
                </button>
                
                <button
                  onClick={() => handleChooseType("dare")}
                  disabled={loadingAction}
                  className="py-5 flex flex-col items-center justify-center gap-2 font-black uppercase tracking-widest text-white bg-rose-950/40 border-2 border-neon-pink rounded-xl hover:bg-rose-950/70 hover:glow-pink active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 select-none"
                >
                  <Flame className="w-8 h-8 text-neon-pink" />
                  Dare
                </button>
              </div>
            </>
          )}

          {game.turnState === "answering" && (
            <>
              <h3 className="text-base font-extrabold uppercase tracking-widest text-white text-glow-pink">
                Complete Your Challenge!
              </h3>
              <p className="text-xs text-zinc-400">Perform the action on stream/chat and report your completion status.</p>
              
              <div className="flex flex-col sm:flex-row gap-3.5 pt-2">
                <button
                  onClick={() => handleSubmitOutcome("completed")}
                  disabled={loadingAction}
                  className="flex-1 py-3.5 flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-black bg-neon-green hover:brightness-110 active:scale-[0.98] transition-all rounded-xl shadow-[0_0_10px_rgba(16,185,129,0.3)] cursor-pointer disabled:opacity-50 select-none"
                >
                  <Check className="w-5 h-5" />
                  I Completed It
                </button>
                
                <button
                  onClick={() => handleSubmitOutcome("skipped")}
                  disabled={loadingAction}
                  className="flex-1 py-3.5 flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-zinc-300 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 active:scale-[0.98] transition-all rounded-xl cursor-pointer disabled:opacity-50 select-none"
                >
                  <X className="w-5 h-5 text-red-400" />
                  Skip (-0 pts)
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        /* Other Player's Turn Screen */
        <div className="w-full text-center space-y-4 py-2">
          {game.turnState === "selecting" && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">
                Lobby Host is Spinning the Bottle...
              </h3>
              <p className="text-xs text-zinc-500">Wait for the spinner to pick the next player.</p>
            </div>
          )}

          {game.turnState === "choosing_type" && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-300">
                <span className="text-neon-purple font-black">{currentPlayerName}</span> is choosing...
              </h3>
              <p className="text-xs text-zinc-500">Awaiting selection of Truth or Dare.</p>
            </div>
          )}

          {game.turnState === "answering" && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-300">
                <span className="text-neon-pink font-black">{currentPlayerName}</span> is answering...
              </h3>
              <p className="text-xs text-zinc-500">
                Type in {currentPlayerName}'s stream and watch their response!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
