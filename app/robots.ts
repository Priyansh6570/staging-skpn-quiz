import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// The disallowed paths are the ones that hold or lead to student data, plus the attempt surface.
// They are all session-gated anyway; this keeps them out of the index and out of crawl budget.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/api/", "/quiz", "/login", "/profile", "/certificates"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
