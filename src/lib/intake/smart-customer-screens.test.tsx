// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SmartCompetitorsScreen,
  SmartCustomerNeedsScreen,
} from "./smart-customer-screens";
import type {
  PreparedUnderstanding,
  SmartSelection,
} from "./smart-intake-contract";

afterEach(cleanup);

const prepared = {
  customerNeeds: { proposed: [], origin: "nuave" },
  decisionConsiderations: { proposed: [], origin: "nuave" },
  comparatorSuggestions: { proposed: [], origin: "nuave" },
} as unknown as PreparedUnderstanding;

const selection = {
  customerNeeds: [],
  decisionConsiderations: [],
  comparatorMode: "named",
  comparatorNames: [],
  origins: { comparators: "owner", customerNeeds: "owner" },
} as unknown as SmartSelection;

describe("J6 typed additions", () => {
  it("keeps an overlong customer need in the input for correction", () => {
    const onChange = vi.fn();
    render(
      <SmartCustomerNeedsScreen
        prepared={prepared}
        selection={selection}
        onChange={onChange}
      />,
    );

    // "+ Lainnya" under "Mereka butuh…" opens the typed field (J17). jsdom
    // drops the space before the screen-reader-only "(kebutuhan)".
    expect(
      screen.queryByRole("textbox", { name: "Kebutuhan pelanggan lain" }),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: /^Lainnya ?\(kebutuhan\)$/ }),
    );
    const value = "n".repeat(301);
    const input = screen.getByRole("textbox", {
      name: "Kebutuhan pelanggan lain",
    });
    fireEvent.change(input, { target: { value } });
    fireEvent.click(
      within(
        screen.getByRole("group", { name: "Kebutuhan pelanggan lain" }),
      ).getByRole("button", { name: "Tambah" }),
    );

    expect(input).toHaveValue(value);
    expect(screen.getByRole("alert")).toHaveTextContent("300 karakter");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("keeps an overlong competitor name in the input for correction", () => {
    const onChange = vi.fn();
    // A found suggestion (J20): the typed field waits behind its adder.
    const found = {
      ...prepared,
      comparatorSuggestions: {
        proposed: ["Kedai Saingan Fiksi"],
        origin: "nuave",
      },
    } as unknown as PreparedUnderstanding;
    render(
      <SmartCompetitorsScreen
        prepared={found}
        selection={selection}
        onChange={onChange}
        onSkip={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("textbox", { name: "Nama atau website bisnis" }),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Tambah pembanding" }));
    const value = "p".repeat(161);
    const input = screen.getByRole("textbox", {
      name: "Nama atau website bisnis",
    });
    fireEvent.change(input, { target: { value } });
    fireEvent.click(
      within(
        screen.getByRole("group", { name: "Nama atau website bisnis" }),
      ).getByRole("button", { name: "Tambah" }),
    );

    expect(input).toHaveValue(value);
    expect(screen.getByRole("alert")).toHaveTextContent("160 karakter");
    expect(onChange).not.toHaveBeenCalled();
  });
});
