import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TOOLS, PREFILL_COST } from "@/lib/tools-config";
import { PLAN_LABEL, PLAN_LIMITS, PUBLISH_COST } from "@/lib/plans";
import type { CreditEntry, Plan, Profile } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Mes crédits" };

const REASON_LABELS: Record<string, string> = {
  signup: "Crédits de bienvenue",
  monthly: "Ancienne recharge mensuelle",
  prefill: "Pré-remplissage IA",
};

function reasonLabel(reason: string): string {
  if (REASON_LABELS[reason]) return REASON_LABELS[reason];
  if (reason.startsWith("tool:")) {
    const tool = TOOLS.find((t) => t.slug === reason.slice(5));
    return tool?.name ?? reason.slice(5);
  }
  if (reason.startsWith("refund:")) return "Remboursement (génération échouée)";
  if (reason.startsWith("topup:")) {
    const plan = reason.slice(6) as Plan;
    return `Recharge formule ${PLAN_LABEL[plan] ?? plan}`;
  }
  if (reason.startsWith("publish:")) {
    const version = reason.split(":v")[1];
    return version
      ? `Publication de la version ${version} du site`
      : "Publication du site";
  }
  return reason;
}

export default async function CreditsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: balance }, { data: ledger }, { data: profile }] =
    await Promise.all([
      supabase.rpc("apply_plan_topup", { uid: user.id }),
      supabase
        .from("credit_ledger")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("profiles")
        .select("plan")
        .eq("user_id", user.id)
        .single<Pick<Profile, "plan">>(),
    ]);

  const plan = (profile?.plan ?? "free") as Plan;
  const monthlyCredits = PLAN_LIMITS[plan].monthlyCredits;
  const entries = (ledger ?? []) as CreditEntry[];

  // Prochaine recharge : uniquement sur formule payante, ancrée sur le dernier
  // topup de la formule courante.
  const lastTopup = entries.find((e) => e.reason === `topup:${plan}`);
  const nextRecharge =
    monthlyCredits > 0 && lastTopup
      ? new Date(
          new Date(lastTopup.created_at).getTime() + 30 * 86400_000
        ).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })
      : null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-1">Tes crédits</h1>
        <p className="text-muted-foreground">
          Ton carburant de création. 1 crédit ≈ 1 € : chaque action a un coût
          affiché avant de te lancer.
        </p>
      </div>

      <Card>
        <CardContent className="pt-1">
          <div className="flex items-end justify-between mb-1">
            <p className="text-5xl font-bold">
              {balance ?? 0}
              <span className="text-base font-normal text-muted-foreground">
                {" "}
                crédits
              </span>
            </p>
            {nextRecharge ? (
              <p className="text-sm text-muted-foreground">
                Recharge : le {nextRecharge}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Formule {PLAN_LABEL[plan]}
              </p>
            )}
          </div>
          {monthlyCredits === 0 && (
            <p className="text-sm text-muted-foreground">
              Envie de recharger ?{" "}
              <Link href="/formules" className="text-foreground underline">
                Découvre les formules FLUX
              </Link>
              .
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>La règle, en clair</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
            <li>
              <strong className="text-foreground">100 crédits offerts</strong> à
              la création de ton compte, pour créer ton site et essayer les
              outils.
            </li>
            <li>
              <strong className="text-foreground">1 crédit ≈ 1 €</strong> :
              chaque création, publication ou génération consomme des
              ressources réelles.
            </li>
            <li>
              Chaque action a un coût affiché{" "}
              <strong className="text-foreground">avant</strong> de lancer quoi
              que ce soit. Rien n&apos;est prélevé en douce.
            </li>
            <li>
              Tes crédits ne se perdent jamais : ce qu&apos;il te reste
              s&apos;ajoute aux recharges suivantes.
            </li>
            <li>
              {monthlyCredits > 0 ? (
                <>
                  Ta formule {PLAN_LABEL[plan]} recharge{" "}
                  <strong className="text-foreground">
                    +{monthlyCredits} crédits tous les 30 jours
                  </strong>
                  .
                </>
              ) : (
                <>
                  Besoin de plus ? Les{" "}
                  <Link href="/formules" className="text-foreground underline">
                    formules FLUX
                  </Link>{" "}
                  rechargent de 500 à 5000 crédits par mois.
                </>
              )}
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ce que coûte chaque action</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border text-sm">
            <li className="flex justify-between py-2">
              <span>Publication d&apos;une nouvelle version du site</span>
              <span className="font-medium">{PUBLISH_COST} cr.</span>
            </li>
            {TOOLS.map((tool) => (
              <li key={tool.slug} className="flex justify-between py-2">
                <span>{tool.name}</span>
                <span className="font-medium">{tool.cost} cr.</span>
              </li>
            ))}
            <li className="flex justify-between py-2">
              <span>Pré-remplissage « Compléter avec l&apos;IA »</span>
              <span className="font-medium">{PREFILL_COST} cr.</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>L&apos;historique</CardTitle>
          <CardDescription>Chaque mouvement, noir sur blanc.</CardDescription>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Rien pour l&apos;instant.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {entries
                .filter((e) => e.delta !== 0)
                .map((e) => (
                  <li key={e.id} className="flex justify-between gap-4 py-2">
                    <span className="text-muted-foreground">
                      {new Date(e.created_at).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </span>
                    <span className="flex-1">{reasonLabel(e.reason)}</span>
                    <span
                      className={
                        e.delta > 0 ? "text-emerald-400" : "text-red-bright"
                      }
                    >
                      {e.delta > 0 ? `+${e.delta}` : e.delta}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
