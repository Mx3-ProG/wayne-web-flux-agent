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

const TOOLS = [
    {
    icon: Globe2,
    label: "Site & SEO",
    title: "Bâtis ton site et personnalise-le sans limite",
    text: "FLUX génère en quelques secondes une vitrine rapide, pensée pour Google et parfaitement adaptée à Safari.",
    result: "En ligne en quelques secondes",
  },
  {
    icon: PhoneCall,
    label: "Relation client",
    title: "Rappelle tes clients depuis la plateforme",
    text: "Retrouve le bon contact et lance ton appel en un clic, sans changer d’outil ni perdre le fil.",
    result: "Un clic pour rappeler",
  },
  {
    icon: CalendarDays,
    label: "Rendez-vous",
    title: "Donne rendez-vous à tes clients",
    text: "Propose tes disponibilités, organise tes événements et laisse tes clients réserver au bon moment.",
    result: "Un cercle qui grandi même quand tu es au fourneau",
  },
  {
    icon: Sparkles,
    label: "Contenu",
    title: "Des publications qui te ressemblent",
    text: "Une idée devient un post, un reel ou un carrousel prêt à publier grâce à FLUX - demande lui.",
    result: "2 h gagnées",
  },
  {
    icon: ShoppingBag,
    label: "Ventes",
    title: "Vends tes produits et services en direct",
    text: "Crée ton catalogue, présente tes offres et transforme ta vitrine en véritable canal de vente.",
    result: "Ton activité encaisse",
  },
  {
    icon: MessageCircleMore,
    label: "Conversion",
    title: "Chaque message peut devenir une vente",
    text: "Réponds aux demandes, relance les indécis et demande des avis sans chercher tes mots, en un clic.",
    result: "3 réponses prêtes",
  },
  {
    icon: BarChart3,
    label: "SEO local",
    title: "Google comprend enfin ton activité",
    text: "Description, services et contenus locaux structurés pour attirer les bonnes recherches.",
    result: "Visibilité renforcée",
  },
  {
    icon: Database,
    label: "Données",
    title: "Récolte les signaux précieux avant la vente",
    text: "Centralise les demandes, les intentions et les informations utiles pour mieux convertir chaque prospect.",
    result: "Des prospects qualifiés",
  },
  {
    icon: Coins,
    label: "Crédits",
    title: "Avance à ton rythme, sans abonnement forcé",
    text: "Utilise les outils selon tes besoins et démarre avec 100 crédits offerts dès ton inscription.",
    result: "100 crédits offerts",
  },
];

const TESTIMONIALS = [
  {
    name: "Sophie",
    job: "Fleuriste · Lyon",
    initials: "SO",
    photo: "/temoignages/sophie_fleuriste_lyon.jpg",
    quote:
      "Avant, mes soirées partaient dans Instagram et mon site datait de 2017. Aujourd'hui Flux publie pour moi, ma vitrine est magnifique et mes clientes réservent leurs bouquets en ligne. J'ai retrouvé mes dimanches.",
    metric: "6 h gagnées / semaine",
  },
  {
    name: "Karim",
    job: "Barbier · Paris 11e",
    initials: "KA",
    photo: "/temoignages/karim_barbier_paris.jpg",
    quote:
      "Le carnet de rendez-vous en ligne a tout changé : fini les appels pendant une coupe. Mes clients réservent la nuit, je découvre mon planning rempli au réveil. Ça, ça n'a pas de prix.",
    metric: "+30 % de réservations",
  },
  {
    name: "Claire",
    job: "Institut de beauté · Bordeaux",
    initials: "CL",
    photo: "/temoignages/claire_institut_beaute.jpg",
    quote:
      "Je pensais que Google, c'était pour les grandes enseignes. Trois semaines après avoir publié ma vitrine, une cliente m'a dit : « Je vous ai trouvée en cherchant institut près de chez moi ». J'en ai eu des frissons.",
    metric: "1ʳᵉ page Google locale",
  },
  {
    name: "Marco",
    job: "Restaurateur · Marseille",
    initials: "MA",
    photo: "/temoignages/marco_restaurant.jpg",
    quote:
      "Entre les fourneaux et les livraisons, je n'avais pas une minute pour le digital. Flux me prépare mes posts et répond à mes avis. Mon restaurant vit en ligne pendant que je cuisine.",
    metric: "2 h gagnées / jour",
  },
  {
    name: "Julie",
    job: "Photographe · Nantes",
    initials: "JU",
    photo: "/temoignages/julie_photographe_nante.jpg",
    quote:
      "Ma vitrine a été en ligne le soir même. Le lendemain, premier message d'un couple pour un mariage. Le devis est parti depuis mon espace Flux, signé dans la semaine. Je n'ai jamais signé aussi vite.",
    metric: "1 mariage signé en 7 jours",
  },
  {
    name: "Laurent",
    job: "Garage automobile · Lille",
    initials: "LA",
    photo: "/temoignages/laurent_garagiste_prestige.jpg",
    quote:
      "Je ne suis pas un homme de sites web, je suis un homme de moteurs. Flux a fait le site, le référencement et les demandes de rappel. Mon chiffre a suivi. Je recommande à tous les artisans.",
    metric: "CA +22 % en 3 mois",
  },
];

