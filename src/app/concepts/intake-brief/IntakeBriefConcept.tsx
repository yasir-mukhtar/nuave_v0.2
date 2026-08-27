"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconChevronDown,
  IconExternalLink,
  IconInfoCircle,
  IconPlus,
  IconSparkles,
  IconX,
} from "@tabler/icons-react";
import styles from "./intake-brief.module.css";

type SimilarBusiness = {
  name: string;
  url: string;
};

type FieldProps = {
  label: string;
  hint: string;
  badge?: "found" | "suggested" | "you";
  children: React.ReactNode;
};

const stepLabels = [
  "Fakta bisnis",
  "Periksa fakta",
  "Periksa pertanyaan",
  "Jalankan audit",
];

const badgeCopy = {
  found: "Ditemukan Nuave",
  suggested: "Saran Nuave",
  you: "Dari Anda",
} as const;

function Field({ label, hint, badge, children }: FieldProps) {
  return (
    <div className={styles.field}>
      <div className={styles.fieldLabelRow}>
        <label className={styles.label}>{label}</label>
        {badge ? (
          <span
            className={`${styles.fieldBadge} ${styles[`fieldBadge_${badge}`]}`}
          >
            {badge === "suggested" ? <IconSparkles size={14} /> : null}
            {badgeCopy[badge]}
          </span>
        ) : null}
      </div>
      {children}
      <p className={styles.hint}>{hint}</p>
    </div>
  );
}

function TagEditor({
  items,
  setItems,
  placeholder,
}: {
  items: string[];
  setItems: (items: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");

  function addItem() {
    const value = draft.trim();
    if (!value || items.includes(value)) return;
    setItems([...items, value]);
    setDraft("");
  }

  return (
    <div className={styles.tagEditor}>
      <div className={styles.tags}>
        {items.map((item) => (
          <span className={styles.tag} key={item}>
            {item}
            <button
              type="button"
              aria-label={`Hapus ${item}`}
              onClick={() => setItems(items.filter((candidate) => candidate !== item))}
            >
              <IconX size={14} />
            </button>
          </span>
        ))}
      </div>
      <div className={styles.inlineAdd}>
        <input
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addItem();
            }
          }}
        />
        <button type="button" className={styles.secondaryButton} onClick={addItem}>
          <IconPlus size={18} /> Tambah
        </button>
      </div>
    </div>
  );
}

