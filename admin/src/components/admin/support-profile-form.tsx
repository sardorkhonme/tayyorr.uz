"use client";

import { useEffect, useRef, useState } from "react";

export function SupportProfileForm() {
  const [name, setName] = useState("");
  const [about, setAbout] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/support-profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.profile) {
          setName(d.profile.name ?? "");
          setAbout(d.profile.about ?? "");
          setAvatarUrl(d.profile.avatarUrl ?? "");
        }
      })
      .catch(() => {});
  }, []);

  async function upload(file: File) {
    setUploading(true);
    setMsg(null);
    try {
      const pres = await fetch("/api/admin/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "AVATAR",
          filename: file.name,
          contentType: file.type || "image/png",
        }),
      });
      const p = await pres.json();
      if (!pres.ok) throw new Error(p.error);
      const put = await fetch(p.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "image/png" },
        body: file,
      });
      if (!put.ok) throw new Error("Yuklanmadi");
      setAvatarUrl(p.publicUrl);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/support-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || undefined,
          about: about || undefined,
          avatarUrl: avatarUrl || undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Xatolik");
      setMsg("Saqlandi");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="mb-3 font-semibold text-white">tayyorr.uz support profili</h2>
      <form onSubmit={save} className="flex flex-col gap-3">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 overflow-hidden rounded-full border border-white/10 bg-white/5">
            {avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
            }}
          />
          <button
            type="button"
            className="btn-ghost"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? "Yuklanmoqda..." : "Rasm tanlash"}
          </button>
        </div>
        <div>
          <label className="label">Nom</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Tavsif (ixtiyoriy)</label>
          <textarea
            className="input"
            rows={2}
            value={about}
            onChange={(e) => setAbout(e.target.value)}
          />
        </div>
        {msg && <p className="text-sm text-zinc-400">{msg}</p>}
        <button className="btn-primary w-fit" disabled={busy}>
          {busy ? "..." : "Saqlash"}
        </button>
      </form>
    </section>
  );
}
