"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, BadgePercent, Check, Coins, Package, Sparkles, Ticket, Users } from "lucide-react";
import { toast } from "sonner";
import type { OfferKind } from "@/lib/types";
import { OFFER_CREATE_COST, OFFER_EXTRA_COST } from "@/lib/plans";
import { PhotoUpload } from "@/components/editor/photo-upload";
import { FluxBrand } from "@/components/flux-brand";
import { PriceInput } from "@/components/ui/price-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createOfferFromTunnel } from "@/app/(app)/offres/actions";
import styles from "./setup-tunnel.module.css";
import { useI18n } from "@/components/i18n-provider";
import { KARLMADA_BLOCK_MESSAGE } from "@/lib/karlmada-constants";

export function OfferTunnel({
  userId,
  offerCount,
  limit,
  balance,
}: {
  userId: string;
  offerCount: number;
  limit: number;
  balance: number;
}) {
  const { dictionary } = useI18n();
  const t = dictionary.offerTunnel;
  const kinds: { value: OfferKind; title: string; text: string; icon: typeof Package }[] = [
    { value: "produit", ...t.format.kinds.produit, icon: Package },
    { value: "service", ...t.format.kinds.service, icon: Users },
    { value: "evenement", ...t.format.kinds.evenement, icon: Ticket },
  ];
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState<OfferKind>("produit");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState(0);
  const [comparePrice, setComparePrice] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [active, setActive] = useState(true);
  const [pending, startTransition] = useTransition();
  // Au-delà de la limite du forfait, l'offre reste créable mais coûte plus cher.
  const atLimit = offerCount >= limit;
  const cost = atLimit ? OFFER_EXTRA_COST : OFFER_CREATE_COST;
  const enough = balance >= cost;
  const [gateOpen, setGateOpen] = useState(atLimit);
  const [creditsDialog, setCreditsDialog] = useState<
    "insufficient_credits" | "subscription_required" | null
  >(null);
  const progress = ((step + 1) / 8) * 100;
  const canContinue = step === 2 ? Boolean(title.trim()) : step === 3 ? price >= 0 : true;

  function save() {
    startTransition(async () => {
      const result = await createOfferFromTunnel({
        title,
        description,
        kind,
        price_cents: price,
        compare_at_cents: comparePrice,
        image_url: imageUrl,
        active,
      });
      if (result.error === "insufficient_credits" || result.error === "subscription_required") {
        setCreditsDialog(result.error);
        return;
      }
      if (result.error) {
        const code = result.error === KARLMADA_BLOCK_MESSAGE ? "content_blocked" : result.error;
        toast.error(t.errors[code as keyof typeof t.errors] ?? t.errors.unknown);
        return;
      }
      toast.success(t.success);
      router.push("/offres");
      router.refresh();
    });
  }

  return (
    <div className={styles.tunnel}>
      <header className={styles.header}>
        <Link href="/espace" className={styles.brand}><FluxBrand /></Link>
        <div className={styles.progressMeta}><span>{t.step.replace("{current}", String(step + 1))}</span><div className={styles.progress}><i style={{ width: `${progress}%` }} /></div></div>
        <Link href="/offres" className={styles.exit}>{t.myOffers}</Link>
      </header>

      <main className={styles.stage}>
        {step === 0 && <Intro icon={<BadgePercent aria-hidden="true" />} kicker={t.creation} cta={t.create} title={t.intro.title} text={t.intro.text} onNext={() => setStep(1)} />}
        {step === 1 && <Screen kicker={t.format.kicker} title={t.format.title} subtitle={t.format.subtitle}><div className={styles.choiceGrid}>{kinds.map((item) => { const Icon = item.icon; const selected = kind === item.value; return <button type="button" key={item.value} className={selected ? styles.choiceActive : styles.choice} onClick={() => setKind(item.value)}><Icon aria-hidden="true" /><strong>{item.title}</strong><small>{item.text}</small>{selected && <Check aria-hidden="true" />}</button>; })}</div></Screen>}
        {step === 2 && <SingleField kicker={t.promise.kicker} title={t.promise.title} subtitle={t.promise.subtitle} label={t.promise.label} value={title} placeholder={t.promise.placeholder} maxLength={80} onChange={setTitle} />}
        {step === 3 && <Screen kicker={t.price.kicker} title={t.price.title} subtitle={t.price.subtitle}><div className={styles.formGrid}><label className={styles.field}><span>{t.price.offer}</span><PriceInput className={styles.input} cents={price} placeholder={t.price.offerPlaceholder} onCents={(c) => setPrice(c)} /></label><label className={styles.field}><span>{t.price.compare}</span><PriceInput className={styles.input} cents={comparePrice ?? 0} placeholder={t.price.comparePlaceholder} onCents={(c) => setComparePrice(c === 0 ? null : c)} /></label></div></Screen>}
        {step === 4 && <Screen kicker={t.benefit.kicker} title={t.benefit.title} subtitle={t.benefit.subtitle}><div className={styles.formGrid}><label className={styles.field}><span>{t.benefit.label}</span><textarea className={styles.textarea} value={description} maxLength={300} placeholder={t.benefit.placeholder} onChange={(event) => setDescription(event.target.value)} /></label></div></Screen>}
        {step === 5 && <Screen kicker={t.photo.kicker} title={t.photo.title} subtitle={t.photo.subtitle}><div className={styles.photoGrid}><article className={styles.photoCard}>{imageUrl && <Image src={imageUrl} width={520} height={240} unoptimized alt="" />}<PhotoUpload userId={userId} label={imageUrl ? t.photo.change : t.photo.add} messages={dictionary.photoUpload} onUploaded={setImageUrl} /></article></div></Screen>}
        {step === 6 && <Screen kicker={t.visibility.kicker} title={t.visibility.title} subtitle={t.visibility.subtitle}><div className={styles.choiceGrid}><button type="button" className={active ? styles.choiceActive : styles.choice} onClick={() => setActive(true)}><Check aria-hidden="true" /><strong>{t.visibility.online}</strong><small>{t.visibility.onlineHint}</small></button><button type="button" className={!active ? styles.choiceActive : styles.choice} onClick={() => setActive(false)}><Sparkles aria-hidden="true" /><strong>{t.visibility.draft}</strong><small>{t.visibility.draftHint}</small></button></div></Screen>}
        {step === 7 && <Screen kicker={t.confirm.kicker} title={t.confirm.title} subtitle={t.confirm.subtitle}><div className={styles.reviewGrid}><article className={styles.reviewCard}><small>{t.confirm.type}</small><strong>{kinds.find((item) => item.value === kind)?.title}</strong></article><article className={styles.reviewCard}><small>{t.confirm.status}</small><strong>{active ? t.confirm.online : t.confirm.draft}</strong></article><article className={styles.reviewCard}><small>{t.confirm.offer}</small><strong>{title}</strong></article><article className={styles.reviewCard}><small>{t.confirm.price}</small><strong>{(price / 100).toLocaleString()} €{comparePrice ? ` ${t.confirm.instead} ${(comparePrice / 100).toLocaleString()} €` : ""}</strong></article><article className={styles.reviewCard}><small>{t.confirm.cost}</small><strong>{t.confirm.costValue.replace("{cost}", String(cost)).replace("{balance}", String(balance))}{atLimit ? ` (${t.confirm.extra})` : ""}</strong></article></div>{!enough && <p className={styles.subtitle}>{t.confirm.missing.replace("{count}", String(cost - balance))} <Link href="/credits" style={{ textDecoration: "underline" }}>{t.confirm.recharge}</Link>.</p>}<div className={styles.confirm}><button className={styles.back} type="button" onClick={() => setStep(6)}><ArrowLeft aria-hidden="true" /> {t.confirm.edit}</button><button className={`flux-button-smooth ${styles.primary}`} type="button" disabled={pending || !enough} onClick={save}>{pending ? t.confirm.creating : t.confirm.create.replace("{cost}", String(cost))} <Check aria-hidden="true" /></button></div></Screen>}
      </main>

      {/* Pop-up d'entrée : limite d'offres de la formule atteinte. */}
      <Dialog open={gateOpen} onOpenChange={setGateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {enough
                ? t.limit.overTitle : t.limit.reachedTitle}
            </DialogTitle>
            <DialogDescription>
              {enough
                ? t.limit.over.replace("{limit}", String(limit)).replace("{count}", String(offerCount)).replace("{extra}", String(OFFER_EXTRA_COST)).replace("{normal}", String(OFFER_CREATE_COST))
                : t.limit.reached.replace("{limit}", String(limit)).replace("{count}", String(offerCount)).replace("{extra}", String(OFFER_EXTRA_COST)).replace("{balance}", String(balance))}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button asChild variant="ghost">
              <Link href="/offres">{t.limit.view}</Link>
            </Button>
            {enough ? (
              <Button onClick={() => setGateOpen(false)}>
                {t.limit.continue.replace("{cost}", String(OFFER_EXTRA_COST))}
              </Button>
            ) : (
              <Button asChild>
                <Link href="/credits">
                  <Coins aria-hidden="true" /> {t.limit.recharge}
                </Link>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Erreurs de débit à la confirmation. */}
      <Dialog open={creditsDialog !== null} onOpenChange={(next) => !next && setCreditsDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {creditsDialog === "subscription_required"
                ? t.credits.trialTitle : t.credits.insufficientTitle}
            </DialogTitle>
            <DialogDescription>
              {creditsDialog === "subscription_required"
                ? t.credits.trial : t.credits.insufficient.replace("{cost}", String(cost))}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreditsDialog(null)}>
              {t.credits.later}
            </Button>
            <Button asChild>
              <Link href={creditsDialog === "subscription_required" ? "/formules" : "/credits"}>
                {creditsDialog === "subscription_required"
                  ? t.credits.plan : t.credits.recharge}
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {step > 0 && step < 7 && <footer className={styles.controls}><button className={styles.back} type="button" onClick={() => setStep((current) => current - 1)}><ArrowLeft aria-hidden="true" /> {t.back}</button><button className={`flux-button-smooth ${styles.primary}`} type="button" disabled={!canContinue} onClick={() => setStep((current) => current + 1)}>{t.continue} <ArrowRight aria-hidden="true" /></button></footer>}
    </div>
  );
}

function Intro({ icon, kicker, cta, title, text, onNext }: { icon: React.ReactNode; kicker: string; cta: string; title: React.ReactNode; text: string; onNext: () => void }) {
  return <section className={styles.intro}><span className={styles.icon}>{icon}</span><p className={styles.kicker}>{kicker}</p><h1>{title}</h1><p>{text}</p><button className={`flux-button-smooth ${styles.primary}`} type="button" onClick={onNext}>{cta} <ArrowRight aria-hidden="true" /></button></section>;
}
function Screen({ kicker, title, subtitle, children }: { kicker: string; title: React.ReactNode; subtitle: string; children: React.ReactNode }) {
  return <section className={styles.screen}><p className={styles.kicker}>{kicker}</p><h1>{title}</h1><p className={styles.subtitle}>{subtitle}</p>{children}</section>;
}
function SingleField({ kicker, title, subtitle, label, value, placeholder, maxLength, onChange }: { kicker: string; title: string; subtitle: string; label: string; value: string; placeholder: string; maxLength: number; onChange: (value: string) => void }) {
  return <Screen kicker={kicker} title={title} subtitle={subtitle}><div className={styles.formGrid}><label className={styles.field}><span>{label}</span><input className={styles.input} value={value} maxLength={maxLength} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label></div></Screen>;
}
