import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

const reviewSource = await readFile(
  new URL("../review/index.html", import.meta.url),
  "utf8",
);

describe("review persistence bindings", () => {
  it("captures mark text before export can rebuild it from a current run", () => {
    expect(reviewSource).toContain("question_text: previous.question_text === undefined ? question.text : previous.question_text");
    expect(reviewSource).toContain("question_text: entry.question_text");
  });

  it("preserves imported mark text and pack-level bindings", () => {
    expect(reviewSource).toContain("question_text: entry.question_text };");
    expect(reviewSource).toContain("reviewed_run_id: pack.pass2?.reviewed_run_id || null");
    expect(reviewSource).toContain("state.preference_binding = fixtureReview.preference_binding || null");
  });
});
