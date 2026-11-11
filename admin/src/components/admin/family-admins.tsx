"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Admin = { id: string; name: string; login: string | null; image: string | null };

/** Guruh adminlari: login bo'yicha qo'shish, olib tashlash. */
export function FamilyAdmins({ admins }: { admins: Admin[] }) {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function call(body: Record<string, unknown>, key: string) {
    setBusy(key);
    setErr(null);
    try {
      const res = await fetch("/api/admin/family/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Xatolik");
      setLogin("");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div>
        <h2 className="font-semibold text-white">Guruh adminlari</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Admin ilovada xabarni öçira oladi, qadaydi, «Hammaga bildiriş» bilan yuboradi va öz nomidan, «Tayyorr.uz» (anonim) yoki
          «Tayyorr Support» nomidan yozadi. Support akkaunti doim admin.
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        {admins.length === 0 && <p className="text-sm text-zinc-500">Hali admin tanlanmagan.</p>}
        {admins.map((a) => (
          <div key={a.id} className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2">
            {a.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.image} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-xs font-bold text-white">
                {a.name.trim()[0]?.toUpperCase() ?? "?"}
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-white">{a.name}</span>
              {a.login && <span className="block text-xs text-zinc-500">@{a.login}</span>}
            </span>
            <button
              type="button"
              className="rounded-lg px-2.5 py-1 text-xs text-red-300 hover:bg-red-500/10"
              disabled={busy !== null}
              onClick={() => call({ userId: a.id, on: false }, a.id)}
            >
              {busy === a.id ? "..." : "Olib taşlaş"}
            </button>
          </div>
        ))}
      </div>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (login.trim()) call({ login: login.trim(), on: true }, "add");
        }}
      >
        <input className="input min-w-0 flex-1" placeholder="Login, masalan: jasur_t" value={login} onChange={(e) => setLogin(e.target.value)} />
        <button className="btn-primary" disabled={busy !== null || !login.trim()}>
          {busy === "add" ? "..." : "Admin qiliş"}
        </button>
      </form>
      {err && <p className="text-sm text-red-400">{err}</p>}
    </div>
  );
}
