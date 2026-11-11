"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

/** Xabarlar faqat shu tugma bosilganda yangilanadi (real vaqt yo'q — yuk yo'q). */
export function FamilyRefresh() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button type="button" className="btn-ghost !px-3 !py-1.5 text-sm" disabled={pending} onClick={() => start(() => router.refresh())}>
      {pending ? "Yangilanmoqda..." : "↻ Yangilaş"}
    </button>
  );
}
