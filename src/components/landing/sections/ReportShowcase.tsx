"use client";

import { useId, useState, type ReactNode } from "react";
import { IconDownload, IconInfoCircle, IconSearch } from "@tabler/icons-react";
import { NuaveMark } from "@/components/product/journey/NuaveLogo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useMinWidth } from "../use-min-width";
import shell from "../landing.module.css";
import styles from "./ReportShowcase.module.css";

const TABS = [
  {
    value: "skor",
    label: "Skor",
    description: "Muncul di berapa jawaban ChatGPT dan Google AI Overview.",
  },
  {
    value: "jawaban",
    label: "Jawaban AI",
    description:
      "Jawaban utuh ChatGPT dan Google AI Overview beserta sumbernya.",
  },
  {
    value: "klinik",
    label: "Klinik lain",
    description: "Menampilkan klinik lain yang muncul dalam jawaban AI.",
  },
  {
    value: "perbaikan",
    label: "Perbaikan",
    description:
      "Tindak lanjut yang bisa dikerjakan, plus topik yang belum menyebut Anda.",
  },
] as const;

type TabValue = (typeof TABS)[number]["value"];

/** A line break only on phones, where the design breaks the line. */
function NarrowBreak() {
  return <br className={styles.narrowBreak} />;
}

function Dots({
  count,
  on,
  soft,
}: {
  count: number;
  on: number[];
  soft?: boolean;
}) {
  return (
    <span className={styles.dots} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <i
          key={index}
          className={cn(
            styles.dot,
            on.includes(index + 1) && (soft ? styles.dotSoft : styles.dotOn),
          )}
        />
      ))}
    </span>
  );
}

function Metric({ children }: { children: ReactNode }) {
  return <div className={styles.metric}>{children}</div>;
}

function Skor() {
  return (
    <div className={styles.panels}>
      <div className={styles.panel}>
        <p className={styles.source}>ChatGPT</p>
        <Metric>
          <p>
            Klinik Anda muncul di <NarrowBreak />
            <b>3 dari 10</b> pertanyaan
          </p>
          <Dots count={10} on={[2, 6, 8]} />
        </Metric>
        <Metric>
          <p>
            Klinik Anda direkomendasikan di <NarrowBreak />
            <b>1 dari 10</b> pertanyaan
          </p>
          <Dots count={10} on={[6]} soft />
        </Metric>
      </div>
      <div className={styles.panel}>
        <p className={styles.source}>Google AI Overview</p>
        <Metric>
          <p>
            Google menampilkan AI Overview di <NarrowBreak />
            <b>6 dari 10</b> pertanyaan
          </p>
        </Metric>
        <Metric>
          <p>
            Klinik Anda muncul di <NarrowBreak />
            <b>1 dari 6</b> pertanyaan
          </p>
          <Dots count={6} on={[1]} />
        </Metric>
      </div>
    </div>
  );
}

function Chips({ items }: { items: ReactNode[] }) {
  return <p className={styles.chips}>{items}</p>;
}

function Answers() {
  return (
    <div>
      <p className={styles.title}>
        Jawaban ChatGPT dan <NarrowBreak />
        Google AI Overview
      </p>
      <div className={styles.question}>
        <p className={styles.questionNumber}>Pertanyaan 2</p>
        <p className={styles.questionText}>
          klinik kecantikan terdekat jakarta selatan
        </p>
        <p className={styles.questionMeta}>
          <span className={styles.questionChip}>
            <IconSearch size={12} stroke={2} aria-hidden="true" />
            Disusun dari topik yang dicari
          </span>
          <span className={styles.questionNote}>
            Topik: klinik kecantikan terdekat · ±49.500 pencarian/bulan di
            Google, seluruh Indonesia
          </span>
        </p>
      </div>
      <div className={styles.answer}>
        <p className={styles.answerHead}>
          <span className={styles.source}>ChatGPT</span>
          <span className={styles.where}>Indonesia</span>
        </p>
        <p className={styles.quote}>
          “...Klinik A di Kebayoran Baru dikenal untuk perawatan jerawat dan
          laser, dengan pilihan cicilan. <b>Klinik Cantik Fiksi</b> juga
          melayani facial dan laser, tetapi informasi biaya dan jadwal dokternya
          belum banyak ditemukan...”
        </p>
        <Chips
          items={["klinik-a.contoh", "Google Maps", "direktori.contoh"].map(
            (chip) => (
              <span key={chip} className={styles.chip}>
                {chip}
              </span>
            ),
          )}
        />
      </div>
      <div className={styles.answer}>
        <p className={styles.answerHead}>
          <span className={styles.source}>Google AI Overview</span>
          <span className={styles.where}>Jakarta Selatan</span>
        </p>
        <p className={styles.quote}>
          “...Beberapa klinik kecantikan di Jakarta Selatan antara lain Klinik
          A, Klinik D, dan Klinik E. Sebaiknya bandingkan biaya dan jadwal
          konsultasi sebelum memilih...”
        </p>
        <Chips
          items={[
            <span key="d" className={styles.chip}>
              direktori.contoh
            </span>,
            <span key="k" className={styles.chip}>
              klinik-d.contoh
            </span>,
            <span key="you" className={cn(styles.chip, styles.chipYou)}>
              klinikcantikfiksi.com
            </span>,
            <span key="src" className={cn(styles.chip, styles.chipDark)}>
              Dipakai sebagai sumber
            </span>,
          ]}
        />
      </div>
    </div>
  );
}

