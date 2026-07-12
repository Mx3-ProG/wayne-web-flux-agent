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

const DAYS = [
  { weekday: 1, short: "Lun", label: "Lundi" },
  { weekday: 2, short: "Mar", label: "Mardi" },
  { weekday: 3, short: "Mer", label: "Mercredi" },
  { weekday: 4, short: "Jeu", label: "Jeudi" },
  { weekday: 5, short: "Ven", label: "Vendredi" },
  { weekday: 6, short: "Sam", label: "Samedi" },
  { weekday: 0, short: "Dim", label: "Dimanche" },
] as const;

const RHYTHMS: {
  id: string;
  title: string;
  text: string;
  icon: typeof Clock3;
  ranges: TimeRange[];
}[] = [
  { id: "classic", title: "Journée classique", text: "09:00 → 18:00", icon: Sun, ranges: [["09:00", "18:00"]] },
  { id: "extended", title: "Journée étendue", text: "09:00 → 19:00", icon: Clock3, ranges: [["09:00", "19:00"]] },
  { id: "split", title: "Avec pause déjeuner", text: "09:00 → 12:00 · 14:00 → 19:00", icon: Coffee, ranges: [["09:00", "12:00"], ["14:00", "19:00"]] },
  { id: "morning", title: "Plutôt le matin", text: "08:00 → 14:00", icon: Sunrise, ranges: [["08:00", "14:00"]] },
  { id: "afternoon", title: "Plutôt l’après-midi", text: "12:00 → 19:00", icon: Sun, ranges: [["12:00", "19:00"]] },
  { id: "evening", title: "Fin de journée & soirée", text: "16:00 → 22:00", icon: Moon, ranges: [["16:00", "22:00"]] },
];

function scheduleToSelection(schedules: Schedule[]) {
  const openDays = schedules.filter((day) => day.open).map((day) => day.weekday);
  const firstOpen = schedules.find((day) => day.open && day.ranges.length > 0);
  const matchingRhythm = firstOpen
    ? RHYTHMS.find((rhythm) => JSON.stringify(rhythm.ranges) === JSON.stringify(firstOpen.ranges))
    : null;
  return {
    openDays: openDays.length > 0 ? openDays : [1, 2, 3, 4, 5],
    rhythmId: matchingRhythm?.id ?? "classic",
  };
}

export function AgendaTunnel({ schedules }: { schedules: Schedule[] }) {
  const router = useRouter();
  const defaults = useMemo(() => scheduleToSelection(schedules), [schedules]);
  const [step, setStep] = useState(0);
  const [openDays, setOpenDays] = useState<number[]>(defaults.openDays);
  const [rhythmId, setRhythmId] = useState(defaults.rhythmId);
  const [dayRhythms, setDayRhythms] = useState<Record<number, string>>({});
  const [isPending, startTransition] = useTransition();

  const rhythm = RHYTHMS.find((item) => item.id === rhythmId) ?? RHYTHMS[0];
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
        toast.error(result.error);
        return;
      }
      toast.success("Tes horaires sont prêts. Ton agenda est ouvert aux bons moments.");
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
            <span>Étape {step} sur 4</span>
            <div className={styles.progress}><i style={{ width: `${progress}%` }} /></div>
          </div>
        )}
        <Link href="/agenda?view=agenda" className={styles.headerAgenda}>Mon agenda</Link>
      </header>

      <main className={styles.stage}>
        {step === 0 && (
          <section className={styles.intro}>
            <span className={styles.introIcon}><CalendarCheck aria-hidden="true" /></span>
            <p className={styles.kicker}>Ton temps, bien organisé</p>
            <h1>FLUX, l’agenda au service de <em>vos besoins.</em></h1>
            <p>
              Choisis tes jours et ton rythme. Flux prépare les créneaux que
              tes clients pourront réserver depuis ta vitrine.
            </p>
            <div className={styles.introActions}>
              <button type="button" className={styles.primary} onClick={() => setStep(1)}>
                Créer mes horaires <ArrowRight aria-hidden="true" />
              </button>
              <Link href="/agenda?view=agenda" className={styles.agendaShortcut}>
                <span>J’ai déjà fixé mes horaires de business</span>
                <strong>Revenir à l’agenda</strong>
              </Link>
            </div>
          </section>
        )}

        {step === 1 && (
          <section className={styles.question}>
            <p className={styles.kicker}>Tes jours d’ouverture</p>
            <h1>Quels jours veux-tu rendre <em>réservables ?</em></h1>
            <p className={styles.subtitle}>Sélectionne tous les jours où tes clients peuvent prendre rendez-vous.</p>
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
            <p className={styles.kicker}>Ton rythme</p>
            <h1>À quels moments travailles-tu <em>le mieux ?</em></h1>
            <p className={styles.subtitle}>Ce rythme sera appliqué aux jours sélectionnés. Tu pourras l’affiner ensuite dans ton agenda.</p>
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
            <p className={styles.kicker}>Horaires variables</p>
            <h1>Certains jours ont-ils un <em>rythme différent ?</em></h1>
            <p className={styles.subtitle}>Garde le rythme principal ou adapte chaque journée. Aucun champ à remplir.</p>
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
            <p className={styles.kicker}>Ton planning est prêt</p>
            <h1>Voici les créneaux proposés à tes clients.</h1>
            <div className={styles.schedulePreview}>
              {DAYS.map((day) => {
                const open = openDays.includes(day.weekday);
                const dayRhythm = RHYTHMS.find(
                  (item) => item.id === (dayRhythms[day.weekday] ?? rhythmId)
                ) ?? rhythm;
                return (
                  <div key={day.weekday} className={open ? styles.previewOpen : styles.previewClosed}>
                    <span>{day.label}</span>
                    <strong>{open ? dayRhythm.text : "Fermé"}</strong>
                    <i>{open ? "Ouvert" : "Indisponible"}</i>
                  </div>
                );
              })}
            </div>
            <button type="button" className={styles.primary} disabled={isPending} onClick={save}>
              <Save aria-hidden="true" />
              {isPending ? "Création de ton agenda…" : "Enregistrer et ouvrir mon agenda"}
            </button>
          </section>
        )}
      </main>

      {step > 0 && step < 4 && (
        <footer className={styles.controls}>
          <button type="button" onClick={() => setStep((current) => current - 1)}>
            <ArrowLeft aria-hidden="true" /> Retour
          </button>
          <button
            type="button"
            className={styles.primary}
            disabled={!canContinue}
            onClick={() => setStep((current) => current + 1)}
          >
            Continuer <ArrowRight aria-hidden="true" />
          </button>
        </footer>
      )}
      {step === 4 && (
        <button type="button" className={styles.floatingBack} onClick={() => setStep(3)} aria-label="Modifier mes horaires">
          <ArrowLeft aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
