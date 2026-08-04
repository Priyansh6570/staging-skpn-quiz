import Link from "next/link";
import { strings, type Lang } from "@/lib/i18n";

type Props = {
  lang: Lang;
  signedIn?: boolean;
  // The design read a count from localStorage.skpn_attempts. localStorage is gone and the count is
  // no longer in the session body: a certificate exists for every paper sat, so this is the same
  // third state ("done") expressed as the boolean the session actually carries.
  hasSat?: boolean;
};

export default function CtaBox({ lang, signedIn = false, hasSat = false }: Props) {
  const t = strings(lang).CtaBox.T;
  const key = !signedIn ? "out" : hasSat ? "done" : "pending";
  const href = !signedIn ? "/register" : hasSat ? "/certificates" : "/quiz";
  const [heading, sub, action] = t[key];

  return (
<section data-e="ctapad" style={{ maxWidth: "1220px", margin: "0 auto", padding: "0 30px 88px", fontFamily: "'Noto Sans Devanagari',system-ui,sans-serif" }}>
  <div style={{ position: "relative", overflow: "hidden", borderRadius: "28px", minHeight: "340px", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
    <img src="/assets/cosmic-light.png" alt="" width="924" height="540" loading="lazy" decoding="async" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 46%" }} />
    <div style={{ position: "absolute", inset: "0", background: "radial-gradient(64% 56% at 50% 44%, rgba(7,11,30,.6) 0%, rgba(7,11,30,.9) 62%, rgba(5,8,22,.97) 100%)" }}></div>
    <div aria-hidden="true" style={{ position: "absolute", inset: "0", background: "radial-gradient(38% 30% at 50% 40%, rgba(232,193,115,.22) 0%, rgba(232,193,115,0) 72%)", animation: "cta-glow 9s ease-in-out infinite" }}></div>
    <div style={{ position: "relative", padding: "74px 30px", display: "flex", flexDirection: "column", alignItems: "center", gap: "22px" }}>
      <h2 style={{ margin: "0", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "clamp(27px,3.9vw,40px)", lineHeight: "1.3", color: "#FFF9EC", maxWidth: "26ch", textWrap: "balance" }}>{heading}</h2>
      <p style={{ margin: "0", maxWidth: "44ch", fontSize: "18px", lineHeight: "1.8", color: "#EDEAE0" }}>{sub}</p>
      <Link href={href} style={{ padding: "17px 38px", minHeight: "58px", display: "inline-flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(180deg,#F6E0AC 0%,#E8C173 100%)", color: "#1E1503", borderRadius: "999px", fontSize: "18.5px", fontWeight: "600", lineHeight: "1.5", textDecoration: "none", boxShadow: "0 14px 36px rgba(232,193,115,.24)", transition: "transform .2s ease" }}>{action}</Link>
    </div>
  </div>
</section>
  );
}
