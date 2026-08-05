import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { allKeys } from "@/lib/vidyakala";

// No lastModified: a build-time timestamp is a claim the content changed when it did not.
//
// /register and /rules are listed unconditionally. They were gated on competitionOpen() because a
// sitemap of 307s is a Search Console error, but neither page redirects — there is no middleware and
// neither reads the flag — so both answer 200 whether the competition is open or shut, and /register
// is where a student searching for the scheme should land.
//
// Both languages are served from one URL by a client toggle, so each entry points hi-IN, en-IN and
// x-default at that single URL rather than at per-language paths the site does not have.
const alternates = (path: string) => {
  const url = `${SITE_URL}${path}`;
  return { languages: { "hi-IN": url, "en-IN": url, "x-default": url } };
};

export default function sitemap(): MetadataRoute.Sitemap {
  const routes: [string, number][] = [
    ["/", 1],
    ["/pratiyogita", 0.9],
    ["/register", 0.9],
    ["/rules", 0.8],
    ["/vidya-kala", 0.8],
    ["/about", 0.7],
    ["/vyavasaya", 0.7],
    // The 14 vidyas and 64 kalas, one static page each — the deepest content on the site.
    ...allKeys().map((key) => [`/vidya-kala/${key}`, 0.6] as [string, number]),
    ["/privacy", 0.3],
    ["/terms", 0.3],
  ];
  return routes.map(([path, priority]) => ({
    url: `${SITE_URL}${path}`,
    priority,
    alternates: alternates(path),
  }));
}
