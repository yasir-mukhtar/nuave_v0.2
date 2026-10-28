import { Fragment, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import shell from "../landing.module.css";
import styles from "./TrustPoints.module.css";

const POINTS = [
  {
    title: "Apa adanya",
    lines: ["Jawaban AI ditampilkan", "utuh dengan sumbernya."],
    art: { src: "/landing/bubble-loupe.webp", width: 148, height: 128 },
  },
  {
    title: "Bahasa pasien",
    lines: ["10 pertanyaan dengan", "bahasa natural pasien."],
    art: { src: "/landing/phone-typing.webp", width: 101, height: 161 },
  },
  {
    title: "Tanpa repot",
    lines: [
      "Cukup alamat website",
      "atau Instagram.",
      "Tanpa daftar, tanpa kata sandi.",
    ],
    art: { src: "/landing/website-card.webp", width: 146, height: 118 },
  },
  {
    title: "Siap ditindaklanjuti",
    lines: ["Ada penjelasan lengkap untuk", "setiap saran perbaikan."],
    art: { src: "/landing/clipboard.webp", width: 116, height: 140 },
  },
];

/** S6: why the report can be trusted and acted on. */
export function TrustPoints() {
  return (
    <section className={shell.section} aria-labelledby="s6-title">
      <div className={shell.container}>
        <header className={shell.head}>
          <h2 id="s6-title" className={cn("type-heading-xl", shell.h2)}>
            Bisa dipercaya, <br className={styles.narrowBreak} />
            bisa ditindaklanjuti
          </h2>
        </header>
        <ul className={styles.items}>
          {POINTS.map(({ title, lines, art }) => (
            <li key={title} className={styles.item}>
              <span className={styles.art}>
                {/* eslint-disable-next-line @next/next/no-img-element -- static art from /public, sized on purpose */}
                <img
                  src={art.src}
                  width={art.width}
                  height={art.height}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  style={{ "--w": `${art.width}px` } as CSSProperties}
                />
              </span>
              <span className={styles.words}>
                <h3 className={styles.title}>{title}</h3>
                <p className={styles.line}>
                  {lines.map((line, index) => (
                    <Fragment key={line}>
                      {index > 0 ? <br /> : null}
                      {line}
                    </Fragment>
                  ))}
                </p>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
