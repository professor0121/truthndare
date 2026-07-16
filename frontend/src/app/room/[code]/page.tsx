"use client";

import React, { use, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../../store";
import { setRoom, clearRoom } from "../../../store/roomSlice";
import { setSecondsLeft, stopTimer } from "../../../store/gameSlice";
import { addMessage, addReaction, clearMessages, clearReactions } from "../../../store/chatSlice";
import { api } from "../../../lib/api";
import { getSocket, disconnectSocket } from "../../../lib/socket";
import BottleSpinner from "../../../components/game/BottleSpinner";
import TurnConsole from "../../../components/game/TurnConsole";
import QuestionCard from "../../../components/game/QuestionCard";
import RoomSidebar from "../../../components/room/RoomSidebar";
import EmojiOverlay from "../../../components/game/EmojiOverlay";
import { 
  ArrowLeft, Copy, Check, Play, LogOut, Mic, MicOff, Users,
  Crown, Sparkles, Volume2, ShieldAlert, Trophy, Award
} from "lucide-react";
import gsap from "gsap";

export default function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const router = useRouter();
  const dispatch = useDispatch();
  const { code } = use(params);

  const { activeRoom, error: roomError } = useSelector((state: RootState) => state.room);
  const { user, accessToken } = useSelector((state: RootState) => state.auth);
  
  const [copied, setCopied] = useState(false);
  const [localError, setLocalError] = useState("");
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [loading, setLoading] = useState(false);

  // WebRTC Peer Connections Refs
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteAudiosContainerRef = useRef<HTMLDivElement>(null);

  // 1. Establish Socket Connection & Join Session
  useEffect(() => {
    if (!accessToken || !code) return;

    const socket = getSocket(accessToken);
    if (!socket.connected) {
      socket.connect();
    }

    // Clear local chat logs on entry
    dispatch(clearMessages());
    dispatch(clearReactions());

    // Join room channel
    socket.emit("join_room_session", { roomCode: code });

    // Listeners
    socket.on("room_sync", (room) => {
      dispatch(setRoom(room));
    });

    socket.on("player_presence_update", (data) => {
      if (data.players) {
        dispatch(setRoom({
          ...activeRoom,
          players: data.players
        } as any));
      }
    });

    socket.on("game_started", (room) => {
      dispatch(setRoom(room));
      dispatch(stopTimer());
    });

    socket.on("bottle_spun", (room) => {
      dispatch(setRoom(room));
    });

    socket.on("type_chosen", (room) => {
      dispatch(setRoom(room));
    });

    socket.on("turn_result", (room) => {
      dispatch(setRoom(room));
      dispatch(stopTimer());
    });

    socket.on("game_finished", (room) => {
      dispatch(setRoom(room));
      dispatch(stopTimer());
    });

    socket.on("chat_message", (msg) => {
      dispatch(addMessage(msg));
    });

    socket.on("emoji_reaction", (reaction) => {
      dispatch(addReaction({
        id: Math.random().toString(36).substring(2, 9),
        sender: reaction.sender,
        emoji: reaction.emoji,
        timestamp: reaction.timestamp
      }));
    });

    socket.on("timer_tick", ({ secondsLeft }) => {
      dispatch(setSecondsLeft(secondsLeft));
    });

    socket.on("timer_expired", (data) => {
      dispatch(stopTimer());
    });

    socket.on("error", (err) => {
      setLocalError(err.message || "An error occurred in room session.");
    });

    // Cleanup on unmount
    return () => {
      socket.emit("leave_room_session", { roomCode: code });
      socket.off("room_sync");
      socket.off("player_presence_update");
      socket.off("game_started");
      socket.off("bottle_spun");
      socket.off("type_chosen");
      socket.off("turn_result");
      socket.off("game_finished");
      socket.off("chat_message");
      socket.off("emoji_reaction");
      socket.off("timer_tick");
      socket.off("timer_expired");
      socket.off("error");
      
      // Stop WebRTC elements
      cleanupVoiceChat();
    };
  }, [code, accessToken]);

  // Sync Room Details from API on load
  useEffect(() => {
    const fetchRoomDetails = async () => {
      try {
        const res = await api.get(`/rooms/code/${code}`);
        if (res.data?.success) {
          dispatch(setRoom(res.data.data));
        }
      } catch (err: any) {
        setLocalError(err.response?.data?.message || "Failed to load room details.");
      }
    };
    fetchRoomDetails();
  }, [code]);

  // WebRTC Signal Listener
  useEffect(() => {
    if (!accessToken) return;
    const socket = getSocket(accessToken);

    const handleWebRTCSignal = async ({ senderUserId, signalData }: { senderUserId: string; signalData: any }) => {
      if (!isVoiceActive) return;

      const pc = peersRef.current.get(senderUserId);
      
      if (signalData.type === "offer") {
        await handleOffer(senderUserId, signalData.sdp);
      } else if (signalData.type === "answer") {
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(signalData.sdp));
        }
      } else if (signalData.type === "candidate") {
        if (pc) {
          await pc.addIceCandidate(new RTCIceCandidate(signalData.candidate));
        }
      }
    };

    socket.on("webrtc_signal", handleWebRTCSignal);
    return () => {
      socket.off("webrtc_signal", handleWebRTCSignal);
    };
  }, [isVoiceActive, accessToken]);

  // WebRTC Implementation
  const handleOffer = async (senderUserId: string, sdp: RTCSessionDescriptionInit) => {
    const socket = getSocket(accessToken || "");
    const pc = createPeerConnection(senderUserId);
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    
    // Add local mic tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket.emit("webrtc_signal", {
      roomCode: code,
      targetUserId: senderUserId,
      signalData: { type: "answer", sdp: pc.localDescription }
    });
  };

  const createPeerConnection = (targetUserId: string): RTCPeerConnection => {
    // Close existing connection if active
    if (peersRef.current.has(targetUserId)) {
      peersRef.current.get(targetUserId)?.close();
    }

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19002" }]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const socket = getSocket(accessToken || "");
        socket.emit("webrtc_signal", {
          roomCode: code,
          targetUserId,
          signalData: { type: "candidate", candidate: event.candidate }
        });
      }
    };

    pc.ontrack = (event) => {
      // Create audio element to play partner's stream
      if (remoteAudiosContainerRef.current) {
        // Prevent duplicate audios
        const existingAudio = document.getElementById(`audio-${targetUserId}`) as HTMLAudioElement;
        if (existingAudio) {
          existingAudio.srcObject = event.streams[0];
          return;
        }

        const audio = document.createElement("audio");
        audio.id = `audio-${targetUserId}`;
        audio.autoplay = true;
        audio.srcObject = event.streams[0];
        remoteAudiosContainerRef.current.appendChild(audio);
      }
    };

    peersRef.current.set(targetUserId, pc);
    return pc;
  };

  const startVoiceChat = async () => {
    try {
      // 1. Get user mic stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      setIsVoiceActive(true);

      // 2. Establish connections to all online players (excluding ourselves)
      if (activeRoom && user) {
        const socket = getSocket(accessToken || "");
        const otherOnlinePlayers = activeRoom.players.filter(
          (p) => p.userId !== user._id && p.isOnline
        );

        for (const player of otherOnlinePlayers) {
          const pc = createPeerConnection(player.userId);
          
          // Add local track
          stream.getTracks().forEach((track) => {
            pc.addTrack(track, stream);
          });

          // Create Offer
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          socket.emit("webrtc_signal", {
            roomCode: code,
            targetUserId: player.userId,
            signalData: { type: "offer", sdp: pc.localDescription }
          });
        }
      }
    } catch (err) {
      console.error("Failed to acquire microphone for WebRTC:", err);
      setIsVoiceActive(false);
    }
  };

  const cleanupVoiceChat = () => {
    // Stop local mic track
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Close peer connections
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();

    // Clear audio elements
    if (remoteAudiosContainerRef.current) {
      remoteAudiosContainerRef.current.innerHTML = "";
    }
    setIsVoiceActive(false);
  };

  const toggleVoiceChat = () => {
    if (isVoiceActive) {
      cleanupVoiceChat();
    } else {
      startVoiceChat();
    }
  };

  // 2. Room lifecycle handlers
  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartGame = async () => {
    setLoading(true);
    try {
      await api.post(`/rooms/code/${code}/start`);
    } catch (err: any) {
      setLocalError(err.response?.data?.message || "Failed to start game.");
    } finally {
      setLoading(false);
    }
  };

  const handleSpinBottle = async () => {
    setLoading(true);
    try {
      await api.post(`/rooms/code/${code}/spin`);
    } catch (err: any) {
      setLocalError(err.response?.data?.message || "Failed to spin bottle.");
    } finally {
      setLoading(false);
    }
  };

  const handleEndGame = async () => {
    setLoading(true);
    try {
      await api.post(`/rooms/code/${code}/end`);
    } catch (err: any) {
      setLocalError(err.response?.data?.message || "Failed to end game.");
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveRoom = async () => {
    try {
      await api.post("/rooms/leave", { code });
      dispatch(clearRoom());
      router.push("/dashboard");
    } catch (err: any) {
      setLocalError(err.response?.data?.message || "Failed to leave room.");
    }
  };

  if (localError || roomError) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="glass-card max-w-md w-full p-6 text-center border border-red-950/60 glow-pink">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4 animate-bounce" />
          <h2 className="text-xl font-bold text-white mb-2">Room Error</h2>
          <p className="text-zinc-400 text-sm mb-6">{localError || roomError}</p>
          <button
            onClick={() => {
              dispatch(clearRoom());
              router.push("/dashboard");
            }}
            className="px-6 py-2.5 bg-zinc-900 border border-zinc-800 text-white rounded-xl hover:bg-zinc-800 transition-all select-none cursor-pointer"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!activeRoom || !user) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <p className="text-zinc-400 text-sm animate-pulse">Syncing room data...</p>
      </div>
    );
  }

  const { players, status, hostId, game } = activeRoom;
  const isHost = hostId === user._id;

  return (
    <div className="min-h-screen bg-radial from-zinc-950 via-black to-zinc-950 flex flex-col relative">
      <EmojiOverlay />

      {/* Hidden Container for remote audios */}
      <div ref={remoteAudiosContainerRef} className="hidden" />

      {/* Header bar */}
      <header className="w-full glass border-b border-zinc-800/80 px-6 py-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={handleLeaveRoom}
            className="p-2 rounded-lg border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm tracking-wider uppercase text-zinc-300">
                Arena Room
              </span>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300 hover:text-white transition-all cursor-pointer font-bold font-mono tracking-widest"
              >
                {code}
                {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mt-0.5">
              Status: {status}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Voice Chat Toggle */}
          <button
            onClick={toggleVoiceChat}
            className={`p-2.5 rounded-lg border flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-all select-none cursor-pointer ${
              isVoiceActive
                ? "bg-neon-blue/20 border-neon-blue text-neon-cyan glow-blue"
                : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
            }`}
          >
            {isVoiceActive ? <Mic className="w-4.5 h-4.5" /> : <MicOff className="w-4.5 h-4.5" />}
            <span className="hidden sm:inline">{isVoiceActive ? "Voice On" : "Voice Off"}</span>
          </button>

          {/* Leave Button */}
          <button
            onClick={handleLeaveRoom}
            className="p-2.5 rounded-lg border border-zinc-800 hover:bg-red-950/20 hover:border-red-900/40 text-zinc-400 hover:text-red-400 transition-all select-none cursor-pointer"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="flex-1 flex flex-col lg:flex-row p-6 gap-6 max-w-7xl mx-auto w-full overflow-hidden">
        
        {/* LEFT COLUMN: Main Arena Playboard */}
        <div className="flex-1 flex flex-col items-center justify-center space-y-6">
          
          {/* 1. LOBBY VIEW */}
          {status === "lobby" && (
            <div className="w-full max-w-md glass-card p-6 rounded-2xl glow-purple text-center space-y-6">
              <div className="space-y-2">
                <Users className="w-12 h-12 text-neon-purple mx-auto mb-2 animate-pulse" />
                <h2 className="text-2xl font-black text-white uppercase tracking-wider">Lobby Waiting Room</h2>
                <p className="text-xs text-zinc-400">Invite friends using the code at the top. Need at least 2 players to start.</p>
              </div>

              {/* Joined Players Lists */}
              <div className="space-y-2.5">
                <h3 className="text-[10px] text-zinc-500 uppercase tracking-widest font-black text-left">
                  Joined Players ({players.length})
                </h3>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {players.map((p) => (
                    <div
                      key={p.userId}
                      className="glass border border-zinc-800/80 px-4.5 py-3.5 rounded-xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={p.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.username}`}
                          alt={p.username}
                          className="w-9 h-9 rounded-full bg-zinc-950 border border-zinc-800"
                        />
                        <div className="text-left">
                          <span className="font-bold text-sm text-zinc-200 flex items-center gap-1.5">
                            {p.username}
                            {p.isHost && <Crown className="w-3.5 h-3.5 text-yellow-500 fill-current" />}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-semibold uppercase">
                            XP: {p.score || 0}
                          </span>
                        </div>
                      </div>

                      {/* Online Presence light */}
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          p.isOnline ? "bg-neon-green glow-green" : "bg-zinc-800"
                        }`}
                        title={p.isOnline ? "Online" : "Offline"}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Start game actions */}
              {isHost ? (
                <button
                  onClick={handleStartGame}
                  disabled={players.length < 2 || loading}
                  className="w-full py-4 flex items-center justify-center gap-2 text-sm font-black uppercase tracking-wider text-black bg-neon-green hover:brightness-110 active:scale-[0.98] transition-all glow-green select-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Play className="w-5 h-5 fill-current" />
                  {loading ? "Starting..." : "Start Session Arena"}
                </button>
              ) : (
                <div className="p-3 bg-zinc-950/60 border border-zinc-900 rounded-xl text-center">
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider animate-pulse-slow">
                    Waiting for Lobby Host to Start Game...
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 2. PLAYING STAGE */}
          {status === "playing" && (
            <div className="w-full flex flex-col items-center justify-center space-y-6">
              
              {/* Turn Header status info */}
              <div className="text-center">
                <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-full">
                  Round {game.currentRound}
                </span>
                
                {/* Host Control Actions */}
                {isHost && game.turnState === "selecting" && (
                  <button
                    onClick={handleSpinBottle}
                    disabled={loading}
                    className="mt-4 px-6 py-2.5 bg-gradient-to-r from-neon-purple to-neon-pink text-white text-xs font-black uppercase tracking-wider rounded-xl hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                  >
                    {loading ? "Spinning..." : "Spin Bottle"}
                  </button>
                )}
              </div>

              {/* Bottle Spinner Board */}
              <BottleSpinner />

              {/* Challenge Display & Action controls */}
              <div className="w-full flex flex-col items-center gap-4">
                <QuestionCard
                  type={game.selectedType}
                  text={game.currentQuestion?.text}
                  visible={game.turnState === "answering"}
                />
                
                <TurnConsole roomCode={code} />
              </div>

              {/* Host End Game Option */}
              {isHost && (
                <button
                  onClick={handleEndGame}
                  className="text-[10px] font-bold uppercase tracking-wider text-red-500 hover:text-red-400 cursor-pointer"
                >
                  Conclude Game Session
                </button>
              )}

            </div>
          )}

          {/* 3. FINISHED / GAME COMPLETED PODIUM */}
          {status === "finished" && (
            <div className="w-full max-w-md glass-card p-6 rounded-2xl glow-purple text-center space-y-6">
              <div className="space-y-2">
                <Trophy className="w-14 h-14 text-yellow-500 mx-auto mb-2 animate-bounce" />
                <h2 className="text-2xl font-black text-white uppercase tracking-wider text-glow-purple">
                  Session Completed!
                </h2>
                <p className="text-xs text-zinc-400">Final scores and winner podium standing.</p>
              </div>

              {/* Standings table */}
              <div className="space-y-2 text-left">
                <h3 className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">
                  Final Standings
                </h3>
                
                <div className="space-y-2">
                  {[...players]
                    .sort((a, b) => b.score - a.score)
                    .map((p, idx) => {
                      const isWinner = game.winnerId === p.userId;
                      return (
                        <div
                          key={p.userId}
                          className={`glass border px-4 py-3 rounded-xl flex items-center justify-between ${
                            isWinner ? "border-yellow-500/50 bg-yellow-950/10" : "border-zinc-800"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="font-bold font-mono text-sm text-zinc-400 w-5">
                              #{idx + 1}
                            </div>
                            <img
                              src={p.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.username}`}
                              alt={p.username}
                              className="w-8 h-8 rounded-full bg-zinc-950 border border-zinc-800"
                            />
                            <span className="font-bold text-sm text-zinc-200 flex items-center gap-1.5">
                              {p.username}
                              {isWinner && <Award className="w-4 h-4 text-yellow-500 fill-current" />}
                            </span>
                          </div>
                          <span className="font-bold text-sm text-white">{p.score} pts</span>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Action options */}
              <button
                onClick={() => {
                  dispatch(clearRoom());
                  router.push("/dashboard");
                }}
                className="w-full py-3 text-xs font-bold uppercase tracking-wider text-black bg-neon-cyan hover:bg-cyan-300 rounded-lg active:scale-95 transition-all cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.3)]"
              >
                Return to Dashboard
              </button>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Sidebar Comms Chat log (Always visible except finished) */}
        {status !== "finished" && (
          <RoomSidebar roomCode={code} />
        )}

      </main>
    </div>
  );
}
