"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface ChatFile {
  name: string;
  type: string;
  size: number;
  url: string;
}

export function humanSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** Cross-origin (R2) fayllarни haqiqiy yuklab olish. */
export async function downloadFile(url: string, name: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objUrl;
    a.download = name || "fayl";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objUrl), 4000);
  } catch {
    window.open(url, "_blank", "noopener");
  }
}

function Lightbox({ file, onClose }: { file: ChatFile; onClose: () => void }) {
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
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <div className="absolute right-3 top-3 flex gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            downloadFile(file.url, file.name);
          }}
          className="backdrop-blur-sm flex h-9 items-center gap-1.5 rounded-full bg-white/10 px-3 text-sm text-white hover:bg-white/20"
        >
          ↓ Yuklab olish
        </button>
        <button
          type="button"
          onClick={onClose}
          className="backdrop-blur-sm flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg text-white hover:bg-white/20"
          aria-label="Yopish"
        >
          ✕
        </button>
      </div>
      <div onClick={(e) => e.stopPropagation()} className="pop-in max-h-full max-w-full">
        {file.type.startsWith("video/") ? (
          <video
            src={file.url}
            controls
            autoPlay
            playsInline
            preload="auto"
            className="max-h-[86vh] max-w-[92vw] rounded-lg bg-black"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={file.url}
            alt={file.name}
            className="max-h-[86vh] max-w-[92vw] rounded-lg object-contain"
          />
        )}
      </div>
    </div>,
    document.body,
  );
}

export function ChatFileView({ file, mine }: { file: ChatFile; mine: boolean }) {
  const [open, setOpen] = useState(false);
  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  const isAudio = file.type.startsWith("audio/");

  if (isImage || isVideo) {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="relative block w-[min(260px,64vw)] max-w-full overflow-hidden rounded-lg bg-black"
        >
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={file.url}
              alt={file.name}
              className="max-h-56 w-full rounded-lg object-cover"
            />
          ) : (
            <>
              <video
                src={`${file.url}#t=0.1`}
                preload="metadata"
                muted
                playsInline
                className="max-h-56 w-full rounded-lg object-cover"
              />
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-xl text-white">
                  ▶
                </span>
              </span>
            </>
          )}
        </button>
        {open && <Lightbox file={file} onClose={() => setOpen(false)} />}
      </>
    );
  }

  if (isAudio) return <AudioMessage file={file} mine={mine} />;

  return (
    <button
      type="button"
      onClick={() => downloadFile(file.url, file.name)}
      className={`backdrop-blur-sm flex max-w-full items-center gap-3 rounded-lg px-3 py-2 text-left ${
        mine ? "bg-white/15" : "bg-white/10"
      }`}
    >
      <span className="text-lg">📎</span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{file.name}</span>
        <span className="block text-xs opacity-70">
          {humanSize(file.size)} · yuklab olish
        </span>
      </span>
    </button>
  );
}

// ── Audio xabar (Telegram uslubida, mobil ilova bilan bir xil) ─────

/** Bir vaqtda faqat bitta audio ijro etilsin. */
let currentAudio: HTMLAudioElement | null = null;

function mmss(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function AudioMessage({ file, mine }: { file: ChatFile; mine: boolean }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(0);
  const [started, setStarted] = useState(false);

  // fayl nomi va hajmidan barqaror "to'lqin" (havola har safar o'zgaradi)
  const bars = useMemo(() => {
    let h = 0;
    for (const ch of `${file.name}:${file.size}`) h = (h * 31 + ch.charCodeAt(0)) | 0;
    return Array.from({ length: 34 }, () => {
      h = (h * 1103515245 + 12345) | 0;
      return 0.25 + (((h >>> 8) & 0xffff) / 0xffff) * 0.75;
    });
  }, [file.name, file.size]);

  function toggle() {
    const a = ref.current;
    if (!a) return;
    if (a.paused) {
      if (currentAudio && currentAudio !== a) currentAudio.pause();
      currentAudio = a;
      if (a.ended) a.currentTime = 0;
      setStarted(true);
      a.play().catch(() => {});
    } else {
      a.pause();
    }
  }

  function seek(clientX: number, el: HTMLElement) {
    const a = ref.current;
    if (!a || !dur) return;
    const r = el.getBoundingClientRect();
    a.currentTime = Math.min(1, Math.max(0, (clientX - r.left) / r.width)) * dur;
  }

  const frac = dur ? pos / dur : 0;
  const ext = file.name.includes(".") ? file.name.split(".").pop()!.toUpperCase() : "";
  return (
    <div className="flex w-[min(236px,60vw)] max-w-full items-center gap-2.5">
      <audio
        ref={ref}
        src={file.url}
        preload="metadata"
        className="hidden"
        onLoadedMetadata={(e) => setDur(e.currentTarget.duration || 0)}
        onTimeUpdate={(e) => setPos(e.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "To'xtatish" : "Ijro etish"}
        className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full text-lg ${
          mine ? "bg-white text-indigo-600" : "bg-indigo-400 text-white"
        }`}
      >
        {playing ? "❚❚" : "▶"}
      </button>
      <div className="min-w-0 flex-1">
        <div
          className="flex h-[26px] cursor-pointer items-center gap-[2px]"
          onPointerDown={(e) => seek(e.clientX, e.currentTarget)}
        >
          {bars.map((b, i) => (
            <span
              key={i}
              className={`w-[2.4px] shrink-0 grow rounded-full ${
                (i + 0.5) / bars.length <= frac
                  ? mine
                    ? "bg-white"
                    : "bg-indigo-400"
                  : mine
                    ? "bg-white/35"
                    : "bg-zinc-600"
              }`}
              style={{ height: `${4 + 20 * b}px` }}
            />
          ))}
        </div>
        <div
          className={`mt-0.5 flex items-center justify-between text-[11px] tabular-nums ${
            mine ? "text-indigo-200" : "text-zinc-500"
          }`}
        >
          <span>
            {started && dur
              ? `${mmss(pos)} / ${mmss(dur)}`
              : dur
                ? mmss(dur)
                : `${humanSize(file.size)}${ext ? ` · ${ext}` : ""}`}
          </span>
          <button
            type="button"
            onClick={() => downloadFile(file.url, file.name)}
            className="hover:underline"
            aria-label="Yuklab olish"
          >
            ↓
          </button>
        </div>
      </div>
    </div>
  );
}
