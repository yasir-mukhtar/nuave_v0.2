// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { KeyboardAccessory } from "./KeyboardAccessory";

afterEach(cleanup);

const LABEL = "Bantuan mengetik";

function Bar({ open }: { open: boolean }) {
  return (
    <KeyboardAccessory open={open} label={LABEL}>
      <span>Enter untuk menambah.</span>
    </KeyboardAccessory>
  );
}

const wait = (ms: number) =>
  act(() => new Promise((resolve) => setTimeout(resolve, ms)));

describe("KeyboardAccessory, under its field (no on-screen keyboard)", () => {
  it("shows while open and leaves at once when nothing is pressed", () => {
    const { rerender } = render(<Bar open />);
    expect(screen.getByRole("group", { name: LABEL })).toBeInTheDocument();
    rerender(<Bar open={false} />);
    expect(screen.queryByRole("group", { name: LABEL })).toBeNull();
  });

  it("stays through a press that closed it, so that press's click lands where it was aimed", async () => {
    const { rerender } = render(<Bar open />);
    // A press elsewhere takes focus from the field, which closes the bar.
    fireEvent.pointerDown(document.body);
    rerender(<Bar open={false} />);
    await wait(20);
    expect(screen.getByRole("group", { name: LABEL })).toBeInTheDocument();
    fireEvent.pointerUp(document.body);
    await wait(20);
    expect(screen.queryByRole("group", { name: LABEL })).toBeNull();
  });
});
