import { cn } from "@/lib/utils";

export type BeadMark = "hit" | "miss" | "untested";

/**
 * Ten numbered beads, one per question (J32): filled where the result holds,
 * hollow where it does not, dashed where the question could not be tested.
 * The beads are drawn for the eye; `summary` says the same in words.
 */
export function TenBeads({
  marks,
  tone,
  summary,
  className,
}: {
  marks: readonly BeadMark[];
  /** Ember for "named", ink for "recommended". */
  tone: "ember" | "ink";
  summary: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <ol
        className="m-0 flex list-none flex-wrap gap-[7px] p-0"
        aria-hidden="true"
      >
        {marks.map((mark, index) => (
          <li key={index} className="grid justify-items-center gap-[5px]">
            <span
              className={cn(
                "size-[22px] rounded-full",
                mark === "hit"
                  ? tone === "ember"
                    ? "bg-[radial-gradient(circle_at_35%_30%,var(--ember-300),var(--ember-600))] shadow-[0_2px_4px_rgb(190_57_11/0.25)]"
                    : "bg-[radial-gradient(circle_at_35%_30%,var(--ink-500),var(--ink-900))] shadow-[0_2px_4px_rgb(28_25_23/0.25)]"
                  : mark === "untested"
                    ? "border border-dashed border-ink-400"
                    : "border border-line-300 bg-stone-50",
              )}
            />
            <span
              className={cn(
                "type-mono-sm leading-none",
                mark === "hit" ? "text-ink-600" : "text-ink-400",
              )}
            >
              {index + 1}
            </span>
          </li>
        ))}
      </ol>
      <p className="sr-only">{summary}</p>
    </div>
  );
}

/** "2, 7 dan 9" */
export function questionList(numbers: number[]): string {
  if (numbers.length <= 1) return numbers.join("");
  return `${numbers.slice(0, -1).join(", ")} dan ${numbers.at(-1)}`;
}
