import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/auth/", "/login", "/signup"],
      },
    ],
    sitemap: "https://saltsafari.com.au/sitemap.xml",
  };
}
