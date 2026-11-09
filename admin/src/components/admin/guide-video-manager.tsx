"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Role = "ORDERER" | "PREPARER";
export type AdminGuideVideo = { id: string; title: string; url: string };

/** R2 ga yuklash (XHR — foizni ko'rsatish uchun; video katta bo'lishi mumkin). */
async function uploadVideo(file: File, onProgress: (p: number) => void) {
  const type = file.type || "video/mp4";
  const pres = await fetch("/api/admin/upload/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "GUIDE_VIDEO", filename: file.name, contentType: type }),
  });
  const p = await pres.json();
  if (!pres.ok) throw new Error(p.error || "Yuklanmadi");
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", p.uploadUrl);
    xhr.setRequestHeader("Content-Type", type);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error("Video yuklanmadi")));
    xhr.onerror = () => reject(new Error("Video yuklanmadi"));
    xhr.send(file);
  });
  return { videoUrl: p.publicUrl as string, videoKey: p.key as string };
}

async function api(method: string, body?: object, qs = "") {
  const res = await fetch(`/api/admin/settings/guide-video${qs}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Saqlanmadi");
}

function Row({ role, v, index, total }: { role: Role; v: AdminGuideVideo; index: number; total: number }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(v.title);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBusy(false);
      setProgress(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/10 p-3 sm:flex-row">
      <video src={v.url} controls preload="metadata" className="aspect-video w-full shrink-0 rounded-lg bg-black sm:w-56" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-500">#{index + 1}</span>
          <input className="input flex-1" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sarlavha" />
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) run(async () => api("PATCH", { role, id: v.id, ...(await uploadVideo(f, setProgress)) }));
          }}
        />
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          {title.trim() !== v.title && (
            <button
              type="button"
              disabled={busy || !title.trim()}
              onClick={() => run(() => api("PATCH", { role, id: v.id, title: title.trim() }))}
              className="rounded-lg bg-indigo-500 px-3 py-1.5 font-semibold text-white disabled:opacity-40"
            >
              Saqlaş
            </button>
          )}
          <button type="button" disabled={busy || index === 0} onClick={() => run(() => api("PATCH", { role, id: v.id, move: "up" }))} className="rounded-lg bg-white/5 px-2.5 py-1.5 text-zinc-300 hover:bg-white/10 disabled:opacity-30" title="Yuqoriga">↑</button>
          <button type="button" disabled={busy || index === total - 1} onClick={() => run(() => api("PATCH", { role, id: v.id, move: "down" }))} className="rounded-lg bg-white/5 px-2.5 py-1.5 text-zinc-300 hover:bg-white/10 disabled:opacity-30" title="Pastga">↓</button>
          <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="rounded-lg bg-white/5 px-3 py-1.5 text-zinc-300 hover:bg-white/10 disabled:opacity-40">
            {progress != null ? `Yuklanmoqda… ${progress}%` : "Faylni almaştiriş"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => confirm("Video öçirilsinmi?") && run(() => api("DELETE", undefined, `?role=${role}&id=${encodeURIComponent(v.id)}`))}
            className="ml-auto rounded-lg bg-red-500/15 px-3 py-1.5 text-red-300 hover:bg-red-500/25 disabled:opacity-40"
          >
            Öçiriş
          </button>
        </div>
        {msg && <span className="text-xs text-red-300">{msg}</span>}
      </div>
    </div>
  );
}

/** Bitta rol uchun qo'llanma videolari ro'yxati + yangi video qo'shish. */
export function GuideVideoList({ role, title, videos }: { role: Role; title: string; videos: AdminGuideVideo[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [newTitle, setNewTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function add() {
    if (!file || !newTitle.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const up = await uploadVideo(file, setProgress);
      await api("POST", { role, title: newTitle.trim(), ...up });
      setNewTitle("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2">
        <p className="font-semibold text-white">{title}</p>
        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-zinc-400">{videos.length} ta video</span>
      </div>

      {videos.length === 0 && (
        <p className="rounded-lg border border-dashed border-white/10 p-4 text-center text-sm text-zinc-600">
          Hali video yöq — saytda faqat matnli qadamlar körinadi
        </p>
      )}
      {videos.map((v, i) => (
        <Row key={v.id + v.url} role={role} v={v} index={i} total={videos.length} />
      ))}

      {/* yangi video */}
      <div className="flex flex-col gap-2 rounded-xl border border-indigo-400/20 bg-indigo-500/5 p-3">
        <p className="text-sm font-medium text-zinc-300">Yangi video qöşiş</p>
        <input className="input" placeholder="Sarlavha, masalan: «Buyurtma qanday beriladi»" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
        <input ref={fileRef} type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="rounded-lg bg-white/5 px-3 py-2 text-sm text-zinc-300 hover:bg-white/10">
            {file ? `🎬 ${file.name}` : "Video fayl tanlaş"}
          </button>
          <button
            type="button"
            disabled={busy || !file || !newTitle.trim()}
            onClick={add}
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-40"
          >
            {progress != null ? `Yuklanmoqda… ${progress}%` : "Qöşiş"}
          </button>
          {msg && <span className="text-xs text-red-300">{msg}</span>}
        </div>
      </div>
    </section>
  );
}
