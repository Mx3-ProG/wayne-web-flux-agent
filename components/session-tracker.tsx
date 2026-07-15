"use client";

import { useEffect } from "react";

const IDLE_AFTER_MS = 15 * 60 * 1000;

export function SessionTracker() {
  useEffect(() => {
    let lastInteraction = Date.now();
    const markActive = () => { lastInteraction = Date.now(); };
    const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((event) => window.addEventListener(event, markActive, { passive: true }));
    const heartbeat = () => {
      const active = document.visibilityState === "visible" && Date.now() - lastInteraction < IDLE_AFTER_MS;
      void fetch("/api/session/heartbeat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ active }),
        keepalive: true,
      });
    };
    heartbeat();
    const interval = window.setInterval(heartbeat, 60_000);
    document.addEventListener("visibilitychange", heartbeat);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", heartbeat);
      events.forEach((event) => window.removeEventListener(event, markActive));
    };
  }, []);
  return null;
}

