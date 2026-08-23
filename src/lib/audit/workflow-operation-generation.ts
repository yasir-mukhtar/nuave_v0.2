export type AuditOperationKind =
  | "prompts"
  | "run"
  | "report"
  | "variance";

export type AuditOperationToken = {
  kind: AuditOperationKind;
  generation: number;
  controller: AbortController;
  signal: AbortSignal;
};

/**
 * Browser-only Phase-3 lifecycle guard. It owns one monotonic workflow
 * generation and one AbortController per active operation kind. Reset or
 * navigation invalidates the generation, aborts all obsolete requests, and
 * makes every late result fail `isCurrent` before it can commit state.
 */
export class AuditOperationGeneration {
  private generation = 0;
  private active = new Map<AuditOperationKind, AuditOperationToken>();

  begin(kind: AuditOperationKind): AuditOperationToken {
    this.active.get(kind)?.controller.abort(
      new DOMException("Superseded audit operation", "AbortError"),
    );
    const controller = new AbortController();
    const token: AuditOperationToken = {
      kind,
      generation: this.generation,
      controller,
      signal: controller.signal,
    };
    this.active.set(kind, token);
    return token;
  }

  isCurrent(token: AuditOperationToken): boolean {
    return (
      !token.signal.aborted &&
      token.generation === this.generation &&
      this.active.get(token.kind) === token
    );
  }

  finish(token: AuditOperationToken): void {
    if (this.active.get(token.kind) === token) {
      this.active.delete(token.kind);
    }
  }

  invalidate(reason = "Audit workflow generation changed"): void {
    this.generation += 1;
    for (const token of this.active.values()) {
      token.controller.abort(new DOMException(reason, "AbortError"));
    }
    this.active.clear();
  }

  currentGeneration(): number {
    return this.generation;
  }
}

export function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}
