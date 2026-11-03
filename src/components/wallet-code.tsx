"use client";

import { useState } from "react";

import { CopyIcon } from "@/components/icons";

/** Hisob kodi + nusxa olish tugmasi. */
export function WalletCode({ code }: { code: string }) {
  const [done, setDone] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm">
      <span className="text-zinc-400">Hisob kodi:</span>
      <span className="font-mono font-medium text-white">{code}</span>
      <button
        type="button"
        onClick={copy}
        aria-label="Nusxa oliş"
        className="shrink-0 text-zinc-400 transition hover:text-white"
      >
        {done ? (
          <span className="text-xs text-emerald-400">nusxa olindi</span>
        ) : (
          <CopyIcon />
        )}
      </button>
    </div>
  );
}
