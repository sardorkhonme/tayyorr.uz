"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { Mascot } from "@/components/mascot";

/** Yangi buyurtma formasi shu kalitga buyurtma id sini yozadi (sahifa qayta qurilsa ham oyna yo'qolmasin). */
export const ORDER_CREATED_KEY = "tyr_order_created";
const SHOW_MS = 4000;

/**
 * Buyurtma yaratilgandan keyin — ekran markazida tabrik oynasi (katta maskot).
 * ~4 s turadi (pastdagi chiziq qancha qolganini ko'rsatadi) yoki yopilguncha.
 * Belgi: `?created=1` yoki sessionStorage — router.refresh() sahifani qayta
 * qursa ham oyna darhol yo'qolib qolmaydi; ko'rsatilgach belgi o'chiriladi.
 */
export function OrderCreatedBanner({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let show = false;
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get("created") === "1") {
        show = true;
        url.searchParams.delete("created");
        window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
      }
      if (sessionStorage.getItem(ORDER_CREATED_KEY) === orderId) show = true;
    } catch {
      /* e'tiborsiz */
    }
    if (show) setOpen(true);
  }, [orderId]);

  const close = useCallback(() => {
    try {
      sessionStorage.removeItem(ORDER_CREATED_KEY);
    } catch {
      /* e'tiborsiz */
    }
    setLeaving(true);
    setTimeout(() => {
      setOpen(false);
      setLeaving(false);
    }, 220);
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(close, SHOW_MS);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-created-title"
      onClick={close}
      className={`fixed inset-0 z-[85] flex items-center justify-center bg-black/60 p-4 transition-opacity duration-200 ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="pop-in relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-[var(--surface-2)] px-6 pb-6 pt-4 text-center shadow-2xl shadow-black/50"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Yopiş"
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-xl leading-none text-zinc-400 transition hover:bg-white/10 hover:text-white"
        >
          ×
        </button>
        <div className="flex justify-center">
          <Mascot pose="success" size={220} priority />
        </div>
        <h2 id="order-created-title" className="mt-2 text-xl font-bold tracking-tight text-white">
          Buyurtmangiz joylandi!
        </h2>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-zinc-400">
          Tayyorlovçilar endi uni körib, takliflarini yuboradi. Yangi taklif kelişi bilan sizga
          xabar beramiz.
        </p>
        <button type="button" onClick={close} className="btn-primary mt-5 w-full">
          Ajoyib
        </button>
        {/* qancha vaqt qolgani */}
        <span
          aria-hidden
          className="toast-progress absolute inset-x-0 bottom-0 h-1 origin-left bg-emerald-400/70"
          style={{ animationDuration: `${SHOW_MS}ms` }}
        />
      </div>
    </div>,
    document.body,
  );
}
