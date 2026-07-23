"use client";

import { useState } from "react";
import { submitGuestOrder } from "@/lib/guest-order";
import { formatPrice } from "@/lib/types";
import type { StorefrontDict } from "@/lib/i18n/get-dictionary";
import frStorefront from "@/lib/i18n/dictionaries/fr/storefront.json";

// Ligne de panier générique : produit OU offre. La clé de panier est
// `${kind}:${id}` pour éviter les collisions d'ids entre tables.
export type CartLine = {
  kind: "product" | "offer";
  id: string;
  name: string;
  price_cents: number;
  quantity: number;
};

type Props = {
  pageId: string;
  items: CartLine[];
  accentColor: string;
  designId?: string;
  buttonDesignId?: string;
  onSetQty: (kind: CartLine["kind"], id: string, quantity: number) => void;
  onClose: () => void;
  onDone: () => void;
  t?: StorefrontDict["order"];
};

// Commande sans paiement : panier → coordonnées → confirmation. Sans compte.
export function OrderModal({ pageId, items, accentColor, designId, buttonDesignId, onSetQty, onClose, onDone, t = frStorefront.order }: Props) {
  const [step, setStep] = useState<"cart" | "form" | "done">("cart");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const total = items.reduce((sum, it) => sum + it.price_cents * it.quantity, 0);
  const count = items.reduce((sum, it) => sum + it.quantity, 0);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    // Lecture synchrone : après un await, e.currentTarget peut être null.
    const form = new FormData(e.currentTarget);
    setSubmitting(true);
    try {
      await submitGuestOrder({
        pageId,
        firstName: String(form.get("first_name") ?? "").trim(),
        phone: String(form.get("phone") ?? "").trim(),
        email: String(form.get("email") ?? "").trim() || undefined,
        address: String(form.get("address") ?? "").trim() || undefined,
        note: String(form.get("note") ?? "").trim() || undefined,
        items: items.map((it) =>
          it.kind === "offer"
            ? { offer_id: it.id, quantity: it.quantity }
            : { product_id: it.id, quantity: it.quantity }
        ),
      });
      setSubmitting(false);
      setStep("done");
      return;
    } catch {
      setSubmitting(false);
      setError(t.submitError);
    }
  }

  return (
    <div
      data-design-order={designId}
      data-design-button={buttonDesignId}
      style={{ "--flux-button-accent": accentColor } as React.CSSProperties}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-3 backdrop-blur-md sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md max-h-[88svh] overflow-y-auto rounded-[28px] border border-white/60 bg-[#faf7f4]/95 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-[#1c1c1c] shadow-[0_30px_100px_rgb(0_0_0_/_55%)] backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-xl font-semibold">
            {step === "done" ? t.orderSent : t.myOrder}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="text-2xl leading-none opacity-50 hover:opacity-100"
          >
            ×
          </button>
        </div>
        {step !== "done" && (
          <p className="text-sm opacity-60 mb-5">
            {count} {count > 1 ? t.itemPlural : t.itemSingular} · {formatPrice(total)}
          </p>
        )}

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        {step === "cart" && (
          <>
            <ul className="space-y-2 mb-4">
              {items.map((line) => (
                <li
                  key={`${line.kind}:${line.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-black/5 bg-white/80 px-4 py-3 shadow-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{line.name}</p>
                    <p className="text-sm opacity-60">{formatPrice(line.price_cents)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={t.removeOne}
                      onClick={() => onSetQty(line.kind, line.id, line.quantity - 1)}
                      className="grid h-8 w-8 place-items-center rounded-full border border-black/10 bg-white text-lg leading-none"
                    >
                      −
                    </button>
                    <span className="w-5 text-center font-medium">{line.quantity}</span>
                    <button
                      type="button"
                      aria-label={t.addOne}
                      onClick={() => onSetQty(line.kind, line.id, line.quantity + 1)}
                      className="grid h-8 w-8 place-items-center rounded-full border border-black/10 bg-white text-lg leading-none"
                    >
                      +
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            {items.length === 0 ? (
              <p className="text-sm opacity-60">{t.cartEmpty}</p>
            ) : (
              <button
                data-vitrine-action
                type="button"
                onClick={() => setStep("form")}
                className="w-full rounded-xl px-4 py-3 font-medium text-white"
                style={{ backgroundColor: accentColor }}
              >
                {t.continue} · {formatPrice(total)}
              </button>
            )}
          </>
        )}

        {step === "form" && (
          <form onSubmit={submit} className="space-y-3">
            <button
              type="button"
              className="text-sm underline underline-offset-4"
              onClick={() => setStep("cart")}
            >
              {t.backToCart}
            </button>
            <p className="font-medium">{t.yourDetails}</p>
            <input
              name="first_name"
              required
              maxLength={60}
              placeholder={t.firstNamePlaceholder}
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5"
            />
            <input
              name="phone"
              required
              type="tel"
              pattern="[+0-9 \(\)\.\-]{6,20}"
              placeholder={t.phonePlaceholder}
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5"
            />
            <input
              name="email"
              type="email"
              placeholder={t.emailPlaceholder}
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5"
            />
            <input
              name="address"
              maxLength={240}
              placeholder={t.addressPlaceholder}
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5"
            />
            <textarea
              name="note"
              maxLength={500}
              rows={2}
              placeholder={t.notePlaceholder}
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5"
            />
            <p className="text-xs opacity-60">{t.contactHint}</p>
            <button
              data-vitrine-action
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl px-4 py-3 font-medium text-white disabled:opacity-60"
              style={{ backgroundColor: accentColor }}
            >
              {submitting ? t.sending : `${t.sendOrder} · ${formatPrice(total)}`}
            </button>
          </form>
        )}

        {step === "done" && (
          <div className="text-center py-6">
            <p className="text-4xl mb-3">✓</p>
            <p className="font-semibold mb-1">{t.thanks}</p>
            <p className="text-sm opacity-70">
              {t.transmitted}
              <br />
              {t.willContact}
            </p>
            <button
              data-vitrine-action
              type="button"
              onClick={() => {
                onDone();
                onClose();
              }}
              className="mt-5 rounded-xl px-5 py-2.5 font-medium text-white"
              style={{ backgroundColor: accentColor }}
            >
              {t.close}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
