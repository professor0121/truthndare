"use client";

import React, { use, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../../store";
import { setRoom, clearRoom } from "../../../store/roomSlice";
import { setSecondsLeft, stopTimer } from "../../../store/gameSlice";
import { addMessage, addReaction, clearMessages, clearReactions } from "../../../store/chatSlice";
import { api } from "../../../lib/api";
import { getSocket } from "../../../lib/socket";
import BottleSpinner from "../../../components/game/BottleSpinner";
import TurnConsole from "../../../components/game/TurnConsole";
import QuestionCard from "../../../components/game/QuestionCard";
import RoomSidebar from "../../../components/room/RoomSidebar";
import EmojiOverlay from "../../../components/game/EmojiOverlay";
import GameHeader from "../../../components/game/GameHeader";
import LobbyView from "../../../components/game/LobbyView";
import PodiumView from "../../../components/game/PodiumView";
import BackgroundShader from "../../../components/ui/BackgroundShader";
import Navbar from "../../../components/ui/Navbar";
import Sidebar from "../../../components/ui/Sidebar";
import { ShieldAlert, MessageSquare, X } from "lucide-react";
import gsap from "gsap";

interface ActiveVideoFeedProps {
  stream: MediaStream;
  muted?: boolean;
}

function ActiveVideoFeed({ stream, muted = false }: ActiveVideoFeedProps) {
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
      className="w-full h-full object-cover animate-fade-in"
    />
  );
}

