import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  }

  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  if (error) {
    return NextResponse.json(
      { error: "Compteur indisponible." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { count: count ?? 0 },
    { headers: { "Cache-Control": "no-store" } }
  );
}
