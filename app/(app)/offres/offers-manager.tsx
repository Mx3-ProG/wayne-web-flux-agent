"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import type { Offer, OfferKind, Plan } from "@/lib/types";
import { OFFER_CREATE_COST, OFFER_EXTRA_COST, PLAN_LABEL } from "@/lib/plans";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PhotoUpload } from "@/components/editor/photo-upload";
import { PublishButton } from "@/components/editor/publish-button";
import { Input } from "@/components/ui/input";
import { PriceInput } from "@/components/ui/price-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BadgePercent,
  Lock,
  Megaphone,
  Plus,
  Rocket,
  Trash2,
  Undo2,
} from "lucide-react";
import { createOffer, deleteOffer, restoreOffer, updateOffer } from "./actions";
import styles from "./offres-redesign.module.css";

const KINDS: { value: OfferKind; label: string }[] = [
  { value: "produit", label: "Produit" },
  { value: "service", label: "Service" },
  { value: "evenement", label: "Événement" },
];

type Props = {
  initialOffers: Offer[];
  userId: string;
  plan: Plan;
  limit: number;
  pageId: string;
  balance: number;
  nextVersion: number;
  // La vitrine (/ma-page) a-t-elle aussi un brouillon en attente ?
  pageHasDraft: boolean;
};

