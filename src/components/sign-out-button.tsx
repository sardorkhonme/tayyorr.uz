"use client";

import { useState } from "react";
import { LogoutIcon } from "@/components/icons";

export function SignOutButton() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        // umumiy chiqish — tayyorr+ va boshqa platformalardan ham
        window.location.href = "/api/sso/logout";
      }}
      className="btn inline-flex w-fit items-center gap-2 border border-red-400/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"
    >
      <LogoutIcon />
      {busy ? "Chiqilyapti…" : "Hisobdan chiqish"}
    </button>
  );
}
