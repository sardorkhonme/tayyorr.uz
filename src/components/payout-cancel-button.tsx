"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PayoutCancelButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const res = await fetch(`/api/wallet/payout/${id}/cancel`, {
            method: "POST",
          });
          if (res.ok) router.refresh();
        } finally {
          setBusy(false);
        }
      }}
      className="backdrop-blur-sm shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/10"
    >
      {busy ? "..." : "Bekor qiliş"}
    </button>
  );
}
