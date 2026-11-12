"use client";

import { useEffect } from "react";
import Link from "next/link";

import { MascotState } from "@/components/mascot";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-[70dvh] place-items-center px-4 py-10">
      <MascotState
        pose="error"
        size={210}
        title="Nimadir notöğri ketdi"
        message="Vaqtinçalik xatolik — Tayyor-Man allaqaçon tuzatişga kirişdi. Qaytadan urinib köring."
        className="text-zinc-900"
      >
        <button type="button" onClick={reset} className="btn-primary">
          Qaytadan urinib köriş
        </button>
        <Link href="/" className="btn-ghost">
          Boş sahifa
        </Link>
      </MascotState>
    </div>
  );
}
