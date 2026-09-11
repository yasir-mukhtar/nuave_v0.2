/**
 * Gate logic tests: per-pack B quality gates (9/10 Keep-or-Light, 7/10 Keep,
 * no unresolved grounding/identity/standalone/coverage issues) and the
 * initial-comparison decision gate. Incomplete reviews never pass; language
 * quality can never mask invalid context or reduced coverage.
 */
import { describe, expect, it } from "vitest";
import {
  decisionGate,
  gateBPack,
  recordPackSanity,
} from "../review/gate-logic.mjs";

function tenQuestions() {
  return Array.from({ length: 10 }, (_, index) => ({ index: index + 1, text: `Tanya ${index + 1}?` }));
}

function marks(entries) {
  const byIndex = {};
  for (const [index, mark] of Object.entries(entries)) {
    byIndex[String(index)] = { mark };
  }
  return byIndex;
}

function allOkItems(overrides = {}) {
  return {
    standalone: "ok",
    grounding: "ok",
    identity: "ok",
    coverage: "ok",
    repetition: "ok",
    audit_coverage: "ok",
    ...overrides,
  };
}

const completeRecord = {
  status: "completed",
  failure_reason: null,
  provenance_errors: [],
  output: { valid: true, validation_issues: [], questions: tenQuestions() },
};

