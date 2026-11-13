"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Icon } from "@/components/icons";
import { useFlashState } from "@/components/flash-status";

type U = { id: string; name: string | null; firstName: string | null; lastName: string | null; login: string | null; avatarUrl: string | null; image: string | null };

const nameOf = (u: U) => [u.firstName, u.lastName].filter(Boolean).join(" ") || u.name || (u.login ? `@${u.login}` : u.id);

function Avatar({ u }: { u: U }) {
  const src = u.avatarUrl || u.image;
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
  ) : (
    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10 text-zinc-400">
      <Icon name="user" className="h-4 w-4" />
    </span>
  );
}

/** Texnik ishlar rejimi: bitta tugma bilan yoqish/o'chirish, xabar matni va ruxsat ro'yxati (har o'zgarish darhol saqlanadi). */
export function MaintenanceForm({ initial, initialUsers }: { initial: { on: boolean; message: string; since: string | null }; initialUsers: U[] }) {
  const router = useRouter();
  const [on, setOn] = useState(initial.on);
  const [message, setMessage] = useState(initial.message);
  const [users, setUsers] = useState<U[]>(initialUsers);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useFlashState<{ ok: boolean; text: string } | null>(null);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<U[]>([]);

  async function save(next: { on?: boolean; message?: string; users?: U[] }, okText = "Saqlandi") {
    setBusy(true);
    setNote(null);
    try {
      const body = { on: next.on ?? on, message: next.message ?? message, allow: (next.users ?? users).map((u) => u.id) };
      const res = await fetch("/api/admin/maintenance", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Saqlab bölmadi");
      if (next.on !== undefined) setOn(next.on);
      if (next.users) setUsers(next.users);
      setNote({ ok: true, text: okText });
      router.refresh();
      return true;
    } catch (e) {
      setNote({ ok: false, text: e instanceof Error ? e.message : "Xatolik" });
      return false;
    } finally {
      setBusy(false);
    }
  }

  function toggle() {
    if (!on && users.length === 0 && !confirm("Ruxsat röyxati böş — saytga heç kim (siz ham) kira olmaydi. Baribir yoqilsinmi?")) return;
    if (on && !confirm("Texnik işlar rejimi öçirilsinmi? Sayt hamma uçun oçiladi.")) return;
    void save({ on: !on }, on ? "Öçirildi — sayt hamma uçun işlayapti" : "Yoqildi — ~10 soniyada saytlar yopiladi");
  }

  useEffect(() => {
    if (q.trim().length < 2) {
      setFound([]);
      return;
    }
    const t = setTimeout(() => {
      fetch(`/api/admin/maintenance?q=${encodeURIComponent(q.trim())}`)
        .then((r) => r.json())
        .then((d) => setFound(d.users ?? []))
        .catch(() => setFound([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const since = initial.since && on ? new Date(initial.since).toLocaleString("ru-RU", { timeZone: "Asia/Tashkent", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : null;

  return (
    <div className="flex flex-col gap-6">
      {/* holat + asosiy tugma */}
      <section
        className={`relative overflow-hidden rounded-2xl border p-5 sm:p-6 ${on ? "border-orange-500/40 bg-orange-500/10" : "border-emerald-500/25 bg-emerald-500/[0.06]"}`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-2xl ${on ? "bg-orange-500/20" : "bg-emerald-500/15"}`}>{on ? "🛠️" : "✅"}</span>
          <div className="min-w-0 flex-1">
            <p className={`flex items-center gap-2 text-lg font-semibold ${on ? "text-amber-300" : "text-emerald-300"}`}>
              <span className={`h-2.5 w-2.5 rounded-full ${on ? "animate-pulse bg-orange-400" : "bg-emerald-400"}`} />
              {on ? "Texnik işlar rejimi YOQILGAN" : "Sayt hamma uçun işlayapti"}
            </p>
            <p className="mt-0.5 text-sm text-zinc-400">
              {on
                ? `Faqat ${users.length} ta ruxsat berilgan foydalanuvçi kira oladi${since ? ` · ${since} dan beri` : ""}`
                : "Yoqsangiz, ~10 soniyada app, tayyorr+ va SMM yopiladi (ruxsat berilganlardan taşqari)"}
            </p>
          </div>
          <button
            type="button"
            onClick={toggle}
            disabled={busy}
            className={`shrink-0 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-lg transition disabled:opacity-60 ${
              on ? "bg-emerald-600 shadow-emerald-600/25 hover:bg-emerald-500" : "bg-orange-600 shadow-orange-600/25 hover:bg-orange-500"
            }`}
          >
            {busy ? "Saqlanmoqda…" : on ? "Saytni oçiş" : "Texnik işlarni boşlaş"}
          </button>
        </div>
        {note && <p className={`flash-status mt-3 text-sm ${note.ok ? "text-emerald-300" : "text-red-300"}`}>{note.text}</p>}
      </section>

      {/* ruxsat ro'yxati */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="flex items-center gap-2 font-semibold text-white">
          <Icon name="users" className="h-4 w-4 text-zinc-400" />
          Ruxsat berilgan foydalanuvçilar
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Bular rejim yoqilganda ham saytdan odatdagidek foydalanadi (masalan, siz — yangilanişni tekşiriş uçun). Kiriş: plus.tayyorr.uz/login
        </p>

        <div className="relative mt-4">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ism, login yoki ID böyiça qidiriş…"
            className="input w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-9 pr-3 text-sm text-white outline-none focus:border-indigo-400/60"
          />
          {found.length > 0 && (
            <div className="menu-panel absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-white/10 bg-[#14141b] shadow-2xl">
              {found.map((u) => {
                const added = users.some((x) => x.id === u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    disabled={added || busy}
                    onClick={() => {
                      void save({ users: [...users, u] }, `${nameOf(u)} qöşildi`);
                      setQ("");
                      setFound([]);
                    }}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition hover:bg-white/5 disabled:opacity-50"
                  >
                    <Avatar u={u} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-zinc-100">{nameOf(u)}</span>
                      <span className="block truncate text-xs text-zinc-500">{u.login ? `@${u.login}` : u.id}</span>
                    </span>
                    <span className="text-xs text-indigo-300">{added ? "qöşilgan" : "+ Qöşiş"}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-col divide-y divide-white/5">
          {users.length === 0 && <p className="py-3 text-sm text-zinc-500">Hali heç kim yöq — avval özingizni qöşing.</p>}
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 py-2.5">
              <Avatar u={u} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-zinc-100">{nameOf(u)}</span>
                <span className="block truncate text-xs text-zinc-500">{u.login ? `@${u.login}` : u.id}</span>
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => void save({ users: users.filter((x) => x.id !== u.id) }, `${nameOf(u)} olib taşlandi`)}
                className="rounded-lg px-2.5 py-1.5 text-xs text-zinc-400 transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
              >
                Olib taşlaş
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* xabar */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="flex items-center gap-2 font-semibold text-white">
          <Icon name="message" className="h-4 w-4 text-zinc-400" />
          Foydalanuvçilarga körinadigan xabar
        </h2>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={300}
          rows={3}
          className="input mt-3 w-full rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white outline-none focus:border-indigo-400/60"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-xs text-zinc-500">{message.length}/300</span>
          <button
            type="button"
            disabled={busy || message.trim() === initial.message.trim()}
            onClick={() => void save({ message }, "Xabar saqlandi")}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/10 disabled:opacity-40"
          >
            Xabarni saqlaş
          </button>
        </div>
      </section>
    </div>
  );
}
