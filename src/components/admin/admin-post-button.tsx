"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminPostButton({
  url,
  body,
  label,
  confirmText,
  promptReason,
  className = "btn-ghost",
  redirectTo,
  method = "POST",
}: {
  url: string;
  body?: unknown;
  label: React.ReactNode;
  confirmText?: string;
  promptReason?: string;
  className?: string;
  redirectTo?: string;
  method?: "POST" | "DELETE" | "PATCH";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    if (confirmText && !window.confirm(confirmText)) return;
    let payload: unknown = body;
    if (promptReason) {
      const reason = window.prompt(promptReason);
      if (!reason || !reason.trim()) return;
      payload = { ...(typeof body === "object" && body ? body : {}), reason: reason.trim() };
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: payload ? JSON.stringify(payload) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Xatolik");
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <button type="button" className={className} disabled={busy} onClick={run}>
        {busy ? "..." : label}
      </button>
      {err && <span className="text-xs text-red-400">{err}</span>}
    </span>
  );
}
