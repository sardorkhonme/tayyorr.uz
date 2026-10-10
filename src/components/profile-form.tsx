"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { AvatarUpload } from "@/components/avatar-upload";
import { BirthDateSelect, birthPartsFrom, birthPartsToIso } from "@/components/birth-date-select";

export function ProfileForm({
  initial,
}: {
  initial: { firstName: string; lastName: string; about: string; avatarUrl: string; birthDate: string };
}) {
  const router = useRouter();
  const { update } = useSession();
  const [form, setForm] = useState(initial);
  const [birth, setBirth] = useState(() => birthPartsFrom(initial.birthDate));
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          about: form.about || undefined,
          avatarUrl: form.avatarUrl || undefined,
          birthDate: birthPartsToIso(birth) ?? undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Xatolik");
      await update();
      setMsg("Saqlandi");
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card flex flex-col gap-3">
      <div>
        <label className="label">Glavniy rasm</label>
        <AvatarUpload
          value={form.avatarUrl}
          onChange={(url) => set("avatarUrl", url)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Ism</label>
          <input
            className="input"
            value={form.firstName}
            onChange={(e) => set("firstName", e.target.value)}
          />
        </div>
        <div>
          <label className="label">Familiya</label>
          <input
            className="input"
            value={form.lastName}
            onChange={(e) => set("lastName", e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="label">Tug&apos;ilgan sana</label>
        <BirthDateSelect value={birth} onChange={setBirth} />
      </div>
      <div>
        <label className="label">Qo'shimcha ma'lumot</label>
        <textarea
          className="input"
          rows={4}
          value={form.about}
          onChange={(e) => set("about", e.target.value)}
        />
      </div>
      {msg && <p className="text-sm text-zinc-400">{msg}</p>}
      <button className="btn-primary" disabled={busy}>
        {busy ? "..." : "Saqlash"}
      </button>
    </form>
  );
}
