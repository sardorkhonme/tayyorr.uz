"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { Icon } from "@/components/icons";

/** Xabarlarni tanlaş holati: tanlanganlar, Esc — çiqiş. */
export function useMsgSelection() {
  const [ids, setIds] = useState<Set<string>>(() => new Set());
  const active = ids.size > 0;

  const toggle = useCallback((id: string) => {
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const clear = useCallback(() => setIds(new Set()), []);
  /** Röyxatdan yöqolgan xabarlarni tanlovdan olib taşlaş. */
  const prune = useCallback((alive: (id: string) => boolean) => {
    setIds((prev) => {
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (alive(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, []);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIds(new Set());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  return { ids, active, count: ids.size, toggle, clear, prune };
}

/** Pufakça yonidagi tanlaş doiraçasi — kirganda kiçkinadan kattalaşadi. */
export function SelectCheck({ on, dim }: { on: boolean; dim?: boolean }) {
  return (
    <span
      aria-hidden
      className={`sel-pop flex h-[22px] w-[22px] shrink-0 items-center justify-center self-center rounded-full border-2 transition-colors ${
        on ? "border-indigo-500 bg-indigo-500 text-white" : "border-white/35 bg-black/20 text-transparent"
      } ${dim ? "opacity-30" : ""}`}
    >
      <Icon name="check" className="h-3.5 w-3.5" />
    </span>
  );
}

/** Tanlaş rejimidagi header öng kapsulasi — qizil çelak. */
export function SelectTrashButton({ onClick, className = "" }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Tanlanganlarni öçiriş"
      className={`sel-fade flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-red-400 transition hover:text-red-300 active:scale-95 ${className}`}
    >
      <Icon name="trash" className="h-[21px] w-[21px]" />
    </button>
  );
}

/** «N ta xabarni öçirasizmi?» tasdiqlaş oynasi. */
export function ConfirmDeleteDialog({
  count,
  onConfirm,
  onCancel,
}: {
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        onCancel();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onCancel]);

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="menu-backdrop absolute inset-0 bg-black/60" onClick={onCancel} />
      <div
        role="alertdialog"
        aria-modal="true"
        className="sel-pop relative w-full max-w-[320px] rounded-2xl border border-white/10 bg-[var(--surface-2,#14141b)] p-5 text-center shadow-2xl shadow-black/50"
      >
        <p className="text-[15px] font-medium text-white">{count} ta xabarni öçirasizmi?</p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl bg-white/10 px-3 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/15"
          >
            Bekor qiliş
          </button>
          <button
            type="button"
            autoFocus
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-red-500 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-red-400"
          >
            Öçiriş
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
