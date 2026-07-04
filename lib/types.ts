// Types des lignes de la base (miroir de supabase/migrations/00001_schema.sql)

export type Profile = {
  user_id: string;
  name: string | null;
  email: string | null;
  onboarding_step: number;
  ical_token: string;
  created_at: string;
};

export type PageColors = {
  primary?: string;
  dark?: string;
  text?: string;
};

export type PageTheme = "editorial" | "studio" | "local" | "bold";

export type Review = { author: string; text: string };
export type GalleryPhoto = { url: string; title?: string };

export type Page = {
  id: string;
  user_id: string;
  slug: string;
  vertical: string;
  business_name: string;
  job_title: string;
  tagline: string;
  city: string;
  address: string;
  phone: string;
  socials: Record<string, string>;
  colors: PageColors;
  font: string;
  theme: PageTheme;
  logo_url: string | null;
  hero_url: string | null;
  gallery: GalleryPhoto[];
  reviews: Review[];
  offer: string;
  hours_text: string;
  legal: Record<string, string>;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type ServiceFamily = {
  id: string;
  page_id: string;
  name: string;
  position: number;
};

export type Service = {
  id: string;
  family_id: string;
  page_id: string;
  name: string;
  duration_min: number;
  price_cents: number;
  position: number;
};

export type TimeRange = [string, string]; // ["09:00","12:00"]

export type Schedule = {
  page_id: string;
  weekday: number; // 0 = dimanche
  open: boolean;
  ranges: TimeRange[];
};

export type BlockedPeriod = {
  id: string;
  page_id: string;
  start_date: string;
  end_date: string;
  reason: string;
};

export type Booking = {
  id: string;
  page_id: string;
  service_id: string | null;
  service_name: string;
  duration_min: number;
  price_cents: number;
  date: string;
  start_time: string;
  first_name: string;
  phone: string;
  email: string | null;
  status: "confirmed" | "cancelled";
  created_at: string;
};

export type Customer = {
  id: string;
  page_id: string;
  phone: string;
  first_name: string;
  email: string | null;
  note: string;
  created_at: string;
};

export type CreditEntry = {
  id: number;
  user_id: string;
  delta: number;
  reason: string;
  created_at: string;
};

export type Generation = {
  id: string;
  user_id: string;
  tool_slug: string;
  inputs: Record<string, string>;
  output: string;
  credits_spent: number;
  created_at: string;
};

export type VoiceProfile = {
  user_id: string;
  tone: string;
  address_form: string;
  emojis: string;
  specialty: string;
  often_told: string;
  story: string;
  vals: string;
  updated_at: string;
};

export function formatPrice(cents: number): string {
  const euros = cents / 100;
  return Number.isInteger(euros)
    ? `${euros} €`
    : `${euros.toFixed(2).replace(".", ",")} €`;
}

export function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}
