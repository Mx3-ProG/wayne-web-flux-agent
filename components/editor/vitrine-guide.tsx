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
import { designKitPatch, legacyAppearance, resolveStorefrontPresentation } from "@/lib/vitrine-design/resolver";
import { VITRINE_ASSIST_COST, SITE_GENERATE_COST } from "@/lib/plans";
import { PREFILL_COST } from "@/lib/tools-config";
import { saveVitrineGuide } from "@/app/(app)/ma-page/actions";
import { fluxPrefill, fluxGenerateSite } from "@/app/(app)/ma-page/flux-actions";
import { translateActionError } from "./translate-action-error";
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
import { useI18n } from "@/components/i18n-provider";
import type { DashboardDict } from "@/lib/i18n/get-dictionary";

export function VitrineGuide({
  initialPage,
  publish,
  canGenerateSite,
}: {
  initialPage: Page;
  publish: PublishProps;
  // Crédits utilisables pour l'IA, résolu côté serveur. Sert à annoncer le
  // verrou AVANT le clic ; l'autorité reste checkFluxAccess.
  canGenerateSite: boolean;
}) {
  const { dictionary, editor, fonts } = useI18n();
  const t = dictionary.vitrineGuide;
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [pending, startTransition] = useTransition();
  const [creditsDialog, setCreditsDialog] = useState<
    | "insufficient_credits"
    | "subscription_required"
    | "flux_requires_payment"
    | "flux_credits_expired"
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
        result.error === "flux_requires_payment" ||
        result.error === "flux_credits_expired" ||
        result.error === "insufficient_credits" ||
        result.error === "subscription_required"
      ) {
        setCreditsDialog(result.error);
        return;
      }
      if (result.error) {
        toast.error(
          result.error === "content_blocked"
            ? t.errors.blocked
            : result.error === "too_many_requests"
              ? t.errors.rate : t.errors.generation
        );
        return;
      }
      toast.success(t.intro.prefillSuccess);
      router.push("/ma-page?view=editor");
      router.refresh();
    });
  }

  function generateSite() {
    if (!brief.trim()) {
      toast.error(t.errors.brief);
      return;
    }
    startTransition(async () => {
      const result = await fluxGenerateSite(initialPage.id, brief);
      if (
        result.error === "flux_requires_payment" ||
        result.error === "flux_credits_expired" ||
        result.error === "insufficient_credits" ||
        result.error === "subscription_required"
      ) {
        setCreditsDialog(result.error);
        return;
      }
      if (result.error) {
        toast.error(
          result.error === "content_blocked"
            ? t.errors.blocked
            : result.error === "empty_brief"
              ? t.errors.brief
              : result.error === "too_many_requests"
                ? t.errors.rate : t.errors.generation
        );
        return;
      }
      toast.success(t.intro.generateSuccess);
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
        appearance: page.appearance,
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
        toast.error(translateActionError(editor.actionErrors, result.error));
        return;
      }
      // Les modifications sont en brouillon : le site public ne bougera qu'à
      // la publication d'une nouvelle version (étape suivante).
      toast.success(t.draftSaved);
      router.refresh();
      setStep(6);
    });
  }

  return (
    <div className={styles.tunnel}>
      <header className={styles.header}>
        <Link href="/espace" className={styles.brand}><FluxBrand /></Link>
        <div className={styles.progressMeta}>
          <span>{t.step.replace("{current}", String(Math.min(step + 1, 6))).replace("{total}", "6")}</span>
          <div className={styles.progress}><i style={{ width: `${progress}%` }} /></div>
        </div>
        <Link href="/ma-page?view=editor" className={styles.exit}>{t.fullEditor}</Link>
      </header>

      <main className={styles.stage}>
        {step === 0 && (
          <section className={styles.intro}>
            <span className={styles.icon}><PencilRuler aria-hidden="true" /></span>
            <p className={styles.kicker}>{t.intro.kicker}</p>
            <h1>{t.intro.titleStart} <em>{t.intro.titleEm}</em></h1>
            <p>{t.intro.text}</p>
            <textarea
              className={styles.input}
              style={{ minHeight: 96, resize: "vertical", marginBottom: 12 }}
              maxLength={1500}
              value={brief}
              onChange={(event) => setBrief(event.target.value)}
              placeholder={t.intro.placeholder}
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
                ? t.intro.creating
                : canGenerateSite
                  ? t.intro.create.replace("{cost}", String(SITE_GENERATE_COST))
                  : t.intro.recharge}
              <ArrowRight aria-hidden="true" />
            </button>
            <button
              className={styles.directEditor}
              type="button"
              disabled={pending}
              onClick={prefill}
            >
              {pending ? t.intro.working : t.intro.prefill.replace("{cost}", String(PREFILL_COST))}
              <ArrowRight aria-hidden="true" />
            </button>
            <button className={styles.directEditor} type="button" onClick={() => setStep(1)}>
              {t.intro.stepByStep} <ArrowRight aria-hidden="true" />
            </button>
            <Link href="/ma-page?view=editor" className={styles.directEditor}>
              {t.intro.direct} <ExternalLink aria-hidden="true" />
            </Link>
          </section>
        )}

        {step === 1 && (
          <Screen kicker={t.identity.kicker} title={t.identity.title} subtitle={t.identity.subtitle}>
            <VitrinePreview page={page} dict={t.preview} />
            <div className={styles.formGrid}>
              <Field label={t.identity.business} value={page.business_name} maxLength={60} onChange={(business_name) => patch({ business_name })} />
              <Field label={t.identity.job} value={page.job_title} maxLength={60} onChange={(job_title) => patch({ job_title })} />
              <Field label={t.identity.tagline} value={page.tagline} maxLength={120} placeholder={t.identity.taglinePlaceholder} onChange={(tagline) => patch({ tagline })} />
              <Field label={t.identity.city} value={page.city} maxLength={60} onChange={(city) => patch({ city })} />
            </div>
          </Screen>
        )}

        {step === 2 && (
          <Screen kicker={t.images.kicker} title={t.images.title} subtitle={t.images.subtitle}>
            <VitrinePreview page={page} dict={t.preview} />
            <div className={styles.photoGrid}>
              <article className={styles.photoCard}>
                <strong>{t.images.logo}</strong>
                {page.logo_url ? <Image src={page.logo_url} width={520} height={240} unoptimized alt="" /> : <ImageIcon aria-hidden="true" />}
                <PhotoUpload userId={page.user_id} label={page.logo_url ? t.images.logoChange : t.images.logoAdd} messages={dictionary.photoUpload} onUploaded={(logo_url) => patch({ logo_url })} />
              </article>
              <article className={styles.photoCard}>
                <strong>{t.images.hero}</strong>
                {page.hero_url ? <Image src={page.hero_url} width={520} height={240} unoptimized alt="" /> : <ImageIcon aria-hidden="true" />}
                <PhotoUpload userId={page.user_id} label={page.hero_url ? t.images.heroChange : t.images.heroAdd} messages={dictionary.photoUpload} onUploaded={(hero_url) => patch({ hero_url })} />
              </article>
            </div>
          </Screen>
        )}

        {step === 3 && (
          <Screen kicker={t.mood.kicker} title={t.mood.title} subtitle={t.mood.subtitle}>
            <VitrinePreview page={page} dict={t.preview} />
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
          <Screen kicker={t.details.kicker} title={t.details.title} subtitle={t.details.subtitle}>
            <VitrinePreview page={page} dict={t.preview} />
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>{t.details.font}</span>
                <select className={styles.input} value={page.font} onChange={(event) => patch({ font: event.target.value })}>
                  {fonts.map((font) => <option key={font.id} value={font.id}>{font.label}</option>)}
                </select>
              </label>
              <div className={styles.colorFields}>
                <label><span>{t.details.primary}</span><input type="color" value={legacyAppearance(page).accent} onChange={(event) => patch({ appearance: { ...legacyAppearance(page), accent: event.target.value } })} /></label>
                <label><span>Ambiance</span><select value={legacyAppearance(page).mode} onChange={(event) => patch({ appearance: { ...legacyAppearance(page), mode: event.target.value as "light" | "dark" } })}><option value="light">Claire</option><option value="dark">Sombre</option></select></label>
              </div>
              <Field label={t.details.phone} value={page.phone} maxLength={30} placeholder={t.details.phonePlaceholder} onChange={(phone) => {
                const syncFloatingNumber = page.floating_cta && (!page.floating_cta.number || page.floating_cta.number === page.phone);
                patch({
                  phone,
                  ...(syncFloatingNumber ? { floating_cta: { ...page.floating_cta!, number: phone } } : {}),
                });
              }} />
              <Field label={t.details.address} value={page.address} maxLength={120} placeholder={t.details.optional} onChange={(address) => patch({ address })} />
            </div>
          </Screen>
        )}

        {step === 5 && (
          <Screen kicker={t.confirmation.kicker} title={t.confirmation.title} subtitle={t.confirmation.subtitle}>
            <VitrinePreview page={page} dict={t.preview} />
            <div className={styles.reviewGrid}>
              <article className={styles.reviewCard}><small>{t.confirmation.business}</small><strong>{page.business_name}</strong></article>
              <article className={styles.reviewCard}><small>{t.confirmation.positioning}</small><strong>{page.job_title} · {page.city}</strong></article>
              <article className={styles.reviewCard}><small>{t.confirmation.mood}</small><strong>{VITRINE_THEMES.find((theme) => theme.id === page.theme)?.name ?? "Editorial"}</strong></article>
              <article className={styles.reviewCard}><small>{t.confirmation.images}</small><strong>{t.confirmation.imagesCount.replace("{count}", String([page.logo_url, page.hero_url].filter(Boolean).length))}</strong></article>
              <article className={styles.reviewCard}><small>{t.confirmation.cost}</small><strong>{t.confirmation.costValue.replace("{cost}", String(VITRINE_ASSIST_COST)).replace("{balance}", String(publish.balance))}</strong></article>
            </div>
            {!enough && <p className={styles.subtitle}>{t.confirmation.missing.replace("{count}", String(VITRINE_ASSIST_COST - publish.balance))} <Link href="/credits" style={{ textDecoration: "underline" }}>{t.confirmation.recharge}</Link> — {t.confirmation.freeEditor}</p>}
            <div className={styles.confirm}>
              <button className={styles.back} type="button" onClick={() => setStep(4)}><ArrowLeft aria-hidden="true" /> {t.edit}</button>
              <button className={`flux-button-smooth ${styles.primary}`} type="button" disabled={pending || !enough} onClick={save}>{pending ? t.saving : t.confirmation.confirm.replace("{cost}", String(VITRINE_ASSIST_COST))} <Store aria-hidden="true" /></button>
            </div>
          </Screen>
        )}

        {step === 6 && (
          <Screen kicker={t.publish.kicker} title={t.publish.title} subtitle={t.publish.subtitle}>
            <VitrinePreview page={page} dict={t.preview} />
            <div className={styles.confirm}>
              <PublishButton {...publish} hasDraft redirectTo="/ma-page?view=editor" />
              <Link href="/ma-page?view=editor" className={styles.back}>
                {t.publish.later}
              </Link>
            </div>
          </Screen>
        )}
      </main>

      {step > 0 && step < 5 && (
        <footer className={styles.controls}>
          <button className={styles.back} type="button" onClick={() => setStep((current) => current - 1)}><ArrowLeft aria-hidden="true" /> {t.back}</button>
          <button className={`flux-button-smooth ${styles.primary}`} type="button" disabled={!canContinue} onClick={() => setStep((current) => current + 1)}>{t.continue} <ArrowRight aria-hidden="true" /></button>
        </footer>
      )}

      <Dialog open={creditsDialog !== null} onOpenChange={(next) => !next && setCreditsDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {creditsDialog === "flux_credits_expired"
                ? t.credits.expiredTitle
                : creditsDialog === "subscription_required" ||
                    creditsDialog === "flux_requires_payment"
                  ? t.credits.trialTitle : t.credits.insufficientTitle}
            </DialogTitle>
            <DialogDescription>
              {creditsDialog === "flux_credits_expired"
                ? t.credits.expired
                : creditsDialog === "subscription_required" ||
                    creditsDialog === "flux_requires_payment"
                  ? t.credits.trial : t.credits.insufficient.replace("{cost}", String(VITRINE_ASSIST_COST))}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button asChild variant="ghost">
              <Link href="/ma-page?view=editor">{t.credits.template}</Link>
            </Button>
            <Button asChild>
              <Link
                href={
                  creditsDialog === "insufficient_credits" ? "/credits" : "/formules"
                }
              >
                {creditsDialog === "insufficient_credits"
                  ? t.credits.recharge : t.credits.plan}
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

function VitrinePreview({ page, dict }: { page: Page; dict: DashboardDict["vitrineGuide"]["preview"] }) {
  const design = resolveStorefrontPresentation(page);
  const font = FONTS.find((item) => item.id === page.font)?.css ?? FONTS[0].css;
  const primary = design.tokens.accent;
  const dark = design.tokens.hero;

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
      aria-label={dict.aria}
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
        <small>{dict.live}</small>
      </div>
      <div className={styles.vitrinePreviewContent}>
        <small>{page.job_title || dict.job} · {page.city || dict.city}</small>
        <strong>{page.business_name || dict.business}</strong>
        <p>{page.tagline || dict.tagline}</p>
        <span className={styles.vitrinePreviewButton}>{dict.discover}</span>
        {(page.phone || page.floating_cta?.number) && (
          <span className={styles.vitrinePreviewContacts}>
            {page.phone && <span><Phone aria-hidden="true" /> {page.phone}</span>}
            {page.floating_cta?.type === "whatsapp" && page.floating_cta.number && (
              <span><MessageCircle aria-hidden="true" /> {dict.whatsapp}</span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
