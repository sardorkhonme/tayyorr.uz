"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Brauzer qo'llaydigan audio format (Chrome — webm/opus, Safari — mp4/aac). */
function pickMime(): { mime: string; ext: string } {
  const options = [
    { mime: "audio/webm;codecs=opus", ext: "webm" },
    { mime: "audio/webm", ext: "webm" },
    { mime: "audio/mp4", ext: "m4a" },
    { mime: "audio/ogg;codecs=opus", ext: "ogg" },
  ];
  for (const o of options) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(o.mime)) return o;
  }
  return { mime: "", ext: "webm" };
}

/**
 * Ovozli xabar yozish (Telegram kabi: tugmani bosib turish — yozish,
 * qo'yib yuborish — tugatish). Juda qisqa yozuv (0.6s dan kam) bekor qilinadi.
 */
export function useVoiceRecorder(onDone: (file: File) => void, onError: (msg: string) => void) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelled = useRef(false);
  // bosib turish tugagunga qadar mikrofon ruxsati kelmasa — yozishni boshlamaymiz
  const wantStop = useRef(false);

  const cleanup = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    rec.current?.stream.getTracks().forEach((t) => t.stop());
    rec.current = null;
    setRecording(false);
    setSeconds(0);
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const start = useCallback(async () => {
    if (rec.current) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      onError("Brauzeringiz ovoz yozishni qo'llamaydi");
      return;
    }
    wantStop.current = false;
    cancelled.current = false;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      onError("Mikrofonga ruxsat berilmadi");
      return;
    }
    if (wantStop.current) {
      // ruxsat oynasi paytida barmoq qo'yib yuborildi — keyingi bosishda yoziladi
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    const { mime, ext } = pickMime();
    const r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    chunks.current = [];
    r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    r.onstop = () => {
      const dur = (Date.now() - startedAt.current) / 1000;
      const type = (r.mimeType || mime || "audio/webm").split(";")[0];
      const blob = new Blob(chunks.current, { type });
      cleanup();
      if (cancelled.current) return;
      if (dur < 0.6 || blob.size < 500) {
        onError("Yozib olish uchun tugmani bosib turing");
        return;
      }
      const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "");
      onDone(new File([blob], `ovozli-xabar-${stamp}.${ext}`, { type }));
    };
    rec.current = r;
    startedAt.current = Date.now();
    r.start(250);
    setRecording(true);
    setSeconds(0);
    timer.current = setInterval(() => setSeconds(Math.floor((Date.now() - startedAt.current) / 1000)), 250);
  }, [cleanup, onDone, onError]);

  const stop = useCallback(() => {
    wantStop.current = true;
    if (rec.current && rec.current.state !== "inactive") rec.current.stop();
  }, []);

  const cancel = useCallback(() => {
    cancelled.current = true;
    stop();
  }, [stop]);

  return { recording, seconds, start, stop, cancel };
}
