import type { Metadata } from "next";
import Link from "next/link";
import LandingNav from "@/components/LandingNav";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Kebijakan Privasi dan Data | Nuave",
  description:
    "Penjelasan tentang data yang dikumpulkan Nuave, alasan penggunaannya, pihak yang membantu memprosesnya, masa penyimpanan, dan pilihan Anda.",
};

const EMAIL = "hello@nuave.ai";

/* Placeholder merah: fakta yang belum tersedia dan harus diisi founder sebelum
   halaman ini dipublikasikan. Hapus tanda kurung saat nilainya sudah diisi. */
function Placeholder({ children }: { children: React.ReactNode }) {
  return <span style={{ color: "#dc2626", fontWeight: 500 }}>{children}</span>;
}

const RED_STYLE =
  ".nuave-privacy { font-family: var(--font-inter), sans-serif; color: #374151; }" +
  ".nuave-privacy h1 { font-family: var(--font-geist-sans), sans-serif; font-size: 40px; font-weight: 600; letter-spacing: -0.5px; line-height: 1.15; color: #111827; margin: 0 0 8px; }" +
  ".nuave-privacy h2 { font-family: var(--font-geist-sans), sans-serif; font-size: 22px; font-weight: 600; letter-spacing: -0.3px; line-height: 1.35; color: #111827; margin: 0 0 12px; }" +
  ".nuave-privacy h3 { font-family: var(--font-geist-sans), sans-serif; font-size: 17px; font-weight: 600; letter-spacing: -0.2px; line-height: 1.4; color: #111827; margin: 24px 0 8px; }" +
  ".nuave-privacy a { color: var(--lp-purple, #533AFD); text-decoration: underline; text-underline-offset: 3px; }" +
  ".nuave-privacy p { margin: 0 0 16px; }" +
  ".nuave-privacy ul { margin: 0 0 16px; padding-left: 20px; list-style: disc; }" +
  ".nuave-privacy li { margin: 0 0 8px; line-height: 1.7; }";

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

