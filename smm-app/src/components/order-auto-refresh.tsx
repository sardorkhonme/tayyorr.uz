"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Faol buyurtma sahifasini har 30 soniyada yangilaydi (yorliq ko'rinib turganda). */
export function OrderAutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
