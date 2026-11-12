"use client";

import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { writeThemeCookie } from "@/lib/theme";

type Mode = "light" | "dark";

function apply(mode: Mode) {
  document.documentElement.classList.toggle("light", mode === "light");
  // umumiy cookie (.tayyorr.uz) — tayyorr+ va Tayyorr SMM ham şu rejimda oçiladi
  writeThemeCookie(mode);
  fetch("/api/me/theme", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ theme: mode }),
  }).catch(() => {});
}

const OPTS: [Mode, IconName, string][] = [
  ["light", "sun", "Yoruğ"],
  ["dark", "moon", "Qoronği"],
];

/** Joriy rejim + doira bo'lib yoyiladigan almashtirish (ikkala tanlagich uchun umumiy). */
function useThemeMode() {
  const [mode, setMode] = useState<Mode>("dark");

  useEffect(() => {
    const read = () =>
      setMode(
        document.documentElement.classList.contains("light") ? "light" : "dark",
      );
    read();
    // boshqa tanlagich (sidebar / profil) yoki ThemeSync o'zgartirsa — sinxron
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);

  /**
   * Rejim almashishi — bosilgan tugmadan doira bo'lib yoyiladigan animatsiya
   * (View Transitions API). Brauzer qo'llamasa yoki "kamroq harakat" yoqilgan
   * bo'lsa — darhol almashadi.
   */
  function pick(m: Mode, e: React.MouseEvent<HTMLButtonElement>) {
    if (m === mode) return;
    setMode(m);
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => { ready: Promise<void> };
    };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!doc.startViewTransition || reduce) {
      apply(m);
      return;
    }
    const r = e.currentTarget.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const t = doc.startViewTransition(() => apply(m));
    t.ready
      .then(() => {
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 650, easing: "cubic-bezier(0.65, 0, 0.35, 1)", pseudoElement: "::view-transition-new(root)" },
        );
      })
      .catch(() => {});
  }

  return { mode, pick };
}

/** Yorug'/qorong'i rejim tanlagichi (menyu / sidebar uchun ixcham). */
export function ThemeToggle({
  className = "",
  bare = false,
}: {
  className?: string;
  bare?: boolean;
}) {
  const { mode, pick } = useThemeMode();

  return (
    <div
      className={`flex gap-1 ${
        bare ? "" : "rounded-xl border border-white/10 bg-white/5 p-1"
      } ${className}`}
    >
      {OPTS.map(([m, icon, label]) => (
        <button
          key={m}
          type="button"
          onClick={(e) => pick(m, e)}
          aria-pressed={mode === m}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs transition ${
            mode === m
              ? "bg-white/10 text-white"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <Icon name={icon} className="h-3.5 w-3.5" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * Profil uchun katta segmentli tanlagich: ikki katta tugma, orasida
 * siljiydigan "thumb" — har bir variantda kichik ko'rinish namunasi.
 */
export function ThemeSegmented() {
  const { mode, pick } = useThemeMode();
  return (
    <div
      role="radiogroup"
      aria-label="Mavzu"
      className="relative grid grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-white/5 p-1"
    >
      <span
        aria-hidden
        className="absolute bottom-1 top-1 w-[calc(50%-0.375rem)] rounded-xl bg-indigo-500 shadow-lg shadow-indigo-500/25 transition-transform duration-300 ease-out"
        style={{
          left: "0.25rem",
          transform: mode === "dark" ? "translateX(calc(100% + 0.25rem))" : "translateX(0)",
        }}
      />
      {OPTS.map(([m, icon, label]) => {
        const on = mode === m;
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={(e) => pick(m, e)}
            className="relative z-[1] flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors"
            style={{ color: on ? "#fff" : undefined }}
          >
            <Icon name={icon} className={`h-4 w-4 ${on ? "" : "text-zinc-400"}`} />
            <span className={on ? "" : "text-zinc-400"}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
