/**
 * Server-side adapter for the founder-only local GLM question experiment
 * (LOCAL_FOUNDER_TEST_HANDOFF.md, 2026-09-17; Spec 009 direct-ten method
 * added 2026-09-18). Imported only by
 * src/app/api/audit/glm-questions/route.ts — the explicitly named experimental
 * caller — and never bundled for the client.
 *
 * Pipeline: frozen local intake → parseQuestionFactsV3 → one minimized brief
 * → direct-ten request builder → one transport call → assess → strict
 * extract → validate. Missing or invalid facts come back as corrections;
 * nothing is invented.
 *
 * `method` is explicit: "direct-ten" is the approved Spec 009 flow and the
 * only one the public route serves (Spec 010 R-02a); the dormant "glm-slots"
 * matrix prototype was archived with the old flow (R-09).
 *
 * One request per attempt. No automatic retries, no fallback pack, no logging
 * of prompts or responses, no credential handling here beyond the server env
 * the live transport reads at call time. The default transport is a labeled
 * synthetic stub; the live transport runs only when the server-selected mode
 * is "live" (NUAVE_AUDIT_MODE, Spec 010 R-02) with a server-side key.
 *
 * Spec 010 R-05: a live send touches the filesystem only for local evidence
 * runs — when `evidenceDir` is passed or NUAVE_GLM_EVIDENCE_DIR is set. With
 * neither, the frozen-attempt/`attempt.consumed` gate and the response-body
 * evidence writes are skipped entirely (Cloudflare Workers has no disk).
 */
