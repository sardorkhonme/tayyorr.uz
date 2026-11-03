"use client";

import { useEffect, useRef, useState } from "react";

import { EyeIcon } from "@/components/icons";

const KEY = "tyr_balance_hidden";
const DURATION = 900;

function readHidden(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Balans — 0 dan mo'ljalgacha ko'payish animatsiyasi + yashirish (ko'z) tugmasi.
 */
export function BalanceAmount({
  value,
  className = "",
  suffix = " söm",
}: {
  value: number;
  className?: string;
  suffix?: string;
}) {
  const [hidden, setHidden] = useState(false);
  const [ready, setReady] = useState(false);
  const [n, setN] = useState(0);
  const [runId, setRunId] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    setHidden(readHidden());
    setReady(true);
  }, []);

  // ko'payish animatsiyasi (ko'rinadigan holatda, har "runId" da qaytadan)
  useEffect(() => {
    if (!ready || hidden) return;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      const eased = 1 - Math.pow(1 - t, 3);
      setN(Math.round(value * eased));
      if (t < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [value, ready, hidden, runId]);

  function toggle() {
    setHidden((h) => {
      const next = !h;
      try {
        localStorage.setItem(KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      if (!next) {
        setN(0);
        setRunId((x) => x + 1); // qayta ko'rsatilganda 0 dan sanaydi
      }
      return next;
    });
  }

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="tabular-nums">
        {hidden ? "•••••" : `${n.toLocaleString("ru-RU")}${suffix}`}
      </span>
      <button
        type="button"
        onClick={toggle}
        aria-label={hidden ? "Balansni körsatiş" : "Balansni yaşiriş"}
        className="shrink-0 text-zinc-500 transition hover:text-white"
      >
        <EyeIcon off={hidden} />
      </button>
    </span>
  );
}
