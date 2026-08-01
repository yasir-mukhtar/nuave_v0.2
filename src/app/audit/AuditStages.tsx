"use client";

import {
  Alert,
  Button,
  Checkbox,
  Chip,
  Description,
  Disclosure,
  Fieldset,
  Form,
  Input,
  Label,
  ProgressBar,
  Spinner,
  Surface,
  TextArea,
  TextField,
} from "@heroui/react";
import {
  IconArrowLeft,
  IconArrowRight,
  IconExternalLink,
  IconRefresh,
  IconSearch,
  IconSparkles,
} from "@tabler/icons-react";
import type {
  AuditObservation,
  BusinessBrief,
  ExtractionDraft,
  PromptPack,
} from "@/lib/audit/types";
import type { PromptRunStatus } from "@/lib/audit/stream";
import styles from "./audit.module.css";

type Busy = "extract" | "prompts" | "run" | "report" | null;
type UpdateBrief = <K extends keyof BusinessBrief>(
  key: K,
  value: BusinessBrief[K],
) => void;

export const categoryLabels: Record<string, string> = {
  need_discovery: "Penemuan kebutuhan",
  solution_discovery: "Penemuan solusi",
  comparison: "Perbandingan",
  validation: "Validasi",
  action: "Tindakan",
};

const categories = [
  "need_discovery",
  "solution_discovery",
  "comparison",
  "validation",
  "action",
] as const;

function lines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function text(value: string[]) {
  return value.join("\n");
}

function sourceTitle(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function StageIntro({
  number,
  eyebrow,
  title,
  description,
}: {
  number: number;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className={styles.stageIntro} tabIndex={-1} id={`stage-${number}`}>
      <Chip color="accent" variant="soft">
        Langkah {number} · {eyebrow}
      </Chip>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  );
}

function TextInput({
  label,
  value,
  onChange,
  hint,
  placeholder,
  required,
  type = "text",
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <TextField fullWidth isRequired={required} isDisabled={disabled}>
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint ? <Description>{hint}</Description> : null}
    </TextField>
  );
}

function LongInput({
  label,
  value,
  onChange,
  hint,
  required,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  required?: boolean;
  rows?: number;
}) {
  return (
    <TextField fullWidth isRequired={required}>
      <Label>{label}</Label>
      <TextArea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint ? <Description>{hint}</Description> : null}
    </TextField>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <Surface variant="default" className={styles.panel}>
      {children}
    </Surface>
  );
}

export function SourceStep({
  websiteUrl,
  setWebsiteUrl,
  brief,
  updateBrief,
  busy,
  factsExtracted,
  onExtract,
}: {
  websiteUrl: string;
  setWebsiteUrl: (value: string) => void;
  brief: BusinessBrief;
  updateBrief: UpdateBrief;
  busy: Busy;
  factsExtracted: boolean;
  onExtract: () => void;
}) {
  return (
    <section className={styles.workspace}>
      <StageIntro
        number={1}
        eyebrow="Sumber resmi"
        title="Mulai audit dari informasi yang dapat diperiksa."
        description="Nuave menyusun draf dari website resmi. Anda akan memeriksa semua fakta sebelum satu pertanyaan pun dijalankan."
      />
      <Panel>
        <Form
          onSubmit={(event) => {
            event.preventDefault();
            onExtract();
          }}
        >
          <Fieldset>
            <Fieldset.Legend>Informasi awal bisnis</Fieldset.Legend>
            <Fieldset.Group className={styles.gridTwo}>
              <TextInput
                label="Website resmi"
                type="url"
                required
                value={websiteUrl}
                placeholder="https://contoh.co.id"
                hint="Sumber utama untuk draf fakta."
                onChange={setWebsiteUrl}
              />
              <TextInput
                label="Nama brand"
                value={brief.brand_name}
                placeholder="Nama publik brand"
                onChange={(value) => updateBrief("brand_name", value)}
              />
              <TextInput
                label="Pasar atau lokasi"
                value={brief.market_context}
                placeholder="Contoh: Depok, Indonesia"
                onChange={(value) => updateBrief("market_context", value)}
              />
              <TextInput
                label="Kategori bisnis"
                value={brief.category}
                placeholder="Contoh: klinik gigi"
                onChange={(value) => updateBrief("category", value)}
              />
            </Fieldset.Group>
            <Fieldset.Actions className={styles.actionRow}>
              <p>Ekstraksi dibatasi pada informasi publik dari domain resmi.</p>
              <Button
                type="submit"
                variant="primary"
                isDisabled={Boolean(busy)}
              >
                {busy === "extract" ? <Spinner size="sm" /> : <IconSearch />}
                {factsExtracted ? "Analisis ulang" : "Analisis website"}
              </Button>
            </Fieldset.Actions>
          </Fieldset>
        </Form>
      </Panel>
    </section>
  );
}

