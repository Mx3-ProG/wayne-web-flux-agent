import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { VoiceProfile } from "@/lib/types";
import { voiceCompletion } from "@/lib/voice";
import { VoiceForm } from "@/components/voice/voice-form";

export const metadata = { title: "Ma voix" };

export default async function ContextePage() {
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

  return (
    <VoiceForm
      initialVoice={voice}
      completion={voiceCompletion(voice, !!page)}
    />
  );
}
