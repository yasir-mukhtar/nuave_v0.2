import type { Metadata } from "next";
import Link from "next/link";
import LandingNav from "@/components/LandingNav";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Syarat dan Ketentuan | Nuave",
  description:
    "Ketentuan pemesanan audit visibilitas AI Nuave, termasuk ruang lingkup, pembayaran, pengiriman, koreksi, pembatalan, dan pengembalian dana.",
};

const EMAIL = "hello@nuave.ai";

/* Placeholder merah: fakta yang belum tersedia dan harus diisi founder sebelum
   halaman ini dipublikasikan. Hapus tanda kurung saat nilainya sudah diisi. */
function Placeholder({ children }: { children: React.ReactNode }) {
  return <span style={{ color: "#dc2626", fontWeight: 500 }}>{children}</span>;
}

const RED_STYLE =
  ".nuave-terms { font-family: var(--font-inter), sans-serif; color: #374151; }" +
  ".nuave-terms h1 { font-family: var(--font-geist-sans), sans-serif; font-size: 40px; font-weight: 600; letter-spacing: -0.5px; line-height: 1.15; color: #111827; margin: 0 0 8px; }" +
  ".nuave-terms h2 { font-family: var(--font-geist-sans), sans-serif; font-size: 22px; font-weight: 600; letter-spacing: -0.3px; line-height: 1.35; color: #111827; margin: 0 0 12px; }" +
  ".nuave-terms h3 { font-family: var(--font-geist-sans), sans-serif; font-size: 17px; font-weight: 600; letter-spacing: -0.2px; line-height: 1.4; color: #111827; margin: 24px 0 8px; }" +
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
      <style>{RED_STYLE}</style>
      <LandingNav />

      <main className="max-w-[760px] mx-auto px-8 pt-[150px] pb-[120px] text-[15px] leading-[1.7]">
        <h1>Syarat dan Ketentuan</h1>

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
          Syarat ini menjelaskan layanan yang Anda pesan dari Nuave dan apa yang
          dapat Anda harapkan dari kami. Kami menulisnya dalam bahasa sederhana
          agar ruang lingkup, batasan, dan penyelesaian masalah dapat dipahami
          sebelum Anda membayar.
        </p>

        <Section title="1. Tentang Nuave">
          <p>
            Nuave adalah layanan audit visibilitas AI yang dioperasikan secara
            independen oleh <Placeholder>[NAMA LENGKAP PENGELOLA]</Placeholder>{" "}
            di <Placeholder>[KOTA]</Placeholder>, Indonesia.
          </p>
          <p>
            Kontak layanan: <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
            <br />
            Alamat korespondensi atau identitas usaha:{" "}
            <Placeholder>[ALAMAT KORESPONDENSI/NIB JIKA ADA]</Placeholder>
          </p>
          <p>
            Dalam syarat ini, “Anda” adalah orang atau bisnis yang memesan audit
            dan “kami” adalah pengelola Nuave.
          </p>
        </Section>

        <Section title="2. Layanan yang Anda pesan">
          <p>
            Satu pesanan mencakup satu audit untuk satu bisnis yang telah
            dipastikan identitasnya. Audit menggunakan 10 pertanyaan berbahasa
            Indonesia yang Anda periksa dan setujui sebelum pengujian dimulai.
          </p>
          <p>
            Laporan yang dikirim berisi hasil pengamatan pada layanan AI yang
            disebutkan dalam ringkasan pesanan, sumber yang tersedia, temuan
            tentang informasi publik, rekomendasi yang terkait dengan temuan,
            serta metode dan batasan pengujian.
          </p>
          <p>
            Pesanan tidak mencakup monitoring berkelanjutan, dashboard,
            langganan, implementasi rekomendasi, jasa SEO lengkap, atau jaminan
            hasil bisnis. Re-check adalah pesanan terpisah.
          </p>
        </Section>

        <Section title="3. Syarat pemesan">
          <p>
            Anda harus berusia setidaknya 18 tahun dan berwenang memesan audit
            untuk bisnis yang diuji. Anda bertanggung jawab memberikan informasi
            yang benar dan memastikan bahwa Anda berhak menggunakannya.
          </p>
          <p>
            Jangan mengirim data pelanggan, kata sandi, rahasia dagang, data
            kesehatan, data keuangan pribadi, dokumen hukum privat, atau data
            sensitif lain yang tidak diperlukan. Jika kami menerimanya, kami
            dapat menghentikan proses dan meminta Anda mengirim ulang informasi
            yang aman.
          </p>
        </Section>

        <Section title="4. Konfirmasi bisnis dan pertanyaan">
          <p>
            Sebelum pembayaran atau pelaksanaan audit, Anda dapat memeriksa
            identitas bisnis, cabang atau wilayah, fakta yang Anda berikan,
            serta 10 pertanyaan yang akan diuji.
          </p>
          <p>
            Audit tidak dimulai sampai Anda menyetujuinya. Setelah disetujui,
            pertanyaan dikunci. Perubahan setelah audit dimulai dapat memerlukan
            pesanan baru karena hasil lama dan hasil baru tidak lagi membahas
            ruang lingkup yang sama.
          </p>
          <p>
            Jika identitas bisnis atau cabang tidak dapat dipastikan, kami dapat
            meminta perbaikan atau menolak pesanan. Jika pembayaran sudah
            diterima tetapi audit belum dimulai, pembayaran akan dikembalikan
            penuh.
          </p>
        </Section>

        <Section title="5. Harga dan pembayaran">
          <p>
            Harga satu audit adalah <Placeholder>[HARGA TOTAL]</Placeholder>,
            termasuk{" "}
            <Placeholder>
              [PAJAK/BIAYA ATAU “tidak ada biaya tambahan”]
            </Placeholder>
            . Pembayaran dilakukan melalui{" "}
            <Placeholder>[PENYEDIA/METODE PEMBAYARAN]</Placeholder>. Kami tidak
            menyimpan nomor kartu atau kredensial pembayaran Anda.
          </p>
          <p>
            Audit hanya dimulai setelah pembayaran dinyatakan berhasil dan 10
            pertanyaan telah disetujui. Anda akan menerima konfirmasi yang
            mencantumkan identitas bisnis, ruang lingkup, harga, status
            pembayaran, waktu pengiriman, dan versi ketentuan yang diterima.
          </p>
        </Section>

        <Section title="6. Pelaksanaan dan pengiriman">
          <p>
            Laporan dikirim paling lambat{" "}
            <Placeholder>[WAKTU PENGIRIMAN]</Placeholder> setelah pembayaran
            berhasil dan pertanyaan disetujui. Laporan dikirim ke email pemesan
            melalui tautan privat dan dapat diunduh.
          </p>
          <p>
            Tautan laporan tersedia selama{" "}
            <Placeholder>[MASA AKSES]</Placeholder>. Anda bertanggung jawab
            mengunduh dan menyimpan salinan sebelum masa akses berakhir. Jika
            ada keterlambatan, kami akan memberi kabar melalui email dan
            menjelaskan pilihan yang tersedia.
          </p>
        </Section>

        <Section title="7. Koreksi, kegagalan, pembatalan, dan pengembalian dana">
          <h3>Koreksi</h3>
          <p>
            Jika laporan tidak sesuai dengan bisnis atau pertanyaan yang
            disepakati, tidak lengkap karena kesalahan Nuave, atau memuat
            kesalahan yang kami masukkan, hubungi{" "}
            <a href={`mailto:${EMAIL}`}>{EMAIL}</a> dalam{" "}
            <Placeholder>[BATAS WAKTU KOREKSI]</Placeholder> setelah laporan
            dikirim. Kami akan memeriksa dan, jika benar, memperbaikinya tanpa
            biaya.
          </p>

          <h3>Kegagalan teknis</h3>
          <p>
            Jika kegagalan di sistem Nuave membuat laporan yang dapat digunakan
            tidak bisa dihasilkan, kami akan mencoba menjalankan audit kembali
            satu kali. Jika percobaan tersebut tetap gagal, Anda dapat memilih
            pengembalian dana penuh melalui metode pembayaran semula.
          </p>

          <h3>Pembatalan</h3>
          <p>
            Anda dapat membatalkan pesanan dan meminta pengembalian dana penuh
            sebelum audit mulai dijalankan. Setelah pemrosesan dimulai,
            pembatalan karena perubahan pikiran tidak tersedia, kecuali kami
            menyetujui lain secara tertulis.
          </p>

          <h3>Pembayaran ganda</h3>
          <p>
            Pembayaran ganda untuk pesanan yang sama akan dikembalikan penuh
            setelah kami memverifikasinya.
          </p>

          <h3>Hasil yang tidak menguntungkan</h3>
          <p>
            Tidak munculnya bisnis Anda dalam jawaban AI, penyebutan kompetitor,
            atau ketidaksetujuan terhadap hasil pengamatan bukan kegagalan
            layanan dan tidak dengan sendirinya menjadi dasar pengembalian dana.
            Nilai layanan ini adalah pengujian dan laporannya, bukan hasil
            tertentu.
          </p>
          <p>
            Pengembalian dana yang disetujui diproses dalam 7–14 hari kerja
            melalui metode pembayaran semula. Waktu dana masuk ke rekening Anda
            dapat bergantung pada penyedia pembayaran.
          </p>
        </Section>

        <Section title="8. Batasan metode">
          <p>
            Audit adalah sampel dari 10 pertanyaan, pada layanan AI dan waktu
            yang disebutkan dalam laporan. Jawaban AI dapat berubah. Laporan
            bukan peringkat permanen dan tidak mewakili semua pertanyaan,
            pengguna, model, atau waktu.
          </p>
          <p>
            Nuave tidak menjamin bisnis Anda akan disebutkan setelah rekomendasi
            dijalankan dan tidak menjanjikan kenaikan traffic, calon pelanggan,
            penjualan, atau pendapatan. Temuan tentang informasi publik juga
            tidak membuktikan bahwa informasi tersebut menyebabkan jawaban AI
            tertentu.
          </p>
        </Section>

        <Section title="9. Penggunaan laporan">
          <p>
            Anda dapat menggunakan dan membagikan laporan untuk kepentingan
            internal bisnis Anda. Kutipan dan tautan milik sumber asal tetap
            tunduk pada hak pemiliknya.
          </p>
          <p>
            Anda tidak boleh mengubah laporan dengan cara yang menyesatkan,
            menyatakan bahwa Nuave menjamin hasil tertentu, atau menjual kembali
            laporan sebagai produk Nuave tanpa izin tertulis.
          </p>
          <p>
            Laporan Anda bersifat privat. Kami tidak akan mempublikasikan nama
            bisnis, temuan, atau laporan Anda sebagai contoh atau materi promosi
            tanpa izin terpisah.
          </p>
        </Section>

        <Section title="10. Data dan privasi">
          <p>
            Kami memproses informasi yang diperlukan untuk menerima pesanan,
            menjalankan audit, mengirim laporan, menjaga keamanan layanan, dan
            membantu jika terjadi masalah. Penjelasan lengkap terdapat dalam{" "}
            <Link href="/privacy">Kebijakan Privasi dan Data</Link>.
          </p>
          <p>
            Persetujuan atas syarat layanan tidak otomatis berarti Anda setuju
            menerima promosi. Jika pemasaran ditawarkan, pilihannya harus
            terpisah dan dapat ditarik.
          </p>
        </Section>

        <Section title="11. Penolakan atau penghentian pesanan">
          <p>
            Kami dapat menolak atau menghentikan pesanan jika identitas bisnis
            tidak dapat dipastikan, informasi yang dibutuhkan tidak tersedia,
            pesanan berada di luar ruang lingkup layanan, terdapat dugaan
            penyalahgunaan, atau data yang dikirimkan melanggar hukum maupun
            membahayakan pihak lain.
          </p>
          <p>
            Jika penghentian terjadi sebelum audit dimulai, pembayaran
            dikembalikan penuh. Jika terjadi setelah audit dimulai karena
            pelanggaran atau informasi keliru dari pemesan, kami akan
            menjelaskan keputusan dan penyelesaian yang wajar berdasarkan
            pekerjaan yang sudah dilakukan.
          </p>
        </Section>

        <Section title="12. Tanggung jawab">
          <p>
            Kami akan menjalankan layanan sesuai dengan ruang lingkup yang
            dikonfirmasi dan melakukan upaya yang wajar untuk menjaga ketepatan
            laporan serta keamanan data. Namun, kami tidak mengendalikan layanan
            AI, situs pihak ketiga, atau perubahan informasi publik setelah
            waktu pengujian.
          </p>
          <p>
            Tidak ada bagian dalam syarat ini yang menghapus hak konsumen yang
            tidak dapat dikesampingkan menurut hukum Indonesia. Jika terjadi
            masalah, kami meminta Anda menghubungi kami lebih dahulu agar dapat
            diperiksa dan diselesaikan secara wajar.
          </p>
        </Section>

        <Section title="13. Perubahan ketentuan">
          <p>
            Kami dapat memperbarui ketentuan ini ketika layanan berubah. Versi
            yang berlaku untuk pesanan Anda adalah versi yang ditampilkan dan
            diterima saat pesanan dibuat. Perubahan setelah itu tidak mengubah
            pesanan yang sudah disepakati, kecuali Anda menyetujuinya.
          </p>
        </Section>

        <Section title="14. Keluhan dan penyelesaian masalah">
          <p>
            Kirim pertanyaan, permintaan koreksi, atau keluhan ke{" "}
            <a href={`mailto:${EMAIL}`}>{EMAIL}</a> dengan nomor pesanan dan
            nama bisnis. Jangan mengirim kata sandi atau data sensitif.
          </p>
          <p>
            Kami akan mengonfirmasi penerimaan dalam 1–2 hari kerja dan berusaha
            menyelesaikan masalah melalui komunikasi langsung terlebih dahulu.
            Syarat ini tunduk pada hukum Republik Indonesia. Jika masalah tidak
            dapat diselesaikan, para pihak dapat menggunakan mekanisme
            penyelesaian sengketa yang tersedia dan berwenang di Indonesia.
          </p>
        </Section>
      </main>

      <Footer />
    </div>
  );
}
