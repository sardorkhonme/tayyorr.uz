"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { TermsContent } from "@/components/terms-content";
import { Icon } from "@/components/icons";

/**
 * Ro'yxatdan o'tish / onboarding uchun rozilik katakchasi.
 * Belgilanmaguncha davom etib bo'lmaydi. Havola to'liq oferta modalini ochadi.
 */
export function TermsGate({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <label className="flex cursor-pointer items-start gap-2.5 text-sm text-zinc-300">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 accent-indigo-500"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>
          Men{" "}
          <button
            type="button"
            className="text-indigo-400 underline underline-offset-2 hover:text-indigo-300"
            onClick={() => setOpen(true)}
          >
            ommaviy oferta va foydalaniş şartlari
          </button>{" "}
          bilan tanişdim, ularga roziman va maʼlumotlarni öz ixtiyorim bilan
          beraman.
        </span>
      </label>

      {open && <TermsModal onClose={() => setOpen(false)} />}
    </>
  );
}

function TermsModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/75 p-4"
      onClick={onClose}
    >
      <div
        className="pop-in flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#14141b] shadow-2xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
          <h2 className="font-semibold text-white">Ommaviy oferta</h2>
          <button
            type="button"
            className="backdrop-blur-sm rounded-lg px-2 py-1 text-sm text-zinc-400 hover:bg-white/5 hover:text-white"
            onClick={onClose}
            aria-label="Yopiş"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">
          <TermsContent />
        </div>
        <div className="border-t border-white/10 px-5 py-3">
          <button type="button" className="btn-primary w-full" onClick={onClose}>
            Tuşunarli
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
