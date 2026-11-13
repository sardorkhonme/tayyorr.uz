"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/icons";
import { useFlashState } from "@/components/flash-status";

export function ReportDialog({
  suspectId,
  orderId,
  messageId,
  onClose,
}: {
  suspectId?: string;
  orderId?: string;
  messageId?: string;
  onClose: () => void;
}) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useFlashState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [busy, onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suspectId, orderId, messageId, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Yuborilmadi");
      setDone(true);
      setTimeout(onClose, 1300);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBusy(false);
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4"
      onClick={() => !busy && onClose()}
    >
      <div
        className="pop-in w-full max-w-md rounded-2xl border border-white/10 bg-[#14141b] p-6 shadow-2xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <p className="text-sm text-emerald-400">
            Şikoyatingiz yuborildi. Administrator körib çiqadi.
          </p>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <h3 className="font-semibold text-white">
              {messageId ? "Xabar ustidan şikoyat" : "Şikoyat"}
            </h3>
            <p className="text-xs text-zinc-400">
              Nomaqbul xatti-harakatni batafsil yozing. Maʼlumot faqat
              administratorga boradi.
            </p>
            <textarea
              className="input"
              rows={5}
              minLength={10}
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Nima böldi?"
            />
            {err && <p className="flash-status text-sm text-red-400">{err}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn-ghost"
                onClick={onClose}
                disabled={busy}
              >
                Bekor
              </button>
              <button className="btn-primary" disabled={busy}>
                {busy ? "..." : "Yuboriş"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}

export function ReportButton({
  suspectId,
  orderId,
  label = "Şikoyat qiliş",
  className = "btn-ghost",
}: {
  suspectId?: string;
  orderId?: string;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        <span className="inline-flex items-center gap-1.5">
          <Icon name="alert" className="h-4 w-4" />
          {label}
        </span>
      </button>
      {open && (
        <ReportDialog
          suspectId={suspectId}
          orderId={orderId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
