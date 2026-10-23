import type { Metadata } from "next";
import type { ReactNode } from "react";
import LandingNav from "@/components/LandingNav";
import Footer from "@/components/Footer";
import { DELIVERY_PROMISE } from "@/lib/orders/promise";

export const metadata: Metadata = {
  title: "Pertanyaan yang Sering Diajukan | Nuave",
  description:
    "Jawaban singkat untuk klinik: cara kerja Nuave, biaya, waktu laporan, data, dan batasannya.",
};

const EMAIL = "support@nuave.ai";

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
        <h1 className="type-heading-xl m-0 mb-10 text-[#111827]">
          Pertanyaan yang sering diajukan
        </h1>

        <FaqSection question="Apa itu Nuave?">
          <p>
            Nuave mengecek apa jawaban AI saat calon pasien mencari klinik
            seperti klinik Anda. Anda menerima satu laporan: apakah klinik Anda
            disebut atau direkomendasikan, klinik mana yang disebut, dan apa
            yang perlu dibenahi dulu.
          </p>
        </FaqSection>

        <FaqSection question="AI apa yang diuji?">
          <p>
            AI buatan OpenAI, pembuat ChatGPT, dengan pencarian web. Jawaban di
            aplikasi ChatGPT di ponsel Anda bisa sedikit berbeda.
          </p>
        </FaqSection>

        <FaqSection question="Pertanyaan apa yang ditanyakan?">
          <p>
            10 pertanyaan seperti yang biasa ditanyakan calon pasien, tanpa
            menyebut nama klinik Anda. Anda bisa memeriksa dan mengubah setiap
            pertanyaan sebelum audit dimulai.
          </p>
        </FaqSection>

        <FaqSection question="Berapa biayanya?">
          <p>
            Rp99.000 untuk satu audit, sekali bayar, tanpa langganan. Tidak ada
            pajak atau biaya tambahan dari Nuave. Bayar dengan QRIS, transfer
            bank, GoPay, atau DANA.
          </p>
        </FaqSection>

        <FaqSection question="Berapa lama sampai laporan jadi?">
          <p>
            {DELIVERY_PROMISE} Link laporan dikirim ke email Anda dan berlaku 12
            bulan.
          </p>
        </FaqSection>

        <FaqSection question="Apakah Nuave butuh data pasien atau akses akun klinik?">
          <p>
            Tidak. Nuave hanya membaca informasi publik klinik Anda, seperti
            website dan Instagram. Jangan masukkan data pasien, kata sandi, atau
            data pribadi.
          </p>
        </FaqSection>

        <FaqSection question="Apa bedanya dengan SEO atau iklan yang sudah berjalan?">
          <p>
            SEO dan iklan membawa orang ke website dan media sosial Anda. Nuave
            melihat sisi lain: apa yang dijawab AI saat calon pasien bertanya.
            Laporannya bisa Anda bagikan ke tim pemasaran atau agensi.
          </p>
        </FaqSection>

        <FaqSection question="Apakah klinik saya pasti disebut AI setelah perbaikan?">
          <p>
            Tidak ada yang bisa menjamin itu. Jawaban AI bisa berubah. Laporan
            menunjukkan apa yang terlihat saat diuji, dan perbaikan mana yang
            layak dikerjakan dulu.
          </p>
        </FaqSection>

        <FaqSection question="Klinik saya punya beberapa cabang. Bisa?">
          <p>
            Bisa. Pilih fokus audit: seluruh klinik, satu cabang, atau satu
            layanan.
          </p>
        </FaqSection>

        <FaqSection question="Kapan sebaiknya dicek lagi?">
          <p>
            Kami sarankan audit lagi sekitar 6 sampai 8 minggu setelah perbaikan
            dikerjakan.
          </p>
        </FaqSection>

        <FaqSection question="Bagaimana kalau ada masalah?">
          <p>
            Email <a href={`mailto:${EMAIL}`}>{EMAIL}</a> dan sebutkan nomor
            pesanan Anda.
          </p>
        </FaqSection>
      </main>
      <Footer />
    </div>
  );
}
