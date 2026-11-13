"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { useFlashState } from "@/components/flash-status";
import { appConfirm } from "@/components/app-dialog";

export function OrderDeleteButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useFlashState<string | null>(null);

  async function del() {
    if (
      !(await appConfirm({
        title: "Buyurtma öçirilsinmi?",
        message:
          "Boşqalarga körinmaydi, lekin sizda «öçirilgan» holatida qoladi. Faol şartnomadagi mablağ qaytariladi.",
        confirmText: "Öçiriş",
        danger: true,
      }))
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
            Buyurtmani öçiriş
          </span>
        )}
      </button>
      {err && <p className="flash-status mt-1 text-xs text-red-400">{err}</p>}
    </div>
  );
}
