import type { Metadata } from "next";
import Link from "next/link";
import LandingNav from "@/components/LandingNav";
import Footer from "@/components/Footer";

const EMAIL = "hello@nuave.ai";

export const metadata: Metadata = {
  title: "Kontak dan Bantuan | Nuave",
  description: "Bantuan founder untuk Nuave selama tahap pengujian privat.",
};

export default function SupportPage() {
  return (
    <div className="lp-page min-h-screen">
      <LandingNav />
      <main className="bg-white pt-[140px] px-8 pb-[120px]">
        <div className="max-w-[740px] mx-auto">
          <h1 className="m-0 mb-6">Kontak dan bantuan</h1>
          <p className="text-[18px] font-normal leading-[1.7em] tracking-[-0.5px] text-[var(--lp-text-secondary)] m-0">
            Nuave sedang dalam pengujian privat. Bantuan saat ini ditangani
            langsung melalui email{" "}
            <a
              className="text-[var(--lp-purple)] underline"
              href={`mailto:${EMAIL}`}
            >
              {EMAIL}
            </a>
            .
          </p>
          <p className="text-[15px] leading-[1.7em] text-[#6B7280] m-0 mt-4">
            Belum ada SLA jam layanan atau waktu respons tertentu yang
            dijanjikan.
          </p>

          <section className="mt-16">
            <h2 className="text-[28px] font-medium tracking-[-0.5px] leading-[1.3em] m-0 mb-6">
              Agar masalah lebih mudah diperiksa
            </h2>
            <div className="rounded-[12px] border border-[#E5E7EB] bg-[#F9FAFB] p-8">
              <ul className="list-disc pl-5 m-0 flex flex-col gap-2">
                <li>
                  jelaskan langkah yang Anda lakukan sebelum masalah muncul;
                </li>
                <li>sertakan URL sumber bisnis yang digunakan;</li>
                <li>sebutkan tahap audit yang bermasalah;</li>
                <li>
                  sertakan teks pesan aman yang terlihat di layar atau
                  screenshot;
                </li>
                <li>
                  jika ada, lampirkan bukti JSON yang Anda unduh sendiri; dan
                </li>
                <li>
                  jangan mengirim API key, kata sandi, OTP, atau data sensitif.
                </li>
              </ul>
            </div>
          </section>

          <section className="mt-16">
            <h2 className="text-[28px] font-medium tracking-[-0.5px] leading-[1.3em] m-0 mb-6">
              Batas bantuan pada versi ini
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-[12px] border border-[#E5E7EB] bg-[#F9FAFB] p-6">
                <h3 className="text-[16px] font-semibold text-[#111827] m-0 mb-2">
                  Audit dan laporan
                </h3>
                <p className="text-[14px] leading-[1.7em] text-[#6B7280] m-0">
                  Kami dapat membantu memeriksa kegagalan intake, fakta,
                  pertanyaan, observasi, atau pembuatan laporan pada sesi
                  pengujian.
                </p>
              </div>
              <div className="rounded-[12px] border border-[#E5E7EB] bg-[#F9FAFB] p-6">
                <h3 className="text-[16px] font-semibold text-[#111827] m-0 mb-2">
                  Fitur komersial
                </h3>
                <p className="text-[14px] leading-[1.7em] text-[#6B7280] m-0">
                  Pembayaran, refund, akun, email delivery, dan akses laporan
                  server belum aktif, jadi halaman ini tidak menjanjikan
                  dukungan operasional untuk fitur tersebut.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-16">
            <h2 className="text-[28px] font-medium tracking-[-0.5px] leading-[1.3em] m-0 mb-6">
              Dokumen terkait
            </h2>
            <p className="text-[15px] leading-[1.7em] text-[#6B7280]">
              Lihat{" "}
              <Link className="text-[var(--lp-purple)] underline" href="/faq">
                FAQ
              </Link>
              ,{" "}
              <Link className="text-[var(--lp-purple)] underline" href="/terms">
                Syarat penggunaan saat ini
              </Link>
              , dan{" "}
              <Link
                className="text-[var(--lp-purple)] underline"
                href="/privacy"
              >
                Privasi dan data saat ini
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
