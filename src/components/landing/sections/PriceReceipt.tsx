import { IconCheck } from "@tabler/icons-react";
import { NuaveMark } from "@/components/product/journey/NuaveLogo";
import { cn } from "@/lib/utils";
import { SourceForm } from "../SourceForm";
import shell from "../landing.module.css";
import styles from "./PriceReceipt.module.css";

const ITEMS = [
  [
    "10 pertanyaan pasien",
    "Berdasarkan volume pencarian di Google untuk jenis klinik dan kota Anda.",
  ],
  ["Jumlah pencarian", "Data berapa kali topiknya dicari per bulan."],
  [
    "Jawaban ChatGPT",
    "Ditanyakan langsung ke ChatGPT, dijawab lengkap dengan sumbernya.",
  ],
  [
    "Google AI Overview",
    "Dicek dari kota Anda dan seberapa sering Google menampilkannya.",
  ],
  ["Skor", "Disebut di berapa jawaban ChatGPT dan Google AI Overview."],
  ["Klinik lain", "Menampilkan klinik lain yang muncul dalam jawaban AI."],
  [
    "Sumber AI",
    "Situs apa saja yang menjadi referensi AI dalam membuat jawaban.",
  ],
  [
    "Topik terlewat",
    "Topik yang dicari orang, tapi belum menyebut klinik Anda.",
  ],
  [
    "Perbaikan dan PDF",
    "Apa tindak lanjut yang bisa dikerjakan. Siap dibahas dalam rapat.",
  ],
] as const;

const METHODS = ["QRIS", "Transfer bank", "GoPay", "DANA"];

/** S7: what one audit holds, on a paper receipt, with the price and the
 * second website form. */
export function PriceReceipt() {
  return (
    <section
      id="harga"
      className={cn(shell.section, styles.section)}
      aria-labelledby="s7-title"
    >
      <div className={shell.container}>
        <header className={shell.head}>
          <h2 id="s7-title" className={cn("type-heading-xl", shell.h2)}>
            Yang Anda dapat <br className={styles.narrowBreak} />
            dari satu audit
          </h2>
          <p className={shell.line}>Rp249.000 sekali bayar.</p>
        </header>

        <div className={styles.stage}>
          <div className={styles.paper}>
            <div className={styles.receipt}>
              <div className={styles.head}>
                <NuaveMark className={styles.mark} />
                <p className={styles.title}>AI Visibility Report</p>
                <p className={styles.sub}>
                  Diperiksa di ChatGPT dan Google AI Overview
                </p>
              </div>
              <hr className={styles.rule} />
              <ol className={styles.items}>
                {ITEMS.map(([item, line], index) => (
                  <li key={item} className={styles.item}>
                    <span className={styles.no} aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className={styles.itemText}>
                      <span className={styles.itemTitle}>{item}</span>
                      <span className={styles.itemLine}>{line}</span>
                    </span>
                    <IconCheck
                      className={styles.tick}
                      size={18}
                      stroke={1.75}
                      aria-hidden="true"
                    />
                  </li>
                ))}
              </ol>
              <hr className={styles.double} />
              <div className={styles.total}>
                <p className={styles.price}>Rp249.000</p>
                <p className={styles.terms}>
                  Sekali bayar.
                  <br />
                  Tanpa langganan.
                  <br />
                  Tanpa biaya tambahan.
                </p>
              </div>
            </div>
            <div className={styles.stub}>
              <p className={styles.pay}>Bayar setelah klinik Anda ketemu.</p>
              <p className={styles.methods}>
                {METHODS.map((method, index) => (
                  <span key={method}>
                    {index > 0 ? (
                      <span className={styles.sep}>{" · "}</span>
                    ) : null}
                    {method}
                  </span>
                ))}
              </p>
              <SourceForm layout="stacked" className={styles.form} />
              <p className={styles.ready}>
                Laporan siap dalam 15 menit setelah audit dimulai.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
