"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import PageAura from "@/components/PageAura";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
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

  const badge = (isHindi: boolean) =>
    isHindi ? <em style={{ marginLeft: "8px", fontStyle: "normal", fontSize: "12px", letterSpacing: ".04em", textTransform: "uppercase", color: "#8A8474" }}>{c.vidyaKala.hindiOnly}</em> : null;

  return (
    <div data-page="VidyaKala" style={{ background: "#FBF7F0", color: "#161C2E", fontFamily: "'Noto Sans Devanagari',system-ui,sans-serif", minWidth: "320px", overflowX: "clip", isolation: "isolate" }}>
      <PageAura />
      <SiteHeader lang={lang} active="home" onToggleLang={toggleLang} signedIn={session.signedIn} hasCertificates={session.hasCertificates || session.attemptCount > 0} />

      <section style={{ position: "relative", overflow: "hidden", background: "#070B1E" }}>
        <div aria-hidden="true" style={{ position: "absolute", left: "50%", top: "-26%", width: "820px", height: "820px", transform: "translateX(-50%)", borderRadius: "50%", background: "radial-gradient(circle,rgba(47,69,110,.4) 0%,rgba(47,69,110,0) 68%)" }}></div>
        <div data-e="pad section" style={{ position: "relative", maxWidth: "1220px", margin: "0 auto", padding: "80px 30px 70px" }}>
          <p style={{ margin: "0 0 14px", fontFamily: serif, fontSize: "17px", letterSpacing: ".01em", color: "#7FB8AB", lineHeight: "1.9" }}>{s.sylKicker}</p>
          <h1 style={{ margin: "0 0 16px", maxWidth: "28ch", fontFamily: serif, fontWeight: 600, fontSize: "clamp(30px,4.4vw,52px)", lineHeight: "1.22", color: "#FFF9EC", textWrap: "balance" }}>{c.vidyaKala.countLine}</h1>
          <p style={{ margin: 0, maxWidth: "60ch", fontSize: "18px", lineHeight: "1.95", color: "#E3DED2" }}>{s.sylLede}</p>
        </div>
      </section>

      <div data-e="pad section" style={{ position: "relative", maxWidth: "1220px", margin: "0 auto", padding: "38px 30px 0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
        <div data-e="vktabs" role="tablist">
          <Link role="tab" aria-selected={view === "vidya"} data-e="vktab" href="/vidya-kala?view=vidya" scroll={false}>{s.tabVidyas}</Link>
          <Link role="tab" aria-selected={view === "kala"} data-e="vktab" href="/vidya-kala?view=kala" scroll={false}>{s.tabKalas}</Link>
        </div>
        {view === "kala" ? (
          <label style={{ display: "flex", alignItems: "center", gap: "12px", flex: "1 1 260px", maxWidth: "420px" }}>
            <span style={{ fontSize: "14px", lineHeight: "1.6", color: "#6B6558", whiteSpace: "nowrap" }}>{c.vidyaKala.searchLabel}</span>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} lang={hi ? "hi" : "en"} autoComplete="off"
              style={{ flex: "1 1 auto", minWidth: 0, minHeight: "46px", padding: "11px 15px", borderRadius: "12px", border: "1px solid rgba(47,69,110,.24)", background: "#FFFDF8", color: "#161C2E", fontFamily: "inherit", fontSize: "16.5px", lineHeight: "1.6" }} />
          </label>
        ) : null}
      </div>

      {view === "vidya" ? (
        <section data-e="pad section" style={{ position: "relative", maxWidth: "1220px", margin: "0 auto", padding: "26px 30px 90px" }}>
          {groups.map((g, gi) => (
            <div key={g.label} data-e="vkband" data-vkg={gi}>
              <div data-e="vkbandhead">
                <div>
                  <h2 data-e="vkglabel" style={{ margin: "0 0 8px", fontFamily: serif, fontWeight: 600, fontSize: "clamp(24px,3.2vw,36px)", lineHeight: "1.24" }}>{g.label}</h2>
                  <p style={{ margin: 0, fontSize: "15.5px", lineHeight: "1.8", color: "#6B6558" }}>{g.rows.map((v) => v.name).join(" · ")}</p>
                </div>
                <span data-e="vkghost" aria-hidden="true">{String(g.rows.length).padStart(2, "0")}</span>
              </div>
              <div data-e="vkbandgrid" data-vkg={gi}>
                {g.rows.map((v) => (
                  <Link key={v.key} href={`/vidya-kala/${v.key}`} data-e="vkvcard">
                    <span style={{ display: "block", fontFamily: serif, fontWeight: 600, fontSize: "23px", lineHeight: "1.35", color: "#14203E" }}>{v.name}</span>
                    {v.gloss && v.gloss !== g.label ? (
                      <span lang={v.glossIsHindi ? "hi" : undefined} style={{ display: "block", marginTop: "7px", fontSize: "16px", lineHeight: "1.8", color: "#5A5446" }}>{v.gloss}{badge(v.glossIsHindi)}</span>
                    ) : null}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </section>
      ) : (
        <section data-e="pad section" style={{ position: "relative", maxWidth: "1220px", margin: "0 auto", padding: "26px 30px 90px" }}>
          <div data-e="vkgrid">
            {shown.map((k, i) => (
              <Link key={k.key} href={`/vidya-kala/${k.key}`} data-e="vkkcard" style={{ animationDelay: `${Math.min(i, 24) * 14}ms` }}>
                <span data-e="vknum">{String(k.n).padStart(2, "0")}</span>
                <span style={{ display: "block", fontFamily: serif, fontWeight: 600, fontSize: "20px", lineHeight: "1.38", color: "#14203E" }}>{k.name}</span>
                {k.gloss ? (
                  <span lang={k.glossIsHindi ? "hi" : undefined} style={{ display: "block", marginTop: "6px", fontSize: "15px", lineHeight: "1.75", color: "#5A5446" }}>{k.gloss}{badge(k.glossIsHindi)}</span>
                ) : null}
              </Link>
            ))}
          </div>
          {!shown.length ? <p data-e="vkempty">{q} — 0 / {rows.length}</p> : null}
        </section>
      )}

      <SiteFooter lang={lang} />
    </div>
  );
}
