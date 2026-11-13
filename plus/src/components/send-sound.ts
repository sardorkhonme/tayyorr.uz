"use client";

/**
 * Xabar yuborilganda (server qabul qilganda) qisqa «pop» — ilovadagi bilan bir xil fayl
 * (/sounds/send.mp3, asl fayl özgarişsiz). 250ms içida bir martadan köp çalinmaydi.
 */
let audio: HTMLAudioElement | null = null;
let last = 0;

export function playSent() {
  if (typeof window === "undefined") return;
  const now = Date.now();
  if (now - last < 250) return;
  last = now;
  try {
    audio ??= new Audio("/sounds/send.mp3");
    audio.currentTime = 0;
    void audio.play().catch(() => {});
  } catch {
    // brauzer ovozni bloklasa — jim
  }
}
