"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/icons";

export interface Person {
  id: string;
  name: string;
  login: string | null;
  avatar: string | null;
}

/** Reaksiya / ko'rganlar ro'yxati — har qatorda akkauntga o'tish havolasi. */
export function PeopleModal({
  title,
  people,
  loading,
  onClose,
}: {
  title: string;
  people: Person[];
  loading: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="pop-in max-h-[70vh] w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-[#14141b] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-white"
            aria-label="Yopiş"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[calc(70vh-3rem)] overflow-y-auto p-2">
          {loading && (
            <p className="px-2 py-6 text-center text-sm text-zinc-500">
              Yuklanmoqda…
            </p>
          )}
          {!loading && people.length === 0 && (
            <p className="px-2 py-6 text-center text-sm text-zinc-500">
              Hali heç kim yöq.
            </p>
          )}
          {people.map((p) => (
            <a
              key={p.id}
              href={`/sardorxon/admin/users/${p.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="backdrop-blur-sm flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/5"
            >
              {p.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.avatar}
                  alt=""
                  className="h-9 w-9 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm text-zinc-300">
                  {p.name.slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate text-sm text-zinc-100">
                  {p.name}
                </span>
                {p.login && (
                  <span className="block truncate text-xs text-zinc-500">
                    @{p.login}
                  </span>
                )}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
