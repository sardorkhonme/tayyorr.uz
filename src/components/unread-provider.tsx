"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { playTin, primeTin } from "@/lib/notify-sound";

interface UnreadState {
  total: number;
  perConv: Record<string, number>;
}

interface UnreadCtx {
  total: number;
  /** suhbat uchun o'qilmaganlar soni (klient holati bo'lmasa fallback qaytadi) */
  conv: (id: string, fallback: number) => number;
  /** suhbatni o'qildi deb belgilash — darhol (server so'rovsiz) */
  clearConv: (id: string) => void;
  /** serverdan kelgan yangi holat bilan solishtirish */
  reconcile: (s: UnreadState) => void;
}

const Ctx = createContext<UnreadCtx | null>(null);

export function UnreadProvider({
  initialTotal,
  children,
}: {
  initialTotal: number;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<UnreadState>({
    total: initialTotal,
    perConv: {},
  });
  // qo'lda nolga tushirilgan suhbatlar — poll ularni qayta ko'tarmasin
  const clearedAt = useRef<Record<string, number>>({});
  // oldingi poll natijasi — biror suhbatda o'qilmaganlar ko'paysa "tin"
  const prevPerConv = useRef<Record<string, number> | null>(null);

  const reconcile = useCallback((s: UnreadState) => {
    setState(() => {
      const now = Date.now();
      const perConv: Record<string, number> = { ...s.perConv };
      let total = 0;
      for (const [id, n] of Object.entries(perConv)) {
        // 8s ichida qo'lda tozalangan bo'lsa — serverni kutmaymiz
        if (clearedAt.current[id] && now - clearedAt.current[id] < 8000) {
          perConv[id] = 0;
        } else {
          delete clearedAt.current[id];
        }
        total += perConv[id];
      }
      return { total, perConv };
    });
  }, []);

  const poll = useCallback(async () => {
    try {
      const r = await fetch("/api/me/unread", { cache: "no-store" });
      if (!r.ok) return;
      const d = (await r.json()) as UnreadState;
      const prev = prevPerConv.current;
      // ochiq turgan suhbatning o'zida chat-room SSE orqali chaladi — bu yerda
      // faqat boshqa suhbatlardagi yangi xabarlar
      const openConv = window.location.pathname.match(/^\/messages\/([^/]+)/)?.[1];
      if (
        prev &&
        Object.entries(d.perConv).some(
          ([id, n]) => id !== openConv && n > (prev[id] ?? 0),
        )
      ) {
        playTin();
      }
      prevPerConv.current = d.perConv;
      reconcile(d);
    } catch {
      /* jim */
    }
  }, [reconcile]);

  useEffect(() => {
    primeTin();
    poll();
    const iv = setInterval(poll, 10000);
    const onVis = () => {
      if (document.visibilityState === "visible") poll();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", poll);
    return () => {
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", poll);
    };
  }, [poll]);

  const clearConv = useCallback((id: string) => {
    clearedAt.current[id] = Date.now();
    setState((s) => {
      const had = s.perConv[id] ?? 0;
      return {
        total: Math.max(0, s.total - had),
        perConv: { ...s.perConv, [id]: 0 },
      };
    });
  }, []);

  const conv = useCallback(
    (id: string, fallback: number) =>
      id in state.perConv ? state.perConv[id] : fallback,
    [state],
  );

  return (
    <Ctx.Provider value={{ total: state.total, conv, clearConv, reconcile }}>
      {children}
    </Ctx.Provider>
  );
}

export function useUnread(): UnreadCtx | null {
  return useContext(Ctx);
}
