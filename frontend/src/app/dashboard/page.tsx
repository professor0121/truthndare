"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../store";
import { logout, updateProfile } from "../../store/authSlice";
import { setRoom, setPublicLobbies } from "../../store/roomSlice";
import { api } from "../../lib/api";
import gsap from "gsap";
import { 
  Plus, LogIn, RefreshCw, Trophy, ShieldAlert,
  Edit, Check, Globe, Shield, Gamepad2, Settings2, Users, Search, AlertCircle
} from "lucide-react";
import NotificationManager from "../../components/NotificationManager";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Badge from "../../components/ui/Badge";
import Navbar from "../../components/ui/Navbar";
import Sidebar from "../../components/ui/Sidebar";
import BackgroundShader from "../../components/ui/BackgroundShader";

const AVATAR_SEEDS = ["Astro", "Samurai", "Hacker", "Glitch", "Bionic", "Outrun", "Vapor", "Spark"];

// Aesthetic Preset Room Banners mapping
const ROOM_BANNERS = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBeL49ovNaEe8qnCkcbSQZf2yecflXfa8ajfYjIjSLrjN3Jw6tgxnXEHQdn7V3Y40pBCFCqh3RKTDpGrJw696jxi3V_GUK5iO0SJQCo-dVq6bnrW4MLJreVp2GJQiiUTexfray9n9qDonoF2kPByBIWcjAfdgtLeNZEMXsu9tNBUzS_5POs4wRoY_bs7mKjg5wMKbl6AQ3uDM8pkFksDfzdMjXFboGQp89_a_DaPGOPzLtXy0uroD9micSH9D2SYnfC4BWfWzw3NOY",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCJcv7n8DTLOV05454QbUdsgm1H9R1SUJq3STOIAYGjYZTRW_15n0qjWOPba__Bh6JEEz87Fs86yj3ou6huo11DaaWqZipdGcb2J41Fqex2OISZ5uZJCsp69a9gp0xgLcnqYtECGtMH4F1mbv9O4UMeedolRKw2jjVYKXmk29_6r8Q-ovEtL3TnvYBoE4l8fAoid1nHU_5OTrpBV4OUzs1dzfKZAxPjvQrL9PG7Mo3qx5QY8QXIUXlq6b3X97RxZEEVHadFItj8q-0",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBW1QikV64VQ7pd3gJuLyDwxs30CQpEBJ2AZvASVo1yX4hsRk9n3pZv9pq9OxnzSDiN4x5tM4L-ki_COsymPH7QasiOgM6fuAgJm_gVSf6VQervT_1eOrvFgz1Bp4dagLZiEdbMSSS-6ng3XDr0nY4oNqOPBZ1zROTzKUgdQkLMWENdfyPxHiN-Af032JveHsdEC-8ym9GUuuDLYCBdqIPj09XVAHObBKSoMYU3vuX0XBFO4kJlTovs2xvpqyaY_63Aj9Tj5Ta4VqU",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuC9nbKtLsqC9Ke_dAXwKKNd-bR1INno37xMVAhr6SD4hHqk5ECPly4O1GPyvi2UutUKhbBS7O7miSKgl1A5yKvagfAEZf87hvsBuIxsGHIimZYsMVA7X55pMyBXJ_gHLVZlhuABMUZvEev_TmupbaUpEigxg7IPYNOwvfHYayjF3UfnaixD3YaklBwZkzIZB9u-uaAqAyuChDzvY_LV2NZWu-Cl3C1sK7OZ6icZghAzl4xAze8BZXHB4TcMoSj237dqY5ZkxIo0_Ps"
];

const MAP_NAMES = ["Neon District", "Orbital Station", "Data Core", "Cryo Chamber"];

