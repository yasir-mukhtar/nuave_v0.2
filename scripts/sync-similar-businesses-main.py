from pathlib import Path

path = Path("src/app/audit/AuditWorkflow.tsx")
text = path.read_text()

replacements = [
    (
        '''import {
  AUDIT_STAGE_CALL_LIMITS,
  summarizeAuditTelemetry,
} from "@/lib/audit/telemetry";''',
        '''import { AUDIT_STAGE_CALL_LIMITS } from "@/lib/audit/telemetry";''',
    ),
    (
        '''  const telemetrySummary =
    report?.operational_telemetry ??
    summarizeAuditTelemetry(
      [
        ...setupTelemetry,
        ...observations.flatMap((observation) => observation.telemetry || []),
      ],
      AUDIT_COST_LIMIT_USD,
      carryoverCostUsd,
    );
''',
        '',
    ),
    (
        '''      {error ? (
        <div className={`${styles.globalAlert} ${styles.noPrint}`}>''',
        '''      {error && step > 0 ? (
        <div className={`${styles.globalAlert} ${styles.noPrint}`}>''',
    ),
    (
        '''      {telemetrySummary.call_count || telemetrySummary.carryover_cost_usd ? (
        <div className={`${styles.globalAlert} ${styles.noPrint}`}>
          <Alert status="default">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Kendali biaya sesi privat</Alert.Title>
              <Alert.Description>
                {telemetrySummary.call_count} panggilan API · USD{" "}
                {telemetrySummary.accounted_cost_usd.toFixed(4)} tercatat dari
                USD {telemetrySummary.cost_limit_usd.toFixed(2)}
                {` · sisa USD ${Math.max(
                  0,
                  telemetrySummary.cost_limit_usd -
                    telemetrySummary.accounted_cost_usd,
                ).toFixed(4)}`}
                {telemetrySummary.carryover_cost_usd
                  ? ` · USD ${telemetrySummary.carryover_cost_usd.toFixed(4)} dibawa dari sesi sebelumnya`
                  : ""}
              </Alert.Description>
            </Alert.Content>
          </Alert>
        </div>
      ) : null}
''',
        '',
    ),
]

for old, new in replacements:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one semantic merge target, found {count}: {old[:80]!r}")
    text = text.replace(old, new, 1)

path.write_text(text)
