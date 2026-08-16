import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import LandingNav from "@/components/LandingNav";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Pertanyaan yang Sering Diajukan | Nuave",
  description:
    "Jawaban singkat tentang audit visibilitas AI Nuave, proses pengujian, isi laporan, biaya, privasi, dan batasannya.",
};

const EMAIL = "hello@nuave.ai";

/* Placeholder merah: fakta yang belum tersedia dan harus diisi founder sebelum
   halaman ini dipublikasikan. Hapus tanda kurung saat nilainya sudah diisi. */
function Placeholder({ children }: { children: ReactNode }) {
  return <span style={{ color: "#dc2626", fontWeight: 500 }}>{children}</span>;
}

const FAQ_STYLE =
  ".nuave-faq { font-family: var(--font-inter), sans-serif; color: #374151; }" +
  ".nuave-faq h1 { font-family: var(--font-geist-sans), sans-serif; font-size: 40px; font-weight: 600; letter-spacing: -0.5px; line-height: 1.15; color: #111827; margin: 0 0 8px; }" +
  ".nuave-faq h2 { font-family: var(--font-geist-sans), sans-serif; font-size: 22px; font-weight: 600; letter-spacing: -0.3px; line-height: 1.35; color: #111827; margin: 0 0 12px; }" +
  ".nuave-faq a { color: var(--lp-purple, #533AFD); text-decoration: underline; text-underline-offset: 3px; }" +
  ".nuave-faq p { margin: 0 0 16px; }" +
  ".nuave-faq ul { margin: 0 0 16px; padding-left: 20px; list-style: disc; }" +
  ".nuave-faq li { margin: 0 0 8px; line-height: 1.7; }";

