import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActivePageId } from "@/lib/active-project";
import type { Generation } from "@/lib/types";
import { GenerationList } from "@/components/tools/generation-list";

export const metadata = { title: "Mon coffre" };

export default async function ResultatsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Contenus du projet actif.
  const pageId = await getActivePageId(supabase, user.id);
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
    <GenerationList generations={(generations ?? []) as Generation[]} />
  );
}
