import Link from "next/link";
import { strings, type Lang } from "@/lib/i18n";

// Order mirrors T.links in design/SiteFooter.dc.html; labels come from lib/i18n and the hrefs are
// the Next routes from AUDIT.md §1.1 — note Legal.dc.html and Legal.dc.html?doc=terms split into
// two real routes there.
const LINK_HREFS = ["/about", "/pratiyogita", "/rules", "/about#sampark", "/privacy", "/terms"];

export default function SiteFooter({ lang }: { lang: Lang }) {
  const s = strings(lang);
  const t = s.SiteFooter.T;
  const m = s.SiteFooter.markup;
  const links = t.links.map((l, i) => ({ label: l.label, href: LINK_HREFS[i] }));

  return (
<footer style={{ position: "relative", overflow: "hidden", background: "linear-gradient(180deg,#0B1226 0%,#070B1E 100%)", fontFamily: "'Noto Sans Devanagari',system-ui,sans-serif" }}>
  <div aria-hidden="true" style={{ position: "absolute", left: "0", right: "0", top: "0", height: "1px", background: "linear-gradient(90deg,rgba(232,193,115,0),rgba(232,193,115,.55),rgba(232,193,115,0))" }}></div>
  <div aria-hidden="true" style={{ position: "absolute", right: "-6%", top: "-40%", width: "420px", height: "420px", borderRadius: "50%", background: "radial-gradient(circle,rgba(232,193,115,.12) 0%,rgba(232,193,115,0) 70%)" }}></div>
  <div data-g="foot" data-e="pad" style={{ position: "relative", maxWidth: "1220px", margin: "0 auto", padding: "56px 30px 30px", display: "grid", gridTemplateColumns: "minmax(0,1.35fr) minmax(0,1fr) minmax(0,.9fr)", gap: "40px" }}>
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
        <span style={{ width: "52px", height: "52px", flex: "0 0 auto", borderRadius: "50%", background: "#04060F", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 1px rgba(232,193,115,.34)" }}>
          <img src="/uploads/skpn-logo.png" alt="" width="40" height="40" loading="lazy" style={{ display: "block", width: "40px", height: "40px" }} />
        </span>
        <img src="/uploads/images.jpg" alt={m.alt0} width="44" height="44" loading="lazy" style={{ display: "block", width: "44px", height: "44px", borderRadius: "50%" }} />
      </div>
      <p style={{ margin: "0 0 6px", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "19px", lineHeight: "1.5", color: "#FFF9EC" }}>{t.org}</p>
      <p style={{ margin: "0 0 14px", fontSize: "15.5px", lineHeight: "1.7", color: "#E4DFD2" }}>{t.dept}</p>
      <p style={{ margin: "0 0 10px", fontSize: "15.5px", lineHeight: "1.7", color: "#E4DFD2", maxWidth: "34ch" }}>{t.address}</p>
      <a href={`mailto:${m.text0}`} style={{ display: "block", fontSize: "16px", lineHeight: "1.7", color: "#E8C173", textDecoration: "none" }}>{m.text0}</a>
      <a href="tel:+917554535064" style={{ display: "block", marginTop: "4px", fontSize: "16px", lineHeight: "1.7", color: "#E8C173", textDecoration: "none" }}>{m.text1}</a>
    </div>
    <div>
      <p style={{ margin: "0 0 15px", fontFamily: "'Noto Serif Devanagari',serif", fontSize: "15.5px", letterSpacing: ".01em", color: "rgba(232,193,115,.72)", lineHeight: "1.8" }}>{t.linksTitle}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: "11px 20px" }}>
        {links.map((l) => (
          <Link key={l.href} href={l.href} style={{ fontSize: "16px", lineHeight: "1.7", color: "#E9E4D8", textDecoration: "none" }}>{l.label}</Link>
        ))}
      </div>
    </div>
    <div>
      <p style={{ margin: "0 0 15px", fontFamily: "'Noto Serif Devanagari',serif", fontSize: "15.5px", letterSpacing: ".01em", color: "rgba(232,193,115,.72)", lineHeight: "1.8" }}>{t.followTitle}</p>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <a href="https://www.instagram.com/" target="_blank" rel="noopener" aria-label={m.ariaLabel0} style={{ width: "44px", height: "44px", borderRadius: "13px", border: "1px solid rgba(232,193,115,.3)", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#F1DFB6" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true" style={{ display: "block" }}><rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5"></rect><circle cx="12" cy="12" r="4.1"></circle><circle cx="17.1" cy="6.9" r="1.1" fill="#F1DFB6" stroke="none"></circle></svg>
        </a>
        <a href="https://www.facebook.com/" target="_blank" rel="noopener" aria-label={m.ariaLabel1} style={{ width: "44px", height: "44px", borderRadius: "13px", border: "1px solid rgba(232,193,115,.3)", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" style={{ display: "block" }}><path d="M13.6 21v-7.7h2.7l.4-3.1h-3.1V8.2c0-.9.3-1.5 1.6-1.5h1.6V3.9c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1v2.3H7.6v3.1h2.8V21z" fill="#F1DFB6"></path></svg>
        </a>
        <a href="https://twitter.com/" target="_blank" rel="noopener" aria-label={m.ariaLabel2} style={{ width: "44px", height: "44px", borderRadius: "13px", border: "1px solid rgba(232,193,115,.3)", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" style={{ display: "block" }}><path d="M3.3 3h4.4l4 5.6L16.6 3H21l-6.2 7.4L21.4 21h-4.4l-4.3-6-4.9 6H3.4l6.6-7.9z" fill="#F1DFB6"></path></svg>
        </a>
        <a href="https://www.youtube.com/" target="_blank" rel="noopener" aria-label={m.ariaLabel3} style={{ width: "44px", height: "44px", borderRadius: "13px", border: "1px solid rgba(232,193,115,.3)", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" style={{ display: "block" }}><path d="M21.3 8.2a2.6 2.6 0 00-1.8-1.8C17.8 6 12 6 12 6s-5.8 0-7.5.4A2.6 2.6 0 002.7 8.2C2.3 9.9 2.3 12 2.3 12s0 2.1.4 3.8a2.6 2.6 0 001.8 1.8C6.2 18 12 18 12 18s5.8 0 7.5-.4a2.6 2.6 0 001.8-1.8c.4-1.7.4-3.8.4-3.8s0-2.1-.4-3.8zM10.2 15V9l5.2 3z" fill="#F1DFB6"></path></svg>
        </a>
      </div>
    </div>
  </div>
  <div data-e="pad" style={{ position: "relative", maxWidth: "1220px", margin: "0 auto", padding: "0 30px 34px" }}>
    <p style={{ margin: "0", paddingTop: "22px", borderTop: "1px solid rgba(255,249,236,.1)", fontSize: "14.5px", lineHeight: "1.7", color: "#D8D2C4" }}>{t.copyright}</p>
  </div>
</footer>
  );
}
