"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export interface PhoneSlide {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  imageKey: string;
  order: number;
  active: boolean;
}

async function uploadImage(file: File): Promise<{ imageUrl: string; imageKey: string }> {
  const pres = await fetch("/api/admin/upload/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: "LANDING_PHONE_SLIDE",
      filename: file.name,
      contentType: file.type || "image/jpeg",
    }),
  });
  const p = await pres.json();
  if (!pres.ok) throw new Error(p.error || "Yuklanmadi");
  const put = await fetch(p.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "image/jpeg" },
    body: file,
  });
  if (!put.ok) throw new Error("Rasm yuklanmadi");
  return { imageUrl: p.publicUrl, imageKey: p.key };
}

function Row({ s }: { s: PhoneSlide }) {
  const router = useRouter();
  const [title, setTitle] = useState(s.title);
  const [subtitle, setSubtitle] = useState(s.subtitle);
  const [order, setOrder] = useState(s.order);
  const [active, setActive] = useState(s.active);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const dirty =
    title !== s.title || subtitle !== s.subtitle || order !== s.order || active !== s.active;

  async function save() {
    setBusy(true);
    await fetch(`/api/admin/landing-phone-slide/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, subtitle, order, active }),
    });
    setBusy(false);
    router.refresh();
  }
  async function toggle() {
    setBusy(true);
    await fetch(`/api/admin/landing-phone-slide/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    setActive((a) => !a);
    setBusy(false);
    router.refresh();
  }
  async function del() {
    if (!confirm("Slayd o'chirilsinmi?")) return;
    setBusy(true);
    await fetch(`/api/admin/landing-phone-slide/${s.id}`, { method: "DELETE" });
    router.refresh();
  }
  async function replaceFile(file: File) {
    setUploading(true);
    setMsg(null);
    try {
      const { imageUrl, imageKey } = await uploadImage(file);
      await fetch(`/api/admin/landing-phone-slide/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, imageKey }),
      });
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="rounded-xl border border-white/10 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          className={`rounded-full px-2 py-0.5 ${
            active
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-zinc-500/15 text-zinc-400"
          }`}
        >
          {active ? "● Faol" : "○ Nofaol"}
        </button>
        <button
          type="button"
          onClick={del}
          disabled={busy}
          className="ml-auto rounded-full bg-red-500/15 px-2 py-0.5 text-red-300 hover:bg-red-500/25"
        >
          O'chirish
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="w-full max-w-[9rem] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/40">
          {s.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.imageUrl} alt="" className="aspect-[9/19] w-full object-cover" />
          ) : (
            <div className="flex aspect-[9/19] items-center justify-center text-xs text-zinc-600">
              rasm yo&apos;q
            </div>
          )}
        </div>
        <div className="flex-1 space-y-3">
          <input
            className="input"
            placeholder="Sarlavha"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="input min-h-[64px]"
            placeholder="Submatn"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              Tartib:
              <input
                type="number"
                className="input w-20"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value) || 0)}
              />
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) replaceFile(f);
              }}
            />
            <button
              type="button"
              className="btn-ghost text-sm"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? "Yuklanmoqda..." : "Rasmni almashtirish"}
            </button>
          </div>
          {msg && <p className="text-sm text-red-400">{msg}</p>}
          {dirty && (
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="btn-primary text-sm"
            >
              {busy ? "..." : "Saqlash"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function LandingPhoneSlideManager({ initial }: { initial: PhoneSlide[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [order, setOrder] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function addWithFile(file: File) {
    if (!title.trim() || !subtitle.trim()) {
      setMsg("Avval sarlavha va submatnni kiriting");
      return;
    }
    setUploading(true);
    setMsg(null);
    try {
      const { imageUrl, imageKey } = await uploadImage(file);
      await fetch("/api/admin/landing-phone-slide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, subtitle, imageUrl, imageKey, order, active: true }),
      });
      setTitle("");
      setSubtitle("");
      setOrder(0);
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-dashed border-white/15 p-4">
        <div className="mb-3 text-sm font-medium text-white">
          Yangi slayd qo&apos;shish (telefon ekranidagi rasm + matn)
        </div>
        <div className="grid gap-3">
          <input
            className="input"
            placeholder="Sarlavha"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="input min-h-[64px]"
            placeholder="Submatn"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            Tartib:
            <input
              type="number"
              className="input w-20"
              value={order}
              onChange={(e) => setOrder(Number(e.target.value) || 0)}
            />
          </label>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) addWithFile(f);
          }}
        />
        <button
          type="button"
          className="btn-primary mt-3 text-sm"
          disabled={uploading || !title.trim() || !subtitle.trim()}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? "Yuklanmoqda..." : "Rasm tanlash va qo'shish"}
        </button>
        {msg && <p className="mt-2 text-sm text-red-400">{msg}</p>}
      </div>

      <div className="text-xs text-zinc-600">
        {initial.length} ta slayd · landingda &quot;Ilovani yuklab olish&quot;
        bo&apos;limidan oldin scroll bilan almashadi
      </div>

      {initial.map((s) => (
        <Row key={s.id} s={s} />
      ))}
    </div>
  );
}
