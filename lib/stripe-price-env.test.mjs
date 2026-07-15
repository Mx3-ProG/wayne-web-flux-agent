import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Stripe prices accept both canonical and deployed Vercel variable names", async () => {
  const plans = await readFile(new URL("./plans.ts", import.meta.url), "utf8");
  const packs = await readFile(new URL("./credit-packs.ts", import.meta.url), "utf8");

  for (const name of [
    "STRIPE_BASIQUE_FORFAIT",
    "STRIPE_PRO_FORFAIT",
    "STRIPE_BUSINESS_FORFAIT",
    "STRIPE_ENTREPRISE_FORFAIT",
  ]) {
    assert.match(plans, new RegExp(name));
  }

  for (const name of [
    "STRIPE_50_CREDIT_FLUX",
    "STRIPE_150_CREDIT_FLUX",
    "STRIPE_400_CREDIT_FLUX",
  ]) {
    assert.match(packs, new RegExp(name));
  }
});
