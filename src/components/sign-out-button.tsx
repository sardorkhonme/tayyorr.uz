"use client";

import { LogoutIcon } from "@/components/icons";
import { SignOutOverlay, useSignOut } from "@/components/session-overlay";

/** «Hisobdan çiqiş» — avval «Hisobdan çiqilmoqda» animatsiyasi, so'ng umumiy çiqiş (tayyorr+ va boşqa platformalardan ham). */
export function SignOutButton({ name, className }: { name?: string | null; className?: string } = {}) {
  const { active, start } = useSignOut(() => {
    window.location.href = "/api/sso/logout";
  });
  return (
    <>
      <button
        type="button"
        disabled={active}
        onClick={start}
        className={
          className ??
          "btn inline-flex w-fit items-center gap-2 border border-red-400/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"
        }
      >
        <LogoutIcon />
        Hisobdan çiqiş
      </button>
      {active && <SignOutOverlay name={name} />}
    </>
  );
}
