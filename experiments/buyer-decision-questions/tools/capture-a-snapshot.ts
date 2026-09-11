/**
 * One-off snapshot tool: captures the CURRENT production question-writer
 * instruction (condition A) into a JSON file for inspection and provenance.
 *
 * The snapshot is informational. Live runs always capture the instruction
 * actually in the code at run time; this tool only produces the frozen
 * reference that accompanies the experiment freeze.
 *
 * Usage:
 *   npx esbuild experiments/buyer-decision-questions/tools/capture-a-snapshot.ts \
 *     --bundle --platform=node --format=cjs --outfile=/tmp/capture-a-snapshot.cjs
 *   node /tmp/capture-a-snapshot.cjs > experiments/buyer-decision-questions/instructions/condition-a-snapshot.json
 */
import { createHash } from "node:crypto";
import {
  INDONESIAN_QUESTION_WRITER_INSTRUCTION,
} from "../../../src/lib/audit/questions-id-provider";
import {
  INDONESIAN_QUESTION_INSTRUCTION_VERSION,
  INDONESIAN_QUESTION_LANGUAGE,
  INDONESIAN_QUESTION_PACK_VERSION,
} from "../../../src/lib/audit/questions-id";
import { AUDIT_MEASUREMENT_MATRIX } from "../../../src/lib/audit/measurement-matrix";
import { AUDIT_MODEL } from "../../../src/lib/audit/telemetry";
import { OPENCODEGO_BASE_URL } from "../../../src/lib/audit/opencodego";

const sha256 = (value: string) =>
  createHash("sha256").update(value, "utf8").digest("hex");

const snapshot = {
  schema: "nuave-buyer-decision-condition-a-snapshot-v1",
  captured_at: new Date().toISOString(),
  source_modules: {
    writer_instruction: "src/lib/audit/questions-id-provider.ts (INDONESIAN_QUESTION_WRITER_INSTRUCTION)",
    slot_matrix: "src/lib/audit/measurement-matrix.ts (AUDIT_MEASUREMENT_MATRIX)",
    input_projection: "src/lib/audit/questions-id.ts (minimizeIndonesianBrief)",
    provider_method: "src/lib/audit/opencodego.ts (protected OpenCode Go method)",
  },
  versions: {
    instruction_version: INDONESIAN_QUESTION_INSTRUCTION_VERSION,
    pack_version: INDONESIAN_QUESTION_PACK_VERSION,
    language: INDONESIAN_QUESTION_LANGUAGE,
    slot_count: AUDIT_MEASUREMENT_MATRIX.length,
    unbranded_slots: AUDIT_MEASUREMENT_MATRIX.filter(
      (slot) => slot.auditedBrandIdentity === "forbidden",
    ).length,
    branded_slots: AUDIT_MEASUREMENT_MATRIX.filter(
      (slot) => slot.auditedBrandIdentity === "required",
    ).length,
    audit_model: AUDIT_MODEL,
    opencodego_base_url: OPENCODEGO_BASE_URL,
  },
  writer_instruction_sha256: sha256(INDONESIAN_QUESTION_WRITER_INSTRUCTION),
  writer_instruction: INDONESIAN_QUESTION_WRITER_INSTRUCTION,
};

process.stdout.write(`${JSON.stringify(snapshot, null, 2)}\n`);
