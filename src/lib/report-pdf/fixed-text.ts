import { subjectNoun, type ReportSubject } from "@/lib/audit/two-source-report";

/**
 * Spec 024 D-7, G-05: every customer-facing string of the designed report
 * PDF that is not saved data, in one file. The founder approves this file
 * once, in Part 1's review, for Parts 1 to 3 (Q-5); later strings are added
 * here and approved in the review of the PR that adds them.
 *
 * Rules (VOICE.md §3, G-05): no em or en dash in prose; no line claims what
 * patients do, states a cause, or promises a scheduled service, re-check or
 * date. Count sentences are not here: they come from the code that makes
 * them for the web report (G-03).
 *
 * A string the spec marks "wording to be written" is a `placeholder(...)`:
 * it prints a visible marker so it cannot pass as approved copy, and a test
 * lists every one of them (fixed-text.test.ts, PR1_NOTES.md).
 */

/** The visible start of every placeholder. */
export const PLACEHOLDER_MARK = "[[TEKS BELUM DISETUJUI";

/** A string still to be written and approved by the founder. `id` names it
 * in the PR notes; `meaning` says what it must say. */
export function placeholder(id: string, meaning: string): string {
  return `${PLACEHOLDER_MARK}: ${id}. ${meaning}]]`;
}

export function isPlaceholder(text: string): boolean {
  return text.includes(PLACEHOLDER_MARK);
}

/* ------------------------------------------------------------------ */
/* Section titles (D-12, approved) and page names (plan §5.2).         */
/* ------------------------------------------------------------------ */

export type SectionNumber = "01" | "02" | "03" | "04" | "05";

/** D-12: the five approved section titles. `<klinik>` is the business's
 * name as the report shows it. */
export function sectionTitle(section: SectionNumber, name: string): string {
  switch (section) {
    case "01":
      return `Posisi ${name} hari ini`;
    case "02":
      return `Apa kata AI tentang ${name}`;
    case "03":
      return "Apa yang dibaca AI";
    case "04":
      return "Rencana delapan minggu";
    case "05":
      return "Lampiran";
  }
}

/** Plan §5.2: the page names, as titles and in Daftar isi. */
export const PAGE_NAME = {
  sampul: "Sampul",
  daftar_isi: "Daftar isi",
  cara_membaca: "Cara membaca laporan",
  ringkasan: "Ringkasan",
  saat_bertanya: "Saat calon pasien bertanya",
  peta_jawaban: "Peta jawaban",
  temuan: "Temuan",
  pesaing: "Pesaing",
  celah_topik: "Celah topik",
  cek_fakta: "Cek fakta",
  kata_ai: "Kata AI dan kata Anda",
  halaman_mereka: "Halaman mereka",
  situs_dibaca: "Situs yang dibaca AI",
  untuk_tim_web: "Untuk tim web Anda",
  rencana: "Rencana",
  langkah: "Langkah",
  bahan_siap_pakai: "Bahan siap pakai",
  lembar_kerja: "Lembar Kerja",
  penutup: "Penutup",
  titik_awal: "Titik awal",
  lampiran: "Lampiran",
  sampul_belakang: "Sampul belakang",
} as const;

/** Plan §6.3: a continued page. */
export const CONTINUED = "lanjutan";

/* ------------------------------------------------------------------ */
/* The page frame (F-04).                                              */
/* ------------------------------------------------------------------ */

/** The report's name in English (VOICE.md §2: kept in English). */
export const REPORT_NAME = "AI Visibility Report";

/** Header label of a divider page: "Bagian 01" (reference p. 7). */
export function sectionLabel(section: SectionNumber): string {
  return `Bagian ${section}`;
}

/** Header label of a page inside a section: "04 · Rencana delapan minggu"
 * (reference p. 28). */
export function sectionPageLabel(section: SectionNumber, name: string): string {
  return `${section} · ${sectionTitle(section, name)}`;
}

/** Header labels of the front pages (reference pp. 2 and 3). */
export const FRONT_LABEL = {
  daftar_isi: "Daftar isi",
  cara_membaca: "Sebelum membaca",
} as const;

/** The confidential label on the cover and the back cover (plan "Changes
 * after approval": wording to be written). */
