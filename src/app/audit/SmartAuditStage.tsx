"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconLoader2 } from "@tabler/icons-react";
import { AuditProgress } from "@/components/product/AuditProgress";
import { INDONESIAN_RUN_STATUS_LABELS } from "@/lib/audit/report-labels";
import { measurementSlotForPromptId } from "@/lib/audit/measurement-matrix";
import { clearActiveOrder } from "@/lib/intake/smart-session";
import styles from "./audit.module.css";

/**
 * Screens 15 and 15a of the order flow (spec 016): the audit runs on the server,
 * so this page only shows progress by question and can be closed at any time.
 * It asks `/api/orders/status` (the order id travels in the body, never the
 * URL) and never receives the report, the email or the link secret (R-21).
 * When the order ends, the saved order id is removed from the browser (R-31).
 */

type QuestionStatus =
  "pending" | "running" | "retrying" | "completed" | "failed";
type OrderStatusAnswer = {
  state: "open" | "running" | "reporting" | "delivered" | "failed" | "expired";
  completed: number;
  total: number;
  questions: Array<{ prompt_id: string; status: QuestionStatus }>;
};

const POLL_MS = 5_000;

export default function SmartAuditStage({
  orderId,
  pollMs = POLL_MS,
  onRestart,
}: {
  orderId: string;
  pollMs?: number;
  onRestart: () => void;
}) {
  const [status, setStatus] = useState<OrderStatusAnswer | null>(null);
  const [ended, setEnded] = useState<"gone" | null>(null);
  const [unreachable, setUnreachable] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function poll() {
      let again = true;
      try {
        const response = await fetch("/api/orders/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order_id: orderId }),
        });
        if (cancelled) return;
        if (response.status === 404) {
          // Unknown to the server: nothing more to wait for.
          clearActiveOrder();
          setEnded("gone");
          again = false;
        } else if (response.ok) {
          const answer = (await response.json()) as OrderStatusAnswer;
          if (cancelled) return;
          setStatus(answer);
          setUnreachable(false);
          if (["delivered", "failed", "expired"].includes(answer.state)) {
            // R-31: the order has ended; the order id leaves the browser too.
            clearActiveOrder();
            again = false;
          }
        } else {
          setUnreachable(true);
        }
      } catch {
        if (!cancelled) setUnreachable(true);
      }
      if (again && !cancelled) timer = setTimeout(poll, pollMs);
    }
    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [orderId, pollMs]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [status?.state, ended]);

  if (ended === "gone" || status?.state === "expired") {
    return (
      <section
        className="mx-auto grid max-w-3xl gap-4 px-5 py-14"
        data-order-stage="gone"
      >
        <h1 ref={headingRef} tabIndex={-1} className="type-heading-lg">
          Pesanan ini sudah tidak aktif
        </h1>
        <p className="type-copy">
          Pesanan ini sudah berakhir atau tidak ditemukan. Anda dapat memulai
          audit baru.
        </p>
        <Button className="w-fit" onClick={onRestart}>
          Mulai audit baru
        </Button>
      </section>
    );
  }

  if (status?.state === "delivered") {
    return (
      <section
        className="mx-auto grid max-w-3xl gap-4 px-5 py-14"
        data-order-stage="delivered"
      >
        <h1 ref={headingRef} tabIndex={-1} className="type-heading-lg">
          Laporan Anda sudah siap dan kami kirim ke email Anda.
        </h1>
        <p className="type-copy text-muted-foreground">
          Buka link di email tersebut untuk membaca laporan.
        </p>
        <Button className="w-fit" variant="outline" onClick={onRestart}>
          Mulai audit baru
        </Button>
      </section>
    );
  }

  if (status?.state === "failed") {
    return (
      <section
        className="mx-auto grid max-w-3xl gap-4 px-5 py-14"
        data-order-stage="failed"
      >
        <h1 ref={headingRef} tabIndex={-1} className="type-heading-lg">
          Audit belum bisa diselesaikan.
        </h1>
        <p role="status" className="type-copy">
          Kami sudah mencatatnya dan akan menghubungi Anda lewat email.
        </p>
      </section>
    );
  }

  const reporting = status?.state === "reporting";
  const completed = status?.completed ?? 0;
  return (
    <section
      className={`${styles.workspace} ${styles.workspaceFocused}`}
      data-order-stage={status?.state ?? "loading"}
    >
      <header className={styles.stageIntro}>
        <h1 ref={headingRef} tabIndex={-1} className="type-heading-lg">
          {reporting
            ? "Semua pengamatan selesai. Laporan sedang dibuat."
            : "Menjalankan sepuluh pertanyaan audit."}
        </h1>
        <p role="status" className="type-copy" data-order-note="close-ok">
          Anda boleh menutup halaman ini. Kami akan mengirim link laporan ke
          email Anda.
        </p>
      </header>
      <section
        className={styles.runSection}
        aria-label="Kemajuan audit"
        data-order-progress={completed}
      >
        <AuditProgress completed={completed} reporting={reporting} />
        {status ? (
          <div className={styles.runList}>
            {status.questions.map((question, index) => (
              <div className={styles.runRow} key={question.prompt_id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>
                    {measurementSlotForPromptId(question.prompt_id)
                      ?.customerFacingLabel ?? "Pertanyaan"}
                  </strong>
                </div>
                <Badge
                  variant={
                    question.status === "failed"
                      ? "destructive"
                      : question.status === "pending"
                        ? "outline"
                        : "secondary"
                  }
                  className={
                    question.status === "completed"
                      ? "border-[var(--green)] bg-[var(--green-light)] text-[var(--green)]"
                      : question.status === "running" ||
                          question.status === "retrying"
                        ? "border-[var(--action)] bg-[var(--action-soft)] text-[var(--action)]"
                        : undefined
                  }
                >
                  {question.status === "running" ||
                  question.status === "retrying" ? (
                    <IconLoader2
                      className="size-3.5 animate-spin"
                      aria-hidden="true"
                    />
                  ) : null}
                  {INDONESIAN_RUN_STATUS_LABELS[question.status]}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <p role="status" className="type-copy-sm text-muted-foreground">
            Memeriksa kemajuan audit…
          </p>
        )}
        {unreachable ? (
          <p role="status" className="type-copy-sm text-muted-foreground">
            Kemajuan belum dapat dimuat. Audit tetap berjalan di server; coba
            lagi sebentar.
          </p>
        ) : null}
      </section>
    </section>
  );
}
