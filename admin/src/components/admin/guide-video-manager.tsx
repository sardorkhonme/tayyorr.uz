"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Role = "ORDERER" | "PREPARER";

/** Qo'llanma videosi — bitta rol uchun: yuklash / almashtirish / olib tashlash. */
export function GuideVideoSlot({ role, title, url }: { role: Role; title: string; url: string | null }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setMsg(null);
    setProgress(0);
    try {
      const type = file.type || "video/mp4";
      const pres = await fetch("/api/admin/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "GUIDE_VIDEO", filename: file.name, contentType: type }),
      });
      const p = await pres.json();
      if (!pres.ok) throw new Error(p.error || "Yuklanmadi");
      // XHR — yuklash foizini ko'rsatish uchun (video katta bo'lishi mumkin)
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", p.uploadUrl);
        xhr.setRequestHeader("Content-Type", type);
        xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
        xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error("Video yuklanmadi")));
        xhr.onerror = () => reject(new Error("Video yuklanmadi"));
        xhr.send(file);
      });
      const res = await fetch("/api/admin/settings/guide-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, videoUrl: p.publicUrl, videoKey: p.key }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Saqlanmadi");
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBusy(false);
      setProgress(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function remove() {
    if (!confirm("Video olib taşlansinmi?")) return;
    setBusy(true);
    await fetch(`/api/admin/settings/guide-video?role=${role}`, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2">
        <p className="font-semibold text-white">{title}</p>
        <span className={`rounded-full px-2 py-0.5 text-xs ${url ? "bg-emerald-500/15 text-emerald-300" : "bg-zinc-500/15 text-zinc-400"}`}>
          {url ? "● Video bor" : "○ Video yöq"}
        </span>
      </div>
      {url ? (
        <video src={url} controls preload="metadata" className="max-h-80 w-full rounded-lg bg-black" />
      ) : (
        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-white/10 text-sm text-zinc-600">
          Video yuklanmagan — saytda faqat matnli qadamlar körinadi
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        hidden
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-40"
        >
          {progress != null ? `Yuklanmoqda… ${progress}%` : url ? "Videoni almaştiriş" : "Video yuklaş"}
        </button>
        {url && (
          <button
            type="button"
            disabled={busy}
            onClick={remove}
            className="rounded-lg bg-red-500/15 px-4 py-2 text-sm text-red-300 transition hover:bg-red-500/25 disabled:opacity-40"
          >
            Olib taşlaş
          </button>
        )}
        {msg && <span className="text-xs text-red-300">{msg}</span>}
      </div>
    </section>
  );
}