export function BriefStep({
  brief,
  updateBrief,
  extraction,
  factsConfirmed,
  setFactsConfirmed,
  busy,
  onGenerate,
  onBack,
  onLogo,
}: {
  brief: BusinessBrief;
  updateBrief: UpdateBrief;
  extraction: ExtractionDraft | null;
  factsConfirmed: boolean;
  setFactsConfirmed: (value: boolean) => void;
  busy: Busy;
  onGenerate: () => void;
  onBack: () => void;
  onLogo: (file: File | undefined) => void;
}) {
  return (
    <section className={styles.workspace}>
      <Button variant="ghost" onPress={onBack} className={styles.backButton}>
        <IconArrowLeft /> Ubah sumber
      </Button>
      <StageIntro
        number={2}
        eyebrow="Verifikasi fakta"
        title="Pastikan brief hanya berisi fakta yang dapat dipertanggungjawabkan."
        description="Nilai di bawah adalah draf ekstraksi, bukan fakta terverifikasi. Koreksi, lengkapi, lalu konfirmasikan."
      />

      {extraction?.warnings.length ? (
        <Alert status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Perlu diperiksa</Alert.Title>
            <Alert.Description>
              <ul className={styles.compactList}>
                {extraction.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      <Panel>
        <Fieldset>
          <Fieldset.Legend>Identitas dan cakupan</Fieldset.Legend>
          <Fieldset.Group className={styles.gridTwo}>
            <TextInput
              label="Nama brand"
              required
              value={brief.brand_name}
              onChange={(value) => updateBrief("brand_name", value)}
            />
            <TextInput
              label="Cakupan entitas"
              required
              hint="Satu cabang, brand, atau lini produk yang diuji."
              value={brief.entity_scope}
              onChange={(value) => updateBrief("entity_scope", value)}
            />
            <TextInput
              label="Tipe brand"
              required
              value={brief.brand_type}
              onChange={(value) => updateBrief("brand_type", value)}
            />
            <TextInput
              label="Kategori"
              required
              value={brief.category}
              onChange={(value) => updateBrief("category", value)}
            />
            <TextInput
              label="Pasar atau lokasi"
              required
              value={brief.market_context}
              onChange={(value) => updateBrief("market_context", value)}
            />
            <LongInput
              label="Target customer"
              required
              value={brief.target_customer}
              onChange={(value) => updateBrief("target_customer", value)}
            />
          </Fieldset.Group>
        </Fieldset>
      </Panel>

      <Panel>
        <Fieldset>
          <Fieldset.Legend>Penawaran dan kebutuhan customer</Fieldset.Legend>
          <Fieldset.Group className={styles.gridTwo}>
            <LongInput
              label="Produk atau layanan"
              required
              hint="Satu item per baris."
              value={text(brief.verified_offerings)}
              onChange={(value) =>
                updateBrief("verified_offerings", lines(value))
              }
            />
            <LongInput
              label="Kebutuhan customer"
              required
              hint="Minimal dua, satu per baris."
              value={text(brief.verified_customer_needs)}
              onChange={(value) =>
                updateBrief("verified_customer_needs", lines(value))
              }
            />
            <LongInput
              label="Kriteria keputusan"
              required
              hint="Minimal dua faktor yang dapat diperiksa."
              value={text(brief.verified_decision_criteria)}
              onChange={(value) =>
                updateBrief("verified_decision_criteria", lines(value))
              }
            />
            <LongInput
              label="Sumber resmi"
              required
              hint="Satu URL per baris."
              value={text(brief.official_sources)}
              onChange={(value) =>
                updateBrief("official_sources", lines(value))
              }
            />
          </Fieldset.Group>
        </Fieldset>
      </Panel>

      <Panel>
        <Fieldset>
          <Fieldset.Legend>Kompetitor terverifikasi</Fieldset.Legend>
          <Fieldset.Group className={styles.gridThree}>
            <TextInput
              label="Nama"
              required
              value={brief.verified_competitor.name}
              onChange={(value) =>
                updateBrief("verified_competitor", {
                  ...brief.verified_competitor,
                  name: value,
                })
              }
            />
            <TextInput
              label="Cakupan"
              required
              value={brief.verified_competitor.scope}
              onChange={(value) =>
                updateBrief("verified_competitor", {
                  ...brief.verified_competitor,
                  scope: value,
                })
              }
            />
            <TextInput
              label="URL sumber"
              type="url"
              required
              value={brief.verified_competitor.source_url}
              onChange={(value) =>
                updateBrief("verified_competitor", {
                  ...brief.verified_competitor,
                  source_url: value,
                })
              }
            />
          </Fieldset.Group>
        </Fieldset>
      </Panel>

      <Disclosure className={styles.disclosure}>
        <Disclosure.Heading>
          <Disclosure.Trigger>
            Detail opsional dan branding laporan
            <Disclosure.Indicator />
          </Disclosure.Trigger>
        </Disclosure.Heading>
        <Disclosure.Content>
          <Disclosure.Body>
            <div className={styles.gridTwo}>
              <LongInput
                label="USP atau pembeda"
                value={brief.usp}
                onChange={(value) => updateBrief("usp", value)}
              />
              <LongInput
                label="Nama lain brand"
                value={text(brief.brand_name_variants)}
                onChange={(value) =>
                  updateBrief("brand_name_variants", lines(value))
                }
              />
              <TextInput
                label="Layanan prioritas"
                value={brief.priority_offering}
                onChange={(value) => updateBrief("priority_offering", value)}
              />
              <TextInput
                label="Tindakan konversi"
                value={brief.conversion_action}
                onChange={(value) => updateBrief("conversion_action", value)}
              />
              <LongInput
                label="Fakta yang sering keliru"
                value={text(brief.customer_supplied_facts)}
                onChange={(value) =>
                  updateBrief("customer_supplied_facts", lines(value))
                }
              />
              <LongInput
                label="Pertanyaan akurasi"
                value={text(brief.known_accuracy_questions)}
                onChange={(value) =>
                  updateBrief("known_accuracy_questions", lines(value))
                }
              />
              <LongInput
                label="Catatan kategori teregulasi"
                value={brief.regulated_category_notes}
                onChange={(value) =>
                  updateBrief("regulated_category_notes", value)
                }
              />
              <TextInput
                label="Nama agency"
                value={brief.agency_name}
                onChange={(value) => updateBrief("agency_name", value)}
              />
              <TextField fullWidth>
                <Label>Logo agency</Label>
                <Input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(event) => onLogo(event.target.files?.[0])}
                />
                <Description>PNG/JPG, maksimal 1 MB.</Description>
              </TextField>
            </div>
          </Disclosure.Body>
        </Disclosure.Content>
      </Disclosure>

      {extraction?.evidence.length ? (
        <Disclosure className={styles.disclosure}>
          <Disclosure.Heading>
            <Disclosure.Trigger>
              {extraction.evidence.length} catatan sumber ekstraksi
              <Disclosure.Indicator />
            </Disclosure.Trigger>
          </Disclosure.Heading>
          <Disclosure.Content>
            <Disclosure.Body>
              <div className={styles.evidenceList}>
                {extraction.evidence.map((item, index) => (
                  <div key={`${item.field}-${index}`}>
                    <strong>{item.field}</strong>
                    <span>{item.value}</span>
                    <a href={item.source_url} target="_blank" rel="noreferrer">
                      {sourceTitle(item.source_url)} <IconExternalLink />
                    </a>
                  </div>
                ))}
              </div>
            </Disclosure.Body>
          </Disclosure.Content>
        </Disclosure>
      ) : null}

      <Panel>
        <Checkbox
          isSelected={factsConfirmed}
          onChange={setFactsConfirmed}
          variant="secondary"
        >
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <Label>
              Saya sudah memeriksa fakta ini dan mengizinkannya dipakai untuk
              menyusun pertanyaan audit.
            </Label>
          </Checkbox.Content>
        </Checkbox>
        <div className={styles.actionRow}>
          <p>
            Nuave akan membuat tepat lima pertanyaan tanpa brand dan lima dengan
            brand.
          </p>
          <Button
            variant="primary"
            onPress={onGenerate}
            isDisabled={Boolean(busy) || !factsConfirmed}
          >
            {busy === "prompts" ? <Spinner size="sm" /> : <IconArrowRight />}
            Buat 10 pertanyaan
          </Button>
        </div>
      </Panel>
    </section>
  );
}

export function QuestionsStep({
  pack,
  brandName,
  busy,
  onEdit,
  onBack,
  onRun,
}: {
  pack: PromptPack;
  brandName: string;
  busy: Busy;
  onEdit: (index: number, value: string) => void;
  onBack: () => void;
  onRun: () => void;
}) {
  return (
    <section className={styles.workspace}>
      <Button variant="ghost" onPress={onBack} className={styles.backButton}>
        <IconArrowLeft /> Kembali ke fakta
      </Button>
      <StageIntro
        number={3}
        eyebrow="Tinjau pertanyaan"
        title="Periksa sepuluh pertanyaan sebelum audit dijalankan."
        description={`Pertanyaan tanpa brand tidak boleh memberi petunjuk tentang ${brandName}. Setiap pertanyaan akan dijalankan sebagai pengujian independen.`}
      />
      <div className={styles.summaryChips}>
        <Chip color="accent" variant="soft">
          5 tanpa brand
        </Chip>
        <Chip color="success" variant="soft">
          5 dengan brand
        </Chip>
        <Chip variant="soft">Target: ChatGPT</Chip>
      </div>
      {pack.warnings.length ? (
        <Alert status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Peringatan dari generator</Alert.Title>
            <Alert.Description>{pack.warnings.join(" ")}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}
      <div className={styles.categoryList}>
        {categories.map((category) => (
          <Panel key={category}>
            <h2>{categoryLabels[category]}</h2>
            <div className={styles.promptPair}>
              {pack.prompts.map((prompt, index) =>
                prompt.category === category ? (
                  <TextField fullWidth key={prompt.prompt_id}>
                    <div className={styles.promptMeta}>
                      <Chip
                        size="sm"
                        color={prompt.branded ? "success" : "accent"}
                        variant="soft"
                      >
                        {prompt.branded ? "Dengan brand" : "Tanpa brand"}
                      </Chip>
                      <code>{prompt.prompt_id}</code>
                    </div>
                    <Label>Pertanyaan {index + 1}</Label>
                    <TextArea
                      rows={3}
                      value={prompt.question}
                      onChange={(event) => onEdit(index, event.target.value)}
                    />
                    <Description>{prompt.rationale}</Description>
                  </TextField>
                ) : null,
              )}
            </div>
          </Panel>
        ))}
      </div>
      <Surface variant="secondary" className={styles.stickyAction}>
        <div>
          <strong>Siap menjalankan 10 pengujian independen</strong>
          <span>Setelah dimulai, brief dan pertanyaan akan dikunci.</span>
        </div>
        <Button variant="primary" onPress={onRun} isDisabled={Boolean(busy)}>
          <IconSparkles /> Jalankan audit
        </Button>
      </Surface>
    </section>
  );
}

export function RunStep({
  pack,
  statuses,
  observations,
  busy,
  interrupted,
  onRerun,
  onRetryReport,
}: {
  pack: PromptPack;
  statuses: Record<string, PromptRunStatus>;
  observations: AuditObservation[];
  busy: Busy;
  interrupted: boolean;
  onRerun: () => void;
  onRetryReport: () => void;
}) {
  const completed = observations.length;
  const reporting = busy === "report";
  return (
    <section className={styles.workspace}>
      <StageIntro
        number={4}
        eyebrow="Jalankan audit"
        title={
          reporting
            ? "Semua observasi selesai. Menyusun laporan…"
            : "Mengumpulkan sepuluh observasi independen."
        }
        description="Kemajuan di bawah berasal dari respons server yang sebenarnya. Pengujian gagal tetap disimpan dan ditandai secara eksplisit."
      />
      {interrupted ? (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Proses audit terputus</Alert.Title>
            <Alert.Description>
              {completed} dari 10 observasi tersimpan. Nuave tidak mengklaim
              dapat melanjutkan sesi server yang terputus.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}
      <Panel>
        <ProgressBar
          aria-label={reporting ? "Menyusun laporan" : "Kemajuan audit"}
          value={completed}
          maxValue={10}
          isIndeterminate={reporting}
          color={reporting ? "accent" : "success"}
        >
          <ProgressBar.Output>
            {reporting ? "Menyusun laporan" : `${completed} dari 10 selesai`}
          </ProgressBar.Output>
          <ProgressBar.Track>
            <ProgressBar.Fill />
          </ProgressBar.Track>
        </ProgressBar>
        <div className={styles.runList}>
          {pack.prompts.map((prompt, index) => {
            const status = statuses[prompt.prompt_id] ?? "pending";
            const observation = observations.find(
              (item) => item.prompt_id === prompt.prompt_id,
            );
            const color =
              status === "failed"
                ? "danger"
                : status === "completed"
                  ? "success"
                  : status === "running"
                    ? "accent"
                    : "default";
            return (
              <div className={styles.runRow} key={prompt.prompt_id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{categoryLabels[prompt.category]}</strong>
                  <small>{prompt.question}</small>
                  {observation?.failure_reason ? (
                    <small className={styles.failure}>
                      {observation.failure_reason}
                    </small>
                  ) : null}
                </div>
                <Chip color={color} variant="soft" size="sm">
                  {status === "running" ? <Spinner size="sm" /> : null}
                  {status === "pending"
                    ? "Menunggu"
                    : status === "running"
                      ? "Berjalan"
                      : status === "failed"
                        ? "Gagal"
                        : "Selesai"}
                </Chip>
              </div>
            );
          })}
        </div>
        {interrupted ? (
          <div className={styles.actionRow}>
            <p>
              Pengulangan menjalankan kembali seluruh sepuluh pertanyaan dan
              mengganti observasi parsial.
            </p>
            <Button variant="primary" onPress={onRerun}>
              <IconRefresh /> Jalankan ulang semua
            </Button>
          </div>
        ) : null}
        {!busy && completed === 10 ? (
          <div className={styles.actionRow}>
            <p>
              Observasi lengkap. Pembuatan laporan sebelumnya belum selesai.
            </p>
            <Button variant="primary" onPress={onRetryReport}>
              <IconRefresh /> Coba buat laporan lagi
            </Button>
          </div>
        ) : null}
      </Panel>
    </section>
  );
}
