"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { Icon } from "@/components/icons";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
/** "Keyinroq" bosilgach 3 kun qayta so'ralmaydi */
const SNOOZE_KEY = "tyr_push_snooze";
const SNOOZE_MS = 3 * 24 * 3600 * 1000;

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

async function subscribe() {
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID),
    });
  }
  const json = sub.toJSON();
  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: sub.endpoint, keys: json.keys }),
  });
}

export function PushSetup() {
  const pathname = usePathname();
  const [state, setState] = useState<
    "loading" | "unsupported" | "default" | "granted" | "denied"
  >("loading");
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissedState] = useState(false);
  function setDismissed(v: boolean) {
    setDismissedState(v);
    if (v) localStorage.setItem(SNOOZE_KEY, String(Date.now()));
  }

  useEffect(() => {
    const snoozed = Number(localStorage.getItem(SNOOZE_KEY) || 0);
    if (Date.now() - snoozed < SNOOZE_MS) setDismissedState(true);
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window) ||
      !VAPID
    ) {
      setState("unsupported");
      return;
    }
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => {
        const perm = Notification.permission;
        setState(perm as "default" | "granted" | "denied");
        if (perm === "granted") subscribe().catch(() => {});
      })
      .catch(() => setState("unsupported"));
  }, []);

  const show = state === "default" && !dismissed && !/^\/messages\/[^/]+$/.test(pathname);

  useEffect(() => {
    if (!show) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDismissed(true);
    }
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [show]);

  if (!show || typeof document === "undefined") return null;

  async function enable() {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      setState(perm as "granted" | "denied");
      if (perm === "granted") await subscribe();
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4"
      onClick={() => setDismissed(true)}
    >
      <div
        className="pop-in w-full max-w-sm rounded-2xl border border-white/10 bg-[#14141b] p-6 text-center shadow-2xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-300">
          <Icon name="bell" className="h-6 w-6" />
        </div>
        <h3 className="mt-4 font-semibold text-white">
          Bildirişnomalarni yoqasizmi?
        </h3>
        <p className="mt-1.5 text-sm text-zinc-400">
          Yangi xabarlar, takliflar va buyurtma holati haqida darhol
          xabardor bölasiz.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setDismissed(true)}
            disabled={busy}
          >
            Keyinroq
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={enable}
            disabled={busy}
          >
            {busy ? "..." : "Yoqiş"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
