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

const KINDS: { value: OfferKind; title: string; text: string; icon: typeof Package }[] = [
  { value: "produit", title: "Une offre produit", text: "Un article ou un pack à commander.", icon: Package },
  { value: "service", title: "Une offre service", text: "Une prestation mise en avant.", icon: Users },
  { value: "evenement", title: "Un événement", text: "Une expérience avec une date ou une capacité.", icon: Ticket },
];

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
        toast.error(result.error);
        return;
      }
      toast.success("Ton offre est prête. Publie une nouvelle version de ton site pour la mettre en ligne.");
      router.push("/offres");
      router.refresh();
    });
  }

  return (
    <div className={styles.tunnel}>
      <header className={styles.header}>
        <Link href="/espace" className={styles.brand}><FluxBrand /></Link>
        <div className={styles.progressMeta}><span>Étape {step + 1} sur 8</span><div className={styles.progress}><i style={{ width: `${progress}%` }} /></div></div>
        <Link href="/offres" className={styles.exit}>Mes offres</Link>
      </header>

      <main className={styles.stage}>
        {step === 0 && <Intro icon={<BadgePercent aria-hidden="true" />} title={<>Crée une offre qui donne envie de <em>passer à l’action.</em></>} text="Flux t’aide à présenter la bonne promesse, au bon prix, directement sur ta vitrine." onNext={() => setStep(1)} />}
        {step === 1 && <Screen kicker="Le format" title={<>Qu’est-ce que tu veux <em>mettre en avant ?</em></>} subtitle="Choisis le type qui correspond le mieux à ton offre."><div className={styles.choiceGrid}>{KINDS.map((item) => { const Icon = item.icon; const selected = kind === item.value; return <button type="button" key={item.value} className={selected ? styles.choiceActive : styles.choice} onClick={() => setKind(item.value)}><Icon aria-hidden="true" /><strong>{item.title}</strong><small>{item.text}</small>{selected && <Check aria-hidden="true" />}</button>; })}</div></Screen>}
        {step === 2 && <SingleField kicker="La promesse" title="Comment s’appelle ton offre ?" subtitle="Un titre court qui se comprend immédiatement." label="Titre de l’offre" value={title} placeholder="Ex : Pack découverte" maxLength={80} onChange={setTitle} />}
        {step === 3 && <Screen kicker="Le prix" title={<>Quelle valeur veux-tu <em>afficher ?</em></>} subtitle="Ajoute un prix barré uniquement si l’offre représente une vraie promotion."><div className={styles.formGrid}><label className={styles.field}><span>Prix de l’offre (€)</span><PriceInput className={styles.input} cents={price} placeholder="Ex : 49" onCents={(c) => setPrice(c)} /></label><label className={styles.field}><span>Prix initial barré (€) · facultatif</span><PriceInput className={styles.input} cents={comparePrice ?? 0} placeholder="Ex : 120" onCents={(c) => setComparePrice(c === 0 ? null : c)} /></label></div></Screen>}
        {step === 4 && <Screen kicker="Le bénéfice" title="Pourquoi ton client doit-il la choisir ?" subtitle="Décris simplement ce qui est inclus et ce que le client y gagne."><div className={styles.formGrid}><label className={styles.field}><span>Description</span><textarea className={styles.textarea} value={description} maxLength={300} placeholder="Ce que comprend l’offre, son avantage, sa limite…" onChange={(event) => setDescription(event.target.value)} /></label></div></Screen>}
        {step === 5 && <Screen kicker="La photo" title={<>Donne une image forte à ton <em>offre.</em></>} subtitle="La photo est facultative, mais elle aide l’offre à ressortir."><div className={styles.photoGrid}><article className={styles.photoCard}>{imageUrl && <Image src={imageUrl} width={520} height={240} unoptimized alt="" />}<PhotoUpload userId={userId} label={imageUrl ? "Changer la photo" : "Ajouter une photo"} onUploaded={setImageUrl} /></article></div></Screen>}
        {step === 6 && <Screen kicker="La mise en ligne" title="Ton offre est-elle prête à sortir ?" subtitle="Tu peux la publier maintenant ou la garder en brouillon."><div className={styles.choiceGrid}><button type="button" className={active ? styles.choiceActive : styles.choice} onClick={() => setActive(true)}><Check aria-hidden="true" /><strong>Mettre en ligne</strong><small>Visible sur ta vitrine à la prochaine publication.</small></button><button type="button" className={!active ? styles.choiceActive : styles.choice} onClick={() => setActive(false)}><Sparkles aria-hidden="true" /><strong>Garder en brouillon</strong><small>Prête à être retravaillée plus tard.</small></button></div></Screen>}
        {step === 7 && <Screen kicker="Confirmation" title={<>Ton offre est prête à <em>convertir.</em></>} subtitle="Vérifie les informations avant de la créer."><div className={styles.reviewGrid}><article className={styles.reviewCard}><small>Type</small><strong>{KINDS.find((item) => item.value === kind)?.title}</strong></article><article className={styles.reviewCard}><small>Statut</small><strong>{active ? "En ligne" : "Brouillon"}</strong></article><article className={styles.reviewCard}><small>Offre</small><strong>{title}</strong></article><article className={styles.reviewCard}><small>Prix</small><strong>{(price / 100).toLocaleString("fr-FR")} €{comparePrice ? ` au lieu de ${(comparePrice / 100).toLocaleString("fr-FR")} €` : ""}</strong></article><article className={styles.reviewCard}><small>Coût de création</small><strong>{cost} crédits{atLimit ? " (au-delà de ta formule)" : ""} · solde : {balance} cr.</strong></article></div>{!enough && <p className={styles.subtitle}>Il te manque {cost - balance} crédit{cost - balance > 1 ? "s" : ""} pour créer cette offre. <Link href="/credits" style={{ textDecoration: "underline" }}>Recharge tes crédits</Link>.</p>}<div className={styles.confirm}><button className={styles.back} type="button" onClick={() => setStep(6)}><ArrowLeft aria-hidden="true" /> Modifier</button><button className={`flux-button-smooth ${styles.primary}`} type="button" disabled={pending || !enough} onClick={save}>{pending ? "Création…" : `Confirmer et créer (${cost} cr.)`} <Check aria-hidden="true" /></button></div></Screen>}
      </main>

      {/* Pop-up d'entrée : limite d'offres de la formule atteinte. */}
      <Dialog open={gateOpen} onOpenChange={setGateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {enough
                ? "Tu dépasses la limite de ta formule"
                : "Limite de ta formule atteinte"}
            </DialogTitle>
            <DialogDescription>
              {enough
                ? `Ta formule inclut ${limit} offre${limit > 1 ? "s" : ""} et tu en as déjà ${offerCount}. Tu peux quand même créer celle-ci : elle coûtera ${OFFER_EXTRA_COST} crédits (au lieu de ${OFFER_CREATE_COST}).`
                : `Ta formule inclut ${limit} offre${limit > 1 ? "s" : ""} et tu en as déjà ${offerCount}. Recharge tes crédits pour continuer : une offre au-delà de ta formule coûte ${OFFER_EXTRA_COST} crédits, et il t'en reste ${balance}.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button asChild variant="ghost">
              <Link href="/offres">Voir mes offres</Link>
            </Button>
            {enough ? (
              <Button onClick={() => setGateOpen(false)}>
                Continuer ({OFFER_EXTRA_COST} cr.)
              </Button>
            ) : (
              <Button asChild>
                <Link href="/credits">
                  <Coins aria-hidden="true" /> Recharger mes crédits
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
                ? "Essai terminé et solde vide"
                : "Plus assez de crédits"}
            </DialogTitle>
            <DialogDescription>
              {creditsDialog === "subscription_required"
                ? "Ton essai est passé et il ne te reste plus de crédits. Une formule FLUX recharge ton solde chaque mois et rouvre les générations IA — ton offre est prête, rien n'est perdu."
                : `Créer cette offre coûte ${cost} crédits. Recharge tes crédits pour finaliser — ton offre est prête, rien n'est perdu.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreditsDialog(null)}>
              Plus tard
            </Button>
            <Button asChild>
              <Link href={creditsDialog === "subscription_required" ? "/formules" : "/credits"}>
                {creditsDialog === "subscription_required"
                  ? "Choisir ma formule FLUX"
                  : "Recharger mes crédits"}
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {step > 0 && step < 7 && <footer className={styles.controls}><button className={styles.back} type="button" onClick={() => setStep((current) => current - 1)}><ArrowLeft aria-hidden="true" /> Retour</button><button className={`flux-button-smooth ${styles.primary}`} type="button" disabled={!canContinue} onClick={() => setStep((current) => current + 1)}>Continuer <ArrowRight aria-hidden="true" /></button></footer>}
    </div>
  );
}

function Intro({ icon, title, text, onNext }: { icon: React.ReactNode; title: React.ReactNode; text: string; onNext: () => void }) {
  return <section className={styles.intro}><span className={styles.icon}>{icon}</span><p className={styles.kicker}>Création d’offre FLUX</p><h1>{title}</h1><p>{text}</p><button className={`flux-button-smooth ${styles.primary}`} type="button" onClick={onNext}>Créer mon offre <ArrowRight aria-hidden="true" /></button></section>;
}
function Screen({ kicker, title, subtitle, children }: { kicker: string; title: React.ReactNode; subtitle: string; children: React.ReactNode }) {
  return <section className={styles.screen}><p className={styles.kicker}>{kicker}</p><h1>{title}</h1><p className={styles.subtitle}>{subtitle}</p>{children}</section>;
}
function SingleField({ kicker, title, subtitle, label, value, placeholder, maxLength, onChange }: { kicker: string; title: string; subtitle: string; label: string; value: string; placeholder: string; maxLength: number; onChange: (value: string) => void }) {
  return <Screen kicker={kicker} title={title} subtitle={subtitle}><div className={styles.formGrid}><label className={styles.field}><span>{label}</span><input className={styles.input} value={value} maxLength={maxLength} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label></div></Screen>;
}
