import assert from "node:assert/strict";
import test from "node:test";
import { ASSISTANT_DESTINATIONS } from "./catalog";
import { normalizeAssistantText, searchAssistantDestinations } from "./search";
import type { AssistantContext } from "./types";

const appContext: AssistantContext = { surface: "app", pathname: "/espace" };

test("normalise les accents, la casse et la ponctuation", () => {
  assert.equal(normalizeAssistantText("  OÙ sont mes Offres ? "), "ou sont mes offres");
});

test("une demande naturelle renvoie la bonne page en premier", () => {
  const results = searchAssistantDestinations("où modifier mon site ?", appContext);
  assert.equal(results[0]?.destination.id, "storefront-editor");
  assert.equal(results[0]?.confidence, "high");
});

test("tolère les fautes fréquentes", () => {
  assert.equal(
    searchAssistantDestinations("ajouter mes oraires", appContext)[0]?.destination.id,
    "agenda",
  );
  assert.equal(
    searchAssistantDestinations("ou sont mes comanddes", appContext)[0]?.destination.id,
    "orders",
  );
});

test("ne mélange pas les surfaces", () => {
  const marketing = searchAssistantDestinations("combien ça coûte", {
    surface: "marketing",
    pathname: "/",
  });
  assert.equal(marketing[0]?.destination.id, "marketing-pricing");
  assert.ok(marketing.every((result) => result.destination.surfaces.includes("marketing")));
});

test("retrouve la connexion depuis l’accueil marketing", () => {
  const results = searchAssistantDestinations("je veux retrouver mon compte", {
    surface: "marketing",
    pathname: "/",
  });
  assert.equal(results[0]?.destination.id, "marketing-login");
});

test("respecte la liste des destinations disponibles d'une vitrine", () => {
  const results = searchAssistantDestinations("je veux prendre rendez-vous", {
    surface: "storefront",
    pathname: "/p/demo",
    availableDestinationIds: ["storefront-home", "storefront-contact"],
  });
  assert.ok(results.every((result) => ["storefront-home", "storefront-contact"].includes(result.destination.id)));
  assert.notEqual(results[0]?.destination.id, "storefront-booking");
});

test("une phrase sans rapport ne produit pas de destination", () => {
  assert.deepEqual(searchAssistantDestinations("xylophone quantique violet", appContext), []);
});

test("le catalogue ne contient que des liens internes ou des ancres", () => {
  for (const destination of ASSISTANT_DESTINATIONS) {
    assert.match(destination.href, /^(\/|#)/, destination.id);
    assert.doesNotMatch(destination.href, /^(?:javascript|data):/i, destination.id);
  }
});
