"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BadgeEuro,
  Boxes,
  BriefcaseBusiness,
  CalendarClock,
  Check,
  Clock3,
  Globe2,
  MapPin,
  MoreVertical,
  PackagePlus,
  Search,
  Share2,
  Smartphone,
  Sparkles,
  Store,
  Users,
  WandSparkles,
} from "lucide-react";
import { signUp, type AuthState } from "@/app/login/actions";
import { VERTICALS, getVertical } from "@/lib/verticals";
import styles from "./tunnel.module.css";

const initialState: AuthState = {};

const GOALS = [
  { id: "temps", icon: Clock3, title: "Je manque de temps", text: "Le contenu et les réponses clients me prennent mes soirées." },
  { id: "google", icon: Search, title: "On ne me trouve pas", text: "Je veux remonter sur Google et dans ma ville." },
  { id: "leads", icon: Users, title: "Je veux plus de clients", text: "J'ai besoin de demandes régulières et qualifiées." },
  { id: "tout", icon: BarChart3, title: "Tout centraliser", text: "Je veux arrêter de jongler entre cinq outils." },
];

const TONES = [
  { id: "Direct et efficace", title: "Direct & efficace", sample: "On va droit au résultat." },
  { id: "Chaleureux et proche", title: "Chaleureux & proche", sample: "Comme avec tes meilleurs clients." },
  { id: "Premium et expert", title: "Premium & expert", sample: "Sobre, précis, haut de gamme." },
  { id: "Dynamique et audacieux", title: "Dynamique & audacieux", sample: "De l'énergie et du caractère." },
];

const WEEKDAYS = [
  { id: 1, label: "Lun" },
  { id: 2, label: "Mar" },
  { id: 3, label: "Mer" },
  { id: 4, label: "Jeu" },
  { id: 5, label: "Ven" },
  { id: 6, label: "Sam" },
  { id: 0, label: "Dim" },
];

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function Brand() {
  return (
    <span className={styles.brand}>
      WAYNE<span>WEB</span><small>FLUX</small>
    </span>
  );
}

