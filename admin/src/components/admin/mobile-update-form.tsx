"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Icon } from "@/components/icons";
import { useFlashState } from "@/components/flash-status";

type Props = {
  latest: string;
  min: string;
  notes: string;
  apkUrl: string;
};

const APK_TYPE = "application/vnd.android.package-archive";

/** XHR — yuklash foizini ko'rsatish uchun (fetch progress bermaydi). */
function put(url: string, file: File, onProgress: (p: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open("PUT", url);
    x.setRequestHeader("Content-Type", APK_TYPE);
    x.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    x.onload = () => (x.status >= 200 && x.status < 300 ? resolve() : reject(new Error(`Yuklanmadi (${x.status})`)));
    x.onerror = () => reject(new Error("Tarmoq xatosi — qayta urinib köring"));
    x.send(file);
  });
}

/**
 * Android ilovasi yangilanishi: yangi APK yuklash, uning versiyasi, majburiy (minimal) versiya va "nima yangi".
 * Majburiy versiyadan eski ilovalar ochilganda "Yangilang" oynasi chiqadi va ishlamaydi.
 */
export function MobileUpdateForm({ latest, min, notes, apkUrl }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [ver, setVer] = useState(latest);
  const [minV, setMinV] = useState(min);
  const [text, setText] = useState(notes);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [msg, setMsg] = useFlashState<{ ok: boolean; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (file && !ver.trim()) {
      setMsg({ ok: false, text: "Yuklanayotgan APK versiyasini yozing (masalan 1.1)" });
      return;
    }
    setBusy(true);
    try {
      let apkKey: string | undefined;
      if (file) {
        const pre = await fetch("/api/admin/upload/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "APK", filename: file.name, contentType: APK_TYPE }),
        });
        const p = await pre.json();
        if (!pre.ok) throw new Error(p.error || "Yuklab bölmadi");
        setProgress(0);
        await put(p.uploadUrl, file, setProgress);
        apkKey = p.key;
      }
      const res = await fetch("/api/admin/mobile-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latest: ver, min: minV, notes: text, apkKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setMsg({ ok: true, text: "Saqlandi" });
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Xatolik" });
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div>
        <h2 className="flex items-center gap-2 font-semibold text-white">
          <Icon name="phone" className="h-[18px] w-[18px] text-indigo-300" />
          Ilova yangilanişi (Android)
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Versiya ikki raqamli: <b className="text-zinc-300">1.1, 1.2, 1.3…</b> — birinçisi katta yangilanish, ikkinçisi
          kiçik. Avval yangi APK ni yuklang, keyin «Majburiy versiya» ni ham şunga qöying — eskirgan ilovalarda
          «Yangilaş» oynasi çiqadi va ilova yangilanmagunça işlamaydi.
        </p>
        {latest && (
          <p className="mt-2 text-xs text-zinc-400">
            Hozirgi APK: <b className="text-zinc-200">v{latest}</b> ·{" "}
            <a href={apkUrl} className="text-indigo-400 hover:underline">
              yuklab oliş
            </a>
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="label">Yangi APK fayli (ixtiyoriy)</span>
          <input
            ref={fileRef}
            type="file"
            accept=".apk,application/vnd.android.package-archive"
            className="input file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1 file:text-zinc-200"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">Şu APK versiyasi</span>
          <input className="input font-mono" placeholder="1.1" maxLength={6} value={ver} onChange={(e) => setVer(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">Majburiy versiya (bundan eskisi işlamaydi)</span>
          <input
            className="input font-mono"
            placeholder="böş — majburiy emas"
            maxLength={6}
            value={minV}
            onChange={(e) => setMinV(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="label">Nima yangi (ilovadagi oynada körinadi, ixtiyoriy)</span>
          <textarea className="input" rows={3} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={busy}>
          {busy ? (progress !== null ? `Yuklanmoqda… ${progress}%` : "...") : "Saqlaş"}
        </button>
        {msg && <span className={`flash-status text-sm ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</span>}
      </div>
    </form>
  );
}
