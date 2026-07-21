"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActivePageId } from "@/lib/active-project";
import { CONTEXT_CHANGE_COST } from "@/lib/plans";
import { spendCredits, refundCredits } from "@/lib/credits";
import type { VoiceProfile } from "@/lib/types";

export async function saveVoiceProfile(
  fields: Partial<Omit<VoiceProfile, "user_id" | "page_id" | "updated_at">>
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" };

  // Voix rattachée au projet actif.
  const pageId = await getActivePageId(supabase, user.id);
  if (!pageId) return { error: "no_active_page" };

  // 1re création gratuite (onboarding) ; toute modification ultérieure du
  // contexte coûte CONTEXT_CHANGE_COST crédits.
  const { data: existing } = await supabase
    .from("voice_profiles")
    .select("page_id")
    .eq("page_id", pageId)
    .maybeSingle();
  const isUpdate = Boolean(existing);
  if (isUpdate) {
    const { error: spendError } = await spendCredits(
      user.id,
      CONTEXT_CHANGE_COST,
      "voice:update"
    );
    if (spendError) return { error: spendError };
  }

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
  if (error) {
    if (isUpdate) {
      await refundCredits(user.id, CONTEXT_CHANGE_COST, "refund:voice");
    }
    return { error: "save_failed" };
  }
  revalidatePath("/contexte");
  return {};
}
