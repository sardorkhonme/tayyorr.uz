"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Yozish bilan (Enter'siz) qidiruv: har o'zgarishda ?q= ni yangilaydi,
 * server sahifa natijani darhol filtrlab qaytaradi.
 */
export function LiveSearch({ placeholder }: { placeholder: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function update(next: string) {
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const sp = new URLSearchParams(params.toString());
      if (next.trim()) sp.set("q", next.trim());
      else sp.delete("q");
      const qs = sp.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    }, 200);
  }

  return (
    <div className="relative w-full max-w-md">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
        🔍
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => update(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") update("");
        }}
        placeholder={placeholder}
        className="input"
        style={{ paddingLeft: "2.6rem", paddingRight: "2.6rem" }}
        autoComplete="off"
      />
      {pending && (
        <span className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-zinc-600 border-t-indigo-400" />
      )}
    </div>
  );
}
