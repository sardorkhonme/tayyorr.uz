"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";

/**
 * Çatlardagi «↓ eng yangi xabarlarga» tugmasi.
 *  · foydalanuvçi yuqoriga aylantirganda çiqadi, pastga qaytganda yöqoladi;
 *  · u yuqorida turganda kelgan (özganiki emas) xabarlar soni — tugmada kiçkina belgi;
 *  · dastur pastga silliq aylantirayotganda (yangi xabar) tugma miltillamaydi — faqat yuqoriga harakat çiqaradi.
 * Bu fayl tayyorr.uz, admin, tayyorr+ va SMM saytlarida bir xil (har biriga nusxa).
 */
export function useScrollDown<T>(
  ref: RefObject<HTMLElement | null>,
  items: readonly T[],
  opts: { keyOf: (t: T) => string; isMine?: (t: T) => boolean; threshold?: number },
) {
  const threshold = opts.threshold ?? 140;
  const [away, setAway] = useState(false);
  const [unread, setUnread] = useState(0);
  const awayRef = useRef(false);
  const lastTop = useRef(0);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const setAwayBoth = (v: boolean) => {
    awayRef.current = v;
    setAway(v);
  };

  const onScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    const up = el.scrollTop < lastTop.current - 1;
    lastTop.current = el.scrollTop;
    if (dist <= threshold) {
      if (awayRef.current) setAwayBoth(false);
      setUnread(0);
    } else if (up && !awayRef.current) {
      setAwayBoth(true);
    }
  }, [ref, threshold]);

  // yangi xabarlar (ro'yxat oxiriga qo'shilganlar) — foydalanuvçi yuqorida bo'lsa sanaladi
  const lastKey = useRef<string | null>(null);
  useEffect(() => {
    const { keyOf, isMine } = optsRef.current;
    const prev = lastKey.current;
    lastKey.current = items.length ? keyOf(items[items.length - 1]) : null;
    if (!awayRef.current || prev == null || lastKey.current === prev) return;
    let i = items.length - 1;
    while (i >= 0 && keyOf(items[i]) !== prev) i--;
    if (i < 0) return;
    const fresh = items.slice(i + 1).filter((t) => !isMine?.(t)).length;
    if (fresh) setUnread((u) => u + fresh);
  }, [items]);

  const scrollDown = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setAwayBoth(false);
    setUnread(0);
    lastTop.current = el.scrollHeight;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [ref]);

  /** Foydalanuvçi hozir pastdan uzoqdami (avtomatik pastga tuşiş kerakmi — shu bilan tekşiriladi). */
  const isAway = useCallback(() => awayRef.current, []);

  return { away, unread, onScroll, scrollDown, isAway };
}

/** Suzuvçi tugmalar ustuni (pastdan yuqoriga, 8px oraliq) — bir-birini heç qaçon yopmaydi. */
export function FloatingStack({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`pointer-events-none flex flex-col items-end gap-2 ${className}`}>{children}</div>;
}

export function ScrollDownButton({
  unread,
  onClick,
  tone = "dark",
}: {
  unread: number;
  onClick: () => void;
  tone?: "dark" | "light";
}) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    ref.current?.animate(
      [
        { opacity: 0, transform: "translateY(8px) scale(0.9)" },
        { opacity: 1, transform: "none" },
      ],
      { duration: 180, easing: "cubic-bezier(.2,.8,.2,1)" },
    );
  }, []);
  const cls =
    tone === "light"
      ? "border border-zinc-200 bg-white text-zinc-700 shadow-lg shadow-zinc-900/10 hover:text-zinc-900"
      : "border border-white/10 bg-[var(--surface,#16161f)] text-zinc-200 shadow-lg shadow-black/30 hover:text-white";
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={unread ? `Eng yangi xabarlarga (${unread} ta yangi)` : "Eng yangi xabarlarga"}
      title="Eng yangi xabarlarga"
      className={`pointer-events-auto relative grid h-11 w-11 shrink-0 place-items-center rounded-full transition active:scale-95 ${cls}`}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M6 13l6 6 6-6" />
      </svg>
      {unread > 0 && (
        <span className="absolute -right-1 -top-1.5 min-w-[20px] rounded-full bg-indigo-500 px-1.5 text-center text-[11px] font-semibold leading-5 text-white shadow">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </button>
  );
}
