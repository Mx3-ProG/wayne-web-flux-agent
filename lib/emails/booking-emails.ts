import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n/config";
import { formatDate } from "@/lib/i18n/format";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { sendEmail } from "./send";
import {
  buyerBookingCancelled,
  buyerBookingConfirmed,
  buyerBookingRefused,
  buyerBookingRequest,
  sellerNewBooking,
  type BookingEmailData,
} from "./templates";

// Orchestration des emails de réservation (agenda), pendant de order-emails.ts.
// Toujours appelé hors du chemin critique : toute erreur est loguée, jamais
// propagée — une réservation enregistrée ne doit pas échouer parce qu'un email
// ne part pas.
//
// Langue : le professionnel reçoit ses emails dans la langue de son compte
// (profiles.locale) ; le client, qui n'a pas de compte FLUX, reçoit les siens
// dans la langue de la vitrine où il a réservé (pages.default_locale).

function resolveLocale(value: string | null | undefined): Locale {
  return value && hasLocale(value) ? value : defaultLocale;
}

// « samedi 8 août 2026 à 14:30 » dans la locale du destinataire. Les créneaux
// sont stockés en heure locale du commerce (date + start_time séparés, sans
// fuseau) : on compose la chaîne sans passer par UTC, sinon un rendez-vous de
// 00:30 bascule d'un jour selon le serveur.
function formatSlot(date: string, startTime: string, locale: Locale): string {
  const time = String(startTime).slice(0, 5);
  const [year, month, day] = date.split("-").map(Number);
  const dayLabel = formatDate(locale, new Date(year, month - 1, day), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `${dayLabel} · ${time}`;
}

type BookingRow = {
  first_name: string;
  email: string | null;
  phone: string;
  date: string;
  start_time: string;
  service_name: string;
  page_id: string;
};

// Contexte partagé : nom de la boutique, email du professionnel et locales.
async function fetchBookingContext(pageId: string) {
  const supabase = createAdminClient();
  const { data: page } = await supabase
    .from("pages")
    .select("business_name, user_id, default_locale")
    .eq("id", pageId)
    .single();
  const { data: seller } = page
    ? await supabase
        .from("profiles")
        .select("email, business_email, company_name, locale")
        .eq("user_id", page.user_id)
        .single()
    : { data: null };

  const buyerLocale = resolveLocale(page?.default_locale);
  const t = await getDictionary(buyerLocale, "emails");
  return {
    shopName:
      page?.business_name || seller?.company_name || t.order.defaultShopName,
    // Jamais l'email personnel du professionnel vers le client : business_email
    // sinon rien (même règle que pour les commandes).
    sellerReplyTo: seller?.business_email || null,
    sellerEmail: seller?.business_email || seller?.email || null,
    sellerLocale: resolveLocale(seller?.locale),
    buyerLocale,
  };
}

// Demande de rendez-vous déposée : accusé de réception au client (la
// réservation part en `pending`, il doit savoir qu'elle n'est pas encore
// confirmée) + alerte au professionnel.
export async function sendBookingCreatedEmails(args: {
  pageId: string;
  firstName: string;
  phone: string;
  buyerEmail: string | null;
  serviceName: string;
  date: string;
  startTime: string;
}): Promise<void> {
  const ctx = await fetchBookingContext(args.pageId);
  const sends: Promise<void>[] = [];

  if (ctx.sellerEmail) {
    const data: BookingEmailData & { buyerPhone: string; buyerEmail: string | null } = {
      firstName: args.firstName,
      shopName: ctx.shopName,
      serviceName: args.serviceName,
      when: formatSlot(args.date, args.startTime, ctx.sellerLocale),
      buyerPhone: args.phone,
      buyerEmail: args.buyerEmail,
    };
    sends.push(
      sellerNewBooking(data, ctx.sellerLocale).then((tpl) =>
        sendEmail({
          to: ctx.sellerEmail!,
          subject: tpl.subject,
          html: tpl.html,
          replyTo: args.buyerEmail,
        })
      )
    );
  }

  if (
    args.buyerEmail &&
    (await rateLimit(`email:${args.buyerEmail}`, 3, 3_600_000))
  ) {
    sends.push(
      buyerBookingRequest(
        {
          firstName: args.firstName,
          shopName: ctx.shopName,
          serviceName: args.serviceName,
          when: formatSlot(args.date, args.startTime, ctx.buyerLocale),
        },
        ctx.buyerLocale
      ).then((tpl) =>
        sendEmail({
          to: args.buyerEmail!,
          subject: tpl.subject,
          html: tpl.html,
          replyTo: ctx.sellerReplyTo,
        })
      )
    );
  }

  await Promise.allSettled(sends);
}

// Suite donnée à la demande. `confirmed` est la seule bonne nouvelle ; les deux
// autres ferment le rendez-vous et renvoient le client vers la vitrine.
export async function sendBookingStatusEmail(
  bookingId: string,
  status: "confirmed" | "refused" | "cancelled"
): Promise<void> {
  const supabase = createAdminClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("first_name, email, phone, date, start_time, service_name, page_id")
    .eq("id", bookingId)
    .maybeSingle<BookingRow>();
  if (!booking?.email) return;
  if (!(await rateLimit(`email:${booking.email}`, 5, 3_600_000))) return;

  const ctx = await fetchBookingContext(booking.page_id);
  const data: BookingEmailData = {
    firstName: booking.first_name,
    shopName: ctx.shopName,
    serviceName: booking.service_name,
    when: formatSlot(booking.date, booking.start_time, ctx.buyerLocale),
  };

  const tpl = await (status === "confirmed"
    ? buyerBookingConfirmed(data, ctx.buyerLocale)
    : status === "refused"
      ? buyerBookingRefused(data, ctx.buyerLocale)
      : buyerBookingCancelled(data, ctx.buyerLocale));

  await sendEmail({
    to: booking.email,
    subject: tpl.subject,
    html: tpl.html,
    replyTo: ctx.sellerReplyTo,
  });
}
