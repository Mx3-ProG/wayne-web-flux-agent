import type { MetadataRoute } from "next";
import { createPublicClient } from "@/lib/supabase/public";

const base = process.env.NEXT_PUBLIC_SITE_URL || "https://www.flux-wayne.com";

// Limite Google : 50 000 URL par fichier sitemap.
const PAGE_SIZE = 50000;

// Régénéré chaque jour : un site publié apparaît automatiquement le lendemain,
// sans job manuel. (Remplace l'idée d'un rafraîchissement tous les 15 jours.)
export const revalidate = 86400;

// Découpe le sitemap des vitrines en tranches de 50 000 selon le nombre de
// pages publiées. Les fichiers sont servis sur /p/sitemap/0.xml, /p/sitemap/1.xml, ...
export async function generateSitemaps() {
  const supabase = createPublicClient();
  const { count } = await supabase
    .from("pages")
    .select("id", { count: "exact", head: true })
    .eq("published", true);
  const shards = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  return Array.from({ length: shards }, (_, id) => ({ id }));
}

export default async function sitemap({
  id,
}: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const shard = Number(await id);
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("pages")
    .select("slug, updated_at")
    .eq("published", true)
    .order("id")
    .range(shard * PAGE_SIZE, shard * PAGE_SIZE + PAGE_SIZE - 1);

  return (data ?? []).map((page) => ({
    url: `${base}/p/${page.slug}`,
    lastModified: page.updated_at ? new Date(page.updated_at) : new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));
}