export default function IntakeBriefConcept() {
  const [brandName, setBrandName] = useState("Kopi Kenangan");
  const [auditScope, setAuditScope] = useState("Kopi Kenangan — brand, Indonesia");
  const [brandType, setBrandType] = useState("Jaringan kopi grab-and-go");
  const [category, setCategory] = useState("Kedai kopi & minuman");
  const [market, setMarket] = useState(
    "Melayani pelanggan di berbagai kota di Indonesia, terutama kawasan urban dan pusat aktivitas.",
  );
  const [targetCustomer, setTargetCustomer] = useState(
    "Konsumen urban, mahasiswa, dan pekerja yang mencari kopi praktis dengan harga terjangkau untuk rutinitas harian, takeaway, atau delivery.",
  );
  const [offerings, setOfferings] = useState([
    "Kopi dan minuman berbasis kopi",
    "Kenangan Beans",
    "Makanan pendamping",
  ]);
  const [customerNeeds, setCustomerNeeds] = useState([
    "Kopi cepat sebelum bekerja atau beraktivitas",
    "Pilihan kopi harian yang terjangkau",
    "Pesan antar yang praktis",
    "Rasa yang familiar dan konsisten",
  ]);
  const [decisionCriteria, setDecisionCriteria] = useState([
    "Harga",
    "Rasa",
    "Lokasi",
    "Kemudahan delivery",
    "Pilihan menu",
    "Promo",
  ]);
  const [similarBusinesses, setSimilarBusinesses] = useState<SimilarBusiness[]>([
    { name: "Fore Coffee", url: "https://fore.coffee" },
    { name: "Janji Jiwa", url: "https://kopijanjijiwa.com" },
    { name: "Tomoro Coffee", url: "https://tomoro-coffee.com" },
  ]);
  const [showBusinessForm, setShowBusinessForm] = useState(false);
  const [newBusinessName, setNewBusinessName] = useState("");
  const [newBusinessUrl, setNewBusinessUrl] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [differentiator, setDifferentiator] = useState(
    "Kopi lokal grab-and-go dengan identitas rasa Indonesia dan akses yang mudah untuk kebutuhan sehari-hari.",
  );
  const [priority, setPriority] = useState("Kopi susu, minuman signature, dan delivery");
  const [goal, setGoal] = useState("");
  const [geoPriority, setGeoPriority] = useState("");
  const [claims, setClaims] = useState("");
  const [extraContext, setExtraContext] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [ctaMessage, setCtaMessage] = useState("");

  function addSimilarBusiness() {
    const name = newBusinessName.trim();
    const url = newBusinessUrl.trim();
    if (!name || !url) return;
    setSimilarBusinesses([...similarBusinesses, { name, url }]);
    setNewBusinessName("");
    setNewBusinessUrl("");
    setShowBusinessForm(false);
  }

  return (
    <main className={styles.shell} lang="id" data-theme="light">
      <header className={styles.topbar}>
        <Link href="/" className={styles.brand} aria-label="Nuave">
          <Image
            src="/logo-nuave-horizontal.png"
            width={152}
            height={48}
            priority
            alt="Nuave"
          />
        </Link>
        <span className={styles.prototypeBadge}>Konsep desain · tidak menjalankan audit</span>
      </header>

      <nav className={styles.stepper} aria-label="Tahapan audit">
        <div className={styles.stepContext}>
          <span>Pengaturan audit</span>
          <strong>Langkah 2 dari 4</strong>
        </div>
        <ol className={styles.stepList}>
          {stepLabels.map((label, index) => (
            <li
              key={label}
              className={`${styles.step} ${index <= 1 ? styles.stepActive : ""} ${index === 0 ? styles.stepComplete : ""}`}
              aria-current={index === 1 ? "step" : undefined}
            >
              <span className={styles.stepBar} aria-hidden="true" />
              <span className={styles.stepLabel}>
                <span className={styles.stepMarker} aria-hidden="true">
                  {index === 0 ? <IconCheck size={12} /> : index + 1}
                </span>
                {label}
              </span>
            </li>
          ))}
        </ol>
      </nav>

      <div className={styles.workspace}>
        <Link href="/audit" className={styles.backLink}>
          <IconArrowLeft size={18} /> Kembali ke audit
        </Link>

        <header className={styles.intro}>
          <p className={styles.eyebrow}>Periksa pemahaman Nuave</p>
          <h1>Pastikan Nuave memahami bisnis Anda dengan benar.</h1>
          <p>
            Nuave sudah menyiapkan brief dari informasi publik. Tugas Anda cukup
            mengoreksi jika ada yang meleset dan menambahkan konteks yang hanya
            Anda yang tahu.
          </p>
        </header>

        <aside className={styles.reviewNotice}>
          <IconInfoCircle size={18} />
          <div>
            <strong>Fokuskan perhatian pada 3 asumsi Nuave</strong>
            <p>
              Target pelanggan, kebutuhan pelanggan, dan faktor pilihan tidak
              dinyatakan secara eksplisit di situs. Nuave menyarankan isinya agar
              Anda tidak mulai dari halaman kosong.
            </p>
          </div>
        </aside>

        <section className={styles.section} aria-labelledby="business-facts-heading">
          <header className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionIndex}>01</p>
              <h2 id="business-facts-heading">Fakta bisnis yang Nuave temukan</h2>
            </div>
            <p>
              Fakta dasar yang menentukan bisnis, kategori, dan pasar yang akan
              dinilai.
            </p>
          </header>

          <div className={styles.sectionBody}>
            <div className={styles.gridTwo}>
              <Field
                label="Nama brand"
                badge="found"
                hint="Nama publik yang digunakan pelanggan untuk mengenali bisnis ini."
              >
                <input value={brandName} onChange={(event) => setBrandName(event.target.value)} />
              </Field>
              <Field
                label="Cakupan audit"
                badge="found"
                hint="Entitas yang akan diuji. Bukan nama badan hukum perusahaan."
              >
                <input value={auditScope} onChange={(event) => setAuditScope(event.target.value)} />
              </Field>
              <Field
                label="Tipe bisnis"
                badge="found"
                hint="Bentuk bisnis yang membantu Nuave memahami cara pelanggan mencarinya."
              >
                <input value={brandType} onChange={(event) => setBrandType(event.target.value)} />
              </Field>
              <Field
                label="Kategori"
                badge="found"
                hint="Kategori utama yang akan digunakan saat membandingkan bisnis serupa."
              >
                <input value={category} onChange={(event) => setCategory(event.target.value)} />
              </Field>
              <div className={styles.fullWidth}>
                <Field
                  label="Pasar / area layanan"
                  badge="found"
                  hint="Wilayah tempat bisnis beroperasi atau melayani pelanggan. Kolom akan memanjang bila keterangannya lebih panjang."
                >
                  <textarea
                    className={styles.autoTextarea}
                    rows={2}
                    value={market}
                    onChange={(event) => setMarket(event.target.value)}
                  />
                </Field>
              </div>
            </div>

            <div className={styles.sourceSummary}>
              <div>
                <span>Sumber utama</span>
                <strong>kopikenangan.com</strong>
              </div>
              <span className={styles.sourceDivider} aria-hidden="true" />
              <p>
                Nuave menyimpan sumber di balik layar dan menampilkannya hanya
                saat membantu verifikasi fakta.
              </p>
              <a href="https://kopikenangan.com/" target="_blank" rel="noreferrer">
                Lihat sumber <IconExternalLink size={16} />
              </a>
            </div>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="customer-understanding-heading">
          <header className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionIndex}>02</p>
              <h2 id="customer-understanding-heading">Pemahaman Nuave tentang pelanggan</h2>
            </div>
            <p>
              Ini adalah hipotesis Nuave, bukan fakta absolut. Pertahankan yang
              masuk akal, hapus yang tidak relevan, atau ubah dengan konteks Anda.
            </p>
          </header>

          <div className={styles.sectionBody}>
            <Field
              label="Siapa yang biasanya menjadi pelanggan"
              badge="suggested"
              hint="Nuave memakai konteks ini agar pertanyaan audit mencerminkan pelanggan yang realistis."
            >
              <textarea
                className={styles.autoTextarea}
                rows={3}
                value={targetCustomer}
                onChange={(event) => setTargetCustomer(event.target.value)}
              />
            </Field>

            <Field
              label="Apa yang pelanggan cari atau butuhkan"
              badge="suggested"
              hint="Situasi atau kebutuhan yang membuat pelanggan mencari bisnis seperti ini."
            >
              <TagEditor
                items={customerNeeds}
                setItems={setCustomerNeeds}
                placeholder="Contoh: tempat meeting yang nyaman"
              />
            </Field>

            <Field
              label="Apa yang memengaruhi pilihan pelanggan"
              badge="suggested"
              hint="Hal yang biasanya dibandingkan pelanggan sebelum memilih satu bisnis dibanding yang lain."
            >
              <TagEditor
                items={decisionCriteria}
                setItems={setDecisionCriteria}
                placeholder="Contoh: ulasan pelanggan"
              />
            </Field>

            <Field
              label="Produk atau layanan utama"
              badge="found"
              hint="Item yang cukup penting untuk muncul dalam pertanyaan pelanggan biasa."
            >
              <TagEditor
                items={offerings}
                setItems={setOfferings}
                placeholder="Tambah produk atau layanan"
              />
            </Field>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="similar-business-heading">
          <header className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionIndex}>03</p>
              <h2 id="similar-business-heading">Bisnis lain yang serupa</h2>
            </div>
            <p>
              Nuave menambahkan bisnis yang kemungkinan dibandingkan pelanggan.
              Hapus jika kurang tepat atau tambahkan versi Anda sendiri.
            </p>
          </header>

          <div className={styles.sectionBody}>
            <div className={styles.similarList}>
              {similarBusinesses.map((business) => (
                <div className={styles.similarRow} key={`${business.name}-${business.url}`}>
                  <div className={styles.similarMark} aria-hidden="true">
                    {business.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <strong>{business.name}</strong>
                    <span>{business.url.replace(/^https?:\/\//, "")}</span>
                  </div>
                  <span className={styles.fieldBadge}>
                    <IconSparkles size={14} /> Saran Nuave
                  </span>
                  <button
                    type="button"
                    className={styles.iconButton}
                    aria-label={`Hapus ${business.name}`}
                    onClick={() =>
                      setSimilarBusinesses(
                        similarBusinesses.filter((candidate) => candidate !== business),
                      )
                    }
                  >
                    <IconX size={18} />
                  </button>
                </div>
              ))}
            </div>

            {showBusinessForm ? (
              <div className={styles.addBusinessForm}>
                <Field label="Nama bisnis" hint="Nama brand atau bisnis yang ingin dibandingkan.">
                  <input
                    value={newBusinessName}
                    placeholder="Contoh: Starbucks"
                    onChange={(event) => setNewBusinessName(event.target.value)}
                  />
                </Field>
                <Field
                  label="URL"
                  hint="Website, profil Instagram, atau Google Business Profile."
                >
                  <input
                    value={newBusinessUrl}
                    placeholder="https://..."
                    onChange={(event) => setNewBusinessUrl(event.target.value)}
                  />
                </Field>
                <div className={styles.addBusinessActions}>
                  <button
                    type="button"
                    className={styles.ghostButton}
                    onClick={() => setShowBusinessForm(false)}
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={addSimilarBusiness}
                  >
                    Tambahkan bisnis
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className={styles.addBusinessButton}
                onClick={() => setShowBusinessForm(true)}
              >
                <IconPlus size={18} />
                <span>
                  <strong>Tambah bisnis serupa</strong>
                  <small>Website, Instagram, atau Google Business Profile</small>
                </span>
              </button>
            )}
          </div>
        </section>

        <section className={styles.advancedSection} aria-labelledby="advanced-heading">
          <button
            type="button"
            className={styles.advancedTrigger}
            aria-expanded={advancedOpen}
            onClick={() => setAdvancedOpen(!advancedOpen)}
          >
            <span className={styles.advancedIcon}>
              <IconSparkles size={18} />
            </span>
            <span className={styles.advancedCopy}>
              <span className={styles.advancedTitleLine}>
                <strong id="advanced-heading">Tambahkan konteks agar audit lebih relevan</strong>
                <span>Opsional · meningkatkan relevansi</span>
              </span>
              <small>
                Berguna jika website tidak menceritakan seluruh konteks bisnis Anda.
              </small>
            </span>
            <IconChevronDown
              size={18}
              className={advancedOpen ? styles.chevronOpen : undefined}
            />
          </button>

          {advancedOpen ? (
            <div className={styles.advancedBody}>
              <p className={styles.advancedLead}>
                Isi hanya informasi yang dapat mengubah cara Nuave membaca bisnis
                atau membuat rekomendasi. Branding laporan dipindahkan dari tahap
                ini karena tidak memengaruhi kualitas audit.
              </p>
              <div className={styles.gridTwo}>
                <Field
                  label="Apa yang membedakan bisnis ini"
                  badge="suggested"
                  hint="Posisi atau keunggulan yang seharusnya dipahami Nuave saat menilai bisnis."
                >
                  <textarea
                    className={styles.autoTextarea}
                    rows={3}
                    value={differentiator}
                    onChange={(event) => setDifferentiator(event.target.value)}
                  />
                </Field>
                <Field
                  label="Produk atau fokus yang diprioritaskan"
                  badge="suggested"
                  hint="Bagian bisnis yang paling penting untuk mendapatkan penilaian dan rekomendasi."
                >
                  <textarea
                    className={styles.autoTextarea}
                    rows={3}
                    value={priority}
                    onChange={(event) => setPriority(event.target.value)}
                  />
                </Field>
                <Field
                  label="Tujuan bisnis saat ini"
                  badge="you"
                  hint="Contoh: menarik pelanggan baru, membangun positioning premium, atau meningkatkan lead B2B."
                >
                  <textarea
                    className={styles.autoTextarea}
                    rows={3}
                    value={goal}
                    placeholder="Apa yang sedang ingin dicapai bisnis ini?"
                    onChange={(event) => setGoal(event.target.value)}
                  />
                </Field>
                <Field
                  label="Prioritas wilayah"
                  badge="you"
                  hint="Isi bila ada kota atau wilayah yang lebih penting daripada cakupan umum bisnis."
                >
                  <textarea
                    className={styles.autoTextarea}
                    rows={3}
                    value={geoPriority}
                    placeholder="Contoh: Jakarta, Bandung, Surabaya"
                    onChange={(event) => setGeoPriority(event.target.value)}
                  />
                </Field>
                <Field
                  label="Klaim, kredensial, atau fakta penting"
                  badge="you"
                  hint="Sertifikasi, award, keahlian, partnership, atau fakta yang perlu dipahami dengan tepat."
                >
                  <textarea
                    className={styles.autoTextarea}
                    rows={3}
                    value={claims}
                    placeholder="Tambahkan jika ada"
                    onChange={(event) => setClaims(event.target.value)}
                  />
                </Field>
                <Field
                  label="Hal lain yang perlu Nuave tahu"
                  badge="you"
                  hint="Tempat untuk konteks penting yang tidak cocok dengan kolom lain."
                >
                  <textarea
                    className={styles.autoTextarea}
                    rows={3}
                    value={extraContext}
                    placeholder="Tambahkan konteks lain jika perlu"
                    onChange={(event) => setExtraContext(event.target.value)}
                  />
                </Field>
              </div>
            </div>
          ) : null}
        </section>

        <div className={styles.removedNote}>
          <IconInfoCircle size={18} />
          <p>
            <strong>Catatan sumber ekstraksi tidak lagi menjadi accordion.</strong>{" "}
            Provenance tetap disimpan, tetapi ditampilkan dekat fakta yang memang
            perlu diverifikasi. Branding laporan juga dipindahkan ke tahap setelah
            laporan tersedia.
          </p>
        </div>
      </div>

      <footer className={styles.stickyFooter}>
        <div className={styles.footerInner}>
          <label className={styles.confirmation}>
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => {
                setConfirmed(event.target.checked);
                setCtaMessage("");
              }}
            />
            <span>
              Saya sudah memeriksa brief ini dan setuju Nuave menggunakannya untuk
              membuat pertanyaan audit.
            </span>
          </label>
          <div className={styles.footerAction}>
            <p>
              Langkah berikutnya membuat 10 pertanyaan audit dari brief yang sudah
              Anda periksa.
            </p>
            <button
              type="button"
              className={styles.primaryButton}
              disabled={!confirmed}
              onClick={() =>
                setCtaMessage(
                  "Ini hanya konsep interaktif. Tidak ada pertanyaan atau API call yang dibuat.",
                )
              }
            >
              Lanjut ke pertanyaan <IconArrowRight size={18} />
            </button>
          </div>
          {ctaMessage ? (
            <p className={styles.prototypeMessage} role="status">
              {ctaMessage}
            </p>
          ) : null}
        </div>
      </footer>
    </main>
  );
}
