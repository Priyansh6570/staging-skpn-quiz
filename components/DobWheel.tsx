"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const WHEEL_ITEM = 44;
export const WHEEL_VISIBLE = 7;

/** Distance from the centred row decides size, weight and ink. Three rows either side, then nothing. */
const rowStyle = (distance: number) => {
  const d = Math.abs(distance);
  if (d === 0) return { fontSize: "26px", fontWeight: "600", color: "#14203E", opacity: "1" };
  if (d === 1) return { fontSize: "20px", fontWeight: "400", color: "#161C2E", opacity: ".9" };
  if (d === 2) return { fontSize: "18px", fontWeight: "400", color: "#161C2E", opacity: ".6" };
  if (d === 3) return { fontSize: "16px", fontWeight: "400", color: "#161C2E", opacity: ".38" };
  return { fontSize: "16px", fontWeight: "400", color: "#161C2E", opacity: "0" };
};

interface Props {
  label: string;
  count: number;
  index: number;
  labelAt: (i: number) => string;
  onChange: (i: number) => void;
  tabular?: boolean;
}

/**
 * A real scroller rather than a list that swaps its labels in place.
 *
 * The momentum is the platform's: this is a native overflow-y column with scroll snapping, so a
 * flick on a handset gets the same inertia and rubber-banding as every other list on the device,
 * and a trackpad gets the same easing as every other page. Hand-rolled inertia was the alternative
 * and it never matches the feel of the OS it is imitating.
 */
export default function DobWheel({ label, count, index, labelAt, onChange, tabular }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const programmatic = useRef(false);
  const [centre, setCentre] = useState(index);
  const indexOnMount = useRef(index);

  const scrollToIndex = useCallback((i: number, smooth: boolean) => {
    const el = ref.current;
    if (!el) return;
    // The reduced-motion rule in globals.css kills CSS transitions but cannot reach a scroll
    // animation asked for from script, so this one has to check for itself.
    const animate = smooth && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    programmatic.current = true;
    el.scrollTo({ top: i * WHEEL_ITEM, behavior: animate ? "smooth" : "auto" });
    // Long enough for a smooth scroll to finish; anything arriving after this is the user again.
    setTimeout(() => { programmatic.current = false; }, animate ? 420 : 60);
  }, []);

  // Mount only. The parent remounts these on open with a key, which is what puts each column on its
  // current value without animating — and keeps that jump out of an effect that would otherwise have
  // to push state back into React on every open.
  useEffect(() => {
    scrollToIndex(indexOnMount.current, false);
  }, [scrollToIndex]);

  // Days shrink from 31 to 28 when the month changes underneath us, so a wheel sitting on the 31st
  // has to be pulled back into range rather than left pointing past the end of its own list.
  useEffect(() => {
    if (index > count - 1) return;
    const el = ref.current;
    if (!el) return;
    if (Math.round(el.scrollTop / WHEEL_ITEM) !== index) scrollToIndex(index, true);
  }, [index, count, scrollToIndex]);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;

    // Re-rendered only when the centred row actually changes, not on every pixel of a 114-row flick.
    const nearest = Math.max(0, Math.min(count - 1, Math.round(el.scrollTop / WHEEL_ITEM)));
    if (nearest !== centre) setCentre(nearest);

    if (programmatic.current) return;
    if (settle.current) clearTimeout(settle.current);
    // Snapping is the browser's job; this only reports the value once the column has come to rest,
    // so a flick past forty years does not fire forty changes on the way.
    settle.current = setTimeout(() => {
      const landed = Math.max(0, Math.min(count - 1, Math.round(el.scrollTop / WHEEL_ITEM)));
      if (landed !== index) onChange(landed);
    }, 90);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const delta = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = Math.max(0, Math.min(count - 1, index + delta));
    if (next === index) return;
    onChange(next);
    scrollToIndex(next, true);
  };

  const pad = ((WHEEL_VISIBLE - 1) / 2) * WHEEL_ITEM;

  return (
    <div
      ref={ref}
      role="listbox"
      tabIndex={0}
      aria-label={label}
      onScroll={onScroll}
      onKeyDown={onKeyDown}
      data-e="wheel"
      style={{ height: `${WHEEL_VISIBLE * WHEEL_ITEM}px`, overflowY: "scroll", overscrollBehavior: "contain", scrollSnapType: "y mandatory", position: "relative" }}
    >
      <div style={{ height: `${pad}px` }} aria-hidden="true" />
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          role="option"
          aria-selected={i === index}
          onClick={() => { onChange(i); scrollToIndex(i, true); }}
          style={{ height: `${WHEEL_ITEM}px`, scrollSnapAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", lineHeight: "1.2", transition: "font-size .18s ease, opacity .18s ease, color .18s ease", ...(tabular ? { fontVariantNumeric: "tabular-nums" } : {}), ...rowStyle(i - centre) }}
        >
          {labelAt(i)}
        </div>
      ))}
      <div style={{ height: `${pad}px` }} aria-hidden="true" />
    </div>
  );
}
