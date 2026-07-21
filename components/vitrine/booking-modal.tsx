"use client";

import { useEffect, useState } from "react";
import type { Service } from "@/lib/types";
import { formatDuration, formatPrice } from "@/lib/types";
import type { Locale } from "@/lib/i18n/config";
import { defaultLocale } from "@/lib/i18n/config";
import { formatDate } from "@/lib/i18n/format";
import type { StorefrontDict } from "@/lib/i18n/get-dictionary";
import frStorefront from "@/lib/i18n/dictionaries/fr/storefront.json";

type DayAvailability = { date: string; status: "closed" | "full" | "open"; slots: number };

type Props = {
  slug: string;
  service: Service;
  accentColor: string;
  designId?: string;
  buttonDesignId?: string;
  onClose: () => void;
  locale?: Locale;
  t?: StorefrontDict["booking"];
};

// Réservation en 3 étapes : jour → heure → coordonnées. Sans compte client.
export function BookingModal({ slug, service, accentColor, designId, buttonDesignId, onClose, locale, t = frStorefront.booking }: Props) {
  const [step, setStep] = useState<"day" | "time" | "form" | "done">("day");
  const [days, setDays] = useState<DayAvailability[] | null>(null);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function formatDay(isoDate: string): string {
    return formatDate(locale ?? defaultLocale, isoDate + "T12:00:00Z", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  }

  useEffect(() => {
    fetch(`/api/booking/${slug}/days?service=${service.id}`)
      .then((r) => r.json())
      .then((data) => setDays(data.days ?? []))
      .catch(() => setError(t.loadAvailabilityError));
  }, [slug, service.id, t]);

  function pickDay(d: string) {
    setDate(d);
    setSlots(null);
    setStep("time");
    fetch(`/api/booking/${slug}/slots?service=${service.id}&date=${d}`)
      .then((r) => r.json())
      .then((data) => setSlots(data.slots ?? []))
      .catch(() => setError(t.loadSlotsError));
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
      setError(t.slotTakenError);
      pickDay(date);
    } else {
      setError(t.genericError);
    }
  }

  return (
    <div
      data-design-booking={designId}
      data-design-button={buttonDesignId}
      style={{ "--flux-button-accent": accentColor } as React.CSSProperties}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-3 backdrop-blur-md sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md max-h-[88svh] overflow-y-auto rounded-[28px] border border-white/60 bg-[#faf7f4]/95 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-[#1c1c1c] shadow-[0_30px_100px_rgb(0_0_0_/_55%)] backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-xl font-semibold">{service.name}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="text-2xl leading-none opacity-50 hover:opacity-100"
          >
            ×
          </button>
        </div>
        <p className="text-sm opacity-60 mb-5">
          {formatDuration(service.duration_min)}
          {service.price_cents > 0 && <> · {formatPrice(service.price_cents)}</>}
          {(step === "time" || step === "form") && (
            <> · {formatDay(date)}{step === "form" && ` ${t.at} ${time}`}</>
          )}
        </p>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        {step === "day" && (
          <>
            <p className="font-medium mb-3">{t.chooseDay}</p>
            {!days && <p className="text-sm opacity-60">{t.loading}</p>}
            <div className="grid grid-cols-2 gap-2">
              {days?.map((d) => (
                <button
                  key={d.date}
                  type="button"
                  disabled={d.status !== "open"}
                  onClick={() => pickDay(d.date)}
                  className="min-h-14 rounded-2xl border border-black/5 bg-white/80 px-3 py-3 text-center shadow-sm disabled:opacity-40 disabled:bg-transparent hover:shadow transition-shadow"
                >
                  <span className="block font-medium capitalize">
                    {formatDay(d.date)}
                  </span>
                  <span className="block text-xs opacity-60">
                    {d.status === "closed"
                      ? t.closed
                      : d.status === "full"
                        ? t.full
                        : t.slotsCount.replace("{count}", String(d.slots))}
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
              {t.changeDay}
            </button>
            {!slots && <p className="text-sm opacity-60">{t.loading}</p>}
            <div className="grid grid-cols-4 gap-2">
              {slots?.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setTime(s);
                    setStep("form");
                  }}
                  className="min-h-12 rounded-xl border border-black/5 bg-white/80 px-2 py-2 text-sm font-medium shadow-sm hover:shadow transition-shadow"
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
              {t.changeTime}
            </button>
            <p className="font-medium">{t.yourDetails}</p>
            <input
              name="first_name"
              required
              maxLength={60}
              placeholder={t.firstNamePlaceholder}
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5"
            />
            <input
              name="phone"
              required
              type="tel"
              pattern="[+0-9 ().-]{6,20}"
              placeholder={t.phonePlaceholder}
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5"
            />
            <input
              name="email"
              type="email"
              placeholder={t.emailPlaceholder}
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5"
            />
            <p className="text-xs opacity-60">{t.confirmationHint}</p>
            <button
              data-vitrine-action
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl px-4 py-3 font-medium text-white disabled:opacity-60"
              style={{ backgroundColor: accentColor }}
            >
              {submitting ? t.loading : t.confirm}
            </button>
          </form>
        )}

        {step === "done" && (
          <div className="text-center py-6">
            <p className="text-4xl mb-3">✓</p>
            <p className="font-semibold mb-1">{t.booked}</p>
            <p className="text-sm opacity-70">
              {service.name} · {formatDay(date)} {t.at} {time}.
              <br />{t.seeYouSoon}
            </p>
            <button
              data-vitrine-action
              type="button"
              onClick={onClose}
              className="mt-5 rounded-xl px-5 py-2.5 font-medium text-white"
              style={{ backgroundColor: accentColor }}
            >
              {t.close}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
