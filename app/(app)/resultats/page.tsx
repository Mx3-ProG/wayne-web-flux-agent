import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getActivePageId } from "@/lib/active-project";
import type { Generation } from "@/lib/types";
import { getAccountLocale } from "@/lib/i18n/locale.server";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { defaultLocale } from "@/lib/i18n/config";
import { GenerationList } from "@/components/tools/generation-list";

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const locale = user ? await getAccountLocale(supabase, user.id) : defaultLocale;
  return { title: (await getDictionary(locale, "tools")).meta.title };
}

export default async function ResultatsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Contenus du projet actif.
  const [pageId, locale] = await Promise.all([
    getActivePageId(supabase, user.id),
    getAccountLocale(supabase, user.id),
  ]);
  const t = await getDictionary(locale, "tools");
  const { data: generations } = pageId
    ? await supabase
        .from("generations")
        .select("*")
        .eq("user_id", user.id)
        .eq("page_id", pageId)
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: [] as Generation[] };

  return (
    <GenerationList
      generations={(generations ?? []) as Generation[]}
      t={t}
      locale={locale}
    />
  );
}
