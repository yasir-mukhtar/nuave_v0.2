// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { INTAKE_FIXTURES } from "./fixtures";
import {
  freezeLocalIntake,
  prepareLocalQuestions,
  type LocalQuestionPack,
} from "./local-questions";
import { resolveJourneyPath } from "./navigation";
import { LocalQuestionsScreen } from "./questions-screen";
import { createIntakeState, setScopeAnswer } from "./state";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function pack() {
  const fixture = INTAKE_FIXTURES.F1;
  const state = setScopeAnswer(createIntakeState(fixture), "scope-whole-brand");
  state.competitors = { keptIds: [], custom: ["Kedai Pagi"], noDirect: false };
  return prepareLocalQuestions(
    freezeLocalIntake(state, fixture, resolveJourneyPath()),
  );
}

describe("controlled question wording", () => {
  it("saves into parent-owned pack, restores after remount, and cancels without a write", () => {
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });
    let committed = pack();
    const update = vi.fn((value: LocalQuestionPack) => {
      committed = value;
    });
    const editing = vi.fn();
    const first = render(
      createElement(LocalQuestionsScreen, {
        pack: committed,
        onPackChange: update,
        onEditingChange: editing,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Ubah pertanyaan 1" }));
    const input = screen.getByRole("textbox", {
      name: "Pertanyaan 1",
    });
    expect(document.activeElement).toBe(input);
    expect(editing).toHaveBeenLastCalledWith(true);
    fireEvent.change(input, {
      target: {
        value: "Pilihan kedai kopi apa yang cocok di Jakarta Selatan?",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    expect(update).toHaveBeenCalledTimes(1);
    expect(editing).toHaveBeenLastCalledWith(false);
    first.unmount();

    render(
      createElement(LocalQuestionsScreen, {
        pack: committed,
        onPackChange: update,
        onEditingChange: editing,
      }),
    );
    expect(
      screen.getByText("Pilihan kedai kopi apa yang cocok di Jakarta Selatan?"),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Ubah pertanyaan 1" }));
    const restored = screen.getByRole("textbox", {
      name: "Pertanyaan 1",
    });
    expect((restored as HTMLTextAreaElement).value).toBe(
      "Pilihan kedai kopi apa yang cocok di Jakarta Selatan?",
    );
    fireEvent.change(restored, { target: { value: "Kalimat belum disimpan" } });
    fireEvent.keyDown(restored, { key: "Escape" });
    expect(update).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Ubah pertanyaan 1" }),
    );
  });

  it("shows deterministic refusal and keeps the editor and fixed purpose frame", () => {
    const update = vi.fn();
    render(
      createElement(LocalQuestionsScreen, {
        pack: pack(),
        onPackChange: update,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Ubah pertanyaan 1" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Pertanyaan 1" }), {
      target: { value: "Apakah Kopi Sudut cocok untuk minum kopi?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    expect(update).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain(
      "tidak boleh menyebut bisnis Anda",
    );
    expect(screen.getByText(/Tujuan tetap:/).textContent).toContain(
      "rekomendasi kategori",
    );
    expect(screen.getByRole("textbox").getAttribute("aria-invalid")).toBe(
      "true",
    );
  });
});
