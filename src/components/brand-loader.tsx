"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

/**
 * Brend yuklagiçi — tayyorr+ belgisi (/plus-mark.png) va uning atrofida
 * pulsatsiyalanuvçi halqa. Kutiş paytida (kiriş, buyurtma joylaş, yuklaş)
 * og'ir shimmer o'rniga ishlatiladi. Uslublar: globals.css `.brand-loader`.
 */
export function BrandLoader({
  size = 56,
  label,
  className = "",
}: {
  size?: number;
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-4 ${className}`}
    >
      <span className="brand-loader" style={{ width: size, height: size }}>
        <span className="brand-loader-ring" aria-hidden />
        <span className="brand-loader-ring brand-loader-ring-2" aria-hidden />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/plus-mark.png"
          alt=""
          aria-hidden
          draggable={false}
          className="brand-loader-mark"
          style={{ width: size * 0.62, height: size * 0.62 }}
        />
      </span>
      {label ? (
        <span className="text-center text-sm font-medium text-zinc-300">{label}</span>
      ) : (
        <span className="sr-only">Yuklanmoqda…</span>
      )}
    </div>
  );
}

/** Butun ekranni yopuvçi kutiş oynasi (bloklovçi amallar uçun). */
export function BrandLoaderOverlay({ label }: { label?: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-[var(--bg)]/85 backdrop-blur-sm">
      <BrandLoader size={72} label={label} />
    </div>,
    document.body,
  );
}
