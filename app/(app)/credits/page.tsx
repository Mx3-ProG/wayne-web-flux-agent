import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TOOLS, PREFILL_COST } from "@/lib/tools-config";
import type { CreditEntry } from "@/lib/types";
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
  monthly: "Recharge mensuelle",
  prefill: "Pré-remplissage IA",
};

function reasonLabel(reason: string): string {
  if (REASON_LABELS[reason]) return REASON_LABELS[reason];
  if (reason.startsWith("tool:")) {
    const tool = TOOLS.find((t) => t.slug === reason.slice(5));
    return tool?.name ?? reason.slice(5);
  }
  if (reason.startsWith("refund:")) return "Remboursement (génération échouée)";
  return reason;
}

export default async function CreditsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: balance }, { data: ledger }] = await Promise.all([
    supabase.rpc("apply_monthly_topup", { uid: user.id }),
    supabase
      .from("credit_ledger")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const entries = (ledger ?? []) as CreditEntry[];
  const lastRecharge = entries.find((e) =>
    ["signup", "monthly"].includes(e.reason)
  );
  const nextRecharge = lastRecharge
    ? new Date(
        new Date(lastRecharge.created_at).getTime() + 30 * 86400_000
      ).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })
    : null;

  const pct = Math.min(100, Math.round(((balance ?? 0) / 100) * 100));

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-1">Tes crédits</h1>
        <p className="text-muted-foreground">
          Ton carburant de création. Il se recharge tout seul, tu n&apos;as rien
          à gérer.
        </p>
      </div>

      <Card>
        <CardContent className="pt-1">
          <div className="flex items-end justify-between mb-3">
            <p className="text-5xl font-bold">
              {balance ?? 0}
              <span className="text-base font-normal text-muted-foreground">
                {" "}
                / 100
              </span>
            </p>
            {nextRecharge && (
              <p className="text-sm text-muted-foreground">
                Recharge : le {nextRecharge}
              </p>
            )}
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
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
              la création de ton compte.
            </li>
            <li>
              Chaque outil a un coût affiché{" "}
              <strong className="text-foreground">avant</strong> de lancer quoi
              que ce soit. Rien n&apos;est prélevé en douce.
            </li>
            <li>
              Tes crédits ne se perdent jamais : ce qu&apos;il te reste s&apos;ajoute
              à ta recharge.
            </li>
            <li>
              <strong className="text-foreground">+50 crédits tous les 30 jours</strong>,
              automatiquement.
            </li>
            <li>
              Plafond gratuit : <strong className="text-foreground">100 crédits</strong>.
              Au-delà, ça ne monte plus.
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ce que coûte chaque création</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border text-sm">
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
