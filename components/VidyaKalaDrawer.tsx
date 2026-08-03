"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { IndexRow } from "@/lib/vidyakala";

type Props = {
  row: IndexRow;
  /** The list the entry belongs to, reused from the tab labels. */
  sectionLabel: string;
  closeLabel: string;
  ctaLabel: string;
  hindiOnlyLabel: string;
  /** True in English, where the preview is still the book's Hindi and must say so. */
  markHindi: boolean;
  onClose: () => void;
};

// The preview panel behind a card tap. It shows what the index cannot — the opening of the entry in
// the book's own words — and then gets out of the way with a link to the full text.
//
// Deliberately not in the URL. Making it a query parameter would give the Android back button a job,
// but it also turns every card tap on a static page into a router navigation and an RSC round trip;
// on the connections this competition runs over, sixty-four of those to browse a list is not a
// trade worth making. Escape, the scrim and a 44px close button do the same work locally.
export default function VidyaKalaDrawer({ row, sectionLabel, closeLabel, ctaLabel, hindiOnlyLabel, markHindi, onClose }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const closer = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const restore = document.activeElement as HTMLElement | null;
    closer.current?.focus();

    // The page keeps its scroll position underneath: the drawer is a layer over the list, and a
    // list that jumps to the top when it reopens has lost the reader's place.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      const focusable = panel.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !panel.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      restore?.focus?.();
    };
  }, [onClose]);

  return (
    <>
      <button type="button" data-e="vkscrim" aria-label={closeLabel} onClick={onClose}></button>

      <div ref={panel} data-e="vkdrawer" role="dialog" aria-modal="true" aria-labelledby="vk-drawer-name">
        <button ref={closer} type="button" data-e="vkdrawerclose" aria-label={closeLabel} onClick={onClose}>
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" focusable="false" style={{ display: "block" }}>
            <path d="M6 6l12 12M18 6 6 18"></path>
          </svg>
        </button>

        <p data-e="vkdeyebrow">{sectionLabel}</p>
        <span data-e="vkdnum" aria-hidden="true">{String(row.n).padStart(2, "0")}</span>
        <h2 id="vk-drawer-name" data-e="vkdname">{row.name}</h2>
        {row.gloss ? (
          <p data-e="vkdgloss" lang={row.glossIsHindi ? "hi" : undefined}>
            {row.gloss}
            {row.glossIsHindi ? <em data-e="vkonly">{hindiOnlyLabel}</em> : null}
          </p>
        ) : null}

        {/* No description, no panel furniture: the rule and the button below would frame an empty
            box. Name and gloss are the whole preview for those entries. */}
        {row.preview ? (
          <>
            <hr data-e="vkdrule" />
            <p data-e="vkdprose" lang="hi">
              {row.preview}
              {markHindi ? <em data-e="vkonly">{hindiOnlyLabel}</em> : null}
            </p>
          </>
        ) : null}

        <Link href={`/vidya-kala/${row.key}`} data-e="vkdcta">
          {ctaLabel}
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#241703" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={{ display: "block" }}><path d="M9.5 5.5 16 12l-6.5 6.5"></path></svg>
        </Link>
      </div>
    </>
  );
}
