"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type {
  BlockedPeriod,
  Booking,
  Customer,
  Order,
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
  ArrowUpRight,
  CalendarCheck2,
  CalendarDays,
  Clock3,
  Copy,
  Link2,
  Search,
  Settings2,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import styles from "./agenda-view.module.css";
import type { AgendaDict } from "@/lib/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";
import { formatDate } from "@/lib/i18n/format";
import { KARLMADA_BLOCK_MESSAGE } from "@/lib/karlmada-constants";

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("0033")) return `0${digits.slice(4)}`;
  if (digits.startsWith("33")) return `0${digits.slice(2)}`;
  return digits;
}

type Props = {
  page: Page;
  ownerName: string;
  icalUrl: string;
  bookings: Booking[];
  customers: Customer[];
  orders: Order[];
  schedules: Schedule[];
  blocked: BlockedPeriod[];
  locale: Locale;
  t: AgendaDict;
};

export function AgendaView({
  page,
  ownerName,
  icalUrl,
  bookings,
  customers,
  orders,
  schedules,
  blocked,
  locale,
  t,
}: Props) {
  function translateError(error: string): string {
    const code = error === KARLMADA_BLOCK_MESSAGE ? "content_blocked" : error;
    return t.errors[code as keyof typeof t.errors] ?? t.errors.unknown;
  }
  const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6].map(
    (n) => t.weekdaysShort[String(n) as keyof typeof t.weekdaysShort]
  );
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
    const map = new Map<
      string,
      { visits: number; orders: number; total: number; last: string }
    >();
    for (const b of confirmed) {
      if (b.date > today) continue;
      const phone = normalizePhone(b.phone);
      const stat = map.get(phone) ?? {
        visits: 0,
        orders: 0,
        total: 0,
        last: "",
      };
      stat.visits++;
      stat.total += b.price_cents;
      if (b.date > stat.last) stat.last = b.date;
      map.set(phone, stat);
    }
    for (const order of orders) {
      const phone = normalizePhone(order.phone);
      const stat = map.get(phone) ?? {
        visits: 0,
        orders: 0,
        total: 0,
        last: "",
      };
      stat.orders++;
      stat.total += order.total_cents;
      map.set(phone, stat);
    }
    return map;
  }, [confirmed, orders, today]);

  const filteredCustomers = customers.filter(
    (c) =>
      !search ||
      c.first_name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  function fmtDay(date: string) {
    return formatDate(locale, date + "T12:00:00Z", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }

  return (
    <div className={styles.dashboard}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}><CalendarCheck2 aria-hidden="true" /> {t.view.eyebrow}</p>
          <h1>{t.view.greeting.replace("{name}", ownerName ? ` ${ownerName}` : "")}</h1>
          <p>
            {upcoming.length === 0
              ? t.view.noUpcoming
              : t.view.upcomingCount.replace("{count}", String(upcoming.length))}
          </p>
        </div>
        <Link href={`/p/${page.slug}`} target="_blank" className={`flux-button-smooth ${styles.heroAction}`}>
          {t.view.viewStorefront} <ArrowUpRight aria-hidden="true" />
        </Link>
      </section>

      <section className={styles.stats} aria-label={t.view.statsAria}>
        <article>
          <span><CalendarDays aria-hidden="true" /></span>
          <small>{t.view.upcomingLabel}</small>
          <strong>{upcoming.length}</strong>
          <i>{t.view.syncedHint}</i>
        </article>
        <article>
          <span><Users aria-hidden="true" /></span>
          <small>{t.view.registeredClients}</small>
          <strong>{customers.length}</strong>
          <i>{t.view.listFillsItself}</i>
        </article>
        <article>
          <span><Clock3 aria-hidden="true" /></span>
          <small>{t.view.bookableDays}</small>
          <strong>{days.filter((day) => day.open).length}</strong>
          <i>{t.view.outOf7}</i>
        </article>
      </section>

      {/* Semaine */}
      <Card className={`${styles.glassPanel} ${styles.weekPanel}`}>
        <CardHeader>
          <CardTitle><CalendarDays aria-hidden="true" /> {t.view.myWeek}</CardTitle>
          <CardDescription>{t.view.weekHint}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className={styles.weekDays}>
            {weekDates.map((date) => {
              const count = confirmed.filter((b) => b.date === date).length;
              const selected = date === selectedDate;
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => setSelectedDate(date)}
                  className={selected ? styles.weekDayActive : styles.weekDay}
                >
                  <span>
                    {WEEKDAYS[new Date(date + "T12:00:00Z").getUTCDay()]}
                  </span>
                  <strong>
                    {parseInt(date.slice(8), 10)}
                  </strong>
                  <i className={count > 0 ? styles.hasBooking : undefined} />
                </button>
              );
            })}
          </div>

          <p className={styles.selectedDayTitle}>{fmtDay(selectedDate)}</p>
          {dayBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.view.noBookingToday}</p>
          ) : (
            <ul className="space-y-2">
              {dayBookings.map((b) => (
                <li key={b.id} className={styles.bookingRow}>
                  <div>
                    <p className="font-medium">
                      {String(b.start_time).slice(0, 5)} · {b.service_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {b.first_name} · {b.phone}
                      {b.price_cents > 0 && <> · {formatPrice(b.price_cents, locale)}</>}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        const r = await cancelBooking(b.id);
                        if (r.error) toast.error(translateError(r.error));
                        else toast.success(t.view.bookingCancelled);
                      })
                    }
                  >
                    {t.view.cancel}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Clients */}
      <Card className={styles.glassPanel}>
        <CardHeader>
          <CardTitle><Users aria-hidden="true" /> {t.view.myClients}</CardTitle>
          <CardDescription>{t.view.clientsHint}</CardDescription>
        </CardHeader>
        <CardContent className={styles.panelContent}>
          <label className={styles.searchField}>
            <Search aria-hidden="true" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.view.searchPlaceholder} />
          </label>
          {filteredCustomers.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {customers.length === 0 ? t.view.firstClientHint : t.view.noClientMatch}
            </p>
          )}
          {filteredCustomers.map((c) => {
            const customerPhone = normalizePhone(c.phone);
            const stats = statsByPhone.get(customerPhone) ?? {
              visits: 0,
              orders: 0,
              total: 0,
              last: "",
            };
            const open = openCustomer === c.id;
            const history = confirmed
              .filter((b) => normalizePhone(b.phone) === customerPhone)
              .sort((a, b) => (a.date < b.date ? 1 : -1));
            return (
              <div key={c.id} className={styles.customerRow}>
                <button
                  type="button"
                  onClick={() => setOpenCustomer(open ? null : c.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                >
                  <span className="flex size-9 items-center justify-center rounded-full bg-primary/15 text-primary font-semibold uppercase">
                    {c.first_name.charAt(0) || "?"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{c.first_name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {stats.visits} {stats.visits > 1 ? t.view.visitPlural : t.view.visitSingular}
                      {stats.orders > 0 && (
                        <> · {stats.orders} {stats.orders > 1 ? t.view.orderPlural : t.view.orderSingular}</>
                      )}
                    </span>
                  </span>
                  <span
                    className={
                      stats.total > 0
                        ? styles.customerRevenue
                        : styles.customerRevenueEmpty
                    }
                  >
                    <small>{t.view.clientRevenue}</small>
                    <strong>{formatPrice(stats.total, locale)}</strong>
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
                          <a href={`mailto:${c.email}`}>{t.view.email}</a>
                        </Button>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">{t.view.hisAppointments}</p>
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
                      <p className="text-sm font-medium">{t.view.myNote}</p>
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
                            if (r.error) toast.error(translateError(r.error));
                            else toast.success(t.view.noteSaved);
                          })
                        }
                      >
                        {t.view.save}
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
      <Card className={`${styles.glassPanel} ${styles.hoursPanel}`}>
        <CardHeader>
          <CardTitle><Settings2 aria-hidden="true" /> {t.view.variableHours}</CardTitle>
          <CardDescription>{t.view.variableHoursHint}</CardDescription>
        </CardHeader>
        <CardContent className={styles.hoursList}>
          {days.map((day, di) => (
            <div
              key={day.weekday}
              className={day.open ? styles.hourRowOpen : styles.hourRow}
            >
              <div className={styles.dayToggle}>
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
                <div className={styles.timeRanges}>
                  {day.ranges.map((range, ri) => (
                    <span key={ri}>
                      <Input
                        type="time"
                        value={range[0]}
                        className={styles.timeInput}
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
                        className={styles.timeInput}
                        onChange={(e) => {
                          const next = structuredClone(days);
                          next[di].ranges[ri][1] = e.target.value;
                          setDays(next);
                        }}
                      />
                      {day.ranges.length > 1 && (
                        <button
                          type="button"
                          aria-label={t.view.removeRange}
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
                      {t.view.addBreak}
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
                if (r.error) toast.error(translateError(r.error));
                else toast.success(t.view.variableHoursSaved);
              })
            }
          >
            {t.view.saveVariableHours}
          </Button>
        </CardContent>
      </Card>

      {/* Congés */}
      <Card className={styles.glassPanel}>
        <CardHeader>
          <CardTitle><CalendarCheck2 aria-hidden="true" /> {t.view.blockPeriod}</CardTitle>
          <CardDescription>{t.view.blockPeriodHint}</CardDescription>
        </CardHeader>
        <CardContent className={styles.panelContent}>
          <div className={styles.blockForm}>
            {t.view.from}
            <Input
              type="date"
              value={blockStart}
              className="w-40"
              onChange={(e) => setBlockStart(e.target.value)}
            />
            {t.view.to}
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
                  if (r.error) toast.error(translateError(r.error));
                  else {
                    toast.success(t.view.periodBlocked);
                    setBlockStart("");
                    setBlockEnd("");
                  }
                })
              }
            >
              {t.view.block}
            </Button>
          </div>
          {blocked.length > 0 && (
            <ul className="text-sm space-y-1">
              {blocked.map((b) => (
                <li key={b.id} className="flex items-center gap-3">
                  <span>
                    {t.view.fromTo
                      .replace("{start}", fmtDay(b.start_date))
                      .replace("{end}", fmtDay(b.end_date))}
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
                    {t.view.unblock}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Google Agenda */}
      <Card className={`${styles.glassPanel} ${styles.syncPanel}`}>
        <CardHeader>
          <CardTitle><Link2 aria-hidden="true" /> {t.view.googleAgenda}</CardTitle>
          <CardDescription>{t.view.googleAgendaHint}</CardDescription>
        </CardHeader>
        <CardContent className={styles.syncContent}>
          <Input readOnly value={icalUrl} className="text-xs" />
          <Button
            variant="secondary"
            onClick={() => {
              navigator.clipboard.writeText(icalUrl);
              toast.success(t.view.linkCopied);
            }}
          >
            <Copy aria-hidden="true" /> {t.view.copy}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
