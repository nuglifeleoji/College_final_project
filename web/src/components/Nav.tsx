"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getCurrentUser, subscribeUsers, type UserProfile } from "@/lib/users";

const links = [
  { href: "/", label: "Home" },
  { href: "/characters", label: "Characters" },
  { href: "/world", label: "World Book" },
  { href: "/decisions", label: "Stories" },
  { href: "/account", label: "Account" },
];

export default function Nav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const refresh = () => setUser(getCurrentUser());
    refresh();
    return subscribeUsers(refresh);
  }, []);

  if (pathname === "/begin") return null;

  return (
    <header
      className={`sticky top-0 z-30 transition-all duration-300 ${
        scrolled
          ? "backdrop-blur-md bg-void/70 border-b border-line"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-10 h-16 flex items-center justify-between">
        <Link href="/" className="group flex items-center gap-3">
          <div className="relative w-7 h-7">
            <span className="absolute inset-0 rounded-full border border-eto/70" />
            <span
              className="absolute inset-0 rounded-full border border-amber/60 orbit-spin"
              style={{ transform: "rotate(0deg) scale(0.62)" }}
            />
            <span
              className="absolute inset-0 rounded-full border border-trisolaran/50 orbit-spin-rev"
              style={{ transform: "rotate(0deg) scale(0.32)" }}
            />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-eto-glow shadow-[0_0_10px_rgba(255,45,79,0.9)]" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display text-[15px] tracking-[0.18em] uppercase text-parchment">
              Three-Body
            </span>
            <span className="font-mono text-[10px] tracking-[0.32em] uppercase text-mute">
              Interactive · Book I
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1 font-mono text-[11px] tracking-[0.22em] uppercase">
          {links.map((l) => {
            const active =
              l.href === "/"
                ? pathname === "/"
                : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-2 rounded transition-colors ${
                  active
                    ? "text-parchment bg-panel border border-line"
                    : "text-mute-2 hover:text-parchment"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/account"
          className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 border border-eto/70 text-eto-glow hover:bg-eto/10 hover:border-eto-glow font-mono text-[11px] tracking-[0.24em] uppercase transition-all"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-eto-glow shadow-[0_0_8px_rgba(255,45,79,0.9)]" />
          <span className="hidden sm:inline max-w-[12rem] truncate">
            {user?.name ?? "Account"}
          </span>
          <span className="sm:hidden">{user?.glyph ?? "你"}</span>
        </Link>
      </div>
      <div className="hairline" />
    </header>
  );
}
