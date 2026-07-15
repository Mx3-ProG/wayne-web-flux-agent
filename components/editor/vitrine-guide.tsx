"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  ImageIcon,
  MessageCircle,
  Palette,
  Phone,
  PencilRuler,
  Store,
} from "lucide-react";
import { toast } from "sonner";
import type { Page } from "@/lib/types";
import { FONTS } from "@/lib/verticals";
import { VITRINE_THEMES } from "@/lib/vitrine-themes";
import { designKitPatch, resolveVitrineDesign } from "@/lib/vitrine-design/resolver";
import { VITRINE_ASSIST_COST, SITE_GENERATE_COST } from "@/lib/plans";
import { PREFILL_COST } from "@/lib/tools-config";
import { saveVitrineGuide } from "@/app/(app)/ma-page/actions";
import { fluxPrefill, fluxGenerateSite } from "@/app/(app)/ma-page/flux-actions";
import { Button } from "@/components/ui/button";
import { FluxBrand } from "@/components/flux-brand";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PhotoUpload } from "./photo-upload";
import { PublishButton } from "./publish-button";
import type { PublishProps } from "./page-editor";
import styles from "@/components/commerce/setup-tunnel.module.css";

export function VitrineGuide({
  initialPage,
  publish,
  canGenerateSite,
}: {
  initialPage: Page;
  publish: PublishProps;
  // Droit d'accès à la génération complète, résolu côté serveur. Sert à
  // annoncer le verrou AVANT le clic ; l'autorité reste checkFluxAccess.
  canGenerateSite: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [pending, startTransition] = useTransition();
  const [creditsDialog, setCreditsDialog] = useState<
    | "insufficient_credits"
    | "subscription_required"
    | "flux_requires_subscription"
    | "flux_requires_payment"
    | "flux_credits_expired"
    | "flux_trial_exhausted"
    | null
  >(null);
  const [brief, setBrief] = useState("");
  // L'assistant FLUX est payant ; l'éditeur complet reste gratuit.
  const enough = publish.balance >= VITRINE_ASSIST_COST;
  const progress = Math.min(100, ((step + 1) / 6) * 100);
  const canContinue =
    step === 1
      ? Boolean(page.business_name.trim() && page.job_title.trim() && page.city.trim())
      : true;

  function patch(fields: Partial<Page>) {
    setPage((current) => ({ ...current, ...fields }));
  }

  function prefill() {
    startTransition(async () => {
      const result = await fluxPrefill(initialPage.id);
      if (
        result.error === "flux_requires_subscription" ||
        result.error === "flux_requires_payment" ||
        result.error === "flux_credits_expired" ||
        result.error === "flux_trial_exhausted" ||
        result.error === "insufficient_credits" ||
        result.error === "subscription_required"
      ) {
        setCreditsDialog(result.error);
        return;
      }
      if (result.error) {
        toast.error(
          result.error === "content_blocked"
            ? "Les messages de haines ou les contenus explicit sont interdit et amendé sur FLUX, veuillez respectez votre environnement et celui des autres. 3 Infractions contre nos conditions d'utilisations le compte est supprimé."
            : result.error === "too_many_requests"
              ? "Tu as lancé plusieurs générations coup sur coup. Réessaie dans quelques minutes."
              : "La génération a échoué — tes crédits n'ont pas été débités."
        );
        return;
      }
      toast.success("FLUX a pré-rempli ton brouillon. Relis, puis publie.");
      router.push("/ma-page?view=editor");
      router.refresh();
    });
  }

  function generateSite() {
    if (!brief.trim()) {
      toast.error("Décris ton commerce en quelques mots d'abord.");
      return;
    }
    startTransition(async () => {
      const result = await fluxGenerateSite(initialPage.id, brief);
      if (
        result.error === "flux_requires_subscription" ||
        result.error === "flux_requires_payment" ||
        result.error === "flux_credits_expired" ||
        result.error === "flux_trial_exhausted" ||
        result.error === "insufficient_credits" ||
        result.error === "subscription_required"
      ) {
        setCreditsDialog(result.error);
        return;
      }
      if (result.error) {
        toast.error(
          result.error === "content_blocked"
            ? "Les messages de haines ou les contenus explicit sont interdit et amendé sur FLUX, veuillez respectez votre environnement et celui des autres. 3 Infractions contre nos conditions d'utilisations le compte est supprimé."
            : result.error === "empty_brief"
              ? "Décris ton commerce en quelques mots d'abord."
              : result.error === "too_many_requests"
                ? "Tu as lancé plusieurs générations coup sur coup. Réessaie dans quelques minutes."
                : "La génération a échoué — tes crédits n'ont pas été débités."
        );
        return;
      }
      toast.success("FLUX a créé ta vitrine. Relis ton brouillon, puis publie.");
      router.push("/ma-page?view=editor");
      router.refresh();
    });
  }

  function save() {
    startTransition(async () => {
      const result = await saveVitrineGuide(initialPage.id, {
        business_name: page.business_name,
        job_title: page.job_title,
        tagline: page.tagline,
        city: page.city,
        address: page.address,
        phone: page.phone,
        floating_cta: page.floating_cta,
        logo_url: page.logo_url,
        hero_url: page.hero_url,
        theme: page.theme,
        font: page.font,
        colors: page.colors,
        typography: page.typography,
        design: page.design,
      });
      if (
        result.error === "insufficient_credits" ||
        result.error === "subscription_required"
      ) {
        setCreditsDialog(result.error);
        return;
      }
      if (result.error) {
        toast.error(result.error);
        return;
      }
      // Les modifications sont en brouillon : le site public ne bougera qu'à
      // la publication d'une nouvelle version (étape suivante).
      toast.success("Brouillon enregistré.");
      router.refresh();
      setStep(6);
    });
  }

  return (
    <div className={styles.tunnel}>
      <header className={styles.header}>
        <Link href="/espace" className={styles.brand}><FluxBrand /></Link>
        <div className={styles.progressMeta}>
          <span>Étape {Math.min(step + 1, 6)} sur 6</span>
          <div className={styles.progress}><i style={{ width: `${progress}%` }} /></div>
        </div>
        <Link href="/ma-page?view=editor" className={styles.exit}>Éditeur complet</Link>
      </header>

      <main className={styles.stage}>
        {step === 0 && (
          <section className={styles.intro}>
            <span className={styles.icon}><PencilRuler aria-hidden="true" /></span>
            <p className={styles.kicker}>Assistant vitrine FLUX</p>
            <h1>Fais évoluer ta vitrine, <em>une décision à la fois.</em></h1>
            <p>
              Flux reprend tes informations actuelles et t’accompagne étape par
              étape. Rien ne change avant ta confirmation finale.
            </p>
            <textarea
              className={styles.input}
              style={{ minHeight: 96, resize: "vertical", marginBottom: 12 }}
              maxLength={1500}
              value={brief}
              onChange={(event) => setBrief(event.target.value)}
              placeholder="Décris ton commerce en quelques phrases : ce que tu proposes, ton style, ce qui te distingue… FLUX s'occupe du reste."
            />
            {/* Le bouton reste cliquable : le dialogue explique le verrou et
                mène à /formules — c'est le meilleur endroit pour convertir. */}
            <button
              className={`flux-button-smooth ${styles.primary}`}
              type="button"
              disabled={pending}
              onClick={generateSite}
            >
              {pending
                ? "FLUX crée ta vitrine…"
                : canGenerateSite
                  ? `FLUX crée toute ma vitrine (${SITE_GENERATE_COST} cr.)`
                  : `FLUX crée toute ma vitrine — formule payante`}
              <ArrowRight aria-hidden="true" />
            </button>
            <button
              className={styles.directEditor}
              type="button"
              disabled={pending}
              onClick={prefill}
            >
              {pending ? "FLUX travaille…" : `Juste pré-remplir les textes (${PREFILL_COST} cr.)`}
              <ArrowRight aria-hidden="true" />
            </button>
            <button className={styles.directEditor} type="button" onClick={() => setStep(1)}>
              Ou modifier étape par étape <ArrowRight aria-hidden="true" />
            </button>
            <Link href="/ma-page?view=editor" className={styles.directEditor}>
              Aller directement à l’éditeur <ExternalLink aria-hidden="true" />
            </Link>
          </section>
        )}

        {step === 1 && (
          <Screen kicker="Ton identité" title={<>Que doivent retenir tes <em>clients ?</em></>} subtitle="Le nom, le métier et la promesse qui apparaissent en premier.">
            <VitrinePreview page={page} />
            <div className={styles.formGrid}>
              <Field label="Nom du commerce" value={page.business_name} maxLength={60} onChange={(business_name) => patch({ business_name })} />
              <Field label="Ton métier" value={page.job_title} maxLength={60} onChange={(job_title) => patch({ job_title })} />
              <Field label="Ta phrase d’accroche" value={page.tagline} maxLength={120} placeholder="Ce qui donne envie de te choisir" onChange={(tagline) => patch({ tagline })} />
              <Field label="Ta ville" value={page.city} maxLength={60} onChange={(city) => patch({ city })} />
            </div>
          </Screen>
        )}

        {step === 2 && (
          <Screen kicker="Tes images" title={<>Quelle image veux-tu <em>laisser ?</em></>} subtitle="Ajoute ton logo et la grande photo qui accueille tes visiteurs.">
            <VitrinePreview page={page} />
            <div className={styles.photoGrid}>
              <article className={styles.photoCard}>
                <strong>Logo ou portrait</strong>
                {page.logo_url ? <Image src={page.logo_url} width={520} height={240} unoptimized alt="" /> : <ImageIcon aria-hidden="true" />}
                <PhotoUpload userId={page.user_id} label={page.logo_url ? "Changer le logo" : "Ajouter mon logo"} onUploaded={(logo_url) => patch({ logo_url })} />
              </article>
              <article className={styles.photoCard}>
                <strong>Grande photo de couverture</strong>
                {page.hero_url ? <Image src={page.hero_url} width={520} height={240} unoptimized alt="" /> : <ImageIcon aria-hidden="true" />}
                <PhotoUpload userId={page.user_id} label={page.hero_url ? "Changer la photo" : "Ajouter une photo"} onUploaded={(hero_url) => patch({ hero_url })} />
              </article>
            </div>
          </Screen>
        )}

        {step === 3 && (
          <Screen kicker="Ton ambiance" title={<>Quel univers raconte le mieux ton <em>business ?</em></>} subtitle="La structure reste accessible et responsive, seule l’atmosphère change.">
            <VitrinePreview page={page} />
            <div className={styles.choiceGrid}>
              {VITRINE_THEMES.map((theme) => {
                const selected = (page.theme || "editorial") === theme.id;
                return (
                  <button type="button" key={theme.id} className={selected ? styles.choiceActive : styles.choice} onClick={() => patch(designKitPatch(theme.id, page))}>
                    <Palette aria-hidden="true" />
                    <strong>{theme.name}</strong>
                    <small>{theme.description}</small>
                    {selected && <Check aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </Screen>
        )}

        {step === 4 && (
          <Screen kicker="Les détails" title="Comment peut-on te reconnaître et te joindre ?" subtitle="Choisis ta typographie, tes couleurs et vérifie tes coordonnées.">
            <VitrinePreview page={page} />
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>Style d’écriture</span>
                <select className={styles.input} value={page.font} onChange={(event) => patch({ font: event.target.value })}>
                  {FONTS.map((font) => <option key={font.id} value={font.id}>{font.label}</option>)}
                </select>
              </label>
              <div className={styles.colorFields}>
                <label><span>Couleur principale</span><input type="color" value={page.colors.primary ?? "#ef233c"} onChange={(event) => patch({ colors: { ...page.colors, primary: event.target.value } })} /></label>
                <label><span>Couleur foncée</span><input type="color" value={page.colors.dark ?? "#111114"} onChange={(event) => patch({ colors: { ...page.colors, dark: event.target.value } })} /></label>
              </div>
              <Field label="Téléphone" value={page.phone} maxLength={30} placeholder="Ex : 06 12 34 56 78" onChange={(phone) => {
                const syncFloatingNumber = page.floating_cta && (!page.floating_cta.number || page.floating_cta.number === page.phone);
                patch({
                  phone,
                  ...(syncFloatingNumber ? { floating_cta: { ...page.floating_cta!, number: phone } } : {}),
                });
              }} />
              <Field label="Adresse" value={page.address} maxLength={120} placeholder="Facultatif" onChange={(address) => patch({ address })} />
            </div>
          </Screen>
        )}

        {step === 5 && (
          <Screen kicker="Confirmation" title={<>Ta vitrine est prête à <em>évoluer.</em></>} subtitle="Vérifie l’essentiel : tes modifications partent en brouillon, tu choisis ensuite de les publier.">
            <VitrinePreview page={page} />
            <div className={styles.reviewGrid}>
              <article className={styles.reviewCard}><small>Commerce</small><strong>{page.business_name}</strong></article>
              <article className={styles.reviewCard}><small>Positionnement</small><strong>{page.job_title} · {page.city}</strong></article>
              <article className={styles.reviewCard}><small>Ambiance</small><strong>{VITRINE_THEMES.find((theme) => theme.id === page.theme)?.name ?? "Éditorial"}</strong></article>
              <article className={styles.reviewCard}><small>Images</small><strong>{[page.logo_url, page.hero_url].filter(Boolean).length} sur 2 ajoutées</strong></article>
              <article className={styles.reviewCard}><small>Coût de l&apos;assistant</small><strong>{VITRINE_ASSIST_COST} crédits · solde : {publish.balance} cr.</strong></article>
            </div>
            {!enough && <p className={styles.subtitle}>Il te manque {VITRINE_ASSIST_COST - publish.balance} crédit{VITRINE_ASSIST_COST - publish.balance > 1 ? "s" : ""}. <Link href="/credits" style={{ textDecoration: "underline" }}>Recharge tes crédits</Link> — ou passe par l&apos;éditeur complet, gratuit.</p>}
            <div className={styles.confirm}>
              <button className={styles.back} type="button" onClick={() => setStep(4)}><ArrowLeft aria-hidden="true" /> Modifier</button>
              <button className={`flux-button-smooth ${styles.primary}`} type="button" disabled={pending || !enough} onClick={save}>{pending ? "Enregistrement…" : `Confirmer mes modifications (${VITRINE_ASSIST_COST} cr.)`} <Store aria-hidden="true" /></button>
            </div>
          </Screen>
        )}

        {step === 6 && (
          <Screen kicker="Publication" title={<>Ton brouillon est prêt. On le met <em>en ligne ?</em></>} subtitle="Ton site public affiche encore l’ancienne version. Publier une nouvelle version la remplace pour tes clients.">
            <VitrinePreview page={page} />
            <div className={styles.confirm}>
              <PublishButton {...publish} hasDraft redirectTo="/ma-page?view=editor" />
              <Link href="/ma-page?view=editor" className={styles.back}>
                Plus tard — aller à l’éditeur
              </Link>
            </div>
          </Screen>
        )}
      </main>

      {step > 0 && step < 5 && (
        <footer className={styles.controls}>
          <button className={styles.back} type="button" onClick={() => setStep((current) => current - 1)}><ArrowLeft aria-hidden="true" /> Retour</button>
          <button className={`flux-button-smooth ${styles.primary}`} type="button" disabled={!canContinue} onClick={() => setStep((current) => current + 1)}>Continuer <ArrowRight aria-hidden="true" /></button>
        </footer>
      )}

      <Dialog open={creditsDialog !== null} onOpenChange={(next) => !next && setCreditsDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {creditsDialog === "flux_requires_subscription"
                ? "La création complète est réservée aux abonnés"
                : creditsDialog === "flux_credits_expired"
                  ? "Ta fenêtre IA de 6 mois est terminée"
                : creditsDialog === "subscription_required"
                  ? "Ton essai est terminé"
                  : creditsDialog === "flux_trial_exhausted"
                    ? "Tu as testé FLUX — la suite avec une formule"
                    : creditsDialog === "flux_requires_payment"
                      ? "FLUX est prête à travailler pour toi"
                      : "Plus assez de crédits"}
            </DialogTitle>
            <DialogDescription>
              {creditsDialog === "flux_requires_subscription"
                ? `FLUX écrit ta vitrine entière — textes, SEO, ambiance et sections — à partir de ton brief. C'est réservé aux formules payantes. En attendant, tu peux déjà faire pré-remplir tes textes par FLUX (${PREFILL_COST} cr.), ou partir d'un template dans l'éditeur complet, gratuitement.`
                : creditsDialog === "flux_credits_expired"
                  ? "Ton achat t’a donné accès à l’IA pendant 6 mois. Tes crédits restants sont toujours disponibles pour publier et gérer ta vitrine ; choisis une formule pour réactiver les générations IA."
                : creditsDialog === "subscription_required"
                  ? "Tes 7 jours d'essai FLUX sont passés. Choisis une formule pour continuer à utiliser l'assistant."
                  : creditsDialog === "flux_trial_exhausted"
                    ? "Tu as utilisé tes 2 générations FLUX offertes pendant l'essai. Continue avec une formule — ou pars des templates déjà en place dans l'éditeur complet (gratuit)."
                    : creditsDialog === "flux_requires_payment"
                      ? "FLUX crée et améliore ta vitrine à ta place. Pars des templates déjà en place dans l'éditeur complet (gratuit), ou débloque FLUX avec une formule ou un pack de crédits."
                      : `L'assistant vitrine coûte ${VITRINE_ASSIST_COST} crédits. Recharge tes crédits, ou utilise l'éditeur complet (gratuit).`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button asChild variant="ghost">
              <Link href="/ma-page?view=editor">Partir d&apos;un template</Link>
            </Button>
            <Button asChild>
              <Link
                href={
                  creditsDialog === "insufficient_credits" ? "/credits" : "/formules"
                }
              >
                {creditsDialog === "insufficient_credits"
                  ? "Recharger mes crédits"
                  : "Choisir ma formule FLUX"}
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Screen({ kicker, title, subtitle, children }: { kicker: string; title: React.ReactNode; subtitle: string; children: React.ReactNode }) {
  return <section className={styles.screen}><p className={styles.kicker}>{kicker}</p><h1>{title}</h1><p className={styles.subtitle}>{subtitle}</p>{children}</section>;
}

function Field({ label, value, placeholder, maxLength, onChange }: { label: string; value: string; placeholder?: string; maxLength: number; onChange: (value: string) => void }) {
  return <label className={styles.field}><span>{label}</span><input className={styles.input} value={value} maxLength={maxLength} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label>;
}

function VitrinePreview({ page }: { page: Page }) {
  const design = resolveVitrineDesign(page.theme, page.design);
  const font = FONTS.find((item) => item.id === page.font)?.css ?? FONTS[0].css;
  const primary = page.colors.primary ?? "#ef233c";
  const dark = page.colors.dark ?? "#111114";

  return (
    <div
      className={styles.vitrinePreview}
      data-theme={page.theme || "editorial"}
      data-design-button={design.components.button.renderId}
      data-design-header={design.components.header.renderId}
      data-design-section={design.components.section.renderId}
      style={{
        "--preview-primary": primary,
        "--preview-dark": dark,
        "--preview-font": font,
      } as React.CSSProperties}
      aria-label="Aperçu actuel de ta vitrine"
    >
      {page.hero_url ? (
        <Image
          className={styles.vitrinePreviewImage}
          src={page.hero_url}
          width={1000}
          height={420}
          unoptimized
          alt=""
        />
      ) : (
        <span className={styles.vitrinePreviewBackdrop} aria-hidden="true" />
      )}
      <span className={styles.vitrinePreviewShade} aria-hidden="true" />
      <div className={styles.vitrinePreviewTop}>
        {page.logo_url ? (
          <Image src={page.logo_url} width={44} height={44} unoptimized alt="" />
        ) : (
          <span>{page.business_name.charAt(0).toUpperCase() || "W"}</span>
        )}
        <small>Aperçu en direct</small>
      </div>
      <div className={styles.vitrinePreviewContent}>
        <small>{page.job_title || "Ton métier"} · {page.city || "Ta ville"}</small>
        <strong>{page.business_name || "Ton commerce"}</strong>
        <p>{page.tagline || "Ta phrase d’accroche apparaîtra ici."}</p>
        <span className={styles.vitrinePreviewButton}>Découvrir</span>
        {(page.phone || page.floating_cta?.number) && (
          <span className={styles.vitrinePreviewContacts}>
            {page.phone && <span><Phone aria-hidden="true" /> {page.phone}</span>}
            {page.floating_cta?.type === "whatsapp" && page.floating_cta.number && (
              <span><MessageCircle aria-hidden="true" /> WhatsApp activé</span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
