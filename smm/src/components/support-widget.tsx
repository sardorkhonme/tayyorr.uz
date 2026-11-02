"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Icon } from "@/components/icons";

type Msg = { id: string; mine: boolean; body: string; createdAt: string };

const timeFmt = new Intl.DateTimeFormat("ru-RU", { timeZone: "Asia/Tashkent", hour: "2-digit", minute: "2-digit" });

/**
 * Pastki o'ng burchakdagi support tugmasi → blur fondagi chat oynasi.
 * Xabarlar tayyorr.uz admin paneliga ("tayyorr.uz support") boradi.
 */
export function SupportWidget({ loggedIn }: { loggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [unread, setUnread] = useState(0);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const load = useCallback(
    async (markRead: boolean) => {
      if (!loggedIn) return;
      const res = await fetch(`/api/support${markRead ? "?open=1" : ""}`, { cache: "no-store" }).catch(() => null);
      const data = await res?.json().catch(() => null);
      if (!res?.ok || !data) return;
      setUnread(data.unread ?? 0);
      if (markRead) setMsgs(data.messages ?? []);
    },
    [loggedIn],
  );

  // yopiq: 30 soniyada bir yangi javob bormi; ochiq: har 4 soniyada suhbat
  useEffect(() => {
    load(open);
    const id = setInterval(() => load(open), open ? 4000 : 30000);
    return () => clearInterval(id);
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs.length, open]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError("");
    const res = await fetch("/api/support", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: body }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setSending(false);
    if (!res?.ok) return setError(data?.error ?? "Yuborilmadi, qayta urinib ko'ring");
    setText("");
    setMsgs((m) => [...m, data.message]);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Yordam (support)"
        className="fixed bottom-5 right-5 z-[45] grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-xl shadow-violet-500/40 transition hover:shadow-2xl hover:shadow-fuchsia-500/40"
      >
        <Icon name={open ? "close" : "headset"} className="h-6 w-6" />
        {!open && unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[11px] font-bold ring-2 ring-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[44]">
            <div className="absolute inset-0 bg-zinc-900/20 backdrop-blur-md" onClick={() => setOpen(false)} />
            <div
              role="dialog"
              aria-label="Support chati"
              className="animate-pop absolute bottom-24 right-3 flex h-[min(560px,calc(100dvh-8rem))] w-[min(390px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-3xl border border-white/60 bg-white/85 shadow-2xl backdrop-blur-2xl sm:right-5"
            >
              {/* sarlavha */}
              <div className="flex items-center gap-3 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-5 py-4 text-white">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-white/20">
                  <Icon name="headset" className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display font-semibold">tayyorr support</p>
                  <p className="flex items-center gap-1.5 text-xs text-indigo-100">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Odatda bir necha daqiqada javob beramiz
                  </p>
                </div>
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
                          Buyurtma, to&apos;lov yoki boshqa masala bo&apos;yicha yozing — yordam beramiz.
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
                          <p className="whitespace-pre-wrap break-words">{m.body}</p>
                          <p className={`mt-0.5 text-right text-[10px] ${m.mine ? "text-indigo-100" : "text-zinc-400"}`}>
                            {timeFmt.format(new Date(m.createdAt))}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={send} className="border-t border-zinc-100 bg-white/90 p-3">
                    {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
                    <div className="flex items-end gap-2">
                      <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
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
                        autoFocus
                      />
                      <button
                        className="btn-primary grid h-[46px] w-[46px] shrink-0 !p-0"
                        disabled={sending || !text.trim()}
                        aria-label="Yuborish"
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
                  <p className="mt-4 font-semibold text-zinc-900">Yozish uchun hisobga kiring</p>
                  <p className="mt-1 text-sm text-zinc-500">Javobni shu yerda va tayyorr.uz da ko&apos;rasiz.</p>
                  <div className="mt-6 flex w-full flex-col gap-2">
                    <Link href="/login" className="btn-primary !py-3">Kirish</Link>
                    <Link href="/register" className="btn-ghost !py-3">Ro&apos;yxatdan o&apos;tish</Link>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
