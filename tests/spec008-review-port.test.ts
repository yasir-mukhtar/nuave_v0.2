import { afterEach, expect, it, vi } from "vitest";
afterEach(()=>vi.unstubAllEnvs());
it.each([undefined,"3307"])("keeps default/isolated port coherent: %s", async port=>{
  vi.stubEnv("NUAVE_E2E_PORT",port);
  vi.resetModules();
  const config=(await import("../playwright.config")).default;
  const chosen=port??"3000";
  expect(config.use?.baseURL).toBe(`http://localhost:${chosen}`);
  const server=config.webServer as {
    command?: string;
    url?: string;
    reuseExistingServer?: boolean;
    env?: Record<string, string>;
  };
  expect(server.command).toBe(`npm run dev -- --port ${chosen}`);
  expect(server.url).toBe(`http://localhost:${chosen}`);
  expect(server.reuseExistingServer).toBe(false);
  expect(server.env.OPENCODEGO_API_KEY).toBe("");
  expect(server.env.OPENAI_API_KEY).toBe("");
  expect(server.env.NUAVE_LIVE_PROVIDER_TESTING).toBe("0");
});
