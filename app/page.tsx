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
          </nav>
          <div className={styles.navActions}>
            <Link className={styles.loginLink} href="/login">
              Connexion
            </Link>
            <Link className={styles.navCta} href="/commencer">
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
                <Link className={styles.primaryCta} href="/commencer">
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
            <Link className={styles.askFluxCta} href="/commencer">
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
                    <Link className={styles.toolAccordionCta} href="/commencer">
                      Demande à <strong>FLUX</strong>
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </div>
                </details>
              );
            })}
            <Link className={`${styles.askFluxCta} ${styles.mobileAcquireCta}`} href="/commencer">
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
                <span><strong>48 h</strong> livraison moyenne</span>
                <span><strong>5/5</strong> satisfaction clients</span>
                <span><strong>24/7</strong> outils disponibles</span>
              </div>
            </div>
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
          <Link className={`${styles.primaryCta} ${styles.ctaFloat}`} href="/commencer">
            Commencer gratuitement
            <ArrowRight aria-hidden="true" />
          </Link>
          <small>Sans engagement · Sans carte bancaire · 100 crédits offerts</small>
        </section>
      </main>

      <MarketingFooter />

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
