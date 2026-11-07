"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Doimiy iz (admin "Loglar") — brauzer tomoni: har bir ekran ochilishi (sahifadan sahifaga ichki
 * o'tish ham) va bosish mumkin bo'lgan har bir joyga bosish (tugma, havola, tab, belgi ...).
 * Yozilgan matn / parol / tanlangan qiymat YUBORILMAYDI — faqat elementning nomi (yozuvi).
 * Izlar to'planib, 3 soniyada bir marta yoki sahifa yopilayotganda bitta so'rov bilan /api/audit ga ketadi.
 * Bir xil fayl to'rt loyihada: src, plus, smm-app, admin (components/activity-tracker.tsx).
 */
type Ev = { t: "PAGE" | "CLICK"; path: string; label?: string; href?: string; at: number };

const CLICKABLE =
  'a[href], button, summary, label, select, [role="button"], [role="tab"], [role="link"], [role="menuitem"], [role="option"], [role="switch"], [role="checkbox"], input[type="checkbox"], input[type="radio"], input[type="submit"], input[type="button"]';

let queue: Ev[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function flush(beacon = false) {
  if (timer) clearTimeout(timer);
  timer = null;
  if (!queue.length) return;
  const body = JSON.stringify({ events: queue.splice(0, 60) });
  try {
    if (beacon && navigator.sendBeacon?.("/api/audit", new Blob([body], { type: "application/json" }))) return;
    void fetch("/api/audit", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => {});
  } catch {
    // iz yuborilmasa ham sayt ishlayveradi
  }
  if (queue.length) flush(beacon);
}

function push(e: Omit<Ev, "at">) {
  queue.push({ ...e, at: Date.now() });
  if (queue.length > 200) queue = queue.slice(-200);
  if (!timer) timer = setTimeout(() => flush(), 3000);
}

const squash = (s: string | null | undefined, n = 80) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

/** Element nomi: aria-label → title → ko'rinadigan yozuv → rasm alt → name. Qiymat (value) olinmaydi. */
function labelOf(el: Element): string {
  const own = squash(el.getAttribute("aria-label")) || squash(el.getAttribute("title"));
  if (own) return own;
  if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
    const lbl = el.labels?.[0];
    const text = squash(lbl?.innerText);
    return `${text || squash(el.name) || el.type}${el.type === "checkbox" ? (el.checked ? " (belgilandi)" : " (olib taşlandi)") : ""}`;
  }
  if (el instanceof HTMLSelectElement) return squash(el.labels?.[0]?.innerText) || squash(el.name) || "tanlov";
  // kartochka kabi katta elementlarda — faqat birinchi qator (sarlavha)
  const text = squash(((el as HTMLElement).innerText ?? "").split("\n").find((l) => l.trim()));
  if (text) return text;
  const img = el.querySelector("img[alt], svg[aria-label]");
  return squash(img?.getAttribute("alt") || img?.getAttribute("aria-label")) || squash(el.getAttribute("name")) || el.tagName.toLowerCase();
}

function hrefOf(el: Element): string | undefined {
  if (!(el instanceof HTMLAnchorElement)) return undefined;
  try {
    const u = new URL(el.href, location.href);
    if (!/^https?:$/.test(u.protocol)) return u.protocol.replace(":", "");
    // so'rov parametrlari (?…) yozilmaydi
    return u.origin === location.origin ? u.pathname : `${u.host}${u.pathname}`;
  } catch {
    return undefined;
  }
}

export function ActivityTracker() {
  const pathname = usePathname();

  // har bir ekran (birinchi ochilish ham, ichki o'tish ham)
  useEffect(() => {
    if (pathname) push({ t: "PAGE", path: pathname });
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.(CLICKABLE);
      if (!el || el.closest("[data-no-track]")) return;
      // <label> ichidagi checkbox — o'zi alohida click beradi, ikki marta yozilmasin
      if (el.tagName === "LABEL" && (el as HTMLLabelElement).control) return;
      push({ t: "CLICK", path: location.pathname, label: labelOf(el), href: hrefOf(el) });
    };
    const onHide = () => document.visibilityState === "hidden" && flush(true);
    const onPageHide = () => flush(true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, []);

  return null;
}
