// @vitest-environment jsdom
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
import { freezeLocalIntake, prepareLocalQuestions } from "./local-questions";
import { resolveJourneyPath, type IntakeScreenSlotProps } from "./navigation";
import { deriveContextFixture } from "./preparation";
import * as preparation from "./preparation";
import {
  createIntakeState,
  setBrandFixDraft,
  setFactsText,
  setScopeAnswer,
  setSingleAnswer,
  type IntakeState,
} from "./state";

const fixture = INTAKE_FIXTURES.F1;

function Controls({
  screenId,
  nav,
  answers,
  updateAnswer,
}: IntakeScreenSlotProps) {
  if (!answers || !updateAnswer) throw new Error("Shell state is required");
  return (
    <section>
      <h1>{screenId}</h1>
      <output data-testid="answers">{JSON.stringify(answers)}</output>
      <button onClick={() => nav.onGotoScreen?.("s-scope")}>Edit scope</button>
      <button onClick={() => nav.onGotoScreen?.("s-brand")}>Edit brand</button>
      <button onClick={() => nav.onGotoScreen?.("s-facts")}>Edit fact</button>
      <button onClick={() => nav.onGotoScreen?.("s-brand-fix")}>
        Correct source
      </button>
      <button
        onClick={() =>
          updateAnswer((state) => setScopeAnswer(state, "scope-product"))
        }
      >
        Choose product
      </button>
      <button
        onClick={() =>
          updateAnswer((state) => setScopeAnswer(state, "scope-whole-brand"))
        }
      >
        Choose whole brand
      </button>
      <button
        onClick={() =>
          updateAnswer((state) =>
            setSingleAnswer(state, "product", "product-2"),
          )
        }
      >
        Choose beans
      </button>
      <button
        onClick={() =>
          updateAnswer((state) =>
            setFactsText(state, "Ada pilihan tanpa gula."),
          )
        }
      >
        Change fact
      </button>
      <button
        onClick={() =>
          updateAnswer((state) =>
            setBrandFixDraft(state, {
              name: "Studio Benang",
              source: "example.com",
            }),
          )
        }
      >
        Correct identity
      </button>
    </section>
  );
}

function seedReview(withQuestions = false): LocalSession {
  const answers = setScopeAnswer(
    createIntakeState(fixture),
    "scope-whole-brand",
  );
  const path = resolveJourneyPath({
    entry: "read",
    scope: "brand",
    brandNeedsFix: false,
  });
  const input = freezeLocalIntake(
    answers,
    deriveContextFixture(fixture, answers),
    path,
  );
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
    pack: withQuestions ? prepareLocalQuestions(input) : null,
  };
  sessionStorage.setItem(LOCAL_INTAKE_STORAGE_KEY, JSON.stringify(session));
  return session;
}
function saved() {
  const result = parseLocalSession(
    sessionStorage.getItem(LOCAL_INTAKE_STORAGE_KEY),
  );
  if (!result) throw new Error("Expected a valid committed session");
  return result;
}
function answers(): IntakeState {
  return JSON.parse(screen.getByTestId("answers").textContent!);
}
async function at(id: string) {
  await waitFor(() =>
    expect(screen.getByRole("heading", { name: id })).toBeTruthy(),
  );
}
function click(name: string) {
  fireEvent.click(screen.getByRole("button", { name }));
}

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
});

