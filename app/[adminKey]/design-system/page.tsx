import Link from "next/link";
import { VitrineView } from "@/components/vitrine/vitrine-view";
import { DESIGN_KITS } from "@/lib/vitrine-design/kits/catalog";
import { STOREFRONT_GALLERY_COMMERCE, storefrontGalleryFixture } from "@/lib/vitrine-design/fixtures";
import type { PageTheme } from "@/lib/types";
import styles from "./page.module.css";

export default async function StorefrontDesignGallery({ params, searchParams }: { params: Promise<{ adminKey: string }>; searchParams: Promise<{ kit?: string }> }) {
  const { adminKey } = await params;
  const query = await searchParams;
  const selected = DESIGN_KITS.find((kit) => kit.id === query.kit) ?? DESIGN_KITS[0];
  const page = storefrontGalleryFixture(selected.legacyTheme as PageTheme);

  return <>
    <h1 className={styles.title}>Galerie vitrines V2</h1>
    <p className={styles.intro}>Fixture de référence complète. Ce rendu utilise exactement le composant de l’éditeur et de la page publiée.</p>
    <nav className={styles.tabs} aria-label="Templates de vitrine">
      {DESIGN_KITS.map((kit) => <Link key={kit.id} href={`/${adminKey}/design-system?kit=${kit.id}`} aria-current={kit.id === selected.id ? "page" : undefined}>{kit.name}</Link>)}
    </nav>
    <div className={styles.meta}><strong>{selected.name}</strong><span>{selected.layoutProfile}</span><span>v{selected.version}</span></div>
    <div className={styles.preview}><VitrineView page={page} {...STOREFRONT_GALLERY_COMMERCE} preview poweredBy /></div>
  </>;
}
