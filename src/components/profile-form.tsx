"use client";

import { fetchJson } from "@/components/fetch-json";
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
      await fetchJson("/api/me", {
        method: "PATCH",
        json: {
          firstName: form.firstName,
          lastName: form.lastName,
          about: form.about || undefined,
          avatarUrl: form.avatarUrl || undefined,
          birthDate: birthPartsToIso(birth) ?? undefined,
        },
      });
      // sessiya yangilanişi osilib qolsa ham saqlangan deb hisoblaymiz
      await Promise.race([update(), new Promise((r) => setTimeout(r, 5000))]);
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
      <h2 className="font-semibold text-white">Şaxsiy maʼlumotlar</h2>
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
        <label className="label">Tuğilgan sana</label>
        <BirthDateSelect value={birth} onChange={setBirth} />
      </div>
      <div>
        <label className="label">Qöşimça maʼlumot</label>
        <textarea
          className="input"
          rows={4}
          value={form.about}
          onChange={(e) => set("about", e.target.value)}
        />
      </div>
      {msg && <p className="text-sm text-zinc-400">{msg}</p>}
      <button className="btn-primary" disabled={busy}>
        {busy ? "..." : "Saqlaş"}
      </button>
    </form>
  );
}
