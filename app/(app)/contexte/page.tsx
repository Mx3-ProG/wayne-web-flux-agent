import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getActivePageId } from "@/lib/active-project";
import type { VoiceProfile } from "@/lib/types";
import { voiceCompletion } from "@/lib/voice";
import { getAccountLocale } from "@/lib/i18n/locale.server";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { defaultLocale } from "@/lib/i18n/config";
import { VoiceForm } from "@/components/voice/voice-form";
import type { VoiceDraft } from "@/components/voice/voice-options";

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const locale = user ? await getAccountLocale(supabase, user.id) : defaultLocale;
  return { title: (await getDictionary(locale, "voice")).meta.title };
}

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
  const page = pageId ? { id: pageId } : null;

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
      t={t}
    />
  );
}
