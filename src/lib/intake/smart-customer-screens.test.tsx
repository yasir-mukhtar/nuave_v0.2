// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
  comparatorSuggestions: { proposed: [], origin: "nuave" },
} as unknown as PreparedUnderstanding;

const selection = {
  customerNeeds: [],
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

    const value = "n".repeat(301);
    const input = screen.getByRole("textbox", {
      name: "Kebutuhan pelanggan lain",
    });
    fireEvent.change(input, { target: { value } });
    fireEvent.click(screen.getByRole("button", { name: "Tambah" }));

    expect(input).toHaveValue(value);
    expect(screen.getByRole("alert")).toHaveTextContent("300 karakter");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("keeps an overlong competitor name in the input for correction", () => {
    const onChange = vi.fn();
    render(
      <SmartCompetitorsScreen
        prepared={prepared}
        selection={selection}
        onChange={onChange}
      />,
    );

    const value = "p".repeat(161);
    const input = screen.getByRole("textbox", {
      name: "Nama pembanding lain",
    });
    fireEvent.change(input, { target: { value } });
    fireEvent.click(screen.getByRole("button", { name: "Tambah" }));

    expect(input).toHaveValue(value);
    expect(screen.getByRole("alert")).toHaveTextContent("160 karakter");
    expect(onChange).not.toHaveBeenCalled();
  });
});
