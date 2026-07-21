"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  Check,
  Clock3,
  Coffee,
  Moon,
  Save,
  Sun,
  Sunrise,
} from "lucide-react";
import { toast } from "sonner";
import { saveSchedules, type DaySetting } from "@/app/(app)/agenda/actions";
import type { Schedule, TimeRange } from "@/lib/types";
import { FluxBrand } from "@/components/flux-brand";
import styles from "./agenda-tunnel.module.css";
import type { AgendaDict } from "@/lib/i18n/get-dictionary";
import { KARLMADA_BLOCK_MESSAGE } from "@/lib/karlmada-constants";

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

const RHYTHM_META: {
  id: string;
  text: string;
  icon: typeof Clock3;
  ranges: TimeRange[];
}[] = [
  { id: "classic", text: "09:00 → 18:00", icon: Sun, ranges: [["09:00", "18:00"]] },
  { id: "extended", text: "09:00 → 19:00", icon: Clock3, ranges: [["09:00", "19:00"]] },
  { id: "split", text: "09:00 → 12:00 · 14:00 → 19:00", icon: Coffee, ranges: [["09:00", "12:00"], ["14:00", "19:00"]] },
  { id: "morning", text: "08:00 → 14:00", icon: Sunrise, ranges: [["08:00", "14:00"]] },
  { id: "afternoon", text: "12:00 → 19:00", icon: Sun, ranges: [["12:00", "19:00"]] },
  { id: "evening", text: "16:00 → 22:00", icon: Moon, ranges: [["16:00", "22:00"]] },
];

function scheduleToSelection(schedules: Schedule[]) {
  const openDays = schedules.filter((day) => day.open).map((day) => day.weekday);
  const firstOpen = schedules.find((day) => day.open && day.ranges.length > 0);
  const matchingRhythm = firstOpen
    ? RHYTHM_META.find((rhythm) => JSON.stringify(rhythm.ranges) === JSON.stringify(firstOpen.ranges))
    : null;
  return {
    openDays: openDays.length > 0 ? openDays : [1, 2, 3, 4, 5],
    rhythmId: matchingRhythm?.id ?? "classic",
  };
}

