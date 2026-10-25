// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LANDING_FAQ } from "./Faq";

afterEach(cleanup);

/** Questions only `/faq` asks; the landing page leaves them out. */
const FAQ_PAGE_ONLY = [
  "Apa yang saya terima?",
  "Data apa yang perlu saya isi?",
];

const normalize = (text: string) => text.replace(/\s+/g, " ").trim();

/** The approved questions and answers of docs/content/website/FAQ.md, in
 * order, as plain text (markdown links reduced to their words). */
function approvedFaq(): { question: string; answer: string }[] {
  const markdown = readFileSync(
    resolve(process.cwd(), "docs/content/website/FAQ.md"),
    "utf8",
  );
  const body = markdown.slice(markdown.indexOf("# Yang sering ditanyakan"));
  return body
    .split(/^## /m)
    .slice(1)
    .map((block) => {
      const [question, ...rest] = block.split("\n");
      const answer = rest
        .join("\n")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/^- /gm, "");
      return { question: question.trim(), answer: normalize(answer) };
    });
}

describe("the landing FAQ (Spec 019 AC-07)", () => {
  const approved = approvedFaq().filter(
    ({ question }) => !FAQ_PAGE_ONLY.includes(question),
  );

  it("asks the approved questions in the approved order", () => {
    expect(LANDING_FAQ.map(({ question }) => question)).toEqual(
      approved.map(({ question }) => question),
    );
  });

  it("gives every answer in the approved words", () => {
    for (const [index, { answer }] of LANDING_FAQ.entries()) {
      const { container } = render(<div>{answer}</div>);
      const words = Array.from(container.querySelectorAll("p"), (p) =>
        normalize(p.textContent ?? ""),
      ).join(" ");
      expect(words).toBe(approved[index].answer);
      cleanup();
    }
  });
});