const FAQ_ITEMS = [
  {
    q: "Comment ça marche, concrètement ?",
    a: "Tu crées ton compte gratuitement, tu réponds à quelques questions sur ton activité, et Flux construit ta vitrine en quelques secondes. Ensuite, tu actives les outils dont tu as besoin : rendez-vous, publications, réponses clients, SEO local… Tout se pilote depuis un seul espace, pensé pour les gens de terrain.",
  },
  {
    q: "Combien ça coûte ?",
    a: "Tu démarres avec 100 crédits offerts, sans carte bancaire. Ensuite, tu utilises tes crédits selon tes besoins réels : pas d'abonnement forcé, pas de frais cachés. Tu avances à ton rythme, et tu ne paies que ce qui fait avancer ton commerce.",
  },
  {
    q: "Je ne suis pas doué en informatique, c'est un problème ?",
    a: "Au contraire : Flux a été construit pour toi. Si tu sais envoyer un message, tu sais utiliser Flux. Pas de code, pas de jargon, pas de réglages compliqués — tu réponds à des questions simples et l'outil fait le travail technique à ta place.",
  },
  {
    q: "En combien de temps mon site est-il en ligne ?",
    a: "Ta vitrine se déploie en 1 seconde une fois prête. La construction elle-même prend quelques minutes : le temps de répondre à quelques questions sur ton activité. Tu peux littéralement commencer ce soir et être visible demain matin.",
  },
  {
    q: "Est-ce que je peux gérer mes rendez-vous et mes clients ?",
    a: "Oui. Tes clients réservent en ligne sur ta vitrine, tu retrouves ton planning dans ton espace, et tu peux rappeler un client en un clic. Les demandes, les messages et les prospects sont centralisés au même endroit — fini les post-its et les appels manqués.",
  },
  {
    q: "Il y a un engagement ? Je peux arrêter quand je veux ?",
    a: "Aucun engagement. Tu t'inscris sans carte bancaire, tu testes avec tes crédits offerts, et tu restes uniquement si Flux te fait gagner du temps et des clients. Tes données t'appartiennent, point.",
  },
  {
    q: "Et si j'ai besoin d'aide ?",
    a: "On est développeurs, mais on est surtout à tes côtés : une vraie équipe répond à tes messages sous 24 h ouvrées. Écris-nous via le formulaire de contact juste en dessous, on lit tout et on répond vite.",
  },
];

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

function Brand() {
  return <FluxBrand className={styles.brand} priority />;
}