describe("shell committed state and Review transactions", () => {
  it("rechecking the same identity returns to Review without invalidating questions", async () => {
    const original = seedReview(true);
    render(<IntakeJourney ScreenSlot={Controls} />);
    await at("s-review");
    click("Edit brand");
    click("Correct source");
    click("Periksa");
    await at("s-brand");
    click("Simpan");
    await at("s-review");
    expect(answers()).toEqual(original.answers);
    expect(saved().pack).toEqual(original.pack);
  });

  it("cancels a material scope edit from a dependent screen and restores the original pack", async () => {
    const original = seedReview(true);
    render(<IntakeJourney ScreenSlot={Controls} />);
    await at("s-review");
    click("Edit scope");
    click("Choose product");
    click("Simpan");
    await at("s-product");
    click("Choose beans");
    click("Simpan");
    await at("s-category");
    expect(answers().scope).toBe("produk");
    // Only the pre-edit committed snapshot may survive refresh.
    expect(saved().answers).toEqual(original.answers);
    click("Batal");
    await at("s-review");
    expect(answers()).toEqual(original.answers);
    expect(saved().pack).toEqual(original.pack);
  });

  it("saves only required dependents, returns to Review, and invalidates stale questions", async () => {
    const original = seedReview(true);
    render(<IntakeJourney ScreenSlot={Controls} />);
    await at("s-review");
    click("Edit scope");
    click("Choose product");
    click("Simpan");
    await at("s-product");
    click("Choose beans");
    click("Simpan");
    for (const owner of [
      "s-category",
      "s-customers",
      "s-service",
      "s-market",
      "s-competitors",
    ]) {
      await at(owner);
      click("Simpan");
    }
    await at("s-review");
    expect(answers().scope).toBe("produk");
    expect(answers().product.selectedId).toBe("product-2");
    expect(answers().offerings.onIds).toEqual([]);
    expect(saved().pack).toBeNull();
    expect(saved().answers.factVersion).toBe(original.answers.factVersion + 1);
    for (const owner of [
      "s-facts",
      "s-competitors",
      "s-market",
      "s-service",
      "s-customers",
      "s-category",
      "s-product",
    ]) {
      click("Kembali");
      await at(owner);
    }
    expect(answers().product.selectedId).toBe("product-2");
  });

  it("parent rerenders cannot replace child edits with an older prepared snapshot", async () => {
    const original = seedReview();
    const app = render(
      <IntakeJourney ScreenSlot={Controls} fixtureOverride={fixture} />,
    );
    await at("s-review");
    click("Edit fact");
    click("Change fact");
    app.rerender(
      <IntakeJourney
        ScreenSlot={Controls}
        fixtureOverride={structuredClone(fixture)}
      />,
    );
    expect(answers().facts.text).toBe("Ada pilihan tanpa gula.");
    expect(saved().answers.facts.text).toBe(original.answers.facts.text);
    click("Simpan");
    await at("s-review");
    expect(saved().answers.facts.text).toBe("Ada pilihan tanpa gula.");
    app.unmount();
    render(<IntakeJourney ScreenSlot={Controls} fixtureOverride={fixture} />);
    await at("s-review");
    expect(answers().facts.text).toBe("Ada pilihan tanpa gula.");
  });

  it("refresh during a Review edit restores the unchanged Review", async () => {
    const original = seedReview(true);
    const app = render(<IntakeJourney ScreenSlot={Controls} />);
    await at("s-review");
    click("Edit fact");
    click("Change fact");
    app.unmount();
    render(<IntakeJourney ScreenSlot={Controls} />);
    await at("s-review");
    expect(answers()).toEqual(original.answers);
    expect(saved().pack).toEqual(original.pack);
  });

  it("failed source correction from Review can cancel without accepting a new identity", async () => {
    const original = seedReview(true);
    vi.spyOn(preparation, "prepareLocalIdentity").mockImplementationOnce(() => {
      throw new Error("Local preparation failed");
    });
    render(<IntakeJourney ScreenSlot={Controls} />);
    await at("s-review");
    click("Edit brand");
    click("Correct source");
    click("Correct identity");
    click("Periksa");
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(
        "Local preparation failed",
      ),
    );
    expect(saved().answers).toEqual(original.answers);
    click("Batal");
    await at("s-review");
    expect(answers()).toEqual(original.answers);
    expect(saved().pack).toEqual(original.pack);
  });

  it("cancelling source correction from reading failure restores the recoverable error", async () => {
    render(
      <IntakeJourney
        ScreenSlot={Controls}
        fixtureOverride={INTAKE_FIXTURES.F6}
      />,
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Coba lagi" })).toBeTruthy(),
    );
    click("Ubah sumber");
    await at("s-brand-fix");
    click("Batal");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Coba lagi" })).toBeTruthy(),
    );
    expect(screen.queryByRole("heading", { name: "s-brand" })).toBeNull();
  });
});

describe("blank public entry (Spec 010 R-08)", () => {
  it("opens on the empty business step and never restores a fixture session", async () => {
    // A stored fixture-seeded session must not leak into a blank start.
    seedReview();
    render(<IntakeJourney ScreenSlot={Controls} blank />);
    await at("s-brand-fix");
    expect(answers().brandFixDraft).toEqual({ name: "", source: "" });
    // The stored fixture session is overwritten once hydration settles —
    // the parked blank state is raw JSON here because parseLocalSession
    // intentionally rejects a pre-identity session on restore.
    await waitFor(() => {
      const raw = JSON.parse(
        sessionStorage.getItem(LOCAL_INTAKE_STORAGE_KEY) ?? "null",
      ) as { origin?: string } | null;
      expect(raw?.origin).toBe("blank");
    });
    // Empty fields block the entry button until the owner fills them.
    expect(
      screen
        .getByRole("button", { name: "Periksa" })
        .getAttribute("data-continue-disabled"),
    ).toBe("true");
  });

  it("enters name and source, then lands on the read brand card", async () => {
    render(<IntakeJourney ScreenSlot={Controls} blank />);
    await at("s-brand-fix");
    click("Correct identity");
    click("Periksa");
    await at("s-brand");
    expect(answers().brandCorrected).toEqual({
      name: "Studio Benang",
      source: "example.com",
    });
    click("Lanjut");
    await at("s-scope");
  });

  it("a fixture start never restores a stored blank session", async () => {
    const app = render(<IntakeJourney ScreenSlot={Controls} blank />);
    await at("s-brand-fix");
    click("Correct identity");
    click("Periksa");
    await at("s-brand");
    app.unmount();
    render(<IntakeJourney ScreenSlot={Controls} fixtureOverride={fixture} />);
    await at("s-brand");
    // The fixture journey seeded its own card — the entered business is gone.
    expect(saved().origin).toBe("fixture");
    expect(answers().brandCorrected).toBeNull();
  });

  it("restores a committed blank session under the blank start", async () => {
    const app = render(<IntakeJourney ScreenSlot={Controls} blank />);
    await at("s-brand-fix");
    click("Correct identity");
    click("Periksa");
    await at("s-brand");
    click("Lanjut");
    await at("s-scope");
    click("Choose whole brand");
    click("Lanjut");
    await at("s-category");
    app.unmount();
    render(<IntakeJourney ScreenSlot={Controls} blank />);
    await at("s-category");
    expect(saved().origin).toBe("blank");
    expect(answers().brandCorrected).toEqual({
      name: "Studio Benang",
      source: "example.com",
    });
  });
});