describe("gateBPack", () => {
  it("passes a pack with 7 Keep + 2 Light + 1 Replace and all pass-2 items ok", () => {
    const gate = gateBPack({
      questions: tenQuestions(),
      marksByIndex: marks({
        1: "keep", 2: "keep", 3: "keep", 4: "keep", 5: "keep",
        6: "keep", 7: "keep", 8: "light", 9: "light", 10: "replace",
      }),
      items: allOkItems(),
    });
    expect(gate.verdict).toBe("pass");
    expect(gate.counts).toEqual({ keep: 7, light: 2, replace: 1 });
  });

  it("fails when Keep is below 7/10 even if Keep-or-Light is high", () => {
    const gate = gateBPack({
      questions: tenQuestions(),
      marksByIndex: marks({
        1: "keep", 2: "keep", 3: "keep", 4: "keep", 5: "keep",
        6: "keep", 7: "light", 8: "light", 9: "light", 10: "light",
      }),
      items: allOkItems(),
    });
    expect(gate.verdict).toBe("fail");
    expect(gate.reasons.join(" ")).toMatch(/fewer than 7\/10 Keep/);
  });

  it("fails when Keep-or-Light is below 9/10", () => {
    const gate = gateBPack({
      questions: tenQuestions(),
      marksByIndex: marks({
        1: "keep", 2: "keep", 3: "keep", 4: "keep", 5: "keep",
        6: "keep", 7: "keep", 8: "keep", 9: "replace", 10: "replace",
      }),
      items: allOkItems(),
    });
    expect(gate.verdict).toBe("fail");
    expect(gate.reasons.join(" ")).toMatch(/9\/10 Keep or Light/);
  });

  it("is incomplete (never passing) when any mark is missing", () => {
    const gate = gateBPack({
      questions: tenQuestions(),
      marksByIndex: marks({ 1: "keep", 2: "keep", 3: "keep", 4: "keep", 5: "keep", 6: "keep", 7: "keep", 8: "keep", 9: "keep" }),
      items: allOkItems(),
    });
    expect(gate.verdict).toBe("incomplete");
  });

  it("fails when a grounding, identity, standalone or coverage item is an issue", () => {
    for (const item of ["standalone", "grounding", "identity", "coverage"]) {
      const gate = gateBPack({
        questions: tenQuestions(),
        marksByIndex: marks({
          1: "keep", 2: "keep", 3: "keep", 4: "keep", 5: "keep",
          6: "keep", 7: "keep", 8: "keep", 9: "keep", 10: "keep",
        }),
        items: allOkItems({ [item]: "issue" }),
      });
      expect(gate.verdict, item).toBe("fail");
      expect(gate.reasons.join(" ")).toContain(item);
    }
  });

  it("is incomplete when a required pass-2 item is unanswered", () => {
    const gate = gateBPack({
      questions: tenQuestions(),
      marksByIndex: marks({
        1: "keep", 2: "keep", 3: "keep", 4: "keep", 5: "keep",
        6: "keep", 7: "keep", 8: "keep", 9: "keep", 10: "keep",
      }),
      items: { standalone: "ok", grounding: "ok", identity: "ok", coverage: null },
    });
    expect(gate.verdict).toBe("incomplete");
  });

  it("reads pass-2 items in the review-page export form ({status, note} objects), not just strings", () => {
    // The review page exports entries this way; earlier the gate compared the
    // object directly to the string "issue", so exported issues were ignored.
    const good = gateBPack({
      questions: tenQuestions(),
      marksByIndex: marks({
        1: "keep", 2: "keep", 3: "keep", 4: "keep", 5: "keep",
        6: "keep", 7: "keep", 8: "keep", 9: "keep", 10: "keep",
      }),
      items: {
        standalone: { status: "ok", note: "fine" },
        grounding: { status: "ok", note: "fine" },
        identity: { status: "ok", note: "fine" },
        coverage: { status: "ok", note: "fine" },
      },
    });
    expect(good.verdict).toBe("pass");

    const issue = gateBPack({
      questions: tenQuestions(),
      marksByIndex: marks({
        1: "keep", 2: "keep", 3: "keep", 4: "keep", 5: "keep",
        6: "keep", 7: "keep", 8: "keep", 9: "keep", 10: "keep",
      }),
      items: {
        standalone: { status: "ok", note: "" },
        grounding: { status: "issue", note: "invents 24h opening" },
        identity: { status: "ok", note: "" },
        coverage: { status: "ok", note: "" },
      },
    });
    expect(issue.verdict).toBe("fail");
    expect(issue.reasons.join(" ")).toContain('"grounding"');

    const unansweredObject = gateBPack({
      questions: tenQuestions(),
      marksByIndex: marks({
        1: "keep", 2: "keep", 3: "keep", 4: "keep", 5: "keep",
        6: "keep", 7: "keep", 8: "keep", 9: "keep", 10: "keep",
      }),
      items: {
        standalone: { status: null },
        grounding: { status: "ok" },
        identity: { status: "ok" },
        coverage: { status: "ok" },
      },
    });
    expect(unansweredObject.verdict).toBe("incomplete");
    expect(unansweredObject.reasons.join(" ")).toContain("standalone");
  });

  it("treats repetition and audit-coverage as informational warnings that never block the verdict", () => {
    const gate = gateBPack({
      questions: tenQuestions(),
      marksByIndex: marks({
        1: "keep", 2: "keep", 3: "keep", 4: "keep", 5: "keep",
        6: "keep", 7: "keep", 8: "keep", 9: "keep", 10: "keep",
      }),
      items: {
        standalone: "ok", grounding: "ok", identity: "ok", coverage: "ok",
        repetition: "issue", audit_coverage: "issue",
      },
    });
    expect(gate.verdict).toBe("pass");
    expect(gate.warnings).toHaveLength(2);
    expect(gate.warnings.join(" ")).toContain("repetition");
    expect(gate.warnings.join(" ")).toContain("audit_coverage");

    // Unanswered informational items must not block either.
    const unansweredInfo = gateBPack({
      questions: tenQuestions(),
      marksByIndex: marks({
        1: "keep", 2: "keep", 3: "keep", 4: "keep", 5: "keep",
        6: "keep", 7: "keep", 8: "keep", 9: "keep", 10: "keep",
      }),
      items: {
        standalone: "ok", grounding: "ok", identity: "ok", coverage: "ok",
        repetition: null, audit_coverage: { status: null },
      },
    });
    expect(unansweredInfo.verdict).toBe("pass");
  });

  it("blocks the verdict when the run record itself is broken (validation, fallback, provenance)", () => {
    const run = gateBPack({
      questions: tenQuestions(),
      marksByIndex: marks({
        1: "keep", 2: "keep", 3: "keep", 4: "keep", 5: "keep",
        6: "keep", 7: "keep", 8: "keep", 9: "keep", 10: "keep",
      }),
      items: allOkItems(),
      record: {
        status: "completed",
        failure_reason: null,
        provenance_errors: ["returned model mismatch"],
        output: {
          valid: false,
          validation_issues: [{ index: 1, rule: "count", message: "not ten" }],
          questions: tenQuestions(),
        },
      },
    });
    expect(run.verdict).toBe("fail");
    expect(run.reasons.join(" ")).toContain("Run-record");
  });

  it("never passes the founder's actual 2026-09-06 export (object-form entries, unanswered pass-2)", async () => {
    const { readFile } = await import("node:fs/promises");
    const review = JSON.parse(
      await readFile(new URL("../evidence/founder-review-2026-09-06.json", import.meta.url), "utf8"),
    );
    // Every fixture pack in the founder export must gate as fail or
    // incomplete — never pass. This locks the export-object normalization:
    // a regression that silently ignores exported issues would flip one of
    // these to "pass".
    const verdicts = [];
    for (const fixtureReview of Object.values(review.comparison || {})) {
      for (const condition of ["a", "b"]) {
        const pack = fixtureReview[condition];
        if (!pack) continue;
        const byIndex = {};
        for (const entry of pack.marks || []) byIndex[String(entry.question_index)] = { mark: entry.mark };
        const items = pack.pass2 ? pack.pass2.items : {};
        const gate = gateBPack({
          questions: tenQuestions(),
          marksByIndex: byIndex,
          items,
        });
        verdicts.push(gate.verdict);
        expect(gate.verdict, `${fixtureReview.fixture_id} ${condition}`).not.toBe("pass");
      }
    }
    expect(verdicts.length).toBeGreaterThan(0);
  });
});

