import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Offer, Page, Plan } from "@/lib/types";
import { offerLimit } from "@/lib/plans";
import { OffersManager } from "./offers-manager";
import styles from "./offres.module.css";

export const metadata = { title: "Mes offres" };

export default async function OffresPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: page }] = await Promise.all([
    supabase.from("profiles").select("plan").eq("user_id", user.id).single(),
    supabase.from("pages").select("id").eq("user_id", user.id).maybeSingle<Pick<Page, "id">>(),
  ]);

  let offers: Offer[] = [];
  if (page) {
    const { data } = await supabase
      .from("offers")
      .select("*")
      .eq("page_id", page.id)
      .order("position");
    offers = (data ?? []) as Offer[];
  }

  const plan = (profile?.plan as Plan) ?? "free";

  return (
    <div className={styles.page}>
      <p className={styles.eyebrow}>Ta vitrine</p>
      <h1 className={styles.title}>Mes offres</h1>
      <p className={styles.subtitle}>
        Tes promos mises en avant en grand tout en haut de ta vitrine. Un client
        clique, il commande, tu reçois la commande dans ton espace.
      </p>

      {!page ? (
        <div className={styles.empty}>
          Crée d&apos;abord ta <Link href="/ma-page">vitrine</Link> pour ajouter des
          offres.
        </div>
      ) : (
        <OffersManager
          initialOffers={offers}
          userId={user.id}
          plan={plan}
          limit={offerLimit(plan)}
        />
      )}
    </div>
  );
}
