"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type {
  BlockedPeriod,
  Booking,
  Customer,
  Page,
  Schedule,
  TimeRange,
} from "@/lib/types";
import { formatPrice } from "@/lib/types";
import { addDays, parisNow } from "@/lib/slots";
import {
  addBlockedPeriod,
  cancelBooking,
  removeBlockedPeriod,
  saveCustomerNote,
  saveSchedules,
  type DaySetting,
} from "@/app/(app)/agenda/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const WEEKDAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

type Props = {
  page: Page;
  ownerName: string;
  icalUrl: string;
  bookings: Booking[];
  customers: Customer[];
  schedules: Schedule[];
  blocked: BlockedPeriod[];
};

export function AgendaView({
  page,
  ownerName,
  icalUrl,
  bookings,
  customers,
  schedules,
  blocked,
}: Props) {
  const today = parisNow().date;
  const [selectedDate, setSelectedDate] = useState(today);
  const [search, setSearch] = useState("");
  const [openCustomer, setOpenCustomer] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  // Réglages horaires locaux
  const [days, setDays] = useState<DaySetting[]>(() =>
    [1, 2, 3, 4, 5, 6, 0].map((weekday) => {
      const s = schedules.find((x) => x.weekday === weekday);
      return {
        weekday,
        open: s?.open ?? false,
        ranges: (s?.ranges as TimeRange[]) ?? [],
      };
    })
  );
  const [blockStart, setBlockStart] = useState("");
  const [blockEnd, setBlockEnd] = useState("");

  const confirmed = useMemo(
    () => bookings.filter((b) => b.status === "confirmed"),
    [bookings]
  );
  const upcoming = confirmed.filter((b) => b.date >= today);
  const dayBookings = confirmed.filter((b) => b.date === selectedDate);

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  const statsByPhone = useMemo(() => {
    const map = new Map<string, { visits: number; total: number; last: string }>();
    for (const b of confirmed) {
      const stat = map.get(b.phone) ?? { visits: 0, total: 0, last: "" };
      stat.visits++;
      stat.total += b.price_cents;
      if (b.date > stat.last) stat.last = b.date;
      map.set(b.phone, stat);
    }
    return map;
  }, [confirmed]);

  const filteredCustomers = customers.filter(
    (c) =>
      !search ||
      c.first_name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  function fmtDay(date: string) {
    return new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date(date + "T12:00:00Z"));
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold mb-1">
          Bonjour{ownerName ? ` ${ownerName}` : ""}.
        </h1>
        <p className="text-muted-foreground">
          {upcoming.length === 0
            ? "Rien de prévu pour l'instant. Ta page travaille pour toi."
            : `${upcoming.length} rendez-vous à venir. Tes clients réservent directement sur ta page.`}
          {" "}
          <Link href={`/p/${page.slug}`} target="_blank" className="underline underline-offset-4">
            Voir ma page
          </Link>
        </p>
      </div>

      {/* Semaine */}
      <Card>
        <CardHeader>
          <CardTitle>Ma semaine</CardTitle>
          <CardDescription>
            Touche un jour pour voir ta journée. Le point rouge = des rendez-vous.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1.5 mb-6">
            {weekDates.map((date) => {
              const count = confirmed.filter((b) => b.date === date).length;
              const selected = date === selectedDate;
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => setSelectedDate(date)}
                  className={`rounded-xl border px-1 py-2.5 text-center text-sm transition-colors ${
                    selected
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-secondary"
                  }`}
                >
                  <span className="block text-xs text-muted-foreground">
                    {WEEKDAYS[new Date(date + "T12:00:00Z").getUTCDay()]}
                  </span>
                  <span className="block font-semibold">
                    {parseInt(date.slice(8), 10)}
                  </span>
                  <span
                    className={`mx-auto mt-1 block size-1.5 rounded-full ${count > 0 ? "bg-primary" : "bg-transparent"}`}
                  />
                </button>
              );
            })}
          </div>

          <p className="font-medium mb-3 capitalize">{fmtDay(selectedDate)}</p>
          {dayBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun rendez-vous ce jour pour l&apos;instant.
            </p>
          ) : (
            <ul className="space-y-2">
              {dayBookings.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3"
                >
                  <div>
                    <p className="font-medium">
                      {String(b.start_time).slice(0, 5)} · {b.service_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {b.first_name} · {b.phone}
                      {b.price_cents > 0 && <> · {formatPrice(b.price_cents)}</>}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        const r = await cancelBooking(b.id);
                        if (r.error) toast.error(r.error);
                        else toast.success("Rendez-vous annulé.");
                      })
                    }
                  >
                    Annuler
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Clients */}
      <Card>
        <CardHeader>
          <CardTitle>Mes clients</CardTitle>
          <CardDescription>
            Cette liste se remplit toute seule à chaque réservation. Touche un
            client pour son historique et ta note privée.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Chercher un prénom ou un numéro…"
          />
          {filteredCustomers.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {customers.length === 0
                ? "Ton premier client apparaîtra ici après sa réservation."
                : "Aucun client à ce nom."}
            </p>
          )}
          {filteredCustomers.map((c) => {
            const stats = statsByPhone.get(c.phone) ?? {
              visits: 0,
              total: 0,
              last: "",
            };
            const open = openCustomer === c.id;
            const history = confirmed
              .filter((b) => b.phone === c.phone)
              .sort((a, b) => (a.date < b.date ? 1 : -1));
            return (
              <div key={c.id} className="rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => setOpenCustomer(open ? null : c.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                >
                  <span className="flex size-9 items-center justify-center rounded-full bg-primary/15 text-primary font-semibold uppercase">
                    {c.first_name.charAt(0) || "?"}
                  </span>
                  <span className="flex-1">
                    <span className="block font-medium">{c.first_name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {stats.visits} visite{stats.visits > 1 ? "s" : ""} ·{" "}
                      {formatPrice(stats.total)} au total
                    </span>
                  </span>
                  <span className="text-muted-foreground">{open ? "−" : "+"}</span>
                </button>
                {open && (
                  <div className="border-t border-border px-4 py-4 space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm" variant="secondary">
                        <a
                          href={`https://wa.me/${c.phone.replace(/[^0-9]/g, "").replace(/^0/, "33")}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          WhatsApp
                        </a>
                      </Button>
                      <Button asChild size="sm" variant="secondary">
                        <a href={`tel:${c.phone}`}>{c.phone}</a>
                      </Button>
                      {c.email && (
                        <Button asChild size="sm" variant="secondary">
                          <a href={`mailto:${c.email}`}>Email</a>
                        </Button>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Ses rendez-vous</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {history.slice(0, 6).map((b) => (
                          <li key={b.id}>
                            {fmtDay(b.date)} à {String(b.start_time).slice(0, 5)} —{" "}
                            {b.service_name}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        Ma note (visible par toi seul)
                      </p>
                      <Textarea
                        rows={2}
                        value={notes[c.id] ?? c.note}
                        onChange={(e) =>
                          setNotes((n) => ({ ...n, [c.id]: e.target.value }))
                        }
                      />
                      <Button
                        size="sm"
                        disabled={isPending}
                        onClick={() =>
                          startTransition(async () => {
                            const r = await saveCustomerNote(
                              c.id,
                              notes[c.id] ?? c.note
                            );
                            if (r.error) toast.error(r.error);
                            else toast.success("Note enregistrée.");
                          })
                        }
                      >
                        Enregistrer
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Horaires */}
      <Card>
        <CardHeader>
          <CardTitle>Quand tes clients peuvent réserver</CardTitle>
          <CardDescription>
            Coche tes jours, règle tes heures. Tu fermes à midi ? Ajoute une
            deuxième plage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {days.map((day, di) => (
            <div
              key={day.weekday}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border px-4 py-3"
            >
              <div className="flex items-center gap-3 w-28">
                <Switch
                  checked={day.open}
                  onCheckedChange={(open) => {
                    const next = [...days];
                    next[di] = {
                      ...day,
                      open,
                      ranges:
                        open && day.ranges.length === 0
                          ? [["09:00", "19:00"]]
                          : day.ranges,
                    };
                    setDays(next);
                  }}
                />
                <span className="font-medium">
                  {WEEKDAYS[day.weekday]}
                </span>
              </div>
              {day.open && (
                <div className="flex flex-wrap items-center gap-2">
                  {day.ranges.map((range, ri) => (
                    <span key={ri} className="flex items-center gap-1.5">
                      <Input
                        type="time"
                        value={range[0]}
                        className="w-27"
                        onChange={(e) => {
                          const next = structuredClone(days);
                          next[di].ranges[ri][0] = e.target.value;
                          setDays(next);
                        }}
                      />
                      →
                      <Input
                        type="time"
                        value={range[1]}
                        className="w-27"
                        onChange={(e) => {
                          const next = structuredClone(days);
                          next[di].ranges[ri][1] = e.target.value;
                          setDays(next);
                        }}
                      />
                      {day.ranges.length > 1 && (
                        <button
                          type="button"
                          aria-label="Retirer la plage"
                          className="text-destructive px-1"
                          onClick={() => {
                            const next = structuredClone(days);
                            next[di].ranges.splice(ri, 1);
                            setDays(next);
                          }}
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))}
                  {day.ranges.length < 2 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const next = structuredClone(days);
                        next[di].ranges.push(["14:00", "19:00"]);
                        setDays(next);
                      }}
                    >
                      + pause
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
          <Button
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const r = await saveSchedules(days);
                if (r.error) toast.error(r.error);
                else
                  toast.success(
                    "C'est enregistré. Tes clients voient déjà les bons créneaux."
                  );
              })
            }
          >
            Enregistrer mes horaires
          </Button>
        </CardContent>
      </Card>

      {/* Congés */}
      <Card>
        <CardHeader>
          <CardTitle>Bloquer une période</CardTitle>
          <CardDescription>
            Congés, rendez-vous perso : personne ne pourra réserver dessus.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            Du
            <Input
              type="date"
              value={blockStart}
              className="w-40"
              onChange={(e) => setBlockStart(e.target.value)}
            />
            au
            <Input
              type="date"
              value={blockEnd}
              className="w-40"
              onChange={(e) => setBlockEnd(e.target.value)}
            />
            <Button
              variant="secondary"
              disabled={isPending || !blockStart || !blockEnd}
              onClick={() =>
                startTransition(async () => {
                  const r = await addBlockedPeriod(blockStart, blockEnd);
                  if (r.error) toast.error(r.error);
                  else {
                    toast.success("Période bloquée.");
                    setBlockStart("");
                    setBlockEnd("");
                  }
                })
              }
            >
              Bloquer
            </Button>
          </div>
          {blocked.length > 0 && (
            <ul className="text-sm space-y-1">
              {blocked.map((b) => (
                <li key={b.id} className="flex items-center gap-3">
                  <span>
                    Du {fmtDay(b.start_date)} au {fmtDay(b.end_date)}
                  </span>
                  <button
                    type="button"
                    className="text-destructive text-xs underline underline-offset-4"
                    onClick={() =>
                      startTransition(async () => {
                        await removeBlockedPeriod(b.id);
                      })
                    }
                  >
                    débloquer
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Google Agenda */}
      <Card>
        <CardHeader>
          <CardTitle>Dans ton agenda Google</CardTitle>
          <CardDescription>
            Colle ce lien UNE fois dans Google Agenda (+ → « À partir de
            l&apos;URL ») et tes rendez-vous s&apos;affichent dedans, tout seuls.
            Lecture seule — garde-le pour toi.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input readOnly value={icalUrl} className="text-xs" />
          <Button
            variant="secondary"
            onClick={() => {
              navigator.clipboard.writeText(icalUrl);
              toast.success("Lien copié.");
            }}
          >
            Copier
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
