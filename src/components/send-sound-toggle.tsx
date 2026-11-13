"use client";

import { useEffect, useState } from "react";

import { isSendSoundOn, playSent, setSendSoundOn } from "@/components/send-sound";

/**
 * «Xabar yuboriş ovozi» — yoqiş/öçiriş qatori. Tanlov app.tayyorr.uz, tayyorr+ va Tayyorr SMM da umumiy
 * (cookie `tyr_send_sound`, components/send-sound.ts). Yoqilganda namuna sifatida bir marta çalinadi.
 */
export function SendSoundToggle() {
  const [on, setOn] = useState<boolean | null>(null);
  useEffect(() => setOn(isSendSoundOn()), []);

  function toggle() {
    const next = !(on ?? true);
    setOn(next);
    setSendSoundOn(next);
    if (next) playSent();
  }

  const checked = on ?? true;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={toggle}
      className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition hover:bg-white/[0.07] active:scale-[0.99]"
    >
      <span
        aria-hidden
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors ${
          checked ? "bg-indigo-500/15 text-indigo-300" : "bg-white/5 text-zinc-500"
        }`}
      >
        <SpeakerIcon muted={!checked} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-white">Xabar yuboriş ovozi</span>
        <span className="mt-0.5 block text-xs text-zinc-500">Xabar yuborilganda qisqa ovoz</span>
      </span>
      <span
        aria-hidden
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300 ${
          checked ? "bg-indigo-500 shadow-lg shadow-indigo-500/25" : "bg-white/15"
        } ${on === null ? "opacity-0" : ""}`}
      >
        <span
          className="absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ transform: checked ? "translateX(1.25rem)" : "translateX(0)" }}
        />
      </span>
    </button>
  );
}

function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      {muted ? (
        <path d="m22 9-6 6M16 9l6 6" />
      ) : (
        <>
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          <path d="M18.5 5.5a9 9 0 0 1 0 13" />
        </>
      )}
    </svg>
  );
}
