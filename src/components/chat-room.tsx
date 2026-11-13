"use client";

import { playSent } from "@/components/send-sound";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ReportDialog } from "@/components/report-button";
import { ChatFileView, humanSize, type ChatFile } from "@/components/chat-file";
import { Linkify } from "@/components/linkify";
import { playTin, primeTin } from "@/lib/notify-sound";
import { SAFETY_POLL_MS, useRealtime } from "@/lib/use-realtime";
import { RocketIcon, BlockedIcon, MicIcon, Icon, type IconName } from "@/components/icons";
import { ProgressRing } from "@/components/progress-ring";
import { useVoiceRecorder } from "@/lib/voice-recorder";
import { useDismiss } from "@/components/use-dismiss";
import { useUnread } from "@/components/unread-provider";
import { prepareAdminChatFile, prepareChatFile, type PreparedChatFile } from "@/lib/upload-client";
import { presenceText } from "@/lib/presence";
import { shortDateTime, smartTime } from "@/lib/date";
import { MessageSourceBadge } from "@/components/message-source-badge";
import { isForeignSource, type MessageSource } from "@/lib/message-source";
import { PlatformCheckboxes } from "@/components/platform-checkboxes";
import { flashMessage } from "@/lib/flash-message";
import { REACTION_EMOJIS, toggleReaction, withMine, type ReactionChip } from "@/lib/reaction-emojis";
import { BackChevron, HEADER_CAPSULE } from "@/components/page-header";
import { useFlashState } from "@/components/flash-status";
import { FloatingStack, ScrollDownButton, useScrollDown } from "@/components/scroll-down";
import { useChatMemory, useEnterAnim } from "@/components/chat-memory";
import { ConfirmDeleteDialog, SelectCheck, SelectTrashButton, useMsgSelection } from "@/components/msg-select";

interface ReplyPreview {
  id: string;
  authorId: string;
  text: string;
  deleted: boolean;
}

interface Msg {
  id: string;
  /** React uchun barqaror kalit — optimistik xabar real bilan almashganda o'zgarmaydi */
  key?: string;
  senderId: string;
  body: string;
  /** qaysi tizimdan yozilgan — faqat admin (support) ko'rinishida ko'rsatiladi */
  source?: MessageSource;
  system?: boolean;
  /** tizim xabari tegishli buyurtma */
  orderId?: string | null;
  /** xabar ostidagi tugma (masalan hamyon xabari: "Hisobni ko'rish") */
  action?: { url: string; label: string } | null;
  createdAt: number;
  updatedAt: number;
  mine: boolean;
  edited?: boolean;
  deleted?: boolean;
  pending?: boolean;
  /** qabul qiluvchi o'qigan vaqt (✓✓) */
  readAt?: number | null;
  replyTo?: ReplyPreview | null;
  /** emoji reaksiyalar (Family'dagidek) */
  reactions?: ReactionChip[];
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
  /** Admin panelida — "tayyorr.uz support" nomidan yozish (API'ga ?as=support) */
  asSupport?: boolean;
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
  OPEN: "Oçiq",
  IN_PROGRESS: "Jarayonda",
  DELIVERED: "Topşirilgan",
  DONE: "Yakunlangan",
  CANCELLED: "Bekor qilingan",
};

/** Qadalgan panel: shartnoma bosqichi qisqa matnda. */
function pinBadge(p: OrderPin): React.ReactNode {
  const withIcon = (name: IconName, text: string) => (
    <>
      <Icon name={name} className="mr-1 inline-block h-3 w-3 align-[-2px]" />
      {text}
    </>
  );
  if (p.contractStatus === "SENT") return withIcon("file", "Şartnoma yuborilgan");
  if (p.cancelState === "DISPUTED") return withIcon("scale", "Admin körib çiqmoqda");
  if (p.cancelState === "PENDING") return withIcon("alert", "Bekor qiliş söralgan");
  return ORDER_STATUS_LABEL[p.status] ?? p.status;
}

/** Javob preview matni: serverdan "📎 fayl.pdf" ko'rinishida keladi — emoji o'rniga ikonka. */
function ReplyText({ text }: { text: string }) {
  if (!text.startsWith("📎 ")) return <>{text}</>;
  return (
    <>
      <Icon name="paperclip" className="mr-1 inline-block h-3 w-3 align-[-2px]" />
      {text.slice(3)}
    </>
  );
}

function fmtTime(ms: number) {
  return smartTime(ms);
}

const MAX_FILE = 100 * 1024 * 1024;

/**
 * Real-time orqali kelgan özim yuborgan xabarga mos kutilayotgan optimistik (tmp-…) xabar:
 * bir xil matn + fayl nomi, 2 daqiqa oraliqda; bir neçtasi bölsa — eng eskisi (yuboriş tartibi).
 */
function matchPending(map: Map<string, Msg>, real: Msg, meId: string): Msg | null {
  if (real.system || !(real.mine || real.senderId === meId)) return null;
  let best: Msg | null = null;
  for (const x of map.values()) {
    if (!x.pending || !x.id.startsWith("tmp-")) continue;
    if ((x.body ?? "") !== (real.body ?? "")) continue;
    if ((x.file?.name ?? null) !== (real.file?.name ?? null)) continue;
    if (Math.abs(real.createdAt - x.createdAt) > 120_000) continue;
    if (!best || x.createdAt < best.createdAt) best = x;
  }
  return best;
}

