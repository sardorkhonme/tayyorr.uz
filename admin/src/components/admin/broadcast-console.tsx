"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { ChatFileView, humanSize } from "@/components/chat-file";
import { Linkify } from "@/components/linkify";
import { RocketIcon, Icon } from "@/components/icons";
import { AutoTextarea } from "@/components/admin/auto-textarea";
import { PeopleModal, type Person } from "@/components/admin/people-modal";
import { useDismiss } from "@/components/use-dismiss";
import { BroadcastRecipients, type Recipient } from "@/components/admin/broadcast-recipients";
import { prepareBroadcastFile, type PreparedChatFile } from "@/lib/upload-client";
import { smartTime } from "@/lib/date";
import { type MessageSource } from "@/lib/message-source";
import { PlatformCheckboxes } from "@/components/platform-checkboxes";
import { MessageSourceBadge } from "@/components/message-source-badge";
import { useFlashState } from "@/components/flash-status";
import { appConfirm, appPrompt } from "@/components/app-dialog";

interface Item {
  id: string;
  body: string;
  /** qaysi platformaga yuborilgan */
  source?: MessageSource;
  fileName?: string | null;
  fileType?: string | null;
  fileUrl?: string | null;
  sentCount: number;
  createdAt: string;
  readCount?: number;
  likeCount?: number;
  dislikeCount?: number;
}

const MAX_FILE = 25 * 1024 * 1024;

function fmt(iso: string) {
  return smartTime(iso);
}

