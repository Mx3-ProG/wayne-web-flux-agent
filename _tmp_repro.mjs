import { config } from "dotenv"; config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const token = fs.readFileSync("/tmp/session_token.txt", "utf8");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const asUser = createClient(url, anon, { global: { headers: { Authorization: "Bearer " + token } } });
const PID = "262e2d56-63b9-4405-b1e3-aca4379de6ef";

async function tryPatch(label, fields) {
  const { data, error } = await asUser.rpc("merge_page_draft", { pid: PID, fields });
  console.log(`--- merge_page_draft [${label}] ---`);
  console.log("data:", data, "error:", error ? JSON.stringify(error) : null);
  const pub = await asUser.rpc("publish_page", { pid: PID });
  console.log(`--- publish_page [${label}] ---`);
  console.log("data:", pub.data, "error:", pub.error ? JSON.stringify(pub.error) : null);
}

const cases = process.argv.slice(2);

if (cases.includes("design")) {
  await tryPatch("design", { design: { kitId: "neon" } });
}
if (cases.includes("navigation")) {
  await tryPatch("navigation", {
    navigation: {
      items: [{ id: "35946b73-d447-4808-9dcd-6f271f8f4a32", kind: "page", label: "Accueil", target: "" }],
      sticky: true,
      showLogo: true,
      transparent: true,
    },
  });
}
if (cases.includes("typography")) {
  await tryPatch("typography", { typography: { headingFont: "lora", headingScale: "xl" } });
}
if (cases.includes("sections")) {
  await tryPatch("sections", {
    sections: [
      { id: "promo", type: "promo", enabled: true },
      { id: "offres", type: "offres", enabled: true },
      { id: "boutique", type: "boutique", enabled: true },
      { id: "prestations", type: "prestations", enabled: true },
      { id: "galerie", type: "galerie", enabled: true },
      { id: "avis", type: "avis", enabled: true },
      { id: "horaires", type: "horaires", enabled: true },
      { id: "b49675b1-fa6f-4b07-bbc5-7836aca7c422", type: "newsletter", enabled: true, settings: {} },
      { id: "7e68d5d8-1e0b-4d4f-9298-29f1a32795d0", type: "carte", enabled: true, settings: {} },
      { id: "810f56b7-2b62-429f-b724-cf41d9312d34", type: "google_business", enabled: true, settings: { url: "https://maps.app.goo.gl/n3AoQsv9LLUEu4M19" } },
    ],
  });
}
if (cases.includes("appearance")) {
  await tryPatch("appearance", { appearance: { mode: "dark", accent: "#ff2600", allowVisitorModeToggle: true } });
}
if (cases.includes("colors")) {
  await tryPatch("colors", { colors: { card: "#000000", dark: "#000000", text: "#241d18", primary: "#ff2600", background: "#000000", heroGradient: true } });
}
if (cases.includes("floating_cta")) {
  await tryPatch("floating_cta", { floating_cta: { type: "whatsapp", number: "060718271" } });
}
if (cases.includes("everything")) {
  await tryPatch("everything", {
    tagline: "J'aime klaxonner dans la rue",
    appearance: { mode: "dark", accent: "#ff2600", allowVisitorModeToggle: true },
    design: { kitId: "neon" },
    typography: { headingFont: "lora", headingScale: "xl" },
    navigation: {
      items: [{ id: "35946b73-d447-4808-9dcd-6f271f8f4a32", kind: "page", label: "Accueil", target: "" }],
      sticky: true,
      showLogo: true,
      transparent: true,
    },
  });
}
