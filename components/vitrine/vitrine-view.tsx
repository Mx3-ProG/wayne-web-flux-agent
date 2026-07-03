"use client";

import { useState } from "react";
import Image from "next/image";
import type { Page, Service, ServiceFamily } from "@/lib/types";
import { formatDuration, formatPrice } from "@/lib/types";
import { getFont } from "@/lib/verticals";
import { defaultLegal } from "@/lib/legal";

export type FamilyWithServices = ServiceFamily & { services: Service[] };

type Props = {
  page: Page;
  families: FamilyWithServices[];
  onBook?: (service: Service) => void; // absent en préview éditeur
  poweredBy?: boolean;
};

// Vitrine publique du commerçant, aux couleurs qu'il a choisies.
// Utilisée en SSR sur /p/[slug] et en préview live dans l'éditeur.
export function VitrineView({ page, families, onBook, poweredBy = true }: Props) {
  const [openFamily, setOpenFamily] = useState<string | null>(null);
  const [legalOpen, setLegalOpen] = useState<string | null>(null);

  const colors = {
    primary: page.colors.primary || "#d31212",
    dark: page.colors.dark || "#0a0a0a",
    text: page.colors.text || "#1c1c1c",
  };
  const font = getFont(page.font);
  const legal = { ...defaultLegal(page.business_name), ...page.legal };

  const socials = Object.entries(page.socials || {}).filter(([, v]) => v);

  return (
    <div
      className="min-h-full flex flex-col bg-[#faf7f4]"
      style={{ fontFamily: font.css, color: colors.text }}
    >
      {/* Bandeau offre */}
      {page.offer && (
        <div
          className="text-center text-sm font-medium py-2 px-4 text-white"
          style={{ backgroundColor: colors.primary }}
        >
          {page.offer}
        </div>
      )}

      {/* Hero */}
      <header className="relative text-center px-6 pt-14 pb-12">
        {page.hero_url && (
          <>
            <Image
              src={page.hero_url}
              alt=""
              fill
              className="object-cover"
              sizes="100vw"
              priority
            />
            <div className="absolute inset-0 bg-black/45" />
          </>
        )}
        <div className={`relative ${page.hero_url ? "text-white" : ""}`}>
          {page.logo_url && (
            <Image
              src={page.logo_url}
              alt={page.business_name}
              width={88}
              height={88}
              className="mx-auto mb-5 rounded-full object-cover ring-4 ring-white/60 shadow-lg"
            />
          )}
          {(page.job_title || page.city) && (
            <p
              className="uppercase tracking-[0.25em] text-xs mb-3"
              style={{ color: page.hero_url ? undefined : colors.primary }}
            >
              {[page.job_title, page.city].filter(Boolean).join(" · ")}
            </p>
          )}
          <h1 className="text-4xl sm:text-5xl font-bold mb-3">
            {page.business_name || "Mon commerce"}
          </h1>
          {page.tagline && <p className="text-lg opacity-80">{page.tagline}</p>}
          <div className="mt-6">
            <span
              className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm bg-white/80 backdrop-blur"
              style={{ borderColor: colors.primary, color: colors.text }}
            >
              <span className="size-2 rounded-full bg-emerald-500" />
              Réservation en ligne
            </span>
          </div>
        </div>
      </header>

      {/* Prestations */}
      <section className="flex-1 px-4 sm:px-6 max-w-3xl w-full mx-auto pb-14">
        <h2 className="text-center text-2xl font-semibold mb-1">
          Mes prestations
        </h2>
        <div
          className="mx-auto mb-8 h-0.5 w-16"
          style={{ backgroundColor: colors.primary }}
        />
        {families.length === 0 && (
          <p className="text-center opacity-60 text-sm">
            Les prestations arrivent bientôt.
          </p>
        )}
        <div className="space-y-3">
          {families.map((family) => {
            const open = openFamily === family.id;
            return (
              <div key={family.id} className="rounded-xl bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setOpenFamily(open ? null : family.id)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                  aria-expanded={open}
                >
                  <span
                    className="uppercase tracking-widest text-sm font-semibold"
                    style={{ color: colors.primary }}
                  >
                    {family.name}
                  </span>
                  <span
                    className={`transition-transform ${open ? "rotate-180" : ""}`}
                    style={{ color: colors.primary }}
                  >
                    ⌄
                  </span>
                </button>
                {open && (
                  <ul className="px-5 pb-4 space-y-3">
                    {family.services.map((service) => (
                      <li
                        key={service.id}
                        className="flex items-center justify-between gap-4 rounded-lg border border-black/5 bg-[#faf7f4] px-4 py-3"
                      >
                        <div>
                          <p className="font-medium">{service.name}</p>
                          <p className="text-sm opacity-60">
                            {formatDuration(service.duration_min)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span
                            className="font-semibold"
                            style={{ color: colors.primary }}
                          >
                            {service.price_cents === 0
                              ? "Offert"
                              : formatPrice(service.price_cents)}
                          </span>
                          {onBook && (
                            <button
                              type="button"
                              onClick={() => onBook(service)}
                              className="rounded-lg px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                              style={{ backgroundColor: colors.primary }}
                            >
                              Réserver
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        {/* Galerie */}
        {page.gallery.length > 0 && (
          <div className="mt-12">
            <h2 className="text-center text-2xl font-semibold mb-6">
              Mon travail
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {page.gallery.map((photo, i) => (
                <figure key={i} className="relative aspect-square overflow-hidden rounded-xl">
                  <Image
                    src={photo.url}
                    alt={photo.title || `Photo ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, 33vw"
                  />
                  {photo.title && (
                    <figcaption className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-xs px-2 py-1">
                      {photo.title}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </div>
        )}

        {/* Avis */}
        {page.reviews.length > 0 && (
          <div className="mt-12">
            <h2 className="text-center text-2xl font-semibold mb-6">
              Ce qu'on dit de moi
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {page.reviews.map((review, i) => (
                <blockquote
                  key={i}
                  className="rounded-xl bg-white p-5 shadow-sm text-sm"
                >
                  <p className="mb-3" style={{ color: colors.primary }}>
                    ★★★★★
                  </p>
                  <p className="italic opacity-80">« {review.text} »</p>
                  <footer className="mt-3 font-medium">{review.author}</footer>
                </blockquote>
              ))}
            </div>
          </div>
        )}

        {/* Horaires */}
        {page.hours_text && (
          <div className="mt-12 text-center">
            <h2 className="text-2xl font-semibold mb-4">Mes horaires</h2>
            <pre
              className="inline-block text-left text-sm whitespace-pre-wrap rounded-xl bg-white px-6 py-4 shadow-sm"
              style={{ fontFamily: font.css }}
            >
              {page.hours_text}
            </pre>
          </div>
        )}

        {/* Adresse */}
        {(page.address || page.city) && (
          <p className="mt-12 text-center text-sm opacity-70">
            ⌖ {[page.address, page.city].filter(Boolean).join(" · ")}
          </p>
        )}
      </section>

      {/* Footer */}
      <footer
        className="text-white/90 px-6 py-10 text-center text-sm"
        style={{ backgroundColor: colors.dark }}
      >
        <p
          className="uppercase tracking-widest text-xs mb-4"
          style={{ color: colors.primary }}
        >
          Contact
        </p>
        {page.phone && (
          <p className="mb-2">
            <a href={`tel:${page.phone}`} className="underline-offset-4 hover:underline">
              {page.phone}
            </a>
          </p>
        )}
        {socials.length > 0 && (
          <p className="mb-4 space-x-3">
            {socials.map(([network, handle]) => (
              <span key={network} className="capitalize">
                {network} : {handle}
              </span>
            ))}
          </p>
        )}
        <p className="space-x-2 opacity-70">
          {(["mentions", "cgv", "confidentialite"] as const).map((key, i) => (
            <span key={key}>
              {i > 0 && " · "}
              <button
                type="button"
                className="underline underline-offset-4"
                onClick={() => setLegalOpen(key)}
              >
                {key === "mentions"
                  ? "Mentions légales"
                  : key === "cgv"
                    ? "CGV"
                    : "Confidentialité"}
              </button>
            </span>
          ))}
        </p>
        {poweredBy && (
          <p className="mt-6 text-xs opacity-60">
            Cette page a été créée gratuitement avec{" "}
            <a href="/" className="font-semibold underline underline-offset-4">
              Wayne Web Flux
            </a>
            . Créez la vôtre en quelques minutes.
          </p>
        )}
      </footer>

      {/* Modale légale */}
      {legalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setLegalOpen(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-semibold">
                {legalOpen === "mentions"
                  ? "Mentions légales"
                  : legalOpen === "cgv"
                    ? "Conditions générales de vente"
                    : "Politique de confidentialité"}
              </h3>
              <button
                type="button"
                onClick={() => setLegalOpen(null)}
                aria-label="Fermer"
                className="text-xl leading-none opacity-60 hover:opacity-100"
              >
                ×
              </button>
            </div>
            <pre className="whitespace-pre-wrap font-[inherit]">
              {legal[legalOpen as keyof typeof legal]}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
