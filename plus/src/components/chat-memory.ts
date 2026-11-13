"use client";

import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from "react";

/**
 * Çatlar uçun:
 *  · `useChatMemory` — çat qayta oçilganda foydalanuvçi qoldirgan joyda oçiladi (öşa xabar, öşa masofa);
 *    birinçi marta — birinçi öqilmagan xabarda yoki pastda; pastda qoldirilgan bölsa — pastda.
 *    Oçilganda körinib turgan xabarlar pastdan yuqoriga tez ketma-ket paydo böladi.
 *  · `useEnterAnim` — yangi xabarlar: özim yuborgan — Telegramdagidek «suyuq» sakraş, boşqalarniki — yumşoq pop.
 * Bu fayl tayyorr.uz, admin, tayyorr+ va SMM saytlarida bir xil (har biriga nusxa).
 */

type Saved = { id?: string; off?: number; bottom?: boolean; t: number };
type Lock = { id?: string; off?: number; bottom?: boolean; until: number };

const BOTTOM_PX = 80;
const LOCK_MS = 2500;
const storeKeyOf = (k: string) => `tayyorr:chat-pos:${k}`;

function readPos(k: string): Saved | null {
  try {
    const raw = localStorage.getItem(storeKeyOf(k));
    if (!raw) return null;
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? (v as Saved) : null;
  } catch {
    return null;
  }
}

function writePos(k: string, v: Saved) {
  try {
    localStorage.setItem(storeKeyOf(k), JSON.stringify(v));
  } catch {
    /* xotira yöq / taqiqlangan — e'tiborsiz */
  }
}

export function prefersReducedMotion() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** Çatdagi xabar elementlari (DOM tartibida); vaqtinçalik (yuborilayotgan) xabarlar langar bölmaydi. */
function itemsOf(box: HTMLElement, prefix: string) {
  return Array.from(box.querySelectorAll<HTMLElement>(`[id^="${prefix}"]`)).filter(
    (el) => !el.id.startsWith(`${prefix}tmp-`),
  );
}

/** Hozirgi joy: pastda bölsa — `bottom`, aks holda yuqoridagi birinçi körinib turgan xabar va uning masofasi. */
function snapshot(box: HTMLElement, prefix: string): Saved | null {
  if (!box.isConnected || box.clientHeight === 0) return null;
  if (box.scrollHeight - box.scrollTop - box.clientHeight <= BOTTOM_PX) return { bottom: true, t: Date.now() };
  const top = box.getBoundingClientRect().top;
  for (const el of itemsOf(box, prefix)) {
    const r = el.getBoundingClientRect();
    if (r.bottom > top + 1) return { id: el.id.slice(prefix.length), off: Math.round(r.top - top), t: Date.now() };
  }
  return null;
}

function placeAt(box: HTMLElement, el: HTMLElement, off: number) {
  const d = el.getBoundingClientRect().top - box.getBoundingClientRect().top - off;
  if (Math.abs(d) > 0.5) box.scrollTop += d;
}

/** Oçilişda körinib turgan xabarlar — pastdan yuqoriga, ~30ms oraliq, har biri ~260ms (jami < 0.5s). */
function appear(box: HTMLElement, prefix: string) {
  if (prefersReducedMotion()) return;
  const br = box.getBoundingClientRect();
  const vis = itemsOf(box, prefix)
    .filter((el) => {
      const r = el.getBoundingClientRect();
      return r.bottom > br.top && r.top < br.bottom;
    })
    .reverse();
  const n = vis.length;
  if (!n) return;
  const step = n > 1 ? Math.min(30, 220 / (n - 1)) : 0;
  vis.forEach((el, i) => {
    el.style.animationDelay = `${Math.round(i * step)}ms`;
    el.classList.add("chat-appear");
    window.setTimeout(() => {
      el.classList.remove("chat-appear");
      el.style.animationDelay = "";
    }, 600);
  });
}

