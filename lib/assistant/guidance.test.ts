import assert from "node:assert/strict";
import test from "node:test";
import {
  APP_ROUTE_GUIDANCE,
  JOURNEY_GUIDANCE_BY_STEP,
  PLAN_GUIDANCE_CHOICES,
  TUNNEL_GUIDANCE_BY_SCREEN,
  getFluxGuidance,
} from "./guidance";

test("chaque écran du tunnel possède un message contrôlé", () => {
  for (let screen = 1; screen <= 20; screen += 1) {
    const message = getFluxGuidance(TUNNEL_GUIDANCE_BY_SCREEN[screen]);
    assert.equal(message.surface, "onboarding");
    assert.ok(message.title.length > 0);
    assert.ok(message.body.length > 0);
  }
});

test("chaque étape du parcours possède une recommandation unique", () => {
  for (let step = 1; step <= 8; step += 1) {
    const message = getFluxGuidance(JOURNEY_GUIDANCE_BY_STEP[step]);
    assert.equal(message.trigger, "journey");
    assert.ok(message.action);
    assert.match(message.action!.href, /^\//);
  }
});

test("les actions éditoriales restent des liens internes contrôlés", () => {
  const messageIds = new Set([
    ...Object.values(TUNNEL_GUIDANCE_BY_SCREEN),
    ...Object.values(JOURNEY_GUIDANCE_BY_STEP),
    ...APP_ROUTE_GUIDANCE.map((route) => route.messageId),
    "marketing-home",
    "marketing-pricing",
    "marketing-login",
    "marketing-invitation",
  ] as const);
  for (const id of messageIds) {
    const action = getFluxGuidance(id).action;
    if (action) {
      assert.match(action.href, /^\//, id);
      assert.doesNotMatch(action.href, /^(?:javascript|data):/i, id);
    }
  }
});

test("une seule prise de parole est configurée par racine métier", () => {
  const prefixes = APP_ROUTE_GUIDANCE.map((route) => route.prefix);
  assert.equal(new Set(prefixes).size, prefixes.length);
});

test("le sélecteur de tarifs couvre toutes les formules", () => {
  assert.deepEqual(
    new Set(PLAN_GUIDANCE_CHOICES.map((choice) => choice.plan)),
    new Set(["basique", "pro", "business", "entreprise"]),
  );
});
