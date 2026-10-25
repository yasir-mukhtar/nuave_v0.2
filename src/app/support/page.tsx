import type { Metadata } from "next";
import Link from "next/link";
import LandingNav from "@/components/LandingNav";
import Footer from "@/components/Footer";
import {
  OPERATOR_CITY,
  OPERATOR_NAME,
  SUPPORT_EMAIL,
  SUPPORT_REPLY,
} from "@/lib/legal";

export const metadata: Metadata = {
  title: "Kontak dan Bantuan | Nuave",
  description:
    "Hubungi Nuave soal pembayaran, link laporan, pemeriksaan yang gagal, pengembalian dana, atau data Anda.",
};

const TOPICS: Array<[string, string]> = [
  [
    "Sebelum membeli",
    "Isi audit, harga, cara kerja, atau apakah audit cocok untuk bisnis Anda.",
  ],
  [
    "Pembayaran atau pesanan",
    "Pembayaran gagal atau tertagih dua kali, status pesanan, atau pembatalan sebelum audit dimulai.",
  ],
  [
    "Link laporan",
    "Email laporan belum masuk, link tidak bisa dibuka, atau link terlanjur tersebar dan perlu diganti.",
  ],
  [
    "Pemeriksaan gagal atau pengembalian dana",
    "Ada pertanyaan bertanda Tidak dapat diuji, laporan belum siap, atau Anda ingin uang kembali sesuai syarat.",
  ],
  [
    "Data Anda",
    "Minta salinan, perbaikan, atau penghapusan data. Kirim dari email pesanan Anda.",
  ],
];

export default function SupportPage() {
  return (
    <div className="lp-page min-h-screen">
      <LandingNav />
      <main className="bg-white pt-[140px] px-8 pb-[120px]">
        <div className="max-w-[740px] mx-auto">
          <h1 className="type-heading-xl m-0 mb-6">Kontak dan bantuan</h1>
          <p className="type-copy-lg text-[var(--lp-text-secondary)] m-0">
            Ada pertanyaan atau masalah? Tulis ke{" "}
            <a
              className="text-[var(--lp-purple)] underline"
              href={`mailto:${SUPPORT_EMAIL}`}
            >
              {SUPPORT_EMAIL}
            </a>
            . Kami balas dalam {SUPPORT_REPLY}, Senin sampai Jumat (WIB).
          </p>
          <p className="type-copy text-[#6B7280] m-0 mt-4">
            Nuave adalah layanan independen yang dijalankan oleh {OPERATOR_NAME}{" "}
            di {OPERATOR_CITY}, Indonesia.
          </p>

          <section className="mt-16">
            <h2 className="type-heading-md m-0 mb-6">
              Agar kami bisa cepat membantu
            </h2>
            <div className="rounded-[12px] border border-[#E5E7EB] bg-[#F9FAFB] p-8">
              <p className="type-copy m-0 mb-3">Sertakan:</p>
              <ul className="type-copy list-disc pl-5 m-0 flex flex-col gap-2">
                <li>email yang Anda pakai saat memesan;</li>
                <li>nomor pesanan, jika ada (contoh: NV-ABC123);</li>
                <li>nama bisnis yang diaudit; dan</li>
                <li>masalahnya, dan apa yang Anda harapkan dari kami.</li>
              </ul>
              <p className="type-copy m-0 mt-4">
                Jangan kirim kata sandi, PIN, kode OTP, nomor kartu, data
                pasien, atau data pelanggan.
              </p>
            </div>
          </section>

          <section className="mt-16">
            <h2 className="type-heading-md m-0 mb-6">Yang bisa kami bantu</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {TOPICS.map(([title, body]) => (
                <div
                  key={title}
                  className="rounded-[12px] border border-[#E5E7EB] bg-[#F9FAFB] p-6"
                >
                  <h3 className="type-heading-sm text-[#111827] m-0 mb-2">
                    {title}
                  </h3>
                  <p className="type-copy-sm text-[#6B7280] m-0">{body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-16">
            <h2 className="type-heading-md m-0 mb-6">Hati-hati penipuan</h2>
            <p className="type-copy text-[#6B7280] m-0">
              Nuave hanya membalas dari alamat @nuave.ai dan tidak pernah
              meminta kata sandi, PIN, atau kode OTP. Pembayaran hanya lewat
              halaman Midtrans dari situs ini. Jika ada pesan mencurigakan atas
              nama Nuave, jangan dibalas. Kirim tangkapan layarnya ke{" "}
              {SUPPORT_EMAIL}.
            </p>
          </section>

          <section className="mt-16">
            <h2 className="type-heading-md m-0 mb-6">Dokumen terkait</h2>
            <p className="type-copy text-[#6B7280]">
              Baca{" "}
              <Link className="text-[var(--lp-purple)] underline" href="/terms">
                Syarat dan ketentuan
              </Link>
              ,{" "}
              <Link
                className="text-[var(--lp-purple)] underline"
                href="/privacy"
              >
                Kebijakan privasi dan data
              </Link>
              , dan{" "}
              <Link className="text-[var(--lp-purple)] underline" href="/faq">
                FAQ
              </Link>
              .
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
