"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Icon } from "@/components/icons";
import type { AccountData, AccountInput } from "@/lib/account";

/** Rasmni brauzerda kichraytiradi (512px, JPEG) — serverga yengil data URL yuboriladi. */
async function resizeImage(file: File, max = 512): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.86);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Akkaunt — app.tayyorr.uz dagi profil bilan bir xil: rasm, ism, familiya, tug'ilgan sana,
 * o'zi haqida, login va parol. O'zgarishlar barcha platformalarda bir xil ko'rinadi.
 */
export function AccountEditor({
  initial,
  save,
}: {
  initial: AccountData;
  save: (input: AccountInput) => Promise<{ error?: string }>;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ ...initial, newPassword: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // «Saqlandi» — 4 soniya turib yöqoladi (xato xabari tuzatilguncha qoladi)
  useEffect(() => {
    if (!msg?.ok) return;
    const t = setTimeout(() => setMsg(null), 4000);
    return () => clearTimeout(t);
  }, [msg]);

  async function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      set("avatar", await resizeImage(file));
    } catch {
      setMsg({ ok: false, text: "Rasmni öqib bölmadi" });
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await save({
      avatar: form.avatar.startsWith("data:") ? form.avatar : undefined,
      firstName: form.firstName,
      lastName: form.lastName,
      birthDate: form.birthDate,
      about: form.about,
      login: form.login,
      newPassword: form.newPassword,
    }).catch(() => ({ error: "Kutilmagan xatolik, qayta urinib köring" }));
    setBusy(false);
    if (res.error) return setMsg({ ok: false, text: res.error });
    setForm((f) => ({ ...f, newPassword: "" }));
    setMsg({ ok: true, text: "Saqlandi" });
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <section className="card !rounded-3xl p-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-indigo-100"
            title="Rasmni almaştiriş"
          >
            {form.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="grid h-full w-full place-items-center font-display text-3xl font-bold text-indigo-700">
                {(form.firstName || "?").slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="absolute inset-0 grid place-items-center bg-black/40 text-white opacity-0 transition group-hover:opacity-100">
              <Icon name="camera" className="h-6 w-6" />
            </span>
          </button>
          <div className="min-w-0">
            <p className="truncate font-display text-xl font-bold text-zinc-900">
              {[form.firstName, form.lastName].filter(Boolean).join(" ") || "Ismingiz"}
            </p>
            <p className="truncate text-sm text-zinc-500">{form.email}</p>
            <button type="button" onClick={() => fileRef.current?.click()} className="mt-1 text-sm font-semibold text-indigo-600 hover:underline">
              Rasmni almaştiriş
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pickImage} />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Ism</label>
            <input className="input" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
          </div>
          <div>
            <label className="label">Familiya</label>
            <input className="input" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
          </div>
          <div>
            <label className="label">Tuğilgan sana</label>
            <input type="date" className="input" value={form.birthDate} onChange={(e) => set("birthDate", e.target.value)} />
          </div>
          <div>
            <label className="label">Login</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">@</span>
              <input className="input !pl-8" value={form.login} onChange={(e) => set("login", e.target.value)} />
            </div>
          </div>
        </div>
        <div className="mt-4">
          <label className="label">Özingiz haqingizda</label>
          <textarea className="input min-h-24 resize-y" rows={3} value={form.about} onChange={(e) => set("about", e.target.value)} />
        </div>
      </section>

      <section className="card !rounded-3xl p-6">
        <h2 className="font-display text-lg font-bold text-zinc-900">Xavfsizlik</h2>
        <p className="mt-1 text-sm text-zinc-500">
          {initial.hasPassword ? "Parolni almaştiriş uçun yangisini kiriting." : "Login bilan kiriş uçun parol örnating."}
        </p>
        <input
          type="password"
          autoComplete="new-password"
          className="input mt-3"
          placeholder="Yangi parol (kamida 6 belgi)"
          value={form.newPassword}
          onChange={(e) => set("newPassword", e.target.value)}
        />
      </section>

      {msg && (
        <p
          role="status"
          className={`animate-pop flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${
            msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
          }`}
        >
          <Icon name={msg.ok ? "check" : "close"} className="h-4 w-4 shrink-0" strokeWidth={2.4} />
          {msg.text}
        </p>
      )}
      <button className="btn-primary w-full !py-3.5 sm:w-auto" disabled={busy}>
        {busy ? "Saqlanmoqda…" : "Saqlaş"}
      </button>
    </form>
  );
}
