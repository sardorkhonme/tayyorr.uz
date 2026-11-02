"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Kompyuterda (≥1024px) bu sahifa kerak emas — bosh sahifaga qaytaradi. */
export function DesktopRedirect({ to = "/" }: { to?: string }) {
  const router = useRouter();
  useEffect(() => {
    if (window.matchMedia("(min-width: 1024px)").matches) router.replace(to);
  }, [router, to]);
  return null;
}
