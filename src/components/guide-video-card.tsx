"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { LiquidGlass } from "@/components/liquid-glass";
type GuideVideoItem = { id: string; title: string; url: string };

type Rect = { top: number; left: number; width: number; height: number };

/**
 * Qo'llanma videosi — landingdagi VideoCard bilan bir xil: kartada ovozsiz aylanib
 * turadi, ustida "Ko'rish" (uchburchak) tugmasi; bosilganda kartadan ekran markaziga
 * kattalashib ochiladi, tugagach "Qayta ko'rish". Escape yoki fon bosilsa yopiladi.
 */
export function GuideVideoCard({ video, index }: { video: GuideVideoItem; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const ambientRef = useRef<HTMLVideoElement>(null);
  const modalRef = useRef<HTMLVideoElement>(null);
  const [open, setOpen] = useState(false);
  const [grown, setGrown] = useState(false);
  const [ended, setEnded] = useState(false);
  const [startRect, setStartRect] = useState<Rect | null>(null);
  const [ratio, setRatio] = useState(16 / 9);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function targetRect(r: number): Rect {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const safeTop = 96;
    const maxW = Math.min(vw * 0.92, 960);
    const maxH = Math.min(vh * 0.85, vh - safeTop - 24);
    let width = maxW;
    let height = width / r;
    if (height > maxH) {
      height = maxH;
      width = height * r;
    }
    return { width, height, left: (vw - width) / 2, top: Math.max(safeTop, (vh - height) / 2) };
  }

  function play() {
    const r = cardRef.current?.getBoundingClientRect();
    if (r) setStartRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    const amb = ambientRef.current;
    if (amb?.videoWidth && amb.videoHeight) setRatio(amb.videoWidth / amb.videoHeight);
    setEnded(false);
    setOpen(true);
    setGrown(false);
    window.setTimeout(() => setGrown(true), 30);
  }

  function close() {
    setGrown(false);
    modalRef.current?.pause();
    window.setTimeout(() => {
      setOpen(false);
      setEnded(false);
    }, 520);
  }

  function replay() {
    const el = modalRef.current;
    if (el) {
      el.currentTime = 0;
      el.play().catch(() => {});
    }
    setEnded(false);
  }

  const rect = grown ? targetRect(ratio) : startRect;

  return (
    <>
      <div
        ref={cardRef}
        className="blur-in group relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black"
      >
        <video
          ref={ambientRef}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          src={video.url}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent p-4 pt-12">
          <p className="flex items-center gap-2 text-sm font-medium" style={{ color: "#fff" }}>
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-semibold">
              {index + 1}
            </span>
            <span className="line-clamp-2">{video.title}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={play}
          aria-label={`${video.title} — köriş`}
          className="absolute inset-0 flex items-center justify-center"
        >
          <GlassPill icon={<PlayIcon />} label="Köriş" />
        </button>
      </div>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-sm transition-opacity duration-500"
            style={{ opacity: grown ? 1 : 0 }}
            onClick={close}
          >
            {rect && (
              <div
                className="fixed overflow-hidden rounded-2xl bg-black shadow-2xl shadow-black/60 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={rect}
                onClick={(e) => e.stopPropagation()}
              >
                <video
                  ref={modalRef}
                  className="h-full w-full bg-black object-contain"
                  src={video.url}
                  autoPlay
                  playsInline
                  onLoadedMetadata={(e) => {
                    const v = e.currentTarget;
                    if (v.videoWidth && v.videoHeight) setRatio(v.videoWidth / v.videoHeight);
                  }}
                  onEnded={() => setEnded(true)}
                />
                {ended && (
                  <button
                    type="button"
                    onClick={replay}
                    className="group absolute inset-0 flex items-center justify-center bg-black/40"
                  >
                    <GlassPill icon={<ReplayIcon />} label="Qayta köriş" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={close}
                  aria-label="Yopiş"
                  className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/10 text-lg backdrop-blur transition hover:bg-white/20"
                  style={{ color: "#fff" }}
                >
                  ✕
                </button>
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}

/**
 * Liquid glass tugma: odatda faqat belgi (doira), karta ustiga kelinganda kengayib yozuv chiqadi.
 * Ota elementda `group` bo'lishi kerak.
 */
function GlassPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <LiquidGlass
      as="span"
      radius={999}
      bezel={16}
      scale={42}
      style={{ color: "#fff" }}
      className="lg-pill inline-flex h-16 items-center rounded-full px-[1.375rem] shadow-2xl shadow-black/40 transition-[padding,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105 group-hover:px-6"
    >
      <span className="relative grid h-5 w-5 shrink-0 place-items-center">{icon}</span>
      <span className="relative max-w-0 overflow-hidden whitespace-nowrap text-base font-semibold opacity-0 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:ml-2.5 group-hover:max-w-[9rem] group-hover:opacity-100">
        {label}
      </span>
    </LiquidGlass>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 translate-x-px" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function ReplayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  );
}
