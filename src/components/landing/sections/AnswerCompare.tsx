import {
  IconArrowUp,
  IconEdit,
  IconMenu2,
  IconPlus,
  IconSearch,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import shell from "../landing.module.css";
import styles from "./AnswerCompare.module.css";

const QUERY = "rekomendasi klinik kecantikan bekas jerawat jakarta selatan";

function Clinics({ items }: { items: [string, string][] }) {
  return (
    <ul className={styles.list}>
      {items.map(([name, why]) => (
        <li key={name} className={styles.item}>
          <span className={styles.bullet} aria-hidden="true">
            •
          </span>
          <span>
            <b>{name}:</b> {why}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Slot() {
  return (
    <p className={styles.slot}>
      <span className={styles.slotLabel}>Klinik Anda?</span>
    </p>
  );
}

/** S3: an AI answer names only a few clinics. Two example answers, as a
 * patient would see them in ChatGPT and in Google's AI Overview. */
export function AnswerCompare() {
  return (
    <section
      className={cn(shell.section, shell.band)}
      aria-labelledby="s3-title"
    >
      <div className={shell.container}>
        <header className={shell.head}>
          <h2 id="s3-title" className={cn("type-heading-xl", shell.h2)}>
            <span>Di jawaban AI,</span> <span>tidak ada halaman dua</span>
          </h2>
          <p className={shell.line}>
            ChatGPT dan Google AI Overview hanya menyebut beberapa klinik.{" "}
            <strong className={styles.question}>
              Apakah klinik Anda termasuk?
            </strong>
          </p>
        </header>

        <div className={styles.pair}>
          <figure className={styles.surface}>
            <figcaption className={styles.label}>ChatGPT</figcaption>
            <div className={styles.card}>
              <div className={styles.topBar} aria-hidden="true">
                <IconMenu2 size={20} stroke={1.75} />
                <IconEdit size={20} stroke={1.75} />
              </div>
              <div className={styles.conversation}>
                <p className={styles.bubble}>{QUERY}</p>
                <span className={styles.avatar} aria-hidden="true">
                  ✦
                </span>
                <p className={styles.lead}>
                  Beberapa klinik kecantikan di Jakarta Selatan
                  <br className={styles.wideBreak} /> yang bisa dipertimbangkan:
                </p>
              </div>
              <Clinics
                items={[
                  ["Klinik A", "laser bekas jerawat oleh dokter"],
                  ["Klinik B", "buka Sabtu sampai sore"],
                  ["Klinik C", "ada dokter spesialis kulit"],
                ]}
              />
              <Slot />
              <div className={styles.composer} aria-hidden="true">
                <IconPlus size={20} stroke={1.75} />
                <span className={styles.placeholder}>Tanyakan apa saja</span>
                <span className={styles.send}>
                  <IconArrowUp size={18} stroke={2} />
                </span>
              </div>
            </div>
          </figure>

          <figure className={styles.surface}>
            <figcaption className={styles.label}>Google AI Overview</figcaption>
            <div className={styles.card}>
              <p className={styles.wordmark} aria-hidden="true">
                Google
              </p>
              <p className={styles.search}>
                <span className={styles.query}>{QUERY}</span>
                <IconSearch
                  className={styles.searchIcon}
                  size={18}
                  stroke={1.75}
                  aria-hidden="true"
                />
              </p>
              <p className={styles.tabs} aria-hidden="true">
                <span className={styles.tabOn}>Semua</span>
                <span>Maps</span>
                <span>Gambar</span>
                <span>Berita</span>
              </p>
              <div className={styles.overview}>
                <div className={styles.overviewHead}>
                  <p className={styles.overviewTitle}>
                    <span aria-hidden="true">✦</span>
                    AI Overview
                  </p>
                  <p className={styles.chips}>
                    <span className={styles.chip}>klinik-a.contoh</span>
                    <span className={styles.chip}>direktori.contoh</span>
                  </p>
                </div>
                <p className={cn(styles.lead, styles.overviewLead)}>
                  Ada beberapa klinik kecantikan di Jakarta Selatan
                  <br className={styles.wideBreak} /> untuk bekas jerawat:
                </p>
                <Clinics
                  items={[
                    ["Klinik A", "paket laser bisa dicicil"],
                    ["Klinik D", "ada konsultasi dokter"],
                    ["Klinik E", "dekat stasiun, parkir luas"],
                  ]}
                />
                <Slot />
              </div>
              <div className={styles.results} aria-hidden="true">
                {[
                  ["klinik-a.contoh", "70%"],
                  ["direktori.contoh", "58%"],
                ].map(([domain, width]) => (
                  <div key={domain} className={styles.result}>
                    <p className={styles.resultSource}>
                      <span className={styles.favicon} />
                      {domain}
                    </p>
                    <span className={styles.bar} style={{ width }} />
                  </div>
                ))}
              </div>
            </div>
          </figure>
        </div>

        <p className={cn(shell.caption, styles.caption)}>
          Nama klinik hanya ilustrasi.{" "}
          <span className={styles.captionBreak}>
            Google tidak selalu menampilkan AI Overview.
          </span>
        </p>
      </div>
    </section>
  );
}
