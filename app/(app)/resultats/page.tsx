import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Generation } from "@/lib/types";
import { GenerationList } from "@/components/tools/generation-list";

export const metadata = { title: "Mon coffre" };

export default async function ResultatsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: generations } = await supabase
    .from("generations")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <GenerationList generations={(generations ?? []) as Generation[]} />
  );
}
