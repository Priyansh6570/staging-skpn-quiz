"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Blocks the right-click menu, text selection, copy, cut and drag across the public site.
 *
 * Two carve-outs, both because the alternative is a broken product rather than a protected one:
 *  - form fields stay selectable, or a student cannot correct a mistyped mobile number;
 *  - /admin stays selectable, or an admin cannot copy the one-time export password, which is
 *    shown once and is not recoverable.
 *
 * This is a deterrent, not a control. Anyone with view-source, developer tools or JavaScript
 * disabled still has the markup — the page is delivered to the browser to be rendered.
 */
const CSS = `
  body {
    -webkit-user-select: none;
    -moz-user-select: none;
    user-select: none;
    -webkit-touch-callout: none;
  }
  input, textarea, select, [contenteditable="true"],
  .adm, .adm-login {
    -webkit-user-select: text;
    -moz-user-select: text;
    user-select: text;
    -webkit-touch-callout: default;
  }
`;

export default function ContentProtection() {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  useEffect(() => {
    if (isAdmin) return;

    const editable = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      return !!el?.closest?.("input, textarea, select, [contenteditable='true']");
    };

    const block = (e: Event) => {
      if (editable(e.target)) return;
      e.preventDefault();
    };

    // contextmenu covers the right-click menu and the long-press menu on Android.
    document.addEventListener("contextmenu", block);
    document.addEventListener("copy", block);
    document.addEventListener("cut", block);
    document.addEventListener("selectstart", block);
    document.addEventListener("dragstart", block);

    return () => {
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("copy", block);
      document.removeEventListener("cut", block);
      document.removeEventListener("selectstart", block);
      document.removeEventListener("dragstart", block);
    };
  }, [isAdmin]);

  if (isAdmin) return null;
  return <style>{CSS}</style>;
}
