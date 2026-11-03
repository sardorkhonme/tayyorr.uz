"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

import { Icon } from "@/components/icons";

const QUICK = [
  "Karta raqami notöğri",
  "Karta egasi ismi mos kelmadi",
  "Karta bloklangan yoki faol emas",
  "Bank ötkazmani qabul qilmadi",
  "Şubhali amal — support bilan boğlaning",
];

/** Yechib olishni rad etish — sabab majburiy (foydalanuvchiga xabarda va hamyonda ko'rinadi). */
export function PayoutRejectButton({ id, amountText }: { id: string; amountText: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const note = reason.trim();
    if (note.length < 3) return setErr("Sababni yozing");
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/admin/payouts/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "REJECT", note }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(false);
    if (!res?.ok) return setErr(data?.error || "Xatolik");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-lg bg-red-500/15 px-2.5 py-1 text-xs text-red-300 hover:bg-red-500/25"
      >
        <Icon name="x-circle" className="h-3.5 w-3.5" />
        Ötkazib bölmadi
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => !busy && setOpen(false)}>
            <form
              onSubmit={submit}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md space-y-4 rounded-2xl border border-white/10 bg-[#0e0e16] p-5 text-left shadow-2xl"
            >
              <div>
                <h3 className="font-semibold text-white">Yeçib olişni rad etiş</h3>
                <p className="mt-1 text-sm text-zinc-400">
                  {amountText} foydalanuvçi hamyoniga qaytariladi. Sabab unga xabarda va hamyonda körinadi.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setReason(q)}
                    className={`rounded-full border px-2.5 py-1 text-xs transition ${
                      reason === q
                        ? "border-red-400/60 bg-red-500/15 text-red-200"
                        : "border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.08]"
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
              <textarea
                className="input min-h-24"
                placeholder="Rad etiş sababi (majburiy)…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={1000}
                autoFocus
              />
              {err && <p className="text-sm text-red-400">{err}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" className="btn-ghost" onClick={() => setOpen(false)} disabled={busy}>
                  Bekor
                </button>
                <button
                  className="rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
                  disabled={busy || reason.trim().length < 3}
                >
                  {busy ? "..." : "Rad etiş"}
                </button>
              </div>
            </form>
          </div>,
          document.body,
        )}
    </>
  );
}
