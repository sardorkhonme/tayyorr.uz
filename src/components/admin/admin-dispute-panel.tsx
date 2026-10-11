"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { localInputToIso, toLocalInput } from "@/components/contract-panel";

/** Nizo bo'yicha admin qarori: bekor qilish / davom ettirish / yakunlash. */
export function AdminDisputePanel({
  contractId,
  amount,
  deadline,
}: {
  contractId: string;
  amount: number;
  deadline: string | null;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  // brauzer vaqti bilan (SSR'da server zonasi boshqa bo'ladi)
  useEffect(() => {
    if (deadline && new Date(deadline).getTime() > Date.now()) setNewDeadline(toLocalInput(deadline));
  }, [deadline]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function decide(decision: "CANCEL" | "CONTINUE" | "COMPLETE") {
    if (note.trim().length < 3) {
      setErr("Qaror izohini yozing (ikkala tomonga ko'rinadi)");
      return;
    }
    const text =
      decision === "CANCEL"
        ? `Shartnoma bekor qilinadi, ${amount.toLocaleString()} so'm buyurtmachiga qaytadi.`
        : decision === "COMPLETE"
          ? `Ish yakunlanadi, ${amount.toLocaleString()} so'm tayyorlovchiga o'tadi.`
          : "Shartnoma davom etadi.";
    if (!window.confirm(`${text} Tasdiqlaysizmi?`)) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/contracts/${contractId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          note: note.trim(),
          deadline: decision === "CONTINUE" ? localInputToIso(newDeadline) : undefined,
        }),
      });
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
    <div className="flex flex-col gap-2">
      <textarea
        className="input"
        rows={3}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Qaror izohi (ikkala tomonga chatda ko'rinadi)"
      />
      <div>
        <label className="label">Davom ettirilsa — yangi muddat</label>
        <input
          className="input"
          type="datetime-local"
          value={newDeadline}
          onChange={(e) => setNewDeadline(e.target.value)}
        />
      </div>
      {err && <p className="text-sm text-red-400">{err}</p>}
      <div className="flex flex-wrap gap-2">
        <button className="btn-ghost text-red-300" disabled={busy} onClick={() => decide("CANCEL")}>
          ✖ Bekor qilish (pul buyurtmachiga)
        </button>
        <button className="btn-ghost" disabled={busy} onClick={() => decide("CONTINUE")}>
          ▶ Davom ettirish
        </button>
        <button className="btn-primary" disabled={busy} onClick={() => decide("COMPLETE")}>
          ✅ Yakunlash (pul tayyorlovchiga)
        </button>
      </div>
    </div>
  );
}
