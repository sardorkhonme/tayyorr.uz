"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { localInputToIso, toLocalInput } from "@/components/contract-panel";
import { Icon } from "@/components/icons";

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
      setErr("Qaror izohini yozing (ikkala tomonga körinadi)");
      return;
    }
    const text =
      decision === "CANCEL"
        ? `Şartnoma bekor qilinadi, ${amount.toLocaleString()} söm buyurtmaçiga qaytadi.`
        : decision === "COMPLETE"
          ? `Iş yakunlanadi, ${amount.toLocaleString()} söm tayyorlovçiga ötadi.`
          : "Şartnoma davom etadi.";
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
        placeholder="Qaror izohi (ikkala tomonga çatda körinadi)"
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
          <Icon name="x-circle" className="h-4 w-4" />
          Bekor qiliş (pul buyurtmaçiga)
        </button>
        <button className="btn-ghost" disabled={busy} onClick={() => decide("CONTINUE")}>
          <Icon name="play" className="h-4 w-4" />
          Davom ettiriş
        </button>
        <button className="btn-primary" disabled={busy} onClick={() => decide("COMPLETE")}>
          <Icon name="check-circle" className="h-4 w-4" />
          Yakunlaş (pul tayyorlovçiga)
        </button>
      </div>
    </div>
  );
}
