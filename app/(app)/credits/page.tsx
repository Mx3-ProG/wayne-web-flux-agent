import type { CSSProperties } from "react";
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
  isActiveSubscriptionStatus,
  trialDaysLeft,
} from "@/lib/plans";
import { getPack } from "@/lib/credit-packs";
import type { CreditEntry, Plan, Profile } from "@/lib/types";
import {
  Coins,
  Gem,
  Landmark,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { CreditPacks } from "./credit-packs";
import styles from "./credits.module.css";

export const metadata = { title: "Mes crédits" };

const CREDIT_LEVELS = [100, 250, 500, 1000, 1500, 3000, 5000, 10000] as const;

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
  if (reason.startsWith("invoice:")) {
    const plan = reason.split(":topup:")[1] as Plan | undefined;
    return plan ? `Recharge formule ${PLAN_LABEL[plan] ?? plan}` : "Recharge mensuelle";
  }
  if (reason.startsWith("publish:")) {
    const version = reason.split(":v")[1];
    return version
      ? `Publication de la version ${version} du site`
      : "Publication du site";
  }
  return reason;
}

function creditRank(balance: number) {
  const safeBalance = Math.max(0, balance);
  const levelIndex = CREDIT_LEVELS.findIndex((target) => safeBalance <= target);
  const index = levelIndex === -1 ? CREDIT_LEVELS.length - 1 : levelIndex;
  const previous = index === 0 ? 0 : CREDIT_LEVELS[index - 1];
  const target = CREDIT_LEVELS[index];
  const progress = Math.min(
    100,
    Math.max(0, ((safeBalance - previous) / (target - previous)) * 100)
  );

  return {
    level: index + 1,
    target,
    progress,
  };
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
        .select("plan, trial_ends_at, subscribed_at, subscription_status, current_period_end")
        .eq("user_id", user.id)
        .single<Pick<Profile, "plan" | "trial_ends_at" | "subscribed_at" | "subscription_status" | "current_period_end">>(),
    ]);

  const plan = (profile?.plan ?? "basique") as Plan;
  const monthlyCredits = PLAN_LIMITS[plan].monthlyCredits;
  const entries = (ledger ?? []) as CreditEntry[];
  const subscribed = isActiveSubscriptionStatus(profile?.subscription_status);
  const trialActive = profile ? !subscribed && hasActiveAccess(profile) : false;
  const daysLeft = profile ? trialDaysLeft(profile) : 0;
  const currentBalance = balance ?? 0;
  const rank = creditRank(currentBalance);
  const progressStyle = {
    "--credit-progress": `${rank.progress}%`,
  } as CSSProperties;

  // Prochaine recharge : uniquement une fois souscrit, ancrée sur le dernier
  // topup de la formule courante.
  const nextRecharge =
    subscribed && profile?.current_period_end
      ? new Date(profile.current_period_end).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })
      : null;

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <span className={styles.overline}>
          <LockKeyhole aria-hidden="true" />
          Réserve personnelle
        </span>
        <div className={styles.heroMark} aria-hidden="true">
          <WalletCards />
        </div>
        <h1>
          Ton capital <span>FLUX</span>
        </h1>
        <p>
          Tes crédits sont ta réserve de création. Tu avances à ton rythme, avec
          ton budget, et chaque dépense reste lisible avant de lancer une action.
        </p>
        <div className={styles.heroTrust}>
          <Gem aria-hidden="true" />
          <strong>1 crédit = 0,40 €</strong>
          <span>dégressif selon les packs</span>
        </div>
      </header>

      {achat === "succes" && (
        <div className={styles.success}>
          <strong>Paiement reçu.</strong> Tes crédits arrivent d&apos;ici
          quelques secondes — recharge la page si le solde n&apos;a pas encore
          bougé.
        </div>
      )}
      {achat === "annule" && (
        <div className={styles.notice}>
          Paiement annulé — rien n&apos;a été débité.
        </div>
      )}

      <section className={styles.balanceVault}>
        <div className={styles.balanceHead}>
          <div>
            <p className={styles.goldLabel}>Solde disponible</p>
            <strong className={styles.balance}>
              {currentBalance}
              <span> crédits</span>
            </strong>
          </div>
          <div className={styles.trialPill}>
            {nextRecharge ? (
              <>Recharge : le {nextRecharge}</>
            ) : trialActive ? (
              <>
                Essai FLUX : {daysLeft} jour{daysLeft > 1 ? "s" : ""} restant
                {daysLeft > 1 ? "s" : ""}
              </>
            ) : (
              <>{subscribed ? `Formule ${PLAN_LABEL[plan]}` : "Essai terminé"}</>
            )}
          </div>
        </div>

        <div className={styles.levelPanel}>
          <div className={styles.levelTop}>
            <span>Niveau {rank.level}/8</span>
            <strong>{currentBalance} / {rank.target} cr.</strong>
          </div>
          <div className={styles.progressTrack} style={progressStyle}>
            <span />
          </div>
          <ol className={styles.levels} aria-label="Niveaux de crédits">
            {CREDIT_LEVELS.map((level, index) => (
              <li
                key={level}
                data-current={rank.level === index + 1 ? "true" : undefined}
                data-reached={currentBalance >= level ? "true" : undefined}
              >
                <span>{index + 1}</span>
                <small>{level} cr.</small>
              </li>
            ))}
          </ol>
        </div>

        {!subscribed && (
          <p className={styles.formulaHint}>
            {trialActive
              ? "Envie de continuer après l'essai ? "
              : "Pour recharger et réactiver publications et IA : "}
            <Link href="/formules">Découvre les formules FLUX</Link>.
          </p>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <span>
            <Coins aria-hidden="true" />
            Recharge
          </span>
          <div>
            <p className={styles.goldLabel}>Trésorerie créative</p>
            <h2>Recharge tes crédits</h2>
            <p>
              Paiement sécurisé par Stripe. Les crédits s&apos;ajoutent à ton
              solde et ne se perdent jamais.
            </p>
          </div>
        </div>
        <div className={styles.sectionBody}>
          <CreditPacks />
          {profile && !hasActiveAccess(profile) && (
            <p className={styles.smallNote}>
              Ton essai est terminé : pour utiliser tes crédits (publier,
              générer, créer), pense aussi à{" "}
              <Link href="/formules">
                choisir une formule FLUX
              </Link>
              .
            </p>
          )}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <span>
            <ShieldCheck aria-hidden="true" />
            Confiance
          </span>
          <div>
            <p className={styles.goldLabel}>Rythme et budget</p>
            <h2>La règle, en clair</h2>
          </div>
        </div>
        <div className={styles.sectionBody}>
          <ul className={styles.ruleList}>
            <li>
              <strong>100 crédits offerts</strong>{" "}
              pendant ton essai de {TRIAL_DAYS} jours, pour créer ton site et
              tout tester.
            </li>
            <li>
              <strong>1 crédit = 0,40 €</strong>{" "}
              (dégressif sur les packs) : chaque création, publication ou
              génération consomme des ressources réelles.
            </li>
            <li>
              Chaque action a un coût affiché{" "}
              <strong>avant</strong> de lancer quoi
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
                  <strong>
                    +{monthlyCredits} crédits à chaque facture mensuelle payée
                  </strong>
                  .
                </>
              ) : (
                <>
                  Après l&apos;essai, les{" "}
                  <Link href="/formules">
                    formules FLUX
                  </Link>{" "}
                  rechargent de 100 à 3000 crédits par mois — plus de crédits,
                  plus de possibilités.
                </>
              )}
            </li>
          </ul>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <span>
            <Landmark aria-hidden="true" />
            Barème
          </span>
          <div>
            <p className={styles.goldLabel}>Transparence</p>
            <h2>Ce que coûte chaque action</h2>
          </div>
        </div>
        <div className={styles.sectionBody}>
          <ul className={styles.costList}>
            <li>
              <span>Publication d&apos;une nouvelle version du site</span>
              <strong>{PUBLISH_COST} cr.</strong>
            </li>
            <li>
              <span>Création d&apos;offre (tunnel ou gestionnaire)</span>
              <strong>
                {OFFER_CREATE_COST} cr. · {OFFER_EXTRA_COST} cr. au-delà de la
                formule
              </strong>
            </li>
            <li>
              <span>Création de produits via le tunnel FLUX</span>
              <strong>{PRODUCT_CREATE_COST} cr.</strong>
            </li>
            <li>
              <span>Nouvelle catégorie de produits (1re du compte offerte)</span>
              <strong>{CATEGORY_CREATE_COST} cr.</strong>
            </li>
            <li>
              <span>Ajout d&apos;un produit</span>
              <strong>{PRODUCT_ADD_COST} cr.</strong>
            </li>
            <li>
              <span>Ajout d&apos;une réservation</span>
              <strong>{RESERVATION_ADD_COST} cr.</strong>
            </li>
            <li>
              <span>Assistant vitrine FLUX (éditeur complet gratuit)</span>
              <strong>{VITRINE_ASSIST_COST} cr.</strong>
            </li>
            <li>
              <span>Changement de contexte FLUX (1re création offerte)</span>
              <strong>{CONTEXT_CHANGE_COST} cr.</strong>
            </li>
            {TOOLS.map((tool) => (
              <li key={tool.slug}>
                <span>{tool.name}</span>
                <strong>{tool.cost} cr.</strong>
              </li>
            ))}
            <li>
              <span>Pré-remplissage IA de la vitrine (formules &amp; packs)</span>
              <strong>{PREFILL_COST} cr.</strong>
            </li>
          </ul>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <span>
            <Sparkles aria-hidden="true" />
            Grand livre
          </span>
          <div>
            <p className={styles.goldLabel}>Historique</p>
            <h2>Chaque mouvement, noir sur blanc</h2>
          </div>
        </div>
        <div className={styles.sectionBody}>
          {entries.length === 0 ? (
            <p className={styles.emptyHistory}>Rien pour l&apos;instant.</p>
          ) : (
            <ul className={styles.historyList}>
              {entries
                .filter((e) => e.delta !== 0)
                .map((e) => (
                  <li key={e.id}>
                    <span>
                      {new Date(e.created_at).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </span>
                    <strong>{reasonLabel(e.reason)}</strong>
                    <span
                      className={e.delta > 0 ? styles.positive : styles.negative}
                    >
                      {e.delta > 0 ? `+${e.delta}` : e.delta}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