function FaqSection({
  question,
  children,
}: {
  question: string;
  children: ReactNode;
}) {
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
          Hal penting tentang cara kerja Nuave, apa yang Anda terima, dan apa
          yang tidak bisa dijanjikan oleh audit ini.
        </p>

        <FaqSection question="Apa itu Nuave?">
          <p>
            Nuave adalah layanan audit visibilitas AI untuk bisnis. Kami menguji
            pertanyaan yang mungkin diajukan calon pelanggan kepada AI, lalu
            menunjukkan apakah bisnis Anda disebutkan, informasi apa yang
            muncul, dan bagian mana yang bisa diperbaiki.
          </p>
          <p>
            Nuave memberikan satu laporan untuk satu bisnis. Nuave bukan layanan
            monitoring, dashboard, atau langganan.
          </p>
        </FaqSection>

        <FaqSection question="Apa yang diuji oleh Nuave?">
          <p>
            Kami menguji 10 pertanyaan berbahasa Indonesia pada GPT-4o
            (ChatGPT): lima pertanyaan tanpa nama bisnis Anda dan lima
            pertanyaan yang menyebut nama bisnis Anda.
          </p>
          <p>
            Anda dapat memeriksa dan mengubah pertanyaan tersebut sebelum audit
            dimulai. Setelah Anda menyetujuinya, pertanyaan dikunci agar laporan
            sesuai dengan ruang lingkup yang Anda pesan.
          </p>
        </FaqSection>

        <FaqSection question="Apa yang saya terima?">
          <p>
            Anda menerima laporan privat yang dapat dibaca di web dan diunduh.
            Isinya mencakup:
          </p>
          <ul>
            <li>
              berapa kali bisnis Anda disebutkan, lengkap dengan jumlah
              pertanyaan yang diuji;
            </li>
            <li>jawaban AI yang diamati dan sumber yang tersedia;</li>
            <li>bisnis lain yang disebutkan dalam pertanyaan yang sama;</li>
            <li>
              informasi publik tentang bisnis Anda yang keliru, tidak konsisten,
              atau tidak ditemukan;
            </li>
            <li>
              sampai tiga rekomendasi yang terkait langsung dengan temuan; dan
            </li>
            <li>metode, batasan, serta waktu pengujian.</li>
          </ul>
        </FaqSection>

        <FaqSection question="Apakah hasil Nuave merupakan peringkat?">
          <p>
            Tidak. Laporan menunjukkan hasil dari 10 pertanyaan pada satu
            layanan AI dan pada waktu tertentu. Hasil tersebut bukan peringkat
            permanen dan tidak mewakili semua pertanyaan atau semua jawaban AI
            yang mungkin diterima orang lain.
          </p>
          <p>
            Jawaban AI dapat berubah meskipun pertanyaannya sama. Karena itu,
            laporan selalu menyebutkan metode dan waktu pengujian.
          </p>
        </FaqSection>

        <FaqSection question="Apakah Nuave menjamin bisnis saya akan lebih sering muncul?">
          <p>
            Tidak. Nuave menunjukkan apa yang diamati dan apa yang layak
            diperbaiki, tetapi tidak dapat mengendalikan jawaban AI.
          </p>
          <p>
            Kami tidak menjamin kenaikan visibilitas, traffic, calon pelanggan,
            penjualan, atau pendapatan setelah rekomendasi dijalankan.
          </p>
        </FaqSection>

        <FaqSection question="Berapa harga audit Nuave?">
          <p>
            Satu audit berharga <Placeholder>[HARGA]</Placeholder> dan dibayar
            satu kali melalui <Placeholder>[METODE PEMBAYARAN]</Placeholder>.
            Tidak ada langganan atau perpanjangan otomatis.
          </p>
          <p>
            Sebelum membayar, Anda akan melihat bisnis yang diuji, 10 pertanyaan
            yang telah disetujui, isi laporan, total harga, waktu pengiriman,
            dan ketentuan yang berlaku.
          </p>
        </FaqSection>

        <FaqSection question="Kapan laporan saya selesai?">
          <p>
            Laporan dikirim paling lambat{" "}
            <Placeholder>[WAKTU PENGIRIMAN]</Placeholder> setelah pembayaran
            berhasil dan 10 pertanyaan disetujui. Jika kami memperkirakan
            keterlambatan, kami akan menghubungi Anda melalui email yang
            digunakan saat memesan.
          </p>
        </FaqSection>

        <FaqSection question="Bagaimana jika audit gagal atau laporan tidak lengkap?">
          <p>
            Jika kegagalan teknis di pihak Nuave membuat kami tidak dapat
            menghasilkan laporan yang dapat digunakan, kami akan mencoba
            menjalankan audit kembali. Jika percobaan tersebut tetap gagal, Anda
            dapat memilih pengembalian dana penuh.
          </p>
          <p>
            Jika laporan tidak sesuai dengan ruang lingkup pesanan atau memuat
            kesalahan yang dibuat Nuave, hubungi{" "}
            <a href={`mailto:${EMAIL}`}>{EMAIL}</a>. Kami akan memeriksa dan
            memperbaikinya tanpa biaya. Rincian lengkap terdapat dalam{" "}
            <Link href="/terms">Syarat dan Ketentuan</Link>.
          </p>
        </FaqSection>

        <FaqSection question="Apakah saya bisa membatalkan pesanan?">
          <p>
            Anda dapat meminta pembatalan sebelum audit mulai dijalankan.
            Setelah audit dimulai, pembatalan karena perubahan pikiran tidak
            selalu dapat dilakukan karena biaya pemrosesan sudah digunakan.
          </p>
          <p>
            Kegagalan layanan, pembayaran ganda, dan laporan yang tidak sesuai
            dengan pesanan ditangani secara terpisah dalam{" "}
            <Link href="/terms">Syarat dan Ketentuan</Link>.
          </p>
        </FaqSection>

        <FaqSection question="Data apa yang dikumpulkan Nuave?">
          <p>
            Kami meminta informasi yang diperlukan untuk memastikan bisnis yang
            tepat, menyusun pertanyaan, menerima pembayaran, dan mengirimkan
            laporan. Informasi ini umumnya meliputi nama dan email pemesan,
            identitas bisnis, situs atau profil publik bisnis, pertanyaan yang
            disetujui, serta status pembayaran.
          </p>
          <p>
            Jangan mengirim data pelanggan, kata sandi, data kesehatan, data
            keuangan pribadi, atau informasi sensitif lainnya. Penjelasan
            lengkap tersedia di{" "}
            <Link href="/privacy">Kebijakan Privasi dan Data</Link>.
          </p>
        </FaqSection>

        <FaqSection question="Apakah laporan saya dipublikasikan?">
          <p>
            Tidak. Laporan dikirim melalui tautan privat dan tidak
            dipublikasikan sebagai contoh, studi kasus, atau materi promosi
            tanpa izin terpisah dari Anda.
          </p>
          <p>
            Tautan laporan tersedia selama{" "}
            <Placeholder>[MASA AKSES LAPORAN]</Placeholder>. Unduh dan simpan
            salinan laporan Anda sebelum masa akses berakhir.
          </p>
        </FaqSection>

        <FaqSection question="Apakah saya harus mempunyai website?">
          <p>
            Tidak selalu, tetapi Nuave membutuhkan sumber publik yang cukup
            untuk memastikan identitas bisnis dan menilai informasi yang
            tersedia. Website resmi, profil bisnis, atau profil sosial yang
            aktif dapat membantu.
          </p>
          <p>
            Jika bisnis atau cabang yang dimaksud tidak dapat dipastikan, kami
            akan meminta perbaikan sebelum audit dimulai atau menolak pesanan
            dan mengembalikan pembayaran.
          </p>
        </FaqSection>

        <FaqSection question="Apa itu re-check?">
          <p>
            Re-check adalah audit baru yang menggunakan pertanyaan yang sama
            untuk melihat apa yang berubah. Re-check dibeli terpisah dan bukan
            langganan atau monitoring.
          </p>
          <p>
            Kami biasanya menyarankan re-check setelah enam sampai delapan
            minggu agar bisnis memiliki waktu untuk memperbaiki informasi
            publiknya. Jangka waktu tersebut adalah saran praktis, bukan jaminan
            bahwa hasil akan berubah.
          </p>
        </FaqSection>

        <FaqSection question="Siapa yang menjalankan Nuave?">
          <p>
            Nuave adalah layanan independen yang dioperasikan oleh{" "}
            <Placeholder>[NAMA PENGELOLA]</Placeholder> di{" "}
            <Placeholder>[KOTA]</Placeholder>, Indonesia. Sebelum membayar, Anda
            dapat melihat ruang lingkup audit, harga, pertanyaan yang diuji,
            ketentuan layanan, dan kanal bantuan yang dapat dihubungi.
          </p>
          <p>
            Masih punya pertanyaan? Hubungi{" "}
            <Link href="/support">Kontak dan Bantuan</Link> atau email{" "}
            <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.
          </p>
        </FaqSection>
      </main>

      <Footer />
    </div>
  );
}
