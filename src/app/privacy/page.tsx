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

export const metadata: Metadata = {
  title: "Kebijakan Privasi dan Data | Nuave",
  description:
    "Data yang dipakai Nuave, untuk apa, siapa yang ikut memprosesnya, berapa lama disimpan, dan pilihan Anda.",
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

const PROVIDERS: Array<[string, string, string]> = [
  [
    "Cloudflare",
    "Hosting, keamanan situs, dan penyimpanan data pesanan serta laporan",
    "Permintaan ke situs (termasuk alamat IP), data pesanan, data audit, dan laporan",
  ],
  [
    "OpenAI",
    "Membaca website bisnis, menyiapkan ringkasan bisnis, dan menyusun laporan",
    "Alamat dan isi website bisnis, data bisnis yang Anda konfirmasi, pertanyaan, dan jawaban yang diperiksa",
  ],
  [
    "Cheaper Inference",
    "Menyusun draf sepuluh pertanyaan",
    "Data bisnis yang Anda konfirmasi dan data pencarian Google",
  ],
  [
    "DataForSEO",
    "Mengambil data pencarian Google dan menanyakan pertanyaan Anda ke ChatGPT dan Google",
    "Kata kunci layanan, kota pencarian, dan sepuluh pertanyaan",
  ],
  [
    "Midtrans",
    "Pembayaran",
    "Email pesanan, nomor pesanan, jumlah, dan data yang Anda isi langsung di halaman Midtrans",
  ],
  [
    "Resend",
    "Mengirim email pesanan dan link laporan",
    "Email pesanan, nama bisnis, nomor pesanan, dan link laporan",
  ],
  [
    "Penyedia kotak masuk email kami",
    "Menerima dan membalas email ke support@nuave.ai",
    "Isi email yang Anda kirim ke kami",
  ],
  [
    "Meta Platforms",
    "Iklan dan pengukuran iklan, hanya jika Anda setuju",
    "Lihat bagian 9",
  ],
];

const RETENTION: Array<[string, string]> = [
  [
    "Pesanan yang selesai: email, data bisnis, pertanyaan, hasil pemeriksaan, laporan, dan catatan pengiriman",
    "12 bulan setelah laporan selesai",
  ],
  [
    "Pesanan yang gagal atau tidak dilanjutkan",
    "30 hari, kecuali masih ada permintaan bantuan yang terbuka",
  ],
  ["Link laporan", "Berlaku 12 bulan, atau sampai diganti atau dimatikan"],
  ["Catatan biaya per pesanan (tanpa email)", "24 bulan"],
  ["Kemajuan pesanan di browser Anda", "Paling lama 7 hari, di perangkat Anda"],
  ["Email bantuan dan keluhan", "12 bulan setelah masalahnya selesai"],
  [
    "Catatan pembayaran",
    "Paling sedikit 24 bulan, atau lebih lama jika diwajibkan untuk pajak atau hukum",
  ],
  [
    "Salinan email di Resend",
    "Sesuai masa simpan Resend, kami atur sesingkat yang tersedia",
  ],
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingNav />
      <main className="type-copy mx-auto max-w-[760px] px-8 pt-[150px] pb-[120px] text-[#374151] [&_a]:text-[var(--lp-purple)] [&_a]:underline [&_a]:underline-offset-[3px] [&_li]:mb-2 [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5">
        <h1 className="type-heading-xl m-0 mb-2 text-[#111827]">
          Kebijakan privasi dan data
        </h1>
        <p className="type-copy-sm text-[#6B7280]">
          Berlaku sejak {LEGAL_EFFECTIVE_DATE} · Versi {LEGAL_VERSION}
        </p>
        <p>
          Halaman ini menjelaskan data yang dipakai Nuave, untuk apa, siapa yang
          ikut memprosesnya, berapa lama disimpan, dan pilihan Anda. Prinsip
          kami sederhana. Kami mengambil data seperlunya dan memakainya sesuai
          tujuan. Laporan Anda tidak kami bagikan tanpa izin.
        </p>

        <Section title="1. Siapa yang bertanggung jawab">
          <p>
            Nuave adalah layanan independen yang dijalankan oleh {OPERATOR_NAME}{" "}
            di {OPERATOR_CITY}, Indonesia.
          </p>
          <p>
            Pertanyaan dan permintaan soal data dikirim ke{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. Kami
            membalas dalam {SUPPORT_REPLY} (Senin sampai Jumat, WIB).
          </p>
        </Section>

        <Section title="2. Data yang kami pakai">
          <ul>
            <li>
              <strong>Alamat website atau akun Instagram bisnis</strong> yang
              Anda masukkan, dan informasi publik yang kami baca dari sana,
              seperti nama, alamat, dan layanan.
            </li>
            <li>
              <strong>Email pesanan.</strong> Kami pakai untuk konfirmasi
              pembayaran, link laporan, dan jawaban bantuan. Jika Anda
              menyetujui cookie Meta, email ini juga dikirim ke Meta dalam
              bentuk kode acak saat pembelian (bagian 9).
            </li>
            <li>
              <strong>Data pembayaran dari Midtrans:</strong> status, jumlah,
              waktu, cara bayar, dan nomor transaksi. Kami tidak menerima nomor
              kartu, PIN, kata sandi bank, atau kode OTP. Jika kami perlu
              mengembalikan uang lewat transfer bank, kami menanyakan nomor
              rekening Anda lewat email bantuan.
            </li>
            <li>
              <strong>Data bisnis yang Anda periksa:</strong> kota untuk
              pencarian, kategori, layanan, calon pelanggan, pesaing, dan fakta
              publik lain yang Anda konfirmasi.
            </li>
            <li>
              <strong>Data audit:</strong> sepuluh pertanyaan yang Anda setujui,
              jawaban ChatGPT dan Google AI Overview, sumber yang disebut, dan
              laporan.
            </li>
            <li>
              <strong>Data teknis:</strong> Cloudflare, penyedia hosting kami,
              memproses alamat IP dan informasi browser untuk menjalankan situs
              dan menahan serangan. Nuave sendiri tidak menyimpan alamat IP
              Anda.
            </li>
          </ul>
        </Section>

        <Section title="3. Data yang tidak kami perlukan">
          <p>
            Nuave memeriksa bisnis, bukan pasien atau pelanggan Anda. Jangan
            kirim data pasien, rekam medis, daftar pelanggan, kata sandi, data
            keuangan pribadi, atau data sensitif lain.
          </p>
          <p>
            Pengecualiannya nomor rekening yang kami tanyakan untuk pengembalian
            dana. Nomor itu hanya kami pakai untuk transfer tersebut. Jika data
            lain seperti itu sampai ke kami, kami batasi aksesnya dan berhenti
            memprosesnya. Lalu kami menghapusnya, kecuali ada kewajiban untuk
            menyimpannya.
          </p>
        </Section>

        <Section title="4. Untuk apa data dipakai">
          <ul>
            <li>memastikan bisnis yang diperiksa memang bisnis Anda;</li>
            <li>menyiapkan data bisnis dan pertanyaan untuk Anda periksa;</li>
            <li>menerima dan mencatat pembayaran;</li>
            <li>menjalankan audit dan menyusun laporan;</li>
            <li>mengirim link laporan dan membantu jika ada masalah;</li>
            <li>mengembalikan uang jika diperlukan;</li>
            <li>menjaga keamanan layanan dan mencegah penyalahgunaan;</li>
            <li>
              mengukur iklan Nuave di Facebook dan Instagram, dan menampilkan
              iklan kepada orang yang mirip dengan pembeli Nuave, hanya jika
              Anda setuju (bagian 9); dan
            </li>
            <li>memenuhi kewajiban pembukuan dan hukum.</li>
          </ul>
          <p>
            Kami tidak menjual data pribadi Anda. Kami tidak memakai laporan
            Anda sebagai contoh atau bahan promosi tanpa izin terpisah dari
            Anda.
          </p>
        </Section>

        <Section title="5. Layanan AI dan pencarian">
          <p>
            Untuk membuat audit, sebagian data bisnis dan pertanyaan Anda
            dikirim ke OpenAI, Cheaper Inference, dan DataForSEO. DataForSEO
            mengambil data pencarian Google. DataForSEO juga menanyakan sepuluh
            pertanyaan Anda ke ChatGPT dan Google, lalu mengembalikan jawabannya
            kepada kami.
          </p>
          <p>
            Kami tidak memasukkan email, data pembayaran, atau data pribadi lain
            ke permintaan ini. Penyedia tersebut dapat memproses data di luar
            Indonesia sesuai kebijakan masing-masing.
          </p>
        </Section>

        <Section title="6. Pihak yang membantu kami">
          <div className="mb-4 overflow-x-auto">
            <table className="type-copy-sm w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#E5E7EB] text-[#111827]">
                  <th className="py-2 pr-4 font-semibold">Penyedia</th>
                  <th className="py-2 pr-4 font-semibold">Untuk</th>
                  <th className="py-2 font-semibold">Data yang terkait</th>
                </tr>
              </thead>
              <tbody>
                {PROVIDERS.map(([name, role, data]) => (
                  <tr
                    key={name}
                    className="border-b border-[#E5E7EB] align-top"
                  >
                    <td className="py-2 pr-4 font-semibold text-[#111827]">
                      {name}
                    </td>
                    <td className="py-2 pr-4">{role}</td>
                    <td className="py-2">{data}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Kami juga dapat memberikan data jika diminta secara sah oleh
            pemerintah atau penegak hukum, atau jika perlu untuk melindungi
            keamanan orang yang memakai Nuave dan layanan kami.
          </p>
        </Section>

        <Section title="7. Pemrosesan di luar Indonesia">
          <p>
            Sebagian besar penyedia di atas menyimpan atau memproses data di
            luar Indonesia. Kami memilih pengaturan yang membatasi penggunaan
            data jika penyedia menyediakannya. Tanyakan ke{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> jika Anda
            ingin tahu lebih lanjut.
          </p>
        </Section>

        <Section title="8. Berapa lama data disimpan">
          <div className="mb-4 overflow-x-auto">
            <table className="type-copy-sm w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#E5E7EB] text-[#111827]">
                  <th className="py-2 pr-4 font-semibold">Data</th>
                  <th className="py-2 font-semibold">Masa simpan</th>
                </tr>
              </thead>
              <tbody>
                {RETENTION.map(([data, period]) => (
                  <tr
                    key={data}
                    className="border-b border-[#E5E7EB] align-top"
                  >
                    <td className="py-2 pr-4">{data}</td>
                    <td className="py-2">{period}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Setelah masa itu, data dihapus atau dibuat tidak lagi menunjuk ke
            Anda. Pengecualiannya data yang masih diperlukan untuk permintaan,
            sengketa, atau kewajiban hukum yang belum selesai.
          </p>
        </Section>

        <Section title="9. Cookie, penyimpanan di browser, dan iklan Meta">
          <p>
            Nuave menyimpan kemajuan pesanan di browser Anda, agar Anda bisa
            melanjutkan setelah halaman dimuat ulang. Data ini tetap di
            perangkat Anda. Setelah 7 hari data itu tidak dipakai lagi, dan
            dihapus saat Anda membuka Nuave berikutnya. Cloudflare juga dapat
            memasang cookie keamanan untuk menahan lalu lintas berbahaya.
          </p>
          <p>
            Untuk mengukur iklan Nuave di Facebook dan Instagram, kami memakai
            Meta Pixel di browser dan Meta Conversions API dari server kami.
            Keduanya hanya aktif jika Anda memilih <strong>Setuju</strong> pada
            pemberitahuan cookie. Jika Anda menolak atau belum memilih, Nuave
            tidak memasang cookie Meta dan tidak mengirim data Anda ke Meta.
          </p>
          <p>Jika Anda setuju, yang dikirim ke Meta Platforms adalah:</p>
          <ul>
            <li>
              halaman Nuave yang Anda buka dan seberapa jauh Anda membacanya,
              cookie Meta di browser Anda, dan informasi teknis yang biasa
              dikirim browser, seperti alamat IP dan jenis perangkat;
            </li>
            <li>
              tanda bahwa cek gratis selesai, checkout dibuka, dan pembayaran
              berhasil, beserta nilai pembelian (Rp249.000);
            </li>
            <li>
              untuk cek gratis dan pembelian, catatan yang sama dari server
              kami, beserta alamat IP, jenis browser, dan kode cookie Meta Anda;
              dan
            </li>
            <li>
              untuk pembelian, email pesanan yang sudah diubah menjadi kode acak
              (hash) sebelum dikirim. Meta memakainya untuk mencocokkan
              pembelian dengan akun Facebook atau Instagram Anda.
            </li>
          </ul>
          <p>
            Tujuannya untuk mengetahui iklan mana yang benar-benar menghasilkan
            cek gratis dan pembelian. Data ini juga dipakai untuk menampilkan
            iklan Nuave kepada orang yang mirip dengan pembeli Nuave.
          </p>
          <p>
            Yang tidak pernah kami kirim ke Meta: laporan Anda, sepuluh
            pertanyaan audit, jawaban AI, dan data bisnis yang Anda isi.
          </p>
          <p>
            Meta memproses data ini sesuai{" "}
            <a
              href="https://www.facebook.com/privacy/policy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Kebijakan Privasi Meta
            </a>
            . Anda bisa mengubah pilihan cookie kapan saja lewat tautan{" "}
            <strong>Pengaturan cookie</strong> di bagian bawah halaman. Anda
            juga bisa mengatur iklan di{" "}
            <a
              href="https://www.facebook.com/adpreferences"
              target="_blank"
              rel="noopener noreferrer"
            >
              pengaturan iklan Meta
            </a>
            , atau memblokir cookie di pengaturan browser Anda.
          </p>
        </Section>

        <Section title="10. Cara kami melindungi data">
          <p>
            Kami memakai koneksi HTTPS, membatasi siapa yang bisa membuka data,
            menyimpan kunci akses hanya di server, dan memperbarui perangkat
            lunak. Tidak ada sistem yang bebas risiko. Jika terjadi kebocoran
            yang menyangkut data Anda, kami akan memeriksanya, membatasi
            dampaknya, dan memberi tahu Anda.
          </p>
        </Section>

        <Section title="11. Hak Anda">
          <p>Anda bisa meminta kami untuk:</p>
          <ul>
            <li>menjelaskan data tentang Anda yang kami simpan;</li>
            <li>mengirim salinan data yang tersedia;</li>
            <li>memperbaiki data yang salah;</li>
            <li>
              menghapus data yang tidak lagi diperlukan, kecuali ada kewajiban
              untuk menyimpannya; dan
            </li>
            <li>berhenti memakai data yang Anda izinkan sebelumnya.</li>
          </ul>
          <p>
            Kirim permintaan ke{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> dari email
            pesanan Anda. Nomor pesanan saja tidak cukup untuk membuktikan
            pesanan itu milik Anda, jadi kami mungkin meminta konfirmasi dari
            email tersebut.
          </p>
        </Section>

        <Section title="12. Link laporan bersifat pribadi">
          <p>
            Siapa pun yang memegang link laporan bisa membukanya. Jangan
            teruskan link itu ke orang yang tidak berhak. Jika link terlanjur
            tersebar, tulis ke{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> dari email
            pesanan. Kami akan mematikan link lama dan mengirim link baru ke
            email pesanan.
          </p>
        </Section>

        <Section title="13. Usia">
          <p>
            Nuave untuk pemesan berusia 18 tahun ke atas. Jangan kirim data anak
            melalui isian, pertanyaan, atau email bantuan.
          </p>
        </Section>

        <Section title="14. Perubahan kebijakan">
          <p>
            Kebijakan ini bisa berubah jika layanan atau penyedia kami berubah.
            Tanggal dan versi terbaru ada di bagian atas halaman ini.
          </p>
        </Section>

        <Section title="15. Hubungi kami">
          <p>
            Pengelola: {OPERATOR_NAME}, {OPERATOR_CITY}
            <br />
            Email: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            <br />
            Halaman bantuan: <Link href="/support">Kontak dan bantuan</Link>
            <br />
            Syarat layanan: <Link href="/terms">Syarat dan ketentuan</Link>
          </p>
        </Section>
      </main>
      <Footer />
    </div>
  );
}