export function OffersManager({
  initialOffers,
  userId,
  plan,
  limit,
  pageId,
  balance,
  nextVersion,
  pageHasDraft,
}: Props) {
  // Vue fusionnée : état publié + brouillon par offre. Les modifications
  // restent en brouillon jusqu'à la publication d'une version du site.
  const [offers, setOffers] = useState<Offer[]>(
    initialOffers.map((o) => ({ ...o, ...(o.draft ?? {}) }))
  );
  const [pending, startTransition] = useTransition();
  const [creditsDialog, setCreditsDialog] = useState<
    "insufficient_credits" | "subscription_required" | null
  >(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const alive = offers.filter((o) => o.draft_status !== "deleted");
  const used = alive.length;
  const atLimit = used >= limit;
  // Créer une offre coûte des crédits ; au-delà de la formule, tarif majoré.
  const createCost = atLimit ? OFFER_EXTRA_COST : OFFER_CREATE_COST;
  const hasPending =
    pageHasDraft || offers.some((o) => o.draft != null || o.draft_status != null);

  function patch(id: string, fields: Partial<Offer>) {
    setOffers((prev) =>
      prev.map((o) =>
        o.id === id
          ? {
              ...o,
              ...fields,
              // Hors création : les champs modifiés vivent dans le brouillon.
              draft:
                o.draft_status === "new"
                  ? o.draft
                  : { ...(o.draft ?? {}), ...fields },
            }
          : o
      )
    );
    if (timers.current[id]) clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(async () => {
      const result = await updateOffer(id, fields);
      if (result.error) toast.error(result.error);
    }, 700);
  }

  function add() {
    startTransition(async () => {
      const result = await createOffer();
      if (
        result.error === "insufficient_credits" ||
        result.error === "subscription_required"
      ) {
        setCreditsDialog(result.error);
        return;
      }
      if (result.error || !result.id) {
        toast.error(result.error ?? "Création impossible.");
        return;
      }
      // Ajout local (pas de reload → on garde focus et édits en cours).
      setOffers((prev) => [
        ...prev,
        {
          id: result.id!,
          page_id: "",
          title: "Nouvelle offre",
          description: "",
          image_url: null,
          kind: "produit",
          price_cents: 0,
          compare_at_cents: null,
          active: true,
          position: prev.length,
          draft: null,
          draft_status: "new",
          created_at: "",
        },
      ]);
    });
  }

  function remove(id: string) {
    const offer = offers.find((o) => o.id === id);
    if (offer?.draft_status === "new") {
      // Jamais publiée : disparaît immédiatement.
      setOffers((prev) => prev.filter((o) => o.id !== id));
    } else {
      // Publiée : suppression différée, visible en public jusqu'au publish.
      setOffers((prev) =>
        prev.map((o) => (o.id === id ? { ...o, draft_status: "deleted" } : o))
      );
    }
    startTransition(async () => {
      const result = await deleteOffer(id);
      if (result.error) toast.error(result.error);
    });
  }

  function restore(id: string) {
    setOffers((prev) =>
      prev.map((o) => (o.id === id ? { ...o, draft_status: null } : o))
    );
    startTransition(async () => {
      const result = await restoreOffer(id);
      if (result.error) toast.error(result.error);
    });
  }

  function statusBadge(offer: Offer): string | null {
    if (offer.draft_status === "new") return "Non publiée";
    if (offer.draft_status === "deleted") return "Sera supprimée à la publication";
    if (offer.draft != null) return "Modifications non publiées";
    return null;
  }

  return (
    <>
      <section className={styles.controlPanel}>
        <div className={styles.counter}>
          <span>Capacité commerciale</span>
          <strong>
            {used}<small> / {limit}</small>
          </strong>
          <p>Formule {PLAN_LABEL[plan]}</p>
        </div>

        <div className={styles.publishBlock}>
          <PublishButton
            pageId={pageId}
            balance={balance}
            hasDraft={hasPending}
            nextVersion={nextVersion}
          />
          <p>
            {hasPending
              ? "Tes clients voient encore l'ancienne version de ta vitrine."
              : "Ta vitrine est alignée avec tes offres actuelles."}
          </p>
        </div>
      </section>

      <div className={styles.grid}>
        {offers.map((offer) =>
          offer.draft_status === "deleted" ? (
            <article
              key={offer.id}
              className={`${styles.card} ${styles.deletedCard}`}
            >
              <div className={styles.cardHead}>
                <span className={styles.cardIcon}>
                  <Trash2 aria-hidden="true" />
                </span>
                <strong className={styles.offerTitle}>{offer.title}</strong>
              </div>
              <p className={styles.deletedText}>
                Sera supprimée à la prochaine publication. En attendant, elle
                reste visible sur ta vitrine.
              </p>
              <Button variant="secondary" size="sm" onClick={() => restore(offer.id)}>
                <Undo2 aria-hidden="true" /> Annuler la suppression
              </Button>
            </article>
          ) : (
            <article key={offer.id} className={styles.card}>
              {statusBadge(offer) && (
                <p className={styles.status}>
                  {statusBadge(offer)}
                </p>
              )}
              <div className={styles.cardHead}>
                <span className={styles.cardIcon}>
                  <BadgePercent aria-hidden="true" />
                </span>
                <Select
                  value={offer.kind}
                  onValueChange={(kind) => patch(offer.id, { kind: kind as OfferKind })}
                >
                  <SelectTrigger className={styles.kindSelect}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KINDS.map((k) => (
                      <SelectItem key={k.value} value={k.value}>
                        {k.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={offer.active}
                    onChange={(e) => patch(offer.id, { active: e.target.checked })}
                  />
                  {offer.active ? "En ligne" : "Masquée"}
                </label>
                <button
                  type="button"
                  className={styles.delete}
                  aria-label="Supprimer l'offre"
                  onClick={() => remove(offer.id)}
                >
                  <Trash2 aria-hidden="true" />
                </button>
              </div>

              <div className={styles.salesCue}>
                <Megaphone aria-hidden="true" />
                <span>Promesse visible en haut de vitrine</span>
              </div>

              <div className={styles.field}>
                <Label>Titre</Label>
                <Input
                  value={offer.title}
                  maxLength={80}
                  placeholder="Ex : Pack révision hiver"
                  className={styles.input}
                  onChange={(e) => patch(offer.id, { title: e.target.value })}
                />
              </div>

              <div className={styles.field}>
                <Label>Description</Label>
                <Textarea
                  value={offer.description}
                  rows={2}
                  maxLength={300}
                  placeholder="Ce que comprend l'offre"
                  className={styles.textarea}
                  onChange={(e) => patch(offer.id, { description: e.target.value })}
                />
              </div>

              <div className={styles.prices}>
                <div className={styles.field}>
                  <Label>Prix (€)</Label>
                  <PriceInput
                    cents={offer.price_cents}
                    placeholder="0"
                    className={styles.input}
                    onCents={(c) => patch(offer.id, { price_cents: c })}
                  />
                </div>
                <div className={styles.field}>
                  <Label>Prix barré (€, promo)</Label>
                  <PriceInput
                    cents={offer.compare_at_cents ?? 0}
                    placeholder="—"
                    className={styles.input}
                    onCents={(c) => patch(offer.id, { compare_at_cents: c === 0 ? null : c })}
                  />
                </div>
              </div>

              <div className={styles.field}>
                <Label>Photo (facultatif)</Label>
                <div className={styles.photoRow}>
                  <PhotoUpload
                    userId={userId}
                    label={offer.image_url ? "Changer la photo" : "Ajouter une photo"}
                    onUploaded={(url) => patch(offer.id, { image_url: url })}
                  />
                  {offer.image_url && (
                    <button
                      type="button"
                      className={styles.removePhoto}
                      onClick={() => patch(offer.id, { image_url: null })}
                    >
                      retirer
                    </button>
                  )}
                </div>
              </div>
            </article>
          )
        )}

        <button
          type="button"
          className={`flux-button-smooth ${styles.addCard}`}
          onClick={add}
          disabled={pending}
        >
          <span className={styles.addIcon}>
            <Plus aria-hidden="true" />
          </span>
          <small>{atLimit ? "Au-delà de ta formule" : "Nouvelle tentation"}</small>
          <span>Créer une offre · {createCost} cr.</span>
        </button>

        {plan === "basique" && (
          <div className={styles.upsell}>
            <Lock aria-hidden="true" />
            <strong>Formules FLUX</strong>
            <p>Jusqu&apos;à 30 offres en avant sur ta vitrine, plus de crédits chaque mois, plus de personnalisation.</p>
            <Button asChild variant="secondary" size="sm">
              <a href="/formules">
                <Rocket aria-hidden="true" />
                Découvrir les formules
              </a>
            </Button>
          </div>
        )}
      </div>

      <Dialog
        open={creditsDialog !== null}
        onOpenChange={(next) => !next && setCreditsDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {creditsDialog === "subscription_required"
                ? "Ton essai est terminé"
                : "Plus assez de crédits"}
            </DialogTitle>
            <DialogDescription>
              {creditsDialog === "subscription_required"
                ? "Tes 7 jours d'essai FLUX sont passés. Choisis une formule pour continuer à créer des offres."
                : `Créer une offre coûte ${createCost} crédits et il t'en reste ${balance}. Recharge tes crédits pour continuer.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreditsDialog(null)}>
              Plus tard
            </Button>
            <Button asChild>
              <Link
                href={
                  creditsDialog === "subscription_required"
                    ? "/formules"
                    : "/credits"
                }
              >
                {creditsDialog === "subscription_required"
                  ? "Choisir ma formule FLUX"
                  : "Recharger mes crédits"}
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
