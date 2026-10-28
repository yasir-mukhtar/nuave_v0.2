import { cn } from "@/lib/utils";
import { SUPPORT_EMAIL } from "@/lib/legal";
import { SourceForm } from "../SourceForm";
import shell from "../landing.module.css";
import styles from "./Closing.module.css";

/** S9: the last ask, over a clay street with an empty lot for the clinic. */
export function Closing() {
  return (
    <section className={styles.section} aria-labelledby="s9-title">
      <div className={cn(shell.container, styles.closing)}>
        <h2 id="s9-title" className={cn("type-display", styles.title)}>
          Cek klinik Anda <br className={styles.narrowBreak} />
          sebelum <br className={styles.wideBreak} />
          pasien <br className={styles.narrowBreak} />
          berikutnya bertanya
        </h2>
        <p className={styles.line}>
          Mulai dari website atau <br className={styles.narrowBreak} />
          Instagram klinik Anda.
        </p>
        <SourceForm className={styles.form} />
        <p className={styles.micro}>
          Cek apakah klinik Anda bisa ditemukan, <b>gratis</b>.<br />
          Rp249.000 untuk mulai audit lengkap.
        </p>
      </div>

      <div className={styles.street} aria-hidden="true">
        <div className={styles.streetArt}>
          {/* eslint-disable-next-line @next/next/no-img-element -- static art from /public, sized on purpose */}
          <img
            src="/landing/street.webp"
            width={1500}
            height={427}
            alt=""
            loading="lazy"
            decoding="async"
          />
          <span className={styles.slotShadow} />
          <span className={styles.marker}>
            <span className={styles.markerThumb}>?</span>
            Klinik Anda?
          </span>
        </div>
      </div>

      <p className={cn(shell.container, styles.contact)}>
        Ada pertanyaan lain? <br className={styles.narrowBreak} />
        Hubungi kami di{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className={styles.email}>
          {SUPPORT_EMAIL}
        </a>
        .
      </p>
    </section>
  );
}
