"use client";

import { useCallback } from "react";

import { WelcomeOverlay } from "@/components/session-overlay";

/** Kirgandan keyin (?hi=1) — salomlaşiş animatsiyasi; tugagaç manzildan parametr olib taşlanadi. */
export function WelcomeGate({ name }: { name: string }) {
  const done = useCallback(() => {
    const u = new URL(window.location.href);
    u.searchParams.delete("hi");
    window.history.replaceState(null, "", u.pathname + u.search + u.hash);
  }, []);
  return <WelcomeOverlay name={name} onDone={done} />;
}
