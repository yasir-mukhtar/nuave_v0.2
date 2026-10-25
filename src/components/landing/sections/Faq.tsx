"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SUPPORT_EMAIL, SUPPORT_REPLY } from "@/lib/legal";
import { AUDIT_SOURCES_TEXT, DELIVERY_PROMISE } from "@/lib/orders/promise";
import { cn } from "@/lib/utils";
import shell from "../landing.module.css";
import styles from "./Faq.module.css";

/**
 * The approved answers of `docs/content/website/FAQ.md`, in its order,
 * without the two questions only `/faq` asks ("Apa yang saya terima?",
 * "Data apa yang perlu saya isi?"). Shared facts come from the same
 * constants `/faq` uses, so the two pages cannot drift apart.
 */
export const LANDING_FAQ: { question: string; answer: ReactNode }[] = [
  {
    question: "Bagaimana cara klinik muncul di Google AI Overview?",
    answer: (
      <>
        <p>
          Tidak ada yang bisa menjamin. Google memilih sendiri sumbernya, dan
          sering tidak menampilkan AI Overview untuk pencarian lokal.
        </p>
        <p>
          Langkah pertama adalah tahu posisi klinik Anda sekarang: pertanyaan
          mana yang memunculkan AI Overview, klinik dan situs apa yang disebut,
          dan informasi apa yang perlu dibenahi.
        </p>
      </>
    ),
  },
  {
    question: "Bedanya dengan SEO?",
    answer: (
      <p>
        Tujuannya mirip, tempatnya beda. SEO mengurus posisi website di hasil
        Google. Nuave melihat apakah ChatGPT dan Google AI Overview menyebut
        klinik Anda, dan dari sumber apa.
      </p>
    ),
  },
  {
    question: "Bisa cek sendiri di ChatGPT?",
    answer: (
      <p>
        Bisa. Bedanya, Anda hanya melihat satu jawaban, dari satu akun, pada
        satu waktu. Nuave menanyakan sepuluh pertanyaan dari pencarian Google ke{" "}
        {AUDIT_SOURCES_TEXT}. Pertanyaan tentang memilih klinik menyebut kota
        Anda. Lalu kami catat jawaban, sumber, klinik lain yang disebut, dan
        yang perlu dibenahi.
      </p>
    ),
  },
  {
    question: "AI apa yang diuji?",
    answer: (
      <p>
        {AUDIT_SOURCES_TEXT}, dengan sepuluh pertanyaan yang sama persis. Google
        sering tidak menampilkan AI Overview untuk pencarian lokal. Laporan
        mencatat seberapa sering, sebagai temuan, bukan sebagai pemeriksaan yang
        gagal.
      </p>
    ),
  },
  {
    question: "Dari mana pertanyaannya?",
    answer: (
      <>
        <p>
          Dari data pencarian Google untuk jenis klinik dan kota Anda. Tiap
          pertanyaan diberi label asalnya. Jika datanya tidak cukup, pertanyaan
          disusun dari profil klinik Anda, dan labelnya menyebut itu.
        </p>
        <p>
          Anda membaca dan boleh mengubah sepuluh pertanyaan itu sebelum audit
          dimulai. Setelah Anda setuju, pertanyaan dikunci.
        </p>
      </>
    ),
  },
  {
    question: "Apa yang gratis?",
    answer: (
      <>
        <p>
          Yang gratis hanya mencari klinik Anda, lalu Anda memastikan itu benar
          klinik Anda. Di langkah ini belum ada hasil AI.
        </p>
        <p>
          Hasil AI ada di audit Rp249.000, sekali bayar. Tidak ada langganan dan
          tidak ada biaya tambahan saat checkout. Bayar lewat QRIS, transfer
          bank, GoPay, atau DANA.
        </p>
      </>
    ),
  },
  {
    question: "Berapa lama?",
    answer: (
      <>
        <p>Cek gratis biasanya hanya beberapa detik. {DELIVERY_PROMISE}</p>
        <p>
          Audit dimulai saat Anda menyetujui sepuluh pertanyaan. Anda boleh
          menutup halaman. Link laporan dikirim ke email pesanan dan berlaku 12
          bulan.
        </p>
        <p>
          Setelah membayar, lanjutkan isian di browser yang sama. Jika
          pertanyaan belum Anda setujui dalam 7 hari, pesanan berakhir dan uang
          Anda kembali penuh.
        </p>
      </>
    ),
  },
  {
    question: "Jawaban AI kan berubah-ubah?",
    answer: (
      <>
        <p>
          Benar. Jawaban bisa berbeda menurut waktu, akun, dan lokasi. Laporan
          mencatat jawaban pada satu waktu, lengkap dengan tanggal dan
          sumbernya. Karena itu kami sarankan cek ulang, sebagai pesanan baru,
          setelah 6 sampai 8 minggu.
        </p>
        <p>
          Laporan bukan peringkat atau jaminan. Nuave tidak menjamin klinik Anda
          akan disebut, atau pasien dan penjualan akan naik.
        </p>
      </>
    ),
  },
  {
    question: "Klinik saya punya beberapa cabang.",
    answer: (
      <p>
        Satu audit untuk satu kota, yaitu kota utama klinik Anda atau kota
        cabang yang Anda pilih, atau untuk seluruh Indonesia. Pilihannya Anda
        tentukan setelah membayar. Untuk kota lain, pesan audit terpisah.
      </p>
    ),
  },
  {
    question: "Aman soal aturan iklan kesehatan?",
    answer: (
      <p>
        Laporan Nuave untuk internal klinik, bukan iklan. Sarannya biasanya
        tentang informasi seperti jadwal, layanan, dan lokasi. Sebelum
        memakainya untuk promosi, pastikan sesuai aturan iklan kesehatan yang
        berlaku.
      </p>
    ),
  },
  {
    question: "Kalau ada masalah?",
    answer: (
      <>
        <p>
          Pemeriksaan yang gagal ditandai Tidak dapat diuji, dengan tautan Minta
          bantuan. Itu bukan hasil buruk. Tim kami membantu memeriksa ulang.
          Jika tetap tidak bisa, Anda mendapat pengembalian dana sebagian:
          Rp12.450 untuk setiap pemeriksaan yang gagal. Jika audit tidak bisa
          selesai, atau laporan belum siap 24 jam setelah audit dimulai, uang
          Anda kembali penuh.
        </p>
        <p>
          Salah ketik email saat memesan? Kirim bukti pembayaran atau nomor
          transaksi Midtrans ke{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>, dan kami
          bantu.
        </p>
        <p>
          Untuk hal lain, balas email laporan Anda atau tulis ke{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. Kami balas
          dalam {SUPPORT_REPLY}. Rinciannya ada di{" "}
          <Link href="/terms">Syarat dan ketentuan</Link>.
        </p>
      </>
    ),
  },
];

function PlusMinus() {
  return (
    <span className={styles.mark} aria-hidden="true">
      <span className={styles.barH} />
      <span className={styles.barV} />
    </span>
  );
}

/** S8: the approved FAQ. The first answer is open; one at a time; every
 * answer is in the page (found by the browser's find even while closed). */
export function Faq() {
  return (
    <section id="faq" className={shell.section} aria-labelledby="s8-title">
      <div className={shell.container}>
        <header className={shell.head}>
          <h2 id="s8-title" className={cn("type-heading-xl", shell.h2)}>
            Yang sering ditanyakan
          </h2>
        </header>
        {/* Without JavaScript every answer shows (Spec 020, failure and
            recovery). Tailwind's base layer hides [hidden] with !important,
            and a layered !important beats an unlayered one, so this rule
            joins that layer and wins on specificity. */}
        <noscript>
          <style>{`@layer base { [data-landing-faq] [hidden] { display: block !important; } }`}</style>
        </noscript>
        <Accordion
          className={styles.list}
          defaultValue={["q1"]}
          hiddenUntilFound
          data-landing-faq
        >
          {LANDING_FAQ.map(({ question, answer }, index) => (
            <AccordionItem
              key={question}
              value={`q${index + 1}`}
              className={styles.item}
            >
              <AccordionTrigger
                className={styles.trigger}
                indicator={<PlusMinus />}
              >
                {question}
              </AccordionTrigger>
              <AccordionContent className={styles.answer}>
                {answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
