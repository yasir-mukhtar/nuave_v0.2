import type { AnswerPresentation } from "@/lib/audit/report-presentation";
import styles from "./report-body.module.css";

export function ReportReferences({
  ids,
  references,
}: {
  ids: readonly string[];
  references: ReadonlyMap<string, AnswerPresentation>;
}) {
  return (
    <div className={styles.references}>
      <span>Berdasarkan pertanyaan:</span>
      {ids.map((id, index) => {
        const answer = references.get(id)!; // The pure adapter validated every ID.
        return (
          <a
            key={`${id}-${index}`}
            href={`#${answer.targetId}`}
            onClick={(event) => {
              // A hash navigation fires the intake's popstate handler. Keep
              // this navigation within the saved report and its existing tree.
              event.preventDefault();
              const heading = document.getElementById(answer.targetId);
              heading?.focus({ preventScroll: true });
              heading?.scrollIntoView?.({ block: "start" });
            }}
          >
            Pertanyaan {answer.ordinal}
          </a>
        );
      })}
    </div>
  );
}
