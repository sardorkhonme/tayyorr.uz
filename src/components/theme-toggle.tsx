"use client";

import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/icons";

type Mode = "light" | "dark";

function apply(mode: Mode) {
  document.documentElement.classList.toggle("light", mode === "light");
  document.cookie = `tyr_theme=${mode}; path=/; max-age=31536000; samesite=lax`;
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

/** Yorug'/qorong'i rejim tanlagichi. */
export function ThemeToggle({
  className = "",
  bare = false,
}: {
  className?: string;
  bare?: boolean;
}) {
  const [mode, setMode] = useState<Mode>("dark");

  useEffect(() => {
    setMode(
      document.documentElement.classList.contains("light") ? "light" : "dark",
    );
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
          className={`backdrop-blur-sm flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs transition ${
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
