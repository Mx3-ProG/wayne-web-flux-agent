import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { CookieConsent } from "@/components/cookie-consent";
import { GoogleTag } from "@/components/google-tag";
import { FluxLoader } from "@/components/flux-loader";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { getRequestLocale } from "@/lib/i18n/locale.server";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { LOCALE_BCP47, LOCALE_OG, isRtl } from "@/lib/i18n/config";
import { MarketingAssistant } from "@/components/assistant/marketing-assistant";
import { AssistantI18nProvider } from "@/components/assistant/assistant-i18n-provider";
import "./globals.css";

// Polices système auto-hébergées (voir les variables --font-* dans
// globals.css) : aucun appel à next/font/google, donc aucune requête de
// compilation vers fonts.googleapis.com/gstatic.com.

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const dict = await getDictionary(locale, "landing");
  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL || "https://www.flux-wayne.com"
    ),
    title: {
      default: dict.meta.title,
      template: "%s · Wayne Web Flux",
    },
    description: dict.meta.description,
    applicationName: "Wayne Web Flux",
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: "Wayne Flux",
    },
    formatDetection: {
      telephone: false,
    },
    openGraph: {
      title: dict.meta.ogTitle,
      description: dict.meta.ogDescription,
      siteName: "Wayne Web Flux",
      locale: LOCALE_OG[locale],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: dict.meta.ogTitle,
      description: dict.meta.ogDescription,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getRequestLocale();

  return (
    <html
      lang={LOCALE_BCP47[locale]}
      dir={isRtl(locale) ? "rtl" : "ltr"}
      data-scroll-behavior="smooth"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <AssistantI18nProvider locale={locale}>
        <FluxLoader />
        <ServiceWorkerRegistration />
        {children}
        <MarketingAssistant />
        <CookieConsent />
        {/* Ne s'active que sur les pages marketing, après consentement. */}
        <GoogleTag measurementId={process.env.NEXT_PUBLIC_GOOGLE_ADS_ID ?? ""} />
        <Toaster />
        </AssistantI18nProvider>
      </body>
    </html>
  );
}
