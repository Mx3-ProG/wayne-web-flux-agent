import assert from "node:assert/strict";
import test from "node:test";
import { ASSISTANT_DESTINATIONS } from "./catalog";
import { normalizeAssistantText, searchAssistantDestinations } from "./search";
import { localizeDestinations, LOCALES_WITH_SEARCH_TERMS, searchTermIds } from "./i18n";
import { locales } from "@/lib/i18n/config";
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

test("les scripts non latins survivent à la normalisation", () => {
  // Un filtre limité à [a-z0-9] vidait la requête ET les libellés du catalogue :
  // la recherche renvoyait zéro résultat en russe, chinois, japonais et arabe.
  for (const [langue, texte] of [
    ["ru", "часы работы"],
    ["zh", "营业时间"],
    ["ja", "営業時間"],
    ["ar", "ساعات العمل"],
  ]) {
    assert.ok(normalizeAssistantText(texte).length >= 2, langue);
  }
});

test("chaque langue traduite couvre tout le catalogue, sans id orphelin", () => {
  const catalogIds = ASSISTANT_DESTINATIONS.map((destination) => destination.id).sort();
  for (const locale of LOCALES_WITH_SEARCH_TERMS) {
    // Dans les deux sens : une destination ajoutée au catalogue sans vocabulaire
    // retomberait en silence sur le repli générique, et un id renommé laisserait
    // derrière lui une entrée morte que plus rien ne rattache au catalogue.
    assert.deepEqual(searchTermIds(locale).sort(), catalogIds, locale);
  }
});

test("chaque destination se retrouve par son propre libellé, dans toutes les langues", () => {
  for (const locale of locales) {
    const catalog = localizeDestinations(ASSISTANT_DESTINATIONS, locale);
    for (const surface of ["marketing", "app", "storefront"] as const) {
      for (const destination of catalog.filter((item) => item.surfaces.includes(surface))) {
        const results = searchAssistantDestinations(
          destination.label,
          { surface, pathname: "/" },
          [],
          catalog,
        );
        assert.ok(
          results.some((result) => result.destination.id === destination.id),
          `${locale}/${surface}/${destination.id} introuvable par son libellé`,
        );
      }
    }
  }
});