function ProvidersTable() {
  return (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-left border-collapse text-[14px] leading-[1.6]">
        <thead>
          <tr className="border-b border-[#E5E7EB]">
            <th className="py-3 pr-4 font-semibold text-[#111827]">Fungsi</th>
            <th className="py-3 pr-4 font-semibold text-[#111827]">Penyedia</th>
            <th className="py-3 font-semibold text-[#111827]">
              Data yang terkait
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-[#E5E7EB] align-top">
            <td className="py-3 pr-4 text-[#111827]">
              Hosting dan keamanan situs
            </td>
            <td className="py-3 pr-4">
              <Placeholder>[PENYEDIA HOSTING]</Placeholder>
            </td>
            <td className="py-3 text-[#6B7280]">
              permintaan web, log teknis, dan data layanan yang disimpan
            </td>
          </tr>
          <tr className="border-b border-[#E5E7EB] align-top">
            <td className="py-3 pr-4 text-[#111827]">AI dan pencarian</td>
            <td className="py-3 pr-4">
              <Placeholder>[PENYEDIA AI/SEARCH]</Placeholder>
            </td>
            <td className="py-3 text-[#6B7280]">
              pertanyaan serta informasi bisnis yang diperlukan untuk audit
            </td>
          </tr>
          <tr className="border-b border-[#E5E7EB] align-top">
            <td className="py-3 pr-4 text-[#111827]">Pembayaran</td>
            <td className="py-3 pr-4">
              <Placeholder>[PENYEDIA PEMBAYARAN]</Placeholder>
            </td>
            <td className="py-3 text-[#6B7280]">
              detail transaksi dan data yang Anda berikan langsung kepada
              penyedia
            </td>
          </tr>
          <tr className="border-b border-[#E5E7EB] align-top">
            <td className="py-3 pr-4 text-[#111827]">
              Email/pengiriman laporan
            </td>
            <td className="py-3 pr-4">
              <Placeholder>[PENYEDIA EMAIL]</Placeholder>
            </td>
            <td className="py-3 text-[#6B7280]">
              nama, email, nomor pesanan, dan tautan laporan
            </td>
          </tr>
          <tr className="border-b border-[#E5E7EB] align-top">
            <td className="py-3 pr-4 text-[#111827]">Penyimpanan data</td>
            <td className="py-3 pr-4">
              <Placeholder>[PENYEDIA PENYIMPANAN]</Placeholder>
            </td>
            <td className="py-3 text-[#6B7280]">
              data pesanan, audit, dan laporan sesuai kebutuhan
            </td>
          </tr>
          <tr className="align-top">
            <td className="py-3 pr-4 text-[#111827]">
              Dukungan/analitik, jika digunakan
            </td>
            <td className="py-3 pr-4 text-[#111827]">Tidak digunakan</td>
            <td className="py-3 text-[#6B7280]">
              komunikasi dukungan atau data penggunaan yang dijelaskan di sini
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function RetentionTable() {
  return (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-left border-collapse text-[14px] leading-[1.6]">
        <thead>
          <tr className="border-b border-[#E5E7EB]">
            <th className="py-3 pr-4 font-semibold text-[#111827]">
              Jenis data
            </th>
            <th className="py-3 font-semibold text-[#111827]">Masa simpan</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-[#E5E7EB] align-top">
            <td className="py-3 pr-4 text-[#111827]">
              Draf pesanan yang tidak dilanjutkan
            </td>
            <td className="py-3 text-[#6B7280]">30 hari</td>
          </tr>
          <tr className="border-b border-[#E5E7EB] align-top">
            <td className="py-3 pr-4 text-[#111827]">
              Informasi pesanan, pertanyaan, bukti audit, dan laporan
            </td>
            <td className="py-3 text-[#6B7280]">
              90 hari setelah laporan dikirim
            </td>
          </tr>
          <tr className="border-b border-[#E5E7EB] align-top">
            <td className="py-3 pr-4 text-[#111827]">Tautan privat laporan</td>
            <td className="py-3 text-[#6B7280]">
              90 hari setelah laporan dikirim
            </td>
          </tr>
          <tr className="border-b border-[#E5E7EB] align-top">
            <td className="py-3 pr-4 text-[#111827]">
              Komunikasi bantuan atau keluhan
            </td>
            <td className="py-3 text-[#6B7280]">
              12 bulan setelah masalah selesai
            </td>
          </tr>
          <tr className="border-b border-[#E5E7EB] align-top">
            <td className="py-3 pr-4 text-[#111827]">Log keamanan dan akses</td>
            <td className="py-3 text-[#6B7280]">30 hari</td>
          </tr>
          <tr className="align-top">
            <td className="py-3 pr-4 text-[#111827]">
              Catatan transaksi dan pembukuan
            </td>
            <td className="py-3 text-[#6B7280]">
              selama diperlukan untuk pembayaran, pajak, pencegahan fraud, atau
              kewajiban hukum
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <div className="nuave-privacy min-h-screen bg-white">
      <style>{RED_STYLE}</style>
      <LandingNav />

      <main className="max-w-[760px] mx-auto px-8 pt-[150px] pb-[120px] text-[15px] leading-[1.7]">
        <h1>Kebijakan Privasi dan Data</h1>

        <div className="rounded-[12px] border border-[#E5E7EB] bg-[#F9FAFB] px-6 py-4 mb-10 text-[14px] leading-[1.7]">
          <p className="mb-0">
            <strong className="font-semibold text-[#111827]">
              Berlaku sejak:
            </strong>{" "}
            <Placeholder>[TANGGAL]</Placeholder>
            <br />
            <strong className="font-semibold text-[#111827]">
              Versi:
            </strong>{" "}
            <Placeholder>[VERSI]</Placeholder>
          </p>
        </div>

        <p>
          Kami ingin Anda memahami data apa yang dibutuhkan Nuave dan apa yang
          terjadi setelah Anda memberikannya. Prinsip kami sederhana: kumpulkan
          seperlunya, gunakan untuk tujuan yang dijelaskan, batasi akses, dan
          jangan publikasikan laporan tanpa izin.
        </p>
        <p>
          Kebijakan ini bukan klaim bahwa risiko keamanan dapat dihilangkan
          seluruhnya. Kebijakan ini menjelaskan cara kami berusaha menangani
          data secara bertanggung jawab dan cara Anda dapat menghubungi kami.
        </p>

        <Section title="1. Siapa yang bertanggung jawab?">
          <p>
            Nuave adalah layanan independen yang dioperasikan oleh{" "}
            <Placeholder>[NAMA LENGKAP PENGELOLA]</Placeholder> di{" "}
            <Placeholder>[KOTA]</Placeholder>, Indonesia.
          </p>
          <p>
            Pertanyaan atau permintaan terkait data dapat dikirim ke{" "}
            <a href={`mailto:${EMAIL}`}>{EMAIL}</a> atau melalui{" "}
            <Link href="/support">Kontak dan Bantuan</Link>.
          </p>
          <p>
            Kebijakan ini melengkapi{" "}
            <Link href="/terms">Syarat dan Ketentuan</Link>.
          </p>
        </Section>

        <Section title="2. Kapan kebijakan ini berlaku?">
          <p>Kebijakan ini berlaku ketika Anda:</p>
          <ul>
            <li>mengunjungi situs Nuave;</li>
            <li>menghubungi kami;</li>
            <li>mengisi informasi bisnis;</li>
            <li>memeriksa atau menyetujui pertanyaan audit;</li>
            <li>melakukan pembayaran;</li>
            <li>menerima atau membuka laporan; atau</li>
            <li>meminta bantuan, koreksi, re-check, atau pengembalian dana.</li>
          </ul>
        </Section>

        <Section title="3. Data yang kami kumpulkan">
          <h3>Data kontak dan pesanan</h3>
          <p>
            Kami dapat mengumpulkan nama, email, nama bisnis, nomor pesanan,
            status pembayaran, serta isi komunikasi dengan dukungan.
          </p>

          <h3>Informasi bisnis</h3>
          <p>
            Kami memproses nama bisnis, cabang atau wilayah, website atau profil
            resmi, layanan utama, target pelanggan, pembeda bisnis, dan fakta
            lain yang Anda berikan untuk menyusun audit.
          </p>
          <p>
            Sebagian besar informasi bisnis berasal dari Anda atau sumber
            publik. Informasi bisnis dapat menjadi data pribadi jika dapat
            dikaitkan dengan pemilik atau orang tertentu.
          </p>

          <h3>Data audit dan laporan</h3>
          <p>
            Kami memproses 10 pertanyaan yang Anda setujui, jawaban AI, sumber
            yang tersedia, hasil analisis, rekomendasi, dan laporan akhir.
          </p>

          <h3>Data pembayaran</h3>
          <p>
            Pembayaran diproses oleh{" "}
            <Placeholder>[PENYEDIA PEMBAYARAN]</Placeholder>. Kami menerima
            informasi seperti status, jumlah, waktu, dan referensi transaksi.
            Kami tidak menerima atau menyimpan nomor kartu, PIN, kata sandi
            perbankan, atau kode OTP Anda.
          </p>

          <h3>Data teknis dan keamanan</h3>
          <p>
            Sistem kami dapat mencatat alamat IP, jenis perangkat/peramban,
            waktu akses, halaman atau tindakan yang diminta, kesalahan sistem,
            dan informasi keamanan yang diperlukan untuk menjalankan dan
            melindungi layanan.
          </p>
        </Section>

        <Section title="4. Data yang tidak kami perlukan">
          <p>
            Jangan mengirim data pelanggan Anda, daftar kontak, kata sandi,
            kredensial akun, data kesehatan, data biometrik, data keuangan
            pribadi, dokumen hukum privat, atau data sensitif lain. Nuave
            dirancang menggunakan informasi bisnis yang Anda konfirmasi dan
            informasi yang sudah tersedia secara publik.
          </p>
          <p>
            Jika kami menerima data sensitif yang tidak diperlukan, kami akan
            membatasi akses, menghentikan pemrosesan yang terkait, dan
            menghapusnya sejauh dapat dilakukan serta tidak ada kewajiban lain
            untuk menyimpannya.
          </p>
        </Section>

        <Section title="5. Mengapa kami menggunakan data?">
          <p>Kami menggunakan data untuk:</p>
          <ul>
            <li>memastikan bisnis dan cabang yang benar;</li>
            <li>menyusun dan menampilkan pertanyaan untuk Anda periksa;</li>
            <li>menerima dan mengonfirmasi pesanan serta pembayaran;</li>
            <li>menjalankan audit dan membuat laporan;</li>
            <li>mengirim, memulihkan, atau memperbaiki laporan;</li>
            <li>menjawab pertanyaan, keluhan, dan permintaan terkait data;</li>
            <li>mencegah penyalahgunaan dan menjaga keamanan layanan;</li>
            <li>
              memenuhi kewajiban pencatatan atau permintaan hukum yang sah; dan
            </li>
            <li>
              menawarkan re-check jika Anda memintanya atau telah memilih
              menerima komunikasi tersebut.
            </li>
          </ul>
          <p>
            Kami tidak menjual data pribadi Anda. Kami tidak menggunakan laporan
            Anda sebagai contoh, studi kasus, atau materi promosi tanpa meminta
            izin terpisah.
          </p>
        </Section>

        <Section title="6. Dasar penggunaan data">
          <p>
            Tergantung pada kegiatannya, kami menggunakan data karena dibutuhkan
            untuk mempersiapkan atau melaksanakan pesanan Anda, memenuhi
            kewajiban yang berlaku, menjaga keamanan layanan, menangani
            permintaan Anda, atau karena Anda memberikan persetujuan khusus.
          </p>
          <p>
            Kami tidak menganggap satu persetujuan sebagai izin untuk semua
            tujuan. Jika kami menawarkan email promosi atau penggunaan laporan
            sebagai studi kasus, pilihannya akan dipisahkan dari pembelian dan
            dapat ditarik kembali.
          </p>
        </Section>

        <Section title="7. Penggunaan layanan AI">
          <p>
            Pertanyaan audit dan informasi bisnis yang diperlukan dapat dikirim
            kepada <Placeholder>[PENYEDIA AI/SEARCH]</Placeholder> untuk
            menghasilkan pengamatan yang menjadi bagian laporan. Kami berusaha
            tidak memasukkan nama pemesan, email, informasi pembayaran, data
            pelanggan, atau data sensitif ke dalam permintaan tersebut.
          </p>
          <p>
            Laporan akan menyebutkan layanan atau sistem yang digunakan untuk
            pengujian. Penyedia AI dapat memproses data di luar Indonesia sesuai
            dengan pengaturan dan kebijakannya.
          </p>
        </Section>

        <Section title="8. Pihak yang membantu kami">
          <p>
            Kami menggunakan penyedia layanan hanya untuk fungsi yang
            diperlukan, antara lain:
          </p>
          <ProvidersTable />
          <p>
            Kami juga dapat memberikan data jika diwajibkan oleh permintaan
            pemerintah atau penegak hukum yang sah, atau jika diperlukan untuk
            melindungi hak dan keamanan pengguna maupun layanan.
          </p>
        </Section>

        <Section title="9. Pemrosesan di luar Indonesia">
          <p>
            Sebagian penyedia dapat menyimpan atau memproses data di negara
            lain. Sebelum meluncurkan layanan berbayar, kami akan mencatat
            lokasi penyedia yang digunakan dan memilih pengaturan yang tersedia
            untuk membatasi penggunaan serta melindungi data.
          </p>
          <p>
            Kami tidak akan menyatakan bahwa semua data berada di Indonesia jika
            hal itu tidak benar. Anda dapat meminta informasi lebih lanjut
            melalui <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.
          </p>
        </Section>

        <Section title="10. Berapa lama data disimpan?">
          <p>
            Kami tidak ingin menyimpan data tanpa batas. Jadwal yang kami
            gunakan adalah:
          </p>
          <RetentionTable />
          <p>
            Setelah masa tersebut, data dihapus atau dibuat tidak lagi
            mengidentifikasi Anda, kecuali masih diperlukan untuk menyelesaikan
            permintaan, sengketa, keamanan, atau kewajiban pencatatan yang
            berlaku. Penghapusan dari cadangan dapat mengikuti siklus
            penghapusan cadangan yang terbatas.
          </p>
        </Section>

        <Section title="11. Cookie dan penyimpanan di perangkat">
          <p>
            Kami menggunakan cookie atau penyimpanan browser yang diperlukan
            untuk keamanan, menjaga alur audit, dan mengingat status sesi.
            Cookie tersebut bukan digunakan untuk menjual profil Anda kepada
            pengiklan.
          </p>
          <p>Kami tidak menggunakan cookie iklan atau pelacak lintas situs.</p>
          <p>
            Jika nanti kami menambahkan analitik atau pemasaran yang tidak
            diperlukan, kami akan memperbarui kebijakan ini dan menyediakan
            pilihan yang sesuai sebelum alat tersebut digunakan.
          </p>
        </Section>

        <Section title="12. Cara kami melindungi data">
          <p>
            Kami menggunakan langkah yang sesuai dengan ukuran layanan, seperti
            koneksi HTTPS, pembatasan akses, penyimpanan kredensial di sisi
            server, tautan laporan yang sulit ditebak, pencatatan akses yang
            diperlukan, dan pembaruan perangkat lunak.
          </p>
          <p>
            Tidak ada sistem yang sepenuhnya bebas risiko. Jika terjadi insiden
            yang berdampak pada data Anda, kami akan memeriksanya, membatasi
            dampaknya, dan memberikan pemberitahuan yang diwajibkan dengan
            informasi yang dapat membantu Anda.
          </p>
        </Section>

        <Section title="13. Pilihan dan hak Anda">
          <p>Anda dapat meminta kami untuk:</p>
          <ul>
            <li>menjelaskan data pribadi tentang Anda yang kami proses;</li>
            <li>memberikan akses atau salinan yang tersedia;</li>
            <li>memperbaiki data yang keliru;</li>
            <li>
              menghapus data yang tidak lagi diperlukan, sepanjang tidak ada
              alasan yang mewajibkan penyimpanannya;
            </li>
            <li>
              menghentikan penggunaan berdasarkan persetujuan setelah
              persetujuan ditarik;
            </li>
            <li>
              membatasi atau menyampaikan keberatan atas penggunaan tertentu;
              dan
            </li>
            <li>menjelaskan pihak yang menerima data terkait layanan Anda.</li>
          </ul>
          <p>
            Kirim permintaan ke <a href={`mailto:${EMAIL}`}>{EMAIL}</a>. Untuk
            mencegah orang lain mengambil atau menghapus data Anda, kami mungkin
            meminta informasi yang wajar untuk memastikan identitas dan hubungan
            Anda dengan pesanan. Kami akan mengonfirmasi penerimaan dan
            menanggapi secepat yang dapat kami lakukan sesuai kewajiban yang
            berlaku.
          </p>
        </Section>

        <Section title="14. Privasi laporan">
          <p>
            Laporan tersedia melalui tautan privat untuk penerima yang
            ditentukan. Siapa pun yang memperoleh tautan mungkin dapat membuka
            laporan, jadi jangan membagikannya kepada orang yang tidak
            berwenang.
          </p>
          <p>
            Jika tautan diduga bocor, hubungi{" "}
            <a href={`mailto:${EMAIL}`}>{EMAIL}</a> agar kami dapat
            menonaktifkan dan menggantinya jika fitur tersebut tersedia.
          </p>
        </Section>

        <Section title="15. Anak">
          <p>
            Nuave ditujukan untuk pemesan berusia 18 tahun ke atas. Kami tidak
            sengaja meminta data anak untuk menjalankan audit. Jangan mengirim
            data anak melalui formulir, pertanyaan audit, atau dukungan.
          </p>
        </Section>

        <Section title="16. Perubahan kebijakan">
          <p>
            Kami dapat memperbarui kebijakan ini ketika layanan atau penyedia
            berubah. Tanggal dan versi terbaru akan ditampilkan di bagian atas.
            Jika perubahan secara material mengubah cara kami menggunakan data
            pesanan yang masih aktif, kami akan memberi tahu melalui kanal yang
            tersedia.
          </p>
        </Section>

        <Section title="17. Hubungi kami">
          <p>
            Untuk pertanyaan, koreksi, penghapusan, keluhan, atau insiden
            privasi:
          </p>
          <p className="mb-2">
            <strong className="font-semibold text-[#111827]">Pengelola:</strong>{" "}
            <Placeholder>[NAMA LENGKAP PENGELOLA]</Placeholder>
            <br />
            <strong className="font-semibold text-[#111827]">
              Email privasi:
            </strong>{" "}
            <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
            <br />
            <strong className="font-semibold text-[#111827]">
              Bantuan umum:
            </strong>{" "}
            <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
            <br />
            <strong className="font-semibold text-[#111827]">
              Halaman bantuan:
            </strong>{" "}
            <Link href="/support">Kontak dan Bantuan</Link>
          </p>
        </Section>
      </main>

      <Footer />
    </div>
  );
}
