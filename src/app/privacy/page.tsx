import type { Metadata } from "next";
import Link from "next/link";
import LandingNav from "@/components/LandingNav";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Privasi dan Data Saat Ini | Nuave",
  description:
    "Cara Nuave menangani data selama tahap pengujian privat dan batas penyimpanan produk yang aktif saat ini.",
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

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingNav />
      <main className="type-copy mx-auto max-w-[760px] px-8 pt-[150px] pb-[120px] text-[#374151] [&_a]:text-[var(--lp-purple)] [&_a]:underline [&_a]:underline-offset-[3px] [&_li]:mb-2 [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5">
        <h1 className="type-heading-xl m-0 mb-2 text-[#111827]">
          Privasi dan data saat ini
        </h1>
        <div className="mb-10 rounded-[12px] border border-[#E5E7EB] bg-[#F9FAFB] px-6 py-4">
          <strong>Pengujian privat</strong>
          <p className="mb-0 mt-2">
            Nuave belum mempunyai akun pelanggan, checkout, email delivery, atau
            penyimpanan laporan tahan lama. Karena itu kami tidak mencantumkan
            masa retensi, penyedia pembayaran, atau alur pengiriman yang belum
            benar-benar digunakan.
          </p>
        </div>

        <Section title="1. Data yang digunakan untuk audit">
          <p>
            Produk menerima sumber bisnis publik yang Anda masukkan, fakta
            bisnis yang Anda tinjau atau koreksi, bisnis serupa yang Anda
            tambahkan, sepuluh pertanyaan audit, jawaban yang diamati, sumber
            jawaban, dan bukti teknis yang diperlukan untuk menjaga integritas
            audit.
          </p>
          <p>
            Jangan masukkan kata sandi, data pelanggan, data kesehatan, data
            keuangan pribadi, kredensial akun, atau data sensitif yang tidak
            diperlukan untuk audit bisnis publik.
          </p>
        </Section>

        <Section title="2. Mengapa data tersebut digunakan">
          <ul>
            <li>memastikan sumber dan identitas bisnis yang sedang diuji;</li>
            <li>menyusun draf fakta dan pertanyaan untuk Anda periksa;</li>
            <li>
              menjalankan sepuluh observasi dengan kontrak metode yang
              dilindungi;
            </li>
            <li>
              membuat laporan dan bukti yang terikat pada observasi tersebut;
              dan
            </li>
            <li>mendeteksi serta mendiagnosis kegagalan teknis.</li>
          </ul>
        </Section>

        <Section title="3. Pemrosesan AI dan sumber publik">
          <p>
            Untuk tahap audit yang dilindungi, fakta bisnis yang telah
            dikonfirmasi dan pertanyaan audit dapat dikirim ke layanan AI yang
            dikonfigurasi Nuave. Audit juga dapat menggunakan pencarian web pada
            sumber publik. Laporan mencatat metode dan model yang benar-benar
            digunakan pada observasi yang berhasil.
          </p>
          <p>
            Nuave tidak menyatakan bahwa hasil API identik dengan sesi aplikasi
            ChatGPT konsumen.
          </p>
        </Section>

        <Section title="4. Penyimpanan di versi ini">
          <p>
            State workflow saat ini disimpan pada browser/session agar proses
            dapat dipulihkan selama konteks sesi tersedia. Versi ini belum
            memiliki basis data pelanggan atau pekerjaan server tahan lama yang
            mengambil alih audit setelah tab ditutup.
          </p>
          <p>
            Kami tidak menjanjikan periode retensi server tertentu karena
            kontrak penyimpanan tersebut belum diimplementasikan. Bukti yang
            ingin Anda simpan sebaiknya diunduh dari sesi yang aktif.
          </p>
        </Section>

        <Section title="5. Pembayaran, akun, dan email">
          <p>
            Produk aktif belum menerima pembayaran, membuat akun pelanggan, atau
            mengirim laporan lewat email. Nuave karena itu tidak mengklaim
            memproses data kartu, status transaksi, data akun, atau alamat email
            untuk alur-alur tersebut pada versi ini.
          </p>
        </Section>

        <Section title="6. Permintaan atau pertanyaan data">
          <p>
            Selama pengujian privat, pertanyaan dapat dikirim ke{" "}
            <a href={`mailto:${EMAIL}`}>{EMAIL}</a> atau melalui{" "}
            <Link href="/support">Kontak dan Bantuan</Link>. Kami tidak
            mencantumkan operator legal, alamat, atau SLA yang belum disetujui.
          </p>
        </Section>

        <Section title="7. Perubahan setelah produk komersial tersedia">
          <p>
            Jika Nuave nanti menambahkan pembayaran, akun, email delivery,
            penyimpanan server, atau fitur komersial lain, halaman ini harus
            diperbarui berdasarkan implementasi dan keputusan legal yang benar
            sebelum fitur tersebut digambarkan sebagai aktif.
          </p>
        </Section>
      </main>
      <Footer />
    </div>
  );
}
