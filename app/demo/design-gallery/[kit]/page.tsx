import { notFound } from "next/navigation";
import { VitrineView } from "@/components/vitrine/vitrine-view";
import { DESIGN_KIT_BY_ID } from "@/lib/vitrine-design/registry";
import { STOREFRONT_GALLERY_COMMERCE, storefrontGalleryFixture } from "@/lib/vitrine-design/fixtures";

// Route de capture locale uniquement. La galerie durable et sécurisée vit dans
// FLUX Control ; cette surface permet aux tests responsive de tourner sans MFA.
export default async function LocalDesignFixture({ params }: { params: Promise<{ kit: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { kit: kitId } = await params;
  const kit = DESIGN_KIT_BY_ID.get(kitId);
  if (!kit) notFound();
  return <VitrineView page={storefrontGalleryFixture(kit.legacyTheme)} {...STOREFRONT_GALLERY_COMMERCE} preview poweredBy />;
}
