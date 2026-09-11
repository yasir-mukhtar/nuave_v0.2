// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Reveal } from "./Reveal";

afterEach(cleanup);

describe("Reveal", () => {
  it("keeps the panel hidden until the trigger opens it", async () => {
    const user = userEvent.setup();
    render(
      <Reveal trigger="Ganti">
        <input aria-label="Kategori lain" />
      </Reveal>,
    );

    expect(screen.queryByLabelText("Kategori lain")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ganti" }));

    expect(screen.getByLabelText("Kategori lain")).toBeVisible();
  });

  it("reports the open state and closes again from the trigger", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Reveal trigger="Ganti" onOpenChange={onOpenChange}>
        <p>Panel isi</p>
      </Reveal>,
    );

    await user.click(screen.getByRole("button", { name: "Ganti" }));
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(screen.getByText("Panel isi")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Ganti" }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("renders a controlled panel without a trigger", () => {
    render(
      <Reveal open>
        <input aria-label="Kota atau area" />
      </Reveal>,
    );

    expect(screen.getByLabelText("Kota atau area")).toBeVisible();
  });

  it("stays closed while controlled closed", () => {
    render(
      <Reveal open={false}>
        <input aria-label="Kota atau area" />
      </Reveal>,
    );

    expect(screen.queryByLabelText("Kota atau area")).not.toBeInTheDocument();
  });
});
