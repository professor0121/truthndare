"use client";

import React from "react";
import { 
  LayoutGrid, 
  Gamepad2, 
  Trophy, 
  Briefcase, 
  Users, 
  HelpCircle, 
  LogOut, 
  ShieldAlert 
} from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../store";
import { logout } from "../../store/authSlice";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Button from "./Button";

interface SidebarProps {
  onCreateRoom?: () => void;
}

export default function Sidebar({ onCreateRoom }: SidebarProps) {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    dispatch(logout());
    router.push("/");
  };

  const userScore = user?.score || 0;
  // Calculate Rank Title
  let rankTitle = "Rookie";
  let xpProgress = (userScore % 1000) / 10; // percent of current 1000 XP tier
  if (userScore >= 3000) {
    rankTitle = "Legendary";
  } else if (userScore >= 1500) {
    rankTitle = "Master";
  } else if (userScore >= 500) {
    rankTitle = "Elite";
  }

  const menuItems = [
    { name: "Home", href: "/dashboard", icon: LayoutGrid },
    { name: "Lobbies", href: "/dashboard", icon: Gamepad2 },
    { name: "Leaderboard", href: "#", icon: Trophy },
    { name: "Inventory", href: "#", icon: Briefcase },
    { name: "Friends", href: "#", icon: Users },
  ];

  return (
    <aside className="hidden lg:flex flex-col p-6 gap-4 fixed left-3 top-20 bottom-3 w-64 rounded-2xl bg-[#141319]/10 backdrop-blur-[40px] border border-white/10 shadow-xl z-40 text-left">
      {/* Header/Profile Info */}
      <div className="flex flex-col gap-2.5 p-2 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-neon-purple to-neon-cyan rounded-xl flex items-center justify-center border border-neon-purple/40">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-headline text-[10px] text-neon-cyan font-extrabold uppercase tracking-wider">
              Rank: {rankTitle}
            </p>
            <p className="text-[10px] text-zinc-500 font-stats-code mt-0.5 font-bold font-mono">
              {userScore} XP TOTAL
            </p>
          </div>
        </div>

        {/* XP progress bar */}
        <div className="w-full space-y-1">
          <div className="flex justify-between text-[8px] text-zinc-500 font-bold uppercase font-mono">
            <span>Progress</span>
            <span>{Math.round(xpProgress)}%</span>
          </div>
          <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/40">
            <div 
              className="h-full bg-gradient-to-r from-neon-purple to-neon-cyan transition-all duration-500"
              style={{ width: `${xpProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <nav className="flex flex-col gap-1 flex-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href && item.name !== "Leaderboard" && item.name !== "Inventory" && item.name !== "Friends";
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-headline text-[10px] uppercase font-bold tracking-widest ${
                isActive
                  ? "bg-gradient-to-r from-neon-purple/20 to-neon-cyan/20 text-white border-r-2 border-neon-purple"
                  : "text-zinc-400 hover:text-white hover:bg-white/5 hover:translate-x-1"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-neon-purple" : "text-zinc-400"}`} />
              {item.name}
            </Link>
          );
        })}

        {/* CTA CREATE ROOM */}
        <Button
          onClick={onCreateRoom}
          variant="valorant"
          className="mt-6 mx-1 py-3 text-glow-purple uppercase tracking-[0.15em] font-extrabold text-[10px]"
        >
          CREATE ROOM
        </Button>
      </nav>

      {/* Footer Tabs Options */}
      <div className="flex flex-col gap-1 border-t border-white/5 pt-4">
        <a 
          href="#" 
          className="flex items-center gap-3 px-4 py-2 rounded-xl text-zinc-400 hover:text-white font-headline text-[10px] uppercase font-bold tracking-widest transition-all"
        >
          <HelpCircle className="w-4.5 h-4.5" />
          Help
        </a>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2 rounded-xl text-zinc-400 hover:text-red-400 font-headline text-[10px] uppercase font-bold tracking-widest transition-all text-left"
        >
          <LogOut className="w-4.5 h-4.5" />
          Logout
        </button>
      </div>
    </aside>
  );
}
