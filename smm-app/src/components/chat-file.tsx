"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Icon } from "@/components/icons";

/**
 * Support chatidagi fayl — tayyorr.uz chatidagi (src/components/chat-file.tsx) kabi:
 * rasm/video — kichik ko'rinish, bosilsa to'liq ekranda; audio — pleyer; qolganlari — yuklab olish.
 * `url` — ko'rish uchun, `downloadUrl` — brauzer ochmasdan yuklab oladi (R2 vaqtinchalik havola).
 */
export type ChatFile = { name: string; type: string; size: number; url: string; downloadUrl?: string };

export function humanSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

const extOf = (name: string) => (name.includes(".") ? name.split(".").pop()!.toUpperCase().slice(0, 5) : "");

function Lightbox({ file, onClose }: { file: ChatFile; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return createPortal(
    // pointerdown support popupini yopib yubormasin
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
      onPointerDown={(e) => e.stopPropagation()}
      data-chat-lightbox
    >
      <div className="absolute right-3 top-3 flex gap-2">
        <a
          href={file.downloadUrl ?? file.url}
          onClick={(e) => e.stopPropagation()}
          className="flex h-9 items-center gap-1.5 rounded-full bg-white/10 px-3 text-sm text-white backdrop-blur-sm transition hover:bg-white/20"
        >
          <Icon name="download" className="h-4 w-4" />
          Yuklab oliş
        </a>
        <button
          type="button"
          onClick={onClose}
          aria-label="Yopiş"
          className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20"
        >
          <Icon name="close" className="h-5 w-5" />
        </button>
      </div>
      <div onClick={(e) => e.stopPropagation()} className="animate-pop max-h-full max-w-full">
        {file.type.startsWith("video/") ? (
          <video src={file.url} controls autoPlay playsInline className="max-h-[86vh] max-w-[92vw] rounded-xl bg-black" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={file.url} alt={file.name} className="max-h-[86vh] max-w-[92vw] rounded-xl object-contain" />
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

  if (isImage || isVideo) {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="relative block w-[min(240px,62vw)] max-w-full overflow-hidden rounded-xl bg-zinc-100"
        >
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={file.url} alt={file.name} loading="lazy" className="max-h-60 w-full object-cover" />
          ) : (
            <>
              <video src={`${file.url}#t=0.1`} preload="metadata" muted playsInline className="max-h-60 w-full bg-black object-cover" />
              <span className="pointer-events-none absolute inset-0 grid place-items-center">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-black/55 text-white">
                  <Icon name="play" className="ml-0.5 h-6 w-6" fill="currentColor" />
                </span>
              </span>
            </>
          )}
        </button>
        {open && <Lightbox file={file} onClose={() => setOpen(false)} />}
      </>
    );
  }

  if (file.type.startsWith("audio/")) return <AudioFile file={file} mine={mine} />;

  // hujjat (pdf, docx, zip ...) — bosilsa yuklab olinadi
  const ext = extOf(file.name);
  return (
    <a href={file.downloadUrl ?? file.url} className="flex w-[min(236px,60vw)] max-w-full items-center gap-2.5 text-left">
      <span
        className={`grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full ${
          mine ? "bg-white text-indigo-600" : "bg-indigo-50 text-indigo-600"
        }`}
      >
        <Icon name="download" className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{file.name}</span>
        <span className={`block text-xs ${mine ? "text-indigo-100" : "text-zinc-500"}`}>
          {humanSize(file.size)}
          {ext && ` · ${ext}`}
        </span>
      </span>
    </a>
  );
}

/** Bir vaqtda faqat bitta audio ijro etilsin. */
let currentAudio: HTMLAudioElement | null = null;

function mmss(sec: number) {
  if (!Number.isFinite(sec)) return "0:00";
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Ovozli xabar / audio — tayyorr.uz chatidagi kabi "to'lqin" ko'rinishida. */
function AudioFile({ file, mine }: { file: ChatFile; mine: boolean }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(0);
  const [started, setStarted] = useState(false);

  // fayl nomi va hajmidan barqaror "to'lqin" (havola har safar o'zgaradi)
  const bars = useMemo(() => {
    let h = 0;
    for (const ch of `${file.name}:${file.size}`) h = (h * 31 + ch.charCodeAt(0)) | 0;
    return Array.from({ length: 30 }, () => {
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
    } else a.pause();
  }

  function seek(clientX: number, el: HTMLElement) {
    const a = ref.current;
    if (!a || !dur) return;
    const r = el.getBoundingClientRect();
    a.currentTime = Math.min(1, Math.max(0, (clientX - r.left) / r.width)) * dur;
  }

  const frac = dur ? pos / dur : 0;
  const ext = extOf(file.name);
  return (
    <div className="flex w-[min(236px,60vw)] max-w-full items-center gap-2.5">
      <audio
        ref={ref}
        src={file.url}
        preload="metadata"
        className="hidden"
        onLoadedMetadata={(e) => {
          const a = e.currentTarget;
          if (Number.isFinite(a.duration)) setDur(a.duration);
          else {
            // Chrome yozgan webm'da davomiylik yo'q (Infinity) — oxiriga sakratib aniqlaymiz
            const fix = () => {
              if (Number.isFinite(a.duration)) {
                a.removeEventListener("durationchange", fix);
                setDur(a.duration);
                a.currentTime = 0;
              }
            };
            a.addEventListener("durationchange", fix);
            a.currentTime = 1e7;
          }
        }}
        onTimeUpdate={(e) => {
          const t = e.currentTarget.currentTime;
          if (t < 1e6) setPos(t);
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Töxtatiş" : "Ijro etiş"}
        className={`grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full ${
          mine ? "bg-white text-indigo-600" : "bg-gradient-to-br from-indigo-500 to-violet-500 text-white"
        }`}
      >
        {playing ? (
          <Icon name="pause" className="h-5 w-5" strokeWidth={2.6} />
        ) : (
          <Icon name="play" className="ml-0.5 h-5 w-5" fill="currentColor" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex h-[26px] cursor-pointer items-center gap-[2px]" onPointerDown={(e) => seek(e.clientX, e.currentTarget)}>
          {bars.map((b, i) => (
            <span
              key={i}
              className={`w-[2.4px] shrink-0 grow rounded-full ${
                (i + 0.5) / bars.length <= frac ? (mine ? "bg-white" : "bg-indigo-500") : mine ? "bg-white/40" : "bg-zinc-300"
              }`}
              style={{ height: `${4 + 20 * b}px` }}
            />
          ))}
        </div>
        <div className={`mt-0.5 flex items-center justify-between text-[11px] tabular-nums ${mine ? "text-indigo-100" : "text-zinc-500"}`}>
          <span>{started && dur ? `${mmss(pos)} / ${mmss(dur)}` : dur ? mmss(dur) : `${humanSize(file.size)}${ext ? ` · ${ext}` : ""}`}</span>
          <a href={file.downloadUrl ?? file.url} aria-label="Yuklab oliş">
            <Icon name="download" className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
