"use client";

import { useEffect, type RefObject } from "react";

/**
 * Popup / menyu / modalni yopadi:
 *  - tashqariga bosilganda (pointerdown, capture) — şu bosiş ortidagi elementga ötmaydi
 *  - Escape bosilganda
 * `keep` — ichига bosilса yopilmaydigan elementlar (menyu paneli, ochuvchi tugma).
 */
export function useDismiss(
  active: boolean,
  onClose: () => void,
  keep: Array<RefObject<HTMLElement | null>> = [],
) {
  useEffect(() => {
    if (!active) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    // popupni yopgan bosiş ortidagi tugmani bosib yubormasin — keyingi «click» yutiladi
    const swallow = (ev: Event) => {
      ev.preventDefault();
      ev.stopPropagation();
    };
    const onDown = (e: Event) => {
      const t = e.target as Node | null;
      if (t && keep.some((r) => r.current && r.current.contains(t))) return;
      onClose();
      document.addEventListener("click", swallow, { capture: true, once: true });
      window.setTimeout(() => document.removeEventListener("click", swallow, true), 600);
    };

    document.addEventListener("keydown", onKey);
    // ochuvchi bosishning o'zi darhol yopib yubormasin
    const id = window.setTimeout(() => {
      document.addEventListener("pointerdown", onDown, true);
    }, 0);

    return () => {
      window.clearTimeout(id);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, onClose]);
}
