"use client";

import { playSent } from "@/components/send-sound";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { ChatFileView, humanSize } from "@/components/chat-file";
import { Linkify } from "@/components/linkify";
import { Icon } from "@/components/icons";
import { AutoTextarea } from "@/components/admin/auto-textarea";
import { useDismiss } from "@/components/use-dismiss";
import { flashMessage } from "@/lib/flash-message";
import { shortDate } from "@/lib/date";
import { prepareFamilyFile, type PreparedChatFile } from "@/lib/upload-client";
import { useFlashState } from "@/components/flash-status";
import { FloatingStack, ScrollDownButton, useScrollDown } from "@/components/scroll-down";
import { useChatMemory, useEnterAnim } from "@/components/chat-memory";

/** Ilova bilan bir xil reaksiyalar (lib/family.ts → FAMILY_EMOJIS). */
const EMOJIS = ["👍", "👎", "❤️", "😂", "😮", "😢", "😡", "🔥", "🙏", "👏"];
const POLL_MS = 4000;
const MAX_FILE = 50 * 1024 * 1024;

type Author = { kind: "user" | "brand" | "support"; id: string; name: string; login: string | null; image: string | null };

interface Msg {
  id: string;
  author: Author;
  body: string;
  file: { name: string; type: string; size: number; url: string } | null;
  replyTo: { id: string; authorName: string; text: string; deleted: boolean } | null;
  mentions: { id: string; login: string }[];
  reactions: { emoji: string; count: number; users: string[] }[];
  seen: number;
  notifyAll: boolean;
  pinned: boolean;
  scheduled: boolean;
  sendAt: number;
  updatedAt: number;
  deleted: boolean;
  edited: boolean;
  admin?: {
    senderId: string;
    senderName: string;
    senderLogin: string | null;
    as: string;
    deletedAt: number | null;
    deletedByName: string | null;
    createdAt: number;
    editHistory: string[];
  };
}

const TZ = "Asia/Tashkent";
const dayKey = (ms: number) => new Date(ms).toLocaleDateString("en-CA", { timeZone: TZ });
const hm = (ms: number) => new Date(ms).toLocaleTimeString("ru-RU", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });

function dayLabel(ms: number) {
  const k = dayKey(ms);
  if (k === dayKey(Date.now())) return "Bugun";
  if (k === dayKey(Date.now() - 86_400_000)) return "Keça";
  return shortDate(ms);
}

/** Muallif rangi (ilovadagidek — har odamga o'z rangi). */
const NAME_COLORS = ["text-sky-400", "text-emerald-400", "text-amber-300", "text-pink-400", "text-violet-400", "text-orange-400", "text-teal-400"];
function colorOf(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return NAME_COLORS[h % NAME_COLORS.length];
}

function Avatar({ a, size = "h-8 w-8" }: { a: Author; size?: string }) {
  if (a.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={a.image} alt="" className={`${size} shrink-0 rounded-full object-cover`} />;
  }
  return (
    <span className={`${size} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-xs font-bold text-white`}>
      {a.name.trim()[0]?.toUpperCase() ?? "?"}
    </span>
  );
}

function merge(prev: Msg[], next: Msg[]) {
  if (!next.length) return prev;
  const map = new Map(prev.map((m) => [m.id, m]));
  for (const m of next) {
    const o = map.get(m.id);
    // fayl havolasi har so'rovda yangi imzo — eski havola qolsin (rasm qayta yuklanmasin)
    map.set(m.id, o?.file && m.file && o.file.name === m.file.name ? { ...m, file: o.file } : m);
  }
  return [...map.values()].sort((a, b) => a.sendAt - b.sendAt);
}

/**
 * «Tayyorr's Family» — admin uchun chat ko'rinishida (ilovadagidek). Admin faqat «Tayyorr Support»
 * nomidan yozadi; o'chirilgan xabarlar ham ko'rinadi (belgilangan). Har 4 soniyada yangilanadi.
 */
