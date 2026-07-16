"use client";

import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { getSocket } from "../../lib/socket";
import { Send, MessageSquare, Flame, Laugh, Heart, AlertCircle, Sparkles } from "lucide-react";

interface RoomSidebarProps {
  roomCode: string;
}

const EMOJI_REACTIONS = ["🔥", "😂", "😮", "👑", "👻", "🎉"];

export default function RoomSidebar({ roomCode }: RoomSidebarProps) {
  const { messages } = useSelector((state: RootState) => state.chat);
  const { accessToken } = useSelector((state: RootState) => state.auth);
  
  const [inputText, setInputText] = useState("");
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto scroll chat to bottom when messages list updates
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const socket = getSocket(accessToken || undefined);
    if (socket.connected) {
      socket.emit("send_message", { roomCode, message: inputText.trim() });
      setInputText("");
    }
  };

  const handleSendEmoji = (emoji: string) => {
    const socket = getSocket(accessToken || undefined);
    if (socket.connected) {
      socket.emit("send_emoji", { roomCode, emoji });
    }
  };

  return (
    <div className="w-full lg:w-[320px] h-full flex flex-col glass border border-zinc-800/80 rounded-2xl overflow-hidden">
      {/* Sidebar Header */}
      <div className="px-4 py-3.5 border-b border-zinc-800/60 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-neon-purple" />
        <span className="font-bold text-sm tracking-wider uppercase text-zinc-200">
          Arena Communications
        </span>
      </div>

      {/* Chat Logs Window */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-[300px] lg:min-h-0">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-10">
            <MessageSquare className="w-8 h-8 text-zinc-600 mb-2" />
            <p className="text-xs text-zinc-500">No transmissions yet.</p>
            <p className="text-[10px] text-zinc-600">Send a message to start chat log.</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className="flex gap-2.5 items-start text-left">
              <img
                src={msg.sender.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${msg.sender.username}`}
                alt={msg.sender.username}
                className="w-7.5 h-7.5 rounded-full bg-zinc-950 border border-zinc-800 shrink-0 mt-0.5"
              />
              <div className="space-y-0.5 max-w-[80%]">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[10px] font-black text-neon-purple tracking-wide">
                    {msg.sender.username}
                  </span>
                  <span className="text-[9px] text-zinc-600">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="bg-zinc-900/60 border border-zinc-800/40 text-xs text-zinc-300 px-3 py-1.5 rounded-xl rounded-tl-none break-words">
                  {msg.message}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Emoji Reactions Drawer */}
      <div className="px-4 py-2 bg-black/40 border-t border-zinc-800/60 flex items-center justify-between gap-1">
        {EMOJI_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleSendEmoji(emoji)}
            className="text-xl p-1.5 hover:bg-zinc-800/60 rounded-lg active:scale-90 transition-all select-none cursor-pointer"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Input Message Text Form */}
      <form onSubmit={handleSendMessage} className="p-3 bg-black/60 border-t border-zinc-800/60 flex gap-2">
        <input
          type="text"
          placeholder="Enter transmission..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 px-3 py-2 rounded-xl glass-input text-xs text-white"
        />
        <button
          type="submit"
          className="p-2 bg-neon-purple text-white hover:brightness-110 active:scale-95 transition-all rounded-xl cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
