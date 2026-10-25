import { cn } from "@/lib/utils";
import shell from "../landing.module.css";
import styles from "./Reasons.module.css";

/** 47 of 100: the first half of the grid lit but three dots. */
function HundredDots() {
  return (
    <div className={styles.dots} aria-hidden="true">
      {[0, 50].map((start) => (
        <div key={start} className={styles.half}>
          {Array.from({ length: 50 }, (_, index) => (
            <i
              key={index}
              className={start + index < 47 ? styles.dotOn : styles.dot}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** S2: why it matters now. Three sourced figures on one centre axis. */
export function Reasons() {
  return (
    <section className={shell.section} aria-labelledby="s2-title">
      <div className={shell.container}>
        <header className={shell.head}>
          <h2 id="s2-title" className={cn("type-heading-xl", shell.h2)}>
            <span>Makin banyak pasien</span> <span>pilih dokter lewat AI</span>
          </h2>
          <p className={shell.line}>
            Banyak pasien lebih mengikuti saran AI daripada hasil pencarian di
            Google.
          </p>
        </header>

        <div className={styles.ledger}>
          <div className={styles.row}>
            <p className={styles.figure}>
              <span className="type-number">47</span>
              <span className={styles.pct}>%</span>
            </p>
            <div className={styles.text}>
              <p className={styles.say}>
                <b>warga AS</b> mencari dokter lewat AI seperti ChatGPT atau
                Google AI Overview.<span className={styles.ref}>¹</span>
              </p>
              <HundredDots />
            </div>
          </div>

          <div className={styles.row}>
            <p className={cn(styles.figure, styles.figureUnit)}>
              <span className="type-number">40</span>
              <span className={styles.unit}>juta</span>
            </p>
            <div className={styles.text}>
              <p className={styles.say}>
                orang <b>di dunia</b> bertanya soal kesehatan ke ChatGPT tiap
                hari.<span className={styles.ref}>²</span>
              </p>
            </div>
          </div>

          <div className={styles.row}>
            <p className={styles.figure}>
              <span className="type-number">2024</span>
            </p>
            <div className={styles.text}>
              <p className={styles.say}>
                AI Overview mulai digunakan dalam pencarian Google{" "}
                <b>di Indonesia</b>.<span className={styles.ref}>³</span>
              </p>
            </div>
          </div>

          <div className={cn(styles.row, styles.notes)}>
            <p className={styles.notesLabel}>Sumber:</p>
            <ol className={styles.notesList}>
              <li>
                <span className={styles.mark}>¹</span>
                <span className={styles.src}>
                  rater8 Patient Choice Report 2026
                </span>
                ,<br />
                survei 992 orang dewasa di AS, April 2026;
              </li>
              <li>
                <span className={styles.mark}>²</span>
                <span className={styles.src}>OpenAI</span>, Januari 2026;
              </li>
              <li>
                <span className={styles.mark}>³</span>
                <span className={styles.src}>Google Indonesia</span>, 2024.
              </li>
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
