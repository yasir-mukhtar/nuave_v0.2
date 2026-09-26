import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

/** What `launch` records. `root` is the checkout the server was started from. */
export type RunState = {
  runId: string;
  pgid: number;
  port: number;
  root: string;
  mode: "synthetic";
  launchedAt: string;
  logFile: string;
  status: "running" | "stopped";
  stoppedAt?: string;
};

export type Stamp = {
  head: string;
  dirty: boolean;
  dirtyFiles: string[];
  stampedAt: string;
};

export function evidenceBase(root: string) {
  return join(root, ".local-evidence", "verify-nuave");
}

export function runDir(root: string, runId: string) {
  return join(evidenceBase(root), runId);
}

const currentPointer = (root: string) => join(evidenceBase(root), "current");

export function newRunId() {
  const time = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15);
  return `${time}Z-${Math.random().toString(36).slice(2, 6)}`;
}

export function writeState(root: string, state: RunState) {
  const dir = runDir(root, state.runId);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "state.json"), `${JSON.stringify(state, null, 2)}\n`);
  writeFileSync(currentPointer(root), `${state.runId}\n`);
}

/** Reads `--run <id>`, or the run the last `launch` in this checkout made. */
export function readState(root: string, runId?: string): RunState {
  const id =
    runId ??
    (existsSync(currentPointer(root))
      ? readFileSync(currentPointer(root), "utf8").trim()
      : "");
  if (!id)
    throw new Error(
      `No run state: ${currentPointer(root)} is missing. Run \`launch\` first, or pass --run <id>.`,
    );
  const file = join(runDir(root, id), "state.json");
  if (!existsSync(file)) throw new Error(`No run state file at ${file}.`);
  return JSON.parse(readFileSync(file, "utf8")) as RunState;
}

function git(root: string, args: string[]) {
  return execFileSync("git", ["-C", root, ...args], {
    encoding: "utf8",
  }).trimEnd();
}

export function checkoutRoot(from: string) {
  return realpathSync(git(from, ["rev-parse", "--show-toplevel"]));
}

/** `HEAD` and the working-tree state right now. Evidence is git-ignored. */
export function stamp(root: string): Stamp {
  const dirtyFiles = git(root, ["status", "--porcelain"])
    .split("\n")
    .filter(Boolean);
  return {
    head: git(root, ["rev-parse", "HEAD"]),
    dirty: dirtyFiles.length > 0,
    dirtyFiles,
    stampedAt: new Date().toISOString(),
  };
}

export function groupAlive(pgid: number) {
  try {
    process.kill(-pgid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

/** PIDs listening on the TCP port (any interface). Needs `lsof`. */
export function listeners(port: number): number[] {
  try {
    return execFileSync(
      "lsof",
      ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"],
      { encoding: "utf8" },
    )
      .split("\n")
      .filter(Boolean)
      .map(Number);
  } catch (error) {
    // lsof exits 1 with no output when nothing matches.
    if ((error as { status?: number }).status === 1) return [];
    throw error;
  }
}

export function pgidOf(pid: number): number | null {
  try {
    return Number(
      execFileSync("ps", ["-o", "pgid=", "-p", String(pid)], {
        encoding: "utf8",
      }).trim(),
    );
  } catch {
    return null;
  }
}

/**
 * The folder a process was started from (its working directory). Linux reads
 * `/proc/<pid>/cwd`; macOS (and any system without `/proc`) asks `lsof`.
 */
export function cwdOf(pid: number): string | null {
  try {
    if (process.platform === "linux")
      return realpathSync(readlinkSync(`/proc/${pid}/cwd`));
    const out = execFileSync(
      "lsof",
      ["-a", "-p", String(pid), "-d", "cwd", "-Fn"],
      { encoding: "utf8" },
    );
    const line = out.split("\n").find((entry) => entry.startsWith("n"));
    return line ? realpathSync(line.slice(1)) : null;
  } catch {
    return null;
  }
}

/** Every process in the group, as `{ pid, command }`. */
export function groupMembers(pgid: number) {
  const out = execFileSync("ps", ["-A", "-o", "pid=,pgid=,command="], {
    encoding: "utf8",
  });
  return out
    .split("\n")
    .map((line) => line.trim().match(/^(\d+)\s+(\d+)\s+(.*)$/))
    .filter((match): match is RegExpMatchArray => !!match)
    .filter((match) => Number(match[2]) === pgid)
    .map((match) => ({ pid: Number(match[1]), command: match[3] }));
}
