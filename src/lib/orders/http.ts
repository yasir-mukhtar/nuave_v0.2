import { NextResponse } from "next/server";
import { auditMode } from "../audit/deployment-gate";
import {
  SPEND_UNAVAILABLE_MESSAGE,
  spendDatabase,
} from "../spending/provider-spend";
import type { SpendDb } from "../spending/spend-ledger";
import { orderEnvironment } from "./config";
import type { OrderEnvironment, OrderMode } from "./store";

/** What every order route needs from the server: the database, this
 * deployment's environment, and the server-chosen mode (never the browser's). */
export type OrderRuntime = {
  db: SpendDb;
  environment: OrderEnvironment;
  mode: OrderMode;
};

export function orderRuntime(): OrderRuntime | null {
  const db = spendDatabase();
  const environment = orderEnvironment();
  if (!db || !environment) return null;
  return { db, environment, mode: auditMode() };
}

/** Today's "not available" copy. The same body whether the cap is full, the
 * email is not on the list or the server is not set up, so the list cannot be
 * probed. */
export function orderUnavailableResponse() {
  return NextResponse.json(
    { error: SPEND_UNAVAILABLE_MESSAGE, code: "ORDER_UNAVAILABLE" },
    { status: 503 },
  );
}

export function orderNotFoundResponse() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
