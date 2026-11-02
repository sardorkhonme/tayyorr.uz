"use client";

import { useEffect } from "react";

/** .glow-card ichida sichqoncha joyini --mx/--my ga yozadi (rangli yorug'lik ortidan yuradi). */
export function GlowPointer() {
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.(".glow-card") as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);
  return null;
}
