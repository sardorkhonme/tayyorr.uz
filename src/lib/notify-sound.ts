"use client";

/**
 * Yangi xabar kelganda chalinadigan qisqa "tin" ovozi (mobil ilova bilan bir xil).
 * Brauzerlar ovozni faqat foydalanuvchi sahifa bilan bir marta ishlashgandan
 * keyin ruxsat beradi — shu sabab birinchi bosish/tegishda ovoz "ochiladi".
 */
let audio: HTMLAudioElement | null = null;
let unlocked = false;
let lastPlayed = 0;

function ensure() {
  if (typeof window === "undefined") return null;
  if (!audio) {
    audio = new Audio("/sounds/tin.mp3");
    audio.preload = "auto";
    audio.volume = 0.6;
    const unlock = () => {
      if (unlocked || !audio) return;
      unlocked = true;
      // ovozsiz qisqa ijro — keyingi chalinishlar ruxsat etiladi
      audio.muted = true;
      audio
        .play()
        .then(() => {
          audio!.pause();
          audio!.currentTime = 0;
          audio!.muted = false;
        })
        .catch(() => {
          audio!.muted = false;
          unlocked = false;
        });
    };
    window.addEventListener("pointerdown", unlock, { once: false, passive: true });
    window.addEventListener("keydown", unlock, { once: false });
  }
  return audio;
}

/** "Tin" — ketma-ket kelgan xabarlarda 1.5 soniyada bir martadan ko'p emas. */
export function playTin() {
  const a = ensure();
  if (!a) return;
  const now = Date.now();
  if (now - lastPlayed < 1500) return;
  lastPlayed = now;
  try {
    a.currentTime = 0;
    a.play().catch(() => {});
  } catch {
    /* jim */
  }
}

/** Sahifa ochilganda ovozni oldindan tayyorlab qo'yish. */
export function primeTin() {
  ensure();
}
