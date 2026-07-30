"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import PageAura from "@/components/PageAura";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { useLang, useSession } from "@/components/AppProviders";
import { custom, strings } from "@/lib/i18n";
import type { EntryDetail } from "@/lib/vidyakala";

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

  // Prose and shlokas are interleaved by the book's own printed page, which is the only structure the
  // source gives. For a seven-page entry like Samaveda that page number is real navigation; for the
  // 60 single-page entries there is nothing to navigate, so the rail and the progress bar stay off.
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

  const long = blocks.length > 1;
  const [active, setActive] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!long) return;
    const els = [...document.querySelectorAll<HTMLElement>("[data-vkpage]")];
    const io = new IntersectionObserver(
      (es) => {
        const top = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActive(Number((top.target as HTMLElement).dataset.vkpage));
      },
      { rootMargin: "-96px 0px -55% 0px" },
    );
    els.forEach((e) => io.observe(e));
    const onScroll = () => {
      const el = bodyRef.current;
      if (!el) return;
      const span = Math.max(1, el.offsetHeight - window.innerHeight * 0.5);
      setProgress(Math.min(1, Math.max(0, (window.scrollY - (el.offsetTop - 120)) / span)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { io.disconnect(); window.removeEventListener("scroll", onScroll); };
  }, [long, entry.key]);

  const shlokaBlock = (list: typeof entry.shlokas) =>
    list.map((sh, i) => (
      <figure key={i} data-e="vkshloka">
        <span data-e="vkrule" aria-hidden="true"></span>
        <q data-e="vkverse" lang="sa">{sh.text}</q>
        {sh.attribution ? <figcaption data-e="vkcite">{sh.attribution}</figcaption> : null}
      </figure>
    ));

  return (
    <div data-page="VidyaKalaEntry" style={{ background: "#FBF7F0", color: "#161C2E", fontFamily: "'Noto Sans Devanagari',system-ui,sans-serif", minWidth: "320px", overflowX: "clip", isolation: "isolate" }}>
      {long ? <div data-e="vkprogress" aria-hidden="true"><span style={{ transform: `scaleX(${progress})` }}></span></div> : null}
      <PageAura />
      <SiteHeader lang={lang} active="home" onToggleLang={toggleLang} signedIn={session.signedIn} hasCertificates={session.hasCertificates || session.attemptCount > 0} />

      <article>
        <header style={{ position: "relative", overflow: "hidden", background: "#070B1E" }}>
          <div aria-hidden="true" style={{ position: "absolute", left: "50%", top: "-30%", width: "760px", height: "760px", transform: "translateX(-50%)", borderRadius: "50%", background: "radial-gradient(circle,rgba(47,69,110,.4) 0%,rgba(47,69,110,0) 66%)" }}></div>
          <div data-e="pad section" style={{ position: "relative", maxWidth: "1220px", margin: "0 auto", padding: "64px 30px 58px" }}>
            <Link href={`/vidya-kala?view=${entry.section === "vidya" ? "vidya" : "kala"}`} style={{ display: "inline-block", marginBottom: "22px", fontSize: "15.5px", lineHeight: "1.7", color: "#7FB8AB", textDecoration: "none" }}>
              ← {entry.section === "vidya" ? s.tabVidyas : s.tabKalas}
            </Link>
            {entry.n ? (
              <p aria-hidden="true" style={{ margin: "0 0 12px", fontFamily: serif, fontSize: "15px", letterSpacing: ".1em", color: "#A02B2D", fontVariantNumeric: "tabular-nums" }}>{String(entry.n).padStart(2, "0")}</p>
            ) : null}
            <h1 style={{ margin: "0 0 16px", maxWidth: "24ch", fontFamily: serif, fontWeight: 600, fontSize: "clamp(33px,5.2vw,60px)", lineHeight: "1.16", color: "#FFF9EC", textWrap: "balance" }}>{entry.name}</h1>
            {entry.gloss && entry.gloss !== entry.groupHi ? (
              <p lang={entry.glossIsHindi ? "hi" : undefined} style={{ margin: 0, maxWidth: "52ch", fontSize: "19.5px", lineHeight: "1.9", color: "#E3DED2" }}>
                {entry.gloss}
                {entry.glossIsHindi ? <em style={{ marginLeft: "10px", fontStyle: "normal", fontSize: "12.5px", letterSpacing: ".05em", textTransform: "uppercase", color: "#9A9484" }}>{c.vidyaKala.hindiOnly}</em> : null}
              </p>
            ) : null}

            {entry.bookHeading || entry.variants.length ? (
              <dl style={{ display: "flex", gap: "30px", flexWrap: "wrap", margin: "30px 0 0", paddingTop: "22px", borderTop: "1px solid rgba(255,249,236,.15)" }}>
                {(entry.bookHeading ? [entry.bookHeading] : []).concat(entry.variants).map((v, i) => (
                  <div key={v}>
                    <dt style={{ margin: "0 0 5px", fontSize: "12px", letterSpacing: ".06em", textTransform: "uppercase", color: "#8FA8C4" }}>{i === 0 && entry.bookHeading ? c.vidyaKala.bookHeadingLabel : "·"}</dt>
                    <dd lang="hi" style={{ margin: 0, fontFamily: serif, fontSize: "19px", lineHeight: "1.6", color: "#E8DFCE" }}>{v}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        </header>

        <div data-e="pad section" style={{ position: "relative", maxWidth: "1220px", margin: "0 auto", padding: "58px 30px 30px" }}>
          <div data-e="vkread" style={long ? undefined : { gridTemplateColumns: "minmax(0,1fr)" }}>
            <div ref={bodyRef}>
              {blocks.map((b) => (
                <section key={b.printed} data-e="vkpage" data-vkpage={long ? b.printed : undefined} id={long ? `p${b.printed}` : undefined} style={{ marginBottom: "18px" }}>
                  <div data-e="vkprose" lang="hi" style={{ color: "#232A3C" }}>
                    {b.paras.map((p, i) => <p key={i}>{p.text}</p>)}
                  </div>
                  {b.shlokas.length ? <div style={{ maxWidth: "48ch" }}>{shlokaBlock(b.shlokas)}</div> : null}
                </section>
              ))}
            </div>

            {long ? (
              <nav data-e="vkrail">
                {blocks.map((b) => (
                  <a key={b.printed} href={`#p${b.printed}`} data-e="vkraillink" aria-current={active === b.printed ? "true" : undefined}>{b.printed}</a>
                ))}
              </nav>
            ) : null}
          </div>
        </div>

        <nav data-e="pad section" style={{ maxWidth: "1220px", margin: "0 auto", padding: "22px 30px 88px" }}>
          <div data-e="vknav">
            {entry.prev ? (
              <Link href={`/vidya-kala/${entry.prev.key}`} data-e="vknavlink">
                <span style={{ display: "block", marginBottom: "6px", fontSize: "13px", color: "#8A8474" }}>← {s.prevLabel}</span>
                <span style={{ display: "block", fontFamily: serif, fontWeight: 600, fontSize: "19px", lineHeight: "1.45", color: "#14203E" }}>{entry.prev.name}</span>
              </Link>
            ) : <span></span>}
            {entry.next ? (
              <Link href={`/vidya-kala/${entry.next.key}`} data-e="vknavlink" style={{ textAlign: "right" }}>
                <span style={{ display: "block", marginBottom: "6px", fontSize: "13px", color: "#8A8474" }}>{s.nextLabel} →</span>
                <span style={{ display: "block", fontFamily: serif, fontWeight: 600, fontSize: "19px", lineHeight: "1.45", color: "#14203E" }}>{entry.next.name}</span>
              </Link>
            ) : <span></span>}
          </div>
        </nav>
      </article>

      <SiteFooter lang={lang} />
    </div>
  );
}
