"use server";

import { revalidatePath } from "next/cache";
import { getActivePage } from "@/lib/active-project";
import { createClient } from "@/lib/supabase/server";

export async function completeJourneyStep(step: number): Promise<void> {
  if (step !== 7 && step !== 8) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const page = await getActivePage(supabase, user.id);
  if (!page) return;

  const completedSteps = page.journey_completed_steps ?? [];
  if (completedSteps.includes(step)) return;
  await supabase
    .from("pages")
    .update({ journey_completed_steps: [...completedSteps, step] })
    .eq("id", page.id)
    .eq("user_id", user.id);

  revalidatePath("/espace");
}
