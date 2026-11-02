"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** datetime-local input uchun standart qiymat — bugundan 7 kun keyin, shu soat. */
function defaultUntil(): string {
  const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  d.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function BanForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [until, setUntil] = useState(defaultUntil());
  const [indefinite, setIndefinite] = useState(false);
  const [reason, setReason] = useState("");
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/ban`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          until: indefinite ? undefined : new Date(until).toISOString(),
          indefinite,
          reason,
          notify,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik");
      setReason("");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div>
        <label className="label">Muddat (sana va soat)</label>
        <input
          className="input"
          type="datetime-local"
          value={until}
          onChange={(e) => setUntil(e.target.value)}
          disabled={indefinite}
          required={!indefinite}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-zinc-300">
        <input
          type="checkbox"
          checked={indefinite}
          onChange={(e) => setIndefinite(e.target.checked)}
        />
        Muddatsiz
      </label>
      <div>
        <label className="label">Sabab (foydalanuvchiga ko'rinadi)</label>
        <textarea
          className="input"
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-zinc-300">
        <input
          type="checkbox"
          checked={notify}
          onChange={(e) => setNotify(e.target.checked)}
        />
        «tayyorr.uz support» orqali xabar yuborilsin
      </label>
      {err && <p className="text-sm text-red-400">{err}</p>}
      <button className="btn-primary w-fit" disabled={busy}>
        {busy ? "..." : "Cheklash / ban"}
      </button>
    </form>
  );
}
