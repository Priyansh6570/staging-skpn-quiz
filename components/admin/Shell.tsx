"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const I = (d: string) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

const NAV = [
  {
    label: "Overview",
    items: [{ href: "/admin", title: "Dashboard", icon: "M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-4H4zM14 8h6V4h-6z" }],
  },
  {
    label: "Participation",
    items: [
      { href: "/admin/participants", title: "Participants", icon: "M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20M9.5 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M21 20v-1.5a4 4 0 0 0-3-3.9M16 3.6a4 4 0 0 1 0 7.4" },
      { href: "/admin/districts", title: "Districts", icon: "M9 20l-6-3V4l6 3m0 13l6-3m-6 3V7m6 10l6 3V7l-6-3m0 13V4" },
    ],
  },
  {
    label: "Assurance",
    items: [
      { href: "/admin/integrity", title: "Integrity", icon: "M12 3l7.5 3v5.6c0 4.4-3 8.4-7.5 9.4-4.5-1-7.5-5-7.5-9.4V6z" },
      { href: "/admin/operations", title: "Operations", icon: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H1a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 2.6 7" },
    ],
  },
  {
    label: "Reporting",
    items: [
      { href: "/admin/traffic", title: "Traffic", icon: "M3 17l5.5-6 4 4L21 6" },
      { href: "/admin/exports", title: "Exports", icon: "M12 3v12m0 0l-4-4m4 4l4-4M4 19h16" },
    ],
  },
];

export default function Shell({
  displayName, role, children,
}: {
  displayName: string;
  role: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const signOut = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <div className="adm">
      <aside className="adm-side">
        <div className="adm-mark">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/uploads/skpn-logo.png" alt="" />
          <span><b>SKPN</b><span>Administration</span></span>
        </div>

        <nav>
          {NAV.map((group) => (
            <div className="adm-group" key={group.label}>
              <p className="adm-group-label">{group.label}</p>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={pathname === item.href ? "page" : undefined}
                >
                  {I(item.icon)}
                  {item.title}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="adm-who">
          <b>{displayName}</b>
          <span>{role}</span>
          <button type="button" className="adm-signout" onClick={signOut}>Sign out</button>
        </div>
      </aside>

      <main className="adm-main">{children}</main>
    </div>
  );
}
