"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Real-time (Ably SSE) — sahifada bitta umumiy ulanish. Server signal yuboradi ("chat" | "wallet" | "order"),
 * komponentlar shunda ma'lumotni darhol qayta so'raydi. Ulanmagan bo'lsa (sozlanmagan, limit, tarmoq) —
 * komponentlar oldingidek tez-tez so'rab turadi; ulangan bo'lsa — faqat siyrak ehtiyot tekshiruvi.
 * Bir xil fayl to'rt loyihada: src, admin, plus, smm-app (lib/use-realtime.ts).
 */
export type RealtimeEvent = { name: string; data: Record<string, string> };
type Listener = (e: RealtimeEvent) => void;

const SSE = "https://realtime.ably.io/sse";
const listeners = new Set<Listener>();
const statusListeners = new Set<(on: boolean) => void>();
let es: EventSource | null = null;
let connected = false;
let started = false;
let disabled = false;
let lastEvent = "";
let retry = 2000;
let renewTimer: ReturnType<typeof setTimeout> | null = null;

function setConnected(on: boolean) {
  if (connected === on) return;
  connected = on;
  statusListeners.forEach((l) => l(on));
}

function reconnectLater() {
  setTimeout(connect, retry);
  retry = Math.min(retry * 2, 60_000);
}

async function connect() {
  if (disabled || typeof window === "undefined") return;
  es?.close();
  es = null;
  if (renewTimer) clearTimeout(renewTimer);
  const res = await fetch("/api/realtime/token", { cache: "no-store" }).catch(() => null);
  // 204 — real-time sozlanmagan, 401 — kirmagan: so'rab turish ishlaydi
  if (res && (res.status === 204 || res.status === 401)) {
    disabled = true;
    setConnected(false);
    return;
  }
  const t = res?.ok ? ((await res.json().catch(() => null)) as { token: string; expires: number; channels: string[] } | null) : null;
  if (!t?.token) {
    setConnected(false);
    return reconnectLater();
  }
  const qs = new URLSearchParams({ v: "1.2", channels: t.channels.join(","), accessToken: t.token });
  if (lastEvent) qs.set("lastEvent", lastEvent);
  const src = new EventSource(`${SSE}?${qs}`);
  es = src;
  src.onopen = () => {
    retry = 2000;
    setConnected(true);
  };
  src.onmessage = (e) => {
    if (e.lastEventId) lastEvent = e.lastEventId;
    try {
      const m = JSON.parse(e.data) as { name?: string; data?: unknown };
      let data = m.data;
      if (typeof data === "string") data = JSON.parse(data || "{}");
      const ev = { name: m.name ?? "", data: (data ?? {}) as Record<string, string> };
      listeners.forEach((l) => l(ev));
    } catch {
      /* noto'g'ri xabar — e'tiborsiz */
    }
  };
  src.onerror = () => {
    // EventSource o'zi qayta ulanadi, lekin token eskirgan bo'lishi mumkin — yangi token bilan ulanamiz
    if (es !== src) return;
    src.close();
    es = null;
    setConnected(false);
    reconnectLater();
  };
  // token tugashidan oldin yangilaymiz
  const ms = Math.max(60_000, t.expires - Date.now() - 5 * 60_000);
  renewTimer = setTimeout(connect, ms);
}

function start() {
  if (started) return;
  started = true;
  void connect();
  // ulanish uzilgan bo'lsa — sahifaga qaytganda darhol
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && !es && !disabled) {
      retry = 2000;
      void connect();
    }
  });
}

/** Signal kelganda chaqiriladi. Qaytaradi: real-time ulanganmi (true — tez-tez so'rash shart emas). */
export function useRealtime(onEvent?: Listener) {
  const [on, setOn] = useState(connected);
  const ref = useRef(onEvent);
  ref.current = onEvent;
  useEffect(() => {
    start();
    const l: Listener = (e) => ref.current?.(e);
    listeners.add(l);
    statusListeners.add(setOn);
    setOn(connected);
    return () => {
      listeners.delete(l);
      statusListeners.delete(setOn);
    };
  }, []);
  return on;
}

/** Ulanganda — ehtiyot tekshiruvi oralig'i */
export const SAFETY_POLL_MS = 60_000;
