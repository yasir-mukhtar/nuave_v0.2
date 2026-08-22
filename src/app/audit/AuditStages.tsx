"use client";

import { useState } from "react";
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
import { INDONESIAN_RUN_STATUS_LABELS } from "@/lib/audit/report-labels";
import styles from "./audit.module.css";

type Busy = "extract" | "prompts" | "run" | "report" | null;
type UpdateBrief = <K extends keyof BusinessBrief>(
  key: K,
  value: BusinessBrief[K],
) => void;

export const categoryLabels: Record<string, string> = {
  need_discovery: "Need discovery",
  solution_discovery: "Solution discovery",
  comparison: "Comparison",
  validation: "Validation",
  action: "Action",
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
      <p className={styles.stageMeta}>
        Step {number} of 4 <span aria-hidden="true">·</span> {eyebrow}
      </p>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  );
}

function StageSection({
  id,
  title,
  description,
  children,
  className = "",
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`${styles.stageSection} ${className}`}>
      <header className={styles.stageSectionHeader}>
        <h2 id={id}>{title}</h2>
        {description ? <p>{description}</p> : null}
      </header>
      <div className={styles.stageSectionBody}>{children}</div>
    </section>
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

function LineListEditor({
  label,
  initialValue,
  onChange,
  hint,
  required,
  rows = 3,
}: {
  label: string;
  initialValue: string;
  onChange: (value: string[]) => void;
  hint?: string;
  required?: boolean;
  rows?: number;
}) {
  const [draft, setDraft] = useState(initialValue);

  function commitDraft() {
    const normalizedValue = lines(draft);
    setDraft(text(normalizedValue));
    onChange(normalizedValue);
  }

  return (
    <TextField fullWidth isRequired={required}>
      <Label>{label}</Label>
      <TextArea
        rows={rows}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commitDraft}
      />
      {hint ? <Description>{hint}</Description> : null}
    </TextField>
  );
}

