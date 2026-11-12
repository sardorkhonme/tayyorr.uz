"use client";

import { useSyncExternalStore } from "react";

/** Tailwind `lg` (1024px) — kompyuter: chap sidebar, header va pastki panel yo'q. */
const DESKTOP_QUERY = "(min-width: 1024px)";

function subscribe(cb: () => void) {
  const mq = window.matchMedia(DESKTOP_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/**
 * Kompyuter ekranimi (lg va undan katta). Serverda va birinçi renderda — `false`
 * (ko'rinish CSS `lg:` klasslari bilan boshqariladi, bu faqat mantiq uchun).
 */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  );
}
