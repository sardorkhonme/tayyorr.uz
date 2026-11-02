"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";

export function OrderDeleteButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function del() {
    if (
      !window.confirm(
        "Buyurtma o'chirilsinmi? Boshqalarga ko'rinmaydi, lekin sizda «o'chirilgan» holatida qoladi. Faol shartnomadagi mablag' qaytariladi.",
      )
    )
      return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Xatolik");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={del}
        disabled={busy}
        className="rounded-lg bg-red-500/15 px-3 py-1.5 text-sm text-red-300 transition hover:bg-red-500/25"
      >
        {busy ? (
          "..."
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <Icon name="trash" className="h-4 w-4" />
            Buyurtmani o'chirish
          </span>
        )}
      </button>
      {err && <p className="mt-1 text-xs text-red-400">{err}</p>}
    </div>
  );
}