function LineListInput({
  label,
  value,
  onChange,
  hint,
  required,
  rows = 3,
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  hint?: string;
  required?: boolean;
  rows?: number;
}) {
  const serializedValue = text(value);
  return (
    <LineListEditor
      key={serializedValue}
      label={label}
      initialValue={serializedValue}
      onChange={onChange}
      hint={hint}
      required={required}
      rows={rows}
    />
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
    <section className={`${styles.workspace} ${styles.workspaceFocused}`}>
      <StageIntro
        number={1}
        eyebrow="Official source"
        title="Start with facts you can verify."
        description="Add the client's official website. Nuave will draft the business brief, and you will check every fact before the audit runs."
      />
      <Form
        className={styles.stageForm}
        onSubmit={(event) => {
          event.preventDefault();
          onExtract();
        }}
      >
        <StageSection
          id="client-business-heading"
          title="Client business"
          description="Use the official business identity so every later observation refers to the right entity."
          className={styles.focusedSection}
        >
          <Fieldset aria-labelledby="client-business-heading">
            <Fieldset.Group className={styles.gridTwo}>
              <TextInput
                label="Official website"
                type="url"
                required
                value={websiteUrl}
                placeholder="https://example.com"
                hint="Nuave uses this domain as the primary source for the draft."
                onChange={setWebsiteUrl}
              />
              <TextInput
                label="Brand name"
                value={brief.brand_name}
                placeholder="Public brand name"
                onChange={(value) => updateBrief("brand_name", value)}
              />
              <TextInput
                label="Market or location"
                value={brief.market_context}
                placeholder="For example: Jakarta, Indonesia"
                onChange={(value) => updateBrief("market_context", value)}
              />
              <TextInput
                label="Business category"
                value={brief.category}
                placeholder="For example: dental clinic"
                onChange={(value) => updateBrief("category", value)}
              />
            </Fieldset.Group>
            <Fieldset.Actions
              className={`${styles.actionRow} ${styles.inlineAction}`}
            >
              <p>Only public information from the official domain is used.</p>
              <Button
                type="submit"
                variant="primary"
                isDisabled={Boolean(busy)}
              >
                {busy === "extract" ? <Spinner size="sm" /> : <IconSearch />}
                {factsExtracted ? "Analyze again" : "Draft the client brief"}
              </Button>
            </Fieldset.Actions>
          </Fieldset>
        </StageSection>
      </Form>
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
    <section className={`${styles.workspace} ${styles.workspaceWide}`}>
      <Button variant="ghost" onPress={onBack} className={styles.backButton}>
        <IconArrowLeft /> Change website
      </Button>
      <StageIntro
        number={2}
        eyebrow="Verify facts"
        title="Check the client brief before it shapes the audit."
        description="These details are a draft, not verified facts. Correct anything that is wrong, fill any gaps, then confirm the brief."
      />

      {extraction?.warnings.length ? (
        <Alert status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Review these items</Alert.Title>
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

      <StageSection
        id="identity-scope-heading"
        title="Identity and audit scope"
        description="Confirm the exact business, market, and customer context the audit will test."
      >
        <Fieldset aria-labelledby="identity-scope-heading">
          <Fieldset.Group className={styles.gridTwo}>
            <TextInput
              label="Brand name"
              required
              value={brief.brand_name}
              onChange={(value) => updateBrief("brand_name", value)}
            />
            <TextInput
              label="Business scope"
              required
              hint="The one branch, brand, or product line this audit will test."
              value={brief.entity_scope}
              onChange={(value) => updateBrief("entity_scope", value)}
            />
            <TextInput
              label="Brand type"
              required
              value={brief.brand_type}
              onChange={(value) => updateBrief("brand_type", value)}
            />
            <TextInput
              label="Category"
              required
              value={brief.category}
              onChange={(value) => updateBrief("category", value)}
            />
            <TextInput
              label="Market or location"
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
      </StageSection>

      <StageSection
        id="offer-needs-heading"
        title="Offer and customer needs"
        description="Keep each list specific enough to support ordinary customer questions."
      >
        <Fieldset aria-labelledby="offer-needs-heading">
          <Fieldset.Group className={styles.gridTwo}>
            <LineListInput
              label="Products or services"
              required
              hint="One verified item per line."
              value={brief.verified_offerings}
              onChange={(value) => updateBrief("verified_offerings", value)}
            />
            <LineListInput
              label="Customer needs"
              hint="Optional. Add one need per line."
              value={brief.verified_customer_needs}
              onChange={(value) =>
                updateBrief("verified_customer_needs", value)
              }
            />
            <LineListInput
              label="Decision criteria"
              hint="Optional. Add one factor per line."
              value={brief.verified_decision_criteria}
              onChange={(value) =>
                updateBrief("verified_decision_criteria", value)
              }
            />
            <LineListInput
              label="Official sources"
              required
              hint="One URL per line."
              value={brief.official_sources}
              onChange={(value) => updateBrief("official_sources", value)}
            />
          </Fieldset.Group>
        </Fieldset>
      </StageSection>

      <StageSection
        id="competitor-heading"
        title="Verified competitor"
        description="Use one real comparison business with enough scope to avoid a name-only match."
      >
        <Fieldset aria-labelledby="competitor-heading">
          <Fieldset.Group className={styles.gridThree}>
            <TextInput
              label="Name"
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
              label="Scope"
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
              label="Source URL"
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
      </StageSection>

      <Disclosure className={styles.disclosure}>
        <Disclosure.Heading>
          <Disclosure.Trigger>
            Optional details and report branding
            <Disclosure.Indicator />
          </Disclosure.Trigger>
        </Disclosure.Heading>
        <Disclosure.Content>
          <Disclosure.Body>
            <div className={styles.gridTwo}>
              <LongInput
                label="Differentiator"
                value={brief.usp}
                onChange={(value) => updateBrief("usp", value)}
              />
              <LineListInput
                label="Other brand names"
                value={brief.brand_name_variants}
                onChange={(value) => updateBrief("brand_name_variants", value)}
              />
              <TextInput
                label="Priority offer"
                value={brief.priority_offering}
                onChange={(value) => updateBrief("priority_offering", value)}
              />
              <TextInput
                label="Customer next step"
                value={brief.conversion_action}
                onChange={(value) => updateBrief("conversion_action", value)}
              />
              <LineListInput
                label="Facts that are often wrong"
                value={brief.customer_supplied_facts}
                onChange={(value) =>
                  updateBrief("customer_supplied_facts", value)
                }
              />
              <LineListInput
                label="Accuracy questions"
                value={brief.known_accuracy_questions}
                onChange={(value) =>
                  updateBrief("known_accuracy_questions", value)
                }
              />
              <LongInput
                label="Regulated-category notes"
                value={brief.regulated_category_notes}
                onChange={(value) =>
                  updateBrief("regulated_category_notes", value)
                }
              />
              <TextInput
                label="Agency name"
                value={brief.agency_name}
                onChange={(value) => updateBrief("agency_name", value)}
              />
              <TextField fullWidth>
                <Label>Agency logo</Label>
                <Input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(event) => onLogo(event.target.files?.[0])}
                />
                <Description>PNG or JPG, up to 1 MB.</Description>
              </TextField>
            </div>
          </Disclosure.Body>
        </Disclosure.Content>
      </Disclosure>

      {extraction?.evidence.length ? (
        <Disclosure className={styles.disclosure}>
          <Disclosure.Heading>
            <Disclosure.Trigger>
              {extraction.evidence.length} extraction source notes
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

      <div className={styles.stickyAction}>
        <div className={styles.confirmation}>
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
                I have checked these facts and approve them for use in the audit
                questions.
              </Label>
            </Checkbox.Content>
          </Checkbox>
        </div>
        <div className={styles.actionRow}>
          <p>
            Nuave builds five unbranded and five branded questions from these
            verified facts. This step makes no API call and costs nothing.
          </p>
          <Button
            variant="primary"
            onPress={onGenerate}
            isDisabled={Boolean(busy) || !factsConfirmed}
          >
            {busy === "prompts" ? <Spinner size="sm" /> : <IconArrowRight />}
            Create 10 audit questions
          </Button>
        </div>
      </div>
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
    <section className={`${styles.workspace} ${styles.workspaceWide}`}>
      <Button variant="ghost" onPress={onBack} className={styles.backButton}>
        <IconArrowLeft /> Back to client brief
      </Button>
      <StageIntro
        number={3}
        eyebrow="Review questions"
        title="Review the ten questions before you run the audit."
        description={`Unbranded questions must not hint at ${brandName}. Each question runs as a separate observation.`}
      />
      <div className={styles.summaryChips}>
        <Chip color="accent" variant="soft">
          5 unbranded
        </Chip>
        <Chip color="success" variant="soft">
          5 branded
        </Chip>
        <Chip variant="soft">Target: ChatGPT</Chip>
      </div>
      {pack.warnings.length ? (
        <Alert status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Question generator warning</Alert.Title>
            <Alert.Description>{pack.warnings.join(" ")}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}
      <div className={styles.categoryList}>
        {categories.map((category) => (
          <StageSection
            key={category}
            id={`category-${category}`}
            title={categoryLabels[category]}
            className={styles.promptSection}
          >
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
                        {prompt.branded ? "Branded" : "Unbranded"}
                      </Chip>
                      <code>{prompt.prompt_id}</code>
                    </div>
                    <Label>Question {index + 1}</Label>
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
          </StageSection>
        ))}
      </div>
      <div className={styles.stickyAction}>
        <div>
          <strong>Ready to run 10 independent observations</strong>
          <span>
            The client brief and questions lock when the audit starts.
          </span>
        </div>
        <Button variant="primary" onPress={onRun} isDisabled={Boolean(busy)}>
          <IconSparkles /> Run the audit
        </Button>
      </div>
    </section>
  );
}

export type RunUnfinishedState = {
  completed: number;
  failedPromptIds: string[];
  message: string;
};
