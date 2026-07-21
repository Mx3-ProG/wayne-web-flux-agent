import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getActivePageId } from "@/lib/active-project";
import type { VoiceProfile } from "@/lib/types";
import { getAccountLocale } from "@/lib/i18n/locale.server";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { defaultLocale } from "@/lib/i18n/config";
import { VoiceTunnel } from "@/components/voice/voice-tunnel";
import type { VoiceDraft } from "@/components/voice/voice-options";

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const locale = user ? await getAccountLocale(supabase, user.id) : defaultLocale;
  return { title: (await getDictionary(locale, "voice")).meta.tunnelTitle };
}

export default async function ConfigurerVoixPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const locale = await getAccountLocale(supabase, user.id);
  const t = await getDictionary(locale, "voice");

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

  return <VoiceTunnel initialVoice={initialVoice} t={t} />;
}
