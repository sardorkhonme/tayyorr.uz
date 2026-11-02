"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateReferralForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik");
      setName("");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <div className="min-w-[14rem] flex-1">
        <label className="label">Havola nomi</label>
        <input
          className="input"
          placeholder="masalan: Instagram reklama"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          maxLength={80}
        />
      </div>
      <button className="btn-primary" disabled={busy || !name.trim()}>
        {busy ? "..." : "Havola yaratish"}
      </button>
      {err && <p className="w-full text-sm text-red-400">{err}</p>}
    </form>
  );
}
