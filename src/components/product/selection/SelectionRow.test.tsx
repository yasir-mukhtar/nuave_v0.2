// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SelectionGroup } from "./SelectionCard";
import { SelectionRow } from "./SelectionRow";

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
      label="Cabang yang diaudit"
    >
      <SelectionRow
        value="senopati"
        title="Kopi Sudut Senopati"
        description="Jl. Senopati No. 43"
      />
      <SelectionRow value="bsd" title="Kopi Sudut BSD" disabled={disabled} />
    </SelectionGroup>
  );
}

describe("SelectionRow", () => {
  it("selects one row at a time inside the group", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const senopati = screen.getByRole("radio", {
      name: /Kopi Sudut Senopati/,
    });
    await user.click(senopati);
    expect(senopati).toHaveAttribute("aria-checked", "true");

    const bsd = screen.getByRole("radio", { name: "Kopi Sudut BSD" });
    await user.click(bsd);
    expect(bsd).toHaveAttribute("aria-checked", "true");
    expect(senopati).toHaveAttribute("aria-checked", "false");
  });

  it("selects with Space without a pointer", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onValueChange={onValueChange} />);

    await user.tab();
    await user.keyboard(" ");

    expect(onValueChange).toHaveBeenCalledWith("senopati");
  });

  it("does not select a disabled row", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onValueChange={onValueChange} disabled />);

    await user.click(screen.getByRole("radio", { name: "Kopi Sudut BSD" }));

    expect(onValueChange).not.toHaveBeenCalled();
  });
});
