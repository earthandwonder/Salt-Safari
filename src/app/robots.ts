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
    sitemap: "https://benmccarthy.com.au/p/salt-safari/sitemap.xml",
  };
}
