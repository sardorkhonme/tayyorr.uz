"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useRealtime } from "@/lib/use-realtime";

/**
 * Faol buyurtma sahifasini har 30 soniyada yangilaydi (yorliq ko'rinib turganda) — sahifa ochilganda
 * provayderdan holat so'raladi (provayder o'zi xabar bermaydi). Holat boshqa joyda yangilansa
 * (real-time "order" signali) — darhol.
 */
export function OrderAutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  useRealtime((e) => {
    if (e.name === "order") router.refresh();
  });
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
