"use client";

import { Icon } from "@/components/icons";
import { SignOutOverlay, useSignOut } from "@/components/session-overlay";

/** «Barça platformalardan çiqiş» — avval «Hisobdan çiqilmoqda» animatsiyasi, so'ng tayyorr+ dagi umumiy çiqiş. */
export function SignOutLink({ href, name, className }: { href: string; name?: string | null; className?: string }) {
  const { active, start } = useSignOut(() => {
    window.location.href = href;
  });
  return (
    <>
      <button type="button" onClick={start} disabled={active} className={className}>
        <Icon name="logout" className="h-4 w-4" />
        Barça platformalardan çiqiş
      </button>
      {active && <SignOutOverlay name={name} />}
    </>
  );
}
