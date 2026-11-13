"use client";

import { useEffect, useState } from "react";
import { useFlashState } from "@/components/flash-status";
import { appConfirm } from "@/components/app-dialog";

/** Xush kelibsiz xabarini olmay qolganlarga (rolga qarab) yuborish. */
export function WelcomeBackfill() {
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const [err, setErr] = useFlashState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/welcome-backfill")
      .then((r) => r.json())
      .then((d) => setCount(typeof d.count === "number" ? d.count : 0))
      .catch(() => setCount(0));
  }, []);

  async function run() {
    if (
      !count ||
      !(await appConfirm({
        message: `${count} ta foydalanuvçiga xuş kelibsiz xabari (rolga qarab 2 ta) yuborilsinmi?`,
        confirmText: "Yuboriş",
      }))
    )
      return;
    setBusy(true);
    setErr(null);
    let total = 0;
    try {
      for (let i = 0; i < 200; i++) {
        const res = await fetch("/api/admin/welcome-backfill", { method: "POST" });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "Xatolik");
        total += d.sent;
        setDone(total);
        setCount(d.left);
        if (!d.left || !d.sent) break;
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBusy(false);
    }
  }

  if (count === null || (count === 0 && done === null)) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-sm">
      <span className="text-zinc-300">
        {count > 0 ? (
          <>
            Xuş kelibsiz xabarini olmaganlar: <span className="font-semibold text-white">{count} ta</span>
          </>
        ) : (
          <span className="text-emerald-400">Hammasiga yuborildi</span>
        )}
        {done !== null && <span className="ml-2 text-zinc-500">· yuborildi: {done}</span>}
      </span>
      {count > 0 && (
        <button type="button" className="btn-primary !px-3 !py-1.5 text-sm" disabled={busy} onClick={run}>
          {busy ? "Yuborilmoqda..." : "Ularga yuboriş"}
        </button>
      )}
      {err && <span className="flash-status text-red-400">{err}</span>}
    </div>
  );
}
