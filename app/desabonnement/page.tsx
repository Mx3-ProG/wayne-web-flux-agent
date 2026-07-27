import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Désinscription",
  robots: { index: false, follow: false },
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Désinscription en un clic depuis un lien email. Non authentifiée : le jeton
// opaque (uuid) fait foi. Idempotente côté RPC.
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
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
    ok: {
      title: "C’est fait ✅",
      body: "Vous ne recevrez plus nos emails. Vous pouvez vous réinscrire à tout moment.",
    },
    invalid: {
      title: "Lien invalide",
      body: "Ce lien de désinscription est incorrect ou a expiré. Contactez-nous si le problème persiste.",
    },
    error: {
      title: "Une erreur est survenue",
      body: "Nous n’avons pas pu traiter votre demande. Merci de réessayer dans un instant.",
    },
  }[status];

  return (
    <main
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
          <Link href="/">← Retour à l’accueil</Link>
        </p>
      </div>
    </main>
  );
}
