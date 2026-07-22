import assert from "node:assert/strict";
import test from "node:test";
import {
  canPromptAssistant,
  pauseUntil,
  readCombinedCoachingLedger,
  readCoachingLedger,
  recordAssistantDismissal,
  recordAssistantPrompt,
  writeCombinedCoachingLedger,
} from "./coaching";
import { DEFAULT_ASSISTANT_PREFERENCE } from "./types";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

test("limite une sollicitation par page et trois par jour", () => {
  const storage = new MemoryStorage();
  let ledger = readCoachingLedger(storage);
  assert.equal(canPromptAssistant(DEFAULT_ASSISTANT_PREFERENCE, ledger, "/agenda"), true);
  ledger = recordAssistantPrompt(ledger, "/agenda");
  assert.equal(canPromptAssistant(DEFAULT_ASSISTANT_PREFERENCE, ledger, "/agenda"), false);
  ledger = recordAssistantPrompt(ledger, "/offres");
  ledger = recordAssistantPrompt(ledger, "/produits");
  assert.equal(canPromptAssistant(DEFAULT_ASSISTANT_PREFERENCE, ledger, "/compte"), false);
});

test("respecte la pause et la désactivation", () => {
  const storage = new MemoryStorage();
  const ledger = readCoachingLedger(storage);
  assert.equal(canPromptAssistant({ ...DEFAULT_ASSISTANT_PREFERENCE, enabled: false }, ledger, "/agenda"), false);
  assert.equal(canPromptAssistant({ ...DEFAULT_ASSISTANT_PREFERENCE, pausedUntil: pauseUntil("hour") }, ledger, "/agenda"), false);
});

test("compte les fermetures par conseil", () => {
  const storage = new MemoryStorage();
  let ledger = readCoachingLedger(storage);
  ledger = recordAssistantDismissal(ledger, "agenda");
  ledger = recordAssistantDismissal(ledger, "agenda");
  assert.equal(ledger.dismissals.agenda, 2);
});

test("partage le plafond quotidien sans partager les pages entre sessions", () => {
  const local = new MemoryStorage();
  const firstSession = new MemoryStorage();
  let ledger = readCombinedCoachingLedger(local, firstSession);
  ledger = recordAssistantPrompt(ledger, "/agenda");
  ledger = recordAssistantDismissal(ledger, "agenda");
  writeCombinedCoachingLedger(local, firstSession, ledger);

  const secondSession = new MemoryStorage();
  const restored = readCombinedCoachingLedger(local, secondSession);
  assert.equal(restored.spontaneousCount, 1);
  assert.equal(restored.dismissals.agenda, 1);
  assert.deepEqual(restored.promptedRoutes, []);
  assert.equal(canPromptAssistant(DEFAULT_ASSISTANT_PREFERENCE, restored, "/agenda"), true);
});
