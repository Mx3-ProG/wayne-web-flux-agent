import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActivePageId } from "@/lib/active-project";
import { getTool, TOOLS } from "@/lib/tools-config";
import { voiceCompletion } from "@/lib/voice";
import type { VoiceProfile } from "@/lib/types";
import { getAccountLocale } from "@/lib/i18n/locale.server";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { ToolRunner } from "@/components/tools/tool-runner";
import { Card, CardContent } from "@/components/ui/card";

export function generateStaticParams() {
  return TOOLS.map((t) => ({ slug: t.slug }));
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: balance }, pageId, locale] = await Promise.all([
    supabase.rpc("credit_balance", { uid: user.id }),
    getActivePageId(supabase, user.id),
    getAccountLocale(supabase, user.id),
  ]);
  const t = await getDictionary(locale, "tools");
  const { data: voice } = pageId
    ? await supabase
        .from("voice_profiles")
        .select("*")
        .eq("page_id", pageId)
        .maybeSingle<VoiceProfile>()
    : { data: null as VoiceProfile | null };

  const completion = voiceCompletion(voice, !!pageId);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        {tool.badge && (
          <span className="inline-block rounded-full bg-primary/15 text-red-bright text-xs font-medium px-2.5 py-0.5 mb-2">
            {tool.badge}
          </span>
        )}
        <h1 className="text-3xl font-bold mb-2">{tool.name}</h1>
        <p className="text-muted-foreground">{tool.tagline}</p>
      </div>

      <Card>
        <CardContent className="pt-1 space-y-3">
          <p className="font-medium">{t.toolPage.howItWorks}</p>
          <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
            {tool.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <div className="rounded-xl border border-border px-4 py-3 flex items-center justify-between text-sm">
        <span>
          {t.toolPage.voicePrefix}{" "}
          <strong className="text-red-bright">{completion}%</strong>
        </span>
        <Link href="/contexte" className="underline underline-offset-4">
          {completion < 100 ? t.toolPage.improveVoice : t.toolPage.myVoice}
        </Link>
      </div>

      <ToolRunner tool={tool} balance={balance ?? 0} t={t} />
    </div>
  );
}