export default function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const router = useRouter();
  const dispatch = useDispatch();
  const { code } = use(params);

  const { activeRoom, error: roomError } = useSelector((state: RootState) => state.room);
  const { user, accessToken } = useSelector((state: RootState) => state.auth);
  const { secondsLeft, timerActive, spinning } = useSelector((state: RootState) => state.game);
  
  const [copied, setCopied] = useState(false);
  const [localError, setLocalError] = useState("");
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [localStreamState, setLocalStreamState] = useState<MediaStream | null>(null);
  const [activeVideoUser, setActiveVideoUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // WebRTC Peer Connections Refs
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteAudiosContainerRef = useRef<HTMLDivElement>(null);
  const queuedCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  const arenaContentRef = useRef<HTMLElement>(null);

  // WebRTC Implementation
  const handleOffer = async (senderUserId: string, sdp: RTCSessionDescriptionInit) => {
    const socket = getSocket(accessToken || "");
    const pc = createPeerConnection(senderUserId);
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    
    const extendedPc = pc as any;
    if (extendedPc.iceCandidatesQueue) {
      for (const candidate of extendedPc.iceCandidatesQueue) {
        try {
          await extendedPc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error("Error adding queued ice candidate:", e);
        }
      }
      extendedPc.iceCandidatesQueue = [];
    }

    if (localStreamRef.current) {
      // Clear current senders
      const senders = pc.getSenders();
      senders.forEach((sender) => pc.removeTrack(sender));

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
    if (peersRef.current.has(targetUserId)) {
      const existing = peersRef.current.get(targetUserId);
      if (existing && existing.connectionState !== "closed") {
        return existing;
      }
      existing?.close();
    }

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    }) as any;

    pc.iceCandidatesQueue = queuedCandidatesRef.current.get(targetUserId) || [];
    queuedCandidatesRef.current.delete(targetUserId);

    pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate) {
        const socket = getSocket(accessToken || "");
        socket.emit("webrtc_signal", {
          roomCode: code,
          targetUserId,
          signalData: { type: "candidate", candidate: event.candidate }
        });
      }
    };

    pc.ontrack = (event: RTCTrackEvent) => {
      console.log(`Received remote track from ${targetUserId}:`, event.track.kind);
      const incomingStream = event.streams[0];
      
      setRemoteStreams((prev) => {
        const existingStream = prev[targetUserId];
        if (existingStream) {
          // Check if track already exists in existing stream
          const alreadyHasTrack = existingStream.getTracks().some(t => t.id === event.track.id);
          if (!alreadyHasTrack) {
            existingStream.addTrack(event.track);
          }
          // Always create a new MediaStream instance to force React trigger state updates
          return {
            ...prev,
            [targetUserId]: new MediaStream(existingStream.getTracks())
          };
        } else {
          // If no existing stream, construct a new one from incoming track
          const newStream = new MediaStream([event.track]);
          if (incomingStream) {
            incomingStream.getTracks().forEach((track) => {
              const has = newStream.getTracks().some(t => t.id === track.id);
              if (!has) newStream.addTrack(track);
            });
          }
          return {
            ...prev,
            [targetUserId]: newStream
          };
        }
      });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed" || pc.connectionState === "closed") {
        setRemoteStreams((prev) => {
          const next = { ...prev };
          delete next[targetUserId];
          return next;
        });
      }
    };

    peersRef.current.set(targetUserId, pc);
    return pc;
  };

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

      if (data.userId) {
        if (data.isOnline) {
          // If a player joins and we have an active stream, send them an offer
          if (localStreamRef.current && data.userId !== user?._id) {
            console.log(`Sending WebRTC offer to new online player: ${data.userId}`);
            const pc = createPeerConnection(data.userId);
            
            // Clear current senders
            pc.getSenders().forEach((sender) => pc.removeTrack(sender));

            // Add tracks
            localStreamRef.current.getTracks().forEach((track) => {
              pc.addTrack(track, localStreamRef.current!);
            });

            pc.createOffer().then((offer) => {
              return pc.setLocalDescription(offer);
            }).then(() => {
              socket.emit("webrtc_signal", {
                roomCode: code,
                targetUserId: data.userId,
                signalData: { type: "offer", sdp: pc.localDescription }
              });
            }).catch((err) => {
              console.error("Failed to send offer on presence update:", err);
            });
          }
        } else {
          // If player went offline, clean up peer
          const pc = peersRef.current.get(data.userId);
          if (pc) {
            pc.close();
            peersRef.current.delete(data.userId);
          }
          setRemoteStreams((prev) => {
            const next = { ...prev };
            delete next[data.userId];
            return next;
          });
        }
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

    socket.on("timer_expired", () => {
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
      cleanupWebRTC();
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

  // Entrance animations
  useEffect(() => {
    if (arenaContentRef.current && activeRoom) {
      gsap.fromTo(
        arenaContentRef.current,
        { opacity: 0, scale: 0.98 },
        { opacity: 1, scale: 1, duration: 0.6, ease: "power2.out" }
      );
    }
  }, [activeRoom?.code]);

  // WebRTC Signal Listener
  useEffect(() => {
    if (!accessToken || !user) return;
    const socket = getSocket(accessToken);

    const handleWebRTCSignal = async ({ senderUserId, signalData }: { senderUserId: string; signalData: any }) => {
      const pc = peersRef.current.get(senderUserId) || createPeerConnection(senderUserId);
      
      if (signalData.type === "offer") {
        if (pc && pc.signalingState === "have-local-offer" && user && user._id < senderUserId) {
          console.log("Ignoring offer due to WebRTC glare; we have smaller ID");
          return;
        }
        await handleOffer(senderUserId, signalData.sdp);
      } else if (signalData.type === "answer") {
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(signalData.sdp));
          const extendedPc = pc as any;
          if (extendedPc.iceCandidatesQueue) {
            for (const candidate of extendedPc.iceCandidatesQueue) {
              try {
                await extendedPc.addIceCandidate(new RTCIceCandidate(candidate));
              } catch (e) {
                console.error("Error adding queued ice candidate:", e);
              }
            }
            extendedPc.iceCandidatesQueue = [];
          }
        }
      } else if (signalData.type === "candidate") {
        if (pc) {
          if (pc.remoteDescription) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(signalData.candidate));
            } catch (e) {
              console.error("Error adding ice candidate:", e);
            }
          } else {
            const extendedPc = pc as any;
            if (!extendedPc.iceCandidatesQueue) {
              extendedPc.iceCandidatesQueue = [];
            }
            extendedPc.iceCandidatesQueue.push(signalData.candidate);
          }
        } else {
          if (!queuedCandidatesRef.current.has(senderUserId)) {
            queuedCandidatesRef.current.set(senderUserId, []);
          }
          queuedCandidatesRef.current.get(senderUserId)!.push(signalData.candidate);
        }
      }
    };

    socket.on("webrtc_signal", handleWebRTCSignal);
    return () => {
      socket.off("webrtc_signal", handleWebRTCSignal);
    };
  }, [accessToken, user, code]);

  // Sync hidden audio players for remote voice chat
  useEffect(() => {
    if (!remoteAudiosContainerRef.current) return;
    
    // Clear and rebuild
    remoteAudiosContainerRef.current.innerHTML = "";
    
    Object.entries(remoteStreams).forEach(([userId, stream]) => {
      if (stream.getAudioTracks().length > 0) {
        const audio = document.createElement("audio");
        audio.id = `audio-${userId}`;
        audio.autoplay = true;
        audio.srcObject = stream;
        remoteAudiosContainerRef.current?.appendChild(audio);
      }
    });
  }, [remoteStreams]);

  // WebRTC helpers moved above

  const updateMediaStream = async (voice: boolean, video: boolean) => {
    if (!voice && !video) {
      cleanupWebRTC();
      return;
    }

    try {
      const constraints = {
        audio: voice,
        video: video ? { width: { max: 320 }, height: { max: 240 }, frameRate: { max: 15 } } : false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStreamState(stream);
      setIsVoiceActive(voice);
      setIsVideoActive(video);

      if (activeRoom && user) {
        const socket = getSocket(accessToken || "");
        const otherOnlinePlayers = activeRoom.players.filter(
          (p) => p.userId !== user._id && p.isOnline
        );

        for (const player of otherOnlinePlayers) {
          const pc = createPeerConnection(player.userId);
          
          const senders = pc.getSenders();
          senders.forEach((sender) => pc.removeTrack(sender));

          stream.getTracks().forEach((track) => {
            pc.addTrack(track, stream);
          });

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
      console.error("Failed to acquire user media:", err);
      setIsVoiceActive(false);
      setIsVideoActive(false);
    }
  };

  const cleanupWebRTC = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    setLocalStreamState(null);

    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();
    setRemoteStreams({});
    setIsVoiceActive(false);
    setIsVideoActive(false);
  };

  const toggleVoiceChat = () => {
    updateMediaStream(!isVoiceActive, isVideoActive);
  };

  const toggleVideoChat = () => {
    updateMediaStream(isVoiceActive, !isVideoActive);
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

  const handleChooseType = async (type: "truth" | "dare") => {
    setLoading(true);
    try {
      await api.post(`/rooms/code/${code}/choice`, { type });
    } catch (err: any) {
      setLocalError(err.response?.data?.message || "Failed to make choice.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitOutcome = async (outcome: "completed" | "skipped") => {
    setLoading(true);
    try {
      await api.post(`/rooms/code/${code}/submit`, { outcome });
    } catch (err: any) {
      setLocalError(err.response?.data?.message || "Failed to submit outcome.");
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
    <div className="h-screen bg-[#0e0d13] text-[#e5e1ea] font-sans selection:bg-neon-purple/30 overflow-hidden relative">
      <BackgroundShader />
      <EmojiOverlay />
      <Navbar />
      <Sidebar />

      {/* Hidden Container for remote WebRTC audios */}
      <div ref={remoteAudiosContainerRef} className="hidden" />

      {/* Top Header bar placed in play zone */}
      <div className="lg:pl-72 xl:pr-80 pt-16 sticky top-0 z-30">
        <GameHeader
          code={code}
          copied={copied}
          status={status}
          isVoiceActive={isVoiceActive}
          isVideoActive={isVideoActive}
          handleLeaveRoom={handleLeaveRoom}
          handleCopyCode={handleCopyCode}
          toggleVoiceChat={toggleVoiceChat}
          toggleVideoChat={toggleVideoChat}
        />
      </div>

      {/* Main gameplay area margins fit inside Fixed Navigation Shell */}
      <main 
        ref={arenaContentRef}
        className="ml-0 lg:ml-72 mr-0 xl:mr-80 pt-2 pb-6 px-4 md:pt-4 md:pb-20 md:px-6 h-[calc(100vh-130px)] lg:h-[calc(100vh-120px)] flex flex-col items-center justify-center relative z-10"
      >
        {/* 1. LOBBY WAITING SCREEN */}
        {status === "lobby" && (
          <div className="flex-grow flex items-center justify-center py-6 w-full max-w-md">
            <LobbyView
              players={players}
              isHost={isHost}
              loading={loading}
              handleStartGame={handleStartGame}
            />
          </div>
        )}

        {/* 2. PLAYING ACTIVE ARENA */}
        {status === "playing" && (() => {
          const isMyTurn = game.currentPlayerId === user._id;
          const currentPlayer = players.find((p) => p.userId === game.currentPlayerId);
          const currentPlayerName = currentPlayer ? currentPlayer.username : "Someone";

          return (
            <div className="w-full h-full flex flex-col items-center justify-between py-2 overflow-hidden relative">
              
              {/* Top Stage Indicators */}
              <div className="text-center shrink-0 w-full max-w-md">
                <div className="glass px-6 py-2 rounded-full border border-white/10 flex items-center justify-center gap-3 w-fit mx-auto mb-3 shadow-[0_0_15px_rgba(188,19,254,0.1)]">
                  <div className="w-2 h-2 bg-neon-purple rounded-full animate-pulse"></div>
                  <span className="font-headline text-[10px] font-black uppercase tracking-widest text-zinc-300">
                    Round {game.currentRound}
                  </span>
                </div>
                
                {/* Sleek, thin Timer Progress Bar */}
                {timerActive && (
                  <div className="w-full max-w-[280px] mx-auto px-4 mt-2 mb-2 animate-fade-in">
                    <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-1 font-mono">
                      <span>Time Remaining</span>
                      <span className="text-neon-pink font-bold">{secondsLeft}s</span>
                    </div>
                    <div className="w-full bg-zinc-950/60 h-1.5 rounded-full overflow-hidden border border-zinc-900">
                      <div 
                        className="bg-gradient-to-r from-neon-pink to-red-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${(secondsLeft / 30) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Center Play Circle Container */}
              <div className="flex-1 w-full flex items-center justify-center relative overflow-visible min-h-0">
                {game.turnState !== "answering" && (
                  <BottleSpinner localStream={localStreamState} remoteStreams={remoteStreams} onPlayerClick={setActiveVideoUser} />
                )}
                
                {/* Overlay 1: Spin Bottle Button in center dial */}
                {game.turnState === "selecting" && (
                  <div className="absolute z-30 pointer-events-auto flex items-center justify-center animate-fade-in">
                    {isHost ? (
                      <button
                        onClick={handleSpinBottle}
                        disabled={loading}
                        className="diagonal-cut bg-gradient-to-r from-neon-purple to-neon-pink text-white px-8 py-4 font-headline font-black uppercase tracking-widest text-[11px] shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 cursor-pointer border-none"
                      >
                        {loading ? "Spinning..." : "SPIN BOTTLE"}
                      </button>
                    ) : (
                      <div className="glass-card border border-white/10 px-5 py-3.5 rounded-2xl max-w-[200px] text-center shadow-[0_0_30px_rgba(255,255,255,0.05)]">
                        <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-zinc-400">
                          Host is Spinning
                        </p>
                        <p className="text-[8px] text-zinc-600 font-bold uppercase mt-1">
                          Awaiting bottle rotation...
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Overlay 2: Choice (Truth/Dare) Buttons in center dial (only after spin finishes) */}
                {game.turnState === "choosing_type" && !spinning && (
                  <div className="absolute z-30 pointer-events-auto flex flex-col items-center justify-center glass-card border border-neon-purple/20 rounded-3xl p-5 max-w-[240px] text-center shadow-[0_0_40px_rgba(188,19,254,0.15)] animate-scale-up">
                    <h3 className="text-[9px] font-headline font-black uppercase tracking-widest text-zinc-400 mb-3 leading-normal">
                      {isMyTurn ? "YOUR TURN: CHOOSE!" : `${currentPlayerName.toUpperCase()} IS CHOOSING...`}
                    </h3>
                    {isMyTurn ? (
                      <div className="flex gap-3 mt-1">
                        <button
                          onClick={() => handleChooseType("truth")}
                          disabled={loading}
                          className="px-4 py-2.5 rounded-xl border border-neon-blue bg-neon-blue/15 text-neon-cyan font-headline text-[10px] font-extrabold uppercase tracking-wider hover:bg-neon-blue/35 transition-all cursor-pointer shadow-[0_0_15px_rgba(0,229,255,0.2)]"
                        >
                          Truth
                        </button>
                        <button
                          onClick={() => handleChooseType("dare")}
                          disabled={loading}
                          className="px-4 py-2.5 rounded-xl border border-neon-pink bg-neon-pink/15 text-neon-pink font-headline text-[10px] font-extrabold uppercase tracking-wider hover:bg-neon-pink/35 transition-all cursor-pointer shadow-[0_0_15px_rgba(255,45,85,0.2)]"
                        >
                          Dare
                        </button>
                      </div>
                    ) : (
                      <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider animate-pulse-slow">
                        Awaiting Choice
                      </p>
                    )}
                  </div>
                )}

                {/* Overlay 3: Question / Dare Challenge card popup (Challenge Stage) */}
                {game.turnState === "answering" && (() => {
                  const avatarUrl = currentPlayer?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentPlayerName}`;
                  const stream = game.currentPlayerId === user._id ? localStreamState : remoteStreams[game.currentPlayerId];
                  const hasVideo = stream && stream.getVideoTracks().length > 0;
                  
                  return (
                    <div className="w-full flex-1 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10 animate-scale-up p-4 min-h-0 overflow-y-auto">
                      {/* Active Player Live Stream Feed Card */}
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-headline font-black text-zinc-400 uppercase tracking-widest mb-2.5 text-center">
                          {isMyTurn ? "YOUR TURN TO PERFORM!" : `WATCHING ${currentPlayerName.toUpperCase()}'S CHALLENGE...`}
                        </span>
                        
                        <div className={`relative w-40 sm:w-44 md:w-48 aspect-[3/4] rounded-3xl overflow-hidden glass-card border transition-all duration-300 shadow-2xl ${
                          game.selectedType === "truth"
                            ? "border-neon-blue/60 shadow-[0_0_30px_rgba(0,229,255,0.25)]"
                            : "border-neon-pink/60 shadow-[0_0_30px_rgba(255,45,85,0.25)]"
                        }`}>
                          <div className="h-full w-full relative bg-zinc-950/80 flex items-center justify-center">
                            {hasVideo && stream ? (
                              <ActiveVideoFeed stream={stream} muted={game.currentPlayerId === user._id} />
                            ) : (
                              <img
                                src={avatarUrl}
                                alt={currentPlayerName}
                                className="w-20 h-20 sm:w-24 sm:h-24 object-cover opacity-80"
                              />
                            )}
                            
                            {/* Top indicator tag */}
                            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/60 border border-white/10">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                currentPlayer?.isOnline ? "bg-neon-cyan shadow-[0_0_6px_#00e5ff]" : "bg-zinc-600"
                              }`} />
                              <span className="text-[7px] font-headline font-black text-neon-cyan tracking-wider font-mono uppercase">
                                {currentPlayer?.isOnline ? "ONLINE" : "OFFLINE"}
                              </span>
                            </div>

                            {/* Bottom info banner */}
                            <div className="absolute bottom-0 inset-x-0 p-2.5 bg-gradient-to-t from-black/95 to-transparent text-left">
                              <p className="font-headline text-[10px] text-white truncate font-extrabold uppercase tracking-wide">
                                {currentPlayerName}
                              </p>
                              <p className="text-[8px] font-headline font-bold text-zinc-400 tracking-wider">
                                Score: {currentPlayer?.score || 0} pts
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Question Card & Action Buttons Container */}
                      <div className="flex flex-col items-center justify-center w-full max-w-[340px]">
                        <QuestionCard
                          type={game.selectedType}
                          text={game.currentQuestion?.text}
                          visible={true}
                        />
                        
                        {/* Answer actions if it is my turn */}
                        {isMyTurn && (
                          <div className="mt-4 flex gap-3">
                            <button
                              onClick={() => handleSubmitOutcome("completed")}
                              className="px-5 py-2.5 bg-neon-green text-black font-headline text-[9px] font-black uppercase tracking-wider rounded-xl hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-[0_0_15px_rgba(46,204,113,0.3)]"
                            >
                              Completed (+10)
                            </button>
                            <button
                              onClick={() => handleSubmitOutcome("skipped")}
                              className="px-5 py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-400 font-headline text-[9px] font-bold uppercase tracking-wider rounded-xl hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer"
                            >
                              Skip
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Bottom Stage Footer */}
              <div className="w-full shrink-0 flex flex-col items-center gap-1.5 py-1">
                {/* Turn indication text */}
                {game.turnState === "answering" && !isMyTurn && (
                  <p className="text-[9px] font-headline font-bold text-zinc-500 uppercase tracking-widest animate-pulse">
                    WATCHING {currentPlayerName.toUpperCase()}'S STREAM...
                  </p>
                )}

                {/* Host Conclude action */}
                {isHost && (
                  <button
                    onClick={handleEndGame}
                    className="text-[9px] font-headline font-bold uppercase tracking-wider text-red-500 hover:text-red-400 cursor-pointer"
                  >
                    Conclude Game Session
                  </button>
                )}
              </div>

            </div>
          );
        })()}

        {/* 3. FINISHED PODIUM VIEW */}
        {status === "finished" && (
          <div className="flex-grow flex items-center justify-center py-6 w-full max-w-md">
            <PodiumView
              players={players}
              game={game}
              handleReturnToDashboard={() => {
                dispatch(clearRoom());
                router.push("/dashboard");
              }}
            />
          </div>
        )}
      </main>

      {/* Right Column: Live Chat Sidebar placed fixed on right */}
      {status !== "finished" && (
        <div className="fixed right-3 top-20 bottom-3 w-80 hidden xl:flex z-40">
          <RoomSidebar roomCode={code} />
        </div>
      )}
      {/* Dynamic Video Focus Inspector for accessibility */}
      {activeVideoUser && (() => {
        const targetPlayer = players.find(p => p.userId === activeVideoUser);
        if (!targetPlayer) return null;
        
        const stream = targetPlayer.userId === user._id ? localStreamState : remoteStreams[targetPlayer.userId];
        const hasVideo = stream && stream.getVideoTracks().length > 0;
        const avatarUrl = targetPlayer.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${targetPlayer.username}`;

        return (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="glass-card max-w-lg w-full p-6 border border-neon-blue/30 shadow-[0_0_40px_rgba(0,229,255,0.15)] rounded-3xl relative text-left">
              <button 
                onClick={() => setActiveVideoUser(null)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Close
              </button>
              
              <h3 className="text-sm font-headline font-extrabold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-neon-blue animate-pulse"></span>
                Focus Stream: {targetPlayer.username}
              </h3>

              <div className="aspect-video w-full rounded-2xl overflow-hidden bg-zinc-950/80 border border-zinc-800 relative flex items-center justify-center">
                {hasVideo && stream ? (
                  <video
                    ref={(el) => {
                      if (el) el.srcObject = stream;
                    }}
                    autoPlay
                    playsInline
                    muted={targetPlayer.userId === user._id}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
                    <img src={avatarUrl} alt={targetPlayer.username} className="w-20 h-20 rounded-full border border-zinc-700 bg-zinc-900" />
                    <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Camera Feed Offline</p>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Player Rank</span>
                  <p className="text-xs font-headline font-extrabold text-neon-cyan uppercase">
                    {(targetPlayer.score ?? 0) >= 100 ? "MASTER" : "ROOKIE"}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Current Score</span>
                  <p className="text-xs font-headline font-extrabold text-white font-mono">
                    {targetPlayer.score ?? 0} XP
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Floating Chat Trigger Button for Mobile/Tablet */}
      {status !== "finished" && (
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="fixed bottom-4 right-4 z-50 xl:hidden w-12 h-12 rounded-full bg-neon-purple hover:bg-neon-purple/80 text-white flex items-center justify-center shadow-[0_0_20px_rgba(188,19,254,0.4)] cursor-pointer active:scale-95 transition-all"
        >
          <MessageSquare className="w-5 h-5" />
        </button>
      )}

      {/* Slide-over Drawer for Mobile/Tablet Chat */}
      {status !== "finished" && isChatOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 xl:hidden flex justify-end animate-fade-in">
          <div className="w-80 h-full bg-[#141319] border-l border-zinc-800 shadow-2xl relative flex flex-col p-4 animate-slide-in">
            {/* Close Button at top of drawer */}
            <div className="flex justify-between items-center mb-3">
              <span className="font-headline font-bold text-xs uppercase tracking-wider text-zinc-400">
                Lobby Chat
              </span>
              <button 
                onClick={() => setIsChatOpen(false)}
                className="text-zinc-500 hover:text-white p-1 rounded hover:bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <RoomSidebar roomCode={code} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
