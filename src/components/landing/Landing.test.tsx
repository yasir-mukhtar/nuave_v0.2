// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import Landing from "./Landing";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

beforeAll(() => {
  // The section reveals use motion's whileInView; jsdom has no observer.
  if (!("IntersectionObserver" in window))
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() {
          return [];
        }
      },
    );
});

afterEach(cleanup);

const EXAMPLES = [
  ["Kecantikan", "kecantikan", /laser flek hitam/, "Klinik Kulit Rekaan"],
  ["Khitan", "khitan", /metode klamp/, "Rumah Khitan Rekaan"],
  ["Anak", "anak", /buat vaksin/, "Klinik Anak Rekaan"],
  ["Umum", "umum", /pakai BPJS/, "Klinik Pratama Rekaan"],
  ["Gigi", "gigi", /pasang behel/, "Klinik Gigi Rekaan"],
] as const;

describe("landing patient-question example", () => {
  it("shows each kind of clinic its own question and answer, without a request", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const user = userEvent.setup();
    render(<Landing />);
    const group = screen.getByRole("radiogroup", { name: "Jenis klinik" });
    const example = document.querySelector<HTMLElement>(
      "[data-patient-example]",
    )!;
    expect(example).toHaveAttribute("aria-live", "polite");
    expect(example).toHaveAttribute("data-patient-example", "gigi");
    // jsdom has no matchMedia, so this renders the reduced-motion swap.
    for (const [label, id, question, first] of EXAMPLES) {
      await user.click(within(group).getByRole("radio", { name: label }));
      expect(within(group).getByRole("radio", { name: label })).toBeChecked();
      expect(example).toHaveAttribute("data-patient-example", id);
      expect(within(example).getByText(question)).toBeVisible();
      expect(within(example).getByText("Jawaban AI")).toBeVisible();
      const clinics = within(example).getAllByRole("listitem");
      expect(clinics).toHaveLength(3);
      expect(clinics[0]).toHaveTextContent(first);
      for (const clinic of clinics)
        expect(clinic.querySelector("strong")?.textContent).toMatch(
          /Fiksi|Rekaan|Contoh/,
        );
    }
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
