"use client";

import { useState, useEffect } from "react";
import { Wifi, WifiOff } from "lucide-react";

export function OfflineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowStatus(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!showStatus) return null;

  return (
    <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2">
      <div
        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-lg ${
          isOnline
            ? "bg-[var(--chart-2)]/10 text-[var(--chart-2)] border border-[var(--chart-2)]/30"
            : "bg-destructive/10 text-destructive border border-destructive/30"
        }`}
      >
        {isOnline ? (
          <Wifi className="size-4" />
        ) : (
          <WifiOff className="size-4" />
        )}
        {isOnline ? "Conexao restaurada" : "Sem conexao — modo offline"}
      </div>
    </div>
  );
}
