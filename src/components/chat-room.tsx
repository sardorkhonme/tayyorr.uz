"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ReportDialog } from "@/components/report-button";
import { ChatFileView, humanSize, type ChatFile } from "@/components/chat-file";
import { Linkify } from "@/components/linkify";
import { playTin, primeTin } from "@/lib/notify-sound";
import { RocketIcon, BlockedIcon, MicIcon } from "@/components/icons";
import { ProgressRing } from "@/components/progress-ring";
import { useVoiceRecorder } from "@/lib/voice-recorder";
import { useDismiss } from "@/components/use-dismiss";
import { useUnread } from "@/components/unread-provider";
import { prepareChatFile, type PreparedChatFile } from "@/lib/upload-client";
import { presenceText } from "@/lib/presence";
import { shortDateTime, smartTime } from "@/lib/date";

interface ReplyPreview {
  id: string;
  authorId: string;
  text: string;
  deleted: boolean;
}

interface Reactions {
  like: number;
  dislike: number;
  mine: "LIKE" | "DISLIKE" | null;
}

interface Msg {
  id: string;
  /** React uchun barqaror kalit — optimistik xabar real bilan almashganda o'zgarmaydi */
  key?: string;
  senderId: string;
  body: string;
  system?: boolean;
  createdAt: number;
  updatedAt: number;
  mine: boolean;
  edited?: boolean;
  deleted?: boolean;
  pending?: boolean;
  /** qabul qiluvchi o'qigan vaqt (✓✓) */
  readAt?: number | null;
  replyTo?: ReplyPreview | null;
  reactions?: Reactions;
  file?: ChatFile | null;
}

interface OrderPin {
  id: string;
  title: string;
  type: string;
  status: string;
  contractStatus?: string;
  cancelState?: string | null;
  deadline?: string | null;
}

interface Props {
  conversationId: string;
  meId: string;
  orderId: string | null;
  /** Ikkovi o'rtasidagi HOZIR faol loyihalar — bittadan ko'p bo'lsa
   * panelda almashib turadi (slider). */
  orders?: OrderPin[];
  blockedByMe?: boolean;
  blockedMe?: boolean;
  other: {
    id: string;
    name: string;
    login: string | null;
    image: string | null;
    isSupport: boolean;
    lastSeenAt: string | null;
  };
  initialMessages: Msg[];
}

const ORDER_STATUS_LABEL: Record<string, string> = {
  OPEN: "Ochiq",
  IN_PROGRESS: "Jarayonda",
  DELIVERED: "Topshirilgan",
  DONE: "Yakunlangan",
  CANCELLED: "Bekor qilingan",
};

/** Qadalgan panel: shartnoma bosqichi qisqa matnda. */
function pinBadge(p: OrderPin) {
  if (p.contractStatus === "SENT") return "📄 Shartnoma yuborilgan";
  if (p.cancelState === "DISPUTED") return "⚖️ Admin ko'rib chiqmoqda";
  if (p.cancelState === "PENDING") return "⚠️ Bekor qilish so'ralgan";
  return ORDER_STATUS_LABEL[p.status] ?? p.status;
}

function fmtTime(ms: number) {
  return smartTime(ms);
}

const MAX_FILE = 100 * 1024 * 1024;

