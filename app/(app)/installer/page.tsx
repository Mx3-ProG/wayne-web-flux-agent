import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getAccountLocale } from "@/lib/i18n/locale.server";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { defaultLocale } from "@/lib/i18n/config";
import { InstallerContent } from "./installer-content";

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const locale = user ? await getAccountLocale(supabase, user.id) : defaultLocale;
  return { title: (await getDictionary(locale, "dashboard")).installer.metaTitle };
}

export default function InstallerPage() {
  return <InstallerContent />;
}
