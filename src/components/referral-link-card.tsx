"use client";

import { useState } from "react";
import { Icon, StarIcon } from "@/components/icons";

export function ReferralLinkCard({ userId }: { userId: string }) {
  const [copied, setCopied] = useState(false);
  const link =
    typeof window !== "undefined"
      ? `${window.location.origin}/r/${userId}`
      : `https://tayyorr.uz/r/${userId}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard yo'q bo'lsa jim o'tamiz */
    }
  }

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold text-white">
          <Icon name="gift" className="h-[18px] w-[18px] text-indigo-300" />
          Döstlaringizni taklif qiling
        </h2>
      </div>
      <p className="-mt-2 text-xs text-zinc-500">
        Havolangiz orqali röyxatdan ötgan har bir yangi foydalanuvçi uçun
        sizga <b className="text-amber-300">1 <StarIcon className="h-3 w-3" /></b> beriladi.
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300">
          {link}
        </code>
        <button
          type="button"
          onClick={copy}
          className="btn-ghost shrink-0"
        >
          {copied ? (
            <>
              Nusxalandi <Icon name="check" className="h-4 w-4" />
            </>
          ) : (
            "Nusxalaş"
          )}
        </button>
      </div>
    </div>
  );
}
