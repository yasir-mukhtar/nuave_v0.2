// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { INTAKE_FIXTURES } from "./fixtures";
import { deriveContextFixture } from "./preparation";
import { BAB1_SCREENS } from "./screens-bab1";
import { BAB2_SCREENS } from "./screens-bab2";
import { createIntakeState, type IntakeState } from "./state";
import type { IntakeScreenId } from "./screens";

afterEach(cleanup);

function Harness({
  id,
  empty = false,
}: {
  id: IntakeScreenId;
  empty?: boolean;
}) {
  const fixture = empty
    ? {}
    : deriveContextFixture(
        INTAKE_FIXTURES.F1,
        createIntakeState(INTAKE_FIXTURES.F1),
      );
  const [answers, setAnswers] = useState(() => createIntakeState(fixture));
  const [valid, setValid] = useState(false);
  const Slot = BAB1_SCREENS[id] ?? BAB2_SCREENS[id];
  if (!Slot) throw new Error(id);
  return (
    <>
      <Slot
        screenId={id}
        fixture={fixture}
        answers={answers}
        updateAnswer={setAnswers}
        emit={() => {}}
        nav={{
          onContinue() {},
          onBack() {},
          canContinue: valid,
          canGoBack: true,
          continueLabel: "Lanjut",
          onValidityChange: setValid,
        }}
      />
      <output data-testid="state">{JSON.stringify(answers)}</output>
      <output data-testid="valid">{String(valid)}</output>
    </>
  );
}

function state(): IntakeState {
  return JSON.parse(screen.getByTestId("state").textContent!);
}

describe("complete intake controls", () => {
  it("uses arrow keys to choose actual scope values", async () => {
    const user = userEvent.setup();
    render(<Harness id="s-scope" empty />);
    await user.tab();
    await user.keyboard("{ArrowDown}");
    expect(state().scopeOptionId).toBe("scope-branch");
    await user.keyboard("{ArrowDown}");
    expect(state().scopeOptionId).toBe("scope-product");
  });

  it("requires a distinguishing address for a manual empty location", async () => {
    const user = userEvent.setup();
    render(<Harness id="s-branch" empty />);
    await user.type(screen.getByLabelText("Nama lokasi"), "Gerai Timur");
    expect(screen.getByRole("button", { name: "Tambah" })).toBeDisabled();
    await user.type(
      screen.getByLabelText("Alamat atau area yang membedakan lokasi"),
      "Jl. Timur 12, Bandung",
    );
    await user.click(screen.getByRole("button", { name: "Tambah" }));
    expect(state().branch.custom[0]).toMatchObject({
      label: "Gerai Timur",
      detail: "Jl. Timur 12, Bandung",
    });
    expect(screen.getByTestId("valid")).toHaveTextContent("true");
  });

  it("retains a custom category when switching to and from a prepared choice", async () => {
    const user = userEvent.setup();
    render(<Harness id="s-category" />);
    await user.click(
      screen.getByRole("button", { name: "Tulis kategori sendiri" }),
    );
    await user.type(
      screen.getByRole("textbox", { name: "Tulis kategori sendiri" }),
      "Kedai teh",
    );
    await user.click(screen.getByRole("button", { name: "Pakai" }));
    await user.click(screen.getAllByRole("radio")[0]);
    await user.click(screen.getByRole("radio", { name: "Kedai teh" }));
    expect(state().category).toMatchObject({
      selectedId: "category-custom-1",
      customLabel: "Kedai teh",
    });
  });

  it("does not count removed custom offerings and can reselect them", async () => {
    const user = userEvent.setup();
    render(<Harness id="s-offerings" empty />);
    await user.type(
      screen.getByRole("textbox", { name: "Produk atau layanan" }),
      "Teh dingin",
    );
    await user.click(screen.getByRole("button", { name: "Tambah" }));
    const chip = screen.getByRole("button", { name: "Teh dingin" });
    await user.click(chip);
    expect(screen.getByTestId("valid")).toHaveTextContent("false");
    await user.click(chip);
    expect(screen.getByTestId("valid")).toHaveTextContent("true");
  });

  it("keeps multiple exact service channels", async () => {
    const user = userEvent.setup();
    render(<Harness id="s-service" empty />);
    await user.click(
      screen.getByRole("checkbox", { name: /Di lokasi bisnis Anda/ }),
    );
    await user.click(
      screen.getByRole("checkbox", { name: /Dikirim ke pelanggan/ }),
    );
    expect(state().service.onIds).toEqual([
      "service-location",
      "service-delivery",
    ]);
  });

  it("clears custom one-area data when choosing a prepared area and national reach", async () => {
    const user = userEvent.setup();
    render(<Harness id="s-market" />);
    await user.type(
      screen.getByRole("textbox", { name: "Tambah area lain" }),
      "Bandung",
    );
    await user.click(screen.getByRole("button", { name: "Tambahkan" }));
    expect(state().market.areaIds).toEqual([]);
    await user.click(screen.getByRole("button", { name: "Jakarta Selatan" }));
    expect(state().market.customAreas).toEqual([]);
    expect(state().market.areaIds).toHaveLength(1);
    await user.click(screen.getByRole("radio", { name: /Seluruh Indonesia/ }));
    expect(state().market.areaIds).toEqual([]);
    expect(state().market.customAreas).toEqual([]);
  });

  it("makes explicit no-direct mode exclusive while named controls remain usable", async () => {
    const user = userEvent.setup();
    render(<Harness id="s-competitors" />);
    await user.click(
      screen.getByRole("checkbox", {
        name: "Tidak ada pesaing langsung yang saya tahu",
      }),
    );
    expect(state().competitors.keptIds).toEqual([]);
    await user.click(screen.getByRole("checkbox", { name: "Fore Coffee" }));
    expect(state().competitors.noDirect).toBe(false);
    expect(state().competitors.keptIds).toHaveLength(1);
  });

  it("keeps sensitive text out of shared answers and blocks continuing", async () => {
    const user = userEvent.setup();
    render(<Harness id="s-facts" empty />);
    await user.click(screen.getByRole("textbox"));
    await user.paste("owner@example.com");
    expect(state().facts.text).toBe("");
    expect(screen.getByTestId("valid")).toHaveTextContent("false");
    expect(screen.getByRole("alert")).toBeVisible();
  });
});
