import { InstallAppGuide } from "./install-app-guide";
import styles from "./installer.module.css";

export const metadata = { title: "Installer l’application" };

export default function InstallerPage() {
  return (
    <div className={styles.page}>
      <p className={styles.eyebrow}>Toujours à portée de main</p>
      <h1 className={styles.title}>Installe Wayne Web Flux</h1>
      <p className={styles.subtitle}>
        Ajoute l’application à ton écran d’accueil pour ouvrir ton dashboard
        comme une vraie app et voir le nombre de commandes à traiter sur son
        icône lorsque ton appareil prend en charge les pastilles.
      </p>

      <InstallAppGuide />

      <aside className={styles.note}>
        <strong>Bon à savoir</strong>
        <p>
          La pastille se met à jour à l’ouverture de l’application et disparaît
          dès qu’il n’y a plus de commande « À traiter ». Son affichage dépend
          du téléphone et du navigateur.
        </p>
      </aside>
    </div>
  );
}
