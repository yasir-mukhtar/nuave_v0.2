import type { IntakeChapterFills } from "./navigation";

type IntakeChapterProgressProps = {
  /** Fractional fill per chapter, one entry per chapter, each in [0, 1]. */
  fills: IntakeChapterFills;
};

/**
 * Four-segment chapter progress (ledger §1 + deck §6.1).
 *
 * Chapter fill only: no numerals, no step counts. Each segment fills
 * fractionally by the screen's position among its chapter's visible screens.
 */
export default function IntakeChapterProgress({
  fills,
}: IntakeChapterProgressProps) {
  return (
    <div
      role="img"
      aria-label="Kemajuan"
      data-new-intake-progress="chapters"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gap: "6px",
      }}
    >
      {fills.map((fill, chapter) => {
        const clamped = Math.min(1, Math.max(0, fill));
        return (
          <div
            key={chapter}
            style={{
              height: "4px",
              borderRadius: "999px",
              background: "var(--bg-neutral, #f4f4f5)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${Math.round(clamped * 100)}%`,
                borderRadius: "999px",
                background: "var(--action, #18181b)",
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
