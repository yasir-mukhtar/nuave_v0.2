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
  // Spec 016 R-26: the private report page is never cached, never indexed and
  // sends no Referer. (The report data route sets the same headers itself.)
  async headers() {
    return [
      // `/r` and the page Browser Run prints (`/r/print`, Spec 021 Part P).
      ...["/r", "/r/:path*"].map((source) => ({
        source,
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      })),
    ];
  },
};

export default withNextIntl(nextConfig);
