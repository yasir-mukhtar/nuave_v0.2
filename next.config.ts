import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import createNextIntlPlugin from "next-intl/plugin";

// Local development (`next dev`) and the offline browser tests run against the
// Worker bindings of wrangler.jsonc's `dev` environment: a local D1 database
// (apply the migrations first: `npm run db:migrate:local`) and test-only rate
// limits (spec 016 R-33). Builds and tests do not start it.
if (process.env.NODE_ENV === "development") {
  void initOpenNextCloudflareForDev({ environment: "dev" });
}

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    remotePatterns: [],
  },
};

export default withNextIntl(nextConfig);
