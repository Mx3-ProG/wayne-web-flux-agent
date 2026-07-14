import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { CookieConsent } from "@/components/cookie-consent";
import { FluxLoader } from "@/components/flux-loader";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.flux-wayne.com"
  ),
  title: {
    default: "Wayne Web Flux — Visibilité, leads et outils pour ton commerce",
    template: "%s · Wayne Web Flux",
  },
  description:
    "Gagne du temps, booste ta visibilité Google et génère plus de prospects avec la solution tout-en-un de Wayne Web pour les professionnels.",
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
    title: "Wayne Web Flux — Ton commerce, vu partout",
    description:
      "Visibilité, prospects, rendez-vous et outils réunis dans un seul espace pensé pour les professionnels.",
    siteName: "Wayne Web Flux",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Wayne Web Flux — Ton commerce, vu partout",
    description:
      "Visibilité, prospects, rendez-vous et outils réunis dans un seul espace pensé pour les professionnels.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" data-scroll-behavior="smooth" className={`${inter.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <FluxLoader />
        {children}
        <CookieConsent />
        <Toaster />
      </body>
    </html>
  );
}
