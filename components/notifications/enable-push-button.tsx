"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

// La clé publique VAPID est en base64url : conversion en Uint8Array pour
// pushManager.subscribe (applicationServerKey).
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type State = "loading" | "unsupported" | "denied" | "off" | "on" | "working";

// Bouton autonome d'activation des notifications push. À placer où tu veux
// (page Notifications, réglages, header…). Il gère : support, permission,
// souscription pushManager, envoi de l'abonnement au serveur, et désabonnement.
export function EnablePushButton() {
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !VAPID
    ) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? "on" : "off"))
      .catch(() => setState("off"));
  }, []);

  async function enable() {
    if (!VAPID) return;
    setState("working");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID) as BufferSource,
      });
      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
          deviceName: navigator.platform || "Appareil",
        }),
      });
      setState(res.ok ? "on" : "off");
    } catch {
      setState("off");
    }
  }

  async function disable() {
    setState("working");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("off");
    } catch {
      setState("on");
    }
  }

  if (state === "unsupported") return null;
  if (state === "loading") {
    return (
      <Button variant="secondary" disabled>
        <Bell aria-hidden="true" /> Notifications…
      </Button>
    );
  }
  if (state === "denied") {
    return (
      <p className="text-sm text-muted-foreground">
        Notifications bloquées dans le navigateur. Autorise-les dans les réglages du site.
      </p>
    );
  }
  if (state === "on") {
    return (
      <Button variant="ghost" onClick={disable} disabled={false}>
        <BellOff aria-hidden="true" /> Désactiver les notifications
      </Button>
    );
  }
  return (
    <Button onClick={enable} disabled={state === "working"}>
      <Bell aria-hidden="true" /> {state === "working" ? "Activation…" : "Activer les notifications"}
    </Button>
  );
}
