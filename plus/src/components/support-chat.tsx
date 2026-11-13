"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { ChatFileView, type ChatFile } from "@/components/chat-file";
import { Icon } from "@/components/icons";
import { Linkify } from "@/components/linkify";
import { REACTION_EMOJIS, toggleReaction, type ReactionChip } from "@/lib/reaction-emojis";
import { SAFETY_POLL_MS, useRealtime } from "@/lib/use-realtime";

type Msg = {
  id: string;
  mine: boolean;
  body: string;
  createdAt: string;
  file?: ChatFile | null;
  fileAt?: number;
  reactions?: ReactionChip[];
  replyTo?: { id: string; body: string; mine: boolean } | null;
};

/** Xabar menyusi (⋮): reaksiyalar + amallar. body'ga portal — popup/aylantirish ichida kesilmaydi, ekrandan çiqmaydi. */
function MessageMenu({
  anchor,
  msg,
  onReact,
  onReply,
  onClose,
}: {
  anchor: DOMRect;
  msg: Msg;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad = 8;
    // gorizontal: tugma tomonga qarab, ekran ichida
    let left = msg.mine ? anchor.right - w : anchor.left;
    left = Math.max(pad, Math.min(left, vw - w - pad));
    // vertikal: pastda joy bo'lsa — pastga, aks holda tepaga; baribir ekran ichida
    let top = anchor.bottom + 6;
    if (top + h > vh - pad) top = anchor.top - h - 6;
    top = Math.max(pad, Math.min(top, vh - h - pad));
    setPos({ left, top });
  }, [anchor, msg.mine]);
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node) && !(e.target as Element).closest?.("[data-msg-menu-btn]")) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onScroll = () => onClose();
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onScroll);
    };
  }, [onClose]);
  const item = "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium text-zinc-700 transition hover:bg-zinc-100";
  return createPortal(
    <div
      ref={ref}
      data-msg-menu
      style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999 }}
      className="fixed z-[200] w-[224px] rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-xl shadow-zinc-900/15"
    >
      <div className="grid grid-cols-5 gap-0.5">
        {REACTION_EMOJIS.map((e) => {
          const on = msg.reactions?.some((r) => r.mine && r.emoji === e);
          return (
            <button
              key={e}
              type="button"
              onClick={() => onReact(e)}
              aria-label={e}
              className={`grid h-9 w-full place-items-center rounded-xl text-xl transition hover:scale-110 hover:bg-zinc-100 ${on ? "bg-indigo-100" : ""}`}
            >
              {e}
            </button>
          );
        })}
      </div>
      <div className="my-1.5 h-px bg-zinc-100" />
      <button type="button" className={item} onClick={onReply}>
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-zinc-500" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 14 4 9l5-5" />
          <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
        </svg>
        Javob beriş
      </button>
      {!!msg.body && (
        <button
          type="button"
          className={item}
          onClick={() => {
            void navigator.clipboard?.writeText(msg.body).catch(() => {});
            onClose();
          }}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-zinc-500" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <rect x="8.5" y="8.5" width="11" height="11" rx="2.5" />
            <path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2" />
          </svg>
          Nusxa oliş
        </button>
      )}
    </div>,
    document.body,
  );
}

/** Fayl havolasi 1 soat amal qiladi — 45 daqiqagacha eskisini ishlatamiz. */
const FILE_URL_TTL = 45 * 60 * 1000;

/**
 * Server har so'rovda faylga yangi vaqtinchalik havola beradi. Havola o'zgarsa brauzer rasm/video/audioni
 * qaytadan yuklaydi (ijro boshidan boshlanadi) — shuning uchun mavjud xabarning havolasini saqlab qolamiz.
 */
