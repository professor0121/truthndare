"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../store";
import { logout, updateProfile, setError as setAuthError } from "../../store/authSlice";
import { setRoom, setPublicLobbies } from "../../store/roomSlice";
import { api } from "../../lib/api";
import gsap from "gsap";
import { 
  LogOut, User, Plus, LogIn, RefreshCw, Trophy, ShieldAlert,
  Edit, Check, Globe, Lock, Shield, Gamepad2, Settings2, Users
} from "lucide-react";
import NotificationManager from "../../components/NotificationManager";


const AVATAR_SEEDS = ["Astro", "Samurai", "Hacker", "Glitch", "Bionic", "Outrun", "Vapor", "Spark"];

export default function Dashboard() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, isAuthenticated, loading } = useSelector((state: RootState) => state.auth);
  const { publicLobbies } = useSelector((state: RootState) => state.room);

  // Forms states
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const [roomCode, setRoomCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Guest conversion form
  const [convertEmail, setConvertEmail] = useState("");
  const [convertUsername, setConvertUsername] = useState("");
  const [convertPassword, setConvertPassword] = useState("");

  // Avatar Modal
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  
  // Refs for animations
  const gridRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  // Fetch public lobbies and user details on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchLobbies();
    }
  }, [isAuthenticated]);

  // Entrance animations
  useEffect(() => {
    if (gridRef.current && headerRef.current) {
      gsap.fromTo(
        headerRef.current,
        { opacity: 0, y: -50 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
      );
      
      const children = gridRef.current.children;
      gsap.fromTo(
        Array.from(children),
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: "power3.out" }
      );
    }
  }, [isAuthenticated]);

  const fetchLobbies = async () => {
    try {
      const response = await api.get("/rooms/public");
      if (response.data?.success) {
        dispatch(setPublicLobbies(response.data.data));
      }
    } catch (err: any) {
      console.error("Failed to fetch public lobbies:", err.message);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (e) {
      // Ignore API logout error, continue clearing local state
    }
    dispatch(logout());
    router.push("/");
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    try {
      const response = await api.post("/rooms/create", { maxPlayers, visibility });
      if (response.data?.success) {
        const roomData = response.data.data;
        dispatch(setRoom(roomData));
        router.push(`/room/${roomData.code}`);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Failed to create room");
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode || roomCode.length !== 6) {
      setErrorMsg("Room code must be exactly 6 characters.");
      return;
    }
    setErrorMsg("");
    try {
      const response = await api.post("/rooms/join", { code: roomCode.toUpperCase() });
      if (response.data?.success) {
        const roomData = response.data.data;
        dispatch(setRoom(roomData));
        router.push(`/room/${roomData.code}`);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Failed to join room");
    }
  };

  const handleJoinLobby = async (code: string) => {
    setErrorMsg("");
    try {
      const response = await api.post("/rooms/join", { code });
      if (response.data?.success) {
        const roomData = response.data.data;
        dispatch(setRoom(roomData));
        router.push(`/room/${roomData.code}`);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Failed to join room");
    }
  };

  const handleAvatarSelect = async (seed: string) => {
    const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`;
    try {
      const response = await api.patch("/auth/profile", { avatar: avatarUrl });
      if (response.data?.success) {
        dispatch(updateProfile({ avatar: avatarUrl }));
        setShowAvatarModal(false);
      }
    } catch (err) {
      console.error("Failed to update avatar:", err);
    }
  };

  const handleConvertGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const response = await api.post("/auth/convert-guest", {
        email: convertEmail,
        username: convertUsername,
        password: convertPassword,
      });
      if (response.data?.success) {
        const { user: updatedUser, accessToken, refreshToken } = response.data.data;
        dispatch(updateProfile(updatedUser));
        setSuccessMsg("Account converted successfully! You are now a registered user.");
        // Clear inputs
        setConvertEmail("");
        setConvertUsername("");
        setConvertPassword("");
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Failed to convert guest account");
    }
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  const isGuest = user.role === "guest";

  return (
    <div className="min-h-screen bg-radial from-zinc-950 via-black to-zinc-950 flex flex-col">
      {/* Header bar */}
      <header
        ref={headerRef}
        className="w-full glass border-b border-zinc-800/80 px-6 py-4 flex items-center justify-between sticky top-0 z-40"
      >
        <div className="flex items-center gap-2.5">
          <Gamepad2 className="w-8 h-8 text-neon-purple" />
          <span className="font-extrabold text-xl tracking-wider bg-gradient-to-r from-neon-purple to-neon-pink bg-clip-text text-transparent uppercase select-none">
            Truth & Dare
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="relative group">
              <img
                src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                alt="Profile Avatar"
                className="w-10 h-10 rounded-full border-2 border-neon-purple shadow-[0_0_10px_rgba(168,85,247,0.3)] bg-zinc-900 cursor-pointer"
                onClick={() => setShowAvatarModal(true)}
              />
              <button 
                onClick={() => setShowAvatarModal(true)}
                className="absolute -bottom-1 -right-1 bg-zinc-950 border border-zinc-700 p-1 rounded-full text-zinc-300 hover:text-white"
              >
                <Edit className="w-3 h-3" />
              </button>
            </div>
            
            <div className="hidden sm:block text-left">
              <div className="font-bold text-sm text-white flex items-center gap-1">
                {user.username}
                {isGuest && (
                  <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                    Guest
                  </span>
                )}
              </div>
              <div className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">
                XP: {user.xp} • Level {Math.floor(user.xp / 100) + 1}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="p-2.5 rounded-lg border border-zinc-800 hover:bg-red-950/20 hover:border-red-900/40 text-zinc-400 hover:text-red-400 transition-all select-none cursor-pointer"
            title="Log Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        <NotificationManager />
        
        {/* Error/Success Feedbacks */}
        {errorMsg && (
          <div className="flex items-center gap-2 bg-red-950/40 border border-red-900/60 text-red-200 text-sm px-4 py-3 rounded-xl animate-pulse">
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-900/60 text-emerald-200 text-sm px-4 py-3 rounded-xl">
            <Check className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Dashboard Grid */}
        <div ref={gridRef} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Column Left: Profile & Guest Conversion (4 Cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* User Statistics Card */}
            <div className="glass-card p-6 rounded-2xl glow-purple relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-neon-purple/5 rounded-full blur-2xl pointer-events-none" />
              <h2 className="text-xs uppercase tracking-widest text-zinc-400 font-bold mb-4 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-neon-purple" />
                Player Profile
              </h2>

              <div className="flex flex-col items-center text-center space-y-4 py-4">
                <img
                  src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                  alt="Avatar big"
                  className="w-24 h-24 rounded-full border-4 border-neon-purple shadow-[0_0_20px_rgba(168,85,247,0.4)] bg-zinc-900"
                />
                <div>
                  <h3 className="text-2xl font-bold text-white tracking-wide">{user.username}</h3>
                  <p className="text-zinc-500 text-sm">{user.email || "No email registered"}</p>
                </div>

                {/* Level Progress */}
                <div className="w-full space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-zinc-400">
                    <span>Level {Math.floor(user.xp / 100) + 1}</span>
                    <span>{user.xp % 100} / 100 XP</span>
                  </div>
                  <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800">
                    <div 
                      className="bg-gradient-to-r from-neon-purple to-neon-pink h-full rounded-full transition-all duration-500"
                      style={{ width: `${user.xp % 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Guest Conversion Card (Only for guest role) */}
            {isGuest && (
              <div className="glass-card p-6 rounded-2xl border-dashed border-neon-pink/40 bg-radial from-neon-pink/[0.02] to-transparent">
                <h2 className="text-xs uppercase tracking-widest text-neon-pink font-bold mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-neon-pink" />
                  Secure Your Profile
                </h2>
                <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                  Convert this temporary guest account into a permanent registration. Keep your current score and level progression.
                </p>

                <form onSubmit={handleConvertGuest} className="space-y-3.5">
                  <div>
                    <input
                      type="email"
                      required
                      placeholder="Email Address"
                      value={convertEmail}
                      onChange={(e) => setConvertEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg glass-input text-xs text-white"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      required
                      placeholder="Permanent Username"
                      value={convertUsername}
                      onChange={(e) => setConvertUsername(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg glass-input text-xs text-white"
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      required
                      placeholder="Choose Password"
                      value={convertPassword}
                      onChange={(e) => setConvertPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg glass-input text-xs text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-neon-pink to-red-500 rounded-lg hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer shadow-[0_0_10px_rgba(236,72,153,0.3)]"
                  >
                    Register Account
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Column Middle/Right: Lobbies & Operations (8 Cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Quick Actions (Create / Join) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Create Room */}
              <div className="glass-card p-6 rounded-2xl glow-blue">
                <h2 className="text-sm font-bold uppercase tracking-wider text-white mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-neon-blue" />
                  Host Game Session
                </h2>
                
                <form onSubmit={handleCreateRoom} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                        Max Players
                      </label>
                      <input
                        type="number"
                        min={2}
                        max={20}
                        value={maxPlayers}
                        onChange={(e) => setMaxPlayers(parseInt(e.target.value) || 8)}
                        className="w-full px-3 py-2 rounded-lg glass-input text-sm text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                        Lobby Type
                      </label>
                      <select
                        value={visibility}
                        onChange={(e) => setVisibility(e.target.value as "public" | "private")}
                        className="w-full px-3 py-2 rounded-lg glass-input text-sm text-white bg-zinc-950 border border-zinc-800"
                      >
                        <option value="private">Private (Invite)</option>
                        <option value="public">Public (Lobby)</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 mt-2 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-widest text-white bg-gradient-to-r from-neon-blue to-neon-cyan rounded-lg hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                  >
                    <Plus className="w-4 h-4" />
                    Create Arena
                  </button>
                </form>
              </div>

              {/* Join Room */}
              <div className="glass-card p-6 rounded-2xl glow-purple">
                <h2 className="text-sm font-bold uppercase tracking-wider text-white mb-4 flex items-center gap-2">
                  <LogIn className="w-5 h-5 text-neon-purple" />
                  Enter Active Arena
                </h2>

                <form onSubmit={handleJoinRoom} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                      Enter 6-Character Room Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      placeholder="CYBER1"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      className="w-full px-4 py-2.5 rounded-lg glass-input text-sm text-center text-white tracking-widest font-mono text-lg placeholder:tracking-normal placeholder:font-sans placeholder:text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-widest text-white bg-gradient-to-r from-neon-purple to-neon-pink rounded-lg hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                  >
                    <LogIn className="w-4 h-4" />
                    Enter Code
                  </button>
                </form>
              </div>

            </div>

            {/* Public Lobbies List */}
            <div className="glass-card p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-neon-cyan" />
                  Public Lobbies Board
                </h2>
                <button
                  onClick={fetchLobbies}
                  className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer"
                  title="Refresh Lobbies"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {publicLobbies.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-zinc-800 rounded-xl">
                  <Users className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                  <p className="text-sm text-zinc-500">No active public lobbies found.</p>
                  <p className="text-xs text-zinc-600 mt-1">Host your own lobby to start playing!</p>
                </div>
              ) : (
                <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
                  {publicLobbies.map((lobby) => (
                    <div 
                      key={lobby.code}
                      className="glass border border-zinc-800/80 px-4 py-3.5 rounded-xl flex items-center justify-between hover:border-zinc-700 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="font-mono font-bold text-lg text-neon-cyan tracking-wider">
                          {lobby.code}
                        </div>
                        <div className="text-xs text-zinc-400">
                          <div>Host: <span className="font-bold text-zinc-300">{lobby.players.find(p => p.isHost)?.username || "Unknown"}</span></div>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-zinc-500">
                            <Users className="w-3.5 h-3.5" />
                            <span>{lobby.players.length} / {lobby.maxPlayers} players</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleJoinLobby(lobby.code)}
                        className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-black bg-neon-cyan hover:bg-cyan-300 rounded-md transition-all cursor-pointer shadow-[0_0_8px_rgba(6,182,212,0.2)]"
                      >
                        Join
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      </main>

      {/* Avatar Modal */}
      {showAvatarModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-filter backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="glass-card max-w-md w-full p-6 rounded-2xl border border-zinc-800 glow-purple animate-pulse-once">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-neon-purple" />
                Select Avatar Character
              </h3>
              <button 
                onClick={() => setShowAvatarModal(false)}
                className="text-zinc-400 hover:text-white text-sm"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-4 gap-4 py-4">
              {AVATAR_SEEDS.map((seed) => {
                const url = `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`;
                return (
                  <button
                    key={seed}
                    onClick={() => handleAvatarSelect(seed)}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-xl border border-zinc-800 hover:border-neon-purple hover:bg-purple-950/15 transition-all group"
                  >
                    <img
                      src={url}
                      alt={seed}
                      className="w-12 h-12 bg-zinc-900 rounded-full border-2 border-zinc-800 group-hover:border-neon-purple transition-all"
                    />
                    <span className="text-[10px] text-zinc-500 font-semibold group-hover:text-zinc-300">{seed}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