export function useChatMemory(opts: {
  ref: RefObject<HTMLElement | null>;
  /** çat kaliti (suhbat id, "support", "family") */
  storeKey: string;
  /** xabar elementlari id oldi qöşimçasi: "msg-", "fm-", "sm-" */
  prefix: string;
  /** dastlabki xabarlar DOMda (yuklanib bölgan) */
  ready: boolean;
  /** birinçi öqilmagan xabar (ma'lum bölsa) */
  firstUnreadId?: string | null;
  /** langar xabar hali yuklanmagan bölsa — eskiroq sahifani yuklaydi (yana bor bölsa true) */
  loadMore?: () => Promise<boolean>;
  /** joy tiklangandan keyin (masalan «↓» tugmasi holatini yangilaş uçun) */
  onRestored?: () => void;
}) {
  const { ref, storeKey, prefix, ready } = opts;
  const [restored, setRestored] = useState(false);
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const lock = useRef<Lock | null>(null);
  const doneFor = useRef<string | null>(null);

  // 1) joyni tiklaş (bo'yashdan oldin — sakraş körinmaydi)
  useLayoutEffect(() => {
    const box = ref.current;
    if (!ready || !box || doneFor.current === storeKey) return;
    doneFor.current = storeKey;
    const o = optsRef.current;
    const saved = readPos(storeKey);
    const find = (id?: string | null) => (id ? document.getElementById(prefix + id) : null);

    const toBottom = () => {
      box.scrollTop = box.scrollHeight;
      lock.current = { bottom: true, until: Date.now() + LOCK_MS };
    };
    const toEl = (el: HTMLElement, off: number) => {
      placeAt(box, el, off);
      lock.current = { id: el.id, off, until: Date.now() + LOCK_MS };
    };
    const toUnreadOrBottom = () => {
      const el = find(o.firstUnreadId);
      if (el) toEl(el, 12);
      else toBottom();
    };

    const anchor = saved && !saved.bottom ? find(saved.id) : null;
    if (saved?.bottom) toBottom();
    else if (anchor) toEl(anchor, saved?.off ?? 0);
    else toUnreadOrBottom();

    appear(box, prefix);
    setRestored(true);
    o.onRestored?.();

    // langar eskiroq sahifada qolgan bölsa — bir necha sahifagaça yuklab qidiramiz
    if (saved?.id && !saved.bottom && !anchor && o.loadMore) {
      let cancelled = false;
      const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      let userMoved = false;
      const mark = () => (userMoved = true);
      box.addEventListener("wheel", mark, { passive: true, once: true });
      box.addEventListener("touchstart", mark, { passive: true, once: true });
      void (async () => {
        for (let i = 0; i < 8 && !cancelled && !userMoved; i++) {
          const more = await optsRef.current.loadMore!().catch(() => false);
          await frame();
          const el = find(saved.id);
          if (el && !cancelled && !userMoved) {
            toEl(el, saved.off ?? 0);
            optsRef.current.onRestored?.();
            return;
          }
          if (!more) return;
        }
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [ready, storeKey, prefix, ref]);

  // 2) saqlaş (scroll — 200ms keyin, yorliq yaşirilganda / sahifa yopilganda / çatdan çiqilganda darhol)
  //    + tiklangan joyni bir oz ushlab turiş (rasmlar keyin yuklanib balandlik özgarsa ham), foydalanuvçi tegguniça
  useLayoutEffect(() => {
    const box = ref.current;
    if (!restored || !box) return;
    let timer = 0;
    const save = () => {
      if (timer) {
        window.clearTimeout(timer);
        timer = 0;
      }
      const s = snapshot(box, prefix);
      if (s) writePos(storeKey, s);
    };
    const onScroll = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(save, 200);
    };
    const onVis = () => {
      if (document.visibilityState === "hidden") save();
    };
    const unlock = () => {
      lock.current = null;
    };
    let raf = 0;
    const hold = () => {
      const l = lock.current;
      if (!l || Date.now() > l.until) {
        lock.current = null;
        return;
      }
      if (l.bottom) {
        if (box.scrollHeight - box.scrollTop - box.clientHeight > 1) box.scrollTop = box.scrollHeight;
      } else if (l.id) {
        const el = document.getElementById(l.id);
        if (el) placeAt(box, el, l.off ?? 0);
      }
      raf = requestAnimationFrame(hold);
    };
    raf = requestAnimationFrame(hold);

    box.addEventListener("scroll", onScroll, { passive: true });
    box.addEventListener("wheel", unlock, { passive: true });
    box.addEventListener("touchstart", unlock, { passive: true });
    window.addEventListener("pointerdown", unlock, true);
    window.addEventListener("keydown", unlock, true);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", save);
    return () => {
      cancelAnimationFrame(raf);
      box.removeEventListener("scroll", onScroll);
      box.removeEventListener("wheel", unlock);
      box.removeEventListener("touchstart", unlock);
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", save);
      // çatdan çiqiş (boşqa sahifaga ötiş) — element hali DOMda, oxirgi joy saqlanadi
      save();
    };
  }, [restored, storeKey, prefix, ref]);

  /** Dastur özi pastga tuşirganda (xabar yuborildi) — tiklangan joyni ushlab turiş toxtaydi. */
  const release = useCallback(() => {
    lock.current = null;
  }, []);

  return {
    restored,
    release,
    /** joy tiklanmaguniça (faqat bir lahza, SSR'dan keyin) xabarlar körinmaydi — sakraş bölmasin */
    hideStyle: ready && !restored ? ({ opacity: 0 } as const) : undefined,
  };
}

/**
 * Yangi xabar animatsiyasi sinfi. Dastlabki xabarlar va eskiroq sahifa (yuqoriga qöşilgan) — animatsiyasiz;
 * keyin kelganlar: `send` — özim yuborgan (suyuq sakraş), `pop` — boşqalarniki (yumşoq paydo bölish).
 * Sinf har kalit uçun bir marta tanlanadi va özgarmaydi (animatsiya qayta boşlanmaydi).
 */
export function useEnterAnim(armed: boolean) {
  const map = useRef<Map<string, string>>(new Map());
  const maxT = useRef(-Infinity);
  const armedRef = useRef(false);
  useLayoutEffect(() => {
    armedRef.current = armed;
  }, [armed]);
  return useCallback((key: string, t: number, kind: "send" | "pop") => {
    const hit = map.current.get(key);
    if (hit !== undefined) return hit;
    let cls = "";
    if (armedRef.current && (kind === "send" || t >= maxT.current)) cls = kind === "send" ? "chat-send" : "chat-pop";
    if (kind !== "send" && t > maxT.current) maxT.current = t;
    map.current.set(key, cls);
    return cls;
  }, []);
}
