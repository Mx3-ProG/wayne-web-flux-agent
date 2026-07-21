import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { sendEmail } from "./send";
import {
  buyerOrderAccepted,
  buyerOrderCancelled,
  buyerOrderConfirmation,
  buyerOrderReady,
  sellerNewOrder,
  type OrderEmailItem,
} from "./templates";

// Orchestration des emails de commande. Toujours appelé hors du chemin
// critique (after()) : toute erreur est loguée, jamais propagée.
//
// Langue : le vendeur reçoit ses emails dans la langue de son compte
// (profiles.locale) ; l'acheteur, qui n'a pas de compte FLUX, reçoit les
// siens dans la langue de la vitrine où il a commandé (pages.default_locale).

function resolveLocale(value: string | null | undefined): Locale {
  return value && hasLocale(value) ? value : defaultLocale;
}

async function fetchOrderContext(orderId: string, pageId: string) {
  const supabase = createAdminClient();
  const [itemsRes, pageRes] = await Promise.all([
    supabase
      .from("order_items")
      .select("name, unit_price_cents, quantity")
      .eq("order_id", orderId),
    supabase
      .from("pages")
      .select("business_name, user_id, default_locale")
      .eq("id", pageId)
      .single(),
  ]);
  const sellerRes = pageRes.data
    ? await supabase
        .from("profiles")
        .select("email, business_email, company_name, locale")
        .eq("user_id", pageRes.data.user_id)
        .single()
    : { data: null };

  const buyerLocale = resolveLocale(pageRes.data?.default_locale);
  const t = await getDictionary(buyerLocale, "emails");
  const shopName =
    pageRes.data?.business_name ||
    sellerRes.data?.company_name ||
    t.order.defaultShopName;
  return {
    items: (itemsRes.data ?? []) as OrderEmailItem[],
    shopName,
    // Jamais l'email personnel du vendeur vers l'acheteur : business_email
    // sinon rien.
    sellerReplyTo: sellerRes.data?.business_email || null,
    sellerEmail: sellerRes.data?.business_email || sellerRes.data?.email || null,
    sellerLocale: resolveLocale(sellerRes.data?.locale),
    buyerLocale,
  };
}

export async function sendOrderCreatedEmails(args: {
  orderId: string;
  pageId: string;
  firstName: string;
  phone: string;
  buyerEmail: string | null;
  address: string | null;
  note: string;
  totalCents: number;
}): Promise<void> {
  const ctx = await fetchOrderContext(args.orderId, args.pageId);
  const base = {
    orderId: args.orderId,
    firstName: args.firstName,
    totalCents: args.totalCents,
    items: ctx.items,
    shopName: ctx.shopName,
    address: args.address,
    note: args.note,
  };

  const sends: Promise<void>[] = [];

  if (ctx.sellerEmail) {
    sends.push(
      sellerNewOrder(
        { ...base, buyerPhone: args.phone, buyerEmail: args.buyerEmail },
        ctx.sellerLocale
      ).then((tpl) =>
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
    rateLimit(`email:${args.buyerEmail}`, 3, 3_600_000)
  ) {
    sends.push(
      buyerOrderConfirmation(base, ctx.buyerLocale).then((tpl) =>
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

export async function sendOrderStatusEmail(
  orderId: string,
  status: "accepted" | "cancelled" | "ready"
): Promise<void> {
  const supabase = createAdminClient();
  const { data: order } = await supabase
    .from("orders")
    .select("first_name, email, page_id")
    .eq("id", orderId)
    .maybeSingle();
  if (!order?.email) return;
  if (!rateLimit(`email:${order.email}`, 5, 3_600_000)) return;

  const { data: page } = await supabase
    .from("pages")
    .select("business_name, user_id, default_locale")
    .eq("id", order.page_id)
    .single();
  const { data: seller } = page
    ? await supabase
        .from("profiles")
        .select("business_email")
        .eq("user_id", page.user_id)
        .single()
    : { data: null };

  const locale = resolveLocale(page?.default_locale);
  const t = await getDictionary(locale, "emails");
  const data = {
    firstName: order.first_name,
    shopName: page?.business_name || t.order.defaultShopName,
    orderId,
  };
  const tpl = await (status === "accepted"
    ? buyerOrderAccepted(data, locale)
    : status === "ready"
      ? buyerOrderReady(data, locale)
      : buyerOrderCancelled(data, locale));
  await sendEmail({
    to: order.email,
    subject: tpl.subject,
    html: tpl.html,
    replyTo: seller?.business_email || null,
  });
}
