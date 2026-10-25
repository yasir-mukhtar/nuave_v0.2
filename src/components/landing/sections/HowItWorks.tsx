import { IconCheck, IconSearch, IconWorld } from "@tabler/icons-react";
import { NuaveMark } from "@/components/product/journey/NuaveLogo";
import { cn } from "@/lib/utils";
import shell from "../landing.module.css";
import styles from "./HowItWorks.module.css";

/** S4: three steps, each with a small picture of what the owner sees. */
export function HowItWorks() {
  return (
    <section
      id="cara-kerja"
      className={shell.section}
      aria-labelledby="s4-title"
    >
      <div className={shell.container}>
        <header className={shell.head}>
          <h2 id="s4-title" className={cn("type-heading-xl", shell.h2)}>
            <span>Kami tanya AI persis</span> <span>seperti pasien Anda</span>
          </h2>
        </header>

        <ol className={styles.steps}>
          <li className={styles.step}>
            <span className={styles.num} aria-hidden="true">
              1
            </span>
            <div className={styles.titleRow}>
              <h3 className={styles.title}>Masukkan website</h3>
              <span className={styles.tag}>Gratis</span>
            </div>
            <p className={styles.text}>
              Atau akun Instagram klinik Anda.
              <br />
              Nuave membaca data yang tersedia.
            </p>
            <div className={styles.sketch}>
              <div className={cn(styles.card, styles.webCard)}>
                <p className={styles.field}>
                  <IconWorld
                    className={styles.fieldIcon}
                    size={20}
                    stroke={1.75}
                    aria-hidden="true"
                  />
                  klinikcantikfiksi.com
                  <span className={styles.caret} aria-hidden="true" />
                </p>
                <p className={styles.found}>
                  <span className={styles.thumb}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- static art from /public, sized on purpose */}
                    <img
                      src="/landing/beauty-thumb.webp"
                      width={36}
                      height={36}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  </span>
                  <span className={styles.foundName}>
                    <b>Klinik Cantik Fiksi</b>
                    <span>Jakarta Selatan</span>
                  </span>
                  <span className={styles.check} aria-hidden="true">
                    <IconCheck size={12} stroke={3} />
                  </span>
                </p>
              </div>
            </div>
          </li>

          <li className={styles.step}>
            <span className={styles.num} aria-hidden="true">
              2
            </span>
            <div className={styles.titleRow}>
              <h3 className={styles.title}>Bayar dan cek</h3>
              <span className={styles.tag}>Rp249.000</span>
            </div>
            <p className={styles.text}>
              Nuave siapkan 10 pertanyaan
              <br />
              <b>berdasarkan volume pencarian di Google.</b>
              <br />
              Anda tinggal cek.
            </p>
            <div className={styles.sketch}>
              <div className={styles.stack}>
                <span className={styles.pile2} aria-hidden="true" />
                <span className={styles.pile1} aria-hidden="true" />
                <div className={cn(styles.card, styles.questionCard)}>
                  <p className={styles.qTop}>
                    <span>Pertanyaan 3</span>
                    <span className={styles.qExample}>Contoh</span>
                  </p>
                  <p className={styles.qChip}>
                    <IconSearch size={12} stroke={2} aria-hidden="true" />
                    Dicari di Google
                  </p>
                  <p className={styles.qQuery}>v shape jakarta selatan harga</p>
                  <p className={styles.qMeta}>
                    Topik: v shape · ±1.600 pencarian/bulan di Google, seluruh
                    Indonesia (data September 2026)
                  </p>
                </div>
              </div>
            </div>
          </li>

          <li className={styles.step}>
            <span className={styles.num} aria-hidden="true">
              3
            </span>
            <div className={styles.titleRow}>
              <h3 className={styles.title}>Terima laporan</h3>
            </div>
            <p className={styles.text}>
              Kami tanyakan ke ChatGPT dan
              <br />
              Google AI Overview.
              <br />
              Laporan lengkap siap dalam <b>15 menit.</b>
            </p>
            <div className={styles.sketch}>
              <div className={cn(styles.card, styles.mail)}>
                <p className={styles.mailFrom}>
                  <span className={styles.mailAvatar} aria-hidden="true">
                    <NuaveMark className={styles.mailMark} />
                  </span>
                  <span className={styles.mailName}>Tim Nuave</span>
                  <span className={styles.unread} aria-hidden="true" />
                </p>
                <p className={styles.mailSubject}>
                  AI Visibility Report untuk
                  <br />
                  Klinik Cantik Fiksi sudah siap
                </p>
                <span className={styles.mailButton} aria-hidden="true">
                  Buka laporan
                </span>
              </div>
            </div>
          </li>
        </ol>

        <p className={cn(shell.caption, styles.caption)}>
          Nama klinik hanya ilustrasi.
        </p>
      </div>
    </section>
  );
}
