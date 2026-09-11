/**
 * Pure gate logic for the buyer-decision question experiment.
 *
 * Gates are decision rules for the founder's review, NOT statistical proof.
 * Every rule here is mechanical over (a) the founder's question marks,
 * (b) the founder's pass-2 checklist answers, and (c) the run records.
 * Incomplete input never passes: missing marks or unanswered checklist items
 * yield "incomplete", and incomplete reviews are never reported as passing.
 *
 * This file is plain ESM so the Node CLI (compute-gates.mjs) and the offline
 * tests can share it without a build step.
 */

export const MARK_KEEP = "keep";
export const MARK_LIGHT = "light";
export const MARK_REPLACE = "replace";

export const PASS2_ITEM_IDS = [
  "standalone",
  "grounding",
  "identity",
  "coverage",
  "repetition",
  "audit_coverage",
];

/** Blocking checklist items: marking one as an issue fails the gate and an
 * unanswered one blocks a verdict (an unanswered check must never pass).
 * Repetition and audit-coverage are informational: they show up as warnings
 * when marked as issues but do not fail the gate on their own; unanswered
 * informational items do not block a verdict. This is the documented
 * blocking-vs-informational split. */
export const PASS2_BLOCKING_ITEMS = ["standalone", "grounding", "identity", "coverage"];
export const PASS2_INFORMATIONAL_ITEMS = ["repetition", "audit_coverage"];

/** Pass-2 entries come in two formats: the review page exports
 * { status: "ok"|"issue"|null, note } objects, while earlier callers and
 * tests pass plain "ok"|"issue"|null strings. Both must be read the same way
 * so exported issues are never silently ignored. */
export function pass2Status(item) {
  if (item === null || item === undefined) return null;
  if (typeof item === "string") return item === "" ? null : item;
  if (typeof item === "object" && !Array.isArray(item)) {
    const status = item.status;
    return status === "" ? null : status ?? null;
  }
  return null;
}

/** Per-pack quality gates for condition B (the experiment's contract). */
export function gateBPack(input) {
  const { questions, marksByIndex, items } = input;
  const { record } = input;
  // questions: the record's processed questions (original order, 1..10).
  // marksByIndex: { "1": {mark, replace_reason, note}, ... } original order.
  // items: { standalone: "ok"|"issue"|null|{status,note}, grounding, ... }.
  const reasons = [];

  if (!Array.isArray(questions) || questions.length !== 10) {
    return { verdict: "fail", reasons: ["Pack does not have ten questions."] };
  }

  const marks = [];
  for (let index = 1; index <= 10; index += 1) {
    const entry = marksByIndex ? marksByIndex[String(index)] : undefined;
    marks.push(entry ? entry.mark : null);
  }

  const unanswered = [];
  marks.forEach((mark, offset) => {
    if (mark === null || mark === undefined) unanswered.push(offset + 1);
  });
  if (unanswered.length > 0) {
    return {
      verdict: "incomplete",
      reasons: [`Question marks missing for pack positions ${unanswered.join(", ")}.`],
    };
  }

  const keep = marks.filter((mark) => mark === MARK_KEEP).length;
  const light = marks.filter((mark) => mark === MARK_LIGHT).length;
  const replace = marks.filter((mark) => mark === MARK_REPLACE).length;

  const check = (condition, message) => {
    if (!condition) reasons.push(message);
    return condition;
  };

  check(
    keep + light >= 9,
    `Quality gate: fewer than 9/10 Keep or Light (found ${keep} Keep + ${light} Light).`,
  );
  check(keep >= 7, `Quality gate: fewer than 7/10 Keep (found ${keep}).`);

  const unresolved = [];
  for (const id of PASS2_BLOCKING_ITEMS) {
    const status = pass2Status(items ? items[id] : null);
    if (status === null || status === undefined) unresolved.push(id);
    else if (status === "issue") {
      reasons.push(`Pass-2 item "${id}" was marked as an issue by the reviewer.`);
    }
  }
  if (unresolved.length > 0) {
    return {
      verdict: "incomplete",
      reasons: [
        `Pass-2 item(s) unanswered: ${unresolved.join(", ")}. An incomplete review never passes.`,
      ],
    };
  }

  // Informational pass-2 items: never block, but surface as warnings so a
  // reviewer can see known repetition/padding or lost-measurement concerns.
  const warnings = [];
  for (const id of PASS2_INFORMATIONAL_ITEMS) {
    const status = pass2Status(items ? items[id] : null);
    if (status === "issue") {
      warnings.push(`Informational pass-2 item "${id}" was marked as an issue by the reviewer.`);
    }
  }

  // Mechanical record sanity (status, fallback, validation, provenance) is
  // evidence about the run itself — problems here must block a pass verdict,
  // not just be printed. When the caller does not supply a record (unit
  // tests, synthetic data) no sanity check applies.
  const recordProblems = record ? recordPackSanity(record) : [];
  for (const problem of recordProblems) reasons.push(`Run-record: ${problem}`);

  return {
    verdict: reasons.length === 0 ? "pass" : "fail",
    counts: { keep, light, replace },
    reasons,
    warnings,
  };
}

