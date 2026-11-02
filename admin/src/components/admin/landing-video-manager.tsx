"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export interface Video {
  id: string;
  title: string;
  videoUrl: string;
  videoKey: string;
  order: number;
  active: boolean;
}

async function uploadVideo(file: File): Promise<{ videoUrl: string; videoKey: string }> {
  const pres = await fetch("/api/admin/upload/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: "LANDING_VIDEO",
      filename: file.name,
      contentType: file.type || "video/mp4",
    }),
  });
  const p = await pres.json();
  if (!pres.ok) throw new Error(p.error || "Yuklanmadi");
  const put = await fetch(p.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "video/mp4" },
    body: file,
  });
  if (!put.ok) throw new Error("Video yuklanmadi");
  return { videoUrl: p.publicUrl, videoKey: p.key };
}

function Row({ v }: { v: Video }) {
  const router = useRouter();
  const [title, setTitle] = useState(v.title);
  const [order, setOrder] = useState(v.order);
  const [active, setActive] = useState(v.active);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const dirty = title !== v.title || order !== v.order || active !== v.active;

  async function save() {
    setBusy(true);
    await fetch(`/api/admin/landing-video/${v.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, order, active }),
    });
    setBusy(false);
    router.refresh();
  }
  async function toggle() {
    setBusy(true);
    await fetch(`/api/admin/landing-video/${v.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    setActive((a) => !a);
    setBusy(false);
    router.refresh();
  }
  async function del() {
    if (!confirm("Video o'chirilsinmi?")) return;
    setBusy(true);
    await fetch(`/api/admin/landing-video/${v.id}`, { method: "DELETE" });
    router.refresh();
  }
  async function replaceFile(file: File) {
    setUploading(true);
    setMsg(null);
    try {
      const { videoUrl, videoKey } = await uploadVideo(file);
      await fetch(`/api/admin/landing-video/${v.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl, videoKey }),
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
        <div className="w-full max-w-[10rem] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/40">
          {v.videoUrl ? (
            <video src={v.videoUrl} className="aspect-[9/16] w-full object-cover" muted />
          ) : (
            <div className="flex aspect-[9/16] items-center justify-center text-xs text-zinc-600">
              video yo&apos;q
            </div>
          )}
        </div>
        <div className="flex-1 space-y-3">
          <input
            className="input"
            placeholder="Video matni (sarlavha)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
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
              accept="video/*"
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
              {uploading ? "Yuklanmoqda..." : "Videoni almashtirish"}
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

export function LandingVideoManager({ initial }: { initial: Video[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [order, setOrder] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function addWithFile(file: File) {
    if (!title.trim()) {
      setMsg("Avval video matnini kiriting");
      return;
    }
    setUploading(true);
    setMsg(null);
    try {
      const { videoUrl, videoKey } = await uploadVideo(file);
      await fetch("/api/admin/landing-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, videoUrl, videoKey, order, active: true }),
      });
      setTitle("");
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
          Yangi video qo&apos;shish (tavsiya: 4 tagacha)
        </div>
        <div className="grid gap-3">
          <input
            className="input"
            placeholder="Video matni (sarlavha)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
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
          accept="video/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) addWithFile(f);
          }}
        />
        <button
          type="button"
          className="btn-primary mt-3 text-sm"
          disabled={uploading || !title.trim()}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? "Yuklanmoqda..." : "Video tanlash va qo'shish"}
        </button>
        {msg && <p className="mt-2 text-sm text-red-400">{msg}</p>}
      </div>

      <div className="text-xs text-zinc-600">
        {initial.length} ta video · landing sahifada "chiroyli grid"da
        chiqadi
      </div>

      {initial.map((v) => (
        <Row key={v.id} v={v} />
      ))}
    </div>
  );
}
