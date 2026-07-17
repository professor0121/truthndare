"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store";
import { setCredentials, setLoading, setError } from "../store/authSlice";
import { api } from "../lib/api";
import gsap from "gsap";
import { Lock, User, Mail, Play, Sparkles, Gamepad2, AlertCircle } from "lucide-react";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";

export default function Home() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { isAuthenticated, loading, error } = useSelector((state: RootState) => state.auth);

  const [activeTab, setActiveTab] = useState<"login" | "register" | "guest">("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [identifier, setIdentifier] = useState(""); // email or username for login
  
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  // Entrance animations
  useEffect(() => {
    if (containerRef.current && titleRef.current) {
      const tl = gsap.timeline();
      tl.fromTo(
        titleRef.current,
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
      ).fromTo(
        containerRef.current,
        { opacity: 0, y: 30, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: "power3.out" },
        "-=0.3"
      );
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) return;

    dispatch(setLoading(true));
    dispatch(setError(null));
    try {
      const response = await api.post("/auth/login", { identifier, password });
      if (response.data?.success) {
        const { user, accessToken, refreshToken } = response.data.data;
        dispatch(setCredentials({ user, accessToken, refreshToken }));
        router.push("/dashboard");
      }
    } catch (err: any) {
      dispatch(setError(err.response?.data?.message || "Invalid credentials"));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !username || !password) return;

    dispatch(setLoading(true));
    dispatch(setError(null));
    try {
      const response = await api.post("/auth/register", { email, username, password });
      if (response.data?.success) {
        // Auto login on successful register
        const loginResponse = await api.post("/auth/login", { identifier: username, password });
        if (loginResponse.data?.success) {
          const { user, accessToken, refreshToken } = loginResponse.data.data;
          dispatch(setCredentials({ user, accessToken, refreshToken }));
          router.push("/dashboard");
        }
      }
    } catch (err: any) {
      dispatch(setError(err.response?.data?.message || "Registration failed. Try again."));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleGuestLogin = async () => {
    dispatch(setLoading(true));
    dispatch(setError(null));
    try {
      const response = await api.post("/auth/guest-login");
      if (response.data?.success) {
        const { user, accessToken, refreshToken } = response.data.data;
        dispatch(setCredentials({ user, accessToken, refreshToken }));
        router.push("/dashboard");
      }
    } catch (err: any) {
      dispatch(setError(err.response?.data?.message || "Failed to join as guest"));
    } finally {
      dispatch(setLoading(false));
    }
  };

  return (
    <div className="flex flex-col flex-1 items-center justify-center min-h-screen px-4 bg-radial from-dark-surface via-background to-background relative overflow-hidden">
      {/* Decorative Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Floating Ambient Light Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-purple/10 rounded-full blur-3xl animate-pulse-slow pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-blue/10 rounded-full blur-3xl animate-pulse-slow pointer-events-none" />

      <main className="w-full max-w-md flex flex-col items-center z-10">
        {/* Logo and Tagline */}
        <div className="text-center mb-8">
          <h1
            ref={titleRef}
            className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-neon-purple via-neon-pink to-neon-blue bg-clip-text text-transparent text-glow-purple uppercase select-none flex items-center justify-center gap-3"
          >
            <Gamepad2 className="w-12 h-12 text-neon-purple animate-bounce" />
            TRUTH <span className="text-white">&</span> DARE
          </h1>
          <p className="text-zinc-400 mt-2 text-sm uppercase tracking-widest">
            AI-Powered Cyber Social Arena
          </p>
        </div>

        {/* Auth Card Container */}
        <Card
          ref={containerRef}
          glow="purple"
          className="w-full p-8 relative"
        >
          {/* Tab Selector */}
          <div className="flex bg-black/40 p-1.5 rounded-xl mb-8 border border-zinc-800/60">
            <button
              onClick={() => { setActiveTab("login"); dispatch(setError(null)); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === "login"
                  ? "bg-neon-purple text-white shadow-[0_0_10px_rgba(188,19,254,0.5)]"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Login
            </button>
            <button
              onClick={() => { setActiveTab("register"); dispatch(setError(null)); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === "register"
                  ? "bg-neon-purple text-white shadow-[0_0_10px_rgba(188,19,254,0.5)]"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Register
            </button>
            <button
              onClick={() => { setActiveTab("guest"); dispatch(setError(null)); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === "guest"
                  ? "bg-neon-purple text-white shadow-[0_0_10px_rgba(188,19,254,0.5)]"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Guest
            </button>
          </div>

          {/* Form Error Message */}
          {error && (
            <div className="flex items-center gap-2 bg-red-950/40 border border-red-900/60 text-red-200 text-xs px-3 py-2.5 rounded-lg mb-6 animate-pulse">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          {activeTab === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                type="text"
                required
                label="Username or Email"
                icon={<User className="w-4 h-4 text-zinc-500" />}
                placeholder="Enter email or username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />

              <Input
                type="password"
                required
                label="Password"
                icon={<Lock className="w-4 h-4 text-zinc-500" />}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <Button
                type="submit"
                loading={loading}
                className="w-full mt-4"
              >
                Connect Session
              </Button>
            </form>
          )}

          {/* Register Form */}
          {activeTab === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <Input
                type="email"
                required
                label="Email Address"
                icon={<Mail className="w-4 h-4 text-zinc-500" />}
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <Input
                type="text"
                required
                label="Desired Username"
                icon={<User className="w-4 h-4 text-zinc-500" />}
                placeholder="CyberNinja"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />

              <Input
                type="password"
                required
                label="Password"
                icon={<Lock className="w-4 h-4 text-zinc-500" />}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <Button
                type="submit"
                loading={loading}
                className="w-full mt-4"
              >
                Create Account
              </Button>
            </form>
          )}

          {/* Guest Play Tab */}
          {activeTab === "guest" && (
            <div className="text-center space-y-6">
              <p className="text-sm text-zinc-400 leading-relaxed">
                Want to play immediately? Join as a Guest player. You'll receive a random avatar and can convert to a full account later without losing your scores.
              </p>
              
              <Button
                onClick={handleGuestLogin}
                loading={loading}
                variant="valorant"
                className="w-full py-3.5 flex items-center justify-center gap-2"
              >
                <Play className="w-4.5 h-4.5 fill-current" />
                Enter Arena
              </Button>
            </div>
          )}
        </Card>

        {/* Footer Info */}
        <p className="mt-8 text-xs text-zinc-500 select-none flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-neon-pink" /> Powered by Gemini Generative AI
        </p>
      </main>
    </div>
  );
}

