import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { VoiceProfile } from "@/lib/types";
import { voiceCompletion } from "@/lib/voice";
import { VoiceForm } from "@/components/voice/voice-form";
import type { VoiceDraft } from "@/components/voice/voice-options";

export const metadata = { title: "Ma voix" };

const DRAFT_KEYS = [
  "tone",
  "address_form",
  "emojis",
  "specialty",
  "often_told",
  "story",
  "vals",
] as const;

export default async function ContextePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: voice }, { data: page }] = await Promise.all([
    supabase
      .from("voice_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle<VoiceProfile>(),
    supabase.from("pages").select("id").eq("user_id", user.id).maybeSingle(),
  ]);

  const params = await searchParams;
  const preparedVoice: VoiceDraft | null =
    params.review === "1"
      ? (Object.fromEntries(
          DRAFT_KEYS.map((key) => [
            key,
            typeof params[key] === "string" ? params[key] : "",
          ])
        ) as VoiceDraft)
      : null;

  if (!voice && !preparedVoice) redirect("/contexte/configurer");

  return (
    <VoiceForm
      initialVoice={voice}
      preparedVoice={preparedVoice}
      completion={voiceCompletion(voice, !!page)}
    />
  );
}