export function ChatRoom({
  conversationId,
  meId,
  orderId,
  orders = [],
  blockedByMe = false,
  blockedMe = false,
  other,
  initialMessages,
}: Props) {
  const router = useRouter();
  const unread = useUnread();
  const unreadRef = useRef(unread);
  unreadRef.current = unread;
  const [pinIdx, setPinIdx] = useState(0);
  const pinnedOrder = orders.length > 0 ? orders[pinIdx % orders.length] : null;

  // 2+ faol loyiha bo'lsa — bir necha soniyada avtomatik almashib turadi
  useEffect(() => {
    if (orders.length < 2) return;
    const iv = setInterval(() => {
      setPinIdx((i) => (i + 1) % orders.length);
    }, 4000);
    return () => clearInterval(iv);
  }, [orders.length]);
  const [messages, setMessages] = useState<Msg[]>(
    initialMessages.filter((m) => !m.deleted),
  );
  const [text, setText] = useState("");
  const [live, setLive] = useState(false);
  const [iBlocked, setIBlocked] = useState(blockedByMe);
  const [theyBlocked, setTheyBlocked] = useState(blockedMe);
  const [hdrMenu, setHdrMenu] = useState<{ left: number; top: number } | null>(null);
  const [reportHdr, setReportHdr] = useState(false);
  const hdrBtnRef = useRef<HTMLButtonElement>(null);
  const hdrMenuRef = useRef<HTMLDivElement>(null);

  function toggleHdrMenu() {
    setHdrMenu((cur) => {
      if (cur) return null;
      const btn = hdrBtnRef.current;
      if (!btn) return null;
      const r = btn.getBoundingClientRect();
      const W = 208;
      const M = 8;
      let left = r.right - W;
      if (left < M) left = M;
      return { left, top: r.bottom + 6 };
    });
  }

  // tashqariga bosilsa / Escape — yopiladi (scrollga xalaqit bermaydi)
  useDismiss(!!hdrMenu, () => setHdrMenu(null), [hdrMenuRef, hdrBtnRef]);
  const blocked = iBlocked || theyBlocked;

  async function toggleBlock() {
    setHdrMenu(null);
    const wasBlocked = iBlocked;
    const action = wasBlocked ? "UNBLOCK" : "BLOCK";
    setIBlocked(!wasBlocked); // darhol yangilanadi
    setErr(null);
    try {
      const res = await fetch(`/api/chat/${conversationId}/block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setIBlocked(!!data.iBlocked);
      setTheyBlocked(!!data.blockedMe);
    } catch (e) {
      setIBlocked(wasBlocked); // xato — qaytaramiz
      setErr(e instanceof Error ? e.message : "Xatolik");
    }
  }

  async function deleteConversation() {
    setHdrMenu(null);
    if (
      !window.confirm(
        "Suhbat ikkala tomondan ham o'chiriladi. Davom etilsinmi?",
      )
    )
      return;
    try {
      const res = await fetch(`/api/chat/${conversationId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/messages");
        router.refresh();
      }
    } catch {
      setErr("O'chirib bo'lmadi");
    }
  }
  const [peerRead, setPeerRead] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // biriktirilgan fayl (hali yuborilmagan)
  const [attachment, setAttachment] = useState<PreparedChatFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadName, setUploadName] = useState("");
  // tanlangan faylning mahalliy ko'rinishi (yuborishdan oldin ko'rib chiqish uchun)
  const [localFile, setLocalFile] = useState<{ name: string; type: string; size: number; url: string } | null>(null);
  // eski yuklash natijasi bekor qilingan/almashtirilgan faylga yozilib qolmasin
  const pickSeq = useRef(0);

  const [editing, setEditing] = useState<{ id: string } | null>(null);
  const [replyingTo, setReplyingTo] = useState<ReplyPreview | null>(null);
  const [menu, setMenu] = useState<{ msg: Msg; left: number; top: number } | null>(
    null,
  );
  const msgMenuRef = useRef<HTMLDivElement>(null);
  useDismiss(!!menu, () => setMenu(null), [msgMenuRef]);
  const [report, setReport] = useState<{ suspectId: string; messageId: string } | null>(
    null,
  );
  const [otherSeen, setOtherSeen] = useState<string | null>(other.lastSeenAt);

  function openMenu(m: Msg, btn: HTMLElement) {
    const r = btn.getBoundingClientRect();
    const W = 184;
    const H = (m.mine ? 150 : 96) + 44; // + reaksiya paneli
    const M = 8;
    let left = r.right - W;
    if (left < M) left = M;
    if (left + W > window.innerWidth - M) left = window.innerWidth - M - W;
    let top = r.bottom + 6;
    if (top + H > window.innerHeight - M) top = r.top - H - 6;
    if (top < M) top = M;
    setMenu({ msg: m, left, top });
  }

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);
  const prevLenRef = useRef(initialMessages.filter((m) => !m.deleted).length);
  const sinceRef = useRef<number>(
    initialMessages.reduce((m, x) => Math.max(m, x.updatedAt || x.createdAt), 0),
  );

  const merge = useCallback((incoming: Msg[]) => {
    if (!incoming.length) return;
    setMessages((prev) => {
      const map = new Map(prev.map((m) => [m.id, m]));
      for (const m of incoming) {
        const t = m.updatedAt || m.createdAt;
        if (t > sinceRef.current) sinceRef.current = t;
        if (m.deleted) map.delete(m.id); // foydalanuvchida yo'qoladi
        else map.set(m.id, { ...map.get(m.id), ...m });
      }
      return [...map.values()].sort((a, b) => a.createdAt - b.createdAt);
    });
  }, []);

  const applyDelete = useCallback((id: string, updatedAt: number) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    if (updatedAt > sinceRef.current) sinceRef.current = updatedAt;
  }, []);

  const markRead = useCallback(() => {
    // indikatorlarni darhol nolga tushiramiz (server so'rovini kutmasdan)
    unreadRef.current?.clearConv(conversationId);
    fetch(`/api/chat/${conversationId}/read`, { method: "POST" })
      .then(() => unreadRef.current?.clearConv(conversationId))
      .catch(() => {});
  }, [conversationId]);

  useEffect(() => primeTin(), []);

  // SSE
  useEffect(() => {
    const es = new EventSource(`/api/chat/${conversationId}/stream`);
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
          // boshqa tomondan kelgan yangi xabar — "tin"
          if (data.type === "message" && m.senderId !== meId && !m.system) playTin();
          merge([
            {
              id: m.id,
              senderId: m.senderId,
              body: m.body,
              system: m.system,
              createdAt: new Date(m.createdAt).getTime(),
              updatedAt: new Date(m.updatedAt).getTime(),
              mine: m.senderId === meId,
              edited: m.edited,
              deleted: m.deleted,
              replyTo: m.replyTo ?? null,
              file: m.file ?? null,
            },
          ]);
          if (data.type === "message" && m.senderId !== meId && !document.hidden) {
            markRead();
          }
        } else if (data.type === "delete") {
          applyDelete(data.messageId, new Date(data.updatedAt).getTime());
        } else if (data.type === "read" && data.by !== meId) {
          setPeerRead(true);
          const now = Date.now();
          setMessages((prev) => prev.map((x) => (x.mine && !x.readAt && !x.pending ? { ...x, readAt: now } : x)));
        }
      } catch {
        /* ignore */
      }
    };
    return () => es.close();
  }, [conversationId, meId, merge, applyDelete, markRead]);

  // polling fallback (yangi + tahrirlangan + o'chirilgan)
  useEffect(() => {
    const iv = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/chat/${conversationId}?since=${sinceRef.current}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const data = await res.json();
        if (typeof data.blockedMe === "boolean") setTheyBlocked(data.blockedMe);
        if (typeof data.blockedByMe === "boolean") setIBlocked(data.blockedByMe);
        if (data.other && "lastSeenAt" in data.other) {
          setOtherSeen(data.other.lastSeenAt ?? null);
        }
        if (data.messages?.length) {
          merge(data.messages);
          if (
            data.messages.some((m: Msg) => m.senderId !== meId && !m.deleted) &&
            !document.hidden
          ) {
            markRead();
          }
        }
      } catch {
        /* ignore */
      }
    }, 4000);
    return () => clearInterval(iv);
  }, [conversationId, meId, merge, markRead]);

  useEffect(() => {
    markRead();
  }, [markRead]);

  // birinchi ochilganda pastga
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  // yangi xabar qo'shilgandagina pastga tushamiz (reaksiya/tahrir emas)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const grew = messages.length > prevLenRef.current;
    const lastMine = messages[messages.length - 1]?.mine;
    prevLenRef.current = messages.length;
    if (grew && (nearBottomRef.current || lastMine)) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  function clearLocalFile() {
    setLocalFile((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return null;
    });
  }

  function cancelAttachment() {
    pickSeq.current++;
    setAttachment(null);
    setUploading(false);
    setUploadName("");
    clearLocalFile();
  }

  /** Fayl tanlanganda — darhol yuborilmaydi: yuklanadi va ko'rib chiqish uchun ko'rsatiladi. */
  async function onPickFile(file: File) {
    setErr(null);
    setMenu(null);
    if (file.size > MAX_FILE) {
      setErr("Fayl 100MB dan katta");
      return;
    }
    const seq = ++pickSeq.current;
    clearLocalFile();
    setLocalFile({
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      url: URL.createObjectURL(file),
    });
    setUploading(true);
    setUploadPct(0);
    setUploadName(file.name);
    setAttachment(null);
    try {
      const prepared = await prepareChatFile(file, conversationId, (p) => {
        if (seq === pickSeq.current) setUploadPct(p);
      });
      if (seq === pickSeq.current) setAttachment(prepared);
    } catch (e) {
      if (seq === pickSeq.current) {
        setErr(e instanceof Error ? e.message : "Fayl yuklanmadi");
        clearLocalFile();
      }
    } finally {
      if (seq === pickSeq.current) setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const voice = useVoiceRecorder(
    (file) => onPickFile(file),
    (msg) => setErr(msg),
  );

  function startEdit(m: Msg) {
    setEditing({ id: m.id });
    setReplyingTo(null);
    setText(m.body);
    setMenu(null);
    setAttachment(null);
  }

  function cancelEdit() {
    setEditing(null);
    setText("");
  }

  function startReply(m: Msg) {
    setMenu(null);
    setEditing(null);
    setReplyingTo({
      id: m.id,
      authorId: m.senderId,
      text: m.deleted
        ? "o'chirilgan xabar"
        : m.body || (m.file ? `📎 ${m.file.name}` : "xabar"),
      deleted: !!m.deleted,
    });
  }

  function scrollToMessage(id: string) {
    const el = document.getElementById(`msg-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      // Telegramdagidek ikki marta "lip-lip" yonadigan nur (mobil ilova bilan bir xil)
      el.classList.remove("msg-flash");
      void el.offsetWidth;
      el.classList.add("msg-flash");
      setTimeout(() => el.classList.remove("msg-flash"), 1500);
    }
  }

  function reportMsg(m: Msg) {
    setMenu(null);
    setReport({ suspectId: m.senderId, messageId: m.id });
  }

  async function react(m: Msg, value: "LIKE" | "DISLIKE") {
    const cur = m.reactions ?? { like: 0, dislike: 0, mine: null };
    const next = cur.mine === value ? null : value;
    // optimistik
    setMessages((prev) =>
      prev.map((x) => {
        if (x.id !== m.id) return x;
        const r = { ...cur };
        if (cur.mine === "LIKE") r.like--;
        if (cur.mine === "DISLIKE") r.dislike--;
        if (next === "LIKE") r.like++;
        if (next === "DISLIKE") r.dislike++;
        r.mine = next;
        return { ...x, reactions: r };
      }),
    );
    try {
      const res = await fetch(
        `/api/chat/${conversationId}/messages/${m.id}/react`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: next }),
        },
      );
      const data = await res.json();
      if (res.ok) {
        setMessages((prev) =>
          prev.map((x) =>
            x.id === m.id
              ? { ...x, reactions: { like: data.like, dislike: data.dislike, mine: data.mine } }
              : x,
          ),
        );
      }
    } catch {
      /* ignore */
    }
  }

  async function del(m: Msg) {
    setMenu(null);
    if (!window.confirm("Xabar ikkala tomondan ham o'chirilsinmi?")) return;
    applyDelete(m.id, Date.now());
    try {
      const res = await fetch(`/api/chat/${conversationId}/messages/${m.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
    } catch {
      setErr("O'chirib bo'lmadi");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();

    if (editing) {
      if (!body) return;
      const editId = editing.id;
      setEditing(null);
      setText("");
      try {
        const res = await fetch(
          `/api/chat/${conversationId}/messages/${editId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ body }),
          },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        merge([data.message]);
      } catch (e2) {
        setErr(e2 instanceof Error ? e2.message : "Tahrirlab bo'lmadi");
      }
      return;
    }

    if (!body && !attachment) return;
    if (uploading) return;

    const sentFile = attachment;
    const sentLocal = localFile;
    const replyTo = replyingTo;
    setText("");
    setAttachment(null);
    // mahalliy ko'rinish yuborilayotgan pufakchada qoladi; server javobi kelgach almashadi
    setLocalFile(null);
    if (sentLocal?.url) setTimeout(() => URL.revokeObjectURL(sentLocal.url), 60_000);
    setReplyingTo(null);
    setPeerRead(false);

    const tmpId = `tmp-${Date.now()}`;
    merge([
      {
        id: tmpId,
        key: tmpId,
        senderId: meId,
        body,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        mine: true,
        pending: true,
        replyTo,
        file: sentFile
          ? { name: sentFile.name, type: sentFile.type, size: sentFile.size, url: sentLocal?.url ?? "" }
          : null,
      },
    ]);

    try {
      const res = await fetch(`/api/chat/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: body || undefined,
          replyToId: replyTo?.id,
          file: sentFile
            ? {
                key: sentFile.key,
                name: sentFile.name,
                type: sentFile.type,
                size: sentFile.size,
              }
            : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Yuborilmadi");
      // optimistik xabarni real bilan JOYIDA almashtiramiz — DOM elementi
      // o'zgarmaydi, shuning uchun blur animatsiyasi qayta ishlamaydi
      const real = data.message as Msg;
      const t = real.updatedAt || real.createdAt;
      if (t > sinceRef.current) sinceRef.current = t;
      setMessages((prev) => {
        let replaced = false;
        const next = prev
          // SSE allaqachon real xabarni qo'shgan bo'lsa — dublikatni olib tashlaymiz
          .filter((m) => m.id !== real.id)
          .map((m) => {
            if (m.id === tmpId) {
              replaced = true;
              return { ...real, key: tmpId };
            }
            return m;
          });
        if (!replaced) next.push({ ...real, key: tmpId });
        return next.sort((a, b) => a.createdAt - b.createdAt);
      });
    } catch (e2) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tmpId
            ? { ...m, pending: false, body: `${m.body} (yuborilmadi)` }
            : m,
        ),
      );
      setErr(e2 instanceof Error ? e2.message : "Xatolik");
    }
  }

  const lastMineId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.mine && !m.pending && !m.deleted) return m.id;
    }
    return null;
  }, [messages]);

  const canSend =
    !uploading && (editing ? !!text.trim() : !!text.trim() || !!attachment);

  return (
    <div className="fixed inset-0 z-40 flex flex-col lg:left-[34rem]">
      {/* ---- birlashgan header (sayt + suhbat) ---- */}
      <header className="shrink-0 border-b border-white/10 bg-[#0b0b12]/80 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-3xl items-center gap-2.5 px-3 py-2.5 sm:px-4">
          <button
            type="button"
            onClick={() => router.push("/messages")}
            className="backdrop-blur-sm -ml-1 rounded-lg px-1.5 py-1 text-lg text-zinc-400 transition hover:bg-white/5 hover:text-white"
            aria-label="Orqaga"
          >
            ‹
          </button>
          <Link
            href={other.isSupport || !other.id ? "#" : `/u/${other.id}`}
            className="flex min-w-0 flex-1 items-center gap-2.5"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5 text-zinc-500">
              {theyBlocked ? (
                <BlockedIcon className="h-4 w-4" />
              ) : (
                other.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={other.image} alt="" className="h-full w-full object-cover" />
                )
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate font-medium text-white">{other.name}</div>
              {!other.isSupport && (
                <div className="flex items-center gap-1.5 truncate text-xs text-zinc-500">
                  {theyBlocked ? (
                    <span>uzoq vaqt kirmagan</span>
                  ) : (
                    (() => {
                      const p = presenceText(otherSeen);
                      return (
                        <>
                          <span
                            className={`inline-block h-1.5 w-1.5 rounded-full ${
                              p.online ? "bg-emerald-400" : "bg-zinc-600"
                            }`}
                          />
                          <span className={p.online ? "text-emerald-400" : ""}>
                            {p.text}
                          </span>
                        </>
                      );
                    })()
                  )}
                </div>
              )}
            </div>
          </Link>

          {other.id && !other.isSupport && (
            <div className="shrink-0">
              <button
                ref={hdrBtnRef}
                type="button"
                onClick={toggleHdrMenu}
                className="backdrop-blur-sm flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
                aria-label="Menyu"
              >
                ⋮
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ---- qadalgan loyiha(lar) — Telegramdagi "pinned message"ga o'xshab.
          Faqat HOZIR faol (bekor qilinmagan/yakunlanmagan/o'chirilmagan)
          loyihalar ko'rsatiladi; 2+ bo'lsa avtomatik almashib turadi. ---- */}
      {pinnedOrder && (
        <div className="shrink-0 border-b border-white/10 bg-[#0e0e16]/90 backdrop-blur-2xl">
          <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-2 sm:px-4">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <span className="shrink-0 text-base">📌</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-white">
                  {pinnedOrder.title}
                </div>
                <div className="truncate text-xs text-zinc-500">
                  {pinnedOrder.deadline && (
                    <>
                      <span className="text-zinc-300">
                        ⏱ {shortDateTime(pinnedOrder.deadline)}
                      </span>
                      {" · "}
                    </>
                  )}
                  {pinBadge(pinnedOrder)}
                </div>
              </div>
              <Link
                href={`/orders/${pinnedOrder.id}`}
                className="shrink-0 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-medium text-indigo-200 transition hover:bg-indigo-500/30"
              >
                Ishni ko'rish
              </Link>
            </div>
            {orders.length > 1 && (
              <button
                type="button"
                onClick={() => setPinIdx((i) => (i + 1) % orders.length)}
                className="backdrop-blur-sm shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-zinc-300 transition hover:bg-white/20"
                aria-label="Keyingi loyiha"
              >
                {pinIdx + 1}/{orders.length}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ---- header menyusi — portal, hamma narsadan ustun, scrollga xalaqit bermaydi ---- */}
      {hdrMenu &&
        createPortal(
          <div
            ref={hdrMenuRef}
            className="menu-panel fixed z-[999] w-52 overflow-hidden rounded-xl border border-white/10 bg-[#14141b] text-sm shadow-2xl shadow-black/50"
            style={{ left: hdrMenu.left, top: hdrMenu.top }}
          >
            {!other.isSupport && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setHdrMenu(null);
                    setReportHdr(true);
                  }}
                  className="backdrop-blur-sm block w-full px-3 py-2.5 text-left text-amber-300 hover:bg-white/5"
                >
                  ⚠︎ Shikoyat qilish
                </button>
                <button
                  type="button"
                  onClick={toggleBlock}
                  className="backdrop-blur-sm block w-full px-3 py-2.5 text-left text-zinc-200 hover:bg-white/5"
                >
                  {iBlocked ? "✓ Blokdan chiqarish" : "🚫 Bloklash"}
                </button>
              </>
            )}
            {!other.isSupport && (
              <button
                type="button"
                onClick={deleteConversation}
                className="backdrop-blur-sm block w-full px-3 py-2.5 text-left text-red-400 hover:bg-white/5"
              >
                🗑 Suhbatni o'chirish
              </button>
            )}
          </div>,
          document.body,
        )}

      {/* ---- xabarlar + suzuvchi composer ---- */}
      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            nearBottomRef.current =
              el.scrollHeight - el.scrollTop - el.clientHeight < 140;
          }}
          className="h-full overflow-y-auto"
        >
          <div className="mx-auto max-w-3xl space-y-2 px-3 pb-36 pt-4 sm:px-4">
            {messages.length === 0 && (
              <p className="mt-10 text-center text-sm text-zinc-500">
                Suhbatni boshlang.
              </p>
            )}
            {messages.map((m) => {
              if (m.system) {
                return (
                  <div
                    key={m.key ?? m.id}
                    className={`blur-in flex ${m.mine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[86%] overflow-hidden rounded-2xl text-sm ${
                        m.mine
                          ? "bg-indigo-600 text-white"
                          : "border border-white/10 bg-white/5 text-zinc-100"
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words px-3.5 py-2">
                        {m.body}
                        <div
                          className={`mt-0.5 text-right text-[10px] ${
                            m.mine ? "text-indigo-200" : "text-zinc-500"
                          }`}
                        >
                          {fmtTime(m.createdAt)}
                        </div>
                      </div>
                      {pinnedOrder && (
                        <Link
                          href={`/orders/${pinnedOrder.id}`}
                          className={`block border-t px-3.5 py-2 text-center font-medium backdrop-blur-sm transition ${
                            m.mine
                              ? "border-white/20 bg-white/10 text-white hover:bg-white/20"
                              : "border-white/10 bg-white/5 text-indigo-300 hover:bg-white/10"
                          }`}
                        >
                          Buyurtmani ko'rish ›
                        </Link>
                      )}
                    </div>
                  </div>
                );
              }
              const showMenu = !m.pending && !m.deleted;
              const hasReactions =
                (m.reactions?.like ?? 0) > 0 || (m.reactions?.dislike ?? 0) > 0;
              const MenuBtn = showMenu ? (
                <button
                  type="button"
                  onClick={(e) => openMenu(m, e.currentTarget)}
                  className="backdrop-blur-sm flex h-7 w-7 shrink-0 items-center justify-center self-end rounded-lg border border-white/15 bg-white/10 text-zinc-300 opacity-100 transition hover:bg-white/20 hover:text-white [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
                  aria-label="Xabar menyusi"
                >
                  ⋮
                </button>
              ) : null;

              return (
                <div
                  key={m.key ?? m.id}
                  id={`msg-${m.id}`}
                  className={`blur-in group flex rounded-2xl transition ${
                    m.mine ? "justify-end" : "justify-start"
                  }`}
                >
                  <div className="flex max-w-[86%] items-end gap-1.5">
                    {m.mine && MenuBtn}

                    <div
                      className={`space-y-1 rounded-2xl px-3.5 py-2 text-sm ${
                        m.mine
                          ? "bg-indigo-600 text-white"
                          : "border border-white/10 bg-white/5 text-zinc-100"
                      } ${m.pending ? "opacity-60" : ""}`}
                    >
                      {m.replyTo && (
                        <button
                          type="button"
                          onClick={() => scrollToMessage(m.replyTo!.id)}
                          className={`backdrop-blur-sm block w-full rounded-md border-l-2 py-1 pl-2 pr-1 text-left text-xs ${
                            m.mine
                              ? "border-white/60 bg-white/15"
                              : "border-indigo-400/70 bg-indigo-500/10"
                          }`}
                        >
                          <div className="font-medium opacity-90">
                            {m.replyTo.authorId === meId ? "Siz" : other.name}
                          </div>
                          <div className="truncate opacity-75">{m.replyTo.text}</div>
                        </button>
                      )}
                      {m.file && m.file.url && (
                        <ChatFileView file={m.file} mine={m.mine} />
                      )}
                      {m.file && !m.file.url && (
                        <div className="text-xs opacity-70">
                          📎 {m.file.name} · yuborilmoqda…
                        </div>
                      )}
                      {m.body && (
                        <div className="whitespace-pre-wrap break-words">
                          <Linkify text={m.body} mine={m.mine} />
                        </div>
                      )}

                      {hasReactions && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {(["LIKE", "DISLIKE"] as const).map((v) => {
                            const n =
                              v === "LIKE"
                                ? m.reactions?.like ?? 0
                                : m.reactions?.dislike ?? 0;
                            if (n === 0) return null;
                            const on = m.reactions?.mine === v;
                            return (
                              <button
                                key={v}
                                type="button"
                                onClick={() => react(m, v)}
                                className={`backdrop-blur-sm flex items-center gap-1 rounded-full px-2 py-1 text-sm transition ${
                                  on
                                    ? m.mine
                                      ? "bg-white/25 text-white ring-1 ring-white/40"
                                      : "bg-indigo-500/30 text-white ring-1 ring-indigo-400/50"
                                    : m.mine
                                      ? "bg-white/10 text-indigo-100"
                                      : "bg-white/10 text-zinc-200"
                                }`}
                              >
                                <span className="text-base leading-none">
                                  {v === "LIKE" ? "👍" : "👎"}
                                </span>
                                <span className="text-xs font-medium">{n}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      <div
                        className={`text-right text-[10px] ${
                          m.mine ? "text-indigo-200" : "text-zinc-500"
                        }`}
                      >
                        {m.edited && "tahrirlangan · "}
                        {fmtTime(m.createdAt)}
                        {m.mine && <ReadTicks pending={!!m.pending} read={!!m.readAt || (m.id === lastMineId && peerRead)} />}
                      </div>
                    </div>

                    {!m.mine && MenuBtn}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* suzuvchi, chegarali, blurli composer — pastda bo'shliq bilan */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 px-3 sm:px-4"
          style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="pointer-events-auto mx-auto max-w-3xl rounded-2xl border border-white/15 bg-[#0b0b12]/80 p-2.5 shadow-2xl shadow-black/40 backdrop-blur-2xl">
            {err && <p className="mb-2 px-1 text-xs text-red-400">{err}</p>}

            {blocked ? (
              <div className="flex items-center justify-between gap-3 px-1 py-1.5 text-sm text-zinc-400">
                <span>
                  {iBlocked
                    ? "Siz bu foydalanuvchini bloklagansiz."
                    : "Bu foydalanuvchi sizni bloklagan."}
                </span>
                {iBlocked && (
                  <button
                    type="button"
                    onClick={toggleBlock}
                    className="backdrop-blur-sm shrink-0 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/10"
                  >
                    Blokdan chiqarish
                  </button>
                )}
              </div>
            ) : (
              <>
            {editing && (
              <div className="mb-2 flex items-center justify-between rounded-lg bg-white/5 px-3 py-1.5 text-xs text-zinc-300">
                <span>Xabarni tahrirlash</span>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="text-zinc-500 hover:text-white"
                >
                  bekor ✕
                </button>
              </div>
            )}

            {replyingTo && !editing && (
              <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border-l-2 border-indigo-400/70 bg-white/5 px-3 py-1.5 text-xs">
                <div className="min-w-0">
                  <div className="text-indigo-300">
                    Javob:{" "}
                    {replyingTo.authorId === meId ? "Siz" : other.name}
                  </div>
                  <div className="truncate text-zinc-400">{replyingTo.text}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="shrink-0 text-zinc-500 hover:text-white"
                >
                  ✕
                </button>
              </div>
            )}

            {/* tanlangan fayl / ovozli xabar — yuborishdan oldin ko'rib chiqish */}
            {localFile && !editing && (
              <div className="mb-2 flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-2.5">
                <div className="relative min-w-0 flex-1">
                  <ChatFileView file={localFile} mine={false} />
                  {uploading && (
                    <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/45">
                      <ProgressRing pct={uploadPct} size={46} />
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                  <button
                    type="button"
                    onClick={cancelAttachment}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-zinc-300 hover:bg-white/20 hover:text-white"
                    aria-label="Bekor qilish"
                  >
                    ✕
                  </button>
                  <span className="text-[11px] text-zinc-500">
                    {uploading ? `${uploadPct}%` : humanSize(localFile.size)}
                  </span>
                </div>
              </div>
            )}

            <form onSubmit={submit} className="flex items-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onPickFile(f);
                }}
              />
              {!editing && (
                <button
                  type="button"
                  className="btn-ghost flex h-[42px] w-[42px] shrink-0 items-center justify-center !p-0 text-lg leading-none"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  title="Fayl biriktirish"
                >
                  {uploading ? "…" : "📎"}
                </button>
              )}
              {voice.recording ? (
                <div className="flex min-h-[42px] flex-1 items-center gap-2.5 rounded-xl border border-red-400/30 bg-red-500/10 px-3 text-sm text-zinc-200">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                  <span className="tabular-nums">
                    {Math.floor(voice.seconds / 60)}:{String(voice.seconds % 60).padStart(2, "0")}
                  </span>
                  <span className="truncate text-xs text-zinc-400">Qo&apos;yib yuboring — tayyor</span>
                </div>
              ) : (
                <textarea
                className="input max-h-32 min-h-[42px] resize-none bg-white/[0.03]"
                placeholder={editing ? "Yangi matn…" : "Xabar yozing…"}
                rows={1}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit(e);
                  }
                }}
              />
              )}
              {!editing && !text.trim() && !attachment && !uploading ? (
                // matn yo'q — Telegramdagidek mikrofon: bosib turib yozasiz, qo'yib yuborsangiz tayyor
                <button
                  type="button"
                  className={`btn-primary flex h-[42px] w-[42px] shrink-0 touch-none select-none items-center justify-center !p-0 ${
                    voice.recording ? "scale-110 !bg-red-500 !bg-none" : ""
                  }`}
                  aria-label="Ovozli xabar (bosib turing)"
                  title="Ovozli xabar — bosib turing"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
                    voice.start();
                  }}
                  onPointerUp={() => voice.stop()}
                  onPointerCancel={() => voice.cancel()}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <MicIcon />
                </button>
              ) : (
                <button
                  className="btn-primary flex h-[42px] w-[42px] shrink-0 items-center justify-center !p-0 text-lg leading-none"
                  disabled={!canSend}
                  aria-label={editing ? "Saqlash" : "Yuborish"}
                  title={editing ? "Saqlash" : "Yuborish"}
                >
                  {editing ? "✓" : <RocketIcon />}
                </button>
              )}
            </form>
              </>
            )}
          </div>
        </div>
      </div>

      {/* xabar menyusi — ekranga moslashadigan popup */}
      {menu &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[70]" onClick={() => setMenu(null)} />
            <div
              ref={msgMenuRef}
              className="menu-panel fixed z-[71] w-[184px] overflow-hidden rounded-xl border border-white/10 bg-[#14141b] text-sm shadow-2xl shadow-black/50"
              style={{ left: menu.left, top: menu.top }}
            >
              <div className="flex gap-1 border-b border-white/10 p-1.5">
                {(["LIKE", "DISLIKE"] as const).map((v) => {
                  const on = menu.msg.reactions?.mine === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        react(menu.msg, v);
                        setMenu(null);
                      }}
                      className={`backdrop-blur-sm flex-1 rounded-lg py-1.5 text-lg transition ${
                        on ? "bg-indigo-500/30" : "hover:bg-white/10"
                      }`}
                    >
                      {v === "LIKE" ? "👍" : "👎"}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => startReply(menu.msg)}
                className="backdrop-blur-sm block w-full px-3 py-2.5 text-left text-zinc-200 hover:bg-white/5"
              >
                ↩︎ Javob berish
              </button>
              {menu.msg.mine ? (
                <>
                  <button
                    type="button"
                    onClick={() => startEdit(menu.msg)}
                    className="backdrop-blur-sm block w-full px-3 py-2.5 text-left text-zinc-200 hover:bg-white/5"
                  >
                    ✎ Tahrirlash
                  </button>
                  <button
                    type="button"
                    onClick={() => del(menu.msg)}
                    className="backdrop-blur-sm block w-full px-3 py-2.5 text-left text-red-400 hover:bg-white/5"
                  >
                    🗑 O'chirish
                  </button>
                </>
              ) : (
                !other.isSupport && (
                  <button
                    type="button"
                    onClick={() => reportMsg(menu.msg)}
                    className="backdrop-blur-sm block w-full px-3 py-2.5 text-left text-amber-300 hover:bg-white/5"
                  >
                    ⚠︎ Shikoyat qilish
                  </button>
                )
              )}
            </div>
          </>,
          document.body,
        )}

      {report && (
        <ReportDialog
          suspectId={report.suspectId}
          orderId={orderId ?? undefined}
          messageId={report.messageId}
          onClose={() => setReport(null)}
        />
      )}

      {reportHdr && other.id && (
        <ReportDialog
          suspectId={other.id}
          orderId={orderId ?? undefined}
          onClose={() => setReportHdr(false)}
        />
      )}
    </div>
  );
}

/** Telegramdagidek: soat — yuborilmoqda, ✓ — yetkazildi, ✓✓ — o'qildi. */
function ReadTicks({ pending, read }: { pending: boolean; read: boolean }) {
  if (pending) {
    return (
      <svg viewBox="0 0 16 16" className="ml-1 inline h-3 w-3 align-[-2px]" fill="none" stroke="currentColor" strokeWidth={1.6} aria-label="yuborilmoqda">
        <circle cx="8" cy="8" r="6" />
        <path d="M8 5v3.2l2 1.3" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 20 12"
      className={`ml-1 inline h-3 w-[18px] align-[-1px] ${read ? "text-sky-300" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label={read ? "o'qildi" : "yetkazildi"}
    >
      <path d="M1.5 6.5 5 10l6.5-8" />
      {read && <path d="M8.5 9.2 9.3 10l6.5-8" />}
    </svg>
  );
}
