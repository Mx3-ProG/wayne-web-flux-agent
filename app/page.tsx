import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { MarketingFooter } from "@/components/marketing-footer";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CalendarCheck2,
  Check,
  ChevronDown,
  Coins,
  Database,
  Globe2,
  MessageCircleMore,
  PhoneCall,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import styles from "./home.module.css";
import { PillarGrid } from "@/components/landing/pillar-grid";
import { ScrollingAcquireCta } from "@/components/landing/scrolling-acquire-cta";
import { LiveSitePreview } from "@/components/landing/live-site-preview";
import { NewsletterForm } from "@/components/landing/newsletter-form";
import { ContactForm } from "@/components/landing/contact-form";
import { ShareCta } from "@/components/landing/share-cta";
import { SectionScroller } from "@/components/landing/section-scroller";
import { FluxBrand } from "@/components/flux-brand";
import { MarketingHeader } from "@/components/landing/marketing-header";
import { getRequestLocale } from "@/lib/i18n/locale.server";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localeHref, LOCALE_OG } from "@/lib/i18n/config";
import { languageAlternates } from "@/lib/i18n/seo";

const TOOL_ICONS = [
  Globe2,
  PhoneCall,
  CalendarDays,
  Sparkles,
  ShoppingBag,
  MessageCircleMore,
  BarChart3,
  Database,
  Coins,
];

const TESTIMONIAL_PROFILES = [
  { name: "Sophie", initials: "SO", photo: "/temoignages/sophie_fleuriste_lyon.jpg" },
  { name: "Karim", initials: "KA", photo: "/temoignages/karim_barbier_paris.jpg" },
  { name: "Claire", initials: "CL", photo: "/temoignages/claire_institut_beaute.jpg" },
  { name: "Marco", initials: "MA", photo: "/temoignages/marco_restaurant.jpg" },
  { name: "Julie", initials: "JU", photo: "/temoignages/julie_photographe_nante.jpg" },
  { name: "Laurent", initials: "LA", photo: "/temoignages/laurent_garagiste_prestige.jpg" },
];

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const dict = await getDictionary(locale, "landing");
  return {
    title: { absolute: dict.meta.title },
    description: dict.meta.description,
    alternates: languageAlternates(locale, "/"),
    openGraph: {
      title: dict.meta.ogTitle,
      description: dict.meta.ogDescription,
      locale: LOCALE_OG[locale],
    },
    twitter: {
      title: dict.meta.ogTitle,
      description: dict.meta.ogDescription,
    },
  };
}

