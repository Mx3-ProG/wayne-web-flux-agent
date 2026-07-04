"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActivePageId } from "@/lib/active-project";
import type { VoiceProfile } from "@/lib/types";

export async function saveVoiceProfile(
  fields: Partial<Omit<VoiceProfile, "user_id" | "page_id" | "updated_at">>
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non connecté." };

  // Voix rattachée au projet actif.
  const pageId = await getActivePageId(supabase, user.id);
  if (!pageId) return { error: "Crée d'abord ta vitrine." };

  const clean = Object.fromEntries(
    Object.entries(fields).map(([k, v]) => [k, String(v ?? "").slice(0, 1000)])
  );

  const { error } = await supabase.from("voice_profiles").upsert(
    {
      page_id: pageId,
      user_id: user.id,
      ...clean,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "page_id" }
  );
  if (error) return { error: "Enregistrement impossible." };
  revalidatePath("/contexte");
  return {};
}