export const CONFIDENTIAL_LABEL = placeholder(
  "label-rahasia",
  "Label rahasia untuk sampul dan sampul belakang, dengan nama bisnis",
);

/** Titik awal's footer line (Part 2): the date the numbers come from
 * (plan "Changes after approval": wording to be written). */
export const NUMBERS_DATE_LINE = placeholder(
  "tanggal-angka",
  "Kalimat tanggal asal angka di halaman Titik awal",
);

/** Titik awal's re-audit advice (Part 2; D-7, v3 direction 3: meaning
 * fixed, wording to be written): about eight weeks after the changes, an
 * audit with the same ten questions so the two reports can be compared; the
 * comparison alone does not show what caused the differences; no date and
 * no service. */
export const REAUDIT_ADVICE = placeholder(
  "saran-audit-ulang",
  "Saran audit ulang sekitar delapan minggu setelah perubahan, dengan sepuluh pertanyaan yang sama; perbandingan saja tidak menunjukkan penyebab perbedaan; tanpa tanggal atau layanan",
);

/** A synthetic report says so on its cover, as the web report does with its
 * notice (Spec 016). Wording to be written for the PDF. */
export const SYNTHETIC_LABEL = placeholder(
  "label-audit-uji",
  "Label sampul untuk audit uji dengan jawaban sintetis, bukan bukti visibilitas bisnis ini",
);

/* ------------------------------------------------------------------ */
/* Sampul (reference p. 1).                                            */
/* ------------------------------------------------------------------ */

function customers(subject: ReportSubject | undefined): string {
  return subject === "klinik" ? "calon pasien" : "calon pelanggan";
}

export const COVER = {
  eyebrow: REPORT_NAME,
  title: (name: string) => `Bagaimana AI memperkenalkan ${name}`,
  lede: (place: string, subject: ReportSubject | undefined) =>
    `kepada ${customers(subject)} di ${place}, menurut ChatGPT dan Google AI Overview.`,
  checked: "Diperiksa",
  sources: "Sumber",
  sourcesValue: "ChatGPT · Google",
  place: "Lokasi",
  ringCenter: (questions: number) => `${questions} pertanyaan`,
  ringNote:
    "Setiap titik adalah satu jawaban untuk satu pertanyaan. Nomor di luar lingkaran adalah nomor pertanyaan.",
  ringChatgpt: "ChatGPT",
  ringGoogle: "Google AI Overview",
} as const;

/* ------------------------------------------------------------------ */
/* Daftar isi (reference p. 2).                                        */
/* ------------------------------------------------------------------ */

export const CONTENTS = {
  eyebrow: "Sebelum mulai",
  lead: (subject: ReportSubject | undefined) =>
    `Jawaban AI tidak memberi sepuluh tautan untuk dibandingkan. ${
      subject === "klinik" ? "Klinik" : "Bisnis"
    } yang tidak disebut tidak tampil di jawaban itu.`,
  heading: "Isi laporan",
  /** The row mark of a front page (reference: "–" in the number column;
   * drawn as a short line, not a dash character, G-08). */
  caraMembacaNote: "Apa yang ditanyakan, cara menghitung, dan arti setiap titik",
  /** A section row's note: the names of the pages it holds. */
  sectionNote: (pageNames: readonly string[]) => joinList(pageNames),
} as const;

