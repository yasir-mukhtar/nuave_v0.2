import type { MetadataRoute } from "next";

// Pre-release: keep v2 out of search results. Remove this file (and the
// metadata.robots block in layout.tsx) when v2 becomes the real site.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