function ClinicRows({
  heading,
  rows,
}: {
  heading: string;
  rows: [string, string][];
}) {
  return (
    <div className={styles.list}>
      <p className={styles.listHead}>{heading}</p>
      {rows.map(([name, questions]) => (
        <p key={name} className={styles.row}>
          <span className={styles.rowName}>{name}</span>
          <span className={styles.rowQuestions}>{questions}</span>
        </p>
      ))}
    </div>
  );
}

function OtherClinics() {
  return (
    <div>
      <p className={styles.title}>Klinik lain yang disebut</p>
      <ClinicRows
        heading="ChatGPT"
        rows={[
          ["Klinik A", "Pertanyaan 2, 5"],
          ["Klinik B", "Pertanyaan 3, 4, 7, 8"],
        ]}
      />
      <ClinicRows
        heading="Google AI Overview"
        rows={[
          ["Klinik A", "Pertanyaan 2, 4"],
          ["Klinik D", "Pertanyaan 2"],
          ["Klinik E", "Pertanyaan 2, 6"],
        ]}
      />
      <p className={styles.note}>
        <IconInfoCircle size={18} stroke={1.75} aria-hidden="true" />
        Google tidak menampilkan AI Overview untuk 4 dari 10 pertanyaan ini.
      </p>
    </div>
  );
}

// The question numbers point only at questions that don't name the clinic
// (the Skor tab's dots name it in 2, 6 and 8).
const TOPICS = [
  ["v shape", "±1.600", "3", "klinik-a.contoh, direktori.contoh"],
  ["skin rejuvenation", "±320", "5", "klinik-d.contoh"],
  ["biaya laser wajah di klinik kecantikan", "±260", "9", "direktori.contoh"],
] as const;

