"use client";

import { useEffect, useState } from "react";

import { Icon } from "@/components/icons";
import { Mascot, type MascotPose } from "@/components/mascot";

/** Eng kamida şunça turadi (foydalanuvçi öqib ulgursin). */
const MIN_MS = 3500;

/**
 * Qisqa bildirişnoma (masalan hamyon töldirilgandan keyin): tepada suzib turadi, maskot bilan,
 * pastida vaqt çizig'i qisqaradi; [ms] dan keyin (kamida 3.5 s) silliq yöqoladi yoki X bilan yopiladi.
 * [clearParam] — manzildagi belgi (masalan `?topup=1`) olib taşlanadi: sahifa yangilansa qayta çiqmaydi.
 */
export function FlashNotice({
  title,
  message,
  pose = "success",
  ms = 6500,
  clearParam,
}: {
  title: string;
  message?: string;
  pose?: MascotPose;
  ms?: number;
  clearParam?: string;
}) {
  const life = Math.max(MIN_MS, ms);
  const [state, setState] = useState<"in" | "out" | "gone">("in");

  useEffect(() => {
    if (clearParam) {
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.has(clearParam)) {
          url.searchParams.delete(clearParam);
          window.history.replaceState(window.history.state, "", url.toString());
        }
      } catch {}
    }
    const t1 = setTimeout(() => setState("out"), life);
    const t2 = setTimeout(() => setState("gone"), life + 350);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [life, clearParam]);

  if (state === "gone") return null;

  function close() {
    setState("out");
    setTimeout(() => setState("gone"), 350);
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-[calc(4.75rem+env(safe-area-inset-top))] z-[70] flex justify-center px-3 lg:inset-x-auto lg:right-6 lg:top-6 lg:px-0"
    >
      <div
        style={{ "--notice-ms": `${life}ms` } as React.CSSProperties}
        className={`${state === "out" ? "notice-out" : "notice-in"} pointer-events-auto relative w-full max-w-md overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-2xl shadow-emerald-500/15`}
      >
        <div className="flex items-center gap-3 p-3 pr-12">
          <Mascot pose={pose} size={76} priority className="shrink-0" />
          <div className="min-w-0">
            <p className="font-display text-[17px] font-bold leading-snug text-zinc-900">{title}</p>
            {message && <p className="mt-1 text-sm leading-relaxed text-zinc-600">{message}</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Yopiş"
          className="absolute right-2.5 top-2.5 grid h-9 w-9 place-items-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
        >
          <Icon name="close" className="h-4 w-4" />
        </button>
        <span aria-hidden className="notice-timer absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-400" />
      </div>
    </div>
  );
}
