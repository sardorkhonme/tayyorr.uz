"use client";

/**
 * Xabar yuborilganda (server qabul qilganda) qisqa «pop» — ilovadagi bilan bir xil fayl
 * (/sounds/send.mp3, asl fayl özgarişsiz). 250ms içida bir martadan köp çalinmaydi.
 *
 * Web Audio orqali çalinadi: fayl bir marta yuklanib dekodlanadi (birinçi bosiş / birinçi çaliş), keyin
 * highpass ~180Hz (döğillagan past çastota olib taşlanadi) → ~3kHz da +3dB (tiniqlik) → gain 1.8 (balandroq) →
 * kompressor (qirqilmasin). Web Audio işlamasa — oddiy <audio>, volume 1.
 *
 * Sozlama «Xabar yuboriş ovozi»: cookie `tyr_send_sound` (`.tayyorr.uz` — app.tayyorr.uz, tayyorr+ va SMM da
 * bitta tanlov) ustuvor, keyin localStorage; "0" — öçiq.
 * Bu fayl tayyorr.uz, admin, tayyorr+ va SMM saytlarida bir xil (har biriga nusxa).
 */

const SRC = "/sounds/send.mp3";
export const SEND_SOUND_KEY = "tyr_send_sound";
const MAX_AGE = 60 * 60 * 24 * 365;
const SHARED_BASE = (process.env.NEXT_PUBLIC_SSO_COOKIE_DOMAIN || ".tayyorr.uz").replace(/^\./, "");

// ---------- sozlama ----------

function readCookie(): string | null {
  try {
    const m = document.cookie.match(new RegExp(`(?:^|; )${SEND_SOUND_KEY}=([01])`));
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

/** Ovoz yoqilganmi: cookie (umumiy) > localStorage > yoqilgan. */
export function isSendSoundOn(): boolean {
  if (typeof window === "undefined") return true;
  const c = readCookie();
  if (c !== null) return c !== "0";
  try {
    return localStorage.getItem(SEND_SOUND_KEY) !== "0";
  } catch {
    return true;
  }
}

/** Tanlovni saqlaydi: localStorage + `.tayyorr.uz` cookie (localhost'da — domensiz). */
export function setSendSoundOn(on: boolean) {
  const v = on ? "1" : "0";
  try {
    localStorage.setItem(SEND_SOUND_KEY, v);
  } catch {
    /* xotira taqiqlangan — cookie yetarli */
  }
  try {
    const h = location.hostname;
    const shared = h === SHARED_BASE || h.endsWith(`.${SHARED_BASE}`);
    // eski, faqat şu subdomendagi cookie qolmasin (ikkalasi yuborilsa — qaysi biri öqilişi noaniq)
    if (shared) document.cookie = `${SEND_SOUND_KEY}=; path=/; max-age=0`;
    document.cookie = `${SEND_SOUND_KEY}=${v}; path=/; max-age=${MAX_AGE}; samesite=lax${
      shared ? `; domain=.${SHARED_BASE}` : ""
    }`;
  } catch {
    /* ignore */
  }
  if (on) void ensureBuffer();
}

// ---------- Web Audio ----------

type Ctx = AudioContext;
let ctx: Ctx | null = null;
let chain: AudioNode | null = null;
let buffer: AudioBuffer | null = null;
let loading: Promise<AudioBuffer | null> | null = null;
let webAudioBroken = false;
let fallback: HTMLAudioElement | null = null;
let last = 0;

function getCtx(): Ctx | null {
  if (webAudioBroken) return null;
  if (ctx) return ctx;
  try {
    const AC =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) {
      webAudioBroken = true;
      return null;
    }
    const c = new AC();
    const hp = c.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 180;
    hp.Q.value = 0.7;
    const peak = c.createBiquadFilter();
    peak.type = "peaking";
    peak.frequency.value = 3000;
    peak.Q.value = 1;
    peak.gain.value = 3;
    const gain = c.createGain();
    gain.gain.value = 1.8;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -6;
    comp.knee.value = 6;
    comp.ratio.value = 6;
    comp.attack.value = 0.002;
    comp.release.value = 0.12;
    hp.connect(peak).connect(gain).connect(comp).connect(c.destination);
    ctx = c;
    chain = hp;
    return c;
  } catch {
    webAudioBroken = true;
    return null;
  }
}

function ensureBuffer(): Promise<AudioBuffer | null> {
  if (buffer) return Promise.resolve(buffer);
  if (loading) return loading;
  const c = getCtx();
  if (!c) return Promise.resolve(null);
  loading = fetch(SRC)
    .then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.arrayBuffer();
    })
    // eski Safari — faqat callback ko'rinişi (Promise qaytarmaydi)
    .then(
      (ab) =>
        new Promise<AudioBuffer>((res, rej) => {
          const p = c.decodeAudioData(ab, res, rej) as Promise<AudioBuffer> | undefined;
          if (p && typeof p.catch === "function") p.catch(rej);
        }),
    )
    .then((b) => (buffer = b))
    // tarmoq xatosi — keyingi safar qayta urinadi (bu safar <audio> çalinadi)
    .catch(() => null)
    .finally(() => {
      loading = null;
    });
  return loading;
}

/** Foydalanuvçi bosganda (yuboriş tugmasi / Enter) — kontekst oçiladi va fayl oldindan yuklanadi. */
function unlock() {
  if (!isSendSoundOn()) return;
  const c = getCtx();
  if (!c) return;
  if (c.state !== "running") void c.resume().catch(() => {});
  if (!buffer) void ensureBuffer();
}

if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", unlock, { capture: true, passive: true });
  window.addEventListener("keydown", unlock, { capture: true, passive: true });
}

function playFallback() {
  try {
    fallback ??= new Audio(SRC);
    fallback.volume = 1;
    fallback.currentTime = 0;
    void fallback.play().catch(() => {});
  } catch {
    // brauzer ovozni bloklasa — jim
  }
}

function playBuffer(c: Ctx, b: AudioBuffer) {
  if (c.state !== "running") void c.resume().catch(() => {});
  const src = c.createBufferSource();
  src.buffer = b;
  src.connect(chain!);
  src.start();
}

export function playSent() {
  if (typeof window === "undefined") return;
  if (!isSendSoundOn()) return;
  const now = Date.now();
  if (now - last < 250) return;
  last = now;
  try {
    const c = getCtx();
    if (!c) return playFallback();
    if (buffer) return playBuffer(c, buffer);
    void ensureBuffer().then((b) => {
      // yuklaniş juda çözilsa — kech çalinmasin
      if (Date.now() - now > 1500) return;
      if (b && ctx) playBuffer(ctx, b);
      else playFallback();
    });
  } catch {
    playFallback();
  }
}
