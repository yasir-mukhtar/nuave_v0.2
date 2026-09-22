// @vitest-environment jsdom
/**
 * Spec 010 R-06 / AC-07: the client records every GLM question-generation
 * attempt in the browser session ledger (`generation_attempts`), shows the
 * honest interrupted state when a response never arrives, and never retries
 * on its own. All fetches are stubbed — no provider call happens here.
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import IntakeJourney from "./IntakeJourney";
import { INTAKE_FIXTURES } from "./fixtures";
import {
  LOCAL_INTAKE_STORAGE_KEY,
  parseLocalSession,
  type LocalSession,
} from "./local-session";
import { freezeLocalIntake, type GlmQuestionsOutcome } from "./local-questions";
import { prepareGlmQuestionsForIntake } from "./glm-local";
import { resolveJourneyPath, type IntakeScreenSlotProps } from "./navigation";
import { deriveContextFixture } from "./preparation";
import { createIntakeState, setScopeAnswer } from "./state";

const fixture = INTAKE_FIXTURES.GLM;

function seedReview(): LocalSession {
  const answers = setScopeAnswer(
    createIntakeState(fixture),
    "scope-whole-brand",
  );
  const path = resolveJourneyPath({
    entry: "read",
    scope: "brand",
    brandNeedsFix: false,
  });
  const session: LocalSession = {
    version: 1,
    fixture,
    answers,
    current: "s-review",
    identityReady: true,
    visited: path.filter(
      (id) => !["s-crawl", "s-review", "s-questions"].includes(id),
    ),
    confirmed: path.filter(
      (id) => !["s-crawl", "s-review", "s-questions"].includes(id),
    ),
    pack: null,
  };
  sessionStorage.setItem(LOCAL_INTAKE_STORAGE_KEY, JSON.stringify(session));
  return session;
}

function frozenInput() {
  const session = seedReview();
  return freezeLocalIntake(
    session.answers,
    deriveContextFixture(session.fixture, session.answers),
    resolveJourneyPath({
      entry: "read",
      scope: session.answers.scope,
      brandNeedsFix: false,
    }),
  );
}

/** A real ok outcome produced by the actual adapter against the labeled
 * stub transport (synthetic mode — no provider call), serialized like the
 * route's JSON response. */
async function okOutcomeBody(): Promise<GlmQuestionsOutcome> {
  const outcome = await prepareGlmQuestionsForIntake({
    intake: frozenInput(),
  });
  if (outcome.status !== "ok") throw new Error("stub did not produce ok");
  return JSON.parse(JSON.stringify(outcome)) as GlmQuestionsOutcome;
}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function Slot({ screenId }: IntakeScreenSlotProps) {
  return (
    <section>
      <h1>{screenId}</h1>
    </section>
  );
}

function saved() {
  const result = parseLocalSession(
    sessionStorage.getItem(LOCAL_INTAKE_STORAGE_KEY),
  );
  if (!result) throw new Error("Expected a valid committed session");
  return result;
}

const generate = () =>
  fireEvent.click(
    screen.getByRole("button", { name: "Buat pertanyaan audit" }),
  );

beforeEach(() => {
  sessionStorage.clear();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 0;
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("R-06 — generation attempts ledger and interrupted state", () => {
  it("records a failed attempt with its provider cost, then the confirmed success on an explicit retry", async () => {
    seedReview();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const failedBody = {
      status: "failed",
      reason: "http_error",
      detail: "HTTP 500 from provider",
      provenance: {
        requestId: "local-glm-fail",
        requestedModel: "glm-5.3-flash",
        returnedModel: null,
        responseId: null,
        modelMismatch: false,
        transport: "cheaper-inference",
      },
      providerContact: "responded",
      cost: { billedUsd: 0.0012, available: true },
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(failedBody, 200));
    fetchMock.mockResolvedValue(jsonResponse(await okOutcomeBody(), 200));

    render(<IntakeJourney ScreenSlot={Slot} glmExperiment />);
    await screen.findByRole("heading", { name: "s-review" });
    generate();
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(
        "Persiapan GLM gagal (http_error)",
      ),
    );
    // The failed-but-answered attempt is on the ledger — confirmed, with cost.
    await waitFor(() =>
      expect(saved().generation_attempts).toEqual([
        {
          started_at: expect.any(String),
          outcome: "failed",
          execution: "confirmed",
          cost_usd: 0.0012,
        },
      ]),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Coba lagi" }));
    await screen.findByRole("heading", { name: "Periksa pertanyaan audit" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const attempts = saved().generation_attempts!;
    expect(attempts).toHaveLength(2);
    // The stub transport records too — confirmed, cost null (R-06 §3).
    expect(attempts[1]).toMatchObject({
      outcome: "succeeded",
      execution: "confirmed",
      cost_usd: null,
    });
  });

  it("a dropped response shows the interrupted state, records an unknown-execution attempt, and only the explicit button sends exactly one new request", async () => {
    seedReview();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockRejectedValueOnce(new Error("network drop"));
    fetchMock.mockResolvedValue(jsonResponse(await okOutcomeBody(), 200));

    render(<IntakeJourney ScreenSlot={Slot} glmExperiment />);
    await screen.findByRole("heading", { name: "s-review" });
    generate();

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe(
        "Permintaan pembuatan pertanyaan terputus. Pertanyaan mungkin sudah dibuat dan mungkin sudah dikenai biaya, tetapi tidak diterima.",
      ),
    );
    // One explicit new-attempt button — no generic retry, no auto-retry.
    expect(
      screen.getByRole("button", { name: "Buat pertanyaan lagi" }),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Coba lagi" })).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(saved().generation_attempts).toEqual([
        {
          started_at: expect.any(String),
          outcome: "interrupted",
          execution: "unknown",
          cost_usd: null,
        },
      ]),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Buat pertanyaan lagi" }),
    );
    await screen.findByRole("heading", { name: "Periksa pertanyaan audit" });
    // Exactly one new request — the successful pack shows as usual.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(saved().generation_attempts).toHaveLength(2);
    expect(saved().generation_attempts![1]).toMatchObject({
      outcome: "succeeded",
      execution: "confirmed",
    });
  });

  it("a 429 rate-limit rejection records no attempt — zero calls, zero cost", async () => {
    seedReview();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          error: "Terlalu banyak permintaan, coba lagi dalam beberapa menit.",
          code: "RATE_LIMITED",
        },
        429,
      ),
    );

    render(<IntakeJourney ScreenSlot={Slot} glmExperiment />);
    await screen.findByRole("heading", { name: "s-review" });
    generate();
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(
        "experimental route returned HTTP 429",
      ),
    );
    // A pre-provider rejection is a plain failure — not the interrupted
    // state — and the ledger gains nothing.
    expect(
      screen.queryByRole("button", { name: "Buat pertanyaan lagi" }),
    ).toBeNull();
    expect(saved().generation_attempts ?? []).toEqual([]);
  });
});