function keepFileUrls(prev: Msg[], next: Msg[]): Msg[] {
  const old = new Map(prev.map((m) => [m.id, m]));
  const now = Date.now();
  return next.map((m) => {
    if (!m.file) return m;
    const o = old.get(m.id);
    if (o?.file && o.fileAt && now - o.fileAt < FILE_URL_TTL) return { ...m, file: o.file, fileAt: o.fileAt };
    return { ...m, fileAt: now };
  });
}

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
  // ⋮ menyusi ochiq xabar (reaksiyalar + javob)
  const [menu, setMenu] = useState<{ id: string; rect: DOMRect } | null>(null);
  const closeMenu = useCallback(() => setMenu(null), []);
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
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
    if (res?.ok && data) setMsgs((prev) => keepFileUrls(prev, data.messages ?? []));
  }, [loggedIn]);

  // real-time: yangi javob kelsa darhol
  const live = useRealtime((e) => {
    if (e.name === "chat") void load();
  });

  // ochiq chat: 3 soniyada (real-time ulangan bo'lsa — faqat ehtiyot uchun) + yorliqqa qaytganda darhol
  useEffect(() => {
    load();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, live ? SAFETY_POLL_MS : 3000);
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [load, live]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs.length]);

  /** Reaksiya: o'sha emoji qayta bosilsa — olib tashlanadi, boshqasi — almashadi. */
  async function react(m: Msg, emoji: string) {
    setMenu(null);
    setMsgs((list) => list.map((x) => (x.id === m.id ? { ...x, reactions: toggleReaction(x.reactions, emoji) } : x)));
    const res = await fetch("/api/support/react", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messageId: m.id, emoji }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok && data?.reactions) {
      setMsgs((list) => list.map((x) => (x.id === m.id ? { ...x, reactions: data.reactions } : x)));
    } else void load();
  }

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
      if (replyTo) form.append("replyToId", replyTo.id);
      form.append("file", await shrinkImage(image.file));
      req = { method: "POST", body: form };
    } else {
      req = { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: body, replyToId: replyTo?.id ?? null }) };
    }
    const res = await fetch("/api/support", req).catch(() => null);
    const data = await res?.json().catch(() => null);
    setSending(false);
    if (!res?.ok) return setError(data?.error ?? "Yuborilmadi, qayta urinib köring");
    setText("");
    setImage(null);
    setReplyTo(null);
    setMsgs((m) => [...m, { ...data.message, fileAt: Date.now() }]);
  }

  return (
    <div className={`flex flex-col overflow-hidden bg-white ${className}`}>
      {/* sarlavha: telefon sahifasida (closable) — ilovadagi headerlar kabi alohida şişa kapsulalar */}
      {closable ? (
        <div className="m-header-fade z-[2] flex h-14 shrink-0 items-center gap-2 px-3 pb-1 pt-[max(0.75rem,env(safe-area-inset-top))] box-content">
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
            aria-label="Orqaga"
            className="glass grid h-12 w-12 shrink-0 place-items-center rounded-full text-zinc-900 transition active:scale-95"
          >
            <Icon name="arrow-left" className="h-5 w-5" strokeWidth={2.2} />
          </button>
          <span className="glass grid h-12 w-12 shrink-0 place-items-center rounded-full text-indigo-600">
            <Icon name="headset" className="h-5 w-5" />
          </span>
          <div className="glass flex h-12 min-w-0 flex-1 flex-col justify-center rounded-full px-4">
            <p className="truncate font-display text-[15px] font-semibold leading-tight text-zinc-900">tayyorr support</p>
            <p className="flex items-center gap-1.5 truncate text-[11.5px] leading-tight text-zinc-500">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" /> Odatda bir neça daqiqada javob beramiz
            </p>
          </div>
        </div>
      ) : (
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
      )}

      {loggedIn ? (
        <>
          <div ref={listRef} onScroll={closeMenu} className="flex-1 space-y-2.5 overflow-y-auto px-4 py-4">
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
              <div key={m.id} id={`sm-${m.id}`} className={`group relative flex items-end gap-1 ${m.mine ? "flex-row-reverse" : ""}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[15px] leading-relaxed shadow-sm ${
                    m.mine
                      ? "rounded-br-md bg-gradient-to-br from-indigo-500 to-violet-500 text-white"
                      : "rounded-bl-md border border-zinc-100 bg-white text-zinc-800"
                  }`}
                >
                  {m.replyTo && (
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById(`sm-${m.replyTo!.id}`);
                        el?.scrollIntoView({ behavior: "smooth", block: "center" });
                        el?.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 700 });
                      }}
                      className={`mb-1.5 block w-full rounded-lg border-l-[3px] px-2 py-1 text-left text-xs ${
                        m.mine ? "border-white/70 bg-white/15 text-indigo-50" : "border-indigo-400 bg-indigo-50 text-zinc-600"
                      }`}
                    >
                      <span className={`block font-semibold ${m.mine ? "text-white" : "text-indigo-600"}`}>
                        {m.replyTo.mine ? "Siz" : "tayyorr support"}
                      </span>
                      <span className="line-clamp-2 break-words">{m.replyTo.body}</span>
                    </button>
                  )}
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
                  {!!m.reactions?.length && (
                    <div className="-mx-1 mt-1 flex flex-wrap gap-1">
                      {m.reactions.map((r) => (
                        <button
                          key={r.emoji}
                          type="button"
                          onClick={() => react(m, r.emoji)}
                          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-sm transition ${
                            r.mine
                              ? m.mine
                                ? "bg-white/30 ring-1 ring-white/60"
                                : "bg-indigo-100 ring-1 ring-indigo-300"
                              : m.mine
                                ? "bg-white/15 hover:bg-white/25"
                                : "bg-zinc-100 hover:bg-zinc-200"
                          }`}
                        >
                          <span>{r.emoji}</span>
                          <span className={`text-xs font-semibold ${m.mine ? "text-white" : "text-zinc-600"}`}>{r.count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  data-msg-menu-btn
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setMenu((v) => (v?.id === m.id ? null : { id: m.id, rect }));
                  }}
                  aria-label="Amallar"
                  title="Reaksiya, javob"
                  className={`grid h-7 w-7 shrink-0 place-items-center self-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 ${
                    menu?.id === m.id ? "bg-zinc-100 opacity-100" : "opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
                  }`}
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                    <circle cx="12" cy="5.5" r="1.7" />
                    <circle cx="12" cy="12" r="1.7" />
                    <circle cx="12" cy="18.5" r="1.7" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {menu &&
            (() => {
              const m = msgs.find((x) => x.id === menu.id);
              return m ? (
                <MessageMenu
                  anchor={menu.rect}
                  msg={m}
                  onClose={closeMenu}
                  onReact={(e) => react(m, e)}
                  onReply={() => {
                    setReplyTo(m);
                    setMenu(null);
                    inputRef.current?.focus();
                  }}
                />
              ) : null;
            })()}

          <form onSubmit={send} className="border-t border-zinc-100 bg-white p-3">
            {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
            {replyTo && (
              <div className="mb-2 flex items-center gap-2 rounded-xl border-l-[3px] border-indigo-400 bg-indigo-50 py-1.5 pl-2.5 pr-1.5">
                <span className="min-w-0 flex-1 text-xs">
                  <span className="block font-semibold text-indigo-600">{replyTo.mine ? "Öz xabaringizga javob" : "tayyorr supportʼga javob"}</span>
                  <span className="block truncate text-zinc-600">{replyTo.body || (replyTo.file ? `📎 ${replyTo.file.name}` : "Xabar")}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setReplyTo(null)}
                  aria-label="Javobni bekor qiliş"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-zinc-500 transition hover:bg-indigo-100"
                >
                  <Icon name="close" className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
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
                  if (e.key === "Escape" && replyTo) setReplyTo(null);
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(e);
                  }
                }}
                ref={inputRef}
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
