"use client";

import { usePathname, useRouter } from "next/navigation";
import { useRef, useTransition } from "react";

/**
 * Loglar filtri — tugma bosmasdan avtomatik: tanlov o'zgarsa darhol, matn yozilsa 400 ms dan keyin
 * URL (?q=…&actor=…) yangilanadi va sahifa qayta o'qiladi. Sahifalash (before) har safar tozalanadi.
 */
export function LogsAutoForm({ className, children }: { className?: string; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const ref = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pending, start] = useTransition();

  function apply() {
    const form = ref.current;
    if (!form) return;
    const p = new URLSearchParams();
    for (const [k, v] of new FormData(form)) if (typeof v === "string" && v.trim()) p.set(k, v.trim());
    const qs = p.toString();
    start(() => router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false }));
  }

  return (
    <form
      ref={ref}
      className={`${className ?? ""} ${pending ? "opacity-70" : ""}`}
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
      onChange={(e) => {
        if (timer.current) clearTimeout(timer.current);
        // matn — yozib bo'lguncha kutamiz; tanlov — darhol
        if ((e.target as HTMLElement).tagName === "INPUT") timer.current = setTimeout(apply, 400);
        else apply();
      }}
    >
      {children}
    </form>
  );
}
