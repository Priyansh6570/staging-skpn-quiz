"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * The reveal and parallax behaviour from design/assets/site.js, rebuilt.
 *
 * Differences from the original, all of them deliberate:
 *  - IntersectionObserver instead of a scroll listener plus a 250ms setInterval that polled the DOM
 *    forty times after every navigation.
 *  - Elements already on screen are never hidden, so nothing flashes in and back out. The original
 *    set opacity:0 from JS after the element had already painted.
 *  - With JavaScript off nothing is ever hidden, so the page degrades to fully visible.
 */
const REVEAL_TRANSITION =
  "opacity .72s cubic-bezier(.22,.61,.36,1), transform .72s cubic-bezier(.22,.61,.36,1)";

export default function MotionShell() {
  const pathname = usePathname();

  // The attempt screen is a no-motion zone: nothing fades or drifts while a paper is being sat.
  const inAttempt = pathname.startsWith("/quiz/attempt");

  useEffect(() => {
    if (inAttempt) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const show = (el: HTMLElement) => {
      el.style.opacity = "1";
      el.style.transform = "none";
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          show(entry.target as HTMLElement);
          observer.unobserve(entry.target);
        }
      },
      // The original revealed once the element's top passed 94% of the viewport height.
      { rootMargin: "0px 0px -6% 0px", threshold: 0 },
    );

    const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-rv])"));
    for (const el of targets) {
      el.setAttribute("data-rv", "1");
      const box = el.getBoundingClientRect();
      const onScreen = box.top < window.innerHeight * 0.94 && box.bottom > -40;
      if (onScreen) {
        show(el);
        continue;
      }
      el.style.opacity = "0";
      el.style.transform = "translateY(22px)";
      el.style.transition = REVEAL_TRANSITION;
      observer.observe(el);
    }

    return () => observer.disconnect();
  }, [pathname, inAttempt]);

  // Parallax genuinely needs the scroll offset, so it keeps a rAF-throttled listener — but an
  // observer gates it, so it does no work at all once the hero has left the viewport.
  useEffect(() => {
    if (inAttempt) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const target = document.querySelector<HTMLElement>("[data-parallax]");
    if (!target) return;

    let onScreen = true;
    let queued = false;
    const apply = () => {
      if (queued || !onScreen) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        const y = window.scrollY || 0;
        if (y < 1400) target.style.transform = `translateX(-50%) translate3d(0,${(y * 0.06).toFixed(1)}px,0)`;
      });
    };

    const gate = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) apply();
    });
    gate.observe(target);

    window.addEventListener("scroll", apply, { passive: true });
    window.addEventListener("resize", apply, { passive: true });
    apply();

    return () => {
      gate.disconnect();
      window.removeEventListener("scroll", apply);
      window.removeEventListener("resize", apply);
    };
  }, [pathname, inAttempt]);

  return null;
}
