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
    "Jawaban singkat tentang audit Nuave: yang diperiksa, harga, waktu laporan, pengembalian dana, dan batasannya.",
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
          Pertanyaan yang sering diajukan
        </h1>

        <FaqSection question="Apa itu Nuave?">
          <p>
            Nuave memeriksa apakah bisnis Anda disebut saat orang bertanya ke
            AI. Kami menanyakan sepuluh pertanyaan ke {AUDIT_SOURCES_TEXT}, lalu
            menunjukkan hasilnya dalam satu laporan.
          </p>
        </FaqSection>

        <FaqSection question="Pertanyaannya dari mana?">
          <p>
            Pertanyaan disusun dari hal yang dicari orang di Google untuk
            layanan dan kota Anda. Jika data pencarian untuk bisnis Anda terlalu
            sedikit, pertanyaan disusun dari profil bisnis Anda, dan laporan
            menyebutkannya. Anda membaca dan boleh mengubah sepuluh pertanyaan
            itu sebelum audit dimulai. Setelah Anda setuju, pertanyaan dikunci.
          </p>
        </FaqSection>

        <FaqSection question="Apa yang saya terima?">
          <ul>
            <li>
              berapa kali bisnis Anda disebut di ChatGPT dan di Google AI
              Overview;
            </li>
            <li>
              jawaban dari kedua sumber untuk tiap pertanyaan. Google sering
              tidak menampilkan AI Overview, dan itu dicatat sebagai temuan;
            </li>
            <li>bisnis lain yang disebut dan sumber yang dibaca AI;</li>
            <li>hal yang bisa Anda perbaiki; dan</li>
            <li>laporan di web, dengan Download PDF.</li>
          </ul>
        </FaqSection>

        <FaqSection question="Berapa harganya?">
          <p>
            Rp249.000 untuk satu audit, sekali bayar. Tidak ada langganan dan
            tidak ada biaya tambahan saat checkout. Bayar lewat QRIS, transfer
            bank, GoPay, atau DANA. Cek gratis di awal hanya memastikan bisnis
            Anda. Setelah membayar, lanjutkan isian di browser yang sama. Jika
            pertanyaan belum Anda setujui dalam 7 hari, pesanan berakhir dan
            uang Anda kembali penuh.
          </p>
        </FaqSection>

        <FaqSection question="Kapan laporan siap?">
          <p>{DELIVERY_PROMISE}</p>
          <p>
            Audit dimulai saat Anda menyetujui sepuluh pertanyaan. Anda boleh
            menutup halaman. Link laporan dikirim ke email pesanan dan berlaku
            12 bulan.
          </p>
        </FaqSection>

        <FaqSection question="Bagaimana jika ada pemeriksaan yang gagal?">
          <p>
            Pertanyaan yang gagal diperiksa ditandai Tidak dapat diuji, dengan
            tautan Minta bantuan. Itu bukan hasil buruk. Kami coba periksa ulang
            dan mengirim hasilnya. Jika tetap tidak bisa, kami kembalikan
            Rp12.450 untuk setiap pemeriksaan yang gagal. Rinciannya ada di{" "}
            <Link href="/terms">Syarat dan ketentuan</Link>.
          </p>
        </FaqSection>

        <FaqSection question="Apakah hasilnya peringkat atau jaminan?">
          <p>
            Bukan. Laporan adalah hasil sepuluh pertanyaan pada satu waktu.
            Jawaban AI bisa berubah. Nuave tidak menjamin bisnis Anda akan
            disebut, atau pengunjung dan penjualan akan naik.
          </p>
        </FaqSection>

        <FaqSection question="Data apa yang perlu saya isi?">
          <p>
            Cukup website bisnis, data bisnis yang sudah publik, dan email untuk
            menerima laporan. Jangan isi data pasien, data pelanggan, atau kata
            sandi. Baca <Link href="/privacy">Kebijakan privasi dan data</Link>.
          </p>
        </FaqSection>

        <FaqSection question="Bagaimana minta bantuan?">
          <p>
            Tulis ke <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>{" "}
            dengan nomor pesanan Anda. Kami balas dalam {SUPPORT_REPLY}. Lihat
            juga <Link href="/support">Kontak dan bantuan</Link>.
          </p>
        </FaqSection>
      </main>
      <Footer />
    </div>
  );
}
