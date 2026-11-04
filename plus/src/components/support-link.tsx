"use client";

import { OPEN_SUPPORT_EVENT } from "@/components/support-widget";

/**
 * "Supportga yozish" tugmasi: kompyuterda pastdagi support popupini ochadi,
 * telefon va planshetda — /support sahifasi (vidjet o'zi hal qiladi).
 */
export function SupportLink({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <a
      href="/support"
      className={className}
      onClick={(e) => {
        e.preventDefault();
        window.dispatchEvent(new Event(OPEN_SUPPORT_EVENT));
      }}
    >
      {children}
    </a>
  );
}