describe("recordPackSanity", () => {
  it("flags failed runs, fallback provenance and validation issues", () => {
    expect(recordPackSanity(null)).toHaveLength(1);
    const failed = recordPackSanity({ ...completeRecord, status: "failed", failure_reason: "boom" });
    expect(failed.join(" ")).toMatch(/Run failed/);

    const fallback = recordPackSanity({
      ...completeRecord,
      status: "completed_with_deterministic_fallback",
    });
    expect(fallback.join(" ")).toMatch(/deterministic Indonesian pack/);

    const invalid = recordPackSanity({
      ...completeRecord,
      output: {
        valid: false,
        validation_issues: [{ index: 1, rule: "count", message: "not ten" }],
        questions: [],
      },
    });
    expect(invalid.join(" ")).toMatch(/not ten/);

    const provenance = recordPackSanity({ ...completeRecord, provenance_errors: ["model mismatch"] });
    expect(provenance.join(" ")).toMatch(/model mismatch/);
  });
});

describe("review mark binding", () => {
  it("does not accept a mark whose exported text differs from the run record", async () => {
    const { execFileSync } = await import("node:child_process");
    const { mkdtempSync, writeFileSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = mkdtempSync(join(tmpdir(), "bdq-gate-binding-"));
    try {
      const record = {
        run_id: "initial-binding-test",
        run_kind: "initial",
        condition: "B",
        fixture_id: "fixture-1-kopi-sudut",
        status: "completed",
        output: { valid: true, validation_issues: [], questions: tenQuestions() },
        provenance_errors: [],
      };
      writeFileSync(join(dir, `${record.run_id}.json`), JSON.stringify(record));
      const review = {
        schema: "nuave-bdq-review-export-v1",
        reviewer: { type: "founder", name: "Founder" },
        comparison: {
          [record.fixture_id]: {
            fixture_id: record.fixture_id,
            role: "development",
            a: { run_id: record.run_id, marks: [], pass2: { items: {} } },
            b: {
              run_id: record.run_id,
              marks: Array.from({ length: 10 }, (_, index) => ({
                run_id: record.run_id,
                question_index: index + 1,
                question_text: index === 0 ? "changed text" : `Tanya ${index + 1}?`,
                mark: "keep",
              })),
              pass2: { items: { standalone: "ok", grounding: "ok", identity: "ok", coverage: "ok" } },
            },
            preference: "B",
          },
        },
      };
      const reviewFile = join(dir, "review.json");
      writeFileSync(reviewFile, JSON.stringify(review));
      let output = "";
      try {
        output = execFileSync("node", ["review/compute-gates.mjs", "--results", dir, reviewFile], {
          cwd: new URL("..", import.meta.url).pathname,
          encoding: "utf8",
        });
      } catch (error) {
        output = `${error.stdout || ""}${error.stderr || ""}`;
      }
      expect(output).toContain("review binding: INCOMPLETE");
      expect(output).toContain("exact text");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("AI reviewer exclusion", () => {
  it("keeps AI review exports out of acceptance calculation", async () => {
    const { execFileSync } = await import("node:child_process");
    const { mkdtempSync, writeFileSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = mkdtempSync(join(tmpdir(), "bdq-gate-ai-"));
    try {
      const reviewFile = join(dir, "ai-review.json");
      writeFileSync(reviewFile, JSON.stringify({
        schema: "nuave-bdq-review-export-v1",
        reviewer: { type: "ai", name: "AI reviewer" },
        comparison: { "fixture-ai": { fixture_id: "fixture-ai", role: "held-out", preference: "B" } },
      }));
      let output = "";
      try {
        output = execFileSync("node", ["review/compute-gates.mjs", "--results", dir, reviewFile], {
          cwd: new URL("..", import.meta.url).pathname,
          encoding: "utf8",
        });
      } catch (error) {
        output = `${error.stdout || ""}${error.stderr || ""}`;
      }
      expect(output).toContain("EXCLUDED reviewer: AI reviewer");
      expect(output).toContain("No initial-comparison fixture reviews found");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("decisionGate", () => {
  const passQuality = () => ({ verdict: "pass", counts: { keep: 10, light: 0, replace: 0 } });
  const baseReviews = () => [
    { fixture_id: "fixture-1-kopi-sudut", role: "development" },
    { fixture_id: "fixture-2-kopi-bukit-biru", role: "held-out" },
    { fixture_id: "fixture-3-laundry-segar-kilat", role: "held-out" },
  ];

  it("supports B when B wins two fixtures including a held-out one and all B packs pass", () => {
    const reviews = baseReviews();
    reviews[0].preference = "B";
    reviews[1].preference = "A"; // remaining fixture: no material regression (B pack still passes)
    reviews[2].preference = "B";
    const quality = {};
    for (const review of reviews) quality[`${review.fixture_id}::B`] = passQuality();
    const decision = decisionGate({ fixtureReviews: reviews, qualityByPack: quality });
    expect(decision.verdict).toBe("supports_b");
    expect(decision.counts.b_preferred).toBe(2);
    expect(decision.counts.b_preferred_held_out).toBe(1);
  });

  it("does not support B when B wins only one fixture", () => {
    const reviews = baseReviews();
    reviews[0].preference = "B";
    reviews[1].preference = "A";
    reviews[2].preference = "A";
    const quality = {};
    for (const review of reviews) quality[`${review.fixture_id}::B`] = passQuality();
    const decision = decisionGate({ fixtureReviews: reviews, qualityByPack: quality });
    expect(decision.verdict).toBe("does_not_support_b");
    expect(decision.reasons.join(" ")).toMatch(/at least 2\/3/);
  });

  it("is incomplete when a fixture lacks an overall pack preference", () => {
    const reviews = baseReviews();
    reviews[0].preference = "B";
    reviews[1].preference = "B";
    reviews[2].preference = null;
    const quality = {};
    for (const review of reviews) quality[`${review.fixture_id}::B`] = passQuality();
    const decision = decisionGate({ fixtureReviews: reviews, qualityByPack: quality });
    expect(decision.verdict).toBe("incomplete");
  });

  it("is incomplete when a B pack review is incomplete (never auto-passed)", () => {
    const reviews = baseReviews();
    reviews[0].preference = "B";
    reviews[1].preference = "B";
    reviews[2].preference = "A";
    const quality = {
      "fixture-1-kopi-sudut::B": passQuality(),
      "fixture-2-kopi-bukit-biru::B": passQuality(),
      "fixture-3-laundry-segar-kilat::B": { verdict: "incomplete" },
    };
    const decision = decisionGate({ fixtureReviews: reviews, qualityByPack: quality });
    expect(decision.verdict).toBe("incomplete");
  });

  it("does not support B when the remaining fixture shows a material regression (B pack fails)", () => {
    const reviews = baseReviews();
    reviews[0].preference = "B";
    reviews[1].preference = "A";
    reviews[2].preference = "B";
    const quality = {
      "fixture-1-kopi-sudut::B": passQuality(),
      "fixture-2-kopi-bukit-biru::B": { verdict: "fail", counts: { keep: 5, light: 2, replace: 3 } },
      "fixture-3-laundry-segar-kilat::B": passQuality(),
    };
    const decision = decisionGate({ fixtureReviews: reviews, qualityByPack: quality });
    expect(decision.verdict).toBe("does_not_support_b");
  });
});