export function BroadcastConsole({ initial }: { initial: Item[] }) {
  const [items, setItems] = useState<Item[]>(initial);
  const [text, setText] = useState("");
  const [role, setRole] = useState("");
  // qaysi platformada ko'rinadi: tayyorr.uz | tayyorr+ | ikkalasi
  const [source, setSource] = useState<MessageSource>("tayyorr.uz");
  const [balanceMin, setBalanceMin] = useState("");
  const [balanceMax, setBalanceMax] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [recipients, setRecipients] = useState<Recipient[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [counting, setCounting] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useFlashState<string | null>(null);
  const [attachment, setAttachment] = useState<PreparedChatFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadName, setUploadName] = useState("");
  const [menu, setMenu] = useState<{ item: Item; left: number; top: number } | null>(
    null,
  );
  const menuRef = useRef<HTMLDivElement>(null);
  useDismiss(!!menu, () => setMenu(null), [menuRef]);
  const [people, setPeople] = useState<
    { title: string; loading: boolean; list: Person[] } | null
  >(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function openPeople(it: Item, kind: "likes" | "dislikes" | "reads") {
    setMenu(null);
    const title =
      kind === "likes"
        ? "Yoqtirganlar"
        : kind === "dislikes"
          ? "Yoqtirmaganlar"
          : "Körganlar";
    setPeople({ title, loading: true, list: [] });
    try {
      const res = await fetch(`/api/admin/broadcast/${it.id}/stats`);
      const data = await res.json();
      setPeople({ title, loading: false, list: data[kind] ?? [] });
    } catch {
      setPeople({ title, loading: false, list: [] });
    }
  }

  function openMenu(it: Item, btn: HTMLElement) {
    const r = btn.getBoundingClientRect();
    const W = 200;
    const H = 132;
    const M = 8;
    let left = r.right - W;
    if (left < M) left = M;
    let top = r.bottom + 6;
    if (top + H > window.innerHeight - M) top = r.top - H - 6;
    if (top < M) top = M;
    setMenu({ item: it, left, top });
  }

  async function editItem(it: Item) {
    setMenu(null);
    const next = await appPrompt({
      title: "Xabarni tahrirlaş",
      message: "Xabar matnini tahrirlang:",
      defaultValue: it.body,
      confirmText: "Saqlaş",
      multiline: true,
    });
    if (next == null) return;
    const body = next.trim();
    if (!body || body === it.body) return;
    try {
      const res = await fetch(`/api/admin/broadcast/${it.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (res.ok) {
        setItems((p) => p.map((x) => (x.id === it.id ? { ...x, body } : x)));
      }
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [items]);

  function filters() {
    return {
      role: role || undefined,
      balanceMin: balanceMin || undefined,
      balanceMax: balanceMax || undefined,
      registeredFrom: from || undefined,
      registeredTo: to || undefined,
    };
  }

  // filtr o'zgarganda hisob eskiradi
  useEffect(() => {
    setCount(null);
    setRecipients(null);
    setPicked(new Set());
  }, [role, balanceMin, balanceMax, from, to]);

  async function preview() {
    // ro'yxat ochiq bo'lsa — yopiladi (tanlov saqlanadi)
    if (recipients) {
      setListOpen((v) => !v);
      return;
    }
    setErr(null);
    setCounting(true);
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: "x", preview: true, ...filters() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCount(data.count);
      const list: Recipient[] = data.users ?? [];
      setRecipients(list);
      setPicked(new Set(list.map((u) => u.id)));
      setListOpen(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setCounting(false);
    }
  }

  async function delItem(id: string) {
    setMenu(null);
    if (
      !(await appConfirm({
        title: "Ommaviy xabarni öçiriş",
        message: "Bu ommaviy xabar barça foydalanuvçilardan öçiriladi. Davom etilsinmi?",
        confirmText: "Öçiriş",
        danger: true,
      }))
    )
      return;
    try {
      const res = await fetch(`/api/admin/broadcast/${id}`, { method: "DELETE" });
      if (res.ok) setItems((p) => p.filter((x) => x.id !== id));
    } catch {
      /* ignore */
    }
  }

  async function onPickFile(file: File) {
    setErr(null);
    if (file.size > MAX_FILE) {
      setErr("Fayl 25MB dan katta");
      return;
    }
    setUploading(true);
    setUploadPct(0);
    setUploadName(file.name);
    setAttachment(null);
    try {
      setAttachment(await prepareBroadcastFile(file, setUploadPct));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Fayl yuklanmadi");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if ((!body && !attachment) || uploading) return;
    // ro'yxat yuklangan bo'lsa — faqat belgilanganlarga
    const ids = recipients ? [...picked] : null;
    if (ids && ids.length === 0) {
      setErr("Heç kim tanlanmagan");
      return;
    }
    if (
      !(await appConfirm({
        title: "Xabar yuborilsinmi?",
        message:
          ids
            ? `${ids.length} ta foydalanuvçiga yuborilsinmi?`
            : "Filtrga mos hammaga yuborilsinmi?",
        confirmText: "Yuboriş",
      }))
    )
      return;
    const file = attachment;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body,
          file: file
            ? { key: file.key, name: file.name, type: file.type, size: file.size }
            : undefined,
          ...filters(),
          ...(ids ? { userIds: ids } : {}),
          source,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setItems((p) => [
        ...p,
        { readCount: 0, likeCount: 0, dislikeCount: 0, ...data.broadcast },
      ]);
      setText("");
      setAttachment(null);
      setCount(null);
      setRecipients(null);
      setPicked(new Set());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      data-wide
      className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] lg:flex-row"
      style={{ height: "calc(100dvh - 9rem)" }}
    >
      {/* ---- filtr (telefonda yuqorida, kompyuterda chapda) ---- */}
      <div className="max-h-[45%] shrink-0 overflow-y-auto border-b border-white/10 bg-white/[0.03] p-3 lg:max-h-none lg:w-80 lg:border-b-0 lg:border-r lg:p-4">
        <div className="mb-3 flex flex-col gap-2 text-sm">
          <span className="text-zinc-400">Qaysi platformaga:</span>
          <PlatformCheckboxes value={source} onChange={setSource} />
        </div>
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
          <select
            className="input"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="">Barça rollar</option>
            <option value="ORDERER">Buyurtma beruvçilar</option>
            <option value="PREPARER">Tayyorlovçilar</option>
          </select>
          <input
            className="input"
            type="number"
            min={0}
            placeholder="Balans dan"
            value={balanceMin}
            onChange={(e) => setBalanceMin(e.target.value)}
          />
          <input
            className="input"
            type="number"
            min={0}
            placeholder="Balans gaça"
            value={balanceMax}
            onChange={(e) => setBalanceMax(e.target.value)}
          />
          <label className="flex flex-col text-[11px] text-zinc-500">
            Röyxatdan — dan
            <input
              className="input"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label className="flex flex-col text-[11px] text-zinc-500">
            Röyxatdan — gaça
            <input
              className="input"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <button
            type="button"
            onClick={preview}
            className="btn-ghost self-end"
          >
            {counting ? "..." : count != null ? `${picked.size} / ${count} tanlangan ${listOpen ? "▴" : "▾"}` : "Neçta?"}
          </button>
        </div>
        {recipients && listOpen && <BroadcastRecipients list={recipients} selected={picked} onChange={setPicked} />}
        <p className="mt-1.5 text-[11px] text-zinc-600">
          Böş maydonlar hisobga olinmaydi (hammasi).
        </p>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {/* ---- yuborilganlar (chat) ---- */}
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-3">
        {items.length === 0 && (
          <p className="mt-6 text-center text-sm text-zinc-500">
            Hali ommaviy xabar yuborilmagan.
          </p>
        )}
        {items.map((it) => (
          <div key={it.id} className="group flex items-end justify-end gap-1.5">
            <button
              type="button"
              onClick={(e) => openMenu(it, e.currentTarget)}
              title="Amallar"
              className="backdrop-blur-sm mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-zinc-300 opacity-100 transition hover:bg-white/20 hover:text-white [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
            >
              ⋮
            </button>
            <div className="max-w-[80%] space-y-1.5 rounded-2xl bg-indigo-600 px-3.5 py-2 text-sm text-white">
              {it.fileUrl && (
                <ChatFileView
                  file={{
                    name: it.fileName ?? "fayl",
                    type: it.fileType ?? "application/octet-stream",
                    size: 0,
                    url: it.fileUrl,
                  }}
                  mine
                />
              )}
              {!it.fileUrl && it.fileName && (
                <div className="flex items-center gap-1 rounded-lg bg-white/15 px-2 py-1 text-xs">
                  <Icon name="paperclip" className="h-3.5 w-3.5 shrink-0" />
                  {it.fileName}
                </div>
              )}
              <div className="mb-1">
                <MessageSourceBadge source={it.source} />
              </div>
              {it.body && (
                <div className="whitespace-pre-wrap break-words">
                  <Linkify text={it.body} mine />
                </div>
              )}
              {((it.likeCount ?? 0) > 0 || (it.dislikeCount ?? 0) > 0) && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(it.likeCount ?? 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => openPeople(it, "likes")}
                      className="backdrop-blur-sm flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-xs hover:bg-white/25"
                    >
                      <Icon name="thumbs-up" className="h-3.5 w-3.5" /> {it.likeCount}
                    </button>
                  )}
                  {(it.dislikeCount ?? 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => openPeople(it, "dislikes")}
                      className="backdrop-blur-sm flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-xs hover:bg-white/25"
                    >
                      <Icon name="thumbs-down" className="h-3.5 w-3.5" /> {it.dislikeCount}
                    </button>
                  )}
                </div>
              )}
              <div className="text-right text-[10px] text-indigo-200">
                {it.sentCount} ta · {fmt(it.createdAt)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ---- xabar kiritish (pastda) ---- */}
      <div className="shrink-0 border-t border-white/10 p-3">
        {err && <p className="flash-status mb-1 text-xs text-red-400">{err}</p>}

        {(uploading || attachment) && (
          <div className="mb-2 rounded-lg bg-white/5 px-3 py-2 text-xs text-zinc-300">
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate">
                <Icon name="paperclip" className="mr-1 inline-block h-3.5 w-3.5 align-[-2px]" />
                {attachment?.name ?? uploadName}
                {attachment && ` · ${humanSize(attachment.size)}`}
              </span>
              <button
                type="button"
                onClick={() => {
                  setAttachment(null);
                  setUploading(false);
                  setUploadName("");
                }}
                className="shrink-0 text-zinc-500 hover:text-white"
                aria-label="Olib taşlaş"
              >
                <Icon name="close" className="h-4 w-4" />
              </button>
            </div>
            {uploading && (
              <div className="mt-1.5">
                <div className="h-1.5 overflow-hidden rounded bg-white/10">
                  <div
                    className="h-full rounded bg-indigo-500 transition-all"
                    style={{ width: `${uploadPct}%` }}
                  />
                </div>
                <div className="mt-1 text-[10px] text-zinc-500">
                  {uploadPct}% yuklandi
                </div>
              </div>
            )}
          </div>
        )}

        <form onSubmit={send} className="flex items-end gap-2">
          <input
            ref={fileRef}
            type="file"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPickFile(f);
            }}
          />
          <button
            type="button"
            className="btn-ghost flex h-[42px] w-[42px] shrink-0 items-center justify-center !p-0 text-lg leading-none"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? "…" : <Icon name="paperclip" className="h-5 w-5" />}
          </button>
          <AutoTextarea
            className="input min-h-[42px]"
            maxRows={5}
            placeholder="tayyorr.uz support nomidan xabar…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(e);
              }
            }}
          />
          <button
            className="btn-primary flex h-[42px] w-[42px] shrink-0 items-center justify-center !p-0"
            disabled={busy || uploading || (!text.trim() && !attachment)}
          >
            <RocketIcon />
          </button>
        </form>
      </div>
      </div>

      {menu &&
        createPortal(
          <div className="fixed inset-0 z-[70]" onClick={() => setMenu(null)}>
            <div
              ref={menuRef}
              className="absolute w-52 overflow-hidden rounded-xl border border-white/10 bg-zinc-900 py-1 text-sm shadow-xl"
              style={{ left: menu.left, top: menu.top }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => openPeople(menu.item, "reads")}
                className="backdrop-blur-sm flex w-full items-center gap-2 px-3 py-2 text-left text-zinc-200 hover:bg-white/5"
              >
                <Icon name="eye" className="h-4 w-4 shrink-0" />
                {menu.item.readCount ?? 0} kişi kördi
              </button>
              <button
                type="button"
                onClick={() => editItem(menu.item)}
                className="backdrop-blur-sm block w-full px-3 py-2 text-left text-zinc-200 hover:bg-white/5"
              >
                Tahrirlaş
              </button>
              <button
                type="button"
                onClick={() => delItem(menu.item.id)}
                className="backdrop-blur-sm block w-full px-3 py-2 text-left text-red-400 hover:bg-white/5"
              >
                Hamma uçun öçiriş
              </button>
            </div>
          </div>,
          document.body,
        )}

      {people && (
        <PeopleModal
          title={people.title}
          people={people.list}
          loading={people.loading}
          onClose={() => setPeople(null)}
        />
      )}
    </div>
  );
}
