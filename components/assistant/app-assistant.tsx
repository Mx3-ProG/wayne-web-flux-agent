import { createClient } from "@/lib/supabase/server";
import { loadJourneySignals } from "@/lib/journey-signals";
import { FluxAssistantHost } from "./flux-assistant-host";

type PreferenceRow = {
  enabled: boolean;
  paused_until: string | null;
  current_goal_id: string | null;
};

export async function AppAssistant({ userId }: { userId: string }) {
  const supabase = await createClient();
  const [journey, preferenceResult] = await Promise.all([
    loadJourneySignals(supabase, userId),
    supabase
      .from("assistant_preferences")
      .select("enabled, paused_until, current_goal_id")
      .eq("user_id", userId)
      .maybeSingle<PreferenceRow>(),
  ]);
  const preference = preferenceResult.data;

  return (
    <FluxAssistantHost
      surface="app"
      context={{
        activeProjectId: journey.page?.id,
        journey: journey.signals,
      }}
      initialPreference={preference ? {
        enabled: preference.enabled,
        pausedUntil: preference.paused_until,
        currentGoalId: preference.current_goal_id,
      } : undefined}
      persistToAccount
    />
  );
}