export function Tunnel() {
  const [step, setStep] = useState(0);
  const [vertical, setVertical] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [city, setCity] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [tone, setTone] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [trackStock, setTrackStock] = useState(true);
  const [productStock, setProductStock] = useState("1");
  const [availableDays, setAvailableDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [openingTime, setOpeningTime] = useState("09:00");
  const [closingTime, setClosingTime] = useState("18:00");
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [authState, authAction, pending] = useActionState(signUp, initialState);

  const selectedVertical = vertical ? getVertical(vertical) : null;
  const completion = Math.max(0, Math.min(100, (step / 11) * 100));
  const previewName = businessName.trim() || "Ton commerce";
  const previewJob = jobTitle.trim() || selectedVertical?.jobTitles[0] || "Ton activité";
  const canContinue = useMemo(() => {
    if (step === 1) return Boolean(vertical);
    if (step === 2) return goals.length > 0;
    if (step === 3) return Boolean(city.trim() && businessName.trim() && jobTitle.trim());
    if (step === 4) return Boolean(tone);
    if (step === 5) return Boolean(categoryName.trim());
    if (step === 6) return Boolean(productName.trim());
    if (step === 7)
      return (
        Number(productPrice) >= 0 &&
        (!trackStock || Number(productStock) >= 0)
      );
    if (step === 8)
      return (
        availableDays.length > 0 &&
        openingTime < closingTime
      );
    return true;
  }, [
    step,
    vertical,
    goals,
    city,
    businessName,
    jobTitle,
    tone,
    categoryName,
    productName,
    productPrice,
    trackStock,
    productStock,
    availableDays,
    openingTime,
    closingTime,
  ]);

  useEffect(() => {
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", capturePrompt);
    return () => window.removeEventListener("beforeinstallprompt", capturePrompt);
  }, []);

  function chooseVertical(slug: string) {
    const next = getVertical(slug);
    setVertical(slug);
    setJobTitle(next.jobTitles[0]);
  }

  function toggleGoal(goalId: string) {
    setGoals((current) =>
      current.includes(goalId)
        ? current.filter((item) => item !== goalId)
        : [...current, goalId]
    );
  }

  function next() {
    if (canContinue) setStep((current) => Math.min(12, current + 1));
  }

  function toggleDay(day: number) {
    setAvailableDays((current) =>
      current.includes(day)
        ? current.filter((item) => item !== day)
        : [...current, day]
    );
  }

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  function back() {
    setStep((current) => Math.max(0, current - 1));
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" aria-label="Retour à l'accueil"><Brand /></Link>
        {step > 0 && step < 12 && (
          <div className={styles.progressMeta}>
            <span>Étape {Math.min(step, 11)} sur 11</span>
            <div className={styles.progress}><i style={{ width: `${completion}%` }} /></div>
          </div>
        )}
        <Link className={styles.accountLink} href="/login">J&apos;ai déjà un compte</Link>
      </header>

      <section className={styles.stage}>
        {step === 0 && (
          <div className={styles.intro}>
            <span className={styles.introIcon}><WandSparkles aria-hidden="true" /></span>
            <p className={styles.kicker}>Configuration personnalisée</p>
            <h1>On va construire ton<br /><em>moteur de croissance.</em></h1>
            <p>
              Réponds à quelques questions. Flux prépare ton espace, tes outils
              et les fondations de ta visibilité.
            </p>
            <button className={styles.primary} type="button" onClick={next}>
              C&apos;est parti <ArrowRight aria-hidden="true" />
            </button>
            <small>7 jours d’essai offerts · 2 minutes · Sans carte bancaire</small>
            <div className={styles.socialProof}>
              <span aria-hidden="true"><i>ML</i><i>SC</i><i>TN</i></span>
              <p>Déjà 150 commerçants ont commencé avec Wayne‑Web.</p>
            </div>
          </div>
        )}

        {step === 1 && (
          <Question kicker="Ton activité" title={<>Tu fais <em>quoi</em> de mieux ?</>} subtitle="Choisis ton univers. Flux adaptera les outils et les contenus.">
            <div className={styles.choiceGrid}>
              {VERTICALS.map((item) => (
                <button
                  className={vertical === item.slug ? styles.choiceActive : styles.choice}
                  key={item.slug}
                  type="button"
                  onClick={() => chooseVertical(item.slug)}
                >
                  <span>{item.emoji}</span>
                  <strong>{item.label}</strong>
                  {vertical === item.slug && <Check aria-hidden="true" />}
                </button>
              ))}
            </div>
          </Question>
        )}

        {step === 2 && (
          <Question kicker="Tes objectifs" title={<>Qu&apos;est-ce qui te <em>freine</em> aujourd&apos;hui ?</>} subtitle="Choisis tout ce qui te correspond. On organisera ton espace autour de tes priorités.">
            <div className={styles.goalGrid}>
              {GOALS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    className={goals.includes(item.id) ? styles.goalActive : styles.goal}
                    key={item.id}
                    type="button"
                    onClick={() => toggleGoal(item.id)}
                    aria-pressed={goals.includes(item.id)}
                  >
                    <Icon aria-hidden="true" />
                    <span><strong>{item.title}</strong><small>{item.text}</small></span>
                    {goals.includes(item.id) && <Check aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </Question>
        )}

        {step === 3 && (
          <Question kicker="Ton commerce" title={<>Donnons-lui une <em>adresse.</em></>} subtitle="Ces informations préparent ta vitrine et ton référencement local.">
            <div className={styles.fields}>
              <label>
                <span>Nom du commerce <small>Ton prénom fonctionne aussi</small></span>
                <div><Store aria-hidden="true" /><input value={businessName} onChange={(event) => setBusinessName(event.target.value)} maxLength={60} placeholder="Ex : Atelier Louise" autoComplete="organization" /></div>
              </label>
              <label>
                <span>Ton métier</span>
                <div><BriefcaseBusiness aria-hidden="true" /><input value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} maxLength={60} placeholder="Ex : Artisan fleuriste" /></div>
              </label>
              <label>
                <span>Ta ville</span>
                <div><MapPin aria-hidden="true" /><input value={city} onChange={(event) => setCity(event.target.value)} maxLength={60} placeholder="Ex : Lyon" autoComplete="address-level2" /></div>
              </label>
            </div>
          </Question>
        )}

        {step === 4 && (
          <Question kicker="Ta personnalité" title={<>Flux doit parler <em>comme toi.</em></>} subtitle="Choisis le ton qui ressemble le plus à ton commerce.">
            <div className={styles.toneGrid}>
              {TONES.map((item) => (
                <button
                  className={tone === item.id ? styles.toneActive : styles.tone}
                  key={item.id}
                  type="button"
                  onClick={() => setTone(item.id)}
                >
                  <Sparkles aria-hidden="true" />
                  <strong>{item.title}</strong>
                  <small>{item.sample}</small>
                </button>
              ))}
            </div>
          </Question>
        )}

        {step === 5 && (
          <Question kicker="Ton catalogue" title={<>Crée ta première <em>catégorie.</em></>} subtitle="Elle permettra à tes clients de comprendre immédiatement ce que tu proposes.">
            <div className={styles.singleFieldCard}>
              <span><Boxes aria-hidden="true" /></span>
              <label>
                <span>Nom de la catégorie</span>
                <input
                  value={categoryName}
                  onChange={(event) => setCategoryName(event.target.value)}
                  maxLength={60}
                  placeholder="Ex : Soins du visage, Bouquets, Coaching…"
                />
              </label>
            </div>
          </Question>
        )}

        {step === 6 && (
          <Question kicker="Ton premier produit" title={<>Qu&apos;est-ce que tu veux <em>vendre en premier ?</em></>} subtitle={`Ce produit sera rangé dans « ${categoryName || "ta catégorie"} » et visible dans ta vitrine.`}>
            <div className={styles.singleFieldCard}>
              <span><PackagePlus aria-hidden="true" /></span>
              <label>
                <span>Nom du produit</span>
                <input
                  value={productName}
                  onChange={(event) => setProductName(event.target.value)}
                  maxLength={100}
                  placeholder="Ex : Soin éclat 60 min"
                />
              </label>
            </div>
          </Question>
        )}

        {step === 7 && (
          <Question kicker="Prix et disponibilité" title={<>Donne-lui sa <em>valeur.</em></>} subtitle="Fixe le prix de vente et indique si FLUX doit surveiller le stock.">
            <div className={styles.commerceFields}>
              <label>
                <span className={styles.fieldIcon}><BadgeEuro aria-hidden="true" /></span>
                <span>Prix TTC</span>
                <div><input type="number" min="0" step="0.01" value={productPrice} onChange={(event) => setProductPrice(event.target.value)} placeholder="49,00" /><b>€</b></div>
              </label>
              <div className={styles.stockCard}>
                <button type="button" className={trackStock ? styles.stockToggleActive : styles.stockToggle} onClick={() => setTrackStock((value) => !value)} aria-pressed={trackStock}>
                  <span><strong>Suivre le stock</strong><small>FLUX t&apos;alerte quand il est épuisé.</small></span>
                  <i />
                </button>
                {trackStock && (
                  <label>
                    <span>Quantité disponible</span>
                    <input type="number" min="0" step="1" value={productStock} onChange={(event) => setProductStock(event.target.value)} />
                  </label>
                )}
              </div>
            </div>
          </Question>
        )}

        {step === 8 && (
          <Question kicker="Ton agenda" title={<>Quand es-tu <em>disponible ?</em></>} subtitle="Choisis tes jours et une première plage horaire. Tout restera modifiable.">
            <div className={styles.scheduleCard}>
              <CalendarClock aria-hidden="true" />
              <div className={styles.dayPicker}>
                {WEEKDAYS.map((day) => (
                  <button key={day.id} type="button" className={availableDays.includes(day.id) ? styles.dayActive : styles.day} onClick={() => toggleDay(day.id)}>
                    {day.label}
                  </button>
                ))}
              </div>
              <div className={styles.timeFields}>
                <label><span>De</span><input type="time" value={openingTime} onChange={(event) => setOpeningTime(event.target.value)} /></label>
                <i>→</i>
                <label><span>À</span><input type="time" value={closingTime} onChange={(event) => setClosingTime(event.target.value)} /></label>
              </div>
            </div>
          </Question>
        )}

        {step === 9 && (
          <div className={styles.reveal}>
            <p className={styles.kicker}>Ton aperçu est prêt</p>
            <h1>Voilà ce que tes clients<br />vont <em>comprendre.</em></h1>
            <div className={styles.preview}>
              <div className={styles.previewTop}>
                <span className={styles.previewLogo}>{previewName.charAt(0).toUpperCase()}</span>
                <span>Disponible à {city}</span>
              </div>
              <div className={styles.previewHero}>
                <small>{previewJob} · {city}</small>
                <h2>{previewName}</h2>
                <p>Un savoir-faire local, une expérience simple et un service qui fait la différence.</p>
                <button type="button">Prendre rendez-vous</button>
              </div>
              <div className={styles.previewStats}>
                <span><Globe2 aria-hidden="true" /><strong>Visible</strong><small>sur Google</small></span>
                <span><Users aria-hidden="true" /><strong>Accessible</strong><small>24 h / 24</small></span>
                <span><Sparkles aria-hidden="true" /><strong>À ton image</strong><small>{tone}</small></span>
              </div>
            </div>
            <button className={styles.primary} type="button" onClick={next}>
              Garder cette configuration <ArrowRight aria-hidden="true" />
            </button>
          </div>
        )}

        {step === 10 && (
          <div className={styles.installScreen}>
            <span className={styles.introIcon}><Smartphone aria-hidden="true" /></span>
            <p className={styles.kicker}>Toujours à portée de main</p>
            <h1>Installe FLUX comme<br />une vraie <em>app.</em></h1>
            <p>Retrouve ton dashboard en un geste depuis ton écran d’accueil.</p>
            <div className={styles.installGuides}>
              <article>
                <strong>Sur iPhone</strong>
                <span><Share2 aria-hidden="true" /> Dans Safari, touche « Partager »</span>
                <span>Choisis « Sur l’écran d’accueil »</span>
              </article>
              <article>
                <strong>Sur Android</strong>
                <span><MoreVertical aria-hidden="true" /> Ouvre le menu Chrome</span>
                <span>Choisis « Installer l’application »</span>
              </article>
            </div>
            {installPrompt && (
              <button className={styles.installNow} type="button" onClick={installApp}>
                Installer maintenant
              </button>
            )}
            <button className={styles.primary} type="button" onClick={next}>
              Continuer <ArrowRight aria-hidden="true" />
            </button>
          </div>
        )}

        {step === 11 && (
          <div className={styles.valueScreen}>
            <span className={styles.introIcon}><Globe2 aria-hidden="true" /></span>
            <p className={styles.kicker}>Tout est prêt</p>
            <h1>Ton espace n&apos;attend<br />plus que <em>toi.</em></h1>
            <div className={styles.valueList}>
              <span><Check aria-hidden="true" /> Vitrine préremplie pour ton métier</span>
              <span><Check aria-hidden="true" /> Outils de contenu et de conversion</span>
              <span><Check aria-hidden="true" /> 100 crédits offerts au démarrage</span>
            </div>
            <button className={styles.primary} type="button" onClick={next}>
              Créer mon accès <ArrowRight aria-hidden="true" />
            </button>
          </div>
        )}

        {step === 12 && (
          <div className={styles.claim}>
            <p className={styles.kicker}>Dernière étape</p>
            <h1>Garde tout ce qu&apos;on<br />vient de <em>préparer.</em></h1>
            <p>Crée ton accès. Ta configuration sera appliquée automatiquement.</p>
            <form action={authAction}>
              <input type="hidden" name="vertical" value={vertical} />
              <input type="hidden" name="businessName" value={businessName} />
              <input type="hidden" name="jobTitle" value={jobTitle} />
              <input type="hidden" name="city" value={city} />
              <input type="hidden" name="tone" value={tone} />
              <input type="hidden" name="goal" value={goals.join(",")} />
              <input type="hidden" name="categoryName" value={categoryName} />
              <input type="hidden" name="productName" value={productName} />
              <input type="hidden" name="productPrice" value={productPrice} />
              <input type="hidden" name="trackStock" value={String(trackStock)} />
              <input type="hidden" name="productStock" value={productStock} />
              <input type="hidden" name="availableDays" value={JSON.stringify(availableDays)} />
              <input type="hidden" name="openingTime" value={openingTime} />
              <input type="hidden" name="closingTime" value={closingTime} />
              <label><span>Ton prénom</span><input name="name" required maxLength={40} placeholder="Alex" autoComplete="given-name" /></label>
              <label><span>Ton email professionnel</span><input name="email" type="email" required placeholder="alex@moncommerce.fr" autoComplete="email" /></label>
              <label><span>Choisis un mot de passe</span><input name="password" type="password" required minLength={8} placeholder="8 caractères minimum" autoComplete="new-password" /></label>
              {authState.error && <p className={styles.error}>{authState.error}</p>}
              {authState.message && <p className={styles.success}>{authState.message}</p>}
              <button className={styles.primary} type="submit" disabled={pending}>
                {pending ? "Création de ton espace…" : "Créer mon espace gratuitement"}
                {!pending && <ArrowRight aria-hidden="true" />}
              </button>
            </form>
            <small>En continuant, tu acceptes nos conditions d&apos;utilisation.</small>
          </div>
        )}
      </section>

      {step > 0 && step < 9 && (
        <footer className={styles.controls}>
          <button type="button" onClick={back}><ArrowLeft aria-hidden="true" /> Retour</button>
          <button className={styles.primary} type="button" onClick={next} disabled={!canContinue}>
            Continuer <ArrowRight aria-hidden="true" />
          </button>
        </footer>
      )}
      {step >= 9 && step < 12 && (
        <button className={styles.floatingBack} type="button" onClick={back} aria-label="Revenir à l'étape précédente">
          <ArrowLeft aria-hidden="true" />
        </button>
      )}
    </main>
  );
}

function Question({
  kicker,
  title,
  subtitle,
  children,
}: {
  kicker: string;
  title: React.ReactNode;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.question}>
      <p className={styles.kicker}>{kicker}</p>
      <h1>{title}</h1>
      <p className={styles.subtitle}>{subtitle}</p>
      {children}
    </div>
  );
}
