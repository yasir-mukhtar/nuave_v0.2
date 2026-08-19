import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/support",
      ],
    },
    sitemap: "https://nuave.ai/sitemap.xml",
  };
}
