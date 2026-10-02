// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AddLine } from "./AddLine";

afterEach(cleanup);

describe("AddLine", () => {
  it("commits the draft on Enter and clears the input", async () => {
    const onCommit = vi.fn().mockReturnValue(true);
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
    const onCommit = vi.fn().mockReturnValue(true);
    const user = userEvent.setup();
    render(<AddLine inputLabel="Tambah cabang" onCommit={onCommit} />);

    const input = screen.getByLabelText("Tambah cabang");
    await user.type(input, "  Senopati  ");
    await user.click(screen.getByRole("button", { name: "Tambah" }));

    expect(onCommit).toHaveBeenCalledWith("Senopati");
    expect(input).toHaveValue("");
  });

  it("keeps the commit button disabled without a draft", async () => {
    const onCommit = vi.fn().mockReturnValue(true);
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

  it.each(["Enter", "button"] as const)(
    "preserves a rejected draft on %s and clears it after a later acceptance",
    async (firstAttempt) => {
      const onCommit = vi
        .fn()
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);
      const user = userEvent.setup();
      render(<AddLine inputLabel="Tambah cabang" onCommit={onCommit} />);

      const input = screen.getByLabelText("Tambah cabang");
      await user.type(input, "  Senopati  ");
      if (firstAttempt === "Enter") {
        await user.keyboard("{Enter}");
      } else {
        await user.click(screen.getByRole("button", { name: "Tambah" }));
      }

      expect(onCommit).toHaveBeenLastCalledWith("Senopati");
      expect(input).toHaveValue("  Senopati  ");

      if (firstAttempt === "Enter") {
        await user.click(screen.getByRole("button", { name: "Tambah" }));
      } else {
        await user.keyboard("{Enter}");
      }

      expect(onCommit).toHaveBeenCalledTimes(2);
      expect(input).toHaveValue("");
    },
  );
});
