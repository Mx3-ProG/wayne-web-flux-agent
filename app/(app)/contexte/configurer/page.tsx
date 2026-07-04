import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActivePageId } from "@/lib/active-project";
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

  // Voix du projet actif.
  const pageId = await getActivePageId(supabase, user.id);
  const { data: voice } = pageId
    ? await supabase
        .from("voice_profiles")
        .select("*")
        .eq("page_id", pageId)
        .maybeSingle<VoiceProfile>()
    : { data: null as VoiceProfile | null };

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
