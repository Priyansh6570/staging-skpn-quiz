"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import VidyaKalaDrawer from "@/components/VidyaKalaDrawer";
import { useLang, useSession } from "@/components/AppProviders";
import { custom, strings } from "@/lib/i18n";
import type { IndexRow, VidyaGroup } from "@/lib/vidyakala";

// Devanagari typed into a search box does not reliably match the book's bytes: the data carries both
// nukta and bare forms of the same letter (क्रीडा / क्रीड़ा), and IME output is not always NFC. Folding
// both sides through the same normaliser is what makes a Devanagari query behave like a Latin one.
const fold = (s: string) =>
  s.normalize("NFC").replace(/़/g, "").replace(/[​-‍]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

type View = "vidya" | "kala";
type Props = { vidyas: VidyaGroup[]; kalas: IndexRow[]; vidyasEn: VidyaGroup[]; kalasEn: IndexRow[] };

export default function VidyaKalaIndex({ vidyas, kalas, vidyasEn, kalasEn }: Props) {
  const { lang, toggle: toggleLang } = useLang();
  const { session } = useSession();
  const s = strings(lang).Home_v5.S;
  const c = custom(lang);
  const hi = lang === "hi";
  const serif = "'Noto Serif Devanagari',serif";

  // The URL is the source of truth for the tab, not local state: that makes it linkable, survives
  // reload, and gives back/forward the behaviour a reader expects. The tabs are links for the same
  // reason. useSearchParams needs a Suspense boundary on a static page — the route supplies one.
  const view: View = useSearchParams().get("view") === "kala" ? "kala" : "vidya";

  const groups = hi ? vidyas : vidyasEn;
  const rows = hi ? kalas : kalasEn;
  const [q, setQ] = useState("");
  const needle = fold(q);
  const shown = useMemo(
    () => (needle ? rows.filter((k) => fold(`${k.name} ${k.gloss ?? ""} ${k.key}`).includes(needle)) : rows),
    [rows, needle],
  );

  const [open, setOpen] = useState<IndexRow | null>(null);
  const close = useCallback(() => setOpen(null), []);

  // The card is a real link with a real href, and the drawer is layered over the ordinary click.
  // That keeps the things a link gives you and a button does not: the target URL on hover, the
  // right role for assistive tech, and open-in-new-tab. Modified clicks fall through untouched so
  // the last of those keeps working.
  //
  // It does not make the 78 entries crawlable from here, and nothing on this page does: reading the
  // tab out of the query string opts the whole subtree out of prerendering, so the static HTML for
  // /vidya-kala carries no cards at all. The entry pages themselves prerender in full, so the fix
  // is to list them in sitemap.ts — which belongs to another track, and is reported, not done here.
  const openFrom = (e: React.MouseEvent, row: IndexRow) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    setOpen(row);
  };

  const badge = (isHindi: boolean) => (isHindi ? <em data-e="vkonly">{c.vidyaKala.hindiOnly}</em> : null);

  return (
    <div data-page="VidyaKala" style={{ background: "#070B1E", color: "#F2EEE4", fontFamily: "'Noto Sans Devanagari',system-ui,sans-serif", minWidth: "320px", overflowX: "clip", isolation: "isolate" }}>
      <SiteHeader lang={lang} active="home" onToggleLang={toggleLang} signedIn={session.signedIn} hasCertificates={session.hasCertificates || session.attemptCount > 0} />

      <section style={{ position: "relative", overflow: "hidden" }}>
        <div aria-hidden="true" style={{ position: "absolute", left: "50%", top: "-26%", width: "820px", height: "820px", transform: "translateX(-50%)", borderRadius: "50%", background: "radial-gradient(circle,rgba(47,69,110,.4) 0%,rgba(47,69,110,0) 68%)" }}></div>
        <div data-e="pad" style={{ position: "relative", maxWidth: "1220px", margin: "0 auto", padding: "44px 30px 34px" }}>
          <Link href="/" data-e="vkback">{`← ${strings(lang).SiteHeader.NAV[0].label}`}</Link>
          <p data-e="vkkicker" style={{ margin: "26px 0 18px", fontFamily: serif, fontSize: "17px", color: "#C79A46", lineHeight: "1.9" }}>{s.sylKicker}</p>
          <h1 style={{ margin: "0 0 20px", maxWidth: "24ch", fontFamily: serif, fontWeight: 600, fontSize: "clamp(32px,5vw,58px)", lineHeight: "1.2", color: "#FFF9EC", textWrap: "balance" }}>{c.vidyaKala.countLine}</h1>
          <p style={{ margin: 0, maxWidth: "62ch", fontSize: "17.5px", lineHeight: "1.95", color: "#B9C0D2" }}>{s.sylLede}</p>
        </div>
      </section>

      <div data-e="pad" style={{ position: "relative", maxWidth: "1220px", margin: "0 auto", padding: "22px 30px 0" }}>
        <div data-e="vkcontrols">
          <div data-e="vktabs" role="tablist">
            <Link role="tab" aria-selected={view === "vidya"} data-e="vktab" href="/vidya-kala?view=vidya" scroll={false}>{s.tabVidyas}</Link>
            <Link role="tab" aria-selected={view === "kala"} data-e="vktab" href="/vidya-kala?view=kala" scroll={false}>{s.tabKalas}</Link>
          </div>

          {/* Only over the 64. The 14 arrive already sorted into three named groups on one screen —
              a filter there hides the structure that is the point of that tab. */}
          {view === "kala" ? (
            <div data-e="vksearch">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#8790A6" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="6.5"></circle><path d="m16 16 4.5 4.5"></path></svg>
              <input data-e="vksearchinput" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={c.vidyaKala.searchLabel} aria-label={c.vidyaKala.searchLabel} lang={hi ? "hi" : "en"} autoComplete="off" />
            </div>
          ) : null}
        </div>
      </div>

      {view === "vidya" ? (
        <section data-e="pad section" style={{ position: "relative", maxWidth: "1220px", margin: "0 auto", padding: "18px 30px 90px" }}>
          {groups.map((g, gi) => (
            <div key={g.label} data-e="vkband" data-vkg={gi}>
              <div data-e="vkbandhead">
                <div>
                  <h2 data-e="vkglabel">{g.label}</h2>
                  <p data-e="vkgmembers">{g.rows.map((v) => v.name).join(" · ")}</p>
                </div>
                <span data-e="vkghost" aria-hidden="true">{String(g.rows.length).padStart(2, "0")}</span>
              </div>
              <div data-e="vkbandgrid" data-vkg={gi}>
                {g.rows.map((v) => (
                  <Link key={v.key} href={`/vidya-kala/${v.key}`} data-e="vkvcard" aria-haspopup="dialog" onClick={(e) => openFrom(e, v)}>
                    <span data-e="vknum">{String(v.n).padStart(2, "0")}</span>
                    <span data-e="vkcardname">{v.name}</span>
                    {/* A gloss identical to the group label is the label repeated, not a gloss. */}
                    {v.gloss && v.gloss !== g.label ? (
                      <span data-e="vkcardgloss" lang={v.glossIsHindi ? "hi" : undefined}>{v.gloss}{badge(v.glossIsHindi)}</span>
                    ) : null}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </section>
      ) : (
        <section data-e="pad section" style={{ position: "relative", maxWidth: "1220px", margin: "0 auto", padding: "28px 30px 90px" }}>
          <div data-e="vkmeta" style={{ marginBottom: "16px" }}>
            <span data-e="vkmetacount">{needle ? `${shown.length} / ${rows.length}` : s.tabKalas}</span>
          </div>
          <div data-e="vkgrid">
            {shown.map((k) => (
              <Link key={k.key} href={`/vidya-kala/${k.key}`} data-e="vkkcard" aria-haspopup="dialog" onClick={(e) => openFrom(e, k)}>
                <span data-e="vkcardghost" aria-hidden="true">{String(k.n).padStart(2, "0")}</span>
                <span data-e="vknum">{String(k.n).padStart(2, "0")}</span>
                <span data-e="vkcardname">{k.name}</span>
                {k.gloss ? (
                  <span data-e="vkcardgloss" lang={k.glossIsHindi ? "hi" : undefined}>{k.gloss}{badge(k.glossIsHindi)}</span>
                ) : null}
              </Link>
            ))}
          </div>
          {/* The query itself and the two counts. Nothing is written for this state that the reader
              did not type or that the list does not already say. */}
          {!shown.length ? <p data-e="vkempty">{q} · 0 / {rows.length}</p> : null}
        </section>
      )}

      <SiteFooter lang={lang} />

      {open ? (
        <VidyaKalaDrawer
          row={open}
          sectionLabel={view === "vidya" ? s.tabVidyas : s.tabKalas}
          closeLabel={strings(lang).SiteHeader.T.close}
          ctaLabel={c.vidyaKala.browseAll}
          hindiOnlyLabel={c.vidyaKala.hindiOnly}
          markHindi={!hi}
          onClose={close}
        />
      ) : null}
    </div>
  );
}
