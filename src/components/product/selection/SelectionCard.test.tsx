// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SelectionCard, SelectionGroup } from "./SelectionCard";

afterEach(cleanup);

function Harness({
  onValueChange,
  disabled,
}: {
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");
  return (
    <SelectionGroup
      value={value}
      onValueChange={(next) => {
        setValue(next);
        onValueChange?.(next);
      }}
      label="Cakupan audit"
    >
      <SelectionCard value="whole-brand" title="Seluruh brand" />
      <SelectionCard
        value="branch"
        title="Satu cabang"
        description="Misalnya hanya satu gerai"
        disabled={disabled}
      />
      <SelectionCard value="product" title="Satu produk" />
    </SelectionGroup>
  );
}

describe("SelectionCard", () => {
  it("exposes a radiogroup with checked state on the selected card", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const group = screen.getByRole("radiogroup", { name: "Cakupan audit" });
    expect(group).toBeInTheDocument();

    const wholeBrand = screen.getByRole("radio", { name: "Seluruh brand" });
    expect(wholeBrand).toHaveAttribute("aria-checked", "false");

    await user.click(wholeBrand);
    expect(wholeBrand).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Satu produk" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("selects with the keyboard alone", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onValueChange={onValueChange} />);

    await user.tab();
    await user.keyboard(" ");

    expect(onValueChange).toHaveBeenCalledWith("whole-brand");
    expect(
      screen.getByRole("radio", { name: "Seluruh brand" }),
    ).toHaveAttribute("aria-checked", "true");
  });

  it("moves selection with arrow keys", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onValueChange={onValueChange} />);

    await user.tab();
    await user.keyboard("{ArrowDown}");

    expect(onValueChange).toHaveBeenLastCalledWith("branch");
    expect(screen.getByRole("radio", { name: /Satu cabang/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("ignores clicks on a disabled card", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onValueChange={onValueChange} disabled />);

    await user.click(screen.getByRole("radio", { name: /Satu cabang/ }));

    expect(onValueChange).not.toHaveBeenCalled();
    expect(screen.getByRole("radio", { name: /Satu cabang/ })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });
});
