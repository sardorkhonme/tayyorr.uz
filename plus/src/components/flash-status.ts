"use client";

import { useCallback, useEffect, useRef, useState, type SetStateAction } from "react";

/**
 * Vaqtinçalik holat xabarlari (xato / «Saqlandi» …) — 5 soniyadan keyin
 * sekin sönib yöqoladi. Körsatilgan elementga `flash-status` klassini qöşing
 * (globals.css dagi söniş animatsiyasi shu vaqtga moslangan).
 */
export const FLASH_MS = 5000;

function isShown(v: unknown) {
  return v !== null && v !== undefined && v !== false && v !== "";
}

/**
 * `useState` örniga: qiymat körsatilgandan 5 s keyin özi böş holatga qaytadi.
 * Bir xil xabar qayta yuborilsa ham element qaytadan paydo böladi.
 */
export function useFlashState<T>(initial: T, ms = FLASH_MS) {
  const empty = useRef<T>((isShown(initial) ? null : initial) as T);
  const [value, setValue] = useState<T>(initial);
  const cur = useRef<T>(initial);
  const seq = useRef(0);

  const set = useCallback((action: SetStateAction<T>) => {
    const next =
      typeof action === "function"
        ? (action as (prev: T) => T)(cur.current)
        : action;
    const id = ++seq.current;
    if (isShown(next) && isShown(cur.current)) {
      // Yangi xabar — elementni qayta chiqarib, animatsiyani boşidan boşlaymiz
      cur.current = empty.current;
      setValue(empty.current);
      setTimeout(() => {
        if (seq.current !== id) return;
        cur.current = next;
        setValue(next);
      }, 40);
    } else {
      cur.current = next;
      setValue(next);
    }
  }, []);

  useEffect(() => {
    if (!isShown(value)) return;
    const t = setTimeout(() => {
      seq.current++;
      cur.current = empty.current;
      setValue(empty.current);
    }, ms);
    return () => clearTimeout(t);
  }, [value, ms]);

  return [value, set] as const;
}

/**
 * Taşqi qiymat uçun (masalan `useActionState` holati): yangi qiymat
 * (obyekt identifikatori böyiça) kelganda 5 s körsatadi, keyin `null`.
 */
export function useFlash<T>(value: T, ms = FLASH_MS): T | null {
  const [shown, setShown] = useState<T | null>(isShown(value) ? value : null);
  const first = useRef(true);

  useEffect(() => {
    let swap: ReturnType<typeof setTimeout> | undefined;
    if (first.current) {
      first.current = false;
    } else if (isShown(value)) {
      setShown(null);
      swap = setTimeout(() => setShown(value), 40);
    } else {
      setShown(null);
      return;
    }
    if (!isShown(value)) return;
    const t = setTimeout(() => setShown(null), ms);
    return () => {
      if (swap) clearTimeout(swap);
      clearTimeout(t);
    };
  }, [value, ms]);

  return shown;
}