export function ChatRoom({
  conversationId,
  meId,
  orderId,
  orders = [],
  asSupport = false,
  blockedByMe = false,
  blockedMe = false,
  other,
  initialMessages,
}: Props) {
  const router = useRouter();
  // admin panelida xuddi shu chat — support nomidan, havolalar admin sahifalariga
  const apiUrl = (path: string) =>
    asSupport ? `${path}${path.includes("?") ? "&" : "?"}as=support` : path;
  const listHref = asSupport ? "/sardorxon/admin/messages" : "/messages";
  const orderHref = (id: string) => (asSupport ? `/sardorxon/admin/orders/${id}` : `/orders/${id}`);
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
  // admin (support) javobi qaysi platformaga — standart: oxirgi kiruvchi xabar qayerdan kelgan bo'lsa
  const lastIncomingSource =
    [...messages].reverse().find((m) => !m.mine && !m.system)?.source ?? "tayyorr.uz";
  const [sendSource, setSendSource] = useState<MessageSource>(lastIncomingSource);
  useEffect(() => {
    setSendSource(lastIncomingSource);
  }, [lastIncomingSource]);
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
      return { left, top: r.bottom + 8 };
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
      const res = await fetch(apiUrl(`/api/chat/${conversationId}/block`), {
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
        "Suhbat ikkala tomondan ham öçiriladi. Davom etilsinmi?",
      )
    )
      return;
    try {
      const res = await fetch(apiUrl(`/api/chat/${conversationId}`), { method: "DELETE" });
      if (res.ok) {
        router.push(listHref);
        router.refresh();
      }
    } catch {
      setErr("Öçirib bölmadi");
    }
  }
  const [peerRead, setPeerRead] = useState(false);
  const [err, setErr] = useFlashState<string | null>(null);
  // javob (reply) bosilganda asl xabar sahifada bo'lmasa — mobil ilovadagidek xabar
  const [jumpMiss, setJumpMiss] = useState(false);

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

  // xabarlarni tanlaş (bir nechtasini birdan öçiriş) — faqat öz xabarlari
  const sel = useMsgSelection();
  const [confirmBulk, setConfirmBulk] = useState(false);
  const canSelect = (m: Msg) => m.mine && !m.pending && !m.deleted && !m.system;

  function openMenu(m: Msg, btn: HTMLElement) {
    const r = btn.getBoundingClientRect();
    const W = 184;
    const H = (m.mine ? 194 : 96) + 84; // + reaksiya paneli (10 ta emoji, 2 qator)
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
  // «↓» tugmasi: yuqoriga aylantirilganda çiqadi, kelgan xabarlar sonini körsatadi
  const scrollDown = useScrollDown(scrollRef, messages, { keyOf: (m) => m.key ?? m.id, isMine: (m) => m.mine });
  // qayta oçilganda — qoldirilgan joyda (xabar + masofa); birinçi marta — birinçi öqilmagan xabarda yoki pastda
  const [firstUnreadId] = useState(
    () => initialMessages.find((m) => !m.deleted && !m.mine && !m.readAt)?.id ?? null,
  );
  const memory = useChatMemory({
    ref: scrollRef,
    storeKey: asSupport ? `s:${conversationId}` : conversationId,
    prefix: "msg-",
    ready: true,
    firstUnreadId,
    onRestored: () => {
      const el = scrollRef.current;
      if (el) nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
      scrollDown.sync();
    },
  });
  // yangi xabar: özim yuborgan — «suyuq» sakraş, boşqalarniki — yumşoq pop (dastlabkilar — animatsiyasiz)
  const enterCls = useEnterAnim(memory.restored);
  const prevLenRef = useRef(initialMessages.filter((m) => !m.deleted).length);
  const sinceRef = useRef<number>(
    initialMessages.reduce((m, x) => Math.max(m, x.updatedAt || x.createdAt), 0),
  );

  // Fayl havolasi har so'rovda yangi (vaqtinchalik imzo). Xabar qayta kelganda (o'qildi, tahrir, real-time)
  // havola o'zgarsa — audio/video boshidan boshlanadi, rasm qayta yuklanadi. 45 daqiqagacha eskisini ishlatamiz.
  const fileCache = useRef<Map<string, { file: ChatFile; at: number }> | null>(null);
  if (!fileCache.current) {
    // sahifa ochilgandagi xabarlar havolasi — boshlang'ich nuqta
    fileCache.current = new Map(
      initialMessages.filter((m) => m.file?.url).map((m) => [m.id, { file: m.file!, at: Date.now() }]),
    );
  }
  const stableFile = useCallback((id: string, file: ChatFile | null | undefined) => {
    if (!file?.url || file.url.startsWith("blob:")) return file;
    const c = fileCache.current!.get(id);
    if (c && c.file.name === file.name && c.file.size === file.size && Date.now() - c.at < 45 * 60_000) return c.file;
    fileCache.current!.set(id, { file, at: Date.now() });
    return file;
  }, []);

  const merge = useCallback((incoming: Msg[]) => {
    if (!incoming.length) return;
    setMessages((prev) => {
      const map = new Map(prev.map((m) => [m.id, m]));
      for (const m of incoming) {
        const t = m.updatedAt || m.createdAt;
        if (t > sinceRef.current) sinceRef.current = t;
        if (m.deleted) {
          map.delete(m.id); // foydalanuvchida yo'qoladi
          continue;
        }
        let base = map.get(m.id);
        // real-time (SSE / so'rov) özim yuborgan xabarni POST javobidan OLDIN keltirsa — uni kutilayotgan
        // optimistik pufakça bilan birlaştiramiz: ikkinçi pufakça qöşilmaydi, React kaliti öşa (tmp-…),
        // element qayta yaratilmaydi va yuboriş animatsiyasi qayta işlamaydi
        if (!base && !m.pending) {
          const tmp = matchPending(map, m, meId);
          if (tmp) {
            map.delete(tmp.id);
            base = tmp;
          }
        }
        map.set(m.id, {
          ...base,
          ...m,
          key: m.key ?? base?.key,
          pending: m.pending,
          file: stableFile(m.id, m.file),
        });
      }
      return [...map.values()].sort((a, b) => a.createdAt - b.createdAt);
    });
  }, [stableFile, meId]);

  const applyDelete = useCallback((id: string, updatedAt: number) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    if (updatedAt > sinceRef.current) sinceRef.current = updatedAt;
  }, []);

  const markRead = useCallback(() => {
    // indikatorlarni darhol nolga tushiramiz (server so'rovini kutmasdan)
    unreadRef.current?.clearConv(conversationId);
    fetch(apiUrl(`/api/chat/${conversationId}/read`), { method: "POST" })
      .then(() => unreadRef.current?.clearConv(conversationId))
      .catch(() => {});
  }, [conversationId]);

  useEffect(() => primeTin(), []);

  // SSE
  useEffect(() => {
    const es = new EventSource(apiUrl(`/api/chat/${conversationId}/stream`));
    es.onopen = () => setLive(true);
    es.onerror = () => setLive(false);
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "reaction") {
          setMessages((prev) =>
            prev.map((x) =>
              x.id === data.messageId
                ? { ...x, reactions: Array.isArray(data.reactions) ? withMine(data.reactions, meId) : x.reactions }
                : x,
            ),
          );
          return;
        }
        if (data.type === "message" || data.type === "edit") {
          const m = data.message;
          // tayyorr+ / SMM ga xos xabar foydalanuvchining tayyorr.uz chatida ko'rinmaydi
          if (!asSupport && isForeignSource(m.source)) return;
          // boshqa tomondan kelgan yangi xabar — "tin"
          if (data.type === "message" && m.senderId !== meId && !m.system) playTin();
          merge([
            {
              id: m.id,
              senderId: m.senderId,
              body: m.body,
              source: m.source,
              system: m.system,
              orderId: m.orderId ?? null,
              action: m.action ?? null,
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
          // shartnoma holati o'zgardi — tepadagi qadalgan panel yangilansin
          if (data.type === "message" && m.system) router.refresh();
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

  // yangi + tahrirlangan + o'chirilgan xabarlar: real-time signal kelganda darhol,
  // ulanmagan bo'lsa — har 4 soniyada, ulangan bo'lsa — faqat siyrak ehtiyot tekshiruvi
  const fetchSinceRef = useRef<() => void>(() => {});
  const rtLive = useRealtime((e) => {
    if (e.name === "chat" && (!e.data.c || e.data.c === conversationId)) fetchSinceRef.current();
  });
  useEffect(() => {
    const fetchSince = async () => {
      try {
        const res = await fetch(
          apiUrl(`/api/chat/${conversationId}?since=${sinceRef.current}`),
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
    };
    fetchSinceRef.current = fetchSince;
    const iv = setInterval(fetchSince, rtLive ? SAFETY_POLL_MS : 4000);
    return () => clearInterval(iv);
  }, [conversationId, meId, merge, markRead, rtLive]);

  useEffect(() => {
    markRead();
  }, [markRead]);

  // yangi xabar qo'shilgandagina pastga tushamiz (reaksiya/tahrir emas)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const grew = messages.length > prevLenRef.current;
    const lastMine = messages[messages.length - 1]?.mine;
    prevLenRef.current = messages.length;
    if (grew && (nearBottomRef.current || lastMine)) {
      memory.release();
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
      const prepared = await (asSupport ? prepareAdminChatFile : prepareChatFile)(file, conversationId, (p) => {
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
        ? "öçirilgan xabar"
        : m.body || (m.file ? `📎 ${m.file.name}` : "xabar"),
      deleted: !!m.deleted,
    });
  }

  function scrollToMessage(id: string) {
    const el = document.getElementById(`msg-${id}`);
    if (!el) {
      setJumpMiss(true);
      setTimeout(() => setJumpMiss(false), 3500);
      return;
    }
    // Telegramdagidek ikki marta "lip-lip" yonadigan nur (mobil ilova bilan bir xil)
    flashMessage(el);
  }

  function reportMsg(m: Msg) {
    setMenu(null);
    setReport({ suspectId: m.senderId, messageId: m.id });
  }

  /** Reaksiya (Family'dagidek): o'sha emoji qayta bosilsa — olib tashlanadi, boshqasi — almashadi. */
  async function react(m: Msg, emoji: string) {
    // optimistik
    setMessages((prev) =>
      prev.map((x) => (x.id === m.id ? { ...x, reactions: toggleReaction(x.reactions, emoji, meId) } : x)),
    );
    try {
      const res = await fetch(
        apiUrl(`/api/chat/${conversationId}/messages/${m.id}/react`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emoji }),
        },
      );
      const data = await res.json();
      if (res.ok && Array.isArray(data.reactions)) {
        setMessages((prev) =>
          prev.map((x) => (x.id === m.id ? { ...x, reactions: data.reactions } : x)),
        );
      }
    } catch {
      /* ignore */
    }
  }

  function startSelect(m: Msg) {
    setMenu(null);
    if (canSelect(m)) sel.toggle(m.id);
  }

  function tapSelect(m: Msg) {
    if (canSelect(m)) sel.toggle(m.id);
    else setErr("Faqat öz xabaringizni tanlay olasiz");
  }

  /** Tanlangan xabarlarni bittada öçiriş — optimistik, xato bölsa qaytariladi. */
  async function delSelected() {
    setConfirmBulk(false);
    const idSet = new Set(sel.ids);
    const ids = [...idSet];
    if (!ids.length) return;
    const removed = messages.filter((m) => idSet.has(m.id));
    sel.clear();
    setMessages((prev) => prev.filter((m) => !idSet.has(m.id)));
    try {
      const res = await fetch(apiUrl(`/api/chat/${conversationId}/messages/bulk-delete`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setMessages((prev) => {
        const have = new Set(prev.map((m) => m.id));
        return [...prev, ...removed.filter((m) => !have.has(m.id))].sort((a, b) => a.createdAt - b.createdAt);
      });
      setErr("Öçirib bölmadi");
    }
  }

  // yöqolgan (boşqa joyda öçirilgan) xabarlar tanlovdan ham çiqadi
  const { active: selActive, prune: selPrune } = sel;
  useEffect(() => {
    if (!selActive) return;
    const alive = new Set(messages.map((m) => m.id));
    selPrune((id) => alive.has(id));
  }, [messages, selActive, selPrune]);

  async function del(m: Msg) {
    setMenu(null);
    if (!window.confirm("Xabar ikkala tomondan ham öçirilsinmi?")) return;
    applyDelete(m.id, Date.now());
    try {
      const res = await fetch(apiUrl(`/api/chat/${conversationId}/messages/${m.id}`), {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
    } catch {
      setErr("Öçirib bölmadi");
    }
  }

  // yuboriş navbati — xabarlar yozilgan tartibda bittadan ketadi (parallel ketsa server
  // ularni qaysi biri oldin yetsa şu tartibda saqlaydi va ketma-ketlik aralaşadi)
  const sendChainRef = useRef<Promise<unknown>>(Promise.resolve());
  function queued<T>(fn: () => Promise<T>): Promise<T> {
    const p = sendChainRef.current.then(fn, fn);
    sendChainRef.current = p.catch(() => {});
    return p;
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
          apiUrl(`/api/chat/${conversationId}/messages/${editId}`),
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
        setErr(e2 instanceof Error ? e2.message : "Tahrirlab bölmadi");
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

    const tmpId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
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
        source: asSupport ? sendSource : undefined,
        replyTo,
        file: sentFile
          ? { name: sentFile.name, type: sentFile.type, size: sentFile.size, url: sentLocal?.url ?? "" }
          : null,
      },
    ]);

    try {
      const res = await queued(() => fetch(apiUrl(`/api/chat/${conversationId}/messages`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: body || undefined,
          replyToId: replyTo?.id,
          source: asSupport ? sendSource : undefined,
          file: sentFile
            ? {
                key: sentFile.key,
                name: sentFile.name,
                type: sentFile.type,
                size: sentFile.size,
              }
            : undefined,
        }),
      }));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Yuborilmadi");
      playSent();
      // optimistik xabarni real bilan JOYIDA almashtiramiz — DOM elementi
      // o'zgarmaydi, shuning uchun blur animatsiyasi qayta ishlamaydi
      const real = data.message as Msg;
      const t = real.updatedAt || real.createdAt;
      if (t > sinceRef.current) sinceRef.current = t;
      setMessages((prev) => {
        const fresh = (m: Msg | undefined): Msg => ({
          ...m,
          ...real,
          key: m?.key ?? tmpId,
          pending: false,
          file: stableFile(real.id, real.file),
        });
        const existing = prev.find((m) => m.id === real.id);
        let next: Msg[];
        if (existing) {
          // real-time allaqaçon keltirgan (va odatda şu optimistik pufakça bilan birlaştirgan) — JOYIDA yangilaymiz.
          // U boşqa kutilayotgan pufakçani egallagan bölsa (bir xil matn ketma-ket), biznikini qoldiramiz —
          // uning öz real xabari kelganda birlaşadi; aks holda (moslanmay qolgan) optimistik nusxani olib taşlaymiz.
          const otherTmp = !!existing.key && existing.key !== tmpId && existing.key.startsWith("tmp-");
          next = prev
            .filter((m) => otherTmp || m.id !== tmpId)
            .map((m) => (m.id === real.id ? fresh(m) : m));
        } else if (prev.some((m) => m.id === tmpId)) {
          next = prev.map((m) => (m.id === tmpId ? fresh(m) : m));
        } else {
          next = [...prev, fresh(undefined)];
        }
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

  const profileHref =
    !other.id || other.isSupport
      ? "#"
      : asSupport
        ? `/sardorxon/admin/users/${other.id}`
        : `/u/${other.id}`;

  const canSend =
    !uploading && (editing ? !!text.trim() : !!text.trim() || !!attachment);

  return (
    <div
      className={`fixed inset-0 z-40 flex flex-col ${asSupport ? "lg:left-[33rem]" : "lg:left-[34rem]"}`}
    >
      {/* ---- header: ilovadagi kabi alohida kapsulalar — orqaga · avatar · ism+holat · ⋮ ---- */}
      <header className="relative z-10 shrink-0">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[calc(100%+12px)]"
          style={{
            background:
              "linear-gradient(to bottom, var(--bg) 0%, color-mix(in srgb, var(--bg) 85%, transparent) 60%, transparent 100%)",
          }}
        />
        {sel.active ? (
          <div
            key="sel"
            className="sel-fade relative mx-auto flex h-14 max-w-3xl items-center gap-2 px-3 sm:px-4"
            style={{ marginTop: "calc(env(safe-area-inset-top, 0px) + 0.5rem)", marginBottom: "0.25rem" }}
          >
            <button
              type="button"
              onClick={sel.clear}
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-zinc-200 transition hover:text-white active:scale-95 ${HEADER_CAPSULE}`}
              aria-label="Tanlaşdan çiqiş"
            >
              <Icon name="close" className="h-[19px] w-[19px]" />
            </button>
            <div className={`flex h-12 min-w-0 flex-1 items-center rounded-full px-4 ${HEADER_CAPSULE}`}>
              <div className="truncate text-[14.5px] font-medium text-white">{sel.count} ta tanlandi</div>
            </div>
            <SelectTrashButton onClick={() => setConfirmBulk(true)} className={HEADER_CAPSULE} />
          </div>
        ) : (
        <div
          key="norm"
          className="sel-fade relative mx-auto flex h-14 max-w-3xl items-center gap-2 px-3 sm:px-4"
          style={{ marginTop: "calc(env(safe-area-inset-top, 0px) + 0.5rem)", marginBottom: "0.25rem" }}
        >
          <button
            type="button"
            onClick={() => router.push(listHref)}
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-zinc-200 transition hover:text-white active:scale-95 ${HEADER_CAPSULE}`}
            aria-label="Orqaga"
          >
            <BackChevron className="h-[19px] w-[19px]" />
          </button>
          <Link
            href={profileHref}
            aria-label={other.name}
            className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full text-zinc-500 transition active:scale-95 ${HEADER_CAPSULE}`}
          >
            {theyBlocked ? (
              <BlockedIcon className="h-5 w-5" />
            ) : other.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={other.image} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-[17px] font-semibold text-zinc-300">
                {other.name.trim().slice(0, 1).toUpperCase() || "?"}
              </span>
            )}
          </Link>
          <Link
            href={profileHref}
            className={`flex h-12 min-w-0 flex-1 flex-col justify-center rounded-full px-4 transition active:scale-[0.99] ${HEADER_CAPSULE}`}
          >
            <div className="truncate text-[14.5px] font-medium leading-tight text-white">{other.name}</div>
            {other.isSupport ? (
              <div className="truncate text-xs leading-tight text-emerald-400">Qöllab-quvvatlaş</div>
            ) : (
              <div className="mt-0.5 flex items-center gap-1.5 truncate text-xs leading-tight text-zinc-500">
                {theyBlocked ? (
                  <span>uzoq vaqt kirmagan</span>
                ) : (
                  (() => {
                    const p = presenceText(otherSeen);
                    return (
                      <>
                        <span
                          className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                            p.online ? "bg-emerald-400" : "bg-zinc-600"
                          }`}
                        />
                        <span className={`truncate ${p.online ? "text-emerald-400" : ""}`}>{p.text}</span>
                      </>
                    );
                  })()
                )}
              </div>
            )}
          </Link>

          {other.id && !other.isSupport && !asSupport && (
            <button
              ref={hdrBtnRef}
              type="button"
              onClick={toggleHdrMenu}
              aria-expanded={!!hdrMenu}
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-zinc-200 transition hover:text-white active:scale-95 ${HEADER_CAPSULE}`}
              aria-label="Amallar"
            >
              <Icon name="more" className="h-[21px] w-[21px]" />
            </button>
          )}
        </div>
        )}
      </header>

      {/* ---- qadalgan loyiha(lar) — Telegramdagi "pinned message"ga o'xshab.
          Faqat HOZIR faol (bekor qilinmagan/yakunlanmagan/o'chirilmagan)
          loyihalar ko'rsatiladi; 2+ bo'lsa avtomatik almashib turadi. ---- */}
      {pinnedOrder && (
        <div className="shrink-0 border-b border-white/10 bg-[#0e0e16]/90 backdrop-blur-2xl">
          <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-2 sm:px-4">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <Icon name="pin" className="h-4 w-4 shrink-0 text-indigo-300" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-white">
                  {pinnedOrder.title}
                </div>
                <div className="truncate text-xs text-zinc-500">
                  {pinnedOrder.deadline && (
                    <>
                      <span className="text-zinc-300">
                        <Icon name="clock" className="mr-1 inline-block h-3 w-3 align-[-2px]" />
                        {shortDateTime(pinnedOrder.deadline)}
                      </span>
                      {" · "}
                    </>
                  )}
                  {pinBadge(pinnedOrder)}
                </div>
              </div>
              <Link
                href={orderHref(pinnedOrder.id)}
                className="shrink-0 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-medium text-indigo-200 transition hover:bg-indigo-500/30"
              >
                Işni köriş
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
          // blursiz, qattiq fonli karta — ⋮ kapsulasining tagida, öng çetiga tekislangan
          <div
            ref={hdrMenuRef}
            role="menu"
            className="menu-panel fixed z-[999] w-52 overflow-hidden rounded-2xl border border-white/10 bg-[var(--surface-2)] p-1 text-sm shadow-2xl shadow-black/50"
            style={{ left: hdrMenu.left, top: hdrMenu.top }}
          >
            {!other.isSupport && (
              <>
                <Link
                  href={profileHref}
                  onClick={() => setHdrMenu(null)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-zinc-200 hover:bg-white/5"
                >
                  <Icon name="user" className="h-4 w-4 shrink-0" />
                  Profilni köriş
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setHdrMenu(null);
                    setReportHdr(true);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-amber-300 hover:bg-white/5"
                >
                  <Icon name="alert" className="h-4 w-4 shrink-0" />
                  Şikoyat qiliş
                </button>
                <button
                  type="button"
                  onClick={toggleBlock}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-zinc-200 hover:bg-white/5"
                >
                  <Icon name={iBlocked ? "check" : "ban"} className="h-4 w-4 shrink-0" />
                  {iBlocked ? "Blokdan çiqariş" : "Bloklaş"}
                </button>
                <button
                  type="button"
                  onClick={deleteConversation}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-red-400 hover:bg-white/5"
                >
                  <Icon name="trash" className="h-4 w-4 shrink-0" />
                  Suhbatni öçiriş
                </button>
              </>
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
            scrollDown.onScroll();
          }}
          className="h-full overflow-y-auto"
          style={memory.hideStyle}
        >
          <div className="mx-auto max-w-3xl space-y-2 px-3 pb-36 pt-4 sm:px-4">
            {messages.length === 0 && (
              <p className="mt-10 text-center text-sm text-zinc-500">
                Suhbatni boşlang.
              </p>
            )}
            {messages.map((m) => {
              if (m.system) {
                return (
                  <div
                    key={m.key ?? m.id}
                    id={`msg-${m.id}`}
                    className={`flex ${enterCls(m.key ?? m.id, m.createdAt, "pop")} ${m.mine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[86%] overflow-hidden rounded-2xl text-sm ${
                        m.mine
                          ? "bg-indigo-600 text-white"
                          : "border border-white/10 bg-white/5 text-zinc-100"
                      }`}
                    >
                      <div className="whitespace-pre-wrap px-3.5 py-2 [overflow-wrap:anywhere]">
                        {m.body}
                        <div
                          className={`mt-0.5 text-right text-[10px] ${
                            m.mine ? "text-indigo-200" : "text-zinc-500"
                          }`}
                        >
                          {fmtTime(m.createdAt)}
                        </div>
                      </div>
                      {(m.orderId ?? pinnedOrder?.id ?? orderId) && (
                        <Link
                          href={orderHref((m.orderId ?? pinnedOrder?.id ?? orderId)!)}
                          className={`block border-t px-3.5 py-2 text-center font-medium backdrop-blur-sm transition ${
                            m.mine
                              ? "border-white/20 bg-white/10 text-white hover:bg-white/20"
                              : "border-white/10 bg-white/5 text-indigo-300 hover:bg-white/10"
                          }`}
                        >
                          Buyurtmani köriş ›
                        </Link>
                      )}
                    </div>
                  </div>
                );
              }
              const showMenu = !m.pending && !m.deleted;
              const hasReactions = !!m.reactions?.length;
              const picked = sel.ids.has(m.id);
              const selectable = canSelect(m);
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
                  onClick={sel.active ? () => tapSelect(m) : undefined}
                  className={`${enterCls(m.key ?? m.id, m.createdAt, (m.key ?? m.id).startsWith("tmp-") ? "send" : "pop")} group flex rounded-2xl transition ${
                    m.mine ? "justify-end" : "justify-start"
                  } ${sel.active ? `-mx-2 cursor-pointer select-none px-2 py-0.5 ${picked ? "bg-indigo-500/15" : ""}` : ""}`}
                >
                  <div className={`flex max-w-[86%] items-end gap-1.5 ${sel.active ? "[&>div_*]:pointer-events-none" : ""}`}>
                    {m.mine && (sel.active ? selectable && <SelectCheck on={picked} /> : MenuBtn)}

                    <div
                      className={`min-w-0 space-y-1 rounded-2xl px-3.5 py-2 text-sm [overflow-wrap:anywhere] ${
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
                          <div className="truncate opacity-75">
                            <ReplyText text={m.replyTo.text} />
                          </div>
                        </button>
                      )}
                      {m.file && m.file.url && (
                        <ChatFileView file={m.file} mine={m.mine} />
                      )}
                      {m.file && !m.file.url && (
                        <div className="flex items-center gap-1 text-xs opacity-70">
                          <Icon name="paperclip" className="h-3.5 w-3.5 shrink-0" />
                          {m.file.name} · yuborilmoqda…
                        </div>
                      )}
                      {m.body && (
                        <div className="whitespace-pre-wrap break-words">
                          <Linkify text={m.body} mine={m.mine} />
                        </div>
                      )}
                      {m.action && !asSupport && (
                        <Link
                          href={m.action.url}
                          className={`mt-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                            m.mine ? "bg-white/15 text-white hover:bg-white/25" : "bg-indigo-500/15 text-indigo-200 hover:bg-indigo-500/25"
                          }`}
                        >
                          <Icon name="wallet" className="h-4 w-4" />
                          {m.action.label} ›
                        </Link>
                      )}

                      {hasReactions && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {m.reactions!.map((r) => {
                            const on = r.mine;
                            return (
                              <button
                                key={r.emoji}
                                type="button"
                                onClick={() => react(m, r.emoji)}
                                className={`backdrop-blur-sm flex items-center gap-1 rounded-full px-2 py-0.5 text-sm transition ${
                                  on
                                    ? m.mine
                                      ? "bg-white/25 text-white ring-1 ring-white/40"
                                      : "bg-indigo-500/30 text-white ring-1 ring-indigo-400/50"
                                    : m.mine
                                      ? "bg-white/10 text-indigo-100"
                                      : "bg-white/10 text-zinc-200"
                                }`}
                              >
                                <span className="text-base leading-none">{r.emoji}</span>
                                <span className="text-xs font-medium">{r.count}</span>
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
                        {asSupport && <MessageSourceBadge source={m.source} />}
                        {m.edited && "tahrirlangan · "}
                        {fmtTime(m.createdAt)}
                        {m.mine && <ReadTicks pending={!!m.pending} read={!!m.readAt || (m.id === lastMineId && peerRead)} />}
                      </div>
                    </div>

                    {!m.mine && !sel.active && MenuBtn}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ilovadagi composer: çapda alohida 📎 kapsula, öngda yumaloq maydon + yuboriş tugmasi;
            javob / tahrir / fayl kartalari maydon ustida */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 px-3 sm:px-4"
          style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="pointer-events-auto relative mx-auto max-w-3xl">
            {/* suzuvçi tugmalar — composer ustida, öng tomonda (bir-birining ustiga 8px oraliq bilan) */}
            <FloatingStack className="absolute bottom-full right-0 mb-2">
              {scrollDown.away && <ScrollDownButton unread={scrollDown.unread} onClick={scrollDown.scrollDown} />}
            </FloatingStack>
            {err && (
              <p className={`flash-status mb-2 rounded-2xl px-3.5 py-2 text-xs text-red-400 ${HEADER_CAPSULE}`}>{err}</p>
            )}

            {blocked ? (
              <div className={`flex items-center justify-between gap-3 rounded-[24px] px-4 py-3 text-sm text-zinc-400 ${HEADER_CAPSULE}`}>
                <span>
                  {iBlocked
                    ? "Siz bu foydalanuvçini bloklagansiz."
                    : "Bu foydalanuvçi sizni bloklagan."}
                </span>
                {iBlocked && (
                  <button
                    type="button"
                    onClick={toggleBlock}
                    className="shrink-0 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/10"
                  >
                    Blokdan çiqariş
                  </button>
                )}
              </div>
            ) : (
              <>
            {(editing || jumpMiss || (replyingTo && !editing) || (localFile && !editing)) && (
              <div className={`mb-2 rounded-2xl p-2 ${HEADER_CAPSULE}`}>
            {editing && (
              <div className="[&:not(:last-child)]:mb-2 flex items-center justify-between rounded-lg bg-white/5 px-3 py-1.5 text-xs text-zinc-300">
                <span>Xabarni tahrirlaş</span>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="flex items-center gap-1 text-zinc-500 hover:text-white"
                >
                  bekor <Icon name="close" className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {jumpMiss && (
              <div className="pointer-events-none flex justify-center [&:not(:last-child)]:mb-2">
                <span className="rounded-full bg-zinc-900/90 px-3 py-1.5 text-xs text-white shadow-lg">
                  Asl xabar topilmadi (öçirilgan yoki juda eski)
                </span>
              </div>
            )}
            {replyingTo && !editing && (
              <div className="[&:not(:last-child)]:mb-2 flex items-center justify-between gap-2 rounded-lg border-l-2 border-indigo-400/70 bg-white/5 px-3 py-1.5 text-xs">
                {/* bosilsa — asl xabarga o'tadi (mobil ilovadagidek) */}
                <button
                  type="button"
                  onClick={() => scrollToMessage(replyingTo.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="text-indigo-300">
                    Javob:{" "}
                    {replyingTo.authorId === meId ? "Siz" : other.name}
                  </div>
                  <div className="truncate text-zinc-400">
                    <ReplyText text={replyingTo.text} />
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="shrink-0 text-zinc-500 hover:text-white"
                  aria-label="Bekor qiliş"
                >
                  <Icon name="close" className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* tanlangan fayl / ovozli xabar — yuborishdan oldin ko'rib chiqish */}
            {localFile && !editing && (
              <div className="[&:not(:last-child)]:mb-2 flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-2.5">
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
                    aria-label="Bekor qiliş"
                  >
                    <Icon name="close" className="h-4 w-4" />
                  </button>
                  <span className="text-[11px] text-zinc-500">
                    {uploading ? `${uploadPct}%` : humanSize(localFile.size)}
                  </span>
                </div>
              </div>
            )}

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
              {!editing && !voice.recording && (
                <button
                  type="button"
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-zinc-200 transition hover:text-white active:scale-95 disabled:opacity-50 ${HEADER_CAPSULE}`}
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Fayl biriktiriş"
                  title="Fayl biriktiriş"
                >
                  {uploading ? "…" : <Icon name="paperclip" className="h-[21px] w-[21px]" />}
                </button>
              )}
              <div className={`flex min-w-0 flex-1 items-end gap-2 rounded-[24px] p-[3px] ${HEADER_CAPSULE}`}>
              {voice.recording ? (
                <div className="flex h-[42px] flex-1 items-center gap-2.5 rounded-full bg-red-500/10 px-3 text-sm text-zinc-200">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                  <span className="tabular-nums">
                    {Math.floor(voice.seconds / 60)}:{String(voice.seconds % 60).padStart(2, "0")}
                  </span>
                  <span className="truncate text-xs text-zinc-400">Qöyib yuboring — tayyor</span>
                </div>
              ) : (
                <textarea
                className="max-h-32 min-h-[42px] min-w-0 flex-1 resize-none bg-transparent px-3 py-[10px] text-sm leading-[1.5] text-white outline-none placeholder:text-zinc-500"
                placeholder={editing ? "Yangi matn…" : attachment ? "Izoh qöşing…" : "Xabar yozing…"}
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
                  className={`btn-primary flex h-[42px] w-[42px] shrink-0 touch-none select-none items-center justify-center !rounded-full !p-0 ${
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
                  className="btn-primary flex h-[42px] w-[42px] shrink-0 items-center justify-center !rounded-full !p-0 text-lg leading-none"
                  disabled={!canSend}
                  aria-label={editing ? "Saqlaş" : "Yuboriş"}
                  title={editing ? "Saqlaş" : "Yuboriş"}
                >
                  {editing ? <Icon name="check" className="h-5 w-5" strokeWidth={2.2} /> : <RocketIcon />}
                </button>
              )}
              </div>
            </form>
            {asSupport && !editing && (
              <div className={`mt-2 flex items-center gap-2 rounded-2xl px-3 py-2 text-xs ${HEADER_CAPSULE}`}>
                <span className="text-zinc-500">Qayerda körinsin:</span>
                <PlatformCheckboxes value={sendSource} onChange={setSendSource} />
              </div>
            )}
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
              <div className="grid grid-cols-5 gap-0.5 border-b border-white/10 p-1.5">
                {REACTION_EMOJIS.map((e) => {
                  const on = !!menu.msg.reactions?.some((r) => r.mine && r.emoji === e);
                  return (
                    <button
                      key={e}
                      type="button"
                      onClick={() => {
                        react(menu.msg, e);
                        setMenu(null);
                      }}
                      className={`flex h-8 items-center justify-center rounded-lg text-lg transition hover:scale-110 ${
                        on ? "bg-indigo-500/30" : "hover:bg-white/10"
                      }`}
                      aria-label={e}
                    >
                      {e}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => startReply(menu.msg)}
                className="backdrop-blur-sm flex w-full items-center gap-2 px-3 py-2.5 text-left text-zinc-200 hover:bg-white/5"
              >
                <Icon name="reply" className="h-4 w-4 shrink-0" />
                Javob beriş
              </button>
              {canSelect(menu.msg) && (
                <button
                  type="button"
                  onClick={() => startSelect(menu.msg)}
                  className="backdrop-blur-sm flex w-full items-center gap-2 px-3 py-2.5 text-left text-zinc-200 hover:bg-white/5"
                >
                  <Icon name="check" className="h-4 w-4 shrink-0" />
                  Tanlaş
                </button>
              )}
              {menu.msg.mine ? (
                <>
                  <button
                    type="button"
                    onClick={() => startEdit(menu.msg)}
                    className="backdrop-blur-sm flex w-full items-center gap-2 px-3 py-2.5 text-left text-zinc-200 hover:bg-white/5"
                  >
                    <Icon name="pencil" className="h-4 w-4 shrink-0" />
                    Tahrirlaş
                  </button>
                  <button
                    type="button"
                    onClick={() => del(menu.msg)}
                    className="backdrop-blur-sm flex w-full items-center gap-2 px-3 py-2.5 text-left text-red-400 hover:bg-white/5"
                  >
                    <Icon name="trash" className="h-4 w-4 shrink-0" />
                    Öçiriş
                  </button>
                </>
              ) : (
                !other.isSupport && !asSupport && (
                  <button
                    type="button"
                    onClick={() => reportMsg(menu.msg)}
                    className="backdrop-blur-sm flex w-full items-center gap-2 px-3 py-2.5 text-left text-amber-300 hover:bg-white/5"
                  >
                    <Icon name="alert" className="h-4 w-4 shrink-0" />
                    Şikoyat qiliş
                  </button>
                )
              )}
            </div>
          </>,
          document.body,
        )}

      {confirmBulk && sel.active && (
        <ConfirmDeleteDialog count={sel.count} onConfirm={delSelected} onCancel={() => setConfirmBulk(false)} />
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
      aria-label={read ? "öqildi" : "yetkazildi"}
    >
      <path d="M1.5 6.5 5 10l6.5-8" />
      {read && <path d="M8.5 9.2 9.3 10l6.5-8" />}
    </svg>
  );
}
