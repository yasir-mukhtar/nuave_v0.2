// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AddLine } from "./AddLine";

afterEach(cleanup);

describe("AddLine", () => {
  it("commits the draft on Enter and clears the input", async () => {
    const onCommit = vi.fn();
    const user = userEvent.setup();
    render(
      <AddLine inputLabel="Tambah produk atau layanan" onCommit={onCommit} />,
    );

    const input = screen.getByLabelText("Tambah produk atau layanan");
    await user.type(input, "Kopi susu gula aren{Enter}");

    expect(onCommit).toHaveBeenCalledWith("Kopi susu gula aren");
    expect(input).toHaveValue("");
  });

  it("commits through the button and trims the value", async () => {
    const onCommit = vi.fn();
    const user = userEvent.setup();
    render(<AddLine inputLabel="Tambah cabang" onCommit={onCommit} />);

    await user.type(screen.getByLabelText("Tambah cabang"), "  Senopati  ");
    await user.click(screen.getByRole("button", { name: "Tambah" }));

    expect(onCommit).toHaveBeenCalledWith("Senopati");
  });

  it("keeps the commit button disabled without a draft", async () => {
    const onCommit = vi.fn();
    const user = userEvent.setup();
    render(<AddLine inputLabel="Tambah cabang" onCommit={onCommit} />);

    const button = screen.getByRole("button", { name: "Tambah" });
    expect(button).toBeDisabled();

    const input = screen.getByLabelText("Tambah cabang");
    await user.type(input, "   ");
    expect(button).toBeDisabled();

    await user.type(input, "{Backspace}{Backspace}{Backspace}Cabang");
    expect(button).toBeEnabled();

    await user.click(button);
    expect(onCommit).toHaveBeenCalledWith("Cabang");
    expect(onCommit).toHaveBeenCalledTimes(1);
  });
});
