"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

/**
 * The entry page's back link, pointing wherever the reader actually came from.
 *
 * The origin is carried in the URL — `?from=vyavasaya` — and not in history. `history.back()` would
 * be wrong twice over: a reader who arrived from a search result, a shared link or a refresh has no
 * history to go back to, and one who has been round the site gets sent somewhere unrelated. A query
 * parameter survives a reload, survives being copied to somebody else, and is inspectable.
 *
 * `from` is never used to build a URL. It selects between the two destinations below and anything
 * else falls through to the entry's own list, so a hand-edited `?from=` cannot point this link
 * anywhere the site did not choose.
 *
 * This sits behind its own Suspense boundary. useSearchParams opts its subtree out of prerendering,
 * so the boundary keeps that to this one link: the rest of the entry page stays fully static, and
 * the fallback renders the list link, which is both the right default and what a crawler sees.
 */
export default function VidyaKalaBackLink({
  listHref,
  listLabel,
  backLabel,
}: {
  listHref: string;
  listLabel: string;
  backLabel: string;
}) {
  const from = useSearchParams().get("from");
  const toProfessions = from === "vyavasaya";
  return (
    <Link href={toProfessions ? "/vyavasaya" : listHref} data-e="vkback">
      {`← ${toProfessions ? backLabel : listLabel}`}
    </Link>
  );
}
