import { IconCheck } from "@tabler/icons-react";
import { HeroDemo } from "./HeroDemo";
import { HERO_INPUT_ID, HERO_SECTION_ID } from "./landing-scroll";
import { ResumeBanner } from "./ResumeBanner";
import { SourceForm } from "./SourceForm";
import styles from "./Hero.module.css";

const TICKS = [
  "10 pertanyaan berdasarkan volume pencarian tertinggi Google",
  "ChatGPT dan Google AI Overview",
  "Laporan siap dalam 15 menit",
];

/** S1: the promise, the website form and the AI-answer picture. */
export function Hero() {
  return (
    <section
      id={HERO_SECTION_ID}
      className={styles.hero}
      aria-labelledby="hero-title"
      data-hero
    >
      <span className={styles.wash} aria-hidden="true" />
      <div className={styles.inner}>
        <div className={styles.copy}>
          <ResumeBanner className={styles.resume} />
          <h1 id="hero-title" className={`type-display ${styles.title}`}>
            <span>Pasien sekarang</span> <span>tanya AI dulu</span>{" "}
            <span>sebelum pilih klinik</span>
          </h1>
          <p className={styles.lede}>
            Cek apakah klinik Anda muncul di ChatGPT dan Google AI Overview.
            Dapatkan rekomendasi perbaikan.
          </p>
          <SourceForm inputId={HERO_INPUT_ID} className={styles.form} />
          <p className={styles.micro}>
            Cek apakah klinik Anda bisa ditemukan, <b>gratis</b>.<br />
            Rp249.000 untuk mulai audit lengkap.
          </p>
          <ul className={styles.ticks}>
            {TICKS.map((tick) => (
              <li key={tick}>
                <span className={styles.tick} aria-hidden="true">
                  <IconCheck size={12} stroke={2.5} />
                </span>
                {tick}
              </li>
            ))}
          </ul>
        </div>
        <HeroDemo className={styles.demo} />
      </div>
      <span className={styles.fade} aria-hidden="true" />
    </section>
  );
}