import { createHash } from "node:crypto";
import { mkdir, open, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { auditMode, glmKeyPresent } from "../audit/deployment-gate";
import {
  parseQuestionFactsV3,
  type QuestionFactsV3,
} from "../audit/question-facts-v3";
import {
  assessCheaperInferenceIndonesianResponse,
  cheaperInferenceBilledCostUsd,
  INDONESIAN_QUESTION_GLM_CLIENT_WAIT_MS,
  INDONESIAN_QUESTION_GLM_ENDPOINT,
  INDONESIAN_QUESTION_GLM_MODEL,
} from "../audit/questions-id-glm";
import {
  buildDirectTenQuestionRequest,
  buildDirectTenWriterBrief,
  extractDirectTenQuestions,
  validateDirectTenQuestionPack,
} from "../audit/questions-id-direct-ten";
import {
  isLocalIntakeFingerprintValid,
  LOCAL_INTAKE_INPUT_VERSION,
  type FrozenLocalIntake,
} from "./frozen-intake";
import type { GlmPackProvenance, GlmQuestionsOutcome } from "./local-questions";

export type GlmTransportEnvelope = {
  httpStatus: number;
  body: unknown;
  /** Exact raw response bytes for owner-only evidence (live transport only). */
  rawBody?: string;
  /** Transport-level failure detail (timeout, network) — never a secret. */
  transportError?: string;
};

export type GlmQuestionTransport = {
  kind: "synthetic-stub" | "cheaper-inference";
  /** Performs exactly one request; the transport itself never retries. */
  call: (requestBody: unknown) => Promise<GlmTransportEnvelope>;
};

export type GlmStubBehavior = "ok" | "malformed" | "timeout" | "mismatch";
const GLM_STUB_BEHAVIORS: readonly GlmStubBehavior[] = [
  "ok",
  "malformed",
  "timeout",
  "mismatch",
];

/** The question-generation method a preparation request runs. "direct-ten"
 * is the approved Spec 009 contract and the only method left after the
 * "glm-slots" matrix prototype was archived with the old flow (Spec 010
 * R-09). The explicit field stays on the wire and in provenance so legacy
 * session records carrying a "glm-slots" pack remain honestly labeled. */
export type GlmQuestionMethod = "direct-ten";

export { glmKeyPresent };

/** A real provider request needs the server-selected live mode and a
 * server-side credential — both. The synthetic stub is the default
 * transport in every other configuration. */
export function glmLiveAuthorized(): boolean {
  return auditMode() === "live" && glmKeyPresent();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/* ── Single-attempt binding, consumption and evidence (B1) ──
 * The authorized live attempt is bound to frozen artifacts: the exact intake
 * record and the exact outbound request body, each pinned by SHA-256. The
 * send path verifies both, then atomically consumes `attempt.consumed`
 * (fs.open "wx") before the one allowed request — duplicate, concurrent,
 * refresh, retry, or post-timeout calls can never send again. Raw response
 * bytes and the outcome are preserved in the owner-only evidence dir. */

function glmEvidenceDir(explicit: string | undefined): string {
  return (
    explicit ??
    process.env.NUAVE_GLM_EVIDENCE_DIR ??
    join(process.cwd(), ".local-evidence", "glm-direct-ten")
  );
}

function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

type FrozenGate =
  | { ok: true; requestHash: string }
  | { ok: false; reason: string; detail: string; requestHash: string };

async function verifyFrozenAttempt(
  dir: string,
  intake: unknown,
  requestBody: unknown,
): Promise<FrozenGate> {
  const intakeHash = sha256Hex(JSON.stringify(intake));
  const requestHash = sha256Hex(JSON.stringify(requestBody));
  const [wantIntake, wantRequest] = await Promise.all([
    readFile(join(dir, "frozen-intake.sha256"), "utf8").catch(() => null),
    readFile(join(dir, "frozen-request.sha256"), "utf8").catch(() => null),
  ]);
  if (wantIntake === null || wantRequest === null)
    return {
      ok: false,
      reason: "attempt_not_frozen",
      detail:
        "no frozen live attempt exists — run the freeze step and record its hashes before sending",
      requestHash,
    };
  if (wantIntake.trim() !== intakeHash)
    return {
      ok: false,
      reason: "input_changed",
      detail:
        "the submitted intake does not match the frozen authorized input — prepare a new attempt",
      requestHash,
    };
  if (wantRequest.trim() !== requestHash)
    return {
      ok: false,
      reason: "request_changed",
      detail:
        "the built request does not match the frozen authorized request — prepare a new attempt",
      requestHash,
    };
  return { ok: true, requestHash };
}

/** Atomic marker: only the first caller creates the file; every later call —
 * including concurrent ones racing the same await — fails closed. */
async function consumeGlmAttempt(
  dir: string,
  requestHash: string,
): Promise<boolean> {
  try {
    const handle = await open(join(dir, "attempt.consumed"), "wx", 0o600);
    await handle.writeFile(
      JSON.stringify({ requestHash, consumedAt: new Date().toISOString() }),
    );
    await handle.close();
    return true;
  } catch {
    return false;
  }
}

/** Preserve the exact response bytes and an outcome summary in owner-only
 * local evidence. Credentials and request headers are never written. A
 * transport failure records an honest outcome with no body file. */
async function recordLiveEvidence(
  dir: string,
  requestHash: string,
  envelope: GlmTransportEnvelope,
): Promise<void> {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const base = join(dir, `response-${stamp}-${requestHash.slice(0, 12)}`);
  if (typeof envelope.rawBody === "string")
    await writeFile(`${base}.body.txt`, envelope.rawBody, { mode: 0o600 });
  await writeFile(
    `${base}.outcome.json`,
    JSON.stringify(
      {
        recordedAt: new Date().toISOString(),
        requestSha256: requestHash,
        httpStatus: envelope.httpStatus,
        transportError: envelope.transportError ?? null,
        bodyPreserved: typeof envelope.rawBody === "string",
        bodyBytes:
          typeof envelope.rawBody === "string" ? envelope.rawBody.length : 0,
      },
      null,
      2,
    ),
    { mode: 0o600 },
  );
}

/** Freeze the single authorized live attempt: writes the exact intake record
 * and the exact built request body plus SHA-256 sidecars (owner-only perms).
 * A live send is only possible against these artifacts. */
export async function freezeGlmLiveAttempt(input: {
  intake: unknown;
  evidenceDir?: string;
}): Promise<
  | {
      status: "frozen";
      dir: string;
      intakeSha256: string;
      requestSha256: string;
    }
  | { status: "failed"; detail: string }
> {
  const built = buildFromIntake(input.intake);
  if (!built.ok)
    return {
      status: "failed",
      detail: `intake did not resolve to a request (${built.outcome.status})`,
    };
  const dir = glmEvidenceDir(input.evidenceDir);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  // Compact serialization: each .json file's own SHA-256 equals its sidecar —
  // `shasum -a 256 frozen-request.json` reproduces the binding hash.
  const intakeJson = JSON.stringify(input.intake);
  const requestJson = JSON.stringify(built.requestBody);
  const intakeHash = sha256Hex(intakeJson);
  const requestHash = sha256Hex(requestJson);
  await writeFile(join(dir, "frozen-intake.json"), intakeJson, {
    mode: 0o600,
  });
  await writeFile(join(dir, "frozen-intake.sha256"), intakeHash, {
    mode: 0o600,
  });
  await writeFile(join(dir, "frozen-request.json"), requestJson, {
    mode: 0o600,
  });
  await writeFile(join(dir, "frozen-request.sha256"), requestHash, {
    mode: 0o600,
  });
  return {
    status: "frozen",
    dir,
    intakeSha256: intakeHash,
    requestSha256: requestHash,
  };
}

function marketAreaText(facts: {
  marketContext: {
    reach: string | null;
    areas: string[];
    description: string | null;
  };
}) {
  if (facts.marketContext.reach === "national") return "seluruh Indonesia";
  if (facts.marketContext.reach === "international")
    return "Indonesia dan luar negeri";
  return facts.marketContext.areas.join(" dan ") || "area sekitar";
}

/** Labeled synthetic texts for the direct-ten stub: ten unnamed questions —
 * never the audited brand, an alias, or a comparator name. Wording still
 * interpolates the projected facts so the demo stays valid when the founder
 * adjusts confirmed values. */
function syntheticDirectTenTexts(facts: {
  category: string;
  marketContext: {
    reach: string | null;
    areas: string[];
    description: string | null;
  };
  serviceChannels?:
    ("on_premise" | "on_customer" | "delivery" | "online")[] | null;
  customerNeeds?: string[];
}): string[] {
  const category = facts.category || "usaha ini";
  const area = marketAreaText(facts);
  const delivery = facts.serviceChannels?.includes("delivery")
    ? " yang bisa antar-jemput"
    : "";
  const need = facts.customerNeeds?.[0]
    ? ` buat pelanggan yang butuh ${facts.customerNeeds[0].toLocaleLowerCase("id-ID")}`
    : "";
  return [
    `Ada rekomendasi ${category} di ${area} yang bagus tapi harganya masuk akal?`,
    `Cariin ${category} di ${area} yang pengerjaannya rapi dan nggak ribet.`,
    `${category} di ${area} yang enak dipakai${need} apa ya?`,
    `Kalau mau ${category}${delivery} di ${area}, mending pilih yang mana?`,
    `Butuh ${category} yang bisa dipercaya di ${area}. Biasanya orang pakai apa sih?`,
    `Tempat ${category} paling lengkap di ${area} biasanya di mana?`,
    `Ada ${category} di ${area} yang recommended buat pemula?`,
    `Buat kebutuhan mendadak, ${category} di ${area} yang cepat ada nggak?`,
    `Yang biasa orang pakai untuk ${category} di ${area} apa ya?`,
    `${category} di ${area} dengan pelayanan responsif ada rekomendasi?`,
  ];
}

function syntheticResponseBody(
  facts: Parameters<typeof syntheticDirectTenTexts>[0],
  behavior: GlmStubBehavior,
) {
  const texts = syntheticDirectTenTexts(facts);
  const malformed =
    behavior === "malformed"
      ? `## 1. Market interpretation\n\nSintetis.\n\n## 3. Self-critique\n\nSintetis; bagian pertanyaan sengaja dihilangkan.`
      : [
          "## 1. Market interpretation",
          "",
          "Respons sintetis uji coba lokal — bukan keluaran model.",
          "",
          "## 2. Candidate questions",
          "",
          ...texts.map((question, index) => `${index + 1}. ${question}`),
          "",
          "## 3. Self-critique",
          "",
          "Respons sintetis; self-critique tidak dihasilkan model.",
        ].join("\n");
  return {
    id: "chatcmpl-glm-stub-local",
    // The observed zai/ namespaced form stays the mismatch probe: returned and
    // requested identifiers are preserved verbatim, never stripped.
    model:
      behavior === "mismatch"
        ? "zai/glm-5.3-flash"
        : INDONESIAN_QUESTION_GLM_MODEL,
    choices: [
      {
        finish_reason: "stop",
        message: { role: "assistant", content: malformed },
      },
    ],
    // No usage/billing fields: a synthetic response has no real token cost,
    // so cost stays honestly unavailable.
  };
}

/** The default transport for the founder demo: a labeled synthetic response
 * exercising the same envelope/assessment/extraction path as a real call. It
 * makes no network request and records no real cost. */
export function createSyntheticGlmTransport(input: {
  facts: Parameters<typeof syntheticDirectTenTexts>[0];
  behavior?: GlmStubBehavior;
}): GlmQuestionTransport {
  const behavior = input.behavior ?? "ok";
  return {
    kind: "synthetic-stub",
    call: async () => {
      if (behavior === "timeout") {
        return {
          httpStatus: 0,
          body: null,
          transportError: `no response within ${INDONESIAN_QUESTION_GLM_CLIENT_WAIT_MS / 1000}s (synthetic timeout — no request was sent)`,
        };
      }
      return {
        httpStatus: 200,
        body: syntheticResponseBody(input.facts, behavior),
      };
    },
  };
}

/** The real single-request transport. Only reachable when the server-selected
 * mode is "live" AND a server-side credential exists — never the default,
 * never retried. */
export const liveGlmTransport: GlmQuestionTransport = {
  kind: "cheaper-inference",
  call: async (requestBody) => {
    try {
      const response = await fetch(INDONESIAN_QUESTION_GLM_ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${process.env.CHEAPERINFERENCE_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(INDONESIAN_QUESTION_GLM_CLIENT_WAIT_MS),
        redirect: "error",
      });
      // Preserve exact response bytes; the parsed body may be null for
      // non-JSON responses — both reach the evidence file.
      let rawBody: string | undefined;
      try {
        rawBody = await response.text();
      } catch {
        rawBody = undefined;
      }
      let body: unknown = null;
      if (rawBody !== undefined) {
        try {
          body = JSON.parse(rawBody);
        } catch {
          body = null;
        }
      }
      return { httpStatus: response.status, body, rawBody };
    } catch (error) {
      return {
        httpStatus: 0,
        body: null,
        transportError:
          error instanceof Error ? error.message : "request failed",
      };
    }
  },
};

/** Shared intake → facts → request pipeline used by both the freeze step and
 * the send path, so the frozen request is provably the same body. */
function buildFromIntake(
  intake: unknown,
):
  | { ok: true; facts: QuestionFactsV3; requestBody: unknown }
  | { ok: false; outcome: GlmQuestionsOutcome } {
  if (
    !isRecord(intake) ||
    intake.version !== LOCAL_INTAKE_INPUT_VERSION ||
    !Number.isInteger(intake.factVersion) ||
    !isRecord(intake.confirmed) ||
    !Array.isArray(intake.reviewRows) ||
    !isLocalIntakeFingerprintValid(intake as unknown as FrozenLocalIntake)
  ) {
    return {
      ok: false,
      outcome: {
        status: "invalid_request",
        detail:
          "the request did not carry the exact confirmed intake record (fingerprint mismatch or missing fields)",
      },
    };
  }
  // Fingerprint and review rows are UI bookkeeping; only the confirmed facts
  // projection reaches the writer — the adapter never parses or echoes them.
  const factsResult = parseQuestionFactsV3({
    requestId: "local-glm-prepare",
    intake: {
      version: LOCAL_INTAKE_INPUT_VERSION,
      factVersion: intake.factVersion,
      confirmed: intake.confirmed,
    },
  });
  if (factsResult.status === "INVALID_REQUEST") {
    return {
      ok: false,
      outcome: {
        status: "invalid_request",
        detail: "the confirmed intake record was rejected by the facts adapter",
      },
    };
  }
  if (factsResult.status === "INPUT_CORRECTION_REQUIRED") {
    return {
      ok: false,
      outcome: {
        status: "correction_required",
        issues: factsResult.issues,
      },
    };
  }
  const facts = factsResult.facts;
  return {
    ok: true,
    facts,
    requestBody: buildDirectTenQuestionRequest(
      buildDirectTenWriterBrief(facts),
    ),
  };
}

/** Cost record for a failed attempt: keeps the provider's settled billing
 * when the returned body carried it; honestly unavailable otherwise (R-06). */
function failedCost(body: unknown): {
  billedUsd: number | null;
  available: boolean;
} {
  const billedUsd = cheaperInferenceBilledCostUsd(body);
  return { billedUsd, available: billedUsd !== null };
}

/** Run one preparation attempt over the confirmed intake. `transport`
 * injects the envelope for tests; when omitted the adapter picks the live
 * transport only in the server-selected live mode, else the labeled stub.
 * For local evidence runs (evidenceDir or NUAVE_GLM_EVIDENCE_DIR set) a live
 * attempt additionally requires the frozen artifacts, then is atomically
 * consumed before the single send — nothing can send twice. Without an
 * evidence dir the disk gate is skipped entirely (Spec 010 R-05). */
export async function prepareGlmQuestionsForIntake(input: {
  intake: unknown;
  stubBehavior?: unknown;
  transport?: GlmQuestionTransport;
  evidenceDir?: string;
}): Promise<GlmQuestionsOutcome> {
  const method: GlmQuestionMethod = "direct-ten";
  const requestId = `local-glm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const provenanceFor = (
    kind: GlmPackProvenance["transport"],
    assessment?: ReturnType<typeof assessCheaperInferenceIndonesianResponse>,
  ): GlmPackProvenance => ({
    requestId,
    method,
    requestedModel: assessment?.requestedModel ?? INDONESIAN_QUESTION_GLM_MODEL,
    returnedModel: assessment?.returnedModel ?? null,
    responseId: assessment?.responseId ?? null,
    modelMismatch:
      assessment !== undefined &&
      assessment.returnedModel !== null &&
      assessment.returnedModel !== assessment.requestedModel,
    transport: kind,
  });
  const built = buildFromIntake(input.intake);
  if (!built.ok) return built.outcome;
  const { facts, requestBody } = built;
  const liveRequested = auditMode() === "live";
  // Live mode without its server credential stops outright — it never
  // silently falls back to the synthetic stub.
  if (!input.transport && liveRequested && !glmKeyPresent()) {
    return {
      status: "failed",
      reason: "live_credential_missing",
      detail:
        'NUAVE_AUDIT_MODE is "live" but CHEAPERINFERENCE_API_KEY is missing — question generation stopped without sending; the synthetic stub was not substituted',
      provenance: provenanceFor("cheaper-inference"),
      providerContact: "none",
    };
  }
  const transport =
    input.transport ??
    (liveRequested
      ? liveGlmTransport
      : createSyntheticGlmTransport({
          facts,
          behavior: GLM_STUB_BEHAVIORS.includes(
            input.stubBehavior as GlmStubBehavior,
          )
            ? (input.stubBehavior as GlmStubBehavior)
            : "ok",
        }));
  const liveAttempt = liveRequested || transport.kind === "cheaper-inference";
  // Spec 010 R-05: the frozen-attempt/consume/evidence disk gate exists only
  // for local evidence runs — an explicit evidenceDir or
  // NUAVE_GLM_EVIDENCE_DIR. With neither set no filesystem call is attempted:
  // no default .local-evidence directory is even resolved on this path.
  const evidenceDir =
    input.evidenceDir ??
    (process.env.NUAVE_GLM_EVIDENCE_DIR?.trim() || undefined);
  let requestHash = "";
  if (liveAttempt && evidenceDir !== undefined) {
    const gate = await verifyFrozenAttempt(
      evidenceDir,
      input.intake,
      requestBody,
    );
    requestHash = gate.requestHash;
    if (!gate.ok)
      return {
        status: "failed",
        reason: gate.reason,
        detail: gate.detail,
        provenance: provenanceFor(transport.kind),
        providerContact: "none",
      };
    // Atomically consumed before the send — a duplicate, concurrent call,
    // refresh, retry or post-timeout reuse can never send again.
    if (!(await consumeGlmAttempt(evidenceDir, gate.requestHash)))
      return {
        status: "failed",
        reason: "attempt_consumed",
        detail:
          "the authorized live attempt was already consumed — a second send is never made",
        provenance: provenanceFor(transport.kind),
        providerContact: "none",
      };
  }
  const envelope = await transport.call(requestBody);
  if (liveAttempt && evidenceDir !== undefined) {
    try {
      await recordLiveEvidence(evidenceDir, requestHash, envelope);
    } catch {
      return {
        status: "failed",
        reason: "evidence",
        detail:
          "the response arrived but could not be preserved to restricted local evidence",
        provenance: provenanceFor(transport.kind),
        // The provider response did arrive — a confirmed call whose settled
        // cost stays on the record when the body carried billing data.
        providerContact: "responded",
        cost: failedCost(envelope.body),
      };
    }
  }
  const assessment = assessCheaperInferenceIndonesianResponse({
    httpStatus: envelope.httpStatus,
    body: envelope.body,
  });
  const provenance = provenanceFor(transport.kind, assessment);
  if (envelope.transportError || envelope.httpStatus === 0) {
    return {
      status: "failed",
      reason: "transport",
      detail:
        envelope.transportError ??
        `transport returned HTTP ${envelope.httpStatus}`,
      provenance,
      // The request was sent but no provider response came back — execution
      // unknown, exactly like a dropped client response (R-06).
      providerContact: "sent",
    };
  }
  // A returned-model mismatch keeps its verdict but still permits inspection
  // of the text — inspection is not model-identity acceptance. The exception
  // applies only when every other envelope requirement independently passed:
  // a missing or blank response ID retains its failure and is never masked.
  // The recorded ID stays verbatim — never trimmed or rewritten.
  const mismatchWithInspectableText =
    !assessment.ok &&
    assessment.reason === "provenance" &&
    provenance.modelMismatch &&
    assessment.responseId !== null &&
    assessment.responseId.trim().length > 0;
  if (!assessment.ok && !mismatchWithInspectableText) {
    return {
      status: "failed",
      reason: assessment.reason,
      detail: assessment.detail,
      provenance,
      providerContact: "responded",
      cost: failedCost(envelope.body),
    };
  }
  const choice = isRecord(envelope.body)
    ? (envelope.body.choices as unknown[])
    : undefined;
  const message =
    Array.isArray(choice) && isRecord(choice[0]) ? choice[0].message : null;
  const assistantText = assessment.ok
    ? assessment.assistantText
    : isRecord(message) && typeof message.content === "string"
      ? message.content
      : "";
  const extraction = extractDirectTenQuestions(assistantText);
  if (!extraction.ok) {
    return {
      status: "failed",
      reason: `extraction_${extraction.reason}`,
      detail: extraction.detail,
      provenance,
      providerContact: "responded",
      cost: failedCost(envelope.body),
    };
  }
  const issues = validateDirectTenQuestionPack(extraction.questions, facts).map(
    (issue) => issue.message,
  );
  const billedUsd = assessment.ok
    ? assessment.billedCostUsd
    : cheaperInferenceBilledCostUsd(envelope.body);
  const cost = { billedUsd, available: billedUsd !== null };
  // Direct-ten preserves the provider's own sections for inspection.
  const examination = {
    marketInterpretation: extraction.marketInterpretation,
    selfCritique: extraction.selfCritique,
    intentLabels: extraction.intentLabels,
  };
  if (issues.length) {
    return {
      status: "validation_failed",
      questions: extraction.questions,
      issues,
      provenance,
      cost,
      ...(examination ? { examination } : {}),
    };
  }
  return {
    status: "ok",
    questions: extraction.questions,
    facts,
    provenance,
    cost,
    ...(examination ? { examination } : {}),
  };
}
