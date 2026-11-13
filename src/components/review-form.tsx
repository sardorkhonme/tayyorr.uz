"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { StarInput } from "@/components/stars";
import { useFlashState } from "@/components/flash-status";

export function ReviewForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useFlashState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!stars) {
      setErr("Yulduz tanlang");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stars, comment: comment || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card flex flex-col gap-3">
      <h2 className="font-semibold text-white">Tayyorlovçini baholang</h2>
      <p className="-mt-1 text-sm text-zinc-400">
        Bahoyingiz tayyorlovçi profilida va örtaça reytingida körinadi.
      </p>
      <StarInput value={stars} onChange={setStars} />
      <textarea
        className="input"
        rows={3}
        placeholder="Izoh (ixtiyoriy)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      {err && <p className="flash-status text-sm text-red-400">{err}</p>}
      <button className="btn-primary w-fit" disabled={busy}>
        {busy ? "..." : "Bahoni yuboriş"}
      </button>
    </form>
  );
}
