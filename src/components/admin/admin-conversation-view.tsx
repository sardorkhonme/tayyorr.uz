"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ChatFileView, type ChatFile } from "@/components/chat-file";
import { Linkify } from "@/components/linkify";
import { smartTime } from "@/lib/date";
import { MessageSourceBadge } from "@/components/message-source-badge";
import type { MessageSource } from "@/lib/message-source";
import { Icon } from "@/components/icons";

interface Msg {
  id: string;
  senderId: string;
  body: string;
  source?: MessageSource;
  system: boolean;
  createdAt: number;
  edited: boolean;
  deleted: boolean;
  mine: boolean; // = perspektiva foydalanuvchisi (o'ng tomon)
  replyTo: { id: string; authorId: string; text: string; deleted: boolean } | null;
  reactions?: { like: number; dislike: number; mine: "LIKE" | "DISLIKE" | null };
  file: ChatFile | null;
}

interface Party {
  id: string;
  label: string;
}

function fmt(ms: number) {
  return smartTime(ms);
}

/** Admin uchun ikki foydalanuvchi yozishmasini oddiy chat ko'rinishida (faqat o'qish, jonli yangilanadi). */
export function AdminConversationView({
  conversationId,
  left,
  right,
  messages: initialMessages,
  revisions,
}: {
  conversationId: string;
  left: Party;
  right: Party;
  messages: Msg[];
  revisions: Record<string, string[]>;
}) {
  const router = useRouter();
  const nameOf = (senderId: string) =>
    senderId === left.id ? left.label : senderId === right.id ? right.label : "—";

  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [live, setLive] = useState(false);
  const [openRev, setOpenRev] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // parent qayta render bo'lsa (masalan router.refresh() dan keyin) — bazadagi
  // eng so'nggi holat bilan sinxronlaymiz
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  // jonli yangilanish — huddi oddiy foydalanuvchi chatidek
  useEffect(() => {
    const es = new EventSource(`/api/admin/chats/${conversationId}/stream`);
    es.onopen = () => setLive(true);
    es.onerror = () => setLive(false);
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "reaction") {
          setMessages((prev) =>
            prev.map((x) =>
              x.id === data.messageId
                ? {
                    ...x,
                    reactions: {
                      like: data.like,
                      dislike: data.dislike,
                      mine: x.reactions?.mine ?? null,
                    },
                  }
                : x,
            ),
          );
          return;
        }
        if (data.type === "message" || data.type === "edit") {
          const m = data.message;
          const next: Msg = {
            id: m.id,
            senderId: m.senderId,
            body: m.body,
            source: m.source,
            system: m.system,
            createdAt: new Date(m.createdAt).getTime(),
            mine: m.senderId === right.id,
            edited: m.edited,
            deleted: m.deleted,
            replyTo: m.replyTo ?? null,
            file: m.file ?? null,
          };
          setMessages((prev) => {
            const i = prev.findIndex((x) => x.id === next.id);
            if (i === -1) return [...prev, next];
            const copy = [...prev];
            copy[i] = { ...copy[i], ...next };
            return copy;
          });
        } else if (data.type === "delete") {
          setMessages((prev) => prev.filter((x) => x.id !== data.messageId));
        }
      } catch {
        /* ignore */
      }
    };
    return () => es.close();
  }, [conversationId, right.id]);

  async function delMsg(msgId: string) {
    if (!window.confirm("Bu xabar butunlay o'chiriladi. Davom etilsinmi?")) return;
    setDeleting(msgId);
    try {
      const res = await fetch(`/api/admin/messages/${msgId}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 px-1 text-[11px] text-zinc-500">
        <span
          className={`h-1.5 w-1.5 rounded-full ${live ? "bg-emerald-400" : "bg-zinc-600"}`}
        />
        {live ? "Jonli" : "Ulanmoqda…"}
      </div>
      <div className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto rounded-xl border border-white/10 bg-[#0b0b12]/40 p-4">
        {messages.length === 0 && (
          <p className="text-sm text-zinc-500">Xabarlar yo'q.</p>
        )}
        {messages.map((m) => {
          if (m.system) {
            return (
              <div key={m.id} className="flex justify-center">
                <div className="max-w-[80%] rounded-lg bg-white/5 px-3 py-1.5 text-center text-xs text-zinc-400">
                  {m.body}
                </div>
              </div>
            );
          }
          const rev = revisions[m.id];
          return (
            <div
              key={m.id}
              className={`flex ${m.mine ? "justify-end" : "justify-start"}`}
            >
              <div className="max-w-[78%]">
                <div className="mb-0.5 flex items-center gap-2 px-1 text-[10px] text-zinc-500">
                  <span>{nameOf(m.senderId)}</span>
                  <button
                    type="button"
                    disabled={deleting === m.id}
                    onClick={() => delMsg(m.id)}
                    className="text-red-400/70 hover:text-red-400"
                  >
                    {deleting === m.id ? "..." : "o'chirish"}
                  </button>
                </div>
                <div
                  className={`space-y-1.5 rounded-2xl px-3.5 py-2 text-sm ${
                    m.deleted
                      ? "border border-red-400/30 bg-red-500/5 text-zinc-400"
                      : m.mine
                        ? "bg-indigo-600 text-white"
                        : "border border-white/10 bg-white/5 text-zinc-100"
                  }`}
                >
                  {m.deleted && (
                    <div className="text-[10px] font-semibold uppercase text-red-400">
                      o'chirilgan
                    </div>
                  )}
                  {m.replyTo && (
                    <div className="rounded-md border-l-2 border-white/30 bg-black/10 py-1 pl-2 text-xs opacity-80">
                      <div className="font-medium">{nameOf(m.replyTo.authorId)}</div>
                      <div className="truncate">{m.replyTo.text}</div>
                    </div>
                  )}
                  {m.file && <ChatFileView file={m.file} mine={m.mine} />}
                  {m.body && (
                    <div className="whitespace-pre-wrap break-words">
                      <Linkify text={m.body} mine={m.mine} />
                    </div>
                  )}
                  {m.reactions &&
                    (m.reactions.like > 0 || m.reactions.dislike > 0) && (
                      <div className="flex gap-1.5 pt-1">
                        {m.reactions.like > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs">
                            <Icon name="thumbs-up" className="h-3.5 w-3.5" /> {m.reactions.like}
                          </span>
                        )}
                        {m.reactions.dislike > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs">
                            <Icon name="thumbs-down" className="h-3.5 w-3.5" /> {m.reactions.dislike}
                          </span>
                        )}
                      </div>
                    )}
                  <div
                    className={`text-right text-[10px] ${
                      m.mine && !m.deleted ? "text-indigo-200" : "text-zinc-500"
                    }`}
                  >
                    <MessageSourceBadge source={m.source} />
                    {m.edited && "tahrirlangan · "}
                    {fmt(m.createdAt)}
                  </div>
                </div>

                {rev && rev.length > 0 && (
                  <div className="mt-1 px-1 text-[10px] text-zinc-500">
                    <button
                      type="button"
                      onClick={() => setOpenRev(openRev === m.id ? null : m.id)}
                      className="hover:text-zinc-300"
                    >
                      {openRev === m.id ? "▾" : "▸"} tahrirlar tarixi ({rev.length})
                    </button>
                    {openRev === m.id && (
                      <div className="mt-1 space-y-0.5 border-l border-white/10 pl-2">
                        {rev.map((r, i) => (
                          <div key={i} className="whitespace-pre-wrap">
                            <span className="text-zinc-600">v{i + 1}:</span> {r}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
