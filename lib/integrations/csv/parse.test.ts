import assert from "node:assert/strict";
import test from "node:test";
import { decodeCsvBuffer, detectDelimiter, parseCsv } from "./parse";

test("detects comma delimiter", () => {
  assert.equal(detectDelimiter("nom,prenom,phone"), ",");
});

test("detects semicolon delimiter (French Excel export)", () => {
  assert.equal(detectDelimiter("nom;prenom;phone"), ";");
});

test("parses a simple CSV into header-keyed rows", () => {
  const { headers, rows, delimiter } = parseCsv("nom,phone\nDupont,0601020304\nMartin,0611223344\n");
  assert.equal(delimiter, ",");
  assert.deepEqual(headers, ["nom", "phone"]);
  assert.deepEqual(rows, [
    { nom: "Dupont", phone: "0601020304" },
    { nom: "Martin", phone: "0611223344" },
  ]);
});

test("handles quoted fields with embedded commas and escaped quotes", () => {
  const { rows } = parseCsv('nom,note\n"Dupont, Jean","il a dit ""bonjour"""\n');
  assert.deepEqual(rows, [{ nom: "Dupont, Jean", note: 'il a dit "bonjour"' }]);
});

test("handles quoted fields with embedded newlines", () => {
  const { rows } = parseCsv('nom,note\n"Dupont","ligne 1\nligne 2"\n');
  assert.deepEqual(rows, [{ nom: "Dupont", note: "ligne 1\nligne 2" }]);
});

test("skips blank lines", () => {
  const { rows } = parseCsv("nom,phone\nDupont,0601020304\n\nMartin,0611223344\n");
  assert.equal(rows.length, 2);
});

test("returns empty result for an empty file", () => {
  const { headers, rows } = parseCsv("");
  assert.deepEqual(headers, []);
  assert.deepEqual(rows, []);
});

test("decodes valid UTF-8 as utf-8", () => {
  const { text, encoding } = decodeCsvBuffer(Buffer.from("Café,téléphone", "utf-8"));
  assert.equal(encoding, "utf-8");
  assert.equal(text, "Café,téléphone");
});

test("falls back to latin1 on invalid UTF-8 byte sequences", () => {
  // 0xE9 seul (é en latin1/Windows-1252) est une séquence UTF-8 invalide.
  const buffer = Buffer.from([0x43, 0x61, 0x66, 0xe9]); // "Caf" + 0xE9
  const { encoding, text } = decodeCsvBuffer(buffer);
  assert.equal(encoding, "latin1");
  assert.equal(text, "Café");
});