/** Mechanical pack sanity from the run record itself (not founder judgment). */
export function recordPackSanity(record) {
  const problems = [];
  if (!record) problems.push("Run record is missing.");
  else {
    if (record.status === "failed") {
      problems.push(`Run failed: ${record.failure_reason || "unknown reason"}.`);
    }
    if (record.status === "completed_with_deterministic_fallback") {
      problems.push(
        "Condition A fell back to the deterministic Indonesian pack (source=fallback); wording is not model output.",
      );
    }
    if (record.output && !record.output.valid) {
      problems.push(
        `Contract validation issues: ${(record.output.validation_issues || [])
          .map((issue) => issue.message)
          .join(" | ")}`,
      );
    }
    if (record.provenance_errors && record.provenance_errors.length > 0) {
      problems.push(`Provenance: ${record.provenance_errors.join(" | ")}`);
    }
    if (record.output) {
      const repairCount = record.output.questions.filter(
        (question) => question.generated_by === "deterministic_slot_repair",
      ).length;
      if (repairCount > 0) {
        problems.push(
          `Condition A deterministic slot repair replaced ${repairCount} question(s); raw vs displayed is recorded per question.`,
        );
      }
    }
  }
  return problems;
}

/** Per-fixture comparison verdict over the initial run (decision gate). */
export function decisionGate(input) {
  const { fixtureReviews, qualityByPack } = input;
  // fixtureReviews: [{ fixture_id, role, preference: "A"|"B"|"tie"|null }]
  // qualityByPack: { [`${fixture_id}::B`]: { verdict } } — the per-pack B gate
  // result from gateBPack. Every B pack must pass its own quality gates; an
  // incomplete or failing B pack makes the decision incomplete or negative —
  // decisions never pass an incomplete review.

  const reasons = [];
  if (fixtureReviews.length < 3) {
    return {
      verdict: "incomplete",
      reasons: ["Decision gate needs all three initial fixtures reviewed."],
    };
  }
  const unanswered = fixtureReviews.filter((review) => !review.preference);
  if (unanswered.length > 0) {
    return {
      verdict: "incomplete",
      reasons: [
        `No overall pack preference recorded for: ${unanswered
          .map((review) => review.fixture_id)
          .join(", ")}.`,
      ],
    };
  }

  let anyIncomplete = false;
  for (const review of fixtureReviews) {
    const quality = qualityByPack[`${review.fixture_id}::B`];
    if (!quality || quality.verdict === "incomplete") {
      anyIncomplete = true;
      reasons.push(
        `B quality review on ${review.fixture_id} is incomplete — the decision gate cannot conclude.`,
      );
    } else if (quality.verdict === "fail") {
      reasons.push(
        `B quality gates FAIL on ${review.fixture_id}; a failing B pack cannot support the revised approach.`,
      );
    }
  }
  if (anyIncomplete) {
    return { verdict: "incomplete", reasons };
  }
  if (
    fixtureReviews.some(
      (review) => qualityByPack[`${review.fixture_id}::B`]?.verdict === "fail",
    )
  ) {
    return { verdict: "does_not_support_b", reasons };
  }

  const bPreferred = fixtureReviews.filter((review) => review.preference === "B");
  const bPreferredHeldOut = bPreferred.filter(
    (review) => review.role === "held-out",
  );
  const remaining = fixtureReviews.filter((review) => review.preference !== "B");
  const notes = remaining.map(
    (review) =>
      `On ${review.fixture_id} the founder did not prefer B; B's per-pack quality gates still pass there, so this is not treated as a material regression (language quality and audit validity are judged separately).`,
  );

  const failures = [];
  if (bPreferred.length < 2) {
    failures.push(
      `Founder prefers B on ${bPreferred.length}/3 fixtures; the decision gate requires at least 2/3.`,
    );
  }
  if (bPreferredHeldOut.length < 1) {
    failures.push(
      "None of the B preferences is a held-out fixture; the decision gate requires B to win at least one held-out fixture.",
    );
  }

  return {
    verdict: failures.length === 0 ? "supports_b" : "does_not_support_b",
    reasons: failures,
    notes,
    counts: {
      b_preferred: bPreferred.length,
      b_preferred_held_out: bPreferredHeldOut.length,
      other_fixtures: remaining.length,
    },
  };
}
