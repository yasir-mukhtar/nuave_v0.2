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

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="type-heading-sm m-0 mb-3 text-[#111827]">{title}</h2>
      {children}
    </section>
  );
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingNav />
      <main className="type-copy mx-auto max-w-[760px] px-8 pt-[150px] pb-[120px] text-[#374151] [&_a]:text-[var(--lp-purple)] [&_a]:underline [&_a]:underline-offset-[3px] [&_li]:mb-2 [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5">
        <h1 className="type-heading-xl m-0 mb-2 text-[#111827]">
          Syarat penggunaan saat ini
        </h1>
        <div className="mb-10 rounded-[12px] border border-[#E5E7EB] bg-[#F9FAFB] px-6 py-4">
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
