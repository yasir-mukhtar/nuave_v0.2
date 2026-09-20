import { afterEach, expect, it, vi } from "vitest";
afterEach(() => vi.unstubAllEnvs());
// Spec 009 deliberately superseded the localhost convention: the e2e dev
// preview binds the IPv4 loopback interface itself (next dev's default is
// 0.0.0.0, which is LAN-reachable), so the pinned contract is 127.0.0.1.
it.each([undefined, "3307"])(
  "keeps default/isolated port coherent: %s",
  async (port) => {
    vi.stubEnv("NUAVE_E2E_PORT", port);
    vi.resetModules();
    const config = (await import("../playwright.config")).default;
    const chosen = port ?? "3000";
    expect(config.use?.baseURL).toBe(`http://127.0.0.1:${chosen}`);
    const server = config.webServer as {
      command?: string;
      url?: string;
      reuseExistingServer?: boolean;
      env?: Record<string, string>;
    };
    expect(server.command).toBe(
      `npm run dev -- --port ${chosen} --hostname 127.0.0.1`,
    );
    expect(server.url).toBe(`http://127.0.0.1:${chosen}`);
    expect(server.reuseExistingServer).toBe(false);
    const env = server.env;
    if (!env) {
      throw new Error(
        "webServer.env must exist to pin dummy provider credentials",
      );
    }
    expect(env.OPENCODEGO_API_KEY).toBe("");
    expect(env.OPENAI_API_KEY).toBe("");
    expect(env.NUAVE_LIVE_PROVIDER_TESTING).toBe("0");
  },
);
