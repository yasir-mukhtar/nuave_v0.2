"use client";

import { useMemo, useState } from "react";
import styles from "./prototype.module.css";

type Screen =
  | "intro-brand"
  | "brand-basics"
  | "offerings"
  | "intro-customer"
  | "customer-profile"
  | "customer-needs"
  | "intro-market"
  | "market-scope"
  | "competitors"
  | "intro-details"
  | "details"
  | "review";

const screens: Screen[] = [
  "intro-brand",
  "brand-basics",
  "offerings",
  "intro-customer",
  "customer-profile",
  "customer-needs",
  "intro-market",
  "market-scope",
  "competitors",
  "intro-details",
  "details",
  "review",
];

const categoryOptions = [
  "Makanan & minuman",
  "Fashion",
  "Kecantikan",
  "Kesehatan",
  "Pendidikan",
  "Jasa profesional",
  "Teknologi",
  "Lainnya",
];

const scopeOptions = [
  "Seluruh brand",
  "Cabang tertentu",
  "Produk / lini tertentu",
  "Layanan tertentu",
];

const ageOptions = ["<18", "18–24", "25–34", "35–44", "45–54", "55+", "Tidak spesifik"];

const personaOptions = [
  "Pekerja kantoran",
  "Mahasiswa",
  "Orang tua",
  "Pemilik usaha",
  "Profesional",
  "Pelajar",
  "Wisatawan",
  "Komunitas / hobi",
];

const marketOptions = [
  "Kota tertentu",
  "Beberapa kota",
  "Indonesia",
  "Siapa pun di internet",
];

const chapterByScreen: Record<Screen, number> = {
  "intro-brand": 0,
  "brand-basics": 0,
  offerings: 0,
  "intro-customer": 1,
  "customer-profile": 1,
  "customer-needs": 1,
  "intro-market": 2,
  "market-scope": 2,
  competitors: 2,
  "intro-details": 3,
  details: 3,
  review: 3,
};

const chapterProgressByScreen: Record<Screen, number> = {
  "intro-brand": 0.15,
  "brand-basics": 0.55,
  offerings: 1,
  "intro-customer": 0.15,
  "customer-profile": 0.55,
  "customer-needs": 1,
  "intro-market": 0.15,
  "market-scope": 0.55,
  competitors: 1,
  "intro-details": 0.2,
  details: 0.75,
  review: 1,
};

