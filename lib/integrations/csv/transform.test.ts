import assert from "node:assert/strict";
import test from "node:test";
import { transformRow } from "./transform";

test("transforms a valid customer row", () => {
  const result = transformRow(
    "customers",
    { Prenom: "firstName", Tel: "phone", Mail: "email" },
    { Prenom: "Jean", Tel: "06 01 02 03 04", Mail: "jean@example.com" }
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.fields.firstName, "Jean");
  assert.equal(result.fields.phone, "+33601020304");
  assert.equal(result.fields.email, "jean@example.com");
});

test("rejects a customer row with an unusable phone number", () => {
  const result = transformRow("customers", { Prenom: "firstName", Tel: "phone" }, { Prenom: "Jean", Tel: "" });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.reason, "invalid_phone");
});

test("rejects a customer row missing the required first name", () => {
  const result = transformRow("customers", { Tel: "phone" }, { Tel: "0601020304" });
  assert.equal(result.ok, false);
});

test("parses price with a comma decimal separator and currency symbol", () => {
  const result = transformRow("products", { Nom: "name", Prix: "priceCents" }, { Nom: "Shampoing", Prix: "12,50 €" });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.fields.priceCents, 1250);
});

test("parses duration expressed with a unit suffix", () => {
  const result = transformRow(
    "services",
    { Nom: "name", Duree: "durationMin" },
    { Nom: "Coupe", Duree: "45 min" }
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.fields.durationMin, 45);
});

test("transforms a valid appointment row and composes the naive ISO start", () => {
  const result = transformRow(
    "appointments",
    { Client: "firstName", Tel: "phone", Prestation: "serviceName", Date: "date", Heure: "startTime" },
    { Client: "Jean", Tel: "0601020304", Prestation: "Coupe", Date: "15/03/2026", Heure: "14h30" }
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.fields.isoDate, "2026-03-15");
  assert.equal(result.fields.isoTime, "14:30");
});

test("accepts ISO-formatted dates for appointments too", () => {
  const result = transformRow(
    "appointments",
    { Client: "firstName", Tel: "phone", Prestation: "serviceName", Date: "date", Heure: "startTime" },
    { Client: "Jean", Tel: "0601020304", Prestation: "Coupe", Date: "2026-03-15", Heure: "09:00" }
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.fields.isoDate, "2026-03-15");
  assert.equal(result.fields.isoTime, "09:00");
});

test("rejects an appointment row with an unparseable date", () => {
  const result = transformRow(
    "appointments",
    { Client: "firstName", Tel: "phone", Prestation: "serviceName", Date: "date", Heure: "startTime" },
    { Client: "Jean", Tel: "0601020304", Prestation: "Coupe", Date: "pas une date", Heure: "09:00" }
  );
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.reason, "invalid_date");
});

test("rejects a row with an invalid email", () => {
  const result = transformRow(
    "customers",
    { Prenom: "firstName", Tel: "phone", Mail: "email" },
    { Prenom: "Jean", Tel: "0601020304", Mail: "pas-un-email" }
  );
  assert.equal(result.ok, false);
});
