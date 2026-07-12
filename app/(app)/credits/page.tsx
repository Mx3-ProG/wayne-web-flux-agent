import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TOOLS, PREFILL_COST } from "@/lib/tools-config";
import {
  CATEGORY_CREATE_COST,
  CONTEXT_CHANGE_COST,
  OFFER_CREATE_COST,
  PRODUCT_ADD_COST,
  RESERVATION_ADD_COST,
  OFFER_EXTRA_COST,
  PLAN_LABEL,
  PLAN_LIMITS,
  PRODUCT_CREATE_COST,
  PUBLISH_COST,
  TRIAL_DAYS,
  VITRINE_ASSIST_COST,
  hasActiveAccess,
  trialDaysLeft,
} from "@/lib/plans";
import { getPack } from "@/lib/credit-packs";
import type { CreditEntry, Plan, Profile } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreditPacks } from "./credit-packs";

export const metadata = { title: "Mes crédits" };

const REASON_LABELS: Record<string, string> = {
  signup: "Crédits de bienvenue",
  monthly: "Ancienne recharge mensuelle",
  prefill: "Pré-remplissage IA",
  "offer:create": "Création d'offre",
  "offer:extra": "Création d'offre (au-delà de la formule)",
  "product:create": "Création de produits (tunnel FLUX)",
  "category:create": "Nouvelle catégorie de produits",
  "product:add": "Ajout d'un produit",
  "reservation:add": "Ajout d'une réservation",
  "vitrine:guide": "Assistant vitrine FLUX",
  "voice:update": "Changement de contexte FLUX",
};

function reasonLabel(reason: string): string {
  if (REASON_LABELS[reason]) return REASON_LABELS[reason];
  if (reason.startsWith("tool:")) {
    const tool = TOOLS.find((t) => t.slug === reason.slice(5));
    return tool?.name ?? reason.slice(5);
  }
  if (reason.startsWith("purchase:")) {
    const pack = getPack(reason.slice(9));
    return pack ? `Achat ${pack.label} (+${pack.credits} cr.)` : "Achat de crédits";
  }
  if (reason.startsWith("refund:")) return "Remboursement (action échouée)";
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

export default async function CreditsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const achat = typeof params.achat === "string" ? params.achat : null;

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
        .select("plan, trial_ends_at, subscribed_at")
        .eq("user_id", user.id)
        .single<Pick<Profile, "plan" | "trial_ends_at" | "subscribed_at">>(),
    ]);

  const plan = (profile?.plan ?? "basique") as Plan;
  const monthlyCredits = PLAN_LIMITS[plan].monthlyCredits;
  const entries = (ledger ?? []) as CreditEntry[];
  const subscribed = Boolean(profile?.subscribed_at);
  const trialActive = profile ? !subscribed && hasActiveAccess(profile) : false;
  const daysLeft = profile ? trialDaysLeft(profile) : 0;

  // Prochaine recharge : uniquement une fois souscrit, ancrée sur le dernier
  // topup de la formule courante.
  const lastTopup = entries.find((e) => e.reason === `topup:${plan}`);
  const nextRecharge =
    subscribed && lastTopup
      ? new Date(
          new Date(lastTopup.created_at).getTime() + 30 * 86400_000
        ).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })
      : null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-1">Tes crédits</h1>
        <p className="text-muted-foreground">
          Ton carburant de création. 1 crédit = 0,40 € : chaque action a un
          coût affiché avant de te lancer.
        </p>
      </div>

      {achat === "succes" && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
          <strong>Paiement reçu.</strong> Tes crédits arrivent d&apos;ici
          quelques secondes — recharge la page si le solde n&apos;a pas encore
          bougé.
        </div>
      )}
      {achat === "annule" && (
        <div className="rounded-xl border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
          Paiement annulé — rien n&apos;a été débité.
        </div>
      )}

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
            ) : trialActive ? (
              <p className="text-sm text-muted-foreground">
                Essai FLUX : {daysLeft} jour{daysLeft > 1 ? "s" : ""} restant
                {daysLeft > 1 ? "s" : ""}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {subscribed ? `Formule ${PLAN_LABEL[plan]}` : "Essai terminé"}
              </p>
            )}
          </div>
          {!subscribed && (
            <p className="text-sm text-muted-foreground">
              {trialActive
                ? "Envie de continuer après l'essai ? "
                : "Pour recharger et réactiver publications et IA : "}
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
          <CardTitle>Recharge tes crédits</CardTitle>
          <CardDescription>
            Paiement sécurisé par Stripe. Les crédits s&apos;ajoutent à ton
            solde et ne se perdent jamais.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreditPacks />
          {profile && !hasActiveAccess(profile) && (
            <p className="mt-3 text-xs text-muted-foreground">
              Ton essai est terminé : pour utiliser tes crédits (publier,
              générer, créer), pense aussi à{" "}
              <Link href="/formules" className="text-foreground underline">
                choisir une formule FLUX
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
              <strong className="text-foreground">100 crédits offerts</strong>{" "}
              pendant ton essai de {TRIAL_DAYS} jours, pour créer ton site et
              tout tester.
            </li>
            <li>
              <strong className="text-foreground">1 crédit = 0,40 €</strong>{" "}
              (dégressif sur les packs) : chaque création, publication ou
              génération consomme des ressources réelles.
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
              {subscribed ? (
                <>
                  Ta formule {PLAN_LABEL[plan]} recharge{" "}
                  <strong className="text-foreground">
                    +{monthlyCredits} crédits tous les 30 jours
                  </strong>
                  .
                </>
              ) : (
                <>
                  Après l&apos;essai, les{" "}
                  <Link href="/formules" className="text-foreground underline">
                    formules FLUX
                  </Link>{" "}
                  rechargent de 100 à 3000 crédits par mois — plus de crédits,
                  plus de possibilités.
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
            <li className="flex justify-between py-2">
              <span>Création d&apos;offre (tunnel ou gestionnaire)</span>
              <span className="font-medium">
                {OFFER_CREATE_COST} cr. · {OFFER_EXTRA_COST} cr. au-delà de la
                formule
              </span>
            </li>
            <li className="flex justify-between py-2">
              <span>Création de produits via le tunnel FLUX</span>
              <span className="font-medium">{PRODUCT_CREATE_COST} cr.</span>
            </li>
            <li className="flex justify-between py-2">
              <span>Nouvelle catégorie de produits (1re du compte offerte)</span>
              <span className="font-medium">{CATEGORY_CREATE_COST} cr.</span>
            </li>
            <li className="flex justify-between py-2">
              <span>Ajout d&apos;un produit</span>
              <span className="font-medium">{PRODUCT_ADD_COST} cr.</span>
            </li>
            <li className="flex justify-between py-2">
              <span>Ajout d&apos;une réservation</span>
              <span className="font-medium">{RESERVATION_ADD_COST} cr.</span>
            </li>
            <li className="flex justify-between py-2">
              <span>Assistant vitrine FLUX (éditeur complet gratuit)</span>
              <span className="font-medium">{VITRINE_ASSIST_COST} cr.</span>
            </li>
            <li className="flex justify-between py-2">
              <span>Changement de contexte FLUX (1re création offerte)</span>
              <span className="font-medium">{CONTEXT_CHANGE_COST} cr.</span>
            </li>
            {TOOLS.map((tool) => (
              <li key={tool.slug} className="flex justify-between py-2">
                <span>{tool.name}</span>
                <span className="font-medium">{tool.cost} cr.</span>
              </li>
            ))}
            <li className="flex justify-between py-2">
              <span>Pré-remplissage « Compléter avec l&apos;IA » (bientôt)</span>
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
