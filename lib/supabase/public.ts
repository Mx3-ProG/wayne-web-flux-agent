import { createClient } from "@supabase/supabase-js";

// Client anonyme pour les données explicitement publiques par RLS.
// Il ne doit jamais recevoir la service-role key.
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}
