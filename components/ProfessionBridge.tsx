"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useLang } from "@/components/AppProviders";
import { professionCopy } from "@/lib/i18n/professions";
import images from "@/professions.json";
import type { ProfessionCard } from "@/lib/vidyakala";

type Manifest = Record<string, { width: number; height: number; sources: { width: number; src: string }[] }>;
const IMAGES = images.images as Manifest;

/**
 * Where the Vidyas and Kalas meet the subjects a student is choosing between.
 *
 * **The framing is domain correspondence and nothing else.** Each illustration names a modern field
 * and lists the entries that belong to the same domain. Nothing here claims one produced the other,
 * and no copy that would imply it may be added — see lib/i18n/professions.ts.
 *
 * Each plate is a doorway rather than an ornament: opening one reveals the entries under it as real
 * links, each carrying its own gloss from the book, so the reward for choosing "चिकित्सा" is landing
 * on वृक्षायुर्वेद योग and reading what the book says. The picture is the invitation; the links are
 * the point, which is why the open card puts them directly beneath the image at full width rather
 * than in a panel elsewhere on the page.
 *
 * One card is open at a time. On a phone that is the whole layout — a stack of full-width plates,
 * the open one expanded in place — and on a wide screen the grid keeps its shape while the open
 * card spans it, so the links are never a cramped column beside a large picture.
 */
export default function ProfessionBridge({ cards, cardsEn }: { cards: ProfessionCard[]; cardsEn: ProfessionCard[] }) {
  const { lang } = useLang();
  const list = lang === "hi" ? cards : cardsEn;
  const copy = professionCopy[lang];
  const [open, setOpen] = useState<string | null>(null);
  const panelId = useId();

  return (
    <section data-e="profsection" aria-labelledby={`${panelId}-title`}>
      <div data-e="pad">
        <h2 data-e="proftitle" id={`${panelId}-title`}>{copy.title}</h2>
        <p data-e="proflede">{copy.subtitle}</p>

        <ul data-e="profgrid">
          {list.map((card) => {
            const img = IMAGES[card.key];
            const isOpen = open === card.key;
            return (
              <li key={card.key} data-e="profcell" data-open={isOpen ? "true" : "false"}>
                <button
                  type="button"
                  data-e="profcard"
                  aria-expanded={isOpen}
                  aria-controls={`${panelId}-${card.key}`}
                  onClick={() => setOpen(isOpen ? null : card.key)}
                >
                  <img
                    data-e="profimg"
                    src={img.sources.at(-1)?.src}
                    srcSet={img.sources.map((s) => `${s.src} ${s.width}w`).join(", ")}
                    sizes="(max-width: 720px) 100vw, (max-width: 1100px) 50vw, 33vw"
                    width={img.width}
                    height={img.height}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                  <span data-e="profcap">
                    <span data-e="proflabel">{card.label}</span>
                    <span data-e="profcount" aria-hidden="true">{String(card.entries.length).padStart(2, "0")}</span>
                  </span>
                </button>

                <div data-e="profpanel" id={`${panelId}-${card.key}`} hidden={!isOpen}>
                  <ul data-e="proflinks">
                    {card.entries.map((e) => (
                      <li key={e.key}>
                        <Link href={`/vidya-kala/${e.key}`} data-e="proflink">
                          <span data-e="profnum" aria-hidden="true">{String(e.n).padStart(2, "0")}</span>
                          <span data-e="profname">{e.name}</span>
                          {e.gloss ? <span data-e="profgloss" lang={e.glossIsHindi ? "hi" : undefined}>{e.gloss}</span> : null}
                          <span data-e="profgo" aria-hidden="true">→</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