function ChoiceCard({
  selected,
  children,
  onClick,
}: {
  selected: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.choiceCard} ${selected ? styles.choiceCardSelected : ""}`}
      onClick={onClick}
      aria-pressed={selected}
    >
      <span>{children}</span>
      <span className={styles.choiceIndicator} aria-hidden="true">
        {selected ? "●" : "○"}
      </span>
    </button>
  );
}

function MultiChoice({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
}) {
  return (
    <div className={styles.chipGrid}>
      {options.map((option) => {
        const active = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            className={`${styles.chip} ${active ? styles.chipSelected : ""}`}
            aria-pressed={active}
            onClick={() => onToggle(option)}
          >
            {active ? "✓ " : ""}
            {option}
          </button>
        );
      })}
    </div>
  );
}

function ChapterIntro({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className={styles.introBlock}>
      <div className={styles.placeholderArt} aria-hidden="true">
        <div className={styles.placeholderCircle} />
        <div className={styles.placeholderLine} />
        <div className={styles.placeholderLineShort} />
      </div>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h1>{title}</h1>
      <p className={styles.lede}>{body}</p>
    </div>
  );
}

export default function IntakePrototypePage() {
  const [screen, setScreen] = useState<Screen>("intro-brand");
  const [brandName, setBrandName] = useState("");
  const [scope, setScope] = useState("Seluruh brand");
  const [category, setCategory] = useState("");
  const [offerings, setOfferings] = useState("");
  const [ages, setAges] = useState<string[]>(["Tidak spesifik"]);
  const [personas, setPersonas] = useState<string[]>([]);
  const [needs, setNeeds] = useState("");
  const [marketScope, setMarketScope] = useState("Indonesia");
  const [cities, setCities] = useState("");
  const [competitors, setCompetitors] = useState("");
  const [details, setDetails] = useState("");

  const index = screens.indexOf(screen);
  const chapter = chapterByScreen[screen];
  const chapterProgress = chapterProgressByScreen[screen];

  const summary = useMemo(
    () => [
      ["Brand", brandName || "Belum diisi"],
      ["Cakupan", scope],
      ["Kategori", category || "Belum dipilih"],
      ["Produk / layanan", offerings || "Belum diisi"],
      ["Pelanggan", personas.length ? personas.join(", ") : "Tidak dispesifikkan"],
      ["Pasar", marketScope + (cities ? ` · ${cities}` : "")],
      ["Kompetitor", competitors || "Belum diisi"],
    ],
    [brandName, scope, category, offerings, personas, marketScope, cities, competitors],
  );

  function next() {
    if (index < screens.length - 1) setScreen(screens[index + 1]);
  }

  function back() {
    if (index > 0) setScreen(screens[index - 1]);
  }

  function reset() {
    setScreen("intro-brand");
  }

  function toggleMulti(value: string, current: string[], setter: (next: string[]) => void) {
    if (value === "Tidak spesifik") {
      setter(current.includes(value) ? [] : [value]);
      return;
    }
    const withoutGeneric = current.filter((item) => item !== "Tidak spesifik");
    setter(withoutGeneric.includes(value) ? withoutGeneric.filter((item) => item !== value) : [...withoutGeneric, value]);
  }

  return (
    <main className={styles.page} lang="id">
      <header className={styles.topbar}>
        <a href="/" className={styles.brandMark}>Nuave</a>
        <button type="button" className={styles.resetButton} onClick={reset}>
          Mulai ulang
        </button>
      </header>

      <section className={styles.content}>
        {screen === "intro-brand" ? (
          <ChapterIntro
            eyebrow="Bagian 1"
            title="Perkenalkan brand Anda"
            body="Pastikan Nuave memahami brand, cakupan, kategori, dan apa yang Anda tawarkan sebelum audit dimulai."
          />
        ) : null}

        {screen === "brand-basics" ? (
          <div className={styles.questionBlock}>
            <h1>Brand apa yang akan kita audit?</h1>
            <p className={styles.helper}>Mulai dari identitas dasarnya. Pilih jawaban yang paling mendekati.</p>

            <label className={styles.fieldLabel} htmlFor="brand-name">Nama brand</label>
            <input
              id="brand-name"
              className={styles.textInput}
              value={brandName}
              onChange={(event) => setBrandName(event.target.value)}
              placeholder="Contoh: Kopi Kenangan"
            />

            <fieldset className={styles.fieldset}>
              <legend>Cakupan yang ingin diaudit</legend>
              <div className={styles.choiceStack}>
                {scopeOptions.map((option) => (
                  <ChoiceCard key={option} selected={scope === option} onClick={() => setScope(option)}>
                    {option}
                  </ChoiceCard>
                ))}
              </div>
            </fieldset>

            <fieldset className={styles.fieldset}>
              <legend>Kategori brand</legend>
              <div className={styles.chipGrid}>
                {categoryOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`${styles.chip} ${category === option ? styles.chipSelected : ""}`}
                    onClick={() => setCategory(option)}
                    aria-pressed={category === option}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        ) : null}

        {screen === "offerings" ? (
          <div className={styles.questionBlock}>
            <h1>Apa yang Anda tawarkan?</h1>
            <p className={styles.helper}>Tulis produk atau layanan utama. Tidak perlu membuat deskripsi pemasaran.</p>
            <textarea
              className={styles.largeTextarea}
              value={offerings}
              onChange={(event) => setOfferings(event.target.value)}
              placeholder={"Contoh:\nKopi susu siap minum\nKopi panas\nPastry"}
            />
          </div>
        ) : null}

        {screen === "intro-customer" ? (
          <ChapterIntro
            eyebrow="Bagian 2"
            title="Siapa pelanggan Anda?"
            body="Bantu Nuave membayangkan siapa yang mencari brand Anda dan apa yang ingin mereka capai."
          />
        ) : null}

        {screen === "customer-profile" ? (
          <div className={styles.questionBlock}>
            <h1>Siapa yang paling sering Anda layani?</h1>
            <p className={styles.helper}>Pilih bila relevan. Anda tidak perlu membatasi pelanggan berdasarkan demografi.</p>

            <fieldset className={styles.fieldset}>
              <legend>Rentang usia</legend>
              <MultiChoice options={ageOptions} selected={ages} onToggle={(option) => toggleMulti(option, ages, setAges)} />
            </fieldset>

            <fieldset className={styles.fieldset}>
              <legend>Gambaran pelanggan</legend>
              <MultiChoice options={personaOptions} selected={personas} onToggle={(option) => toggleMulti(option, personas, setPersonas)} />
              <button type="button" className={styles.addAnother}>+ Tambah gambaran lain</button>
            </fieldset>
          </div>
        ) : null}

        {screen === "customer-needs" ? (
          <div className={styles.questionBlock}>
            <h1>Apa yang biasanya mereka butuhkan?</h1>
            <p className={styles.helper}>Ceritakan masalah, kebutuhan, atau hasil yang ingin dicapai calon pelanggan.</p>
            <textarea
              className={styles.largeTextarea}
              value={needs}
              onChange={(event) => setNeeds(event.target.value)}
              placeholder="Contoh: ingin kopi yang cepat dibeli sebelum bekerja, tetap enak, dan mudah ditemukan dekat kantor."
            />
          </div>
        ) : null}

        {screen === "intro-market" ? (
          <ChapterIntro
            eyebrow="Bagian 3"
            title="Pasar & kompetitor"
            body="Tentukan konteks tempat brand Anda bersaing dan bisnis yang biasanya menjadi pembanding."
          />
        ) : null}

        {screen === "market-scope" ? (
          <div className={styles.questionBlock}>
            <h1>Di mana brand Anda bersaing?</h1>
            <p className={styles.helper}>Pilih cakupan yang paling mencerminkan calon pelanggan Anda.</p>
            <div className={styles.choiceStack}>
              {marketOptions.map((option) => (
                <ChoiceCard key={option} selected={marketScope === option} onClick={() => setMarketScope(option)}>
                  {option}
                </ChoiceCard>
              ))}
            </div>
            {marketScope === "Kota tertentu" || marketScope === "Beberapa kota" ? (
              <div className={styles.revealField}>
                <label className={styles.fieldLabel} htmlFor="cities">Sebutkan kota</label>
                <input
                  id="cities"
                  className={styles.textInput}
                  value={cities}
                  onChange={(event) => setCities(event.target.value)}
                  placeholder="Contoh: Jakarta, Depok, Tangerang"
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {screen === "competitors" ? (
          <div className={styles.questionBlock}>
            <h1>Siapa yang biasanya dibandingkan dengan Anda?</h1>
            <p className={styles.helper}>Pada produk akhir, Nuave dapat menyarankan beberapa nama. Anda cukup menghapus yang salah atau menambahkan yang kurang.</p>
            <textarea
              className={styles.mediumTextarea}
              value={competitors}
              onChange={(event) => setCompetitors(event.target.value)}
              placeholder={"Satu nama per baris\nContoh:\nKompetitor A\nKompetitor B"}
            />
            <div className={styles.mockSuggestionRow} aria-hidden="true">
              <span>Saran Nuave</span>
              <span className={styles.mockChip}>Kompetitor yang ditemukan ×</span>
            </div>
          </div>
        ) : null}

        {screen === "intro-details" ? (
          <ChapterIntro
            eyebrow="Bagian 4"
            title="Detail tambahan"
            body="Hampir selesai. Tambahkan hal penting yang belum tercakup agar audit tidak kehilangan konteks khusus brand Anda."
          />
        ) : null}

        {screen === "details" ? (
          <div className={styles.questionBlock}>
            <h1>Apa lagi yang perlu Nuave ketahui?</h1>
            <p className={styles.helper}>Opsional. Misalnya diferensiasi brand, fakta unik, klaim yang harus akurat, batasan, atau hal lain yang penting.</p>
            <textarea
              className={styles.extraLargeTextarea}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="Tuliskan konteks tambahan di sini…"
            />
          </div>
        ) : null}

        {screen === "review" ? (
          <div className={styles.questionBlock}>
            <p className={styles.eyebrow}>Selesai</p>
            <h1>Sudah cukup untuk mulai audit</h1>
            <p className={styles.helper}>Ini hanya mockup low-fidelity. Pada versi akhir, Anda dapat memeriksa dan mengubah informasi sebelum membuat pertanyaan audit.</p>
            <div className={styles.summaryList}>
              {summary.map(([label, value]) => (
                <div key={label} className={styles.summaryRow}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <footer className={styles.footer}>
        <div className={styles.progress} aria-label="Kemajuan pengisian">
          {[0, 1, 2, 3].map((part) => {
            const fill = part < chapter ? 1 : part === chapter ? chapterProgress : 0;
            return (
              <span key={part} className={styles.progressSegment}>
                <span className={styles.progressFill} style={{ width: `${fill * 100}%` }} />
              </span>
            );
          })}
        </div>
        <div className={styles.navRow}>
          <button type="button" className={styles.backButton} onClick={back} disabled={index === 0}>
            Kembali
          </button>
          <button type="button" className={styles.nextButton} onClick={next} disabled={index === screens.length - 1}>
            {screen === "details" ? "Periksa" : screen === "review" ? "Selesai" : "Lanjut"}
          </button>
        </div>
      </footer>
    </main>
  );
}
