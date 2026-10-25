import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import LandingNav from "@/components/LandingNav";
import Footer from "@/components/Footer";
import { SUPPORT_EMAIL, SUPPORT_REPLY } from "@/lib/legal";
import { AUDIT_SOURCES_TEXT, DELIVERY_PROMISE } from "@/lib/orders/promise";

export const metadata: Metadata = {
  title: "Pertanyaan yang Sering Diajukan | Nuave",
  description:
    "Jawaban singkat untuk klinik: cara muncul di Google AI Overview dan ChatGPT, yang diperiksa, harga, waktu laporan, dan pengembalian dana.",
};

function FaqSection({
  question,
  children,
}: {
  question: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="type-heading-sm m-0 mb-3 text-[#111827]">{question}</h2>
      {children}
    </section>
  );
}

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingNav />
      <main className="type-copy mx-auto max-w-[760px] px-8 pt-[150px] pb-[120px] text-[#374151] [&_a]:text-[var(--lp-purple)] [&_a]:underline [&_a]:underline-offset-[3px] [&_li]:mb-2 [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5">
        <h1 className="type-heading-xl m-0 mb-2 text-[#111827]">
          Yang sering ditanyakan
        </h1>

        <FaqSection question="Bagaimana cara klinik muncul di Google AI Overview?">
          <p>
            Tidak ada yang bisa menjamin. Google memilih sendiri sumbernya, dan
            sering tidak menampilkan AI Overview untuk pencarian lokal.
          </p>
          <p>
            Langkah pertama adalah tahu posisi klinik Anda sekarang: pertanyaan
            mana yang memunculkan AI Overview, klinik dan situs apa yang
            disebut, dan informasi apa yang perlu dibenahi.
          </p>
        </FaqSection>

        <FaqSection question="Bedanya dengan SEO?">
          <p>
            Tujuannya mirip, tempatnya beda. SEO mengurus posisi website di
            hasil Google. Nuave melihat apakah ChatGPT dan Google AI Overview
            menyebut klinik Anda, dan dari sumber apa.
          </p>
        </FaqSection>

        <FaqSection question="Bisa cek sendiri di ChatGPT?">
          <p>
            Bisa. Bedanya, Anda hanya melihat satu jawaban, dari satu akun, pada
            satu waktu. Nuave menanyakan sepuluh pertanyaan dari pencarian
            Google, yang menyebut kota Anda, ke {AUDIT_SOURCES_TEXT}. Lalu kami
            catat jawaban, sumber, klinik lain yang disebut, dan yang perlu
            dibenahi.
          </p>
        </FaqSection>

        <FaqSection question="AI apa yang diuji?">
          <p>
            {AUDIT_SOURCES_TEXT}, dengan sepuluh pertanyaan yang sama persis.
            Google sering tidak menampilkan AI Overview untuk pencarian lokal.
            Laporan mencatat seberapa sering, sebagai temuan, bukan sebagai
            pemeriksaan yang gagal.
          </p>
        </FaqSection>

        <FaqSection question="Dari mana pertanyaannya?">
          <p>
            Dari data pencarian Google untuk jenis klinik dan kota Anda. Tiap
            pertanyaan diberi label asalnya. Jika datanya sedikit, sebagian
            pertanyaan disusun dari profil klinik Anda, dan labelnya menyebut
            itu.
          </p>
          <p>
            Anda membaca dan boleh mengubah sepuluh pertanyaan itu sebelum audit
            dimulai. Setelah Anda setuju, pertanyaan dikunci.
          </p>
        </FaqSection>

        <FaqSection question="Apa yang saya terima?">
          <ul>
            <li>
              berapa kali klinik Anda disebut di ChatGPT dan di Google AI
              Overview;
            </li>
            <li>jawaban dari kedua sumber untuk tiap pertanyaan;</li>
            <li>klinik lain yang disebut dan sumber yang dibaca AI;</li>
            <li>hal yang bisa Anda benahi; dan</li>
            <li>laporan di web, dengan Download PDF.</li>
          </ul>
        </FaqSection>

        <FaqSection question="Apa yang gratis?">
          <p>
            Yang gratis hanya mencari klinik Anda, lalu Anda memastikan itu
            benar klinik Anda. Di langkah ini belum ada hasil AI.
          </p>
          <p>
            Hasil AI ada di audit Rp249.000, sekali bayar. Tidak ada langganan
            dan tidak ada biaya tambahan saat checkout. Bayar lewat QRIS,
            transfer bank, GoPay, atau DANA.
          </p>
        </FaqSection>

        <FaqSection question="Berapa lama?">
          <p>Cek gratis biasanya hanya beberapa detik. {DELIVERY_PROMISE}</p>
          <p>
            Audit dimulai saat Anda menyetujui sepuluh pertanyaan. Anda boleh
            menutup halaman. Link laporan dikirim ke email pesanan dan berlaku
            12 bulan.
          </p>
          <p>
            Setelah membayar, lanjutkan isian di browser yang sama. Jika
            pertanyaan belum Anda setujui dalam 7 hari, pesanan berakhir dan
            uang Anda kembali penuh.
          </p>
        </FaqSection>

        <FaqSection question="Jawaban AI kan berubah-ubah?">
          <p>
            Benar. Jawaban bisa berbeda menurut waktu, akun, dan lokasi. Laporan
            mencatat jawaban pada satu waktu, lengkap dengan tanggal dan
            sumbernya. Karena itu kami sarankan cek ulang setelah 6 sampai 8
            minggu.
          </p>
          <p>
            Laporan bukan peringkat atau jaminan. Nuave tidak menjamin klinik
            Anda akan disebut, atau pasien dan penjualan akan naik.
          </p>
        </FaqSection>

        <FaqSection question="Klinik saya punya beberapa cabang.">
          <p>
            Satu audit untuk satu kota: kota utama klinik Anda, atau kota cabang
            yang Anda pilih. Kotanya Anda pilih setelah membayar. Untuk kota
            lain, pesan audit terpisah.
          </p>
        </FaqSection>

        <FaqSection question="Aman soal aturan iklan kesehatan?">
          <p>
            Laporan Nuave untuk internal klinik, bukan iklan. Sarannya
            menyangkut informasi faktual, seperti jadwal, layanan, dan lokasi.
            Untuk materi promosi klinik, tetap ikuti aturan iklan kesehatan yang
            berlaku.
          </p>
        </FaqSection>

        <FaqSection question="Data apa yang perlu saya isi?">
          <p>
            Cukup website atau Instagram klinik, data klinik yang sudah publik,
            dan email untuk menerima laporan. Jangan isi data pasien, rekam
            medis, atau kata sandi. Baca{" "}
            <Link href="/privacy">Kebijakan privasi dan data</Link>.
          </p>
        </FaqSection>

        <FaqSection question="Kalau ada masalah?">
          <p>
            Pemeriksaan yang gagal ditandai Tidak dapat diuji, dengan tautan
            Minta bantuan. Itu bukan hasil buruk. Tim kami membantu memeriksa
            ulang. Jika tetap tidak bisa, Anda mendapat pengembalian dana
            sebagian: Rp12.450 untuk setiap pemeriksaan yang gagal.
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
        </FaqSection>
      </main>
      <Footer />
    </div>
  );
}