export default function LandingPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.nav}>
          <Link href="/" aria-label="Wayne Web Flux, accueil">
            <Brand />
          </Link>
          <nav aria-label="Navigation principale">
            <a href="#solution">La solution</a>
            <a href="#outils">Les outils</a>
            <Link href="/pricing">Tarifs</Link>
            <a href="#histoire">Notre histoire</a>
            <a href="#avis">Avis</a>
            <a href="#faq">FAQ</a>
            <a href="#contact">Contact</a>
          </nav>
          <div className={styles.navActions}>
            <Link className={styles.loginLink} href="/login">
              Connexion
            </Link>
            <Link className={`flux-button-smooth ${styles.navCta}`} href="/commencer">
              Tester gratuitement
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroGlow} />
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>
                <span />
                La force d&apos;une agence. La simplicité d&apos;un outil.
              </p>
              <h1>
                Ton commerce mérite
                <br />
                d&apos;être <em>vu partout.</em>
              </h1>
              <p className={styles.heroText}>
                Wayne Web Flux transforme ton savoir-faire en visibilité, en
                prospects et en rendez-vous. Tous les outils pour faire grandir
                ton activité, réunis dans un seul espace.
              </p>
              <div className={styles.heroActions}>
                <Link className={`flux-button-smooth ${styles.primaryCta}`} href="/commencer">
                  Booster mon commerce
                  <ArrowRight aria-hidden="true" />
                </Link>
                <a className={styles.textCta} href="#solution">
                  Découvrir la solution
                </a>
              </div>
              <div className={styles.reassurance}>
                <span>
                  <Check aria-hidden="true" /> Sans carte bancaire
                </span>
                <span>
                  <Check aria-hidden="true" /> 100 crédits offerts
                </span>
                <span>
                  <Check aria-hidden="true" /> Pensé par des développeurs
                </span>
              </div>
            </div>

            <div className={styles.productStage} aria-label="Aperçu de Wayne Web Flux">
              <div className={styles.orbitOne} />
              <div className={styles.orbitTwo} />
              <div className={styles.floatingCard}>
                <span className={styles.floatingIcon}>
                  <Search aria-hidden="true" />
                </span>
                <span>
                  <small>Visibilité Google</small>
                  <strong>+ 38% ce mois-ci</strong>
                </span>
              </div>
              <div className={styles.appWindow}>
                <div className={styles.appTopbar}>
                  <FluxBrand className={styles.appLogo} markOnly />
                  <span>Mon espace</span>
                  <span className={styles.avatar}>MD</span>
                </div>
                <div className={styles.appBody}>
                  <div>
                    <p className={styles.appGreeting}>Bonjour Mathieu,</p>
                    <h2>Fais avancer ton commerce.</h2>
                  </div>
                  <div className={styles.metricGrid}>
                    <div className={styles.metricMain}>
                      <span>Vues de ta page</span>
                      <strong>1 248</strong>
                      <small>↗ 24% sur 30 jours</small>
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
                      <span>Rendez-vous</span>
                      <strong>18</strong>
                      <small>Ce mois-ci</small>
                    </div>
                  </div>
                  <div className={styles.appSectionTitle}>
                    <span>Mes outils</span>
                    <small>Tout voir</small>
                  </div>
                  <div className={styles.appTools}>
                    <div>
                      <Sparkles aria-hidden="true" />
                      <span>Créer un post</span>
                    </div>
                    <div>
                      <MessageCircleMore aria-hidden="true" />
                      <span>Répondre à un client</span>
                    </div>
                    <div>
                      <Search aria-hidden="true" />
                      <span>Booster mon SEO</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className={styles.leadCard}>
                <span className={styles.leadDot} />
                <span>
                  <small>Nouveau prospect</small>
                  <strong>Demande reçue à l&apos;instant</strong>
                </span>
              </div>
            </div>
          </div>
          <div className={styles.heroFoot}>
            <span>Développé avec exigence par Wayne Web</span>
            <div />
            <span>Pour les indépendants, commerces et agences</span>
          </div>
        </section>

        <section className={styles.manifesto} id="solution">
          <p className={styles.sectionIndex}>01 / LA PROMESSE</p>
          <div className={styles.manifestoGrid}>
            <h2>
              Tu maîtrises ton métier.
              <br />
              Nous maîtrisons{" "}
              <em className={styles.glitch} data-text="le digital.">le digital.</em>
            </h2>
            <div>
              <p>
                Tu ne devrais pas avoir à devenir expert en référencement,
                programmation, fonction API et automatisation pour développer
                ton activité.
              </p>
              <p>
                Nous avons construit l&apos;outil que nous aurions voulu donner
                à chacun de nos clients : simple à utiliser, sérieux sous le
                capot, concentré sur des résultats concrets.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.liveShowcase} aria-labelledby="live-showcase-title">
          <div className={styles.liveShowcaseIntro}>
            <p className={styles.sectionIndex}>FLUX / EN DIRECT</p>
            <h2 id="live-showcase-title">
              FLUX au travail<br />quand tu <em>encaisses.</em>
            </h2>
            <p>
              Une vraie vitrine créée pour une maison de leasing automobile.
              Elle vit sur sa propre page, comme celle que tes clients verront.
            </p>
          </div>

          <LiveSitePreview />
        </section>

        <section className={styles.pillars}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.sectionIndex}>02 / CE QUE ÇA CHANGE</p>
              <h2>Moins de tâches.<br />Plus de <span className={styles.goldWord}>Business.</span></h2>
            </div>
            <p>
              Quatre leviers, une seule direction : faire venir les bons
              clients jusqu&apos;à toi.
            </p>
          </div>
          <PillarGrid />
          <div className={styles.pillarsCtaWrap}>
            <Link className={`flux-button-smooth ${styles.askFluxCta}`} href="/commencer">
              <span className={styles.askFluxFill} aria-hidden="true" />
              <span className={styles.askFluxText}>
                Demande à{" "}
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
            <p className={styles.sectionIndex}>03 / DANS TON ESPACE</p>
            <h2>
              Des outils qui font.
              <br />
              Pas des outils qui <em>compliquent.</em>
            </h2>
            <p>
              Chaque fonction part d&apos;un problème réel rencontré par nos
              clients. Quelques réponses, un résultat directement exploitable.
            </p>
            <ScrollingAcquireCta />
          </div>
          <div className={styles.toolsList}>
            {TOOLS.map((tool) => {
              const Icon = tool.icon;
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
            {TOOLS.map((tool, index) => {
              const Icon = tool.icon;
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
                      Demande à <strong>FLUX</strong>
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </div>
                </details>
              );
            })}
            <Link className={`flux-button-smooth ${styles.askFluxCta} ${styles.mobileAcquireCta}`} href="/commencer">
              <span className={styles.askFluxFill} aria-hidden="true" />
              <span className={styles.askFluxText}>
                Acquérir{" "}
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
              <small>projets livrés</small>
            </div>
            <div className={styles.storyCopy}>
              <p className={styles.sectionIndex}>04 / POURQUOI NOUS</p>
              <h2>
                D&apos;abord développeurs.
                <br />
                Toujours <em>à tes côtés.</em>
              </h2>
              <p>
                Wayne Web est né d&apos;une conviction simple : la technologie
                doit servir les entrepreneurs, pas les perdre. Après des
                centaines de sites, d&apos;automatisations et de problématiques
                business résolues,{" "}
                <span
                  className={styles.storyGlitch}
                  data-text="nous avons réuni notre savoir-faire dans Flux."
                >
                  nous avons réuni notre savoir-faire dans Flux.
                </span>
              </p>
              <div className={styles.storyProofs}>
                <span><strong>1 seconde</strong> pour déployer ton site web</span>
                <span><strong>24h/7j</strong> au travail pour toi</span>
                <span><strong>+20 outils</strong> gain de temps</span>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.testimonials} id="avis">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.sectionIndex}>05 / ILS EN PARLENT MIEUX QUE NOUS</p>
              <h2>
                Ce qu&apos;ils pensent
                <br />
                <em>de nous.</em>
              </h2>
            </div>
            <p>
              Des commerçants comme toi ont repris la main sur leur visibilité.
              Voici ce que ça change, dans leurs mots — pas dans les nôtres.
            </p>
          </div>
          <div className={styles.testimonialGrid}>
            {TESTIMONIALS.map((t) => (
              <figure key={t.name} className={styles.testimonialCard}>
                <div className={styles.testimonialStars} aria-label="Note : 5 sur 5">
                  <Star aria-hidden="true" />
                  <Star aria-hidden="true" />
                  <Star aria-hidden="true" />
                  <Star aria-hidden="true" />
                  <Star aria-hidden="true" />
                </div>
                <blockquote>{t.quote}</blockquote>
                <figcaption>
                  <span className={styles.testimonialAvatar} aria-hidden="true">
                    {t.photo ? (
                      <Image
                        src={t.photo}
                        alt=""
                        width={80}
                        height={80}
                        sizes="40px"
                      />
                    ) : (
                      t.initials
                    )}
                  </span>
                  <span className={styles.testimonialWho}>
                    <strong>{t.name}</strong>
                    <small>{t.job}</small>
                  </span>
                  <em className={styles.testimonialMetric}>{t.metric}</em>
                </figcaption>
              </figure>
            ))}
          </div>
          <div className={styles.testimonialCtaRow}>
            <Link className={`flux-button-smooth ${styles.primaryCta}`} href="/commencer">
              Rejoins-les : crée ta boutique aujourd&apos;hui
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link className={styles.textCta} href="/login">
              Déjà membre ? Connecte-toi et checke tes rendez-vous
            </Link>
          </div>
        </section>

        <section className={styles.faq} id="faq">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
          />
          <div className={styles.faqIntro}>
            <p className={styles.sectionIndex}>06 / ON TE RÉPOND</p>
            <h2>
              Les questions qu&apos;on nous pose
              <br />
              <em>souvent.</em>
            </h2>
            <p>
              Tout ce que tu veux savoir avant de te lancer, sans langue de
              bois. Il te reste un doute ? Écris-nous, un humain te répond.
            </p>
            <a className={styles.textCta} href="#contact">
              Poser ma question
            </a>
          </div>
          <div className={styles.faqList}>
            {FAQ_ITEMS.map((item, index) => (
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
              C&apos;est clair, je me lance
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section className={styles.newsletter} id="newsletter">
          <div className={styles.newsletterCard}>
            <div className={styles.newsletterCopy}>
              <p className={styles.sectionIndex}>07 / LA NEWSLETTER</p>
              <h2>
                Un conseil business par semaine.
                <br />
                <em>Zéro blabla.</em>
              </h2>
              <p>
                Idées de posts, astuces SEO local, nouveautés Flux : un email
                par semaine pour faire grandir ton commerce, écrit par des
                développeurs qui parlent ta langue. Désinscription en un clic.
              </p>
            </div>
            <NewsletterForm />
          </div>
        </section>

        <section className={styles.contact} id="contact">
          <div className={styles.contactGrid}>
            <div className={styles.contactIntro}>
              <p className={styles.sectionIndex}>08 / CONTACTE-NOUS</p>
              <h2>
                Une question ?
                <br />
                <em>Parlons-en.</em>
              </h2>
              <p>
                Derrière Flux, il y a des humains qui connaissent le terrain.
                Projet, question, besoin particulier : raconte-nous, on te
                répond sous 24 h ouvrées — et on te dit franchement si Flux
                est fait pour toi.
              </p>
              <div className={styles.contactChannels}>
                <a href="mailto:contact@wayne-web.com">contact@wayne-web.com</a>
                <ShareCta />
              </div>
            </div>
            <ContactForm />
          </div>
        </section>

        <section className={styles.finalCta}>
          <p className={styles.eyebrow}>
            <span />
            Ton prochain client te cherche déjà
          </p>
          <h2>
            Il est temps qu&apos;il
            <br />
            <em>te trouve.</em>
          </h2>
          <p>
            Crée ta vitrine, active tes outils et transforme ta présence en
            ligne en véritable moteur de croissance.
          </p>
          <Link className={`flux-button-smooth ${styles.primaryCta} ${styles.ctaFloat}`} href="/commencer">
            Commencer gratuitement
            <ArrowRight aria-hidden="true" />
          </Link>
          <small>Sans engagement · Sans carte bancaire · 100 crédits offerts</small>
        </section>
      </main>

      <MarketingFooter />

      <SectionScroller />

      <aside className={styles.mobileStickyCta} aria-label="Accès rapide à Flux">
        <Link
          className={styles.mobileStickyMain}
          href="/commencer"
          aria-label="Faire travailler Flux et créer mon profil"
        >
          <span className={styles.mobileStickyShine} aria-hidden="true" />
          <span
            className={styles.mobileStickyLabel}
            data-text="Faire travailler FLUX"
          >
            Faire travailler <strong>FLUX</strong>
          </span>
          <ArrowRight aria-hidden="true" />
        </Link>
        <Link className={styles.mobileStickyLogin} href="/login">
          Connexion
        </Link>
      </aside>
    </div>
  );
}
