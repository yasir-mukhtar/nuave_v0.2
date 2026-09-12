// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Chip, ChipGroup } from "./Chip";

afterEach(cleanup);

function Harness({
  onToggle,
  disabled,
}: {
  onToggle?: (selected: boolean) => void;
  disabled?: boolean;
}) {
  const [selected, setSelected] = useState<string[]>(["Kopi susu"]);
  return (
    <ChipGroup label="Produk atau layanan">
      <Chip
        label="Kopi susu"
        selected={selected.includes("Kopi susu")}
        onToggle={(next) => {
          setSelected(next ? ["Kopi susu"] : []);
          onToggle?.(next);
        }}
        disabled={disabled}
      />
      <Chip
        label="Biji kopi"
        selected={selected.includes("Biji kopi")}
        onToggle={(next) => {
          setSelected(next ? [...selected, "Biji kopi"] : selected);
          onToggle?.(next);
        }}
        disabled={disabled}
      />
    </ChipGroup>
  );
}

describe("Chip", () => {
  it("supports the intake check indicator without changing its accessible label", () => {
    render(
      <Chip
        label="Kopi susu"
        selected
        selectedIndicator="check"
        onToggle={() => {}}
      />,
    );
    const chip = screen.getByRole("button", { name: "Kopi susu" });
    expect(chip.querySelector(".tabler-icon-check")).not.toBeNull();
    expect(chip.querySelector(".tabler-icon-x")).toBeNull();
    expect(chip).toHaveAttribute("aria-pressed", "true");
  });

  it("carries an aria-pressed state that follows selection", () => {
    render(<Harness />);
    expect(screen.getByRole("button", { name: "Kopi susu" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Biji kopi" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("toggles with the keyboard and reports the next state", async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(<Harness onToggle={onToggle} />);

    const biji = screen.getByRole("button", { name: "Biji kopi" });
    await user.tab();
    await user.tab();
    await user.keyboard(" ");

    expect(onToggle).toHaveBeenCalledWith(true);
    expect(biji).toHaveAttribute("aria-pressed", "true");
  });

  it("deselects a selected chip", async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(<Harness onToggle={onToggle} />);

    await user.click(screen.getByRole("button", { name: "Kopi susu" }));

    expect(onToggle).toHaveBeenCalledWith(false);
    expect(screen.getByRole("button", { name: "Kopi susu" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("ignores clicks while disabled", async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(<Harness onToggle={onToggle} disabled />);

    await user.click(screen.getByRole("button", { name: "Kopi susu" }));

    expect(onToggle).not.toHaveBeenCalled();
  });
});
