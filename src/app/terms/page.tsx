import type { Metadata } from "next";
import Link from "next/link";
import LandingNav from "@/components/LandingNav";
import Footer from "@/components/Footer";
import {
  LEGAL_EFFECTIVE_DATE,
  LEGAL_VERSION,
  OPERATOR_CITY,
  OPERATOR_NAME,
  SUPPORT_EMAIL,
  SUPPORT_REPLY,
} from "@/lib/legal";
import { AUDIT_SOURCES_TEXT, DELIVERY_PROMISE } from "@/lib/orders/promise";

export const metadata: Metadata = {
  title: "Syarat dan Ketentuan | Nuave",
  description:
    "Ketentuan pemesanan audit Nuave: isi layanan, harga Rp249.000, waktu laporan, pengembalian dana, dan batasan audit.",
};

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
          Syarat dan ketentuan
        </h1>
        <p className="type-copy-sm text-[#6B7280]">
          Berlaku sejak {LEGAL_EFFECTIVE_DATE} · Versi {LEGAL_VERSION}
        </p>
        <p>
          Halaman ini menjelaskan apa yang Anda beli dari Nuave, kapan laporan
          siap, dan kapan uang Anda kembali. Baca sebelum membayar.
        </p>

        <Section title="1. Tentang Nuave">
          <p>
            Nuave adalah layanan independen yang dijalankan oleh {OPERATOR_NAME}{" "}
            di {OPERATOR_CITY}, Indonesia. Kontak:{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
          </p>
        </Section>

        <Section title="2. Istilah di halaman ini">
          <ul>
            <li>
              <strong>Nuave</strong> atau <strong>kami</strong>: {OPERATOR_NAME}
              , pengelola layanan Nuave.
            </li>
            <li>
              <strong>Anda</strong>: orang yang memesan audit, termasuk bisnis
              yang Anda wakili.
            </li>
            <li>
              <strong>Layanan</strong>: cek gratis dan audit yang dijelaskan di
              halaman ini.
            </li>
            <li>
              <strong>Pesanan</strong>: satu pembelian audit untuk satu bisnis,
              dengan nomor pesanan sendiri.
            </li>
            <li>
              <strong>Audit</strong>: sepuluh pertanyaan yang Anda setujui,
              ditanyakan ke {AUDIT_SOURCES_TEXT}.
            </li>
            <li>
              <strong>Pemeriksaan</strong>: satu pertanyaan yang ditanyakan ke
              satu sumber. Satu audit berisi 20 pemeriksaan.
            </li>
            <li>
              <strong>Laporan</strong>: hasil audit di halaman web, PDF, dan
              file bukti, yang dibuka lewat link di email pesanan.
            </li>
          </ul>
        </Section>

        <Section title="3. Yang Anda beli">
          <p>
            Satu pesanan adalah satu audit untuk satu bisnis. Nuave menanyakan
            sepuluh pertanyaan berbahasa Indonesia ke {AUDIT_SOURCES_TEXT}. Anda
            memeriksa dan menyetujui pertanyaan itu sebelum audit dimulai.
          </p>
          <p>
            Laporan berisi jawaban dari kedua sumber, berapa kali bisnis Anda
            disebut di masing-masing, bisnis lain yang disebut, sumber yang
            dibaca AI, dan hal yang bisa Anda perbaiki.
          </p>
          <p>
            Google sering tidak menampilkan AI Overview untuk sebuah pertanyaan.
            Laporan mencatatnya sebagai temuan, bukan sebagai pemeriksaan yang
            gagal.
          </p>
          <p>
            Pesanan tidak mencakup pemantauan rutin, dashboard, langganan, jasa
            SEO, atau pengerjaan saran di laporan. Cek ulang adalah pesanan
            terpisah.
          </p>
        </Section>

        <Section title="4. Siapa yang boleh memesan">
          <p>
            Anda berusia 18 tahun ke atas dan berhak memesan audit untuk bisnis
            yang diperiksa. Informasi yang Anda berikan harus benar.
          </p>
          <p>
            Jangan kirim data pasien, data pelanggan, kata sandi, atau data
            sensitif lain. Audit tidak membutuhkannya.
          </p>
        </Section>

        <Section title="5. Yang tidak boleh dilakukan">
          <p>Saat memakai layanan, Anda tidak boleh:</p>
          <ul>
            <li>memesan audit untuk bisnis yang tidak berhak Anda wakili;</li>
            <li>mengisi data palsu, data orang lain, atau data pasien;</li>
            <li>
              mengganggu atau membebani layanan, mencoba membobolnya, atau
              mengambil isinya secara otomatis;
            </li>
            <li>
              menjual kembali laporan atau layanan sebagai produk Anda tanpa
              izin tertulis dari kami; atau
            </li>
            <li>
              memakai laporan untuk menyesatkan orang lain, misalnya dengan
              mengubah angkanya.
            </li>
          </ul>
          <p>
            Jika ini terjadi, kami bisa menghentikan pesanan seperti dijelaskan
            di bagian Penolakan pesanan.
          </p>
        </Section>

        <Section title="6. Harga dan pembayaran">
          <p>
            Harga satu audit <strong>Rp249.000</strong>. Itu harga total: Nuave
            tidak menambah pajak atau biaya lain saat checkout. Pembayaran lewat
            Midtrans dengan QRIS, transfer bank, GoPay, atau DANA. Kami tidak
            menerima nomor kartu, PIN, atau kode OTP Anda.
          </p>
          <p>
            Cek gratis di awal hanya memastikan bisnis Anda. Setelah membayar,
            Anda memeriksa data bisnis dan menyetujui sepuluh pertanyaan.
          </p>
          <p>
            Jika harga atau keterangan layanan tampil salah karena kekeliruan
            kami, kami boleh membatalkan pesanan dan mengembalikan uang Anda
            penuh.
          </p>
          <p>
            Lanjutkan isian di browser yang sama dengan tempat Anda membayar,
            karena isian hanya tersimpan di browser itu. Jika sepuluh pertanyaan
            belum Anda setujui dalam 7 hari setelah membayar, pesanan berakhir
            dan kami kembalikan uang Anda penuh.
          </p>
        </Section>

        <Section title="7. Kapan laporan siap">
          <p>{DELIVERY_PROMISE}</p>
          <p>
            Audit dimulai saat Anda menyetujui sepuluh pertanyaan, bukan saat
            membayar. Setelah itu pertanyaan dikunci. Audit tetap berjalan di
            server walaupun halaman ditutup. Link laporan dikirim ke email
            pesanan dan berlaku 12 bulan. Simpan PDF-nya jika Anda ingin
            menyimpan laporan lebih lama.
          </p>
          <p>
            Jika laporan belum siap 24 jam setelah audit dimulai, kami
            kembalikan uang Anda penuh.
          </p>
        </Section>

        <Section title="8. Jika ada pemeriksaan yang gagal">
          <p>
            Kadang satu pertanyaan tidak berhasil diperiksa di ChatGPT atau
            Google karena gangguan teknis. Laporan tetap dikirim jika setiap
            sumber berhasil memeriksa sedikitnya 5 dari 10 pertanyaan.
            Pemeriksaan yang gagal ditandai <strong>Tidak dapat diuji</strong>{" "}
            dengan tautan <strong>Minta bantuan</strong>, dan tidak dihitung
            sebagai hasil buruk.
          </p>
          <p>
            Jika Anda minta bantuan, kami balas dalam {SUPPORT_REPLY}. Kami coba
            periksa ulang pertanyaan yang gagal dan mengirim hasilnya ke email
            pesanan. Jika hasilnya tetap tidak bisa didapat, kami kembalikan
            Rp12.450 untuk setiap pemeriksaan yang gagal. Angka itu adalah
            Rp249.000 dibagi 20 pemeriksaan (10 di ChatGPT dan 10 di Google).
          </p>
          <p>
            Jika kurang dari 5 pertanyaan berhasil di salah satu sumber, laporan
            tidak dibuat. Kami kabari lewat email dan mengembalikan uang Anda
            penuh.
          </p>
        </Section>

        <Section title="9. Pembatalan dan pengembalian dana">
          <ul>
            <li>
              <strong>Sebelum audit dimulai</strong> (sebelum Anda menyetujui
              sepuluh pertanyaan), Anda bisa membatalkan pesanan dan menerima
              uang kembali penuh. Tulis ke{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> dengan
              nomor pesanan.
            </li>
            <li>
              <strong>Pembayaran ganda</strong> untuk pesanan yang sama kami
              kembalikan penuh setelah kami periksa.
            </li>
            <li>
              <strong>Setelah audit dimulai</strong>, pesanan tidak bisa
              dibatalkan karena berubah pikiran.
            </li>
            <li>
              <strong>Hasil yang tidak sesuai harapan</strong>, misalnya bisnis
              Anda tidak disebut atau pesaing lebih sering disebut, bukan alasan
              pengembalian dana. Yang Anda beli adalah pemeriksaan dan
              laporannya, bukan hasil tertentu.
            </li>
          </ul>
          <p>
            Untuk pembatalan, kirim permintaan dari email pesanan. Kami kirim
            pengembalian dana paling lambat 3 hari kerja setelah pesanan
            dinyatakan gagal, setelah kami menerima pembatalan Anda, atau
            setelah pemeriksaan ulang tidak berhasil. Jika kami perlu
            mengembalikan uang lewat transfer bank, waktu itu dihitung sejak
            kami menerima nomor rekening Anda.
          </p>
          <ul>
            <li>
              <strong>QRIS, GoPay, dan DANA:</strong> uang dikembalikan lewat
              Midtrans ke cara bayar semula. Jika cara itu tidak tersedia, kami
              transfer ke rekening Anda.
            </li>
            <li>
              <strong>Transfer bank:</strong> kami transfer dari rekening kami.
              Kami tanyakan nomor rekening Anda lewat email. Nomor itu hanya ada
              di email bantuan, tidak kami simpan di sistem pesanan Nuave.
            </li>
          </ul>
          <p>
            Lama dana sampai ke rekening atau dompet digital Anda tergantung
            bank atau penyedia pembayaran.
          </p>
        </Section>

        <Section title="10. Salah email atau salah bisnis">
          <p>
            Tulis ke <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
            Kami bantu secara manual. Jika Anda salah ketik email saat memesan,
            kirim bukti pembayaran atau nomor transaksi Midtrans. Setelah kami
            periksa, kami bantu mengirim link laporan ke email yang benar dan
            mematikan link lama. Permintaan lain, seperti mengirim ulang link,
            harus datang dari email pesanan. Nomor pesanan saja tidak cukup
            untuk membuktikan pesanan itu milik Anda. Laporan yang sudah dibuat
            tidak diubah.
          </p>
        </Section>

        <Section title="11. Batasan audit">
          <p>
            Audit adalah contoh dari sepuluh pertanyaan pada waktu tertentu.
            Jawaban AI bisa berubah. Laporan bukan peringkat tetap dan tidak
            mewakili semua pertanyaan atau semua orang.
          </p>
          <p>
            Jawaban ChatGPT dan Google AI Overview di laporan adalah jawaban
            pihak lain yang kami kutip apa adanya. Kami tidak menjamin isi
            jawaban itu benar, termasuk tentang bisnis Anda atau bisnis lain.
          </p>
          <p>
            Nuave tidak menjamin bisnis Anda akan disebut setelah saran
            dijalankan. Nuave juga tidak menjanjikan kenaikan pengunjung, calon
            pelanggan, atau penjualan.
          </p>
        </Section>

        <Section title="12. Penggunaan dan hak atas laporan">
          <p>
            Anda boleh memakai dan membagikan laporan untuk keperluan bisnis
            Anda. Jangan mengubahnya sampai menyesatkan, dan jangan menjualnya
            kembali sebagai produk Nuave.
          </p>
          <p>
            Format, metode, dan tampilan laporan tetap milik Nuave. Jawaban AI,
            kutipan, dan sumber di dalam laporan tetap milik pemiliknya
            masing-masing.
          </p>
          <p>
            Kami tidak menerbitkan nama bisnis, temuan, atau laporan Anda
            sebagai contoh atau promosi tanpa izin terpisah dari Anda.
          </p>
        </Section>

        <Section title="13. Penolakan pesanan">
          <p>
            Kami bisa menolak atau menghentikan pesanan jika bisnisnya tidak
            dapat dipastikan, informasinya tidak cukup, atau ada dugaan
            penyalahgunaan. Jika itu terjadi sebelum audit dimulai, uang Anda
            kembali penuh.
          </p>
        </Section>

        <Section title="14. Data dan privasi">
          <p>
            Cara kami memakai data dijelaskan di{" "}
            <Link href="/privacy">Kebijakan privasi dan data</Link>. Menyetujui
            syarat ini tidak berarti Anda setuju menerima promosi.
          </p>
        </Section>

        <Section title="15. Batas tanggung jawab">
          <p>
            Kami menjalankan audit sesuai yang Anda setujui dan berusaha menjaga
            laporan tetap akurat. Kami tidak mengendalikan ChatGPT, Google, atau
            situs pihak lain. Nuave tidak berafiliasi dengan OpenAI, Google,
            atau Meta.
          </p>
          <p>
            Sejauh diizinkan hukum, tanggung jawab kami atas satu pesanan paling
            banyak sebesar jumlah yang Anda bayar untuk pesanan itu. Kami tidak
            bertanggung jawab atas kerugian tidak langsung, seperti kehilangan
            pendapatan, pasien, atau peluang bisnis, yang timbul dari memakai
            laporan.
          </p>
          <p>
            Syarat ini tidak menghapus hak Anda sebagai konsumen menurut hukum
            Indonesia.
          </p>
        </Section>

        <Section title="16. Penyelesaian masalah">
          <p>
            Jika ada masalah, hubungi kami dulu di{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> dengan nomor
            pesanan. Kami balas dalam {SUPPORT_REPLY} (Senin sampai Jumat, WIB),
            dan kami berusaha menyelesaikannya bersama Anda dalam 30 hari.
          </p>
          <p>
            Jika belum selesai, masalah dapat dibawa ke Pengadilan Negeri
            Jakarta Selatan, atau ke Badan Penyelesaian Sengketa Konsumen sesuai
            hak Anda. Syarat ini tunduk pada hukum Republik Indonesia.
          </p>
        </Section>

        <Section title="17. Ketentuan lain">
          <ul>
            <li>
              Jika satu bagian syarat ini tidak berlaku menurut hukum, bagian
              lain tetap berlaku.
            </li>
            <li>
              Syarat ini, bersama{" "}
              <Link href="/privacy">Kebijakan privasi dan data</Link>, adalah
              seluruh kesepakatan antara Anda dan kami tentang pesanan Anda.
            </li>
            <li>
              Jika kami tidak langsung memakai suatu hak dalam syarat ini, hak
              itu tetap ada.
            </li>
            <li>
              Jika kami menghentikan layanan sebelum audit pesanan Anda dimulai,
              uang Anda kembali penuh.
            </li>
          </ul>
        </Section>

        <Section title="18. Perubahan syarat">
          <p>
            Syarat ini bisa berubah jika layanan berubah. Pesanan Anda mengikuti
            versi yang berlaku saat Anda membayar.
          </p>
        </Section>
      </main>
      <Footer />
    </div>
  );
}
