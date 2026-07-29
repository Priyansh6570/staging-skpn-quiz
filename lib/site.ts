/**
 * The origin the site is served from. Canonical URLs, the sitemap and the absolute og:image URL are
 * wrong in a way nobody notices until a crawler indexes localhost, so it is read once here rather
 * than repeated per route. Trailing slash stripped: every consumer joins a leading-slash path.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://shrikrishnapatheynyas.com").replace(/\/$/, "");
