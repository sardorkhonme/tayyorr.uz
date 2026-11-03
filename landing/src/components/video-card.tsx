"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { LandingVideo } from "@/lib/landing-data";

type Rect = { top: number; left: number; width: number; height: number };

/**
 * Panjaradagi video: kartada ovozsiz aylanib turadi, bosilganda kartadan ekran markaziga
 * kattalashib ochiladi (videoning haqiqiy nisbatida), Escape yoki fon bosilsa yopiladi.
 */
export function VideoCard({ video, spanClassName }: { video: LandingVideo; spanClassName: string }) {
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
        className={`card group relative aspect-video overflow-hidden !rounded-2xl sm:aspect-auto ${spanClassName}`}
      >
        <video
          ref={ambientRef}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          src={video.videoUrl}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent p-4 pt-12">
          <p className="text-sm font-medium text-white">{video.title}</p>
        </div>
        <button
          type="button"
          onClick={play}
          aria-label={`${video.title} — köriş`}
          className="absolute inset-0 flex items-center justify-center"
        >
          <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white opacity-90 transition group-hover:scale-105 group-hover:opacity-100">
            <PlayIcon />
            Köriş
          </span>
        </button>
      </div>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm transition-opacity duration-500"
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
                  src={video.videoUrl}
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
                    className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                  >
                    <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white">
                      ↻ Qayta köriş
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={close}
                  aria-label="Yopiş"
                  className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/10 text-lg text-white backdrop-blur transition hover:bg-white/20"
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

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
