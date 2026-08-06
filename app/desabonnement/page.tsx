import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  defaultLocale,
  hasLocale,
  LOCALE_BCP47,
  LOCALE_COOKIE,
  type Locale,
} from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}): Promise<Metadata> {
  const { lang } = await searchParams;
  const t = (await getDictionary(await resolveLocale(lang), "common")).unsubscribe;
  return { title: t.metaTitle, robots: { index: false, follow: false } };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// La page n'est pas dans LOCALIZED_PATHS (proxy.ts) : aucun header x-locale
// n'arrive ici. La langue vient donc du lien lui-même — les emails, qui
// connaissent la langue du destinataire, doivent ajouter `&lang=xx` — puis du
// cookie de langue, puis du français. Un lien de désinscription illisible est
// un lien sur lequel on ne clique pas.
async function resolveLocale(lang: string | undefined): Promise<Locale> {
  if (lang && hasLocale(lang)) return lang;
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  return cookieLocale && hasLocale(cookieLocale) ? cookieLocale : defaultLocale;
}

// Désinscription en un clic depuis un lien email. Non authentifiée : le jeton
// opaque (uuid) fait foi. Idempotente côté RPC.
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; lang?: string }>;
}) {
  const { token, lang } = await searchParams;
  const locale = await resolveLocale(lang);
  const t = (await getDictionary(locale, "common")).unsubscribe;
  let status: "ok" | "invalid" | "error" = "invalid";

  if (token && UUID_RE.test(token)) {
    try {
      const admin = createAdminClient();
      const { data, error } = await admin.rpc("unsubscribe_by_token", { token });
      status = error ? "error" : data ? "ok" : "invalid";
    } catch {
      status = "error";
    }
  }

  const messages = {
    ok: { title: t.okTitle, body: t.okBody },
    invalid: { title: t.invalidTitle, body: t.invalidBody },
    error: { title: t.errorTitle, body: t.errorBody },
  }[status];

  return (
    <main
      lang={LOCALE_BCP47[locale]}
      dir={locale === "ar" ? "rtl" : undefined}
      style={{
        minHeight: "70vh",
        display: "grid",
        placeItems: "center",
        padding: "48px 24px",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 460 }}>
        <h1 style={{ fontSize: "1.6rem", marginBottom: 12 }}>{messages.title}</h1>
        <p style={{ opacity: 0.8, lineHeight: 1.6 }}>{messages.body}</p>
        <p style={{ marginTop: 28 }}>
          <Link href="/">{t.backHome}</Link>
        </p>
      </div>
    </main>
  );
}
