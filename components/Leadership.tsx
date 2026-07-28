"use client";

import { useState } from "react";
import { strings, type Lang } from "@/lib/i18n";

// LEADERS in the export carries the photograph path alongside the copy; only the copy survives
// extraction, so the paths sit here in the same order.
const LEADER_IMAGES = [
  "/uploads/dr%20mohan%20yadav.jpg",
  "/uploads/dhermend%20singh%20lodhi.jpg",
  "/uploads/shiv%20shekhar%20shukla.jpg",
  "/uploads/shriram%20tiwari.png",
];

// Positions 2 and 3 are swapped at the client's request: Dharmendra Singh Lodhi before
// Shiv Shekhar Shukla. The images above are reordered to match, so copy and photograph stay paired.
const ORDER = [0, 2, 1, 3];

/**
 * Copy and photograph paired in one place, because both layouts read it and putting a minister's
 * face beside the wrong name on a government site is not a bug you get to fix quietly.
 */
function members(lang: Lang) {
  const source = strings(lang).Leadership.LEADERS;
  return ORDER.map((sourceIndex, position) => ({
    role: source[sourceIndex][0],
    name: source[sourceIndex][1],
    office: source[sourceIndex][2],
    img: LEADER_IMAGES[position],
  }));
}

/** Home: one large portrait, thumbnails and a prev/next rail. */
export default function Leadership({ lang }: { lang: Lang }) {
  const [active, setActive] = useState(0);
  const source = strings(lang).Leadership;
  const list = members(lang);
  const n = list.length;

  const activeRole = list[active].role;
  const activeName = list[active].name;
  const activeOffice = list[active].office;
  const [prevLabel, nextLabel] = source.inline;
  const railPrev = () => setActive((a) => (a - 1 + n) % n);
  const railNext = () => setActive((a) => (a + 1) % n);

  const leaders = list.map((l, i) => ({
    img: l.img,
    name: l.name,
    isActive: i === active,
    select: () => setActive(i),
    op: i === active ? 1 : 0,
    imgTransform: i === active ? "scale(1)" : "scale(1.06)",
    thumbOp: i === active ? 1 : 0.62,
    thumbTransform: i === active ? "scale(1.08)" : "scale(1)",
    ring: i === active ? "#E8C173" : "transparent",
    shadow: i === active ? "0 8px 22px rgba(232,193,115,.42)" : "0 2px 8px rgba(20,32,62,.12)",
  }));
  return (
    <section data-e="leadpad" style={{ maxWidth: "1220px", margin: "0 auto", padding: "92px 30px 96px", fontFamily: "'Noto Sans Devanagari',system-ui,sans-serif" }}>
      <h2 style={{ margin: "0 0 40px", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "clamp(27px,3.6vw,42px)", lineHeight: "1.3", color: "#14203E" }}>{source.markup.text0}</h2>

      <div data-g="lead" style={{ display: "grid", gridTemplateColumns: "minmax(0,.78fr) minmax(0,1fr)", gap: "48px", alignItems: "center" }}>
        <div style={{ position: "relative", width: "100%", maxWidth: "390px", justifySelf: "center" }}>
          <span aria-hidden="true" style={{ position: "absolute", left: "-16px", top: "22px", bottom: "22px", width: "76px", borderRadius: "26px", background: "#F1E6D0" }}></span>
          <span aria-hidden="true" style={{ position: "absolute", right: "-14px", bottom: "-14px", width: "150px", height: "150px", borderRadius: "50%", background: "radial-gradient(circle,rgba(232,193,115,.5) 0%,rgba(232,193,115,0) 70%)" }}></span>
          <div style={{ position: "relative", borderRadius: "26px", overflow: "hidden", aspectRatio: "4/5", background: "linear-gradient(160deg,#182246 0%,#080C1E 100%)", boxShadow: "0 8px 18px rgba(20,32,62,.1),0 36px 70px rgba(20,32,62,.22)" }}>
            {leaders.map((l, lIndex) => (
              <img key={lIndex} src={l.img} alt={l.name} loading="lazy" decoding="async" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 12%", opacity: `${l.op}`, transform: `${l.imgTransform}`, transition: "opacity .5s ease,transform 1.1s cubic-bezier(.22,.61,.36,1)" }} />
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <h3 style={{ margin: "0", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "clamp(28px,3.6vw,40px)", lineHeight: "1.2", color: "#14203E", textWrap: "balance" }}>{activeName}</h3>
          <p style={{ margin: "0", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "clamp(20px,2.4vw,25px)", lineHeight: "1.45", color: "#14203E", maxWidth: "32ch" }}>{activeOffice}</p>
          <span style={{ alignSelf: "flex-start", marginTop: "4px", padding: "9px 20px", borderRadius: "999px", background: "#F4EBD8", border: "1px solid #E7D6B2", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "19px", lineHeight: "1.5", color: "#6B4A10" }}>{activeRole}</span>

          <div data-e="leadthumbs" style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap", marginTop: "16px" }}>
            <div style={{ display: "flex", gap: "10px" }}>
              {leaders.map((l, lIndex) => (
                <button key={lIndex} type="button" onClick={l.select} aria-label={l.name} aria-pressed={l.isActive} style={{ width: "62px", height: "62px", flex: "0 0 auto", padding: "0", borderRadius: "50%", overflow: "hidden", cursor: "pointer", border: `2px solid ${l.ring}`, background: "#F1E6D0", boxShadow: `${l.shadow}`, opacity: `${l.thumbOp}`, transform: `${l.thumbTransform}`, transition: "transform .3s cubic-bezier(.22,.61,.36,1),opacity .3s ease,border-color .3s ease,box-shadow .3s ease" }}>
                  <img src={l.img} alt="" loading="lazy" decoding="async" style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 12%" }} />
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: "10px", marginLeft: "auto" }}>
              <button type="button" onClick={railPrev} aria-label={prevLabel} style={{ width: "52px", height: "52px", border: "1px solid #DCD1BC", borderRadius: "50%", background: "#FFFFFF", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 18px rgba(20,32,62,.08)", transition: "background .18s ease" }}>
                <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="#14203E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={{ display: "block" }}><path d="M14.5 5.5 8 12l6.5 6.5"></path></svg>
              </button>
              <button type="button" onClick={railNext} aria-label={nextLabel} style={{ width: "52px", height: "52px", border: "1px solid #DCD1BC", borderRadius: "50%", background: "#FFFFFF", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 18px rgba(20,32,62,.08)", transition: "background .18s ease" }}>
                <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="#14203E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={{ display: "block" }}><path d="M9.5 5.5 16 12l-6.5 6.5"></path></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// One accent per office-holder, drawn from the palette the About page already uses on its objects
// list, so the board reads as part of that page rather than a transplant from Home.
const BOARD_ACCENTS = [
  { rule: "#E8C173", tint: "#FAF1DC", ink: "#7A5412" },
  { rule: "#27408B", tint: "#E7ECF8", ink: "#22366F" },
  { rule: "#8A6015", tint: "#F6EBD6", ink: "#6B4A10" },
  { rule: "#3F6B58", tint: "#E7F1EC", ink: "#2E5142" },
];

/**
 * About: all four at once, no carousel. Same copy, same photographs, same order — the difference is
 * that nothing is hidden behind a control, which is what a trustee list on an About page is for.
 * Four portrait cards above 980px; below that each card turns on its side into a photo-and-text row.
 */
export function LeadershipBoard({ lang }: { lang: Lang }) {
  const source = strings(lang).Leadership;
  const list = members(lang).map((m, i) => ({ ...m, ...BOARD_ACCENTS[i % BOARD_ACCENTS.length] }));

  return (
    <section data-e="leadpad section" style={{ maxWidth: "1220px", margin: "0 auto", padding: "80px 30px", fontFamily: "'Noto Sans Devanagari',system-ui,sans-serif" }}>
      <h2 data-reveal style={{ margin: "0 0 34px", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "clamp(24px,3.2vw,32px)", lineHeight: "1.35", color: "#14203E" }}>{source.markup.text0}</h2>

      <ul data-e="boardgrid" style={{ margin: "0", padding: "0", listStyle: "none", display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: "20px" }}>
        {list.map((m, mIndex) => (
          <li key={mIndex} data-reveal data-e="boardcard" style={{ position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", gap: "16px", padding: "18px 18px 26px", background: "linear-gradient(160deg,#FFFFFF 0%,#FDF7EA 100%)", borderRadius: "24px", border: "1px solid #EFE0C4", borderTop: `3px solid ${m.rule}`, boxShadow: "0 2px 4px rgba(20,32,62,.05),0 16px 36px rgba(20,32,62,.07)" }}>
            <span aria-hidden="true" style={{ position: "absolute", right: "-44px", top: "-44px", width: "168px", height: "168px", borderRadius: "50%", background: "radial-gradient(circle,rgba(232,193,115,.24) 0%,rgba(232,193,115,0) 70%)" }}></span>

            <div data-e="boardphoto" style={{ position: "relative", borderRadius: "18px", overflow: "hidden", aspectRatio: "4/5", background: "linear-gradient(160deg,#182246 0%,#080C1E 100%)", boxShadow: "0 8px 18px rgba(20,32,62,.12)" }}>
              <img src={m.img} alt={m.name} loading="lazy" decoding="async" style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 12%" }} />
              <span aria-hidden="true" style={{ position: "absolute", inset: "0", borderRadius: "18px", boxShadow: "inset 0 0 0 1px rgba(232,193,115,.34)" }}></span>
            </div>

            <div data-e="boardtext" style={{ position: "relative", minWidth: "0", display: "flex", flexDirection: "column", gap: "9px" }}>
              <span style={{ alignSelf: "flex-start", padding: "6px 14px", borderRadius: "999px", background: `${m.tint}`, border: `1px solid ${m.rule}`, color: `${m.ink}`, fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "14.5px", lineHeight: "1.6" }}>{m.role}</span>
              <h3 style={{ margin: "0", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "clamp(19px,1.7vw,23px)", lineHeight: "1.35", color: "#14203E", textWrap: "balance" }}>{m.name}</h3>
              <p style={{ margin: "0", fontSize: "15.5px", lineHeight: "1.7", color: "#161C2E", textWrap: "pretty" }}>{m.office}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
