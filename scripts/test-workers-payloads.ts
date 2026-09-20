/**
 * Payload generator for `scripts/test-workers.mjs` (Spec 010 R-10a). Prints
 * one JSON document to stdout — the frozen confirmed intake record and its
 * honest brief projection for the GLM fixture, plus the client contract
 * version and cost limit the driver needs. The same pure helpers the browser
 * journey uses build the record, so the wire bodies are identical to what the
 * real client sends; only the fetch calls happen in the driver.
 */
import { INTAKE_FIXTURES } from "../src/lib/intake/fixtures";
import { createIntakeState, setScopeAnswer } from "../src/lib/intake/state";
import { resolveJourneyPath } from "../src/lib/intake/navigation";
import {
  freezeLocalIntake,
  sessionConfirmedBrief,
} from "../src/lib/intake/local-questions";
import { AUDIT_CLIENT_CONTRACT_VERSION } from "../src/lib/audit/client-contract";
import { DIRECT_TEN_PROMPT_IDS } from "../src/lib/audit/locked-question-pack";
import { AUDIT_COST_LIMIT_USD } from "../src/lib/audit/types";

const fixture = INTAKE_FIXTURES.GLM;
const state = setScopeAnswer(createIntakeState(fixture), "scope-whole-brand");
const intake = freezeLocalIntake(
  state,
  fixture,
  resolveJourneyPath({
    entry: "read",
    scope: state.scope,
    brandNeedsFix: false,
  }),
);

process.stdout.write(
  JSON.stringify({
    intake,
    brief: sessionConfirmedBrief(intake.confirmed),
    clientContractVersion: AUDIT_CLIENT_CONTRACT_VERSION,
    costLimitUsd: AUDIT_COST_LIMIT_USD,
    promptIds: DIRECT_TEN_PROMPT_IDS,
  }),
);
