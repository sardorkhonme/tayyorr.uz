"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PowerIcon } from "@/components/icons";

export function HeroVideoManager({
  initialUrl,
  initialActive,
}: {
  initialUrl: string;
  initialActive: boolean;
}) {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl);
  const [active, setActive] = useState(initialActive);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setUploading(true);
    setMsg(null);
    try {
      const pres = await fetch("/api/admin/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "HERO_VIDEO",
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
      await fetch("/api/admin/hero-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl: p.publicUrl, videoKey: p.key }),
      });
      setUrl(p.publicUrl);
      setActive(true);
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function remove() {
    if (!confirm("Hero fon videosi o'chirilsinmi?")) return;
    setBusy(true);
    await fetch("/api/admin/hero-video", { method: "DELETE" });
    setUrl("");
    setBusy(false);
    router.refresh();
  }

  async function toggle() {
    setBusy(true);
    const next = !active;
    await fetch("/api/admin/hero-video", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: next }),
    });
    setActive(next);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-dashed border-white/15 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-medium text-white">
          Hero fon videosi (bosh sahifa, sarlavha ortida)
        </div>
        {url && (
          <button
            type="button"
            onClick={toggle}
            disabled={busy}
            title={active ? "O'chirish (nofaol qilish)" : "Yoqish (faollashtirish)"}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${
              active
                ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                : "bg-zinc-500/15 text-zinc-400 hover:bg-zinc-500/25"
            }`}
          >
            <PowerIcon className="h-3.5 w-3.5" />
            {active ? "Faol" : "Nofaol"}
          </button>
        )}
      </div>
      <p className="mb-3 text-xs text-zinc-500">
        Sahifaning eng yuqorisida, sarlavha matni ortida aylanib turadigan
        fon video. Kompyuterda o&apos;ng chetga, telefonda pastga qarab
        xiralashib fonga singib ketadi. Faqat o&apos;chirmasdan vaqtincha
        yashirish uchun yuqoridagi tugmadan foydalaning.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="w-full max-w-[10rem] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/40">
          {url ? (
            <video src={url} className="aspect-video w-full object-cover" muted />
          ) : (
            <div className="flex aspect-video items-center justify-center text-xs text-zinc-600">
              video yo&apos;q
            </div>
          )}
        </div>
        <div className="flex-1 space-y-3">
          <input
            ref={fileRef}
            type="file"
            accept="video/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
            }}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary text-sm"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? "Yuklanmoqda..." : url ? "Videoni almashtirish" : "Video yuklash"}
            </button>
            {url && (
              <button
                type="button"
                className="rounded-full bg-red-500/15 px-3 py-1.5 text-sm text-red-300 hover:bg-red-500/25"
                disabled={busy}
                onClick={remove}
              >
                O&apos;chirish
              </button>
            )}
          </div>
          {msg && <p className="text-sm text-red-400">{msg}</p>}
        </div>
      </div>
    </div>
  );
}
