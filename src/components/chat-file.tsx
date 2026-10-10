"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { ProgressRing } from "@/components/progress-ring";

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

/**
 * Cross-origin (R2) faylni haqiqiy yuklab olish. [onProgress] — 0..100
 * (server hajmni bermasa null).
 */
export async function downloadFile(
  url: string,
  name: string,
  onProgress?: (pct: number | null) => void,
) {
  try {
    const res = await fetch(url);
    if (!res.ok || !res.body) throw new Error("download");
    const total = Number(res.headers.get("content-length")) || 0;
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let got = 0;
    onProgress?.(total ? 0 : null);
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      got += value.length;
      if (total) onProgress?.(Math.round((got / total) * 100));
    }
    const blob = new Blob(chunks as BlobPart[], { type: res.headers.get("content-type") ?? undefined });
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

/** Yuklab olish holati: null — yuklanmayapti, aks holda foiz (yoki null-foiz = noma'lum). */
function useDownload() {
  const [pct, setPct] = useState<number | null | undefined>(undefined);
  const start = async (url: string, name: string) => {
    if (pct !== undefined) return;
    setPct(null);
    await downloadFile(url, name, (p) => setPct(p));
    setPct(undefined);
  };
  return { active: pct !== undefined, pct: pct ?? null, start };
}

function Lightbox({ file, onClose }: { file: ChatFile; onClose: () => void }) {
  const dl = useDownload();
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
            dl.start(file.url, file.name);
          }}
          className="backdrop-blur-sm flex h-9 items-center gap-1.5 rounded-full bg-white/10 px-3 text-sm text-white hover:bg-white/20"
        >
          {dl.active ? (
            <>
              <ProgressRing pct={dl.pct} size={22} stroke={2.5} textClass="hidden" />
              {dl.pct != null ? `${dl.pct}%` : "Yuklanmoqda…"}
            </>
          ) : (
            "↓ Yuklab olish"
          )}
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

  return <DocFile file={file} mine={mine} />;
}

/** Hujjat — bosilganda foizli aylana bilan yuklab olinadi. */
function DocFile({ file, mine }: { file: ChatFile; mine: boolean }) {
  const dl = useDownload();
  const ext = file.name.includes(".") ? file.name.split(".").pop()!.toUpperCase() : "";
  return (
    <button
      type="button"
      onClick={() => dl.start(file.url, file.name)}
      className="flex w-[min(236px,60vw)] max-w-full items-center gap-2.5 text-left"
    >
      {dl.active ? (
        <span
          className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full ${
            mine ? "bg-white" : "bg-indigo-400"
          }`}
        >
          <ProgressRing
            pct={dl.pct}
            size={36}
            stroke={2.5}
            trackClass={mine ? "stroke-indigo-200" : "stroke-white/30"}
            barClass={mine ? "stroke-indigo-600" : "stroke-white"}
            textClass={mine ? "text-indigo-600 text-[9px]" : "text-white text-[9px]"}
          />
        </span>
      ) : (
        <span
          className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full text-lg ${
            mine ? "bg-white text-indigo-600" : "bg-indigo-400 text-white"
          }`}
        >
          ↓
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{file.name}</span>
        <span className={`block text-xs ${mine ? "text-indigo-200" : "text-zinc-500"}`}>
          {humanSize(file.size)}
          {ext && ` · ${ext}`}
        </span>
      </span>
    </button>
  );
}

// ── Audio xabar (Telegram uslubida, mobil ilova bilan bir xil) ─────

/** Bir vaqtda faqat bitta audio ijro etilsin. */
let currentAudio: HTMLAudioElement | null = null;

function mmss(sec: number) {
  if (!Number.isFinite(sec)) return "0:00";
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
        onLoadedMetadata={(e) => {
          const a = e.currentTarget;
          if (Number.isFinite(a.duration)) {
            setDur(a.duration);
          } else {
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
        onDurationChange={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) setDur(d);
        }}
        onTimeUpdate={(e) => {
          const t = e.currentTarget.currentTime;
          // davomiylikni aniqlash uchun qilingan sakrash pozitsiyaga yozilmasin
          if (t < 1e6) setPos(t);
        }}
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
