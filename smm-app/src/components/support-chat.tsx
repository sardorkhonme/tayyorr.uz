"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { ChatFileView, type ChatFile } from "@/components/chat-file";
import { Icon } from "@/components/icons";
import { Linkify } from "@/components/linkify";

type Msg = { id: string; mine: boolean; body: string; createdAt: string; file?: ChatFile | null };

/** Rasmni yuborishdan oldin kichraytiradi (uzun tomoni 1920px, JPEG) — tez yuklansin va 4 MB dan oshmasin. */
async function shrinkImage(file: File): Promise<File> {
  if (file.type === "image/gif" && file.size <= 4 * 1024 * 1024) return file;
  if (file.size <= 600 * 1024 && ["image/jpeg", "image/png", "image/webp"].includes(file.type)) return file;
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 1920 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * k);
    canvas.height = Math.round(bmp.height * k);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

const timeFmt = new Intl.DateTimeFormat("ru-RU", { timeZone: "Asia/Tashkent", hour: "2-digit", minute: "2-digit" });

/**
 * Support chati (sarlavha, xabarlar, yozish maydoni). Kompyuterda popup ichida,
 * telefonda alohida /support sahifasida ishlatiladi. Ochiq turganda har 3 soniyada
 * yangilanadi va support javoblari o'qilgan deb belgilanadi.
 * Xabarlar tayyorr.uz admin paneliga ("tayyorr.uz support") boradi.
 */
export function SupportChat({
  loggedIn,
  className = "",
  autoFocus = false,
  closable = false,
}: {
  loggedIn: boolean;
  className?: string;
  /** popupda — darhol yozish; telefon sahifasida klaviatura o'zi ochilmasin */
  autoFocus?: boolean;
  /** /support sahifasida — sarlavhada chiqish (✕) tugmasi */
  closable?: boolean;
}) {
  const router = useRouter();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // tanlangan rasm (yuborishdan oldin ko'rinadi)
  const [image, setImage] = useState<{ file: File; preview: string } | null>(null);
  useEffect(() => () => {
    if (image) URL.revokeObjectURL(image.preview);
  }, [image]);

  function pickImage(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith("image/")) return setError("Faqat rasm yuboriş mumkin");
    setError("");
    setImage({ file: f, preview: URL.createObjectURL(f) });
  }

  const load = useCallback(async () => {
    if (!loggedIn) return;
    const res = await fetch("/api/support?open=1", { cache: "no-store" }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok && data) setMsgs(data.messages ?? []);
  }, [loggedIn]);

  // ochiq chat: 3 soniyada + yorliqqa qaytganda darhol (tayyorr.uz chati kabi)
  useEffect(() => {
    load();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 3000);
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [load]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if ((!body && !image) || sending) return;
    setSending(true);
    setError("");
    let req: RequestInit;
    if (image) {
      const form = new FormData();
      form.append("text", body);
      form.append("file", await shrinkImage(image.file));
      req = { method: "POST", body: form };
    } else {
      req = { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: body }) };
    }
    const res = await fetch("/api/support", req).catch(() => null);
    const data = await res?.json().catch(() => null);
    setSending(false);
    if (!res?.ok) return setError(data?.error ?? "Yuborilmadi, qayta urinib köring");
    setText("");
    setImage(null);
    setMsgs((m) => [...m, data.message]);
  }

  return (
    <div className={`flex flex-col overflow-hidden bg-white ${className}`}>
      {/* sarlavha */}
      <div className="shine flex items-center gap-3 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-5 py-4 text-white">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-white/20">
          <Icon name="headset" className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display font-semibold">tayyorr support</p>
          <p className="flex items-center gap-1.5 text-xs text-indigo-100">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Odatda bir neça daqiqada javob beramiz
          </p>
        </div>
        {closable && (
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
            aria-label="Supportdan çiqiş"
            className="relative z-[2] grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15 transition hover:bg-white/25"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        )}
      </div>

      {loggedIn ? (
        <>
          <div ref={listRef} className="flex-1 space-y-2.5 overflow-y-auto px-4 py-4">
            {msgs.length === 0 && (
              <div className="mx-auto mt-6 max-w-[260px] text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-500">
                  <Icon name="message" className="h-6 w-6" />
                </span>
                <p className="mt-3 font-semibold text-zinc-900">Savolingiz bormi?</p>
                <p className="mt-1 text-sm text-zinc-500">
                  Buyurtma, tölov yoki boşqa masala böyiça yozing — yordam beramiz.
                </p>
              </div>
            )}
            {msgs.map((m) => (
              <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[15px] leading-relaxed shadow-sm ${
                    m.mine
                      ? "rounded-br-md bg-gradient-to-br from-indigo-500 to-violet-500 text-white"
                      : "rounded-bl-md border border-zinc-100 bg-white text-zinc-800"
                  }`}
                >
                  {m.file && (
                    <div className={m.body ? "-mx-1.5 -mt-0.5 mb-1.5" : "-mx-1.5 -mt-0.5"}>
                      <ChatFileView file={m.file} mine={m.mine} />
                    </div>
                  )}
                  {m.body && (
                    <p className="whitespace-pre-wrap break-words">
                      <Linkify text={m.body} mine={m.mine} />
                    </p>
                  )}
                  <p className={`mt-0.5 text-right text-[10px] ${m.mine ? "text-indigo-100" : "text-zinc-400"}`}>
                    {timeFmt.format(new Date(m.createdAt))}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={send} className="border-t border-zinc-100 bg-white p-3">
            {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
            {image && (
              <div className="mb-2 flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.preview} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-zinc-800">{image.file.name}</span>
                  <span className="block text-xs text-zinc-500">{sending ? "Yuborilmoqda…" : "Izoh yozişingiz mumkin"}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setImage(null)}
                  disabled={sending}
                  aria-label="Rasmni olib taşlaş"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-zinc-500 transition hover:bg-zinc-200"
                >
                  <Icon name="close" className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  pickImage(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={sending}
                aria-label="Rasm yuboriş"
                title="Rasm yuboriş"
                className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-500 transition hover:border-indigo-200 hover:text-indigo-600"
              >
                <Icon name="image" className="h-5 w-5" />
              </button>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onPaste={(e) => {
                  // nusxalangan rasmni (Ctrl+V) ham yuborish mumkin
                  const f = [...e.clipboardData.files].find((x) => x.type.startsWith("image/"));
                  if (f) {
                    e.preventDefault();
                    pickImage(f);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(e);
                  }
                }}
                rows={1}
                maxLength={2000}
                placeholder="Xabar yozing…"
                className="input max-h-28 min-h-[46px] flex-1 resize-none !py-3"
                autoFocus={autoFocus}
              />
              <button
                className="btn-primary grid h-[46px] w-[46px] shrink-0 !p-0"
                disabled={sending || (!text.trim() && !image)}
                aria-label="Yuboriş"
              >
                <Icon name="send" className="h-5 w-5" />
              </button>
            </div>
          </form>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-500">
            <Icon name="message" className="h-7 w-7" />
          </span>
          <p className="mt-4 font-semibold text-zinc-900">Yoziş uçun hisobga kiring</p>
          <p className="mt-1 text-sm text-zinc-500">Javobni şu yerda körasiz.</p>
          <div className="mt-6 flex w-full flex-col gap-2">
            <Link href="/login" className="btn-primary !py-3">Kiriş</Link>
            <Link href="/register" className="btn-ghost !py-3">Röyxatdan ötiş</Link>
          </div>
        </div>
      )}
    </div>
  );
}