export default function Dashboard() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { publicLobbies } = useSelector((state: RootState) => state.room);

  // Modal Triggers
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);

  // Form states
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const [roomCode, setRoomCode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"public" | "friends" | "trending">("public");
  
  // Feedback alerts
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Guest conversion form
  const [convertEmail, setConvertEmail] = useState("");
  const [convertUsername, setConvertUsername] = useState("");
  const [convertPassword, setConvertPassword] = useState("");

  const mainContentRef = useRef<HTMLElement>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  // Fetch lobbies
  useEffect(() => {
    if (isAuthenticated) {
      fetchLobbies();
    }
  }, [isAuthenticated]);

  // Entrance animations
  useEffect(() => {
    if (mainContentRef.current) {
      gsap.fromTo(
        mainContentRef.current,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
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
        const { user: updatedUser } = response.data.data;
        dispatch(updateProfile(updatedUser));
        setSuccessMsg("Account converted successfully!");
        setShowConvertModal(false);
        setConvertEmail("");
        setConvertUsername("");
        setConvertPassword("");
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Failed to convert guest account");
    }
  };

  if (!isAuthenticated || !user) return null;

  const isGuest = user.role === "guest";

  // Filter lobbies by search query
  const filteredLobbies = publicLobbies.filter((lobby) => {
    const host = lobby.players.find((p) => p.isHost)?.username || "";
    return (
      lobby.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      host.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="min-h-screen bg-[#0e0d13] text-[#e5e1ea] font-sans selection:bg-neon-purple/30 overflow-hidden relative">
      <BackgroundShader />
      <Navbar />
      <Sidebar onCreateRoom={() => setShowCreateModal(true)} />

      {/* Main Content shifted left by sidebar size on desktop */}
      <main 
        ref={mainContentRef} 
        className="lg:pl-72 pt-20 pb-24 px-6 md:px-10 h-screen overflow-y-auto z-10"
      >
        <NotificationManager />

        {/* Global Error/Success Alert Bar */}
        {errorMsg && (
          <div className="flex items-center gap-2 bg-red-950/40 border border-red-900/60 text-red-200 text-xs px-4 py-3 rounded-xl mb-6">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-900/60 text-emerald-200 text-xs px-4 py-3 rounded-xl mb-6">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Guest conversion banner alert */}
        {isGuest && (
          <div className="glass border border-neon-pink/30 bg-radial from-neon-pink/[0.04] to-transparent p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 mb-6 text-left">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-neon-pink shrink-0 animate-pulse" />
              <div>
                <h4 className="text-xs font-headline font-extrabold text-white uppercase tracking-wider">
                  Playing as Temporary Guest
                </h4>
                <p className="text-[10px] text-zinc-400 leading-normal">
                  Your score and progression will be lost. Secure your profile by converting to a full account.
                </p>
              </div>
            </div>
            <Button 
              onClick={() => setShowConvertModal(true)} 
              variant="danger" 
              size="sm"
              className="text-[9px] px-4 py-2 shrink-0 tracking-wider uppercase font-bold"
            >
              Secure Account
            </Button>
          </div>
        )}

        {/* Header Title Row */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 text-left">
          <div>
            <h1 className="font-headline font-extrabold text-3xl md:text-4xl uppercase leading-none tracking-tight">
              Lobby <span className="text-neon-purple italic">Browser</span>
            </h1>
            <p className="text-[11px] text-zinc-400 uppercase tracking-widest font-semibold mt-1">
              Find your next battle in the electric arena.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Filter buttons */}
            <div className="glass p-1 rounded-xl flex gap-1 border border-zinc-800">
              <button 
                onClick={() => setActiveFilter("public")}
                className={`px-4 py-1.5 rounded-lg font-headline text-[9px] font-bold uppercase tracking-wider transition-all ${
                  activeFilter === "public" 
                    ? "bg-neon-purple/20 text-neon-purple border border-neon-purple/30" 
                    : "text-zinc-500 hover:text-white"
                }`}
              >
                Public
              </button>
              <button 
                onClick={() => setActiveFilter("friends")}
                className={`px-4 py-1.5 rounded-lg font-headline text-[9px] font-bold uppercase tracking-wider transition-all ${
                  activeFilter === "friends" 
                    ? "bg-neon-purple/20 text-neon-purple border border-neon-purple/30" 
                    : "text-zinc-500 hover:text-white"
                }`}
              >
                Friends
              </button>
              <button 
                onClick={() => setActiveFilter("trending")}
                className={`px-4 py-1.5 rounded-lg font-headline text-[9px] font-bold uppercase tracking-wider transition-all ${
                  activeFilter === "trending" 
                    ? "bg-neon-purple/20 text-neon-purple border border-neon-purple/30" 
                    : "text-zinc-500 hover:text-white"
                }`}
              >
                Trending
              </button>
            </div>

            {/* Quick join key modal trigger */}
            <Button onClick={() => setShowJoinModal(true)} variant="secondary" size="sm" className="py-2.5">
              <LogIn className="w-3.5 h-3.5 mr-1" />
              Join with Code
            </Button>
          </div>
        </div>

        {/* Dynamic Search & Actions Container */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md group text-left">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-neon-purple transition-colors w-4 h-4" />
            <input 
              type="text"
              placeholder="Search for lobbies, hosts, or codes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#141319]/40 border-b-2 border-zinc-800 focus:border-neon-purple focus:ring-0 transition-all pl-10 pr-4 py-2.5 outline-none text-xs text-white placeholder:text-zinc-600 rounded-t-xl"
            />
          </div>

          <button
            onClick={fetchLobbies}
            className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer"
            title="Refresh Lobbies"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Bento Lobbies grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          
          {/* Create Custom Room CTA Card */}
          <div 
            onClick={() => setShowCreateModal(true)}
            className="relative rounded-3xl overflow-hidden border border-dashed border-neon-purple/40 group hover:border-neon-purple transition-all duration-500 cursor-pointer flex flex-col items-center justify-center p-6 text-center bg-neon-purple/[0.02] min-h-[300px]"
          >
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-neon-purple/20 blur-xl rounded-full group-hover:scale-150 transition-transform duration-700"></div>
              <Plus className="w-12 h-12 text-neon-purple relative z-10 animate-pulse" />
            </div>
            <h3 className="font-headline font-extrabold text-sm text-white uppercase tracking-wider">
              Host Custom Arena
            </h3>
            <p className="text-[10px] text-zinc-500 max-w-xs mt-1.5 leading-normal">
              Configure slots, private invitation limits, and rules to launch your custom match.
            </p>
            <button className="px-6 py-2.5 glass rounded-full font-headline text-[9px] text-neon-purple border border-neon-purple/20 group-hover:bg-neon-purple group-hover:text-black transition-all font-bold uppercase tracking-wider mt-6">
              Configure Now
            </button>
          </div>

          {/* Lobby cards mapping */}
          {filteredLobbies.length === 0 ? (
            <div className="md:col-span-2 xl:col-span-2 flex flex-col items-center justify-center text-center p-12 glass border border-dashed border-zinc-800 rounded-3xl min-h-[300px]">
              <Users className="w-10 h-10 text-zinc-700 mb-2" />
              <h4 className="text-xs font-headline font-extrabold text-zinc-400 uppercase tracking-widest">
                No Active Matches
              </h4>
              <p className="text-[10px] text-zinc-600 mt-1 leading-normal max-w-xs">
                No public lobbies match your search criteria. Create one to invite players!
              </p>
            </div>
          ) : (
            filteredLobbies.map((lobby, index) => {
              // Cycle through map names & dynamic banners
              const mapIndex = index % MAP_NAMES.length;
              const bannerUrl = ROOM_BANNERS[mapIndex];
              const mapName = MAP_NAMES[mapIndex];
              const ping = 12 + (index * 7) % 35; // simulated ping

              const hostName = lobby.players.find(p => p.isHost)?.username || "Unknown";
              const isMatchFull = lobby.players.length >= lobby.maxPlayers;
              const statusText = lobby.game?.status === "playing" 
                ? "MATCH IN PROGRESS" 
                : isMatchFull ? "ROOM FULL" : "WAITING...";

              return (
                <div 
                  key={lobby.code}
                  className="glass border border-zinc-800 rounded-3xl overflow-hidden group hover:border-neon-purple/50 transition-all duration-500 hover:shadow-[0_0_30px_rgba(188,19,254,0.1)] text-left flex flex-col justify-between"
                >
                  <div className="h-40 relative overflow-hidden shrink-0">
                    <img 
                      src={bannerUrl} 
                      alt={mapName}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    
                    {/* Ping indicators */}
                    <div className="absolute top-4 left-4 bg-black/85 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]"></div>
                      <span className="font-stats-code text-[10px] font-bold text-white font-mono">{ping}ms</span>
                    </div>

                    {/* Match status badge */}
                    <div className="absolute top-4 right-4 bg-neon-purple text-black font-headline text-[8px] font-black px-2.5 py-1 rounded uppercase tracking-wider">
                      {statusText}
                    </div>

                    <div className="absolute inset-0 bg-gradient-to-t from-[#0e0d13] to-transparent opacity-80" />
                  </div>

                  {/* Body Info */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-headline font-extrabold text-base text-white group-hover:text-neon-purple transition-colors uppercase tracking-wide">
                            CYBER_LOBBY {lobby.code}
                          </h3>
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono">
                            Host: <span className="text-neon-cyan">{hostName}</span>
                          </p>
                        </div>

                        <div className="text-right">
                          <div className="font-headline text-lg font-black text-white leading-none">
                            {lobby.players.length}
                            <span className="text-zinc-600 font-bold">/{lobby.maxPlayers}</span>
                          </div>
                          <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">Players</span>
                        </div>
                      </div>

                      {/* Map and Tags info */}
                      <div className="flex items-center gap-2 mb-6">
                        <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] font-headline font-bold text-zinc-400 uppercase tracking-wide">
                          {mapName}
                        </span>
                        <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] font-headline font-bold text-zinc-400 uppercase tracking-wide">
                          Crossplay
                        </span>
                      </div>
                    </div>

                    {/* Join Operation */}
                    <Button
                      onClick={() => handleJoinLobby(lobby.code)}
                      variant={isMatchFull ? "ghost" : "valorant"}
                      disabled={isMatchFull}
                      className="w-full py-3.5 tracking-[0.15em] font-extrabold uppercase text-[10px]"
                    >
                      {isMatchFull ? "Room Full" : "JOIN ARENA"}
                    </Button>
                  </div>
                </div>
              );
            })
          )}

        </div>
      </main>

      {/* --- MODALS SHELL --- */}

      {/* Modal 1: Create/Host Room */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <Card glow="purple" className="max-w-md w-full p-6 border border-zinc-800 shadow-[0_0_40px_rgba(188,19,254,0.2)] text-left">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-headline font-extrabold text-white flex items-center gap-2 uppercase tracking-wider">
                <Plus className="w-5 h-5 text-neon-purple" />
                Configure Arena Session
              </h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-zinc-500 hover:text-white text-xs font-bold uppercase tracking-wide cursor-pointer"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="number"
                  min={2}
                  max={20}
                  label="Slot Limit"
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(parseInt(e.target.value) || 8)}
                />

                <div className="space-y-1 text-left">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                    Visibility
                  </label>
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as "public" | "private")}
                    className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:border-neon-purple focus:outline-none transition-all"
                  >
                    <option value="private">Private (Invite Link)</option>
                    <option value="public">Public (Room Browser)</option>
                  </select>
                </div>
              </div>

              <Button
                type="submit"
                variant="valorant"
                className="w-full py-3 mt-2 text-[10px] font-extrabold uppercase tracking-widest"
              >
                Create Room Arena
              </Button>
            </form>
          </Card>
        </div>
      )}

      {/* Modal 2: Join with Code */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <Card glow="blue" className="max-w-md w-full p-6 border border-zinc-800 shadow-[0_0_40px_rgba(0,229,255,0.2)] text-left">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-headline font-extrabold text-white flex items-center gap-2 uppercase tracking-wider">
                <LogIn className="w-5 h-5 text-neon-blue" />
                Enter Arena Code
              </h3>
              <button 
                onClick={() => setShowJoinModal(false)}
                className="text-zinc-500 hover:text-white text-xs font-bold uppercase tracking-wide cursor-pointer"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleJoinRoom} className="space-y-4 pt-2">
              <Input
                type="text"
                maxLength={6}
                required
                placeholder="CYBER1"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="text-center text-white tracking-widest font-mono text-xl uppercase placeholder:tracking-normal placeholder:font-sans placeholder:text-xs"
              />

              <Button
                type="submit"
                variant="primary"
                className="w-full py-3 text-[10px] font-extrabold uppercase tracking-widest"
              >
                Enter Match
              </Button>
            </form>
          </Card>
        </div>
      )}

      {/* Modal 3: Secure Profile (Convert Guest) */}
      {showConvertModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <Card glow="pink" className="max-w-md w-full p-6 border border-zinc-800 shadow-[0_0_40px_rgba(255,45,85,0.2)] text-left">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-headline font-extrabold text-white flex items-center gap-2 uppercase tracking-wider">
                <Shield className="w-5 h-5 text-neon-pink" />
                Secure Profile Registration
              </h3>
              <button 
                onClick={() => setShowConvertModal(false)}
                className="text-zinc-500 hover:text-white text-xs font-bold uppercase tracking-wide cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleConvertGuest} className="space-y-3.5 pt-2">
              <Input
                type="email"
                required
                placeholder="Email Address"
                value={convertEmail}
                onChange={(e) => setConvertEmail(e.target.value)}
              />
              <Input
                type="text"
                required
                placeholder="Permanent Username"
                value={convertUsername}
                onChange={(e) => setConvertUsername(e.target.value)}
              />
              <Input
                type="password"
                required
                placeholder="Choose Secure Password"
                value={convertPassword}
                onChange={(e) => setConvertPassword(e.target.value)}
              />
              <Button
                type="submit"
                variant="danger"
                className="w-full py-3 text-[10px] font-extrabold uppercase tracking-widest mt-2"
              >
                Register Credentials
              </Button>
            </form>
          </Card>
        </div>
      )}

      {/* Modal 4: Select Avatar */}
      {showAvatarModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <Card glow="purple" className="max-w-md w-full p-6 border border-zinc-800 shadow-[0_0_40px_rgba(188,19,254,0.2)] text-left">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-headline font-extrabold text-white flex items-center gap-2 uppercase tracking-wider">
                <Settings2 className="w-5 h-5 text-neon-purple" />
                Select Avatar Character
              </h3>
              <button 
                onClick={() => setShowAvatarModal(false)}
                className="text-zinc-500 hover:text-white text-xs font-bold uppercase tracking-wide cursor-pointer"
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
                    className="flex flex-col items-center gap-1.5 p-2 rounded-2xl border border-zinc-800 hover:border-neon-purple hover:bg-purple-950/15 transition-all group cursor-pointer"
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
          </Card>
        </div>
      )}

    </div>
  );
}
