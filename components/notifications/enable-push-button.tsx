"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
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

export type PushButtonDict = {
  loading: string;
  enable: string;
  enabling: string;
  disable: string;
  blocked: string;
  deviceFallback: string;
};

// Capacité du navigateur + permission : deux valeurs synchrones côté client,
// mais indisponibles au rendu serveur. useSyncExternalStore livre le bon
// snapshot après hydratation sans mismatch NI setState dans un effet (même
// approche que components/cookie-consent.tsx). Les lire dans un useEffect
// déclenchait un rendu en cascade — voir react-hooks/set-state-in-effect.
type Support = "unsupported" | "denied" | "available";

function subscribeToNothing(): () => void {
  return () => {};
}

function supportSnapshot(): Support {
  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !VAPID
  ) {
    return "unsupported";
  }
  return Notification.permission === "denied" ? "denied" : "available";
}

// Au rendu serveur on ne sait rien du navigateur : "unsupported" ne rend rien,
// donc aucun contenu ne saute au moment de l'hydratation.
function serverSupportSnapshot(): Support {
  return "unsupported";
}

// Souscription courante de CET appareil. "loading" tant que le service worker
// n'a pas répondu ; les transitions suivantes viennent des clics.
type Subscription = "loading" | "on" | "off" | "working" | "denied";

// Bouton autonome d'activation des notifications push. Il gère : support,
// permission, souscription pushManager, envoi de l'abonnement au serveur, et
// désabonnement.
export function EnablePushButton({ t }: { t: PushButtonDict }) {
  const support = useSyncExternalStore(
    subscribeToNothing,
    supportSnapshot,
    serverSupportSnapshot
  );
  const [subscription, setSubscription] = useState<Subscription>("loading");

  useEffect(() => {
    if (support !== "available") return;
    let cancelled = false;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (!cancelled) setSubscription(sub ? "on" : "off");
      })
      .catch(() => {
        if (!cancelled) setSubscription("off");
      });
    return () => {
      cancelled = true;
    };
  }, [support]);

  async function enable() {
    if (!VAPID) return;
    setSubscription("working");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setSubscription(permission === "denied" ? "denied" : "off");
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
          deviceName: navigator.platform || t.deviceFallback,
        }),
      });
      setSubscription(res.ok ? "on" : "off");
    } catch {
      setSubscription("off");
    }
  }

  async function disable() {
    setSubscription("working");
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
      setSubscription("off");
    } catch {
      setSubscription("on");
    }
  }

  if (support === "unsupported") return null;
  if (support === "denied" || subscription === "denied") {
    return <p className="text-sm text-muted-foreground">{t.blocked}</p>;
  }
  if (subscription === "loading") {
    return (
      <Button variant="secondary" disabled>
        <Bell aria-hidden="true" /> {t.loading}
      </Button>
    );
  }
  if (subscription === "on") {
    return (
      <Button variant="ghost" onClick={disable}>
        <BellOff aria-hidden="true" /> {t.disable}
      </Button>
    );
  }
  return (
    <Button onClick={enable} disabled={subscription === "working"}>
      <Bell aria-hidden="true" />{" "}
      {subscription === "working" ? t.enabling : t.enable}
    </Button>
  );
}
