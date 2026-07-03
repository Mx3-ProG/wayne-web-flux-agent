"use client";

import { useEffect, useState } from "react";
import type { Service } from "@/lib/types";
import { formatDuration, formatPrice } from "@/lib/types";

type DayAvailability = { date: string; status: "closed" | "full" | "open"; slots: number };

type Props = {
  slug: string;
  service: Service;
  accentColor: string;
  onClose: () => void;
};

function formatDay(isoDate: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(isoDate + "T12:00:00Z"));
}

// Réservation en 3 étapes : jour → heure → coordonnées. Sans compte client.
export function BookingModal({ slug, service, accentColor, onClose }: Props) {
  const [step, setStep] = useState<"day" | "time" | "form" | "done">("day");
  const [days, setDays] = useState<DayAvailability[] | null>(null);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/booking/${slug}/days?service=${service.id}`)
      .then((r) => r.json())
      .then((data) => setDays(data.days ?? []))
      .catch(() => setError("Impossible de charger les disponibilités."));
  }, [slug, service.id]);

  function pickDay(d: string) {
    setDate(d);
    setSlots(null);
    setStep("time");
    fetch(`/api/booking/${slug}/slots?service=${service.id}&date=${d}`)
      .then((r) => r.json())
      .then((data) => setSlots(data.slots ?? []))
      .catch(() => setError("Impossible de charger les créneaux."));
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch(`/api/booking/${slug}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: service.id,
        date,
        time,
        first_name: form.get("first_name"),
        phone: form.get("phone"),
        email: form.get("email"),
      }),
    });
    setSubmitting(false);
    if (res.status === 204) {
      setStep("done");
    } else if (res.status === 409) {
      setError("Ce créneau vient d'être pris. Choisis-en un autre.");
      pickDay(date);
    } else {
      setError("La réservation n'a pas pu être enregistrée. Réessaie.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl bg-[#faf7f4] p-6 text-[#1c1c1c]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-xl font-semibold">{service.name}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="text-2xl leading-none opacity-50 hover:opacity-100"
          >
            ×
          </button>
        </div>
        <p className="text-sm opacity-60 mb-5">
          {formatDuration(service.duration_min)}
          {service.price_cents > 0 && <> · {formatPrice(service.price_cents)}</>}
          {(step === "time" || step === "form") && (
            <> · {formatDay(date)}{step === "form" && ` à ${time}`}</>
          )}
        </p>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        {step === "day" && (
          <>
            <p className="font-medium mb-3">Choisissez un jour</p>
            {!days && <p className="text-sm opacity-60">Un instant…</p>}
            <div className="grid grid-cols-2 gap-2">
              {days?.map((d) => (
                <button
                  key={d.date}
                  type="button"
                  disabled={d.status !== "open"}
                  onClick={() => pickDay(d.date)}
                  className="rounded-xl bg-white px-3 py-3 text-center shadow-sm disabled:opacity-40 disabled:bg-transparent hover:shadow transition-shadow"
                >
                  <span className="block font-medium capitalize">
                    {formatDay(d.date)}
                  </span>
                  <span className="block text-xs opacity-60">
                    {d.status === "closed"
                      ? "fermé"
                      : d.status === "full"
                        ? "complet"
                        : `${d.slots} créneaux`}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === "time" && (
          <>
            <button
              type="button"
              className="text-sm underline underline-offset-4 mb-3"
              onClick={() => setStep("day")}
            >
              ← changer de jour
            </button>
            {!slots && <p className="text-sm opacity-60">Un instant…</p>}
            <div className="grid grid-cols-4 gap-2">
              {slots?.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setTime(s);
                    setStep("form");
                  }}
                  className="rounded-lg bg-white px-2 py-2 text-sm font-medium shadow-sm hover:shadow transition-shadow"
                >
                  {s}
                </button>
              ))}
            </div>
          </>
        )}

        {step === "form" && (
          <form onSubmit={submit} className="space-y-3">
            <button
              type="button"
              className="text-sm underline underline-offset-4"
              onClick={() => setStep("time")}
            >
              ← changer d&apos;heure
            </button>
            <p className="font-medium">Vos coordonnées</p>
            <input
              name="first_name"
              required
              maxLength={60}
              placeholder="Votre prénom"
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5"
            />
            <input
              name="phone"
              required
              type="tel"
              pattern="[+0-9 ().-]{6,20}"
              placeholder="Votre téléphone"
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5"
            />
            <input
              name="email"
              type="email"
              placeholder="Votre email (optionnel)"
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5"
            />
            <p className="text-xs opacity-60">
              Pour recevoir la confirmation de votre rendez-vous.
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl px-4 py-3 font-medium text-white disabled:opacity-60"
              style={{ backgroundColor: accentColor }}
            >
              {submitting ? "Un instant…" : "Confirmer le rendez-vous"}
            </button>
          </form>
        )}

        {step === "done" && (
          <div className="text-center py-6">
            <p className="text-4xl mb-3">✓</p>
            <p className="font-semibold mb-1">C&apos;est réservé !</p>
            <p className="text-sm opacity-70">
              {service.name} · {formatDay(date)} à {time}.
              <br />À très vite.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 rounded-xl px-5 py-2.5 font-medium text-white"
              style={{ backgroundColor: accentColor }}
            >
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
