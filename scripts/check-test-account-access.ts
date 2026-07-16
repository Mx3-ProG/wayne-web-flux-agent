import { createAdminClient } from "@/lib/supabase/admin";
import { loadAccountAccess } from "@/lib/account-status";
import { checkFluxAccess } from "@/lib/flux/access";

const domain = process.env.TEST_ACCOUNT_DOMAIN ?? "wayne-web.test";
// Les comptes semés gardent leurs crédits de bienvenue. Depuis que le solde est
// la seule limite, un essai expiré qui a des crédits garde l'IA ET la
// publication ; seule la fenêtre IA de 6 mois d'un pack (pack-perime) coupe
// encore l'IA tout en laissant publier.
const cases = [
  { key: "abonne", status: "subscribed", ai: true, publication: true },
  { key: "resilie", status: "trial_expired", ai: true, publication: true },
  { key: "pastdue", status: "subscribed", ai: true, publication: true },
  { key: "pack-recent", status: "credits_active", ai: true, publication: true },
  { key: "pack-perime", status: "credits_expired", ai: false, publication: true },
  { key: "essai-expire", status: "trial_expired", ai: true, publication: true },
] as const;

const admin = createAdminClient();
let failed = false;

for (const expected of cases) {
  const email = `test+${expected.key}@${domain}`;
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const user = data.users.find((candidate) => candidate.email === email);
  if (!user) {
    console.error(`MANQUANT ${email} — lance npm run seed:test-accounts`);
    failed = true;
    continue;
  }

  const [account, flux, { data: publication }] = await Promise.all([
    loadAccountAccess(user.id),
    checkFluxAccess(user.id),
    admin.rpc("has_active_access", { uid: user.id }),
  ]);
  const actual = {
    email,
    status: account.status,
    balance: account.creditBalance,
    ai: account.aiAllowed,
    flux: flux.ok,
    publication: publication === true,
  };
  console.log(actual);

  if (
    account.status !== expected.status ||
    account.aiAllowed !== expected.ai ||
    flux.ok !== expected.ai ||
    actual.publication !== expected.publication
  ) {
    failed = true;
    console.error("ATTENDU", expected);
  }
}

if (failed) process.exitCode = 1;
