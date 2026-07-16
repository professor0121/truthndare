"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import { api } from "../lib/api";
import { Bell, X, ShieldAlert } from "lucide-react";

// Helper function to decode VAPID keys
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function NotificationManager() {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [showBanner, setShowBanner] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
      if (Notification.permission === "default" && isAuthenticated) {
        setShowBanner(true);
      }
    }
  }, [isAuthenticated]);

  const requestSubscription = async () => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }

    setLoading(true);
    try {
      // 1. Request user permission
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== "granted") {
        setShowBanner(false);
        return;
      }

      // 2. Register service worker
      const registration = await navigator.serviceWorker.register("/sw.js");
      
      // Wait until SW is active
      await navigator.serviceWorker.ready;

      // 3. Retrieve VAPID Key from backend
      const keyResponse = await api.get("/notifications/vapid-key");
      if (!keyResponse.data?.success) {
        throw new Error("Failed to retrieve public key");
      }
      
      const { publicKey } = keyResponse.data.data;

      // 4. Create Push Subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // 5. Sync subscription back to express server database
      await api.post("/notifications/subscribe", subscription.toJSON());
      
      setShowBanner(false);
    } catch (error) {
      console.error("Push registration failed:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!showBanner || !isAuthenticated) return null;

  return (
    <div className="w-full glass border border-neon-blue/30 bg-radial from-neon-blue/[0.05] to-transparent p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse-once">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-neon-blue/10 border border-neon-blue/20">
          <Bell className="w-5 h-5 text-neon-cyan" />
        </div>
        <div className="text-left">
          <h4 className="font-bold text-xs uppercase tracking-wider text-white">Enable Real-Time Alerts</h4>
          <p className="text-[11px] text-zinc-400">Receive game room invitations and friend requests directly in your browser.</p>
        </div>
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
        <button
          onClick={requestSubscription}
          disabled={loading}
          className="flex-1 sm:flex-initial px-4 py-2 text-xs font-bold uppercase tracking-wider text-black bg-neon-cyan hover:bg-cyan-300 rounded-lg active:scale-95 transition-all cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.3)] disabled:opacity-50"
        >
          {loading ? "Activating..." : "Enable Alerts"}
        </button>
        <button
          onClick={() => setShowBanner(false)}
          className="p-2 border border-zinc-800 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
