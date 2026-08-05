import {
  IconSearch,
  IconAlertTriangle,
  IconCircleCheck,
  IconCircleX,
  IconBook,
  IconBrain,
  IconMessageCircle2,
  IconMessage,
  IconPhone,
  IconMapPin,
  IconBuilding,
} from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  SectionLabel,
  Callout,
  CostBadge,
  StatusPill,
  StageNum,
  PromptBox,
  ResponseBox,
  ScoreRing,
} from "./report-ui";

/* ── Halaman Utama (Bahasa Indonesia) ── */

export function ReportId() {
  return (
    <div className="min-h-screen bg-white font-sans text-[#111] leading-[1.65] antialiased">
      {/* ── Skip link ── */}
      <a
        href="#main-content"
        className="absolute -top-full left-4 bg-white text-[#111] px-4 py-2 rounded-md font-semibold text-sm z-[100] border-2 border-accent no-underline focus:top-4 transition-[top] duration-150"
      >
        Lewati
      </a>

      {/* ══════════════════════════════════ */}
      {/* COVER / HERO                      */}
      {/* ══════════════════════════════════ */}
      <header className="relative bg-gradient-to-b from-[#f8fafc] to-white py-[4.5rem] px-8 overflow-hidden border-b border-[#f1f5f9]">
        <div className="absolute top-[-50%] right-[-15%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.04)_0%,transparent_65%)] pointer-events-none" />
        <div className="max-w-[820px] mx-auto relative z-[1]">
          <div className="text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-[#6b7280] mb-5">
            AI Visibility Report
          </div>
          <div className="text-[2rem] font-bold text-[#111] mb-1 tracking-[-0.01em] font-sans">
            Masryef
          </div>
          <div className="text-[0.95rem] text-[#6b7280] mb-12">
            Boutique Shariah Advisory • Disusun Agustus 2026
          </div>

          <div className="flex items-center gap-10 flex-wrap">
            <ScoreRing
              score={56}
              outOfLabel="dari 100"
              scoreLabel="AI Visibility Score"
            />

            <div className="flex-1 min-w-[260px]">
              <p className="font-serif italic text-[1.3rem] text-[#4b5563] leading-[1.5] mb-3">
                &ldquo;Masryef dikenali oleh AI, tapi belum menjadi rekomendasi
                utama.&rdquo;
              </p>
              <p className="text-[0.88rem] text-[#6b7280] leading-[1.55]">
                Brand Anda ditemukan oleh AI. Tapi ketika customer potensial
                mencari jawaban, bukan brand Anda yang direkomendasikan.{" "}
                <strong className="text-[#111] font-semibold">
                  Ini bisa diperbaiki.
                </strong>
              </p>
            </div>
          </div>

          <div className="mt-10 flex gap-10 text-[0.8rem] text-[#6b7280] flex-wrap">
            <span>
              <strong className="text-[#4b5563] font-semibold">
                Disusun untuk
              </strong>{" "}
              Masryef Advisory Sdn Bhd
            </span>
            <span>
              <strong className="text-[#4b5563] font-semibold">
                Dibandingkan dengan
              </strong>{" "}
              Amanie Advisors
            </span>
            <span>
              <strong className="text-[#4b5563] font-semibold">
                Pertanyaan yang diajukan
              </strong>{" "}
              | 10 prompt dalam 5 tahap customer journey
            </span>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════ */}
      {/* MAIN CONTENT                      */}
      {/* ══════════════════════════════════ */}
      <main
        id="main-content"
        className="max-w-[820px] mx-auto px-8 pb-20 max-sm:px-5"
      >
        {/* ── RINGKASAN EKSEKUTIF ── */}
        <SectionLabel>Ringkasan Eksekutif</SectionLabel>
        <h2 className="font-sans text-[1.7rem] font-bold leading-[1.25] text-[#111] mt-0 mb-6 pb-1.5 border-b border-[#e5e7eb] tracking-tight">
          Temuan tentang bisnis Anda
        </h2>

        <p className="text-[#4b5563] mb-4">
          Semakin banyak orang bertanya ke ChatGPT dan Gemini alih-alih mencari
          di Google. Ketika seseorang bertanya,{" "}
          <em>&ldquo;Konsultan syariah terpercaya untuk fintech di
          Malaysia&rdquo;</em>, AI memberi jawaban berdasarkan informasi yang
          tersedia di internet.
        </p>

        <p className="text-[#4b5563] mb-6">
          <strong className="text-[#111]">
            Kalau brand Anda tidak muncul di jawaban-jawaban itu, brand Anda
            tidak terlihat oleh customer potensial.
          </strong>{" "}
          Laporan ini menunjukkan posisi Anda sekarang dan bagaimana
          meningkatkannya.
        </p>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-5 my-6">
          <Card className="shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-px hover:border-gray-300 transition-all duration-200 border-[#e5e7eb] rounded-lg">
            <CardContent className="p-6">
              <div className="w-[42px] h-[42px] rounded-md bg-accent-soft text-accent flex items-center justify-center text-xl mb-3">
                <IconSearch className="size-5" />
              </div>
              <h3 className="text-base font-semibold text-[#111] mb-1 font-sans">
                Brand Anda bisa ditemukan
              </h3>
              <p className="text-[0.88rem] text-[#4b5563] leading-relaxed">
                ChatGPT menemukan Masryef dan memahami expertise Anda di bidang
                fintech. Brand Anda muncul ketika orang bertanya tentang Islamic
                digital finance.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-px hover:border-gray-300 transition-all duration-200 border-[#e5e7eb] rounded-lg">
            <CardContent className="p-6">
              <div className="w-[42px] h-[42px] rounded-md bg-accent-soft text-accent flex items-center justify-center text-xl mb-3">
                <IconAlertTriangle className="size-5" />
              </div>
              <h3 className="text-base font-semibold text-[#111] mb-1 font-sans">
                Tapi belum direkomendasikan
              </h3>
              <p className="text-[0.88rem] text-[#4b5563] leading-relaxed">
                Ketika seseorang bertanya,{" "}
                <em>
                  &ldquo;Siapa konsultan syariah terbaik di
                  Malaysia?&rdquo;
                </em>{" "}
                Amanie dan firma-firma lama muncul duluan. Brand Anda seringkali
                tidak muncul sama sekali.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-px hover:border-gray-300 transition-all duration-200 border-[#e5e7eb] rounded-lg">
            <CardContent className="p-6">
              <div className="w-[42px] h-[42px] rounded-md bg-accent-soft text-accent flex items-center justify-center text-xl mb-3">
                <IconCircleCheck className="size-5" />
              </div>
              <h3 className="text-base font-semibold text-[#111] mb-1 font-sans">
                Ini bisa diperbaiki
              </h3>
              <p className="text-[0.88rem] text-[#4b5563] leading-relaxed">
                Anda bisa menyusul peringkat teratas dengan strategi konten yang
                tepat. Ini soal{" "}
                <strong>konten dan bukti</strong>, hal-hal yang bisa Anda
                bangun, mulai hari ini.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Temuan Utama */}
        <blockquote className="font-serif italic text-[1.15rem] text-[#4b5563] border-l-[3px] border-accent py-3 pl-7 my-7 leading-[1.55] [&_strong]:not-italic [&_strong]:font-semibold">
          ChatGPT memuji expertise Anda dalam industri fintech. Tapi begitu
          pelanggan membandingkan Anda dengan kompetitor seperti Amanie, firma lain
          yang lebih besar diunggulkan. Brand Anda{" "}
          <strong>kurang punya reputasi di luar website sendiri</strong>.
          Inilah yang membuat brand Anda tertahan di papan tengah.
        </blockquote>

        {/* Lakukan Besok */}
        <Callout
          variant="green"
          icon={IconCircleCheck}
          title="Lakukan Ini Besok"
          cost="Gratis"
        >
          <p>
            <strong>Rapikan kontak detail Anda di semua touchpoint.</strong>{" "}
            Nomor telepon dan alamat kantor Anda belum sinkron di website,
            LinkedIn, dan Google Business Profile. Model AI melihat informasi
            yang tidak sinkron dan bisa memprioritaskan kompetitor yang datanya
            lebih rapi. Pastikan nama, telepon, dan alamat Anda sama persis di
            semua tempat.{" "}
            <strong>
              Ini tindakan yang paling mudah dilakukan namun berdampak paling
              besar dalam laporan ini.
            </strong>
          </p>
        </Callout>

        {/* Sebelum / Sesudah */}
        <h3 className="font-sans text-[1.15rem] font-semibold text-[#111] mt-8 mb-4">
          Apa yang mungkin dicapai dalam 6 bulan
        </h3>
        <div className="grid grid-cols-2 gap-5 my-6 max-sm:grid-cols-1">
          <div className="bg-callout-amber-bg border border-callout-amber-border rounded-md p-5 text-[0.88rem]">
            <strong className="text-[#111] block mb-2 text-[0.95rem]">
              Hari ini
            </strong>
            <table className="w-full text-[0.85rem] mt-3">
              <tbody>
                <tr>
                  <td className="border-none py-1">Skor</td>
                  <td className="border-none py-1 text-right">
                    <StatusPill variant="amber">56</StatusPill>
                  </td>
                </tr>
                <tr>
                  <td className="border-none py-1">Direkomendasikan</td>
                  <td className="border-none py-1 text-right">
                    Hanya spesifik fintech
                  </td>
                </tr>
                <tr>
                  <td className="border-none py-1">vs Amanie</td>
                  <td className="border-none py-1 text-right">
                    Kalah saat head-to-head
                  </td>
                </tr>
                <tr>
                  <td className="border-none py-1">Kontak</td>
                  <td className="border-none py-1 text-right">
                    Tidak sinkron
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="bg-callout-green-bg border border-callout-green-border rounded-md p-5 text-[0.88rem]">
            <strong className="text-[#111] block mb-2 text-[0.95rem]">
              6 bulan ke depan (proyeksi)
            </strong>
            <table className="w-full text-[0.85rem] mt-3">
              <tbody>
                <tr>
                  <td className="border-none py-1">Skor</td>
                  <td className="border-none py-1 text-right">
                    <StatusPill variant="green">72–78</StatusPill>
                  </td>
                </tr>
                <tr>
                  <td className="border-none py-1">Direkomendasikan</td>
                  <td className="border-none py-1 text-right">
                    Fintech + umum
                  </td>
                </tr>
                <tr>
                  <td className="border-none py-1">vs Amanie</td>
                  <td className="border-none py-1 text-right">
                    Kompetitif di fintech
                  </td>
                </tr>
                <tr>
                  <td className="border-none py-1">Kontak</td>
                  <td className="border-none py-1 text-right">
                    Rapi di semua touchpoint
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <Separator className="my-12" />

        {/* ── BAGIAN 1: CARA MEMBACA ── */}
        <SectionLabel>Bagian 1</SectionLabel>
        <h2 className="font-sans text-[1.7rem] font-bold leading-[1.25] text-[#111] mt-0 mb-6 pb-1.5 border-b border-[#e5e7eb] tracking-tight">
          Cara membaca laporan ini
        </h2>

        <h3 className="font-sans text-[1.15rem] font-semibold text-[#111] mt-8 mb-4">
          Bagaimana AI memahami brand Anda
        </h3>
        <p className="text-[#4b5563] mb-6">
          Bayangkan ChatGPT seperti asisten pintar yang:
        </p>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-5 my-6">
          <Card className="shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-px hover:border-gray-300 transition-all duration-200 border-[#e5e7eb] rounded-lg">
            <CardContent className="p-6">
              <div className="w-[42px] h-[42px] rounded-md bg-accent-soft text-accent flex items-center justify-center text-xl mb-3">
                <IconBook className="size-5" />
              </div>
              <h3 className="text-base font-semibold text-[#111] mb-1 font-sans">
                1. Membaca
              </h3>
              <p className="text-[0.88rem] text-[#4b5563] leading-relaxed">
                Ratusan website, daftar bisnis, artikel berita, dan ulasan,
                jauh-jauh hari sebelumnya.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-px hover:border-gray-300 transition-all duration-200 border-[#e5e7eb] rounded-lg">
            <CardContent className="p-6">
              <div className="w-[42px] h-[42px] rounded-md bg-accent-soft text-accent flex items-center justify-center text-xl mb-3">
                <IconBrain className="size-5" />
              </div>
              <h3 className="text-base font-semibold text-[#111] mb-1 font-sans">
                2. Mengingat
              </h3>
              <p className="text-[0.88rem] text-[#4b5563] leading-relaxed">
                Apa yang ia pelajari dari semua sumber itu tentang bisnis
                seperti Anda.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-px hover:border-gray-300 transition-all duration-200 border-[#e5e7eb] rounded-lg">
            <CardContent className="p-6">
              <div className="w-[42px] h-[42px] rounded-md bg-accent-soft text-accent flex items-center justify-center text-xl mb-3">
                <IconMessageCircle2 className="size-5" />
              </div>
              <h3 className="text-base font-semibold text-[#111] mb-1 font-sans">
                3. Menjawab
              </h3>
              <p className="text-[0.88rem] text-[#4b5563] leading-relaxed">
                Pertanyaan pelanggan Anda menggunakan ingatan itu, bukan
                dengan mengecek sesuatu secara langsung.
              </p>
            </CardContent>
          </Card>
        </div>

        <p className="text-[#4b5563] mb-6">
          <strong className="text-[#111]">
            Reputasi brand Anda di mata ChatGPT ditentukan oleh apa yang model AI
            pelajari tentang brand Anda dari internet.
          </strong>{" "}
          Laporan ini menjelaskan apa yang model AI tersebut pelajari, apa
          maknanya, dan bagaimana meningkatkannya.
        </p>

        <h3 className="font-sans text-[1.15rem] font-semibold text-[#111] mt-8 mb-4">
          Empat hal yang kami ukur
        </h3>
        <table className="w-full border-collapse my-6 text-[0.9rem]">
          <thead>
            <tr>
              <th className="text-left text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[#6b7280] px-3 py-2.5 border-b-2 border-[#e5e7eb] bg-[#f8fafc]">
                Level
              </th>
              <th className="text-left text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[#6b7280] px-3 py-2.5 border-b-2 border-[#e5e7eb] bg-[#f8fafc]">
                Artinya
              </th>
              <th className="text-left text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[#6b7280] px-3 py-2.5 border-b-2 border-[#e5e7eb] bg-[#f8fafc]">
                Pertanyaan sederhana
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="hover:bg-[#fafafa] transition-colors">
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]">
                1. Ditemukan
              </td>
              <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                Apakah AI tahu eksistensi brand Anda?
              </td>
              <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                &ldquo;Apakah mereka pernah dengar tentang saya?&rdquo;
              </td>
            </tr>
            <tr className="hover:bg-[#fafafa] transition-colors">
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]">
                2. Dideskripsikan dengan benar
              </td>
              <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                Apakah detail Anda akurat?
              </td>
              <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                &ldquo;Apakah fakta tentang saya benar?&rdquo;
              </td>
            </tr>
            <tr className="hover:bg-[#fafafa] transition-colors">
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]">
                3. Direkomendasikan
              </td>
              <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                Apakah AI menyarankan Anda?
              </td>
              <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                &ldquo;Apakah AI merekomendasikan untuk memilih brand
                Anda?&rdquo;
              </td>
            </tr>
            <tr className="hover:bg-[#fafafa] transition-colors">
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]">
                4. Seberapa sering vs. kompetitor
              </td>
              <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                Apakah Anda muncul sesering pemain lain?
              </td>
              <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                &ldquo;Apakah brand saya sering disebut seperti kompetitor
                saya?&rdquo;
              </td>
            </tr>
          </tbody>
        </table>

        <Separator className="my-12" />

        {/* ── BAGIAN 2: KARTU SKOR ── */}
        <SectionLabel>Bagian 2</SectionLabel>
        <h2 className="font-sans text-[1.7rem] font-bold leading-[1.25] text-[#111] mt-0 mb-6 pb-1.5 border-b border-[#e5e7eb] tracking-tight">
          Kartu Skor Anda
        </h2>

        <table className="w-full border-collapse my-6 text-[0.9rem]">
          <thead>
            <tr>
              <th className="text-left text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[#6b7280] px-3 py-2.5 border-b-2 border-[#e5e7eb] bg-[#f8fafc]">
                Level
              </th>
              <th className="text-left text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[#6b7280] px-3 py-2.5 border-b-2 border-[#e5e7eb] bg-[#f8fafc]">
                Hasil Anda
              </th>
              <th className="text-left text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[#6b7280] px-3 py-2.5 border-b-2 border-[#e5e7eb] bg-[#f8fafc]">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="hover:bg-[#fafafa] transition-colors">
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]">
                1. Ditemukan
              </td>
              <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                Ya, dikenal di Malaysia dan Dubai
              </td>
              <td className="p-3 border-b border-[#f1f5f9]">
                <StatusPill variant="green">
                  <IconCircleCheck className="size-3" /> Baik
                </StatusPill>
              </td>
            </tr>
            <tr className="hover:bg-[#fafafa] transition-colors">
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]">
                2. Dideskripsikan dengan benar
              </td>
              <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                Layanan Anda unggul, tapi{" "}
                <strong>detail kontak tidak sinkron</strong> di berbagai sumber
              </td>
              <td className="p-3 border-b border-[#f1f5f9]">
                <StatusPill variant="amber">
                  <IconAlertTriangle className="size-3" /> Perlu perbaikan
                </StatusPill>
              </td>
            </tr>
            <tr className="hover:bg-[#fafafa] transition-colors">
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]">
                3. Direkomendasikan
              </td>
              <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                <strong>
                  Hanya di pertanyaan spesifik fintech dan digital
                </strong>
              </td>
              <td className="p-3 border-b border-[#f1f5f9]">
                <StatusPill variant="amber">
                  <IconAlertTriangle className="size-3" /> Sempit
                </StatusPill>
              </td>
            </tr>
            <tr className="hover:bg-[#fafafa] transition-colors">
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]">
                4. Seberapa sering vs. kompetitor
              </td>
              <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                <strong>Sekitar 6× lebih jarang</strong> dibanding Amanie di
                pencarian umum
              </td>
              <td className="p-3 border-b border-[#f1f5f9]">
                <StatusPill variant="red">
                  <IconCircleX className="size-3" /> Ketertinggalan
                </StatusPill>
              </td>
            </tr>
          </tbody>
        </table>

        <h3 className="font-sans text-[1.15rem] font-semibold text-[#111] mt-8 mb-4">
          Kompetitor Anda dalam konteks
        </h3>
        <p className="text-[#4b5563] mb-4">
          Kami menjalankan pertanyaan yang sama untuk Amanie Advisors. Berikut
          perbandingan jujurnya:
        </p>

        <table className="w-full border-collapse my-6 text-[0.9rem]">
          <thead>
            <tr>
              <th className="text-left text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[#6b7280] px-3 py-2.5 border-b-2 border-[#e5e7eb] bg-[#f8fafc]"></th>
              <th className="text-left text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[#6b7280] px-3 py-2.5 border-b-2 border-[#e5e7eb] bg-[#f8fafc]">
                Masryef
              </th>
              <th className="text-left text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[#6b7280] px-3 py-2.5 border-b-2 border-[#e5e7eb] bg-[#f8fafc]">
                Amanie Advisors
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="hover:bg-[#fafafa] transition-colors">
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#6b7280] w-[30%]">
                Berdiri sejak
              </td>
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]">
                2018
              </td>
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]">
                2005
              </td>
            </tr>
            <tr className="hover:bg-[#fafafa] transition-colors">
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#6b7280]">
                Ulama utama
              </td>
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]">
                Komite 3 ulama global
              </td>
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]">
                Tan Sri Dr Mohd Daud Bakar (terkenal di dunia)
              </td>
            </tr>
            <tr className="hover:bg-[#fafafa] transition-colors">
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#6b7280]">
                Kantor
              </td>
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]">
                KL + kehadiran di Dubai
              </td>
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]">
                Dubai (DIFC), KL, London
              </td>
            </tr>
            <tr className="hover:bg-[#fafafa] transition-colors">
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#6b7280]">
                Klien yang disebutkan di website
              </td>
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]">
                Hanya kategori
              </td>
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]">
                AmundiIslamic, TabungHaji, Franklin Templeton…
              </td>
            </tr>
            <tr className="hover:bg-[#fafafa] transition-colors">
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#6b7280]">
                Penyebutan AI (Anda vs. mereka)
              </td>
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]">
                ~1 untuk setiap 6 milik Amanie
              </td>
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]">
                Dominan
              </td>
            </tr>
            <tr className="hover:bg-[#fafafa] transition-colors">
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#6b7280]">
                Di mana Anda unggul
              </td>
              <td className="p-3 border-b border-[#f1f5f9] font-semibold text-[#059669]">
                Fintech &amp; digital: spesialisasi Anda
              </td>
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]">
                Umum &amp; institusional: skala mereka
              </td>
            </tr>
          </tbody>
        </table>

        <blockquote className="font-serif italic text-[1.15rem] text-[#4b5563] border-l-[3px] border-accent py-3 pl-7 my-7 leading-[1.55] [&_strong]:not-italic [&_strong]:font-semibold">
          Amanie adalah kompetitor kelas berat dengan pengalaman selama 21
          tahun, pendiri yang terkenal, dan klien-klien top tier. Sudah
          sewajarnya mereka mendominasi pencarian.{" "}
          <strong>
            Anda mengalahkan mereka di satu hal yang jadi fondasi brand Anda,
            yaitu konsultan syariah modern, digital, dan fintech-first.
          </strong>{" "}
          Rencana di bawah ini menutup celah pembuktian dan memastikan
          spesialisasi Anda jadi yang ditanyakan pelanggan.
        </blockquote>

        <Separator className="my-12" />

        {/* ── BAGIAN 3: HASIL SEKILAS ── */}
        <SectionLabel>Bagian 3</SectionLabel>
        <h2 className="font-sans text-[1.7rem] font-bold leading-[1.25] text-[#111] mt-0 mb-6 pb-1.5 border-b border-[#e5e7eb] tracking-tight">
          Ringkasan
        </h2>
        <p className="text-[#4b5563] mb-6">
          Kami mengajukan 10 pertanyaan ke ChatGPT yang menyerupai pertanyaan
          calon pelanggan Anda. Ada 5 tahap pertanyaan sesuai customer journey
          pelanggan. Masing-masing tahap terdiri dari 2 pertanyaan: pertanyaan
          tanpa menyebut brand Anda (yang ditanyakan calon pelanggan baru) dan
          pertanyaan yang menyebut brand Anda (yang ditanyakan pelanggan yang
          sudah mengenal Anda).
        </p>

        <table className="w-full border-collapse my-6 text-[0.9rem]">
          <thead>
            <tr>
              <th className="text-left text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[#6b7280] px-3 py-2.5 border-b-2 border-[#e5e7eb] bg-[#f8fafc]">
                Tahap
              </th>
              <th className="text-left text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[#6b7280] px-3 py-2.5 border-b-2 border-[#e5e7eb] bg-[#f8fafc]">
                Apakah Anda muncul?
              </th>
              <th className="text-left text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[#6b7280] px-3 py-2.5 border-b-2 border-[#e5e7eb] bg-[#f8fafc]">
                Apakah Anda direkomendasikan?
              </th>
              <th className="text-left text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[#6b7280] px-3 py-2.5 border-b-2 border-[#e5e7eb] bg-[#f8fafc]"></th>
            </tr>
          </thead>
          <tbody>
            <tr className="hover:bg-[#fafafa] transition-colors">
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]">
                1. Mempelajari masalahnya
              </td>
              <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                Ya
              </td>
              <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                Sering disebut pertama
              </td>
              <td className="p-3 border-b border-[#f1f5f9]">
                <StatusPill variant="green">
                  <IconCircleCheck className="size-3" />
                </StatusPill>
              </td>
            </tr>
            <tr className="hover:bg-[#fafafa] transition-colors">
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]">
                2. Mencari siapa yang bisa membantu
              </td>
              <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                Ya, tapi hanya di fintech
              </td>
              <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                Tergantung cara bertanya
              </td>
              <td className="p-3 border-b border-[#f1f5f9]">
                <StatusPill variant="amber">
                  <IconAlertTriangle className="size-3" />
                </StatusPill>
              </td>
            </tr>
            <tr className="hover:bg-[#fafafa] transition-colors">
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]">
                3. Membandingkan pilihan
              </td>
              <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                Jarang
              </td>
              <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                Kalah dari nama besar
              </td>
              <td className="p-3 border-b border-[#f1f5f9]">
                <StatusPill variant="red">
                  <IconCircleX className="size-3" />
                </StatusPill>
              </td>
            </tr>
            <tr className="hover:bg-[#fafafa] transition-colors">
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]">
                4. Mengecek kredibilitas Anda
              </td>
              <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                Ya
              </td>
              <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                Baik tapi buktinya tipis
              </td>
              <td className="p-3 border-b border-[#f1f5f9]">
                <StatusPill variant="amber">
                  <IconAlertTriangle className="size-3" />
                </StatusPill>
              </td>
            </tr>
            <tr className="hover:bg-[#fafafa] transition-colors">
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]">
                5. Siap menghubungi
              </td>
              <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                Jarang
              </td>
              <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                Tidak disebut sebagai kontak yang bisa dihubungi
              </td>
              <td className="p-3 border-b border-[#f1f5f9]">
                <StatusPill variant="red">
                  <IconCircleX className="size-3" />
                </StatusPill>
              </td>
            </tr>
          </tbody>
        </table>

        <blockquote className="font-serif italic text-[1.15rem] text-[#4b5563] border-l-[3px] border-accent py-3 pl-7 my-7 leading-[1.55] [&_strong]:not-italic [&_strong]:font-semibold">
          Brand Anda unggul di momen ketika orang sedang belajar. Tapi kalah di
          momen ketika mereka memutuskan siapa yang akan dipakai.{" "}
          <strong>
            Peluang terbesarnya ada di tahap 3&ndash;5, dan di situlah fokus
            perbaikan Anda.
          </strong>
        </blockquote>

        <Separator className="my-12" />

        {/* ── TAHAP 1 ── */}
        <SectionLabel>Bagian 4</SectionLabel>
        <h2 className="font-sans text-[1.7rem] font-bold leading-[1.25] text-[#111] mt-0 mb-6 pb-1.5 border-b border-[#e5e7eb] tracking-tight">
          Tahap 1: Mempelajari masalahnya
        </h2>
        <div className="flex items-center gap-3.5 mb-5">
          <StageNum variant="green">1</StageNum>
          <div className="font-sans text-[1.1rem] font-semibold text-[#111]">
            Calon pelanggan Anda belum yakin apakah mereka perlu konsultan
            syariah.
          </div>
        </div>

        <PromptBox
          label="Pertanyaan A: tanpa nama Anda"
          icon={IconMessage}
        >
          &ldquo;Kalau kami platform pinjaman digital di Malaysia, apakah kami
          perlu konsultan syariah, dan apa saja yang tercakup?&rdquo;
        </PromptBox>

        <ResponseBox label="Respons AI">
          &ldquo;Ya. Di Malaysia, produk apa pun yang dipasarkan sebagai patuh
          syariah memerlukan konsultasi dan endorsement syariah yang tepat. Ini
          mencakup structuring, tinjauan komite syariah, dokumentasi, dan audit
          berkelanjutan.{" "}
          <strong>
            Firma seperti Masryef dan Amanie Advisors sama-sama menawarkan ini
            di Malaysia.
          </strong>
          &rdquo;
        </ResponseBox>

        <PromptBox
          label="Pertanyaan B: dengan nama Anda"
          icon={IconMessage}
        >
          &ldquo;Layanan konsultan syariah seperti apa yang biasanya dibutuhkan
          fintech di Malaysia, dan bagaimana pendekatan Masryef terhadap
          ini?&rdquo;
        </PromptBox>

        <ResponseBox label="Respons AI">
          &ldquo;Masryef, sebagai firma konsultan syariah butik, menawarkan
          layanan terstruktur untuk perusahaan fintech termasuk structuring
          produk, tinjauan syariah, dokumentasi, dan audit kepatuhan
          berkelanjutan. Positioning digital-first dan status panel MDEC
          membuat mereka sangat cocok untuk penugasan fintech di
          Malaysia.&rdquo;
        </ResponseBox>

        <Callout
          variant="green"
          icon={IconCircleCheck}
          title="Kabar baik"
        >
          <p>
            Anda dipandang sebagai sumber yang berpengetahuan. Ketika seseorang
            baru mulai belajar, nama Anda muncul secara alami. Website Anda
            menjelaskan dengan gamblang apa itu konsultan syariah dan kenapa
            penting. Model AI memperlakukan Anda sebagai referensi yang
            edukatif.{" "}
            <strong>
              Ini adalah bagian terkuat dari kehadiran AI Anda.
            </strong>
          </p>
        </Callout>

        {/* ── TAHAP 2 ── */}
        <SectionLabel>Bagian 5</SectionLabel>
        <h2 className="font-sans text-[1.7rem] font-bold leading-[1.25] text-[#111] mt-0 mb-6 pb-1.5 border-b border-[#e5e7eb] tracking-tight">
          Tahap 2: Mencari siapa yang bisa membantu
        </h2>
        <div className="flex items-center gap-3.5 mb-5">
          <StageNum variant="amber">2</StageNum>
          <div className="font-sans text-[1.1rem] font-semibold text-[#111]">
            Calon pelanggan Anda sudah tahu mereka butuh bantuan. Kini mereka
            mencari siapa yang menangani ini.
          </div>
        </div>

        <PromptBox
          label="Pertanyaan A: tanpa nama Anda"
          icon={IconMessage}
        >
          &ldquo;Siapa firma konsultan syariah terbaik untuk fintech atau bank
          digital di Malaysia tahun 2026?&rdquo;
        </PromptBox>

        <ResponseBox label="Respons AI">
          &ldquo;Firma konsultan syariah terkemuka di Malaysia termasuk Amanie
          Advisors, firma global besar yang didirikan oleh Tan Sri Dr Mohd
          Daud Bakar; ISRA Consulting; dan{" "}
          <strong>
            Masryef, butik yang dikenal kuat di bidang fintech Islam dan
            keuangan digital.
          </strong>{" "}
          Untuk pekerjaan spesifik fintech, Masryef sering disebut.&rdquo;
        </ResponseBox>

        <PromptBox
          label="Pertanyaan B: dengan nama Anda"
          icon={IconMessage}
        >
          &ldquo;Apakah Masryef pilihan yang baik untuk konsultan syariah bagi
          fintech Malaysia di tahun 2026?&rdquo;
        </PromptBox>

        <ResponseBox label="Respons AI">
          &ldquo;Ya. Masryef adalah firma konsultan syariah terdaftar di
          Securities Commission Malaysia dan panel penasihat syariah untuk
          MDEC. Telah menasihati 100+ klien termasuk 40+ lembaga keuangan
          Malaysia, mendukung transaksi patuh syariah senilai lebih dari RM15
          miliar. Untuk fintech dan keuangan digital secara khusus, Masryef
          adalah salah satu opsi spesialis terkuat di Malaysia.&rdquo;
        </ResponseBox>

        <Callout variant="amber" icon={IconAlertTriangle} title="Campuran">
          <p>
            <strong>Anda unggul di ceruk.</strong> Ketika pertanyaannya sempit
            tentang fintech, ChatGPT menyebut Anda dengan nyaman.{" "}
            <strong>Anda kalah di pertanyaan luas.</strong> Ketika seseorang
            bertanya &ldquo;Siapa konsultan syariah terbaik?&rdquo; secara
            umum, Amanie muncul duluan. Karena memang lebih banyak informasi
            tentang mereka di internet.{" "}
            <em>(Lihat Tindakan 3 &amp; 4 di rencana aksi.)</em>
          </p>
        </Callout>

        {/* ── TAHAP 3 ── */}
        <SectionLabel>Bagian 6</SectionLabel>
        <h2 className="font-sans text-[1.7rem] font-bold leading-[1.25] text-[#111] mt-0 mb-6 pb-1.5 border-b border-[#e5e7eb] tracking-tight">
          Tahap 3: Membandingkan pilihan mereka
        </h2>
        <div className="flex items-center gap-3.5 mb-5">
          <StageNum variant="red">3</StageNum>
          <div className="font-sans text-[1.1rem] font-semibold text-[#111]">
            Calon pelanggan Anda sedang memilih antara Anda dan Amanie.{" "}
            <strong>Di sinilah pelanggan dimenangkan atau hilang.</strong>
          </div>
        </div>

        <PromptBox
          label="Pertanyaan A: tanpa nama Anda"
          icon={IconMessage}
        >
          &ldquo;Apa yang harus saya cari ketika memilih firma konsultan
          syariah untuk fintech Islam di Malaysia?&rdquo;
        </PromptBox>

        <ResponseBox label="Respons AI">
          &ldquo;Ketika memilih firma konsultan syariah untuk fintech Islam di
          Malaysia, perhatikan: (1) registrasi di Securities Commission, (2)
          pengalaman spesifik di fintech dan keuangan digital, (3) komite
          syariah yang mumpuni, (4) rekam jejak dengan klien berukuran serupa,
          dan (5) penghargaan atau pengakuan industri. Firma seperti Amanie
          Advisors dan Masryef memenuhi banyak kriteria ini, dengan Masryef
          menawarkan fokus fintech yang lebih spesialis.&rdquo;
        </ResponseBox>

        <PromptBox
          label="Pertanyaan B: dengan nama Anda"
          icon={IconMessage}
        >
          &ldquo;Bandingkan Masryef vs Amanie Advisors. Untuk perusahaan
          fintech Islam di Malaysia, mana mitra konsultan syariah yang lebih
          baik?&rdquo;
        </PromptBox>

        <ResponseBox label="Respons AI">
          &ldquo;Amanie Advisors adalah firma global yang sudah lama berdiri
          (didirikan 2005) dengan ulama pendiri yang sangat terkenal, kantor di
          Dubai, KL, dan London. Masryef adalah butik yang lebih muda (berdiri
          2018) dengan kredibilitas spesialis yang kuat di bidang fintech Islam
          dan keuangan digital, 100+ proyek, dan penghargaan termasuk IFN
          &lsquo;Best Islamic Finance Consultancy&rsquo; 2024 &amp; 2025.{" "}
          <strong>
            Untuk pekerjaan murni fintech dan inovasi digital, Masryef sering
            kali adalah pasangan yang lebih terspesialisasi dan lincah.
          </strong>
          &rdquo;
        </ResponseBox>

        <Callout
          variant="red"
          icon={IconCircleX}
          title="Di sinilah Anda kehilangan pelanggan"
        >
          <p>
            ChatGPT bersikap adil. Ia mengakui kekuatan fintech Anda. Tapi{" "}
            <strong>Amanie disebut duluan, dengan detail yang lebih
            banyak.</strong> Dalam jawaban AI, siapa pun yang disebut pertama
            dan dijelaskan paling rinci dianggap sebagai pemenang. Dua celah
            menahan Anda:
          </p>
          <p>
            <strong>1. Klien yang disebutkan.</strong> Amanie mencantumkan
            klien berdasarkan nama (TabungHaji, Franklin Templeton). Anda
            mencantumkan kategori. AI percaya pada nama, bukan kategori.
            <br />
            <strong>2. Identitas ulama.</strong> Amanie memimpin dengan ulama
            yang mendunia. Komite Anda ada tapi kurang dibicarakan di internet.{" "}
            <em>(Lihat Tindakan 2 &amp; 5.)</em>
          </p>
        </Callout>

        {/* ── TAHAP 4 ── */}
        <SectionLabel>Bagian 7</SectionLabel>
        <h2 className="font-sans text-[1.7rem] font-bold leading-[1.25] text-[#111] mt-0 mb-6 pb-1.5 border-b border-[#e5e7eb] tracking-tight">
          Tahap 4: Mengecek kredibilitas Anda
        </h2>
        <div className="flex items-center gap-3.5 mb-5">
          <StageNum variant="amber">4</StageNum>
          <div className="font-sans text-[1.1rem] font-semibold text-[#111]">
            Calon pelanggan Anda sedang memverifikasi kredensial Anda sebelum
            memutuskan.
          </div>
        </div>

        <PromptBox
          label="Pertanyaan A: tanpa nama Anda"
          icon={IconMessage}
        >
          &ldquo;Bagaimana cara memverifikasi kredibilitas firma konsultan
          syariah di Malaysia?&rdquo;
        </PromptBox>

        <ResponseBox label="Respons AI">
          &ldquo;Untuk memverifikasi firma konsultan syariah di Malaysia,
          periksa: (1) registrasi di Securities Commission Malaysia, (2)
          kualifikasi anggota komite syariah mereka, (3) rekam jejak dan
          riwayat klien, (4) penghargaan dan pengakuan industri, dan (5)
          ulasan atau testimoni independen dari klien sebelumnya. Firma seperti
          Masryef, misalnya, terdaftar di SC dan telah memenangkan beberapa
          penghargaan IFN.&rdquo;
        </ResponseBox>

        <PromptBox
          label="Pertanyaan B: dengan nama Anda"
          icon={IconMessage}
        >
          &ldquo;Apakah Masryef firma konsultan syariah yang sah dan bereputasi?
          Bagaimana rekam jejak dan status regulasinya?&rdquo;
        </PromptBox>

        <ResponseBox label="Respons AI">
          &ldquo;Ya. Masryef adalah perusahaan konsultan syariah terdaftar di
          Securities Commission Malaysia, panel penasihat syariah untuk MDEC.
          Telah menasihati 100+ klien termasuk 40+ lembaga keuangan Malaysia,
          mendukung transaksi patuh syariah senilai lebih dari RM15 miliar,
          dengan tingkat retensi klien di atas 90%. Telah memenangkan beberapa
          penghargaan IFN.&rdquo;
        </ResponseBox>

        <Callout
          variant="amber"
          icon={IconAlertTriangle}
          title="Baik, tapi tipis"
        >
          <p>
            Kredensial Anda terverifikasi dengan baik. Tapi model AI hanya
            mengulang klaim Anda <em>sendiri</em> dari website Anda sendiri.
            Ia tidak menemukan suara independen. Tidak ada artikel berita,
            testimoni pelanggan, atau bukti pihak ketiga.{" "}
            <strong>
              Model AI lebih percaya sumber independen daripada apa yang Anda
              katakan tentang diri sendiri.
            </strong>{" "}
            <em>(Lihat Tindakan 6.)</em>
          </p>
        </Callout>

        {/* ── TAHAP 5 ── */}
        <SectionLabel>Bagian 8</SectionLabel>
        <h2 className="font-sans text-[1.7rem] font-bold leading-[1.25] text-[#111] mt-0 mb-6 pb-1.5 border-b border-[#e5e7eb] tracking-tight">
          Tahap 5: Siap menghubungi
        </h2>
        <div className="flex items-center gap-3.5 mb-5">
          <StageNum variant="red">5</StageNum>
          <div className="font-sans text-[1.1rem] font-semibold text-[#111]">
            Calon pelanggan Anda siap menelepon.{" "}
            <strong>
              Di sinilah telepon berdering, atau tidak sama sekali.
            </strong>
          </div>
        </div>

        <PromptBox
          label="Pertanyaan A: tanpa nama Anda"
          icon={IconMessage}
        >
          &ldquo;Bagaimana cara menggunakan jasa firma konsultan syariah untuk
          mensertifikasi produk tabungan digital Islam baru kami di
          Malaysia?&rdquo;
        </PromptBox>

        <ResponseBox label="Respons AI">
          &ldquo;Untuk menggunakan jasa firma konsultan syariah, Anda biasanya
          mengajukan proposal produk.{" "}
          <strong>
            Firma yang bisa Anda hubungi termasuk Amanie Advisors
            (Dubai/KL/London) dan ISRA Consulting.
          </strong>{" "}
          Hubungi kantor mereka melalui website masing-masing untuk
          proposal.&rdquo;
        </ResponseBox>

        <PromptBox
          label="Pertanyaan B: dengan nama Anda"
          icon={IconMessage}
        >
          &ldquo;Bagaimana cara menghubungi Masryef untuk mendiskusikan
          konsultan syariah bagi produk fintech kami?&rdquo;
        </PromptBox>

        <ResponseBox label="Respons AI">
          &ldquo;Anda dapat menghubungi Masryef Advisory Sdn Bhd melalui website
          mereka di masryef.com atau lewat telepon. Namun, detail kontak mereka
          tampak berbeda di berbagai sumber. Nomor telepon tertera sebagai +603
          2697 2692 di satu tempat dan 03-2770 8703 di tempat lain. Alamat
          kantor mereka berbeda-beda antar daftar. Sebaiknya gunakan formulir
          kontak di website resmi mereka untuk koneksi yang paling
          andal.&rdquo;
        </ResponseBox>

        <Callout
          variant="red"
          icon={IconCircleX}
          title="Inilah celahnya"
        >
          <p>
            Di momen ketika seseorang siap menghubungi,{" "}
            <strong>
              Anda tidak disebut sebagai bisnis yang bisa dikontak.
            </strong>{" "}
            Firma lain, bahkan yang tidak Anda anggap kompetitor, ikut
            tercantum.
          </p>
        </Callout>

        <Callout
          variant="green"
          icon={IconCircleCheck}
          title="Masalah yang spesifik dan bisa diperbaiki (perbaikan termurah di laporan ini)"
          cost="Gratis"
        >
          <p>
            Di berbagai sumber yang kami periksa, detail kontak Anda tidak
            sinkron:
          </p>
          <p>
            <IconPhone className="inline size-3.5 text-[#6b7280] align-[-1px]" />{" "}
            Telepon: <code>+603 2697 2692</code> di satu tempat,{" "}
            <code>03-2770 8703</code> di tempat lain.
            <br />
            <IconMapPin className="inline size-3.5 text-[#6b7280] align-[-1px]" />{" "}
            Alamat: Deskripsi yang berbeda untuk kantor KL Eco City Anda di
            berbagai daftar.
            <br />
            <IconBuilding className="inline size-3.5 text-[#6b7280] align-[-1px]" />{" "}
            Nama: &ldquo;Masryef,&rdquo; &ldquo;Masryef Advisory Sdn
            Bhd,&rdquo; dan &ldquo;MASRYEF&rdquo;, tidak konsisten.
          </p>
          <p>
            Setiap ketidakcocokan membuat model AI sedikit kurang yakin tentang
            Anda. Di titik kritis, ia mengganti Anda dengan kompetitor yang
            datanya lebih rapi.{" "}
            <strong>Betulkan ini hari ini.</strong>
          </p>
        </Callout>

        <Separator className="my-12" />

        {/* ── BAGIAN 9: RENCANA AKSI ── */}
        <SectionLabel>Bagian 9</SectionLabel>
        <h2 className="font-sans text-[1.7rem] font-bold leading-[1.25] text-[#111] mt-0 mb-6 pb-1.5 border-b border-[#e5e7eb] tracking-tight">
          Rencana Aksi Anda
        </h2>
        <p className="text-[#4b5563] mb-6">
          Diurutkan berdasarkan <strong>usaha ↓ &amp; dampak ↑</strong>. Mulai
          dari atas, kerjakan ke bawah.
        </p>

        <h3 className="font-sans text-[1.15rem] font-semibold text-[#111] mt-8 mb-4">
          Kemenangan cepat (bulan ini)
        </h3>

        <div className="border-l-[3px] border-[#e5e7eb] hover:border-accent pl-6 py-2 mb-6 transition-colors duration-200">
          <h3 className="font-sans text-base font-semibold text-[#111] flex items-center gap-1.5 mt-0 mb-1">
            <IconCircleCheck className="size-4 text-[#166534]" />
            Tindakan 1: Rapikan kontak detail Anda di semua touchpoint{" "}
            <CostBadge tier="Gratis" />
          </h3>
          <p className="text-[0.9rem] text-[#4b5563]">
            Pastikan nama, telepon, dan alamat Anda{" "}
            <strong>sama persis</strong> di website, LinkedIn, Google Business
            Profile, dan setiap direktori. Pilih satu format dan pakai di
            semua tempat. Buat Google Business Profile kalau belum punya.{" "}
            <em>
              Ini tindakan yang paling mudah dilakukan namun berdampak paling
              besar dalam laporan ini.
            </em>
          </p>
        </div>

        <div className="border-l-[3px] border-[#e5e7eb] hover:border-accent pl-6 py-2 mb-6 transition-colors duration-200">
          <h3 className="font-sans text-base font-semibold text-[#111] flex items-center gap-1.5 mt-0 mb-1">
            <IconCircleCheck className="size-4 text-[#166534]" />
            Tindakan 2: Tambahkan nama klien dan profil lengkap ulama ke
            website Anda <CostBadge tier="Gratis" />
          </h3>
          <p className="text-[0.9rem] text-[#4b5563]">
            Ubah &ldquo;bank, fintech, manajer dana&rdquo; menjadi{" "}
            <strong>studi kasus dengan nama</strong> (dengan izin). Beri setiap
            anggota komite syariah halaman profil lengkap. Model AI lebih
            percaya bukti spesifik dengan nama daripada kategori. Inilah alasan
            terbesar Anda kalah dalam perbandingan melawan Amanie.
          </p>
        </div>

        <h3 className="font-sans text-[1.15rem] font-semibold text-[#111] mt-10 mb-4">
          Strategi berdampak besar (90 hari ke depan)
        </h3>

        <div className="border-l-[3px] border-[#e5e7eb] hover:border-accent pl-6 py-2 mb-6 transition-colors duration-200">
          <h3 className="font-sans text-base font-semibold text-[#111] flex items-center gap-1.5 mt-0 mb-1">
            Tindakan 3: Buat konten yang menghubungkan Anda ke topik syariah
            yang lebih luas <CostBadge tier="Gratis" />
          </h3>
          <p className="text-[0.9rem] text-[#4b5563]">
            Tulislah tentang sukuk, Takaful, manajemen dana, bukan hanya
            fintech. Publikasikan di website dan LinkedIn. Saat ini brand Anda
            hanya muncul di pertanyaan fintech. Konten yang lebih luas membuat
            Anda terlihat juga di pencarian umum.
          </p>
        </div>

        <div className="border-l-[3px] border-[#e5e7eb] hover:border-accent pl-6 py-2 mb-6 transition-colors duration-200">
          <h3 className="font-sans text-base font-semibold text-[#111] flex items-center gap-1.5 mt-0 mb-1">
            Tindakan 4: Dapatkan penyebutan di luar website Anda sendiri{" "}
            <CostBadge tier="Berbiaya" />
          </h3>
          <p className="text-[0.9rem] text-[#4b5563]">
            Tulis artikel untuk publikasi keuangan Islam. Bicara di acara
            industri. Dapatkan profil di daftar &ldquo;konsultan syariah
            teratas.&rdquo; Suara independen adalah yang menggerakkan model AI
            dari sekadar mengulang klaim Anda menjadi benar-benar mendukung
            Anda.
          </p>
        </div>

        <div className="border-l-[3px] border-[#e5e7eb] hover:border-accent pl-6 py-2 mb-6 transition-colors duration-200">
          <h3 className="font-sans text-base font-semibold text-[#111] flex items-center gap-1.5 mt-0 mb-1">
            Tindakan 5: Jaga website Anda tetap segar{" "}
            <CostBadge tier="Gratis" />
          </h3>
          <p className="text-[0.9rem] text-[#4b5563]">
            Perbarui website Anda setiap bulan dengan proyek, penghargaan, dan
            wawasan baru. Model AI memperlakukan brand yang rutin diperbarui
            sebagai lebih relevan dan terpercaya.
          </p>
        </div>

        <div className="border-l-[3px] border-[#e5e7eb] hover:border-accent pl-6 py-2 mb-6 transition-colors duration-200">
          <h3 className="font-sans text-base font-semibold text-[#111] flex items-center gap-1.5 mt-0 mb-1">
            Tindakan 6: Kumpulkan dan publikasikan bukti dari pelanggan Anda{" "}
            <CostBadge tier="Gratis" />
          </h3>
          <p className="text-[0.9rem] text-[#4b5563]">
            Kumpulkan testimoni, studi kasus singkat, dan hasil
            sebelum-sesudah. Pelanggan yang mengatakan &ldquo;Masryef
            melakukan pekerjaan hebat untuk kami&rdquo; lebih berharga bagi
            model AI daripada apa pun yang Anda katakan tentang diri sendiri.
          </p>
        </div>

        <h3 className="font-sans text-[1.15rem] font-semibold text-[#111] mt-10 mb-4">
          Tempat belajar lebih lanjut (semua gratis)
        </h3>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-5 my-6">
          <Card className="shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-px hover:border-gray-300 transition-all duration-200 border-[#e5e7eb] rounded-lg">
            <CardContent className="p-6">
              <h3 className="text-base font-semibold text-[#111] mb-1 font-sans">
                Google Business Profile
              </h3>
              <p className="text-[0.88rem] text-[#4b5563] leading-relaxed">
                Buat atau klaim profil Anda. Google memberikan tips sederhana
                untuk meningkatkannya.
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-px hover:border-gray-300 transition-all duration-200 border-[#e5e7eb] rounded-lg">
            <CardContent className="p-6">
              <h3 className="text-base font-semibold text-[#111] mb-1 font-sans">
                Halaman perusahaan LinkedIn
              </h3>
              <p className="text-[0.88rem] text-[#4b5563] leading-relaxed">
                Posting penghargaan, klien baru, dan wawasan secara rutin.
                Konten LinkedIn banyak dibaca oleh model AI.
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-px hover:border-gray-300 transition-all duration-200 border-[#e5e7eb] rounded-lg">
            <CardContent className="p-6">
              <h3 className="text-base font-semibold text-[#111] mb-1 font-sans">
                Publikasi industri
              </h3>
              <p className="text-[0.88rem] text-[#4b5563] leading-relaxed">
                Tercantum di satu saja artikel &ldquo;konsultan syariah
                teratas&rdquo; sudah menjadi sinyal pihak ketiga yang
                terpercaya.
              </p>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-12" />

        {/* ── LAMPIRAN A ── */}
        <div className="bg-[#f8fafc] border border-slate-200 rounded-lg p-8 my-8">
          <h2 className="font-sans text-[1.2rem] font-bold text-[#111] mt-0 mb-4 border-0 pb-0">
            Lampiran A: Bagaimana kami mendapatkan hasil ini
          </h2>
          <p className="text-[#4b5563] mb-3">
            <strong>Apa yang kami lakukan:</strong> Kami mengambil detail
            brand Anda, membuat 10 pertanyaan yang mencerminkan apa yang akan
            ditanyakan pelanggan sungguhan ke ChatGPT di setiap tahap customer
            journey, mengajukan pertanyaan-pertanyaan itu, dan menilai
            jawabannya di empat level: Ditemukan → Dideskripsikan dengan benar
            → Direkomendasikan → Seberapa sering vs. kompetitor.
          </p>
          <p className="text-[#4b5563] mb-3">
            <strong>Jawaban ilustratif:</strong> Redaksi persis jawaban
            ChatGPT yang ditampilkan di laporan ini mewakili bentuk dari apa
            yang ditangkap oleh alat secara langsung. <strong>Nyata:</strong>{" "}
            Layanan, penghargaan, registrasi, dan identitas publik Amanie,
            diambil dari website publik per Agustus 2026.
          </p>
          <p className="text-[#4b5563]">
            <strong>Kami tidak mengada-ada hal negatif.</strong> Setiap temuan
            didasarkan pada perbedaan nyata yang bisa diverifikasi.
          </p>
        </div>

        {/* ── LAMPIRAN B ── */}
        <div className="bg-[#f8fafc] border border-slate-200 rounded-lg p-8 my-8">
          <h2 className="font-sans text-[1.2rem] font-bold text-[#111] mt-0 mb-4 border-0 pb-0">
            Lampiran B: 10 prompt yang digunakan
          </h2>
          <table className="w-full border-collapse my-4 text-[0.9rem]">
            <thead>
              <tr>
                <th className="text-left text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[#6b7280] px-3 py-2.5 border-b-2 border-[#e5e7eb] bg-[#f8fafc]">
                  Tahap
                </th>
                <th className="text-left text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[#6b7280] px-3 py-2.5 border-b-2 border-[#e5e7eb] bg-[#f8fafc]">
                  #
                </th>
                <th className="text-left text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[#6b7280] px-3 py-2.5 border-b-2 border-[#e5e7eb] bg-[#f8fafc]">
                  Prompt
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-[#fafafa] transition-colors">
                <td
                  className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]"
                  rowSpan={2}
                >
                  1. Belajar
                </td>
                <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                  1
                </td>
                <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563] italic">
                  &ldquo;Kalau kami platform pinjaman digital di Malaysia,
                  apakah kami perlu konsultan syariah, dan apa saja yang
                  tercakup?&rdquo;
                </td>
              </tr>
              <tr className="hover:bg-[#fafafa] transition-colors">
                <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                  2
                </td>
                <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563] italic">
                  &ldquo;Layanan konsultan syariah seperti apa yang biasanya
                  dibutuhkan fintech, dan bagaimana pendekatan Masryef
                  terhadap ini?&rdquo;
                </td>
              </tr>
              <tr className="hover:bg-[#fafafa] transition-colors">
                <td
                  className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]"
                  rowSpan={2}
                >
                  2. Mencari
                </td>
                <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                  3
                </td>
                <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563] italic">
                  &ldquo;Siapa firma konsultan syariah terbaik untuk fintech
                  atau bank digital di Malaysia tahun 2026?&rdquo;
                </td>
              </tr>
              <tr className="hover:bg-[#fafafa] transition-colors">
                <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                  4
                </td>
                <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563] italic">
                  &ldquo;Apakah Masryef pilihan yang baik untuk konsultan
                  syariah bagi fintech Malaysia di tahun 2026?&rdquo;
                </td>
              </tr>
              <tr className="hover:bg-[#fafafa] transition-colors">
                <td
                  className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]"
                  rowSpan={2}
                >
                  3. Membandingkan
                </td>
                <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                  5
                </td>
                <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563] italic">
                  &ldquo;Apa yang harus saya cari ketika memilih firma
                  konsultan syariah untuk fintech Islam?&rdquo;
                </td>
              </tr>
              <tr className="hover:bg-[#fafafa] transition-colors">
                <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                  6
                </td>
                <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563] italic">
                  &ldquo;Bandingkan Masryef vs Amanie Advisors. Mana yang
                  lebih baik untuk fintech Islam di Malaysia?&rdquo;
                </td>
              </tr>
              <tr className="hover:bg-[#fafafa] transition-colors">
                <td
                  className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]"
                  rowSpan={2}
                >
                  4. Memverifikasi
                </td>
                <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                  7
                </td>
                <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563] italic">
                  &ldquo;Bagaimana cara memverifikasi kredibilitas firma
                  konsultan syariah di Malaysia?&rdquo;
                </td>
              </tr>
              <tr className="hover:bg-[#fafafa] transition-colors">
                <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                  8
                </td>
                <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563] italic">
                  &ldquo;Apakah Masryef firma konsultan syariah yang sah dan
                  bereputasi?&rdquo;
                </td>
              </tr>
              <tr className="hover:bg-[#fafafa] transition-colors">
                <td
                  className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]"
                  rowSpan={2}
                >
                  5. Bertindak
                </td>
                <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                  9
                </td>
                <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563] italic">
                  &ldquo;Bagaimana cara menggunakan jasa firma konsultan
                  syariah untuk mensertifikasi produk tabungan digital Islam
                  kami?&rdquo;
                </td>
              </tr>
              <tr className="hover:bg-[#fafafa] transition-colors">
                <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                  10
                </td>
                <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563] italic">
                  &ldquo;Bagaimana cara menghubungi Masryef untuk
                  mendiskusikan konsultan syariah bagi produk fintech
                  kami?&rdquo;
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer className="text-center py-12 px-8 text-[#9ca3af] text-[0.8rem] border-t border-[#e5e7eb] mt-12">
        <p>
          AI Visibility Report · Disusun untuk Masryef Advisory Sdn Bhd ·
          Agustus 2026
        </p>
        <p>
          Jawaban AI berubah seiring waktu. Ini adalah snapshot hari ini.
          Tindakan di atas tetap berlaku terlepas dari pembaruan besok.
        </p>
      </footer>
    </div>
  );
}
