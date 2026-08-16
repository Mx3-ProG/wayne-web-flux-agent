import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Chiffrement des identifiants d'intégration (pgcrypto côté Postgres, cf.
// migration 00048 — set_integration_secret/get_integration_secret). La clé
// ne transite jamais que depuis cette fonction : jamais stockée en base,
// jamais journalisée, jamais exposée au client.
//
// À n'appeler que depuis des routes serveur (callback OAuth, worker de
// synchro) — jamais depuis un composant client.

function encryptionKey(): string {
  const key = process.env.INTEGRATIONS_ENCRYPTION_KEY;
  if (!key) throw new Error("missing_integrations_encryption_key");
  return key;
}

export async function setIntegrationSecret(params: {
  integrationId: string;
  authType: "oauth2" | "api_key" | "basic";
  payload: Record<string, unknown>;
  expiresAt?: string;
}): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.rpc("set_integration_secret", {
    p_integration_id: params.integrationId,
    p_auth_type: params.authType,
    p_payload: params.payload,
    p_key: encryptionKey(),
    p_expires_at: params.expiresAt ?? null,
  });
  if (error) throw error;
}

export async function getIntegrationSecret(
  integrationId: string
): Promise<Record<string, unknown> | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_integration_secret", {
    p_integration_id: integrationId,
    p_key: encryptionKey(),
  });
  if (error) throw error;
  return (data as Record<string, unknown> | null) ?? null;
}
