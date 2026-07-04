import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarCheck2,
  Check,
  Clock3,
  Globe2,
  MessageCircleMore,
  Search,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import styles from "./home.module.css";

const PILLARS = [
  {
    number: "01",
    icon: Clock3,
    title: "Gagne du temps",
    text: "Posts, réponses clients et contenus prêts à publier. Tu gardes ta voix, tu récupères tes soirées.",
    tag: "Outils de gains de temps",
  },
  {
    number: "02",
    icon: Search,
    title: "Sois trouvé sur Google",
    text: "Une présence locale claire, des textes optimisés et une fiche Google qui travaille pour ton commerce.",
    tag: "Boost ton commerce",
  },
  {
    number: "03",
    icon: Users,
    title: "Transforme les vues en clients",
    text: "Une vitrine qui rassure, un parcours simple et des rendez-vous qui arrivent sans courir après les prospects.",
    tag: "Génère des leads",
  },
  {
    number: "04",
    icon: Globe2,
    title: "Pilote tout au même endroit",
    text: "Page, agenda, messages et visibilité réunis dans un espace pensé pour les professionnels de terrain.",
    tag: "Solution tout-en-un",
  },
];

const TOOLS = [
  {
    icon: Sparkles,
    label: "Contenu",
    title: "Des publications qui te ressemblent",
    text: "Une idée devient un post, un reel ou un carrousel prêt à publier.",
    result: "2 h gagnées",
  },
  {
    icon: MessageCircleMore,
    label: "Conversion",
    title: "Chaque message peut devenir une vente",
    text: "Réponds aux demandes, relance les indécis et demande des avis sans chercher tes mots.",
    result: "3 réponses prêtes",
  },
  {
    icon: BarChart3,
    label: "SEO local",
    title: "Google comprend enfin ton activité",
    text: "Description, services et contenus locaux structurés pour attirer les bonnes recherches.",
    result: "Visibilité renforcée",
  },
];

function Brand() {
  return (
    <span className={styles.brand}>
      WAYNE<span>WEB</span>
      <small>FLUX</small>
    </span>
  );
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
                  <Check aria-hidden="true" /> Pensé en France
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
                  <span className={styles.appLogo}>W</span>
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
              Nous maîtrisons <em>le digital.</em>
            </h2>
            <div>
              <p>
                Tu ne devrais pas avoir à devenir expert en référencement,
                copywriting, réseaux sociaux et automatisation pour développer
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

        <section className={styles.pillars}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.sectionIndex}>02 / CE QUE ÇA CHANGE</p>
              <h2>Moins de tâches.<br />Plus de business.</h2>
            </div>
            <p>
              Quatre leviers, une seule direction : faire venir les bons
              clients jusqu&apos;à toi.
            </p>
          </div>
          <div className={styles.pillarGrid}>
            {PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <article key={pillar.number} className={styles.pillar}>
                  <div className={styles.pillarTop}>
                    <span>{pillar.number}</span>
                    <Icon aria-hidden="true" />
                  </div>
                  <p className={styles.pillarTag}>{pillar.tag}</p>
                  <h3>{pillar.title}</h3>
                  <p>{pillar.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className={styles.toolsSection} id="outils">
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
                business résolues, nous avons réuni notre savoir-faire dans Flux.
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
          <Link className={styles.primaryCta} href="/commencer">
            Commencer gratuitement
            <ArrowRight aria-hidden="true" />
          </Link>
          <small>Sans engagement · Sans carte bancaire · 100 crédits offerts</small>
        </section>
      </main>

      <footer className={styles.footer}>
        <Brand />
        <p>Le digital qui fait avancer ton commerce.</p>
        <div>
          <Link href="/login">Connexion</Link>
          <a href="https://www.wayne-web.com/faq">FAQ</a>
          <span>© 2026 Wayne Web</span>
        </div>
      </footer>
    </div>
  );
}
