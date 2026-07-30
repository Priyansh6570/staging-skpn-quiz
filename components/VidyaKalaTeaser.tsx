"use client";

import Link from "next/link";
import { custom, strings } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";

// The home page's stand-in for the collection. Three columns of names drift at different speeds and
// in opposite directions, which reads as breadth without a grid of 78 tiles and without any control
// to operate. Each column is its list twice over so the -50% keyframe loops seamlessly.
//
// The reduced-motion fallback is the columns standing still. That is deliberate rather than a
// degradation: the names are the content, the drift only says "there are many". The global
// reduced-motion rule sets animation:none, so nothing here has to opt out.
export default function VidyaKalaTeaser({ lang }: { lang: Lang }) {
  const s = strings(lang).Home_v5.S;
  const c = custom(lang);
  const hi = lang === "hi";
  const serif = "'Noto Serif Devanagari',serif";

  const vidyas = strings(lang).Home_v5.VIDYAS as unknown as string[][];
  const kalas = strings(lang).Home_v5.KALAS as unknown as string[][];
  const names = [...vidyas, ...kalas].map((t) => (hi ? t[0] : t[2]));

  // Deal into three columns so each holds a mix of vidyas and kalas rather than one contiguous run.
  const columns = [0, 1, 2].map((col) => names.filter((_, i) => i % 3 === col));

  return (
    <section style={{ position: "relative", overflow: "hidden", background: "#070B1E" }}>
      <div aria-hidden="true" style={{ position: "absolute", left: "50%", top: "-24%", width: "820px", height: "820px", transform: "translateX(-50%)", borderRadius: "50%", background: "radial-gradient(circle,rgba(47,69,110,.42) 0%,rgba(47,69,110,0) 68%)" }}></div>

      <div data-e="pad section" style={{ position: "relative", maxWidth: "1220px", margin: "0 auto", padding: "88px 30px 92px", display: "grid", gap: "48px", gridTemplateColumns: "minmax(0,1fr)" }}>
        <div data-reveal style={{ maxWidth: "60ch" }}>
          <p style={{ margin: "0 0 14px", fontFamily: serif, fontSize: "17px", letterSpacing: ".01em", color: "#7FB8AB", lineHeight: "1.9" }}>{s.sylKicker}</p>
          <h2 style={{ margin: "0 0 18px", fontFamily: serif, fontWeight: 600, fontSize: "clamp(30px,4.4vw,50px)", lineHeight: "1.22", color: "#FFF9EC", textWrap: "balance" }}>{c.vidyaKala.countLine}</h2>
          <p style={{ margin: "0 0 30px", fontSize: "17.5px", lineHeight: "1.95", color: "#E3DED2" }}>{s.sylLede}</p>
          <Link href="/vidya-kala" style={{ display: "inline-flex", alignItems: "center", gap: "10px", minHeight: "54px", padding: "15px 32px", borderRadius: "999px", background: "#48887B", color: "#FFF9EC", textDecoration: "none", fontFamily: serif, fontSize: "18px", lineHeight: "1.5" }}>
            {c.vidyaKala.browseAll}
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#FFF9EC" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={{ display: "block" }}><path d="M9.5 5.5 16 12l-6.5 6.5"></path></svg>
          </Link>
        </div>

        {/* Decorative: the same names are all reachable from the button above, so this is hidden from AT. */}
        <div data-e="vkmarquee" aria-hidden="true">
          {columns.map((col, ci) => (
            <div key={ci} data-e="vkcol" data-vkc={ci}>
              {[...col, ...col].map((n, i) => (
                <span key={i} data-e="vkname" data-vkhi={i % 7 === ci ? "1" : "0"}>{n}</span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
