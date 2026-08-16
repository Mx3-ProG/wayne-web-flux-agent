import assert from "node:assert/strict";
import test from "node:test";
import { missingRequiredFields, proposeMapping } from "./mapping";

test("maps exact French headers to canonical customer fields", () => {
  const mapping = proposeMapping(["Prénom", "Téléphone", "Email"], "customers");
  assert.equal(mapping["Prénom"], "firstName");
  assert.equal(mapping["Téléphone"], "phone");
  assert.equal(mapping["Email"], "email");
});

test("maps synonym headers via fuzzy inclusion match", () => {
  const mapping = proposeMapping(["Portable client"], "customers");
  assert.equal(mapping["Portable client"], "phone");
});

test("does not assign the same canonical field to two columns", () => {
  const mapping = proposeMapping(["Téléphone", "Portable"], "customers");
  const assigned = Object.values(mapping).filter((v) => v === "phone");
  assert.equal(assigned.length, 1);
});

test("leaves unrecognized headers unmapped", () => {
  const mapping = proposeMapping(["Colonne mystère"], "customers");
  assert.equal(mapping["Colonne mystère"], null);
});

test("missingRequiredFields flags unmapped required fields", () => {
  const missing = missingRequiredFields({ Prénom: "firstName" }, "customers");
  assert.deepEqual(missing, ["phone"]);
});

test("missingRequiredFields is empty once all required fields are mapped", () => {
  const missing = missingRequiredFields({ Prénom: "firstName", Tel: "phone" }, "customers");
  assert.deepEqual(missing, []);
});
