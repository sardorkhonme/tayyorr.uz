"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Icon } from "@/components/icons";
import { SupportChat } from "@/components/support-chat";

/**
 * Pastki o'ng burchakdagi support tugmasi. Kompyuterda — chat oynasi (popup,
 * fon xiralashtirilmaydi), telefon va planshetda — alohida /support sahifasi.
 */
export function SupportWidget({ loggedIn }: { loggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  // yangi javob kelganda — tugma ustida qisqa bildirishnoma + "tin"
  const [toast, setToast] = useState<string | null>(null);
  const prevUnread = useRef<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  // yopiq turganda — 15 soniyada bir yangi javob bormi
  const poll = useCallback(async () => {
    if (!loggedIn) return;
    const res = await fetch("/api/support", { cache: "no-store" }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok || !data) return;
    const n: number = data.unread ?? 0;
    // birinchi tekshiruvda emas, faqat yangi javob qo'shilganda
    if (prevUnread.current !== null && n > prevUnread.current && data.latest) {
      setToast(data.latest);
      new Audio("/sounds/tin.wav").play().catch(() => {});
    }
    prevUnread.current = n;
    setUnread(n);
  }, [loggedIn]);

  useEffect(() => {
    if (open) return;
    poll();
    const id = setInterval(poll, 15000);
    return () => clearInterval(id);
  }, [open, poll]);

  // bildirishnoma 7 soniyadan keyin yo'qoladi
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 7000);
    return () => clearTimeout(id);
  }, [toast]);

  // brauzer yorlig'ida o'qilmaganlar soni: "(2) tayyorr+"
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\+?\)\s*/, "");
    document.title = unread > 0 ? `(${unread > 9 ? "9+" : unread}) ${base}` : base;
  }, [unread, pathname]);

  useEffect(() => {
    if (!open) return;
    setUnread(0);
    setToast(null);
    prevUnread.current = 0;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    // oynadan tashqariga bosilsa yopiladi
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !btnRef.current?.contains(t)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  // /support sahifasining o'zida tugma kerak emas
  if (pathname === "/support") return null;

  function toggle() {
    // telefon va planshet — alohida sahifa, kompyuter — popup
    if (window.matchMedia("(max-width: 1023px)").matches) {
      router.push("/support");
      return;
    }
    setOpen((v) => !v);
  }

  return (
    <>
      {toast && !open && (
        <button
          type="button"
          onClick={() => {
            setToast(null);
            toggle();
          }}
          className="animate-pop fixed bottom-[5.5rem] right-5 z-[45] flex w-[min(320px,calc(100vw-2.5rem))] items-start gap-3 rounded-2xl border border-zinc-200 bg-white p-3.5 text-left shadow-2xl shadow-zinc-900/15"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white">
            <Icon name="headset" className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-zinc-900">tayyorr support</span>
            <span className="line-clamp-2 text-sm text-zinc-600">{toast}</span>
          </span>
        </button>
      )}

      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-label="Yordam (support)"
        className="shine fixed bottom-5 right-5 z-[45] grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-xl shadow-violet-500/40 transition hover:shadow-2xl hover:shadow-fuchsia-500/40"
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
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Support chati"
            className="animate-pop fixed bottom-24 right-5 z-[44] h-[min(560px,calc(100dvh-8rem))] w-[390px] overflow-hidden rounded-3xl border border-zinc-200 shadow-2xl shadow-zinc-900/15"
          >
            <SupportChat loggedIn={loggedIn} className="h-full" autoFocus />
          </div>,
          document.body,
        )}
    </>
  );
}
