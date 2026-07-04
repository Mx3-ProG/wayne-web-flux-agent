"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import type { Offer, OfferKind, Plan } from "@/lib/types";
import { PLAN_LABEL } from "@/lib/plans";
import { PhotoUpload } from "@/components/editor/photo-upload";
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
import { Lock, Sparkles, Trash2 } from "lucide-react";
import { createOffer, deleteOffer, updateOffer } from "./actions";
import styles from "./offres.module.css";

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
};

export function OffersManager({ initialOffers, userId, plan, limit }: Props) {
  const [offers, setOffers] = useState<Offer[]>(initialOffers);
  const [pending, startTransition] = useTransition();
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const used = offers.length;
  const atLimit = used >= limit;

  function patch(id: string, fields: Partial<Offer>) {
    setOffers((prev) => prev.map((o) => (o.id === id ? { ...o, ...fields } : o)));
    if (timers.current[id]) clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(async () => {
      const result = await updateOffer(id, fields);
      if (result.error) toast.error(result.error);
    }, 700);
  }

  function add() {
    startTransition(async () => {
      const result = await createOffer();
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
          created_at: "",
        },
      ]);
    });
  }

  function remove(id: string) {
    setOffers((prev) => prev.filter((o) => o.id !== id));
    startTransition(async () => {
      const result = await deleteOffer(id);
      if (result.error) toast.error(result.error);
    });
  }

  return (
    <>
      <div className={styles.counter}>
        <b>{used}</b> / {limit} offre{limit > 1 ? "s" : ""} — forfait {PLAN_LABEL[plan]}
      </div>

      <div className={styles.grid}>
        {offers.map((offer) => (
          <article key={offer.id} className={styles.card}>
            <div className={styles.cardHead}>
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

            <div className={styles.field}>
              <Label>Titre</Label>
              <Input
                value={offer.title}
                maxLength={80}
                placeholder="Ex : Pack révision hiver"
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
                onChange={(e) => patch(offer.id, { description: e.target.value })}
              />
            </div>

            <div className={styles.prices}>
              <div className={styles.field}>
                <Label>Prix (€)</Label>
                <PriceInput
                  cents={offer.price_cents}
                  placeholder="0"
                  onCents={(c) => patch(offer.id, { price_cents: c })}
                />
              </div>
              <div className={styles.field}>
                <Label>Prix barré (€, promo)</Label>
                <PriceInput
                  cents={offer.compare_at_cents ?? 0}
                  placeholder="—"
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
        ))}

        {!atLimit && (
          <button
            type="button"
            className={styles.addCard}
            onClick={add}
            disabled={pending}
          >
            <Sparkles aria-hidden="true" />
            <span>Nouvelle offre</span>
          </button>
        )}

        {plan === "free" && (
          <div className={styles.upsell}>
            <Lock aria-hidden="true" />
            <strong>Forfait Plus</strong>
            <p>Jusqu&apos;à 5 offres en avant sur ta vitrine, et bien plus.</p>
            <Button variant="secondary" size="sm" disabled title="Bientôt disponible">
              Passer au forfait Plus (bientôt)
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