export default async function LandingPage() {
  const locale = await getRequestLocale();
  const [dict, common] = await Promise.all([
    getDictionary(locale, "landing"),
    getDictionary(locale, "common"),
  ]);
  const href = (path: string) => localeHref(locale, path);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: dict.faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <div className={styles.page}>
      <MarketingHeader
        locale={locale}
        homeHref={href("/")}
        pricingHref={href("/pricing")}
        loginHref={href("/login")}
        homeAria={common.brandHomeAria}
        navAria={common.nav.aria}
        languageAria={common.languageSwitcher.aria}
        labels={common.nav}
      />

      <main>
        <section className={styles.hero}>
          <div className={styles.heroGlow} />
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>
                <span />
                {dict.hero.eyebrow}
              </p>
              <h1>
                {dict.hero.titleLine1}
                <br />
                {dict.hero.titleLine2} <em>{dict.hero.titleEm}</em>
              </h1>
              <p className={styles.heroText}>{dict.hero.text}</p>
              <div className={styles.heroActions}>
                <Link className={`flux-button-smooth ${styles.primaryCta}`} href="/commencer">
                  {dict.hero.primaryCta}
                  <ArrowRight aria-hidden="true" />
                </Link>
                <a className={styles.textCta} href="#solution">
                  {dict.hero.secondaryCta}
                </a>
              </div>
              <div className={styles.reassurance}>
                <span>
                  <Check aria-hidden="true" /> {dict.hero.reassurance1}
                </span>
                <span>
                  <Check aria-hidden="true" /> {dict.hero.reassurance2}
                </span>
                <span>
                  <Check aria-hidden="true" /> {dict.hero.reassurance3}
                </span>
              </div>
            </div>

            <div className={styles.productStage} aria-label={dict.hero.stageAria}>
              <div className={styles.orbitOne} />
              <div className={styles.orbitTwo} />
              <div className={styles.floatingCard}>
                <span className={styles.floatingIcon}>
                  <Search aria-hidden="true" />
                </span>
                <span>
                  <small>{dict.hero.floatingLabel}</small>
                  <strong>{dict.hero.floatingValue}</strong>
                </span>
              </div>
              <div className={styles.appWindow}>
                <div className={styles.appTopbar}>
                  <FluxBrand className={styles.appLogo} markOnly />
                  <span>{dict.hero.appSpace}</span>
                  <span className={styles.avatar}>MD</span>
                </div>
                <div className={styles.appBody}>
                  <div>
                    <p className={styles.appGreeting}>{dict.hero.appGreeting}</p>
                    <h2>{dict.hero.appHeadline}</h2>
                  </div>
                  <div className={styles.metricGrid}>
                    <div className={styles.metricMain}>
                      <span>{dict.hero.appViews}</span>
                      <strong>1 248</strong>
                      <small>{dict.hero.appViewsTrend}</small>
                      <div className={styles.chart}>
                        <i />
                        <i />
                        <i />
                        <i />
                        <i />
                        <i />
                        <i />
                      </div>
                    </div>
                    <div className={styles.metricSide}>
                      <CalendarCheck2 aria-hidden="true" />
                      <span>{dict.hero.appAppointments}</span>
                      <strong>18</strong>
                      <small>{dict.hero.appThisMonth}</small>
                    </div>
                  </div>
                  <div className={styles.appSectionTitle}>
                    <span>{dict.hero.appMyTools}</span>
                    <small>{dict.hero.appSeeAll}</small>
                  </div>
                  <div className={styles.appTools}>
                    <div>
                      <Sparkles aria-hidden="true" />
                      <span>{dict.hero.appCreatePost}</span>
                    </div>
                    <div>
                      <MessageCircleMore aria-hidden="true" />
                      <span>{dict.hero.appReply}</span>
                    </div>
                    <div>
                      <Search aria-hidden="true" />
                      <span>{dict.hero.appBoostSeo}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className={styles.leadCard}>
                <span className={styles.leadDot} />
                <span>
                  <small>{dict.hero.leadLabel}</small>
                  <strong>{dict.hero.leadValue}</strong>
                </span>
              </div>
            </div>
          </div>
          <div className={styles.heroFoot}>
            <span>{dict.hero.footLeft}</span>
            <div />
            <span>{dict.hero.footRight}</span>
          </div>
        </section>

        <section className={styles.manifesto} id="solution">
          <p className={styles.sectionIndex}>{dict.manifesto.index}</p>
          <div className={styles.manifestoGrid}>
            <h2>
              {dict.manifesto.titleLine1}
              <br />
              {dict.manifesto.titleLine2}{" "}
              <em className={styles.glitch} data-text={dict.manifesto.titleEm}>
                {dict.manifesto.titleEm}
              </em>
            </h2>
            <div>
              <p>{dict.manifesto.p1}</p>
              <p>{dict.manifesto.p2}</p>
            </div>
          </div>
        </section>

        <section className={styles.liveShowcase} aria-labelledby="live-showcase-title">
          <div className={styles.liveShowcaseIntro}>
            <p className={styles.sectionIndex}>{dict.liveShowcase.index}</p>
            <h2 id="live-showcase-title">
              {dict.liveShowcase.titleLine1}
              <br />
              {dict.liveShowcase.titleLine2} <em>{dict.liveShowcase.titleEm}</em>
            </h2>
            <p>{dict.liveShowcase.text}</p>
          </div>

          <LiveSitePreview dict={dict.liveShowcase} />
        </section>

        <section className={styles.pillars}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.sectionIndex}>{dict.pillarsSection.index}</p>
              <h2>
                {dict.pillarsSection.titleLine1}
                <br />
                {dict.pillarsSection.titleLine2}{" "}
                <span className={styles.goldWord}>{dict.pillarsSection.titleGold}</span>
              </h2>
            </div>
            <p>{dict.pillarsSection.text}</p>
          </div>
          <PillarGrid dict={dict.pillarsSection} pillars={dict.pillars} />
          <div className={styles.pillarsCtaWrap}>
            <Link className={`flux-button-smooth ${styles.askFluxCta}`} href="/commencer">
              <span className={styles.askFluxFill} aria-hidden="true" />
              <span className={styles.askFluxText}>
                {dict.pillarsSection.askFlux}{" "}
                <strong className={styles.askFluxGlitch} data-text="FLUX">
                  FLUX
                </strong>
              </span>
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section className={styles.toolsSection} id="outils" data-tools-section>
          <div className={styles.toolsIntro}>
            <p className={styles.sectionIndex}>{dict.toolsSection.index}</p>
            <h2>
              {dict.toolsSection.titleLine1}
              <br />
              {dict.toolsSection.titleLine2} <em>{dict.toolsSection.titleEm}</em>
            </h2>
            <p>{dict.toolsSection.text}</p>
            <ScrollingAcquireCta acquireLabel={dict.toolsSection.acquire} />
          </div>
          <div className={styles.toolsList}>
            {dict.tools.map((tool, index) => {
              const Icon = TOOL_ICONS[index] ?? Sparkles;
              return (
                <article key={tool.title} className={styles.toolRow}>
                  <span className={styles.toolIcon}>
                    <Icon aria-hidden="true" />
                  </span>
                  <div>
                    <p>{tool.label}</p>
                    <h3>{tool.title}</h3>
                    <span>{tool.text}</span>
                  </div>
                  <strong>{tool.result}</strong>
                </article>
              );
            })}
          </div>
          <div className={styles.toolsAccordion}>
            {dict.tools.map((tool, index) => {
              const Icon = TOOL_ICONS[index] ?? Sparkles;
              return (
                <details key={tool.title} name="flux-tools" open={index === 0}>
                  <summary>
                    <span className={styles.toolAccordionSummary}>
                      <span className={styles.toolAccordionIcon}>
                        <Icon aria-hidden="true" />
                      </span>
                      <span className={styles.toolAccordionHeading}>
                        <small>{tool.label}</small>
                        <strong>{tool.title}</strong>
                      </span>
                      <ChevronDown aria-hidden="true" />
                    </span>
                  </summary>
                  <div className={styles.toolAccordionBody}>
                    <p>{tool.text}</p>
                    <em>{tool.result}</em>
                    <Link className={`flux-button-smooth ${styles.toolAccordionCta}`} href="/commencer">
                      {dict.toolsSection.askFlux} <strong>FLUX</strong>
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </div>
                </details>
              );
            })}
            <Link className={`flux-button-smooth ${styles.askFluxCta} ${styles.mobileAcquireCta}`} href="/commencer">
              <span className={styles.askFluxFill} aria-hidden="true" />
              <span className={styles.askFluxText}>
                {dict.toolsSection.acquire}{" "}
                <strong className={styles.askFluxGlitch} data-text="FLUX">FLUX</strong>
              </span>
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section className={styles.story} id="histoire">
          <div className={styles.storyCard}>
            <div className={styles.storyStamp}>
              <Star aria-hidden="true" />
              <span>150+</span>
              <small>{dict.story.stamp}</small>
            </div>
            <div className={styles.storyCopy}>
              <p className={styles.sectionIndex}>{dict.story.index}</p>
              <h2>
                {dict.story.titleLine1}
                <br />
                {dict.story.titleLine2} <em>{dict.story.titleEm}</em>
              </h2>
              <p>
                {dict.story.text}{" "}
                <span
                  className={styles.storyGlitch}
                  data-text={dict.story.textGlitch}
                >
                  {dict.story.textGlitch}
                </span>
              </p>
              <div className={styles.storyProofs}>
                <span><strong>{dict.story.proof1Strong}</strong> {dict.story.proof1}</span>
                <span><strong>{dict.story.proof2Strong}</strong> {dict.story.proof2}</span>
                <span><strong>{dict.story.proof3Strong}</strong> {dict.story.proof3}</span>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.notForYou} id="pas-pour-toi">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.sectionIndex}>{dict.notForYou.index}</p>
              <h2>
                {dict.notForYou.titleLine1}
                <br />
                <em>{dict.notForYou.titleEm}</em>
              </h2>
            </div>
            <p>{dict.notForYou.text}</p>
          </div>
          <div className={styles.notForYouGrid}>
            {dict.notForYou.items.map((item, index) => (
              <article key={item.title} className={styles.notForYouCard}>
                <span className={styles.notForYouNum}>
                  <X aria-hidden="true" />
                  <small>{String(index + 1).padStart(2, "0")}</small>
                </span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.testimonials} id="avis">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.sectionIndex}>{dict.testimonialsSection.index}</p>
              <h2>
                {dict.testimonialsSection.titleLine1}
                <br />
                <em>{dict.testimonialsSection.titleEm}</em>
              </h2>
            </div>
            <p>{dict.testimonialsSection.text}</p>
          </div>
          <div className={styles.testimonialGrid}>
            {dict.testimonials.map((t, index) => {
              const profile = TESTIMONIAL_PROFILES[index];
              return (
                <figure key={profile.name} className={styles.testimonialCard}>
                  <div
                    className={styles.testimonialStars}
                    aria-label={dict.testimonialsSection.starsAria}
                  >
                    <Star aria-hidden="true" />
                    <Star aria-hidden="true" />
                    <Star aria-hidden="true" />
                    <Star aria-hidden="true" />
                    <Star aria-hidden="true" />
                  </div>
                  <blockquote>{t.quote}</blockquote>
                  <figcaption>
                    <span className={styles.testimonialAvatar} aria-hidden="true">
                      {profile.photo ? (
                        <Image
                          src={profile.photo}
                          alt=""
                          width={80}
                          height={80}
                          sizes="40px"
                        />
                      ) : (
                        profile.initials
                      )}
                    </span>
                    <span className={styles.testimonialWho}>
                      <strong>{profile.name}</strong>
                      <small>{t.job}</small>
                    </span>
                    <em className={styles.testimonialMetric}>{t.metric}</em>
                  </figcaption>
                </figure>
              );
            })}
          </div>
          <div className={styles.testimonialCtaRow}>
            <Link className={`flux-button-smooth ${styles.primaryCta}`} href="/commencer">
              {dict.testimonialsSection.cta}
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link className={styles.textCta} href={href("/login")}>
              {dict.testimonialsSection.memberCta}
            </Link>
          </div>
        </section>

        <section className={styles.faq} id="faq">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
          />
          <div className={styles.faqIntro}>
            <p className={styles.sectionIndex}>{dict.faqSection.index}</p>
            <h2>
              {dict.faqSection.titleLine1}
              <br />
              <em>{dict.faqSection.titleEm}</em>
            </h2>
            <p>{dict.faqSection.text}</p>
            <a className={styles.textCta} href="#contact">
              {dict.faqSection.askCta}
            </a>
          </div>
          <div className={styles.faqList}>
            {dict.faq.map((item, index) => (
              <details
                key={item.q}
                className={styles.faqItem}
                name="flux-faq"
                open={index === 0}
              >
                <summary>
                  <span>{item.q}</span>
                  <ChevronDown aria-hidden="true" />
                </summary>
                <div className={styles.faqBody}>
                  <p>{item.a}</p>
                </div>
              </details>
            ))}
            <Link className={`flux-button-smooth ${styles.primaryCta} ${styles.faqCta}`} href="/commencer">
              {dict.faqSection.finalCta}
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section className={styles.newsletter} id="newsletter">
          <div className={styles.newsletterCard}>
            <div className={styles.newsletterCopy}>
              <p className={styles.sectionIndex}>{dict.newsletter.index}</p>
              <h2>
                {dict.newsletter.titleLine1}
                <br />
                <em>{dict.newsletter.titleEm}</em>
              </h2>
              <p>{dict.newsletter.text}</p>
            </div>
            <NewsletterForm dict={dict.newsletter} />
          </div>
        </section>

        <section className={styles.contact} id="contact">
          <div className={styles.contactGrid}>
            <div className={styles.contactIntro}>
              <p className={styles.sectionIndex}>{dict.contact.index}</p>
              <h2>
                {dict.contact.titleLine1}
                <br />
                <em>{dict.contact.titleEm}</em>
              </h2>
              <p>{dict.contact.text}</p>
              <div className={styles.contactChannels}>
                <a href="mailto:contact@wayne-web.com">contact@wayne-web.com</a>
                <ShareCta
                  idleLabel={dict.contact.shareIdle}
                  copiedLabel={dict.contact.shareCopied}
                  shareText={dict.contact.shareText}
                />
              </div>
            </div>
            <ContactForm dict={dict.contact} />
          </div>
        </section>

        <section className={styles.finalCta}>
          <p className={styles.eyebrow}>
            <span />
            {dict.finalCta.eyebrow}
          </p>
          <h2>
            {dict.finalCta.titleLine1}
            <br />
            <em>{dict.finalCta.titleEm}</em>
          </h2>
          <p>{dict.finalCta.text}</p>
          <Link className={`flux-button-smooth ${styles.primaryCta} ${styles.ctaFloat}`} href="/commencer">
            {dict.finalCta.cta}
            <ArrowRight aria-hidden="true" />
          </Link>
          <small>{dict.finalCta.small}</small>
        </section>
      </main>

      <MarketingFooter locale={locale} dict={common} />

      <SectionScroller
        upAria={dict.scroller.upAria}
        downAria={dict.scroller.downAria}
      />

      <aside className={styles.mobileStickyCta} aria-label={dict.sticky.aria}>
        <Link
          className={styles.mobileStickyMain}
          href="/commencer"
          aria-label={dict.sticky.mainAria}
        >
          <span className={styles.mobileStickyShine} aria-hidden="true" />
          <span
            className={styles.mobileStickyLabel}
            data-text={`${dict.sticky.label} FLUX`}
          >
            {dict.sticky.label} <strong>FLUX</strong>
          </span>
          <ArrowRight aria-hidden="true" />
        </Link>
        <Link className={styles.mobileStickyLogin} href={href("/login")}>
          {dict.sticky.login}
        </Link>
      </aside>
    </div>
  );
}
