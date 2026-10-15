// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TEST_PASS_STORAGE_KEY } from "@/lib/intake/test-pass";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { metadata } from "./page";
import UjiForm from "./UjiForm";

// Spec 017 R-20 (Q6, AC-17): the code lives in this tab's session storage and
// nowhere else.

const CODE = "founder-code-0123456789abcdef";

beforeEach(() => {
  push.mockClear();
  window.sessionStorage.clear();
  window.localStorage.clear();
});
afterEach(cleanup);

describe("/uji", () => {
  it("is kept out of search results", () => {
    expect(metadata.robots).toMatchObject({ index: false, follow: false });
  });

  it("keeps the code in session storage only and moves on to /audit with no code in the address", () => {
    const { container } = render(<UjiForm />);
    const input = screen.getByLabelText("Kode uji") as HTMLInputElement;
    // Even with scripts off a form submit could not put the code in a URL.
    expect(input.getAttribute("name")).toBeNull();
    expect(container.querySelector("form")?.getAttribute("action")).toBeNull();
    fireEvent.change(input, { target: { value: CODE } });
    fireEvent.click(screen.getByRole("button", { name: "Lanjut" }));
    expect(window.sessionStorage.getItem(TEST_PASS_STORAGE_KEY)).toBe(CODE);
    expect(JSON.stringify({ ...window.localStorage })).not.toContain(CODE);
    expect(document.cookie).not.toContain(CODE);
    expect(push).toHaveBeenCalledWith("/audit");
    expect(window.location.href).not.toContain(CODE);
  });

  it("stores nothing for an empty code", () => {
    render(<UjiForm />);
    fireEvent.click(screen.getByRole("button", { name: "Lanjut" }));
    expect(window.sessionStorage.getItem(TEST_PASS_STORAGE_KEY)).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });
});