export function AgendaTunnel({ schedules, t }: { schedules: Schedule[]; t: AgendaDict }) {
  const router = useRouter();
  const defaults = useMemo(() => scheduleToSelection(schedules), [schedules]);
  const [step, setStep] = useState(0);
  const [openDays, setOpenDays] = useState<number[]>(defaults.openDays);
  const [rhythmId, setRhythmId] = useState(defaults.rhythmId);
  const [dayRhythms, setDayRhythms] = useState<Record<number, string>>({});
  const [isPending, startTransition] = useTransition();

  const RHYTHMS = RHYTHM_META.map((item) => ({
    ...item,
    title: t.rhythms[item.id as keyof typeof t.rhythms],
  }));
  const rhythm = RHYTHMS.find((item) => item.id === rhythmId) ?? RHYTHMS[0];
  const DAYS = DAY_ORDER.map((weekday) => ({
    weekday,
    short: t.weekdaysShort[String(weekday) as keyof typeof t.weekdaysShort],
    label: t.weekdaysLong[String(weekday) as keyof typeof t.weekdaysLong],
  }));
  const progress = step === 0 ? 0 : (step / 4) * 100;
  const canContinue = step === 1 ? openDays.length > 0 : true;

  function toggleDay(weekday: number) {
    setOpenDays((current) =>
      current.includes(weekday)
        ? current.filter((day) => day !== weekday)
        : [...current, weekday]
    );
  }

  function save() {
    const days: DaySetting[] = DAYS.map(({ weekday }) => {
      const dayRhythm = RHYTHMS.find((item) => item.id === (dayRhythms[weekday] ?? rhythmId)) ?? rhythm;
      return {
        weekday,
        open: openDays.includes(weekday),
        ranges: openDays.includes(weekday) ? dayRhythm.ranges : [],
      };
    });

    startTransition(async () => {
      const result = await saveSchedules(days);
      if (result.error) {
        const code = result.error === KARLMADA_BLOCK_MESSAGE ? "content_blocked" : result.error;
        toast.error(t.errors[code as keyof typeof t.errors] ?? t.errors.unknown);
        return;
      }
      toast.success(t.tunnel.successToast);
      router.push("/agenda?view=agenda");
      router.refresh();
    });
  }

  return (
    <div className={styles.tunnel}>
      <header className={styles.header}>
        <FluxBrand className={styles.brand} />
        {step > 0 && (
          <div className={styles.progressMeta}>
            <span>{t.tunnel.step.replace("{current}", String(step))}</span>
            <div className={styles.progress}><i style={{ width: `${progress}%` }} /></div>
          </div>
        )}
        <Link href="/agenda?view=agenda" className={styles.headerAgenda}>{t.tunnel.myAgenda}</Link>
      </header>

      <main className={styles.stage}>
        {step === 0 && (
          <section className={styles.intro}>
            <span className={styles.introIcon}><CalendarCheck aria-hidden="true" /></span>
            <p className={styles.kicker}>{t.tunnel.intro.kicker}</p>
            <h1>{t.tunnel.intro.titleStart} <em>{t.tunnel.intro.titleEm}</em></h1>
            <p>{t.tunnel.intro.text}</p>
            <div className={styles.introActions}>
              <button type="button" className={`flux-button-smooth ${styles.primary}`} onClick={() => setStep(1)}>
                {t.tunnel.intro.cta} <ArrowRight aria-hidden="true" />
              </button>
              <Link href="/agenda?view=agenda" className={styles.agendaShortcut}>
                <span>{t.tunnel.intro.shortcutText}</span>
                <strong>{t.tunnel.intro.shortcutCta}</strong>
              </Link>
            </div>
          </section>
        )}

        {step === 1 && (
          <section className={styles.question}>
            <p className={styles.kicker}>{t.tunnel.days.kicker}</p>
            <h1>{t.tunnel.days.titleStart} <em>{t.tunnel.days.titleEm}</em></h1>
            <p className={styles.subtitle}>{t.tunnel.days.subtitle}</p>
            <div className={styles.dayGrid}>
              {DAYS.map((day) => {
                const selected = openDays.includes(day.weekday);
                return (
                  <button
                    type="button"
                    key={day.weekday}
                    className={selected ? styles.dayActive : styles.day}
                    aria-pressed={selected}
                    onClick={() => toggleDay(day.weekday)}
                  >
                    <span>{day.short}</span>
                    <strong>{day.label}</strong>
                    {selected && <Check aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {step === 2 && (
          <section className={styles.question}>
            <p className={styles.kicker}>{t.tunnel.rhythm.kicker}</p>
            <h1>{t.tunnel.rhythm.titleStart} <em>{t.tunnel.rhythm.titleEm}</em></h1>
            <p className={styles.subtitle}>{t.tunnel.rhythm.subtitle}</p>
            <div className={styles.rhythmGrid}>
              {RHYTHMS.map((item) => {
                const Icon = item.icon;
                const selected = rhythmId === item.id;
                return (
                  <button
                    type="button"
                    key={item.id}
                    className={selected ? styles.rhythmActive : styles.rhythm}
                    aria-pressed={selected}
                    onClick={() => setRhythmId(item.id)}
                  >
                    <span><Icon aria-hidden="true" /></span>
                    <strong>{item.title}</strong>
                    <small>{item.text}</small>
                    {selected && <Check aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {step === 3 && (
          <section className={styles.question}>
            <p className={styles.kicker}>{t.tunnel.variable.kicker}</p>
            <h1>{t.tunnel.variable.titleStart} <em>{t.tunnel.variable.titleEm}</em></h1>
            <p className={styles.subtitle}>{t.tunnel.variable.subtitle}</p>
            <div className={styles.variableList}>
              {DAYS.filter((day) => openDays.includes(day.weekday)).map((day) => {
                const selectedRhythm = dayRhythms[day.weekday] ?? rhythmId;
                const selectedOption = RHYTHMS.find((item) => item.id === selectedRhythm) ?? rhythm;
                return (
                  <label className={styles.variableDay} key={day.weekday}>
                    <span>
                      <strong>{day.label}</strong>
                      <small>{selectedOption.text}</small>
                    </span>
                    <select
                      value={selectedRhythm}
                      onChange={(event) =>
                        setDayRhythms((current) => ({
                          ...current,
                          [day.weekday]: event.target.value,
                        }))
                      }
                    >
                      {RHYTHMS.map((item) => (
                        <option key={item.id} value={item.id}>{item.title}</option>
                      ))}
                    </select>
                  </label>
                );
              })}
            </div>
          </section>
        )}

        {step === 4 && (
          <section className={styles.review}>
            <span className={styles.introIcon}><CalendarCheck aria-hidden="true" /></span>
            <p className={styles.kicker}>{t.tunnel.review.kicker}</p>
            <h1>{t.tunnel.review.title}</h1>
            <div className={styles.schedulePreview}>
              {DAYS.map((day) => {
                const open = openDays.includes(day.weekday);
                const dayRhythm = RHYTHMS.find(
                  (item) => item.id === (dayRhythms[day.weekday] ?? rhythmId)
                ) ?? rhythm;
                return (
                  <div key={day.weekday} className={open ? styles.previewOpen : styles.previewClosed}>
                    <span>{day.label}</span>
                    <strong>{open ? dayRhythm.text : t.tunnel.review.closed}</strong>
                    <i>{open ? t.tunnel.review.open : t.tunnel.review.unavailable}</i>
                  </div>
                );
              })}
            </div>
            <button type="button" className={`flux-button-smooth ${styles.primary}`} disabled={isPending} onClick={save}>
              <Save aria-hidden="true" />
              {isPending ? t.tunnel.review.saving : t.tunnel.review.save}
            </button>
          </section>
        )}
      </main>

      {step > 0 && step < 4 && (
        <footer className={styles.controls}>
          <button type="button" onClick={() => setStep((current) => current - 1)}>
            <ArrowLeft aria-hidden="true" /> {t.tunnel.back}
          </button>
          <button
            type="button"
            className={`flux-button-smooth ${styles.primary}`}
            disabled={!canContinue}
            onClick={() => setStep((current) => current + 1)}
          >
            {t.tunnel.continue} <ArrowRight aria-hidden="true" />
          </button>
        </footer>
      )}
      {step === 4 && (
        <button type="button" className={styles.floatingBack} onClick={() => setStep(3)} aria-label={t.tunnel.review.editAria}>
          <ArrowLeft aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
