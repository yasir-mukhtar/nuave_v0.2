import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
  },
  // Dev-only: let the Devin desktop preview proxy (127.0.0.1) load dev
  // resources such as the HMR socket and chunk files.
  allowedDevOrigins: ["127.0.0.1"],
};

export default withNextIntl(nextConfig);
