import Link from "next/link";

import { MascotState } from "@/components/mascot";

export default function NotFound() {
  return (
    <div className="grid min-h-[70dvh] place-items-center px-4 py-10">
      <MascotState
        pose="not-found"
        size={210}
        title="Sahifa topilmadi"
        message="Manzil notöğri yoki sahifa köçirilgan bölişi mumkin. Tayyor-Man ham xaritadan topa olmadi."
        className="text-zinc-900"
      >
        <Link href="/" className="btn-primary">
          Xizmatlarga qaytiş
        </Link>
      </MascotState>
    </div>
  );
}
