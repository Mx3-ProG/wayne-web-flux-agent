import Image from "next/image";
import styles from "./flux-route-loader.module.css";

export function FluxRouteLoader() {
  return (
    <div className={styles.loader} role="status" aria-label="Chargement de FLUX">
      <div className={styles.lockup} aria-hidden="true">
        <div className={styles.word} data-text="FLUX">
          <span>F</span><span>L</span><span>U</span><span>X</span>
        </div>
        <span className={styles.markOrbit}>
          <Image
            className={styles.mark}
            src="/flux-symbol-light.png"
            width={887}
            height={590}
            sizes="64px"
            alt=""
            priority
          />
        </span>
      </div>
    </div>
  );
}
