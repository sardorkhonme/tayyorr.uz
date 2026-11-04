"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Icon } from "@/components/icons";
import { SupportChat } from "@/components/support-chat";
import { SAFETY_POLL_MS, useRealtime } from "@/lib/use-realtime";

export const OPEN_SUPPORT_EVENT = "tayyorr:open-support";

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
  // hamyon balansi — o'zgarsa sahifadagi summalar yangilanadi
  const prevBalance = useRef<number | null>(null);
  const toggleRef = useRef<() => void>(() => {});
  // push obunasi bo'lsa bildirishnomani service worker chiqaradi — sahifadan takrorlamaymiz
  const hasPushRef = useRef(false);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.getRegistration().then(async (reg) => {
      hasPushRef.current = !!(await reg?.pushManager.getSubscription());
    }).catch(() => {});
  }, []);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  // yopiq turganda — tayyorr.uz dagidek doimiy tekshirish (5 soniyada + yorliqqa qaytganda)
  const poll = useCallback(async () => {
    if (!loggedIn) return;
    const res = await fetch("/api/support", { cache: "no-store" }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok || !data) return;
    if (typeof data.balance === "number") {
      if (prevBalance.current !== null && data.balance !== prevBalance.current) router.refresh();
      prevBalance.current = data.balance;
    }
    const n: number = data.unread ?? 0;
    // birinchi tekshiruvda emas, faqat yangi javob qo'shilganda
    if (prevUnread.current !== null && n > prevUnread.current && data.latest) {
      setToast(data.latest);
      // tayyorr.uz dagidek — sayt boshqa yorliqda bo'lsa ham "tin"
      new Audio("/sounds/tin.wav").play().catch(() => {});
      // yorliq ko'rinmayotgan bo'lsa — kompyuter bildirishnomasi (ruxsat berilgan bo'lsa)
      if (
        !hasPushRef.current &&
        document.visibilityState !== "visible" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        const n2 = new Notification("tayyorr support", {
          body: data.latest,
          icon: "/icon-192.png",
          tag: "plus-support",
        });
        n2.onclick = () => {
          window.focus();
          n2.close();
          toggleRef.current();
        };
      }
    }
    prevUnread.current = n;
    setUnread(n);
  }, [loggedIn, router]);

  // real-time: yangi javob yoki hamyon o'zgarsa — darhol; ulangan bo'lsa tez-tez so'rash shart emas
  const live = useRealtime((e) => {
    if (!open && (e.name === "chat" || e.name === "wallet")) void poll();
  });

  useEffect(() => {
    if (open) return;
    poll();
    // yorliq yashirin bo'lsa ham tekshiramiz (ovoz va bildirishnoma uchun) — tayyorr.uz dagidek
    const id = setInterval(poll, live ? SAFETY_POLL_MS : 5000);
    const onVisible = () => document.visibilityState === "visible" && poll();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [open, poll, live]);

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
      // rasmni to'liq ko'rish oynasi (lightbox) ham chat qismi
      if ((t as Element).closest?.("[data-chat-lightbox]")) return;
      if (!panelRef.current?.contains(t) && !btnRef.current?.contains(t)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  // sahifadagi "Supportga yozish" tugmalari (SupportLink) — xuddi shu popupni ochadi
  useEffect(() => {
    const onOpen = () => {
      if (window.matchMedia("(max-width: 1023px)").matches) router.push("/support");
      else setOpen(true);
    };
    window.addEventListener(OPEN_SUPPORT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_SUPPORT_EVENT, onOpen);
  }, [router]);

  // /support sahifasining o'zida tugma kerak emas
  if (pathname === "/support") return null;

  toggleRef.current = () => toggle();
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
        className="fixed bottom-5 right-5 z-[45] h-14 w-14 rounded-full shadow-xl shadow-violet-500/40 transition hover:shadow-2xl hover:shadow-fuchsia-500/40"
      >
        {/* nur effekti ichki doirada — o'qilmaganlar soni tashqarida to'liq ko'rinsin */}
        <span className="shine grid h-full w-full place-items-center rounded-full bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white">
          <Icon name={open ? "close" : "headset"} className="h-6 w-6" />
        </span>
        {!open && unread > 0 && (
          <span className="absolute -right-1 -top-1 z-[3] grid h-6 min-w-6 place-items-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white ring-2 ring-white">
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
            aria-label="Support çati"
            className="animate-pop fixed bottom-24 right-5 z-[44] h-[min(560px,calc(100dvh-8rem))] w-[390px] overflow-hidden rounded-3xl border border-zinc-200 shadow-2xl shadow-zinc-900/15"
          >
            <SupportChat loggedIn={loggedIn} className="h-full" autoFocus />
          </div>,
          document.body,
        )}
    </>
  );
}
