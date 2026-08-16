import assert from "node:assert/strict";
import test from "node:test";
import { normalizeEmail, normalizePhone } from "./dedupe";

test("normalizes a French mobile number with a leading 0 to E.164", () => {
  assert.equal(normalizePhone("06 01 02 03 04"), "+33601020304");
});

test("leaves an already-international number untouched (digits only)", () => {
  assert.equal(normalizePhone("+33 6 01 02 03 04"), "+33601020304");
});

test("two differently formatted representations of the same number normalize identically", () => {
  assert.equal(normalizePhone("06.10.20.30.40"), normalizePhone("+33610203040"));
});

test("returns null for an empty phone", () => {
  assert.equal(normalizePhone(""), null);
});

test("lowercases and trims email for comparison", () => {
  assert.equal(normalizeEmail("  Jean.Dupont@Example.com "), "jean.dupont@example.com");
});

test("returns null for an empty email", () => {
  assert.equal(normalizeEmail("   "), null);
});
