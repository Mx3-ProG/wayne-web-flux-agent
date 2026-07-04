import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { VoiceProfile } from "@/lib/types";
import { VoiceTunnel } from "@/components/voice/voice-tunnel";
import type { VoiceDraft } from "@/components/voice/voice-options";

export const metadata = { title: "Créer ma voix" };

export default async function ConfigurerVoixPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: voice } = await supabase
    .from("voice_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle<VoiceProfile>();

  const initialVoice: VoiceDraft | null = voice
    ? {
        tone: voice.tone,
        address_form: voice.address_form,
        emojis: voice.emojis,
        specialty: voice.specialty,
        often_told: voice.often_told,
        story: voice.story,
        vals: voice.vals,
      }
    : null;

  return <VoiceTunnel initialVoice={initialVoice} />;
}
