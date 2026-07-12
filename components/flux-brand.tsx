import Image from "next/image";
import styles from "./flux-brand.module.css";

export function FluxBrand({
  className,
  markOnly = false,
  priority = false,
}: {
  className?: string;
  markOnly?: boolean;
  priority?: boolean;
}) {
  return (
    <span className={`${styles.brand} ${className ?? ""}`}>
      <Image
        className={styles.mark}
        src="/flux-symbol-light.png"
        width={887}
        height={590}
        sizes="44px"
        alt=""
        priority={priority}
      />
      {!markOnly && (
        <strong className={styles.words}>
          WAYNE<b>WEB</b><small>FLUX</small>
        </strong>
      )}
    </span>
  );
}
