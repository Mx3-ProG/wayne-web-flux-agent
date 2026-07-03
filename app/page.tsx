import Link from "next/link";
import { TOOLS } from "@/lib/tools-config";
import { VERTICALS } from "@/lib/verticals";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    title: "Réponds à 3 questions",
    text: "Ton métier, ton nom, ta ville. C'est tout ce qu'il faut pour démarrer.",
  },
  {
    title: "Ta vitrine existe déjà",
    text: "Prestations pré-remplies pour ton métier, prix modifiables, couleurs à ton goût. L'IA écrit les textes avec ta voix.",
  },
  {
    title: "Tes clients réservent tout seuls",
    text: "Un lien à partager partout. Jour, heure, coordonnées : le rendez-vous tombe dans ton agenda.",
  },
  {
    title: "Tu crées du contenu qui ramène du monde",
    text: "Posts, réponses clients, fiche Google : des crédits offerts chaque mois pour faire travailler l'IA.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex-1">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
          <p className="font-bold text-xl">
            Wayne<span className="text-primary">Web</span> Flux
          </p>
          <Button asChild variant="secondary">
            <Link href="/login">Se connecter</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(600px 300px at 50% 0%, var(--red-glow), transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-3xl px-4 py-24 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-red-bright mb-4">
            Pour tous les commerçants
          </p>
          <h1 className="text-4xl sm:text-6xl font-bold leading-tight mb-6">
            Ta vitrine en ligne,
            <br />
            créée par l&apos;IA en{" "}
            <span className="text-primary">2 minutes</span>.
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Une page pro avec tes prestations et tes prix. Tes clients prennent
            rendez-vous tout seuls. Et l&apos;IA écrit tes contenus marketing —
            avec ta voix, pas celle d&apos;un robot.
          </p>
          <Button asChild size="lg" className="text-base px-8">
            <Link href="/login">Je crée ma vitrine gratuitement</Link>
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">
            Sans carte bleue · 100 crédits offerts · 0 commission sur tes
            rendez-vous
          </p>
        </div>
      </section>

      {/* Métiers */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-4xl px-4 py-14 text-center">
          <h2 className="text-2xl font-semibold mb-8">
            Quel que soit ton métier
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {VERTICALS.filter((v) => v.slug !== "autre").map((v) => (
              <span
                key={v.slug}
                className="rounded-full border border-border px-4 py-2 text-sm"
              >
                {v.emoji} {v.label}
              </span>
            ))}
            <span className="rounded-full border border-primary/50 bg-primary/10 px-4 py-2 text-sm">
              ⭐ Et tous les autres
            </span>
          </div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-3xl px-4 py-16">
          <h2 className="text-3xl font-semibold text-center mb-12">
            Comment ça marche
          </h2>
          <ol className="space-y-8">
            {STEPS.map((step, i) => (
              <li key={i} className="flex gap-5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold mb-1">{step.title}</h3>
                  <p className="text-muted-foreground text-sm">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Outils IA */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <h2 className="text-3xl font-semibold text-center mb-3">
            L&apos;IA qui bosse pour toi
          </h2>
          <p className="text-center text-muted-foreground mb-10 max-w-xl mx-auto">
            Des crédits offerts chaque mois. Chaque outil affiche son coût avant
            de lancer — rien n&apos;est prélevé en douce.
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {TOOLS.map((tool) => (
              <div
                key={tool.slug}
                className="rounded-2xl border border-border p-5"
              >
                <p className="font-semibold mb-2">{tool.name}</p>
                <p className="text-sm text-muted-foreground mb-3">
                  {tool.tagline}
                </p>
                <p className="text-xs font-medium text-red-bright">
                  {tool.cost} crédits
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h2 className="text-3xl font-semibold mb-4">
            Ta page t&apos;attend. Tes clients aussi.
          </h2>
          <p className="text-muted-foreground mb-8">
            Gratuit, sans engagement, sans commission. Tes clients restent{" "}
            <strong className="text-foreground">tes</strong> clients.
          </p>
          <Button asChild size="lg" className="text-base px-8">
            <Link href="/login">Je commence gratuitement</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        Wayne Web Flux · ton commerce, en ligne, au même endroit.
      </footer>
    </div>
  );
}
