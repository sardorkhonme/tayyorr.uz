"use client";

import { useRef, useState } from "react";
import { uploadFile } from "@/lib/upload-client";
import { useFlashState } from "@/components/flash-status";

export function AvatarUpload({
  value,
  onChange,
}: {
  value?: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useFlashState<string | null>(null);

  async function handle(file: File) {
    setErr(null);
    if (file.size > 5 * 1024 * 1024) {
      setErr("Rasm hajmi 5MB dan oşmasin");
      return;
    }
    setBusy(true);
    try {
      const res = await uploadFile(file, "AVATAR");
      if (res.publicUrl) onChange(res.publicUrl);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="h-20 w-20 overflow-hidden rounded-full border border-white/10 bg-white/5">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="avatar" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">
            rasm yöq
          </div>
        )}
      </div>
      <div>
        <button
          type="button"
          className="btn-ghost"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? "Yuklanmoqda..." : "Rasm tanlaş"}
        </button>
        {err && <p className="flash-status mt-1 text-xs text-red-400">{err}</p>}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handle(f);
          }}
        />
      </div>
    </div>
  );
}
