/**
 * Spec 018 R-07 and R-15: discovery for one order, in its own request. The
 * pool is saved on the order and reused when the inputs are unchanged; a
 * change of services or place runs discovery once more, then the latest pool
 * is kept. Live mode without DataForSEO credentials sends nothing and saves an
 * empty pool, so question writing takes the R-08 fallback.
 */
import { auditMode } from "../audit/deployment-gate";
import type { DirectTenAuditContext } from "../audit/direct-ten-context-v2";
import {
  MAX_DISCOVERY_RUNS,
  saveDiscoveryPool,
  type OrderRow,
} from "../orders/store";
import type { SpendDb } from "../spending/spend-ledger";
import { withOrderSpend } from "../spending/provider-spend";
import {
  dataForSeoCredentialsPresent,
  liveDataForSeoTransport,
  type DataForSeoTransport,
} from "./dataforseo";
import { brandInputFor, discoveryPhrases, runDiscovery } from "./discover";
import { resolveSearchPlace, type SearchPlace } from "./places";
import { buildDiscoveryPool, type DiscoveryPool } from "./pool";
import { syntheticDataForSeoTransport } from "./synthetic";

/** The search place the confirmed context carries, or null for an intake
 * confirmed before Spec 018. */
export function contextSearchPlace(
  context: DirectTenAuditContext,
): SearchPlace | null {
  return context.searchPlace
    ? resolveSearchPlace(context.searchPlace.value)
    : null;
}

/** What discovery ran on: the phrases and the place (R-07). */
export function discoveryKey(
  context: DirectTenAuditContext,
  place: SearchPlace,
): string {
  return JSON.stringify({
    phrases: discoveryPhrases(context),
    place: place.code,
  });
}

export function parseSavedPool(json: string | null): DiscoveryPool | null {
  if (!json) return null;
  try {
    const pool = JSON.parse(json) as DiscoveryPool;
    return pool && pool.version === "nuave-discovery-pool-v1" ? pool : null;
  } catch {
    return null;
  }
}

export type OrderDiscoveryOutcome = {
  pool: DiscoveryPool;
  /** False when a saved pool was reused and nothing was sent. */
  ran: boolean;
  /** True once both runs are used: the place and services are locked. */
  locked: boolean;
};

function transportForMode(): DataForSeoTransport | null {
  if (auditMode() !== "live") return syntheticDataForSeoTransport();
  return dataForSeoCredentialsPresent() ? liveDataForSeoTransport : null;
}

export async function discoverForOrder(input: {
  db: SpendDb;
  order: OrderRow;
  context: DirectTenAuditContext;
  place: SearchPlace;
  /** Tests only. */
  transport?: DataForSeoTransport;
  now?: Date;
}): Promise<OrderDiscoveryOutcome> {
  const { db, order, context, place } = input;
  const key = discoveryKey(context, place);
  const saved = parseSavedPool(order.discovery_json);
  if (
    saved &&
    (order.discovery_key === key || order.discovery_runs >= MAX_DISCOVERY_RUNS)
  )
    return {
      pool: saved,
      ran: false,
      locked: order.discovery_runs >= MAX_DISCOVERY_RUNS,
    };
  const now = input.now ?? new Date();
  const transport = input.transport ?? transportForMode();
  const pool = transport
    ? (
        await withOrderSpend({ db, orderId: order.id }, () =>
          runDiscovery({ context, place, transport, now }),
        )
      ).pool
    : buildDiscoveryPool(
        {
          keywords: [],
          autocomplete: [],
          peopleAlsoAsk: [],
          businessNamesSeen: [],
        },
        {
          brand: brandInputFor(context),
          place,
          phrases: discoveryPhrases(context),
        },
        { incomplete: true, synthetic: false, now },
      );
  const savedNow = await saveDiscoveryPool(db, {
    orderId: order.id,
    poolJson: JSON.stringify(pool),
    key,
  });
  return {
    pool,
    ran: true,
    locked: savedNow && order.discovery_runs + 1 >= MAX_DISCOVERY_RUNS,
  };
}
