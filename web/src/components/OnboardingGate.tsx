"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { hasCompletedReaderOnboarding } from "@/lib/users";

const GATED_PREFIXES = ["/begin", "/characters", "/play"];

function gated(pathname: string) {
  return GATED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export default function OnboardingGate() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!gated(pathname) || hasCompletedReaderOnboarding()) return;
    const next = `${pathname}${window.location.search}`;
    router.replace(`/account?next=${encodeURIComponent(next)}`);
  }, [pathname, router]);

  return null;
}
