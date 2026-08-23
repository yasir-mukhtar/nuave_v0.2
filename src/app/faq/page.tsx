import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import LandingNav from "@/components/LandingNav";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Pertanyaan yang Sering Diajukan | Nuave",
  description:
    "Jawaban tentang audit visibilitas AI Nuave dalam tahap pengujian privat, cara kerja audit, bukti, dan batasannya.",
};

const EMAIL = "hello@nuave.ai";

const FAQ_STYLE =
  ".nuave-faq { font-family: var(--font-inter), sans-serif; color: #374151; }" +
  ".nuave-faq h1 { font-family: var(--font-geist-sans), sans-serif; font-size: 40px; font-weight: 600; letter-spacing: -0.5px; line-height: 1.15; color: #111827; margin: 0 0 8px; }" +
  ".nuave-faq h2 { font-family: var(--font-geist-sans), sans-serif; font-size: 22px; font-weight: 600; letter-spacing: -0.3px; line-height: 1.35; color: #111827; margin: 0 0 12px; }" +
  ".nuave-faq main a { color: var(--lp-purple, #533AFD); text-decoration: underline; text-underline-offset: 3px; }" +
  ".nuave-faq p { margin: 0 0 16px; }" +
  ".nuave-faq ul { margin: 0 0 16px; padding-left: 20px; list-style: disc; }" +
  ".nuave-faq li { margin: 0 0 8px; line-height: 1.7; }";

function FaqSection({ question, children }: { question: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      <h2>{question}</h2>
      {children}
    </section>
  );
}

export default function FaqPage() {
  return (
    <div className="nuave-faq min-h-screen bg-white">
      <style>{FAQ_STYLE}</style>
      <LandingNav />
      <main className="max-w-[760px] mx-auto px-8 pt-[150px] pb-[120px] text-[15px] leading-[1.7]">
        <h1>Pertanyaan yang sering diajukan</h1>
        <p>
          Nuave saat ini berada dalam pengujian privat. Halaman ini menjelaskan
          kemampuan produk yang aktif sekarang, bukan fitur komersial yang masih
          direncanakan.
        </p>

        <FaqSection question="Apa itu Nuave?">
          <p>
            Nuave mengaudit bagaimana sebuah bisnis muncul dalam sepuluh jawaban
            AI. Anda memasukkan sumber resmi bisnis, memeriksa fakta yang
            ditemukan, meninjau sepuluh pertanyaan, lalu menjalankan audit.
          </p>
          <p>
            Hasilnya adalah laporan sesi yang menunjukkan kemunculan bisnis,
            bukti jawaban dan sumber, bisnis lain yang teramati, interpretasi,
            dan tindakan yang didukung oleh temuan.
          </p>
        </FaqSection>

        <FaqSection question="Sumber bisnis apa yang didukung?">
          <p>
            Intake aktif menerima URL website resmi atau profil akun Instagram.
            Google Business Profile/Google Maps belum menjadi sumber intake yang
            didukung pada versi ini.
          </p>
        </FaqSection>

        <FaqSection question="Apa yang diuji?">
          <p>
            Nuave membuat sepuluh pertanyaan berbahasa Indonesia: lima pertanyaan
            awal tanpa menyebut bisnis Anda dan lima yang menyebut bisnis Anda.
            Anda dapat mengubah pertanyaan sebelum audit dimulai. Setelah audit
            dimulai, identitas dan urutan pertanyaan dikunci untuk menjaga bukti
            tetap konsisten.
          </p>
        </FaqSection>

        <FaqSection question="Apakah ini sama dengan aplikasi ChatGPT konsumen?">
          <p>
            Tidak. Audit menggunakan metode API dengan pencarian web yang
            dilindungi dan dicatat oleh sistem. Hasilnya adalah observasi dari
            metode audit Nuave, bukan reproduksi persis antarmuka atau sesi
            ChatGPT konsumen.
          </p>
        </FaqSection>

        <FaqSection question="Apa yang saya terima saat ini?">
          <ul>
            <li>ringkasan kemunculan bisnis pada sepuluh pertanyaan;</li>
            <li>hasil per pertanyaan dengan kutipan jawaban dan sumber;</li>
            <li>bisnis lain yang benar-benar teramati dalam bukti;</li>
            <li>temuan, interpretasi, dan tindakan yang terkait dengan bukti;</li>
            <li>metode serta batasan audit; dan</li>
            <li>opsi mencetak atau menyimpan tampilan laporan sebagai PDF melalui peramban serta mengunduh bukti JSON.</li>
          </ul>
          <p>
            Versi ini belum menyediakan akun, dashboard persisten, pengiriman
            laporan lewat email, atau tautan laporan privat yang tersimpan di
            server.
          </p>
        </FaqSection>

        <FaqSection question="Apakah hasil Nuave merupakan peringkat?">
          <p>
            Tidak. Laporan adalah snapshot dari sepuluh pertanyaan pada satu
            metode dan waktu tertentu. Jawaban AI dapat berubah. Disebut juga
            tidak sama dengan direkomendasikan.
          </p>
        </FaqSection>

        <FaqSection question="Apakah Nuave menjamin hasil bisnis?">
          <p>
            Tidak. Nuave tidak menjamin kenaikan visibilitas, traffic, calon
            pelanggan, penjualan, atau pendapatan. Laporan menunjukkan bukti
            yang diamati dan tindakan yang didukung bukti tersebut.
          </p>
        </FaqSection>

        <FaqSection question="Apakah audit saat ini berbayar?">
          <p>
            Alur pembayaran belum aktif pada produk pengujian privat ini. Karena
            itu halaman publik Nuave saat ini tidak menjanjikan harga, metode
            pembayaran, refund, atau waktu pengiriman komersial tertentu.
          </p>
        </FaqSection>

        <FaqSection question="Apakah laporan disimpan atau dikirim lewat email?">
          <p>
            Belum. State audit saat ini bersifat browser/session-based. Menutup
            tab menghentikan proses yang sedang berjalan, dan belum ada pekerjaan
            server tahan lama yang meneruskan audit di latar belakang.
          </p>
        </FaqSection>

        <FaqSection question="Data apa yang sebaiknya saya masukkan?">
          <p>
            Gunakan informasi bisnis yang memang diperlukan dan sumber publik.
            Jangan masukkan kata sandi, data pelanggan, data kesehatan, data
            keuangan pribadi, atau informasi sensitif lain. Lihat{" "}
            <Link href="/privacy">Kebijakan Privasi dan Data</Link> untuk keadaan
            produk saat ini.
          </p>
        </FaqSection>

        <FaqSection question="Bagaimana meminta bantuan?">
          <p>
            Pengujian privat ini menggunakan bantuan founder. Hubungi{" "}
            <a href={`mailto:${EMAIL}`}>{EMAIL}</a> atau buka{" "}
            <Link href="/support">Kontak dan Bantuan</Link>. Kami tidak
            menjanjikan SLA respons tertentu pada tahap ini.
          </p>
        </FaqSection>
      </main>
      <Footer />
    </div>
  );
}
