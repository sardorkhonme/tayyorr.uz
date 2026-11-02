"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES = [
  ["OPEN", "Yangi"],
  ["REVIEWING", "Ko'rilmoqda"],
  ["RESOLVED", "Hal qilindi"],
  ["DISMISSED", "Rad etildi"],
] as const;

export function ComplaintForm({
  complaintId,
  status,
  note,
}: {
  complaintId: string;
  status: string;
  note: string | null;
}) {
  const router = useRouter();
  const [st, setSt] = useState(status);
  const [adminNote, setAdminNote] = useState(note ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/complaints/${complaintId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: st, adminNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik");
      setMsg("Saqlandi");
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div>
        <label className="label">Holat</label>
        <select
          className="input"
          value={st}
          onChange={(e) => setSt(e.target.value)}
        >
          {STATUSES.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Admin izohi</label>
        <textarea
          className="input"
          rows={3}
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
        />
      </div>
      {msg && <p className="text-xs text-zinc-400">{msg}</p>}
      <button className="btn-primary w-fit" disabled={busy}>
        {busy ? "..." : "Saqlash"}
      </button>
    </form>
  );
}
