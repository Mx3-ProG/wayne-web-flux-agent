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
  Palette,
  PencilRuler,
  Store,
} from "lucide-react";
import { toast } from "sonner";
import type { Page } from "@/lib/types";
import { FONTS } from "@/lib/verticals";
import { VITRINE_THEMES } from "@/lib/vitrine-themes";
import { VITRINE_ASSIST_COST } from "@/lib/plans";
import { PREFILL_COST } from "@/lib/tools-config";
import { saveVitrineGuide } from "@/app/(app)/ma-page/actions";
import { fluxPrefill } from "@/app/(app)/ma-page/flux-actions";
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
}: {
  initialPage: Page;
  publish: PublishProps;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [pending, startTransition] = useTransition();
  const [creditsDialog, setCreditsDialog] = useState<
    "insufficient_credits" | "subscription_required" | "flux_requires_payment" | null
  >(null);
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
        result.error === "flux_requires_payment" ||
        result.error === "insufficient_credits" ||
        result.error === "subscription_required"
      ) {
        setCreditsDialog(result.error);
        return;
      }
      if (result.error) {
        toast.error("La génération a échoué — tes crédits n'ont pas été débités.");
        return;
      }
      toast.success("FLUX a pré-rempli ton brouillon. Relis, puis publie.");
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
        logo_url: page.logo_url,
        hero_url: page.hero_url,
        theme: page.theme,
        font: page.font,
        colors: page.colors,
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
            <button
              className={styles.primary}
              type="button"
              disabled={pending}
              onClick={prefill}
            >
              {pending ? "FLUX travaille…" : `FLUX pré-remplit ma vitrine (${PREFILL_COST} cr.)`}
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
                  <button type="button" key={theme.id} className={selected ? styles.choiceActive : styles.choice} onClick={() => patch({ theme: theme.id })}>
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
              <Field label="Téléphone" value={page.phone} maxLength={30} placeholder="Ex : 06 12 34 56 78" onChange={(phone) => patch({ phone })} />
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
              <button className={styles.primary} type="button" disabled={pending || !enough} onClick={save}>{pending ? "Enregistrement…" : `Confirmer mes modifications (${VITRINE_ASSIST_COST} cr.)`} <Store aria-hidden="true" /></button>
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
          <button className={styles.primary} type="button" disabled={!canContinue} onClick={() => setStep((current) => current + 1)}>Continuer <ArrowRight aria-hidden="true" /></button>
        </footer>
      )}

      <Dialog open={creditsDialog !== null} onOpenChange={(next) => !next && setCreditsDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {creditsDialog === "subscription_required"
                ? "Ton essai est terminé"
                : creditsDialog === "flux_requires_payment"
                  ? "FLUX est prête à travailler pour toi"
                  : "Plus assez de crédits"}
            </DialogTitle>
            <DialogDescription>
              {creditsDialog === "subscription_required"
                ? "Tes 7 jours d'essai FLUX sont passés. Choisis une formule pour continuer à utiliser l'assistant."
                : creditsDialog === "flux_requires_payment"
                  ? "FLUX crée et améliore ta vitrine à ta place — réservé aux formules et aux packs de crédits. L'éditeur complet reste gratuit."
                  : `L'assistant vitrine coûte ${VITRINE_ASSIST_COST} crédits. Recharge tes crédits, ou utilise l'éditeur complet (gratuit).`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button asChild variant="ghost">
              <Link href="/ma-page?view=editor">Éditeur complet</Link>
            </Button>
            <Button asChild>
              <Link
                href={
                  creditsDialog === "subscription_required" ||
                  creditsDialog === "flux_requires_payment"
                    ? "/formules"
                    : "/credits"
                }
              >
                {creditsDialog === "subscription_required" ||
                creditsDialog === "flux_requires_payment"
                  ? "Choisir ma formule FLUX"
                  : "Recharger mes crédits"}
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
  const font = FONTS.find((item) => item.id === page.font)?.css ?? FONTS[0].css;
  const primary = page.colors.primary ?? "#ef233c";
  const dark = page.colors.dark ?? "#111114";

  return (
    <div
      className={styles.vitrinePreview}
      data-theme={page.theme || "editorial"}
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
      </div>
    </div>
  );
}