function Fixes() {
  return (
    <div>
      <p className={styles.title}>Yang dapat dilakukan</p>
      <div className={styles.fix}>
        <p className={styles.tag}>Kerjakan dulu</p>
        <p className={styles.fixTitle}>
          Samakan jam praktik di website, Google Maps, dan Instagram.
        </p>
        <dl className={styles.kvs}>
          <div>
            <dt>Mengapa:</dt>{" "}
            <dd>
              Jam buka berbeda di tiga tempat. Di Pertanyaan 4, ChatGPT menyebut
              klinik lain yang mencantumkan jam buka Sabtu.
            </dd>
          </div>
          <div>
            <dt>Berdasarkan:</dt>{" "}
            <dd>Pertanyaan 4 dan 7 · Google Maps · Instagram</dd>
          </div>
          <div>
            <dt>Penanggung jawab yang disarankan:</dt> <dd>Admin</dd>
          </div>
          <div>
            <dt>Selesai ketika:</dt>{" "}
            <dd>Jam praktik sama persis di ketiga tempat.</dd>
          </div>
        </dl>
      </div>
      <p className={cn(styles.title, styles.subTitle)}>
        Topik yang belum menyebut Anda
      </p>
      <div className={styles.topics}>
        {TOPICS.map(([topic, volume, question, cited]) => (
          <div key={topic} className={styles.topic}>
            <p className={styles.topicName}>{topic}</p>
            <p className={styles.topicVolume}>
              {volume} pencarian/bulan di Google, seluruh Indonesia · Pertanyaan{" "}
              {question}
            </p>
            <p className={styles.topicCited}>Dikutip: {cited}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PdfLine({ className }: { className?: string }) {
  return (
    <div className={className}>
      <IconDownload
        className={styles.promiseIcon}
        size={18}
        stroke={1.75}
        aria-hidden="true"
      />
      <p className={styles.pdfLine}>Download PDF, siap dibawa ke rapat.</p>
      <p className={styles.pdfCaption}>Nama klinik hanya ilustrasi.</p>
    </div>
  );
}

/**
 * S5: what the report shows, on an example clinic. Laptop: the tabs are a
 * contents list beside the report; phone: a segmented control above it.
 */
export function ReportShowcase() {
  const [tab, setTab] = useState<TabValue>("skor");
  const wide = useMinWidth(1024);
  // Each tab is named by its label alone; its description (shown beside it
  // on a laptop) is its description at every width.
  const tabId = useId();
  const active = TABS.find((item) => item.value === tab) ?? TABS[0];

  return (
    <section
      id="laporan"
      className={cn(shell.section, styles.section)}
      aria-labelledby="s5-title"
    >
      <div className={shell.container}>
        <header className={shell.head}>
          <h2
            id="s5-title"
            className={cn("type-heading-xl", shell.h2, styles.h2)}
          >
            <span className={styles.h2Line}>Lihat apa kata AI</span>{" "}
            <span className={styles.h2Line}>tentang klinik Anda</span>
          </h2>
          <p className={cn(shell.line, styles.line)}>
            Lengkap dengan rekomendasi perbaikan.
          </p>
        </header>

        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as TabValue)}
          orientation={wide ? "vertical" : "horizontal"}
          className={styles.split}
        >
          <div className={styles.left}>
            <TabsList
              className={styles.tabs}
              aria-label="Isi laporan"
              activateOnFocus
            >
              {TABS.map((item) => (
                <TabsTrigger
                  key={item.value}
                  value={item.value}
                  className={styles.tab}
                  aria-labelledby={`${tabId}-${item.value}-label`}
                  aria-describedby={`${tabId}-${item.value}-description`}
                >
                  <span className={styles.rail} aria-hidden="true" />
                  <span
                    id={`${tabId}-${item.value}-label`}
                    className={styles.tabLabel}
                  >
                    {item.label}
                  </span>
                  <span
                    id={`${tabId}-${item.value}-description`}
                    className={styles.tabDescription}
                  >
                    {item.description}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
            <p className={styles.segDescription}>{active.description}</p>
            <PdfLine className={styles.promise} />
          </div>

          <div className={styles.right}>
            <span className={styles.pool} aria-hidden="true" />
            {/* Without JavaScript the four views show one after another
                (Spec 020, failure and recovery). Like the FAQ's rule, it sits
                in Tailwind's base layer to beat its [hidden] rule. */}
            <noscript>
              <style>{`@layer base { [data-report-views] [role="tabpanel"][hidden] { display: block !important; } [data-report-views] [role="tabpanel"] + [role="tabpanel"] { margin-top: 32px; } }`}</style>
            </noscript>
            <article
              className={styles.card}
              aria-label="Contoh laporan: Klinik Cantik Fiksi"
              data-report-views
            >
              <div className={styles.cardTop}>
                <p className={styles.reportLabel}>
                  <NuaveMark className={styles.reportMark} />
                  AI Visibility Report
                </p>
                <span className={styles.pdfButton} aria-hidden="true">
                  <IconDownload size={16} stroke={2} />
                  Download PDF
                </span>
              </div>
              <p className={styles.clinicName}>
                Klinik Cantik Fiksi <span>· Jakarta Selatan</span>
              </p>
              <p className={styles.meta}>
                Diperiksa di ChatGPT dan <NarrowBreak />
                Google AI Overview · 20 Oktober 2026
              </p>
              <p className={cn(styles.meta, styles.metaSoft)}>
                Google: Jakarta Selatan · ChatGPT: Indonesia
              </p>
              <hr className={styles.rule} />
              <TabsContent value="skor" keepMounted className={styles.view}>
                <Skor />
              </TabsContent>
              <TabsContent value="jawaban" keepMounted className={styles.view}>
                <Answers />
              </TabsContent>
              <TabsContent value="klinik" keepMounted className={styles.view}>
                <OtherClinics />
              </TabsContent>
              <TabsContent
                value="perbaikan"
                keepMounted
                className={styles.view}
              >
                <Fixes />
              </TabsContent>
            </article>
          </div>

          <PdfLine className={styles.under} />
        </Tabs>
      </div>
    </section>
  );
}