/** "A", "A dan B", "A, B, dan C". */
export function joinList(items: readonly string[]): string {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} dan ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, dan ${items.at(-1)}`;
}

/* ------------------------------------------------------------------ */
/* Cara membaca laporan (reference p. 3).                              */
/* ------------------------------------------------------------------ */

export const HOW_TO_READ = {
  title: "Cara membaca laporan ini",
  questionsTitle: "Pertanyaan yang diajukan",
  countingTitle: "Cara menghitung",
  limitsTitle: "Batas audit ini",
  /** The method line when the questions came from Google search data. The
   * line without search data is the settled R-08 sentence
   * (`profileQuestionsNote`, TwoSourceSections.tsx). */
  fromSearchData:
    "Sepuluh pertanyaan diambil dari data pencarian Google di Indonesia.",
  asked: (chatgptPlace: string, googlePlace: string, when: string) =>
    `Setiap pertanyaan diajukan sekali ke ChatGPT (dari ${chatgptPlace}) dan ke Google (dari ${googlePlace}) ${when}.`,
  onDay: (date: string) => `pada ${date}`,
  betweenDays: (from: string, to: string) => `pada ${from} sampai ${to}`,
  chatgptBase: (n: number) =>
    n === 0
      ? "Kartu ChatGPT: Tidak diuji."
      : `Kartu ChatGPT menghitung dari ${n} jawaban.`,
  googleBase: (z: number, m: number) =>
    m === 0
      ? "Kartu Google: Tidak diuji."
      : `Kartu Google menghitung dari ringkasan AI yang benar-benar tampil: ${z} dari ${m} pertanyaan.`,
  failed: (k: number) => `${k} pemeriksaan tidak dapat diuji.`,
  counting: (name: string) =>
    `Disebut berarti nama ${name} ada dalam jawaban. Direkomendasikan berarti jawaban menyarankan ${name} untuk kebutuhan yang ditanyakan; ini penilaian penulis laporan yang diperiksa kode. Situs dikutip berarti halaman ${name} dipakai sebagai sumber, tetapi namanya tidak disebut. Nama pesaing dan situs dihitung oleh kode.`,
  limits: (subject: ReportSubject | undefined) =>
    `Jawaban AI dapat berubah menurut waktu, akun, dan lokasi. Sepuluh pertanyaan tidak mewakili semua pertanyaan ${customers(subject)}. Audit ini tidak membuktikan mengapa ChatGPT dan Google menjawab seperti itu, dan tidak menilai klaim keamanan atau izin.`,
  legend: "Arti titik",
} as const;

/* ------------------------------------------------------------------ */
/* Section dividers (reference pp. 7 and 22).                          */
/* ------------------------------------------------------------------ */

export const DIVIDER = {
  questionsLabel: "Pertanyaan yang dijawab bagian ini",
  /** The lede under the title: the pages this section holds. */
  lede: (pageNames: readonly string[]) =>
    `Di bagian ini: ${joinList(pageNames)}.`,
} as const;

/**
 * The questions a divider says its section answers (reference pp. 7 and
 * 22), each shown only when a page that answers it is in the PDF. Sections
 * 02, 03 and 05 have none yet: their reference pages wait for v3 packages
 * or Part 3.
 */
export const SECTION_QUESTIONS: Record<
  SectionNumber,
  readonly { text: (subject: ReportSubject | undefined, name: string) => string; answeredBy: readonly string[] }[]
> = {
  "01": [
    {
      text: () => "Apa temuan terpenting dari sepuluh pertanyaan ini?",
      answeredBy: ["temuan"],
    },
    {
      text: (subject) =>
        `${subject === "klinik" ? "Klinik" : "Bisnis"} mana yang disebut, dan untuk apa?`,
      answeredBy: ["pesaing"],
    },
    {
      text: (_subject, name) => `Topik mana yang belum menyebut ${name}?`,
      answeredBy: ["celah_topik"],
    },
  ],
  "02": [],
  "03": [],
  "04": [
    {
      text: () => "Apa yang dikerjakan lebih dulu?",
      answeredBy: ["rencana", "penutup_plan"],
    },
    {
      text: () => "Kapan hasilnya dapat diukur ulang?",
      answeredBy: ["titik_awal"],
    },
  ],
  "05": [],
};

/* ------------------------------------------------------------------ */
/* Penutup (reference p. 28) and the back cover (reference p. 39).     */
/* ------------------------------------------------------------------ */

export const CLOSING = {
  eyebrow: "Penutup",
} as const;

export const BACK_COVER = {
  site: "nuave.ai",
  /** D-11: the sentence on what Nuave does, as in the reference. */
  sentence:
    "Nuave memeriksa bagaimana ChatGPT dan Google AI Overview menyebut bisnis Anda ketika calon pelanggan bertanya, lalu menyusun langkah yang dapat langsung dikerjakan.",
} as const;

/** The footer's left part on every page but the covers: "<bisnis> · AI
 * Visibility Report · <bulan tahun>" (reference). */
export function footerParts(name: string, month: string | null): string[] {
  return [name, REPORT_NAME, ...(month ? [month] : [])];
}

/** "Klinik Anda" / "Bisnis Anda" for a report without a name. */
export function fallbackName(subject: ReportSubject | undefined): string {
  return subjectNoun(subject);
}
