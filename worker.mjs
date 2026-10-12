// Worker entry: serves web requests through the OpenNext worker and adds the
// cron trigger (spec 016 R-15). The cron does not run app code of its own: it
// makes one internal request into the same Next.js handler, so it sees the
// same settings, bindings and database as a web request.
import openNext from "./.open-next/worker.js";

export * from "./.open-next/worker.js";

// Random per isolate, made on first use (random values are not allowed in the
// global scope). Only code inside this isolate can read it, so a public
// request can never present it.
const INTERNAL_KEY = Symbol.for("nuave.internal-call-token");
function internalToken() {
  globalThis[INTERNAL_KEY] ??= crypto.randomUUID();
  return globalThis[INTERNAL_KEY];
}

const worker = {
  fetch: (request, env, ctx) => openNext.fetch(request, env, ctx),

  async scheduled(_controller, env, ctx) {
    const site =
      typeof env.NUAVE_SITE_URL === "string" ? env.NUAVE_SITE_URL : "";
    let origin;
    try {
      origin = new URL(site).origin;
    } catch {
      return; // No valid site address: do nothing (R-15).
    }
    const request = new Request(`${origin}/api/internal/cron`, {
      method: "POST",
      headers: { "x-nuave-internal": internalToken() },
    });
    const response = await openNext.fetch(request, env, ctx);
    await response.arrayBuffer();
  },
};

export default worker;
