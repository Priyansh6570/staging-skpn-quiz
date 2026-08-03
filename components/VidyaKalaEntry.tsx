"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { useLang, useSession } from "@/components/AppProviders";
import { custom, strings } from "@/lib/i18n";
import type { EntryDetail } from "@/lib/vidyakala";

/** Longest opening paragraph that still reads as a standfirst rather than as the article. */
const LEDE_MAX = 400;

// The reading surface. A dark band carries the name, and the prose sits on cream below it, because
// 15,000 characters of Devanagari on a near-black page is not something anyone finishes.
//
// The book is Hindi throughout: there is no English prose for any of these entries and none will be
// invented here. In English the description still renders in Devanagari, marked with lang="hi" and a
// visible badge, which is the honest presentation of a source that exists in one language only.
export default function VidyaKalaEntry({ entry: hiEntry, entryEn }: { entry: EntryDetail; entryEn: EntryDetail }) {
  const { lang, toggle: toggleLang } = useLang();
  const { session } = useSession();
  const s = strings(lang).Home_v5.S;
  const c = custom(lang);
  const entry = lang === "hi" ? hiEntry : entryEn;
  const serif = "'Noto Serif Devanagari',serif";
  const listLabel = entry.section === "vidya" ? s.tabVidyas : s.tabKalas;
  const listHref = `/vidya-kala?view=${entry.section === "vidya" ? "vidya" : "kala"}`;

  // EntryDetail.n is set for kalas only. The rail carries the position in either list, so the hero
  // numeral comes from there and both sections are numbered the same way the index numbers them.
  const n = entry.siblings.find((x) => x.key === entry.key)?.n ?? null;

  // Prose and shlokas are interleaved by the book's own printed page, which is the only structure
  // the source gives. For a seven-page entry like Samaveda that page number is real navigation; for
  // the 60 single-page entries there is nothing to navigate, so the progress bar stays off.
  const blocks = useMemo(() => {
    const byPage = new Map<number, { paras: typeof entry.paras; shlokas: typeof entry.shlokas }>();
    for (const p of entry.paras) {
      if (!byPage.has(p.printed)) byPage.set(p.printed, { paras: [], shlokas: [] });
      byPage.get(p.printed)!.paras.push(p);
    }
    for (const sh of entry.shlokas) {
      if (!byPage.has(sh.printed)) byPage.set(sh.printed, { paras: [], shlokas: [] });
      byPage.get(sh.printed)!.shlokas.push(sh);
    }
    return [...byPage.entries()].sort((a, b) => a[0] - b[0]).map(([printed, v]) => ({ printed, ...v }));
  }, [entry]);

  // The opening paragraph is set larger than the rest, which is the only hierarchy available: the
  // book has no standfirst and everything else is body text. It only works while the paragraph is
  // short enough to read as one — the median first paragraph is 67 characters, but Geet's is 1,258,
  // and at 26px that fills a phone screen before the reader has reached a full stop. Past the cap
  // the entry simply opens in body text rather than having a standfirst cut out of it.
  const first = entry.paras.find((p) => p.kind === "para");
  const lede = first && first.text.length <= LEDE_MAX ? first : null;

  const long = blocks.length > 1;
  const [progress, setProgress] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!long) return;
    const onScroll = () => {
      const el = bodyRef.current;
      if (!el) return;
      const span = Math.max(1, el.offsetHeight - window.innerHeight * 0.5);
      setProgress(Math.min(1, Math.max(0, (window.scrollY - (el.offsetTop - 120)) / span)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [long, entry.key]);

  const verse = (text: string, attribution: string | null, key: string) => (
    <figure key={key} data-e="vkshloka">
      <q data-e="vkverse" lang="sa">{text}</q>
      {attribution ? <figcaption data-e="vkcite">{attribution}</figcaption> : null}
    </figure>
  );

  // Five block kinds come out of the extraction. Four of them are prose of one shape or another;
  // `quote` is the Samaveda chant notation, which is quoted material and takes the verse treatment
  // rather than being poured into a paragraph that would rewrap it into nonsense.
  const proseBlock = (p: (typeof entry.paras)[number], i: number) => {
    if (p.kind === "subhead") return <h2 key={i} data-e="vksubhead">{p.text}</h2>;
    if (p.kind === "quote") return verse(p.text, null, `q${i}`);
    if (p.kind === "connector") return <p key={i} data-e="vkconnector">{p.text}</p>;
    return <p key={i}>{p.text}</p>;
  };

  return (
    <div data-page="VidyaKalaEntry" style={{ background: "#F1ECE1", color: "#1B2233", fontFamily: "'Noto Sans Devanagari',system-ui,sans-serif", minWidth: "320px", overflowX: "clip", isolation: "isolate" }}>
      {long ? <div data-e="vkprogress" aria-hidden="true"><span style={{ transform: `scaleX(${progress})` }}></span></div> : null}
      <SiteHeader lang={lang} active="home" onToggleLang={toggleLang} signedIn={session.signedIn} hasCertificates={session.hasCertificates || session.attemptCount > 0} />

      <article>
        <header data-e="vkhero">
          <div aria-hidden="true" style={{ position: "absolute", left: "50%", top: "-30%", width: "760px", height: "760px", transform: "translateX(-50%)", borderRadius: "50%", background: "radial-gradient(circle,rgba(47,69,110,.4) 0%,rgba(47,69,110,0) 66%)" }}></div>
          <div data-e="pad" style={{ position: "relative", maxWidth: "1220px", margin: "0 auto", padding: "40px 30px 58px" }}>
            <Link href={listHref} data-e="vkback">{`← ${listLabel}`}</Link>

            <div data-e="vkheroline" style={{ marginTop: "30px" }}>
              {n ? <span data-e="vkheronum" aria-hidden="true">{String(n).padStart(2, "0")}</span> : null}
              <h1 data-e="vkheroname">{entry.name}</h1>
            </div>

            {/* A gloss identical to the group label is the label repeated, not a gloss. */}
            {entry.gloss && entry.gloss !== entry.groupHi ? (
              <p data-e="vkherogloss" lang={entry.glossIsHindi ? "hi" : undefined}>
                {entry.gloss}
                {entry.glossIsHindi ? <em data-e="vkonly">{c.vidyaKala.hindiOnly}</em> : null}
              </p>
            ) : null}

            {entry.bookHeading || entry.variants.length ? (
              <dl style={{ display: "flex", gap: "30px", flexWrap: "wrap", margin: "30px 0 0", paddingTop: "22px", borderTop: "1px solid rgba(255,249,236,.14)" }}>
                {(entry.bookHeading ? [entry.bookHeading] : []).concat(entry.variants).map((v, i) => (
                  <div key={v}>
                    <dt style={{ margin: "0 0 5px", fontSize: "12px", textTransform: "uppercase", color: "#8FA8C4" }}>{i === 0 && entry.bookHeading ? c.vidyaKala.bookHeadingLabel : "·"}</dt>
                    <dd lang="hi" style={{ margin: 0, fontFamily: serif, fontSize: "19px", lineHeight: "1.6", color: "#E8DFCE" }}>{v}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        </header>

        <div data-e="vkbody">
          <div data-e="pad section" style={{ position: "relative", maxWidth: "1220px", margin: "0 auto", padding: "58px 30px 84px" }}>
            <div data-e="vkread">
              <div ref={bodyRef}>
                {lede ? (
                  <p data-e="vklede" lang="hi">
                    {lede.text}
                    {lang === "hi" ? null : <em data-e="vkonly">{c.vidyaKala.hindiOnly}</em>}
                  </p>
                ) : null}

                {blocks.map((b) => (
                  <section key={b.printed} data-e="vkpage" id={long ? `p${b.printed}` : undefined}>
                    <div data-e="vkprose" lang="hi">
                      {b.paras.filter((p) => p !== lede).map(proseBlock)}
                    </div>
                    {b.shlokas.map((sh, i) => verse(sh.text, sh.attribution, `s${b.printed}-${i}`))}
                  </section>
                ))}
              </div>

              {/* Where the entry sits in its own list. The back link above already goes to the whole
                  list, so the card does not repeat that with a second link of its own. */}
              <nav data-e="vkrailcard" aria-label={listLabel}>
                <span data-e="vkrailhead">{listLabel}</span>
                {entry.siblings.map((sib) => (
                  <Link key={sib.key} href={`/vidya-kala/${sib.key}`} data-e="vkraillink" aria-current={sib.key === entry.key ? "page" : undefined}>
                    <span data-e="vkrailn">{String(sib.n).padStart(2, "0")}</span>
                    <span data-e="vkrailname">{sib.name}</span>
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </article>

      <SiteFooter lang={lang} />
    </div>
  );
}