export function FamilyChat() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOld, setLoadingOld] = useState(false);
  const [me, setMe] = useState<string>("");
  const [support, setSupport] = useState<Author | null>(null);
  const [presence, setPresence] = useState<{ members: number; online: number } | null>(null);
  const [err, setErr] = useFlashState<string | null>(null);

  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [notifyAll, setNotifyAll] = useState(false);
  const [sending, setSending] = useState(false);
  const [attachment, setAttachment] = useState<PreparedChatFile | null>(null);
  const [uploading, setUploading] = useState<{ name: string; pct: number } | null>(null);

  const [menu, setMenu] = useState<{ m: Msg; left: number; top: number; emojis: boolean } | null>(null);
  const [jumpMiss, setJumpMiss] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useDismiss(!!menu, () => setMenu(null), [menuRef]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const sinceRef = useRef(0);
  const stickRef = useRef(true);
  const keepOffset = useRef<number | null>(null);
  // «↓» tugmasi: yuqoriga aylantirilganda çiqadi, kelgan xabarlar sonini körsatadi
  const down = useScrollDown(scrollRef, msgs, { keyOf: (m) => m.id, isMine: (m) => m.author.kind === "support" });

  const absorb = useCallback((list: Msg[]) => {
    for (const m of list) if (m.updatedAt > sinceRef.current) sinceRef.current = m.updatedAt;
    setMsgs((p) => merge(p, list));
  }, []);

  // birinchi yuklash
  useEffect(() => {
    let off = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/family/messages", { cache: "no-store" });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "Yuklanmadi");
        if (off) return;
        setMe(d.me);
        setSupport(d.support);
        setHasMore(d.hasMore);
        setPresence({ members: d.members, online: d.online });
        absorb(d.messages);
      } catch (e) {
        if (!off) setErr(e instanceof Error ? e.message : "Xatolik");
      } finally {
        if (!off) setLoading(false);
      }
    })();
    return () => {
      off = true;
    };
  }, [absorb]);

  // so'rab turish: o'zgarganlar (yangi, tahrirlangan, o'chirilgan, reaksiya)
  useEffect(() => {
    if (loading) return;
    let busy = false;
    const tick = async () => {
      if (busy || document.hidden) return;
      busy = true;
      try {
        const res = await fetch(`/api/admin/family/messages?since=${sinceRef.current}`, { cache: "no-store" });
        if (res.ok) {
          const d = await res.json();
          absorb(d.messages ?? []);
          if (d.members != null) setPresence({ members: d.members, online: d.online });
        }
      } catch {
        /* keyingi safar */
      } finally {
        busy = false;
      }
    };
    const id = setInterval(tick, POLL_MS);
    const onVis = () => !document.hidden && tick();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [loading, absorb]);

  // pastga yopishib turish (foydalanuvchi yuqoriga chiqmagan bo'lsa); eski sahifa — joyi saqlanadi
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (keepOffset.current != null) {
      el.scrollTop = el.scrollHeight - keepOffset.current;
      keepOffset.current = null;
      return;
    }
    if (stickRef.current) el.scrollTop = el.scrollHeight;
  }, [msgs]);

  // qayta oçilganda — qoldirilgan joyda (langar eskiroq sahifada bölsa — yuklab topiladi), aks holda pastda
  const loadOlderRef = useRef<() => Promise<boolean>>(async () => false);
  const memory = useChatMemory({
    ref: scrollRef,
    storeKey: "family",
    prefix: "fm-",
    ready: !loading,
    loadMore: () => loadOlderRef.current(),
    onRestored: () => {
      const el = scrollRef.current;
      if (el) stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
      down.sync();
    },
  });
  // yangi xabar: özim yuborgan — «suyuq» sakraş, boşqalarniki — yumşoq pop
  const enterCls = useEnterAnim(memory.restored);
  const sentIds = useRef(new Set<string>());
  const sendingRef = useRef(false);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    down.onScroll();
    if (el.scrollTop < 60 && hasMore && !loadingOld) void loadOlder();
  }

  async function loadOlder(): Promise<boolean> {
    const first = msgs[0];
    if (!first) return false;
    setLoadingOld(true);
    try {
      const res = await fetch(`/api/admin/family/messages?before=${first.sendAt}`, { cache: "no-store" });
      const d = await res.json();
      if (res.ok) {
        const el = scrollRef.current;
        if (el) keepOffset.current = el.scrollHeight - el.scrollTop;
        setHasMore(d.hasMore);
        absorb(d.messages);
        return !!d.hasMore;
      }
      return false;
    } catch {
      return false;
    } finally {
      setLoadingOld(false);
    }
  }
  loadOlderRef.current = loadOlder;

  function jumpTo(id: string) {
    const el = document.getElementById(`fm-${id}`);
    if (!el) {
      setJumpMiss(true);
      setTimeout(() => setJumpMiss(false), 2500);
      return;
    }
    flashMessage(el);
  }

  async function pickFile(f: File) {
    if (f.size > MAX_FILE) {
      setErr("Fayl 50 MB dan katta bölmasin");
      return;
    }
    setErr(null);
    setUploading({ name: f.name, pct: 0 });
    try {
      const prepared = await prepareFamilyFile(f, (pct) => setUploading({ name: f.name, pct }));
      setAttachment(prepared);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Fayl yuklanmadi");
    } finally {
      setUploading(null);
    }
  }

  async function send() {
    const body = text.trim();
    if ((!body && !attachment) || sending || uploading) return;
    setSending(true);
    sendingRef.current = true;
    setErr(null);
    try {
      const res = await fetch("/api/admin/family/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: body || undefined,
          replyToId: replyTo?.id,
          notifyAll,
          file: attachment ?? undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Yuborilmadi");
      playSent();
      stickRef.current = true;
      memory.release();
      if (d.message?.id) sentIds.current.add(d.message.id);
      absorb([d.message]);
      setText("");
      setReplyTo(null);
      setAttachment(null);
      setNotifyAll(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Yuborilmadi");
    } finally {
      setSending(false);
      sendingRef.current = false;
    }
  }

  async function act(url: string, init: RequestInit) {
    setMenu(null);
    try {
      const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Bajarilmadi");
      if (d.message) absorb([d.message]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Bajarilmadi");
    }
  }

  const react = (m: Msg, emoji: string) =>
    act(`/api/admin/family/messages/${m.id}/react`, { method: "POST", body: JSON.stringify({ emoji }) });
  const pin = (m: Msg, pinned: boolean) => {
    const notify = pinned && window.confirm("Hammaga bildiriş yuborilsinmi? (Bekor — jimgina qadaladi)");
    return act(`/api/admin/family/messages/${m.id}`, { method: "PATCH", body: JSON.stringify({ pinned, notify }) });
  };
  const del = (m: Msg) => {
    if (!window.confirm("Xabar guruhdan öçirilsinmi? (Admin panelda «öçirilgan» bölib qoladi)")) return;
    return act(`/api/admin/family/messages/${m.id}`, { method: "DELETE" });
  };

  function openMenu(m: Msg, el: HTMLElement, emojis = false) {
    const r = el.getBoundingClientRect();
    const w = emojis ? 300 : 210;
    const left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left - w / 2 + r.width / 2));
    const top = r.bottom + 260 > window.innerHeight ? Math.max(8, r.top - (emojis ? 60 : 200)) : r.bottom + 6;
    setMenu({ m, left, top, emojis });
  }

  const pinned = useMemo(() => [...msgs].filter((m) => m.pinned).sort((a, b) => b.sendAt - a.sendAt)[0] ?? null, [msgs]);

  const mineOf = (m: Msg) => m.author.kind === "support";

  return (
    <div
      data-wide
      className="relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]"
      style={{ height: "calc(100dvh - 11rem)", minHeight: 420 }}
    >
      {/* ---- sarlavha ---- */}
      <div className="flex items-center gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-2.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white">
          <Icon name="users" className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-white">Tayyorr’s Family</div>
          <div className="text-xs text-zinc-500">
            {presence ? `${presence.members.toLocaleString("ru-RU")} aʼzo · ${presence.online} onlayn` : "…"}
          </div>
        </div>
        <span className="hidden items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-zinc-400 sm:inline-flex">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> jonli
        </span>
      </div>

      {/* ---- qadalgan ---- */}
      {pinned && (
        <button
          type="button"
          onClick={() => jumpTo(pinned.id)}
          className="flex items-center gap-2.5 border-b border-white/10 bg-amber-400/[0.06] px-4 py-2 text-left hover:bg-amber-400/10"
        >
          <Icon name="pin" className="h-4 w-4 shrink-0 text-amber-300" />
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-medium text-amber-300">Qadalgan xabar</span>
            <span className="block truncate text-xs text-zinc-300">
              {pinned.author.name}: {pinned.body || (pinned.file ? `📎 ${pinned.file.name}` : "xabar")}
            </span>
          </span>
        </button>
      )}

      {/* ---- xabarlar ---- */}
      <div className="relative flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} onScroll={onScroll} style={memory.hideStyle} className="min-h-0 flex-1 overflow-y-auto bg-[#0b0b12]/40 px-2 py-3 sm:px-4">
        {loading && <p className="mt-10 text-center text-sm text-zinc-500">Yuklanmoqda…</p>}
        {!loading && msgs.length === 0 && <p className="mt-10 text-center text-sm text-zinc-500">Hali xabar yöq.</p>}
        {hasMore && (
          <div className="mb-2 flex justify-center">
            <button type="button" onClick={loadOlder} disabled={loadingOld} className="rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-400 hover:text-white">
              {loadingOld ? "Yuklanmoqda…" : "Eskiroq xabarlar"}
            </button>
          </div>
        )}
        {msgs.map((m, i) => {
          const prev = msgs[i - 1];
          const newDay = !prev || dayKey(prev.sendAt) !== dayKey(m.sendAt);
          const mine = mineOf(m);
          // ketma-ket bir muallif — avatar va ism faqat birinchisida
          const grouped = !newDay && prev && prev.author.id === m.author.id && m.sendAt - prev.sendAt < 5 * 60_000;
          const realWriter = m.admin && m.author.kind !== "user" && m.admin.senderId !== me ? m.admin.senderName : null;
          return (
            <div key={m.id}>
              {newDay && (
                <div className="my-3 flex justify-center">
                  <span className="rounded-full bg-white/[0.06] px-3 py-1 text-[11px] font-medium text-zinc-400">{dayLabel(m.sendAt)}</span>
                </div>
              )}
              <div id={`fm-${m.id}`} className={`${enterCls(m.id, m.sendAt, mine && (sentIds.current.has(m.id) || sendingRef.current) ? "send" : "pop")} group flex items-end gap-2 rounded-xl px-1 ${grouped ? "mt-0.5" : "mt-2.5"} ${mine ? "flex-row-reverse" : ""}`}>
                {!mine && (grouped ? <span className="w-8 shrink-0" /> : <Avatar a={m.author} />)}
                <div className={`flex max-w-[min(78%,560px)] flex-col ${mine ? "items-end" : "items-start"}`}>
                  <div
                    className={`relative space-y-1.5 rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                      m.deleted
                        ? "border border-dashed border-red-400/40 bg-red-500/[0.06] text-zinc-300"
                        : mine
                          ? "rounded-br-md bg-indigo-600 text-white"
                          : "rounded-bl-md border border-white/10 bg-white/[0.06] text-zinc-100"
                    }`}
                  >
                    {!grouped && !mine && (
                      <div className="flex flex-wrap items-baseline gap-x-1.5 text-xs">
                        <span className={`font-semibold ${m.author.kind === "user" ? colorOf(m.author.id) : "text-indigo-300"}`}>{m.author.name}</span>
                        {m.author.kind !== "user" && <Icon name="check-circle" className="h-3 w-3 self-center text-indigo-300" />}
                        {m.author.login && <span className="text-zinc-500">@{m.author.login}</span>}
                      </div>
                    )}
                    {realWriter && (
                      <div className={`text-[10px] ${mine && !m.deleted ? "text-indigo-200" : "text-zinc-500"}`}>
                        yozgan: {realWriter}
                        {m.admin?.senderLogin ? ` @${m.admin.senderLogin}` : ""}
                      </div>
                    )}
                    {(m.deleted || m.pinned || m.notifyAll || m.scheduled) && (
                      <div className="flex flex-wrap gap-1 text-[10px] font-medium">
                        {m.deleted && (
                          <span className="rounded-full bg-red-500/15 px-1.5 py-0.5 text-red-300">
                            öçirilgan{m.admin?.deletedAt ? ` · ${shortDate(m.admin.deletedAt)} ${hm(m.admin.deletedAt)}` : ""}
                            {m.admin?.deletedByName ? ` · ${m.admin.deletedByName}` : ""}
                          </span>
                        )}
                        {m.pinned && <span className="rounded-full bg-amber-400/15 px-1.5 py-0.5 text-amber-300">qadalgan</span>}
                        {m.notifyAll && <span className={`rounded-full px-1.5 py-0.5 ${mine && !m.deleted ? "bg-white/15 text-white" : "bg-violet-400/15 text-violet-300"}`}>hammaga bildirilgan</span>}
                        {m.scheduled && <span className="rounded-full bg-sky-400/15 px-1.5 py-0.5 text-sky-300">rejalaştirilgan · hali yuborilmagan</span>}
                      </div>
                    )}
                    {m.replyTo && (
                      <button
                        type="button"
                        onClick={() => jumpTo(m.replyTo!.id)}
                        className={`block w-full rounded-lg border-l-2 py-1 pl-2 pr-2 text-left text-xs transition ${
                          mine && !m.deleted ? "border-white/60 bg-white/10" : "border-indigo-400 bg-black/10"
                        }`}
                      >
                        <div className={`font-medium ${mine && !m.deleted ? "text-white" : "text-indigo-300"}`}>{m.replyTo.authorName}</div>
                        <div className={`truncate ${mine && !m.deleted ? "text-indigo-100" : "text-zinc-400"} ${m.replyTo.deleted ? "italic" : ""}`}>{m.replyTo.text}</div>
                      </button>
                    )}
                    {m.file && <ChatFileView file={m.file} mine={mine && !m.deleted} />}
                    {m.body && (
                      <div className="whitespace-pre-wrap break-words leading-relaxed">
                        <Linkify text={m.body} mine={mine && !m.deleted} />
                      </div>
                    )}
                    <div className={`flex items-center justify-end gap-1.5 text-[10px] ${mine && !m.deleted ? "text-indigo-200" : "text-zinc-500"}`}>
                      {m.edited && <span>tahrirlangan</span>}
                      {m.seen > 0 && (
                        <span className="inline-flex items-center gap-0.5" title="Körganlar">
                          <Icon name="eye" className="h-3 w-3" /> {m.seen}
                        </span>
                      )}
                      <span>{hm(m.sendAt)}</span>
                    </div>
                  </div>

                  {m.reactions.length > 0 && (
                    <div className={`-mt-1.5 flex flex-wrap gap-1 px-1.5 ${mine ? "justify-end" : ""}`}>
                      {m.reactions.map((r) => {
                        const own = r.users.includes(me);
                        return (
                          <button
                            key={r.emoji}
                            type="button"
                            disabled={m.deleted}
                            onClick={() => react(m, r.emoji)}
                            className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs shadow-sm transition ${
                              own ? "border-indigo-400/60 bg-indigo-500/20 text-white" : "border-white/10 bg-[#14141b] text-zinc-300 hover:border-white/20"
                            }`}
                          >
                            <span>{r.emoji}</span>
                            <span className="font-medium">{r.count}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {m.admin && m.admin.editHistory.length > 0 && (
                    <details className="mt-1 max-w-full px-1 text-[11px] text-zinc-500">
                      <summary className="cursor-pointer hover:text-zinc-300">Oldingi matnlar ({m.admin.editHistory.length})</summary>
                      <ol className="mt-1 flex flex-col gap-1 border-l border-white/10 pl-2">
                        {m.admin.editHistory.map((b, j) => (
                          <li key={j} className="whitespace-pre-wrap break-words text-zinc-400">
                            {b || "—"}
                          </li>
                        ))}
                      </ol>
                    </details>
                  )}
                </div>

                {/* amallar — sichqoncha ustiga kelganda */}
                {!m.deleted && (
                  <div className="mb-1 flex shrink-0 gap-0.5 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                    <button type="button" title="Javob beriş" onClick={() => { setReplyTo(m); inputRef.current?.querySelector("textarea")?.focus(); }} className="rounded-full p-1.5 text-zinc-500 hover:bg-white/10 hover:text-white">
                      <Icon name="reply" className="h-4 w-4" />
                    </button>
                    <button type="button" title="Reaksiya" onClick={(e) => openMenu(m, e.currentTarget, true)} className="rounded-full p-1.5 text-sm leading-none text-zinc-500 hover:bg-white/10">
                      🙂
                    </button>
                    <button type="button" title="Yana" onClick={(e) => openMenu(m, e.currentTarget)} className="rounded-full p-1.5 text-zinc-500 hover:bg-white/10 hover:text-white">
                      <span className="block h-4 w-4 text-center text-base leading-[0.8]">⋯</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
        {/* suzuvçi tugmalar — yoziş maydoni ustida, öngda (8px oraliq bilan ustma-ust) */}
        <FloatingStack className="absolute bottom-3 right-3 z-10">
          {down.away && <ScrollDownButton unread={down.unread} onClick={down.scrollDown} />}
        </FloatingStack>
      </div>

      {jumpMiss && (
        <div className="pointer-events-none absolute inset-x-0 bottom-28 z-10 flex justify-center">
          <span className="rounded-full bg-zinc-900/90 px-3 py-1.5 text-xs text-white shadow-lg">Asl xabar yuklanmagan — yuqoriga aylantiring</span>
        </div>
      )}

      {/* ---- yozish maydoni ---- */}
      <div ref={inputRef} className="border-t border-white/10 bg-white/[0.03] p-2.5 sm:p-3">
        {err && (
          <div className="flash-status mb-2 flex items-center justify-between gap-2 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs text-red-300">
            {err}
            <button type="button" onClick={() => setErr(null)}>
              <Icon name="close" className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {replyTo && (
          <div className="mb-2 flex items-center gap-2 rounded-xl border-l-2 border-indigo-400 bg-white/5 px-3 py-1.5">
            <Icon name="reply" className="h-4 w-4 shrink-0 text-indigo-300" />
            <div className="min-w-0 flex-1 text-xs">
              <div className="font-medium text-indigo-300">{replyTo.author.name}ga javob</div>
              <div className="truncate text-zinc-400">{replyTo.body || (replyTo.file ? `📎 ${replyTo.file.name}` : "xabar")}</div>
            </div>
            <button type="button" onClick={() => setReplyTo(null)} className="rounded-full p-1 text-zinc-500 hover:text-white">
              <Icon name="close" className="h-4 w-4" />
            </button>
          </div>
        )}
        {(attachment || uploading) && (
          <div className="mb-2 flex items-center gap-2 rounded-xl bg-white/5 px-3 py-1.5 text-xs text-zinc-300">
            <Icon name="paperclip" className="h-4 w-4 shrink-0 text-zinc-400" />
            <span className="min-w-0 flex-1 truncate">
              {uploading ? `${uploading.name} — ${uploading.pct}%` : `${attachment!.name} · ${humanSize(attachment!.size)}`}
            </span>
            {attachment && (
              <button type="button" onClick={() => setAttachment(null)} className="rounded-full p-1 text-zinc-500 hover:text-white">
                <Icon name="close" className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void pickFile(f);
            }}
          />
          <button
            type="button"
            title="Fayl biriktiriş"
            disabled={!!uploading}
            onClick={() => fileRef.current?.click()}
            className="mb-0.5 rounded-full p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
          >
            <Icon name="paperclip" className="h-5 w-5" />
          </button>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <AutoTextarea
              value={text}
              maxRows={6}
              placeholder={`${support?.name ?? "Tayyorr Support"} nomidan yozing…`}
              className="input !rounded-2xl !py-2 text-sm"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void send();
                }
              }}
            />
          </div>
          <button
            type="button"
            title={notifyAll ? "Hammaga bildiriş: yoqilgan" : "Hammaga bildiriş"}
            onClick={() => setNotifyAll((v) => !v)}
            className={`mb-0.5 rounded-full p-2 transition ${notifyAll ? "bg-violet-500/20 text-violet-300" : "text-zinc-400 hover:bg-white/10 hover:text-white"}`}
          >
            <Icon name="bell" className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={send}
            disabled={sending || !!uploading || (!text.trim() && !attachment)}
            className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white transition hover:brightness-110 disabled:opacity-40"
          >
            <Icon name="send" className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 px-1 text-[11px] text-zinc-500">
          {support && <Avatar a={support} size="h-4 w-4" />}
          <span>
            Faqat <span className="font-medium text-zinc-300">{support?.name ?? "Tayyorr Support"}</span> nomidan yoziladi
            {notifyAll ? " · hammaga bildiriş yuboriladi" : " · Enter — yuboriş, Shift+Enter — yangi qator"}
          </span>
        </div>
      </div>

      {menu &&
        createPortal(
          <div className="fixed inset-0 z-[70]">
            <div
              ref={menuRef}
              className="menu-panel absolute overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 text-sm shadow-xl"
              style={{ left: menu.left, top: menu.top }}
            >
              {menu.emojis ? (
                <div className="flex flex-wrap gap-0.5 p-1.5" style={{ width: 300 }}>
                  {EMOJIS.map((e) => {
                    const own = menu.m.reactions.some((r) => r.emoji === e && r.users.includes(me));
                    return (
                      <button
                        key={e}
                        type="button"
                        onClick={() => react(menu.m, e)}
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-xl transition hover:scale-110 hover:bg-white/10 ${own ? "bg-indigo-500/25" : ""}`}
                      >
                        {e}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="w-52 py-1">
                  <MenuItem icon="reply" label="Javob beriş" onClick={() => { setReplyTo(menu.m); setMenu(null); inputRef.current?.querySelector("textarea")?.focus(); }} />
                  <MenuItem icon="pin" label={menu.m.pinned ? "Qadaşdan oliş" : "Qadaş"} onClick={() => pin(menu.m, !menu.m.pinned)} />
                  {menu.m.body && (
                    <MenuItem
                      icon="file"
                      label="Matnni nusxalaş"
                      onClick={() => {
                        void navigator.clipboard?.writeText(menu.m.body);
                        setMenu(null);
                      }}
                    />
                  )}
                  {menu.m.author.kind === "user" && (
                    <MenuItem icon="user" label="Profilini oçiş" onClick={() => { window.open(`/users/${menu.m.author.id}`, "_blank"); setMenu(null); }} />
                  )}
                  <MenuItem icon="trash" label="Öçiriş" danger onClick={() => del(menu.m)} />
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: "reply" | "pin" | "file" | "user" | "trash";
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-white/5 ${danger ? "text-red-400" : "text-zinc-200"}`}
    >
      <Icon name={icon} className="h-4 w-4" />
      {label}
    </button>
  );
}
