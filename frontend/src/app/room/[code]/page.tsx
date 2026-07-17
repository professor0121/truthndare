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
import { ShieldAlert } from "lucide-react";
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
  const queuedCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  const arenaContentRef = useRef<HTMLElement>(null);

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
    if (!accessToken) return;
    const socket = getSocket(accessToken);

    const handleWebRTCSignal = async ({ senderUserId, signalData }: { senderUserId: string; signalData: any }) => {
      if (!isVoiceActive) return;

      const pc = peersRef.current.get(senderUserId);
      
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
  }, [isVoiceActive, accessToken, user]);

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
      peersRef.current.get(targetUserId)?.close();
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
      if (remoteAudiosContainerRef.current) {
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      setIsVoiceActive(true);

      if (activeRoom && user) {
        const socket = getSocket(accessToken || "");
        const otherOnlinePlayers = activeRoom.players.filter(
          (p) => p.userId !== user._id && p.isOnline
        );

        for (const player of otherOnlinePlayers) {
          const pc = createPeerConnection(player.userId);
          
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
      console.error("Failed to acquire microphone for WebRTC:", err);
      setIsVoiceActive(false);
    }
  };

  const cleanupVoiceChat = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();

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
          handleLeaveRoom={handleLeaveRoom}
          handleCopyCode={handleCopyCode}
          toggleVoiceChat={toggleVoiceChat}
        />
      </div>

      {/* Main gameplay area margins fit inside Fixed Navigation Shell */}
      <main 
        ref={arenaContentRef}
        className="ml-0 lg:ml-72 mr-0 xl:mr-80 pt-4 pb-20 px-6 h-[calc(100vh-120px)] flex flex-col items-center justify-center relative z-10"
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
        {status === "playing" && (
          <div className="w-full h-full flex flex-col items-center justify-between py-2 overflow-hidden">
            
            {/* Top Stage Indicators */}
            <div className="text-center shrink-0">
              <span className="text-[10px] font-headline font-black uppercase tracking-widest px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-full">
                Round {game.currentRound}
              </span>
              
              {/* Host actions */}
              {isHost && game.turnState === "selecting" && (
                <button
                  onClick={handleSpinBottle}
                  disabled={loading}
                  className="mt-2 block mx-auto px-5 py-2 bg-gradient-to-r from-neon-purple to-neon-pink text-white text-[9px] font-headline font-black uppercase tracking-wider rounded-xl hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                >
                  {loading ? "Spinning..." : "Spin Bottle"}
                </button>
              )}
            </div>

            {/* Spinner Container */}
            <div className="flex-1 flex items-center justify-center overflow-hidden min-h-0 w-full">
              <BottleSpinner />
            </div>

            {/* AI cards and Console Controllers */}
            <div className="w-full shrink-0 flex flex-col items-center gap-3.5 mt-4">
              <QuestionCard
                type={game.selectedType}
                text={game.currentQuestion?.text}
                visible={game.turnState === "answering"}
              />
              
              <TurnConsole roomCode={code} />
            </div>

            {/* Host Conclude action */}
            {isHost && (
              <button
                onClick={handleEndGame}
                className="text-[9px] font-headline font-bold uppercase tracking-wider text-red-500 hover:text-red-400 cursor-pointer mt-2 shrink-0"
              >
                Conclude Game Session
              </button>
            )}

          </div>
        )}

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
    </div>
  );
}
