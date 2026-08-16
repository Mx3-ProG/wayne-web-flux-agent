import assert from "node:assert/strict";
import test from "node:test";
import { addMinutes, toNaiveIso } from "./naive-time";

test("combines a date and a short time into a naive ISO string", () => {
  assert.equal(toNaiveIso("2026-03-15", "14:30"), "2026-03-15T14:30:00");
});

test("passes through a time that already has seconds", () => {
  assert.equal(toNaiveIso("2026-03-15", "14:30:00"), "2026-03-15T14:30:00");
});

test("adds minutes within the same day", () => {
  assert.equal(addMinutes("2026-03-15T14:30:00", 45), "2026-03-15T15:15:00");
});

test("rolls over to the next day when minutes cross midnight", () => {
  assert.equal(addMinutes("2026-03-15T23:45:00", 30), "2026-03-16T00:15:00");
});

test("is timezone-agnostic — arithmetic does not depend on the runtime TZ", () => {
  const before = process.env.TZ;
  process.env.TZ = "America/Los_Angeles";
  try {
    assert.equal(addMinutes("2026-03-15T14:30:00", 60), "2026-03-15T15:30:00");
  } finally {
    process.env.TZ = before;
  }
});

test("throws on a malformed input", () => {
  assert.throws(() => addMinutes("not-a-date", 30));
});
