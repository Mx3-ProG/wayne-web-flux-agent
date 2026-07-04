import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Generation, Page, VoiceProfile } from "@/lib/types";
import { TOOLS } from "@/lib/tools-config";
import { voiceCompletion } from "@/lib/voice";
import { parisNow } from "@/lib/slots";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";
import { ArrowRight } from "lucide-react";
import styles from "./espace.module.css";

export const metadata = { title: "Mon espace" };

type Step = {
  n: number;
  title: string;
  done: boolean;
  content: React.ReactNode;
};

export default async function EspacePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: page }, { data: voice }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).single(),
      supabase
        .from("pages")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle<Page>(),
      supabase
        .from("voice_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle<VoiceProfile>(),
    ]);

  let upcomingCount = 0;
  let generations: Generation[] = [];
  if (page) {
    const today = parisNow().date;
    const [{ count }, { data: gens }] = await Promise.all([
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("page_id", page.id)
        .eq("status", "confirmed")
        .gte("date", today),
      supabase
        .from("generations")
        .select("*")
        .eq("user_id", user.id)
        .limit(5),
    ]);
    upcomingCount = count ?? 0;
    generations = (gens ?? []) as Generation[];
  }

  const { data: balance } = await supabase.rpc("credit_balance", {
    uid: user.id,
  });

  const completion = voiceCompletion(voice, !!page);
  const pageUrl = page
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/p/${page.slug}`
    : null;

  const steps: Step[] = [
    {
      n: 1,
      title: "Crée ta vitrine",
      done: !!page,
      content: page ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            C&apos;est le lien que tu donnes à tes clients.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded-lg bg-secondary px-3 py-2 text-sm truncate max-w-full">
              {pageUrl}
            </code>
            <CopyButton text={pageUrl!} />
            <Button asChild variant="secondary" size="sm">
              <Link href="/ma-page">Modifier</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/p/${page.slug}`} target="_blank">
                Voir ma page ↗
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            3 questions, et ta page existe — prestations déjà remplies pour ton
            métier.
          </p>
          <Button asChild>
            <Link href="/ma-page">Créer ma vitrine (2 min)</Link>
          </Button>
        </div>
      ),
    },
    {
      n: 2,
      title: "Apprends-lui à parler comme toi",
      done: completion >= 70,
      content: (
        <div className="space-y-3">
          <p className="text-sm">
            J&apos;écris comme toi à{" "}
            <strong className="text-red-bright">{completion}%</strong>
          </p>
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden max-w-xs">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${completion}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Plus tu lui en donnes, plus l&apos;IA écrit avec ta voix, ton ton,
            tes mots à toi.
          </p>
          <Button asChild variant={completion >= 70 ? "secondary" : "default"} size="sm">
            <Link href="/contexte">
              {completion >= 70 ? "Affiner encore" : "Faire connaissance (2 min)"}
            </Link>
          </Button>
        </div>
      ),
    },
    {
      n: 3,
      title: "Crée ton premier contenu",
      done: generations.length > 0,
      content: (
        <div className="space-y-3" id="outils">
          <p className="text-sm text-muted-foreground">
            Choisis un outil. Le coût en crédits est affiché avant de lancer.
          </p>
          <div className="grid sm:grid-cols-3 gap-2">
            {TOOLS.map((tool) => (
              <Link
                key={tool.slug}
                href={`/outil/${tool.slug}`}
                className="rounded-xl border border-border p-3 hover:border-primary/60 hover:bg-primary/5 transition-colors"
              >
                {tool.badge && (
                  <span className="block text-[10px] uppercase tracking-wide text-red-bright mb-1">
                    {tool.badge}
                  </span>
                )}
                <span className="block font-medium text-sm mb-1">
                  {tool.name}
                </span>
                <span className="block text-xs text-muted-foreground mb-2">
                  {tool.tagline}
                </span>
                <span className="text-xs font-medium">{tool.cost} cr.</span>
              </Link>
            ))}
          </div>
        </div>
      ),
    },
    {
      n: 4,
      title: "Regarde tes résultats",
      done: upcomingCount > 0,
      content: (
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-border p-4">
            <p className="text-2xl font-bold">{balance ?? 0}</p>
            <p className="text-xs text-muted-foreground">crédits restants</p>
            <Link
              href="/credits"
              className="text-xs underline underline-offset-4"
            >
              Voir mes crédits
            </Link>
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="text-2xl font-bold">{generations.length}</p>
            <p className="text-xs text-muted-foreground">
              création{generations.length > 1 ? "s" : ""} dans ton coffre
            </p>
            <Link
              href="/resultats"
              className="text-xs underline underline-offset-4"
            >
              Ouvrir mon coffre
            </Link>
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="text-2xl font-bold">{upcomingCount}</p>
            <p className="text-xs text-muted-foreground">
              rendez-vous à venir
            </p>
            <Link href="/agenda" className="text-xs underline underline-offset-4">
              Ouvrir mon agenda
            </Link>
          </div>
        </div>
      ),
    },
    {
      n: 5,
      title: "Partage ton lien partout",
      done: false,
      content: (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Bio Instagram, statut WhatsApp, fiche Google : plus ton lien
            circule, plus ton agenda se remplit tout seul.
          </p>
          {pageUrl && (
            <div className="flex flex-wrap gap-2">
              <CopyButton text={pageUrl} />
              <Button asChild variant="secondary" size="sm">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Réserve ton rendez-vous en ligne : ${pageUrl}`)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Partager sur WhatsApp
                </a>
              </Button>
            </div>
          )}
        </div>
      ),
    },
  ];

  const nextStep = steps.find((s) => !s.done);
  const completedCount = steps.filter((step) => step.done).length;

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Vue d&apos;ensemble</p>
          <h1>{profile?.name ? `Bonjour ${profile.name}` : "Bonjour"}</h1>
          <p>Voici ce qui fait avancer ton commerce aujourd&apos;hui.</p>
        </div>
        <Link className={styles.heroAction} href="/outil/posts">
          Créer un contenu <ArrowRight aria-hidden="true" />
        </Link>
      </section>

      <section className={styles.metrics} aria-label="Indicateurs">
        <article className={styles.metric}>
          <span>Ton espace est prêt à</span>
          <strong>{completion}%</strong>
          <small>{completion >= 70 ? "Ta voix est bien configurée" : "Continue de personnaliser ta voix"}</small>
        </article>
        <article className={styles.metric}>
          <span>Rendez-vous à venir</span>
          <strong>{upcomingCount}</strong>
          <small>Agenda synchronisé</small>
        </article>
        <article className={styles.metric}>
          <span>Crédits disponibles</span>
          <strong>{balance ?? 0}</strong>
          <small>{generations.length} contenu{generations.length > 1 ? "s" : ""} créé{generations.length > 1 ? "s" : ""}</small>
        </article>
      </section>

      <div className={styles.sectionHeader}>
        <div><h2>Ton parcours</h2><p>Une étape claire à la fois.</p></div>
        <span className={styles.progressLabel}><b>{completedCount}</b> / 5 terminé</span>
      </div>

      <ol className={styles.journey}>
        {steps.map((step) => (
          <li key={step.n} id={`etape-${step.n}`} className={step.done ? styles.stepDone : styles.step}>
            <span className={styles.stepNumber}>
              {step.done ? "✓" : step.n}
            </span>
            <div>
              <h3>{step.title}</h3>
              <div className={styles.stepContent}>{step.content}</div>
            </div>
            <span className={styles.status}>{step.done ? "Terminé" : "À faire"}</span>
          </li>
        ))}
      </ol>

      {nextStep && (
        <div className={styles.nextDock}>
          <div>
            <small>Prochaine étape</small>
            <strong>{nextStep.title}</strong>
          </div>
          <a href={`#etape-${nextStep.n}`} aria-label={`Aller à : ${nextStep.title}`}>
            <ArrowRight aria-hidden="true" />
          </a>
        </div>
      )}
    </div>
  );
}
