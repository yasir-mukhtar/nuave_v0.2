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
import { ChipAdder, splitList } from "./ChipAdder";

afterEach(cleanup);

const FIELD = "Kebutuhan pelanggan lain";

function renderAdder(props: Partial<Parameters<typeof ChipAdder>[0]> = {}) {
  const onAdd = props.onAdd ?? vi.fn<(items: string[]) => boolean>(() => true);
  render(
    <ChipAdder
      addLabel="Lainnya"
      fieldLabel={FIELD}
      {...props}
      onAdd={onAdd}
    />,
  );
  return onAdd;
}

/** Opens the adder from its chip and returns the field. */
function open() {
  fireEvent.click(screen.getByRole("button", { name: "Lainnya" }));
  return screen.getByRole("textbox", { name: FIELD });
}

/** The keyboard bar under the field (inline: jsdom has no coarse pointer). */
const bar = () => within(screen.getByRole("group", { name: FIELD }));

describe("splitList", () => {
  it("splits a pasted list on commas and new lines, trimmed", () => {
    expect(splitList(" matcha, es teh \n kopi susu ,\n")).toEqual([
      "matcha",
      "es teh",
      "kopi susu",
    ]);
  });

  it("drops repeats that differ only in case, keeping the first spelling", () => {
    expect(splitList("Matcha, matcha ,MATCHA, Es Teh\nes teh")).toEqual([
      "Matcha",
      "Es Teh",
    ]);
  });

  it("keeps a comma inside one item when splitting is off", () => {
    expect(splitList("  Kopi, susu  ", false)).toEqual(["Kopi, susu"]);
  });

  it("returns nothing for blank input", () => {
    expect(splitList("")).toEqual([]);
    expect(splitList(" , \n ,")).toEqual([]);
    expect(splitList("   ", false)).toEqual([]);
  });
});

describe("ChipAdder", () => {
  it("opens its field from the chip, ready to type", () => {
    renderAdder();
    expect(screen.queryByRole("textbox", { name: FIELD })).toBeNull();
    expect(screen.getByRole("button", { name: "Lainnya" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );

    const field = open();

    expect(field).toHaveFocus();
    expect(screen.queryByRole("button", { name: "Lainnya" })).toBeNull();
    expect(bar().getByRole("button", { name: "Tambah" })).toBeDisabled();
  });

  it("adds on Enter and keeps the field open for the next item", () => {
    const onAdd = renderAdder();
    const field = open();

    fireEvent.change(field, { target: { value: "matcha, es teh, Matcha" } });
    expect(screen.getByRole("group", { name: FIELD })).toHaveTextContent(
      "2 akan ditambahkan: matcha, es teh",
    );
    fireEvent.keyDown(field, { key: "Enter" });

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledWith(["matcha", "es teh"]);
    expect(screen.getByRole("textbox", { name: FIELD })).toBe(field);
    expect(field).toHaveValue("");
    expect(field).toHaveFocus();

    fireEvent.change(field, { target: { value: "kopi susu" } });
    fireEvent.click(bar().getByRole("button", { name: "Tambah" }));
    expect(onAdd).toHaveBeenLastCalledWith(["kopi susu"]);
    expect(field).toHaveValue("");
  });

  it("does not add when nothing was typed", () => {
    const onAdd = renderAdder();
    const field = open();

    fireEvent.change(field, { target: { value: " , " } });
    fireEvent.keyDown(field, { key: "Enter" });

    expect(onAdd).not.toHaveBeenCalled();
    expect(bar().getByRole("button", { name: "Tambah" })).toBeDisabled();
  });

  it("keeps the typed text when the add is refused", () => {
    const onAdd = renderAdder({
      onAdd: vi.fn<(items: string[]) => boolean>(() => false),
    });
    const field = open();

    fireEvent.change(field, { target: { value: "n".repeat(301) } });
    fireEvent.click(bar().getByRole("button", { name: "Tambah" }));

    expect(onAdd).toHaveBeenCalledWith(["n".repeat(301)]);
    expect(field).toHaveValue("n".repeat(301));
    expect(field).toHaveFocus();
  });

  it("adds a suggestion with one tap", () => {
    const suggestionsFor = (draft: string) =>
      draft.trim() ? ["Bandung", "Bandung Barat"] : [];
    const onAdd = renderAdder({ suggestionsFor });
    const field = open();

    fireEvent.change(field, { target: { value: "bandng" } });
    fireEvent.click(bar().getByRole("button", { name: "Bandung Barat" }));

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledWith(["Bandung Barat"]);
    expect(field).toHaveValue("");
    expect(field).toHaveFocus();
  });

  it("folds back into its chip when left empty; the always-open box stays", () => {
    renderAdder();
    const field = open();
    fireEvent.keyDown(field, { key: "Escape" });
    expect(screen.queryByRole("textbox", { name: FIELD })).toBeNull();
    fireEvent.blur(open());
    expect(screen.queryByRole("textbox", { name: FIELD })).toBeNull();
    cleanup();

    renderAdder({ variant: "field", addLabel: "Tambah" });
    const box = screen.getByRole("textbox", { name: FIELD });
    expect(box).not.toHaveFocus();
    fireEvent.keyDown(box, { key: "Escape" });
    fireEvent.blur(box);
    expect(screen.getByRole("textbox", { name: FIELD })).toBe(box);
  });
});
