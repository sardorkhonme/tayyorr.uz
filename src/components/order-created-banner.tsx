"use client";

import { useEffect, useState } from "react";

import { Mascot } from "@/components/mascot";

/**
 * Buyurtma yaratilgandan keyin (`?created=1`) — bir martalik tabrik kartasi.
 * Parametr mijozda o'qiladi va URL dan darhol olib tashlanadi: sahifa
 * yangilansa qayta chiqmaydi, router.refresh() esa kartani yopib yubormaydi.
 */
export function OrderCreatedBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get("created") === "1") {
        setOpen(true);
        url.searchParams.delete("created");
        window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
      }
    } catch {
      /* e'tiborsiz */
    }
  }, []);

  if (!open) return null;

  return (
    <section className="card relative flex items-center gap-4 overflow-hidden border-emerald-400/30 bg-emerald-500/10">
      <Mascot pose="success" size={120} priority className="shrink-0" />
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-semibold text-white">Buyurtmangiz joylandi!</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Tayyorlovçilar endi uni körib, takliflarini yuboradi. Yangi taklif kelişi bilan
          sizga xabar beramiz.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setOpen(false)}
        aria-label="Yopiş"
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-lg leading-none text-zinc-400 transition hover:bg-white/10"
      >
        ×
      </button>
    </section>
  );
}
