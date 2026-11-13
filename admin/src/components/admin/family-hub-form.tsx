"use client";

import { useEffect, useState } from "react";
import { useFlashState } from "@/components/flash-status";

type Mode = "on" | "off" | "days";

/** tayyorr+ (ilova) bosh sahifasidagi «Tayyorr’s Family» kartasi: doim / yashirin / yuklab olgandan keyin N kun. */
export function FamilyHubForm() {
  const [mode, setMode] = useState<Mode>("on");
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useFlashState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/family/hub")
      .then((r) => r.json())
      .then((d) => {
        if (d.hub?.mode) setMode(d.hub.mode);
        if (d.hub?.days) setDays(d.hub.days);
      })
      .catch(() => {});
  }, []);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/family/hub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "days" ? { mode, days } : { mode }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Xatolik");
      setMsg("Saqlandi — ilovada bir daqiqa ičida yangilanadi");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBusy(false);
    }
  }

  const opt = (v: Mode, label: string, hint: string) => (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-white/[0.03] px-3 py-2 text-sm hover:bg-white/[0.05]">
      <input type="radio" name="family-hub" className="mt-0.5 accent-violet-500" checked={mode === v} onChange={() => setMode(v)} />
      <span>
        <span className="text-white">{label}</span>
        <span className="block text-xs text-zinc-500">{hint}</span>
      </span>
    </label>
  );

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="font-semibold text-white">tayyorr+ dagi guruh kartasi</h2>
      <p className="mb-3 mt-1 text-xs text-zinc-500">Ilovadagi tayyorr+ bosh sahifasining tepasidagi «Tayyorr’s Family» banneri. Guruh «Xabarlar» bölimida doim turadi.</p>
      <div className="flex flex-col gap-1.5">
        {opt("on", "Doim körinsin", "Barça foydalanuvçilarga")}
        {opt("off", "Yaşirilsin", "Heç kimga körinmaydi")}
        {opt("days", "Ilovani yuklab olgandan keyin maʼlum muddat", "Foydalanuvçi ilovaga birinçi kirgan kundan boşlab")}
      </div>
      {mode === "days" && (
        <label className="mt-3 flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="number"
            min={1}
            max={365}
            className="input !w-24"
            value={days}
            onChange={(e) => setDays(Math.max(1, Math.min(365, Number(e.target.value) || 1)))}
          />
          kun körinib turadi
        </label>
      )}
      <div className="mt-3 flex items-center gap-3">
        <button type="button" className="btn-primary" disabled={busy} onClick={save}>
          {busy ? "..." : "Saqlaş"}
        </button>
        {msg && <span className="flash-status text-xs text-zinc-400">{msg}</span>}
      </div>
    </section>
  );
}
