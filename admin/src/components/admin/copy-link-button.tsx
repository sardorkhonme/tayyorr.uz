"use client";

import { useState } from "react";

import { CopyIcon } from "@/components/icons";

/** Havolani bosish bilan nusxa oladigan tugma. */
export function CopyLinkButton({
  url,
  className = "flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-zinc-300 transition hover:bg-white/10 hover:text-white",
}: {
  url: string;
  className?: string;
}) {
  const [done, setDone] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <button type="button" onClick={copy} className={className}>
      <CopyIcon className="h-3.5 w-3.5" />
      {done ? "nusxa olindi" : "nusxa olish"}
    </button>
  );
}
