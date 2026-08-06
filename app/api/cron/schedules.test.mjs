import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

// Un worker cron qui n'est pas planifié ne tourne jamais en production, et
// rien ne le signale : la file grossit en silence. C'est exactement ce qui est
// arrivé à /api/cron/translate-jobs — les langues étaient facturées, les jobs
// mis en file, et aucun worker ne les consommait. Ce test lie l'existence
// d'une route à sa planification.
test("chaque route /api/cron est planifiée dans vercel.json", async () => {
  const routes = (
    await readdir(new URL(".", import.meta.url), { withFileTypes: true })
  )
    .filter((entry) => entry.isDirectory())
    .map((entry) => `/api/cron/${entry.name}`);

  const vercel = JSON.parse(
    await readFile(new URL("../../../vercel.json", import.meta.url), "utf8")
  );
  const scheduled = new Set((vercel.crons ?? []).map((cron) => cron.path));

  assert.deepEqual(
    routes.filter((route) => !scheduled.has(route)),
    [],
    "route(s) cron sans entrée dans vercel.json"
  );
});

test("chaque entrée cron de vercel.json pointe vers une route existante", async () => {
  const vercel = JSON.parse(
    await readFile(new URL("../../../vercel.json", import.meta.url), "utf8")
  );
  const existing = new Set(
    (await readdir(new URL(".", import.meta.url), { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => `/api/cron/${entry.name}`)
  );

  for (const cron of vercel.crons ?? []) {
    assert.ok(
      existing.has(cron.path),
      `vercel.json planifie ${cron.path}, qui n'existe pas`
    );
  }
});
