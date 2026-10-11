"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BlockedIcon } from "@/components/icons";
import type { ConvRow } from "@/lib/conversations";
import { shortDate } from "@/lib/date";
import { useUnread } from "@/components/unread-provider";

function fmt(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))} daq`;
  if (s < 86400) return `${Math.floor(s / 3600)} soat`;
  return shortDate(d);
}

/** Kompyuterda chat ichida chap tomonda turadigan kontaktlar ustuni. */
export function ChatContactsRail({
  rows,
  base = "/messages",
  asSupport = false,
}: {
  rows: ConvRow[];
  /** ro'yxat sahifasi: foydalanuvchi — /messages, admin — /sardorxon/admin/messages */
  base?: string;
  asSupport?: boolean;
}) {
  const pathname = usePathname();
  const activeId = pathname.split("/").pop() ?? "";
  const live = useUnread();

  return (
    <aside
      className={`fixed left-0 top-0 z-40 hidden h-screen w-72 flex-col border-r border-white/10 bg-[#0b0b12]/95 backdrop-blur-xl lg:flex ${
        asSupport ? "lg:left-60" : "lg:left-64"
      }`}
    >
      <div className="flex items-center justify-between px-4 py-3.5">
        <span className="text-sm font-semibold text-white">Suhbatlar</span>
        <Link href={base} className="text-xs text-zinc-500 hover:text-white">
          Hammasi
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {rows.length === 0 && (
          <p className="px-3 py-6 text-center text-xs text-zinc-600">
            Suhbat yo'q.
          </p>
        )}
        {rows.map((c) => {
          const active = c.id === activeId;
          const unread = active
            ? 0
            : live
              ? live.conv(c.id, c.unread)
              : c.unread;
          return (
            <Link
              key={c.id}
              href={`${base}/${c.id}`}
              className={`backdrop-blur-sm blur-in flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition ${
                active ? "bg-indigo-500/15" : "hover:bg-white/5"
              }`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5 text-zinc-500">
                {c.blockedMe ? (
                  <BlockedIcon className="h-4 w-4" />
                ) : c.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.avatar}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : c.isSupport ? (
                  "🛟"
                ) : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-1.5">
                  <span className="flex min-w-0 items-center gap-1 truncate text-sm font-medium text-white">
                    {c.isSupport && <span className="text-xs">📌</span>}
                    {c.name}
                  </span>
                  <span className="shrink-0 text-[10px] text-zinc-600">
                    {fmt(c.lastAt)}
                  </span>
                </span>
                <span className="mt-0.5 flex items-center justify-between gap-1.5">
                  <span className="truncate text-xs text-zinc-500">
                    {c.lastMine ? (asSupport ? "Support: " : "Siz: ") : ""}
                    {c.lastText}
                  </span>
                  {unread > 0 && (
                    <span className="shrink-0 rounded-full bg-indigo-500 px-1.5 text-[10px] font-semibold text-white">
                      {unread}
                    </span>
                  )}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
