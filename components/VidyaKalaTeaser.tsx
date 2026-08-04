"use client";

import Link from "next/link";
import { custom, strings } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";

// The home page's stand-in for the collection: three rows of names moving in alternating directions,
// which reads as breadth without a grid of 78 tiles and without any control to operate.
//
// The rows carry the 64 kalas rather than all 78 entries. A row is a numbered strip, and the two
// lists number independently — a chip reading "01" would mean Rigveda in one row and Geet in the
// next. The 14 are stated by the count beside them and are one tap away through either button.
//
// The strip is decorative and marked aria-hidden: every name in it is reachable, in a list a screen
// reader can actually work through, from the buttons directly above. Chips are spans for the same
// reason a marquee should not hold links — a moving tap target is a trap on a phone.
//
// Under prefers-reduced-motion the rows simply stand still. That is the intended fallback rather
// than a degradation: the names are the content and the drift only says "there are many". The
// global reduced-motion rule sets animation:none, and both keyframes are written so the un-animated
// state is a full row of names, so nothing here has to opt out.
export default function VidyaKalaTeaser({ lang }: { lang: Lang }) {
  const s = strings(lang).Home_v5.S;
  const c = custom(lang);
  const hi = lang === "hi";
  const serif = "'Noto Serif Devanagari',serif";

  const nameOf = (t: string[]) => (hi ? t[0] : t[2]);
  const vidyas = strings(lang).Home_v5.VIDYAS as unknown as string[][];
  const kalas = strings(lang).Home_v5.KALAS as unknown as string[][];

  // The caption under each count is the range of that list, first name to last: the one thing about
  // the list that is true and is not already the numeral above it.
  const range = (list: string[][]) => `${nameOf(list[0])} · ${nameOf(list[list.length - 1])}`;

  // Dealt round-robin so consecutive numbers never sit in the same row, and each row is its own list
  // twice over so the -50% keyframe loops with no seam.
  const chips = kalas.map((t, i) => ({ n: i + 1, name: nameOf(t) }));
  const rows = [0, 1, 2].map((r) => chips.filter((_, i) => i % 3 === r));

  return (
    <section data-e="vkteaser">
      <div data-e="vkbackdrop" aria-hidden="true"></div>

      <div data-e="pad section" style={{ position: "relative", maxWidth: "1220px", margin: "0 auto", padding: "88px 30px 92px" }}>
        <div data-e="vkteaserwrap">
          <div data-e="vkteasercopy" data-reveal>
            <h2 style={{ margin: "0 0 18px", fontFamily: serif, fontWeight: 600, fontSize: "clamp(30px,4.4vw,50px)", lineHeight: "1.22", color: "#FFF9EC", textWrap: "balance" }}>{c.vidyaKala.countLine}</h2>
            <p style={{ margin: 0, fontSize: "17.5px", lineHeight: "1.95", color: "#D8D3C7" }}>{s.sylLede}</p>

            <div data-e="vkstats">
              <div data-e="vkstat" data-vks="vidya">
                <span data-e="vkstatnum">{vidyas.length}</span>
                <span data-e="vkstatlabel">{range(vidyas)}</span>
              </div>
              <div data-e="vkstat" data-vks="kala">
                <span data-e="vkstatnum">{kalas.length}</span>
                <span data-e="vkstatlabel">{range(kalas)}</span>
              </div>
            </div>

            <div data-e="vkctas">
              <Link href="/vidya-kala" data-e="vkcta" data-vkc="primary">
                <span data-e="vkctalabel">{c.vidyaKala.browseAll}</span>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#241703" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={{ display: "block" }}><path d="M9.5 5.5 16 12l-6.5 6.5"></path></svg>
              </Link>
              <Link href="/vidya-kala?view=kala" data-e="vkcta" data-vkc="ghost"><span data-e="vkctalabel">{s.tabKalas}</span></Link>
            </div>
          </div>

          <div data-e="vkrows" aria-hidden="true">
            {rows.map((row, r) => (
              <div key={r} data-e="vkrow">
                <div data-e="vktrack" data-vkr={r}>
                  {[...row, ...row].map((k, i) => (
                    <span key={i} data-e="vkchip">
                      <span data-e="vkchipn">{String(k.n).padStart(2, "0")}</span>
                      <span data-e="vkchipname">{k.name}</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
