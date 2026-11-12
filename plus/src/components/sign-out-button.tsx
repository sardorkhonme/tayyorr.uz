"use client";

import { signOutAction } from "@/app/(hub)/actions";
import { SignOutOverlay, useSignOut } from "@/components/session-overlay";

/** «Çiqiş» — avval «Hisobdan çiqilmoqda» animatsiyasi, so'ng sessiya yopiladi. */
export function SignOutButton({ className, name, children }: { className?: string; name?: string | null; children: React.ReactNode }) {
  const { active, start } = useSignOut(() => signOutAction());
  return (
    <>
      <button type="button" className={className} onClick={start} disabled={active}>
        {children}
      </button>
      {active && <SignOutOverlay name={name} />}
    </>
  );
}
