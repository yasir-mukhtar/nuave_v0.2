import type { Metadata } from "next";
import Link from "next/link";
import LandingNav from "@/components/LandingNav";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Syarat Penggunaan Saat Ini | Nuave",
  description:
    "Batas penggunaan Nuave selama tahap pengujian privat sebelum alur komersial dan penyimpanan laporan diluncurkan.",
};

const EMAIL = "hello@nuave.ai";
const STYLE =
  ".nuave-terms { font-family: var(--font-inter), sans-serif; color: #374151; }" +
  ".nuave-terms h1 { font-family: var(--font-geist-sans), sans-serif; font-size: 40px; font-weight: 600; letter-spacing: -0.5px; line-height: 1.15; color: #111827; margin: 0 0 8px; }" +
  ".nuave-terms h2 { font-family: var(--font-geist-sans), sans-serif; font-size: 22px; font-weight: 600; color: #111827; margin: 0 0 12px; }" +
  ".nuave-terms main a { color: var(--lp-purple, #533AFD); text-decoration: underline; text-underline-offset: 3px; }" +
  ".nuave-terms p { margin: 0 0 16px; }" +
  ".nuave-terms ul { margin: 0 0 16px; padding-left: 20px; list-style: disc; }" +
  ".nuave-terms li { margin: 0 0 8px; line-height: 1.7; }";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export default function TermsPage() {
  return (
    <div className="nuave-terms min-h-screen bg-white">
      <style>{STYLE}</style>
      <LandingNav />
      <main className="max-w-[760px] mx-auto px-8 pt-[150px] pb-[120px] text-[15px] leading-[1.7]">
        <h1>Syarat penggunaan saat ini</h1>
        <div className="rounded-[12px] border border-[#E5E7EB] bg-[#F9FAFB] px-6 py-4 mb-10">
          <strong>Pengujian privat</strong>
          <p className="mb-0 mt-2">
            Nuave belum membuka alur komersial. Halaman ini menjelaskan batas
            produk yang aktif sekarang dan bukan janji harga, pembayaran,
            pengiriman, refund, atau akses laporan jangka panjang.
          </p>
        </div>

        <Section title="1. Ruang lingkup produk aktif">
          <p>
            Nuave menjalankan satu audit visibilitas AI untuk satu bisnis dalam
            sesi browser. Anda meninjau fakta bisnis dan sepuluh pertanyaan
            sebelum audit dijalankan. Laporan hanya dibuat setelah sepuluh
            observasi yang memenuhi kontrak audit tersedia.
          </p>
          <p>
            Produk aktif belum menyediakan akun, langganan, dashboard persisten,
            pembayaran, email delivery, tautan laporan privat yang disimpan di
            server, atau pekerjaan audit yang terus berjalan setelah tab
            ditutup.
          </p>
        </Section>

        <Section title="2. Tanggung jawab saat menguji">
          <ul>
            <li>
              Gunakan sumber resmi untuk bisnis yang memang berhak Anda uji.
            </li>
            <li>Periksa dan koreksi fakta sebelum membuat pertanyaan.</li>
            <li>
              Jangan kirim kata sandi, data pelanggan, data kesehatan, data
              keuangan pribadi, atau rahasia privat yang tidak diperlukan.
            </li>
            <li>
              Jangan menganggap hasil sebagai peringkat permanen atau jaminan
              hasil bisnis.
            </li>
          </ul>
        </Section>

        <Section title="3. Batas metode">
          <p>
            Hasil adalah snapshot dari sepuluh pertanyaan pada metode dan waktu
            audit tertentu. Jawaban AI dapat berubah. Penyebutan bisnis bukan
            berarti rekomendasi, dan kegagalan teknis bukan hasil negatif.
          </p>
          <p>
            Nuave tidak menjamin peningkatan traffic, leads, penjualan,
            pendapatan, atau frekuensi penyebutan setelah tindakan tertentu.
          </p>
        </Section>

        <Section title="4. Penyimpanan dan keberlanjutan sesi">
          <p>
            Fase produk ini menggunakan state browser/session. Tidak ada kontrak
            penyimpanan server tahan lama atau masa akses laporan yang
            dijanjikan. Simpan sendiri bukti yang tersedia jika diperlukan.
            Menutup tab saat audit berjalan menghentikan pekerjaan yang belum
            selesai.
          </p>
        </Section>

        <Section title="5. Pembayaran dan pengiriman">
          <p>
            Checkout, pemrosesan pembayaran, refund otomatis, email delivery,
            dan SLA pengiriman belum aktif. Nilai komersial untuk fitur-fitur
            tersebut tidak ditetapkan pada halaman ini karena implementasinya
            belum menjadi produk saat ini.
          </p>
        </Section>

        <Section title="6. Bantuan">
          <p>
            Selama pengujian privat, pertanyaan dapat dikirim ke{" "}
            <a href={`mailto:${EMAIL}`}>{EMAIL}</a> atau melalui{" "}
            <Link href="/support">Kontak dan Bantuan</Link>. Tidak ada SLA
            dukungan tertentu yang dijanjikan saat ini.
          </p>
        </Section>

        <Section title="7. Privasi">
          <p>
            Lihat <Link href="/privacy">Kebijakan Privasi dan Data</Link> untuk
            penjelasan yang sesuai dengan arsitektur produk aktif sekarang.
          </p>
        </Section>
      </main>
      <Footer />
    </div>
  );
}
