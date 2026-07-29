import type { MetadataRoute } from "next";
import { competitionOpen } from "@/lib/competition";
import { SITE_URL } from "@/lib/site";

// No lastModified: a build-time timestamp is a claim the content changed when it did not, and
// Search Console reports a sitemap of 307s as an error — so /rules and /register are listed only
// while they actually answer 200.
export default function sitemap(): MetadataRoute.Sitemap {
  const open = competitionOpen();
  const routes: [string, number][] = [
    ["/", 1],
    ["/pratiyogita", 0.9],
    ...(open ? ([["/register", 0.9], ["/rules", 0.8]] as [string, number][]) : []),
    ["/about", 0.7],
    ["/privacy", 0.3],
    ["/terms", 0.3],
  ];
  return routes.map(([path, priority]) => ({ url: `${SITE_URL}${path}`, priority }));
}
