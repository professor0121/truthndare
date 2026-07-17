"use client";

import React from "react";
import { Bell, Settings, LogOut, Menu } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../store";
import { logout } from "../../store/authSlice";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "./Button";

export default function Navbar() {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const router = useRouter();

  const handleLogout = () => {
    dispatch(logout());
    router.push("/");
  };

  const avatarUrl = user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.username || "guest"}`;

  return (
    <nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 md:px-10 h-16 bg-[#141319]/60 backdrop-blur-[40px] border-b border-white/10 shadow-[0_0_30px_rgba(188,19,254,0.15)]">
      {/* Brand Logo */}
      <div className="flex items-center gap-2">
        <Link href={user ? "/dashboard" : "/"} className="font-headline font-extrabold text-lg tracking-tighter text-neon-purple text-glow-purple uppercase select-none">
          NEON ARENA
        </Link>
      </div>

      {/* Nav Links */}
      <div className="hidden md:flex gap-6 items-center">
        <Link 
          href="/dashboard" 
          className="font-headline text-[10px] tracking-widest text-neon-purple font-extrabold hover:bg-white/5 transition-all px-4 py-2 rounded-lg"
        >
          Lobbies
        </Link>
        <a 
          href="#" 
          className="font-headline text-[10px] tracking-widest text-zinc-400 font-bold hover:text-white hover:bg-white/5 transition-all px-4 py-2 rounded-lg"
        >
          Leaderboard
        </a>
        <a 
          href="#" 
          className="font-headline text-[10px] tracking-widest text-zinc-400 font-bold hover:text-white hover:bg-white/5 transition-all px-4 py-2 rounded-lg"
        >
          Store
        </a>
      </div>

      {/* Action panel */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" className="p-2 rounded-full border-none hover:bg-white/5">
          <Bell className="w-4.5 h-4.5 text-zinc-400 hover:text-neon-purple transition-colors" />
        </Button>
        <Button variant="ghost" size="sm" className="p-2 rounded-full border-none hover:bg-white/5">
          <Settings className="w-4.5 h-4.5 text-zinc-400 hover:text-neon-purple transition-colors" />
        </Button>

        {user ? (
          <div className="flex items-center gap-3 pl-2 border-l border-zinc-800">
            <div className="w-9 h-9 rounded-full overflow-hidden border border-neon-purple/40 hover:border-neon-purple transition-all">
              <img 
                src={avatarUrl} 
                alt={user.username} 
                className="w-full h-full object-cover" 
              />
            </div>
            <button 
              onClick={handleLogout} 
              className="text-zinc-500 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-white/5"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link href="/">
            <Button size="sm" variant="primary">Login</Button>
          </Link>
        )}
      </div>
    </nav>
  );
}
