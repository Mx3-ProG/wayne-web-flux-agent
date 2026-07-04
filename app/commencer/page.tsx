import type { Metadata } from "next";
import { Tunnel } from "./tunnel";

export const metadata: Metadata = {
  title: "Créons ton espace",
  description:
    "Configure gratuitement ton espace Wayne Web Flux et ta présence en ligne en quelques étapes.",
};

export default function CommencerPage() {
  return <Tunnel />;
}
